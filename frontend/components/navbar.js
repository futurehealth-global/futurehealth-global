class CustomNavbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="bg-white shadow-lg sticky top-0 z-50">
                <div class="container mx-auto px-4">
                    <div class="flex justify-between items-center py-4">
                        <div class="flex items-center">
                            <i data-feather="activity" class="text-primary-500 mr-2"></i>
                            <span class="text-xl font-bold text-gray-800">Future Health</span>
                        </div>
                        
                        <div class="hidden md:flex items-center space-x-8">
                            <a href="/" class="text-gray-600 hover:text-primary-500 transition duration-300">Home</a>
                            <a href="#search" class="text-gray-600 hover:text-primary-500 transition duration-300">Find Doctors</a>
                            <a href="/auth.html" class="text-gray-600 hover:text-primary-500 transition duration-300">For Doctors</a>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <a href="/login.html" class="text-gray-600 hover:text-primary-500 transition duration-300">Login</a>
                            <a href="/signup.html" class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition duration-300">Sign Up</a>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }
}

customElements.define('custom-navbar', CustomNavbar);