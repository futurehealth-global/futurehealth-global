const mongoose = require('mongoose');

const platformEarningsSchema = new mongoose.Schema({
    totalCommission: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    totalDoctors: { type: Number, default: 0 },
    totalInterns: { type: Number, default: 0 },
    totalPatients: { type: Number, default: 0 },
    
    monthlyEarnings: [{
        month: String,
        commission: { type: Number, default: 0 },
        withdrawals: { type: Number, default: 0 },
        newDoctors: { type: Number, default: 0 },
        newInterns: { type: Number, default: 0 },
        newPatients: { type: Number, default: 0 },
        appointments: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 }
    }],
    
    // ✅ Track Paystack fees
    totalPaystackFees: { type: Number, default: 0 },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

platformEarningsSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('PlatformEarnings', platformEarningsSchema);