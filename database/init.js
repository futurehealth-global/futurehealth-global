const mongoose = require('mongoose');
const User = require('../backend/models/User');
require('dotenv').config();

const sampleDoctors = [
    {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@hospital.com',
        password: 'password123',
        phone: '+1-555-0101',
        userType: 'doctor',
        licenseNumber: 'MD123456',
        specialization: 'Cardiologist',
        experience: 15,
        bio: '15 years experience. Specializes in heart conditions and preventive care.',
        consultationFee: 120,
        clinicName: 'MedLife Center',
        clinicAddress: {
            street: '123 Healthcare St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001'
        },
        rating: 4.8,
        services: ['Heart Checkup', 'ECG', 'Echocardiogram', 'Cardiac Consultation'],
        languages: ['English', 'Spanish'],
        availability: [
            {
                day: 'monday',
                slots: [
                    { start: '09:00', end: '10:00' },
                    { start: '10:30', end: '11:30' },
                    { start: '14:00', end: '15:00' }
                ]
            },
            {
                day: 'tuesday',
                slots: [
                    { start: '09:00', end: '10:00' },
                    { start: '10:30', end: '11:30' },
                    { start: '14:00', end: '15:00' }
                ]
            }
        ]
    },
    {
        name: 'Dr. Michael Chen',
        email: 'michael.chen@childrenshospital.com',
        password: 'password123',
        phone: '+1-555-0102',
        userType: 'doctor',
        licenseNumber: 'MD123457',
        specialization: 'Pediatrician',
        experience: 10,
        bio: '10 years experience. Specializes in child healthcare and development.',
        consultationFee: 90,
        clinicName: 'Children\'s Hospital',
        clinicAddress: {
            street: '456 Pediatric Ave',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90001'
        },
        rating: 4.9,
        services: ['Child Checkup', 'Vaccination', 'Development Assessment'],
        languages: ['English', 'Mandarin'],
        availability: [
            {
                day: 'wednesday',
                slots: [
                    { start: '08:00', end: '09:00' },
                    { start: '09:30', end: '10:30' },
                    { start: '11:00', end: '12:00' }
                ]
            },
            {
                day: 'thursday',
                slots: [
                    { start: '08:00', end: '09:00' },
                    { start: '09:30', end: '10:30' },
                    { start: '11:00', end: '12:00' }
                ]
            }
        ]
    }
];

async function initializeDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Clear existing data
        await User.deleteMany({ userType: 'doctor' });
        console.log('Cleared existing doctor data');
        
        // Create sample doctors
        for (const doctorData of sampleDoctors) {
            const doctor = new User(doctorData);
            await doctor.save();
            console.log(`Created doctor: ${doctor.name}`);
        }
        
        console.log('Database initialized successfully');
        process.exit(0);
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}

initializeDatabase();