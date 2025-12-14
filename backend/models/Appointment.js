const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    timeSlot: {
        start: { type: String, required: true },
        end: { type: String, required: true }
    },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'], 
        default: 'pending' 
    },
    reason: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['video', 'phone', 'in-person'], 
        default: 'video' 
    },
    
    // ✅ PAYMENT FIELDS (CRITICAL FOR 3% COMMISSION)
    consultationFee: { type: Number, required: true },
    platformCommission: { type: Number, required: true }, // 3% of fee
    doctorEarnings: { type: Number, required: true }, // Fee - 3% commission
    paymentStatus: { 
        type: String, 
        enum: ['pending', 'paid', 'refunded', 'failed'], 
        default: 'pending' 
    },
    
    // Payment tracking
    payment: {
        status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
        amount: { type: Number },
        method: { type: String },
        paystackReference: { type: String },
        transactionId: { type: String },
        paidAt: { type: Date }
    },
    
    // Medical fields
    symptoms: { type: String },
    medicalHistory: { type: String },
    diagnosis: String,
    prescription: String,
    notes: String,
    
    documents: [{
        filename: String,
        url: String,
        publicId: String,
        format: String,
        resourceType: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now }
    }],
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-calculate earnings before saving
appointmentSchema.pre('save', function(next) {
    if (this.isModified('consultationFee') || this.isNew) {
        this.platformCommission = this.consultationFee * 0.03; // 3% commission
        this.doctorEarnings = this.consultationFee - this.platformCommission;
    }
    next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);