document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        const userType = formData.get('userType');

        // Clear previous error messages
        errorMessage.textContent = '';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, userType })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token and user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('userType', data.userType);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect based on user type
                if (data.userType === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/employee';
                }
            } else {
                errorMessage.textContent = data.error || 'Login failed';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Network error. Please try again.';
        }
    });

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    if (token && userType) {
        if (userType === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/employee';
        }
    }
});
