// Admin Form View JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Form View loaded');

    // Handle resend joining letter button
    const resendBtn = document.getElementById('resend-joining-btn');
    if (resendBtn) {
        resendBtn.addEventListener('click', async function() {
            const formId = this.getAttribute('data-form-id');
            const email = this.getAttribute('data-email');

            if (!email) {
                alert('No email address found for this applicant.');
                return;
            }

            // Disable button and show loading
            this.disabled = true;
            this.textContent = '📤 Sending...';

            try {
                const response = await fetch(`/admin/forms/${formId}/resend-joining`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (result.success) {
                    alert('Joining letter sent successfully to ' + email);
                } else {
                    alert('Error: ' + (result.error || 'Failed to send joining letter'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Network error occurred while sending joining letter');
            } finally {
                // Re-enable button
                this.disabled = false;
                this.textContent = '📨 Resend Joining Letter';
            }
        });
    }

    // Handle form assignment updates
    const assignmentForm = document.querySelector('form[action*="/assign"]');
    if (assignmentForm) {
        assignmentForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const userId = formData.get('userId');

            try {
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    alert('Assignment updated successfully!');
                    location.reload();
                } else {
                    alert('Error: ' + (result.error || 'Failed to update assignment'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Network error occurred');
            }
        });
    }

    // Handle accept/reject actions
    const actionForms = document.querySelectorAll('form[action*="/accept"], form[action*="/reject"]');
    actionForms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const action = this.action.includes('/accept') ? 'accept' : 'reject';
            const confirmMessage = action === 'accept'
                ? 'Are you sure you want to accept this application?'
                : 'Are you sure you want to reject this application? This action cannot be undone.';

            if (!confirm(confirmMessage)) {
                return;
            }

            const formData = new FormData(this);

            try {
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    alert(`Application ${action}ed successfully!`);
                    location.reload();
                } else {
                    alert('Error: ' + (result.error || `Failed to ${action} application`));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Network error occurred');
            }
        });
    });

    // Auto-refresh functionality (optional)
    let autoRefreshInterval;
    const startAutoRefresh = () => {
        autoRefreshInterval = setInterval(() => {
            // Only auto-refresh if page is visible and no forms are being edited
            if (document.visibilityState === 'visible' && !document.querySelector('form:invalid')) {
                location.reload();
            }
        }, 30000); // Refresh every 30 seconds
    };

    const stopAutoRefresh = () => {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
    };

    // Start auto-refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });

    // Start auto-refresh initially
    startAutoRefresh();

    // Clean up on page unload
    window.addEventListener('beforeunload', stopAutoRefresh);
});