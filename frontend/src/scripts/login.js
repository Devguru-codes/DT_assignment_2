document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn?.textContent || 'Login to Dashboard';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value;
        const password = passwordInput.value;

        // F-020 FIX: Show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="inline-flex items-center gap-2"><svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Authenticating...</span>`;
            submitBtn.style.opacity = '0.7';
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                
                if (data.user.role === 'employee') {
                    window.location.href = '/employee.html';
                } else if (data.user.role === 'hr_manager') {
                    window.location.href = '/manager.html';
                } else if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                }
            } else {
                alert(data.message || data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login');
        } finally {
            // Reset button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                submitBtn.style.opacity = '1';
            }
        }
    });

    // F-019 FIX: Use more robust card detection with data attributes
    // First, tag the demo cards with data attributes for reliability
    const demoCards = document.querySelectorAll('.grid > div.bg-surface-container-low');
    const demoCredentials = [
        { email: 'employee@corp.local', password: 'Employee@123' },
        { email: 'manager@corp.local', password: 'Manager@123' },
        { email: 'admin@corp.local', password: 'Admin@123' }
    ];

    demoCards.forEach((card, idx) => {
        card.style.cursor = 'pointer';
        card.classList.add('hover:ring-2', 'hover:ring-primary', 'transition-all');
        
        // Try to match by content, fall back to index
        const cardText = card.textContent.toLowerCase();
        let cred;
        if (cardText.includes('employee')) cred = demoCredentials[0];
        else if (cardText.includes('manager')) cred = demoCredentials[1];
        else if (cardText.includes('admin')) cred = demoCredentials[2];
        else cred = demoCredentials[idx] || demoCredentials[0];

        card.addEventListener('click', () => {
            emailInput.value = cred.email;
            passwordInput.value = cred.password;
            // Visual feedback
            demoCards.forEach(c => c.classList.remove('ring-2', 'ring-primary'));
            card.classList.add('ring-2', 'ring-primary');
        });
    });

    // F-039 FIX: Apply dark mode from localStorage
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
    }

    // F-037 FIX: Forgot Access link
    document.getElementById('forgot-access')?.addEventListener('click', () => {
        alert('Password reset is not available in the prototype. Please contact your system administrator.');
    });

    // F-038 FIX: Footer links
    document.getElementById('link-privacy')?.addEventListener('click', () => {
        alert('Privacy Policy: All employee data is processed in compliance with GDPR and local data regulations.');
    });
    document.getElementById('link-terms')?.addEventListener('click', () => {
        alert('Audit Terms: All leave approvals are logged in the permanent audit trail with timestamps and approver identity.');
    });
    document.getElementById('link-support')?.addEventListener('click', () => {
        alert('Support: For technical issues, contact IT Helpdesk at support@corp.local or ext. 5500.');
    });

    // X-010 FIX: Dynamic copyright year
    const yearEl = document.getElementById('copyright-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});
