// Main JavaScript file for Future Health

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Check authentication status
    checkAuthStatus();

    // Initialize all components
    initializeApp();
});

function initializeApp() {
    // Smooth scrolling for anchor links
    initializeSmoothScroll();
    
    // Initialize search functionality
    initializeSearch();
    
    // Initialize any other components
    initializeNotifications();
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user.id) {
        // User is logged in, update UI accordingly
        updateUIForLoggedInUser(user);
    }
}

function updateUIForLoggedInUser(user) {
    // Update navigation for logged in user
    const navAuth = document.querySelector('custom-navbar')?.shadowRoot?.querySelector('.auth-links');
    if (navAuth && user.name) {
        navAuth.innerHTML = `
            <div class="flex items-center space-x-4">
                <span class="text-gray-700">Hello, ${user.name}</span>
                <a href="/dashboard.html" class="text-gray-600 hover:text-primary-500">Dashboard</a>
                <button onclick="logout()" class="text-gray-600 hover:text-primary-500">Logout</button>
            </div>
        `;
    }
}

function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initializeSearch() {
    const searchBtn = document.querySelector('#search button');
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
}

function performSearch() {
    const specialty = document.querySelector('select')?.value;
    const location = document.querySelector('input[type="text"]')?.value;
    
    // Show loading state
    const searchBtn = document.querySelector('#search button');
    const originalText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<div class="loading"></div> Searching...';
    
    // Simulate API call
    setTimeout(() => {
        searchBtn.innerHTML = originalText;
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // In real implementation, this would update doctor listings
        showNotification(`Found doctors for ${specialty} in ${location}`, 'success');
    }, 1500);
}

function initializeNotifications() {
    // Notification system initialization
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i data-feather="${
                type === 'success' ? 'check-circle' :
                type === 'error' ? 'alert-circle' :
                'info'
            }" class="w-5 h-5 mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Re-initialize Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// API functions
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        },
        ...options
    };
    
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    
    try {
        const response = await fetch(`/api${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API request error:', error);
        showNotification(error.message || 'Something went wrong', 'error');
        throw error;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        apiRequest,
        logout
    };
}