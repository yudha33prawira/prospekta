// ========== SUPABASE CONFIG ==========
const SUPABASE_URL = 'https://haylblhjzfavrfiyaicq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheWxibGhqemZhdnJmaXlhaWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzgyMDIsImV4cCI6MjA5NTMxNDIwMn0.j4yQa1ZttP5_Zg0ye5lK2OLecq39QhG3tPyv5PZ3r78';

// Inisialisasi Supabase client
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.db = _supabase;

// ========== GLOBAL VARIABLES ==========
let currentUser = null;
let currentUserRole = 'cs';
let currentUserName = '';
let customersData = [];
let prospekData = [];
let agentsData = [];
let agentsFilteredData = [];
let produkData = [];
let transaksiData = [];
let tarifAdminData = [];
let remindersData = [];
let messagesData = [];
let targetData = {
    agent: 0,
    ca: 0,
    koordinator: 0,
    transaksi: 0,
    monthlyTargets: []
};

// Selected items maps
let selectedAgentIds = new Map();
let selectedProdukIds = new Map();
let selectedClosingIds = new Map();
let selectedTidakIds = new Map();
let selectedNomorSalahIds = new Map();
let selectedCommitmentIds = new Map();
let selectedTransaksiIds = new Map();
let selectedFullFollowupIds = new Map();
let selectedFullProspekIds = new Map();

// Charts
let chartCustomer = null;
let chartProspek = null;
let targetChart = null;
let trendChart = null;

// Broadcast variables
let currentNumbers = [];
let savedTemplates = [];
let isBroadcasting = false;
let broadcastNumbers = [];
let broadcastMessageTemplate = '';
let currentBroadcastIndex = 0;
let broadcastStatus = [];

// ========== HELPER FUNCTIONS ==========
function showNotif(msg, isError = false) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.className = `notif-toast ${isError ? 'notif-error' : ''}`;
    document.getElementById('notifBox').appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}

function showNotifTop(msg, isError = false) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.className = `notif-toast ${isError ? 'notif-error' : ''}`;
    notif.style.cssText = 'z-index: 999999999; position: fixed; top: 20px; right: 20px; max-width: 350px;';
    document.getElementById('notifBox').appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function addDaysToDate(dateStr, days) {
    const date = new Date(dateStr || getTodayDate());
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

function formatRupiah(angka) {
    if (!angka && angka !== 0) return 'Rp 0';
    return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatPhone(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value.startsWith('0')) value = value.substring(1);
    if (value.length > 12) value = value.slice(0, 12);
    input.value = value;
}

function isMobile() {
    return window.innerWidth <= 768;
}

function updateSidebarBodyClass() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        document.body.classList.add('sidebar-open');
    } else {
        document.body.classList.remove('sidebar-open');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    }
}

function setupModalClickOutside(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modalId);
    });
}

// ========== FLOATING PROGRESS ==========
let activeProgress = null;

function showFloatingProgress(title, total = 0) {
    if (activeProgress) {
        activeProgress.remove();
        activeProgress = null;
    }

    const container = document.createElement('div');
    container.className = 'floating-progress';
    container.innerHTML = `
        <button class="progress-close" id="progressCloseBtn">✕</button>
        <div class="progress-status" id="progressStatus">
            <span class="spinner"></span>
            <span id="progressStatusText">${title}</span>
        </div>
        <div class="progress-bar-wrapper">
            <div class="progress-bar-track">
                <div class="progress-bar-fill-custom" id="floatingProgressFill"></div>
            </div>
            <div class="progress-text" id="floatingProgressText">0%</div>
        </div>
        <div class="progress-detail">
            <span id="floatingProgressDetail">Memulai proses...</span>
            <span class="progress-count" id="floatingProgressCount">${total > 0 ? `0 / ${total}` : ''}</span>
        </div>
    `;

    document.body.appendChild(container);
    activeProgress = container;

    const closeBtn = container.querySelector('#progressCloseBtn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (activeProgress) {
                activeProgress.remove();
                activeProgress = null;
            }
        };
    }

    return {
        update: (percent, status, detail, current = 0, totalCount = 0) => {
            const fillEl = document.getElementById('floatingProgressFill');
            const textEl = document.getElementById('floatingProgressText');
            const statusEl = document.getElementById('progressStatusText');
            const detailEl = document.getElementById('floatingProgressDetail');
            const countEl = document.getElementById('floatingProgressCount');

            if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            if (textEl) textEl.innerHTML = `${Math.floor(percent)}%`;
            if (statusEl && status) statusEl.innerHTML = status;
            if (detailEl && detail) detailEl.innerHTML = detail;
            if (countEl && totalCount > 0) countEl.innerHTML = `${current} / ${totalCount}`;
        },
        hide: () => {
            if (activeProgress) {
                activeProgress.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => {
                    if (activeProgress) {
                        activeProgress.remove();
                        activeProgress = null;
                    }
                }, 300);
            }
        },
        setTotal: (newTotal) => {
            const countEl = document.getElementById('floatingProgressCount');
            if (countEl) countEl.innerHTML = `0 / ${newTotal}`;
        }
    };
}

// ========== WHATSAPP FUNCTIONS ==========
function openWA(hp) {
    if (!hp) {
        showNotifTop('⚠️ Nomor WhatsApp tidak ditemukan!', true);
        return;
    }
    let cleanNomor = hp.toString().replace(/[^\d+]/g, '');
    if (!cleanNomor.startsWith('+')) {
        cleanNomor = cleanNomor.replace(/^0+/, '');
        if (cleanNomor.startsWith('62')) {
            cleanNomor = '+' + cleanNomor;
        } else {
            cleanNomor = '+62' + cleanNomor;
        }
    }
    window.open('https://wa.me/' + encodeURIComponent(cleanNomor), '_blank');
}

function openWAById(customerId) {
    const customer = customersData.find(c => c.id === customerId);
    if (customer && customer.hp) {
        openWA(customer.hp);
        return;
    }
    const prospek = prospekData.find(p => p.id === customerId);
    if (prospek && prospek.hp) {
        openWA(prospek.hp);
        return;
    }
    showNotifTop('⚠️ Nomor WhatsApp tidak ditemukan!', true);
}

// ========== LOAD DATA FUNCTIONS ==========
async function loadCustomers() {
    if (!currentUser) return;
    
    let query = window.db.from('customers').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading customers:', error);
        return;
    }
    
    customersData = data || [];
    renderFollowupKanban();
    renderFullFollowupKanban();
    updateStats();
    updateChartCustomer();
    updateDeadlineBadge();
}

async function loadProspek() {
    if (!currentUser) return;
    
    let query = window.db.from('prospek').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading prospek:', error);
        return;
    }
    
    prospekData = data || [];
    renderProspekKanban();
    renderFullProspekKanban();
    updateChartProspek();
    updateDeadlineBadge();
}

async function loadDatabaseAgent() {
    if (!currentUser) return;
    
    let query = window.db.from('db_agent').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading agents:', error);
        return;
    }
    
    agentsData = data || [];
    renderAgentList(agentsData);
}

async function loadProduk() {
    if (!currentUser) return;
    
    const { data, error } = await window.db.from('produk').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading produk:', error);
        return;
    }
    
    produkData = data || [];
    renderProdukList();
}

async function loadDbTransaksi() {
    if (!currentUser) return;
    
    let query = window.db.from('db_transaksi').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('tanggal_transaksi', { ascending: false });
    if (error) {
        console.error('Error loading transaksi:', error);
        return;
    }
    
    transaksiData = data || [];
    renderTransaksiList();
}

async function loadReminders() {
    if (!currentUser) return;
    
    let query = window.db.from('reminders').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading reminders:', error);
        return;
    }
    
    remindersData = data || [];
    renderRemindersList();
}

async function loadMessages() {
    if (!currentUser) return;
    
    const { data, error } = await window.db
        .from('messages')
        .select('*')
        .eq('to_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading messages:', error);
        return;
    }
    
    messagesData = data || [];
    renderMessagesList();
    updatePesanBadge();
}

async function loadUsersList() {
    if (currentUserRole !== 'owner') return;
    
    const { data, error } = await window.db.from('users').select('*').neq('id', currentUser.id);
    if (error) {
        console.error('Error loading users:', error);
        return;
    }
    
    renderUsersList(data || []);
}

async function loadUsersForSelect() {
    const { data, error } = await window.db.from('users').select('*').neq('id', currentUser.id);
    if (error) return;
    
    const select = document.getElementById('pesanTo');
    if (select) {
        select.innerHTML = '<option value="">Pilih CS Tujuan</option>' + 
            (data || []).map(user => `<option value="${user.id}">${escapeHtml(user.nama || user.email)}</option>`).join('');
    }
}

// ========== RENDER FUNCTIONS ==========
function renderFollowupKanban() {
    const today = getTodayDate();
    const lists = { baru: [], followup: [], pending: [], closing: [] };
    
    customersData.forEach(item => {
        const status = item.status || 'baru';
        if (status === 'closing') lists.closing.push(item);
        else if (status === 'pending') lists.pending.push(item);
        else if (status === 'followup') lists.followup.push(item);
        else lists.baru.push(item);
    });
    
    document.getElementById('countBaru').innerText = lists.baru.length;
    document.getElementById('countFollowup').innerText = lists.followup.length;
    document.getElementById('countPending').innerText = lists.pending.length;
    document.getElementById('countClosing').innerText = lists.closing.length;
    
    const renderColumn = (containerId, items) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(item => {
            const isOverdue = item.tanggal && item.tanggal < today;
            const isToday = item.tanggal === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
                <div class="card-name">${escapeHtml(item.nama)}</div>
                <div class="card-phone"><span>${escapeHtml(item.hp)}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span></div>
                <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
            </div>`;
        }).join('');
        
        container.querySelectorAll('.card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon')) {
                    openDetailCustomer(card.dataset.id);
                }
            });
        });
    };
    
    renderColumn('baruList', lists.baru);
    renderColumn('followupList', lists.followup);
    renderColumn('pendingList', lists.pending);
    renderColumn('closingList', lists.closing);
}

function renderProspekKanban() {
    const today = getTodayDate();
    const lists = { baru: [], dihubungi: [], negosiasi: [], tertarik: [] };
    
    prospekData.forEach(item => {
        const status = item.status || 'Baru';
        if (status === 'Baru') lists.baru.push(item);
        else if (status === 'Dihubungi') lists.dihubungi.push(item);
        else if (status === 'Negosiasi') lists.negosiasi.push(item);
        else if (status === 'Tertarik') lists.tertarik.push(item);
    });
    
    document.getElementById('countProspekBaru').innerText = lists.baru.length;
    document.getElementById('countDihubungi').innerText = lists.dihubungi.length;
    document.getElementById('countNegosiasi').innerText = lists.negosiasi.length;
    document.getElementById('countTertarik').innerText = lists.tertarik.length;
    
    const renderColumn = (containerId, items) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(item => {
            const isOverdue = item.deadline && item.deadline < today;
            const isToday = item.deadline === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div class="card-name">${escapeHtml(item.nama)}</div>
                <div class="card-phone"><span>${escapeHtml(item.hp)}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span></div>
                <div class="card-deadline">📅 ${item.deadline || '-'}</div>
            </div>`;
        }).join('');
        
        container.querySelectorAll('.card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon')) {
                    openDetailProspek(card.dataset.id);
                }
            });
        });
    };
    
    renderColumn('prospekBaruList', lists.baru);
    renderColumn('prospekDihubungiList', lists.dihubungi);
    renderColumn('prospekNegosiasiList', lists.negosiasi);
    renderColumn('prospekTertarikList', lists.tertarik);
}

function renderFullFollowupKanban() {
    const today = getTodayDate();
    const lists = { baru: [], followup: [], pending: [], closing: [] };
    
    customersData.forEach(item => {
        const status = item.status || 'baru';
        if (status === 'closing') lists.closing.push(item);
        else if (status === 'pending') lists.pending.push(item);
        else if (status === 'followup') lists.followup.push(item);
        else lists.baru.push(item);
    });
    
    document.getElementById('fullCountBaru').innerText = lists.baru.length;
    document.getElementById('fullCountFollowup').innerText = lists.followup.length;
    document.getElementById('fullCountPending').innerText = lists.pending.length;
    document.getElementById('fullCountClosing').innerText = lists.closing.length;
    
    const renderColumn = (containerId, items) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(item => {
            const isOverdue = item.tanggal && item.tanggal < today;
            const isToday = item.tanggal === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
                <div class="card-name">${escapeHtml(item.nama)}</div>
                <div class="card-phone"><span>${escapeHtml(item.hp)}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span></div>
                <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
            </div>`;
        }).join('');
        
        container.querySelectorAll('.card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon')) {
                    openDetailCustomer(card.dataset.id);
                }
            });
        });
    };
    
    renderColumn('fullBaruList', lists.baru);
    renderColumn('fullFollowupList', lists.followup);
    renderColumn('fullPendingList', lists.pending);
    renderColumn('fullClosingList', lists.closing);
}

function renderFullProspekKanban() {
    const today = getTodayDate();
    const lists = { baru: [], dihubungi: [], negosiasi: [], tertarik: [] };
    
    prospekData.forEach(item => {
        const status = item.status || 'Baru';
        if (status === 'Baru') lists.baru.push(item);
        else if (status === 'Dihubungi') lists.dihubungi.push(item);
        else if (status === 'Negosiasi') lists.negosiasi.push(item);
        else if (status === 'Tertarik') lists.tertarik.push(item);
    });
    
    document.getElementById('fullCountProspekBaru').innerText = lists.baru.length;
    document.getElementById('fullCountDihubungi').innerText = lists.dihubungi.length;
    document.getElementById('fullCountNegosiasi').innerText = lists.negosiasi.length;
    document.getElementById('fullCountTertarik').innerText = lists.tertarik.length;
    
    const renderColumn = (containerId, items) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(item => {
            const isOverdue = item.deadline && item.deadline < today;
            const isToday = item.deadline === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div class="card-name">${escapeHtml(item.nama)}</div>
                <div class="card-phone"><span>${escapeHtml(item.hp)}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span></div>
                <div class="card-deadline">📅 ${item.deadline || '-'}</div>
            </div>`;
        }).join('');
        
        container.querySelectorAll('.card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon')) {
                    openDetailProspek(card.dataset.id);
                }
            });
        });
    };
    
    renderColumn('fullProspekBaruList', lists.baru);
    renderColumn('fullProspekDihubungiList', lists.dihubungi);
    renderColumn('fullProspekNegosiasiList', lists.negosiasi);
    renderColumn('fullProspekTertarikList', lists.tertarik);
}

function renderAgentList(items) {
    const container = document.getElementById('dbAgentList');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data agent</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="db-item-agent" data-id="${item.id}">
            <div class="db-item-agent-info">
                <h4>${escapeHtml(item.nama || '-')}</h4>
                <p>📱 ${escapeHtml(item.hp || '-')} | 🆔 ${escapeHtml(item.agent_id || '-')}</p>
                <p>👤 Upline: ${escapeHtml(item.upline || '-')} | 🆔 CID: ${escapeHtml(item.cid || '-')}</p>
                <small>📅 ${item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}</small>
            </div>
            <div class="db-item-agent-actions">
                <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp || '')}')">💬 WA</button>
                <button class="db-item-move-followup" onclick="event.stopPropagation(); moveAgentToFollowup('${item.id}')">📞 Pindah ke Followup</button>
                <button class="db-item-delete" onclick="event.stopPropagation(); deleteAgentItem('${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

function renderProdukList() {
    const container = document.getElementById('produkList');
    if (!container) return;

    if (produkData.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">🏷️ Tidak ada produk ditemukan</p>';
        return;
    }

    container.innerHTML = produkData.map(item => `
        <div class="db-item produk-item" data-id="${item.id}">
            <div class="db-item-info">
                <h4>📦 ${escapeHtml(item.nama)}</h4>
                <p>💰 HPP: ${formatRupiah(item.hpp)}</p>
                <small>${escapeHtml(item.keterangan || '')}</small>
            </div>
            <div class="db-item-actions">
                <button class="db-item-edit" onclick="event.stopPropagation(); editProduk('${item.id}')">✏️ Edit</button>
                <button class="db-item-delete" onclick="event.stopPropagation(); deleteProduk('${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

function renderTransaksiList() {
    const container = document.getElementById('dbTransaksiList');
    if (!container) return;
    
    if (transaksiData.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Tidak ada data transaksi</p>';
        return;
    }
    
    container.innerHTML = transaksiData.map(item => {
        const progresIcon = item.progres_jenis === 'naik' ? '📈' : (item.progres_jenis === 'turun' ? '📉' : '⚖️');
        return `
            <div class="db-item-agent" data-id="${item.id}">
                <div class="db-item-agent-info">
                    <h4>${escapeHtml(item.nama || item.agent_id)}</h4>
                    <p>📱 ${escapeHtml(item.hp || '-')} | 🆔 ${escapeHtml(item.agent_id || '-')}</p>
                    <p>${progresIcon} ${item.progres_jenis?.toUpperCase() || 'NORMAL'} | Jumlah: ${Math.abs(item.progres_jumlah || 0).toLocaleString()}</p>
                    <small>📅 ${item.tanggal_transaksi ? new Date(item.tanggal_transaksi).toLocaleDateString('id-ID') : '-'}</small>
                </div>
                <div class="db-item-agent-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp || '')}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteTransaksiItem('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderRemindersList() {
    const container = document.getElementById('reminderList');
    if (!container) return;
    
    if (remindersData.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">⏰ Belum ada pengingat</p>';
        return;
    }
    
    container.innerHTML = remindersData.map(item => `
        <div class="db-item">
            <div class="db-item-info">
                <h4>📝 ${escapeHtml(item.title)}</h4>
                <p>${escapeHtml(item.description || '-')}</p>
                <small>⏰ ${item.datetime ? new Date(item.datetime).toLocaleString('id-ID') : '-'}</small>
            </div>
            <div class="db-item-actions">
                <button class="db-item-delete" onclick="deleteReminder('${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

function renderMessagesList() {
    const container = document.getElementById('pesanList');
    if (!container) return;
    
    if (messagesData.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">💬 Belum ada pesan</p>';
        return;
    }
    
    container.innerHTML = messagesData.map(item => `
        <div class="db-item ${!item.is_read ? 'unread' : ''}">
            <div class="db-item-info">
                <h4>📨 Dari: ${escapeHtml(item.from_name || 'CS Agent')}</h4>
                <p>${escapeHtml(item.message)}</p>
                <small>📅 ${new Date(item.created_at).toLocaleString('id-ID')} | ${item.is_read ? '✅ Dibaca' : '🆕 Baru'}</small>
            </div>
            <div class="db-item-actions">
                ${!item.is_read ? `<button class="db-item-wa" onclick="markAsRead('${item.id}')">✅ Tandai Dibaca</button>` : ''}
                <button class="db-item-delete" onclick="deletePesan('${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

function renderUsersList(users) {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">👥 Belum ada CS Agent selain Anda</p>';
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="db-item">
            <div class="db-item-info">
                <h4>${escapeHtml(user.nama || 'CS Agent')}</h4>
                <p>${user.email || '-'}</p>
                <small>HP: ${user.hp || '-'} | Role: ${user.role || 'cs'}</small>
            </div>
            <div class="db-item-actions">
                <button class="db-item-delete" onclick="deleteUser('${user.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

// ========== UPDATE STATS & CHARTS ==========
function updateStats() {
    const total = customersData.length;
    const closing = customersData.filter(c => c.status === 'closing').length;
    const active = total - closing;
    
    document.getElementById('totalData').innerText = total;
    document.getElementById('closingTotal').innerText = closing;
    document.getElementById('activeProspek').innerText = active;
    document.getElementById('rateClosing').innerText = total ? Math.round((closing / total) * 100) + '%' : '0%';
}

function updateChartCustomer() {
    const ctx = document.getElementById('chartCustomer');
    if (!ctx) return;
    
    const closing = customersData.filter(c => c.status === 'closing').length;
    const pending = customersData.filter(c => c.status === 'pending').length;
    const followup = customersData.filter(c => c.status === 'followup').length;
    const baru = customersData.length - (closing + pending + followup);
    
    if (chartCustomer) chartCustomer.destroy();
    
    chartCustomer = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Closing', 'Pending', 'Follow Up', 'Baru'],
            datasets: [{
                data: [closing, pending, followup, baru],
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'],
                borderWidth: 0,
                cutout: '65%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            return `${context.label}: ${value} (${total ? ((value / total) * 100).toFixed(1) : 0}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateChartProspek() {
    const ctx = document.getElementById('chartProspek');
    if (!ctx) return;
    
    const baru = prospekData.filter(p => p.status === 'Baru').length;
    const dihubungi = prospekData.filter(p => p.status === 'Dihubungi').length;
    const negosiasi = prospekData.filter(p => p.status === 'Negosiasi').length;
    const tertarik = prospekData.filter(p => p.status === 'Tertarik').length;
    
    if (chartProspek) chartProspek.destroy();
    
    chartProspek = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Baru', 'Dihubungi', 'Negosiasi', 'Tertarik'],
            datasets: [{
                data: [baru, dihubungi, negosiasi, tertarik],
                backgroundColor: ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981'],
                borderWidth: 0,
                cutout: '65%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            return `${context.label}: ${value} (${total ? ((value / total) * 100).toFixed(1) : 0}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ========== BADGE FUNCTIONS ==========
function updateDeadlineBadge() {
    if (!currentUser) return;
    const badge = document.getElementById('deadlineCount');
    if (!badge) return;
    
    const today = getTodayDate();
    let overdueCount = 0;
    
    customersData.forEach(c => {
        if (c.tanggal && c.tanggal < today && c.status !== 'closing') overdueCount++;
    });
    prospekData.forEach(p => {
        if (p.deadline && p.deadline < today) overdueCount++;
    });
    
    badge.innerText = overdueCount;
    if (overdueCount > 0) badge.classList.add('has-notif');
    else badge.classList.remove('has-notif');
}

function updatePesanBadge() {
    if (!currentUser) return;
    const badge = document.getElementById('pesanCount');
    if (!badge) return;
    
    const unreadCount = messagesData.filter(m => !m.is_read).length;
    badge.innerText = unreadCount;
    if (unreadCount > 0) badge.classList.add('has-notif');
    else badge.classList.remove('has-notif');
}

// ========== OPEN DETAILS ==========
async function openDetailCustomer(id) {
    const customer = customersData.find(c => c.id === id);
    if (!customer) return;
    
    document.getElementById('detailContent').innerHTML = `
        <div class="detail-header">
            <h3>${escapeHtml(customer.nama)}</h3>
            <div class="status-badge">${customer.status === 'followup' ? 'Follow Up' : customer.status}</div>
        </div>
        <div class="detail-body">
            <div class="detail-info">
                <div class="detail-info-item"><strong>🆔 ID Agent:</strong> ${escapeHtml(customer.agent_id || '-')}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(customer.hp)}</div>
                <div class="detail-info-item"><strong>👤 Upline:</strong> ${escapeHtml(customer.upline_name || '-')}</div>
                <div class="detail-info-item"><strong>📅 Deadline:</strong> ${customer.tanggal || '-'}</div>
            </div>
            <div class="detail-actions">
                <button class="btn-success" onclick="openWA('${customer.hp}')">💬 WhatsApp</button>
                ${customer.status === 'baru' ? `<button class="btn-primary" onclick="updateCustomerStatus('${id}', 'followup')">📞 Lanjut Follow Up</button>` : ''}
                ${customer.status === 'followup' ? `<button class="btn-primary" onclick="updateCustomerStatus('${id}', 'pending')">✅ Konfirmasi Follow Up</button>` : ''}
                ${customer.status === 'pending' ? `<button class="btn-primary" onclick="updateCustomerStatus('${id}', 'closing')">🎉 Jadikan Closing</button>` : ''}
            </div>
        </div>
        <div class="detail-footer">
            <button class="btn-outline" onclick="closeModal('detailModal')">Tutup</button>
            <button class="btn-danger" onclick="deleteCustomer('${id}')">Hapus</button>
        </div>
    `;
    showModal('detailModal');
}

async function openDetailProspek(id) {
    const prospek = prospekData.find(p => p.id === id);
    if (!prospek) return;
    
    document.getElementById('detailContent').innerHTML = `
        <div class="detail-header">
            <h3>${escapeHtml(prospek.nama)}</h3>
            <div class="status-badge">${prospek.status || 'Baru'}</div>
        </div>
        <div class="detail-body">
            <div class="detail-info">
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(prospek.hp)}</div>
                <div class="detail-info-item"><strong>📅 Deadline:</strong> ${prospek.deadline || '-'}</div>
            </div>
            <div class="detail-actions">
                <button class="btn-success" onclick="openWA('${prospek.hp}')">💬 WhatsApp</button>
                ${prospek.status === 'Baru' ? `<button class="btn-primary" onclick="updateProspekStatus('${id}', 'Dihubungi')">📞 Dihubungi</button>` : ''}
                ${prospek.status === 'Dihubungi' ? `<button class="btn-primary" onclick="updateProspekStatus('${id}', 'Negosiasi')">📋 Negosiasi</button>` : ''}
                ${prospek.status === 'Negosiasi' ? `<button class="btn-primary" onclick="updateProspekStatus('${id}', 'Tertarik')">⭐ Tertarik</button>` : ''}
            </div>
        </div>
        <div class="detail-footer">
            <button class="btn-outline" onclick="closeModal('detailModal')">Tutup</button>
            <button class="btn-danger" onclick="deleteProspek('${id}')">Hapus</button>
        </div>
    `;
    showModal('detailModal');
}

// ========== CRUD OPERATIONS ==========
async function updateCustomerStatus(id, newStatus) {
    const customer = customersData.find(c => c.id === id);
    if (!customer) return;
    
    const currentDeadline = customer.tanggal || getTodayDate();
    const newDeadline = addDaysToDate(currentDeadline, 1);
    
    const { error } = await window.db
        .from('customers')
        .update({ status: newStatus, tanggal: newDeadline, updated_at: new Date().toISOString() })
        .eq('id', id);
    
    if (error) {
        showNotifTop('❌ Gagal update: ' + error.message, true);
        return;
    }
    
    showNotifTop(`✅ Status berhasil diupdate. Deadline +1 hari menjadi ${newDeadline}`);
    closeModal('detailModal');
    await loadCustomers();
}

async function updateProspekStatus(id, newStatus) {
    const prospek = prospekData.find(p => p.id === id);
    if (!prospek) return;
    
    const currentDeadline = prospek.deadline || getTodayDate();
    const newDeadline = addDaysToDate(currentDeadline, 1);
    
    const { error } = await window.db
        .from('prospek')
        .update({ status: newStatus, deadline: newDeadline, updated_at: new Date().toISOString() })
        .eq('id', id);
    
    if (error) {
        showNotifTop('❌ Gagal update: ' + error.message, true);
        return;
    }
    
    showNotifTop(`✅ Status berhasil diupdate ke ${newStatus}. Deadline +1 hari menjadi ${newDeadline}`);
    closeModal('detailModal');
    await loadProspek();
}

async function deleteCustomer(id) {
    if (!confirm('Yakin hapus customer ini?')) return;
    
    const { error } = await window.db.from('customers').delete().eq('id', id);
    if (error) {
        showNotifTop('❌ Gagal hapus: ' + error.message, true);
        return;
    }
    
    showNotifTop('🗑️ Data customer berhasil dihapus');
    closeModal('detailModal');
    await loadCustomers();
}

async function deleteProspek(id) {
    if (!confirm('Yakin hapus prospek ini?')) return;
    
    const { error } = await window.db.from('prospek').delete().eq('id', id);
    if (error) {
        showNotifTop('❌ Gagal hapus: ' + error.message, true);
        return;
    }
    
    showNotifTop('🗑️ Data prospek berhasil dihapus');
    closeModal('detailModal');
    await loadProspek();
}

async function addCustomer(agentId, nama, hp, apk, uplineName, deadline) {
    const { error } = await window.db.from('customers').insert({
        agent_id: agentId.toUpperCase(),
        nama: nama,
        hp: hp,
        apk: apk || null,
        upline_name: uplineName || null,
        tanggal: deadline,
        status: 'baru',
        user_id: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
    
    if (error) {
        showNotifTop('❌ Gagal simpan: ' + error.message, true);
        return false;
    }
    
    showNotifTop('✅ Data customer berhasil ditambahkan');
    await loadCustomers();
    return true;
}

async function addProspek(nama, hp, deadline) {
    const { error } = await window.db.from('prospek').insert({
        nama: nama,
        hp: hp,
        deadline: deadline,
        status: 'Baru',
        user_id: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
    
    if (error) {
        showNotifTop('❌ Gagal simpan: ' + error.message, true);
        return false;
    }
    
    showNotifTop('✅ Data prospek berhasil ditambahkan');
    await loadProspek();
    return true;
}

async function moveAgentToFollowup(agentId) {
    const agent = agentsData.find(a => a.id === agentId);
    if (!agent) return;

    if (!confirm(`Pindahkan agent "${escapeHtml(agent.nama)}" ke Followup Agen?`)) return;

    const { error } = await window.db.from('customers').insert({
        agent_id: agent.agent_id,
        nama: agent.nama,
        hp: agent.hp,
        apk: agent.apk || '',
        upline_name: agent.upline || '',
        tanggal: getTodayDate(),
        status: 'baru',
        user_id: agent.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    if (error) {
        showNotifTop('❌ Gagal memindahkan: ' + error.message, true);
        return;
    }

    await window.db.from('db_agent').delete().eq('id', agentId);
    showNotifTop('✅ Agent berhasil dipindahkan ke Followup Agen!');
    await loadDatabaseAgent();
    await loadCustomers();
}

async function deleteAgentItem(id) {
    if (!confirm('Yakin hapus data agent ini?')) return;
    
    const { error } = await window.db.from('db_agent').delete().eq('id', id);
    if (error) {
        showNotifTop('❌ Gagal hapus: ' + error.message, true);
        return;
    }
    
    showNotifTop('🗑️ Data agent berhasil dihapus');
    await loadDatabaseAgent();
}

async function deleteTransaksiItem(id) {
    if (!confirm('Yakin hapus data transaksi ini?')) return;
    
    const { error } = await window.db.from('db_transaksi').delete().eq('id', id);
    if (error) {
        showNotifTop('❌ Gagal hapus: ' + error.message, true);
        return;
    }
    
    showNotifTop('🗑️ Data transaksi berhasil dihapus');
    await loadDbTransaksi();
}

async function deleteProduk(id) {
    if (!confirm('Yakin hapus produk ini?')) return;
    
    await window.db.from('produk').delete().eq('id', id);
    showNotifTop('🗑️ Produk berhasil dihapus');
    await loadProduk();
}

async function editProduk(id) {
    const produk = produkData.find(p => p.id === id);
    if (!produk) return;
    
    const newNama = prompt('Edit Nama Produk:', produk.nama);
    if (!newNama) return;
    
    const newHpp = prompt('Edit HPP (Modal):', produk.hpp);
    if (!newHpp) return;
    
    await window.db.from('produk').update({
        nama: newNama,
        hpp: parseInt(newHpp),
        updated_at: new Date().toISOString()
    }).eq('id', id);
    
    showNotifTop('✅ Produk berhasil diupdate');
    await loadProduk();
}

async function deleteReminder(id) {
    if (!confirm('Hapus pengingat ini?')) return;
    await window.db.from('reminders').delete().eq('id', id);
    showNotifTop('🗑️ Pengingat dihapus');
    await loadReminders();
}

async function markAsRead(id) {
    await window.db.from('messages').update({ is_read: true }).eq('id', id);
    await loadMessages();
}

async function deletePesan(id) {
    if (!confirm('Hapus pesan ini?')) return;
    await window.db.from('messages').delete().eq('id', id);
    await loadMessages();
}

async function sendPesan(toId, message) {
    const { error } = await window.db.from('messages').insert({
        from_id: currentUser.id,
        from_name: currentUserName,
        to_id: toId,
        message: message,
        is_read: false,
        created_at: new Date().toISOString()
    });
    
    if (error) {
        showNotifTop('❌ Gagal kirim: ' + error.message, true);
        return false;
    }
    
    showNotifTop('✅ Pesan terkirim');
    return true;
}

async function deleteUser(userId) {
    if (!confirm('Yakin ingin menghapus CS Agent ini?')) return;
    
    await window.db.from('users').delete().eq('id', userId);
    showNotifTop('✅ CS Agent berhasil dihapus');
    await loadUsersList();
}

// ========== TARGET FUNCTIONS ==========
async function loadTargetData() {
    if (!currentUser) return;
    
    const { data, error } = await window.db.from('settings').select('*').eq('key', 'targetKPI').maybeSingle();
    if (data && data.value) {
        targetData = data.value;
    }
    await updateTargetDisplay();
}

async function updateTargetDisplay() {
    const currentAgent = agentsData.filter(a => a.agent_type === 'AGENT').length;
    const currentKoor = agentsData.filter(a => a.agent_type === 'Koordinator Wilayah (KORWIL)' || a.agent_type === 'SUB KORWIL').length;
    const currentCA = agentsData.filter(a => a.agent_type === 'CollectingAgent (CA)' || a.agent_type === 'SUB CA').length;
    
    document.getElementById('targetAgentValue').innerText = targetData.agent || 0;
    document.getElementById('targetKoorValue').innerText = targetData.koordinator || 0;
    document.getElementById('targetCAValue').innerText = targetData.ca || 0;
    
    document.getElementById('targetAgentReached').innerText = currentAgent;
    document.getElementById('targetKoorReached').innerText = currentKoor;
    document.getElementById('targetCAReached').innerText = currentCA;
    
    const agentPercent = targetData.agent ? Math.min((currentAgent / targetData.agent) * 100, 100) : 0;
    const koorPercent = targetData.koordinator ? Math.min((currentKoor / targetData.koordinator) * 100, 100) : 0;
    const caPercent = targetData.ca ? Math.min((currentCA / targetData.ca) * 100, 100) : 0;
    
    document.getElementById('targetAgentProgress').style.width = agentPercent + '%';
    document.getElementById('targetKoorProgress').style.width = koorPercent + '%';
    document.getElementById('targetCAProgress').style.width = caPercent + '%';
}

async function saveTargetData() {
    const agentVal = parseInt(document.getElementById('targetAgentInput')?.value) || 0;
    const koorVal = parseInt(document.getElementById('targetKoorInput')?.value) || 0;
    const caVal = parseInt(document.getElementById('targetCAInput')?.value) || 0;
    
    const newTarget = {
        agent: agentVal,
        koordinator: koorVal,
        ca: caVal,
        updated_at: new Date().toISOString()
    };
    
    const { error } = await window.db.from('settings').upsert({
        key: 'targetKPI',
        value: newTarget,
        updated_at: new Date().toISOString()
    });
    
    if (error) {
        showNotifTop('❌ Gagal menyimpan target: ' + error.message, true);
        return;
    }
    
    targetData = newTarget;
    showNotifTop('✅ Target berhasil disimpan!');
    closeModal('manageTargetModal');
    await updateTargetDisplay();
}

// ========== BROADCAST FUNCTIONS ==========
async function loadBroadcastNumbers() {
    const sourceType = document.querySelector('input[name="sourceType"]:checked')?.value || 'customer';
    
    if (sourceType === 'custom') {
        const customNumbers = document.getElementById('customNumbers')?.value || '';
        const numbers = customNumbers.split('\n').filter(n => n.trim()).map(n => ({ hp: n.trim(), nama: 'Custom' }));
        currentNumbers = numbers;
        document.getElementById('numberCount').innerText = currentNumbers.length;
        document.getElementById('numbersList').innerHTML = numbers.map(num => `<div class="number-item">📞 ${escapeHtml(num.hp)}</div>`).join('');
        return;
    }
    
    let collection = '';
    let statusValues = [];
    
    if (sourceType === 'customer') {
        collection = 'customers';
        statusValues = Array.from(document.querySelectorAll('#customerFilter input:checked')).map(cb => cb.value);
    } else if (sourceType === 'prospek') {
        collection = 'prospek';
        statusValues = Array.from(document.querySelectorAll('#prospekFilter input:checked')).map(cb => cb.value);
    }
    
    if (!collection) return;
    
    let query = window.db.from(collection).select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    if (statusValues.length > 0) {
        query = query.in('status', statusValues);
    }
    
    const { data, error } = await query;
    if (error) {
        showNotifTop('❌ Gagal memuat nomor: ' + error.message, true);
        return;
    }
    
    const numbers = (data || []).filter(item => item.hp).map(item => ({
        hp: item.hp,
        nama: item.nama || 'Customer'
    }));
    
    currentNumbers = numbers;
    document.getElementById('numberCount').innerText = currentNumbers.length;
    document.getElementById('numbersList').innerHTML = currentNumbers.map(item => 
        `<div class="number-item">👤 ${escapeHtml(item.nama)}<br>📞 ${escapeHtml(item.hp)}</div>`
    ).join('');
}

function initTemplateFeature() {
    loadTemplates();
    
    document.getElementById('saveTemplateBtn').onclick = () => {
        const name = document.getElementById('templateName').value;
        const message = document.getElementById('broadcastMessage').value;
        if (!name) {
            showNotifTop('⚠️ Masukkan nama template!', true);
            return;
        }
        if (!message) {
            showNotifTop('⚠️ Pesan tidak boleh kosong!', true);
            return;
        }
        saveTemplate(name, message);
        document.getElementById('templateName').value = '';
    };
}

function loadTemplates() {
    const saved = localStorage.getItem('prospekta_templates');
    if (saved) savedTemplates = JSON.parse(saved);
    renderTemplateList();
}

function saveTemplate(name, message) {
    savedTemplates.unshift({ name, message, created_at: new Date().toISOString() });
    if (savedTemplates.length > 10) savedTemplates = savedTemplates.slice(0, 10);
    localStorage.setItem('prospekta_templates', JSON.stringify(savedTemplates));
    renderTemplateList();
    showNotifTop('✅ Template berhasil disimpan');
}

function renderTemplateList() {
    const container = document.getElementById('templateList');
    if (!container) return;
    
    if (savedTemplates.length === 0) {
        container.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:20px;">Belum ada template tersimpan</p>';
        return;
    }
    
    container.innerHTML = savedTemplates.map((template, idx) => `
        <div class="template-item">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <strong style="font-size:13px;">📝 ${escapeHtml(template.name)}</strong>
                <div>
                    <button class="template-use-btn" data-idx="${idx}" style="background:#4f46e5;color:#fff;border:0;border-radius:6px;padding:4px 10px;font-size:11px;margin-right:5px;cursor:pointer">Gunakan</button>
                    <button class="template-delete-btn" data-idx="${idx}" style="background:#ef4444;color:#fff;border:0;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer">Hapus</button>
                </div>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(template.message.substring(0,100))}${template.message.length>100?'...':''}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.template-use-btn').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            const template = savedTemplates[idx];
            if (template) {
                document.getElementById('broadcastMessage').value = template.message;
                showNotifTop(`✅ Template "${template.name}" diterapkan`);
            }
        };
    });
    
    document.querySelectorAll('.template-delete-btn').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            if (confirm('Hapus template ini?')) {
                savedTemplates.splice(idx, 1);
                localStorage.setItem('prospekta_templates', JSON.stringify(savedTemplates));
                renderTemplateList();
                showNotifTop('🗑️ Template dihapus');
            }
        };
    });
}

async function sendBroadcast() {
    const messageTemplate = document.getElementById('broadcastMessage')?.value;
    
    if (!messageTemplate) {
        showNotifTop('⚠️ Pesan tidak boleh kosong!', true);
        return;
    }
    
    if (currentNumbers.length === 0) {
        showNotifTop('⚠️ Tidak ada nomor tujuan!', true);
        return;
    }
    
    for (const item of currentNumbers) {
        const message = messageTemplate.replace(/{nama}/g, item.nama || 'Customer');
        let nomor = item.hp.toString().replace('+', '').replace(/^0/, '62').replace(/[^\d]/g, '');
        window.open('https://wa.me/' + nomor + '?text=' + encodeURIComponent(message), '_blank');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    showNotifTop(`✅ Broadcast selesai! ${currentNumbers.length} chat WhatsApp dibuka`);
}

// ========== SEARCH FUNCTIONS ==========
async function performSearch() {
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!keyword) {
        showNotifTop('⚠️ Masukkan kata kunci pencarian!', true);
        return;
    }
    
    const results = [];
    
    customersData.forEach(item => {
        if (item.nama?.toLowerCase().includes(keyword) || item.hp?.includes(keyword) || item.agent_id?.toLowerCase().includes(keyword)) {
            results.push({ id: item.id, type: 'customer', title: item.nama, subtitle: item.hp, badge: 'Followup Agen' });
        }
    });
    
    prospekData.forEach(item => {
        if (item.nama?.toLowerCase().includes(keyword) || item.hp?.includes(keyword)) {
            results.push({ id: item.id, type: 'prospek', title: item.nama, subtitle: item.hp, badge: 'Prospek Agen' });
        }
    });
    
    const resultsContainer = document.getElementById('searchResults');
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">🔍 Tidak ada data yang ditemukan</p>';
        return;
    }
    
    resultsContainer.innerHTML = results.map(result => `
        <div class="search-result-item" data-id="${result.id}" data-type="${result.type}">
            <div class="search-result-info">
                <h4>${escapeHtml(result.title)}</h4>
                <p>${escapeHtml(result.subtitle)}</p>
            </div>
            <span class="search-result-badge">${result.badge}</span>
        </div>
    `).join('');
    
    document.querySelectorAll('.search-result-item').forEach(el => {
        el.onclick = () => {
            const id = el.dataset.id;
            const type = el.dataset.type;
            if (type === 'customer') openDetailCustomer(id);
            else if (type === 'prospek') openDetailProspek(id);
        };
    });
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">🔍 Masukkan kata kunci untuk mencari data</p>';
}

// ========== USER PROFILE FUNCTIONS ==========
async function loadUserProfile() {
    if (!currentUser) return;
    
    const { data, error } = await window.db.from('users').select('*').eq('id', currentUser.id).single();
    if (data) {
        currentUserName = data.nama || currentUser.email;
        currentUserRole = data.role || 'cs';
        document.getElementById('topUserName').innerText = currentUserName;
        document.getElementById('profileName').value = data.nama || '';
        document.getElementById('profileEmail').value = currentUser.email;
        document.getElementById('profilePhone').value = data.hp ? data.hp.replace('+62', '') : '';
        document.getElementById('profileImg').src = data.foto || 'https://i.pravatar.cc/40';
        document.getElementById('previewFoto').src = data.foto || 'https://i.pravatar.cc/100';
    } else {
        currentUserName = currentUser.email;
        document.getElementById('topUserName').innerText = currentUserName;
    }
}

async function updateUserProfile(nama, hp, foto) {
    const { error } = await window.db.from('users').upsert({
        id: currentUser.id,
        nama: nama,
        hp: hp ? '+62' + hp.replace(/[^\d]/g, '') : null,
        foto: foto,
        email: currentUser.email,
        role: currentUserRole,
        updated_at: new Date().toISOString()
    });
    
    if (error) {
        showNotifTop('❌ Gagal simpan profile: ' + error.message, true);
        return false;
    }
    
    currentUserName = nama;
    document.getElementById('topUserName').innerText = nama;
    showNotifTop('✅ Profile berhasil disimpan');
    return true;
}

// ========== AUTH FUNCTIONS ==========
async function handleLogin(email, password) {
    const { data, error } = await window.db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function handleLogout() {
    await window.db.auth.signOut();
    currentUser = null;
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

// ========== PAGE NAVIGATION ==========
function navigateTo(page) {
    const pages = ['dashboardPage', 'followupFullPage', 'prospekFullPage', 'dbAgentPage', 'dbTransaksiPage', 
                   'dbClosingPage', 'dbTidakPage', 'dbNomorSalahPage', 'dbCommitmentPage', 'produkPage', 
                   'reminderPage', 'pesanPage', 'broadcastPage', 'searchPage', 'manageUsersPage', 'importPage'];
    
    pages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.style.display = 'none';
    });
    
    const pageMap = {
        'dashboard': 'dashboardPage',
        'followupFull': 'followupFullPage',
        'prospekFull': 'prospekFullPage',
        'dbAgent': 'dbAgentPage',
        'dbTransaksi': 'dbTransaksiPage',
        'dbClosing': 'dbClosingPage',
        'dbTidak': 'dbTidakPage',
        'dbNomorSalah': 'dbNomorSalahPage',
        'dbCommitment': 'dbCommitmentPage',
        'produk': 'produkPage',
        'reminder': 'reminderPage',
        'pesan': 'pesanPage',
        'broadcast': 'broadcastPage',
        'search': 'searchPage',
        'manageUsers': 'manageUsersPage',
        'import': 'importPage'
    };
    
    const targetPage = pageMap[page];
    if (targetPage) {
        const el = document.getElementById(targetPage);
        if (el) el.style.display = 'block';
    }
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    const activeMenu = document.querySelector(`.menu-item[data-page="${page}"]`);
    if (activeMenu) activeMenu.classList.add('active');
}

// ========== SIDEBAR HOVER FUNCTIONALITY ==========
function initSidebarHover() {
    const sidebar = document.getElementById('sidebar');
    const hoverZone = document.getElementById('hoverZone');
    let leaveTimeout = null;
    
    if (!sidebar || !hoverZone) return;
    
    hoverZone.addEventListener('mouseenter', () => {
        if (leaveTimeout) clearTimeout(leaveTimeout);
        if (!isMobile()) {
            sidebar.classList.add('active');
            updateSidebarBodyClass();
        }
    });
    
    sidebar.addEventListener('mouseenter', () => {
        if (leaveTimeout) clearTimeout(leaveTimeout);
    });
    
    sidebar.addEventListener('mouseleave', () => {
        leaveTimeout = setTimeout(() => {
            if (!isMobile() && !sidebar.matches(':hover')) {
                sidebar.classList.remove('active');
                updateSidebarBodyClass();
            }
        }, 200);
    });
}

// ========== PROFILE PHOTO FUNCTIONS ==========
function initProfilePhoto() {
    const profileImg = document.getElementById('profileImg');
    const previewFoto = document.getElementById('previewFoto');
    const cameraIconBtn = document.getElementById('cameraIconBtn');
    const profileFotoInput = document.getElementById('profileFoto');
    const previewPhotoLarge = document.getElementById('previewPhotoLarge');
    
    if (!profileImg) return;
    
    profileImg.addEventListener('click', () => {
        showModal('profileModal');
    });
    
    if (previewFoto) {
        previewFoto.addEventListener('click', (e) => {
            e.stopPropagation();
            if (previewPhotoLarge) {
                previewPhotoLarge.src = previewFoto.src;
                showModal('previewPhotoModal');
            }
        });
    }
    
    if (cameraIconBtn) {
        cameraIconBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (profileFotoInput) profileFotoInput.click();
        });
    }
    
    if (profileFotoInput) {
        profileFotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                if (file.size > 1024 * 1024) {
                    showNotifTop('⚠️ Ukuran foto maksimal 1MB', true);
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    const fotoUrl = e.target.result;
                    if (previewFoto) previewFoto.src = fotoUrl;
                    if (profileImg) profileImg.src = fotoUrl;
                    showNotifTop('📷 Foto baru dipilih, klik Simpan untuk menyimpan');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// ========== DARK MODE FUNCTIONALITY ==========
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (!darkModeToggle) return;
    
    const savedMode = localStorage.getItem('prospekta_darkmode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeToggle.classList.add('active');
    } else {
        document.body.classList.remove('dark-mode');
        darkModeToggle.classList.remove('active');
    }
    
    darkModeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            darkModeToggle.classList.remove('active');
            localStorage.setItem('prospekta_darkmode', 'disabled');
            showNotifTop('🌞 Mode Terang diaktifkan');
        } else {
            document.body.classList.add('dark-mode');
            darkModeToggle.classList.add('active');
            localStorage.setItem('prospekta_darkmode', 'enabled');
            showNotifTop('🌙 Mode Gelap diaktifkan');
        }
        
        if (chartCustomer) updateChartCustomer();
        if (chartProspek) updateChartProspek();
    });
}

// ========== INITIALIZATION ==========
function initEventListeners() {
    // Sidebar toggle
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            updateSidebarBodyClass();
        });
    }
    
    document.addEventListener('click', (e) => {
        if (isMobile() && sidebar && toggleBtn && 
            !sidebar.contains(e.target) && e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
            updateSidebarBodyClass();
        }
    });
    
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            updateSidebarBodyClass();
        }
    });
    
    // Menu navigation
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.page);
            if (isMobile()) sidebar.classList.remove('active');
            updateSidebarBodyClass();
        });
    });
    
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Add customer buttons
    document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
        document.getElementById('customerDate').value = getTodayDate();
        showModal('customerModal');
    });
    document.getElementById('addCustomerFullBtn')?.addEventListener('click', () => {
        document.getElementById('customerDate').value = getTodayDate();
        showModal('customerModal');
    });
    
    document.getElementById('saveCustomerBtn')?.addEventListener('click', async () => {
        const agentId = document.getElementById('customerId').value;
        const nama = document.getElementById('customerName').value;
        let hp = document.getElementById('customerPhone').value;
        const apk = document.getElementById('customerApk').value;
        const upline = document.getElementById('customerUpline').value;
        const deadline = document.getElementById('customerDate').value;
        
        if (!agentId || !nama) {
            showNotifTop('⚠️ ID Agent dan Nama wajib diisi!', true);
            return;
        }
        
        hp = hp.replace(/[^\d]/g, '');
        if (hp.startsWith('0')) hp = hp.substring(1);
        if (hp && !hp.startsWith('62')) hp = '62' + hp;
        
        await addCustomer(agentId, nama, hp || '', apk, upline, deadline);
        closeModal('customerModal');
        document.getElementById('customerId').value = '';
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('customerApk').value = '';
        document.getElementById('customerUpline').value = '';
    });
    
    // Add prospek buttons
    document.getElementById('addProspekBtn')?.addEventListener('click', () => {
        document.getElementById('prospekDeadline').value = getTodayDate();
        showModal('prospekModal');
    });
    document.getElementById('addProspekFullBtn')?.addEventListener('click', () => {
        document.getElementById('prospekDeadline').value = getTodayDate();
        showModal('prospekModal');
    });
    
    document.getElementById('saveProspekBtn')?.addEventListener('click', async () => {
        const nama = document.getElementById('prospekName').value;
        let hp = document.getElementById('prospekPhone').value;
        const deadline = document.getElementById('prospekDeadline').value;
        
        if (!nama) {
            showNotifTop('⚠️ Nama wajib diisi!', true);
            return;
        }
        
        hp = hp.replace(/[^\d]/g, '');
        if (hp.startsWith('0')) hp = hp.substring(1);
        if (hp && !hp.startsWith('62')) hp = '62' + hp;
        
        await addProspek(nama, hp || '', deadline);
        closeModal('prospekModal');
        document.getElementById('prospekName').value = '';
        document.getElementById('prospekPhone').value = '';
    });
    
    // Profile modal
    document.getElementById('profileImg')?.addEventListener('click', () => {
        document.getElementById('profileModal').style.display = 'flex';
    });
    
    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
        const nama = document.getElementById('profileName').value;
        let hp = document.getElementById('profilePhone').value;
        const foto = document.getElementById('previewFoto')?.src || document.getElementById('profileImg').src;
        
        if (!nama) {
            showNotifTop('⚠️ Nama wajib diisi!', true);
            return;
        }
        
        await updateUserProfile(nama, hp, foto);
        closeModal('profileModal');
    });
    
    // Info button
    document.getElementById('infoBtn')?.addEventListener('click', () => showModal('infoModal'));
    document.getElementById('infoModalClose')?.addEventListener('click', () => closeModal('infoModal'));
    
    // Phone formatting
    document.getElementById('customerPhone')?.addEventListener('input', function() { formatPhone(this); });
    document.getElementById('prospekPhone')?.addEventListener('input', function() { formatPhone(this); });
    document.getElementById('profilePhone')?.addEventListener('input', function() { formatPhone(this); });
    
    // Password toggle
    document.getElementById('togglePasswordBtn')?.addEventListener('click', () => {
        const input = document.getElementById('loginPassword');
        input.type = input.type === 'password' ? 'text' : 'password';
    });
    
    // Search
    document.getElementById('searchBtn')?.addEventListener('click', performSearch);
    document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Target management
    document.getElementById('manageTargetBtn')?.addEventListener('click', () => {
        document.getElementById('targetAgentInput').value = targetData.agent || 0;
        document.getElementById('targetKoorInput').value = targetData.koordinator || 0;
        document.getElementById('targetCAInput').value = targetData.ca || 0;
        showModal('manageTargetModal');
    });
    
    document.getElementById('saveTargetBtn')?.addEventListener('click', saveTargetData);
    document.getElementById('cancelTargetBtn')?.addEventListener('click', () => closeModal('manageTargetModal'));
    
    // Reminder
    document.getElementById('addReminderBtn')?.addEventListener('click', () => {
        document.getElementById('reminderTitle').value = '';
        document.getElementById('reminderDesc').value = '';
        document.getElementById('reminderDateTime').value = '';
        showModal('reminderModal');
    });
    
    document.getElementById('saveReminderBtn')?.addEventListener('click', async () => {
        const title = document.getElementById('reminderTitle').value;
        const description = document.getElementById('reminderDesc').value;
        const datetime = document.getElementById('reminderDateTime').value;
        
        if (!title) {
            showNotifTop('⚠️ Judul pengingat wajib diisi!', true);
            return;
        }
        
        await window.db.from('reminders').insert({
            title: title,
            description: description,
            datetime: datetime,
            user_id: currentUser.id,
            user_name: currentUserName,
            created_at: new Date().toISOString()
        });
        
        showNotifTop('✅ Pengingat berhasil ditambahkan');
        closeModal('reminderModal');
        await loadReminders();
    });
    
    // Pesan
    document.getElementById('addPesanBtn')?.addEventListener('click', async () => {
        await loadUsersForSelect();
        showModal('pesanModal');
    });
    
    document.getElementById('savePesanBtn')?.addEventListener('click', async () => {
        const toId = document.getElementById('pesanTo').value;
        const message = document.getElementById('pesanMessage').value;
        
        if (!toId || !message) {
            showNotifTop('⚠️ Lengkapi data!', true);
            return;
        }
        
        await sendPesan(toId, message);
        closeModal('pesanModal');
        document.getElementById('pesanTo').value = '';
        document.getElementById('pesanMessage').value = '';
    });
    
    // Broadcast
    document.querySelectorAll('input[name="sourceType"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const filterCard = document.getElementById('filterStatusCard');
            const customCard = document.getElementById('customNumbersCard');
            const prospekFilter = document.getElementById('prospekFilter');
            const customerFilter = document.getElementById('customerFilter');
            
            if (filterCard) filterCard.style.display = 'block';
            if (prospekFilter) prospekFilter.style.display = 'none';
            if (customerFilter) customerFilter.style.display = 'none';
            if (customCard) customCard.style.display = 'none';
            
            if (radio.value === 'customer') {
                if (customerFilter) customerFilter.style.display = 'flex';
            } else if (radio.value === 'prospek') {
                if (prospekFilter) prospekFilter.style.display = 'flex';
            } else if (radio.value === 'custom') {
                if (customCard) customCard.style.display = 'block';
            }
            loadBroadcastNumbers();
        });
    });
    
    document.getElementById('refreshNumbersBtn')?.addEventListener('click', loadBroadcastNumbers);
    document.getElementById('sendBroadcastBtn')?.addEventListener('click', sendBroadcast);
    document.getElementById('customNumbers')?.addEventListener('input', loadBroadcastNumbers);
    
    document.querySelectorAll('#customerFilter input, #prospekFilter input').forEach(cb => {
        cb.addEventListener('change', loadBroadcastNumbers);
    });
    
    initTemplateFeature();
    loadBroadcastNumbers();
    
    // Deadline notification button
    document.getElementById('deadlineNotifBtn')?.addEventListener('click', async () => {
        const today = getTodayDate();
        const overdueCustomers = customersData.filter(c => c.tanggal && c.tanggal < today && c.status !== 'closing');
        const overdueProspek = prospekData.filter(p => p.deadline && p.deadline < today);
        
        if (overdueCustomers.length + overdueProspek.length > 0) {
            let message = `📅 DEADLINE TERLEWAT (${overdueCustomers.length + overdueProspek.length}):\n`;
            overdueCustomers.slice(0, 10).forEach(c => message += `\n• ${c.nama} (Customer) - ${c.tanggal}`);
            overdueProspek.slice(0, 10).forEach(p => message += `\n• ${p.nama} (Prospek) - ${p.deadline}`);
            alert(message);
        } else {
            showNotifTop('✅ Semua deadline terpenuhi!');
        }
    });
    
    // Pesan notification button
    document.getElementById('pesanNotifBtn')?.addEventListener('click', () => navigateTo('pesan'));
    
    // Close modal buttons
    document.querySelectorAll('.closeModalBtn').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
    
    // Modal click outside
    const modals = ['customerModal', 'prospekModal', 'profileModal', 'detailModal', 'infoModal', 
                    'manageTargetModal', 'inputTransaksiModal', 'transaksiListModal', 'reminderModal', 
                    'pesanModal', 'addCsModal', 'pilihNomorModal', 'pilihCsTujuanModal', 'previewPhotoModal'];
    modals.forEach(id => setupModalClickOutside(id));
    
    // Initialize additional features
    initSidebarHover();
    initProfilePhoto();
    initDarkMode();
}

async function checkAuth() {
    const { data: { session } } = await window.db.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        await loadUserProfile();
        await loadCustomers();
        await loadProspek();
        await loadDatabaseAgent();
        await loadProduk();
        await loadDbTransaksi();
        await loadReminders();
        await loadMessages();
        await loadUsersList();
        await loadTargetData();
        
        // Set owner menu visibility
        if (currentUserRole === 'owner') {
            document.getElementById('ownerMenu').style.display = 'block';
            document.getElementById('menuDbAgent').style.display = 'flex';
            document.getElementById('menuDbTransaksi').style.display = 'flex';
            document.getElementById('menuImport').style.display = 'flex';
        } else {
            document.getElementById('ownerMenu').style.display = 'none';
            document.getElementById('menuDbAgent').style.display = 'none';
            document.getElementById('menuDbTransaksi').style.display = 'none';
            document.getElementById('menuImport').style.display = 'none';
        }
        
        navigateTo('dashboard');
    } else {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
}

// Login handler
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (!email || !password) {
        errorDiv.textContent = 'Email dan password harus diisi!';
        return;
    }
    
    errorDiv.textContent = '';
    const btn = document.getElementById('loginBtn');
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    try {
        await handleLogin(email, password);
        await checkAuth();
    } catch (err) {
        errorDiv.textContent = 'Login gagal: ' + err.message;
    } finally {
        btn.textContent = 'Masuk';
        btn.disabled = false;
    }
});

// Listen for auth changes
window.db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        currentUser = null;
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    } else if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        loadUserProfile();
        loadCustomers();
        loadProspek();
        navigateTo('dashboard');
    }
});

// Start app
initEventListeners();
checkAuth();

// Make functions global for onclick
window.openWA = openWA;
window.openWAById = openWAById;
window.updateCustomerStatus = updateCustomerStatus;
window.updateProspekStatus = updateProspekStatus;
window.deleteCustomer = deleteCustomer;
window.deleteProspek = deleteProspek;
window.deleteReminder = deleteReminder;
window.markAsRead = markAsRead;
window.deletePesan = deletePesan;
window.editProduk = editProduk;
window.deleteProduk = deleteProduk;
window.moveAgentToFollowup = moveAgentToFollowup;
window.deleteAgentItem = deleteAgentItem;
window.deleteTransaksiItem = deleteTransaksiItem;
window.deleteUser = deleteUser;
window.closeModal = closeModal;
