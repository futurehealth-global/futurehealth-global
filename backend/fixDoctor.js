const mongoose = require('mongoose');

async function fixDoctor() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/futurehealth', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Define User schema
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      userType: String,
      // other fields...
    });
    
    const User = mongoose.model('User', userSchema, 'users');
    
    // Update Dr. Adebayo
    const result = await User.updateOne(
      { email: "dr.adebayo@futurehealth.com" },
      { $set: { userType: "doctor" } }
    );
    
    console.log('✅ Update result:', result);
    
    // Verify
    const doctor = await User.findOne({email: "dr.adebayo@futurehealth.com"});
    console.log('✅ Doctor after fix:');
    console.log('   Name:', doctor.name);
    console.log('   User Type:', doctor.userType);
    console.log('   Email:', doctor.email);
    
    mongoose.disconnect();
    console.log('✅ Fixed! Now logout and login again as Dr. Adebayo');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixDoctor();