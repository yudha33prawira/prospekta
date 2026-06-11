// ========== SUPABASE CONFIGURATION ==========
const SUPABASE_URL = 'https://haylblhjzfavrfiyaicq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheWxibGhqemZhdnJmaXlhaWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzgyMDIsImV4cCI6MjA5NTMxNDIwMn0.j4yQa1ZttP5_Zg0ye5lK2OLecq39QhG3tPyv5PZ3r78';

// Timpa window.supabase dengan instance yang benar
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase initialized');

// Buat alias (tidak redeclare karena window.supabase sudah ada)
var supabase = window.supabase;  // menggunakan var, bukan let/const

// ========== GLOBAL VARIABLES ==========
let currentUser = null;
let currentUserRole = 'cs';
let currentUserName = '';
let currentUserEmail = '';
let importType = "transaksi";
let chartCustomer = null;
let chartProspek = null;
let sidebarTimeout = null;
let currentConvertProspekId = null;
let currentPendingId = null;
let pendingItems = [];
let currentProspekId = null;
let tarifAdminData = [];
let currentEditTarifId = null;
let customersData = [];
let prospekData = [];
let selectedAgentIds = new Map();
let selectedProdukIds = new Map();
let agentsData = [];
let agentsFilteredData = [];
let produkData = [];
let currentEditProdukId = null;
let currentAgentIdForProduct = null;
let currentAgentProducts = [];
let trendChart = null;
let currentTransaksiId = null;
let transaksiList = [];
let selectedFullFollowupIds = new Map();
let selectedFullProspekIds = new Map();
let uplineDataList = [];
let isUplineBroadcasting = false;
let activeProgress = null;
let selectedClosingIds = new Map();
let selectedTidakIds = new Map();
let selectedNomorSalahIds = new Map();
let selectedCommitmentIds = new Map();
let selectedTransaksiIds = new Map();
let currentNumbers = [];
let broadcastNumbers = [];
let broadcastMessageTemplate = '';
let isBroadcasting = false;
let broadcastStatus = [];
let savedTemplates = [];
let targetData = { agent: 0, ca: 0, koordinator: 0, transaksi: 0, monthlyTargets: [] };
let targetChart = null;
let transaksiData = [];
let transaksiLastDoc = null;
let transaksiHasMore = true;
let isLoadingMore = false;
let isLoadingData = false;
let isAuthProcessing = false;
let currentEditItem = null;
let currentEditType = null;
let currentBroadcastIndex = 0;
let daftarCs = [];
let pendingMoveData = [];

// ========== FIX PERSISTENSI ROLE ==========
// Fungsi untuk menyimpan role ke localStorage
function saveUserRole(role, name, email) {
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    console.log('💾 Role saved to localStorage:', role);
}

// Fungsi untuk mengambil role dari localStorage
function loadUserRoleFromStorage() {
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    if (role) {
        currentUserRole = role;
        currentUserName = name;
        console.log('📀 Role loaded from storage:', role);
        return true;
    }
    return false;
}

// Fungsi untuk update UI berdasarkan role (panggil kapan saja)
function applyUIBasedOnRole() {
    console.log('🎨 Applying UI based on role:', currentUserRole);
    
    const menuDbAgent = document.getElementById('menuDbAgent');
    const menuDbTransaksi = document.getElementById('menuDbTransaksi');
    const menuImport = document.getElementById('menuImport');
    const ownerMenu = document.getElementById('ownerMenu');
    const topUserNameEl = document.getElementById('topUserName');
    
    if (topUserNameEl && currentUserName) {
        topUserNameEl.innerText = currentUserName;
    }
    
    if (currentUserRole === 'owner') {
        if (menuDbAgent) menuDbAgent.style.display = 'flex';
        if (menuDbTransaksi) menuDbTransaksi.style.display = 'flex';
        if (menuImport) menuImport.style.display = 'flex';
        if (ownerMenu) ownerMenu.style.display = 'block';
    } else {
        if (menuDbAgent) menuDbAgent.style.display = 'none';
        if (menuDbTransaksi) menuDbTransaksi.style.display = 'none';
        if (menuImport) menuImport.style.display = 'none';
        if (ownerMenu) ownerMenu.style.display = 'none';
    }
}

// ========== HELPER FUNCTIONS ==========
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function addDaysToDate(dateStr, days) {
    if (!dateStr) return getTodayDate();
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

function formatRupiah(angka) {
    if (angka === undefined || angka === null) return 'Rp 0';
    return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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

function showNotif(msg, isError = false) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.className = `notif-toast ${isError ? 'notif-error' : 'notif-success'}`;
    const notifBox = document.getElementById('notifBox');
    if (notifBox) notifBox.appendChild(notif);
    setTimeout(() => notif.remove(), 5000);
}

function showNotifTop(msg, isError = false) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.className = `notif-toast ${isError ? 'notif-error' : 'notif-success'}`;
    notif.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; background: ' + (isError ? '#ef4444' : '#4f46e5') + '; color: white; padding: 10px 16px; border-radius: 12px; margin-bottom: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);';
    const notifBox = document.getElementById('notifBox');
    if (notifBox) notifBox.appendChild(notif);
    setTimeout(() => notif.remove(), 5000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.style.zIndex = '';
    }
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '100000';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    }
}

function setupModalClickOutside(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal(modalId);
    });
}

function getStatusBadge(status) {
    const map = {
        'baru': 'status-baru',
        'followup': 'status-followup',
        'pending': 'status-pending',
        'closing': 'status-closing',
        'Baru': 'status-baru',
        'Dihubungi': 'status-dihubungi',
        'Negosiasi': 'status-negosiasi',
        'Tertarik': 'status-tertarik'
    };
    const className = map[status] || 'status-baru';
    let display = status === 'followup' ? 'Follow Up' : status;
    return `<span class="status-badge ${className}">${display}</span>`;
}

function formatNama(input) {
    let value = input.value;
    if (value.length > 20) value = value.slice(0, 20);
    value = value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    input.value = value;
}

function formatPhone(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value.startsWith('0')) value = value.substring(1);
    if (value.startsWith('62')) value = value.substring(2);
    if (value.length > 13) value = value.slice(0, 13);
    input.value = value;
}

function showFloatingProgress(title, total = 0) {
    if (activeProgress) activeProgress.remove();
    const container = document.createElement('div');
    container.className = 'floating-progress';
    container.innerHTML = `
        <button class="progress-close" id="progressCloseBtn">✕</button>
        <div class="progress-status"><span class="spinner"></span><span id="progressStatusText">${title}</span></div>
        <div class="progress-bar-wrapper"><div class="progress-bar-track"><div class="progress-bar-fill-custom" id="floatingProgressFill"></div></div><div class="progress-text" id="floatingProgressText">0%</div></div>
        <div class="progress-detail"><span id="floatingProgressDetail">Memulai proses...</span><span class="progress-count" id="floatingProgressCount">${total > 0 ? `0 / ${total}` : ''}</span></div>
    `;
    document.body.appendChild(container);
    activeProgress = container;
    document.getElementById('progressCloseBtn').onclick = () => { if(activeProgress) activeProgress.remove(); activeProgress = null; };
    return {
        update: (percent, status, detail, current = 0, totalCount = 0) => {
            const fill = document.getElementById('floatingProgressFill');
            if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            const text = document.getElementById('floatingProgressText');
            if (text) text.innerHTML = `${Math.floor(percent)}%`;
            const statusEl = document.getElementById('progressStatusText');
            if (statusEl && status) statusEl.innerHTML = status;
            const detailEl = document.getElementById('floatingProgressDetail');
            if (detailEl && detail) detailEl.innerHTML = detail;
            const countEl = document.getElementById('floatingProgressCount');
            if (countEl && totalCount > 0) countEl.innerHTML = `${current} / ${totalCount}`;
        },
        hide: () => { if(activeProgress) activeProgress.remove(); activeProgress = null; },
        setTotal: (newTotal) => { const ce = document.getElementById('floatingProgressCount'); if(ce) ce.innerHTML = `0 / ${newTotal}`; }
    };
}

function showConfirmDialog(title, message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:99999999; backdrop-filter:blur(4px);';
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const bgColor = isDarkMode ? '#1e293b' : 'white';
    const textColor = isDarkMode ? '#f1f5f9' : '#1f2937';
    
    overlay.innerHTML = `
        <div class="confirm-dialog-content" style="background: ${bgColor}; border-radius:24px; max-width:400px; width:90%; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <h3 style="color: ${textColor}; font-size:20px; font-weight:700; padding:20px 20px 0; margin-bottom:4px;">⚠️ ${escapeHtml(title)}</h3>
            <div class="modal-subtitle" style="color:#6b7280; white-space:pre-line; padding:0 20px 12px; border-bottom:1px solid #f0f0f0;">${escapeHtml(message)}</div>
            <div style="padding:0 20px 20px 20px;">
                <p style="font-size:12px; color:#ef4444; margin-bottom:16px;">⚠️ Peringatan: Data yang sudah dipindahkan TIDAK BISA dikembalikan!</p>
                <div class="modal-buttons" style="display:flex; gap:12px; margin-top:8px;">
                    <button id="confirmYesBtn" style="flex:1; padding:12px; border:0; border-radius:14px; cursor:pointer; font-weight:600; background:#dc2626; color:#fff;">✅ Ya, Lanjutkan</button>
                    <button id="confirmNoBtn" style="flex:1; padding:12px; border:0; border-radius:14px; cursor:pointer; font-weight:600; background:#f3f4f6; color:#374151;">❌ Batal</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    const cleanup = () => { overlay.remove(); document.body.classList.remove('modal-open'); document.body.style.overflow = ''; };
    overlay.querySelector('#confirmYesBtn').onclick = () => { cleanup(); if(onConfirm) onConfirm(); };
    overlay.querySelector('#confirmNoBtn').onclick = () => { cleanup(); if(onCancel) onCancel(); };
    overlay.onclick = (e) => { if(e.target === overlay) { cleanup(); if(onCancel) onCancel(); } };
}

function getTargetPhone(customerData) {
    if (customerData.agent_type && customerData.agent_type !== 'AGENT' && customerData.upline_phone && customerData.upline_phone.trim())
        return customerData.upline_phone;
    return customerData.hp;
}

function getTargetName(customerData) {
    if (customerData.agent_type && customerData.agent_type !== 'AGENT' && customerData.upline_name && customerData.upline_name.trim())
        return customerData.upline_name;
    return customerData.nama;
}

// ========== WHATSAPP FUNCTIONS ==========
function openWADirect(nomor) {
    if (!nomor) {
        showNotifTop('⚠️ Nomor WhatsApp tidak ditemukan!', true);
        return;
    }
    let cleanNomor = nomor.toString().replace(/[^\d+]/g, '');
    if (!cleanNomor.startsWith('+')) {
        cleanNomor = cleanNomor.replace(/^0+/, '');
        cleanNomor = cleanNomor.startsWith('62') ? '+' + cleanNomor : '+62' + cleanNomor;
    }
    window.open('https://wa.me/' + encodeURIComponent(cleanNomor), '_blank');
}

function openWA(hp, customerData = null) {
    if (customerData && customerData.id) {
        showPilihNomor(customerData.id);
    } else if (hp) {
        openWADirect(hp);
    }
}

function openWAById(customerId) {
    showPilihNomor(customerId);
}

function openWACustomer(customerId) {
    showPilihNomor(customerId);
}

function showPilihNomor(customerId) {
    currentPilihNomorCustomerId = customerId;
    
    supabase.from('customers').select('*').eq('id', customerId).single().then(async ({ data }) => {
        if (!data) return;
        
        const safeString = (v) => v === null || v === undefined ? '' : String(v);
        const isValidPhone = (phone) => phone && phone !== '' && phone !== '+62' && phone !== '62' && phone !== '0';
        const options = [];
        
        const agentPhone = safeString(data.hp);
        if (isValidPhone(agentPhone)) {
            options.push({ jenis: 'agent', label: '📞 Nomor Agent (Pemilik)', nama: safeString(data.nama), nomor: agentPhone });
        }
        
        const uplinePhone = safeString(data.upline_phone);
        if (isValidPhone(uplinePhone)) {
            options.push({ jenis: 'upline', label: '👤 Nomor Upline (Atasan)', nama: safeString(data.upline_name) || 'Upline', nomor: uplinePhone });
        }
        
        const validOptions = options.filter(opt => opt.nomor);
        if (validOptions.length > 1) {
            options.unshift({ jenis: 'semua', label: '📢 Kirim ke SEMUA nomor', nama: 'Semua nomor', nomor: 'all' });
        }
        
        const modal = document.getElementById('pilihNomorModal');
        const container = document.getElementById('pilihNomorOptions');
        if (!modal || !container) return;
        
        if (validOptions.length === 0) {
            container.innerHTML = '<p style="color:#ef4444; padding:12px;">⚠️ Tidak ada nomor WhatsApp yang tersedia!</p>';
        } else {
            container.innerHTML = options.filter(opt => opt.nomor).map(opt => `
                <div class="pilih-nomor-option" data-nomor="${opt.nomor}" data-jenis="${opt.jenis}" style="padding:12px; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:all 0.2s;">
                    <div style="font-weight:600;">${opt.label}</div>
                    <div style="font-size:13px; color:#4f46e5;">${escapeHtml(opt.nama)}</div>
                    <div style="font-size:12px; color:#6b7280;">${opt.nomor}</div>
                </div>
            `).join('');
            
            document.querySelectorAll('.pilih-nomor-option').forEach(el => {
                el.addEventListener('click', (e) => {
                    const nomor = el.dataset.nomor;
                    if (nomor && nomor !== 'all') openWADirect(nomor);
                    else if (nomor === 'all') validOptions.forEach(opt => openWADirect(opt.nomor));
                    closeModal('pilihNomorModal');
                });
            });
        }
        modal.style.display = 'flex';
    });
}

let currentPilihNomorCustomerId = null;

// ========== LOAD DATA FUNCTIONS ==========
async function loadCustomers() {
    if (!currentUser) return [];
    
    console.log('📞 loadCustomers: Memulai...');
    try {
        let query = supabase.from('customers').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        customersData = data || [];
        console.log('Customers loaded:', customersData.length);
        return customersData;
    } catch (err) {
        console.error('Error loadCustomers:', err);
        return [];
    }
}

async function loadProspek() {
    if (!currentUser) return [];
    
    console.log('📋 loadProspek: Memulai...');
    try {
        let query = supabase.from('prospek').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        prospekData = data || [];
        console.log('Prospek loaded:', prospekData.length);
        return prospekData;
    } catch (err) {
        console.error('Error loadProspek:', err);
        return [];
    }
}

async function loadDatabaseAgent() {
    if (!currentUser) return [];
    
    try {
        let query = supabase.from('db_agent').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        
        let items = data || [];
        
        if (currentUserRole === 'owner' && items.length) {
            const userIds = [...new Set(items.map(a => a.user_id).filter(Boolean))];
            if (userIds.length) {
                const { data: users } = await supabase.from('users').select('id,nama').in('id', userIds);
                const map = new Map(users?.map(u => [u.id, u.nama]) || []);
                items = items.map(a => ({ ...a, nama: a.nama + (map.get(a.user_id) ? ` (${map.get(a.user_id)})` : '') }));
            }
        }
        
        agentsData = items;
        renderAgentList(items);
        return items;
    } catch (err) {
        console.error('Error loadDatabaseAgent:', err);
        return [];
    }
}

async function loadProduk() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase.from('produk').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        produkData = data || [];
        renderProdukList();
        updateProductSelect();
    } catch (err) {
        console.error('Error loadProduk:', err);
    }
}

async function loadTarifAdmin() {
    if (!currentUser) return;
    
    try {
        let query = supabase.from('tarif_admin').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        tarifAdminData = data || [];
        renderTarifAdminList();
    } catch (err) {
        console.error('Error loadTarifAdmin:', err);
    }
}

async function loadReminders() {
    if (!currentUser) return;
    
    try {
        let query = supabase.from('reminders').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        
        const container = document.getElementById('reminderList');
        if (!container) return;
        
        if (!data?.length) {
            container.innerHTML = '<p style="text-align:center;padding:40px;">⏰ Belum ada pengingat</p>';
            return;
        }
        
        container.innerHTML = data.map(item => `
            <div class="db-item">
                <div class="db-item-info">
                    <h4>📝 ${escapeHtml(item.title)}</h4>
                    <p>${escapeHtml(item.description || '-')}</p>
                    <small>⏰ ${item.datetime ? new Date(item.datetime).toLocaleString('id-ID') : '-'} ${currentUserRole === 'owner' && item.user_id !== currentUser.id ? `(Milik: ${escapeHtml(item.user_name || 'CS Lain')})` : ''}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-delete" onclick="deleteReminder('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loadReminders:', err);
    }
}

async function loadPesan() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase.from('messages').select('*').eq('to_id', currentUser.id).order('created_at', { ascending: false });
        if (error) throw error;
        
        const container = document.getElementById('pesanList');
        if (!container) return;
        
        if (!data?.length) {
            container.innerHTML = '<p style="text-align:center;padding:40px;">💬 Belum ada pesan</p>';
            return;
        }
        
        const fromIds = [...new Set(data.map(m => m.from_id).filter(Boolean))];
        let userMap = new Map();
        
        if (fromIds.length) {
            const { data: users } = await supabase.from('users').select('id,nama,email').in('id', fromIds);
            userMap = new Map(users?.map(u => [u.id, u.nama || u.email]) || []);
        }
        
        container.innerHTML = data.map(item => `
            <div class="db-item ${!item.is_read ? 'unread' : ''}">
                <div class="db-item-info">
                    <h4>📨 Dari: ${escapeHtml(userMap.get(item.from_id) || 'Unknown')}</h4>
                    <p>${escapeHtml(item.message)}</p>
                    <small>📅 ${new Date(item.created_at).toLocaleString('id-ID')} | ${item.is_read ? '✅ Dibaca' : '🆕 Baru'}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="markAsRead('${item.id}')">✅ Tandai Dibaca</button>
                    <button class="db-item-delete" onclick="deletePesan('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');
        
        updateAllBadges();
    } catch (err) {
        console.error('Error loadPesan:', err);
    }
}

async function loadUsersList() {
    if (currentUserRole !== 'owner') return;
    
    try {
        const { data, error } = await supabase.from('users').select('*').neq('id', currentUser.id);
        if (error) throw error;
        
        const container = document.getElementById('usersList');
        if (!container) return;
        
        if (!data?.length) {
            container.innerHTML = '<p style="text-align:center;padding:40px;">👥 Belum ada CS Agent selain Anda</p>';
            return;
        }
        
        container.innerHTML = data.map(user => `
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
    } catch (err) {
        console.error('Error loadUsersList:', err);
    }
}

async function loadUsersForSelect() {
    try {
        const { data, error } = await supabase.from('users').select('id,nama,email').neq('id', currentUser.id);
        if (error) throw error;
        
        const select = document.getElementById('pesanTo');
        if (!select) return;
        
        select.innerHTML = '<option value="">Pilih CS Tujuan</option>';
        data?.forEach(user => {
            select.innerHTML += `<option value="${user.id}">${escapeHtml(user.nama || user.email || 'CS Agent')}</option>`;
        });
        
        daftarCs = data || [];
    } catch (err) {
        console.error('Error loadUsersForSelect:', err);
    }
}

async function loadTargetData() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase.from('settings').select('*').eq('key', 'targetKPI').maybeSingle();
        
        if (error) throw error;
        
        if (data) {
            if (data.value) targetData = data.value;
            else if (data.data) targetData = data.data;
            else targetData = data;
        } else {
            targetData = {
                agent: 10,
                ca: 20,
                koordinator: 5,
                transaksi: 100,
                monthlyTargets: [],
                updated_at: new Date().toISOString()
            };
        }
        
        await updateTargetDisplay();
    } catch (err) {
        console.error('Error loadTargetData:', err);
    }
}

async function loadTransaksiGlobal() {
    if (!currentUser) return 0;
    
    try {
        const { data, error } = await supabase.from('transaksi_global').select('*').order('tanggal', { ascending: false });
        if (error) throw error;
        
        transaksiList = data || [];
        
        let totalBulan = 0;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        transaksiList.forEach(t => {
            const d = new Date(t.tanggal);
            if (d >= start && d <= end) totalBulan += t.nominal || 0;
        });
        
        window.totalTransaksiGlobal = totalBulan;
        await updateTargetDisplay();
        return totalBulan;
    } catch (err) {
        console.error('Error loadTransaksiGlobal:', err);
        return 0;
    }
}

async function loadDbTransaksi(loadMore = false) {
    if (!currentUser) return [];
    
    if (!loadMore) {
        transaksiData = [];
        transaksiLastDoc = null;
        transaksiHasMore = true;
        isLoadingMore = false;
    }
    
    if (isLoadingMore || !transaksiHasMore) return [];
    isLoadingMore = true;
    
    try {
        let query = supabase.from('db_transaksi').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        query = query.order('tanggal_transaksi', { ascending: false });
        
        if (loadMore && transaksiLastDoc) {
            query = query.range(transaksiData.length, transaksiData.length + 499);
        } else {
            query = query.range(0, 499);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        let totalCount = 0;
        if (!loadMore) {
            let countQuery = supabase.from('db_transaksi').select('*', { count: 'exact', head: true });
            if (currentUserRole !== 'owner') {
                countQuery = countQuery.eq('user_id', currentUser.id);
            }
            const { count, error: countError } = await countQuery;
            if (!countError) totalCount = count || 0;
            window.totalTransaksiCount = totalCount;
            const totalSpan = document.getElementById('transaksiTotalCount');
            if (totalSpan) totalSpan.innerText = totalCount;
        } else {
            totalCount = window.totalTransaksiCount || 0;
        }
        
        if (!data?.length) {
            transaksiHasMore = false;
        } else {
            transaksiLastDoc = data[data.length - 1];
            transaksiHasMore = data.length === 500;
            
            let enriched = [...transaksiData, ...data];
            
            if (currentUserRole === 'owner' && enriched.length) {
                const userIds = [...new Set(enriched.map(t => t.user_id).filter(Boolean))];
                if (userIds.length) {
                    const { data: users } = await supabase.from('users').select('id,nama').in('id', userIds);
                    const map = new Map(users?.map(u => [u.id, u.nama]) || []);
                    enriched = enriched.map(t => ({ ...t, displayName: t.nama + (map.get(t.user_id) ? ` (${map.get(t.user_id)})` : '') }));
                } else {
                    enriched = enriched.map(t => ({ ...t, displayName: t.nama }));
                }
            } else {
                enriched = enriched.map(t => ({ ...t, displayName: t.nama }));
            }
            
            transaksiData = enriched;
        }
        
        renderTransaksiList(transaksiData);
        updateTransaksiStatsDisplay(transaksiData.length, totalCount);
        
        if (transaksiHasMore && !loadMore) addLoadMoreButton();
        else if (!transaksiHasMore && !loadMore) removeLoadMoreButton();
        
        await updateTotalTransaksiDariDBTransaksi();
        return transaksiData;
    } catch (err) {
        console.error('Error loadDbTransaksi:', err);
        showNotifTop('❌ Gagal memuat data transaksi: ' + err.message, true);
        return [];
    } finally {
        isLoadingMore = false;
    }
}

async function updateTotalTransaksiDariDBTransaksi() {
    try {
        let query = supabase.from('db_transaksi').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        let totalBersih = 0;
        (data || []).forEach(item => {
            const jenis = item.progres_jenis;
            const jumlah = item.progres_jumlah || 0;
            if (jenis === 'naik') totalBersih += jumlah;
            else if (jenis === 'turun') totalBersih += jumlah;
            else totalBersih += jumlah;
        });
        
        window.totalTransaksiGlobal = totalBersih;
        await updateTargetDisplay();
        return totalBersih;
    } catch (err) {
        console.error('Error updateTotalTransaksiDariDBTransaksi:', err);
        return 0;
    }
}

// ========== LOAD DATABASE ARCHIVES ==========
async function loadDBClosing() {
    if (!currentUser) return;
    
    try {
        let query = supabase.from('db_closing').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query.order('closing_date', { ascending: false });
        if (error) throw error;
        
        let items = data || [];
        
        if (currentUserRole === 'owner' && items.length) {
            const userIds = [...new Set(items.map(c => c.user_id).filter(Boolean))];
            if (userIds.length) {
                const { data: users } = await supabase.from('users').select('id, nama').in('id', userIds);
                const map = new Map(users?.map(u => [u.id, u.nama]) || []);
                items = items.map(c => ({ ...c, nama: c.nama + (map.get(c.user_id) ? ` (${map.get(c.user_id)})` : '') }));
            }
        }
        
        const container = document.getElementById('dbClosingList');
        if (!container) return;
        
        if (items.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;">📭 Belum ada data closing</p>';
            return;
        }
        
        container.innerHTML = items.map(item => `
            <div class="db-item" data-id="${item.id}" data-type="closing" style="cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${selectedClosingIds.get(item.id) ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>${escapeHtml(item.hp)}</p>
                    <small>Closing: ${new Date(item.closing_date).toLocaleDateString('id-ID')}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp)}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('closing', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');
        
        attachCheckboxEvents('#dbClosingList', selectedClosingIds, 'selectAllClosing');
        
        document.querySelectorAll('#dbClosingList .db-item').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('db-item-wa') && !e.target.classList.contains('db-item-delete')) {
                    openDBDetailModal(el.dataset.id, 'closing');
                }
            };
        });
    } catch (err) {
        console.error('Error loadDBClosing:', err);
    }
}

async function loadDBTidak() {
    if (!currentUser) return;
    
    try {
        let query = supabase.from('db_tidak_tertarik').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query.order('tanggal', { ascending: false });
        if (error) throw error;
        
        let items = data || [];
        
        if (currentUserRole === 'owner' && items.length) {
            const userIds = [...new Set(items.map(t => t.user_id).filter(Boolean))];
            if (userIds.length) {
                const { data: users } = await supabase.from('users').select('id, nama').in('id', userIds);
                const map = new Map(users?.map(u => [u.id, u.nama]) || []);
                items = items.map(t => ({ ...t, nama: t.nama + (map.get(t.user_id) ? ` (${map.get(t.user_id)})` : '') }));
            }
        }
        
        const container = document.getElementById('dbTidakList');
        if (!container) return;
        
        if (items.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;">📭 Belum ada data tidak tertarik</p>';
            return;
        }
        
        container.innerHTML = items.map(item => `
            <div class="db-item" data-id="${item.id}" data-type="tidak" style="cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${selectedTidakIds.get(item.id) ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>${escapeHtml(item.hp)}</p>
                    <small>Tanggal: ${new Date(item.tanggal).toLocaleDateString('id-ID')}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp)}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('tidak', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');
        
        attachCheckboxEvents('#dbTidakList', selectedTidakIds, 'selectAllTidak');
        
        document.querySelectorAll('#dbTidakList .db-item').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('db-item-wa') && !e.target.classList.contains('db-item-delete')) {
                    openDBDetailModal(el.dataset.id, 'tidak');
                }
            };
        });
    } catch (err) {
        console.error('Error loadDBTidak:', err);
    }
}

async function loadDBNomorSalah() {
    if (!currentUser) return;
    
    try {
        let query = supabase.from('nomor_salah').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query.order('deleted_at', { ascending: false });
        if (error) throw error;
        
        let items = data || [];
        
        if (currentUserRole === 'owner' && items.length) {
            const userIds = [...new Set(items.map(n => n.user_id).filter(Boolean))];
            if (userIds.length) {
                const { data: users } = await supabase.from('users').select('id, nama').in('id', userIds);
                const map = new Map(users?.map(u => [u.id, u.nama]) || []);
                items = items.map(n => ({ ...n, nama: n.nama + (map.get(n.user_id) ? ` (${map.get(n.user_id)})` : '') }));
            }
        }
        
        const container = document.getElementById('dbNomorSalahList');
        if (!container) return;
        
        if (items.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;">📭 Belum ada data nomor salah</p>';
            return;
        }
        
        container.innerHTML = items.map(item => `
            <div class="db-item" data-id="${item.id}" data-type="nomor_salah" style="cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${selectedNomorSalahIds.get(item.id) ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>${escapeHtml(item.hp)}</p>
                    <small>Alasan: ${escapeHtml(item.alasan)}<br>Tanggal: ${new Date(item.deleted_at).toLocaleDateString('id-ID')}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp)}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('nomor_salah', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');
        
        attachCheckboxEvents('#dbNomorSalahList', selectedNomorSalahIds, 'selectAllNomorSalah');
        
        document.querySelectorAll('#dbNomorSalahList .db-item').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('db-item-wa') && !e.target.classList.contains('db-item-delete')) {
                    openDBDetailModal(el.dataset.id, 'nomor_salah');
                }
            };
        });
    } catch (err) {
        console.error('Error loadDBNomorSalah:', err);
    }
}

async function loadDBCommitment() {
    if (!currentUser) return;
    
    try {
        let query = supabase.from('db_commitment').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query.order('committed_at', { ascending: false });
        if (error) throw error;
        
        let items = data || [];
        
        if (currentUserRole === 'owner' && items.length) {
            const userIds = [...new Set(items.map(c => c.user_id).filter(Boolean))];
            if (userIds.length) {
                const { data: users } = await supabase.from('users').select('id, nama').in('id', userIds);
                const map = new Map(users?.map(u => [u.id, u.nama]) || []);
                items = items.map(c => ({ ...c, nama: c.nama + (map.get(c.user_id) ? ` (${map.get(c.user_id)})` : '') }));
            }
        }
        
        const container = document.getElementById('dbCommitmentList');
        if (!container) return;
        
        if (items.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;">📭 Belum ada data komitmen</p>';
            return;
        }
        
        container.innerHTML = items.map(item => `
            <div class="db-item" data-id="${item.id}" data-type="commitment" style="cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${selectedCommitmentIds.get(item.id) ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>${escapeHtml(item.hp)}</p>
                    <small>Komitmen: ${new Date(item.committed_at).toLocaleDateString('id-ID')}<br>Followup: ${item.followup_date || '-'}<br>Agent: ${item.agent_id || '-'}<br>Aplikasi: ${item.aplikasi || '-'}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp)}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_commitment', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');
        
        attachCheckboxEvents('#dbCommitmentList', selectedCommitmentIds, 'selectAllCommitment');
        
        document.querySelectorAll('#dbCommitmentList .db-item').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('db-item-wa') && !e.target.classList.contains('db-item-delete')) {
                    openDBDetailModal(el.dataset.id, 'commitment');
                }
            };
        });
    } catch (err) {
        console.error('Error loadDBCommitment:', err);
    }
}

function attachCheckboxEvents(selector, map, selectAllId) {
    const container = document.querySelector(selector);
    if (!container) return;
    
    const checkboxes = container.querySelectorAll('.db-item-checkbox');
    checkboxes.forEach(cb => {
        cb.onchange = (e) => {
            const id = cb.dataset.id;
            if (cb.checked) map.set(id, true);
            else map.delete(id);
            
            const allCheckboxes = container.querySelectorAll('.db-item-checkbox');
            const allChecked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(c => c.checked);
            const btn = document.getElementById(selectAllId);
            if (btn) btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
        };
    });
    
    const selectAllBtn = document.getElementById(selectAllId);
    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            const allCheckboxes = container.querySelectorAll('.db-item-checkbox');
            const allChecked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
            allCheckboxes.forEach(cb => {
                cb.checked = !allChecked;
                const id = cb.dataset.id;
                if (!allChecked) map.set(id, true);
                else map.delete(id);
            });
            selectAllBtn.textContent = !allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
        };
    }
}

async function openDBDetailModal(id, type) {
    let table = '';
    let title = '';
    
    switch (type) {
        case 'closing': table = 'db_closing'; title = 'Detail Database Closing'; break;
        case 'tidak': table = 'db_tidak_tertarik'; title = 'Detail Database Tidak Tertarik'; break;
        case 'nomor_salah': table = 'nomor_salah'; title = 'Detail Database Nomor Salah'; break;
        case 'commitment': table = 'db_commitment'; title = 'Detail Database Commitment'; break;
        default: return;
    }
    
    const { data: d, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error || !d) return;
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
        const { data: user } = await supabase.from('users').select('nama').eq('id', d.user_id).single();
        const ownerName = user?.nama || 'CS Agent';
        ownerInfo = `<div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Pemilik Data</label><div class="value">${escapeHtml(ownerName)}</div></div></div>`;
    }
    
    let detailHtml = '';
    
    if (type === 'closing') {
        let pendingHtml = '';
        if (d.pending_data && d.pending_data.length > 0) {
            const completedCount = d.pending_data.filter(item => item.checked === true && item.text?.trim() !== '').length;
            const totalCount = d.pending_data.length;
            pendingHtml = `
                <div class="detail-info-item" style="align-items: flex-start;">
                    <div class="detail-info-icon">📝</div>
                    <div class="detail-info-content">
                        <label>Pending Responses (${completedCount}/${totalCount} terjawab)</label>
                        <div class="value" style="margin-top: 8px;">
                            <div style="background: #f3f4f6; border-radius: 8px; padding: 8px; max-height: 150px; overflow-y: auto;">
                                ${d.pending_data.map(item => `
                                    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                                        <span style="font-size: 14px;">${item.checked ? '✅' : '⭕'}</span>
                                        <span style="flex: 1; font-size: 12px;">${escapeHtml(item.text) || '(kosong)'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        detailHtml = `
            ${ownerInfo}
            <div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Nama</label><div class="value">${escapeHtml(d.nama)}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Tanggal Closing</label><div class="value">${new Date(d.closing_date).toLocaleDateString('id-ID')}</div></div></div>
            ${pendingHtml}
            <div class="detail-info-item"><div class="detail-info-icon">📌</div><div class="detail-info-content"><label>Catatan Followup</label><div class="value">${d.followup_data ? `Terkirim: ${d.followup_data.terkirim ? 'Ya' : 'Tidak'} | Dibalas: ${d.followup_data.dibalas ? 'Ya' : 'Tidak'}` : '-'}</div></div></div>
        `;
    } else if (type === 'tidak') {
        detailHtml = `
            ${ownerInfo}
            <div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Nama</label><div class="value">${escapeHtml(d.nama)}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Tanggal</label><div class="value">${new Date(d.tanggal).toLocaleDateString('id-ID')}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">❌</div><div class="detail-info-content"><label>Alasan</label><div class="value">${d.alasan || 'Tidak tertarik'}</div></div></div>
        `;
    } else if (type === 'nomor_salah') {
        detailHtml = `
            ${ownerInfo}
            <div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Nama</label><div class="value">${escapeHtml(d.nama)}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Tanggal Dihapus</label><div class="value">${new Date(d.deleted_at).toLocaleDateString('id-ID')}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">📵</div><div class="detail-info-content"><label>Alasan</label><div class="value">${d.alasan || 'Nomor tidak bisa dihubungi'}</div></div></div>
        `;
    } else if (type === 'commitment') {
        detailHtml = `
            ${ownerInfo}
            <div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Nama</label><div class="value">${escapeHtml(d.nama)}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Tanggal Komitmen</label><div class="value">${new Date(d.committed_at).toLocaleDateString('id-ID')}</div></div></div>
            <div class="detail-info-item"><div class="detail-info-icon">🆔</div><div class="detail-info-content"><label>ID Agent</label><div class="value">${d.agent_id || '-'}</div></div></div>
        `;
    }
    
    const detailContent = document.getElementById('detailContent');
    if (detailContent) {
        detailContent.innerHTML = `
            <div class="detail-header"><div class="detail-avatar">📁</div><h3>${title}</h3><div class="detail-status">Arsip</div></div>
            <div class="detail-body">
                <div class="detail-info">${detailHtml}</div>
                <div class="detail-actions"><button class="btn-success" onclick="openWA('${escapeHtml(d.hp)}')">💬 WhatsApp</button></div>
            </div>
            <div class="detail-footer"><button class="btn-outline" onclick="closeModal('detailModal')">❌ Tutup</button><button class="btn-danger" onclick="deleteDBItem('${type}', '${id}'); closeModal('detailModal');">🗑️ Hapus</button></div>
        `;
    }
    
    showModal('detailModal');
}

async function deleteDBItem(type, id) {
    if (!confirm('Yakin hapus data ini? Data akan dihapus permanen!')) return;
    
    let table = '';
    let mapRef = null;
    
    switch (type) {
        case 'closing': table = 'db_closing'; mapRef = selectedClosingIds; break;
        case 'tidak': table = 'db_tidak_tertarik'; mapRef = selectedTidakIds; break;
        case 'nomor_salah': table = 'nomor_salah'; mapRef = selectedNomorSalahIds; break;
        case 'db_commitment': table = 'db_commitment'; mapRef = selectedCommitmentIds; break;
        default: showNotifTop('❌ Tipe tidak dikenal', true); return;
    }
    
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
        showNotifTop('❌ Gagal hapus: ' + error.message, true);
        return;
    }
    
    if (mapRef) mapRef.delete(id);
    showNotifTop('🗑️ Data berhasil dihapus');
    
    if (type === 'closing') await loadDBClosing();
    else if (type === 'tidak') await loadDBTidak();
    else if (type === 'nomor_salah') await loadDBNomorSalah();
    else if (type === 'db_commitment') await loadDBCommitment();
}

// ========== DUPLICATE CHECK FUNCTIONS ==========
async function checkDuplicateCustomer(agentId, hp, excludeId = null) {
    let duplicateAgent = null;
    let duplicateHp = null;
    
    try {
        let agentQuery = supabase.from('customers').select('id, nama, user_id').eq('agent_id', agentId);
        if (excludeId) agentQuery = agentQuery.neq('id', excludeId);
        if (currentUserRole !== 'owner') agentQuery = agentQuery.eq('user_id', currentUser.id);
        
        const { data: agentMatch } = await agentQuery.maybeSingle();
        
        if (agentMatch) {
            let owner = currentUserName;
            if (currentUserRole === 'owner' && agentMatch.user_id !== currentUser.id) {
                const { data: user } = await supabase.from('users').select('nama').eq('id', agentMatch.user_id).single();
                owner = user?.nama || 'CS Agent';
            }
            duplicateAgent = { id: agentMatch.id, nama: agentMatch.nama, owner };
        }
        
        if (hp && hp !== '+62' && hp !== '62' && hp !== '0' && hp.trim() !== '') {
            let hpQuery = supabase.from('customers').select('id, nama, user_id').eq('hp', hp);
            if (excludeId) hpQuery = hpQuery.neq('id', excludeId);
            if (currentUserRole !== 'owner') hpQuery = hpQuery.eq('user_id', currentUser.id);
            
            const { data: hpMatch } = await hpQuery.maybeSingle();
            
            if (hpMatch) {
                let owner = currentUserName;
                if (currentUserRole === 'owner' && hpMatch.user_id !== currentUser.id) {
                    const { data: user } = await supabase.from('users').select('nama').eq('id', hpMatch.user_id).single();
                    owner = user?.nama || 'CS Agent';
                }
                duplicateHp = { id: hpMatch.id, nama: hpMatch.nama, owner };
            }
        }
    } catch (err) {
        console.error('Error checking duplicate:', err);
    }
    
    return { duplicateAgent, duplicateHp };
}

async function checkDuplicateProspek(hp, excludeId = null) {
    if (!hp || hp === '+62' || hp === '62' || hp === '0' || hp.trim() === '') return null;
    
    try {
        let query = supabase.from('prospek').select('id, nama, user_id').eq('hp', hp);
        if (excludeId) query = query.neq('id', excludeId);
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        
        const { data: match } = await query.maybeSingle();
        
        if (match) {
            let owner = currentUserName;
            if (currentUserRole === 'owner' && match.user_id !== currentUser.id) {
                const { data: user } = await supabase.from('users').select('nama').eq('id', match.user_id).single();
                owner = user?.nama || 'CS Agent';
            }
            return { id: match.id, nama: match.nama, owner };
        }
    } catch (err) {
        console.error('Error checking duplicate prospek:', err);
    }
    return null;
}

// ========== CUSTOMER FUNCTIONS ==========
async function addCustomer(agentId, nama, hp, apk, agentType, tanggal, uplineName, uplinePhone) {
    if (!agentId || !nama || !hp || !apk || !agentType || !tanggal) {
        showNotifTop('⚠️ Semua field wajib diisi!', true);
        return false;
    }
    
    let cleanHp = hp;
    if (cleanHp && !cleanHp.startsWith('+')) {
        cleanHp = cleanHp.replace(/[^\d]/g, '');
        if (cleanHp.startsWith('0')) cleanHp = cleanHp.substring(1);
        if (cleanHp.startsWith('62')) cleanHp = '+' + cleanHp;
        else cleanHp = '+62' + cleanHp;
    }
    
    let cleanUplinePhone = uplinePhone || '';
    if (cleanUplinePhone && !cleanUplinePhone.startsWith('+')) {
        cleanUplinePhone = cleanUplinePhone.replace(/[^\d]/g, '');
        if (cleanUplinePhone.startsWith('0')) cleanUplinePhone = cleanUplinePhone.substring(1);
        if (cleanUplinePhone.startsWith('62')) cleanUplinePhone = '+' + cleanUplinePhone;
        else if (cleanUplinePhone) cleanUplinePhone = '+62' + cleanUplinePhone;
    }
    
    const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(agentId, cleanHp);
    if (duplicateAgent) {
        showNotifTop(`⚠️ ID Agent "${agentId}" sudah terdaftar oleh ${duplicateAgent.owner}!`, true);
        return false;
    }
    if (duplicateHp) {
        showNotifTop(`⚠️ Nomor WhatsApp "${cleanHp}" sudah terdaftar oleh ${duplicateHp.owner}!`, true);
        return false;
    }
    
    try {
        const { error } = await supabase.from('customers').insert({
            agent_id: agentId.toUpperCase(),
            nama: nama,
            hp: cleanHp,
            apk: apk,
            agent_type: agentType,
            tanggal: tanggal,
            status: 'baru',
            upline_name: uplineName || '',
            upline_phone: cleanUplinePhone,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            followup_data: null,
            pending_data: [],
            progres_transaksi: { items: [], total_tercapai: 0 }
        });
        
        if (error) throw error;
        
        showNotifTop('✅ Data customer berhasil ditambahkan!');
        await loadAllData();
        return true;
    } catch (err) {
        showNotifTop('❌ Gagal menambah customer: ' + err.message, true);
        return false;
    }
}

async function deleteCustomer(id) {
    if (!confirm('Yakin hapus customer ini? Data akan dihapus permanen!')) return;
    
    try {
        await supabase.from('customers').delete().eq('id', id);
        showNotifTop('🗑️ Data customer berhasil dihapus');
        await loadAllData();
        updateAllBadges();
    } catch (err) {
        showNotifTop('❌ Gagal hapus: ' + err.message, true);
    }
}

// ========== PROSPEK FUNCTIONS ==========
async function addProspek(agentType, nama, hp, status, deadline) {
    if (!agentType || !nama || !hp || !deadline) {
        showNotifTop('⚠️ Semua field wajib diisi!', true);
        return false;
    }
    
    let cleanHp = hp;
    if (cleanHp && !cleanHp.startsWith('+')) {
        cleanHp = cleanHp.replace(/[^\d]/g, '');
        if (cleanHp.startsWith('0')) cleanHp = cleanHp.substring(1);
        if (cleanHp.startsWith('62')) cleanHp = '+' + cleanHp;
        else cleanHp = '+62' + cleanHp;
    }
    
    const duplicate = await checkDuplicateProspek(cleanHp);
    if (duplicate) {
        showNotifTop(`⚠️ Nomor WhatsApp "${cleanHp}" sudah terdaftar oleh ${duplicate.owner}!`, true);
        return false;
    }
    
    try {
        const { error } = await supabase.from('prospek').insert({
            agent_type: agentType,
            nama: nama,
            hp: cleanHp,
            status: status || 'Baru',
            deadline: deadline,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            dihubungi_data: null,
            negosiasi_data: null
        });
        
        if (error) throw error;
        
        showNotifTop('✅ Data prospek berhasil ditambahkan!');
        await loadAllData();
        return true;
    } catch (err) {
        showNotifTop('❌ Gagal menambah prospek: ' + err.message, true);
        return false;
    }
}

async function deleteProspek(id) {
    if (!confirm('Yakin hapus prospek ini? Data akan dihapus permanen!')) return;
    
    try {
        await supabase.from('prospek').delete().eq('id', id);
        showNotifTop('🗑️ Data prospek berhasil dihapus');
        await loadAllData();
        updateAllBadges();
    } catch (err) {
        showNotifTop('❌ Gagal hapus: ' + err.message, true);
    }
}

// ========== PRODUK FUNCTIONS ==========
async function saveProduk(nama, hpp, hargaJual, keterangan, adminDefault, jenisProduk, cidBased, id = null) {
    if (!nama || !hpp) {
        showNotifTop('⚠️ Nama produk dan HPP wajib diisi!', true);
        return false;
    }
    
    const data = {
        nama: nama,
        hpp: parseInt(hpp),
        jenis_produk: jenisProduk || 'tanpa_admin',
        keterangan: keterangan || '',
        updated_at: new Date().toISOString()
    };
    
    if (jenisProduk === 'tanpa_admin') {
        data.harga_jual = parseInt(hargaJual) || 0;
        data.admin_default = 0;
        data.cid_based = false;
    } else {
        data.harga_jual = 0;
        data.admin_default = parseInt(adminDefault) || 0;
        data.cid_based = cidBased === 'yes';
    }
    
    try {
        if (id) {
            const { error } = await supabase.from('produk').update(data).eq('id', id);
            if (error) throw error;
            showNotifTop('✅ Produk berhasil diupdate');
        } else {
            data.created_at = new Date().toISOString();
            const { error } = await supabase.from('produk').insert(data);
            if (error) throw error;
            showNotifTop('✅ Produk berhasil ditambahkan');
        }
        await loadProduk();
        return true;
    } catch (err) {
        showNotifTop('❌ Gagal menyimpan produk: ' + err.message, true);
        return false;
    }
}

async function deleteProduk(id) {
    if (!confirm('Yakin hapus produk ini? Produk yang sudah terpakai akan kehilangan referensi!')) return;
    
    try {
        await supabase.from('produk').delete().eq('id', id);
        showNotifTop('🗑️ Produk berhasil dihapus');
        await loadProduk();
    } catch (err) {
        showNotifTop('❌ Gagal hapus: ' + err.message, true);
    }
}

function editProduk(id) {
    const produk = produkData.find(p => p.id === id);
    if (!produk) return;
    
    currentEditProdukId = id;
    document.getElementById('produkMasterNama').value = produk.nama || '';
    document.getElementById('produkMasterHpp').value = produk.hpp || '';
    document.getElementById('produkMasterKeterangan').value = produk.keterangan || '';
    document.getElementById('produkMasterJenis').value = produk.jenis_produk || 'tanpa_admin';
    
    if (produk.jenis_produk === 'tanpa_admin') {
        document.getElementById('produkMasterHargaJual').value = produk.harga_jual || '';
        document.getElementById('tanpaAdminFields').style.display = 'block';
        document.getElementById('beradminFields').style.display = 'none';
    } else {
        document.getElementById('produkMasterAdminDefault').value = produk.admin_default || '';
        document.getElementById('produkMasterCidBased').value = produk.cid_based ? 'yes' : 'no';
        document.getElementById('tanpaAdminFields').style.display = 'none';
        document.getElementById('beradminFields').style.display = 'block';
    }
    
    document.getElementById('produkMasterTitle').innerText = '✏️ Edit Produk';
    showModal('produkMasterModal');
}

// ========== TARIF ADMIN FUNCTIONS ==========
async function saveTarifAdmin(cid, pospaid, prepaid, nontaglis, id = null) {
    if (!cid) {
        showNotifTop('⚠️ CID wajib diisi!', true);
        return false;
    }
    
    const data = {
        cid: cid,
        admin_pospaid: parseInt(pospaid) || 0,
        admin_prepaid: parseInt(prepaid) || 0,
        admin_nontaglis: parseInt(nontaglis) || 0,
        user_id: currentUser.id,
        updated_at: new Date().toISOString()
    };
    
    try {
        if (id) {
            const { error } = await supabase.from('tarif_admin').update(data).eq('id', id);
            if (error) throw error;
            showNotifTop('✅ Data admin per CID berhasil diupdate');
        } else {
            const { data: existing } = await supabase.from('tarif_admin').select('id').eq('cid', cid).maybeSingle();
            if (existing) {
                showNotifTop(`⚠️ CID ${cid} sudah ada! Silakan edit data yang sudah ada.`, true);
                return false;
            }
            data.created_at = new Date().toISOString();
            const { error } = await supabase.from('tarif_admin').insert(data);
            if (error) throw error;
            showNotifTop('✅ Data admin per CID berhasil ditambahkan');
        }
        await loadTarifAdmin();
        return true;
    } catch (err) {
        showNotifTop('❌ Gagal menyimpan: ' + err.message, true);
        return false;
    }
}

function editTarifAdmin(id) {
    const item = tarifAdminData.find(t => t.id === id);
    if (!item) return;
    
    currentEditTarifId = id;
    document.getElementById('tarifCid').value = item.cid || '';
    document.getElementById('tarifPospaid').value = item.admin_pospaid || '';
    document.getElementById('tarifPrepaid').value = item.admin_prepaid || '';
    document.getElementById('tarifNontaglis').value = item.admin_nontaglis || '';
    showNotifTop('✏️ Edit data, lalu klik Simpan');
}

async function deleteTarifAdmin(id) {
    if (!confirm('Yakin hapus data admin per CID ini?')) return;
    
    try {
        await supabase.from('tarif_admin').delete().eq('id', id);
        showNotifTop('🗑️ Data dihapus');
        await loadTarifAdmin();
    } catch (err) {
        showNotifTop('❌ Gagal hapus: ' + err.message, true);
    }
}

function clearTarifForm() {
    currentEditTarifId = null;
    document.getElementById('tarifCid').value = '';
    document.getElementById('tarifPospaid').value = '';
    document.getElementById('tarifPrepaid').value = '';
    document.getElementById('tarifNontaglis').value = '';
}

// ========== REMINDER FUNCTIONS ==========
async function addReminder(title, description, datetime) {
    if (!title) {
        showNotifTop('⚠️ Judul pengingat wajib diisi!', true);
        return false;
    }
    
    try {
        const { error } = await supabase.from('reminders').insert({
            title: title,
            description: description || '',
            datetime: datetime || null,
            user_id: currentUser.id,
            user_name: currentUserName,
            created_at: new Date().toISOString()
        });
        if (error) throw error;
        
        showNotifTop('✅ Pengingat berhasil ditambahkan');
        await loadReminders();
        return true;
    } catch (err) {
        showNotifTop('❌ Gagal menambah pengingat: ' + err.message, true);
        return false;
    }
}

async function deleteReminder(id) {
    if (!confirm('Hapus pengingat ini?')) return;
    
    try {
        await supabase.from('reminders').delete().eq('id', id);
        showNotifTop('🗑️ Pengingat dihapus');
        await loadReminders();
    } catch (err) {
        showNotifTop('❌ Gagal hapus: ' + err.message, true);
    }
}

// ========== PESAN FUNCTIONS ==========
async function sendMessage(toId, message) {
    if (!toId || !message) {
        showNotifTop('⚠️ Pilih tujuan dan isi pesan!', true);
        return false;
    }
    
    try {
        const { error } = await supabase.from('messages').insert({
            from_id: currentUser.id,
            to_id: toId,
            message: message,
            is_read: false,
            created_at: new Date().toISOString()
        });
        if (error) throw error;
        
        showNotifTop('✅ Pesan terkirim');
        await loadPesan();
        updateAllBadges();
        return true;
    } catch (err) {
        showNotifTop('❌ Gagal mengirim pesan: ' + err.message, true);
        return false;
    }
}

async function markAsRead(id) {
    try {
        await supabase.from('messages').update({ is_read: true }).eq('id', id);
        showNotif('Pesan ditandai dibaca');
        await loadPesan();
        updateAllBadges();
    } catch (err) {
        console.error('Error marking as read:', err);
    }
}

async function deletePesan(id) {
    if (confirm('Hapus pesan ini?')) {
        try {
            await supabase.from('messages').delete().eq('id', id);
            showNotif('Pesan dihapus');
            await loadPesan();
            updateAllBadges();
        } catch (err) {
            showNotifTop('❌ Gagal hapus: ' + err.message, true);
        }
    }
}

// ========== USER MANAGEMENT FUNCTIONS ==========
async function deleteUser(userId) {
    if (!confirm('Yakin ingin menghapus CS Agent ini? Data CS akan tetap ada tetapi tidak bisa login.')) return;
    
    try {
        await supabase.from('users').delete().eq('id', userId);
        showNotifTop('✅ CS Agent berhasil dihapus');
        await loadUsersList();
    } catch (err) {
        showNotifTop('❌ Gagal: ' + err.message, true);
    }
}

async function createUser(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                nama: userData.nama,
                hp: userData.hp,
                role: userData.role || 'cs'
            }
        }
    });
    
    if (error) throw error;
    
    if (data.user) {
        const { error: insertError } = await supabase.from('users').insert({
            id: data.user.id,
            email: email,
            nama: userData.nama,
            hp: userData.hp,
            role: userData.role || 'cs',
            foto: userData.foto || null,
            created_at: new Date().toISOString()
        });
        if (insertError) throw insertError;
    }
    
    return data.user;
}

// ========== AGENT DETAIL FUNCTIONS ==========
async function openAgentDetail(id) {
    const agent = agentsData.find(a => a.id === id);
    if (!agent) {
        showNotifTop('❌ Data agent tidak ditemukan!', true);
        return;
    }
    
    currentAgentIdForProduct = id;
    currentAgentProducts = agent.produk || [];
    
    document.getElementById('agentDetailId').value = agent.agent_id || '';
    document.getElementById('agentDetailNama').value = (agent.nama || '').replace(/ \(.*\)/, '');
    document.getElementById('agentDetailType').value = agent.agent_type || '';
    document.getElementById('agentDetailPemilik').value = agent.pemilik || '';
    document.getElementById('agentDetailAlamat').value = agent.alamat || '';
    document.getElementById('agentDetailEmail').value = agent.email || '';
    document.getElementById('agentDetailTlp').value = agent.tlp || '';
    document.getElementById('agentDetailNoRekening').value = agent.no_rekening || '';
    document.getElementById('agentDetailAtasNama').value = agent.atas_nama || '';
    document.getElementById('agentDetailBank').value = agent.jenis_bank || '';
    document.getElementById('agentDetailNoKtp').value = agent.no_ktp || '';
    document.getElementById('agentDetailCid').value = agent.cid || '';
    document.getElementById('agentDetailUpline').value = agent.upline || '';
    
    await renderAgentProducts();
    showModal('agentDetailModal');
}

async function saveAgentDetail() {
    if (!currentAgentIdForProduct) {
        showNotifTop('⚠️ Data agent tidak ditemukan!', true);
        return;
    }
    
    const agentId = document.getElementById('agentDetailId').value;
    const nama = document.getElementById('agentDetailNama').value;
    const agentType = document.getElementById('agentDetailType').value;
    const pemilik = document.getElementById('agentDetailPemilik').value;
    const alamat = document.getElementById('agentDetailAlamat').value;
    const email = document.getElementById('agentDetailEmail').value;
    const tlp = document.getElementById('agentDetailTlp').value;
    const upline = document.getElementById('agentDetailUpline').value;
    const noRekening = document.getElementById('agentDetailNoRekening').value;
    const atasNama = document.getElementById('agentDetailAtasNama').value;
    const jenisBank = document.getElementById('agentDetailBank').value;
    const noKtp = document.getElementById('agentDetailNoKtp').value;
    const cid = document.getElementById('agentDetailCid').value;
    
    if (!nama) {
        showNotifTop('⚠️ Nama agent wajib diisi!', true);
        return;
    }
    if (!agentType) {
        showNotifTop('⚠️ Type/Class wajib dipilih!', true);
        return;
    }
    
    try {
        const { error } = await supabase.from('db_agent').update({
            agent_id: agentId,
            nama: nama,
            agent_type: agentType,
            pemilik: pemilik,
            alamat: alamat,
            email: email,
            tlp: tlp,
            upline: upline,
            no_rekening: noRekening,
            atas_nama: atasNama,
            jenis_bank: jenisBank,
            no_ktp: noKtp,
            cid: cid,
            produk: currentAgentProducts || [],
            updated_at: new Date().toISOString()
        }).eq('id', currentAgentIdForProduct);
        
        if (error) throw error;
        
        showNotifTop('✅ Data agent berhasil disimpan!');
        closeModal('agentDetailModal');
        await loadDatabaseAgent();
    } catch (err) {
        showNotifTop('❌ Gagal menyimpan: ' + err.message, true);
    }
}

async function renderAgentProducts() {
    const container = document.getElementById('agentProductsContainer');
    if (!container) return;
    
    if (!produkData || produkData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#9ca3af; padding:20px;">📦 Belum ada produk. Silakan tambah produk terlebih dahulu.</p>';
        return;
    }
    
    const cid = document.getElementById('agentDetailCid')?.value || '';
    let tarifData = null;
    
    if (cid) {
        const { data } = await supabase.from('tarif_admin').select('*').eq('cid', cid).maybeSingle();
        tarifData = data;
    }
    
    const existingMap = new Map();
    if (currentAgentProducts) {
        currentAgentProducts.forEach(p => existingMap.set(p.produk_id, p));
    }
    
    let html = `
        <table style="width:100%; border-collapse: collapse;">
            <thead>
                <tr style="background:#f8fafc;">
                    <th style="padding:10px;">Produk</th>
                    <th style="padding:10px;">Admin</th>
                    <th style="padding:10px;">HPP</th>
                    <th style="padding:10px;">Profit</th>
                    <th style="padding:10px;">Fee Upline</th>
                    <th style="padding:10px;">Fee Agent</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const produk of produkData) {
        const isAdminBased = produk.jenis_produk === 'beradmin';
        const existing = existingMap.get(produk.id);
        let adminValue = 0;
        let profit = existing?.profit || 0;
        let feeUpline = existing?.fee_upline || 0;
        
        if (isAdminBased) {
            if (produk.cid_based && cid && tarifData) {
                const namaLower = produk.nama.toLowerCase();
                if (namaLower.includes('prepaid')) adminValue = tarifData.admin_prepaid || 0;
                else if (namaLower.includes('postpaid')) adminValue = tarifData.admin_pospaid || 0;
                else if (namaLower.includes('nontaglis')) adminValue = tarifData.admin_nontaglis || 0;
                else adminValue = existing?.admin || produk.admin_default || 0;
            } else {
                adminValue = existing?.admin || produk.admin_default || 0;
            }
        }
        
        const feeAgent = isAdminBased ? Math.max(0, adminValue - profit - feeUpline) : 0;
        
        html += `
            <tr data-produk-id="${produk.id}" style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px;">
                    <strong>${escapeHtml(produk.nama)}</strong><br>
                    <small style="color:#9ca3af;">${isAdminBased ? '🏷️ Beradmin' : '💰 Tanpa Admin'}</small>
                </td>
                <td style="padding:10px;">
                    <span class="admin-value" data-id="${produk.id}">${formatRupiah(adminValue)}</span>
                </td>
                <td style="padding:10px;">${formatRupiah(produk.hpp)}</td>
                <td style="padding:10px;">
                    <input type="number" class="profit-input" data-id="${produk.id}" value="${profit}" step="100" style="width:100px; padding:6px; border-radius:8px; border:1px solid #e5e7eb;">
                </td>
                <td style="padding:10px;">
                    <input type="number" class="fee-upline-input" data-id="${produk.id}" value="${feeUpline}" step="100" style="width:100px; padding:6px; border-radius:8px; border:1px solid #e5e7eb;">
                </td>
                <td style="padding:10px;">
                    <span class="fee-agent-value" data-id="${produk.id}" style="font-weight:600; color:${feeAgent >= 0 ? '#10b981' : '#ef4444'};">${formatRupiah(feeAgent)}</span>
                </td>
            </tr>
        `;
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    document.querySelectorAll('.profit-input').forEach(inp => {
        inp.onchange = (e) => {
            const produkId = e.target.dataset.id;
            const profit = parseInt(e.target.value) || 0;
            updateAgentProductField(produkId, 'profit', profit);
        };
    });
    
    document.querySelectorAll('.fee-upline-input').forEach(inp => {
        inp.onchange = (e) => {
            const produkId = e.target.dataset.id;
            const feeUpline = parseInt(e.target.value) || 0;
            updateAgentProductField(produkId, 'fee_upline', feeUpline);
        };
    });
}

function updateAgentProductField(produkId, field, value) {
    if (!currentAgentProducts) currentAgentProducts = [];
    
    const index = currentAgentProducts.findIndex(p => p.produk_id === produkId);
    
    const produk = produkData.find(p => p.id === produkId);
    if (!produk) return;
    
    const isAdminBased = produk.jenis_produk === 'beradmin';
    let admin = 0;
    
    if (isAdminBased) {
        const adminSpan = document.querySelector(`tr[data-produk-id="${produkId}"] .admin-value`);
        if (adminSpan) {
            admin = parseInt(adminSpan.textContent.replace(/[^0-9]/g, '')) || 0;
        }
    }
    
    let profit = field === 'profit' ? value : (currentAgentProducts[index]?.profit || 0);
    let feeUpline = field === 'fee_upline' ? value : (currentAgentProducts[index]?.fee_upline || 0);
    
    let feeAgent = admin - profit - feeUpline;
    if (feeAgent < 0) {
        profit = admin - feeUpline;
        if (profit < 0) profit = 0;
        feeAgent = admin - profit - feeUpline;
        if (feeAgent < 0) feeAgent = 0;
        
        if (field === 'fee_upline') {
            const profitInput = document.querySelector(`tr[data-produk-id="${produkId}"] .profit-input`);
            if (profitInput) profitInput.value = profit;
        }
    }
    
    const productData = {
        produk_id: produkId,
        nama_produk: produk.nama,
        admin: admin,
        profit: profit,
        fee_upline: feeUpline,
        fee_agent: feeAgent,
        updated_at: new Date().toISOString()
    };
    
    if (index >= 0) {
        currentAgentProducts[index] = productData;
    } else {
        productData.added_at = new Date().toISOString();
        currentAgentProducts.push(productData);
    }
    
    const feeAgentSpan = document.querySelector(`tr[data-produk-id="${produkId}"] .fee-agent-value`);
    if (feeAgentSpan) {
        feeAgentSpan.innerHTML = formatRupiah(feeAgent);
        feeAgentSpan.style.color = feeAgent >= 0 ? '#10b981' : '#ef4444';
    }
}

// ========== MOVE AGENT TO FOLLOWUP ==========
async function moveAgentToFollowup(agentId) {
    const { data: agent, error } = await supabase.from('db_agent').select('*').eq('id', agentId).single();
    if (error || !agent) {
        showNotifTop('❌ Data agent tidak ditemukan!', true);
        return;
    }
    
    const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(agent.agent_id, agent.hp);
    if (duplicateAgent) {
        showNotifTop(`⚠️ ID Agent "${agent.agent_id}" sudah terdaftar!`, true);
        return;
    }
    if (duplicateHp) {
        showNotifTop(`⚠️ Nomor WhatsApp "${agent.hp}" sudah terdaftar!`, true);
        return;
    }
    
    showConfirmDialog(
        'Pindahkan ke Followup Agen?',
        `Apakah Anda yakin ingin memindahkan agent "${escapeHtml(agent.nama)}" ke FOLLOWUP AGEN?\n\nData akan dipindahkan dengan status "Baru".`,
        async () => {
            try {
                await supabase.from('customers').insert({
                    agent_id: agent.agent_id,
                    nama: agent.nama,
                    hp: agent.hp,
                    apk: agent.apk || '',
                    agent_type: agent.agent_type || '',
                    tanggal: getTodayDate(),
                    status: 'baru',
                    upline_name: agent.upline || '',
                    upline_phone: '',
                    user_id: agent.user_id,
                    created_at: new Date().toISOString(),
                    followup_data: null,
                    pending_data: [],
                    progres_transaksi: { items: [], total_tercapai: 0 }
                });
                
                await supabase.from('db_agent').delete().eq('id', agentId);
                showNotifTop('✅ Agent berhasil dipindahkan ke Followup Agen!');
                await loadDatabaseAgent();
                await loadAllData();
            } catch (err) {
                showNotifTop('❌ Gagal memindahkan: ' + err.message, true);
            }
        }
    );
}

// ========== DELETE AGENT ITEM ==========
async function deleteAgentItem(id) {
    if (!confirm('Yakin hapus data agent ini? Data akan dihapus permanen!')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Data Agent', 1);
    progress.update(50, '🗑️ Menghapus', 'Menghapus data agent...', 0, 1);
    
    try {
        await supabase.from('db_agent').delete().eq('id', id);
        selectedAgentIds.delete(id);
        
        const index = agentsData.findIndex(item => item.id === id);
        if (index !== -1) agentsData.splice(index, 1);
        
        renderAgentList(agentsData);
        progress.update(100, '✅ Selesai', 'Data agent berhasil dihapus', 1, 1);
        showNotifTop('🗑️ Data agent berhasil dihapus');
        setTimeout(() => progress.hide(), 1500);
    } catch (err) {
        showNotifTop('❌ Gagal hapus: ' + err.message, true);
        progress.hide();
    }
}

// ========== RENDER FUNCTIONS ==========
function renderAgentList(items) {
    const container = document.getElementById('dbAgentList');
    if (!container) return;
    
    const totalSpan = document.getElementById('agentTotalCount');
    if (totalSpan) totalSpan.innerText = items.length;
    
    const searchTerm = document.getElementById('searchAgentInput')?.value.toLowerCase() || '';
    const filterUpline = document.getElementById('filterUplineAgent')?.value.toLowerCase() || '';
    const filterCid = document.getElementById('filterCidAgent')?.value.toLowerCase() || '';
    const filterBank = document.getElementById('filterBankAgent')?.value || '';
    const filterDate = document.getElementById('filterDateAgent')?.value || '';
    const filterHasHp = document.getElementById('filterHasHpAgent')?.checked || false;
    const filterHasApk = document.getElementById('filterHasApkAgent')?.checked || false;
    
    let filtered = items.filter(i => {
        if (searchTerm && !(i.nama?.toLowerCase().includes(searchTerm) || i.agent_id?.toLowerCase().includes(searchTerm) || i.hp?.includes(searchTerm))) return false;
        if (filterUpline && !(i.upline?.toLowerCase().includes(filterUpline))) return false;
        if (filterCid && !(i.cid?.toLowerCase().includes(filterCid))) return false;
        if (filterBank && i.jenis_bank !== filterBank) return false;
        if (filterDate === 'today' && new Date(i.created_at).toDateString() !== new Date().toDateString()) return false;
        if (filterDate === 'week' && (new Date() - new Date(i.created_at)) > 7 * 86400000) return false;
        if (filterDate === 'month' && (new Date() - new Date(i.created_at)) > 30 * 86400000) return false;
        if (filterHasHp && (!i.hp || i.hp.length < 5)) return false;
        if (filterHasApk && (!i.apk || i.apk === '-')) return false;
        return true;
    });
    
    agentsFilteredData = filtered;
    const filteredSpan = document.getElementById('agentFilteredCount');
    if (filteredSpan) filteredSpan.innerText = filtered.length;
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">📭 Tidak ada data</p>';
        return;
    }
    
    container.innerHTML = filtered.map(item => `
        <div class="db-item-agent" data-id="${item.id}">
            <input type="checkbox" class="db-item-checkbox-agent" data-id="${item.id}" ${selectedAgentIds.get(item.id) ? 'checked' : ''}>
            <div class="db-item-agent-info">
                <h4>${escapeHtml(item.nama)}</h4>
                <p>📱 ${escapeHtml(item.hp)} | 🆔 ${escapeHtml(item.agent_id)} | 🏷️ ${escapeHtml(item.agent_type)}</p>
                <p>👤 Upline: ${escapeHtml(item.upline)} | 🆔 CID: ${escapeHtml(item.cid)} | 🏦 Bank: ${escapeHtml(item.jenis_bank)}</p>
                <small>📅 ${item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}</small>
            </div>
            <div class="db-item-agent-actions">
                <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp)}')">💬 WA</button>
                <button class="db-item-move-followup" onclick="event.stopPropagation(); moveAgentToFollowup('${item.id}')">📞 Pindah ke Followup</button>
                <button class="db-item-delete" onclick="event.stopPropagation(); deleteAgentItem('${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('#dbAgentList .db-item-checkbox-agent').forEach(cb => {
        cb.onchange = (e) => {
            const id = cb.dataset.id;
            if (cb.checked) selectedAgentIds.set(id, true);
            else selectedAgentIds.delete(id);
            updateSelectAllAgentButton();
        };
    });
    
    updateSelectAllAgentButton();
}

function updateSelectAllAgentButton() {
    const btn = document.getElementById('selectAllAgent');
    if (!btn) return;
    if (!agentsFilteredData || agentsFilteredData.length === 0) {
        btn.textContent = '✅ Pilih Semua';
        return;
    }
    const allChecked = agentsFilteredData.every(item => selectedAgentIds.get(item.id) === true);
    btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
}

function renderProdukList() {
    const container = document.getElementById('produkList');
    if (!container) return;
    
    const searchKeyword = document.getElementById('searchProdukInput')?.value.toLowerCase() || '';
    let filtered = produkData;
    if (searchKeyword) {
        filtered = produkData.filter(p =>
            p.nama.toLowerCase().includes(searchKeyword) ||
            (p.jenis_produk === 'beradmin' ? 'beradmin' : 'tanpa_admin').includes(searchKeyword)
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">🏷️ Tidak ada produk ditemukan</p>';
        return;
    }
    
    container.innerHTML = filtered.map(item => {
        const isAdminBased = item.jenis_produk === 'beradmin';
        const isChecked = selectedProdukIds.get(item.id) === true;
        return `
            <div class="db-item produk-item" data-id="${item.id}" style="cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox-produk" data-id="${item.id}" style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>📦 ${escapeHtml(item.nama)}</h4>
                    <p>
                        ${isAdminBased ?
                            `🏷️ Beradmin | Admin Default: ${formatRupiah(item.admin_default || 0)} | ${item.cid_based ? 'CID Based ✅' : 'Admin Tetap'}` :
                            `💰 Tanpa Admin | HPP: ${formatRupiah(item.hpp)} | Harga Jual: ${formatRupiah(item.harga_jual || 0)}`
                        }
                    </p>
                    <small>${escapeHtml(item.keterangan || '')}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-edit" onclick="event.stopPropagation(); editProduk('${item.id}')">✏️ Edit</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteProduk('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('#produkList .db-item-checkbox-produk').forEach(cb => {
        cb.onchange = (e) => {
            e.stopPropagation();
            const id = cb.dataset.id;
            if (cb.checked) selectedProdukIds.set(id, true);
            else selectedProdukIds.delete(id);
            updateSelectAllProdukButton();
        };
    });
    
    document.querySelectorAll('#produkList .produk-item').forEach(el => {
        el.onclick = (e) => {
            if (e.target.type === 'checkbox') return;
            if (e.target.classList.contains('db-item-edit')) return;
            if (e.target.classList.contains('db-item-delete')) return;
            editProduk(el.dataset.id);
        };
    });
    
    updateSelectAllProdukButton();
}

// ========== UPDATE PRODUCT SELECT ==========
function updateProductSelect() {
    // Cek apakah ada select element dengan id productSelect
    const productSelect = document.getElementById('productSelect');
    if (!productSelect) return;
    
    // Kosongkan select
    productSelect.innerHTML = '<option value="">Pilih Produk</option>';
    
    // Tambahkan option dari produkData
    if (produkData && produkData.length > 0) {
        produkData.forEach(produk => {
            const option = document.createElement('option');
            option.value = produk.id;
            option.textContent = `${produk.nama} - ${formatRupiah(produk.hpp)}`;
            productSelect.appendChild(option);
        });
    }
}

function updateSelectAllProdukButton() {
    const btn = document.getElementById('selectAllProduk');
    if (!btn) return;
    
    const searchKeyword = document.getElementById('searchProdukInput')?.value.toLowerCase() || '';
    let filtered = produkData;
    if (searchKeyword) {
        filtered = produkData.filter(p =>
            p.nama.toLowerCase().includes(searchKeyword) ||
            (p.jenis_produk === 'beradmin' ? 'beradmin' : 'tanpa_admin').includes(searchKeyword)
        );
    }
    
    if (filtered.length === 0) {
        btn.textContent = '✅ Pilih Semua';
        return;
    }
    
    const allChecked = filtered.every(item => selectedProdukIds.get(item.id) === true);
    btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
}

function renderTarifAdminList() {
    const container = document.getElementById('tarifAdminList');
    if (!container) return;
    
    const searchKeyword = document.getElementById('searchTarifInput')?.value.toLowerCase() || '';
    let filtered = tarifAdminData;
    if (searchKeyword) {
        filtered = tarifAdminData.filter(item => item.cid.toLowerCase().includes(searchKeyword));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">🏷️ Tidak ada data admin per CID</p>';
        return;
    }
    
    container.innerHTML = filtered.map(item => `
        <div class="db-item" data-id="${item.id}">
            <div class="db-item-info">
                <h4>🆔 CID: ${escapeHtml(item.cid)}</h4>
                <p>
                    ⚡ PLN Pospaid: ${formatRupiah(item.admin_pospaid || 0)}<br>
                    ⚡ PLN Prepaid: ${formatRupiah(item.admin_prepaid || 0)}<br>
                    ⚡ PLN Nontaglis: ${formatRupiah(item.admin_nontaglis || 0)}
                </p>
                <small>Terakhir update: ${item.updated_at ? new Date(item.updated_at).toLocaleString('id-ID') : '-'}</small>
            </div>
            <div class="db-item-actions">
                <button class="db-item-edit" onclick="editTarifAdmin('${item.id}')">✏️ Edit</button>
                <button class="db-item-delete" onclick="deleteTarifAdmin('${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

function renderTransaksiList(items) {
    const container = document.getElementById('dbTransaksiList');
    if (!container) return;
    
    if (!items || items.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data transaksi. Silakan import data terlebih dahulu.</p>';
        return;
    }
    
    const formatProgresJumlah = (jenis, jumlah) => {
        const abs = Math.abs(jumlah);
        if (jenis === 'naik') return `+${abs.toLocaleString()}`;
        if (jenis === 'turun') return `-${abs.toLocaleString()}`;
        if (jumlah < 0) return `${jumlah.toLocaleString()}`;
        if (jumlah > 0) return `+${jumlah.toLocaleString()}`;
        return '0';
    };
    
    const getProgresIcon = (jenis) => jenis === 'naik' ? '📈' : (jenis === 'turun' ? '📉' : '⚖️');
    
    const getStatusBadgeHtml = (status) => {
        if (status === 'imported') return '<span style="background:#10b981; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">✅ Sudah Dipindah</span>';
        if (status === 'duplicate') return '<span style="background:#f59e0b; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">⚠️ Duplikat</span>';
        if (status === 'error') return '<span style="background:#ef4444; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">❌ Gagal</span>';
        return '<span style="background:#3b82f6; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">⏳ Pending</span>';
    };
    
    let html = '';
    for (const item of items) {
        const isChecked = selectedTransaksiIds.get(item.id) === true;
        let progresColor = '#6b7280', progresBg = '#f3f4f6';
        if (item.progres_jenis === 'naik') { progresColor = '#10b981'; progresBg = '#ecfdf5'; }
        else if (item.progres_jenis === 'turun') { progresColor = '#ef4444'; progresBg = '#fef2f2'; }
        else if (item.progres_jumlah < 0) { progresColor = '#ef4444'; progresBg = '#fef2f2'; }
        else if (item.progres_jumlah > 0) { progresColor = '#10b981'; progresBg = '#ecfdf5'; }
        
        const formattedJumlah = formatProgresJumlah(item.progres_jenis, item.progres_jumlah || 0);
        
        html += `
            <div class="db-item-agent" data-id="${item.id}" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #e5e7eb; cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox-transaksi" data-id="${item.id}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px;" onclick="event.stopPropagation()">
                <div class="db-item-agent-info" style="flex:1;">
                    <h4>${escapeHtml(item.displayName || item.nama)}</h4>
                    <p>📱 ${escapeHtml(item.hp || '-')} | 🆔 ${escapeHtml(item.agent_id || '-')}</p>
                    <p style="background: ${progresBg}; padding: 4px 8px; border-radius: 8px; display: inline-block;">
                        ${getProgresIcon(item.progres_jenis)} <strong style="color:${progresColor};">${item.progres_jenis?.toUpperCase() || 'NORMAL'}</strong> | Jumlah: ${formattedJumlah}
                    </p>
                    <p>👤 Upline: ${escapeHtml(item.upline_name || '-')} | 📞 ${escapeHtml(item.upline_phone || '-')}</p>
                    <small>📅 ${item.tanggal_transaksi ? new Date(item.tanggal_transaksi).toLocaleDateString('id-ID') : '-'} | Status: ${getStatusBadgeHtml(item.status)}</small>
                </div>
                <div class="db-item-agent-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp || '')}')">💬 WA</button>
                    ${item.status !== 'imported' ? `<button class="db-item-move-followup" onclick="event.stopPropagation(); moveSingleToFollowup('${item.id}')">📋 Pindah ke Followup</button>` : ''}
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteTransaksiItem('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    document.querySelectorAll('#dbTransaksiList .db-item-agent').forEach(el => {
        el.onclick = (e) => {
            if (e.target.type === 'checkbox' || e.target.classList.contains('db-item-wa') || e.target.classList.contains('db-item-move-followup') || e.target.classList.contains('db-item-delete')) return;
            showTransaksiDetail(el.dataset.id);
        };
    });
    
    document.querySelectorAll('#dbTransaksiList .db-item-checkbox-transaksi').forEach(cb => {
        cb.onchange = (e) => {
            const id = cb.dataset.id;
            if (cb.checked) selectedTransaksiIds.set(id, true);
            else selectedTransaksiIds.delete(id);
            updateSelectAllTransaksiButton();
        };
    });
    
    updateSelectAllTransaksiButton();
}

function updateSelectAllTransaksiButton() {
    const btn = document.getElementById('selectAllTransaksi');
    if (!btn) return;
    
    const checkboxes = document.querySelectorAll('#dbTransaksiList .db-item-checkbox-transaksi');
    if (checkboxes.length === 0) {
        btn.textContent = '✅ Pilih Semua';
        return;
    }
    
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
}

function updateTransaksiStatsDisplay(filteredCount, totalCount) {
    const statsDiv = document.getElementById('transaksiStats');
    if (statsDiv) {
        statsDiv.innerHTML = `📊 Menampilkan <strong>${filteredCount}</strong> dari <strong>${totalCount}</strong> data transaksi`;
    }
}

function addLoadMoreButton() {
    const container = document.getElementById('dbTransaksiList');
    if (!container) return;
    
    removeLoadMoreButton();
    
    const btnContainer = document.createElement('div');
    btnContainer.id = 'loadMoreTransaksiContainer';
    btnContainer.style.textAlign = 'center';
    btnContainer.style.padding = '20px';
    btnContainer.innerHTML = `<button id="loadMoreTransaksiBtn" style="background: #4f46e5; color: white; border: none; border-radius: 10px; padding: 10px 20px; cursor: pointer;">📥 Muat Lebih Banyak (500 data lagi)</button>`;
    container.appendChild(btnContainer);
    
    const loadMoreBtn = document.getElementById('loadMoreTransaksiBtn');
    if (loadMoreBtn) {
        loadMoreBtn.onclick = async () => {
            document.getElementById('loadMoreTransaksiContainer')?.remove();
            await loadDbTransaksi(true);
        };
    }
}

function removeLoadMoreButton() {
    const btnContainer = document.getElementById('loadMoreTransaksiContainer');
    if (btnContainer) btnContainer.remove();
}

function showTransaksiDetail(id) {
    const item = transaksiData?.find(t => t.id === id);
    if (!item) return;
    
    const formatJumlah = (jenis, jumlah) => {
        const abs = Math.abs(jumlah);
        if (jenis === 'naik') return `+${abs.toLocaleString()}`;
        if (jenis === 'turun') return `-${abs.toLocaleString()}`;
        if (jumlah < 0) return `${jumlah.toLocaleString()}`;
        if (jumlah > 0) return `+${jumlah.toLocaleString()}`;
        return '0';
    };
    
    const getStatusIcon = (status) => status === 'imported' ? '✅' : '⏳';
    const formattedJumlah = formatJumlah(item.progres_jenis, item.progres_jumlah || 0);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '999999';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 480px; border-radius: 24px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4f46e5, #8b5cf6); padding: 20px 24px; color: white;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(255,255,255,0.2); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">${getStatusIcon(item.status)}</div>
                    <div><h3 style="margin: 0; font-size: 18px; color: white;">Detail Transaksi</h3><p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">ID: ${escapeHtml(item.id.substring(0, 8))}...</p></div>
                </div>
            </div>
            <div style="padding: 20px 24px; background: #fff;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                    <div><div style="font-size: 12px; color: #9ca3af;">Nama Agent</div><div style="font-size: 16px; font-weight: 600;">${escapeHtml(item.nama)}</div></div>
                    <div style="text-align: right;"><div style="font-size: 12px; color: #9ca3af;">ID Agent</div><div style="font-size: 14px; font-weight: 500; color: #4f46e5;">${escapeHtml(item.agent_id)}</div></div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 12px;">
                    <div><div style="font-size: 11px; color: #9ca3af;">📱 Nomor HP</div><div style="font-size: 13px; font-weight: 500;">${escapeHtml(item.hp || '-')}</div></div>
                    <div><div style="font-size: 11px; color: #9ca3af;">📅 Tanggal Transaksi</div><div style="font-size: 13px; font-weight: 500;">${new Date(item.tanggal_transaksi).toLocaleDateString('id-ID')}</div></div>
                </div>
                <div style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 12px;">
                    <div style="font-size: 11px; color: #9ca3af; margin-bottom: 8px;">👤 Upline / Atasan</div>
                    <div style="display: flex; justify-content: space-between;"><span>${escapeHtml(item.upline_name || '-')}</span><span style="font-size: 12px; color: #6b7280;">📞 ${escapeHtml(item.upline_phone || '-')}</span></div>
                </div>
                <div style="margin-bottom: 16px; padding: 16px; background: ${item.progres_jenis === 'naik' ? '#ecfdf5' : (item.progres_jenis === 'turun' ? '#fef2f2' : '#f3f4f6')}; border-radius: 16px; text-align: center;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">📊 Progres Transaksi</div>
                    <div style="font-size: 32px; font-weight: 700; color: ${item.progres_jenis === 'naik' ? '#10b981' : (item.progres_jenis === 'turun' ? '#ef4444' : '#6b7280')};">${formattedJumlah}</div>
                    <div style="margin-top: 4px;"><span style="background: ${item.progres_jenis === 'naik' ? '#10b981' : (item.progres_jenis === 'turun' ? '#ef4444' : '#6b7280')}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px;">${item.progres_jenis === 'naik' ? '📈 NAIK' : (item.progres_jenis === 'turun' ? '📉 TURUN' : '⚖️ NORMAL')}</span></div>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px; background: #f9fafb; border-radius: 12px;">
                    <span style="font-size: 12px; color: #6b7280;">📌 Status</span>
                    <span style="font-size: 13px; font-weight: 500; padding: 4px 12px; border-radius: 20px; background: ${item.status === 'imported' ? '#d1fae5' : '#fef3c7'}; color: ${item.status === 'imported' ? '#065f46' : '#b45309'};">${item.status === 'imported' ? '✅ Sudah Dipindah ke Followup' : '⏳ Pending Import'}</span>
                </div>
            </div>
            <div style="display: flex; gap: 12px; padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                <button class="btn-primary" onclick="window.open('https://wa.me/${item.hp?.replace(/[^\d]/g, '')}', '_blank')" style="flex: 1; background: #25D366; border: none; padding: 12px; border-radius: 12px; color: white; font-weight: 600; cursor: pointer;">💬 WhatsApp</button>
                ${item.status !== 'imported' ? `<button class="btn-primary" onclick="moveSingleToFollowup('${item.id}'); closeModalFromButton(this)" style="flex: 1; background: #4f46e5; border: none; padding: 12px; border-radius: 12px; color: white; font-weight: 600; cursor: pointer;">📋 Pindah ke Followup</button>` : ''}
                <button class="btn-outline" onclick="closeModalFromButton(this)" style="flex: 0.5; background: #f3f4f6; border: none; padding: 12px; border-radius: 12px; cursor: pointer;">Tutup</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function closeModalFromButton(btn) {
    const modal = btn.closest('.modal');
    if (modal) modal.remove();
}

async function moveSingleToFollowup(id, silent = false) {
    const { data: doc, error } = await supabase.from('db_transaksi').select('*').eq('id', id).single();
    if (error || !doc) return;
    
    const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(doc.agent_id, doc.hp);
    if (duplicateAgent) {
        if (!silent) showNotifTop(`⚠️ ID Agent "${doc.agent_id}" sudah terdaftar!`, true);
        return false;
    }
    if (duplicateHp) {
        if (!silent) showNotifTop(`⚠️ Nomor WhatsApp "${doc.hp}" sudah terdaftar!`, true);
        return false;
    }
    
    let totalTercapai = 0;
    if (doc.progres_jenis === 'naik') totalTercapai = Math.abs(doc.progres_jumlah || 0);
    else if (doc.progres_jenis === 'turun') totalTercapai = -Math.abs(doc.progres_jumlah || 0);
    else totalTercapai = doc.progres_jumlah || 0;
    
    const progresItem = {
        tanggal: doc.tanggal_transaksi || getTodayDate(),
        jenis: doc.progres_jenis || 'normal',
        jumlah: Math.abs(doc.progres_jumlah || 0),
        keterangan: `Dipindahkan dari DB Transaksi (ID: ${doc.agent_id})`,
        created_at: new Date().toISOString()
    };
    
    await supabase.from('customers').insert({
        agent_id: doc.agent_id,
        nama: doc.nama,
        hp: doc.hp,
        upline_name: doc.upline_name || '',
        upline_phone: doc.upline_phone || '',
        status: 'baru',
        tanggal: getTodayDate(),
        user_id: doc.user_id,
        created_at: new Date().toISOString(),
        followup_data: null,
        pending_data: [],
        progres_transaksi: { items: [progresItem], total_tercapai: totalTercapai },
        moved_from_transaksi: true,
        original_transaksi_id: id
    });
    
    await supabase.from('db_transaksi').update({ status: 'imported', moved_to_followup_at: new Date().toISOString() }).eq('id', id);
    if (!silent) showNotifTop('✅ Data berhasil dipindahkan ke Followup Agen!');
    return true;
}

async function deleteTransaksiItem(id) {
    if (!confirm('Yakin hapus data transaksi ini?')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Data', 1);
    progress.update(50, '🗑️ Menghapus', 'Menghapus data...', 0, 1);
    
    try {
        await supabase.from('db_transaksi').delete().eq('id', id);
        selectedTransaksiIds.delete(id);
        progress.update(100, '✅ Selesai', 'Data berhasil dihapus', 1, 1);
        showNotifTop('🗑️ Data transaksi berhasil dihapus');
        setTimeout(() => progress.hide(), 1500);
        await loadDbTransaksi();
    } catch (err) {
        showNotifTop('❌ Gagal hapus: ' + err.message, true);
        progress.hide();
    }
}

// ========== SELECT ALL & BATCH DELETE ==========
async function deleteSelectedAgentSafe() {
    const selectedIds = Array.from(selectedAgentIds.keys());
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang dipilih', true);
        return;
    }
    
    if (!confirm(`Hapus ${selectedIds.length} data agent?`)) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Data Agent', selectedIds.length);
    progress.update(0, '🗑️ Menghapus', 'Memulai proses hapus data...');
    
    let deleted = 0, failed = 0;
    
    for (let i = 0; i < selectedIds.length; i++) {
        const id = selectedIds[i];
        try {
            await supabase.from('db_agent').delete().eq('id', id);
            selectedAgentIds.delete(id);
            const index = agentsData.findIndex(item => item.id === id);
            if (index !== -1) agentsData.splice(index, 1);
            deleted++;
        } catch (err) {
            failed++;
            console.error(`Gagal hapus ${id}:`, err);
        }
        const percent = Math.floor(((deleted + failed) / selectedIds.length) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted + failed}/${selectedIds.length})`, deleted + failed, selectedIds.length);
        if ((i + 1) % 10 === 0) renderAgentList(agentsData);
    }
    
    renderAgentList(agentsData);
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}, Gagal: ${failed}`, selectedIds.length, selectedIds.length);
    showNotifTop(`✅ ${deleted} data agent berhasil dihapus${failed > 0 ? `, ${failed} gagal` : ''}`);
    setTimeout(() => progress.hide(), 3000);
}

async function deleteSelectedProduk() {
    const selectedIds = Array.from(selectedProdukIds.keys());
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada produk yang dipilih', true);
        return;
    }
    
    if (!confirm(`Hapus ${selectedIds.length} produk yang dipilih?`)) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Produk', selectedIds.length);
    progress.update(0, '🗑️ Menghapus', 'Memulai proses hapus produk...');
    
    let deleted = 0;
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
        const chunk = selectedIds.slice(i, i + BATCH_SIZE);
        for (const id of chunk) {
            try {
                await supabase.from('produk').delete().eq('id', id);
                selectedProdukIds.delete(id);
                const index = produkData.findIndex(p => p.id === id);
                if (index !== -1) produkData.splice(index, 1);
                deleted++;
            } catch (err) {
                console.error(`Gagal hapus ${id}:`, err);
            }
        }
        const percent = Math.floor((deleted / selectedIds.length) * 100);
        progress.update(percent, '🗑️ Menghapus', `Menghapus produk...`, deleted, selectedIds.length);
        renderProdukList();
    }
    
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} produk`, deleted, selectedIds.length);
    showNotifTop(`✅ ${deleted} produk berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
}

async function deleteAllAgent() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Agent.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Agent', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('db_agent').select('id');
    if (error) throw error;
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i + BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('db_agent').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedAgentIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Agent berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadDatabaseAgent();
}

async function deleteAllProduk() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data Produk.\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Produk', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('produk').select('id');
    if (error) throw error;
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i + BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('produk').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedProdukIds.clear();
    produkData = [];
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Produk berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadProduk();
}

// ========== AGENT FILTER FUNCTIONS ==========
function setupAgentFilters() {
    const searchInput = document.getElementById('searchAgentInput');
    const filterUpline = document.getElementById('filterUplineAgent');
    const filterCid = document.getElementById('filterCidAgent');
    const filterBank = document.getElementById('filterBankAgent');
    const filterDate = document.getElementById('filterDateAgent');
    const filterHasHp = document.getElementById('filterHasHpAgent');
    const filterHasApk = document.getElementById('filterHasApkAgent');
    const resetBtn = document.getElementById('resetAgentFilterBtn');
    
    const applyFilters = () => {
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const uplineFilter = filterUpline?.value.toLowerCase() || '';
        const cidFilter = filterCid?.value.toLowerCase() || '';
        const bankFilter = filterBank?.value || '';
        const dateFilter = filterDate?.value || '';
        const hasHp = filterHasHp?.checked || false;
        const hasApk = filterHasApk?.checked || false;
        
        let filtered = [...agentsData];
        
        if (searchTerm) {
            filtered = filtered.filter(item =>
                (item.nama && item.nama.toLowerCase().includes(searchTerm)) ||
                (item.agent_id && String(item.agent_id).toLowerCase().includes(searchTerm)) ||
                (item.hp && String(item.hp).includes(searchTerm))
            );
        }
        
        if (uplineFilter) {
            filtered = filtered.filter(item => 
                item.upline && item.upline.toLowerCase().includes(uplineFilter)
            );
        }
        
        if (cidFilter) {
            filtered = filtered.filter(item => 
                item.cid && item.cid.toLowerCase().includes(cidFilter)
            );
        }
        
        if (bankFilter) {
            filtered = filtered.filter(item => item.jenis_bank === bankFilter);
        }
        
        if (dateFilter === 'today') {
            filtered = filtered.filter(item => {
                const date = new Date(item.created_at);
                const today = new Date();
                return date.toDateString() === today.toDateString();
            });
        } else if (dateFilter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(item => new Date(item.created_at) >= weekAgo);
        } else if (dateFilter === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            filtered = filtered.filter(item => new Date(item.created_at) >= monthAgo);
        }
        
        if (hasHp) {
            filtered = filtered.filter(item => item.hp && item.hp.length >= 10);
        }
        
        if (hasApk) {
            filtered = filtered.filter(item => item.apk && item.apk !== '-' && item.apk !== '');
        }
        
        agentsFilteredData = filtered;
        const filteredSpan = document.getElementById('agentFilteredCount');
        if (filteredSpan) filteredSpan.innerText = filtered.length;
        
        renderAgentList(agentsData);
    };
    
    if (searchInput) searchInput.addEventListener('input', () => setTimeout(applyFilters, 300));
    if (filterUpline) filterUpline.addEventListener('input', () => setTimeout(applyFilters, 300));
    if (filterCid) filterCid.addEventListener('input', () => setTimeout(applyFilters, 300));
    if (filterBank) filterBank.addEventListener('change', applyFilters);
    if (filterDate) filterDate.addEventListener('change', applyFilters);
    if (filterHasHp) filterHasHp.addEventListener('change', applyFilters);
    if (filterHasApk) filterHasApk.addEventListener('change', applyFilters);
    
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (searchInput) searchInput.value = '';
            if (filterUpline) filterUpline.value = '';
            if (filterCid) filterCid.value = '';
            if (filterBank) filterBank.value = '';
            if (filterDate) filterDate.value = '';
            if (filterHasHp) filterHasHp.checked = false;
            if (filterHasApk) filterHasApk.checked = false;
            applyFilters();
        };
    }
}

// ========== GLOBAL TRANSACTION FUNCTIONS ==========
async function saveTransaksiGlobal(nominal, keterangan, tanggal, editId = null) {
    if (!nominal || parseInt(nominal) <= 0) {
        showNotifTop('⚠️ Masukkan jumlah transaksi yang valid!', true);
        return false;
    }
    
    try {
        const data = {
            nominal: parseInt(nominal),
            keterangan: keterangan || '',
            tanggal: tanggal || getTodayDate(),
            updated_at: new Date().toISOString()
        };
        
        if (editId) {
            // Update existing
            const { error } = await supabase.from('transaksi_global')
                .update(data)
                .eq('id', editId);
            if (error) throw error;
            showNotifTop('✅ Transaksi berhasil diupdate!');
        } else {
            // Insert new
            data.created_at = new Date().toISOString();
            data.created_by = currentUser.id;
            data.created_by_name = currentUserName;
            
            const { error } = await supabase.from('transaksi_global')
                .insert(data);
            if (error) throw error;
            showNotifTop('✅ Transaksi berhasil ditambahkan!');
        }
        
        await loadTransaksiGlobal();
        await updateTargetDisplay();
        return true;
    } catch (err) {
        showNotifTop('❌ Gagal menyimpan transaksi: ' + err.message, true);
        return false;
    }
}

async function deleteSelectedTransaksi() {
    const selectedIds = Array.from(selectedTransaksiIds.keys());
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang dipilih', true);
        return;
    }
    
    if (!confirm(`Hapus ${selectedIds.length} data transaksi yang dipilih?`)) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Data Transaksi', selectedIds.length);
    progress.update(0, '🗑️ Menghapus', 'Memulai proses hapus...');
    
    let deleted = 0, failed = 0;
    
    for (let i = 0; i < selectedIds.length; i++) {
        const id = selectedIds[i];
        try {
            await supabase.from('db_transaksi').delete().eq('id', id);
            selectedTransaksiIds.delete(id);
            deleted++;
        } catch (err) {
            failed++;
            console.error(`Gagal hapus ${id}:`, err);
        }
        const percent = Math.floor(((deleted + failed) / selectedIds.length) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted + failed}/${selectedIds.length})`, deleted + failed, selectedIds.length);
        if ((i + 1) % 10 === 0) await loadDbTransaksi();
    }
    
    await loadDbTransaksi();
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}, Gagal: ${failed}`, selectedIds.length, selectedIds.length);
    showNotifTop(`✅ ${deleted} data transaksi berhasil dihapus${failed > 0 ? `, ${failed} gagal` : ''}`);
    setTimeout(() => progress.hide(), 3000);
}

function toggleProdukJenisFields(jenis) {
    const tanpaAdminFields = document.getElementById('tanpaAdminFields');
    const beradminFields = document.getElementById('beradminFields');
    
    if (jenis === 'tanpa_admin') {
        if (tanpaAdminFields) tanpaAdminFields.style.display = 'block';
        if (beradminFields) beradminFields.style.display = 'none';
    } else {
        if (tanpaAdminFields) tanpaAdminFields.style.display = 'none';
        if (beradminFields) beradminFields.style.display = 'block';
    }
}

// ========== IMPORT EXCEL FUNCTIONS ==========
function setupImportExcel() {
    const dropZone = document.getElementById('dropZone');
    const excelFileInput = document.getElementById('excelFile');
    const importTypeRadios = document.querySelectorAll('.radio-option');
    const importBtn = document.getElementById('importBtn');
    
    if (dropZone) dropZone.onclick = () => excelFileInput?.click();
    
    if (excelFileInput) {
        excelFileInput.onchange = function(e) {
            if (e.target.files[0]) document.getElementById('fileInfo').innerHTML = '📄 ' + e.target.files[0].name;
        };
    }
    
    if (importTypeRadios) {
        importTypeRadios.forEach(opt => {
            opt.onclick = function() {
                importType = this.dataset.import;
                importTypeRadios.forEach(o => o.classList.remove('active'));
                this.classList.add('active');
            };
        });
    }
    
    if (importBtn) {
        importBtn.onclick = async () => {
            const file = excelFileInput?.files[0];
            if (!file) {
                showNotifTop('Pilih file dulu!', true);
                return;
            }
            
            const btn = importBtn;
            const originalText = btn.textContent;
            btn.textContent = '⏳ Memproses...';
            btn.disabled = true;
            
            const progress = showFloatingProgress('📥 Import Data', 0);
            progress.update(0, '📥 Import Data', 'Membaca file Excel...');
            
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                try {
                    progress.update(5, '📥 Import Data', 'Memproses file Excel...');
                    
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    
                    console.log('Jumlah data:', json.length);
                    
                    if (!json || json.length === 0) {
                        showNotifTop('File Excel kosong!', true);
                        btn.textContent = originalText;
                        btn.disabled = false;
                        progress.hide();
                        return;
                    }
                    
                    let success = 0, failed = 0;
                    const totalRows = json.length;
                    
                    progress.update(10, '📥 Import Data', `Memproses ${totalRows} baris data...`, 0, totalRows);
                    progress.setTotal(totalRows);
                    
                    const BATCH_SIZE = 10;
                    
                    for (let batchStart = 0; batchStart < json.length; batchStart += BATCH_SIZE) {
                        const batchEnd = Math.min(batchStart + BATCH_SIZE, json.length);
                        const batch = json.slice(batchStart, batchEnd);
                        
                        for (let j = 0; j < batch.length; j++) {
                            const row = batch[j];
                            
                            try {
                                if (importType === 'transaksi') {
                                    let agentId = row.agent_id || row.Agent_ID || row.agentid || '';
                                    let nama = row.nama || row.Nama || row.name || `Agent ${agentId}`;
                                    let hp = row.hp || row.HP || row.phone || '';
                                    let apk = row.apk || row.APK || '';
                                    let uplineName = row.upline_name || row.nama_upline || '';
                                    let uplinePhone = row.upline_phone || row.phone_upline || '';
                                    let progresJenis = row.progres_jenis || row.jenis || 'normal';
                                    let progresJumlah = parseInt(row.progres_jumlah || row.jumlah || 0);
                                    let tanggal = row.tanggal_transaksi || row.tanggal || getTodayDate();
                                    
                                    progresJenis = progresJenis.toString().toLowerCase();
                                    if (progresJenis === 'up' || progresJenis === '+') progresJenis = 'naik';
                                    else if (progresJenis === 'down' || progresJenis === '-') progresJenis = 'turun';
                                    else if (progresJenis !== 'naik' && progresJenis !== 'turun') progresJenis = 'normal';
                                    
                                    if (!agentId) {
                                        failed++;
                                        continue;
                                    }
                                    
                                    if (tanggal && typeof tanggal === 'number') {
                                        tanggal = new Date(tanggal).toISOString().split('T')[0];
                                    }
                                    
                                    await supabase.from('db_transaksi').insert({
                                        agent_id: agentId.toString().toUpperCase().trim(),
                                        nama: nama.toString().trim(),
                                        hp: hp ? hp.toString().trim() : '',
                                        apk: apk || '',
                                        upline_name: uplineName || '',
                                        upline_phone: uplinePhone || '',
                                        progres_jenis: progresJenis,
                                        progres_jumlah: Math.abs(progresJumlah),
                                        tanggal_transaksi: tanggal,
                                        status: 'pending_import',
                                        user_id: currentUser.id,
                                        created_at: new Date().toISOString()
                                    });
                                    
                                    success++;
                                } else if (importType === 'customer') {
                                    let agentId = row.agent_id || row.Agent_ID || '';
                                    let nama = row.nama || row.Nama || '';
                                    let hp = row.hp || row.HP || '';
                                    let apk = row.apk || row.APK || '';
                                    let agentType = row.agent_type || row.type || '';
                                    let deadline = row.deadline || row.tanggal || getTodayDate();
                                    let uplineName = row.upline_name || '';
                                    let uplinePhone = row.upline_phone || '';
                                    
                                    if (!agentId || !nama || !hp) {
                                        failed++;
                                        continue;
                                    }
                                    
                                    let cleanHp = hp.toString().replace(/[^\d]/g, '');
                                    if (cleanHp.startsWith('0')) cleanHp = cleanHp.substring(1);
                                    if (cleanHp.startsWith('62')) cleanHp = cleanHp.substring(2);
                                    cleanHp = '+62' + cleanHp;
                                    
                                    await supabase.from('customers').insert({
                                        agent_id: agentId.toString().toUpperCase().trim(),
                                        nama: nama.toString().trim(),
                                        hp: cleanHp,
                                        apk: apk || '',
                                        agent_type: agentType || '',
                                        tanggal: deadline,
                                        status: 'baru',
                                        upline_name: uplineName || '',
                                        upline_phone: uplinePhone || '',
                                        user_id: currentUser.id,
                                        created_at: new Date().toISOString(),
                                        followup_data: null,
                                        pending_data: [],
                                        progres_transaksi: { items: [], total_tercapai: 0 }
                                    });
                                    
                                    success++;
                                } else {
                                    let nama = row.nama || row.Nama || '';
                                    let hp = row.hp || row.HP || '';
                                    let deadline = row.deadline || row.tanggal || getTodayDate();
                                    
                                    if (!nama || !hp) {
                                        failed++;
                                        continue;
                                    }
                                    
                                    let cleanHp = hp.toString().replace(/[^\d]/g, '');
                                    if (cleanHp.startsWith('0')) cleanHp = cleanHp.substring(1);
                                    if (cleanHp.startsWith('62')) cleanHp = cleanHp.substring(2);
                                    cleanHp = '+62' + cleanHp;
                                    
                                    await supabase.from('prospek').insert({
                                        nama: nama.toString().trim(),
                                        hp: cleanHp,
                                        status: 'Baru',
                                        deadline: deadline,
                                        user_id: currentUser.id,
                                        created_at: new Date().toISOString(),
                                        dihubungi_data: null,
                                        negosiasi_data: null
                                    });
                                    
                                    success++;
                                }
                            } catch (rowError) {
                                failed++;
                                console.error('Error baris:', rowError);
                            }
                            
                            const processed = batchStart + j + 1;
                            const percent = 10 + Math.floor((processed / totalRows) * 85);
                            progress.update(percent, '📥 Import Data', `Memproses... (${processed}/${totalRows})`, processed, totalRows);
                            await delay(20);
                        }
                        
                        await delay(100);
                    }
                    
                    progress.update(100, '✅ Selesai', `Berhasil: ${success}, Gagal: ${failed}`, success, totalRows);
                    showNotifTop(`✅ Import selesai! Berhasil: ${success}, Gagal: ${failed}`);
                    
                    if (importType === 'transaksi') await loadDbTransaksi();
                    else await loadAllData();
                    
                    excelFileInput.value = '';
                    document.getElementById('fileInfo').innerHTML = '';
                    setTimeout(() => progress.hide(), 3000);
                } catch (err) {
                    console.error('Import error:', err);
                    showNotifTop('❌ Gagal memproses file: ' + err.message, true);
                    progress.hide();
                } finally {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            };
            
            reader.onerror = function() {
                showNotifTop('❌ Gagal membaca file', true);
                btn.textContent = originalText;
                btn.disabled = false;
                if (progress) progress.hide();
            };
            
            reader.readAsArrayBuffer(file);
        };
    }
    
    document.getElementById('downloadCustomerExample')?.addEventListener('click', () => {
        const data = [{
            agent_id: 'AG-001',
            nama: 'Budi Santoso',
            hp: '6281234567890',
            apk: 'GNP',
            agent_type: 'CollectingAgent (CA)',
            deadline: getTodayDate(),
            upline_name: 'Siti Aminah',
            upline_phone: '6281234567891'
        }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customer');
        XLSX.writeFile(wb, 'contoh_customer.xlsx');
        showNotifTop('📋 Contoh file Customer berhasil diunduh');
    });
    
    document.getElementById('downloadProspekExample')?.addEventListener('click', () => {
        const data = [{
            nama: 'Rina Marlina',
            hp: '6281234567893',
            agent_type: 'AGENT',
            deadline: getTodayDate()
        }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Prospek');
        XLSX.writeFile(wb, 'contoh_prospek.xlsx');
        showNotifTop('📋 Contoh file Prospek berhasil diunduh');
    });
    
    document.getElementById('downloadTransaksiExample')?.addEventListener('click', () => {
        const data = [{
            'agent_id': 'AG-001',
            'nama': 'Budi Santoso',
            'hp': '6281234567890',
            'apk': 'GNP',
            'upline_name': 'Siti Aminah',
            'upline_phone': '6281234567891',
            'progres_jenis': 'naik',
            'progres_jumlah': '25',
            'tanggal_transaksi': getTodayDate()
        }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DB Transaksi');
        XLSX.writeFile(wb, 'contoh_db_transaksi.xlsx');
        showNotifTop('📋 Contoh file DB Transaksi berhasil diunduh');
    });
}

function setupAgentImport() {
    const importBtn = document.getElementById('importAgentExcelBtn');
    const fileInput = document.getElementById('agentExcelFile');
    if (!importBtn || !fileInput) return;
    
    importBtn.onclick = () => fileInput.click();
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        importBtn.textContent = '⏳ Memproses...';
        importBtn.disabled = true;
        
        const progress = showFloatingProgress('📥 Import Data Agent', 0);
        progress.update(0, '📥 Import Data', 'Membaca file Excel...');
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                progress.update(5, '📥 Import Data', 'Memproses file Excel...');
                
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                
                if (!json || json.length === 0) {
                    showNotifTop('File Excel kosong!', true);
                    return;
                }
                
                const firstRow = json[0];
                let agentIdCol = null, namaCol = null, hpCol = null;
                for (let key in firstRow) {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.includes('agent_id') || lowerKey === 'agentid') agentIdCol = key;
                    if (lowerKey.includes('nama') || lowerKey === 'name') namaCol = key;
                    if (lowerKey.includes('hp') || lowerKey === 'phone') hpCol = key;
                }
                
                if (!agentIdCol || !namaCol || !hpCol) {
                    showNotifTop('❌ Kolom wajib: agent_id, nama, hp tidak ditemukan!', true);
                    return;
                }
                
                let success = 0, duplicate = 0, failed = 0;
                progress.update(10, '📥 Import Data', `Memproses ${json.length} baris...`);
                progress.setTotal(json.length);
                
                for (let i = 0; i < json.length; i++) {
                    const row = json[i];
                    const agentId = String(row[agentIdCol] || '').trim().toUpperCase();
                    const nama = String(row[namaCol] || '').trim();
                    let hp = String(row[hpCol] || '').trim();
                    
                    if (!agentId || !nama || !hp) {
                        failed++;
                        continue;
                    }
                    
                    hp = hp.replace(/[^\d+]/g, '');
                    if (!hp.startsWith('+')) {
                        hp = hp.replace(/^0+/, '');
                        hp = hp.startsWith('62') ? '+' + hp : '+62' + hp;
                    }
                    
                    const { data: existing } = await supabase.from('db_agent').select('id').eq('agent_id', agentId).maybeSingle();
                    if (existing) {
                        duplicate++;
                        continue;
                    }
                    
                    const { error } = await supabase.from('db_agent').insert({
                        agent_id: agentId,
                        nama: nama,
                        hp: hp,
                        user_id: currentUser.id,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    
                    if (error) failed++;
                    else success++;
                    
                    const percent = 10 + Math.floor((i / json.length) * 85);
                    progress.update(percent, '📥 Import Data', `Memproses... (${i+1}/${json.length})`, i+1, json.length);
                }
                
                progress.update(100, '✅ Selesai', `Berhasil: ${success}, Duplikat: ${duplicate}, Gagal: ${failed}`, success, json.length);
                showNotifTop(`✅ Import selesai! Berhasil: ${success}, Duplikat: ${duplicate}, Gagal: ${failed}`);
                await loadDatabaseAgent();
                fileInput.value = '';
                setTimeout(() => progress.hide(), 3000);
            } catch (err) {
                showNotifTop('❌ Gagal import: ' + err.message, true);
                progress.hide();
            } finally {
                importBtn.textContent = '📥 Import Excel';
                importBtn.disabled = false;
            }
        };
        reader.readAsArrayBuffer(file);
    };
}

function setupProdukImport() {
    const importBtn = document.getElementById('importProdukExcelBtn');
    const fileInput = document.getElementById('produkExcelFile');
    if (!importBtn || !fileInput) return;
    
    importBtn.onclick = () => fileInput.click();
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        importBtn.textContent = '⏳ Memproses...';
        importBtn.disabled = true;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                
                if (!json || json.length === 0) {
                    showNotifTop('File Excel kosong!', true);
                    return;
                }
                
                let success = 0, failed = 0;
                
                for (const row of json) {
                    try {
                        let nama = row.nama || row.Nama || row.name || '';
                        let hpp = row.hpp || row.HPP || row.harga_modal || '';
                        let hargaJual = row.harga_jual || row.HargaJual || '';
                        let keterangan = row.keterangan || '';
                        
                        if (!nama || !hpp) {
                            failed++;
                            continue;
                        }
                        
                        await supabase.from('produk').insert({
                            nama: nama.toString().trim(),
                            hpp: parseInt(hpp) || 0,
                            harga_jual: parseInt(hargaJual) || 0,
                            keterangan: keterangan || '',
                            jenis_produk: 'tanpa_admin',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                        success++;
                    } catch (err) {
                        failed++;
                    }
                }
                
                showNotifTop(`✅ Import produk selesai! Berhasil: ${success}, Gagal: ${failed}`);
                await loadProduk();
                fileInput.value = '';
            } catch (err) {
                showNotifTop('❌ Gagal import: ' + err.message, true);
            } finally {
                importBtn.textContent = '📥 Import Excel';
                importBtn.disabled = false;
            }
        };
        reader.readAsArrayBuffer(file);
    };
}

function setupTarifImport() {
    const importBtn = document.getElementById('importTarifExcelBtn');
    const fileInput = document.getElementById('tarifExcelFile');
    if (!importBtn || !fileInput) return;
    
    importBtn.onclick = () => fileInput.click();
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        importBtn.textContent = '⏳ Memproses...';
        importBtn.disabled = true;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                
                if (!json || json.length === 0) {
                    showNotifTop('File Excel kosong!', true);
                    return;
                }
                
                let success = 0, failed = 0;
                
                for (const row of json) {
                    try {
                        let cid = row.cid || row.CID || '';
                        let pospaid = row.pospaid || row.Pospaid || 0;
                        let prepaid = row.prepaid || row.Prepaid || 0;
                        let nontaglis = row.nontaglis || row.Nontaglis || 0;
                        
                        if (!cid) {
                            failed++;
                            continue;
                        }
                        
                        cid = cid.toString().trim();
                        
                        const { data: existing } = await supabase.from('tarif_admin').select('id').eq('cid', cid).maybeSingle();
                        
                        if (existing) {
                            await supabase.from('tarif_admin').update({
                                admin_pospaid: parseInt(pospaid) || 0,
                                admin_prepaid: parseInt(prepaid) || 0,
                                admin_nontaglis: parseInt(nontaglis) || 0,
                                updated_at: new Date().toISOString()
                            }).eq('id', existing.id);
                        } else {
                            await supabase.from('tarif_admin').insert({
                                cid: cid,
                                admin_pospaid: parseInt(pospaid) || 0,
                                admin_prepaid: parseInt(prepaid) || 0,
                                admin_nontaglis: parseInt(nontaglis) || 0,
                                user_id: currentUser.id,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            });
                        }
                        success++;
                    } catch (err) {
                        failed++;
                    }
                }
                
                showNotifTop(`✅ Import tarif admin selesai! Berhasil: ${success}, Gagal: ${failed}`);
                await loadTarifAdmin();
                fileInput.value = '';
            } catch (err) {
                showNotifTop('❌ Gagal import: ' + err.message, true);
            } finally {
                importBtn.textContent = '📥 Import Excel';
                importBtn.disabled = false;
            }
        };
        reader.readAsArrayBuffer(file);
    };
}

function exportAgentToExcel() {
    if (agentsData.length === 0) {
        showNotifTop('Tidak ada data untuk diexport', true);
        return;
    }
    
    const exportData = agentsData.map(agent => ({
        'agent_id': agent.agent_id,
        'nama': (agent.nama || '').replace(/ \(.*\)/, ''),
        'agent_type': agent.agent_type || '',
        'pemilik': agent.pemilik || '',
        'alamat': agent.alamat || '',
        'email': agent.email || '',
        'hp': agent.hp || '',
        'upline': agent.upline || '',
        'no_rekening': agent.no_rekening || '',
        'atas_nama': agent.atas_nama || '',
        'jenis_bank': agent.jenis_bank || '',
        'no_ktp': agent.no_ktp || '',
        'cid': agent.cid || '',
        'apk': agent.apk || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database Agent');
    XLSX.writeFile(wb, `database_agent_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotifTop('✅ Export data berhasil!');
}

function exportProdukToExcel() {
    if (produkData.length === 0) {
        showNotifTop('Tidak ada data produk untuk diexport', true);
        return;
    }
    
    const exportData = produkData.map(item => ({
        'Nama Produk': item.nama,
        'HPP (Modal)': item.hpp,
        'Harga Jual': item.harga_jual || 0,
        'Admin Default': item.admin_default || 0,
        'Jenis Produk': item.jenis_produk === 'beradmin' ? 'Beradmin' : 'Tanpa Admin',
        'CID Based': item.cid_based ? 'Ya' : 'Tidak',
        'Keterangan': item.keterangan || '',
        'Tanggal Dibuat': new Date(item.created_at).toLocaleDateString('id-ID')
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produk');
    XLSX.writeFile(wb, `produk_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotifTop('✅ Export produk berhasil!');
}

function exportTarifToExcel() {
    if (tarifAdminData.length === 0) {
        showNotifTop('Tidak ada data untuk diexport', true);
        return;
    }
    
    const exportData = tarifAdminData.map(item => ({
        'CID': item.cid,
        'PLN Pospaid (Admin)': item.admin_pospaid || 0,
        'PLN Prepaid (Admin)': item.admin_prepaid || 0,
        'PLN Nontaglis (Admin)': item.admin_nontaglis || 0,
        'Terakhir Update': item.updated_at ? new Date(item.updated_at).toLocaleDateString('id-ID') : '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Admin per CID');
    XLSX.writeFile(wb, `tarif_admin_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotifTop('✅ Export data berhasil!');
}

function downloadAgentExample() {
    const data = [{
        agent_id: 'AG-001',
        nama: 'Budi Santoso',
        hp: '6281234567890',
        agent_type: 'CollectingAgent (CA)',
        pemilik: 'PT. Contoh',
        alamat: 'Jl. Raya No. 123, Jakarta',
        email: 'budi@example.com',
        upline: 'KORWIL Jakarta',
        no_rekening: '1234567890',
        atas_nama: 'Budi Santoso',
        jenis_bank: 'BCA',
        no_ktp: '3172010101950001',
        cid: '5213247',
        apk: 'GNP'
    }];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database Agent');
    XLSX.writeFile(wb, 'contoh_database_agent.xlsx');
    showNotifTop('📋 Contoh file Excel berhasil diunduh');
}

function downloadProdukExample() {
    const data = [
        { nama: 'Contoh Produk Beradmin', admin: 5000, hpp: 100000, harga_jual: '', jenis: 'beradmin', cid_based: 'yes' },
        { nama: 'Contoh Produk Tanpa Admin', admin: '', hpp: 50000, harga_jual: 75000, jenis: 'tanpa_admin' }
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produk');
    XLSX.writeFile(wb, 'contoh_produk.xlsx');
    showNotifTop('📋 Contoh file Excel berhasil diunduh');
}

function downloadTarifExample() {
    const data = [
        { cid: '5213247', pospaid: 7200, prepaid: 7200, nontaglis: 7200 },
        { cid: '5213248', pospaid: 7500, prepaid: 7500, nontaglis: 7500 },
        { cid: '5213249', pospaid: 7000, prepaid: 7000, nontaglis: 7000 }
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Admin per CID');
    XLSX.writeFile(wb, 'contoh_tarif_admin.xlsx');
    showNotifTop('📋 Contoh file Excel berhasil diunduh');
}

// ========== DASHBOARD FUNCTIONS ==========
function updateDashboardStats() {
    console.log('📊 updateDashboardStats: Updating dashboard...');
    console.log('   customersData length:', customersData.length);
    console.log('   prospekData length:', prospekData.length);
    
    const total = customersData.length;
    const closing = customersData.filter(c => c.status === 'closing').length;
    const pending = customersData.filter(c => c.status === 'pending').length;
    const followup = customersData.filter(c => c.status === 'followup').length;
    const baru = total - (closing + pending + followup);
    const activeProspek = total - closing;
    const rateClosing = total ? Math.round((closing / total) * 100) : 0;
    
    const totalDataEl = document.getElementById('totalData');
    const closingTotalEl = document.getElementById('closingTotal');
    const activeProspekEl = document.getElementById('activeProspek');
    const rateClosingEl = document.getElementById('rateClosing');
    
    if (totalDataEl) totalDataEl.innerText = total;
    if (closingTotalEl) closingTotalEl.innerText = closing;
    if (activeProspekEl) activeProspekEl.innerText = activeProspek;
    if (rateClosingEl) rateClosingEl.innerText = rateClosing + '%';
    
    const countBaruEl = document.getElementById('countBaru');
    const countFollowupEl = document.getElementById('countFollowup');
    const countPendingEl = document.getElementById('countPending');
    const countClosingEl = document.getElementById('countClosing');
    
    if (countBaruEl) countBaruEl.innerText = baru;
    if (countFollowupEl) countFollowupEl.innerText = followup;
    if (countPendingEl) countPendingEl.innerText = pending;
    if (countClosingEl) countClosingEl.innerText = closing;
    
    const baruCount = prospekData.filter(p => p.status === 'Baru').length;
    const dihubungiCount = prospekData.filter(p => p.status === 'Dihubungi').length;
    const negosiasiCount = prospekData.filter(p => p.status === 'Negosiasi').length;
    const tertarikCount = prospekData.filter(p => p.status === 'Tertarik').length;
    
    const countProspekBaruEl = document.getElementById('countProspekBaru');
    const countDihubungiEl = document.getElementById('countDihubungi');
    const countNegosiasiEl = document.getElementById('countNegosiasi');
    const countTertarikEl = document.getElementById('countTertarik');
    
    if (countProspekBaruEl) countProspekBaruEl.innerText = baruCount;
    if (countDihubungiEl) countDihubungiEl.innerText = dihubungiCount;
    if (countNegosiasiEl) countNegosiasiEl.innerText = negosiasiCount;
    if (countTertarikEl) countTertarikEl.innerText = tertarikCount;
    
    updateChartCustomer(total, closing, pending, followup);
    updateChartProspek(baruCount, dihubungiCount, negosiasiCount, tertarikCount);
    
    console.log('📊 updateDashboardStats: Selesai');
}

function updateChartCustomer(total, closing, pending, followup) {
    const ctx = document.getElementById('chartCustomer');
    if (!ctx) return;
    if (chartCustomer) chartCustomer.destroy();
    
    const baru = total - (closing + pending + followup);
    let totalTercapai = 0;
    
    customersData.forEach(c => {
        if (c.progres_transaksi && c.progres_transaksi.total_tercapai !== undefined) {
            totalTercapai += c.progres_transaksi.total_tercapai;
        }
    });
    
    const chartTitle = document.querySelector('#chartCustomer h3');
    if (chartTitle) {
        chartTitle.innerHTML = `📊 Followup Agen | 🎯 Total Tercapai: ${totalTercapai.toLocaleString()} Transaksi`;
    }
    
    chartCustomer = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Closing', 'Pending', 'Follow Up', 'Baru'],
            datasets: [{
                data: [closing, pending, followup, baru],
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'],
                borderWidth: 0,
                hoverOffset: 15,
                cutout: '65%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} (${((ctx.raw / ctx.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)` } }
            }
        }
    });
}

function updateChartProspek(baru, dihubungi, negosiasi, tertarik) {
    const ctx = document.getElementById('chartProspek');
    if (!ctx) return;
    if (chartProspek) chartProspek.destroy();
    
    chartProspek = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Baru', 'Dihubungi', 'Negosiasi', 'Tertarik'],
            datasets: [{
                data: [baru, dihubungi, negosiasi, tertarik],
                backgroundColor: ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981'],
                borderWidth: 0,
                hoverOffset: 15,
                cutout: '65%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} (${((ctx.raw / ctx.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)` } }
            }
        }
    });
}

// ========== TARGET FUNCTIONS ==========
async function updateTargetDisplay() {
    console.log('updateTargetDisplay dipanggil');
    
    const currentAgent = agentsData.filter(a => a.agent_type === 'AGENT').length;
    const currentKoor = agentsData.filter(a => a.agent_type === 'Koordinator Wilayah (KORWIL)' || a.agent_type === 'SUB KORWIL').length;
    const currentCA = agentsData.filter(a => a.agent_type === 'CollectingAgent (CA)' || a.agent_type === 'SUB CA').length;
    let currentTransaksi = window.totalTransaksiGlobal || 0;
    
    const targetAgentEl = document.getElementById('targetAgentValue');
    const targetKoorEl = document.getElementById('targetKoorValue');
    const targetCAEl = document.getElementById('targetCAValue');
    const targetTransaksiEl = document.getElementById('targetTransaksiValue');
    
    if (targetAgentEl) targetAgentEl.innerText = targetData.agent || 0;
    if (targetKoorEl) targetKoorEl.innerText = targetData.koordinator || 0;
    if (targetCAEl) targetCAEl.innerText = targetData.ca || 0;
    if (targetTransaksiEl) targetTransaksiEl.innerText = (targetData.transaksi || 0).toLocaleString('id-ID');
    
    const reachedAgentEl = document.getElementById('targetAgentReached');
    const reachedKoorEl = document.getElementById('targetKoorReached');
    const reachedCAEl = document.getElementById('targetCAReached');
    const reachedTransaksiEl = document.getElementById('targetTransaksiReached');
    
    if (reachedAgentEl) reachedAgentEl.innerText = currentAgent;
    if (reachedKoorEl) reachedKoorEl.innerText = currentKoor;
    if (reachedCAEl) reachedCAEl.innerText = currentCA;
    if (reachedTransaksiEl) reachedTransaksiEl.innerText = currentTransaksi.toLocaleString('id-ID');
    
    const agentPercent = targetData.agent ? Math.min((currentAgent / targetData.agent) * 100, 100) : 0;
    const koorPercent = targetData.koordinator ? Math.min((currentKoor / targetData.koordinator) * 100, 100) : 0;
    const caPercent = targetData.ca ? Math.min((currentCA / targetData.ca) * 100, 100) : 0;
    const transaksiPercent = targetData.transaksi ? Math.min((currentTransaksi / targetData.transaksi) * 100, 100) : 0;
    
    const progressAgent = document.getElementById('targetAgentProgress');
    const progressKoor = document.getElementById('targetKoorProgress');
    const progressCA = document.getElementById('targetCAProgress');
    const progressTransaksi = document.getElementById('targetTransaksiProgress');
    
    if (progressAgent) progressAgent.style.width = agentPercent + '%';
    if (progressKoor) progressKoor.style.width = koorPercent + '%';
    if (progressCA) progressCA.style.width = caPercent + '%';
    if (progressTransaksi) progressTransaksi.style.width = transaksiPercent + '%';
    
    updateTargetChart([agentPercent, koorPercent, caPercent, transaksiPercent]);
    updateTrendChart();
}

function updateTargetChart(percentages) {
    const ctx = document.getElementById('targetChart');
    if (!ctx) return;
    if (targetChart) targetChart.destroy();
    
    targetChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Agent', 'Koordinator', 'CA', 'Transaksi'],
            datasets: [{
                label: 'Pencapaian Target (%)',
                data: percentages,
                backgroundColor: ['#667eea', '#4facfe', '#f093fb', '#fa709a'],
                borderRadius: 8,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Persentase (%)' } } },
            plugins: { tooltip: { callbacks: { label: (c) => `${c.raw.toFixed(1)}%` } } }
        }
    });
}

function updateTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    if (trendChart) trendChart.destroy();
    
    const months = [];
    const agentData = [], caData = [], koorData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(month.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
        const monthlyTarget = targetData.monthlyTargets?.find(m => m.month === month.toISOString().slice(0, 7));
        agentData.push(monthlyTarget?.target_agent || 0);
        caData.push(monthlyTarget?.target_ca || 0);
        koorData.push(monthlyTarget?.target_koor || 0);
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: 'Agent', data: agentData, borderColor: '#667eea', backgroundColor: 'transparent', tension: 0.4 },
                { label: 'CA', data: caData, borderColor: '#f093fb', backgroundColor: 'transparent', tension: 0.4 },
                { label: 'Koordinator', data: koorData, borderColor: '#4facfe', backgroundColor: 'transparent', tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
    });
}

function renderMonthlyTargetList() {
    const container = document.getElementById('monthlyTargetList');
    if (!container) return;
    
    if (!targetData.monthlyTargets || targetData.monthlyTargets.length === 0) {
        container.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:20px;">Belum ada target bulanan</p>';
        return;
    }
    
    container.innerHTML = targetData.monthlyTargets.map((item, idx) => `
        <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: center; flex-wrap: wrap;">
            <input type="month" value="${item.month}" data-idx="${idx}" class="month-input" style="flex:2; min-width:120px; padding: 8px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <input type="number" value="${item.target_agent || 0}" placeholder="Agent" data-idx="${idx}" class="month-agent" style="flex:1; min-width:70px; padding: 8px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <input type="number" value="${item.target_ca || 0}" placeholder="CA" data-idx="${idx}" class="month-ca" style="flex:1; min-width:70px; padding: 8px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <input type="number" value="${item.target_koor || 0}" placeholder="Koor" data-idx="${idx}" class="month-koor" style="flex:1; min-width:70px; padding: 8px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <button class="delete-monthly-btn" data-idx="${idx}" style="background: #ef4444; color: white; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer;">🗑️</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.month-input').forEach(inp => inp.addEventListener('change', (e) => { targetData.monthlyTargets[e.target.dataset.idx].month = e.target.value; }));
    document.querySelectorAll('.month-agent').forEach(inp => inp.addEventListener('change', (e) => { targetData.monthlyTargets[e.target.dataset.idx].target_agent = parseInt(e.target.value) || 0; }));
    document.querySelectorAll('.month-ca').forEach(inp => inp.addEventListener('change', (e) => { targetData.monthlyTargets[e.target.dataset.idx].target_ca = parseInt(e.target.value) || 0; }));
    document.querySelectorAll('.month-koor').forEach(inp => inp.addEventListener('change', (e) => { targetData.monthlyTargets[e.target.dataset.idx].target_koor = parseInt(e.target.value) || 0; }));
    document.querySelectorAll('.delete-monthly-btn').forEach(btn => btn.addEventListener('click', (e) => { targetData.monthlyTargets.splice(e.target.dataset.idx, 1); renderMonthlyTargetList(); }));
}

async function saveTargetData() {
    console.log('saveTargetData: Menyimpan target...');
    
    const agentVal = parseInt(document.getElementById('targetAgentInput')?.value) || 0;
    const koorVal = parseInt(document.getElementById('targetKoorInput')?.value) || 0;
    const caVal = parseInt(document.getElementById('targetCAInput')?.value) || 0;
    const transaksiVal = parseInt(document.getElementById('targetTransaksiInput')?.value) || 0;
    
    const newTarget = {
        agent: agentVal,
        koordinator: koorVal,
        ca: caVal,
        transaksi: transaksiVal,
        monthlyTargets: targetData.monthlyTargets || [],
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.id || 'unknown'
    };
    
    try {
        let columnName = 'value';
        
        const { error } = await supabase.from('settings').upsert({
            key: 'targetKPI',
            [columnName]: newTarget,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
        
        if (error) throw error;
        
        targetData = newTarget;
        showNotifTop('✅ Target berhasil disimpan!');
        closeModal('manageTargetModal');
        await updateTargetDisplay();
    } catch (error) {
        console.error('Error saving target:', error);
        showNotifTop('❌ Gagal menyimpan target: ' + error.message, true);
    }
}

// ========== BROADCAST FUNCTIONS ==========
function initBroadcast() {
    const sourceRadios = document.querySelectorAll('input[name="sourceType"]');
    if (!sourceRadios.length) return;
    
    sourceRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const value = radio.value;
            const filterCard = document.getElementById('filterStatusCard');
            const customCard = document.getElementById('customNumbersCard');
            const prospekFilter = document.getElementById('prospekFilter');
            const customerFilter = document.getElementById('customerFilter');
            
            if (filterCard) filterCard.style.display = 'block';
            if (prospekFilter) prospekFilter.style.display = 'none';
            if (customerFilter) customerFilter.style.display = 'none';
            if (customCard) customCard.style.display = 'none';
            
            if (value === 'custom') {
                if (customCard) customCard.style.display = 'block';
                if (filterCard) filterCard.style.display = 'none';
            } else if (value === 'customer') {
                if (customerFilter) customerFilter.style.display = 'flex';
            } else if (value === 'prospek') {
                if (prospekFilter) prospekFilter.style.display = 'flex';
            }
            loadNumbers();
        });
    });
    
    document.querySelectorAll('#customerFilter input, #prospekFilter input').forEach(cb => {
        cb.addEventListener('change', loadNumbers);
    });
    document.getElementById('customNumbers')?.addEventListener('input', loadNumbers);
    document.getElementById('refreshNumbersBtn')?.addEventListener('click', loadNumbers);
    document.getElementById('sendBroadcastBtn')?.addEventListener('click', sendBroadcast);
    loadNumbers();
    initTemplateFeature();
}

function initTemplateFeature() {
    loadTemplates();
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    if (saveTemplateBtn) {
        saveTemplateBtn.onclick = () => {
            const name = document.getElementById('templateName')?.value;
            const message = document.getElementById('broadcastMessage')?.value;
            if (!name) { showNotifTop('⚠️ Masukkan nama template!', true); return; }
            if (!message) { showNotifTop('⚠️ Pesan tidak boleh kosong!', true); return; }
            saveTemplate(name, message);
            document.getElementById('templateName').value = '';
        };
    }
}

function loadTemplates() {
    const saved = localStorage.getItem('broadcast_templates');
    if (saved) savedTemplates = JSON.parse(saved);
    renderTemplateList();
}

function saveTemplate(name, message) {
    savedTemplates.unshift({ name, message, created_at: new Date().toISOString() });
    if (savedTemplates.length > 10) savedTemplates = savedTemplates.slice(0, 10);
    localStorage.setItem('broadcast_templates', JSON.stringify(savedTemplates));
    renderTemplateList();
    showNotifTop('✅ Template berhasil disimpan');
}

function renderTemplateList() {
    const container = document.getElementById('templateList');
    if (!container) return;
    if (!savedTemplates || savedTemplates.length === 0) {
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
            <div style="font-size:11px;color:#6b7280;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(template.message.substring(0, 100))}${template.message.length > 100 ? '...' : ''}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.template-use-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            const template = savedTemplates[idx];
            if (template) {
                document.getElementById('broadcastMessage').value = template.message;
                showNotifTop(`✅ Template "${template.name}" diterapkan`);
            }
        };
    });
    
    document.querySelectorAll('.template-delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            if (confirm('Hapus template ini?')) {
                savedTemplates.splice(idx, 1);
                localStorage.setItem('broadcast_templates', JSON.stringify(savedTemplates));
                renderTemplateList();
                showNotifTop('🗑️ Template dihapus');
            }
        };
    });
}

async function loadNumbers() {
    const sourceType = document.querySelector('input[name="sourceType"]:checked')?.value || 'customer';
    
    if (sourceType === 'custom') {
        const customNumbers = document.getElementById('customNumbers')?.value || '';
        const numbers = customNumbers.split('\n').filter(n => n.trim());
        currentNumbers = numbers;
        document.getElementById('numberCount').innerText = currentNumbers.length;
        const listDiv = document.getElementById('numbersList');
        if (listDiv) {
            listDiv.innerHTML = numbers.map(num => `<div class="number-item">📞 ${escapeHtml(num.trim())}</div>`).join('');
        }
        return;
    }
    
    let table = '';
    let statusField = 'status';
    let statusValues = [];
    
    if (sourceType === 'customer') {
        table = 'customers';
        statusValues = Array.from(document.querySelectorAll('#customerFilter input:checked')).map(cb => cb.value);
    } else if (sourceType === 'prospek') {
        table = 'prospek';
        statusValues = Array.from(document.querySelectorAll('#prospekFilter input:checked')).map(cb => cb.value);
    } else if (sourceType === 'tidak_tertarik') {
        table = 'db_tidak_tertarik';
        statusField = null;
    }
    
    if (!table) return;
    if (sourceType !== 'custom' && statusValues.length === 0 && sourceType !== 'tidak_tertarik') {
        showNotifTop('⚠️ Pilih minimal satu status!', true);
        return;
    }
    
    showNotifTop('⏳ Memuat nomor...');
    
    let query = supabase.from(table).select('*');
    if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
    if (statusField && statusValues.length > 0) query = query.in(statusField, statusValues);
    
    const { data, error } = await query.limit(2000);
    if (error) throw error;
    
    const numbers = [];
    for (const item of data || []) {
        let hp = item.hp || '';
        if (hp && hp !== '+62' && hp !== '62') {
            numbers.push({ hp: hp, nama: item.nama || 'Customer', id: item.id });
        }
    }
    
    currentNumbers = numbers;
    document.getElementById('numberCount').innerText = currentNumbers.length;
    const listDiv = document.getElementById('numbersList');
    if (listDiv) {
        if (numbers.length === 0) {
            listDiv.innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Tidak ada nomor yang ditemukan!</p>';
        } else {
            listDiv.innerHTML = numbers.map(item => `<div class="number-item">👤 ${escapeHtml(item.nama)}<br>📞 ${escapeHtml(item.hp)}</div>`).join('');
        }
    }
    showNotifTop(`✅ ${numbers.length} nomor ditemukan`);
}

async function sendBroadcast() {
    const messageTemplate = document.getElementById('broadcastMessage')?.value;
    const sendOneByOne = document.getElementById('sendOneByOne')?.checked;
    
    if (!messageTemplate) { showNotifTop('⚠️ Pesan tidak boleh kosong!', true); return; }
    if (currentNumbers.length === 0) { showNotifTop('⚠️ Tidak ada nomor tujuan!', true); return; }
    if (isBroadcasting) { showNotifTop('⚠️ Broadcast sedang berjalan!', true); return; }
    
    broadcastNumbers = [...currentNumbers];
    broadcastMessageTemplate = messageTemplate;
    currentBroadcastIndex = 0;
    broadcastStatus = [];
    isBroadcasting = true;
    
    showBroadcastPanel();
    processNextBroadcast();
}

function showBroadcastPanel() {
    let panelDiv = document.getElementById('broadcastPanel');
    if (!panelDiv) {
        const broadcastCard = document.querySelector('#broadcastPage .broadcast-card:last-child');
        if (broadcastCard) {
            panelDiv = document.createElement('div');
            panelDiv.id = 'broadcastPanel';
            panelDiv.className = 'broadcast-panel';
            panelDiv.innerHTML = `
                <div class="panel-header"><span>📢 Broadcast Manual</span><button id="closeBroadcastPanelBtn" class="close-panel-btn">✕</button></div>
                <div class="panel-content">
                    <div class="current-info"><div class="current-label">Sedang Diproses:</div><div class="current-name" id="currentName">-</div><div class="current-number" id="currentNumber">-</div></div>
                    <div class="message-preview" id="messagePreview"></div>
                    <div class="action-buttons"><button id="markSentBtn" class="mark-sent-btn">✅ Tandai Terkirim & Lanjut</button><button id="markFailedBtn" class="mark-failed-btn">❌ Tandai Gagal Kirim & Lanjut</button><button id="stopBroadcastPanelBtn" class="stop-btn">⏹️ Hentikan Broadcast</button></div>
                    <div class="whatsapp-link-container"><a href="#" id="whatsappLink" target="_blank" class="whatsapp-link-btn">💬 Buka WhatsApp</a></div>
                </div>
                <div class="progress-panel"><div class="progress-bar-container"><div class="progress-bar-fill" id="progressBarFillPanel"></div></div><div class="progress-text" id="progressTextPanel">0 / 0</div><div class="progress-list" id="progressListPanel"></div></div>
            `;
            broadcastCard.parentNode.insertBefore(panelDiv, broadcastCard.nextSibling);
            document.getElementById('closeBroadcastPanelBtn')?.addEventListener('click', () => { document.getElementById('broadcastPanel').style.display = 'none'; isBroadcasting = false; });
            document.getElementById('markSentBtn')?.addEventListener('click', () => { if(isBroadcasting){ broadcastStatus[currentBroadcastIndex] = 'success'; currentBroadcastIndex++; updateBroadcastPanel(); if(currentBroadcastIndex >= broadcastNumbers.length) finishBroadcast(); else processNextBroadcast(); } });
            document.getElementById('markFailedBtn')?.addEventListener('click', () => { if(isBroadcasting){ broadcastStatus[currentBroadcastIndex] = 'failed'; currentBroadcastIndex++; updateBroadcastPanel(); if(currentBroadcastIndex >= broadcastNumbers.length) finishBroadcast(); else processNextBroadcast(); } });
            document.getElementById('stopBroadcastPanelBtn')?.addEventListener('click', () => { if(confirm('⏹️ Hentikan broadcast?')){ isBroadcasting = false; document.getElementById('broadcastPanel').style.display = 'none'; showNotifTop('⏹️ Broadcast dihentikan'); } });
        }
    } else { panelDiv.style.display = 'block'; }
}

function processNextBroadcast() {
    if (!isBroadcasting) return;
    if (currentBroadcastIndex >= broadcastNumbers.length) { finishBroadcast(); return; }
    const item = broadcastNumbers[currentBroadcastIndex];
    const message = broadcastMessageTemplate.replace(/{nama}/g, item.nama || 'Customer');
    let nomor = item.hp.toString().replace('+', '').replace(/^0/, '62').replace(/[^\d]/g, '');
    document.getElementById('currentName').innerHTML = escapeHtml(item.nama || '-');
    document.getElementById('currentNumber').innerHTML = escapeHtml(item.hp);
    document.getElementById('messagePreview').innerHTML = `<strong>Pesan:</strong><br>${escapeHtml(message)}`;
    document.getElementById('whatsappLink').href = 'https://wa.me/' + nomor + '?text=' + encodeURIComponent(message);
    updateBroadcastPanel();
}

function updateBroadcastPanel() {
    const total = broadcastNumbers.length;
    const processed = currentBroadcastIndex;
    const percent = total > 0 ? (processed / total) * 100 : 0;
    const fillEl = document.getElementById('progressBarFillPanel');
    if (fillEl) fillEl.style.width = `${percent}%`;
    const textEl = document.getElementById('progressTextPanel');
    if (textEl) textEl.innerText = `${processed} / ${total} terproses`;
    const progressList = document.getElementById('progressListPanel');
    if (progressList && broadcastNumbers.length > 0) {
        let html = '';
        for (let i = 0; i < broadcastNumbers.length; i++) {
            const item = broadcastNumbers[i];
            const displayName = item.nama ? `${item.nama} (${item.hp})` : item.hp;
            let statusIcon = '⭕', statusClass = '';
            if (broadcastStatus[i] === 'success') { statusIcon = '✅'; statusClass = 'success'; }
            else if (broadcastStatus[i] === 'failed') { statusIcon = '❌'; statusClass = 'failed'; }
            else if (i < currentBroadcastIndex) { statusIcon = '✅'; statusClass = 'success'; }
            html += `<div class="panel-progress-item ${statusClass} ${i === currentBroadcastIndex ? 'current' : ''}"><span class="panel-status">${statusIcon}</span><span class="panel-number">${escapeHtml(displayName)}</span></div>`;
        }
        progressList.innerHTML = html;
        const currentElement = progressList.querySelector('.panel-progress-item.current');
        if (currentElement) currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function finishBroadcast() {
    let successCount = 0, failedCount = 0;
    for (let i = 0; i < broadcastNumbers.length; i++) {
        if (broadcastStatus[i] === 'success') successCount++;
        else if (broadcastStatus[i] === 'failed') failedCount++;
        else if (i < currentBroadcastIndex) successCount++;
    }
    showNotifTop(`✅ Broadcast selesai! Terkirim: ${successCount}, Gagal: ${failedCount}, Total: ${broadcastNumbers.length}`);
    isBroadcasting = false;
    const panel = document.getElementById('broadcastPanel');
    if (panel) panel.style.display = 'none';
}

// ========== UPLINE BROADCAST FUNCTIONS ==========
function initUplineBroadcast() {
    document.querySelectorAll('input[name="uplineSourceType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const value = this.value;
            const transaksiFilter = document.getElementById('uplineTransaksiFilter');
            const customerFilter = document.getElementById('uplineCustomerFilter');
            const customCard = document.getElementById('uplineCustomCard');
            if (transaksiFilter) transaksiFilter.style.display = 'none';
            if (customerFilter) customerFilter.style.display = 'none';
            if (customCard) customCard.style.display = 'none';
            if (value === 'transaksi') { if (transaksiFilter) transaksiFilter.style.display = 'flex'; }
            else if (value === 'customer') { if (customerFilter) customerFilter.style.display = 'flex'; }
            else if (value === 'custom') { if (customCard) customCard.style.display = 'block'; }
            loadUplineNumbers();
        });
    });
    document.querySelectorAll('#uplineCustomerFilter input').forEach(cb => cb.addEventListener('change', loadUplineNumbers));
    document.getElementById('uplineCustomNumbers')?.addEventListener('input', loadUplineNumbers);
    document.getElementById('refreshUplineBtn')?.addEventListener('click', loadUplineNumbers);
    document.getElementById('sendUplineBroadcastBtn')?.addEventListener('click', sendUplineBroadcast);
    loadUplineNumbers();
}

async function loadUplineNumbers() {
    const sourceType = document.querySelector('input[name="uplineSourceType"]:checked')?.value || 'transaksi';
    
    if (sourceType === 'custom') {
        const customNumbers = document.getElementById('uplineCustomNumbers')?.value || '';
        const numbers = customNumbers.split('\n').filter(n => n.trim());
        const listDiv = document.getElementById('uplineNumbersList');
        const countSpan = document.getElementById('uplineCount');
        if (listDiv) listDiv.innerHTML = numbers.map(num => `<div class="number-item">📞 ${escapeHtml(num.trim())}</div>`).join('');
        if (countSpan) countSpan.innerText = numbers.length;
        return;
    }
    
    let table = '';
    let statusValues = [];
    if (sourceType === 'transaksi') table = 'db_transaksi';
    else if (sourceType === 'customer') {
        table = 'customers';
        statusValues = Array.from(document.querySelectorAll('#uplineCustomerFilter input:checked')).map(cb => cb.value);
    }
    if (!table) { showNotifTop('⚠️ Sumber tidak valid!', true); return; }
    if (sourceType === 'customer' && statusValues.length === 0) {
        showNotifTop('⚠️ Pilih minimal satu status!', true);
        document.getElementById('uplineNumbersList').innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Silakan pilih minimal satu status terlebih dahulu!</p>';
        document.getElementById('uplineCount').innerText = '0';
        return;
    }
    
    showNotifTop('⏳ Mengelompokkan data berdasarkan Upline...');
    
    let query = supabase.from(table).select('*');
    if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
    if (statusValues.length > 0) query = query.in('status', statusValues);
    
    const { data, error } = await query.limit(2000);
    if (error) throw error;
    
    const listDiv = document.getElementById('uplineNumbersList');
    const countSpan = document.getElementById('uplineCount');
    
    if (!data || data.length === 0) {
        if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Tidak ada data dengan filter yang dipilih.</p>';
        if (countSpan) countSpan.innerText = '0';
        return;
    }
    
    const uplineMap = new Map();
    let dataWithoutUpline = 0;
    
    for (const item of data) {
        const uplinePhone = item.upline_phone || '';
        const uplineName = item.upline_name || 'Tidak ada upline';
        if (!uplinePhone || uplinePhone === '+62' || uplinePhone === '62' || uplinePhone === '' || uplinePhone === '0') { dataWithoutUpline++; continue; }
        if (!uplineMap.has(uplinePhone)) uplineMap.set(uplinePhone, { upline_phone: uplinePhone, upline_name: uplineName, agents: [] });
        uplineMap.get(uplinePhone).agents.push({ agent_id: item.agent_id || '-', nama: item.nama || '-', hp: item.hp || '-' });
    }
    
    uplineDataList = Array.from(uplineMap.values());
    
    if (listDiv) {
        if (uplineDataList.length === 0) {
            listDiv.innerHTML = `<p style="color:#ef4444; padding:20px;">⚠️ Tidak ada data upline yang ditemukan!</p><p style="color:#6b7280; font-size:12px; padding:0 20px 20px 20px;">📌 Pastikan data memiliki field upline_phone dan upline_name<br>⏭ Data tanpa upline: ${dataWithoutUpline}</p>`;
            if (countSpan) countSpan.innerText = '0';
        } else {
            const totalAgent = uplineDataList.reduce((sum, u) => sum + u.agents.length, 0);
            if (countSpan) countSpan.innerText = uplineDataList.length;
            listDiv.innerHTML = `<div style="background:#eef2ff; padding:10px; border-radius:8px; margin-bottom:12px;"><strong>📊 Ringkasan:</strong><br>Upline: ${uplineDataList.length} | Total Agent: ${totalAgent} | Data tanpa upline: ${dataWithoutUpline}</div>${uplineDataList.map(upline => `<div class="number-item upline-item" style="border-bottom:1px solid #e5e7eb; padding:12px 0;"><div style="font-weight:600; color:#8b5cf6;">👤 ${escapeHtml(upline.upline_name)}</div><div style="font-size:11px; color:#6b7280;">📞 ${escapeHtml(upline.upline_phone)}</div><div style="font-size:11px; margin-top:6px; background:#f3f4f6; padding:8px; border-radius:8px;"><strong>📋 Agent (${upline.agents.length}):</strong><br>${upline.agents.slice(0, 5).map(agent => `🆔 ${escapeHtml(agent.agent_id)} - ${escapeHtml(agent.nama)}`).join('<br>')}${upline.agents.length > 5 ? `<br>... dan ${upline.agents.length - 5} agent lainnya` : ''}</div></div>`).join('')}`;
        }
    }
    showNotifTop(`✅ Ditemukan ${uplineDataList.length} Upline dengan total ${uplineDataList.reduce((sum, u) => sum + u.agents.length, 0)} agent`);
}

async function sendUplineBroadcast() {
    const messageTemplate = document.getElementById('uplineBroadcastMessage')?.value;
    if (!messageTemplate) { showNotifTop('⚠️ Pesan tidak boleh kosong!', true); return; }
    if (uplineDataList.length === 0) { showNotifTop('⚠️ Tidak ada data upline! Klik "Refresh Data Upline" terlebih dahulu.', true); return; }
    const totalAgent = uplineDataList.reduce((sum, u) => sum + u.agents.length, 0);
    if (!confirm(`⭐ KIRIM BROADCAST KE UPLINE\n\n👥 Upline: ${uplineDataList.length}\n📋 Total Agent: ${totalAgent}\n\nKlik OK untuk melanjutkan.`)) return;
    
    const progress = showFloatingProgress('⭐ Broadcast ke Upline', uplineDataList.length);
    progress.update(0, '🚀 Mengirim Broadcast', 'Memulai pengiriman...');
    let success = 0, failed = 0;
    
    for (let i = 0; i < uplineDataList.length; i++) {
        const upline = uplineDataList[i];
        let message = messageTemplate.replace(/{nama_upline}/g, upline.upline_name).replace(/{total_agent}/g, upline.agents.length);
        let tableText = '';
        for (let j = 0; j < upline.agents.length; j++) {
            tableText += `${j + 1}. ${upline.agents[j].nama} (${upline.agents[j].agent_id})\n`;
        }
        message = message.replace(/{tabel_agent}/g, tableText);
        
        let nomor = upline.upline_phone.toString().replace(/[^\d+]/g, '');
        if (!nomor.startsWith('+')) { nomor = nomor.replace(/^0+/, ''); nomor = nomor.startsWith('62') ? '+' + nomor : '+62' + nomor; }
        const cleanNomor = nomor.replace(/[^\d]/g, '');
        
        try {
            window.open('https://wa.me/' + cleanNomor + '?text=' + encodeURIComponent(message), '_blank');
            success++;
            const percent = Math.floor(((i + 1) / uplineDataList.length) * 100);
            progress.update(percent, '⭐ Mengirim', `Mengirim ke ${upline.upline_name} (${i + 1}/${uplineDataList.length})...`, i + 1, uplineDataList.length);
            await delay(800);
        } catch (e) { failed++; }
    }
    
    progress.update(100, '✅ Selesai', `Berhasil: ${success}, Gagal: ${failed}`, uplineDataList.length, uplineDataList.length);
    showNotifTop(`✅ Broadcast ke Upline selesai! Terkirim ke ${success} upline, Gagal: ${failed}`);
    setTimeout(() => progress.hide(), 4000);
}

// ========== SEARCH FUNCTIONS ==========
async function performSearch() {
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!keyword) { showNotifTop('⚠️ Masukkan kata kunci pencarian!', true); return; }
    
    const searchCustomer = document.getElementById('searchCustomer')?.checked || false;
    const searchProspek = document.getElementById('searchProspek')?.checked || false;
    const searchClosing = document.getElementById('searchClosing')?.checked || false;
    const searchTidak = document.getElementById('searchTidak')?.checked || false;
    const searchNomorSalah = document.getElementById('searchNomorSalah')?.checked || false;
    const searchCommitment = document.getElementById('searchCommitment')?.checked || false;
    
    const results = [];
    const LIMIT = 50;
    
    if (searchCustomer) {
        let query = supabase.from('customers').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(LIMIT);
        for (const item of data || []) {
            if (`${item.agent_id || ''} ${item.nama || ''} ${item.hp || ''}`.toLowerCase().includes(keyword)) {
                results.push({ id: item.id, type: 'customer', title: item.nama, subtitle: item.hp, detail: `ID: ${item.agent_id || '-'} | Deadline: ${item.tanggal || '-'}`, badge: 'Followup Agen', badgeClass: 'badge-customer' });
            }
        }
    }
    
    if (searchProspek) {
        let query = supabase.from('prospek').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(LIMIT);
        for (const item of data || []) {
            if (`${item.nama || ''} ${item.hp || ''}`.toLowerCase().includes(keyword)) {
                results.push({ id: item.id, type: 'prospek', title: item.nama, subtitle: item.hp, detail: `Status: ${item.status || 'Baru'} | Deadline: ${item.deadline || '-'}`, badge: 'Prospek Agen', badgeClass: 'badge-prospek' });
            }
        }
    }
    
    if (searchClosing) {
        let query = supabase.from('db_closing').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(LIMIT);
        for (const item of data || []) {
            if (`${item.nama || ''} ${item.hp || ''}`.toLowerCase().includes(keyword)) {
                results.push({ id: item.id, type: 'closing', title: item.nama, subtitle: item.hp, detail: `Closing: ${item.closing_date ? new Date(item.closing_date).toLocaleDateString('id-ID') : '-'}`, badge: 'DB Closing', badgeClass: 'badge-closing' });
            }
        }
    }
    
    if (searchTidak) {
        let query = supabase.from('db_tidak_tertarik').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(LIMIT);
        for (const item of data || []) {
            if (`${item.nama || ''} ${item.hp || ''}`.toLowerCase().includes(keyword)) {
                results.push({ id: item.id, type: 'tidak', title: item.nama, subtitle: item.hp, detail: `Tanggal: ${item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}`, badge: 'DB Tidak Tertarik', badgeClass: 'badge-tidak' });
            }
        }
    }
    
    if (searchNomorSalah) {
        let query = supabase.from('nomor_salah').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(LIMIT);
        for (const item of data || []) {
            if (`${item.nama || ''} ${item.hp || ''}`.toLowerCase().includes(keyword)) {
                results.push({ id: item.id, type: 'nomor_salah', title: item.nama, subtitle: item.hp, detail: `Alasan: ${item.alasan || '-'}`, badge: 'DB Nomor Salah', badgeClass: 'badge-nomor-salah' });
            }
        }
    }
    
    if (searchCommitment) {
        let query = supabase.from('db_commitment').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(LIMIT);
        for (const item of data || []) {
            if (`${item.nama || ''} ${item.hp || ''}`.toLowerCase().includes(keyword)) {
                results.push({ id: item.id, type: 'commitment', title: item.nama, subtitle: item.hp, detail: `Agent: ${item.agent_id || '-'}`, badge: 'DB Commitment', badgeClass: 'badge-commitment' });
            }
        }
    }
    
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">🔍 Tidak ada data yang ditemukan</p>';
        return;
    }
    
    container.innerHTML = results.map(r => `<div class="search-result-item" data-id="${r.id}" data-type="${r.type}" style="cursor:pointer;"><div class="search-result-info"><h4>${escapeHtml(r.title)}</h4><p>${escapeHtml(r.subtitle)}</p><small>${escapeHtml(r.detail)}</small></div><span class="search-result-badge ${r.badgeClass}">${r.badge}</span></div>`).join('');
    
    document.querySelectorAll('.search-result-item').forEach(el => {
        el.onclick = () => {
            const id = el.dataset.id, type = el.dataset.type;
            if (type === 'customer') openDetailCustomer(id);
            else if (type === 'prospek') openDetailProspek(id);
            else openDBDetailModal(id, type);
        };
    });
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">🔍 Masukkan kata kunci untuk mencari data</p>';
}

// ========== OPEN DETAIL FUNCTIONS ==========
async function openDetailCustomer(id) {
    const { data: d, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error || !d) return;
    
    const progresData = d.progres_transaksi || { items: [], total_tercapai: 0 };
    const totalTercapai = progresData.total_tercapai || 0;
    let ownerInfo = '';
    
    if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
        const { data: user } = await supabase.from('users').select('nama').eq('id', d.user_id).single();
        ownerInfo = `<div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Pemilik Data</label><div class="value">${escapeHtml(user?.nama || 'CS Agent')}</div></div></div>`;
    }
    
    const statusIcon = d.status === 'closing' ? '🎉' : d.status === 'pending' ? '⏳' : d.status === 'followup' ? '📞' : '🆕';
    let actionButtons = '';
    if (d.status === 'baru') actionButtons = `<button class="btn-primary" onclick="updateCustomerStatus('${id}','followup')">📞 Lanjut ke Follow Up</button>`;
    else if (d.status === 'followup') actionButtons = `<button class="btn-primary" onclick="openFollowupConfirm('${id}')">📞 Konfirmasi Follow Up</button>`;
    else if (d.status === 'pending') actionButtons = `<button class="btn-warning" onclick="openPendingModal('${id}')">📝 Kelola Pending</button>`;
    else if (d.status === 'closing') actionButtons = `<button class="btn-success" onclick="saveToClosingNow('${id}')">💾 Simpan ke DB Closing</button>`;
    
    let followupInfo = '';
    if (d.followup_data) followupInfo = `<div class="detail-info-item"><div class="detail-info-icon">✅</div><div class="detail-info-content"><label>Follow Up</label><div class="value">Terkirim: ${d.followup_data.terkirim ? 'Ya' : 'Tidak'} | Dibalas: ${d.followup_data.dibalas ? 'Ya' : 'Tidak'}</div></div></div>`;
    
    let pendingInfo = '';
    if (d.pending_data && d.pending_data.length > 0) {
        const completedCount = d.pending_data.filter(item => item.checked === true && item.text?.trim() !== '').length;
        let itemsHtml = '';
        d.pending_data.forEach(item => {
            itemsHtml += `<div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #e5e7eb;"><span>${item.checked ? '✅' : '⭕'}</span><span style="flex:1; font-size:12px;">${escapeHtml(item.text) || '(kosong)'}</span></div>`;
        });
        pendingInfo = `<div class="detail-info-item" style="align-items:flex-start;"><div class="detail-info-icon">📝</div><div class="detail-info-content"><label>Pending Responses (${completedCount}/${d.pending_data.length} balasan tercatat)</label><div class="value" style="margin-top:8px;"><div style="background:#f9fafb; border-radius:8px; padding:8px; max-height:150px; overflow-y:auto;">${itemsHtml}</div></div></div></div>`;
    }
    
    const editBtn = `<button class="edit-deadline-btn" onclick="openEditDeadlineModal('${id}','customer','${d.tanggal || ''}')">✏️</button>`;
    const targetPhone = getTargetPhone(d);
    const targetName = getTargetName(d);
    
    const detailContent = document.getElementById('detailContent');
    if (detailContent) {
        detailContent.innerHTML = `
            <div class="detail-header"><div class="detail-avatar">${statusIcon}</div><h3>${escapeHtml(d.nama)}</h3><div class="detail-status">${getStatusBadge(d.status)}</div></div>
            <div class="detail-body"><div class="detail-info">
                ${ownerInfo}
                <div class="detail-info-item"><div class="detail-info-icon">🆔</div><div class="detail-info-content"><label>ID Agent</label><div class="value">${escapeHtml(d.agent_id || '-')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">🏷️</div><div class="detail-info-content"><label>Type/Class</label><div class="value">${escapeHtml(d.agent_type || '-')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Aplikasi</label><div class="value">${escapeHtml(d.apk || '-')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Upline / Atasan</label><div class="value">${escapeHtml(d.upline_name || '-')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor HP Upline</label><div class="value">${escapeHtml(d.upline_phone || '-')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">🎯</div><div class="detail-info-content"><label>Nomor Tujuan WA</label><div class="value" style="color:#4f46e5; font-weight:600;">${targetName} - ${targetPhone}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Deadline</label><div class="value">${d.tanggal || '-'} ${editBtn}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">🎯</div><div class="detail-info-content"><label>Total Transaksi Tercapai</label><div class="value" style="color:${totalTercapai >= 0 ? '#10b981' : '#ef4444'}; font-weight:700;">${totalTercapai > 0 ? '+' : ''}${totalTercapai.toLocaleString()} Transaksi</div></div></div>
                ${followupInfo}${pendingInfo}
                <div class="detail-info-item"><div class="detail-info-icon">📌</div><div class="detail-info-content"><label>Status</label><div class="value">${d.status === 'followup' ? 'Follow Up' : d.status}</div></div></div>
            </div>
            <div class="detail-actions"><button class="btn-success" onclick="openWACustomer('${id}')">💬 WhatsApp</button><button class="btn-primary" onclick="openTambahProgres('${id}')">📊 Tambah Progres</button>${actionButtons}</div></div>
            <div class="detail-footer"><button class="btn-outline" onclick="closeModal('detailModal')">❌ Tutup</button><button class="btn-danger" onclick="deleteCustomer('${id}')">🗑️ Hapus</button></div>
        `;
    }
    
    showModal('detailModal');
}

async function openDetailProspek(id) {
    const { data: d, error } = await supabase.from('prospek').select('*').eq('id', id).single();
    if (error || !d) return;
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
        const { data: user } = await supabase.from('users').select('nama').eq('id', d.user_id).single();
        ownerInfo = `<div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Pemilik Data</label><div class="value">${escapeHtml(user?.nama || 'CS Agent')}</div></div></div>`;
    }
    
    let statusIcon = d.status === 'Negosiasi' ? '📋' : d.status === 'Dihubungi' ? '📞' : d.status === 'Tertarik' ? '⭐' : '🆕';
    let actionButtons = '';
    if (d.status === 'Baru') actionButtons = `<button class="btn-primary" onclick="lanjutKeDihubungi('${id}')">📞 Lanjut ke Dihubungi</button>`;
    else if (d.status === 'Dihubungi') actionButtons = `<button class="btn-primary" onclick="openProspekDihubungiConfirm('${id}')">✅ Konfirmasi Dihubungi</button>`;
    else if (d.status === 'Negosiasi') actionButtons = `<button class="btn-primary" onclick="openProspekNegosiasiModal('${id}')">📝 Kelola Negosiasi</button>`;
    else if (d.status === 'Tertarik') actionButtons = `<button class="btn-primary" onclick="showConvertToCustomerModal('${id}')">🔄 Jadikan Customer</button>`;
    
    let negosiasiInfo = '';
    if (d.negosiasi_data) {
        negosiasiInfo = `<div class="detail-info-item"><div class="detail-info-icon">📋</div><div class="detail-info-content"><label>Data Negosiasi</label><div class="value">Aplikasi: ${d.negosiasi_data.aplikasi || '-'}<br>Domisili: ${d.negosiasi_data.domisili || '-'}<br>Transaksi: ${d.negosiasi_data.transaksi || '-'}<br>Deposit: ${d.negosiasi_data.deposit || '-'}<br>Tertarik: ${d.negosiasi_data.tertarik || '-'}<br>Penawaran: ${d.negosiasi_data.penawaran || '-'}</div></div></div>`;
    }
    
    let dihubungiInfo = '';
    if (d.dihubungi_data) {
        dihubungiInfo = `<div class="detail-info-item"><div class="detail-info-icon">✅</div><div class="detail-info-content"><label>Konfirmasi Dihubungi</label><div class="value">Terkirim: ${d.dihubungi_data.terkirim ? 'Ya' : 'Tidak'} | Dibalas: ${d.dihubungi_data.dibalas ? 'Ya' : 'Tidak'}</div></div></div>`;
    }
    
    const editBtn = `<button class="edit-deadline-btn" onclick="openEditDeadlineModal('${id}','prospek','${d.deadline || ''}')">✏️</button>`;
    
    const detailContent = document.getElementById('detailContent');
    if (detailContent) {
        detailContent.innerHTML = `
            <div class="detail-header"><div class="detail-avatar">${statusIcon}</div><h3>${escapeHtml(d.nama)}</h3><div class="detail-status">${getStatusBadge(d.status)}</div></div>
            <div class="detail-body"><div class="detail-info">
                ${ownerInfo}
                <div class="detail-info-item"><div class="detail-info-icon">🏷️</div><div class="detail-info-content"><label>Type/Class</label><div class="value">${escapeHtml(d.agent_type || '-')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Deadline</label><div class="value">${d.deadline || '-'} ${editBtn}</div></div></div>
                ${dihubungiInfo}${negosiasiInfo}
                <div class="detail-info-item"><div class="detail-info-icon">📌</div><div class="detail-info-content"><label>Status</label><div class="value">${d.status}</div></div></div>
            </div>
            <div class="detail-actions"><button class="btn-success" onclick="openWA('${d.hp}')">💬 WhatsApp</button>${actionButtons}</div></div>
            <div class="detail-footer"><button class="btn-outline" onclick="closeModal('detailModal')">❌ Tutup</button><button class="btn-danger" onclick="deleteProspek('${id}')">🗑️ Hapus</button></div>
        `;
    }
    
    showModal('detailModal');
}

// ========== FOLLOWUP FUNCTIONS ==========
function openFollowupConfirm(id) {
    currentPendingId = id;
    const modal = document.getElementById('followupConfirmModal');
    if (!modal) return;
    
    const cb1 = document.getElementById('followup_terkirim');
    const cb2 = document.getElementById('followup_dibalas');
    const yesBtn = document.getElementById('followupConfirmYes');
    const noBtn = document.getElementById('followupConfirmNo');
    
    if (cb1) cb1.checked = false;
    if (cb2) cb2.checked = false;
    if (yesBtn) yesBtn.disabled = true;
    
    const checkBoth = () => {
        const isCb1Checked = cb1 ? cb1.checked : false;
        const isCb2Checked = cb2 ? cb2.checked : false;
        if (yesBtn) yesBtn.disabled = !(isCb1Checked && isCb2Checked);
    };
    
    if (cb1) cb1.onclick = checkBoth;
    if (cb2) cb2.onclick = checkBoth;
    
    if (yesBtn) {
        yesBtn.onclick = async () => {
            if (yesBtn.disabled) {
                showNotifTop('⚠️ Harap centang kedua checklist terlebih dahulu!', true);
                return;
            }
            
            const { data: doc } = await supabase.from('customers').select('tanggal').eq('id', id).single();
            const newDeadline = addDaysToDate(doc?.tanggal || getTodayDate(), 1);
            
            await supabase.from('customers').update({
                followup_data: { terkirim: true, dibalas: true, timestamp: new Date().toISOString() },
                status: 'pending',
                tanggal: newDeadline
            }).eq('id', id);
            
            showNotifTop(`✅ Customer dipindahkan ke Pending. Deadline +1 hari menjadi ${newDeadline}`);
            closeModal('followupConfirmModal');
            await loadAllData();
            closeModal('detailModal');
        };
    }
    
    if (noBtn) {
        noBtn.onclick = async () => {
            const { data: doc } = await supabase.from('customers').select('*').eq('id', id).single();
            if (doc) {
                showConfirmDialog(
                    'Pindahkan ke Database Nomor Salah?',
                    `Apakah Anda yakin nomor "${escapeHtml(doc.hp)}" milik "${escapeHtml(doc.nama)}" tidak dapat dihubungi?`,
                    async () => {
                        await supabase.from('nomor_salah').insert({
                            nama: doc.nama,
                            hp: doc.hp,
                            alasan: 'Nomor tidak bisa dihubungi / tidak aktif',
                            deleted_at: new Date().toISOString(),
                            user_id: doc.user_id
                        });
                        await supabase.from('customers').delete().eq('id', id);
                        showNotifTop('📵 Data dipindahkan ke Database Nomor Salah');
                        closeModal('followupConfirmModal');
                        await loadAllData();
                        closeModal('detailModal');
                    }
                );
            }
        };
    }
    
    modal.style.display = 'flex';
}

function openPendingModal(id) {
    currentPendingId = id;
    supabase.from('customers').select('pending_data').eq('id', id).single().then(({ data }) => {
        pendingItems = data?.pending_data || [];
        renderPendingModal();
        document.getElementById('pendingModal').style.display = 'flex';
    });
}

function renderPendingModal() {
    const container = document.getElementById('pendingItemsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (pendingItems.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;">Belum ada catatan pending. Klik "+ Tambah Balasan" untuk menambahkan.</div>';
    }
    
    pendingItems.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'pending-item';
        div.innerHTML = `
            <input type="text" value="${escapeHtml(item.text)}" placeholder="Balasan/respon..." style="flex:1; padding:6px; border-radius:6px; border:1px solid #e5e7eb;">
            <input type="checkbox" ${item.checked ? 'checked' : ''} style="width:20px; height:20px;">
            <button class="delete-pending-item" data-idx="${idx}" style="background:none; border:none; cursor:pointer;">🗑️</button>
        `;
        const textInput = div.querySelector('input[type="text"]');
        const checkBox = div.querySelector('input[type="checkbox"]');
        const delBtn = div.querySelector('.delete-pending-item');
        
        textInput.onchange = (e) => { pendingItems[idx].text = e.target.value; updatePendingButtons(); };
        checkBox.onchange = (e) => { pendingItems[idx].checked = e.target.checked; updatePendingButtons(); };
        delBtn.onclick = () => { pendingItems.splice(idx, 1); renderPendingModal(); updatePendingButtons(); };
        container.appendChild(div);
    });
    
    const addBtn = document.getElementById('addPendingItemBtn');
    if (addBtn) addBtn.onclick = () => { pendingItems.push({ text: '', checked: false }); renderPendingModal(); updatePendingButtons(); };
    updatePendingButtons();
}

function updatePendingButtons() {
    const allFilledAndChecked = pendingItems.length > 0 && pendingItems.every(item => item.checked === true && item.text.trim() !== '');
    const finishBtn = document.getElementById('pendingFinishBtn');
    if (finishBtn) {
        if (allFilledAndChecked) {
            finishBtn.disabled = false;
            finishBtn.onclick = async () => {
                await supabase.from('customers').update({ pending_data: pendingItems }).eq('id', currentPendingId);
                confirmClosing(currentPendingId);
                closeModal('pendingModal');
            };
        } else {
            finishBtn.disabled = true;
        }
    }
    
    const saveBtn = document.getElementById('pendingSaveBtn');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const { data: doc } = await supabase.from('customers').select('tanggal').eq('id', currentPendingId).single();
            const newDeadline = addDaysToDate(doc?.tanggal || getTodayDate(), 3);
            await supabase.from('customers').update({ pending_data: pendingItems, tanggal: newDeadline }).eq('id', currentPendingId);
            showNotifTop(`💾 Data pending berhasil disimpan. Deadline +3 hari menjadi ${newDeadline}`);
            closeModal('pendingModal');
            await loadAllData();
        };
    }
    
    const cancelBtn = document.getElementById('pendingCancelBtn');
    if (cancelBtn) cancelBtn.onclick = () => closeModal('pendingModal');
}

function confirmClosing(id) {
    showConfirmDialog(
        'Pindahkan ke Database Closing?',
        `Apakah Anda yakin ingin memindahkan data ini ke DATABASE CLOSING?\n\n⚠️ Data yang sudah dipindahkan TIDAK BISA dikembalikan ke Followup Agen!`,
        async () => {
            const { data: doc } = await supabase.from('customers').select('*').eq('id', id).single();
            if (doc) await saveToClosingDB(id, doc);
            await loadAllData();
            updateAllBadges();
        },
        async () => {
            await supabase.from('customers').update({ status: 'closing' }).eq('id', id);
            showNotif('📌 Data tetap di kolom Closing');
            await loadAllData();
            updateAllBadges();
        }
    );
}

async function saveToClosingDB(id, data) {
    await supabase.from('db_closing').insert({
        nama: data.nama,
        hp: data.hp,
        tanggal: data.tanggal || getTodayDate(),
        closing_date: new Date().toISOString(),
        user_id: data.user_id,
        followup_data: data.followup_data || null,
        pending_data: data.pending_data || []
    });
    await supabase.from('customers').delete().eq('id', id);
    showNotif('✅ Data berhasil masuk Database Closing!');
    updateAllBadges();
}

function saveToClosingNow(id) {
    showConfirmDialog(
        'Pindahkan ke Database Closing?',
        `Apakah Anda yakin ingin memindahkan customer ini ke DATABASE CLOSING?\n\n⚠️ Data yang sudah dipindahkan TIDAK BISA dikembalikan ke Followup Agen!`,
        async () => {
            const { data: doc } = await supabase.from('customers').select('*').eq('id', id).single();
            if (doc) {
                await saveToClosingDB(id, doc);
                closeModal('detailModal');
                showNotif('✅ Data berhasil dipindahkan ke DB Closing');
                updateAllBadges();
            }
        }
    );
}

// ========== PROSPEK NEGOSIASI FUNCTIONS ==========
function lanjutKeDihubungi(id) {
    supabase.from('prospek').select('deadline').eq('id', id).single().then(({ data }) => {
        const newDeadline = addDaysToDate(data?.deadline || getTodayDate(), 1);
        supabase.from('prospek').update({ status: 'Dihubungi', deadline: newDeadline }).eq('id', id).then(() => {
            showNotif(`✅ Status berubah menjadi Dihubungi. Deadline +1 hari menjadi ${newDeadline}`);
            loadAllData();
            closeModal('detailModal');
        });
    });
}

function openProspekDihubungiConfirm(id) {
    currentProspekId = id;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '99999999';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px;">
            <h3>✅ Konfirmasi Dihubungi</h3>
            <div class="modal-subtitle">Pastikan sudah melakukan komunikasi dengan prospek</div>
            <div style="padding:0 20px;">
                <div class="form-group"><label><input type="checkbox" id="prospek_terkirim" style="margin-right:8px;"> Apakah pesan sudah terkirim dan terbaca?</label></div>
                <div class="form-group"><label><input type="checkbox" id="prospek_dibalas" style="margin-right:8px;"> Apakah sudah di balas?</label></div>
            </div>
            <div class="modal-buttons" style="display:flex; gap:12px;"><button id="prospekConfirmYes" class="btn-primary" disabled>✅ Lanjut ke Negosiasi</button><button id="prospekConfirmNo" class="btn-danger">📵 Nomor Salah/Tidak bisa dihubungi</button><button id="prospekConfirmCancel" class="btn-outline">❌ Batal</button></div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    
    const cb1 = modal.querySelector('#prospek_terkirim');
    const cb2 = modal.querySelector('#prospek_dibalas');
    const yesBtn = modal.querySelector('#prospekConfirmYes');
    const noBtn = modal.querySelector('#prospekConfirmNo');
    const cancelBtn = modal.querySelector('#prospekConfirmCancel');
    
    const checkBoth = () => { yesBtn.disabled = !(cb1.checked && cb2.checked); };
    cb1.onchange = checkBoth;
    cb2.onchange = checkBoth;
    
    yesBtn.onclick = async () => {
        const { data: doc } = await supabase.from('prospek').select('deadline').eq('id', id).single();
        const newDeadline = addDaysToDate(doc?.deadline || getTodayDate(), 1);
        await supabase.from('prospek').update({
            status: 'Negosiasi',
            deadline: newDeadline,
            dihubungi_data: { terkirim: true, dibalas: true, timestamp: new Date().toISOString(), via_wa: true }
        }).eq('id', id);
        modal.remove();
        document.body.classList.remove('modal-open');
        showNotifTop(`✅ Prospek dipindahkan ke Negosiasi. Deadline +1 hari menjadi ${newDeadline}`);
        loadAllData();
        closeModal('detailModal');
    };
    
    noBtn.onclick = async () => {
        const { data: doc } = await supabase.from('prospek').select('*').eq('id', id).single();
        if (doc) {
            showConfirmDialog(
                'Pindahkan ke Database Nomor Salah?',
                `Apakah Anda yakin nomor "${escapeHtml(doc.hp)}" milik "${escapeHtml(doc.nama)}" tidak dapat dihubungi?`,
                async () => {
                    await supabase.from('nomor_salah').insert({
                        nama: doc.nama,
                        hp: doc.hp,
                        alasan: 'Nomor tidak bisa dihubungi / tidak aktif',
                        deleted_at: new Date().toISOString(),
                        user_id: doc.user_id
                    });
                    await supabase.from('prospek').delete().eq('id', id);
                    showNotifTop('📵 Data dipindahkan ke Database Nomor Salah');
                    modal.remove();
                    document.body.classList.remove('modal-open');
                    loadAllData();
                    closeModal('detailModal');
                }
            );
        }
    };
    
    cancelBtn.onclick = () => {
        modal.remove();
        document.body.classList.remove('modal-open');
    };
}

function openProspekNegosiasiModal(id) {
    currentProspekId = id;
    const fields = ['prospek_aplikasi', 'prospek_domisili', 'prospek_transaksi', 'prospek_deposit', 'prospek_tertarik', 'prospek_penawaran'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });
    
    supabase.from('prospek').select('negosiasi_data').eq('id', id).single().then(({ data }) => {
        if (data?.negosiasi_data) {
            document.getElementById('prospek_aplikasi').value = data.negosiasi_data.aplikasi || '';
            document.getElementById('prospek_domisili').value = data.negosiasi_data.domisili || '';
            document.getElementById('prospek_transaksi').value = data.negosiasi_data.transaksi || '';
            document.getElementById('prospek_deposit').value = data.negosiasi_data.deposit || '';
            document.getElementById('prospek_tertarik').value = data.negosiasi_data.tertarik || '';
            document.getElementById('prospek_penawaran').value = data.negosiasi_data.penawaran || '';
        }
    });
    
    showModal('prospekNegosiasiModal');
    
    document.getElementById('negosiasiTertarikBtn').onclick = async () => {
        const vals = {};
        fields.forEach(f => vals[f] = document.getElementById(f).value);
        
        if (!vals.prospek_aplikasi || !vals.prospek_domisili || !vals.prospek_transaksi || !vals.prospek_deposit || !vals.prospek_tertarik || !vals.prospek_penawaran) {
            showNotifTop('⚠️ Semua field harus diisi!', true);
            return;
        }
        
        showConfirmDialog(
            'Pindahkan ke Status Tertarik?',
            'Apakah data kuesioner sudah lengkap dan prospek tertarik?',
            async () => {
                await supabase.from('prospek').update({
                    status: 'Tertarik',
                    negosiasi_data: {
                        aplikasi: vals.prospek_aplikasi,
                        domisili: vals.prospek_domisili,
                        transaksi: vals.prospek_transaksi,
                        deposit: vals.prospek_deposit,
                        tertarik: vals.prospek_tertarik,
                        penawaran: vals.prospek_penawaran,
                        timestamp: new Date().toISOString()
                    }
                }).eq('id', currentProspekId);
                showNotifTop('✅ Prospek dipindahkan ke Tertarik');
                closeModal('prospekNegosiasiModal');
                loadAllData();
                closeModal('detailModal');
            }
        );
    };
    
    document.getElementById('negosiasiTidakTertarikBtn').onclick = async () => {
        const vals = {};
        fields.forEach(f => vals[f] = document.getElementById(f).value);
        
        if (!vals.prospek_aplikasi || !vals.prospek_domisili || !vals.prospek_transaksi || !vals.prospek_deposit || !vals.prospek_tertarik || !vals.prospek_penawaran) {
            showNotifTop('⚠️ Data kuesioner harus diisi LENGKAP sebelum pindah ke Tidak Tertarik!', true);
            return;
        }
        
        const { data: doc } = await supabase.from('prospek').select('*').eq('id', currentProspekId).single();
        if (doc) {
            showConfirmDialog(
                'Pindahkan ke Database Tidak Tertarik?',
                `Apakah Anda yakin ingin memindahkan "${escapeHtml(doc.nama)}" ke DATABASE TIDAK TERTARIK?`,
                async () => {
                    await supabase.from('db_tidak_tertarik').insert({
                        nama: doc.nama,
                        hp: doc.hp,
                        tanggal: new Date().toISOString(),
                        user_id: doc.user_id,
                        alasan: 'Tidak tertarik setelah negosiasi',
                        status_sebelumnya: doc.status,
                        negosiasi_data: doc.negosiasi_data || null
                    });
                    await supabase.from('prospek').delete().eq('id', currentProspekId);
                    showNotifTop('📵 Data dipindahkan ke Database Tidak Tertarik');
                    closeModal('prospekNegosiasiModal');
                    closeModal('detailModal');
                    updateAllBadges();
                    setTimeout(() => loadAllData(), 300);
                }
            );
        }
    };
    
    document.getElementById('negosiasiSimpanBtn').onclick = async () => {
        const vals = {};
        fields.forEach(f => vals[f] = document.getElementById(f).value);
        
        const { data: doc } = await supabase.from('prospek').select('negosiasi_data, deadline').eq('id', currentProspekId).single();
        const existing = doc?.negosiasi_data || {};
        
        const hasChanges = fields.some(f => vals[f] !== (existing[f.replace('prospek_', '')] || ''));
        const hasAnyData = fields.some(f => vals[f]);
        
        if (!hasAnyData) {
            showNotifTop('⚠️ Tidak ada data untuk disimpan!', true);
            return;
        }
        if (!hasChanges) {
            showNotifTop('⚠️ Tidak ada perubahan data!', true);
            return;
        }
        
        const newDeadline = addDaysToDate(doc?.deadline || getTodayDate(), 3);
        
        await supabase.from('prospek').update({
            negosiasi_data: {
                aplikasi: vals.prospek_aplikasi || '',
                domisili: vals.prospek_domisili || '',
                transaksi: vals.prospek_transaksi || '',
                deposit: vals.prospek_deposit || '',
                tertarik: vals.prospek_tertarik || '',
                penawaran: vals.prospek_penawaran || '',
                timestamp: new Date().toISOString(),
                is_complete: !!(vals.prospek_aplikasi && vals.prospek_domisili && vals.prospek_transaksi && vals.prospek_deposit && vals.prospek_tertarik && vals.prospek_penawaran)
            },
            deadline: newDeadline
        }).eq('id', currentProspekId);
        
        showNotifTop(`💾 Data kuesioner berhasil disimpan. Deadline +3 hari menjadi ${newDeadline}`);
        closeModal('prospekNegosiasiModal');
        loadAllData();
        closeModal('detailModal');
    };
}

function showConvertToCustomerModal(prospekId) {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    const followupDate = nextMonth.toISOString().split('T')[0];
    
    showInputDialog(
        '📋 Lengkapi Data Customer',
        'Data prospek akan dipindahkan ke Followup Agen.\n\nSilakan lengkapi data berikut:',
        [
            { id: 'inputAgentId', label: 'ID Agent', type: 'text', placeholder: 'Contoh: AG-001', required: true },
            { id: 'inputAplikasi', label: 'Aplikasi', type: 'select', options: ['GNP', 'BSB', 'BTN'], required: true }
        ],
        async (values) => {
            const { data: doc } = await supabase.from('prospek').select('*').eq('id', prospekId).single();
            if (!doc) return;
            
            const cleanHp = doc.hp;
            const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(values.inputAgentId, cleanHp);
            
            if (duplicateAgent) {
                showNotifTop(`⚠️ ID Agent "${values.inputAgentId}" sudah terdaftar oleh ${duplicateAgent.owner}!`, true);
                return;
            }
            if (duplicateHp) {
                showNotifTop(`⚠️ Nomor WhatsApp "${cleanHp}" sudah terdaftar oleh ${duplicateHp.owner}!`, true);
                return;
            }
            
            showConfirmDialog(
                'Jadikan Customer & Pindahkan ke DB Commitment?',
                `Apakah Anda yakin ingin menjadikan "${escapeHtml(doc.nama)}" sebagai Customer?\n\n🆔 ID Agent: ${values.inputAgentId}\n📱 Aplikasi: ${values.inputAplikasi}\n📅 Tanggal Followup: ${followupDate}`,
                async () => {
                    await supabase.from('db_commitment').insert({
                        nama: doc.nama,
                        hp: doc.hp,
                        negosiasi_data: doc.negosiasi_data || null,
                        agent_id: values.inputAgentId,
                        aplikasi: values.inputAplikasi,
                        committed_at: new Date().toISOString(),
                        user_id: doc.user_id,
                        original_prospek_id: prospekId,
                        followup_date: followupDate
                    });
                    
                    await supabase.from('customers').insert({
                        agent_id: values.inputAgentId,
                        nama: doc.nama,
                        hp: doc.hp,
                        apk: values.inputAplikasi,
                        tanggal: followupDate,
                        status: 'baru',
                        user_id: doc.user_id,
                        created_at: new Date().toISOString(),
                        converted_from: 'prospek_commitment',
                        followup_data: null,
                        pending_data: []
                    });
                    
                    await supabase.from('prospek').delete().eq('id', prospekId);
                    showNotifTop('✅ Berhasil! Customer telah ditambahkan ke Followup Agen dan disimpan ke DB Commitment');
                    closeModal('detailModal');
                    await loadAllData();
                    updateAllBadges();
                }
            );
        }
    );
}

function openTambahProgres(customerId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px;">
            <h3>📊 Tambah Progres Transaksi</h3>
            <div class="modal-subtitle">Catat perubahan jumlah transaksi customer</div>
            <div style="padding:0 20px;">
                <div class="form-group"><label>Jenis Perubahan <span class="required">*</span></label><select id="progresJenis" style="width:100%; padding:12px; border-radius:14px;"><option value="naik">📈 Naik (Transaksi bertambah)</option><option value="turun">📉 Turun (Transaksi berkurang)</option></select></div>
                <div class="form-group"><label>Jumlah Perubahan <span class="required">*</span></label><input type="number" id="progresJumlah" placeholder="Contoh: 25" style="width:100%; padding:12px; border-radius:14px;"><small>Jumlah kenaikan/turunan transaksi (dalam Transaksi, selalu positif)</small></div>
                <div class="form-group"><label>Keterangan</label><textarea id="progresKeterangan" rows="2" placeholder="Contoh: Penambahan outlet baru" style="width:100%; padding:12px; border-radius:14px;"></textarea></div>
            </div>
            <div class="modal-buttons"><button id="simpanProgresBtn" class="btn-primary">💾 Simpan Progres</button><button id="batalProgresBtn" class="btn-outline">Batal</button></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const simpanBtn = modal.querySelector('#simpanProgresBtn');
    const batalBtn = modal.querySelector('#batalProgresBtn');
    
    simpanBtn.onclick = async () => {
        const jenis = modal.querySelector('#progresJenis').value;
        const jumlah = parseInt(modal.querySelector('#progresJumlah').value) || 0;
        const keterangan = modal.querySelector('#progresKeterangan').value;
        
        if (jumlah <= 0) {
            showNotifTop('⚠️ Masukkan jumlah perubahan yang valid (minimal 1 Transaksi)!', true);
            return;
        }
        
        const { data: doc } = await supabase.from('customers').select('progres_transaksi').eq('id', customerId).single();
        const progresData = doc?.progres_transaksi || { items: [], total_tercapai: 0 };
        const perubahan = jenis === 'naik' ? jumlah : -jumlah;
        const newTotal = (progresData.total_tercapai || 0) + perubahan;
        const newItem = { tanggal: getTodayDate(), jenis: jenis, jumlah: jumlah, keterangan: keterangan, created_at: new Date().toISOString() };
        
        await supabase.from('customers').update({
            progres_transaksi: { items: [...(progresData.items || []), newItem], total_tercapai: newTotal },
            updated_at: new Date().toISOString()
        }).eq('id', customerId);
        
        showNotifTop(`✅ Progres berhasil ditambahkan! Total transaksi tercapai: ${newTotal > 0 ? '+' : ''}${newTotal.toLocaleString()} Transaksi`);
        modal.remove();
        await loadAllData();
        await updateTargetDisplay();
        closeModal('detailModal');
    };
    
    batalBtn.onclick = () => modal.remove();
}

async function updateCustomerStatus(id, newStatus) {
    if (newStatus === 'followup') {
        const { data: customer } = await supabase.from('customers').select('tanggal').eq('id', id).single();
        const newDeadline = addDaysToDate(customer?.tanggal || getTodayDate(), 1);
        await supabase.from('customers').update({ status: 'followup', tanggal: newDeadline }).eq('id', id);
        showNotif(`✅ Status berhasil diupdate ke Follow Up. Deadline +1 hari menjadi ${newDeadline}`);
    }
    closeModal('detailModal');
    await loadAllData();
}

function openEditDeadlineModal(id, type, currentDeadline) {
    currentEditItem = id;
    currentEditType = type;
    const modal = document.getElementById('editDeadlineModal');
    if (!modal) return;
    
    const dateInput = document.getElementById('editDeadlineDate');
    if (dateInput) dateInput.value = currentDeadline || getTodayDate();
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
}

document.getElementById('saveDeadlineBtn')?.addEventListener('click', async () => {
    const newDeadline = document.getElementById('editDeadlineDate').value;
    if (!newDeadline) {
        showNotifTop('⚠️ Tanggal deadline harus diisi!', true);
        return;
    }
    
    try {
        if (currentEditType === 'customer') {
            await supabase.from('customers').update({ tanggal: newDeadline }).eq('id', currentEditItem);
            showNotifTop('✅ Deadline customer berhasil diubah menjadi ' + newDeadline);
        } else if (currentEditType === 'prospek') {
            await supabase.from('prospek').update({ deadline: newDeadline }).eq('id', currentEditItem);
            showNotifTop('✅ Deadline prospek berhasil diubah menjadi ' + newDeadline);
        }
        closeModal('editDeadlineModal');
        await loadAllData();
    } catch (e) {
        showNotifTop('❌ Gagal: ' + e.message, true);
    }
});

document.getElementById('cancelDeadlineBtn')?.addEventListener('click', () => closeModal('editDeadlineModal'));

// ========== GLOBAL TRANSACTION FUNCTIONS ==========
function showInputTransaksiModal() {
    currentTransaksiId = null;
    const nominalInput = document.getElementById('transaksiNominal');
    const keteranganInput = document.getElementById('transaksiKeterangan');
    const tanggalInput = document.getElementById('transaksiTanggal');
    
    if (nominalInput) nominalInput.value = '';
    if (keteranganInput) keteranganInput.value = '';
    if (tanggalInput) tanggalInput.value = new Date().toISOString().split('T')[0];
    
    showModal('inputTransaksiModal');
}

function showTransaksiListModal() {
    renderTransaksiListGlobal();
    showModal('transaksiListModal');
}

function renderTransaksiListGlobal() {
    const container = document.getElementById('transaksiList');
    if (!container) return;
    
    if (!transaksiList || transaksiList.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#9ca3af;">📭 Belum ada catatan transaksi</p>';
        return;
    }
    
    container.innerHTML = transaksiList.map(item => {
        const isOwnerOrCreator = (currentUserRole === 'owner' || item.created_by === currentUser.id);
        return `
            <div class="db-item" style="border-left: 3px solid #4f46e5; margin-bottom: 8px;">
                <div class="db-item-info">
                    <h4>💰 ${formatRupiah(item.nominal)}</h4>
                    <p>${escapeHtml(item.keterangan || '-')}</p>
                    <small>📅 ${new Date(item.tanggal).toLocaleDateString('id-ID')} | 👤 oleh: ${escapeHtml(item.created_by_name || 'CS')}</small>
                </div>
                <div class="db-item-actions">
                    ${isOwnerOrCreator ?
                        `<button class="db-item-edit" onclick="editTransaksiGlobal('${item.id}')">✏️ Edit</button>
                         <button class="db-item-delete" onclick="deleteTransaksiGlobal('${item.id}')">🗑️ Hapus</button>` :
                        `<small style="color:#9ca3af;">Hanya pembuat yang bisa edit/hapus</small>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

window.editTransaksiGlobal = function(id) {
    const transaksi = transaksiList.find(t => t.id === id);
    if (!transaksi) return;
    
    if (currentUserRole !== 'owner' && transaksi.created_by !== currentUser.id) {
        showNotifTop('⚠️ Anda hanya bisa mengedit transaksi yang Anda buat sendiri!', true);
        return;
    }
    
    currentTransaksiId = id;
    const nominalInput = document.getElementById('transaksiNominal');
    const keteranganInput = document.getElementById('transaksiKeterangan');
    const tanggalInput = document.getElementById('transaksiTanggal');
    
    if (nominalInput) nominalInput.value = transaksi.nominal;
    if (keteranganInput) keteranganInput.value = transaksi.keterangan || '';
    if (tanggalInput) tanggalInput.value = transaksi.tanggal;
    
    showModal('inputTransaksiModal');
};

async function deleteTransaksiGlobal(transaksiId) {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    
    try {
        await supabase.from('transaksi_global').delete().eq('id', transaksiId);
        showNotifTop('🗑️ Transaksi dihapus');
        await loadTransaksiGlobal();
        renderTransaksiListGlobal();
    } catch (e) {
        showNotifTop('❌ Gagal hapus: ' + e.message, true);
    }
}

// ========== DB TRANSAKSI FILTER FUNCTIONS ==========
function setupTransaksiFilters() {
    const searchInput = document.getElementById('searchTransaksiInput');
    const filterProgres = document.getElementById('filterProgresTransaksi');
    const filterStatus = document.getElementById('filterStatusTransaksi');
    const resetBtn = document.getElementById('resetTransaksiFilterBtn');
    
    const applyFilters = async () => {
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const progresFilter = filterProgres?.value || '';
        const statusFilter = filterStatus?.value || '';
        
        let filtered = [...transaksiData];
        
        if (searchTerm) {
            filtered = filtered.filter(item =>
                (item.nama && item.nama.toLowerCase().includes(searchTerm)) ||
                (item.agent_id && String(item.agent_id).toLowerCase().includes(searchTerm)) ||
                (item.hp && String(item.hp).includes(searchTerm))
            );
        }
        
        if (progresFilter) {
            filtered = filtered.filter(item => item.progres_jenis === progresFilter);
        }
        
        if (statusFilter) {
            filtered = filtered.filter(item => item.status === statusFilter);
        }
        
        const filteredCountSpan = document.getElementById('transaksiFilteredCount');
        if (filteredCountSpan) filteredCountSpan.innerText = filtered.length;
        
        renderTransaksiList(filtered);
    };
    
    if (searchInput) searchInput.addEventListener('input', () => setTimeout(applyFilters, 300));
    if (filterProgres) filterProgres.addEventListener('change', applyFilters);
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (searchInput) searchInput.value = '';
            if (filterProgres) filterProgres.value = '';
            if (filterStatus) filterStatus.value = '';
            applyFilters();
        };
    }
}

// ========== DATABASE DELETES ==========
async function deleteAllClosing() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Closing.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Closing', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('db_closing').select('id');
    if (error) throw error;
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i + BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('db_closing').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedClosingIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Closing berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadDBClosing();
}

async function deleteAllTidak() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Tidak Tertarik.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Tidak Tertarik', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('db_tidak_tertarik').select('id');
    if (error) throw error;
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i + BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('db_tidak_tertarik').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedTidakIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Tidak Tertarik berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadDBTidak();
}

async function deleteAllNomorSalah() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Nomor Salah.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Nomor Salah', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('nomor_salah').select('id');
    if (error) throw error;
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i + BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('nomor_salah').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedNomorSalahIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Nomor Salah berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadDBNomorSalah();
}

async function deleteAllCommitment() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Commitment.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Commitment', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('db_commitment').select('id');
    if (error) throw error;
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i + BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('db_commitment').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedCommitmentIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Commitment berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadDBCommitment();
}

async function deleteAllTransaksi() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Transaksi.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Transaksi', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('db_transaksi').select('id');
    if (error) throw error;
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i + BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('db_transaksi').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedTransaksiIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Transaksi berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadDbTransaksi();
}

// ========== KANBAN FULL MODE FUNCTIONS ==========
function renderFullFollowupKanban() {
    console.log('renderFullFollowupKanban - customers:', customersData.length);
    
    const today = getTodayDate();
    const lists = { baru: [], followup: [], pending: [], closing: [] };
    
    customersData.forEach(item => {
        const status = item.status || 'baru';
        if (status === 'closing') lists.closing.push(item);
        else if (status === 'pending') lists.pending.push(item);
        else if (status === 'followup') lists.followup.push(item);
        else lists.baru.push(item);
    });
    
    lists.baru.sort((a, b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    lists.followup.sort((a, b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    lists.pending.sort((a, b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    lists.closing.sort((a, b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    
    const countBaru = document.getElementById('fullCountBaru');
    const countFollowup = document.getElementById('fullCountFollowup');
    const countPending = document.getElementById('fullCountPending');
    const countClosing = document.getElementById('fullCountClosing');
    
    if (countBaru) countBaru.innerText = lists.baru.length;
    if (countFollowup) countFollowup.innerText = lists.followup.length;
    if (countPending) countPending.innerText = lists.pending.length;
    if (countClosing) countClosing.innerText = lists.closing.length;
    
    const isOwner = currentUserRole === 'owner';
    const renderCard = (item, columnStatus) => {
        const isOverdue = item.tanggal && item.tanggal < today;
        const isToday = item.tanggal === today;
        let deadlineClass = '';
        if (isOverdue) deadlineClass = 'deadline-overdue';
        else if (isToday) deadlineClass = 'deadline-today';
        const isChecked = selectedFullFollowupIds.get(item.id) === true;
        const checkboxHtml = isOwner ? `<input type="checkbox" class="full-item-checkbox" data-id="${item.id}" data-column="${columnStatus}" ${isChecked ? 'checked' : ''}>` : '';
        return `<div class="card-item ${deadlineClass}" data-id="${item.id}" data-status="${columnStatus}">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${checkboxHtml}
                        <div style="flex: 1; cursor: pointer;" class="card-click-area">
                            <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
                            <div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                            <div class="card-phone"><span title="${item.hp}">${item.hp}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWAById('${item.id}')">💬</span></div>
                            <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
                        </div>
                    </div>
                </div>`;
    };
    
    const baruContainer = document.getElementById('fullBaruList');
    const followupContainer = document.getElementById('fullFollowupList');
    const pendingContainer = document.getElementById('fullPendingList');
    const closingContainer = document.getElementById('fullClosingList');
    
    if (baruContainer) baruContainer.innerHTML = lists.baru.map(i => renderCard(i, 'baru')).join('');
    if (followupContainer) followupContainer.innerHTML = lists.followup.map(i => renderCard(i, 'followup')).join('');
    if (pendingContainer) pendingContainer.innerHTML = lists.pending.map(i => renderCard(i, 'pending')).join('');
    if (closingContainer) closingContainer.innerHTML = lists.closing.map(i => renderCard(i, 'closing')).join('');
    
    if (isOwner) {
        document.querySelectorAll('.full-item-checkbox').forEach(cb => {
            cb.onchange = (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    selectedFullFollowupIds.set(id, true);
                    e.target.closest('.card-item').style.opacity = '0.6';
                } else {
                    selectedFullFollowupIds.delete(id);
                    e.target.closest('.card-item').style.opacity = '1';
                }
                updateSelectAllFullFollowupButton();
            };
        });
    }
    
    document.querySelectorAll('.card-click-area').forEach(area => {
        area.onclick = (e) => {
            const card = area.closest('.card-item');
            if (card) openDetailCustomer(card.dataset.id);
        };
    });
    
    updateSelectAllFullFollowupButton();
}

function updateSelectAllFullFollowupButton() {
    const cards = document.querySelectorAll('#fullBaruList .full-item-checkbox');
    const allChecked = cards.length > 0 && Array.from(cards).every(cb => cb.checked);
    const btn = document.getElementById('selectAllFullFollowup');
    if (btn) {
        btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
        btn.style.display = (currentUserRole === 'owner') ? 'inline-block' : 'none';
    }
}

function renderFullProspekKanban() {
    console.log('renderFullProspekKanban - prospek:', prospekData.length);
    
    const today = getTodayDate();
    const lists = {
        prospekBaru: [], prospekDihubungi: [], prospekNegosiasi: [], prospekTertarik: []
    };
    
    prospekData.forEach(item => {
        const st = item.status || 'Baru';
        if (st === 'Baru') lists.prospekBaru.push(item);
        else if (st === 'Dihubungi') lists.prospekDihubungi.push(item);
        else if (st === 'Negosiasi') lists.prospekNegosiasi.push(item);
        else if (st === 'Tertarik') lists.prospekTertarik.push(item);
    });
    
    lists.prospekBaru.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.prospekDihubungi.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.prospekNegosiasi.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.prospekTertarik.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    
    const countBaru = document.getElementById('fullCountProspekBaru');
    const countDihubungi = document.getElementById('fullCountDihubungi');
    const countNegosiasi = document.getElementById('fullCountNegosiasi');
    const countTertarik = document.getElementById('fullCountTertarik');
    
    if (countBaru) countBaru.innerText = lists.prospekBaru.length;
    if (countDihubungi) countDihubungi.innerText = lists.prospekDihubungi.length;
    if (countNegosiasi) countNegosiasi.innerText = lists.prospekNegosiasi.length;
    if (countTertarik) countTertarik.innerText = lists.prospekTertarik.length;
    
    const isOwner = currentUserRole === 'owner';
    const renderCard = (item) => {
        const isOverdue = item.deadline && item.deadline < today;
        const isToday = item.deadline === today;
        let deadlineClass = '';
        if (isOverdue) deadlineClass = 'deadline-overdue';
        else if (isToday) deadlineClass = 'deadline-today';
        const isChecked = selectedFullProspekIds.get(item.id) === true;
        const checkboxHtml = isOwner ? `<input type="checkbox" class="full-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>` : '';
        return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                    <div style="display: flex; align-items: center;">
                        ${checkboxHtml}
                        <div style="flex: 1; cursor: pointer;" class="card-click-area">
                            <div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                            <div class="card-phone">${escapeHtml(item.hp)}<span class="whatsapp-icon" onclick="event.stopPropagation(); openWAById('${item.id}')">💬</span></div>
                            <div class="card-deadline">📅 ${item.deadline || '-'}</div>
                        </div>
                    </div>
                </div>`;
    };
    
    const baruContainer = document.getElementById('fullProspekBaruList');
    const dihubungiContainer = document.getElementById('fullProspekDihubungiList');
    const negosiasiContainer = document.getElementById('fullProspekNegosiasiList');
    const tertarikContainer = document.getElementById('fullProspekTertarikList');
    
    if (baruContainer) baruContainer.innerHTML = lists.prospekBaru.map(renderCard).join('');
    if (dihubungiContainer) dihubungiContainer.innerHTML = lists.prospekDihubungi.map(renderCard).join('');
    if (negosiasiContainer) negosiasiContainer.innerHTML = lists.prospekNegosiasi.map(renderCard).join('');
    if (tertarikContainer) tertarikContainer.innerHTML = lists.prospekTertarik.map(renderCard).join('');
    
    if (isOwner) {
        document.querySelectorAll('.full-item-checkbox').forEach(cb => {
            cb.onchange = (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    selectedFullProspekIds.set(id, true);
                    e.target.closest('.card-item').style.opacity = '0.6';
                } else {
                    selectedFullProspekIds.delete(id);
                    e.target.closest('.card-item').style.opacity = '1';
                }
                updateSelectAllFullProspekButton();
            };
        });
    }
    
    document.querySelectorAll('.card-click-area').forEach(area => {
        area.onclick = (e) => {
            const card = area.closest('.card-item');
            if (card) openDetailProspek(card.dataset.id);
        };
    });
    
    updateSelectAllFullProspekButton();
}

function updateSelectAllFullProspekButton() {
    const cards = document.querySelectorAll('#fullProspekBaruList .full-item-checkbox, #fullProspekDihubungiList .full-item-checkbox, #fullProspekNegosiasiList .full-item-checkbox, #fullProspekTertarikList .full-item-checkbox');
    const allChecked = cards.length > 0 && Array.from(cards).every(cb => cb.checked);
    const btn = document.getElementById('selectAllFullProspek');
    if (btn) {
        btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
        btn.style.display = (currentUserRole === 'owner') ? 'inline-block' : 'none';
    }
}

function toggleSelectAllFullFollowup() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menggunakan fitur ini!', true);
        return;
    }
    const cards = document.querySelectorAll('#fullBaruList .full-item-checkbox, #fullFollowupList .full-item-checkbox, #fullPendingList .full-item-checkbox, #fullClosingList .full-item-checkbox');
    if (cards.length === 0) return;
    const allChecked = Array.from(cards).every(cb => cb.checked);
    cards.forEach(cb => {
        cb.checked = !allChecked;
        const event = new Event('change', { bubbles: true });
        cb.dispatchEvent(event);
    });
}

function toggleSelectAllFullProspek() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menggunakan fitur ini!', true);
        return;
    }
    const cards = document.querySelectorAll('#fullProspekBaruList .full-item-checkbox, #fullProspekDihubungiList .full-item-checkbox, #fullProspekNegosiasiList .full-item-checkbox, #fullProspekTertarikList .full-item-checkbox');
    if (cards.length === 0) return;
    const allChecked = Array.from(cards).every(cb => cb.checked);
    cards.forEach(cb => {
        cb.checked = !allChecked;
        const event = new Event('change', { bubbles: true });
        cb.dispatchEvent(event);
    });
}

async function deleteSelectedFullFollowup() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus massal!', true);
        return;
    }
    const selectedIds = Array.from(selectedFullFollowupIds.keys());
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang dipilih', true);
        return;
    }
    if (!confirm(`Hapus ${selectedIds.length} data customer dari kolom BARU?`)) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Data', selectedIds.length);
    progress.update(0, '🗑️ Menghapus', 'Memulai proses hapus...');
    
    let deleted = 0;
    for (const id of selectedIds) {
        try {
            await supabase.from('customers').delete().eq('id', id);
            selectedFullFollowupIds.delete(id);
            deleted++;
            const percent = Math.floor((deleted / selectedIds.length) * 100);
            progress.update(percent, '🗑️ Menghapus', `Menghapus... (${deleted}/${selectedIds.length})`, deleted, selectedIds.length);
            await delay(100);
        } catch (e) {
            console.error(`Gagal hapus ${id}:`, e);
        }
    }
    
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, selectedIds.length);
    showNotifTop(`✅ ${deleted} data berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadAllData();
    renderFullFollowupKanban();
}

async function deleteSelectedFullProspek() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus massal!', true);
        return;
    }
    const selectedIds = Array.from(selectedFullProspekIds.keys());
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang dipilih', true);
        return;
    }
    if (!confirm(`Hapus ${selectedIds.length} data prospek?`)) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Data Prospek', selectedIds.length);
    let deleted = 0;
    
    for (const id of selectedIds) {
        try {
            await supabase.from('prospek').delete().eq('id', id);
            selectedFullProspekIds.delete(id);
            deleted++;
            const percent = Math.floor((deleted / selectedIds.length) * 100);
            progress.update(percent, '🗑️ Menghapus', `Menghapus... (${deleted}/${selectedIds.length})`, deleted, selectedIds.length);
            await delay(100);
        } catch (e) {
            console.error(`Gagal hapus ${id}:`, e);
        }
    }
    
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, selectedIds.length);
    showNotifTop(`✅ ${deleted} data berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadAllData();
    renderFullProspekKanban();
}

function initFullModeSelection() {
    const isOwner = (currentUserRole === 'owner');
    
    const followupSelectBtn = document.getElementById('selectAllFullFollowup');
    const followupDeleteBtn = document.getElementById('deleteSelectedFullFollowup');
    const followupDeleteAllBtn = document.getElementById('deleteAllFullFollowup');
    const prospekSelectBtn = document.getElementById('selectAllFullProspek');
    const prospekDeleteBtn = document.getElementById('deleteSelectedFullProspek');
    const prospekDeleteAllBtn = document.getElementById('deleteAllFullProspek');
    
    if (!isOwner) {
        if (followupSelectBtn) followupSelectBtn.style.display = 'none';
        if (followupDeleteBtn) followupDeleteBtn.style.display = 'none';
        if (followupDeleteAllBtn) followupDeleteAllBtn.style.display = 'none';
        if (prospekSelectBtn) prospekSelectBtn.style.display = 'none';
        if (prospekDeleteBtn) prospekDeleteBtn.style.display = 'none';
        if (prospekDeleteAllBtn) prospekDeleteAllBtn.style.display = 'none';
        return;
    }
    
    if (followupSelectBtn) {
        followupSelectBtn.style.display = 'inline-block';
        followupSelectBtn.onclick = toggleSelectAllFullFollowup;
    }
    if (followupDeleteBtn) {
        followupDeleteBtn.style.display = 'inline-block';
        followupDeleteBtn.onclick = deleteSelectedFullFollowup;
    }
    if (followupDeleteAllBtn) {
        followupDeleteAllBtn.style.display = 'inline-block';
        followupDeleteAllBtn.onclick = deleteAllFullFollowup;
    }
    if (prospekSelectBtn) {
        prospekSelectBtn.style.display = 'inline-block';
        prospekSelectBtn.onclick = toggleSelectAllFullProspek;
    }
    if (prospekDeleteBtn) {
        prospekDeleteBtn.style.display = 'inline-block';
        prospekDeleteBtn.onclick = deleteSelectedFullProspek;
    }
    if (prospekDeleteAllBtn) {
        prospekDeleteAllBtn.style.display = 'inline-block';
        prospekDeleteAllBtn.onclick = deleteAllFullProspek;
    }
}

async function deleteAllFullFollowup() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus semua data!', true);
        return;
    }
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Data Followup Agen.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Followup Agen', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('customers').select('id');
    if (error) throw error;
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i + BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('customers').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
        await delay(50);
    }
    
    selectedFullFollowupIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Followup Agen berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadAllData();
    renderFullFollowupKanban();
}

async function deleteAllFullProspek() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus semua data!', true);
        return;
    }
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Data Prospek Agen.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Prospek Agen', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('prospek').select('id');
    if (error) throw error;
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i + BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('prospek').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
        await delay(50);
    }
    
    selectedFullProspekIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Prospek Agen berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadAllData();
    renderFullProspekKanban();
}

// ========== BATCH MOVE TO FOLLOWUP FUNCTIONS ==========
async function loadDaftarCs() {
    try {
        const { data, error } = await supabase.from('users').select('id,nama,email,hp').neq('id', currentUser.id);
        if (error) throw error;
        daftarCs = data || [];
        
        const csSelect = document.getElementById('csTujuanSelect');
        if (csSelect) {
            csSelect.innerHTML = '<option value="">Pilih CS Agent</option>' +
                daftarCs.map(cs => `<option value="${cs.id}">${escapeHtml(cs.nama || cs.email)}</option>`).join('');
        }
        
        const csMultiContainer = document.getElementById('csMultiSelect');
        if (csMultiContainer) {
            csMultiContainer.innerHTML = daftarCs.map(cs => `
                <label style="display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; cursor: pointer; border-bottom: 1px solid #e5e7eb;">
                    <input type="checkbox" value="${cs.id}" class="cs-checkbox" style="width: 18px; height: 18px;">
                    <span>👤 ${escapeHtml(cs.nama || cs.email)}</span>
                </label>
            `).join('');
        }
    } catch (e) {
        console.error('Error load CS:', e);
    }
}

async function showPilihCsModal(dataToMove) {
    pendingMoveData = dataToMove;
    await loadDaftarCs();
    
    const countSpan = document.getElementById('selectedDataCount');
    if (countSpan) countSpan.innerText = pendingMoveData.length;
    
    const modal = document.getElementById('pilihCsTujuanModal');
    if (modal) modal.style.display = 'flex';
    
    const metodeSelect = document.getElementById('metodePembagian');
    const satuGroup = document.getElementById('satuCsGroup');
    const rataGroup = document.getElementById('rataCsGroup');
    
    if (metodeSelect) {
        metodeSelect.value = 'satu';
        if (satuGroup) satuGroup.style.display = 'block';
        if (rataGroup) rataGroup.style.display = 'none';
        
        metodeSelect.onchange = () => {
            const metode = metodeSelect.value;
            if (metode === 'satu') {
                if (satuGroup) satuGroup.style.display = 'block';
                if (rataGroup) rataGroup.style.display = 'none';
            } else if (metode === 'rata') {
                if (satuGroup) satuGroup.style.display = 'none';
                if (rataGroup) rataGroup.style.display = 'block';
            } else if (metode === 'upline') {
                if (satuGroup) satuGroup.style.display = 'none';
                if (rataGroup) rataGroup.style.display = 'block';
            }
        };
    }
    
    const confirmBtn = document.getElementById('confirmPindahKeCsBtn');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const metode = document.getElementById('metodePembagian').value;
            let csIds = [];
            
            if (metode === 'satu') {
                const csId = document.getElementById('csTujuanSelect').value;
                if (!csId) {
                    showNotifTop('⚠️ Pilih CS tujuan terlebih dahulu!', true);
                    return;
                }
                csIds = [csId];
            } else {
                const checkboxes = document.querySelectorAll('#csMultiSelect .cs-checkbox:checked');
                csIds = Array.from(checkboxes).map(cb => cb.value);
                if (csIds.length === 0) {
                    showNotifTop('⚠️ Pilih minimal satu CS tujuan!', true);
                    return;
                }
            }
            
            await prosesPindahKeCs(pendingMoveData, csIds, metode);
            closeModal('pilihCsTujuanModal');
        };
    }
    
    const batalBtn = document.getElementById('batalPindahKeCsBtn');
    if (batalBtn) batalBtn.onclick = () => {
        closeModal('pilihCsTujuanModal');
        pendingMoveData = [];
    };
}

async function prosesPindahKeCs(dataToMove, csIds, metode) {
    const totalData = dataToMove.length;
    const totalCs = csIds.length;
    
    let dataPerCs = [];
    
    if (metode === 'rata') {
        const baseCount = Math.floor(totalData / totalCs);
        const remainder = totalData % totalCs;
        let startIndex = 0;
        
        for (let i = 0; i < totalCs; i++) {
            let count = baseCount + (i < remainder ? 1 : 0);
            dataPerCs.push({
                csId: csIds[i],
                data: dataToMove.slice(startIndex, startIndex + count),
                count: count
            });
            startIndex += count;
        }
    } else {
        dataPerCs.push({
            csId: csIds[0],
            data: dataToMove,
            count: totalData
        });
    }
    
    const progress = showFloatingProgress('📋 Memindahkan ke Followup', totalData);
    progress.update(0, '📋 Memindahkan', 'Memulai proses...');
    
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    
    for (const csItem of dataPerCs) {
        const csInfo = daftarCs.find(c => c.id === csItem.csId);
        const csName = csInfo ? csInfo.nama || csInfo.email : 'CS Agent';
        
        for (let i = 0; i < csItem.data.length; i++) {
            const item = csItem.data[i];
            
            try {
                const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(item.agent_id, item.hp);
                
                if (duplicateAgent) {
                    totalSkipped++;
                    await supabase.from('db_transaksi').update({
                        status: 'duplicate',
                        duplicate_reason: `ID Agent ${item.agent_id} sudah terdaftar oleh ${duplicateAgent.owner}`
                    }).eq('id', item.id);
                    continue;
                }
                if (duplicateHp) {
                    totalSkipped++;
                    await supabase.from('db_transaksi').update({
                        status: 'duplicate',
                        duplicate_reason: `Nomor HP ${item.hp} sudah terdaftar oleh ${duplicateHp.owner}`
                    }).eq('id', item.id);
                    continue;
                }
                
                let totalTercapai = 0;
                if (item.progres_jenis === 'naik') totalTercapai = Math.abs(item.progres_jumlah || 0);
                else if (item.progres_jenis === 'turun') totalTercapai = -Math.abs(item.progres_jumlah || 0);
                else totalTercapai = item.progres_jumlah || 0;
                
                const progresItem = {
                    tanggal: item.tanggal_transaksi || getTodayDate(),
                    jenis: item.progres_jenis || 'normal',
                    jumlah: Math.abs(item.progres_jumlah || 0),
                    keterangan: `Dipindahkan dari DB Transaksi oleh ${currentUserName} ke CS: ${csName}`,
                    created_at: new Date().toISOString()
                };
                
                await supabase.from('customers').insert({
                    agent_id: item.agent_id,
                    nama: item.nama,
                    hp: item.hp,
                    apk: item.apk || '',
                    upline_name: item.upline_name || '',
                    upline_phone: item.upline_phone || '',
                    status: 'baru',
                    tanggal: getTodayDate(),
                    user_id: csItem.csId,
                    created_at: new Date().toISOString(),
                    followup_data: null,
                    pending_data: [],
                    progres_transaksi: {
                        items: [progresItem],
                        total_tercapai: totalTercapai
                    },
                    moved_from_transaksi: true,
                    original_transaksi_id: item.id,
                    moved_by: currentUser.id,
                    moved_by_name: currentUserName
                });
                
                await supabase.from('db_transaksi').update({
                    status: 'imported',
                    moved_to_followup_at: new Date().toISOString(),
                    moved_to_cs_id: csItem.csId,
                    moved_to_cs_name: csName
                }).eq('id', item.id);
                
                selectedTransaksiIds.delete(item.id);
                totalSuccess++;
            } catch (e) {
                totalFailed++;
                console.error(`Gagal pindah ${item.nama}:`, e);
                await supabase.from('db_transaksi').update({
                    status: 'error',
                    error_message: e.message
                }).eq('id', item.id);
            }
            
            const percent = Math.floor(((totalSuccess + totalFailed + totalSkipped) / totalData) * 100);
            progress.update(percent, '📋 Memindahkan', `Memproses... (${totalSuccess + totalFailed + totalSkipped}/${totalData})`, totalSuccess + totalFailed + totalSkipped, totalData);
            await delay(100);
        }
    }
    
    progress.update(100, '✅ Selesai', `Berhasil: ${totalSuccess}, Gagal: ${totalFailed}, Dilewati: ${totalSkipped}`, totalData, totalData);
    showNotifTop(`✅ ${totalSuccess} data dipindahkan ke Followup Agen...`);
    
    await loadDbTransaksi();
    await loadAllData();
    renderFullFollowupKanban();
    renderFullProspekKanban();
    
    setTimeout(() => progress.hide(), 3000);
}

async function moveSelectedToFollowup() {
    let selectedIds = Array.from(selectedTransaksiIds.keys());
    
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang dipilih!', true);
        return;
    }
    
    let dataToMove = [];
    for (const id of selectedIds) {
        const item = transaksiData.find(t => t.id === id);
        if (item && item.status !== 'imported') {
            dataToMove.push({ id: item.id, ...item });
        }
    }
    
    if (dataToMove.length === 0) {
        showNotifTop('⚠️ Data yang dipilih sudah dipindahkan semua!', true);
        return;
    }
    
    await showPilihCsModal(dataToMove);
}

// ========== UPDATE ALL BADGES ==========
async function updateDeadlineBadge() {
    if (!currentUser) return;
    const badge = document.getElementById('deadlineCount');
    if (!badge) return;
    
    try {
        const today = getTodayDate();
        let customerQuery = supabase.from('customers').select('id', { count: 'exact', head: true }).lt('tanggal', today);
        let prospekQuery = supabase.from('prospek').select('id', { count: 'exact', head: true }).lt('deadline', today);
        
        if (currentUserRole !== 'owner') {
            customerQuery = customerQuery.eq('user_id', currentUser.id);
            prospekQuery = prospekQuery.eq('user_id', currentUser.id);
        }
        
        const { count: customerOverdue } = await customerQuery;
        const { count: prospekOverdue } = await prospekQuery;
        
        const deadlineCount = (customerOverdue || 0) + (prospekOverdue || 0);
        badge.innerText = deadlineCount;
        if (deadlineCount > 0) badge.classList.add('has-notif');
        else badge.classList.remove('has-notif');
    } catch (e) {
        console.error('Error update deadline badge:', e);
    }
}

async function updatePesanBadge() {
    if (!currentUser) return;
    const badge = document.getElementById('pesanCount');
    if (!badge) return;
    
    try {
        const { count, error } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('to_id', currentUser.id).eq('is_read', false);
        if (error) throw error;
        const pesanCount = count || 0;
        badge.innerText = pesanCount;
        if (pesanCount > 0) badge.classList.add('has-notif');
        else badge.classList.remove('has-notif');
    } catch (e) {
        console.error('Error update pesan badge:', e);
    }
}

async function updateAllBadges() {
    await updateDeadlineBadge();
    await updatePesanBadge();
}

// ========== LOAD ALL DATA ==========
async function loadAllData() {
    if (!currentUser) {
        console.log('⚠️ loadAllData: No currentUser');
        return;
    }
    
    if (isLoadingData) {
        console.log('⚠️ loadAllData: Already loading, skipping');
        return;
    }
    
    isLoadingData = true;
    console.log('🔄 loadAllData: Memuat semua data...');
    
    try {
        await Promise.all([
            loadCustomers(),
            loadProspek(),
            loadDatabaseAgent(),
            loadProduk()
        ]);
        
        updateDashboardStats();
        renderFullFollowupKanban();
        renderFullProspekKanban();
        await updateDeadlineBadge();
        await updatePesanBadge();
        
        console.log('✅ loadAllData: Selesai, customers:', customersData.length, 'prospek:', prospekData.length);
    } catch (err) {
        console.error('❌ loadAllData error:', err);
    } finally {
        isLoadingData = false;
    }
}

async function retryLoadData(maxRetries = 3, delayMs = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Loading data attempt ${i + 1}/${maxRetries}...`);
            await loadAllData();
            if (customersData.length > 0 || prospekData.length > 0) {
                console.log('✅ Data loaded successfully');
                return true;
            }
            console.log(`Data still empty, retrying... (${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        } catch (err) {
            console.error(`Load attempt ${i + 1} failed:`, err);
            if (i === maxRetries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return false;
}

// ========== UPDATE UI BASED ON ROLE ==========
function updateUIBasedOnRole() {
    console.log('🔄 updateUIBasedOnRole called, role:', currentUserRole);
    
    const topUserName = document.getElementById('topUserName');
    if (topUserName) topUserName.innerText = currentUserName;
    
    const profileName = document.getElementById('profileName');
    if (profileName) profileName.value = currentUserName;
    
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail) profileEmail.value = currentUser?.email || '';
    
    const menuDbAgent = document.getElementById('menuDbAgent');
    const menuDbTransaksi = document.getElementById('menuDbTransaksi');
    const menuImport = document.getElementById('menuImport');
    const ownerMenu = document.getElementById('ownerMenu');
    
    console.log('Menu elements found:', {
        menuDbAgent: !!menuDbAgent,
        menuDbTransaksi: !!menuDbTransaksi,
        menuImport: !!menuImport,
        ownerMenu: !!ownerMenu
    });
    
    if (currentUserRole === 'owner') {
        console.log('Setting UI for OWNER role');
        if (menuDbAgent) menuDbAgent.style.display = 'flex';
        if (menuDbTransaksi) menuDbTransaksi.style.display = 'flex';
        if (menuImport) menuImport.style.display = 'flex';
        if (ownerMenu) ownerMenu.style.display = 'block';
    } else {
        console.log('Setting UI for CS role');
        if (menuDbAgent) menuDbAgent.style.display = 'none';
        if (menuDbTransaksi) menuDbTransaksi.style.display = 'none';
        if (menuImport) menuImport.style.display = 'none';
        if (ownerMenu) ownerMenu.style.display = 'none';
    }
}

// ========== LOAD INITIAL DATA ==========
async function loadInitialData() {
    console.log('📦 Loading data...');
    await retryLoadData();
    console.log('✅ Initial data load complete');
    
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    const dashboardPage = document.getElementById('dashboardPage');
    if (dashboardPage) dashboardPage.style.display = 'block';
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    const dashboardMenu = document.querySelector('.menu-item[data-page="dashboard"]');
    if (dashboardMenu) dashboardMenu.classList.add('active');
}

// ========== AUTH STATE HANDLER ==========
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔐 AUTH EVENT:', event);
    
    const loginPage = document.getElementById('loginPage');
    const app = document.getElementById('app');
    
    if (event === 'SIGNED_IN' && session?.user) {
        currentUser = session.user;
        console.log('✅ User logged in:', currentUser.email);
        
        if (loginPage) loginPage.style.display = 'none';
        if (app) app.style.display = 'block';
        
        // Ambil data user
        const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', currentUser.id).maybeSingle();
        
        if (userData) {
            currentUserRole = userData.role || 'cs';
            currentUserName = userData.nama || currentUser.email?.split('@')[0];
        } else {
            currentUserRole = 'cs';
            currentUserName = currentUser.email?.split('@')[0];
        }
        
        console.log('🎯 Role:', currentUserRole);
        
        // SIMPAN KE LOCALSTORAGE
        saveUserRole(currentUserRole, currentUserName, currentUser.email);
        
        // APPLY UI
        applyUIBasedOnRole();
        
        // Load data
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                retryLoadData();
            });
        } else {
            await retryLoadData();
        }
        
    } else if (event === 'INITIAL_SESSION' && session?.user) {
        // INI YANG TERJADI SAAT REFRESH!
        console.log('🔄 INITIAL_SESSION - Refresh detected');
        
        currentUser = session.user;
        
        if (loginPage) loginPage.style.display = 'none';
        if (app) app.style.display = 'block';
        
        // COBA LOAD ROLE DARI STORAGE DULU
        if (loadUserRoleFromStorage()) {
            console.log('✅ Role loaded from storage, applying UI');
            applyUIBasedOnRole();
        }
        
        // Tetap ambil dari database untuk memastikan
        const { data: userData } = await supabase.from('users').select('role, nama').eq('id', currentUser.id).maybeSingle();
        if (userData) {
            currentUserRole = userData.role;
            currentUserName = userData.nama;
            saveUserRole(currentUserRole, currentUserName, currentUser.email);
            applyUIBasedOnRole();
            console.log('✅ Role refreshed from DB:', currentUserRole);
        }
        
        // Load data jika belum
        if (!isInitialLoadDone) {
            isInitialLoadDone = true;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    retryLoadData();
                });
            } else {
                await retryLoadData();
            }
        }
        
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        if (loginPage) loginPage.style.display = 'flex';
        if (app) app.style.display = 'none';
        currentUser = null;
        currentUserRole = null;
        isInitialLoadDone = false;
    }
});

// ========== INITIAL SESSION CHECK ==========
setTimeout(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Initial session check:', session ? 'Session exists' : 'No session');
    if (!session) {
        const loginPage = document.getElementById('loginPage');
        const app = document.getElementById('app');
        if (loginPage) loginPage.style.display = 'flex';
        if (app) app.style.display = 'none';
    }
}, 100);

// ========== DOMContentLoaded ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded and parsed');
    
    // FIRST THING: Cek localStorage untuk role
    if (loadUserRoleFromStorage() && currentUserRole === 'owner') {
        console.log('🎯 DOMContentLoaded: Found owner role in storage, applying UI');
        applyUIBasedOnRole();
    }
    
    initDarkMode();
    setupImportExcel();
    
    const allModals = [
        'detailModal', 'customerModal', 'prospekModal', 'prospekNegosiasiModal',
        'profileModal', 'previewPhotoModal', 'reminderModal', 'pesanModal',
        'convertModal', 'followupConfirmModal', 'pendingModal', 'addCsModal',
        'editDeadlineModal', 'infoModal', 'agentDetailModal', 'produkMasterModal',
        'manageTargetModal', 'tarifAdminModal', 'inputTransaksiModal',
        'transaksiListModal', 'pilihNomorModal', 'pilihCsTujuanModal'
    ];
    allModals.forEach(id => setupModalClickOutside(id));
    
    // Setup Agent Filters
    setupAgentFilters();
    
    // Setup Transaksi Filters
    setupTransaksiFilters();
    
    // Setup Import/Export
    setupAgentImport();
    setupProdukImport();
    setupTarifImport();
    
    // Export buttons
    document.getElementById('exportAgentExcelBtn')?.addEventListener('click', exportAgentToExcel);
    document.getElementById('exportProdukExcelBtn')?.addEventListener('click', exportProdukToExcel);
    document.getElementById('exportTarifExcelBtn')?.addEventListener('click', exportTarifToExcel);
    
    // Download example buttons
    document.getElementById('downloadAgentExampleBtn')?.addEventListener('click', downloadAgentExample);
    document.getElementById('downloadProdukExampleBtn')?.addEventListener('click', downloadProdukExample);
    document.getElementById('downloadTarifExampleBtn')?.addEventListener('click', downloadTarifExample);
    
    // Add Customer/Prospek buttons
    document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
        document.getElementById('customerDate').value = getTodayDate();
        document.getElementById('customerModal').style.display = 'flex';
    });
    
    document.getElementById('addProspekBtn')?.addEventListener('click', () => {
        document.getElementById('prospekDeadline').value = getTodayDate();
        document.getElementById('prospekModal').style.display = 'flex';
    });
    
    document.getElementById('addCustomerFullBtn')?.addEventListener('click', () => {
        document.getElementById('customerDate').value = getTodayDate();
        document.getElementById('customerModal').style.display = 'flex';
    });
    
    document.getElementById('addProspekFullBtn')?.addEventListener('click', () => {
        document.getElementById('prospekDeadline').value = getTodayDate();
        document.getElementById('prospekModal').style.display = 'flex';
    });
    
    // Save Customer/Prospek buttons
    document.getElementById('saveCustomerBtn')?.addEventListener('click', async () => {
        const agentId = document.getElementById('customerId').value.trim().toUpperCase();
        const nama = document.getElementById('customerName').value.trim();
        const hpRaw = document.getElementById('customerPhone').value.trim();
        const apk = document.getElementById('customerApk').value;
        const agentType = document.getElementById('customerType').value;
        const tanggal = document.getElementById('customerDate').value;
        const uplineName = document.getElementById('customerUplineName').value.trim();
        const uplinePhoneRaw = document.getElementById('customerUplinePhone').value.trim();
        
        if (!agentId || !nama || !hpRaw || !apk || !agentType || !tanggal) {
            showNotifTop('⚠️ Semua field wajib diisi!', true);
            return;
        }
        
        let hp = hpRaw.replace(/\D/g, '');
        if (hp.startsWith('0')) hp = hp.substring(1);
        hp = '+62' + hp;
        
        let uplinePhone = '';
        if (uplinePhoneRaw) {
            uplinePhone = uplinePhoneRaw.replace(/\D/g, '');
            if (uplinePhone.startsWith('0')) uplinePhone = uplinePhone.substring(1);
            uplinePhone = '+62' + uplinePhone;
        }
        
        const success = await addCustomer(agentId, nama, hp, apk, agentType, tanggal, uplineName, uplinePhone);
        if (success) {
            closeModal('customerModal');
            document.getElementById('customerId').value = '';
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('customerApk').value = '';
            document.getElementById('customerType').value = '';
            document.getElementById('customerUplineName').value = '';
            document.getElementById('customerUplinePhone').value = '';
        }
    });
    
    document.getElementById('saveProspekBtn')?.addEventListener('click', async () => {
        const agentType = document.getElementById('prospekType').value;
        const nama = document.getElementById('prospekName').value.trim();
        const hpRaw = document.getElementById('prospekPhone').value.trim();
        const status = document.getElementById('prospekStatusSelect').value;
        const deadline = document.getElementById('prospekDeadline').value;
        
        if (!agentType || !nama || !hpRaw || !deadline) {
            showNotifTop('⚠️ Semua field wajib diisi!', true);
            return;
        }
        
        let hp = hpRaw.replace(/\D/g, '');
        if (hp.startsWith('0')) hp = hp.substring(1);
        hp = '+62' + hp;
        
        const success = await addProspek(agentType, nama, hp, status, deadline);
        if (success) {
            closeModal('prospekModal');
            document.getElementById('prospekType').value = '';
            document.getElementById('prospekName').value = '';
            document.getElementById('prospekPhone').value = '';
            document.getElementById('prospekStatusSelect').value = 'Baru';
            document.getElementById('prospekDeadline').value = '';
        }
    });
    
    // Menu Navigation
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', async () => {
            const page = item.dataset.page;
            const pages = [
                'dashboardPage', 'importPage', 'dbClosingPage', 'dbTidakPage',
                'dbNomorSalahPage', 'dbCommitmentPage', 'dbAgentPage', 'produkPage',
                'reminderPage', 'pesanPage', 'broadcastPage', 'broadcastUplinePage',
                'followupFullPage', 'prospekFullPage', 'searchPage', 'manageUsersPage',
                'dbTransaksiPage'
            ];
            
            pages.forEach(p => {
                const el = document.getElementById(p);
                if (el) el.style.display = 'none';
            });
            
            if (page === 'dashboard') {
                document.getElementById('dashboardPage').style.display = 'block';
                await updateDashboardStats();
            } else if (page === 'import') {
                document.getElementById('importPage').style.display = 'block';
            } else if (page === 'dbClosing') {
                document.getElementById('dbClosingPage').style.display = 'block';
                await loadDBClosing();
            } else if (page === 'dbTidak') {
                document.getElementById('dbTidakPage').style.display = 'block';
                await loadDBTidak();
            } else if (page === 'dbNomorSalah') {
                document.getElementById('dbNomorSalahPage').style.display = 'block';
                await loadDBNomorSalah();
            } else if (page === 'dbCommitment') {
                document.getElementById('dbCommitmentPage').style.display = 'block';
                await loadDBCommitment();
            } else if (page === 'dbAgent') {
                document.getElementById('dbAgentPage').style.display = 'block';
                await loadDatabaseAgent();
            } else if (page === 'produk') {
                document.getElementById('produkPage').style.display = 'block';
                await loadProduk();
            } else if (page === 'reminder') {
                document.getElementById('reminderPage').style.display = 'block';
                await loadReminders();
            } else if (page === 'pesan') {
                document.getElementById('pesanPage').style.display = 'block';
                await loadPesan();
                await loadUsersForSelect();
            } else if (page === 'broadcast') {
                document.getElementById('broadcastPage').style.display = 'block';
                initBroadcast();
            } else if (page === 'broadcastUpline') {
                document.getElementById('broadcastUplinePage').style.display = 'block';
                initUplineBroadcast();
            } else if (page === 'followupFull') {
                document.getElementById('followupFullPage').style.display = 'block';
                renderFullFollowupKanban();
            } else if (page === 'prospekFull') {
                document.getElementById('prospekFullPage').style.display = 'block';
                renderFullProspekKanban();
            } else if (page === 'search') {
                document.getElementById('searchPage').style.display = 'block';
            } else if (page === 'manageUsers' && currentUserRole === 'owner') {
                document.getElementById('manageUsersPage').style.display = 'block';
                await loadUsersList();
            } else if (page === 'dbTransaksi') {
                const dbTransaksiPage = document.getElementById('dbTransaksiPage');
                if (dbTransaksiPage) {
                    dbTransaksiPage.style.display = 'block';
                    dbTransaksiPage.style.width = '100%';
                }
                await loadDbTransaksi();
            }
            
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar')?.classList.remove('active');
            }
            updateSidebarBodyClass();
        });
    });

    // LOGIN FORM HANDLER
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;
            const loginBtn = document.getElementById('loginBtn');
            
            if (!email || !password) {
                showNotifTop('⚠️ Email dan password harus diisi!', true);
                return;
            }
            
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.textContent = '⏳ Memproses...';
            }
            
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                
                showNotifTop('✅ Login berhasil!');
                
            } catch (err) {
                showNotifTop('❌ Login gagal: ' + err.message, true);
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = '🔓 Login';
                }
            }
        });
    }
    
    // TOGGLE PASSWORD VISIBILITY
    const togglePasswordBtn = document.getElementById('togglePassword');
    const loginPassword = document.getElementById('loginPassword');
    
    if (togglePasswordBtn && loginPassword) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPassword.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
            this.setAttribute('title', type === 'password' ? 'Tampilkan password' : 'Sembunyikan password');
        });
    }
    
    // Info Modal
    document.getElementById('infoBtn')?.addEventListener('click', () => showModal('infoModal'));
    document.getElementById('infoModalClose')?.addEventListener('click', () => closeModal('infoModal'));
    
    // Profile Modal
    document.getElementById('profileImg')?.addEventListener('click', () => showModal('profileModal'));
    
    // Camera Button
    document.getElementById('cameraIconBtn')?.addEventListener('click', () => {
        document.getElementById('profileFoto').click();
    });
    
    // Profile Photo Preview
    document.getElementById('profileFoto')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 1024 * 1024) {
                showNotifTop('Ukuran foto maksimal 1MB', true);
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('previewFoto').src = ev.target.result;
                document.getElementById('profileImg').src = ev.target.result;
                showNotifTop('Foto baru dipilih, klik Simpan untuk menyimpan');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Save Profile Button
    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
        const nama = document.getElementById('profileName').value;
        let hp = document.getElementById('profilePhone').value;
        const foto = document.getElementById('previewFoto').src;
        
        if (!nama) {
            showNotifTop('Nama wajib diisi', true);
            return;
        }
        
        if (hp) {
            hp = hp.replace(/\D/g, '');
            if (hp.startsWith('0')) hp = hp.substring(1);
            hp = '+62' + hp;
        } else {
            hp = '+62';
        }
        
        const saveBtn = document.getElementById('saveProfileBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Menyimpan...';
        
        try {
            let finalFoto = foto;
            const fileInput = document.getElementById('profileFoto');
            
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                if (file.size > 1024 * 1024) {
                    showNotifTop('Ukuran foto maksimal 1MB', true);
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 Simpan';
                    return;
                }
                
                const fileExt = file.name.split('.').pop();
                const fileName = `${currentUser.id}/profile_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('profiles').upload(fileName, file, { upsert: true });
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(fileName);
                    finalFoto = urlData.publicUrl;
                }
            }
            
            const { error: updateError } = await supabase.from('users').update({
                nama: nama,
                hp: hp,
                foto: finalFoto,
                updated_at: new Date().toISOString()
            }).eq('id', currentUser.id);
            
            if (updateError) throw updateError;
            
            document.getElementById('topUserName').innerText = nama;
            document.getElementById('profileImg').src = finalFoto;
            document.getElementById('previewFoto').src = finalFoto;
            currentUserName = nama;
            
            if (fileInput) fileInput.value = '';
            closeModal('profileModal');
            showNotifTop('✅ Profile tersimpan');
        } catch (e) {
            showNotifTop('❌ Gagal menyimpan profile: ' + e.message, true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Simpan';
        }
    });
    
    // Search Buttons
    document.getElementById('searchBtn')?.addEventListener('click', performSearch);
    document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Toggle Sidebar
    document.getElementById('toggleSidebarBtn')?.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('active');
        updateSidebarBodyClass();
    });
    
    // Close Modal Buttons
    document.querySelectorAll('.closeModalBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            if (modalId) closeModal(modalId);
        });
    });
    
    // Reminder Modal
    document.getElementById('addReminderBtn')?.addEventListener('click', () => {
        document.getElementById('reminderTitle').value = '';
        document.getElementById('reminderDesc').value = '';
        document.getElementById('reminderDateTime').value = '';
        document.getElementById('reminderModal').style.display = 'flex';
    });
    
    document.getElementById('saveReminderBtn')?.addEventListener('click', async () => {
        const title = document.getElementById('reminderTitle').value;
        const description = document.getElementById('reminderDesc').value;
        const datetime = document.getElementById('reminderDateTime').value;
        
        if (!title) {
            showNotifTop('⚠️ Judul pengingat wajib diisi!', true);
            return;
        }
        
        await addReminder(title, description, datetime);
        closeModal('reminderModal');
    });
    
    // Pesan Modal
    document.getElementById('addPesanBtn')?.addEventListener('click', async () => {
        await loadUsersForSelect();
        document.getElementById('pesanModal').style.display = 'flex';
    });
    
    document.getElementById('savePesanBtn')?.addEventListener('click', async () => {
        const toId = document.getElementById('pesanTo').value;
        const message = document.getElementById('pesanMessage').value;
        
        if (!toId || !message) {
            showNotifTop('⚠️ Pilih tujuan dan isi pesan!', true);
            return;
        }
        
        await sendMessage(toId, message);
        closeModal('pesanModal');
        document.getElementById('pesanTo').value = '';
        document.getElementById('pesanMessage').value = '';
    });
    
    // Add CS Modal
    document.getElementById('addCsBtn')?.addEventListener('click', () => {
        document.getElementById('addCsModal').style.display = 'flex';
    });
    
    document.getElementById('saveCsBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('csEmail').value;
        const password = document.getElementById('csPassword').value;
        const nama = document.getElementById('csName').value;
        let hp = document.getElementById('csPhone').value;
        
        if (!email || !password || !nama) {
            showNotifTop('⚠️ Email, Password, dan Nama wajib diisi!', true);
            return;
        }
        
        if (hp) {
            hp = hp.replace(/\D/g, '');
            if (hp.startsWith('0')) hp = hp.substring(1);
            hp = '+62' + hp;
        }
        
        try {
            await createUser(email, password, { nama, hp, role: 'cs' });
            showNotifTop('✅ CS Agent berhasil ditambahkan');
            closeModal('addCsModal');
            document.getElementById('csEmail').value = '';
            document.getElementById('csPassword').value = '';
            document.getElementById('csName').value = '';
            document.getElementById('csPhone').value = '';
            await loadUsersList();
        } catch (e) {
            showNotifTop('❌ Gagal menambah CS: ' + e.message, true);
        }
    });
    
    // Edit Deadline Modal
    document.getElementById('saveDeadlineBtn')?.addEventListener('click', async () => {
        const newDeadline = document.getElementById('editDeadlineDate').value;
        if (!newDeadline) {
            showNotifTop('⚠️ Tanggal deadline harus diisi!', true);
            return;
        }
        
        try {
            if (currentEditType === 'customer') {
                await supabase.from('customers').update({ tanggal: newDeadline }).eq('id', currentEditItem);
                showNotifTop('✅ Deadline customer berhasil diubah menjadi ' + newDeadline);
            } else if (currentEditType === 'prospek') {
                await supabase.from('prospek').update({ deadline: newDeadline }).eq('id', currentEditItem);
                showNotifTop('✅ Deadline prospek berhasil diubah menjadi ' + newDeadline);
            }
            closeModal('editDeadlineModal');
            await loadAllData();
        } catch (e) {
            showNotifTop('❌ Gagal: ' + e.message, true);
        }
    });
    
    document.getElementById('cancelDeadlineBtn')?.addEventListener('click', () => closeModal('editDeadlineModal'));
    
    // Deadline Notification
    document.getElementById('deadlineNotifBtn')?.addEventListener('click', async () => {
        const today = getTodayDate();
        let custQuery = supabase.from('customers').select('nama,tanggal').lt('tanggal', today);
        let prosQuery = supabase.from('prospek').select('nama,deadline').lt('deadline', today);
        
        if (currentUserRole !== 'owner') {
            custQuery = custQuery.eq('user_id', currentUser.id);
            prosQuery = prosQuery.eq('user_id', currentUser.id);
        }
        
        const { data: custOverdue } = await custQuery;
        const { data: prosOverdue } = await prosQuery;
        
        const total = (custOverdue?.length || 0) + (prosOverdue?.length || 0);
        if (total > 0) {
            let msg = `📅 DEADLINE TERLEWAT (${total}):\n`;
            custOverdue?.forEach(c => msg += `\n• ${c.nama} (Customer) - ${c.tanggal}`);
            prosOverdue?.forEach(p => msg += `\n• ${p.nama} (Prospek) - ${p.deadline}`);
            alert(msg);
        } else {
            showNotifTop('✅ Semua deadline terpenuhi!');
        }
    });
    
    document.getElementById('pesanNotifBtn')?.addEventListener('click', () => {
        const pesanMenu = document.querySelector('.menu-item[data-page="pesan"]');
        if (pesanMenu) pesanMenu.click();
    });
    
    // Product Jenis Toggle
    document.getElementById('produkMasterJenis')?.addEventListener('change', function() {
        toggleProdukJenisFields(this.value);
    });
    
    // Save Produk Master
    document.getElementById('saveProdukMasterBtn')?.addEventListener('click', async () => {
        const nama = document.getElementById('produkMasterNama').value;
        const hpp = document.getElementById('produkMasterHpp').value;
        const keterangan = document.getElementById('produkMasterKeterangan').value;
        const jenisProduk = document.getElementById('produkMasterJenis').value;
        let hargaJual = 0, adminDefault = 0, cidBased = 'no';
        
        if (jenisProduk === 'tanpa_admin') {
            hargaJual = document.getElementById('produkMasterHargaJual').value;
        } else {
            adminDefault = document.getElementById('produkMasterAdminDefault').value;
            cidBased = document.getElementById('produkMasterCidBased').value;
        }
        
        await saveProduk(nama, hpp, hargaJual, keterangan, adminDefault, jenisProduk, cidBased, currentEditProdukId);
        closeModal('produkMasterModal');
        currentEditProdukId = null;
    });
    
    document.getElementById('cancelProdukMasterBtn')?.addEventListener('click', () => {
        closeModal('produkMasterModal');
        currentEditProdukId = null;
        document.getElementById('produkMasterNama').value = '';
        document.getElementById('produkMasterHpp').value = '';
        document.getElementById('produkMasterKeterangan').value = '';
        document.getElementById('produkMasterJenis').value = 'tanpa_admin';
        document.getElementById('produkMasterHargaJual').value = '';
        document.getElementById('produkMasterAdminDefault').value = '';
        document.getElementById('produkMasterCidBased').value = 'no';
        toggleProdukJenisFields('tanpa_admin');
    });
    
    // Add Produk Button
    document.getElementById('addProdukBtn')?.addEventListener('click', () => {
        currentEditProdukId = null;
        document.getElementById('produkMasterNama').value = '';
        document.getElementById('produkMasterHpp').value = '';
        document.getElementById('produkMasterHargaJual').value = '';
        document.getElementById('produkMasterKeterangan').value = '';
        document.getElementById('produkMasterJenis').value = 'tanpa_admin';
        document.getElementById('produkMasterAdminDefault').value = '';
        document.getElementById('produkMasterCidBased').value = 'no';
        document.getElementById('produkMasterTitle').innerText = '🏷️ Tambah Produk';
        toggleProdukJenisFields('tanpa_admin');
        document.getElementById('produkMasterModal').style.display = 'flex';
    });
    
    // Manage Tarif Admin
    document.getElementById('manageTarifAdminBtn')?.addEventListener('click', async () => {
        await loadTarifAdmin();
        document.getElementById('tarifAdminModal').style.display = 'flex';
    });
    
    document.getElementById('closeTarifAdminModal')?.addEventListener('click', () => {
        closeModal('tarifAdminModal');
    });
    
    document.getElementById('saveTarifAdminBtn')?.addEventListener('click', async () => {
        const cid = document.getElementById('tarifCid').value;
        const pospaid = document.getElementById('tarifPospaid').value;
        const prepaid = document.getElementById('tarifPrepaid').value;
        const nontaglis = document.getElementById('tarifNontaglis').value;
        await saveTarifAdmin(cid, pospaid, prepaid, nontaglis, currentEditTarifId);
        clearTarifForm();
    });
    
    document.getElementById('clearTarifFormBtn')?.addEventListener('click', clearTarifForm);
    
    // Agent Detail
    document.getElementById('saveAgentDetailBtn')?.addEventListener('click', saveAgentDetail);
    document.getElementById('closeAgentDetailBtn')?.addEventListener('click', () => closeModal('agentDetailModal'));
    document.getElementById('refreshProdukBtn')?.addEventListener('click', async () => {
        await loadProduk();
        if (currentAgentIdForProduct) {
            await renderAgentProducts();
        }
        showNotifTop('🔄 Daftar produk direfresh');
    });
    
    // Select All Agent
    document.getElementById('selectAllAgent')?.addEventListener('click', () => {
        if (!agentsFilteredData || agentsFilteredData.length === 0) {
            showNotifTop('⚠️ Tidak ada data yang ditampilkan', true);
            return;
        }
        const allChecked = agentsFilteredData.every(item => selectedAgentIds.get(item.id) === true);
        agentsFilteredData.forEach(item => {
            if (allChecked) selectedAgentIds.delete(item.id);
            else selectedAgentIds.set(item.id, true);
        });
        renderAgentList(agentsData);
        updateSelectAllAgentButton();
    });
    
    // Delete Selected Agent
    document.getElementById('deleteSelectedAgent')?.addEventListener('click', deleteSelectedAgentSafe);
    
    // Delete All Agent
    document.getElementById('deleteAllAgent')?.addEventListener('click', deleteAllAgent);
    
    // Select All Produk
    document.getElementById('selectAllProduk')?.addEventListener('click', () => {
        const searchKeyword = document.getElementById('searchProdukInput')?.value.toLowerCase() || '';
        let filtered = produkData;
        if (searchKeyword) {
            filtered = produkData.filter(p =>
                p.nama.toLowerCase().includes(searchKeyword) ||
                (p.jenis_produk === 'beradmin' ? 'beradmin' : 'tanpa_admin').includes(searchKeyword)
            );
        }
        if (filtered.length === 0) {
            showNotifTop('⚠️ Tidak ada produk yang ditampilkan', true);
            return;
        }
        const allChecked = filtered.every(item => selectedProdukIds.get(item.id) === true);
        filtered.forEach(item => {
            if (allChecked) selectedProdukIds.delete(item.id);
            else selectedProdukIds.set(item.id, true);
        });
        renderProdukList();
    });
    
    // Delete Selected Produk
    document.getElementById('deleteSelectedProduk')?.addEventListener('click', deleteSelectedProduk);
    
    // Delete All Produk
    document.getElementById('deleteAllProduk')?.addEventListener('click', deleteAllProduk);
    
    // Load All Agent Button
    document.getElementById('loadAllAgentBtn')?.addEventListener('click', async () => {
        showNotifTop('⏳ Memuat semua data agent...');
        await loadDatabaseAgent();
        showNotifTop(`✅ ${agentsData.length} data agent dimuat`);
    });
    
    // Search Inputs
    document.getElementById('searchProdukInput')?.addEventListener('input', () => renderProdukList());
    document.getElementById('searchTarifInput')?.addEventListener('input', () => renderTarifAdminList());
    
    // Transaction Modal
    const targetTransaksiCard = document.getElementById('targetTransaksiCard');
    if (targetTransaksiCard) {
        targetTransaksiCard.style.cursor = 'pointer';
        targetTransaksiCard.addEventListener('click', showInputTransaksiModal);
    }
    
    document.getElementById('viewTransaksiHistoryBtn')?.addEventListener('click', showTransaksiListModal);
    
    document.getElementById('saveTransaksiBtn')?.addEventListener('click', async () => {
        const nominal = document.getElementById('transaksiNominal').value;
        const keterangan = document.getElementById('transaksiKeterangan').value;
        const tanggal = document.getElementById('transaksiTanggal').value;
        
        if (!nominal || parseInt(nominal) <= 0) {
            showNotifTop('⚠️ Masukkan jumlah transaksi yang valid!', true);
            return;
        }
        
        await saveTransaksiGlobal(nominal, keterangan, tanggal, currentTransaksiId);
        closeModal('inputTransaksiModal');
        document.getElementById('transaksiNominal').value = '';
        document.getElementById('transaksiKeterangan').value = '';
        document.getElementById('transaksiTanggal').value = new Date().toISOString().split('T')[0];
        currentTransaksiId = null;
    });
    
    document.getElementById('cancelTransaksiBtn')?.addEventListener('click', () => {
        closeModal('inputTransaksiModal');
        currentTransaksiId = null;
    });
    
    // Target KPI Modal
    document.getElementById('manageTargetBtn')?.addEventListener('click', () => {
        if (currentUserRole !== 'owner') return;
        document.getElementById('targetAgentInput').value = targetData.agent || 0;
        document.getElementById('targetKoorInput').value = targetData.koordinator || 0;
        document.getElementById('targetCAInput').value = targetData.ca || 0;
        document.getElementById('targetTransaksiInput').value = targetData.transaksi || 0;
        renderMonthlyTargetList();
        document.getElementById('manageTargetModal').style.display = 'flex';
    });
    
    document.getElementById('saveTargetBtn')?.addEventListener('click', saveTargetData);
    document.getElementById('cancelTargetBtn')?.addEventListener('click', () => closeModal('manageTargetModal'));
    
    document.getElementById('addMonthlyTargetBtn')?.addEventListener('click', () => {
        if (!targetData.monthlyTargets) targetData.monthlyTargets = [];
        const now = new Date();
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        targetData.monthlyTargets.push({
            month: defaultMonth,
            target_agent: 0,
            target_ca: 0,
            target_koor: 0
        });
        renderMonthlyTargetList();
    });
    
    // DB Transaksi Buttons
    document.getElementById('selectAllTransaksi')?.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#dbTransaksiList .db-item-checkbox-transaksi');
        if (checkboxes.length === 0) return;
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
            const event = new Event('change', { bubbles: true });
            cb.dispatchEvent(event);
        });
    });
    
    document.getElementById('deleteSelectedTransaksi')?.addEventListener('click', deleteSelectedTransaksi);
    document.getElementById('moveSelectedToFollowupBtn')?.addEventListener('click', moveSelectedToFollowup);
    document.getElementById('deleteAllTransaksiBtn')?.addEventListener('click', deleteAllTransaksi);
    
    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!confirm('Yakin ingin keluar?')) return;
            try {
                await supabase.auth.signOut();
                showNotifTop('✅ Berhasil keluar');
                setTimeout(() => window.location.reload(), 500);
            } catch (err) {
                showNotifTop('❌ Gagal logout: ' + err.message, true);
            }
        });
    }
    
    // Format Phone Inputs
    const phoneFields = ['customerPhone', 'prospekPhone', 'profilePhone', 'customerUplinePhone'];
    phoneFields.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() { formatPhone(this); });
        }
    });
    
    // Format Name Inputs
    const nameFields = ['customerName', 'prospekName', 'profileName', 'customerUplineName'];
    nameFields.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() { formatNama(this); });
        }
    });
    
    // Agent ID Formatting
    const agentIdInput = document.getElementById('customerId');
    if (agentIdInput) {
        agentIdInput.addEventListener('input', function() {
            let value = this.value.toUpperCase();
            value = value.replace(/[^A-Z0-9-]/g, '');
            if (value.length > 16) value = value.slice(0, 16);
            this.value = value;
        });
    }
    
    // Preview Photo Click
    const previewFoto = document.getElementById('previewFoto');
    if (previewFoto) {
        previewFoto.addEventListener('click', () => {
            const modal = document.getElementById('previewPhotoModal');
            const largeImg = document.getElementById('previewPhotoLarge');
            if (modal && largeImg) {
                largeImg.src = previewFoto.src;
                modal.style.display = 'flex';
            }
        });
    }
    
    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (document.body.classList.contains('dark-mode')) {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'disabled');
                showNotifTop('🌞 Mode Terang diaktifkan');
            } else {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'enabled');
                showNotifTop('🌙 Mode Gelap diaktifkan');
            }
        });
    }
    
    console.log('✅ DOMContentLoaded completed');

    // ========== DOUBLE CHECK ROLE AFTER DOM READY ==========
    if (currentUser && currentUserRole) {
        console.log('🔄 DOMContentLoaded: Double-check role:', currentUserRole);
        
        const menuDbAgent = document.getElementById('menuDbAgent');
        const menuDbTransaksi = document.getElementById('menuDbTransaksi');
        const menuImport = document.getElementById('menuImport');
        const ownerMenu = document.getElementById('ownerMenu');
        
        if (currentUserRole === 'owner') {
            if (menuDbAgent) menuDbAgent.style.display = 'flex';
            if (menuDbTransaksi) menuDbTransaksi.style.display = 'flex';
            if (menuImport) menuImport.style.display = 'flex';
            if (ownerMenu) ownerMenu.style.display = 'block';
        } else {
            if (menuDbAgent) menuDbAgent.style.display = 'none';
            if (menuDbTransaksi) menuDbTransaksi.style.display = 'none';
            if (menuImport) menuImport.style.display = 'none';
            if (ownerMenu) ownerMenu.style.display = 'none';
        }
    } else if (currentUser && !currentUserRole) {
        console.log('⚠️ DOMContentLoaded: User exists but role not set, fetching...');
        // Ambil ulang role jika belum ada
        const { data: userData } = await supabase.from('users').select('role, nama').eq('id', currentUser.id).maybeSingle();
        if (userData) {
            currentUserRole = userData.role || 'cs';
            currentUserName = userData.nama || currentUserName;
            // Ulangi update UI
            const menuDbAgent = document.getElementById('menuDbAgent');
            const menuDbTransaksi = document.getElementById('menuDbTransaksi');
            const menuImport = document.getElementById('menuImport');
            const ownerMenu = document.getElementById('ownerMenu');
            
            if (currentUserRole === 'owner') {
                if (menuDbAgent) menuDbAgent.style.display = 'flex';
                if (menuDbTransaksi) menuDbTransaksi.style.display = 'flex';
                if (menuImport) menuImport.style.display = 'flex';
                if (ownerMenu) ownerMenu.style.display = 'block';
            }
        }
    }
});

// ========== DARK MODE ==========
function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// ========== STYLE ==========
const style = document.createElement('style');
style.textContent = `@keyframes slideOutRight{from{transform:translateX(0);opacity:1;}to{transform:translateX(100%);opacity:0;}}`;
document.head.appendChild(style);

console.log('✅ Script loaded successfully');
