const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    userType: { type: String, enum: ['patient', 'doctor', 'intern'], required: true },
    
    // DOCTOR/INTERN FIELDS
    licenseNumber: { type: String },
    specialization: { type: String },
    experience: { type: Number },
    consultationFee: { type: Number, default: 5000 }, // Increased default
    
    // INTERN-SPECIFIC FIELDS
    medicalSchool: { type: String },
    graduationYear: { type: Number },
    studyYear: { type: String },
    interestArea: { type: String },
    studentId: { type: String },
    bio: { type: String },
    profileImage: { type: String },
    
    // ✅ WALLET SYSTEM (CRITICAL FOR PAYMENTS)
    wallet: {
        balance: { type: Number, default: 0 },
        pendingBalance: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        transactions: [{
            amount: Number,
            type: { type: String, enum: ['credit', 'debit'] },
            description: String,
            appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
            date: { type: Date, default: Date.now },
            status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' }
        }]
    },
    
    // ✅ BANK DETAILS (CRITICAL FOR PAYSTACK)
    bankDetails: {
        accountNumber: String,
        accountName: String,
        bankName: String,
        bankCode: String,
        paystackRecipientCode: String, // ✅ Paystack's recipient code
        verified: { type: Boolean, default: false },
        verifiedAt: Date
    },
    
    // Common fields
    dateOfBirth: Date,
    gender: String,
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.correctPassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Set default consultation fee based on user type
userSchema.pre('save', function(next) {
    if (this.isNew) {
        if (this.userType === 'intern' && !this.consultationFee) {
            this.consultationFee = 1500; // Intern default
        } else if (this.userType === 'doctor' && !this.consultationFee) {
            this.consultationFee = 5000; // Doctor default
        }
    }
    next();
});

module.exports = mongoose.model('User', userSchema);