document.addEventListener('DOMContentLoaded', async () => {
    // ── Auth Guard ──
    const userStr = localStorage.getItem('user');
    if (!userStr) { window.location.href = '/index.html'; return; }
    const user = JSON.parse(userStr);
    // X-005 FIX: Role-based URL guard
    if (user.role !== 'hr_manager') { window.location.href = '/index.html'; return; }

    // ── Populate user info ──
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = user.full_name;
    const sidebarRole = document.getElementById('sidebar-user-role');
    if (sidebarRole) sidebarRole.textContent = 'HR Manager';

    // ── Fix Today's Date ──
    const todayEl = document.getElementById('today-date');
    if (todayEl) {
        const now = new Date();
        todayEl.textContent = `Today: ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    // ── Helpers ──
    function openModal(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    function closeModal(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }

    // ── Profile Modal ──
    const profileModal = document.getElementById('modal-profile');
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileRole = document.getElementById('profile-role');
    if (profileName) profileName.textContent = user.full_name;
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileRole) profileRole.textContent = 'HR Manager';

    document.getElementById('nav-profile')?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(profileModal);
    });
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
        try { await fetch('/api/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });

    // ── Navigation ──
    const navDashboard = document.getElementById('nav-dashboard');
    const navLeaveRequests = document.getElementById('nav-leave-requests');
    const heroSection = document.querySelector('main > div:first-child');
    const insightSection = document.querySelector('main > section:last-of-type');
    const reviewSection = document.querySelector('main > section:first-of-type');
    const calendarSection = document.querySelectorAll('main > section')[1]; // calendar section

    function setActiveNav(id) {
        [navDashboard, navLeaveRequests].forEach(el => el?.classList.remove('bg-primary-container', 'text-on-primary-container'));
        document.getElementById(id)?.classList.add('bg-primary-container', 'text-on-primary-container');
    }

    navDashboard?.addEventListener('click', () => {
        setActiveNav('nav-dashboard');
        if (heroSection) heroSection.style.display = '';
        if (insightSection) insightSection.style.display = '';
        if (reviewSection) reviewSection.style.display = '';
        if (calendarSection) calendarSection.style.display = '';
    });

    navLeaveRequests?.addEventListener('click', () => {
        setActiveNav('nav-leave-requests');
        if (heroSection) heroSection.style.display = 'none';
        if (insightSection) insightSection.style.display = 'none';
        if (reviewSection) reviewSection.style.display = '';
        if (calendarSection) calendarSection.style.display = '';
        reviewSection?.scrollIntoView({ behavior: 'smooth' });
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

    // ── Review Queue Data ──
    const queueContainer = document.querySelector('.space-y-4');
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
            // Update big number
            const pendingEl = document.querySelector('h3.text-\\[3\\.5rem\\]');
            if (pendingEl) {
                const count = allRequests.filter(r => r.status === 'pending_manager_review').length;
                pendingEl.textContent = `${count} Pending Reviews`;
            }
            // Update calendar
            renderCalendar();
        } catch (e) { console.error(e); }
    }

    function renderQueue(requests) {
        if (!queueContainer) return;
        queueContainer.innerHTML = '';

        if (requests.length === 0) {
            queueContainer.innerHTML = `<div class="bg-surface-container-lowest p-8 rounded-xl text-center">
                <span class="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
                <p class="text-lg font-bold text-on-background">All Clear</p>
                <p class="text-sm text-slate-500">No leave requests require attention.</p>
            </div>`;
            return;
        }

        requests.forEach((req, idx) => {
            const isPending = req.status === 'pending_manager_review';
            const isAboveThreshold = req.total_days > 14;
            const card = document.createElement('div');
            card.className = `${idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'} rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 hover:bg-surface-bright transition-all group`;

            const initial = (req.employee_name || 'E').charAt(0);
            let tagLabel = req.status.replace(/_/g, ' ');
            let tagClass = 'bg-secondary-container text-on-secondary-container';
            if (isPending && isAboveThreshold) { tagLabel = 'Above Threshold'; tagClass = 'bg-error-container text-on-error-container'; }
            else if (isPending) { tagLabel = 'Within Policy'; tagClass = 'bg-secondary-container text-on-secondary-container'; }
            else if (req.status.includes('approved')) { tagClass = 'bg-green-100 text-green-800'; }
            else if (req.status.includes('rejected')) { tagClass = 'bg-red-100 text-red-800'; }
            else if (req.status.includes('escalated')) { tagClass = 'bg-amber-100 text-amber-800'; }

            let actionsHtml = '';
            if (isPending) {
                if (isAboveThreshold) {
                    actionsHtml = `
                        <button class="px-4 py-2 rounded-full text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all view-btn">View Details</button>
                        <button class="escalate-btn bg-primary text-on-primary px-5 py-2 rounded-full text-xs font-bold hover:scale-[0.98] transition-all flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">bolt</span> Escalate
                        </button>`;
                } else {
                    actionsHtml = `
                        <button class="reject-btn text-error font-bold text-xs px-4 py-2 hover:bg-error-container/20 rounded-full transition-all">Reject</button>
                        <button class="approve-btn bg-on-surface text-surface px-6 py-2 rounded-full text-xs font-bold hover:scale-[0.98] transition-all">Approve</button>`;
                }
            } else {
                actionsHtml = `<span class="text-sm font-semibold text-slate-400">Reviewed</span>`;
            }

            card.innerHTML = `
                <div class="flex items-center gap-4 flex-1">
                    <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">${initial}</div>
                    <div>
                        <p class="text-Title-MD font-bold text-on-background">${req.employee_name || 'Employee #' + req.employee_id}</p>
                        <p class="text-Label-SM text-on-surface-variant">${req.leave_type} &bull; ${req.total_days} Days Requested</p>
                    </div>
                </div>
                <div class="flex flex-col items-center md:items-start min-w-[120px]">
                    <span class="text-Label-SM font-bold text-on-surface-variant/40 uppercase">Duration</span>
                    <p class="text-Body-MD font-semibold">${req.start_date} to ${req.end_date}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="${tagClass} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${tagLabel}</span>
                </div>
                <div class="flex items-center gap-2 ml-auto">${actionsHtml}</div>
            `;

            // Wire button events — FIXED: use proper event handling
            if (isPending) {
                if (isAboveThreshold) {
                    const escBtn = card.querySelector('.escalate-btn');
                    const viewBtn = card.querySelector('.view-btn');
                    escBtn?.addEventListener('click', (e) => { e.stopPropagation(); handleReview(req.id, 'approve'); });
                    viewBtn?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        alert(`Request Details:\n\nEmployee: ${req.employee_name}\nType: ${req.leave_type}\nDuration: ${req.start_date} to ${req.end_date} (${req.total_days} days)\nReason: ${req.reason || 'N/A'}\nStatus: ${req.status}\n\nThis request exceeds the 14-day threshold and must be escalated to Admin.`);
                    });
                } else {
                    const appBtn = card.querySelector('.approve-btn');
                    const rejBtn = card.querySelector('.reject-btn');
                    appBtn?.addEventListener('click', (e) => { e.stopPropagation(); handleReview(req.id, 'approve', appBtn); });
                    rejBtn?.addEventListener('click', (e) => { e.stopPropagation(); handleReview(req.id, 'reject', rejBtn); });
                }
            }

            queueContainer.appendChild(card);
        });
    }

    async function handleReview(id, action, btnElement) {
        if (btnElement) {
            btnElement.disabled = true;
            btnElement.textContent = 'Processing...';
            btnElement.classList.add('opacity-50');
        }
        
        const comments = `Manager ${action}ed from dashboard`;
        try {
            const res = await fetch(`/api/leave-requests/${id}/manager-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, comments })
            });
            if (res.ok) {
                await fetchLeaves();
            } else {
                const data = await res.json();
                console.error("Backend error:", data);
                if (btnElement) {
                    btnElement.disabled = false;
                    btnElement.textContent = 'Failed';
                    btnElement.classList.remove('opacity-50');
                }
            }
        } catch (e) {
            console.error('Review failed:', e);
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.textContent = 'Error';
                btnElement.classList.remove('opacity-50');
            }
        }
    }

    // ── Fetch live dashboard stats ──
    async function fetchStats() {
        try {
            const res = await fetch('/api/dashboard/stats');
            if (!res.ok) return;
            const s = await res.json();
            const teamSizeEl = document.querySelector('.text-4xl.font-headline.font-bold');
            if (teamSizeEl && teamSizeEl.closest('div')?.querySelector('p')?.textContent.includes('Team Size')) {
                teamSizeEl.textContent = s.total_employees.toLocaleString();
            }
        } catch (e) { console.error(e); }
    }

    // ── Export Report as CSV ──
    document.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent.trim();
        if (text === 'Export Report') {
            btn.addEventListener('click', async (e) => {
                const btnEl = e.currentTarget;
                const originalText = btnEl.innerHTML;
                btnEl.innerHTML = 'Exporting...';
                btnEl.disabled = true;
                try {
                    const res = await fetch('/api/export-report');
                    if (res.ok) {
                        const blob = await res.blob();
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        
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
                    btnEl.innerHTML = originalText;
                    btnEl.disabled = false;
                }
            });
        }
        if (text === 'Clear Queue') {
            btn.addEventListener('click', async () => {
                const pending = allRequests.filter(r => r.status === 'pending_manager_review' && r.total_days <= 14);
                if (pending.length === 0) { alert('No within-policy requests to bulk approve.'); return; }
                if (!confirm(`Bulk approve ${pending.length} within-policy requests?`)) return;
                for (const req of pending) {
                    await fetch(`/api/leave-requests/${req.id}/manager-review`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'approve', comments: 'Bulk approved from dashboard' })
                    });
                }
                alert(`${pending.length} requests approved.`);
                fetchLeaves();
            });
        }
        if (text === 'Update Policy') {
            btn.addEventListener('click', () => { alert('Policy management module coming soon. Contact IT Admin for policy changes.'); });
        }
    });

    // ── Filter button ──
    let currentFilter = 'all';
    document.getElementById('btn-filter')?.addEventListener('click', () => {
        const filters = ['all', 'pending_manager_review', 'escalated_to_admin'];
        const labels = ['All', 'Pending Review', 'Escalated'];
        const idx = (filters.indexOf(currentFilter) + 1) % filters.length;
        currentFilter = filters[idx];
        document.getElementById('btn-filter').lastChild.textContent = ` Filter: ${labels[idx]}`;
        const filtered = currentFilter === 'all' ? allRequests : allRequests.filter(r => r.status === currentFilter);
        renderQueue(filtered);
    });

    // ── Sort button ──
    let sortAsc = true;
    document.getElementById('btn-sort')?.addEventListener('click', () => {
        sortAsc = !sortAsc;
        const sorted = [...allRequests].sort((a, b) => {
            const diff = a.total_days - b.total_days;
            return sortAsc ? diff : -diff;
        });
        renderQueue(sorted);
    });

    // ── Full Calendar View ──
    let calYear = new Date().getFullYear();
    let calMonth = new Date().getMonth();

    function renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const label = document.getElementById('cal-month-label');
        if (!grid || !label) return;

        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        label.textContent = `${monthNames[calMonth]} ${calYear}`;

        grid.innerHTML = '';

        // Day headers
        ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
            const h = document.createElement('div');
            h.className = 'text-center text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider py-2';
            h.textContent = d;
            grid.appendChild(h);
        });

        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const today = new Date();

        // Build a map of which dates have leaves
        const dateLeaveMap = {};
        allRequests.forEach(req => {
            const start = new Date(req.start_date);
            const end = new Date(req.end_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
                    const key = d.getDate();
                    if (!dateLeaveMap[key]) dateLeaveMap[key] = [];
                    dateLeaveMap[key].push(req);
                }
            }
        });

        // Empty cells for days before 1st
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'h-20 rounded-lg';
            grid.appendChild(empty);
        }

        // Day cells
        for (let d = 1; d <= daysInMonth; d++) {
            const cell = document.createElement('div');
            const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === d;
            cell.className = `h-20 rounded-lg p-1.5 border transition-all ${isToday ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-outline-variant/10 hover:bg-surface-container-low'}`;

            let dotsHtml = '';
            const leaves = dateLeaveMap[d] || [];
            if (leaves.length > 0) {
                const uniqueLeaves = leaves.reduce((acc, l) => {
                    if (!acc.find(x => x.id === l.id)) acc.push(l);
                    return acc;
                }, []);
                dotsHtml = uniqueLeaves.slice(0, 3).map(l => {
                    let color = 'bg-amber-400/60';
                    if (l.status.includes('approved')) color = 'bg-green-400/80';
                    else if (l.status.includes('rejected')) color = 'bg-red-400/60';
                    const name = (l.employee_name || '').split(' ')[0];
                    return `<div class="text-[8px] leading-tight px-1 py-0.5 rounded ${color} text-on-surface truncate" title="${l.employee_name}: ${l.leave_type}">${name}</div>`;
                }).join('');
                if (uniqueLeaves.length > 3) {
                    dotsHtml += `<div class="text-[7px] text-on-surface-variant text-center">+${uniqueLeaves.length - 3} more</div>`;
                }
            }

            cell.innerHTML = `
                <div class="text-[10px] font-bold ${isToday ? 'text-primary' : 'text-on-surface-variant'}">${d}</div>
                <div class="flex flex-col gap-0.5 mt-0.5">${dotsHtml}</div>
            `;
            grid.appendChild(cell);
        }
    }

    document.getElementById('cal-prev')?.addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    });

    // ── Init ──
    await fetchLeaves();
    fetchStats();
});
