document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || userType !== 'employee') {
        window.location.href = '/';
        return;
    }

    // Set employee name
    document.getElementById('employeeName').textContent = `Welcome, ${user.firstName} ${user.lastName}`;

    // DOM elements
    const fullName = document.getElementById('fullName');
    const position = document.getElementById('position');
    const profileDetails = document.getElementById('profileDetails');
    const logoutBtn = document.getElementById('logoutBtn');

    // API helper function
    async function apiCall(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            window.location.href = '/';
            return;
        }

        return response;
    }

    // Load employee profile
    async function loadProfile() {
        try {
            const response = await apiCall(`/api/employees/${user.id}`);
            const employee = await response.json();

            // Update header
            fullName.textContent = `${employee.first_name} ${employee.last_name}`;
            position.textContent = employee.position;

            // Format hire date
            const hireDate = new Date(employee.hire_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Create profile details
            profileDetails.innerHTML = `
                <div class="detail-item">
                    <label>Employee ID</label>
                    <span>${employee.id}</span>
                </div>
                <div class="detail-item">
                    <label>Email</label>
                    <span>${employee.email}</span>
                </div>
                <div class="detail-item">
                    <label>Phone</label>
                    <span>${employee.phone || 'Not provided'}</span>
                </div>
                <div class="detail-item">
                    <label>Position</label>
                    <span>${employee.position}</span>
                </div>
                <div class="detail-item">
                    <label>Department</label>
                    <span>${employee.department}</span>
                </div>
                <div class="detail-item">
                    <label>Salary</label>
                    <span>$${parseFloat(employee.salary || 0).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <label>Hire Date</label>
                    <span>${hireDate}</span>
                </div>
                <div class="detail-item">
                    <label>Status</label>
                    <span class="status-${employee.status.toLowerCase()}">${employee.status}</span>
                </div>
            `;
        } catch (error) {
            console.error('Error loading profile:', error);
            profileDetails.innerHTML = '<p>Error loading profile information.</p>';
        }
    }

    // Event listeners
    logoutBtn.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '/';
    });

    // Load profile on page load
    loadProfile();
});
