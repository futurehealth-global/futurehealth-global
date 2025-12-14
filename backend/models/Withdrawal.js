const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    doctor: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    doctorName: String,
    doctorEmail: String,
    doctorType: String,
    
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    
    bankDetails: {
        accountNumber: String,
        accountName: String,
        bankName: String,
        bankCode: String
    },
    
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
        default: 'pending' 
    },
    
    // ✅ PAYSTACK FIELDS
    paystackRecipientCode: String,
    paystackTransferCode: String,
    paystackReference: String,
    paystackTransferId: Number,
    
    transferAttempts: { type: Number, default: 0 },
    lastTransferAttempt: Date,
    
    paystackFee: { type: Number, default: 0 },
    netAmount: { type: Number },
    
    createdAt: { type: Date, default: Date.now },
    processingStartedAt: Date,
    completedAt: Date,
    failedAt: Date,
    
    adminNotes: String,
    failureReason: String,
    retryCount: { type: Number, default: 0 },
    
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    paystackWebhookData: mongoose.Schema.Types.Mixed
});

// Calculate net amount before saving
withdrawalSchema.pre('save', function(next) {
    if (this.isModified('amount') || this.isNew) {
        const paystackFee = 10 + (this.amount * 0.005);
        this.paystackFee = Math.max(paystackFee, 25);
        this.netAmount = this.amount - this.paystackFee;
    }
    next();
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);