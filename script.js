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
let transaksiGlobalList = [];
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

// Upline Broadcast variables
let uplineDataList = [];
let uplineNumbers = [];
let isUplineBroadcasting = false;

// Current edit variables
let currentEditItem = null;
let currentEditType = null;
let currentPendingId = null;
let currentProspekId = null;
let currentEditTarifId = null;
let currentEditProdukId = null;
let currentAgentIdForProduct = null;
let currentAgentProducts = [];
let currentTransaksiId = null;

// Progress
let activeProgress = null;
let sidebarTimeout = null;
let pendingItems = [];

// ========== HELPER FUNCTIONS ==========
function showNotif(msg, isError = false) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.className = `notif-toast ${isError ? 'notif-error' : ''}`;
    document.getElementById('notifBox').appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function showNotifTop(msg, isError = false) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.className = `notif-toast ${isError ? 'notif-error' : ''}`;
    notif.style.cssText = 'z-index: 9999999999; position: fixed; top: 20px; right: 20px; max-width: 350px; background: ' + (isError ? '#ef4444' : '#4f46e5') + '; color: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-size: 14px;';
    document.getElementById('notifBox').appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
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

function addMonthsToDate(dateStr, months) {
    if (!dateStr) return getTodayDate();
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    date.setDate(1);
    return date.toISOString().split('T')[0];
}

function getFirstDayNextMonth() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '999999999';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.backdropFilter = 'blur(5px)';
        modal.style.pointerEvents = 'auto';
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.zIndex = '999999999';
            modalContent.style.position = 'relative';
            modalContent.style.pointerEvents = 'auto';
        }
        
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

// ========== VALIDATION FUNCTIONS ==========
function validateAgentId(agentId) {
    const regex = /^[A-Z0-9-]+$/;
    if (!agentId) return false;
    if (!regex.test(agentId)) return false;
    if (agentId.length > 17) return false;
    return true;
}

function validateNama(nama) {
    const regex = /^[A-Za-z\s]+$/;
    if (!nama) return false;
    if (nama.length < 2) return false;
    if (nama.length > 25) return false;
    if (!regex.test(nama)) return false;
    return true;
}

function validatePhone(hp) {
    if (!hp) return false;
    const cleanHp = hp.replace(/[^\d]/g, '');
    if (!cleanHp.startsWith('8')) return false;
    if (cleanHp.length < 9) return false;
    if (cleanHp.length > 12) return false;
    return true;
}

function formatNamaToCapital(input) {
    if (!input) return '';
    return input.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function formatAgentIdToUpper(input) {
    if (!input) return '';
    return input.toUpperCase();
}

// ========== FLOATING PROGRESS ==========
function showFloatingProgress(title, total = 0) {
    if (activeProgress) {
        activeProgress.remove();
        activeProgress = null;
    }

    const container = document.createElement('div');
    container.className = 'floating-progress';
    container.innerHTML = `
        <button class="progress-close" id="progressCloseBtn">✕</button>
        <div class="progress-status">
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

function createModalWithHighZIndex(htmlContent, onClose = null) {
    const existingModal = document.querySelector('.dynamic-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal dynamic-modal';
    modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.7) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 999999999 !important;
        backdrop-filter: blur(5px) !important;
        pointer-events: auto !important;
    `;
    modal.innerHTML = htmlContent;
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.zIndex = '999999999';
        modalContent.style.position = 'relative';
        modalContent.style.pointerEvents = 'auto';
    }
    
    const buttons = modal.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
    });
    
    if (onClose) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) onClose();
        });
    }
    
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'auto';
    
    return modal;
}

function closeDynamicModal(modal) {
    if (modal) modal.remove();
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    document.body.style.pointerEvents = '';
}

// ========== DARK MODE FUNCTIONS ==========
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (!darkModeToggle) return;
    
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeToggle.classList.add('active');
    }
    
    darkModeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.toggle('dark-mode');
        this.classList.toggle('active');
        
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
            showNotifTop('🌙 Mode Gelap diaktifkan');
        } else {
            localStorage.setItem('darkMode', 'disabled');
            showNotifTop('☀️ Mode Terang diaktifkan');
        }
    });
}

// ========== SIDEBAR HOVER FUNCTIONS ==========
function initSidebarHover() {
    const hoverZone = document.getElementById('hoverZone');
    const sidebar = document.getElementById('sidebar');
    
    if (!hoverZone || !sidebar) return;
    
    hoverZone.addEventListener('mouseenter', function() {
        if (window.innerWidth > 768) {
            clearTimeout(sidebarTimeout);
            sidebar.classList.add('active');
            updateSidebarBodyClass();
        }
    });
    
    sidebar.addEventListener('mouseleave', function() {
        if (window.innerWidth > 768) {
            sidebarTimeout = setTimeout(() => {
                sidebar.classList.remove('active');
                updateSidebarBodyClass();
            }, 300);
        }
    });
    
    sidebar.addEventListener('mouseenter', function() {
        clearTimeout(sidebarTimeout);
    });
    
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            updateSidebarBodyClass();
        });
    }
    
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && sidebar && toggleBtn && 
            !sidebar.contains(e.target) && e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
            updateSidebarBodyClass();
        }
    });
}

// ========== PROFILE PHOTO FUNCTIONS ==========
function initProfilePhoto() {
    const profileImg = document.getElementById('profileImg');
    const previewFoto = document.getElementById('previewFoto');
    const cameraIconBtn = document.getElementById('cameraIconBtn');
    const profileFotoInput = document.getElementById('profileFoto');
    
    if (!profileImg) return;
    
    profileImg.addEventListener('click', () => {
        loadProfileData();
        showModal('profileModal');
    });
    
    if (cameraIconBtn) {
        cameraIconBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (profileFotoInput) profileFotoInput.click();
        });
    }
    
    if (previewFoto) {
        previewFoto.addEventListener('click', (e) => {
            e.stopPropagation();
            showPhotoPreview(previewFoto.src);
        });
    }
    
    if (profileFotoInput) {
        profileFotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                if (file.size > 2 * 1024 * 1024) {
                    showNotifTop('⚠️ Ukuran foto maksimal 2MB!', true);
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageUrl = e.target.result;
                    if (previewFoto) previewFoto.src = imageUrl;
                    if (profileImg) profileImg.src = imageUrl;
                    showNotifTop('📷 Foto baru dipilih. Klik Simpan untuk menyimpan perubahan.');
                };
                reader.readAsDataURL(file);
            } else {
                showNotifTop('⚠️ Silakan pilih file gambar!', true);
            }
        });
    }
}

function loadProfileData() {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const previewFoto = document.getElementById('previewFoto');
    const profileImg = document.getElementById('profileImg');
    
    if (profileName) profileName.value = currentUserName || '';
    if (profileEmail && currentUser) profileEmail.value = currentUser.email || '';
    if (previewFoto && profileImg) previewFoto.src = profileImg.src;
    
    if (profilePhone && currentUser) {
        window.db.from('users').select('hp').eq('id', currentUser.id).single().then(({ data }) => {
            if (data && data.hp) {
                profilePhone.value = data.hp.replace('+62', '');
            }
        });
    }
}

function showPhotoPreview(imageUrl) {
    const previewModal = document.getElementById('previewPhotoModal');
    const previewImage = document.getElementById('previewPhotoLarge');
    if (!previewModal) return;
    if (previewImage) previewImage.src = imageUrl;
    showModal('previewPhotoModal');
}

async function saveUserProfile() {
    const nama = document.getElementById('profileName')?.value;
    let hp = document.getElementById('profilePhone')?.value;
    const foto = document.getElementById('previewFoto')?.src;
    const profileImg = document.getElementById('profileImg');
    
    if (!nama) {
        showNotifTop('⚠️ Nama wajib diisi!', true);
        return false;
    }
    
    if (hp) {
        hp = hp.replace(/[^\d]/g, '');
        if (hp.startsWith('0')) hp = hp.substring(1);
        if (hp && !hp.startsWith('62')) hp = '62' + hp;
        hp = '+' + hp;
    }
    
    try {
        const { data: existingUser } = await window.db
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        const { error } = await window.db
            .from('users')
            .upsert({
                id: currentUser.id,
                nama: nama,
                hp: hp || null,
                foto: foto || 'https://i.pravatar.cc/40',
                email: currentUser.email,
                role: existingUser?.role || 'cs',
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        currentUserName = nama;
        document.getElementById('topUserName').innerText = nama;
        if (profileImg) profileImg.src = foto || 'https://i.pravatar.cc/40';
        
        showNotifTop('✅ Profile berhasil disimpan!');
        closeModal('profileModal');
        return true;
    } catch (error) {
        console.error('Save profile error:', error);
        showNotifTop('❌ Gagal menyimpan profile: ' + error.message, true);
        return false;
    }
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
        if (cleanNomor.startsWith('62')) cleanNomor = '+' + cleanNomor;
        else cleanNomor = '+62' + cleanNomor;
    }
    window.open('https://wa.me/' + encodeURIComponent(cleanNomor), '_blank');
}

function openWAById(customerId) {
    const customer = customersData.find(c => c.id === customerId);
    if (customer && customer.hp) openWA(customer.hp);
    const prospek = prospekData.find(p => p.id === customerId);
    if (prospek && prospek.hp) openWA(prospek.hp);
}

// ========== EDIT DEADLINE FUNCTIONS ==========
function openEditDeadlineModal(id, type, currentDeadline) {
    currentEditItem = id;
    currentEditType = type;
    
    const modal = createModalWithHighZIndex(`
        <div class="modal-content" style="max-width: 400px;">
            <h3>📅 Edit Deadline</h3>
            <div class="modal-subtitle">Ubah tanggal deadline untuk data ini</div>
            <div style="padding: 20px;">
                <label for="editDeadlineDateInput">Tanggal Deadline Baru <span class="required">*</span></label>
                <input type="date" id="editDeadlineDateInput" style="width:100%; padding: 12px; border-radius: 14px; border: 1.5px solid #e5e7eb; margin-top: 8px;">
            </div>
            <div class="warning-box" style="margin: 0 20px 10px 20px;">
                ⚠️ <strong>Peringatan:</strong> Perubahan deadline harus diketahui oleh Owner/Atasan.
            </div>
            <div class="modal-buttons">
                <button id="saveDeadlineBtnModal" class="btn-primary">💾 Simpan Perubahan</button>
                <button id="cancelDeadlineBtnModal" class="btn-outline">❌ Batal</button>
            </div>
        </div>
    `, () => closeDynamicModal(modal));
    
    document.getElementById('editDeadlineDateInput').value = currentDeadline || getTodayDate();
    
    document.getElementById('saveDeadlineBtnModal').onclick = async () => {
        const newDeadline = document.getElementById('editDeadlineDateInput').value;
        if (!newDeadline) {
            showNotifTop('⚠️ Tanggal deadline harus diisi!', true);
            return;
        }
        
        try {
            if (currentEditType === 'customer') {
                await window.db.from('customers').update({ tanggal: newDeadline }).eq('id', currentEditItem);
                showNotifTop(`✅ Deadline customer berhasil diubah menjadi ${newDeadline}`);
                await loadCustomers();
            } else if (currentEditType === 'prospek') {
                await window.db.from('prospek').update({ deadline: newDeadline }).eq('id', currentEditItem);
                showNotifTop(`✅ Deadline prospek berhasil diubah menjadi ${newDeadline}`);
                await loadProspek();
            }
            closeDynamicModal(modal);
        } catch (e) {
            showNotifTop('❌ Gagal: ' + e.message, true);
        }
    };
    
    document.getElementById('cancelDeadlineBtnModal').onclick = () => closeDynamicModal(modal);
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
    updateTargetDisplay();
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
    updateTargetDisplay();
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
    updateTargetDisplay();
}

async function loadDBClosing() {
    if (!currentUser) return;
    
    let query = window.db.from('db_closing').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('closing_date', { ascending: false });
    if (error) {
        console.error('Error loading closing:', error);
        return;
    }
    
    renderDBClosing(data || []);
}

async function loadDBTidak() {
    if (!currentUser) return;
    
    let query = window.db.from('db_tidak_tertarik').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading tidak tertarik:', error);
        return;
    }
    
    renderDBTidak(data || []);
}

async function loadDBNomorSalah() {
    if (!currentUser) return;
    
    let query = window.db.from('nomor_salah').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading nomor salah:', error);
        return;
    }
    
    renderDBNomorSalah(data || []);
}

async function loadDBCommitment() {
    if (!currentUser) return;
    
    let query = window.db.from('db_commitment').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading commitment:', error);
        return;
    }
    
    renderDBCommitment(data || []);
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
    
    const csMultiContainer = document.getElementById('csMultiSelect');
    if (csMultiContainer) {
        csMultiContainer.innerHTML = (data || []).map(cs => `
            <label style="display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; cursor: pointer; border-bottom: 1px solid #e5e7eb;">
                <input type="checkbox" value="${cs.id}" class="cs-checkbox" style="width: 18px; height: 18px;">
                <span>👤 ${escapeHtml(cs.nama || cs.email)}</span>
            </label>
        `).join('');
    }
    
    const csSelect = document.getElementById('csTujuanSelect');
    if (csSelect) {
        csSelect.innerHTML = '<option value="">Pilih CS Agent</option>' + 
            (data || []).map(cs => `<option value="${cs.id}">${escapeHtml(cs.nama || cs.email)}</option>`).join('');
    }
}

async function loadTarifAdmin() {
    if (!currentUser) return;
    
    let query = window.db.from('tarif_admin').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query;
    if (error) {
        console.error('Error loading tarif admin:', error);
        return;
    }
    
    tarifAdminData = data || [];
    renderTarifAdminList();
}

async function loadTransaksiGlobal() {
    const { data, error } = await window.db.from('transaksi_global').select('*').order('tanggal', { ascending: false });
    if (error) return;
    
    transaksiGlobalList = data || [];
    renderTransaksiListGlobal();
    
    let totalBulanIni = 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    (data || []).forEach(item => {
        const tglTransaksi = new Date(item.tanggal);
        if (tglTransaksi >= startOfMonth) {
            totalBulanIni += item.nominal || 0;
        }
    });
    
    window.totalTransaksiGlobal = totalBulanIni;
    updateTargetDisplay();
}

// ========== RENDER FUNCTIONS - FOLLOWUP KANBAN ==========
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
    
    lists.baru.sort((a,b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    lists.followup.sort((a,b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    lists.pending.sort((a,b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    lists.closing.sort((a,b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    
    document.getElementById('countBaru').innerText = lists.baru.length;
    document.getElementById('countFollowup').innerText = lists.followup.length;
    document.getElementById('countPending').innerText = lists.pending.length;
    document.getElementById('countClosing').innerText = lists.closing.length;
    
    const renderColumn = (containerId, items, columnType) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(item => {
            const isOverdue = item.tanggal && item.tanggal < today;
            const isToday = item.tanggal === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            
            let actionButton = '';
            if (item.status === 'baru') {
                actionButton = `<button class="action-btn followup-btn" onclick="event.stopPropagation(); updateCustomerStatus('${item.id}', 'followup')" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #4f46e5; color: white;">📞 Lanjut Follow Up</button>`;
            } else if (item.status === 'followup') {
                const canProceed = item.followup_data && item.followup_data.terkirim && item.followup_data.dibalas;
                const disabledAttr = !canProceed ? 'disabled' : '';
                const titleAttr = !canProceed ? 'title="Harap lengkapi data follow up terlebih dahulu"' : '';
                actionButton = `<button class="action-btn confirm-followup-btn ${!canProceed ? 'disabled-btn' : ''}" onclick="event.stopPropagation(); openFollowupConfirm('${item.id}')" ${disabledAttr} ${titleAttr} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: ${!canProceed ? 'not-allowed' : 'pointer'}; background: ${!canProceed ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!canProceed ? '0.6' : '1'};">✅ Simpan ke Pending</button>`;
            } else if (item.status === 'pending') {
                const pendingData = item.pending_data || [];
                const canProceed = pendingData.length > 0 && pendingData.every(p => p.checked === true && p.text && p.text.trim() !== '');
                const disabledAttr = !canProceed ? 'disabled' : '';
                const titleAttr = !canProceed ? 'title="Harap isi semua balasan pending dan centang"' : '';
                actionButton = `<button class="action-btn pending-finish-btn ${!canProceed ? 'disabled-btn' : ''}" onclick="event.stopPropagation(); openPendingModal('${item.id}')" ${disabledAttr} ${titleAttr} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: ${!canProceed ? 'not-allowed' : 'pointer'}; background: ${!canProceed ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!canProceed ? '0.6' : '1'};">✅ Selesai & Pindah ke Closing</button>`;
            } else if (item.status === 'closing') {
                actionButton = `<button class="action-btn closing-db-btn" onclick="event.stopPropagation(); confirmClosingToDB('${item.id}')" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #8b5cf6; color: white;">📁 Pindah ke DB Closing</button>`;
            }
            
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
                <div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                <div class="card-phone">
                    <span title="${item.hp}">${escapeHtml(item.hp)}</span>
                    <span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span>
                </div>
                <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
                ${actionButton}
            </div>`;
        }).join('');
        
        container.querySelectorAll('.card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon') && !e.target.classList.contains('action-btn')) {
                    openDetailCustomer(card.dataset.id);
                }
            });
        });
    };
    
    renderColumn('baruList', lists.baru, 'baru');
    renderColumn('followupList', lists.followup, 'followup');
    renderColumn('pendingList', lists.pending, 'pending');
    renderColumn('closingList', lists.closing, 'closing');
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
    
    lists.baru.sort((a,b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.dihubungi.sort((a,b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.negosiasi.sort((a,b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.tertarik.sort((a,b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    
    document.getElementById('countProspekBaru').innerText = lists.baru.length;
    document.getElementById('countDihubungi').innerText = lists.dihubungi.length;
    document.getElementById('countNegosiasi').innerText = lists.negosiasi.length;
    document.getElementById('countTertarik').innerText = lists.tertarik.length;
    
    const renderColumn = (containerId, items, columnType) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(item => {
            const isOverdue = item.deadline && item.deadline < today;
            const isToday = item.deadline === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            
            let actionButton = '';
            if (item.status === 'Baru') {
                actionButton = `<button class="action-btn dihubungi-btn" onclick="event.stopPropagation(); updateProspekStatus('${item.id}', 'Dihubungi')" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #4f46e5; color: white;">📞 Dihubungi</button>`;
            } else if (item.status === 'Dihubungi') {
                const canProceed = item.dihubungi_data && item.dihubungi_data.terkirim && item.dihubungi_data.dibalas;
                const disabledAttr = !canProceed ? 'disabled' : '';
                const titleAttr = !canProceed ? 'title="Harap lengkapi data dihubungi terlebih dahulu"' : '';
                actionButton = `<button class="action-btn confirm-dihubungi-btn ${!canProceed ? 'disabled-btn' : ''}" onclick="event.stopPropagation(); openProspekDihubungiConfirm('${item.id}')" ${disabledAttr} ${titleAttr} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: ${!canProceed ? 'not-allowed' : 'pointer'}; background: ${!canProceed ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!canProceed ? '0.6' : '1'};">✅ Simpan ke Negosiasi</button>`;
            } else if (item.status === 'Negosiasi') {
                const isComplete = item.negosiasi_data && item.negosiasi_data.is_complete;
                actionButton = `<button class="action-btn negosiasi-btn" onclick="event.stopPropagation(); openProspekNegosiasiModal('${item.id}')" style="margin-top: 4px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #f59e0b; color: white;">📝 Kelola Negosiasi</button>
                    <button class="action-btn tertarik-btn ${!isComplete ? 'disabled-btn' : ''}" onclick="event.stopPropagation(); updateProspekStatus('${item.id}', 'Tertarik')" ${!isComplete ? 'disabled' : ''} ${!isComplete ? 'title="Harap lengkapi data kuesioner negosiasi terlebih dahulu"' : ''} style="margin-top: 4px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: ${!isComplete ? 'not-allowed' : 'pointer'}; background: ${!isComplete ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!isComplete ? '0.6' : '1'};">⭐ Tertarik (+1 hari)</button>`;
            } else if (item.status === 'Tertarik') {
                actionButton = `<button class="action-btn commitment-db-btn" onclick="event.stopPropagation(); confirmTertarikToDB('${item.id}')" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #8b5cf6; color: white;">⭐ Jadikan Member Baru</button>`;
            }
            
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                <div class="card-phone">
                    <span title="${item.hp}">${escapeHtml(item.hp)}</span>
                    <span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span>
                </div>
                <div class="card-deadline">📅 ${item.deadline || '-'}</div>
                ${actionButton}
            </div>`;
        }).join('');
        
        container.querySelectorAll('.card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon') && !e.target.classList.contains('action-btn')) {
                    openDetailProspek(card.dataset.id);
                }
            });
        });
    };
    
    renderColumn('prospekBaruList', lists.baru, 'baru');
    renderColumn('prospekDihubungiList', lists.dihubungi, 'dihubungi');
    renderColumn('prospekNegosiasiList', lists.negosiasi, 'negosiasi');
    renderColumn('prospekTertarikList', lists.tertarik, 'tertarik');
}

// ========== FULL PAGE KANBAN ==========
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
    
    lists.baru.sort((a,b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    lists.followup.sort((a,b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    lists.pending.sort((a,b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    lists.closing.sort((a,b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    
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
            const isChecked = selectedFullFollowupIds.get(item.id) === true;
            const checkboxHtml = currentUserRole === 'owner' ? `<input type="checkbox" class="full-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''} style="margin-right: 8px;">` : '';
            let actionButton = '';
            if (item.status === 'baru') {
                actionButton = `<button class="action-btn followup-btn" onclick="event.stopPropagation(); updateCustomerStatus('${item.id}', 'followup')" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; background: #4f46e5; color: white;">📞 Lanjut Follow Up</button>`;
            } else if (item.status === 'followup') {
                const canProceed = item.followup_data && item.followup_data.terkirim && item.followup_data.dibalas;
                actionButton = `<button class="action-btn confirm-followup-btn ${!canProceed ? 'disabled-btn' : ''}" onclick="event.stopPropagation(); openFollowupConfirm('${item.id}')" ${!canProceed ? 'disabled' : ''} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; background: ${!canProceed ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!canProceed ? '0.6' : '1'};">✅ Simpan ke Pending</button>`;
            } else if (item.status === 'pending') {
                const pendingData = item.pending_data || [];
                const canProceed = pendingData.length > 0 && pendingData.every(p => p.checked === true && p.text && p.text.trim() !== '');
                actionButton = `<button class="action-btn pending-finish-btn ${!canProceed ? 'disabled-btn' : ''}" onclick="event.stopPropagation(); openPendingModal('${item.id}')" ${!canProceed ? 'disabled' : ''} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; background: ${!canProceed ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!canProceed ? '0.6' : '1'};">✅ Selesai & Pindah ke Closing</button>`;
            } else if (item.status === 'closing') {
                actionButton = `<button class="action-btn closing-db-btn" onclick="event.stopPropagation(); confirmClosingToDB('${item.id}')" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; background: #8b5cf6; color: white;">📁 Pindah ke DB Closing</button>`;
            }
            
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div style="display: flex; align-items: center;">
                    ${checkboxHtml}
                    <div style="flex: 1; cursor: pointer;" class="card-click-area">
                        <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
                        <div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                        <div class="card-phone">
                            <span title="${item.hp}">${escapeHtml(item.hp)}</span>
                            <span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span>
                        </div>
                        <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
                        ${actionButton}
                    </div>
                </div>
            </div>`;
        }).join('');
        
        container.querySelectorAll('.card-click-area').forEach(area => {
            area.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = area.closest('.card-item');
                if (card) openDetailCustomer(card.dataset.id);
            });
        });
        
        if (currentUserRole === 'owner') {
            container.querySelectorAll('.full-item-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    e.stopPropagation();
                    const id = cb.dataset.id;
                    if (cb.checked) selectedFullFollowupIds.set(id, true);
                    else selectedFullFollowupIds.delete(id);
                    updateSelectAllFullFollowupButton();
                });
            });
        }
    };
    
    renderColumn('fullBaruList', lists.baru);
    renderColumn('fullFollowupList', lists.followup);
    renderColumn('fullPendingList', lists.pending);
    renderColumn('fullClosingList', lists.closing);
    
    updateSelectAllFullFollowupButton();
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
    
    lists.baru.sort((a,b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.dihubungi.sort((a,b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.negosiasi.sort((a,b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.tertarik.sort((a,b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    
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
            const isChecked = selectedFullProspekIds.get(item.id) === true;
            const checkboxHtml = currentUserRole === 'owner' ? `<input type="checkbox" class="full-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''} style="margin-right: 8px;">` : '';
            
            let actionButton = '';
            if (item.status === 'Baru') {
                actionButton = `<button class="action-btn dihubungi-btn" onclick="event.stopPropagation(); updateProspekStatus('${item.id}', 'Dihubungi')" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; background: #4f46e5; color: white;">📞 Dihubungi</button>`;
            } else if (item.status === 'Dihubungi') {
                const canProceed = item.dihubungi_data && item.dihubungi_data.terkirim && item.dihubungi_data.dibalas;
                actionButton = `<button class="action-btn confirm-dihubungi-btn ${!canProceed ? 'disabled-btn' : ''}" onclick="event.stopPropagation(); openProspekDihubungiConfirm('${item.id}')" ${!canProceed ? 'disabled' : ''} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; background: ${!canProceed ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!canProceed ? '0.6' : '1'};">✅ Simpan ke Negosiasi</button>`;
            } else if (item.status === 'Negosiasi') {
                const isComplete = item.negosiasi_data && item.negosiasi_data.is_complete;
                actionButton = `<button class="action-btn negosiasi-btn" onclick="event.stopPropagation(); openProspekNegosiasiModal('${item.id}')" style="margin-top: 4px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; background: #f59e0b; color: white;">📝 Kelola Negosiasi</button>
                    <button class="action-btn tertarik-btn ${!isComplete ? 'disabled-btn' : ''}" onclick="event.stopPropagation(); updateProspekStatus('${item.id}', 'Tertarik')" ${!isComplete ? 'disabled' : ''} style="margin-top: 4px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; background: ${!isComplete ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!isComplete ? '0.6' : '1'};">⭐ Tertarik (+1 hari)</button>`;
            } else if (item.status === 'Tertarik') {
                actionButton = `<button class="action-btn commitment-db-btn" onclick="event.stopPropagation(); confirmTertarikToDB('${item.id}')" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; background: #8b5cf6; color: white;">⭐ Jadikan Member Baru</button>`;
            }
            
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div style="display: flex; align-items: center;">
                    ${checkboxHtml}
                    <div style="flex: 1; cursor: pointer;" class="card-click-area">
                        <div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                        <div class="card-phone">
                            <span title="${item.hp}">${escapeHtml(item.hp)}</span>
                            <span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span>
                        </div>
                        <div class="card-deadline">📅 ${item.deadline || '-'}</div>
                        ${actionButton}
                    </div>
                </div>
            </div>`;
        }).join('');
        
        container.querySelectorAll('.card-click-area').forEach(area => {
            area.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = area.closest('.card-item');
                if (card) openDetailProspek(card.dataset.id);
            });
        });
        
        if (currentUserRole === 'owner') {
            container.querySelectorAll('.full-item-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    e.stopPropagation();
                    const id = cb.dataset.id;
                    if (cb.checked) selectedFullProspekIds.set(id, true);
                    else selectedFullProspekIds.delete(id);
                    updateSelectAllFullProspekButton();
                });
            });
        }
    };
    
    renderColumn('fullProspekBaruList', lists.baru);
    renderColumn('fullProspekDihubungiList', lists.dihubungi);
    renderColumn('fullProspekNegosiasiList', lists.negosiasi);
    renderColumn('fullProspekTertarikList', lists.tertarik);
    
    updateSelectAllFullProspekButton();
}

function updateSelectAllFullFollowupButton() {
    const btn = document.getElementById('selectAllFullFollowup');
    if (!btn) return;
    if (currentUserRole !== 'owner') {
        btn.style.display = 'none';
        return;
    }
    btn.style.display = 'inline-block';
    
    const checkboxes = document.querySelectorAll('#fullBaruList .full-item-checkbox, #fullFollowupList .full-item-checkbox, #fullPendingList .full-item-checkbox, #fullClosingList .full-item-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
}

function updateSelectAllFullProspekButton() {
    const btn = document.getElementById('selectAllFullProspek');
    if (!btn) return;
    if (currentUserRole !== 'owner') {
        btn.style.display = 'none';
        return;
    }
    btn.style.display = 'inline-block';
    
    const checkboxes = document.querySelectorAll('#fullProspekBaruList .full-item-checkbox, #fullProspekDihubungiList .full-item-checkbox, #fullProspekNegosiasiList .full-item-checkbox, #fullProspekTertarikList .full-item-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
}

function toggleSelectAllFullFollowup() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menggunakan fitur ini!', true);
        return;
    }
    const checkboxes = document.querySelectorAll('#fullBaruList .full-item-checkbox, #fullFollowupList .full-item-checkbox, #fullPendingList .full-item-checkbox, #fullClosingList .full-item-checkbox');
    if (checkboxes.length === 0) return;
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

function toggleSelectAllFullProspek() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menggunakan fitur ini!', true);
        return;
    }
    const checkboxes = document.querySelectorAll('#fullProspekBaruList .full-item-checkbox, #fullProspekDihubungiList .full-item-checkbox, #fullProspekNegosiasiList .full-item-checkbox, #fullProspekTertarikList .full-item-checkbox');
    if (checkboxes.length === 0) return;
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

// ========== DATABASE RENDER FUNCTIONS ==========
function renderAgentList(items) {
    const container = document.getElementById('dbAgentList');
    if (!container) return;

    const totalCountSpan = document.getElementById('agentTotalCount');
    if (totalCountSpan) totalCountSpan.innerText = items.length;

    const searchTerm = document.getElementById('searchAgentInput')?.value.toLowerCase() || '';
    let filtered = [...items];

    if (searchTerm) {
        filtered = filtered.filter(item =>
            (item.nama && String(item.nama).toLowerCase().includes(searchTerm)) ||
            (item.agent_id && String(item.agent_id).toLowerCase().includes(searchTerm)) ||
            (item.hp && String(item.hp).includes(searchTerm))
        );
    }

    agentsFilteredData = filtered;
    const filteredCountSpan = document.getElementById('agentFilteredCount');
    if (filteredCountSpan) filteredCountSpan.innerText = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Tidak ada data agent</p>';
        return;
    }

    container.innerHTML = filtered.map(item => {
        const isChecked = selectedAgentIds.get(item.id) === true;
        return `
            <div class="db-item-agent" data-id="${item.id}">
                <input type="checkbox" class="db-item-checkbox-agent" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-agent-info">
                    <h4>${escapeHtml(item.nama || '-')}</h4>
                    <p>📱 ${escapeHtml(item.hp || '-')} | 🆔 ${escapeHtml(item.agent_id || '-')}</p>
                    <small>📅 ${item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}</small>
                </div>
                <div class="db-item-agent-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp || '')}')">💬 WA</button>
                    <button class="db-item-move-followup" onclick="event.stopPropagation(); moveAgentToFollowup('${item.id}')">📞 Pindah ke Followup</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteAgentItem('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('#dbAgentList .db-item-checkbox-agent').forEach(cb => {
        cb.removeEventListener('change', handleAgentCheckboxChange);
        cb.addEventListener('change', handleAgentCheckboxChange);
    });

    document.querySelectorAll('#dbAgentList .db-item-agent').forEach(el => {
        el.removeEventListener('click', handleAgentItemClick);
        el.addEventListener('click', handleAgentItemClick);
    });

    updateSelectAllAgentButton();
}

function handleAgentCheckboxChange(e) {
    e.stopPropagation();
    const id = e.target.dataset.id;
    if (e.target.checked) selectedAgentIds.set(id, true);
    else selectedAgentIds.delete(id);
    updateSelectAllAgentButton();
}

function handleAgentItemClick(e) {
    if (e.target.type !== 'checkbox' &&
        !e.target.classList.contains('db-item-wa') &&
        !e.target.classList.contains('db-item-move-followup') &&
        !e.target.classList.contains('db-item-delete')) {
        openAgentDetail(e.currentTarget.dataset.id);
    }
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

    if (produkData.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">🏷️ Tidak ada produk</p>';
        return;
    }

    container.innerHTML = produkData.map(item => {
        const isChecked = selectedProdukIds.get(item.id) === true;
        return `
            <div class="db-item produk-item" data-id="${item.id}">
                <input type="checkbox" class="db-item-checkbox-produk" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>📦 ${escapeHtml(item.nama)}</h4>
                    <p>💰 HPP: ${formatRupiah(item.hpp)} | Jual: ${formatRupiah(item.harga_jual)}</p>
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
        cb.addEventListener('change', (e) => {
            const id = cb.dataset.id;
            if (cb.checked) selectedProdukIds.set(id, true);
            else selectedProdukIds.delete(id);
            updateSelectAllProdukButton();
        });
    });

    updateSelectAllProdukButton();
}

function updateSelectAllProdukButton() {
    const btn = document.getElementById('selectAllProduk');
    if (!btn) return;
    
    const allChecked = produkData.length > 0 && produkData.every(item => selectedProdukIds.get(item.id) === true);
    btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
}

function renderTransaksiList() {
    const container = document.getElementById('dbTransaksiList');
    if (!container) return;
    
    if (transaksiData.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Tidak ada data transaksi</p>';
        return;
    }
    
    container.innerHTML = transaksiData.map(item => {
        const isChecked = selectedTransaksiIds.get(item.id) === true;
        const progresIcon = item.progres_jenis === 'naik' ? '📈' : (item.progres_jenis === 'turun' ? '📉' : '⚖️');
        const statusBadge = item.status === 'imported' ? 
            '<span style="background:#10b981; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">✅ Sudah Dipindah</span>' :
            '<span style="background:#f59e0b; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">⏳ Pending</span>';
        
        return `
            <div class="db-item-agent" data-id="${item.id}">
                <input type="checkbox" class="db-item-checkbox-transaksi" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-agent-info">
                    <h4>${escapeHtml(item.nama || item.agent_id)}</h4>
                    <p>📱 ${escapeHtml(item.hp || '-')} | 🆔 ${escapeHtml(item.agent_id || '-')}</p>
                    <p>${progresIcon} ${item.progres_jenis?.toUpperCase() || 'NORMAL'} | Jumlah: ${Math.abs(item.progres_jumlah || 0).toLocaleString()}</p>
                    <p>👤 Upline: ${escapeHtml(item.upline_name || '-')}</p>
                    <small>📅 ${item.tanggal_transaksi ? new Date(item.tanggal_transaksi).toLocaleDateString('id-ID') : '-'} | Status: ${statusBadge}</small>
                </div>
                <div class="db-item-agent-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp || '')}')">💬 WA</button>
                    ${item.status !== 'imported' ? `<button class="db-item-move-followup" onclick="event.stopPropagation(); moveSingleToFollowup('${item.id}')">📋 Pindah ke Followup</button>` : ''}
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteTransaksiItem('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('#dbTransaksiList .db-item-checkbox-transaksi').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) selectedTransaksiIds.set(id, true);
            else selectedTransaksiIds.delete(id);
            updateSelectAllTransaksiButton();
        });
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

function renderDBClosing(items) {
    const container = document.getElementById('dbClosingList');
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data closing</p>';
        return;
    }
    
    container.innerHTML = items.map(item => {
        const isChecked = selectedClosingIds.get(item.id) === true;
        return `
            <div class="db-item" data-id="${item.id}">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>📱 ${escapeHtml(item.hp)}</p>
                    <small>Closing: ${new Date(item.closing_date).toLocaleDateString('id-ID')}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_closing', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('#dbClosingList .db-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) selectedClosingIds.set(id, true);
            else selectedClosingIds.delete(id);
            updateSelectAllButton('selectAllClosing', '#dbClosingList', selectedClosingIds);
        });
    });
    
    updateSelectAllButton('selectAllClosing', '#dbClosingList', selectedClosingIds);
}

function renderDBTidak(items) {
    const container = document.getElementById('dbTidakList');
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data tidak tertarik</p>';
        return;
    }
    
    container.innerHTML = items.map(item => {
        const isChecked = selectedTidakIds.get(item.id) === true;
        return `
            <div class="db-item" data-id="${item.id}">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>📱 ${escapeHtml(item.hp)}</p>
                    <small>Alasan: ${escapeHtml(item.alasan || '-')}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_tidak_tertarik', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('#dbTidakList .db-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) selectedTidakIds.set(id, true);
            else selectedTidakIds.delete(id);
            updateSelectAllButton('selectAllTidak', '#dbTidakList', selectedTidakIds);
        });
    });
    
    updateSelectAllButton('selectAllTidak', '#dbTidakList', selectedTidakIds);
}

function renderDBNomorSalah(items) {
    const container = document.getElementById('dbNomorSalahList');
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data nomor salah</p>';
        return;
    }
    
    container.innerHTML = items.map(item => {
        const isChecked = selectedNomorSalahIds.get(item.id) === true;
        return `
            <div class="db-item" data-id="${item.id}">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>📱 ${escapeHtml(item.hp)}</p>
                    <small>Alasan: ${escapeHtml(item.alasan || '-')}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('nomor_salah', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('#dbNomorSalahList .db-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) selectedNomorSalahIds.set(id, true);
            else selectedNomorSalahIds.delete(id);
            updateSelectAllButton('selectAllNomorSalah', '#dbNomorSalahList', selectedNomorSalahIds);
        });
    });
    
    updateSelectAllButton('selectAllNomorSalah', '#dbNomorSalahList', selectedNomorSalahIds);
}

function renderDBCommitment(items) {
    const container = document.getElementById('dbCommitmentList');
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data commitment</p>';
        return;
    }
    
    container.innerHTML = items.map(item => {
        const isChecked = selectedCommitmentIds.get(item.id) === true;
        return `
            <div class="db-item" data-id="${item.id}">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>📱 ${escapeHtml(item.hp)}</p>
                    <small>Agent: ${escapeHtml(item.agent_id || '-')} | Aplikasi: ${escapeHtml(item.aplikasi || '-')}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_commitment', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('#dbCommitmentList .db-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) selectedCommitmentIds.set(id, true);
            else selectedCommitmentIds.delete(id);
            updateSelectAllButton('selectAllCommitment', '#dbCommitmentList', selectedCommitmentIds);
        });
    });
    
    updateSelectAllButton('selectAllCommitment', '#dbCommitmentList', selectedCommitmentIds);
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
        container.innerHTML = '<p style="text-align:center;padding:40px;">👥 Belum ada CS Agent</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="db-item">
            <div class="db-item-info">
                <h4>${escapeHtml(user.nama || user.email)}</h4>
                <p>${user.email || '-'}</p>
                <small>Role: ${user.role || 'cs'}</small>
            </div>
            <div class="db-item-actions">
                <button class="db-item-delete" onclick="deleteUser('${user.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

function renderTarifAdminList() {
    const container = document.getElementById('tarifAdminList');
    if (!container) return;
    
    if (tarifAdminData.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">🏷️ Tidak ada data admin per CID</p>';
        return;
    }
    
    container.innerHTML = tarifAdminData.map(item => `
        <div class="db-item" data-id="${item.id}">
            <div class="db-item-info">
                <h4>🆔 CID: ${escapeHtml(item.cid)}</h4>
                <p>⚡ PLN Pospaid: ${formatRupiah(item.admin_pospaid || 0)}<br>⚡ PLN Prepaid: ${formatRupiah(item.admin_prepaid || 0)}<br>⚡ PLN Nontaglis: ${formatRupiah(item.admin_nontaglis || 0)}</p>
            </div>
            <div class="db-item-actions">
                <button class="db-item-edit" onclick="editTarifAdmin('${item.id}')">✏️ Edit</button>
                <button class="db-item-delete" onclick="deleteTarifAdmin('${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

function renderTransaksiListGlobal() {
    const container = document.getElementById('transaksiList');
    if (!container) return;
    
    if (transaksiGlobalList.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#9ca3af;">📭 Belum ada catatan transaksi</p>';
        return;
    }
    
    container.innerHTML = transaksiGlobalList.map(item => `
        <div class="db-item" style="border-left: 3px solid #4f46e5; margin-bottom: 8px;">
            <div class="db-item-info">
                <h4>💰 ${formatRupiah(item.nominal)}</h4>
                <p>${escapeHtml(item.keterangan || '-')}</p>
                <small>📅 ${new Date(item.tanggal).toLocaleDateString('id-ID')} | 👤 oleh: ${escapeHtml(item.created_by_name || 'CS')}</small>
            </div>
            <div class="db-item-actions">
                ${currentUserRole === 'owner' || item.created_by === currentUser?.id ? 
                    `<button class="db-item-edit" onclick="editTransaksiGlobal('${item.id}')">✏️ Edit</button>
                     <button class="db-item-delete" onclick="deleteTransaksiGlobal('${item.id}')">🗑️ Hapus</button>` : ''
                }
            </div>
        </div>
    `).join('');
}

// ========== SELECT ALL FUNCTIONS ==========
function updateSelectAllButton(btnId, containerSelector, selectedMap) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    const checkboxes = document.querySelectorAll(`${containerSelector} .db-item-checkbox`);
    if (checkboxes.length === 0) {
        btn.textContent = '✅ Pilih Semua';
        return;
    }
    
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
}

function setupSelectAll(btnId, containerSelector, selectedMap) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll(`${containerSelector} .db-item-checkbox`);
        if (checkboxes.length === 0) return;
        
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
            const id = cb.dataset.id;
            if (!allChecked) selectedMap.set(id, true);
            else selectedMap.delete(id);
        });
        btn.textContent = !allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
    });
}

// ========== CRUD OPERATIONS ==========
async function addCustomer(agentId, nama, hp, apk, uplineName, deadline) {
    const formattedAgentId = formatAgentIdToUpper(agentId);
    const formattedNama = formatNamaToCapital(nama);
    let formattedHp = hp || '';
    
    if (!validateAgentId(formattedAgentId)) {
        showNotifTop('⚠️ ID Agent hanya boleh huruf besar, angka, dan tanda hubung (max 17 karakter)!', true);
        return false;
    }
    if (!validateNama(formattedNama)) {
        showNotifTop('⚠️ Nama harus huruf saja, minimal 2 karakter, maksimal 25 karakter!', true);
        return false;
    }
    if (formattedHp && !validatePhone(formattedHp)) {
        showNotifTop('⚠️ Nomor WhatsApp harus diawali angka 8, 9-12 digit angka!', true);
        return false;
    }
    
    const { data: existing } = await window.db
        .from('customers')
        .select('id')
        .eq('agent_id', formattedAgentId)
        .maybeSingle();
    
    if (existing) {
        showNotifTop(`⚠️ ID Agent "${formattedAgentId}" sudah terdaftar!`, true);
        return false;
    }
    
    const { error } = await window.db.from('customers').insert({
        agent_id: formattedAgentId,
        nama: formattedNama,
        hp: formattedHp,
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
    const formattedNama = formatNamaToCapital(nama);
    let formattedHp = hp || '';
    
    if (!validateNama(formattedNama)) {
        showNotifTop('⚠️ Nama harus huruf saja, minimal 2 karakter, maksimal 25 karakter!', true);
        return false;
    }
    if (formattedHp && !validatePhone(formattedHp)) {
        showNotifTop('⚠️ Nomor WhatsApp harus diawali angka 8, 9-12 digit angka!', true);
        return false;
    }
    
    const { error } = await window.db.from('prospek').insert({
        nama: formattedNama,
        hp: formattedHp,
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

async function updateCustomerStatus(id, newStatus) {
    const customer = customersData.find(c => c.id === id);
    if (!customer) return;
    
    let daysToAdd = 0;
    let newDeadline = customer.tanggal || getTodayDate();
    
    if (newStatus === 'followup') {
        daysToAdd = 3;
        newDeadline = addDaysToDate(newDeadline, daysToAdd);
    } else if (newStatus === 'pending') {
        // Follow up ke pending tidak menambah deadline, simpan di kelola pending yang akan menambah
        newDeadline = customer.tanggal || getTodayDate();
    } else if (newStatus === 'closing') {
        daysToAdd = 7;
        newDeadline = addMonthsToDate(newDeadline, 1);
    }
    
    const { error } = await window.db
        .from('customers')
        .update({ status: newStatus, tanggal: newDeadline, updated_at: new Date().toISOString() })
        .eq('id', id);
    
    if (error) {
        showNotifTop('❌ Gagal update: ' + error.message, true);
        return;
    }
    
    const statusText = newStatus === 'followup' ? 'Follow Up' : newStatus;
    if (daysToAdd > 0) {
        showNotifTop(`✅ Status berhasil diupdate ke ${statusText}. Deadline +${daysToAdd} hari menjadi ${newDeadline}`);
    } else {
        showNotifTop(`✅ Status berhasil diupdate ke ${statusText}`);
    }
    closeModal('detailModal');
    await loadCustomers();
}

async function updateProspekStatus(id, newStatus) {
    const prospek = prospekData.find(p => p.id === id);
    if (!prospek) return;
    
    let daysToAdd = 0;
    let newDeadline = prospek.deadline || getTodayDate();
    
    if (newStatus === 'Dihubungi') {
        daysToAdd = 3;
        newDeadline = addDaysToDate(newDeadline, daysToAdd);
    } else if (newStatus === 'Negosiasi') {
        // Dihubungi ke negosiasi tidak menambah deadline, simpan di kelola negosiasi yang akan menambah
        newDeadline = prospek.deadline || getTodayDate();
    } else if (newStatus === 'Tertarik') {
        daysToAdd = 1;
        newDeadline = addDaysToDate(newDeadline, daysToAdd);
    }
    
    const { error } = await window.db
        .from('prospek')
        .update({ status: newStatus, deadline: newDeadline, updated_at: new Date().toISOString() })
        .eq('id', id);
    
    if (error) {
        showNotifTop('❌ Gagal update: ' + error.message, true);
        return;
    }
    
    if (daysToAdd > 0) {
        showNotifTop(`✅ Status berhasil diupdate ke ${newStatus}. Deadline +${daysToAdd} hari menjadi ${newDeadline}`);
    } else {
        showNotifTop(`✅ Status berhasil diupdate ke ${newStatus}`);
    }
    closeModal('detailModal');
    await loadProspek();
}

async function deleteCustomer(id) {
    if (!confirm('Yakin hapus customer ini? Data akan dihapus permanen!')) return;
    
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
    if (!confirm('Yakin hapus prospek ini? Data akan dihapus permanen!')) return;
    
    const { error } = await window.db.from('prospek').delete().eq('id', id);
    if (error) {
        showNotifTop('❌ Gagal hapus: ' + error.message, true);
        return;
    }
    
    showNotifTop('🗑️ Data prospek berhasil dihapus');
    closeModal('detailModal');
    await loadProspek();
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

async function deleteUser(id) {
    if (!confirm('Yakin ingin menghapus CS Agent ini?')) return;
    try {
        await window.db.from('users').delete().eq('id', id);
        showNotifTop('✅ CS Agent berhasil dihapus');
        await loadUsersList();
    } catch (e) {
        showNotifTop('❌ Gagal: ' + e.message, true);
    }
}

async function moveAgentToFollowup(agentId) {
    const agent = agentsData.find(a => a.id === agentId);
    if (!agent) return;

    const { data: existing } = await window.db
        .from('customers')
        .select('id')
        .eq('agent_id', agent.agent_id)
        .maybeSingle();
    
    if (existing) {
        showNotifTop(`⚠️ ID Agent "${agent.agent_id}" sudah terdaftar!`, true);
        return;
    }

    if (!confirm(`Pindahkan agent "${escapeHtml(agent.nama)}" ke Followup Agen?`)) return;

    const { error } = await window.db.from('customers').insert({
        agent_id: agent.agent_id,
        nama: agent.nama,
        hp: agent.hp,
        apk: agent.apk || '',
        agent_type: agent.agent_type || '',
        tanggal: getTodayDate(),
        status: 'baru',
        user_id: agent.user_id,
        created_at: new Date().toISOString()
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
    
    selectedAgentIds.delete(id);
    showNotifTop('🗑️ Data agent berhasil dihapus');
    await loadDatabaseAgent();
}

async function moveSingleToFollowup(id) {
    const item = transaksiData.find(t => t.id === id);
    if (!item) return;
    
    const { data: existing } = await window.db
        .from('customers')
        .select('id')
        .eq('agent_id', item.agent_id)
        .maybeSingle();
    
    if (existing) {
        showNotifTop(`⚠️ ID Agent "${item.agent_id}" sudah terdaftar!`, true);
        return;
    }
    
    const { error } = await window.db.from('customers').insert({
        agent_id: item.agent_id,
        nama: item.nama || `Agent ${item.agent_id}`,
        hp: item.hp || '',
        apk: item.apk || '',
        upline_name: item.upline_name || '',
        upline_phone: item.upline_phone || '',
        tanggal: getTodayDate(),
        status: 'baru',
        user_id: currentUser.id,
        created_at: new Date().toISOString()
    });
    
    if (error) {
        showNotifTop('❌ Gagal pindah: ' + error.message, true);
        return;
    }
    
    await window.db.from('db_transaksi').update({ status: 'imported', updated_at: new Date().toISOString() }).eq('id', id);
    showNotifTop('✅ Data berhasil dipindahkan ke Followup Agen!');
    await loadDbTransaksi();
    await loadCustomers();
}

async function deleteTransaksiItem(id) {
    if (!confirm('Yakin hapus data transaksi ini?')) return;
    
    const { error } = await window.db.from('db_transaksi').delete().eq('id', id);
    if (error) {
        showNotifTop('❌ Gagal hapus: ' + error.message, true);
        return;
    }
    
    selectedTransaksiIds.delete(id);
    showNotifTop('🗑️ Data transaksi berhasil dihapus');
    await loadDbTransaksi();
}

async function deleteProduk(id) {
    if (!confirm('Yakin hapus produk ini?')) return;
    
    await window.db.from('produk').delete().eq('id', id);
    const index = produkData.findIndex(p => p.id === id);
    if (index !== -1) produkData.splice(index, 1);
    selectedProdukIds.delete(id);
    renderProdukList();
    showNotifTop('🗑️ Produk berhasil dihapus');
}

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

    if (id) {
        await window.db.from('produk').update(data).eq('id', id);
        showNotifTop('✅ Produk berhasil diupdate');
    } else {
        data.created_at = new Date().toISOString();
        await window.db.from('produk').insert(data);
        showNotifTop('✅ Produk berhasil ditambahkan');
    }
    await loadProduk();
    return true;
}

function editProduk(id) {
    const produk = produkData.find(p => p.id === id);
    if (!produk) return;
    
    const modal = createModalWithHighZIndex(`
        <div class="modal-content" style="max-width: 450px;">
            <h3>✏️ Edit Produk</h3>
            <div class="modal-subtitle">Edit data produk</div>
            <div style="padding: 20px;">
                <div class="form-group"><label>Nama Produk</label><input type="text" id="editNama" value="${escapeHtml(produk.nama)}"></div>
                <div class="form-group"><label>HPP (Modal)</label><input type="number" id="editHpp" value="${produk.hpp}"></div>
                <div class="form-group"><label>Keterangan</label><textarea id="editKeterangan" rows="2">${escapeHtml(produk.keterangan || '')}</textarea></div>
            </div>
            <div class="modal-buttons">
                <button id="saveEditBtn" class="btn-primary">💾 Simpan</button>
                <button id="closeEditBtn" class="btn-outline">Batal</button>
            </div>
        </div>
    `, () => closeDynamicModal(modal));
    
    document.getElementById('saveEditBtn').onclick = async () => {
        const nama = document.getElementById('editNama').value;
        const hpp = document.getElementById('editHpp').value;
        const keterangan = document.getElementById('editKeterangan').value;
        
        if (!nama || !hpp) {
            showNotifTop('⚠️ Nama dan HPP wajib diisi!', true);
            return;
        }
        
        await window.db.from('produk').update({
            nama: nama,
            hpp: parseInt(hpp),
            keterangan: keterangan,
            updated_at: new Date().toISOString()
        }).eq('id', id);
        
        showNotifTop('✅ Produk berhasil diupdate');
        closeDynamicModal(modal);
        await loadProduk();
    };
    
    document.getElementById('closeEditBtn').onclick = () => closeDynamicModal(modal);
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
            await window.db.from('tarif_admin').update(data).eq('id', id);
            showNotifTop('✅ Data admin per CID berhasil diupdate');
        } else {
            const existing = tarifAdminData.find(t => t.cid === cid);
            if (existing) {
                showNotifTop(`⚠️ CID ${cid} sudah ada! Silakan edit data yang sudah ada.`, true);
                return false;
            }
            data.created_at = new Date().toISOString();
            await window.db.from('tarif_admin').insert(data);
            showNotifTop('✅ Data admin per CID berhasil ditambahkan');
        }
        await loadTarifAdmin();
        return true;
    } catch (e) {
        showNotifTop('❌ Gagal: ' + e.message, true);
        return false;
    }
}

function deleteTarifAdmin(id) {
    if (!confirm('Yakin hapus data admin per CID ini?')) return;
    window.db.from('tarif_admin').delete().eq('id', id);
    showNotifTop('🗑️ Data dihapus');
    loadTarifAdmin();
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

function clearTarifForm() {
    currentEditTarifId = null;
    document.getElementById('tarifCid').value = '';
    document.getElementById('tarifPospaid').value = '';
    document.getElementById('tarifPrepaid').value = '';
    document.getElementById('tarifNontaglis').value = '';
}

// ========== FOLLOWUP CONFIRMATION FUNCTIONS ==========
function openFollowupConfirm(id) {
    currentPendingId = id;
    
    const modal = createModalWithHighZIndex(`
        <div class="modal-content" style="max-width: 400px;">
            <h3>✅ Konfirmasi Follow Up</h3>
            <div class="modal-subtitle">Pastikan sudah melakukan komunikasi dengan customer</div>
            <div style="padding: 20px;">
                <div class="form-group">
                    <label><input type="checkbox" id="followup_terkirim" style="margin-right: 8px;"> Apakah pesan sudah terkirim dan terbaca?</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="followup_dibalas" style="margin-right: 8px;"> Apakah sudah di balas?</label>
                </div>
            </div>
            <div class="modal-buttons">
                <button id="followupConfirmYes" class="btn-primary" disabled>✅ Simpan ke Pending</button>
                <button id="followupConfirmNo" class="btn-danger">📵 Nomor salah/Tidak bisa dihubungi</button>
                <button id="followupConfirmCancel" class="btn-outline">❌ Batal</button>
            </div>
        </div>
    `, () => closeDynamicModal(modal));
    
    const cb1 = modal.querySelector('#followup_terkirim');
    const cb2 = modal.querySelector('#followup_dibalas');
    const yesBtn = modal.querySelector('#followupConfirmYes');
    const noBtn = modal.querySelector('#followupConfirmNo');
    const cancelBtn = modal.querySelector('#followupConfirmCancel');
    
    const updateYesButton = () => {
        const isChecked = cb1.checked && cb2.checked;
        yesBtn.disabled = !isChecked;
        if (isChecked) {
            yesBtn.style.opacity = '1';
            yesBtn.style.background = '#4f46e5';
            yesBtn.style.cursor = 'pointer';
        } else {
            yesBtn.style.opacity = '0.6';
            yesBtn.style.background = '#9ca3af';
            yesBtn.style.cursor = 'not-allowed';
        }
    };
    
    cb1.onclick = updateYesButton;
    cb2.onclick = updateYesButton;
    updateYesButton();
    
    yesBtn.onclick = async () => {
        if (yesBtn.disabled) {
            showNotifTop('⚠️ Harap centang kedua checklist terlebih dahulu!', true);
            return;
        }
        
        const { data: doc } = await window.db.from('customers').select('*').eq('id', id).single();
        // Follow up ke pending tidak menambah deadline
        await window.db.from('customers').update({
            followup_data: { terkirim: true, dibalas: true, timestamp: new Date().toISOString() },
            status: 'pending'
        }).eq('id', id);
        
        closeDynamicModal(modal);
        showNotifTop(`✅ Customer dipindahkan ke Pending`);
        await loadCustomers();
        closeModal('detailModal');
    };
    
    noBtn.onclick = async () => {
        const { data: doc } = await window.db.from('customers').select('*').eq('id', id).single();
        if (confirm(`Pindahkan "${escapeHtml(doc.nama)}" ke Database Nomor Salah?`)) {
            await window.db.from('nomor_salah').insert({
                nama: doc.nama,
                hp: doc.hp,
                alasan: 'Nomor tidak bisa dihubungi / tidak aktif',
                deleted_at: new Date().toISOString(),
                user_id: doc.user_id
            });
            await window.db.from('customers').delete().eq('id', id);
            showNotifTop('📵 Data dipindahkan ke Database Nomor Salah');
            closeDynamicModal(modal);
            await loadCustomers();
            closeModal('detailModal');
        }
    };
    
    cancelBtn.onclick = () => closeDynamicModal(modal);
}

// ========== PROSPEK DIHUBUNGI CONFIRMATION ==========
function openProspekDihubungiConfirm(id) {
    currentProspekId = id;
    
    const modal = createModalWithHighZIndex(`
        <div class="modal-content" style="max-width: 400px;">
            <h3>✅ Konfirmasi Dihubungi</h3>
            <div class="modal-subtitle">Pastikan sudah melakukan komunikasi dengan prospek</div>
            <div style="padding: 20px;">
                <div class="form-group">
                    <label><input type="checkbox" id="prospek_terkirim" style="margin-right: 8px;"> Apakah pesan sudah terkirim dan terbaca?</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="prospek_dibalas" style="margin-right: 8px;"> Apakah sudah di balas?</label>
                </div>
            </div>
            <div class="modal-buttons">
                <button id="prospekConfirmYes" class="btn-primary" disabled>✅ Simpan ke Negosiasi</button>
                <button id="prospekConfirmNo" class="btn-danger">📵 Nomor salah/Tidak bisa dihubungi</button>
                <button id="prospekConfirmCancel" class="btn-outline">❌ Batal</button>
            </div>
        </div>
    `, () => closeDynamicModal(modal));
    
    const cb1 = modal.querySelector('#prospek_terkirim');
    const cb2 = modal.querySelector('#prospek_dibalas');
    const yesBtn = modal.querySelector('#prospekConfirmYes');
    const noBtn = modal.querySelector('#prospekConfirmNo');
    const cancelBtn = modal.querySelector('#prospekConfirmCancel');
    
    const updateYesButton = () => {
        const isChecked = cb1.checked && cb2.checked;
        yesBtn.disabled = !isChecked;
        if (isChecked) {
            yesBtn.style.opacity = '1';
            yesBtn.style.background = '#4f46e5';
            yesBtn.style.cursor = 'pointer';
        } else {
            yesBtn.style.opacity = '0.6';
            yesBtn.style.background = '#9ca3af';
            yesBtn.style.cursor = 'not-allowed';
        }
    };
    
    cb1.onclick = updateYesButton;
    cb2.onclick = updateYesButton;
    updateYesButton();
    
    yesBtn.onclick = async () => {
        if (yesBtn.disabled) {
            showNotifTop('⚠️ Harap centang kedua checklist terlebih dahulu!', true);
            return;
        }
        
        const { data: doc } = await window.db.from('prospek').select('*').eq('id', id).single();
        // Dihubungi ke negosiasi tidak menambah deadline
        await window.db.from('prospek').update({
            dihubungi_data: { terkirim: true, dibalas: true, timestamp: new Date().toISOString() },
            status: 'Negosiasi'
        }).eq('id', id);
        
        closeDynamicModal(modal);
        showNotifTop(`✅ Prospek dipindahkan ke Negosiasi`);
        await loadProspek();
        closeModal('detailModal');
    };
    
    noBtn.onclick = async () => {
        const { data: doc } = await window.db.from('prospek').select('*').eq('id', id).single();
        if (confirm(`Pindahkan "${escapeHtml(doc.nama)}" ke Database Nomor Salah?`)) {
            await window.db.from('nomor_salah').insert({
                nama: doc.nama,
                hp: doc.hp,
                alasan: 'Nomor tidak bisa dihubungi / tidak aktif',
                deleted_at: new Date().toISOString(),
                user_id: doc.user_id
            });
            await window.db.from('prospek').delete().eq('id', id);
            showNotifTop('📵 Data dipindahkan ke Database Nomor Salah');
            closeDynamicModal(modal);
            await loadProspek();
            closeModal('detailModal');
        }
    };
    
    cancelBtn.onclick = () => closeDynamicModal(modal);
}

// ========== PENDING MODAL FUNCTIONS ==========
function openPendingModal(id) {
    currentPendingId = id;
    
    window.db.from('customers').select('*').eq('id', id).single().then(({ data }) => {
        pendingItems = data.pending_data || [];
        
        const modal = createModalWithHighZIndex(`
            <div class="modal-content" style="max-width: 500px;">
                <h3>📝 Catatan Pending</h3>
                <div class="modal-subtitle">Catat setiap balasan/respon dari customer. Simpan akan menambah deadline +2 hari</div>
                <div id="pendingItemsContainer" style="max-height: 300px; overflow-y: auto; padding: 0 20px;"></div>
                <button id="addPendingItemBtn" class="add-btn" style="margin: 10px 20px; width: calc(100% - 40px);">+ Tambah Balasan</button>
                <div class="modal-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="pendingFinishBtn" class="btn-success" style="flex: 1;" disabled>✅ Selesai & Pindah ke Closing</button>
                    <button id="pendingSaveBtn" class="btn-primary" style="flex: 1;">💾 Simpan (+2 hari deadline)</button>
                    <button id="pendingCancelBtn" class="btn-outline" style="flex: 1;">❌ Batal</button>
                </div>
            </div>
        `, () => closeDynamicModal(modal));
        
        renderPendingModalInContainer(modal);
    });
}

function renderPendingModalInContainer(modal) {
    const container = modal.querySelector('#pendingItemsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (pendingItems.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.padding = '20px';
        emptyDiv.style.color = '#9ca3af';
        emptyDiv.innerHTML = 'Belum ada catatan pending. Klik "+ Tambah Balasan" untuk menambahkan.';
        container.appendChild(emptyDiv);
    }
    
    pendingItems.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'pending-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '8px';
        div.style.marginBottom = '8px';
        div.style.padding = '8px';
        div.style.background = '#f9fafb';
        div.style.borderRadius = '8px';
        div.innerHTML = `
            <input type="text" value="${escapeHtml(item.text)}" placeholder="Balasan/respon..." style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
            <input type="checkbox" ${item.checked ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
            <button class="delete-pending-item" data-idx="${idx}" style="background: #fef2f2; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; padding: 4px 8px; color: #dc2626;">🗑️</button>
        `;
        const textInput = div.querySelector('input[type="text"]');
        const checkBox = div.querySelector('input[type="checkbox"]');
        const delBtn = div.querySelector('.delete-pending-item');
        
        textInput.addEventListener('change', (e) => {
            pendingItems[idx].text = e.target.value;
            updatePendingButtonsInModal(modal);
        });
        checkBox.addEventListener('change', (e) => {
            pendingItems[idx].checked = e.target.checked;
            updatePendingButtonsInModal(modal);
        });
        delBtn.addEventListener('click', () => {
            pendingItems.splice(idx, 1);
            renderPendingModalInContainer(modal);
            updatePendingButtonsInModal(modal);
        });
        container.appendChild(div);
    });
    
    const addBtn = modal.querySelector('#addPendingItemBtn');
    if (addBtn) {
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        newAddBtn.onclick = () => {
            pendingItems.push({ text: '', checked: false });
            renderPendingModalInContainer(modal);
            updatePendingButtonsInModal(modal);
        };
    }
    
    updatePendingButtonsInModal(modal);
}

function updatePendingButtonsInModal(modal) {
    const allFilledAndChecked = pendingItems.length > 0 && pendingItems.every(item => item.checked === true && item.text.trim() !== '');
    
    const finishBtn = modal.querySelector('#pendingFinishBtn');
    if (finishBtn) {
        if (allFilledAndChecked) {
            finishBtn.disabled = false;
            finishBtn.style.opacity = '1';
            finishBtn.style.background = '#10b981';
            finishBtn.style.cursor = 'pointer';
            const newFinishBtn = finishBtn.cloneNode(true);
            finishBtn.parentNode.replaceChild(newFinishBtn, finishBtn);
            newFinishBtn.onclick = async () => {
                await window.db.from('customers').update({ pending_data: pendingItems }).eq('id', currentPendingId);
                // Pindah ke closing dengan deadline +7 hari (tanggal 1 bulan berikutnya)
                const newDeadline = addMonthsToDate(getTodayDate(), 1);
                await window.db.from('customers').update({ 
                    status: 'closing', 
                    tanggal: newDeadline,
                    updated_at: new Date().toISOString()
                }).eq('id', currentPendingId);
                showNotifTop(`✅ Customer dipindahkan ke Closing. Deadline menjadi tanggal 1 bulan depan: ${newDeadline}`);
                closeDynamicModal(modal);
                await loadCustomers();
                closeModal('detailModal');
            };
        } else {
            finishBtn.disabled = true;
            finishBtn.style.opacity = '0.6';
            finishBtn.style.background = '#9ca3af';
            finishBtn.style.cursor = 'not-allowed';
        }
    }
    
    const saveBtn = modal.querySelector('#pendingSaveBtn');
    if (saveBtn) {
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.onclick = async () => {
            const { data: doc } = await window.db.from('customers').select('*').eq('id', currentPendingId).single();
            const oldPendingData = doc.pending_data || [];
            
            let hasChanges = false;
            if (pendingItems.length !== oldPendingData.length) {
                hasChanges = true;
            } else {
                for (let i = 0; i < pendingItems.length; i++) {
                    const newItem = pendingItems[i];
                    const oldItem = oldPendingData[i] || {};
                    if (newItem.text !== oldItem.text || newItem.checked !== oldItem.checked) {
                        hasChanges = true;
                        break;
                    }
                }
            }
            
            const hasAnyData = pendingItems.some(item => item.text && item.text.trim() !== '');
            
            if (!hasAnyData) {
                showNotifTop('⚠️ Minimal isi satu balasan sebelum menyimpan!', true);
                return;
            }
            
            if (!hasChanges) {
                showNotifTop('⚠️ Tidak ada perubahan data!', true);
                return;
            }
            
            const newDeadline = addDaysToDate(doc.tanggal || getTodayDate(), 2);
            await window.db.from('customers').update({
                pending_data: pendingItems,
                tanggal: newDeadline,
                updated_at: new Date().toISOString()
            }).eq('id', currentPendingId);
            
            showNotifTop(`💾 Data pending berhasil disimpan. Deadline +2 hari menjadi ${newDeadline}`);
            closeDynamicModal(modal);
            await loadCustomers();
        };
    }
    
    const cancelBtn = modal.querySelector('#pendingCancelBtn');
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.onclick = () => closeDynamicModal(modal);
    }
}

// ========== PROSPEK NEGOSIASI MODAL ==========
function openProspekNegosiasiModal(id) {
    currentProspekId = id;
    
    window.db.from('prospek').select('*').eq('id', id).single().then(({ data }) => {
        const negosiasiData = data.negosiasi_data || {};
        const fields = ['aplikasi', 'domisili', 'transaksi', 'deposit', 'tertarik', 'penawaran'];
        const filledFields = fields.filter(f => negosiasiData[f] && negosiasiData[f] !== '');
        const isComplete = filledFields.length === fields.length;
        
        const modal = createModalWithHighZIndex(`
            <div class="modal-content" style="max-width: 500px;">
                <div style="position: sticky; top: 0; background: #fff; border-radius: 24px 24px 0 0; z-index: 10;">
                    <h3>📋 Kuesioner Negosiasi</h3>
                    <div class="modal-subtitle">Isi data kuesioner di bawah ini. Simpan akan menambah deadline +5 hari</div>
                    <div style="padding: 0 20px 12px;">
                        <div style="background: #e5e7eb; border-radius: 10px; height: 6px; overflow: hidden;">
                            <div style="width: ${(filledFields.length / fields.length) * 100}%; height: 100%; background: #10b981; border-radius: 10px; transition: width 0.3s;"></div>
                        </div>
                        <small>Kelengkapan data: ${Math.round((filledFields.length / fields.length) * 100)}% (${filledFields.length}/${fields.length})</small>
                    </div>
                </div>
                <div style="padding: 20px;">
                    <div class="form-group"><label>Aplikasi yang dipakai? <span class="required">*</span></label><input type="text" id="negosiasi_aplikasi" placeholder="Contoh: GNP, BSB, BTN" value="${escapeHtml(negosiasiData.aplikasi || '')}"></div>
                    <div class="form-group"><label>Domisili dimana? <span class="required">*</span></label><input type="text" id="negosiasi_domisili" placeholder="Kota/Kabupaten" value="${escapeHtml(negosiasiData.domisili || '')}"></div>
                    <div class="form-group"><label>Total transaksi per bulan? <span class="required">*</span></label><input type="text" id="negosiasi_transaksi" placeholder="Nominal" value="${escapeHtml(negosiasiData.transaksi || '')}"></div>
                    <div class="form-group"><label>Apakah deposit atau saldo pinjaman? <span class="required">*</span></label><input type="text" id="negosiasi_deposit" placeholder="Deposit / Saldo Pinjaman" value="${escapeHtml(negosiasiData.deposit || '')}"></div>
                    <div class="form-group"><label>Apakah tertarik dengan penawaran kamu? <span class="required">*</span></label>
                        <select id="negosiasi_tertarik">
                            <option value="">Pilih</option>
                            <option value="Ya" ${negosiasiData.tertarik === 'Ya' ? 'selected' : ''}>Ya</option>
                            <option value="Tidak" ${negosiasiData.tertarik === 'Tidak' ? 'selected' : ''}>Tidak</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Penawaran apa yang diberikan? <span class="required">*</span></label><input type="text" id="negosiasi_penawaran" placeholder="Penawaran" value="${escapeHtml(negosiasiData.penawaran || '')}"></div>
                </div>
                <div class="modal-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="negosiasiTertarikBtn" class="btn-success" style="flex: 1; background: ${isComplete ? '#10b981' : '#9ca3af'}; cursor: ${isComplete ? 'pointer' : 'not-allowed'}; opacity: ${isComplete ? '1' : '0.6'};">⭐ Tertarik (+1 hari)</button>
                    <button id="negosiasiTidakTertarikBtn" class="btn-danger" style="flex: 1; background: ${isComplete ? '#ef4444' : '#9ca3af'}; cursor: ${isComplete ? 'pointer' : 'not-allowed'}; opacity: ${isComplete ? '1' : '0.6'};">❌ Tidak Tertarik</button>
                    <button id="negosiasiSimpanBtn" class="btn-primary" style="flex: 1;">💾 Simpan (+5 hari)</button>
                    <button id="negosiasiBatalBtn" class="btn-outline" style="flex: 1;">❌ Batal</button>
                </div>
            </div>
        `, () => closeDynamicModal(modal));
        
        function updateCompleteStatus() {
            const aplikasi = document.getElementById('negosiasi_aplikasi').value;
            const domisili = document.getElementById('negosiasi_domisili').value;
            const transaksi = document.getElementById('negosiasi_transaksi').value;
            const deposit = document.getElementById('negosiasi_deposit').value;
            const tertarik = document.getElementById('negosiasi_tertarik').value;
            const penawaran = document.getElementById('negosiasi_penawaran').value;
            
            const filled = [aplikasi, domisili, transaksi, deposit, tertarik, penawaran].filter(v => v && v !== '').length;
            const newIsComplete = filled === 6;
            
            const tertarikBtn = document.getElementById('negosiasiTertarikBtn');
            const tidakTertarikBtn = document.getElementById('negosiasiTidakTertarikBtn');
            
            if (tertarikBtn) {
                if (newIsComplete) {
                    tertarikBtn.disabled = false;
                    tertarikBtn.style.background = '#10b981';
                    tertarikBtn.style.opacity = '1';
                    tertarikBtn.style.cursor = 'pointer';
                    tidakTertarikBtn.disabled = false;
                    tidakTertarikBtn.style.background = '#ef4444';
                    tidakTertarikBtn.style.opacity = '1';
                    tidakTertarikBtn.style.cursor = 'pointer';
                } else {
                    tertarikBtn.disabled = true;
                    tertarikBtn.style.background = '#9ca3af';
                    tertarikBtn.style.opacity = '0.6';
                    tertarikBtn.style.cursor = 'not-allowed';
                    tidakTertarikBtn.disabled = true;
                    tidakTertarikBtn.style.background = '#9ca3af';
                    tidakTertarikBtn.style.opacity = '0.6';
                    tidakTertarikBtn.style.cursor = 'not-allowed';
                }
            }
        }
        
        const inputs = ['negosiasi_aplikasi', 'negosiasi_domisili', 'negosiasi_transaksi', 'negosiasi_deposit', 'negosiasi_tertarik', 'negosiasi_penawaran'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', updateCompleteStatus);
            if (el && el.tagName === 'SELECT') el.addEventListener('change', updateCompleteStatus);
        });
        updateCompleteStatus();
        
        document.getElementById('negosiasiTertarikBtn').onclick = async () => {
            const btn = document.getElementById('negosiasiTertarikBtn');
            if (btn.disabled) {
                showNotifTop('⚠️ Harap lengkapi semua data kuesioner terlebih dahulu!', true);
                return;
            }
            
            const aplikasi = document.getElementById('negosiasi_aplikasi').value;
            const domisili = document.getElementById('negosiasi_domisili').value;
            const transaksi = document.getElementById('negosiasi_transaksi').value;
            const deposit = document.getElementById('negosiasi_deposit').value;
            const tertarik = document.getElementById('negosiasi_tertarik').value;
            const penawaran = document.getElementById('negosiasi_penawaran').value;
            
            if (!confirm('Apakah Anda yakin prospek ini TERTARIK?\n\nData akan dipindahkan ke status TERTARIK dengan +1 hari deadline.')) return;
            
            const negosiasi_data = {
                aplikasi, domisili, transaksi, deposit, tertarik, penawaran,
                timestamp: new Date().toISOString(),
                is_complete: true
            };
            
            const currentDeadline = data.deadline || getTodayDate();
            const newDeadline = addDaysToDate(currentDeadline, 1);
            
            await window.db.from('prospek').update({
                status: 'Tertarik',
                negosiasi_data: negosiasi_data,
                deadline: newDeadline,
                updated_at: new Date().toISOString()
            }).eq('id', currentProspekId);
            
            showNotifTop(`✅ Prospek dipindahkan ke status TERTARIK. Deadline +1 hari menjadi ${newDeadline}`);
            closeDynamicModal(modal);
            await loadProspek();
            closeModal('detailModal');
        };
        
        document.getElementById('negosiasiTidakTertarikBtn').onclick = async () => {
            const btn = document.getElementById('negosiasiTidakTertarikBtn');
            if (btn.disabled) {
                showNotifTop('⚠️ Harap lengkapi semua data kuesioner terlebih dahulu!', true);
                return;
            }
            
            const aplikasi = document.getElementById('negosiasi_aplikasi').value;
            const domisili = document.getElementById('negosiasi_domisili').value;
            const transaksi = document.getElementById('negosiasi_transaksi').value;
            const deposit = document.getElementById('negosiasi_deposit').value;
            const tertarik = document.getElementById('negosiasi_tertarik').value;
            const penawaran = document.getElementById('negosiasi_penawaran').value;
            
            if (!confirm('⚠️ PERINGATAN!\n\nData akan dipindahkan ke DATABASE TIDAK TERTARIK.\n\nData yang sudah dipindahkan TIDAK BISA dikembalikan ke Prospek Agen!\n\nLanjutkan?')) return;
            
            const { data: doc } = await window.db.from('prospek').select('*').eq('id', currentProspekId).single();
            
            await window.db.from('db_tidak_tertarik').insert({
                nama: doc.nama,
                hp: doc.hp,
                tanggal: new Date().toISOString(),
                user_id: doc.user_id,
                alasan: 'Tidak tertarik setelah negosiasi',
                status_sebelumnya: doc.status,
                negosiasi_data: {
                    aplikasi, domisili, transaksi, deposit, tertarik, penawaran,
                    timestamp: new Date().toISOString()
                }
            });
            
            await window.db.from('prospek').delete().eq('id', currentProspekId);
            
            showNotifTop('📵 Data dipindahkan ke Database Tidak Tertarik');
            closeDynamicModal(modal);
            await loadProspek();
            await loadDBTidak();
            closeModal('detailModal');
        };
        
        document.getElementById('negosiasiSimpanBtn').onclick = async () => {
            const aplikasi = document.getElementById('negosiasi_aplikasi').value;
            const domisili = document.getElementById('negosiasi_domisili').value;
            const transaksi = document.getElementById('negosiasi_transaksi').value;
            const deposit = document.getElementById('negosiasi_deposit').value;
            const tertarik = document.getElementById('negosiasi_tertarik').value;
            const penawaran = document.getElementById('negosiasi_penawaran').value;
            
            const hasAnyData = aplikasi || domisili || transaksi || deposit || tertarik || penawaran;
            if (!hasAnyData) {
                showNotifTop('⚠️ Tidak ada data untuk disimpan!', true);
                return;
            }
            
            const existingData = data.negosiasi_data || {};
            const hasChanges = aplikasi !== (existingData.aplikasi || '') ||
                domisili !== (existingData.domisili || '') ||
                transaksi !== (existingData.transaksi || '') ||
                deposit !== (existingData.deposit || '') ||
                tertarik !== (existingData.tertarik || '') ||
                penawaran !== (existingData.penawaran || '');
            
            if (!hasChanges) {
                showNotifTop('⚠️ Tidak ada perubahan data!', true);
                return;
            }
            
            const negosiasi_data = {
                aplikasi: aplikasi || '',
                domisili: domisili || '',
                transaksi: transaksi || '',
                deposit: deposit || '',
                tertarik: tertarik || '',
                penawaran: penawaran || '',
                timestamp: new Date().toISOString(),
                is_complete: !!(aplikasi && domisili && transaksi && deposit && tertarik && penawaran)
            };
            
            const currentDeadline = data.deadline || getTodayDate();
            const newDeadline = addDaysToDate(currentDeadline, 5);
            
            await window.db.from('prospek').update({
                negosiasi_data: negosiasi_data,
                deadline: newDeadline,
                updated_at: new Date().toISOString()
            }).eq('id', currentProspekId);
            
            showNotifTop(`💾 Data kuesioner berhasil disimpan. Deadline +5 hari menjadi ${newDeadline}`);
            closeDynamicModal(modal);
            await loadProspek();
            closeModal('detailModal');
        };
        
        document.getElementById('negosiasiBatalBtn').onclick = () => closeDynamicModal(modal);
    });
}

// ========== CONFIRM CLOSING TO DB ==========
function confirmClosingToDB(id) {
    const modal = createModalWithHighZIndex(`
        <div class="modal-content" style="max-width: 400px;">
            <h3>📋 Pindahkan ke Database Closing</h3>
            <div class="modal-subtitle">Data customer akan dipindahkan ke Database Closing</div>
            <div style="padding: 20px;">
                <p style="margin-bottom: 16px;">Apakah Anda yakin ingin memindahkan customer ini ke <strong>DATABASE CLOSING</strong>?</p>
                <div class="warning-box" style="margin-bottom: 16px;">
                    ⚠️ <strong>Peringatan:</strong> Data yang sudah dipindahkan TIDAK BISA dikembalikan ke Followup Agen!
                </div>
                <div class="form-group">
                    <label>Catatan Closing (Opsional)</label>
                    <textarea id="closingNote" rows="3" placeholder="Contoh: Berhasil closing dengan produk A..." style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;"></textarea>
                </div>
            </div>
            <div class="modal-buttons">
                <button id="confirmClosingToDBBtn" class="btn-primary">✅ Ya, Pindahkan ke Closing</button>
                <button id="cancelClosingToDBBtn" class="btn-outline">❌ Batal</button>
            </div>
        </div>
    `, () => closeDynamicModal(modal));
    
    document.getElementById('confirmClosingToDBBtn').onclick = async () => {
        const note = document.getElementById('closingNote').value;
        const { data: doc } = await window.db.from('customers').select('*').eq('id', id).single();
        if (doc) {
            await window.db.from('db_closing').insert({
                nama: doc.nama,
                hp: doc.hp,
                closing_date: new Date().toISOString(),
                closing_note: note,
                user_id: doc.user_id,
                followup_data: doc.followup_data || null,
                pending_data: doc.pending_data || []
            });
            await window.db.from('customers').delete().eq('id', id);
            showNotifTop('✅ Data berhasil dipindahkan ke Database Closing!');
            closeDynamicModal(modal);
            await loadCustomers();
            await loadDBClosing();
            closeModal('detailModal');
        }
    };
    
    document.getElementById('cancelClosingToDBBtn').onclick = () => closeDynamicModal(modal);
}

// ========== CONFIRM TERTARIK TO DB (JADIKAN MEMBER BARU) ==========
function confirmTertarikToDB(prospekId) {
    const modal = createModalWithHighZIndex(`
        <div class="modal-content" style="max-width: 400px;">
            <h3>⭐ Jadikan Member Baru</h3>
            <div class="modal-subtitle">Data akan dipindahkan ke DB Commitment dan masuk ke Followup Agen sebagai NEW Member</div>
            <div style="padding: 20px;">
                <p style="margin-bottom: 16px;">Apakah Anda yakin ingin menjadikan prospek ini sebagai <strong>MEMBER BARU</strong>?</p>
                <div class="warning-box" style="margin-bottom: 16px;">
                    ⚠️ <strong>Peringatan:</strong> Data akan dipindahkan ke DB Commitment dan masuk ke Followup Agen dengan status NEW Member!
                </div>
                <div class="form-group">
                    <label>ID Agent <span class="required">*</span></label>
                    <input type="text" id="newMemberAgentId" placeholder="Contoh: AG-001" maxlength="17" style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">
                </div>
                <div class="form-group">
                    <label>Aplikasi <span class="required">*</span></label>
                    <select id="newMemberAplikasi" style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">
                        <option value="">Pilih Aplikasi</option>
                        <option value="GNP">GNP</option>
                        <option value="BSB">BSB</option>
                        <option value="BTN">BTN</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tanggal Followup</label>
                    <input type="date" id="newMemberFollowupDate" value="${getTodayDate()}" style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">
                </div>
            </div>
            <div class="modal-buttons">
                <button id="confirmNewMemberBtn" class="btn-primary">✅ Konfirmasi Jadikan Member</button>
                <button id="cancelNewMemberBtn" class="btn-outline">❌ Batal</button>
            </div>
        </div>
    `, () => closeDynamicModal(modal));
    
    document.getElementById('confirmNewMemberBtn').onclick = async () => {
        const agentId = document.getElementById('newMemberAgentId').value;
        const aplikasi = document.getElementById('newMemberAplikasi').value;
        const followupDate = document.getElementById('newMemberFollowupDate').value;
        
        if (!agentId || !aplikasi) {
            showNotifTop('⚠️ ID Agent dan Aplikasi wajib diisi!', true);
            return;
        }
        
        const formattedAgentId = formatAgentIdToUpper(agentId);
        if (!validateAgentId(formattedAgentId)) {
            showNotifTop('⚠️ ID Agent hanya boleh huruf besar, angka, dan tanda hubung (max 17 karakter)!', true);
            return;
        }
        
        const { data: prospekDoc } = await window.db.from('prospek').select('*').eq('id', prospekId).single();
        const data = prospekDoc;
        
        const { data: existing } = await window.db.from('customers').select('id').eq('agent_id', formattedAgentId).maybeSingle();
        if (existing) {
            showNotifTop(`⚠️ ID Agent "${formattedAgentId}" sudah terdaftar di Followup Agen!`, true);
            return;
        }
        
        // Simpan ke DB Commitment
        await window.db.from('db_commitment').insert({
            nama: data.nama,
            hp: data.hp,
            negosiasi_data: data.negosiasi_data || null,
            agent_id: formattedAgentId,
            aplikasi: aplikasi,
            committed_at: new Date().toISOString(),
            user_id: data.user_id,
            original_prospek_id: prospekId
        });
        
        // Masuk ke Followup Agen sebagai NEW Member
        await window.db.from('customers').insert({
            agent_id: formattedAgentId,
            nama: data.nama,
            hp: data.hp,
            apk: aplikasi,
            tanggal: followupDate,
            status: 'baru',
            user_id: data.user_id,
            created_at: new Date().toISOString(),
            converted_from: 'prospek_new_member',
            is_new_member: true
        });
        
        // Hapus dari Prospek
        await window.db.from('prospek').delete().eq('id', prospekId);
        
        showNotifTop('✅ Berhasil! Member baru telah ditambahkan ke Followup Agen dan DB Commitment');
        closeDynamicModal(modal);
        await loadCustomers();
        await loadProspek();
        await loadDBCommitment();
        closeModal('detailModal');
    };
    
    document.getElementById('cancelNewMemberBtn').onclick = () => closeDynamicModal(modal);
}

// ========== BROADCAST FUNCTIONS ==========
async function loadBroadcastNumbers() {
    if (!currentUser) return;
    
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
        statusValues = ['baru', 'followup', 'pending', 'closing'];
    } else if (sourceType === 'prospek') {
        collection = 'prospek';
        statusValues = ['Baru', 'Dihubungi', 'Negosiasi', 'Tertarik'];
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
    
    const numbers = (data || []).filter(item => item.hp && item.hp !== '+62').map(item => ({
        hp: item.hp,
        nama: item.nama || 'Customer'
    }));
    
    currentNumbers = numbers;
    document.getElementById('numberCount').innerText = currentNumbers.length;
    document.getElementById('numbersList').innerHTML = currentNumbers.map(item => 
        `<div class="number-item">👤 ${escapeHtml(item.nama)}<br>📞 ${escapeHtml(item.hp)}</div>`
    ).join('');
}

async function sendBroadcast() {
    const messageTemplate = document.getElementById('broadcastMessage')?.value;
    const sendOneByOne = document.getElementById('sendOneByOne')?.checked;
    
    if (!messageTemplate) {
        showNotifTop('⚠️ Pesan tidak boleh kosong!', true);
        return;
    }
    
    if (currentNumbers.length === 0) {
        showNotifTop('⚠️ Tidak ada nomor tujuan!', true);
        return;
    }
    
    for (const item of currentNumbers) {
        let hp = item.hp || '';
        let nama = item.nama || '';
        const message = messageTemplate.replace(/{nama}/g, nama || 'Customer');
        const nomor = hp.toString().replace('+', '').replace(/^0/, '62').replace(/[^\d]/g, '');
        window.open('https://wa.me/' + nomor + '?text=' + encodeURIComponent(message), '_blank');
        if (sendOneByOne) await delay(500);
    }
    
    showNotifTop(`✅ Broadcast selesai! ${currentNumbers.length} pesan telah dibuka.`);
}

// ========== UPLINE BROADCAST FUNCTIONS ==========
async function loadUplineNumbers() {
    if (!currentUser) return;
    
    const sourceType = document.querySelector('input[name="uplineSourceType"]:checked')?.value || 'transaksi';
    
    if (sourceType === 'custom') {
        const customNumbers = document.getElementById('uplineCustomNumbers')?.value || '';
        const numbers = customNumbers.split('\n').filter(n => n.trim());
        const listDiv = document.getElementById('uplineNumbersList');
        const countSpan = document.getElementById('uplineCount');
        
        if (listDiv) {
            if (numbers.length === 0) {
                listDiv.innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Masukkan nomor tujuan!</p>';
            } else {
                listDiv.innerHTML = numbers.map(num => `<div class="number-item">📞 ${escapeHtml(num.trim())}</div>`).join('');
            }
        }
        if (countSpan) countSpan.innerText = numbers.length;
        uplineNumbers = numbers;
        return;
    }
    
    let collection = '';
    let statusValues = [];
    
    if (sourceType === 'transaksi') {
        collection = 'db_transaksi';
    } else if (sourceType === 'customer') {
        collection = 'customers';
        statusValues = Array.from(document.querySelectorAll('#uplineCustomerFilter input:checked')).map(cb => cb.value);
    }
    
    if (!collection) {
        showNotifTop('⚠️ Sumber tidak valid!', true);
        return;
    }
    
    if (sourceType === 'customer' && statusValues.length === 0) {
        showNotifTop('⚠️ Pilih minimal satu status!', true);
        return;
    }
    
    showNotifTop('⏳ Mengelompokkan data berdasarkan Upline...');
    
    let query = window.db.from(collection).select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    query = query.limit(2000);
    
    if (statusValues.length > 0) {
        query = query.in('status', statusValues);
    }
    
    const { data, error } = await query;
    if (error) {
        showNotifTop('❌ Gagal memuat data: ' + error.message, true);
        return;
    }
    
    const listDiv = document.getElementById('uplineNumbersList');
    const countSpan = document.getElementById('uplineCount');
    
    if (!data || data.length === 0) {
        if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Tidak ada data dengan filter yang dipilih.</p>';
        if (countSpan) countSpan.innerText = '0';
        return;
    }
    
    const uplineMap = new Map();
    
    for (const item of data) {
        const uplinePhone = item.upline_phone || '';
        const uplineName = item.upline_name || 'Tidak ada upline';
        
        if (!uplinePhone || uplinePhone === '+62' || uplinePhone === '62' || uplinePhone === '' || uplinePhone === '0') {
            continue;
        }
        
        if (!uplineMap.has(uplinePhone)) {
            uplineMap.set(uplinePhone, {
                upline_phone: uplinePhone,
                upline_name: uplineName,
                agents: []
            });
        }
        
        uplineMap.get(uplinePhone).agents.push({
            agent_id: item.agent_id || '-',
            nama: item.nama || '-',
            hp: item.hp || '-'
        });
    }
    
    uplineDataList = Array.from(uplineMap.values());
    
    if (listDiv) {
        if (uplineDataList.length === 0) {
            listDiv.innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Tidak ada data upline yang ditemukan!</p>';
            if (countSpan) countSpan.innerText = '0';
        } else {
            const totalAgent = uplineDataList.reduce((sum, u) => sum + u.agents.length, 0);
            if (countSpan) countSpan.innerText = uplineDataList.length;
            
            listDiv.innerHTML = `
                <div style="background: #eef2ff; padding: 10px; border-radius: 8px; margin-bottom: 12px;">
                    <strong>📊 Ringkasan:</strong><br>
                    Upline: ${uplineDataList.length} | Total Agent: ${totalAgent}
                </div>
                ${uplineDataList.map(upline => `
                    <div class="number-item upline-item" style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
                        <div style="font-weight: 600; color: #8b5cf6;">👤 ${escapeHtml(upline.upline_name)}</div>
                        <div style="font-size: 11px; color: #6b7280;">📞 ${escapeHtml(upline.upline_phone)}</div>
                        <div style="font-size: 11px; margin-top: 6px; background: #f3f4f6; padding: 8px; border-radius: 8px;">
                            <strong>📋 Agent (${upline.agents.length}):</strong><br>
                            ${upline.agents.slice(0, 5).map(agent => 
                                `🆔 ${escapeHtml(agent.agent_id)} - ${escapeHtml(agent.nama)}`
                            ).join('<br>')}
                            ${upline.agents.length > 5 ? `<br>... dan ${upline.agents.length - 5} agent lainnya` : ''}
                        </div>
                    </div>
                `).join('')}
            `;
        }
    }
    
    showNotifTop(`✅ Ditemukan ${uplineDataList.length} Upline`);
}

async function sendUplineBroadcast() {
    const messageTemplate = document.getElementById('uplineBroadcastMessage')?.value;
    const sendOneByOne = document.getElementById('uplineSendOneByOne')?.checked;
    const sourceType = document.querySelector('input[name="uplineSourceType"]:checked')?.value || 'transaksi';
    
    if (!messageTemplate) {
        showNotifTop('⚠️ Pesan tidak boleh kosong!', true);
        return;
    }
    
    let targets = [];
    
    if (sourceType === 'custom') {
        targets = uplineNumbers;
    } else {
        if (uplineDataList.length === 0) {
            showNotifTop('⚠️ Tidak ada data upline! Klik "Refresh Data Upline" terlebih dahulu.', true);
            return;
        }
        targets = uplineDataList;
    }
    
    if (targets.length === 0) {
        showNotifTop('⚠️ Tidak ada target upline!', true);
        return;
    }
    
    if (!confirm(`⭐ KIRIM BROADCAST KE UPLINE\n\nTarget: ${targets.length} upline\n\nKlik OK untuk melanjutkan.`)) {
        return;
    }
    
    for (const target of targets) {
        let message = messageTemplate;
        let nomor = '';
        let nama = '';
        
        if (sourceType === 'custom') {
            nomor = target;
            nama = 'Upline';
            message = message.replace(/{nama_upline}/g, nama);
            message = message.replace(/{total_agent}/g, '?');
            message = message.replace(/{tabel_agent}/g, 'Data tidak tersedia');
        } else {
            nomor = target.upline_phone;
            nama = target.upline_name;
            message = message.replace(/{nama_upline}/g, target.upline_name);
            message = message.replace(/{total_agent}/g, target.agents.length);
            
            let tableText = '';
            for (let j = 0; j < target.agents.length; j++) {
                const agent = target.agents[j];
                const nomorUrut = j + 1;
                tableText += `${nomorUrut}. ${agent.nama} (${agent.agent_id})\n`;
            }
            message = message.replace(/{tabel_agent}/g, tableText);
        }
        
        let cleanNomor = nomor.toString().replace(/[^\d+]/g, '');
        if (!cleanNomor.startsWith('+')) {
            cleanNomor = cleanNomor.replace(/^0+/, '');
            if (cleanNomor.startsWith('62')) cleanNomor = '+' + cleanNomor;
            else cleanNomor = '+62' + cleanNomor;
        }
        const finalNomor = cleanNomor.replace(/[^\d]/g, '');
        
        window.open('https://wa.me/' + finalNomor + '?text=' + encodeURIComponent(message), '_blank');
        if (sendOneByOne) await delay(800);
    }
    
    showNotifTop(`✅ Broadcast ke Upline selesai! Dikirim ke ${targets.length} upline`);
}

// ========== TARGET KPI FUNCTIONS ==========
async function loadTargetData() {
    if (!currentUser) return;
    
    const { data, error } = await window.db.from('settings').select('*').eq('key', 'targetKPI').maybeSingle();
    if (data && data.value) {
        targetData = data.value;
    } else {
        targetData = { agent: 10, ca: 20, koordinator: 5, transaksi: 100, monthlyTargets: [] };
    }
    await updateTargetDisplay();
}

async function updateTargetDisplay() {
    const currentAgent = agentsData.filter(a => a.agent_type === 'AGENT').length;
    const currentKoor = agentsData.filter(a => a.agent_type === 'Koordinator Wilayah (KORWIL)' || a.agent_type === 'SUB KORWIL').length;
    const currentCA = agentsData.filter(a => a.agent_type === 'CollectingAgent (CA)' || a.agent_type === 'SUB CA').length;
    
    let currentTransaksi = 0;
    transaksiData.forEach(t => {
        if (t.progres_jenis === 'naik') currentTransaksi += Math.abs(t.progres_jumlah || 0);
        else if (t.progres_jenis === 'turun') currentTransaksi -= Math.abs(t.progres_jumlah || 0);
        else currentTransaksi += (t.progres_jumlah || 0);
    });
    
    document.getElementById('targetAgentValue').innerText = targetData.agent || 0;
    document.getElementById('targetKoorValue').innerText = targetData.koordinator || 0;
    document.getElementById('targetCAValue').innerText = targetData.ca || 0;
    document.getElementById('targetTransaksiValue').innerText = (targetData.transaksi || 0).toLocaleString();
    
    document.getElementById('targetAgentReached').innerText = currentAgent;
    document.getElementById('targetKoorReached').innerText = currentKoor;
    document.getElementById('targetCAReached').innerText = currentCA;
    document.getElementById('targetTransaksiReached').innerText = currentTransaksi.toLocaleString();
    
    const agentPercent = targetData.agent ? Math.min((currentAgent / targetData.agent) * 100, 100) : 0;
    const koorPercent = targetData.koordinator ? Math.min((currentKoor / targetData.koordinator) * 100, 100) : 0;
    const caPercent = targetData.ca ? Math.min((currentCA / targetData.ca) * 100, 100) : 0;
    const transaksiPercent = targetData.transaksi ? Math.min((currentTransaksi / targetData.transaksi) * 100, 100) : 0;
    
    document.getElementById('targetAgentProgress').style.width = agentPercent + '%';
    document.getElementById('targetKoorProgress').style.width = koorPercent + '%';
    document.getElementById('targetCAProgress').style.width = caPercent + '%';
    document.getElementById('targetTransaksiProgress').style.width = transaksiPercent + '%';
    
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
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Persentase (%)' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.raw.toFixed(1)}%`
                    }
                }
            }
        }
    });
}

function updateTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    if (trendChart) trendChart.destroy();
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentMonth = new Date().getMonth();
    
    const agentData = [];
    const caData = [];
    const koorData = [];
    
    for (let i = 0; i <= currentMonth; i++) {
        const monthlyTarget = targetData.monthlyTargets?.find(m => parseInt(m.month?.split('-')[1]) === i + 1);
        agentData.push(monthlyTarget?.target_agent || Math.floor(Math.random() * 10) + 1);
        caData.push(monthlyTarget?.target_ca || Math.floor(Math.random() * 20) + 5);
        koorData.push(monthlyTarget?.target_koor || Math.floor(Math.random() * 5) + 1);
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.slice(0, currentMonth + 1),
            datasets: [
                { label: 'Target Agent', data: agentData, borderColor: '#667eea', backgroundColor: 'transparent', tension: 0.4, fill: false },
                { label: 'Target CA', data: caData, borderColor: '#f093fb', backgroundColor: 'transparent', tension: 0.4, fill: false },
                { label: 'Target Koordinator', data: koorData, borderColor: '#4facfe', backgroundColor: 'transparent', tension: 0.4, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 10 } } }
            }
        }
    });
}

async function saveTargetData() {
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

// ========== SEARCH FUNCTIONS ==========
async function performSearch() {
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!keyword) {
        showNotifTop('⚠️ Masukkan kata kunci pencarian!', true);
        return;
    }
    
    const searchCustomer = document.getElementById('searchCustomer')?.checked || false;
    const searchProspek = document.getElementById('searchProspek')?.checked || false;
    const searchClosing = document.getElementById('searchClosing')?.checked || false;
    const searchTidak = document.getElementById('searchTidak')?.checked || false;
    const searchNomorSalah = document.getElementById('searchNomorSalah')?.checked || false;
    const searchCommitment = document.getElementById('searchCommitment')?.checked || false;
    
    const results = [];
    
    if (searchCustomer) {
        customersData.forEach(item => {
            if (item.nama?.toLowerCase().includes(keyword) || item.hp?.includes(keyword) || item.agent_id?.toLowerCase().includes(keyword)) {
                results.push({ id: item.id, type: 'customer', title: item.nama, subtitle: item.hp, badge: 'Followup Agen', badgeClass: 'badge-customer' });
            }
        });
    }
    
    if (searchProspek) {
        prospekData.forEach(item => {
            if (item.nama?.toLowerCase().includes(keyword) || item.hp?.includes(keyword)) {
                results.push({ id: item.id, type: 'prospek', title: item.nama, subtitle: item.hp, badge: 'Prospek Agen', badgeClass: 'badge-prospek' });
            }
        });
    }
    
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
            <span class="search-result-badge ${result.badgeClass}">${result.badge}</span>
        </div>
    `).join('');
    
    document.querySelectorAll('.search-result-item').forEach(el => {
        el.onclick = () => {
            const id = el.dataset.id;
            const type = el.dataset.type;
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

function openDBDetailModal(id, type) {
    let collectionName = '';
    let title = '';
    
    switch (type) {
        case 'closing':
            collectionName = 'db_closing';
            title = 'Detail Database Closing';
            break;
        case 'tidak':
            collectionName = 'db_tidak_tertarik';
            title = 'Detail Database Tidak Tertarik';
            break;
        case 'nomor_salah':
            collectionName = 'nomor_salah';
            title = 'Detail Database Nomor Salah';
            break;
        case 'commitment':
            collectionName = 'db_commitment';
            title = 'Detail Database Commitment';
            break;
        default:
            return;
    }
    
    window.db.from(collectionName).select('*').eq('id', id).single().then(async ({ data: d }) => {
        if (!d) return;
        
        let ownerInfo = '';
        if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
            const { data: userDoc } = await window.db.from('users').select('nama').eq('id', d.user_id).single();
            const ownerName = userDoc?.nama || 'CS Agent';
            ownerInfo = `<div class="detail-info-item"><strong>👤 Pemilik Data:</strong> ${escapeHtml(ownerName)}</div>`;
        }
        
        let detailHtml = '';
        if (type === 'closing') {
            let pendingHtml = '';
            if (d.pending_data && d.pending_data.length > 0) {
                pendingHtml = `<div class="detail-info-item"><strong>📝 Pending Responses:</strong><br><div style="margin-top:5px; padding-left:15px;">${d.pending_data.map(item => `${item.checked ? '✅' : '⭕'} ${escapeHtml(item.text || '(kosong)')}`).join('<br>')}</div></div>`;
            }
            detailHtml = `${ownerInfo}
                <div class="detail-info-item"><strong>👤 Nama:</strong> ${escapeHtml(d.nama)}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(d.hp)}</div>
                <div class="detail-info-item"><strong>📅 Tanggal Closing:</strong> ${new Date(d.closing_date).toLocaleDateString('id-ID')}</div>
                ${pendingHtml}`;
        } else if (type === 'tidak') {
            detailHtml = `${ownerInfo}
                <div class="detail-info-item"><strong>👤 Nama:</strong> ${escapeHtml(d.nama)}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(d.hp)}</div>
                <div class="detail-info-item"><strong>📅 Tanggal:</strong> ${new Date(d.tanggal).toLocaleDateString('id-ID')}</div>
                <div class="detail-info-item"><strong>❌ Alasan:</strong> ${d.alasan || 'Tidak tertarik'}</div>`;
        } else if (type === 'nomor_salah') {
            detailHtml = `${ownerInfo}
                <div class="detail-info-item"><strong>👤 Nama:</strong> ${escapeHtml(d.nama)}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(d.hp)}</div>
                <div class="detail-info-item"><strong>📅 Tanggal Dihapus:</strong> ${new Date(d.deleted_at).toLocaleDateString('id-ID')}</div>
                <div class="detail-info-item"><strong>📵 Alasan:</strong> ${d.alasan || 'Nomor tidak bisa dihubungi'}</div>`;
        } else if (type === 'commitment') {
            detailHtml = `${ownerInfo}
                <div class="detail-info-item"><strong>👤 Nama:</strong> ${escapeHtml(d.nama)}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(d.hp)}</div>
                <div class="detail-info-item"><strong>📅 Tanggal Komitmen:</strong> ${new Date(d.committed_at).toLocaleDateString('id-ID')}</div>
                <div class="detail-info-item"><strong>🆔 ID Agent:</strong> ${d.agent_id || '-'}</div>
                <div class="detail-info-item"><strong>📱 Aplikasi:</strong> ${d.aplikasi || '-'}</div>`;
        }
        
        document.getElementById('detailContent').innerHTML = `
            <div class="detail-header">
                <h3>${title}</h3>
                <div class="status-badge">Arsip</div>
            </div>
            <div class="detail-body">
                <div class="detail-info">${detailHtml}</div>
                <div class="detail-actions">
                    <button class="btn-success" onclick="openWA('${d.hp}')">💬 WhatsApp</button>
                </div>
            </div>
            <div class="detail-footer">
                <button class="btn-outline" onclick="closeModal('detailModal')">Tutup</button>
                <button class="btn-danger" onclick="deleteDBItem('${collectionName}', '${id}'); closeModal('detailModal');">🗑️ Hapus</button>
            </div>
        `;
        showModal('detailModal');
    });
}

// ========== DELETE FUNCTIONS ==========
async function deleteSelectedDBItems(collection, selectedMap, loadFunction) {
    const selectedIds = Array.from(selectedMap.keys());
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang dipilih', true);
        return;
    }
    
    if (!confirm(`Hapus ${selectedIds.length} data?`)) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus', selectedIds.length);
    let deleted = 0;
    
    for (const id of selectedIds) {
        try {
            await window.db.from(collection).delete().eq('id', id);
            selectedMap.delete(id);
            deleted++;
            progress.update(Math.floor((deleted / selectedIds.length) * 100), 'Menghapus', `Memproses...`, deleted, selectedIds.length);
            await delay(30);
        } catch (e) {
            console.error(`Gagal hapus ${id}:`, e);
        }
    }
    
    progress.update(100, 'Selesai', `Berhasil menghapus ${deleted} data`, deleted, selectedIds.length);
    showNotifTop(`✅ ${deleted} data berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    if (loadFunction) await loadFunction();
}

async function deleteAllDBItems(collection, loadFunction) {
    if (!confirm(`⚠️ Hapus SEMUA data dari ${collection}? Tidak bisa dibatalkan!`)) return;
    
    let query = window.db.from(collection).select('id');
    if (currentUserRole !== 'owner' && collection !== 'users') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query;
    if (error) {
        showNotifTop('❌ Gagal: ' + error.message, true);
        return;
    }
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua', data.length);
    let deleted = 0;
    
    for (const item of data) {
        try {
            await window.db.from(collection).delete().eq('id', item.id);
            deleted++;
            progress.update(Math.floor((deleted / data.length) * 100), 'Menghapus', `Memproses...`, deleted, data.length);
            await delay(20);
        } catch (e) {
            console.error('Gagal hapus:', e);
        }
    }
    
    progress.update(100, 'Selesai', `Berhasil menghapus ${deleted} data`, deleted, data.length);
    showNotifTop(`✅ ${deleted} data berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    if (loadFunction) await loadFunction();
}

async function deleteDBItem(collection, id) {
    if (!confirm('Yakin hapus data ini?')) return;
    
    await window.db.from(collection).delete().eq('id', id);
    showNotifTop('🗑️ Data berhasil dihapus');
    
    if (collection === 'db_closing') await loadDBClosing();
    else if (collection === 'db_tidak_tertarik') await loadDBTidak();
    else if (collection === 'nomor_salah') await loadDBNomorSalah();
    else if (collection === 'db_commitment') await loadDBCommitment();
}

async function deleteSelectedProduk() {
    const selectedIds = Array.from(selectedProdukIds.keys());
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada produk yang dipilih', true);
        return;
    }
    
    if (!confirm(`Hapus ${selectedIds.length} produk yang dipilih?`)) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Produk', selectedIds.length);
    let deleted = 0;
    
    for (const id of selectedIds) {
        try {
            await window.db.from('produk').delete().eq('id', id);
            selectedProdukIds.delete(id);
            const index = produkData.findIndex(p => p.id === id);
            if (index !== -1) produkData.splice(index, 1);
            deleted++;
            progress.update(Math.floor((deleted / selectedIds.length) * 100), 'Menghapus', `Memproses...`, deleted, selectedIds.length);
            await delay(30);
        } catch (e) {
            console.error(`Gagal hapus ${id}:`, e);
        }
    }
    
    renderProdukList();
    progress.update(100, 'Selesai', `Berhasil menghapus ${selectedIds.length} produk`, selectedIds.length, selectedIds.length);
    showNotifTop(`✅ ${selectedIds.length} produk berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
}

async function deleteAllProduk() {
    if (!confirm('⚠️ Hapus SEMUA data Produk? Tidak bisa dibatalkan!')) return;
    
    const { data, error } = await window.db.from('produk').select('id');
    if (error) {
        showNotifTop('❌ Gagal: ' + error.message, true);
        return;
    }
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Produk', data.length);
    let deleted = 0;
    
    for (const item of data) {
        try {
            await window.db.from('produk').delete().eq('id', item.id);
            deleted++;
            progress.update(Math.floor((deleted / data.length) * 100), 'Menghapus', `Memproses...`, deleted, data.length);
            await delay(20);
        } catch (e) {
            console.error('Gagal hapus:', e);
        }
    }
    
    selectedProdukIds.clear();
    produkData = [];
    renderProdukList();
    progress.update(100, 'Selesai', `Berhasil menghapus ${deleted} data`, deleted, data.length);
    showNotifTop(`✅ ${deleted} data Produk berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
}

// ========== FULL MODE SELECTION ==========
function initFullModeSelection() {
    if (currentUserRole !== 'owner') {
        const followupSelectBtn = document.getElementById('selectAllFullFollowup');
        const followupDeleteBtn = document.getElementById('deleteSelectedFullFollowup');
        const followupDeleteAllBtn = document.getElementById('deleteAllFullFollowup');
        const prospekSelectBtn = document.getElementById('selectAllFullProspek');
        const prospekDeleteBtn = document.getElementById('deleteSelectedFullProspek');
        const prospekDeleteAllBtn = document.getElementById('deleteAllFullProspek');
        
        if (followupSelectBtn) followupSelectBtn.style.display = 'none';
        if (followupDeleteBtn) followupDeleteBtn.style.display = 'none';
        if (followupDeleteAllBtn) followupDeleteAllBtn.style.display = 'none';
        if (prospekSelectBtn) prospekSelectBtn.style.display = 'none';
        if (prospekDeleteBtn) prospekDeleteBtn.style.display = 'none';
        if (prospekDeleteAllBtn) prospekDeleteAllBtn.style.display = 'none';
        return;
    }
    
    const followupSelectBtn = document.getElementById('selectAllFullFollowup');
    const followupDeleteBtn = document.getElementById('deleteSelectedFullFollowup');
    const followupDeleteAllBtn = document.getElementById('deleteAllFullFollowup');
    const prospekSelectBtn = document.getElementById('selectAllFullProspek');
    const prospekDeleteBtn = document.getElementById('deleteSelectedFullProspek');
    const prospekDeleteAllBtn = document.getElementById('deleteAllFullProspek');
    
    if (followupSelectBtn) {
        followupSelectBtn.style.display = 'inline-block';
        followupSelectBtn.onclick = () => toggleSelectAllFullFollowup();
    }
    if (followupDeleteBtn) {
        followupDeleteBtn.style.display = 'inline-block';
        followupDeleteBtn.onclick = () => deleteSelectedFullFollowup();
    }
    if (followupDeleteAllBtn) {
        followupDeleteAllBtn.style.display = 'inline-block';
        followupDeleteAllBtn.onclick = () => deleteAllFullFollowup();
    }
    if (prospekSelectBtn) {
        prospekSelectBtn.style.display = 'inline-block';
        prospekSelectBtn.onclick = () => toggleSelectAllFullProspek();
    }
    if (prospekDeleteBtn) {
        prospekDeleteBtn.style.display = 'inline-block';
        prospekDeleteBtn.onclick = () => deleteSelectedFullProspek();
    }
    if (prospekDeleteAllBtn) {
        prospekDeleteAllBtn.style.display = 'inline-block';
        prospekDeleteAllBtn.onclick = () => deleteAllFullProspek();
    }
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
    
    if (!confirm(`Hapus ${selectedIds.length} data customer?`)) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Data', selectedIds.length);
    let deleted = 0;
    
    for (const id of selectedIds) {
        try {
            await window.db.from('customers').delete().eq('id', id);
            selectedFullFollowupIds.delete(id);
            deleted++;
            progress.update(Math.floor((deleted / selectedIds.length) * 100), 'Menghapus', `Memproses...`, deleted, selectedIds.length);
            await delay(30);
        } catch (e) {
            console.error(`Gagal hapus ${id}:`, e);
        }
    }
    
    progress.update(100, 'Selesai', `Berhasil menghapus ${deleted} data`, deleted, selectedIds.length);
    showNotifTop(`✅ ${deleted} data berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadCustomers();
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
            await window.db.from('prospek').delete().eq('id', id);
            selectedFullProspekIds.delete(id);
            deleted++;
            progress.update(Math.floor((deleted / selectedIds.length) * 100), 'Menghapus', `Memproses...`, deleted, selectedIds.length);
            await delay(30);
        } catch (e) {
            console.error(`Gagal hapus ${id}:`, e);
        }
    }
    
    progress.update(100, 'Selesai', `Berhasil menghapus ${deleted} data`, deleted, selectedIds.length);
    showNotifTop(`✅ ${deleted} data berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadProspek();
    renderFullProspekKanban();
}

async function deleteAllFullFollowup() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus semua data!', true);
        return;
    }
    
    if (!confirm('⚠️ PERINGATAN! Anda akan menghapus SEMUA data Followup Agen. Tidak bisa dibatalkan!')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Followup', 0);
    progress.update(0, 'Menghapus', 'Mengambil data...');
    
    let query = window.db.from('customers').select('id');
    if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
    
    const { data, error } = await query;
    if (error) {
        showNotifTop('❌ Gagal: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    for (const item of data) {
        try {
            await window.db.from('customers').delete().eq('id', item.id);
            deleted++;
            progress.update(Math.floor((deleted / totalData) * 100), 'Menghapus', `Memproses...`, deleted, totalData);
            await delay(20);
        } catch (e) {
            console.error('Gagal hapus:', e);
        }
    }
    
    selectedFullFollowupIds.clear();
    progress.update(100, 'Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Followup berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadCustomers();
    renderFullFollowupKanban();
}

async function deleteAllFullProspek() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus semua data!', true);
        return;
    }
    
    if (!confirm('⚠️ PERINGATAN! Anda akan menghapus SEMUA data Prospek Agen. Tidak bisa dibatalkan!')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Prospek', 0);
    progress.update(0, 'Menghapus', 'Mengambil data...');
    
    let query = window.db.from('prospek').select('id');
    if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
    
    const { data, error } = await query;
    if (error) {
        showNotifTop('❌ Gagal: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    for (const item of data) {
        try {
            await window.db.from('prospek').delete().eq('id', item.id);
            deleted++;
            progress.update(Math.floor((deleted / totalData) * 100), 'Menghapus', `Memproses...`, deleted, totalData);
            await delay(20);
        } catch (e) {
            console.error('Gagal hapus:', e);
        }
    }
    
    selectedFullProspekIds.clear();
    progress.update(100, 'Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Prospek berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadProspek();
    renderFullProspekKanban();
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
    
    let totalTercapai = 0;
    customersData.forEach(customer => {
        const progres = customer.progres_transaksi;
        if (progres && progres.total_tercapai !== undefined) {
            totalTercapai += progres.total_tercapai;
        }
    });
    
    const chartTitle = document.querySelector('#chartCustomer h3');
    if (chartTitle) {
        chartTitle.innerHTML = `📊 Followup Agen | 🎯 Total Tercapai: ${totalTercapai.toLocaleString()} Transaksi`;
    }
    
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
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            return `${label}: ${value} (${total ? ((value / total) * 100).toFixed(1) : 0}%)`;
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
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            return `${label}: ${value} (${total ? ((value / total) * 100).toFixed(1) : 0}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ========== BADGE FUNCTIONS ==========
async function updateDeadlineBadge() {
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
}

async function updatePesanBadge() {
    if (!currentUser) return;
    const badge = document.getElementById('pesanCount');
    if (!badge) return;
    
    const unreadCount = messagesData.filter(m => !m.is_read).length;
    badge.innerText = unreadCount;
}

// ========== TRANSAKSI GLOBAL FUNCTIONS ==========
async function saveTransaksiGlobal(nominal, keterangan, tanggal, transaksiId = null) {
    if (!nominal || nominal <= 0) {
        showNotifTop('⚠️ Jumlah transaksi harus diisi dan lebih dari 0!', true);
        return false;
    }
    
    const data = {
        nominal: parseInt(nominal),
        keterangan: keterangan || '',
        tanggal: tanggal || getTodayDate(),
        updated_at: new Date().toISOString()
    };
    
    if (transaksiId) {
        await window.db.from('transaksi_global').update(data).eq('id', transaksiId);
        showNotifTop('✅ Transaksi berhasil diupdate!');
    } else {
        data.created_at = new Date().toISOString();
        data.created_by = currentUser.id;
        data.created_by_name = currentUserName;
        await window.db.from('transaksi_global').insert(data);
        showNotifTop('✅ Transaksi berhasil ditambahkan!');
    }
    
    await loadTransaksiGlobal();
    return true;
}

async function deleteTransaksiGlobal(transaksiId) {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    
    await window.db.from('transaksi_global').delete().eq('id', transaksiId);
    showNotifTop('🗑️ Transaksi dihapus');
    await loadTransaksiGlobal();
}

function showInputTransaksiModal() {
    currentTransaksiId = null;
    document.getElementById('transaksiNominal').value = '';
    document.getElementById('transaksiKeterangan').value = '';
    document.getElementById('transaksiTanggal').value = getTodayDate();
    showModal('inputTransaksiModal');
}

function showTransaksiListModal() {
    renderTransaksiListGlobal();
    showModal('transaksiListModal');
}

window.editTransaksiGlobal = function(id) {
    const transaksi = transaksiGlobalList.find(t => t.id === id);
    if (!transaksi) return;
    
    if (currentUserRole !== 'owner' && transaksi.created_by !== currentUser.id) {
        showNotifTop('⚠️ Anda hanya bisa mengedit transaksi yang Anda buat sendiri!', true);
        return;
    }
    
    currentTransaksiId = id;
    document.getElementById('transaksiNominal').value = transaksi.nominal;
    document.getElementById('transaksiKeterangan').value = transaksi.keterangan || '';
    document.getElementById('transaksiTanggal').value = transaksi.tanggal;
    showModal('inputTransaksiModal');
};

// ========== PROGRES FUNCTIONS ==========
function openTambahProgres(customerId) {
    const modal = createModalWithHighZIndex(`
        <div class="modal-content" style="max-width: 400px;">
            <h3>📊 Tambah Progres Transaksi</h3>
            <div class="modal-subtitle">Catat perubahan jumlah transaksi customer</div>
            <div style="padding: 20px;">
                <div class="form-group">
                    <label>Jenis Perubahan <span class="required">*</span></label>
                    <select id="progresJenis" style="width:100%; padding: 12px; border-radius: 14px; border: 1.5px solid #e5e7eb;">
                        <option value="naik">📈 Naik (Transaksi bertambah)</option>
                        <option value="turun">📉 Turun (Transaksi berkurang)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Jumlah Perubahan <span class="required">*</span></label>
                    <input type="number" id="progresJumlah" placeholder="Contoh: 25" style="width:100%; padding: 12px; border-radius: 14px; border: 1.5px solid #e5e7eb;">
                    <small>Jumlah kenaikan/turunan transaksi (dalam Transaksi, selalu positif)</small>
                </div>
                <div class="form-group">
                    <label>Keterangan</label>
                    <textarea id="progresKeterangan" rows="2" placeholder="Contoh: Penambahan outlet baru" style="width:100%; padding: 12px; border-radius: 14px; border: 1.5px solid #e5e7eb;"></textarea>
                </div>
            </div>
            <div class="modal-buttons">
                <button id="simpanProgresBtn" class="btn-primary">💾 Simpan Progres</button>
                <button id="batalProgresBtn" class="btn-outline">Batal</button>
            </div>
        </div>
    `, () => closeDynamicModal(modal));
    
    document.getElementById('simpanProgresBtn').onclick = async () => {
        const jenis = document.getElementById('progresJenis').value;
        const jumlah = parseInt(document.getElementById('progresJumlah').value) || 0;
        const keterangan = document.getElementById('progresKeterangan').value;
        
        if (jumlah <= 0) {
            showNotifTop('⚠️ Masukkan jumlah perubahan yang valid (minimal 1 Transaksi)!', true);
            return;
        }
        
        const { data: doc } = await window.db.from('customers').select('*').eq('id', customerId).single();
        const progresData = doc.progres_transaksi || { items: [], total_tercapai: 0 };
        
        let perubahan = jenis === 'naik' ? jumlah : -jumlah;
        const newTotalTercapai = (progresData.total_tercapai || 0) + perubahan;
        
        const newItem = {
            tanggal: getTodayDate(),
            jenis: jenis,
            jumlah: jumlah,
            keterangan: keterangan,
            created_at: new Date().toISOString()
        };
        
        await window.db.from('customers').update({
            progres_transaksi: {
                items: [...(progresData.items || []), newItem],
                total_tercapai: newTotalTercapai
            },
            updated_at: new Date().toISOString()
        }).eq('id', customerId);
        
        showNotifTop(`✅ Progres berhasil ditambahkan! Total transaksi tercapai: ${newTotalTercapai > 0 ? '+' : ''}${newTotalTercapai.toLocaleString()} Transaksi`);
        closeDynamicModal(modal);
        await loadCustomers();
        updateTargetDisplay();
        closeModal('detailModal');
    };
    
    document.getElementById('batalProgresBtn').onclick = () => closeDynamicModal(modal);
}

// ========== AGENT DETAIL FUNCTIONS ==========
function openAgentDetail(id) {
    const agent = agentsData.find(a => a.id === id);
    if (!agent) return;
    
    alert(`Detail Agent:\n\nNama: ${agent.nama}\nID Agent: ${agent.agent_id}\nHP: ${agent.hp}\nType: ${agent.agent_type || '-'}\nUpline: ${agent.upline || '-'}\nCID: ${agent.cid || '-'}\nBank: ${agent.jenis_bank || '-'}`);
}

// ========== AUTH & LOAD USER PROFILE ==========
async function loadUserProfile() {
    if (!currentUser) return;
    
    const { data, error } = await window.db.from('users').select('*').eq('id', currentUser.id).single();
    if (data) {
        currentUserName = data.nama || currentUser.email;
        currentUserRole = data.role || 'cs';
        document.getElementById('topUserName').innerText = currentUserName;
        document.getElementById('profileImg').src = data.foto || 'https://i.pravatar.cc/40';
    } else {
        currentUserName = currentUser.email;
        document.getElementById('topUserName').innerText = currentUserName;
    }
}

async function handleLogin(email, password) {
    const { error } = await window.db.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
                   'reminderPage', 'pesanPage', 'broadcastPage', 'broadcastUplinePage', 'searchPage', 
                   'manageUsersPage', 'importPage'];
    
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
        'broadcastUpline': 'broadcastUplinePage',
        'search': 'searchPage',
        'manageUsers': 'manageUsersPage',
        'import': 'importPage'
    };
    
    const target = pageMap[page];
    if (target) document.getElementById(target).style.display = 'block';
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    const activeMenu = document.querySelector(`.menu-item[data-page="${page}"]`);
    if (activeMenu) activeMenu.classList.add('active');
}

// ========== IMPORT FUNCTIONS ==========
function setupImportExcel() {
    const dropZone = document.getElementById('dropZone');
    const excelFileInput = document.getElementById('excelFile');
    const importTypeRadios = document.querySelectorAll('.radio-option');
    const importBtn = document.getElementById('importBtn');
    let importType = "transaksi";
    
    if (dropZone) {
        dropZone.addEventListener('click', () => excelFileInput?.click());
    }
    
    if (excelFileInput) {
        excelFileInput.addEventListener('change', function(e) {
            if (e.target.files[0]) {
                document.getElementById('fileInfo').innerHTML = '📄 ' + e.target.files[0].name;
            }
        });
    }
    
    if (importTypeRadios) {
        importTypeRadios.forEach(opt => {
            opt.addEventListener('click', function() {
                importType = this.dataset.import;
                importTypeRadios.forEach(o => o.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', async () => {
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
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                    
                    if (!json || json.length === 0) {
                        showNotifTop('File Excel kosong!', true);
                        return;
                    }
                    
                    let success = 0, failed = 0;
                    
                    progress.update(10, '📥 Import Data', `Memproses ${json.length} baris...`);
                    
                    for (let i = 0; i < json.length; i++) {
                        const row = json[i];
                        try {
                            if (importType === 'customer') {
                                const agentId = row.agent_id || row.Agent_ID || '';
                                const nama = row.nama || row.Nama || '';
                                let hp = row.hp || row.HP || '';
                                const apk = row.apk || row.APK || '';
                                const upline = row.upline_name || row.upline || '';
                                
                                if (!agentId || !nama) {
                                    failed++;
                                    continue;
                                }
                                
                                hp = String(hp).replace(/[^\d]/g, '');
                                if (hp.startsWith('0')) hp = hp.substring(1);
                                if (hp && !hp.startsWith('62')) hp = '62' + hp;
                                
                                await window.db.from('customers').insert({
                                    agent_id: formatAgentIdToUpper(agentId),
                                    nama: formatNamaToCapital(nama),
                                    hp: hp || '',
                                    apk: apk,
                                    upline_name: upline,
                                    tanggal: getTodayDate(),
                                    status: 'baru',
                                    user_id: currentUser.id,
                                    created_at: new Date().toISOString()
                                });
                                success++;
                            } else if (importType === 'prospek') {
                                const nama = row.nama || row.Nama || '';
                                let hp = row.hp || row.HP || '';
                                
                                if (!nama) {
                                    failed++;
                                    continue;
                                }
                                
                                hp = String(hp).replace(/[^\d]/g, '');
                                if (hp.startsWith('0')) hp = hp.substring(1);
                                if (hp && !hp.startsWith('62')) hp = '62' + hp;
                                
                                await window.db.from('prospek').insert({
                                    nama: formatNamaToCapital(nama),
                                    hp: hp || '',
                                    deadline: getTodayDate(),
                                    status: 'Baru',
                                    user_id: currentUser.id,
                                    created_at: new Date().toISOString()
                                });
                                success++;
                            } else if (importType === 'transaksi') {
                                const agentId = row.agent_id || row.Agent_ID || '';
                                const progresJenis = row.progres_jenis || row.jenis_progres || '';
                                const progresJumlah = parseInt(row.progres_jumlah || row.jumlah || 0);
                                
                                if (!agentId || !progresJenis) {
                                    failed++;
                                    continue;
                                }
                                
                                await window.db.from('db_transaksi').insert({
                                    agent_id: formatAgentIdToUpper(agentId),
                                    nama: row.nama || `Agent ${agentId}`,
                                    hp: String(row.hp || '').replace(/[^\d]/g, ''),
                                    apk: row.apk || '',
                                    upline_name: row.upline_name || '',
                                    upline_phone: row.upline_phone || '',
                                    progres_jenis: progresJenis,
                                    progres_jumlah: progresJumlah,
                                    tanggal_transaksi: getTodayDate(),
                                    status: 'pending_import',
                                    user_id: currentUser.id,
                                    created_at: new Date().toISOString()
                                });
                                success++;
                            }
                        } catch (err) {
                            failed++;
                        }
                        
                        if ((i + 1) % 50 === 0) {
                            const percent = 10 + Math.floor(((i + 1) / json.length) * 80);
                            progress.update(percent, '📥 Import Data', `Memproses... (${i+1}/${json.length})`, i+1, json.length);
                            await delay(10);
                        }
                    }
                    
                    progress.update(100, '✅ Selesai', `Berhasil: ${success}, Gagal: ${failed}`, success, json.length);
                    showNotifTop(`✅ Import selesai! Berhasil: ${success}, Gagal: ${failed}`);
                    
                    setTimeout(() => progress.hide(), 3000);
                    
                    excelFileInput.value = '';
                    document.getElementById('fileInfo').innerHTML = '';
                    
                    await loadCustomers();
                    await loadProspek();
                    await loadDbTransaksi();
                    
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
        });
    }
    
    document.getElementById('downloadCustomerExample')?.addEventListener('click', () => {
        const data = [{ agent_id: 'AG-001', nama: 'Budi Santoso', hp: '6281234567890', apk: 'GNP' }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customer');
        XLSX.writeFile(wb, 'contoh_customer.xlsx');
        showNotifTop('📋 Contoh file Customer berhasil diunduh');
    });
    
    document.getElementById('downloadProspekExample')?.addEventListener('click', () => {
        const data = [{ nama: 'Rina Marlina', hp: '6281234567893' }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Prospek');
        XLSX.writeFile(wb, 'contoh_prospek.xlsx');
        showNotifTop('📋 Contoh file Prospek berhasil diunduh');
    });
    
    document.getElementById('downloadTransaksiExample')?.addEventListener('click', () => {
        const data = [{ agent_id: 'AG-001', progres_jenis: 'naik', progres_jumlah: 100, nama: 'Budi Santoso', hp: '6281234567890' }];
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
                        const agentId = row.agent_id || row.Agent_ID || '';
                        const nama = row.nama || row.Nama || '';
                        let hp = row.hp || row.HP || '';
                        
                        if (!agentId || !nama) {
                            failed++;
                            continue;
                        }
                        
                        hp = String(hp).replace(/[^\d]/g, '');
                        if (hp.startsWith('0')) hp = hp.substring(1);
                        if (hp && !hp.startsWith('62')) hp = '62' + hp;
                        
                        await window.db.from('db_agent').insert({
                            agent_id: formatAgentIdToUpper(agentId),
                            nama: formatNamaToCapital(nama),
                            hp: hp || '',
                            user_id: currentUser.id,
                            created_at: new Date().toISOString()
                        });
                        success++;
                    } catch (err) {
                        failed++;
                    }
                }
                
                showNotifTop(`✅ Import agent selesai! Berhasil: ${success}, Gagal: ${failed}`);
                await loadDatabaseAgent();
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

function setupAgentFilters() {
    const searchInput = document.getElementById('searchAgentInput');
    const filterUpline = document.getElementById('filterUplineAgent');
    const filterCid = document.getElementById('filterCidAgent');
    const filterBank = document.getElementById('filterBankAgent');
    const filterDate = document.getElementById('filterDateAgent');
    const filterHasHp = document.getElementById('filterHasHpAgent');
    const filterHasApk = document.getElementById('filterHasApkAgent');
    const resetBtn = document.getElementById('resetAgentFilterBtn');
    
    const applyFilters = () => renderAgentList(agentsData);
    
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterUpline) filterUpline.addEventListener('input', applyFilters);
    if (filterCid) filterCid.addEventListener('input', applyFilters);
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

function exportAgentToExcel() {
    if (agentsData.length === 0) {
        showNotifTop('Tidak ada data untuk diexport', true);
        return;
    }
    
    const exportData = agentsData.map(agent => ({
        'agent_id': agent.agent_id,
        'nama': agent.nama,
        'hp': agent.hp,
        'agent_type': agent.agent_type || '',
        'upline': agent.upline || '',
        'cid': agent.cid || '',
        'jenis_bank': agent.jenis_bank || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database Agent');
    XLSX.writeFile(wb, `database_agent_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotifTop('✅ Export data berhasil!');
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
                        const nama = row.nama || row.Nama || '';
                        const hpp = row.hpp || row.HPP || '';
                        
                        if (!nama || !hpp) {
                            failed++;
                            continue;
                        }
                        
                        await window.db.from('produk').insert({
                            nama: nama,
                            hpp: parseInt(hpp),
                            harga_jual: parseInt(row.harga_jual || 0),
                            keterangan: row.keterangan || '',
                            created_at: new Date().toISOString()
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

function exportProdukToExcel() {
    if (produkData.length === 0) {
        showNotifTop('Tidak ada data produk untuk diexport', true);
        return;
    }
    
    const exportData = produkData.map(item => ({
        'Nama Produk': item.nama,
        'HPP (Modal)': item.hpp,
        'Harga Jual': item.harga_jual,
        'Keterangan': item.keterangan || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produk');
    XLSX.writeFile(wb, `produk_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotifTop('✅ Export produk berhasil!');
}

// ========== EVENT LISTENERS ==========
function initEventListeners() {
    initSidebarHover();
    initDarkMode();
    initProfilePhoto();
    
    // Save profile
    document.getElementById('saveProfileBtn')?.addEventListener('click', saveUserProfile);
    
    // Add customer
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
        
        await addCustomer(agentId, nama, hp, apk, upline, deadline);
        closeModal('customerModal');
        document.getElementById('customerId').value = '';
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('customerApk').value = '';
        document.getElementById('customerUpline').value = '';
    });
    
    // Add prospek
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
        
        await addProspek(nama, hp, deadline);
        closeModal('prospekModal');
        document.getElementById('prospekName').value = '';
        document.getElementById('prospekPhone').value = '';
    });
    
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
    
    // Target management
    document.getElementById('manageTargetBtn')?.addEventListener('click', () => {
        document.getElementById('targetAgentInput').value = targetData.agent || 0;
        document.getElementById('targetKoorInput').value = targetData.koordinator || 0;
        document.getElementById('targetCAInput').value = targetData.ca || 0;
        document.getElementById('targetTransaksiInput').value = targetData.transaksi || 0;
        showModal('manageTargetModal');
    });
    document.getElementById('saveTargetBtn')?.addEventListener('click', saveTargetData);
    document.getElementById('cancelTargetBtn')?.addEventListener('click', () => closeModal('manageTargetModal'));
    
    // Transaksi
    document.getElementById('targetTransaksiCard')?.addEventListener('click', showInputTransaksiModal);
    document.getElementById('saveTransaksiBtn')?.addEventListener('click', async () => {
        const nominal = document.getElementById('transaksiNominal').value;
        const keterangan = document.getElementById('transaksiKeterangan').value;
        const tanggal = document.getElementById('transaksiTanggal').value;
        await saveTransaksiGlobal(nominal, keterangan, tanggal, currentTransaksiId);
        closeModal('inputTransaksiModal');
        currentTransaksiId = null;
    });
    document.getElementById('cancelTransaksiBtn')?.addEventListener('click', () => closeModal('inputTransaksiModal'));
    document.getElementById('viewTransaksiHistoryBtn')?.addEventListener('click', showTransaksiListModal);
    
    // Info modal
    document.getElementById('infoBtn')?.addEventListener('click', () => showModal('infoModal'));
    document.getElementById('infoModalClose')?.addEventListener('click', () => closeModal('infoModal'));
    
    // Deadline notification
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
    
    // Pesan notification
    document.getElementById('pesanNotifBtn')?.addEventListener('click', () => navigateTo('pesan'));
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // Navigation menu
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.page);
            if (isMobile()) document.getElementById('sidebar')?.classList.remove('active');
            updateSidebarBodyClass();
        });
    });
    
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
    
    // Close modal buttons
    document.querySelectorAll('.closeModalBtn').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
    
    // Auto format inputs
    const customerId = document.getElementById('customerId');
    const customerName = document.getElementById('customerName');
    const customerPhone = document.getElementById('customerPhone');
    const prospekName = document.getElementById('prospekName');
    const prospekPhone = document.getElementById('prospekPhone');
    const profilePhone = document.getElementById('profilePhone');
    
    if (customerId) customerId.addEventListener('input', function() { formatAgentIdAuto(this); });
    if (customerName) customerName.addEventListener('input', function() { formatNamaAuto(this); });
    if (customerPhone) customerPhone.addEventListener('input', function() { formatPhoneAuto(this); });
    if (prospekName) prospekName.addEventListener('input', function() { formatNamaAuto(this); });
    if (prospekPhone) prospekPhone.addEventListener('input', function() { formatPhoneAuto(this); });
    if (profilePhone) profilePhone.addEventListener('input', function() { formatPhone(this); });
    
    // Modal click outside
    const modals = ['customerModal', 'prospekModal', 'profileModal', 'detailModal', 'infoModal', 
                    'manageTargetModal', 'inputTransaksiModal', 'transaksiListModal', 'reminderModal', 
                    'pesanModal', 'addCsModal', 'pilihNomorModal', 'editDeadlineModal', 'previewPhotoModal',
                    'followupConfirmModal', 'prospekDihubungiModal', 'prospekNegosiasiModal', 'convertModal',
                    'tarifAdminModal', 'produkMasterModal', 'pilihCsTujuanModal'];
    modals.forEach(id => setupModalClickOutside(id));
    
    // Broadcast
    document.querySelectorAll('input[name="sourceType"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const customCard = document.getElementById('customNumbersCard');
            if (customCard) customCard.style.display = radio.value === 'custom' ? 'block' : 'none';
            loadBroadcastNumbers();
        });
    });
    document.getElementById('refreshNumbersBtn')?.addEventListener('click', loadBroadcastNumbers);
    document.getElementById('sendBroadcastBtn')?.addEventListener('click', sendBroadcast);
    document.getElementById('customNumbers')?.addEventListener('input', loadBroadcastNumbers);
    loadBroadcastNumbers();
    
    // Upline Broadcast
    document.querySelectorAll('input[name="uplineSourceType"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const customerFilter = document.getElementById('uplineCustomerFilter');
            const customCard = document.getElementById('uplineCustomCard');
            if (customerFilter) customerFilter.style.display = radio.value === 'customer' ? 'block' : 'none';
            if (customCard) customCard.style.display = radio.value === 'custom' ? 'block' : 'none';
            loadUplineNumbers();
        });
    });
    document.getElementById('refreshUplineBtn')?.addEventListener('click', loadUplineNumbers);
    document.getElementById('sendUplineBroadcastBtn')?.addEventListener('click', sendUplineBroadcast);
    document.getElementById('uplineCustomNumbers')?.addEventListener('input', loadUplineNumbers);
    document.querySelectorAll('#uplineCustomerFilter input').forEach(cb => {
        cb.addEventListener('change', loadUplineNumbers);
    });
    loadUplineNumbers();
    
    // Database buttons
    setupSelectAll('selectAllClosing', '#dbClosingList', selectedClosingIds);
    setupSelectAll('selectAllTidak', '#dbTidakList', selectedTidakIds);
    setupSelectAll('selectAllNomorSalah', '#dbNomorSalahList', selectedNomorSalahIds);
    setupSelectAll('selectAllCommitment', '#dbCommitmentList', selectedCommitmentIds);
    setupSelectAll('selectAllAgent', '#dbAgentList', selectedAgentIds);
    setupSelectAll('selectAllProduk', '#produkList', selectedProdukIds);
    setupSelectAll('selectAllTransaksi', '#dbTransaksiList', selectedTransaksiIds);
    
    document.getElementById('deleteSelectedClosing')?.addEventListener('click', () => deleteSelectedDBItems('db_closing', selectedClosingIds, loadDBClosing));
    document.getElementById('deleteAllClosing')?.addEventListener('click', () => deleteAllDBItems('db_closing', loadDBClosing));
    document.getElementById('deleteSelectedTidak')?.addEventListener('click', () => deleteSelectedDBItems('db_tidak_tertarik', selectedTidakIds, loadDBTidak));
    document.getElementById('deleteAllTidak')?.addEventListener('click', () => deleteAllDBItems('db_tidak_tertarik', loadDBTidak));
    document.getElementById('deleteSelectedNomorSalah')?.addEventListener('click', () => deleteSelectedDBItems('nomor_salah', selectedNomorSalahIds, loadDBNomorSalah));
    document.getElementById('deleteAllNomorSalah')?.addEventListener('click', () => deleteAllDBItems('nomor_salah', loadDBNomorSalah));
    document.getElementById('deleteSelectedCommitment')?.addEventListener('click', () => deleteSelectedDBItems('db_commitment', selectedCommitmentIds, loadDBCommitment));
    document.getElementById('deleteAllCommitment')?.addEventListener('click', () => deleteAllDBItems('db_commitment', loadDBCommitment));
    document.getElementById('deleteSelectedProduk')?.addEventListener('click', deleteSelectedProduk);
    document.getElementById('deleteAllProduk')?.addEventListener('click', deleteAllProduk);
    document.getElementById('deleteSelectedAgent')?.addEventListener('click', () => deleteSelectedDBItems('db_agent', selectedAgentIds, loadDatabaseAgent));
    document.getElementById('deleteAllAgent')?.addEventListener('click', () => deleteAllDBItems('db_agent', loadDatabaseAgent));
    document.getElementById('deleteSelectedTransaksi')?.addEventListener('click', () => deleteSelectedDBItems('db_transaksi', selectedTransaksiIds, loadDbTransaksi));
    document.getElementById('deleteAllTransaksiBtn')?.addEventListener('click', () => deleteAllDBItems('db_transaksi', loadDbTransaksi));
    document.getElementById('moveSelectedToFollowupBtn')?.addEventListener('click', async () => {
        const selectedIds = Array.from(selectedTransaksiIds.keys());
        if (selectedIds.length === 0) {
            showNotifTop('⚠️ Tidak ada data yang dipilih!', true);
            return;
        }
        for (const id of selectedIds) {
            await moveSingleToFollowup(id);
        }
        showNotifTop(`✅ ${selectedIds.length} data dipindahkan ke Followup Agen`);
    });
    
    // Import
    setupImportExcel();
    setupAgentImport();
    setupProdukImport();
    
    // Agent filters
    setupAgentFilters();
    
    // Export buttons
    document.getElementById('exportAgentExcelBtn')?.addEventListener('click', exportAgentToExcel);
    document.getElementById('exportProdukExcelBtn')?.addEventListener('click', exportProdukToExcel);
    
    // Tarif Admin
    document.getElementById('manageTarifAdminBtn')?.addEventListener('click', () => {
        loadTarifAdmin();
        showModal('tarifAdminModal');
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
    document.getElementById('closeTarifAdminModal')?.addEventListener('click', () => closeModal('tarifAdminModal'));
    document.getElementById('exportTarifExcelBtn')?.addEventListener('click', () => {
        if (tarifAdminData.length === 0) {
            showNotifTop('Tidak ada data untuk diexport', true);
            return;
        }
        const exportData = tarifAdminData.map(item => ({
            'CID': item.cid,
            'PLN Pospaid': item.admin_pospaid || 0,
            'PLN Prepaid': item.admin_prepaid || 0,
            'PLN Nontaglis': item.admin_nontaglis || 0
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Admin per CID');
        XLSX.writeFile(wb, `tarif_admin_${new Date().toISOString().split('T')[0]}.xlsx`);
        showNotifTop('✅ Export data berhasil!');
    });
    document.getElementById('downloadTarifExampleBtn')?.addEventListener('click', () => {
        const data = [{ cid: '5213247', pospaid: 7200, prepaid: 7200, nontaglis: 7200 }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Admin per CID');
        XLSX.writeFile(wb, 'contoh_tarif_admin.xlsx');
        showNotifTop('📋 Contoh file Excel berhasil diunduh');
    });
    
    // Add CS
    document.getElementById('addCsBtn')?.addEventListener('click', () => showModal('addCsModal'));
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
            hp = hp.replace(/[^\d]/g, '');
            if (hp.startsWith('0')) hp = hp.substring(1);
            if (hp && !hp.startsWith('62')) hp = '62' + hp;
            hp = '+62' + hp;
        }
        
        try {
            const { data: userCredential, error: signUpError } = await window.db.auth.signUp({
                email: email,
                password: password
            });
            
            if (signUpError) throw signUpError;
            
            if (userCredential.user) {
                await window.db.from('users').insert({
                    id: userCredential.user.id,
                    nama: nama,
                    email: email,
                    hp: hp || null,
                    role: 'cs',
                    created_at: new Date().toISOString()
                });
                
                showNotifTop('✅ CS Agent berhasil ditambahkan');
                closeModal('addCsModal');
                document.getElementById('csEmail').value = '';
                document.getElementById('csPassword').value = '';
                document.getElementById('csName').value = '';
                document.getElementById('csPhone').value = '';
                await loadUsersList();
            }
        } catch (e) {
            showNotifTop('❌ Gagal: ' + e.message, true);
        }
    });
    
    // Add product
    document.getElementById('addProdukBtn')?.addEventListener('click', () => {
        document.getElementById('produkMasterNama').value = '';
        document.getElementById('produkMasterHpp').value = '';
        document.getElementById('produkMasterHargaJual').value = '';
        document.getElementById('produkMasterKeterangan').value = '';
        document.getElementById('produkMasterTitle').innerText = '🏷️ Tambah Produk';
        showModal('produkMasterModal');
    });
    document.getElementById('saveProdukMasterBtn')?.addEventListener('click', async () => {
        const nama = document.getElementById('produkMasterNama').value;
        const hpp = document.getElementById('produkMasterHpp').value;
        const keterangan = document.getElementById('produkMasterKeterangan').value;
        const jenisProduk = document.getElementById('produkMasterJenis').value;
        let hargaJual = 0;
        let adminDefault = 0;
        let cidBased = 'no';
        if (jenisProduk === 'tanpa_admin') {
            hargaJual = document.getElementById('produkMasterHargaJual').value;
        } else {
            adminDefault = document.getElementById('produkMasterAdminDefault').value;
            cidBased = document.getElementById('produkMasterCidBased').value;
        }
        await saveProduk(nama, hpp, hargaJual, keterangan, adminDefault, jenisProduk, cidBased, currentEditProdukId);
        closeModal('produkMasterModal');
    });
    document.getElementById('cancelProdukMasterBtn')?.addEventListener('click', () => closeModal('produkMasterModal'));
    document.getElementById('produkMasterJenis')?.addEventListener('change', function() {
        const tanpaAdminFields = document.getElementById('tanpaAdminFields');
        const beradminFields = document.getElementById('beradminFields');
        if (this.value === 'tanpa_admin') {
            tanpaAdminFields.style.display = 'block';
            beradminFields.style.display = 'none';
        } else {
            tanpaAdminFields.style.display = 'none';
            beradminFields.style.display = 'block';
        }
    });
}

// ========== CHECK AUTH & START ==========
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
        await loadDBClosing();
        await loadDBTidak();
        await loadDBNomorSalah();
        await loadDBCommitment();
        await loadReminders();
        await loadMessages();
        await loadUsersList();
        await loadTarifAdmin();
        await loadTargetData();
        await loadTransaksiGlobal();
        
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
        
        initFullModeSelection();
        navigateTo('dashboard');
    } else {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
}

// Login handler
document.getElementById('loginBtn')?.addEventListener('click', async () => {
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

// Auth state change listener
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

// Auto format functions
function formatAgentIdAuto(input) {
    let value = input.value.toUpperCase();
    value = value.replace(/[^A-Z0-9-]/g, '');
    if (value.length > 17) value = value.slice(0, 17);
    input.value = value;
}

function formatNamaAuto(input) {
    let value = input.value.toLowerCase();
    value = value.replace(/[^a-z\s]/gi, '');
    value = value.replace(/\b\w/g, char => char.toUpperCase());
    if (value.length > 25) value = value.slice(0, 25);
    input.value = value;
}

function formatPhoneAuto(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value.startsWith('0')) value = value.substring(1);
    if (value.length > 0 && !value.startsWith('8')) {
        value = '8' + value;
    }
    if (value.length > 12) value = value.slice(0, 12);
    input.value = value;
}

// Make functions global for onclick
window.openWA = openWA;
window.openWAById = openWAById;
window.updateCustomerStatus = updateCustomerStatus;
window.updateProspekStatus = updateProspekStatus;
window.deleteCustomer = deleteCustomer;
window.deleteProspek = deleteProspek;
window.deleteReminder = deleteReminder;
window.deletePesan = deletePesan;
window.deleteUser = deleteUser;
window.deleteProduk = deleteProduk;
window.deleteTransaksiItem = deleteTransaksiItem;
window.deleteAgentItem = deleteAgentItem;
window.deleteDBItem = deleteDBItem;
window.moveAgentToFollowup = moveAgentToFollowup;
window.moveSingleToFollowup = moveSingleToFollowup;
window.editProduk = editProduk;
window.editTarifAdmin = editTarifAdmin;
window.clearTarifForm = clearTarifForm;
window.openDetailCustomer = openDetailCustomer;
window.openDetailProspek = openDetailProspek;
window.openEditDeadlineModal = openEditDeadlineModal;
window.openTambahProgres = openTambahProgres;
window.openFollowupConfirm = openFollowupConfirm;
window.openProspekNegosiasiModal = openProspekNegosiasiModal;
window.openProspekDihubungiConfirm = openProspekDihubungiConfirm;
window.openPendingModal = openPendingModal;
window.confirmClosingToDB = confirmClosingToDB;
window.confirmTertarikToDB = confirmTertarikToDB;
window.closeModal = closeModal;
window.formatPhone = formatPhone;
window.formatAgentIdAuto = formatAgentIdAuto;
window.formatNamaAuto = formatNamaAuto;
window.formatPhoneAuto = formatPhoneAuto;
window.saveTarifAdmin = saveTarifAdmin;
window.loadTarifAdmin = loadTarifAdmin;
window.showConvertToCustomerModal = showConvertToCustomerModal;

// Start app
initEventListeners();
checkAuth();
