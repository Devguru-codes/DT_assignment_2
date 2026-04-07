document.addEventListener('DOMContentLoaded', async () => {
    // ── Auth Guard ──
    const userStr = localStorage.getItem('user');
    if (!userStr) { window.location.href = '/index.html'; return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { window.location.href = '/index.html'; return; }

    // ── Populate user info ──
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = user.full_name;
    const sidebarRole = document.getElementById('sidebar-user-role');
    if (sidebarRole) sidebarRole.textContent = 'Administrator';

    // ── Helpers ──
    function openModal(m) { m.classList.remove('hidden'); m.classList.add('flex'); }
    function closeModal(m) { m.classList.add('hidden'); m.classList.remove('flex'); }

    // ── Profile Modal ──
    const profileModal = document.getElementById('modal-profile');
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileRole = document.getElementById('profile-role');
    if (profileName) profileName.textContent = user.full_name;
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileRole) profileRole.textContent = 'Administrator';

    document.getElementById('nav-profile')?.addEventListener('click', (e) => { e.preventDefault(); openModal(profileModal); });
    document.getElementById('close-profile')?.addEventListener('click', () => closeModal(profileModal));
    profileModal?.addEventListener('click', (e) => { if (e.target === profileModal) closeModal(profileModal); });

    // ── Dark Mode Toggle ──
    const darkBtn = document.getElementById('btn-dark-mode');
    const html = document.documentElement;
    if (localStorage.getItem('theme') === 'dark') html.classList.add('dark');
    darkBtn?.addEventListener('click', () => {
        html.classList.toggle('dark');
        localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
        const icon = darkBtn.querySelector('.material-symbols-outlined');
        icon.textContent = html.classList.contains('dark') ? 'light_mode' : 'dark_mode';
    });
    if (darkBtn) {
        const icon = darkBtn.querySelector('.material-symbols-outlined');
        icon.textContent = html.classList.contains('dark') ? 'light_mode' : 'dark_mode';
    }

    // ── Logout ──
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });

    // ── Sidebar Navigation ──
    const heroSection = document.querySelector('main > section:first-of-type');
    const metricsSection = document.querySelector('main > section:nth-of-type(2)');
    const analyticsSection = document.querySelector('main > section:nth-of-type(3)');
    const workspaceGrid = document.querySelector('main > .grid');
    const footerSection = document.querySelector('main > section:last-of-type');

    document.getElementById('nav-dashboard')?.addEventListener('click', () => {
        [heroSection, metricsSection, analyticsSection, workspaceGrid, footerSection].forEach(s => { if (s) s.style.display = ''; });
    });

    document.getElementById('nav-leave-requests')?.addEventListener('click', () => {
        if (heroSection) heroSection.style.display = 'none';
        if (metricsSection) metricsSection.style.display = 'none';
        if (analyticsSection) analyticsSection.style.display = 'none';
        if (footerSection) footerSection.style.display = 'none';
        if (workspaceGrid) workspaceGrid.style.display = '';
        workspaceGrid?.scrollIntoView({ behavior: 'smooth' });
    });

    // ── Search ──
    const searchInput = document.querySelector('header input[type="text"]');
    searchInput?.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        const cards = queueContainer?.querySelectorAll(':scope > div') || [];
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) || !query ? '' : 'none';
        });
    });

    // ── Review Queue ──
    const queueContainer = document.querySelector('.space-y-4');
    const form = document.querySelector('form');
    let selectedRequestId = null;
    let allRequests = [];

    async function fetchLeaves() {
        try {
            const res = await fetch('/api/leave-requests');
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) window.location.href = '/index.html';
                return;
            }
            const data = await res.json();
            allRequests = data.leave_requests || [];
            renderQueue(allRequests);

            // Update hero pending number
            const pendingCircle = document.querySelector('.aspect-square .text-5xl');
            const adminReviewable = allRequests.filter(r =>
                ['escalated_to_admin', 'manager_approved', 'rejected_by_manager'].includes(r.status)
            );
            if (pendingCircle) pendingCircle.textContent = adminReviewable.length;

            // Update analytics
            renderAnalytics();
        } catch (e) { console.error(e); }
    }

    function renderQueue(requests) {
        if (!queueContainer) return;
        queueContainer.innerHTML = '';

        const reviewable = requests.filter(r =>
            ['escalated_to_admin', 'manager_approved', 'rejected_by_manager'].includes(r.status)
        );

        if (reviewable.length === 0) {
            queueContainer.innerHTML = `
                <div class="bg-surface-container-lowest p-8 rounded-xl text-center">
                    <span class="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
                    <p class="text-lg font-bold text-on-background">All Clear</p>
                    <p class="text-sm text-slate-500">No pending escalations at this time.</p>
                </div>`;
            return;
        }

        reviewable.forEach((req, idx) => {
            const isSelected = selectedRequestId === req.id;
            const card = document.createElement('div');
            card.className = `${isSelected ? 'bg-primary-fixed ring-2 ring-primary' : (idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low')} p-6 rounded-full flex items-center justify-between hover:bg-surface-bright transition-colors group cursor-pointer border border-transparent hover:border-outline-variant/10`;

            let tagLabel = 'Escalated';
            let tagColor = 'text-tertiary';
            if (req.status === 'rejected_by_manager') { tagLabel = 'Manager Rejected'; tagColor = 'text-error'; }
            else if (req.status === 'manager_approved') { tagLabel = 'Manager Approved'; tagColor = 'text-green-700'; }

            const initial = (req.employee_name || 'E').charAt(0);
            card.innerHTML = `
                <div class="flex items-center gap-6">
                    <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xl">${initial}</div>
                    <div>
                        <h4 class="font-bold text-on-background">${req.employee_name || 'Employee #' + req.employee_id}</h4>
                        <p class="text-xs text-slate-500">${req.leave_type} &bull; ${req.total_days} Days &bull; ${req.reason ? req.reason.substring(0, 40) : ''}</p>
                    </div>
                </div>
                <div class="flex items-center gap-8">
                    <div class="text-right">
                        <p class="text-xs font-bold ${tagColor} uppercase tracking-tighter">${tagLabel}</p>
                        <p class="text-[10px] text-slate-400">${req.start_date} to ${req.end_date}</p>
                    </div>
                    <span class="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                </div>
            `;

            card.addEventListener('click', () => {
                selectedRequestId = req.id;
                const caseDesc = form?.closest('div')?.querySelector('p.text-xs');
                if (caseDesc) {
                    caseDesc.innerHTML = `Arbitrating case <span class="text-primary font-bold">#LGR-${req.id}</span> for ${req.employee_name}. ${req.total_days} days of ${req.leave_type} (${req.start_date} to ${req.end_date}).`;
                }
                renderQueue(requests);
            });

            queueContainer.appendChild(card);
        });
    }

    // ── Form actions (Approve Override / Uphold Rejection) ──
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const textarea = form.querySelector('textarea');
            
            // clear old error styles
            textarea.classList.remove('ring-4', 'ring-red-500/50');
            
            if (!selectedRequestId) { 
                textarea.value = 'ERROR: Select a case from the queue first.';
                return; 
            }
            
            const comments = textarea?.value.trim();
            if (!comments || comments.startsWith('ERROR:')) { 
                textarea.classList.add('ring-4', 'ring-red-500/50');
                textarea.placeholder = "THIS FIELD IS MANDATORY!";
                return; 
            }
            
            // e.submitter gives the button that was clicked to submit the form
            const actionBtn = e.submitter;
            const action = actionBtn?.value === 'reject' ? 'reject' : 'approve';
            
            // Inline loading state
            const originalText = actionBtn.innerHTML;
            actionBtn.innerHTML = 'Processing...';
            actionBtn.disabled = true;
            
            await submitAdminReview(selectedRequestId, action, comments, actionBtn, originalText);
        });
    }

    async function submitAdminReview(id, action, comments, actionBtn, originalText) {
        try {
            const res = await fetch(`/api/leave-requests/${id}/admin-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, comments })
            });
            if (res.ok) {
                selectedRequestId = null;
                const textarea = form?.querySelector('textarea');
                if (textarea) textarea.value = '';
                await fetchLeaves();
            } else {
                const data = await res.json();
                console.error("Backend error:", data);
                if (form) {
                    const ta = form.querySelector('textarea');
                    if (ta) ta.value = `ERROR: ${data.message || data.error}`;
                }
            }
        } catch (e) {
            console.error('Review failed:', e);
            if (form) {
                    const ta = form.querySelector('textarea');
                    if (ta) ta.value = `ERROR: Network failure.`;
            }
        } finally {
            if (actionBtn && originalText) {
                actionBtn.innerHTML = originalText;
                actionBtn.disabled = false;
            }
        }
    }

    // ── Fetch live dashboard stats ──
    async function fetchStats() {
        try {
            const res = await fetch('/api/dashboard/stats');
            if (!res.ok) return;
            const s = await res.json();
            // Update metric cards
            document.querySelectorAll('section h3.text-4xl, section .text-4xl.font-bold').forEach(el => {
                const parent = el.closest('div');
                const label = parent?.querySelector('p');
                if (!label) return;
                const t = label.textContent.toLowerCase();
                if (t.includes('approved')) el.textContent = s.total_approved.toLocaleString();
                else if (t.includes('rejected')) el.textContent = s.total_rejected.toLocaleString();
            });
            const escEl = document.querySelector('.text-4xl.font-bold.text-white');
            if (escEl) escEl.textContent = s.escalation_rate + '%';

            // Update Last Reconciliation
            const reconEl = document.getElementById('last-reconciliation');
            if (reconEl) reconEl.textContent = new Date().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { console.error(e); }
    }

    // ── View All Archives button ──
    document.getElementById('btn-view-archives')?.addEventListener('click', () => {
        const resolved = allRequests.filter(r => r.status.includes('approved') || r.status.includes('rejected'));
        if (resolved.length === 0) { alert('No archived decisions found.'); return; }
        renderQueue(resolved);
    });

    // ── Footer buttons (print/download/share) ──
    document.querySelectorAll('span.material-symbols-outlined').forEach(icon => {
        const btn = icon.closest('div.h-10, button');
        if (!btn) return;
        const iconName = icon.getAttribute('data-icon') || icon.textContent.trim();
        if (iconName === 'print') {
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => window.print());
        }
        if (iconName === 'download') {
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => {
                if (allRequests.length === 0) { alert('No data to export.'); return; }
                const headers = ['ID','Employee','Type','Start','End','Days','Status','Manager Comments','Admin Comments'];
                const rows = allRequests.map(r => [r.id, r.employee_name, r.leave_type, r.start_date, r.end_date, r.total_days, r.status, r.manager_comments || '', r.admin_comments || '']);
                const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'admin_leave_report.csv';
                a.click();
            });
        }
        if (iconName === 'share') {
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => {
                if (navigator.share) {
                    navigator.share({ title: 'Leave Approval Report', text: 'Admin dashboard report', url: window.location.href });
                } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Dashboard link copied to clipboard!');
                }
            });
        }
    });

    // ── ANALYTICS: Charts & Department Table ──
    let leaveTypeChart = null;
    let monthlyTrendChart = null;

    function renderAnalytics() {
        renderLeaveTypeChart();
        renderMonthlyTrendChart();
        renderDepartmentTable();
    }

    function renderLeaveTypeChart() {
        const ctx = document.getElementById('chart-leave-type');
        if (!ctx || typeof Chart === 'undefined') return;

        // Count leave types
        const typeCounts = {};
        allRequests.forEach(r => {
            typeCounts[r.leave_type] = (typeCounts[r.leave_type] || 0) + 1;
        });

        const labels = Object.keys(typeCounts);
        const data = Object.values(typeCounts);
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

        if (leaveTypeChart) leaveTypeChart.destroy();
        leaveTypeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0, hoverOffset: 8 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { font: { size: 11, family: 'Inter' }, padding: 12 } }
                }
            }
        });
    }

    function renderMonthlyTrendChart() {
        const ctx = document.getElementById('chart-monthly-trend');
        if (!ctx || typeof Chart === 'undefined') return;

        // Group by month
        const monthCounts = {};
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        allRequests.forEach(r => {
            const d = new Date(r.start_date);
            const key = monthNames[d.getMonth()];
            monthCounts[key] = (monthCounts[key] || 0) + 1;
        });

        // Ensure all months shown (at least last 6)
        const now = new Date();
        const labels = [];
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = monthNames[m.getMonth()];
            labels.push(label);
            data.push(monthCounts[label] || 0);
        }

        if (monthlyTrendChart) monthlyTrendChart.destroy();
        monthlyTrendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Leave Requests',
                    data,
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderRadius: 6,
                    barThickness: 28
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { ticks: { font: { size: 11 } }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderDepartmentTable() {
        const tbody = document.getElementById('dept-table-body');
        if (!tbody) return;

        const departments = ['Engineering', 'Marketing', 'Sales', 'Finance', 'HR'];
        const deptData = departments.map(dept => {
            const totalEmp = Math.floor(Math.random() * 40) + 10; // Simulated
            const approved = allRequests.filter(r => r.status.includes('approved'));
            const pending = allRequests.filter(r => r.status.includes('pending'));
            const onLeave = Math.min(approved.length, Math.floor(Math.random() * 5));
            const pendingCount = Math.min(pending.length, Math.floor(Math.random() * 3));
            const available = totalEmp - onLeave;
            const utilization = totalEmp > 0 ? Math.round((onLeave / totalEmp) * 100) : 0;
            return { dept, totalEmp, onLeave, pendingCount, available, utilization };
        });

        tbody.innerHTML = deptData.map(d => `
            <tr class="border-b border-outline-variant/5 hover:bg-surface-container-low transition-colors">
                <td class="py-3 px-4 font-semibold text-on-background">${d.dept}</td>
                <td class="py-3 px-4 text-on-surface-variant">${d.totalEmp}</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">${d.onLeave}</span></td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">${d.pendingCount}</span></td>
                <td class="py-3 px-4 text-on-surface-variant">${d.available}</td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                        <div class="w-16 h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <div class="h-full bg-primary rounded-full" style="width: ${d.utilization}%"></div>
                        </div>
                        <span class="text-xs font-bold text-on-surface-variant">${d.utilization}%</span>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ── Export Report Button ──
    document.getElementById('btn-export-report')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Exporting...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/export-report');
            if (res.ok) {
                const blob = await res.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                
                // Get filename from Content-Disposition header if possible, else fallback
                const disposition = res.headers.get('Content-Disposition');
                let filename = `Leave_Report_${Date.now()}.docx`;
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) { 
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                
                a.download = filename;
                a.click();
                URL.revokeObjectURL(a.href);
            } else {
                const data = await res.json();
                alert(`Export failed: ${data.error || data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Export failed', error);
            alert('Export failed due to network error.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // ── Init ──
    await fetchLeaves();
    fetchStats();
});
