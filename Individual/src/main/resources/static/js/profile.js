document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const saveButton = document.getElementById('save-profile-btn');
    const profileForm = document.getElementById('profile-form');
    const passwordField = document.getElementById('password');
    const passwordConfirmField = document.getElementById('password-confirm');
    const profileModal = $('#profileModal');

    // Form submission
    saveButton.addEventListener('click', function(e) {
        e.preventDefault();

        // Clear previous errors
        clearErrors();

        // Validate form
        if (!validateForm()) {
            return;
        }

        // Get form data
        const userData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: passwordField.value || null
        };

        // Send API request
        updateProfile(userData);
    });

    function validateForm() {
        let isValid = true;

        // Check if passwords match if either is filled
        if (passwordField.value || passwordConfirmField.value) {
            if (passwordField.value !== passwordConfirmField.value) {
                showError(passwordConfirmField, 'Passwords do not match');
                isValid = false;
            } else if (passwordField.value.length < 6) {
                showError(passwordField, 'Password must be at least 6 characters');
                isValid = false;
            }
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(document.getElementById('email').value)) {
            showError(document.getElementById('email'), 'Invalid email');
            isValid = false;
        }

        // Validate name
        if (document.getElementById('name').value.trim() === '') {
            showError(document.getElementById('name'), 'Name is required');
            isValid = false;
        }

        return isValid;
    }

    function showError(element, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-danger error-message';
        errorDiv.textContent = message;
        element.parentNode.appendChild(errorDiv);
        element.classList.add('is-invalid');
    }

    function clearErrors() {
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    function updateProfile(userData) {
        // Show loading state
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

        fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Error updating profile');
                    });
                }
                return response.json();
            })
            .then(data => {
                // Update the view with new data
                document.getElementById('view-name').textContent = data.name;
                document.getElementById('view-email').textContent = data.email;

                // Show success message
                showAlert('success', 'Profile updated successfully');

                // Reset form and close modal
                profileForm.reset();
                profileModal.modal('hide');
            })
            .catch(error => {
                showAlert('danger', error.message);
            })
            .finally(() => {
                // Reset button state
                saveButton.disabled = false;
                saveButton.textContent = 'Save Changes';
            });
    }

    function showAlert(type, message) {
        const alertContainer = document.getElementById('alert-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show panel-alert panel-alert-${type}`;
        alert.role = 'alert';
        alert.innerHTML = `
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        `;

        alertContainer.appendChild(alert);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    }
});

// Function to show edit modal
function showEditModal() {
    $('#profileModal').modal('show');
}
