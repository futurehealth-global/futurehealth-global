// frontend/api.js - COMPLETE VERSION WITH PAYMENT SYSTEM
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'  // Development
  : '/api';  // Production - Same origin

class FutureHealthAPI {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const token = localStorage.getItem('token');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
            ...options
        };

        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ========== AUTH ENDPOINTS ==========
    static async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
    }

    static async signup(userData) {
        return this.request('/auth/register', {  // ✅ FIXED: changed from /auth/signup to /auth/register
            method: 'POST',
            body: userData
        });
    }

    static async getCurrentUser() {
        return this.request('/auth/me');
    }

    // ========== APPOINTMENT ENDPOINTS ==========
    static async createAppointment(appointmentData) {
        return this.request('/appointments', {
            method: 'POST',
            body: appointmentData
        });
    }

    static async getMyAppointments() {
        return this.request('/appointments/user/my-appointments');
    }

    static async updateAppointmentStatus(appointmentId, status) {
        return this.request(`/appointments/${appointmentId}/status`, {
            method: 'PATCH',
            body: { status }
        });
    }

    // ========== DOCTOR ENDPOINTS ==========
    static async getDoctors() {
        return this.request('/doctors');
    }

    static async getDoctorProfile(id) {
        return this.request(`/doctors/${id}`);
    }

    static async getDoctorAppointments(date) {
        const query = date ? `?date=${date}` : '';
        return this.request(`/doctors/appointments${query}`);
    }

    // ========== PAYMENT ENDPOINTS ==========
    static async initializePayment(appointmentId, email) {
        return this.request('/payments/initialize-payment', {
            method: 'POST',
            body: { appointmentId, email }
        });
    }

    static async verifyPayment(reference) {
        return this.request(`/payments/verify-payment/${reference}`);
    }

    static async getPaymentStatus(reference) {
        return this.request(`/payments/status/${reference}`);
    }

    // ========== WALLET ENDPOINTS ==========
    static async getWallet() {
        return this.request('/doctors/wallet');
    }

    static async getBanks() {
        return this.request('/doctors/banks');
    }

    static async verifyBankAccount(accountNumber, bankCode) {
        return this.request('/doctors/verify-bank-account', {
            method: 'POST',
            body: { accountNumber, bankCode }
        });
    }

    static async updateBankDetails(bankDetails) {
        return this.request('/doctors/bank-details', {
            method: 'POST',
            body: bankDetails
        });
    }

    static async requestWithdrawal(amount) {
        return this.request('/doctors/withdraw', {
            method: 'POST',
            body: { amount }
        });
    }

    static async getWithdrawals() {
        return this.request('/doctors/withdrawals');
    }

    // ========== PROFILE ENDPOINTS ==========
    static async updateProfile(profileData) {
        // Handle FormData for profile updates with images
        if (profileData instanceof FormData) {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: profileData
            });
            return await response.json();
        }
        
        return this.request('/users/profile', {
            method: 'PUT',
            body: profileData
        });
    }

    // ========== PLATFORM ENDPOINTS ==========
    static async getPlatformEarnings() {
        return this.request('/platform/earnings');
    }

    // ========== HELPER METHODS ==========
    static async checkHealth() {
        try {
            const response = await fetch(`${API_BASE}/health`);
            return await response.json();
        } catch (error) {
            return { success: false, message: 'API is offline' };
        }
    }

    // Check if user has wallet access (doctor or intern)
    static hasWalletAccess() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return ['doctor', 'intern'].includes(user.userType);
    }

    // Get user type
    static getUserType() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.userType || 'patient';
    }
}

// Make it globally available
window.FutureHealthAPI = FutureHealthAPI;

// Auto-check API health on load
document.addEventListener('DOMContentLoaded', function() {
    if (typeof FutureHealthAPI.checkHealth === 'function') {
        FutureHealthAPI.checkHealth().then(health => {
            console.log('Future Health API Status:', health);
            if (!health.success) {
                console.warn('API appears to be offline');
            }
        });
    }
});