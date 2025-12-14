const express = require('express');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const PlatformEarnings = require('../models/PlatformEarnings');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// ✅ CREATE APPOINTMENT WITH 3% COMMISSION
router.post('/', auth, authorize('patient'), async (req, res) => {
    try {
        const { doctorId, date, timeSlot, reason, type = 'video' } = req.body;

        if (!doctorId || !date || !timeSlot || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Please provide doctor, date, time slot, and reason'
            });
        }

        // Get doctor
        const doctor = await User.findById(doctorId);
        if (!doctor || !['doctor', 'intern'].includes(doctor.userType)) {
            return res.status(404).json({
                success: false,
                message: 'Doctor/Intern not found'
            });
        }

        // Check scheduling conflict
        const existingAppointment = await Appointment.findOne({
            doctor: doctorId,
            date: date,
            'timeSlot.start': timeSlot.start,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'Time slot already booked'
            });
        }

        // Get consultation fee
        const consultationFee = doctor.consultationFee || (doctor.userType === 'intern' ? 1500 : 5000);
        
        // ✅ CALCULATE 3% COMMISSION
        const platformCommission = consultationFee * 0.03;
        const doctorEarnings = consultationFee - platformCommission;

        // Create appointment
        const appointment = new Appointment({
            patient: req.user.id,
            doctor: doctorId,
            date,
            timeSlot,
            reason,
            type,
            consultationFee,
            platformCommission,  // ✅ 3% commission
            doctorEarnings,      // ✅ Doctor gets 97%
            status: 'pending',
            paymentStatus: 'pending'
        });

        await appointment.save();

        // ✅ Update doctor's pending balance (moves to balance when completed)
        doctor.wallet.pendingBalance += doctorEarnings;
        doctor.wallet.totalEarned += doctorEarnings;
        doctor.wallet.transactions.push({
            amount: doctorEarnings,
            type: 'credit',
            description: `Appointment booked #${appointment._id}`,
            appointmentId: appointment._id,
            status: 'pending'
        });
        
        await doctor.save();

        // ✅ Update platform earnings (3% commission)
        await PlatformEarnings.findOneAndUpdate(
            {},
            { 
                $inc: { 
                    totalCommission: platformCommission,
                    availableBalance: platformCommission 
                },
                $set: { updatedAt: new Date() }
            },
            { upsert: true }
        );

        // Populate response
        await appointment.populate('patient', 'name email phone');
        await appointment.populate('doctor', 'name email specialization consultationFee userType profileImage');

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            appointment: appointment,
            commissionDetails: {
                totalFee: `₦${consultationFee.toLocaleString()}`,
                platformCommission: `₦${platformCommission.toLocaleString()}`,
                doctorEarnings: `₦${doctorEarnings.toLocaleString()}`,
                commissionRate: '3%'
            }
        });
    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating appointment'
        });
    }
});

// ✅ COMPLETE APPOINTMENT - MOVE MONEY TO DOCTOR'S BALANCE
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const appointmentId = req.params.id;

        const allowedStatuses = ['confirmed', 'cancelled', 'completed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const appointment = await Appointment.findById(appointmentId)
            .populate('doctor', 'wallet');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Check authorization
        if (appointment.doctor._id.toString() !== req.user.id && 
            appointment.patient.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // ✅ IF COMPLETING - MOVE MONEY FROM PENDING TO AVAILABLE BALANCE
        if (status === 'completed' && appointment.status !== 'completed') {
            const doctor = await User.findById(appointment.doctor._id);
            
            if (doctor) {
                // Move from pending to available
                doctor.wallet.pendingBalance -= appointment.doctorEarnings;
                doctor.wallet.balance += appointment.doctorEarnings;
                
                // Update transaction
                const transaction = doctor.wallet.transactions.find(
                    t => t.appointmentId && t.appointmentId.toString() === appointmentId
                );
                
                if (transaction) {
                    transaction.status = 'completed';
                    transaction.date = new Date();
                }
                
                await doctor.save();
                appointment.paymentStatus = 'paid';
            }
        }

        // ✅ IF CANCELLING - REMOVE FROM PENDING BALANCE
        if (status === 'cancelled' && appointment.status !== 'cancelled') {
            const doctor = await User.findById(appointment.doctor._id);
            
            if (doctor && appointment.doctorEarnings > 0) {
                doctor.wallet.pendingBalance -= appointment.doctorEarnings;
                doctor.wallet.totalEarned -= appointment.doctorEarnings;
                
                const transaction = doctor.wallet.transactions.find(
                    t => t.appointmentId && t.appointmentId.toString() === appointmentId
                );
                
                if (transaction) {
                    transaction.status = 'cancelled';
                }
                
                await doctor.save();
                
                // Refund platform commission
                await PlatformEarnings.findOneAndUpdate(
                    {},
                    { 
                        $inc: { 
                            totalCommission: -appointment.platformCommission,
                            availableBalance: -appointment.platformCommission 
                        }
                    }
                );
            }
        }

        appointment.status = status;
        await appointment.save();

        res.json({
            success: true,
            message: `Appointment ${status}`,
            appointment: appointment
        });
    } catch (error) {
        console.error('Update appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating appointment'
        });
    }
});

// Keep all your existing routes below...
// GET appointments, etc.

module.exports = router;