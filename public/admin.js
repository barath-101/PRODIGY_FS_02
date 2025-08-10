document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || userType !== 'admin') {
        window.location.href = '/';
        return;
    }

    // Set admin name
    document.getElementById('adminName').textContent = `Welcome, ${user.firstName} ${user.lastName}`;

    // DOM elements
    const employeeTableBody = document.getElementById('employeeTableBody');
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const employeeModal = document.getElementById('employeeModal');
    const closeModal = document.getElementById('closeModal');
    const employeeForm = document.getElementById('employeeForm');
    const modalTitle = document.getElementById('modalTitle');
    const passwordGroup = document.getElementById('passwordGroup');
    const formErrorMessage = document.getElementById('formErrorMessage');
    const logoutBtn = document.getElementById('logoutBtn');

    let editingEmployeeId = null;

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

    // Load employees
    async function loadEmployees() {
        try {
            const response = await apiCall('/api/employees');
            const employees = await response.json();

            employeeTableBody.innerHTML = '';

            employees.forEach(employee => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${employee.id}</td>
                    <td>${employee.first_name} ${employee.last_name}</td>
                    <td>${employee.email}</td>
                    <td>${employee.phone || 'N/A'}</td>
                    <td>${employee.position}</td>
                    <td>${employee.department}</td>
                    <td>$${parseFloat(employee.salary || 0).toLocaleString()}</td>
                    <td><span class="status-${employee.status.toLowerCase()}">${employee.status}</span></td>
                    <td class="actions">
                        <button class="edit-btn" onclick="editEmployee(${employee.id})">Edit</button>
                        <button class="delete-btn" onclick="deleteEmployee(${employee.id})">Delete</button>
                    </td>
                `;
                employeeTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    // Show modal
    function showModal(isEdit = false) {
        modalTitle.textContent = isEdit ? 'Edit Employee' : 'Add New Employee';
        passwordGroup.style.display = isEdit ? 'none' : 'block';
        if (isEdit) {
            document.getElementById('password').removeAttribute('required');
        } else {
            document.getElementById('password').setAttribute('required', 'required');
        }
        employeeModal.style.display = 'block';
        formErrorMessage.textContent = '';
    }

    // Hide modal
    function hideModal() {
        employeeModal.style.display = 'none';
        employeeForm.reset();
        editingEmployeeId = null;
    }

    // Edit employee
    window.editEmployee = async function(id) {
        try {
            const response = await apiCall(`/api/employees/${id}`);
            const employee = await response.json();

            document.getElementById('employeeId').value = employee.id;
            document.getElementById('firstName').value = employee.first_name;
            document.getElementById('lastName').value = employee.last_name;
            document.getElementById('email').value = employee.email;
            document.getElementById('phone').value = employee.phone || '';
            document.getElementById('position').value = employee.position;
            document.getElementById('department').value = employee.department;
            document.getElementById('salary').value = employee.salary || '';
            document.getElementById('status').value = employee.status;

            editingEmployeeId = id;
            showModal(true);
        } catch (error) {
            console.error('Error loading employee:', error);
        }
    };

    // Delete employee
    window.deleteEmployee = async function(id) {
        if (!confirm('Are you sure you want to delete this employee?')) {
            return;
        }

        try {
            const response = await apiCall(`/api/employees/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadEmployees();
            } else {
                const error = await response.json();
                alert('Error deleting employee: ' + error.error);
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Error deleting employee');
        }
    };

    // Event listeners
    addEmployeeBtn.addEventListener('click', () => showModal(false));
    closeModal.addEventListener('click', hideModal);
    
    employeeModal.addEventListener('click', function(e) {
        if (e.target === employeeModal) {
            hideModal();
        }
    });

    logoutBtn.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '/';
    });

    // Form submission
    employeeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        formErrorMessage.textContent = '';

        const formData = new FormData(employeeForm);
        const employeeData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            position: formData.get('position'),
            department: formData.get('department'),
            salary: parseFloat(formData.get('salary')) || 0,
            status: formData.get('status')
        };

        if (!editingEmployeeId) {
            employeeData.password = formData.get('password');
        }

        try {
            const url = editingEmployeeId ? `/api/employees/${editingEmployeeId}` : '/api/employees';
            const method = editingEmployeeId ? 'PUT' : 'POST';

            const response = await apiCall(url, {
                method: method,
                body: JSON.stringify(employeeData)
            });

            if (response.ok) {
                hideModal();
                loadEmployees();
            } else {
                const error = await response.json();
                formErrorMessage.textContent = error.error || 'Error saving employee';
            }
        } catch (error) {
            console.error('Error saving employee:', error);
            formErrorMessage.textContent = 'Network error. Please try again.';
        }
    });

    // Load employees on page load
    loadEmployees();
});
