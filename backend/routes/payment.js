const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const PlatformEarnings = require('../models/PlatformEarnings');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Initialize Paystack payment with 3% commission
router.post('/initialize-payment', auth, async (req, res) => {
    try {
        const { appointmentId, email } = req.body;
        
        // Input validation
        if (!appointmentId || !email) {
            return res.status(400).json({ 
                success: false,
                message: 'Appointment ID and email are required' 
            });
        }

        const appointment = await Appointment.findById(appointmentId)
            .populate('doctor', 'consultationFee name specialization userType wallet')
            .populate('patient', 'name email');
        
        if (!appointment) {
            return res.status(404).json({ 
                success: false,
                message: 'Appointment not found' 
            });
        }
        
        // Authorization check
        if (appointment.patient._id.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to pay for this appointment' 
            });
        }
        
        // Payment status check
        if (appointment.payment.status === 'paid') {
            return res.status(400).json({ 
                success: false,
                message: 'Appointment already paid' 
            });
        }

        // Calculate 3% platform commission
        const consultationFee = appointment.doctor.consultationFee || 
                              (appointment.doctor.userType === 'intern' ? 1500 : 5000);
        const platformCommission = consultationFee * 0.03; // 3% commission
        const doctorEarnings = consultationFee - platformCommission; // 97% to doctor/intern
        
        // ✅ Update appointment with commission details
        appointment.consultationFee = consultationFee;
        appointment.platformCommission = platformCommission;
        appointment.doctorEarnings = doctorEarnings;
        appointment.payment.amount = consultationFee;
        
        // Convert to kobo (Paystack uses kobo for Naira)
        const amount = Math.round(consultationFee * 100);
        
        // Generate unique reference
        const reference = `FH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: email,
                amount: amount,
                currency: 'NGN',
                reference: reference,
                metadata: {
                    appointmentId: appointment._id.toString(),
                    patientId: req.user.id,
                    doctorId: appointment.doctor._id.toString(),
                    doctorName: appointment.doctor.name,
                    specialization: appointment.doctor.specialization,
                    userType: appointment.doctor.userType,
                    type: 'appointment',
                    consultationFee: consultationFee,
                    platformCommission: platformCommission,
                    doctorEarnings: doctorEarnings
                },
                callback_url: `${process.env.FRONTEND_URL}/payment-success.html`
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Update appointment with Paystack reference
        appointment.payment.paystackReference = response.data.data.reference;
        await appointment.save();
        
        res.json({
            success: true,
            authorization_url: response.data.data.authorization_url,
            access_code: response.data.data.access_code,
            reference: response.data.data.reference,
            commissionDetails: {
                consultationFee: consultationFee,
                platformCommission: platformCommission,
                doctorEarnings: doctorEarnings,
                commissionRate: '3%'
            }
        });
    } catch (error) {
        console.error('Paystack initialization error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Payment initialization failed',
            error: error.response?.data?.message || error.message 
        });
    }
});

// Verify Paystack payment and update wallet
router.get('/verify-payment/:reference', auth, async (req, res) => {
    try {
        const { reference } = req.params;
        
        if (!reference) {
            return res.status(400).json({
                success: false,
                message: 'Payment reference is required'
            });
        }

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        if (response.data.data.status === 'success') {
            // Payment successful - update appointment
            const appointment = await Appointment.findOne({
                'payment.paystackReference': reference
            }).populate('doctor', 'name specialization userType wallet')
              .populate('patient', 'name email');
            
            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found for this payment'
                });
            }

            // ✅ Update appointment payment status
            appointment.payment.status = 'paid';
            appointment.payment.paidAt = new Date();
            appointment.status = 'confirmed';
            appointment.payment.method = 'paystack';
            appointment.payment.transactionId = response.data.data.id;
            
            // ✅ Update doctor's pending balance (97% of fee)
            const doctor = await User.findById(appointment.doctor._id);
            if (doctor) {
                doctor.wallet.pendingBalance += appointment.doctorEarnings;
                doctor.wallet.totalEarned += appointment.doctorEarnings;
                
                doctor.wallet.transactions.push({
                    amount: appointment.doctorEarnings,
                    type: 'credit',
                    description: `Appointment #${appointment._id} - Pending completion`,
                    appointmentId: appointment._id,
                    status: 'pending'
                });
                
                await doctor.save();
            }
            
            // ✅ Update platform earnings (3% commission)
            await PlatformEarnings.findOneAndUpdate(
                {},
                { 
                    $inc: { 
                        totalCommission: appointment.platformCommission,
                        availableBalance: appointment.platformCommission 
                    },
                    $set: { updatedAt: new Date() }
                },
                { upsert: true }
            );
            
            await appointment.save();
            
            res.json({
                success: true,
                message: 'Payment verified successfully',
                appointment: {
                    id: appointment._id,
                    status: appointment.status,
                    doctor: appointment.doctor,
                    patient: appointment.patient,
                    payment: appointment.payment
                },
                earnings: {
                    doctorEarnings: appointment.doctorEarnings,
                    platformCommission: appointment.platformCommission,
                    totalFee: appointment.consultationFee
                },
                paymentData: {
                    amount: response.data.data.amount / 100,
                    currency: response.data.data.currency,
                    paidAt: response.data.data.paid_at
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment not successful',
                status: response.data.data.status
            });
        }
    } catch (error) {
        console.error('Paystack verification error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Payment verification failed',
            error: error.response?.data?.message || error.message 
        });
    }
});

// Webhook for Paystack events (for real-time updates)
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    
    if (!secret) {
        console.error('Paystack webhook secret not configured');
        return res.status(500).send('Webhook secret not configured');
    }
    
    try {
        // Verify webhook signature
        const hash = crypto.createHmac('sha512', secret)
                          .update(req.body)
                          .digest('hex');
        
        if (hash !== req.headers['x-paystack-signature']) {
            console.error('Invalid webhook signature');
            return res.status(400).send('Invalid signature');
        }

        const event = JSON.parse(req.body.toString());
        console.log(`Received Paystack webhook event: ${event.event}`);
        
        if (event.event === 'charge.success') {
            await handlePaystackPaymentSuccess(event.data);
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Paystack webhook error:', error);
        res.status(500).json({error: 'Webhook handler failed'});
    }
});

// Handle successful Paystack payment
async function handlePaystackPaymentSuccess(paymentData) {
    try {
        const appointment = await Appointment.findOne({
            'payment.paystackReference': paymentData.reference
        }).populate('patient', 'email name')
          .populate('doctor', 'name userType wallet');
        
        if (appointment && appointment.payment.status !== 'paid') {
            // Update appointment
            appointment.payment.status = 'paid';
            appointment.payment.paidAt = new Date();
            appointment.status = 'confirmed';
            appointment.payment.method = 'paystack';
            appointment.payment.transactionId = paymentData.id;
            
            // Update doctor's pending balance
            if (appointment.doctor) {
                const doctor = await User.findById(appointment.doctor._id);
                if (doctor) {
                    doctor.wallet.pendingBalance += appointment.doctorEarnings;
                    doctor.wallet.totalEarned += appointment.doctorEarnings;
                    
                    doctor.wallet.transactions.push({
                        amount: appointment.doctorEarnings,
                        type: 'credit',
                        description: `Appointment #${appointment._id} - Payment received`,
                        appointmentId: appointment._id,
                        status: 'pending',
                        date: new Date()
                    });
                    
                    await doctor.save();
                }
            }
            
            // Update platform earnings
            await PlatformEarnings.findOneAndUpdate(
                {},
                { 
                    $inc: { 
                        totalCommission: appointment.platformCommission,
                        availableBalance: appointment.platformCommission 
                    }
                },
                { upsert: true }
            );
            
            await appointment.save();
            
            console.log(`Payment successful for appointment: ${appointment._id}`);
            console.log(`Doctor earned: ₦${appointment.doctorEarnings}`);
            console.log(`Platform commission: ₦${appointment.platformCommission}`);
        }
    } catch (error) {
        console.error('Error handling Paystack payment success:', error);
    }
}

// Get payment status
router.get('/status/:reference', auth, async (req, res) => {
    try {
        const { reference } = req.params;
        
        const appointment = await Appointment.findOne({
            'payment.paystackReference': reference,
            patient: req.user.id
        }).populate('doctor', 'name specialization userType')
          .select('payment status consultationFee platformCommission doctorEarnings');
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        
        res.json({
            success: true,
            paymentStatus: appointment.payment.status,
            appointmentStatus: appointment.status,
            amount: appointment.payment.amount,
            paidAt: appointment.payment.paidAt,
            commissionDetails: {
                consultationFee: appointment.consultationFee,
                platformCommission: appointment.platformCommission,
                doctorEarnings: appointment.doctorEarnings,
                commissionRate: '3%'
            }
        });
    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment status'
        });
    }
});

module.exports = router;