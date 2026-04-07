document.addEventListener('DOMContentLoaded', async () => {
    // ── Auth Guard ──
    const userStr = localStorage.getItem('user');
    if (!userStr) { window.location.href = '/index.html'; return; }
    const user = JSON.parse(userStr);
    // X-005 FIX: Role-based URL guard
    if (user.role !== 'employee') { window.location.href = '/index.html'; return; }

    // ── Populate user info ──
    const welcomeHeader = document.querySelector('h1.text-\\[3\\.5rem\\]');
    if (welcomeHeader) welcomeHeader.textContent = `Welcome, ${user.full_name.split(' ')[0]}`;
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = user.full_name;
    const sidebarRole = document.getElementById('sidebar-user-role');
    if (sidebarRole) sidebarRole.textContent = user.role.replace('_', ' ');

    // ── Profile Modal ──
    const profileModal = document.getElementById('modal-profile');
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileDept = document.getElementById('profile-dept');
    const profileManager = document.getElementById('profile-manager');
    const profileRole = document.getElementById('profile-role');

    if (profileName) profileName.textContent = user.full_name;
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileDept) profileDept.textContent = user.department || 'N/A';
    if (profileManager) profileManager.textContent = user.manager_name || 'N/A';
    if (profileRole) profileRole.textContent = user.role.replace('_', ' ');

    function openModal(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    function closeModal(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    document.getElementById('nav-profile')?.addEventListener('click', () => openModal(profileModal));
    document.getElementById('close-profile')?.addEventListener('click', () => closeModal(profileModal));
    profileModal?.addEventListener('click', (e) => { if (e.target === profileModal) closeModal(profileModal); });

    // ── Calendar Modal ──
    const calendarModal = document.getElementById('modal-calendar');
    document.getElementById('btn-calendar')?.addEventListener('click', () => {
        buildCalendar();
        openModal(calendarModal);
    });
    document.getElementById('close-calendar')?.addEventListener('click', () => closeModal(calendarModal));
    calendarModal?.addEventListener('click', (e) => { if (e.target === calendarModal) closeModal(calendarModal); });

    // ── Dark Mode Toggle ──
    const darkBtn = document.getElementById('btn-dark-mode');
    const html = document.documentElement;
    // Load saved preference
    if (localStorage.getItem('theme') === 'dark') html.classList.add('dark');

    darkBtn?.addEventListener('click', () => {
        html.classList.toggle('dark');
        localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
        const icon = darkBtn.querySelector('.material-symbols-outlined');
        icon.textContent = html.classList.contains('dark') ? 'light_mode' : 'dark_mode';
    });
    // Set initial icon
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

    // ── Sidebar Navigation (Dashboard vs Leave Requests) ──
    const dashboardSection = document.querySelector('main > section');           // Hero section
    const balancesGrid = document.querySelector('main > .grid.grid-cols-12');     // Bento grid
    const workspaceGrid = document.querySelector('main > .grid.grid-cols-12:last-of-type'); // Form + table
    const navDashboard = document.getElementById('nav-dashboard');
    const navLeaveRequests = document.getElementById('nav-leave-requests');

    function setActiveNav(activeId) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('bg-blue-100', 'dark:bg-blue-900/30', 'text-blue-800', 'dark:text-blue-200', 'font-semibold');
            link.classList.add('text-slate-600', 'dark:text-slate-400');
        });
        const active = document.getElementById(activeId);
        if (active) {
            active.classList.add('bg-blue-100', 'dark:bg-blue-900/30', 'text-blue-800', 'dark:text-blue-200', 'font-semibold');
            active.classList.remove('text-slate-600', 'dark:text-slate-400');
        }
    }

    navDashboard?.addEventListener('click', () => {
        setActiveNav('nav-dashboard');
        if (dashboardSection) dashboardSection.style.display = '';
        if (balancesGrid) balancesGrid.style.display = '';
        if (workspaceGrid) workspaceGrid.style.display = '';
    });

    navLeaveRequests?.addEventListener('click', () => {
        setActiveNav('nav-leave-requests');
        // Hide hero + balances, show only the form & table
        if (dashboardSection) dashboardSection.style.display = 'none';
        if (balancesGrid) balancesGrid.style.display = 'none';
        if (workspaceGrid) workspaceGrid.style.display = '';
        // Smooth scroll to table area
        workspaceGrid?.scrollIntoView({ behavior: 'smooth' });
    });

    // ── F-010 FIX: Search bar ──
    const searchInput = document.querySelector('header input[type="text"]');
    searchInput?.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) || !query ? '' : 'none';
        });
    });

    // ── F-009 FIX: View History button ──
    let showingHistory = false;
    document.getElementById('btn-view-history')?.addEventListener('click', () => {
        showingHistory = !showingHistory;
        if (showingHistory) {
            const completed = allLeaves.filter(r => r.status.includes('approved') || r.status.includes('rejected'));
            renderTable(completed);
        } else {
            renderTable(allLeaves);
        }
    });

    // ── Leave Requests Data ──
    let allLeaves = [];

    async function fetchLeaves() {
        try {
            const res = await fetch('/api/leave-requests');
            if (res.status === 401 || res.status === 403) { window.location.href = '/index.html'; return; }
            const data = await res.json();
            allLeaves = data.leave_requests || [];
            renderTable(allLeaves);
        } catch (e) {
            console.error(e);
        }
    }

    function renderTable(requests) {
        const tbody = document.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (requests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-400">No leave requests yet. Submit one using the form!</td></tr>`;
            return;
        }
        requests.forEach(req => {
            const tr = document.createElement('tr');
            tr.className = 'group';

            let dotColor = 'bg-blue-500';
            if (req.leave_type.toLowerCase().includes('sick')) dotColor = 'bg-red-400';
            if (req.leave_type.toLowerCase().includes('personal')) dotColor = 'bg-amber-500';

            let statusColor = 'bg-secondary-container text-on-secondary-container';
            if (req.status.includes('approved')) statusColor = 'bg-green-100 text-green-800';
            if (req.status.includes('rejected')) statusColor = 'bg-red-100 text-red-800';
            if (req.status.includes('escalated')) statusColor = 'bg-amber-100 text-amber-800';

            tr.innerHTML = `
                <td class="py-4 px-4 bg-surface dark:bg-slate-800 rounded-l-xl transition-colors group-hover:bg-surface-container-low dark:group-hover:bg-slate-700">
                    <div class="flex items-center gap-3">
                        <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                        <span class="text-sm font-semibold">${req.leave_type}</span>
                    </div>
                </td>
                <td class="py-4 px-4 bg-surface dark:bg-slate-800 transition-colors group-hover:bg-surface-container-low dark:group-hover:bg-slate-700">
                    <div class="text-sm">${req.start_date} to ${req.end_date}</div>
                    <div class="text-[10px] text-slate-400">${req.total_days} days</div>
                </td>
                <td class="py-4 px-4 bg-surface dark:bg-slate-800 transition-colors group-hover:bg-surface-container-low dark:group-hover:bg-slate-700">
                    <span class="px-3 py-1 ${statusColor} text-[10px] font-bold rounded-full uppercase">${req.status.replace(/_/g, ' ')}</span>
                </td>
                <td class="py-4 px-4 bg-surface dark:bg-slate-800 rounded-r-xl transition-colors group-hover:bg-surface-container-low dark:group-hover:bg-slate-700 text-xs text-slate-500">
                    ${req.manager_comments || req.admin_comments || '--'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // ── Submit Leave Form ──
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const leave_type = document.getElementById('leave-type').value;
            const start_date = document.getElementById('start-date').value;
            const end_date = document.getElementById('end-date').value;
            const reason = document.getElementById('leave-reason').value || 'No reason provided';

            if (!start_date || !end_date) { alert('Please select both start and end dates.'); return; }

            try {
                const res = await fetch('/api/leave-requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leave_type, start_date, end_date, reason })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('Leave request submitted successfully!');
                    form.reset();
                    // Small delay to ensure DB commit propagates
                    await new Promise(r => setTimeout(r, 300));
                    await fetchLeaves();
                    // Scroll to the Recent Requests table
                    document.querySelector('tbody')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    alert(data.message || data.error);
                }
            } catch (e) { console.error(e); }
        });
    }

    // ── Calendar Builder ──
    function buildCalendar() {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        // Month title
        const titleEl = grid.previousElementSibling;
        if (!titleEl) {
            const h = document.querySelector('#modal-calendar h3');
            if (h) h.textContent = `${monthNames[month]} ${year} — Leave Calendar`;
        }

        // Day headers
        ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
            const hd = document.createElement('div');
            hd.className = 'text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2';
            hd.textContent = d;
            grid.appendChild(hd);
        });

        // Empty cells for offset
        for (let i = 0; i < firstDay; i++) {
            grid.appendChild(document.createElement('div'));
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cell.className = 'text-center py-3 rounded-lg text-sm font-medium transition-all';

            // Check if any leave covers this date
            let matchedLeave = null;
            for (const leave of allLeaves) {
                if (dateStr >= leave.start_date && dateStr <= leave.end_date) {
                    matchedLeave = leave;
                    break;
                }
            }

            if (matchedLeave) {
                if (matchedLeave.status.includes('approved')) {
                    cell.classList.add('bg-green-100', 'text-green-800', 'dark:bg-green-900/30', 'dark:text-green-300', 'font-bold');
                } else if (matchedLeave.status.includes('rejected')) {
                    cell.classList.add('bg-red-100', 'text-red-800', 'dark:bg-red-900/30', 'dark:text-red-300');
                } else {
                    cell.classList.add('bg-amber-100', 'text-amber-800', 'dark:bg-amber-900/30', 'dark:text-amber-300');
                }
                cell.title = `${matchedLeave.leave_type}: ${matchedLeave.status.replace(/_/g, ' ')}`;
            } else {
                cell.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-surface-container-low', 'dark:hover:bg-slate-700');
            }

            if (day === now.getDate() && !matchedLeave) {
                cell.classList.add('ring-2', 'ring-primary', 'font-bold');
            }

            cell.textContent = day;
            grid.appendChild(cell);
        }
    }

    // ── F-006 FIX: Fetch live leave balances ──
    async function fetchBalances() {
        try {
            const res = await fetch('/api/leave-balance');
            if (!res.ok) return;
            const b = await res.json();
            const cards = document.querySelectorAll('.grid.grid-cols-12.gap-6.mb-12 > div');
            if (cards[0]) {
                cards[0].querySelector('.text-6xl, .text-4xl')?.replaceWith(Object.assign(document.createElement('div'), {
                    className: 'text-6xl font-headline font-black text-on-background tracking-tighter',
                    textContent: b.annual.available.toFixed(1)
                }));
            }
            if (cards[1]) {
                const sickNum = cards[1].querySelector('.text-4xl');
                if (sickNum) sickNum.textContent = b.sick.available.toFixed(1);
            }
            if (cards[2]) {
                const persNum = cards[2].querySelector('.text-4xl');
                if (persNum) persNum.textContent = b.personal.available.toFixed(1);
            }
            // Update the subtitle text
            const subtitle = document.querySelector('main > section p.text-secondary, main > section p.max-w-2xl');
            if (subtitle) {
                subtitle.innerHTML = `Your editorial calendar is currently balanced. You have <span class="text-on-background font-semibold">${b.annual.available}</span> days of annual leave remaining. <span class="text-on-background font-semibold">${b.in_review_days}</span> days are in review.`;
            }
        } catch (e) { console.error(e); }
    }

    // ── Init ──
    fetchLeaves();
    fetchBalances();
});
