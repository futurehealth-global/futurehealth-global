require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fileUpload = require('express-fileupload');

// Load email config to verify connection
require('./config/email');

const app = express();

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',                    // Local development
      'http://localhost:5000',                    // Local API
      'https://futurehealth-222.pages.dev',       // Cloudflare Pages (live frontend)
      'https://futurehealth.africa',              // Future custom domain
      'https://www.futurehealth.africa',          // Future custom domain (www)
      'http://79.76.103.243'                      // Oracle Cloud backend (direct testing)
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/futurehealth', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successful');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// ✅ IMPORT ALL MODELS (Initialize them)
require('./models/User');
require('./models/Appointment');
require('./models/PlatformEarnings');
require('./models/Withdrawal');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/users', require('./routes/users'));
app.use('/api/payments', require('./routes/payment'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/paystack', require('./routes/paystackWebhook')); // ✅ Paystack webhooks

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Future Health API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    features: {
      paystack: !!process.env.PAYSTACK_SECRET_KEY,
      wallet: true,
      commission: true,
      automaticWithdrawals: true
    },
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Future Health Platform API',
    version: '2.0.0',
    status: 'Active',
    environment: process.env.NODE_ENV || 'development',
    features: 'Payment System with Automatic Withdrawals via Paystack',
    endpoints: {
      auth: '/api/auth',
      appointments: '/api/appointments',
      doctors: '/api/doctors',
      payments: '/api/payments',
      wallet: '/api/wallet',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  const now = new Date();
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Future Health Server v2.0 is running!');
  console.log('📍 Port:', PORT);
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  console.log('🏥 Platform: Future Health with Automatic Payments');
  console.log('📅 Started at:', now.toLocaleDateString() + ', ' + now.toLocaleTimeString());
  console.log('='.repeat(60));
  
  // Log loaded routes
  console.log('\n📋 Loaded Routes:');
  console.log('   🔐 /api/auth          - Authentication');
  console.log('   📅 /api/appointments  - Appointment management');
  console.log('   👨‍⚕️ /api/doctors      - Doctor/Intern operations');
  console.log('   👤 /api/users         - User management');
  console.log('   💳 /api/payments      - Payment processing');
  console.log('   💰 /api/wallet        - Wallet & Withdrawals');
  console.log('   🔄 /api/paystack      - Paystack webhooks');
  console.log('   ❤️  /api/health       - Health check');
  
  // Paystack status
  console.log('\n💰 Paystack Status:');
  if (process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY !== 'your_paystack_secret_key_here') {
    console.log('   ✅ CONFIGURED - Automatic withdrawals enabled');
    console.log('   💸 Fee: ₦10 + 0.5% per transfer');
    console.log('   ⚡ Transfers: Automatic to doctor bank accounts');
  } else {
    console.log('   ⚠️  NOT CONFIGURED - Set PAYSTACK_SECRET_KEY in .env');
    console.log('   💡 Tip: Sign up at https://paystack.com');
  }
  
  // Commission info
  console.log('\n🏥 Commission System:');
  console.log('   📊 Platform commission: 3% on all consultations');
  console.log('   ⚖️  Doctor earns: 97% of consultation fee');
  console.log('   💰 Automatic payout via Paystack');
  
  console.log('\n' + '='.repeat(60));
  console.log('🔥 Ready for production! Doctors can withdraw automatically!');
  console.log('='.repeat(60) + '\n');
});

module.exports = app;