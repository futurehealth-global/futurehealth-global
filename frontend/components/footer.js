// components/footer.js
class CustomFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer class="bg-gray-800 text-white py-8 mt-12">
                <div class="container mx-auto px-4">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h3 class="text-xl font-bold mb-4">Future Health</h3>
                            <p class="text-gray-400">AI-powered healthcare connecting patients with doctors across Africa.</p>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold mb-4">Quick Links</h4>
                            <ul class="space-y-2 text-gray-400">
                                <li><a href="/" class="hover:text-white">Home</a></li>
                                <li><a href="/login.html" class="hover:text-white">Login</a></li>
                                <li><a href="/signup.html" class="hover:text-white">Sign Up</a></li>
                                <li><a href="/dashboard.html" class="hover:text-white">Dashboard</a></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold mb-4">Services</h4>
                            <ul class="space-y-2 text-gray-400">
                                <li>Doctor Consultations</li>
                                <li>Medical Intern Services</li>
                                <li>Emergency Assistance</li>
                                <li>Medical Records</li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold mb-4">Contact Us</h4>
                            <div class="space-y-2 text-gray-400">
                                <p>📍 CBN Quarters, FHA Lugbe, Abuja</p>
                                <p>📞 +234 806 443 0659</p>
                                <p>📞 +234 810 427 3966</p>
                                <p>📧 futurehealth435@gmail.com</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 Future Health. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        `;
    }
}

customElements.define('custom-footer', CustomFooter);