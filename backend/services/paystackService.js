const axios = require('axios');

class PaystackService {
    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY;
        this.baseURL = 'https://api.paystack.co';
    }
    
    // Create transfer recipient
    async createTransferRecipient(accountDetails) {
        try {
            const response = await axios.post(
                `${this.baseURL}/transferrecipient`,
                {
                    type: 'nuban',
                    name: accountDetails.accountName,
                    account_number: accountDetails.accountNumber,
                    bank_code: accountDetails.bankCode,
                    currency: 'NGN'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.secretKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return {
                success: true,
                recipientCode: response.data.data.recipient_code
            };
        } catch (error) {
            console.error('Paystack error:', error.response?.data?.message);
            return {
                success: false,
                message: error.response?.data?.message || 'Bank setup failed'
            };
        }
    }
    
    // Initiate transfer
    async initiateTransfer(recipientCode, amount) {
        try {
            const response = await axios.post(
                `${this.baseURL}/transfer`,
                {
                    source: 'balance',
                    amount: amount * 100,
                    recipient: recipientCode,
                    reason: 'Future Health Doctor Payout'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.secretKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return {
                success: true,
                transferCode: response.data.data.transfer_code,
                reference: response.data.data.reference
            };
        } catch (error) {
            console.error('Paystack transfer error:', error.response?.data?.message);
            return {
                success: false,
                message: error.response?.data?.message || 'Transfer failed'
            };
        }
    }
    
    // Verify bank account
    async verifyAccount(accountNumber, bankCode) {
        try {
            const response = await axios.get(
                `${this.baseURL}/bank/resolve`,
                {
                    params: {
                        account_number: accountNumber,
                        bank_code: bankCode
                    },
                    headers: {
                        'Authorization': `Bearer ${this.secretKey}`
                    }
                }
            );
            
            return {
                success: true,
                accountName: response.data.data.account_name,
                accountNumber: response.data.data.account_number
            };
        } catch (error) {
            console.error('Paystack account error:', error.response?.data?.message);
            return {
                success: false,
                message: error.response?.data?.message || 'Account verification failed'
            };
        }
    }
    
    // Check if configured
    isConfigured() {
        return !!this.secretKey && this.secretKey.length > 30;
    }
}

module.exports = new PaystackService();