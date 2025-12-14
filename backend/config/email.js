const nodemailer = require('nodemailer');

// Create transporter - FIXED FUNCTION NAME
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email connection failed:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Email templates
const emailTemplates = {
  appointmentConfirmation: (appointment, patient) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Future Health</h1>
          <h2>Appointment Booked Successfully!</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${patient.name}</strong>,</p>
          <p>Your appointment has been confirmed with Future Health.</p>
          
          <div class="details">
            <h3>📅 Appointment Details:</h3>
            <p><strong>Doctor:</strong> Dr. ${appointment.doctor.name}</p>
            <p><strong>Specialization:</strong> ${appointment.doctor.specialization}</p>
            <p><strong>Date:</strong> ${new Date(appointment.date).toDateString()}</p>
            <p><strong>Time:</strong> ${appointment.timeSlot?.start || '10:00 AM'}</p>
            <p><strong>Consultation Fee:</strong> ₦${appointment.consultationFee || appointment.doctor.consultationFee}</p>
            <p><strong>Appointment ID:</strong> ${appointment._id}</p>
          </div>

          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Complete your payment to confirm the appointment</li>
            <li>You'll receive a reminder before your appointment</li>
            <li>Join the video consultation 5 minutes before your scheduled time</li>
          </ul>

          <p>Thank you for choosing Future Health - making healthcare accessible for all Nigerians! 🇳🇬</p>
        </div>
        <div class="footer">
          <p>Need help? Contact us at futurehealth435@gmail.com</p>
          <p>© 2025 Future Health. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  paymentConfirmation: (appointment, paymentData) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; }
        .success { color: #10b981; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Future Health</h1>
          <h2>Payment Successful! 🎉</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${appointment.patient.name}</strong>,</p>
          <p class="success">Your payment has been processed successfully and your appointment is now confirmed!</p>
          
          <div class="details">
            <h3>💰 Payment Details:</h3>
            <p><strong>Amount Paid:</strong> ₦${appointment.payment.amount}</p>
            <p><strong>Transaction ID:</strong> ${paymentData.reference}</p>
            <p><strong>Payment Method:</strong> ${paymentData.channel}</p>
            <p><strong>Paid At:</strong> ${new Date(paymentData.paid_at).toLocaleString('en-NG')}</p>
            <p><strong>Appointment ID:</strong> ${appointment._id}</p>
          </div>

          <div class="details">
            <h3>👨‍⚕️ Appointment Summary:</h3>
            <p><strong>Doctor:</strong> Dr. ${appointment.doctor.name}</p>
            <p><strong>Date:</strong> ${new Date(appointment.date).toDateString()}</p>
            <p><strong>Time:</strong> ${appointment.timeSlot?.start || '10:00 AM'}</p>
            <p><strong>Status:</strong> <span class="success">CONFIRMED</span></p>
          </div>

          <p><strong>What happens next?</strong></p>
          <ul>
            <li>You'll receive a reminder 24 hours before your appointment</li>
            <li>Join the consultation using the link we'll send you</li>
            <li>Have your medical documents ready if any</li>
          </ul>

          <p>We're excited to help you on your healthcare journey! 💙</p>
        </div>
        <div class="footer">
          <p>Questions? Reply to this email or contact futurehealth435@gmail.com</p>
          <p>© 2025 Future Health. Transforming Nigerian Healthcare.</p>
        </div>
      </div>
    </body>
    </html>
  `
};

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"Future Health" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', to);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed to:', to, error);
    throw error;
  }
};

module.exports = {
  transporter,
  emailTemplates,
  sendEmail
};