// ========== SUPABASE CONFIGURATION ==========
const SUPABASE_URL = 'https://haylblhjzfavrfiyaicq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheWxibGhqemZhdnJmaXlhaWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzgyMDIsImV4cCI6MjA5NTMxNDIwMn0.j4yQa1ZttP5_Zg0ye5lK2OLecq39QhG3tPyv5PZ3r78';

// Inisialisasi Supabase dengan benar
// Di awal script.js, SEBELUM deklarasi lainnya
if (window.supabase && !window.supabase._reconfigured) {
    const originalCreateClient = window.supabase.createClient;
    window.supabase = originalCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabase._reconfigured = true;
}
// HAPUS deklarasi 'const supabase = ...' yang asli
// ========== PERFORMANCE CONFIGURATION ==========
const DB_CONFIG = {
  MAX_BATCH_SIZE: 15,
  MAX_QUERY_LIMIT: 500,
  DELETE_DELAY_MS: 500,
  IMPORT_DELAY_MS: 500,
  SEARCH_LIMIT: 50
};

const LIMIT_DATA = DB_CONFIG.MAX_QUERY_LIMIT;

// ========== ANTI QUOTA EXCEEDED ==========
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function firestoreWithRetry(operation, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  let delayMs = initialDelay;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
        console.warn(`Quota exceeded, retry ${i + 1}/${maxRetries} after ${delayMs}ms`);
        await delay(delayMs);
        delayMs *= 2;
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

// variabel global / deklarasi global
let currentBroadcastSourceType = null;
let currentBroadcastSelectedStatuses = [];
let currentUser = null;
let currentUserRole = 'cs';
let currentUserName = '';
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
let currentUplineIndex = 0;
let uplineNumbers = [];
let uplineMessageTemplate = '';
let isUplineBroadcasting = false;
let uplineBroadcastStatus = [];
let activeProgress = null;
let currentTarifData = [];
let produkMapCache = null;
let deleteProgressContainer = null;

// ========== TARGET & KPI VARIABLES ==========
let targetData = {
  agent: 0,
  ca: 0,
  koordinator: 0,
  transaksi: 0,
  monthlyTargets: []
};
let targetChart = null;

// ========== DATABASE ARCHIVES MAPS ==========
let selectedClosingIds = new Map(),
  selectedTidakIds = new Map(),
  selectedNomorSalahIds = new Map(),
  selectedCommitmentIds = new Map(),
  selectedTransaksiIds = new Map();

// ========== VARIABEL BROADCAST ==========
let currentNumbers = [],
  currentBroadcastIndex = 0,
  broadcastNumbers = [],
  broadcastMessageTemplate = '',
  isBroadcasting = false,
  broadcastStatus = [];
let savedTemplates = [];

// ========== HELPER FUNCTIONS ==========
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

// Tambahkan animasi keluar
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

function showNotif(msg, isError = false) {
  const notif = document.createElement('div');
  notif.textContent = msg;
  notif.className = `notif-toast ${isError ? 'notif-error' : 'notif-success'}`;
  document.getElementById('notifBox').appendChild(notif);
  setTimeout(() => notif.remove(), 5000);
}

function showNotifTop(msg, isError = false) {
  console.log('showNotifTop dipanggil:', msg);
  const notif = document.createElement('div');
  notif.textContent = msg;
  notif.className = `notif-toast ${isError ? 'notif-error' : 'notif-success'}`;
  notif.style.cssText = 'z-index: 999999999; position: fixed; top: 20px; right: 20px; max-width: 350px; background: ' + (isError ? '#ef4444' : '#4f46e5') + '; color: white; padding: 10px 16px; border-radius: 12px; margin-bottom: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);';
  document.getElementById('notifBox').appendChild(notif);
  setTimeout(() => notif.remove(), 5000);
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function addDaysToDate(dateStr, days) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function formatRupiah(angka) {
  if (!angka) return 'Rp 0';
  return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function isMobile() {
  return window.innerWidth <= 768;
}

function updateSidebarBodyClass() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('active')) document.body.classList.add('sidebar-open');
  else document.body.classList.remove('sidebar-open');
}

function getStatusBadge(status) {
  const statusMap = {
    'baru': 'status-baru',
    'followup': 'status-followup',
    'pending': 'status-pending',
    'closing': 'status-closing',
    'Baru': 'status-baru',
    'Dihubungi': 'status-dihubungi',
    'Negosiasi': 'status-negosiasi',
    'Tertarik': 'status-tertarik'
  };
  const className = statusMap[status] || 'status-baru';
  let displayName = status;
  if (status === 'followup') displayName = 'Follow Up';
  else if (status === 'Dihubungi') displayName = 'Dihubungi';
  else if (status === 'Negosiasi') displayName = 'Negosiasi';
  else if (status === 'Tertarik') displayName = 'Tertarik';
  return `<span class="status-badge ${className}">${displayName}</span>`;
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

  modal.removeEventListener('click', modal._clickOutsideHandler);

  modal._clickOutsideHandler = function(e) {
    if (e.target === modal) {
      closeModal(modalId);
    }
  };

  modal.addEventListener('click', modal._clickOutsideHandler);
}

function formatAgentId(input) {
  let value = input.value.toUpperCase();
  value = value.replace(/[^A-Z0-9-]/g, '');
  if (value.length > 16) value = value.slice(0, 16);
  input.value = value;
}

function formatNama(input) {
  let value = input.value;
  if (value.length > 20) value = value.slice(0, 20);
  value = value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  input.value = value;
}

function formatPhone(input) {
  let value = input.value.replace(/[^\d]/g, '');
  if (value.startsWith('62')) value = value.substring(2);
  if (value.startsWith('0')) value = value.substring(1);
  if (value.length > 12) value = value.slice(0, 12);
  if (value.length > 0 && !value.startsWith('8')) {
    value = '8' + value;
  }
  input.value = value;
}

function getTargetPhone(customerData) {
  if (customerData.agent_type && 
      customerData.agent_type !== 'AGENT' && 
      customerData.agent_type !== '' &&
      customerData.upline_phone && 
      customerData.upline_phone && 
      customerData.upline_phone.trim() !== '') {
    return customerData.upline_phone;
  }
  return customerData.hp;
}

function getTargetName(customerData) {
  if (customerData.agent_type && 
      customerData.agent_type !== 'AGENT' && 
      customerData.agent_type !== '' &&
      customerData.upline_name && 
      customerData.upline_name && 
      customerData.upline_name.trim() !== '') {
    return customerData.upline_name;
  }
  return customerData.nama;
}

// ========== SUPABASE HELPER FUNCTIONS ==========
async function supabaseGet(collection, filters = {}, options = {}) {
  let query = supabase.from(collection).select('*');
  
  if (currentUserRole !== 'owner' && filters.user_id !== undefined) {
    query = query.eq('user_id', currentUser.id);
  }
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'user_id' && currentUserRole !== 'owner') continue;
      query = query.eq(key, value);
    }
  }
  
  if (options.orderBy) {
    query = query.order(options.orderBy.field, { ascending: options.orderBy.ascending || false });
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function supabaseAdd(collection, data) {
  const { data: result, error } = await supabase
    .from(collection)
    .insert([{ ...data, user_id: currentUser.id, created_at: new Date().toISOString() }])
    .select();
  if (error) throw error;
  return result[0];
}

async function supabaseUpdate(collection, id, updates) {
  const { error } = await supabase
    .from(collection)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

async function supabaseDelete(collection, id) {
  const { error } = await supabase
    .from(collection)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function supabaseGetById(collection, id) {
  const { data, error } = await supabase
    .from(collection)
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ========== FUNGSI WA ==========
let currentPilihNomorCustomerId = null;

function openWADirect(nomor) {
    if (!nomor) {
        showNotifTop('⚠️ Nomor WhatsApp tidak ditemukan!', true);
        return;
    }
    
    let cleanNomor = nomor.toString();
    cleanNomor = cleanNomor.replace(/[^\d+]/g, '');
    if (!cleanNomor.startsWith('+')) {
        cleanNomor = cleanNomor.replace(/^0+/, '');
        if (cleanNomor.startsWith('62')) {
            cleanNomor = '+' + cleanNomor;
        } else {
            cleanNomor = '+62' + cleanNomor;
        }
    }
    
    console.log('Membuka WhatsApp untuk nomor:', cleanNomor);
    window.open('https://wa.me/' + encodeURIComponent(cleanNomor), '_blank');
}

async function showPilihNomor(customerId) {
    console.log('showPilihNomor dipanggil untuk ID:', customerId);
    currentPilihNomorCustomerId = customerId;
    
    const safeString = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value.toString();
        return '';
    };
    
    const isValidPhone = (phone) => {
        const phoneStr = safeString(phone);
        return phoneStr && phoneStr !== '' && phoneStr !== '+62' && phoneStr !== '62' && phoneStr !== '0';
    };
    
    try {
        const data = await supabaseGetById('customers', customerId);
        if (!data) {
            showNotifTop('⚠️ Data tidak ditemukan!', true);
            return;
        }
        
        const options = [];
        
        const agentPhone = safeString(data.hp);
        if (isValidPhone(agentPhone)) {
            options.push({
                jenis: 'agent',
                label: '📞 Nomor Agent (Pemilik)',
                nama: safeString(data.nama),
                nomor: agentPhone
            });
        } else {
            options.push({
                jenis: 'agent',
                label: '📞 Nomor Agent (Pemilik)',
                nama: safeString(data.nama),
                nomor: '',
                kosong: true
            });
        }
        
        const uplinePhone = safeString(data.upline_phone);
        if (isValidPhone(uplinePhone)) {
            options.push({
                jenis: 'upline',
                label: '👤 Nomor Upline (Atasan)',
                nama: safeString(data.upline_name) || 'Upline',
                nomor: uplinePhone
            });
        }
        
        const validOptions = options.filter(opt => opt.nomor && opt.nomor !== '' && !opt.kosong);
        
        if (validOptions.length > 1) {
            options.unshift({
                jenis: 'semua',
                label: '📢 Kirim ke SEMUA nomor',
                nama: 'Semua nomor',
                nomor: 'all'
            });
        }
        
        const modal = document.getElementById('pilihNomorModal');
        const container = document.getElementById('pilihNomorOptions');
        
        if (!modal || !container) {
            console.error('Modal atau container tidak ditemukan');
            showNotifTop('⚠️ Terjadi kesalahan sistem', true);
            return;
        }
        
        if (validOptions.length === 0) {
            container.innerHTML = '<p style="color: #ef4444; padding: 12px;">⚠️ Tidak ada nomor WhatsApp yang tersedia!</p>';
        } else {
            const optionsToShow = options.filter(opt => opt.nomor && opt.nomor !== '' && !opt.kosong);
            
            container.innerHTML = optionsToShow.map(opt => `
                <div class="pilih-nomor-option" data-nomor="${opt.nomor}" data-jenis="${opt.jenis}" style="
                    padding: 12px;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: #f9fafb;
                ">
                    <div style="font-weight: 600; margin-bottom: 4px;">${opt.label}</div>
                    <div style="font-size: 13px; color: #4f46e5;">${escapeHtml(opt.nama)}</div>
                    <div style="font-size: 12px; color: #6b7280;">${opt.nomor}</div>
                </div>
            `).join('');
            
            document.querySelectorAll('.pilih-nomor-option').forEach(el => {
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                
                newEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const nomor = newEl.dataset.nomor;
                    console.log('Opsi dipilih, nomor:', nomor);
                    if (nomor && nomor !== '' && nomor !== 'all') {
                        openWADirect(nomor);
                        closeModal('pilihNomorModal');
                    } else if (nomor === 'all') {
                        const allNumbers = validOptions.map(opt => opt.nomor);
                        allNumbers.forEach(num => openWADirect(num));
                        closeModal('pilihNomorModal');
                    } else {
                        showNotifTop('⚠️ Nomor WhatsApp tidak tersedia!', true);
                    }
                });
            });
        }
        
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    } catch (err) {
        console.error('Error showPilihNomor:', err);
        showNotifTop('❌ Gagal memuat data: ' + err.message, true);
    }
}

function openWACustomer(customerId) {
    showPilihNomor(customerId);
}

function openWA(hp, customerData = null) {
    if (customerData && customerData.id) {
        showPilihNomor(customerData.id);
    } else if (hp) {
        openWADirect(hp);
    }
}

async function openWAById(customerId) {
    console.log('openWAById dipanggil untuk ID:', customerId);
    
    const customer = customersData.find(c => c.id === customerId);
    if (customer) {
        showPilihNomor(customerId);
        return;
    }
    
    const prospek = prospekData.find(p => p.id === customerId);
    if (prospek && prospek.hp) {
        openWADirect(prospek.hp);
        return;
    }
    
    try {
        const data = await supabaseGetById('customers', customerId);
        if (data) {
            showPilihNomor(customerId);
        } else {
            const prospekData = await supabaseGetById('prospek', customerId);
            if (prospekData && prospekData.hp) {
                openWADirect(prospekData.hp);
            } else {
                showNotifTop('⚠️ Data tidak ditemukan!', true);
            }
        }
    } catch (err) {
        showNotifTop('⚠️ Data tidak ditemukan!', true);
    }
}

// ========== VALIDASI DUPLIKAT ==========
async function checkDuplicateCustomer(agentId, hp, excludeId = null) {
  const isHpValid = hp && hp !== '+62' && hp !== '62' && hp !== '0' && hp.trim() !== '';
  
  let query = supabase.from('customers').select('*');
  if (currentUserRole !== 'owner') {
    query = query.eq('user_id', currentUser.id);
  }
  
  const { data: customers, error } = await query;
  if (error) {
    console.error('Error check duplicate:', error);
    return { duplicateAgent: null, duplicateHp: null };
  }
  
  let duplicateAgent = null;
  let duplicateHp = null;

  for (const customer of customers) {
    if (excludeId && customer.id === excludeId) continue;
    if (customer.agent_id === agentId) {
      duplicateAgent = { id: customer.id, nama: customer.nama, owner: currentUserName };
    }
    if (isHpValid && customer.hp === hp) {
      duplicateHp = { id: customer.id, nama: customer.nama, owner: currentUserName };
    }
  }

  if (currentUserRole === 'owner') {
    const { data: allCustomers, error: allError } = await supabase
      .from('customers')
      .select('*, users!user_id(nama)');
    
    if (!allError && allCustomers) {
      for (const customer of allCustomers) {
        if (excludeId && customer.id === excludeId) continue;
        if (customer.agent_id === agentId) {
          duplicateAgent = { id: customer.id, nama: customer.nama, owner: customer.users?.nama || 'CS Agent' };
        }
        if (isHpValid && customer.hp === hp) {
          duplicateHp = { id: customer.id, nama: customer.nama, owner: customer.users?.nama || 'CS Agent' };
        }
      }
    }
  }

  return { duplicateAgent, duplicateHp };
}

async function checkDuplicateProspek(hp, excludeId = null) {
  const isHpValid = hp && hp !== '+62' && hp !== '62' && hp !== '0' && hp.trim() !== '';
  
  if (!isHpValid) {
    return null;
  }
  
  let query = supabase.from('prospek').select('*');
  if (currentUserRole !== 'owner') {
    query = query.eq('user_id', currentUser.id);
  }
  
  const { data: prospek, error } = await query;
  if (error) return null;
  
  let duplicateHp = null;

  for (const item of prospek) {
    if (excludeId && item.id === excludeId) continue;
    if (item.hp === hp) {
      duplicateHp = { id: item.id, nama: item.nama, owner: currentUserName };
    }
  }

  if (currentUserRole === 'owner') {
    const { data: allProspek, error: allError } = await supabase
      .from('prospek')
      .select('*, users!user_id(nama)');
    
    if (!allError && allProspek) {
      for (const item of allProspek) {
        if (excludeId && item.id === excludeId) continue;
        if (item.hp === hp) {
          duplicateHp = { id: item.id, nama: item.nama, owner: item.users?.nama || 'CS Agent' };
        }
      }
    }
  }

  return duplicateHp;
}

// ========== KONFIRMASI DIALOG ==========
function showConfirmDialog(title, message, onConfirm, onCancel) {
  const negosiasiModal = document.getElementById('prospekNegosiasiModal');
  let negosiasiWasOpen = false;
  if (negosiasiModal && negosiasiModal.style.display === 'flex') {
    negosiasiWasOpen = true;
    negosiasiModal.style.display = 'none';
  }

  const existingConfirm = document.querySelector('.confirm-dialog-overlay');
  if (existingConfirm) existingConfirm.remove();

  const isDarkMode = document.body.classList.contains('dark-mode');

  const overlay = document.createElement('div');
  overlay.className = 'confirm-dialog-overlay';
  overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.5) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 99999999 !important;
        backdrop-filter: blur(4px);
    `;

  const dialogBgColor = isDarkMode ? '#1e293b' : 'white';
  const dialogTextColor = isDarkMode ? '#f1f5f9' : '#1f2937';
  const dialogSubtitleColor = isDarkMode ? '#94a3b8' : '#6b7280';
  const borderColor = isDarkMode ? '#334155' : '#f0f0f0';
  const warningColor = isDarkMode ? '#fca5a5' : '#ef4444';
  const btnCancelBg = isDarkMode ? '#334155' : '#f3f4f6';
  const btnCancelColor = isDarkMode ? '#f1f5f9' : '#374151';

  overlay.innerHTML = `
        <div class="confirm-dialog-content" style="
            background: ${dialogBgColor} !important;
            border-radius: 24px !important;
            max-width: 400px !important;
            width: 90% !important;
            z-index: 100000000 !important;
            position: relative !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
            border: 1px solid ${borderColor} !important;
        ">
            <h3 style="color: ${dialogTextColor}; font-size: 20px; font-weight: 700; padding: 20px 20px 0; margin-bottom: 4px;">⚠️ ${title}</h3>
            <div class="modal-subtitle" style="color: ${dialogSubtitleColor}; white-space: pre-line; padding: 0 20px 12px; border-bottom: 1px solid ${borderColor}; font-size: 12px;">${message}</div>
            <div style="padding: 0 20px 20px 20px;">
                <p style="font-size: 12px; color: ${warningColor}; margin-bottom: 16px;">⚠️ Peringatan: Data yang sudah dipindahkan TIDAK BISA dikembalikan!</p>
                <div class="modal-buttons" style="display: flex; gap: 12px; margin-top: 8px;">
                    <button id="confirmYesBtn" style="flex: 1; padding: 12px; border: 0; border-radius: 14px; cursor: pointer; font-weight: 600; font-size: 13px; background: #dc2626; color: #fff;">✅ Ya, Lanjutkan</button>
                    <button id="confirmNoBtn" style="flex: 1; padding: 12px; border: 0; border-radius: 14px; cursor: pointer; font-weight: 600; font-size: 13px; background: ${btnCancelBg}; color: ${btnCancelColor};">❌ Batal</button>
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';

  const cleanup = () => {
    overlay.remove();
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    if (negosiasiWasOpen && negosiasiModal) {
      negosiasiModal.style.display = 'flex';
    }
  };

  const yesBtn = overlay.querySelector('#confirmYesBtn');
  const noBtn = overlay.querySelector('#confirmNoBtn');

  yesBtn.onclick = () => {
    cleanup();
    if (onConfirm) onConfirm();
  };

  noBtn.onclick = () => {
    cleanup();
    if (onCancel) onCancel();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      cleanup();
      if (onCancel) onCancel();
    }
  };
}

function showInputDialog(title, message, fields, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';

  let fieldsHtml = '';
  fields.forEach(field => {
    if (field.type === 'select') {
      let optionsHtml = '';
      field.options.forEach(opt => {
        optionsHtml += `<option value="${opt}">${opt}</option>`;
      });
      fieldsHtml += `
                <div class="form-group">
                    <label>${field.label} ${field.required ? '<span class="required">*</span>' : ''}</label>
                    <select id="${field.id}" style="width:100%; padding:12px; border-radius:14px; border:1.5px solid #e5e7eb;">
                        <option value="">Pilih ${field.label}</option>
                        ${optionsHtml}
                    </select>
                </div>
            `;
    } else {
      fieldsHtml += `
                <div class="form-group">
                    <label>${field.label} ${field.required ? '<span class="required">*</span>' : ''}</label>
                    <input type="${field.type}" id="${field.id}" placeholder="${field.placeholder}" style="width:100%; padding:12px; border-radius:14px; border:1.5px solid #e5e7eb;">
                </div>
            `;
    }
  });

  modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <h3>${title}</h3>
            <div class="modal-subtitle" style="white-space: pre-line;">${message}</div>
            <div style="padding: 0 20px;">
                ${fieldsHtml}
            </div>
            <div class="modal-buttons">
                <button id="inputConfirmBtn" class="btn-primary">✅ Lanjutkan</button>
                <button id="inputCancelBtn" class="btn-outline">❌ Batal</button>
            </div>
        </div>
    `;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  const confirmBtn = modal.querySelector('#inputConfirmBtn');
  const cancelBtn = modal.querySelector('#inputCancelBtn');

  confirmBtn.onclick = () => {
    const values = {};
    let allFilled = true;
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        values[field.id] = input.value;
        if (field.required && !input.value) {
          allFilled = false;
        }
      }
    });
    if (!allFilled) {
      showNotif('⚠️ Semua field wajib diisi!', true);
      return;
    }
    modal.remove();
    document.body.classList.remove('modal-open');
    if (onConfirm) onConfirm(values);
  };
  cancelBtn.onclick = () => {
    modal.remove();
    document.body.classList.remove('modal-open');
  };
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.classList.remove('modal-open');
    }
  };
}

// ========== EDIT DEADLINE ==========
let currentEditItem = null;
let currentEditType = null;

function openEditDeadlineModal(id, type, currentDeadline) {
  currentEditItem = id;
  currentEditType = type;

  const modal = document.getElementById('editDeadlineModal');
  if (!modal) return;

  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '9999999';
  modal.style.backdropFilter = 'blur(4px)';

  document.getElementById('editDeadlineDate').value = currentDeadline || getTodayDate();

  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
}

// ========== TARGET KPI FUNCTIONS ==========
async function loadTargetData() {
  if (!currentUser) return;

  try {
    console.log('loadTargetData: Fetching target data...');
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'targetKPI')
      .single();
    
    if (!error && data) {
      targetData = data;
      console.log('loadTargetData: Data ditemukan', targetData);
    } else {
      targetData = {
        agent: 10,
        ca: 20,
        koordinator: 5,
        transaksi: 100,
        monthlyTargets: [],
        updated_at: new Date().toISOString()
      };
      console.log('loadTargetData: Data default digunakan', targetData);
    }
    await updateTargetDisplay();
  } catch (e) {
    console.error('Error load target:', e);
    showNotifTop('❌ Gagal memuat target: ' + e.message, true);
  }
}

async function updateTargetDisplay() {
  console.log('updateTargetDisplay dipanggil, targetData:', targetData);

  const currentAgent = agentsData.filter(a => a.agent_type === 'AGENT').length;
  const currentKoor = agentsData.filter(a => a.agent_type === 'Koordinator Wilayah (KORWIL)' || a.agent_type === 'SUB KORWIL').length;
  const currentCA = agentsData.filter(a => a.agent_type === 'CollectingAgent (CA)' || a.agent_type === 'SUB CA').length;
  let currentTransaksi = window.totalTransaksiGlobal || 0;

  console.log('Pencapaian:', { currentAgent, currentKoor, currentCA, currentTransaksi });

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
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Persentase (%)'
          }
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

async function updateTrendChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  if (trendChart) {
    trendChart.destroy();
  }

  const months = [];
  const agentData = [];
  const caData = [];
  const koorData = [];

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = month.toLocaleDateString('id-ID', {
      month: 'short',
      year: 'numeric'
    });
    months.push(monthName);

    const monthlyTarget = targetData.monthlyTargets?.find(m => m.month === month.toISOString().slice(0, 7));
    agentData.push(monthlyTarget?.target_agent || Math.floor(Math.random() * 10));
    caData.push(monthlyTarget?.target_ca || Math.floor(Math.random() * 20));
    koorData.push(monthlyTarget?.target_koor || Math.floor(Math.random() * 5));
  }

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
          label: 'Agent',
          data: agentData,
          borderColor: '#667eea',
          backgroundColor: 'transparent',
          tension: 0.4
        },
        {
          label: 'CA',
          data: caData,
          borderColor: '#f093fb',
          backgroundColor: 'transparent',
          tension: 0.4
        },
        {
          label: 'Koordinator',
          data: koorData,
          borderColor: '#4facfe',
          backgroundColor: 'transparent',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  });
}

async function saveTargetData() {
  console.log('saveTargetData: Menyimpan target...');

  const agentVal = parseInt(document.getElementById('targetAgentInput')?.value) || 0;
  const koorVal = parseInt(document.getElementById('targetKoorInput')?.value) || 0;
  const caVal = parseInt(document.getElementById('targetCAInput')?.value) || 0;
  const transaksiVal = parseInt(document.getElementById('targetTransaksiInput')?.value) || 0;

  const newTarget = {
    id: 'targetKPI',
    agent: agentVal,
    koordinator: koorVal,
    ca: caVal,
    transaksi: transaksiVal,
    monthlyTargets: targetData.monthlyTargets || [],
    updated_at: new Date().toISOString(),
    updated_by: currentUser?.id || 'unknown'
  };

  try {
    const { error } = await supabase
      .from('settings')
      .upsert(newTarget)
      .eq('id', 'targetKPI');
    
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

  document.querySelectorAll('.month-input').forEach(input => {
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    newInput.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      targetData.monthlyTargets[idx].month = e.target.value;
    });
  });
  document.querySelectorAll('.month-agent').forEach(input => {
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    newInput.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      targetData.monthlyTargets[idx].target_agent = parseInt(e.target.value) || 0;
    });
  });
  document.querySelectorAll('.month-ca').forEach(input => {
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    newInput.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      targetData.monthlyTargets[idx].target_ca = parseInt(e.target.value) || 0;
    });
  });
  document.querySelectorAll('.month-koor').forEach(input => {
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    newInput.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      targetData.monthlyTargets[idx].target_koor = parseInt(e.target.value) || 0;
    });
  });
  document.querySelectorAll('.delete-monthly-btn').forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      targetData.monthlyTargets.splice(idx, 1);
      renderMonthlyTargetList();
    });
  });
}

// ========== TRANSAKSI GLOBAL ==========
async function loadTransaksiGlobal() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabase
      .from('transaksi_global')
      .select('*')
      .order('tanggal', { ascending: false });

    if (error) throw error;

    transaksiList = [];
    let totalTransaksiBulanIni = 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    (data || []).forEach(item => {
      transaksiList.push({ id: item.id, ...item });

      const tglTransaksi = new Date(item.tanggal);
      if (tglTransaksi >= startOfMonth && tglTransaksi <= endOfMonth) {
        totalTransaksiBulanIni += item.nominal || 0;
      }
    });

    window.totalTransaksiGlobal = totalTransaksiBulanIni;
    await updateTargetDisplay();
    return totalTransaksiBulanIni;
  } catch (e) {
    console.error('Error load transaksi global:', e);
    return 0;
  }
}

async function saveTransaksiGlobal(nominal, keterangan, tanggal, transaksiId = null) {
  if (!currentUser) {
    showNotifTop('⚠️ Anda harus login terlebih dahulu!', true);
    return false;
  }

  if (!nominal || nominal <= 0) {
    showNotifTop('⚠️ Jumlah transaksi harus diisi dan lebih dari 0!', true);
    return false;
  }

  try {
    const data = {
      nominal: parseInt(nominal),
      keterangan: keterangan || '',
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      created_by: currentUser.id,
      created_by_name: currentUserName,
      updated_at: new Date().toISOString()
    };

    if (transaksiId) {
      const { error } = await supabase
        .from('transaksi_global')
        .update(data)
        .eq('id', transaksiId);
      if (error) throw error;
      showNotifTop('✅ Transaksi berhasil diupdate!');
    } else {
      const { error } = await supabase
        .from('transaksi_global')
        .insert([data]);
      if (error) throw error;
      showNotifTop('✅ Transaksi berhasil ditambahkan!');
    }

    await loadTransaksiGlobal();
    return true;
  } catch (e) {
    console.error('Error save transaksi global:', e);
    showNotifTop('❌ Gagal menyimpan transaksi: ' + e.message, true);
    return false;
  }
}

async function deleteTransaksiGlobal(transaksiId) {
  if (!confirm('Yakin ingin menghapus transaksi ini?')) return;

  try {
    const { error } = await supabase
      .from('transaksi_global')
      .delete()
      .eq('id', transaksiId);
    if (error) throw error;
    showNotifTop('🗑️ Transaksi dihapus');
    await loadTransaksiGlobal();
    renderTransaksiListGlobal();
  } catch (e) {
    showNotifTop('❌ Gagal hapus: ' + e.message, true);
  }
}

function renderTransaksiListGlobal() {
  const container = document.getElementById('transaksiList');
  if (!container) return;

  if (transaksiList.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:40px; color:#9ca3af;">📭 Belum ada catatan transaksi</p>';
    return;
  }

  container.innerHTML = transaksiList.map(item => `
        <div class="db-item" style="border-left: 3px solid #4f46e5; margin-bottom: 8px;">
            <div class="db-item-info">
                <h4>💰 ${formatRupiah(item.nominal)}</h4>
                <p>${escapeHtml(item.keterangan || '-')}</p>
                <small>📅 ${new Date(item.tanggal).toLocaleDateString('id-ID')} | 👤 oleh: ${escapeHtml(item.created_by_name || 'CS')}</small>
            </div>
            <div class="db-item-actions">
                ${currentUserRole === 'owner' || item.created_by === currentUser.id ? 
                    `<button class="db-item-edit" onclick="editTransaksiGlobal('${item.id}')">✏️ Edit</button>
                     <button class="db-item-delete" onclick="deleteTransaksiGlobal('${item.id}')">🗑️ Hapus</button>` : 
                    `<small style="color:#9ca3af;">Hanya pembuat yang bisa edit/hapus</small>`
                }
            </div>
        </div>
    `).join('');
}

window.editTransaksiGlobal = function(id) {
  const transaksi = transaksiList.find(t => t.id === id);
  if (!transaksi) return;

  if (currentUserRole !== 'owner' && transaksi.created_by !== currentUser.id) {
    showNotifTop('⚠️ Anda hanya bisa mengedit transaksi yang Anda buat sendiri!', true);
    return;
  }

  currentTransaksiId = id;
  document.getElementById('transaksiNominal').value = transaksi.nominal;
  document.getElementById('transaksiKeterangan').value = transaksi.keterangan || '';
  document.getElementById('transaksiTanggal').value = transaksi.tanggal;
  document.getElementById('inputTransaksiModal').style.display = 'flex';
};

function showInputTransaksiModal() {
  currentTransaksiId = null;
  document.getElementById('transaksiNominal').value = '';
  document.getElementById('transaksiKeterangan').value = '';
  document.getElementById('transaksiTanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('inputTransaksiModal').style.display = 'flex';
}

function showTransaksiListModal() {
  renderTransaksiListGlobal();
  document.getElementById('transaksiListModal').style.display = 'flex';
}

async function updateTotalTransaksiDariCustomer() {
    let query = supabase.from('customers').select('progres_transaksi');
    
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error updateTotalTransaksiDariCustomer:', error);
      return 0;
    }
    
    let totalTransaksi = 0;
    
    (data || []).forEach(item => {
        const progres = item.progres_transaksi;
        if (progres && progres.total_tercapai !== undefined) {
            totalTransaksi += progres.total_tercapai;
        }
    });
    
    window.totalTransaksiGlobal = totalTransaksi;
    await updateTargetDisplay();
    
    return totalTransaksi;
}

// ========== CUSTOMER CRUD ==========
async function openDetailCustomer(id) {
  try {
    const d = await supabaseGetById('customers', id);
    if (!d) return;
    
    const progresData = d.progres_transaksi || { items: [], total_tercapai: 0 };
    const totalTercapai = progresData.total_tercapai || 0;
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('nama')
        .eq('id', d.user_id)
        .single();
      const ownerName = userData?.nama || 'CS Agent';
      ownerInfo = `<div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Pemilik Data</label><div class="value">${escapeHtml(ownerName)}</div></div></div>`;
    }

    const statusIcon = d.status === 'closing' ? '🎉' : d.status === 'pending' ? '⏳' : d.status === 'followup' ? '📞' : '🆕';
    let actionButtons = '';
    if (d.status === 'baru') {
      actionButtons = `<button class="btn-primary" onclick="updateCustomerStatus('${id}','followup')">📞 Lanjut ke Follow Up</button>`;
    } else if (d.status === 'followup') {
      actionButtons = `<button class="btn-primary" onclick="openFollowupConfirm('${id}')">📞 Konfirmasi Follow Up</button>`;
    } else if (d.status === 'pending') {
      actionButtons = `<button class="btn-warning" onclick="openPendingModal('${id}')">📝 Kelola Pending</button>`;
    } else if (d.status === 'closing') {
      actionButtons = `<button class="btn-success" onclick="saveToClosingNow('${id}')">💾 Simpan ke DB Closing</button>`;
    }
    
    let followupInfo = '';
    if (d.followup_data) {
      followupInfo = `<div class="detail-info-item"><div class="detail-info-icon">✅</div><div class="detail-info-content"><label>Follow Up</label><div class="value">Terkirim: ${d.followup_data.terkirim ? 'Ya' : 'Tidak'} | Dibalas: ${d.followup_data.dibalas ? 'Ya' : 'Tidak'}</div></div></div>`;
    }
    
    let pendingInfo = '';
    if (d.pending_data && d.pending_data.length > 0) {
      const completedCount = d.pending_data.filter(item => item.checked === true && item.text?.trim() !== '').length;
      const totalCount = d.pending_data.length;
      
      let pendingItemsHtml = '';
      d.pending_data.forEach(item => {
        const statusIconPending = item.checked ? '✅' : '⭕';
        const textDisplay = item.text && item.text.trim() !== '' ? escapeHtml(item.text) : '<em style="color:#9ca3af;">(kosong)</em>';
        pendingItemsHtml += `
          <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 14px;">${statusIconPending}</span>
            <span style="flex: 1; font-size: 12px;">${textDisplay}</span>
          </div>
        `;
      });
      
      pendingInfo = `
        <div class="detail-info-item" style="align-items: flex-start;">
          <div class="detail-info-icon">📝</div>
          <div class="detail-info-content">
            <label>Pending Responses (${completedCount}/${totalCount} balasan tercatat)</label>
            <div class="value" style="margin-top: 8px;">
              <div style="background: #f9fafb; border-radius: 8px; padding: 8px; max-height: 150px; overflow-y: auto; border: 1px solid #e5e7eb;">
                ${pendingItemsHtml}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const deadlineDisplay = d.tanggal || '-';
    const editBtn = `<button class="edit-deadline-btn" onclick="openEditDeadlineModal('${id}','customer','${d.tanggal || ''}')" title="Edit deadline">✏️</button>`;

    const uplineName = d.upline_name || '-';
    const uplinePhone = d.upline_phone || '-';
    const targetPhone = getTargetPhone(d);
    const targetName = getTargetName(d);

    document.getElementById('detailContent').innerHTML = `
      <div class="detail-header">
        <div class="detail-avatar">${statusIcon}</div>
        <h3>${escapeHtml(d.nama)}</h3>
        <div class="detail-status">${getStatusBadge(d.status)}</div>
      </div>
      <div class="detail-body">
        <div class="detail-info">
          ${ownerInfo}
          <div class="detail-info-item">
            <div class="detail-info-icon">🆔</div>
            <div class="detail-info-content">
              <label>ID Agent</label>
              <div class="value">${escapeHtml(d.agent_id || '-')}</div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-icon">🏷️</div>
            <div class="detail-info-content">
              <label>Type/Class</label>
              <div class="value">${escapeHtml(d.agent_type || '-')}</div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-icon">📱</div>
            <div class="detail-info-content">
              <label>Aplikasi</label>
              <div class="value">${escapeHtml(d.apk || '-')}</div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-icon">📱</div>
            <div class="detail-info-content">
              <label>Nomor WhatsApp</label>
              <div class="value">${escapeHtml(d.hp)}</div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-icon">👤</div>
            <div class="detail-info-content">
                <label>Upline / Atasan</label>
                <div class="value">${escapeHtml(uplineName)}</div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-icon">📱</div>
            <div class="detail-info-content">
                <label>Nomor HP Upline</label>
                <div class="value">${escapeHtml(uplinePhone)}</div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-icon">🎯</div>
            <div class="detail-info-content">
                <label>Nomor Tujuan WA</label>
                <div class="value" style="color: #4f46e5; font-weight: 600;">
                    ${targetName} - ${targetPhone}
                </div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-icon">📅</div>
            <div class="detail-info-content">
              <label>Deadline</label>
              <div class="value">${deadlineDisplay} ${editBtn}</div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-icon">🎯</div>
            <div class="detail-info-content">
              <label>Total Transaksi Tercapai</label>
              <div class="value" style="color: ${totalTercapai >= 0 ? '#10b981' : '#ef4444'}; font-weight: 700;">
                ${totalTercapai > 0 ? '+' : ''}${totalTercapai.toLocaleString()} Transaksi
              </div>
            </div>
          </div>
          ${followupInfo}
          ${pendingInfo}
          <div class="detail-info-item">
            <div class="detail-info-icon">📌</div>
            <div class="detail-info-content">
              <label>Status</label>
              <div class="value">${d.status === 'followup' ? 'Follow Up' : d.status === 'baru' ? 'Baru' : d.status}</div>
            </div>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn-success" onclick="openWACustomer('${id}')">💬 WhatsApp</button>
          <button class="btn-primary" onclick="openTambahProgres('${id}')">📊 Tambah Progres</button>
          ${actionButtons}
        </div>
      </div>
      <div class="detail-footer">
        <button class="btn-outline" onclick="closeModal('detailModal')">❌ Tutup</button>
        <button class="btn-danger" onclick="deleteCustomer('${id}')">🗑️ Hapus</button>
      </div>
    `;
    showModal('detailModal');
  } catch (error) {
    console.error('Error openDetailCustomer:', error);
    showNotifTop('❌ Gagal memuat detail customer: ' + error.message, true);
  }
}

window.updateCustomerStatus = async function(id, newStatus) {
  if (newStatus === 'followup') {
    try {
      const d = await supabaseGetById('customers', id);
      const currentDeadline = d.tanggal || getTodayDate();
      const newDeadline = addDaysToDate(currentDeadline, 1);
      await supabaseUpdate('customers', id, {
        status: 'followup',
        tanggal: newDeadline
      });
      showNotif(`✅ Status berhasil diupdate ke Follow Up. Deadline +1 hari menjadi ${newDeadline}`);
      closeModal('detailModal');
      loadAllData();
    } catch (error) {
      showNotif('❌ Gagal: ' + error.message, true);
    }
  }
};

window.deleteCustomer = async function(id) {
  if (!confirm('Yakin hapus customer ini? Data akan dihapus permanen!')) return;

  try {
    await supabaseDelete('customers', id);
    closeModal('detailModal');
    showNotifTop('🗑️ Data customer berhasil dihapus');
    setTimeout(() => {
      loadAllData();
      updateAllBadges();
    }, 300);
  } catch (e) {
    showNotifTop('❌ Gagal hapus: ' + e.message, true);
  }
};

window.deleteProspek = async function(id) {
  if (!confirm('Yakin hapus prospek ini? Data akan dihapus permanen!')) return;

  try {
    await supabaseDelete('prospek', id);
    closeModal('detailModal');
    showNotifTop('🗑️ Data prospek berhasil dihapus');
    setTimeout(() => {
      loadAllData();
      updateAllBadges();
    }, 300);
  } catch (e) {
    showNotifTop('❌ Gagal hapus: ' + e.message, true);
  }
};

// ========== FOLLOWUP CONFIRMATION ==========
function openFollowupConfirm(id) {
  console.log('openFollowupConfirm dipanggil untuk ID:', id);
  currentPendingId = id;
  
  const modal = document.getElementById('followupConfirmModal');
  if (!modal) {
    console.error('Modal followupConfirmModal tidak ditemukan!');
    return;
  }
  
  const cb1 = document.getElementById('followup_terkirim');
  const cb2 = document.getElementById('followup_dibalas');
  const yesBtn = document.getElementById('followupConfirmYes');
  const noBtn = document.getElementById('followupConfirmNo');
  
  if (!cb1 || !cb2 || !yesBtn || !noBtn) {
    console.error('Elemen tidak ditemukan!');
    return;
  }
  
  cb1.checked = false;
  cb2.checked = false;
  yesBtn.disabled = true;
  yesBtn.textContent = '✅ Lanjut ke Pending';
  noBtn.disabled = false;
  noBtn.textContent = '📵 Nomor salah/Tidak bisa dihubungi';
  
  const newCb1 = cb1.cloneNode(true);
  const newCb2 = cb2.cloneNode(true);
  const newYesBtn = yesBtn.cloneNode(true);
  const newNoBtn = noBtn.cloneNode(true);
  
  cb1.parentNode.replaceChild(newCb1, cb1);
  cb2.parentNode.replaceChild(newCb2, cb2);
  yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
  noBtn.parentNode.replaceChild(newNoBtn, noBtn);
  
  const finalCb1 = document.getElementById('followup_terkirim');
  const finalCb2 = document.getElementById('followup_dibalas');
  const finalYesBtn = document.getElementById('followupConfirmYes');
  const finalNoBtn = document.getElementById('followupConfirmNo');
  
  function updateYesButton() {
    const isChecked = finalCb1.checked && finalCb2.checked;
    finalYesBtn.disabled = !isChecked;
    console.log('Checkbox status - terkirim:', finalCb1.checked, 'dibalas:', finalCb2.checked, 'disabled:', finalYesBtn.disabled);
  }
  
  finalCb1.onclick = updateYesButton;
  finalCb2.onclick = updateYesButton;
  
  function safeCloseModal() {
    try {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
      console.log('Modal followupConfirmModal ditutup');
    } catch(e) {
      console.error('Error closing modal:', e);
    }
  }
  
  finalYesBtn.onclick = function() {
    console.log('Tombol YES diklik, disabled:', finalYesBtn.disabled);
    
    if (finalYesBtn.disabled) {
      showNotifTop('⚠️ Harap centang kedua checklist terlebih dahulu!', true);
      return;
    }
    
    finalYesBtn.disabled = true;
    finalYesBtn.textContent = '⏳ Memproses...';
    finalNoBtn.disabled = true;
    
    setTimeout(async () => {
      try {
        const doc = await supabaseGetById('customers', id);
        if (!doc) {
          throw new Error('Data customer tidak ditemukan');
        }
        
        const currentDeadline = doc.tanggal || getTodayDate();
        const newDeadline = addDaysToDate(currentDeadline, 1);
        
        await supabaseUpdate('customers', id, {
          followup_data: {
            terkirim: true,
            dibalas: true,
            timestamp: new Date().toISOString()
          },
          status: 'pending',
          tanggal: newDeadline
        });
        
        safeCloseModal();
        showNotifTop(`✅ Customer dipindahkan ke Pending. Deadline +1 hari menjadi ${newDeadline}`);
        setTimeout(() => {
          loadAllData();
          closeModal('detailModal');
        }, 500);
      } catch (error) {
        console.error('Error update customer:', error);
        showNotifTop('❌ Gagal: ' + error.message, true);
        finalYesBtn.disabled = false;
        finalYesBtn.textContent = '✅ Lanjut ke Pending';
        finalNoBtn.disabled = false;
      }
    }, 50);
  };
  
  finalNoBtn.onclick = function() {
    console.log('Tombol NO diklik');
    
    finalNoBtn.disabled = true;
    finalNoBtn.textContent = '⏳ Memproses...';
    finalYesBtn.disabled = true;
    
    setTimeout(async () => {
      try {
        const doc = await supabaseGetById('customers', id);
        if (!doc) {
          throw new Error('Data customer tidak ditemukan');
        }
        
        showConfirmDialog(
          'Pindahkan ke Database Nomor Salah?',
          `Apakah Anda yakin nomor "${escapeHtml(doc.hp)}" milik "${escapeHtml(doc.nama)}" tidak dapat dihubungi?`,
          async () => {
            await supabase.from('nomor_salah').insert([{
              ...doc,
              alasan: 'Nomor tidak bisa dihubungi / tidak aktif',
              deleted_at: new Date().toISOString(),
              user_id: doc.user_id
            }]);
            await supabaseDelete('customers', id);
            safeCloseModal();
            showNotifTop('📵 Data dipindahkan ke Database Nomor Salah');
            setTimeout(() => {
              closeModal('detailModal');
              loadAllData();
            }, 500);
          },
          () => {
            finalNoBtn.disabled = false;
            finalNoBtn.textContent = '📵 Nomor salah/Tidak bisa dihubungi';
            finalYesBtn.disabled = false;
            updateYesButton();
          }
        );
      } catch (error) {
        console.error('Error:', error);
        showNotifTop('❌ Gagal: ' + error.message, true);
        finalNoBtn.disabled = false;
        finalNoBtn.textContent = '📵 Nomor salah/Tidak bisa dihubungi';
        finalYesBtn.disabled = false;
      }
    }, 50);
  };
  
  modal.style.display = 'flex';
}

// ========== PENDING MODAL ==========
function openPendingModal(id) {
  currentPendingId = id;
  supabaseGetById('customers', id).then(doc => {
    pendingItems = doc.pending_data || [];
    renderPendingModal();
    document.getElementById('pendingModal').style.display = 'flex';
  }).catch(err => {
    console.error('Error openPendingModal:', err);
    showNotifTop('❌ Gagal memuat data pending: ' + err.message, true);
  });
}

function renderPendingModal() {
  const container = document.getElementById('pendingItemsContainer');
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
    div.innerHTML = `
            <input type="text" value="${escapeHtml(item.text)}" placeholder="Balasan/respon..." style="flex:1; padding: 6px; border-radius: 6px; border: 1px solid #e5e7eb;">
            <input type="checkbox" ${item.checked ? 'checked' : ''} style="width: 20px; height: 20px;">
            <button class="delete-pending-item" data-idx="${idx}" style="background: none; border: none; cursor: pointer; font-size: 16px;">🗑️</button>
        `;
    const textInput = div.querySelector('input[type="text"]');
    const checkBox = div.querySelector('input[type="checkbox"]');
    const delBtn = div.querySelector('.delete-pending-item');

    textInput.addEventListener('change', (e) => {
      pendingItems[idx].text = e.target.value;
      updatePendingButtons();
    });
    checkBox.addEventListener('change', (e) => {
      pendingItems[idx].checked = e.target.checked;
      updatePendingButtons();
    });
    delBtn.addEventListener('click', () => {
      pendingItems.splice(idx, 1);
      renderPendingModal();
      updatePendingButtons();
    });
    container.appendChild(div);
  });

  const addBtn = document.getElementById('addPendingItemBtn');
  if (addBtn) {
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    newAddBtn.onclick = () => {
      pendingItems.push({ text: '', checked: false });
      renderPendingModal();
      updatePendingButtons();
    };
  }

  updatePendingButtons();
}

function updatePendingButtons() {
  const allFilledAndChecked = pendingItems.length > 0 && pendingItems.every(item => item.checked === true && item.text.trim() !== '');

  const finishBtn = document.getElementById('pendingFinishBtn');
  if (finishBtn) {
    if (allFilledAndChecked) {
      finishBtn.disabled = false;
      const newFinishBtn = finishBtn.cloneNode(true);
      finishBtn.parentNode.replaceChild(newFinishBtn, finishBtn);
      newFinishBtn.onclick = async () => {
        await supabaseUpdate('customers', currentPendingId, { pending_data: pendingItems });
        await confirmClosing(currentPendingId);
        closeModal('pendingModal');
      };
    } else {
      finishBtn.disabled = true;
      finishBtn.onclick = () => {
        if (finishBtn.disabled) {
          let pesan = pendingItems.length === 0 ?
            '⚠️ Tambahkan minimal satu balasan terlebih dahulu!' :
            '⚠️ Harap isi dan centang SEMUA balasan sebelum lanjut ke Closing!';
          showNotifTop(pesan, true);
        }
      };
    }
  }

  const saveBtn = document.getElementById('pendingSaveBtn');
  if (saveBtn) {
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.onclick = async () => {
      try {
        const doc = await supabaseGetById('customers', currentPendingId);
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
          showNotifTop('⚠️ Tidak ada perubahan data! Silakan ubah data terlebih dahulu sebelum menyimpan.', true);
          return;
        }

        const newDeadline = addDaysToDate(doc.tanggal || getTodayDate(), 3);
        await supabaseUpdate('customers', currentPendingId, {
          pending_data: pendingItems,
          tanggal: newDeadline
        });
        showNotifTop(`💾 Data pending berhasil disimpan. Deadline +3 hari menjadi ${newDeadline}`);
        closeModal('pendingModal');
        loadAllData();
      } catch (err) {
        showNotifTop('❌ Gagal menyimpan: ' + err.message, true);
      }
    };
  }

  const cancelBtn = document.getElementById('pendingCancelBtn');
  if (cancelBtn) {
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.onclick = () => {
      closeModal('pendingModal');
    };
  }
}

// ========== PROSPEK FUNCTIONS ==========
async function openDetailProspek(id) {
  try {
    const d = await supabaseGetById('prospek', id);
    if (!d) return;
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('nama')
        .eq('id', d.user_id)
        .single();
      const ownerName = userData?.nama || 'CS Agent';
      ownerInfo = `<div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Pemilik Data</label><div class="value">${escapeHtml(ownerName)}</div></div></div>`;
    }

    let statusIcon = d.status === 'Negosiasi' ? '📋' : d.status === 'Dihubungi' ? '📞' : d.status === 'Tertarik' ? '⭐' : '🆕';
    let actionButtons = '';

    if (d.status === 'Baru') {
      actionButtons = `<button class="btn-primary" onclick="lanjutKeDihubungi('${id}')">📞 Lanjut ke Dihubungi</button>`;
    } else if (d.status === 'Dihubungi') {
      actionButtons = `<button class="btn-primary" onclick="openProspekDihubungiConfirm('${id}')">✅ Konfirmasi Dihubungi</button>`;
    } else if (d.status === 'Negosiasi') {
      actionButtons = `<button class="btn-primary" onclick="openProspekNegosiasiModal('${id}')">📝 Kelola Negosiasi</button>`;
    } else if (d.status === 'Tertarik') {
      actionButtons = `<button class="btn-primary" onclick="showConvertToCustomerModal('${id}')">🔄 Jadikan Customer</button>`;
    }

    let negosiasiInfo = '';
    if (d.negosiasi_data) {
      const isComplete = d.negosiasi_data.is_complete || (d.negosiasi_data.aplikasi && d.negosiasi_data.domisili && d.negosiasi_data.transaksi);
      negosiasiInfo = `<div class="detail-info-item"><div class="detail-info-icon">📋</div><div class="detail-info-content"><label>Data Negosiasi ${isComplete ? '✅ Lengkap' : '📝 Draft'}</label><div class="value">Aplikasi: ${d.negosiasi_data.aplikasi || '-'}<br>Domisili: ${d.negosiasi_data.domisili || '-'}<br>Transaksi: ${d.negosiasi_data.transaksi || '-'}<br>Deposit: ${d.negosiasi_data.deposit || '-'}<br>Tertarik: ${d.negosiasi_data.tertarik || '-'}<br>Penawaran: ${d.negosiasi_data.penawaran || '-'}</div></div></div>`;
    }

    let dihubungiInfo = '';
    if (d.dihubungi_data) {
      dihubungiInfo = `<div class="detail-info-item"><div class="detail-info-icon">✅</div><div class="detail-info-content"><label>Konfirmasi Dihubungi</label><div class="value">Terkirim: ${d.dihubungi_data.terkirim ? 'Ya' : 'Tidak'} | Dibalas: ${d.dihubungi_data.dibalas ? 'Ya' : 'Tidak'}</div></div></div>`;
    }

    const deadlineDisplay = d.deadline || '-';
    const editBtn = `<button class="edit-deadline-btn" onclick="openEditDeadlineModal('${id}','prospek','${d.deadline || ''}')" title="Edit deadline">✏️</button>`;

    document.getElementById('detailContent').innerHTML = `
            <div class="detail-header"><div class="detail-avatar">${statusIcon}</div><h3>${escapeHtml(d.nama)}</h3><div class="detail-status">${getStatusBadge(d.status)}</div></div>
            <div class="detail-body">
                <div class="detail-info">
                    ${ownerInfo}
                    <div class="detail-info-item"><div class="detail-info-icon">🏷️</div><div class="detail-info-content"><label>Type/Class</label><div class="value">${escapeHtml(d.agent_type || '-')}</div></div></div>
                    <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
                    <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Deadline</label><div class="value">${deadlineDisplay} ${editBtn}</div></div></div>
                    ${dihubungiInfo}
                    ${negosiasiInfo}
                    <div class="detail-info-item"><div class="detail-info-icon">📌</div><div class="detail-info-content"><label>Status</label><div class="value">${d.status}</div></div></div>
                </div>
                <div class="detail-actions">
                    <button class="btn-success" onclick="openWA('${d.hp}')">💬 WhatsApp</button>
                    ${actionButtons}
                </div>
            </div>
            <div class="detail-footer"><button class="btn-outline" onclick="closeModal('detailModal')">❌ Tutup</button><button class="btn-danger" onclick="deleteProspek('${id}')">🗑️ Hapus</button></div>
        `;
    showModal('detailModal');
  } catch (error) {
    console.error('Error openDetailProspek:', error);
    showNotifTop('❌ Gagal memuat detail prospek: ' + error.message, true);
  }
}

function lanjutKeDihubungi(id) {
  supabaseGetById('prospek', id).then(doc => {
    const currentDeadline = doc.deadline || getTodayDate();
    const newDeadline = addDaysToDate(currentDeadline, 1);
    supabaseUpdate('prospek', id, {
      status: 'Dihubungi',
      deadline: newDeadline
    }).then(() => {
      showNotif(`✅ Status berubah menjadi Dihubungi. Deadline +1 hari menjadi ${newDeadline}`);
      loadAllData();
      closeModal('detailModal');
    }).catch(err => showNotif('❌ Gagal: ' + err.message, true));
  });
}

function openProspekDihubungiConfirm(id) {
  currentProspekId = id;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '99999999';
  modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3>✅ Konfirmasi Dihubungi</h3>
            <div class="modal-subtitle">Pastikan sudah melakukan komunikasi dengan prospek</div>
            <div style="padding: 0 20px;">
                <div class="form-group">
                    <label><input type="checkbox" id="prospek_terkirim" style="margin-right: 8px;"> Apakah pesan sudah terkirim dan terbaca?</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="prospek_dibalas" style="margin-right: 8px;"> Apakah sudah di balas?</label>
                </div>
            </div>
            <div class="modal-buttons" style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button id="prospekConfirmYes" class="btn-primary" disabled style="flex: 1;">✅ Lanjut ke Negosiasi</button>
                <button id="prospekConfirmNo" class="btn-danger" style="flex: 1;">📵 Nomor Salah/Tidak bisa dihubungi</button>
                <button id="prospekConfirmCancel" class="btn-outline" style="flex: 1;">❌ Batal</button>
            </div>
        </div>
    `;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  const cb1 = modal.querySelector('#prospek_terkirim');
  const cb2 = modal.querySelector('#prospek_dibalas');
  const yesBtn = modal.querySelector('#prospekConfirmYes');
  const noBtn = modal.querySelector('#prospekConfirmNo');
  const cancelBtn = modal.querySelector('#prospekConfirmCancel');

  const checkBoth = () => {
    const isChecked = cb1.checked && cb2.checked;
    yesBtn.disabled = !isChecked;
    if (!isChecked) {
      yesBtn.title = 'Harap centang kedua opsi terlebih dahulu';
    } else {
      yesBtn.title = '';
    }
  };

  cb1.onchange = checkBoth;
  cb2.onchange = checkBoth;
  checkBoth();

  yesBtn.onclick = async () => {
    if (yesBtn.disabled) {
      showNotifTop('⚠️ Harap centang "pesan terkirim" DAN "sudah dibalas" terlebih dahulu!', true);
      return;
    }
    const doc = await supabaseGetById('prospek', id);
    const currentDeadline = doc.deadline || getTodayDate();
    const newDeadline = addDaysToDate(currentDeadline, 1);
    await supabaseUpdate('prospek', id, {
      status: 'Negosiasi',
      deadline: newDeadline,
      dihubungi_data: {
        terkirim: true,
        dibalas: true,
        timestamp: new Date().toISOString(),
        via_wa: true
      }
    });
    modal.remove();
    document.body.classList.remove('modal-open');
    showNotifTop(`✅ Prospek dipindahkan ke Negosiasi. Deadline +1 hari menjadi ${newDeadline}`);
    loadAllData();
    closeModal('detailModal');
  };

  noBtn.onclick = async () => {
    const data = await supabaseGetById('prospek', id);
    if (data) {
      showConfirmDialog(
        'Pindahkan ke Database Nomor Salah?',
        `Apakah Anda yakin nomor "${escapeHtml(data.hp)}" milik "${escapeHtml(data.nama)}" tidak dapat dihubungi?\n\n⚠️ Data yang sudah dipindahkan TIDAK BISA dikembalikan!`,
        async () => {
          await supabase.from('nomor_salah').insert([{
            nama: data.nama,
            hp: data.hp,
            alasan: 'Nomor tidak bisa dihubungi / tidak aktif',
            deleted_at: new Date().toISOString(),
            user_id: data.user_id
          }]);
          await supabaseDelete('prospek', id);
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

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  };
}

function openProspekNegosiasiModal(id) {
  currentProspekId = id;
  const fields = ['prospek_aplikasi', 'prospek_domisili', 'prospek_transaksi', 'prospek_deposit', 'prospek_tertarik', 'prospek_penawaran'];
  fields.forEach(f => document.getElementById(f).value = '');

  supabaseGetById('prospek', id).then(doc => {
    const data = doc;
    if (data.negosiasi_data) {
      document.getElementById('prospek_aplikasi').value = data.negosiasi_data.aplikasi || '';
      document.getElementById('prospek_domisili').value = data.negosiasi_data.domisili || '';
      document.getElementById('prospek_transaksi').value = data.negosiasi_data.transaksi || '';
      document.getElementById('prospek_deposit').value = data.negosiasi_data.deposit || '';
      document.getElementById('prospek_tertarik').value = data.negosiasi_data.tertarik || '';
      document.getElementById('prospek_penawaran').value = data.negosiasi_data.penawaran || '';
    }
  });

  const modal = document.getElementById('prospekNegosiasiModal');
  if (!modal) return;

  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '9999999';
  modal.style.backdropFilter = 'blur(4px)';

  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.zIndex = '10000000';
    modalContent.style.position = 'relative';
    modalContent.style.background = '#fff';
  }

  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal('prospekNegosiasiModal');
    }
  };

  document.getElementById('negosiasiTertarikBtn').onclick = async () => {
    const aplikasi = document.getElementById('prospek_aplikasi').value;
    const domisili = document.getElementById('prospek_domisili').value;
    const transaksi = document.getElementById('prospek_transaksi').value;
    const deposit = document.getElementById('prospek_deposit').value;
    const tertarik = document.getElementById('prospek_tertarik').value;
    const penawaran = document.getElementById('prospek_penawaran').value;

    if (!aplikasi || !domisili || !transaksi || !deposit || !tertarik || !penawaran) {
      showNotifTop('⚠️ Semua field harus diisi!', true);
      return;
    }

    showConfirmDialog(
      'Pindahkan ke Status Tertarik?',
      'Apakah data kuesioner sudah lengkap dan prospek tertarik?\n\n⚠️ Setelah ini prospek akan masuk ke status TERTARIK.',
      async () => {
        const negosiasi_data = {
          aplikasi: aplikasi,
          domisili: domisili,
          transaksi: transaksi,
          deposit: deposit,
          tertarik: tertarik,
          penawaran: penawaran,
          timestamp: new Date().toISOString()
        };
        await supabaseUpdate('prospek', currentProspekId, {
          status: 'Tertarik',
          negosiasi_data: negosiasi_data
        });
        showNotifTop('✅ Prospek dipindahkan ke Tertarik');
        closeModal('prospekNegosiasiModal');
        loadAllData();
        closeModal('detailModal');
      }
    );
  };

  document.getElementById('negosiasiTidakTertarikBtn').onclick = async () => {
    const aplikasi = document.getElementById('prospek_aplikasi').value;
    const domisili = document.getElementById('prospek_domisili').value;
    const transaksi = document.getElementById('prospek_transaksi').value;
    const deposit = document.getElementById('prospek_deposit').value;
    const tertarik = document.getElementById('prospek_tertarik').value;
    const penawaran = document.getElementById('prospek_penawaran').value;

    if (!aplikasi || !domisili || !transaksi || !deposit || !tertarik || !penawaran) {
      showNotifTop('⚠️ Data kuesioner harus diisi LENGKAP sebelum pindah ke Tidak Tertarik!', true);
      return;
    }

    const data = await supabaseGetById('prospek', currentProspekId);
    if (data) {
      showConfirmDialog(
        'Pindahkan ke Database Tidak Tertarik?',
        `Apakah Anda yakin ingin memindahkan "${escapeHtml(data.nama)}" ke DATABASE TIDAK TERTARIK?\n\n⚠️ Data yang sudah dipindahkan TIDAK BISA dikembalikan!`,
        async () => {
          await supabase.from('db_tidak_tertarik').insert([{
            nama: data.nama,
            hp: data.hp,
            tanggal: new Date().toISOString(),
            user_id: data.user_id,
            alasan: 'Tidak tertarik setelah negosiasi',
            status_sebelumnya: data.status,
            negosiasi_data: data.negosiasi_data || null
          }]);
          await supabaseDelete('prospek', currentProspekId);
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
    const aplikasi = document.getElementById('prospek_aplikasi').value;
    const domisili = document.getElementById('prospek_domisili').value;
    const transaksi = document.getElementById('prospek_transaksi').value;
    const deposit = document.getElementById('prospek_deposit').value;
    const tertarik = document.getElementById('prospek_tertarik').value;
    const penawaran = document.getElementById('prospek_penawaran').value;

    const doc = await supabaseGetById('prospek', currentProspekId);
    const existingData = doc.negosiasi_data || {};

    const hasChanges =
      aplikasi !== (existingData.aplikasi || '') ||
      domisili !== (existingData.domisili || '') ||
      transaksi !== (existingData.transaksi || '') ||
      deposit !== (existingData.deposit || '') ||
      tertarik !== (existingData.tertarik || '') ||
      penawaran !== (existingData.penawaran || '');

    const hasAnyData = aplikasi || domisili || transaksi || deposit || tertarik || penawaran;

    if (!hasAnyData) {
      showNotifTop('⚠️ Tidak ada data untuk disimpan!', true);
      return;
    }

    if (!hasChanges) {
      showNotifTop('⚠️ Tidak ada perubahan data! Silakan ubah data terlebih dahulu sebelum menyimpan.', true);
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

    const currentDeadline = doc.deadline || getTodayDate();
    const newDeadline = addDaysToDate(currentDeadline, 3);

    await supabaseUpdate('prospek', currentProspekId, {
      negosiasi_data: negosiasi_data,
      deadline: newDeadline
    });
    showNotifTop(`💾 Data kuesioner berhasil disimpan. Deadline +3 hari menjadi ${newDeadline}`);
    closeModal('prospekNegosiasiModal');
    loadAllData();
    closeModal('detailModal');
  };

  const batalBtn = document.getElementById('negosiasiBatalBtn');
  if (batalBtn) {
    const newBatalBtn = batalBtn.cloneNode(true);
    batalBtn.parentNode.replaceChild(newBatalBtn, batalBtn);
    newBatalBtn.onclick = () => {
      closeModal('prospekNegosiasiModal');
    };
  }
}

// ========== CLOSING FUNCTIONS ==========
async function saveToClosingDB(id, data) {
  try {
    await supabase.from('db_closing').insert([{
      nama: data.nama,
      hp: data.hp,
      tanggal: data.tanggal || getTodayDate(),
      closing_date: new Date().toISOString(),
      user_id: data.user_id,
      followup_data: data.followup_data || null,
      pending_data: data.pending_data || []
    }]);
    await supabaseDelete('customers', id);
    showNotif('✅ Data berhasil masuk Database Closing!');
    updateAllBadges();
    return true;
  } catch (e) {
    showNotif('❌ Gagal: ' + e.message, true);
    return false;
  }
}

async function saveToTidakTertarikDB(id, data) {
  try {
    await supabase.from('db_tidak_tertarik').insert([{
      nama: data.nama,
      hp: data.hp,
      tanggal: new Date().toISOString(),
      user_id: data.user_id,
      dihubungi_data: data.dihubungi_data || null,
      negosiasi_data: data.negosiasi_data || null
    }]);
    await supabaseDelete('prospek', id);
    showNotif('✅ Data berhasil masuk Database Tidak Tertarik!');
    updateAllBadges();
    return true;
  } catch (e) {
    showNotif('❌ Gagal: ' + e.message, true);
    return false;
  }
}

function confirmClosing(id) {
  showConfirmDialog(
    'Pindahkan ke Database Closing?',
    `Apakah Anda yakin ingin memindahkan data ini ke DATABASE CLOSING?\n\n⚠️ Data yang sudah dipindahkan TIDAK BISA dikembalikan ke Followup Agen!`,
    async () => {
        const doc = await supabaseGetById('customers', id);
        if (doc) await saveToClosingDB(id, doc);
        loadAllData();
        updateAllBadges();
      },
      async () => {
        await supabaseUpdate('customers', id, { status: 'closing' });
        showNotif('📌 Data tetap di kolom Closing');
        loadAllData();
        updateAllBadges();
      }
  );
}

function saveToClosingNow(id) {
  showConfirmDialog(
    'Pindahkan ke Database Closing?',
    `Apakah Anda yakin ingin memindahkan customer ini ke DATABASE CLOSING?\n\n⚠️ Data yang sudah dipindahkan TIDAK BISA dikembalikan ke Followup Agen!`,
    async () => {
      try {
        const doc = await supabaseGetById('customers', id);
        if (doc) {
          await saveToClosingDB(id, doc);
          closeModal('detailModal');
          showNotif('✅ Data berhasil dipindahkan ke DB Closing');
          updateAllBadges();
        }
      } catch (err) {
        showNotif('❌ Gagal: ' + err.message, true);
      }
    }
  );
}

function showConvertToCustomerModal(prospekId) {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);
  const followupDate = nextMonth.toISOString().split('T')[0];

  showInputDialog(
    '📋 Lengkapi Data Customer',
    `Data prospek akan dipindahkan ke Followup Agen.\n\nSilakan lengkapi data berikut:`,
    [{
        id: 'inputAgentId',
        label: 'ID Agent',
        type: 'text',
        placeholder: 'Contoh: AG-001',
        required: true
      },
      {
        id: 'inputAplikasi',
        label: 'Aplikasi',
        type: 'select',
        options: ['GNP', 'BSB', 'BTN'],
        required: true
      }
    ],
    async (values) => {
      if (!values.inputAgentId || !values.inputAplikasi) {
        showNotifTop('⚠️ ID Agent dan Aplikasi wajib diisi!', true);
        return;
      }

      const doc = await supabaseGetById('prospek', prospekId);
      const data = doc;
      const cleanHp = data.hp;
      const { duplicateAgent: dupAgent, duplicateHp: dupHp } = await checkDuplicateCustomer(values.inputAgentId, cleanHp);

      if (dupAgent) {
        showNotifTop(`⚠️ ID Agent "${values.inputAgentId}" sudah terdaftar oleh ${dupAgent.owner}!`, true);
        return;
      }
      if (dupHp) {
        showNotifTop(`⚠️ Nomor WhatsApp "${cleanHp}" sudah terdaftar oleh ${dupHp.owner}!`, true);
        return;
      }

      showConfirmDialog(
        'Jadikan Customer & Pindahkan ke DB Commitment?',
        `Apakah Anda yakin ingin menjadikan "${escapeHtml(data.nama)}" sebagai Customer?\n\n` +
        `🆔 ID Agent: ${values.inputAgentId}\n` +
        `📱 Aplikasi: ${values.inputAplikasi}\n` +
        `📅 Tanggal Followup: ${followupDate}\n\n` +
        `📋 Data akan DISIMPAN ke DATABASE COMMITMENT sebagai arsip.\n` +
        `📞 Data akan DIPINDAHKAN ke FOLLOWUP AGEN dengan status "Baru".\n\n` +
        `⚠️ Proses ini TIDAK BISA dibatalkan dan data akan DIHAPUS dari Prospek Agen!`,
        async () => {
          try {
            showNotifTop('⏳ Memproses pemindahan data...');

            await supabase.from('db_commitment').insert([{
              nama: data.nama,
              hp: data.hp,
              negosiasi_data: data.negosiasi_data || null,
              agent_id: values.inputAgentId,
              aplikasi: values.inputAplikasi,
              committed_at: new Date().toISOString(),
              user_id: data.user_id,
              original_prospek_id: prospekId,
              followup_date: followupDate
            }]);

            await supabase.from('customers').insert([{
              agent_id: values.inputAgentId,
              nama: data.nama,
              hp: data.hp,
              apk: values.inputAplikasi,
              tanggal: followupDate,
              status: 'baru',
              user_id: data.user_id,
              created_at: new Date().toISOString(),
              converted_from: 'prospek_commitment',
              followup_data: null,
              pending_data: []
            }]);

            await supabaseDelete('prospek', prospekId);

            showNotifTop('✅ Berhasil! Customer telah ditambahkan ke Followup Agen dan disimpan ke DB Commitment');
            closeModal('detailModal');
            loadAllData();
            updateAllBadges();
          } catch (error) {
            showNotifTop('❌ Gagal: ' + error.message, true);
            console.error(error);
          }
        }
      );
    }
  );
}

// ========== PRODUK MASTER FUNCTIONS ==========
async function loadProduk() {
  if (!currentUser) return;
  
  const { data, error } = await supabase
    .from('produk')
    .select('*')
    .limit(200);
  
  if (error) {
    console.error('Error load produk:', error);
    return;
  }
  
  produkData = data || [];
  renderProdukList();
  updateProductSelect();
}

function renderProdukList() {
  const container = document.getElementById('produkList');
  if (!container) return;

  const searchKeyword = document.getElementById('searchProdukInput')?.value.toLowerCase() || '';
  let filteredProduk = produkData;
  if (searchKeyword) {
    filteredProduk = produkData.filter(p =>
      p.nama.toLowerCase().includes(searchKeyword) ||
      (p.jenis_produk === 'beradmin' ? 'beradmin' : 'tanpa_admin').includes(searchKeyword)
    );
  }

  if (filteredProduk.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;">🏷️ Tidak ada produk ditemukan</p>';
    return;
  }

  container.innerHTML = filteredProduk.map(item => {
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
    cb.removeEventListener('change', handleProdukCheckboxChange);
    cb.addEventListener('change', handleProdukCheckboxChange);

    function handleProdukCheckboxChange(e) {
      e.stopPropagation();
      const id = cb.dataset.id;
      if (cb.checked) {
        selectedProdukIds.set(id, true);
      } else {
        selectedProdukIds.delete(id);
      }
      updateSelectAllProdukButton();
    }
  });

  document.querySelectorAll('#produkList .produk-item').forEach(el => {
    el.removeEventListener('click', handleProdukClick);
    el.addEventListener('click', handleProdukClick);

    function handleProdukClick(e) {
      if (e.target.type === 'checkbox') return;
      if (e.target.classList.contains('db-item-edit')) return;
      if (e.target.classList.contains('db-item-delete')) return;
      const id = el.dataset.id;
      editProduk(id);
    }
  });

  updateSelectAllProdukButton();
}

function updateSelectAllProdukButton() {
  const btn = document.getElementById('selectAllProduk');
  if (!btn) return;

  const searchKeyword = document.getElementById('searchProdukInput')?.value.toLowerCase() || '';
  let filteredProduk = produkData;
  if (searchKeyword) {
    filteredProduk = produkData.filter(p =>
      p.nama.toLowerCase().includes(searchKeyword) ||
      (p.jenis_produk === 'beradmin' ? 'beradmin' : 'tanpa_admin').includes(searchKeyword)
    );
  }

  if (filteredProduk.length === 0) {
    btn.textContent = '✅ Pilih Semua';
    return;
  }

  const allChecked = filteredProduk.every(item => selectedProdukIds.get(item.id) === true);
  btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
}

async function deleteSelectedProduk() {
  const selectedIds = Array.from(selectedProdukIds.keys());
  if (selectedIds.length === 0) {
    showNotifTop('⚠️ Tidak ada produk yang dipilih', true);
    return;
  }

  if (!confirm(`Hapus ${selectedIds.length} produk yang dipilih? Produk yang sudah terpakai di agent akan kehilangan referensi!`)) return;

  const progress = showFloatingProgress('🗑️ Menghapus Produk', selectedIds.length);
  progress.update(0, '🗑️ Menghapus', 'Memulai proses hapus produk...');

  let deleted = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
    const chunk = selectedIds.slice(i, i + BATCH_SIZE);
    
    for (const id of chunk) {
      try {
        await supabaseDelete('produk', id);
        selectedProdukIds.delete(id);
        const index = produkData.findIndex(p => p.id === id);
        if (index !== -1) produkData.splice(index, 1);
        deleted++;
      } catch (e) {
        console.error(`Gagal hapus produk ${id}:`, e);
      }
    }

    const percent = Math.floor((deleted / selectedIds.length) * 100);
    progress.update(percent, '🗑️ Menghapus', `Menghapus produk...`, deleted, selectedIds.length);
  }

  renderProdukList();
  progress.update(100, '✅ Selesai', `Berhasil menghapus ${selectedIds.length} produk`, selectedIds.length, selectedIds.length);
  showNotifTop(`✅ ${selectedIds.length} produk berhasil dihapus`);

  setTimeout(() => progress.hide(), 2000);
}

function deleteProduk(id) {
  if (!confirm('Yakin hapus produk ini? Produk yang sudah terpakai di agent akan kehilangan referensi!')) return;

  const progress = showFloatingProgress('🗑️ Menghapus Produk', 1);
  progress.update(50, '🗑️ Menghapus', 'Menghapus produk...', 0, 1);

  try {
    supabaseDelete('produk', id);

    const index = produkData.findIndex(p => p.id === id);
    if (index !== -1) produkData.splice(index, 1);

    selectedProdukIds.delete(id);

    renderProdukList();
    progress.update(100, '✅ Selesai', 'Produk berhasil dihapus', 1, 1);
    showNotifTop('🗑️ Produk berhasil dihapus');

    setTimeout(() => progress.hide(), 2000);
  } catch (e) {
    showNotifTop('❌ Gagal hapus: ' + e.message, true);
    progress.hide();
  }
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

  try {
    if (id) {
      await supabaseUpdate('produk', id, data);
      showNotifTop('✅ Produk berhasil diupdate');
    } else {
      data.created_at = new Date().toISOString();
      await supabase.from('produk').insert([data]);
      showNotifTop('✅ Produk berhasil ditambahkan');
    }
    await loadProduk();
    return true;
  } catch (e) {
    showNotifTop('❌ Gagal: ' + e.message, true);
    return false;
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

  toggleProdukJenisFields(produk.jenis_produk || 'tanpa_admin');

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
  document.getElementById('produkMasterModal').style.display = 'flex';
}

function toggleProdukJenisFields(jenis) {
  const tanpaAdminFields = document.getElementById('tanpaAdminFields');
  const beradminFields = document.getElementById('beradminFields');

  if (jenis === 'tanpa_admin') {
    tanpaAdminFields.style.display = 'block';
    beradminFields.style.display = 'none';
  } else {
    tanpaAdminFields.style.display = 'none';
    beradminFields.style.display = 'block';
  }
}

function updateProductSelect() {
  const select = document.getElementById('productSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Pilih Produk</option>';

  produkData.forEach(produk => {
    select.innerHTML += `<option value="${produk.id}" data-harga="${produk.harga_jual || 0}">${escapeHtml(produk.nama)} - ${formatRupiah(produk.harga_jual)}</option>`;
  });
}

// ========== TARIF ADMIN FUNCTIONS ==========
async function loadTarifAdmin() {
  if (!currentUser) return;

  const isOwner = currentUserRole === 'owner';
  let query = supabase.from('tarif_admin').select('*');
  if (!isOwner) {
    query = query.eq('user_id', currentUser.id);
  }
  
  const { data, error } = await query.limit(500);
  
  if (error) {
    console.error('Error load tarif admin:', error);
    return;
  }
  
  tarifAdminData = data || [];
  renderTarifAdminList();
}

function renderTarifAdminList() {
  const container = document.getElementById('tarifAdminList');
  if (!container) return;

  const searchKeyword = document.getElementById('searchTarifInput')?.value.toLowerCase() || '';

  let filteredData = tarifAdminData;
  if (searchKeyword) {
    filteredData = tarifAdminData.filter(item =>
      item.cid.toLowerCase().includes(searchKeyword)
    );
  }

  if (filteredData.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;">🏷️ Tidak ada data admin per CID</p>';
    return;
  }

  container.innerHTML = filteredData.map(item => `
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
      await supabaseUpdate('tarif_admin', id, data);
      showNotifTop('✅ Data admin per CID berhasil diupdate');
    } else {
      const existing = tarifAdminData.find(t => t.cid === cid);
      if (existing) {
        showNotifTop(`⚠️ CID ${cid} sudah ada! Silakan edit data yang sudah ada.`, true);
        return false;
      }
      data.created_at = new Date().toISOString();
      await supabase.from('tarif_admin').insert([data]);
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
  supabaseDelete('tarif_admin', id);
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

function setupTarifImport() {
  const importBtn = document.getElementById('importTarifExcelBtn');
  const fileInput = document.getElementById('tarifExcelFile');
  if (!importBtn || !fileInput) return;

  importBtn.removeEventListener('click', importBtn._handler);
  fileInput.removeEventListener('change', fileInput._handler);

  importBtn._handler = () => fileInput.click();
  importBtn.addEventListener('click', importBtn._handler);

  fileInput._handler = async (e) => {
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
        const errors = [];

        for (const row of json) {
          try {
            let cid = row.cid || row.CID || row.Cid || '';
            let pospaid = row.pospaid || row.Pospaid || row.PLN_Pospaid || row.admin_pospaid || 0;
            let prepaid = row.prepaid || row.Prepaid || row.PLN_Prepaid || row.admin_prepaid || 0;
            let nontaglis = row.nontaglis || row.Nontaglis || row.PLN_Nontaglis || row.admin_nontaglis || 0;

            if (!cid) {
              failed++;
              errors.push(`Baris ke-${json.indexOf(row)+2}: CID kosong`);
              continue;
            }

            cid = cid.toString().trim();

            const existing = tarifAdminData.find(t => t.cid === cid);
            if (existing) {
              await supabaseUpdate('tarif_admin', existing.id, {
                admin_pospaid: parseInt(pospaid) || 0,
                admin_prepaid: parseInt(prepaid) || 0,
                admin_nontaglis: parseInt(nontaglis) || 0,
                updated_at: new Date().toISOString()
              });
            } else {
              await supabase.from('tarif_admin').insert([{
                cid: cid,
                admin_pospaid: parseInt(pospaid) || 0,
                admin_prepaid: parseInt(prepaid) || 0,
                admin_nontaglis: parseInt(nontaglis) || 0,
                user_id: currentUser.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
            }
            success++;
          } catch (err) {
            failed++;
            errors.push(`Baris ke-${json.indexOf(row)+2}: ${err.message}`);
          }
        }

        let resultMsg = `✅ Import selesai! Berhasil: ${success}, Gagal: ${failed}`;
        if (errors.length > 0 && errors.length <= 3) {
          resultMsg += `\n\nError:\n${errors.join('\n')}`;
        } else if (errors.length > 3) {
          resultMsg += `\n\n${errors.length} error terjadi.`;
        }
        showNotifTop(resultMsg, failed > 0);
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
  fileInput.addEventListener('change', fileInput._handler);
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

// ========== DATABASE AGENT FUNCTIONS ==========
async function loadDatabaseAgent() {
  if (!currentUser) return;

  const isOwner = currentUserRole === 'owner';
  let query = supabase.from('db_agent').select('*');
  if (!isOwner) {
    query = query.eq('user_id', currentUser.id);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
  
  if (error) {
    console.error('Error load database agent:', error);
    return;
  }

  const items = [];
  for (const d of (data || [])) {
    let ownerName = '';
    if (isOwner && d.user_id !== currentUser.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('nama')
        .eq('id', d.user_id)
        .single();
      ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
    }
    items.push({
      id: d.id,
      nama: d.nama + ownerName,
      hp: d.hp || '',
      agent_id: d.agent_id || '-',
      agent_type: d.agent_type || '-',
      apk: d.apk || '',
      createdAt: d.created_at,
      checked: selectedAgentIds.get(d.id) || false,
      upline: d.upline || '',
      cid: d.cid || '',
      jenis_bank: d.jenis_bank || '',
      pemilik: d.pemilik || '',
      alamat: d.alamat || '',
      email: d.email || '',
      tlp: d.tlp || '',
      no_rekening: d.no_rekening || '',
      atas_nama: d.atas_nama || '',
      no_ktp: d.no_ktp || '',
      produk: d.produk || []
    });
  }
  agentsData = items;
  renderAgentList(items);
}

function renderAgentList(items) {
  const container = document.getElementById('dbAgentList');
  if (!container) return;

  const totalCountSpan = document.getElementById('agentTotalCount');
  if (totalCountSpan) totalCountSpan.innerText = items.length;

  const searchTerm = document.getElementById('searchAgentInput')?.value.toLowerCase() || '';
  const filterUpline = document.getElementById('filterUplineAgent')?.value.toLowerCase() || '';
  const filterCid = document.getElementById('filterCidAgent')?.value.toLowerCase() || '';
  const filterBank = document.getElementById('filterBankAgent')?.value || '';
  const filterDate = document.getElementById('filterDateAgent')?.value || '';
  const filterHasHp = document.getElementById('filterHasHpAgent')?.checked || false;
  const filterHasApk = document.getElementById('filterHasApkAgent')?.checked || false;

  let filtered = [...items];

  if (searchTerm) {
    filtered = filtered.filter(item =>
      (item.nama && String(item.nama).toLowerCase().includes(searchTerm)) ||
      (item.agent_id && String(item.agent_id).toLowerCase().includes(searchTerm)) ||
      (item.hp && String(item.hp).includes(searchTerm))
    );
  }

  if (filterUpline) {
    filtered = filtered.filter(item =>
      item.upline && String(item.upline).toLowerCase().includes(filterUpline)
    );
  }

  if (filterCid) {
    filtered = filtered.filter(item =>
      item.cid && String(item.cid).toLowerCase().includes(filterCid)
    );
  }

  if (filterBank) {
    filtered = filtered.filter(item => item.jenis_bank === filterBank);
  }

  if (filterDate) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filterDate === 'today') {
      filtered = filtered.filter(item => {
        const itemDate = item.createdAt ? new Date(item.createdAt) : new Date(0);
        return itemDate >= today;
      });
    } else if (filterDate === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      filtered = filtered.filter(item => {
        const itemDate = item.createdAt ? new Date(item.createdAt) : new Date(0);
        return itemDate >= weekAgo;
      });
    } else if (filterDate === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      filtered = filtered.filter(item => {
        const itemDate = item.createdAt ? new Date(item.createdAt) : new Date(0);
        return itemDate >= monthAgo;
      });
    }
  }

  if (filterHasHp) {
    filtered = filtered.filter(item => item.hp && String(item.hp).length > 5);
  }

  if (filterHasApk) {
    filtered = filtered.filter(item => item.apk && item.apk !== '-');
  }

  agentsFilteredData = filtered;

  const filteredCountSpan = document.getElementById('agentFilteredCount');
  if (filteredCountSpan) filteredCountSpan.innerText = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Tidak ada data yang sesuai filter</p>';
    return;
  }

  const MAX_RENDER = 200;
  let renderData = filtered;
  let truncated = false;

  if (filtered.length > MAX_RENDER) {
    renderData = filtered.slice(0, MAX_RENDER);
    truncated = true;
    console.warn(`⚠️ Menampilkan ${MAX_RENDER} dari ${filtered.length} data. Gunakan filter untuk menyaring.`);
  }

  let html = '';

  if (truncated) {
    html += `<div style="background: #fef3c7; padding: 8px 12px; border-radius: 8px; margin-bottom: 16px; color: #d97706; font-size: 12px; text-align: center;">
            ⚠️ Menampilkan ${MAX_RENDER} dari ${filtered.length} data. Gunakan filter untuk menyaring data.
        </div>`;
  }

  for (const item of renderData) {
    const isChecked = selectedAgentIds.get(item.id) === true;
    html += `
            <div class="db-item-agent" data-id="${item.id}">
                <input type="checkbox" class="db-item-checkbox-agent" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-agent-info">
                    <h4>${escapeHtml(String(item.nama || '-'))}</h4>
                    <p>📱 ${escapeHtml(String(item.hp || '-'))} | 🆔 ${escapeHtml(String(item.agent_id || '-'))} | 🏷️ ${escapeHtml(String(item.agent_type || '-'))}</p>
                    <p>👤 Upline: ${escapeHtml(String(item.upline || '-'))} | 🆔 CID: ${escapeHtml(String(item.cid || '-'))} | 🏦 Bank: ${escapeHtml(String(item.jenis_bank || '-'))}</p>
                    <small>📅 ${item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}</small>
                </div>
                <div class="db-item-agent-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(String(item.hp || ''))}')">💬 WA</button>
                    <button class="db-item-move-followup" onclick="event.stopPropagation(); moveAgentToFollowup('${item.id}')">📞 Pindah ke Followup</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteAgentItem('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
  }

  container.innerHTML = html;

  document.querySelectorAll('#dbAgentList .db-item-checkbox-agent').forEach(cb => {
    cb.removeEventListener('change', handleAgentCheckboxChange);
    cb.addEventListener('change', handleAgentCheckboxChange);

    function handleAgentCheckboxChange(e) {
      e.stopPropagation();
      const id = cb.dataset.id;
      if (cb.checked) {
        selectedAgentIds.set(id, true);
      } else {
        selectedAgentIds.delete(id);
      }
      updateSelectAllAgentButton();
    }
  });

  document.querySelectorAll('#dbAgentList .db-item-agent').forEach(el => {
    el.removeEventListener('click', handleAgentItemClick);
    el.addEventListener('click', handleAgentItemClick);

    function handleAgentItemClick(e) {
      if (e.target.type !== 'checkbox' &&
        !e.target.classList.contains('db-item-wa') &&
        !e.target.classList.contains('db-item-move-followup') &&
        !e.target.classList.contains('db-item-delete')) {
        openAgentDetail(el.dataset.id);
      }
    }
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
  console.log('Update tombol:', btn.textContent);
}

async function moveAgentToFollowup(agentId) {
  const { data: doc, error } = await supabase
    .from('db_agent')
    .select('*')
    .eq('id', agentId)
    .single();
  
  if (error || !doc) return;

  const data = doc;

  const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(data.agent_id, data.hp);
  if (duplicateAgent) {
    showNotifTop(`⚠️ ID Agent "${data.agent_id}" sudah terdaftar!`, true);
    return;
  }
  if (duplicateHp) {
    showNotifTop(`⚠️ Nomor WhatsApp "${data.hp}" sudah terdaftar!`, true);
    return;
  }

  showConfirmDialog(
    'Pindahkan ke Followup Agen?',
    `Apakah Anda yakin ingin memindahkan agent "${escapeHtml(data.nama)}" ke FOLLOWUP AGEN?\n\nData akan dipindahkan dengan status "Baru".`,
    async () => {
      await supabase.from('customers').insert([{
        agent_id: data.agent_id,
        nama: data.nama,
        hp: data.hp,
        apk: data.apk || '',
        agent_type: data.agent_type || '',
        tanggal: getTodayDate(),
        status: 'baru',
        user_id: data.user_id,
        created_at: new Date().toISOString(),
        followup_data: null,
        pending_data: []
      }]);
      await supabaseDelete('db_agent', agentId);
      showNotifTop('✅ Agent berhasil dipindahkan ke Followup Agen!');
      loadDatabaseAgent();
      loadAllData();
    }
  );
}

async function deleteSelectedAgentSafe() {
  const selectedIds = Array.from(selectedAgentIds.keys());
  if (selectedIds.length === 0) {
    showNotifTop('⚠️ Tidak ada data yang dipilih', true);
    return;
  }

  if (!confirm(`Hapus ${selectedIds.length} data agent satu per satu?\n\nProses akan lebih lambat tapi pasti berhasil.\n\nKlik OK untuk melanjutkan.`)) return;

  const progress = showFloatingProgress('🗑️ Menghapus Data Agent (Mode Aman)', selectedIds.length);
  progress.update(0, '🗑️ Menghapus', 'Memulai proses hapus data...');

  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < selectedIds.length; i++) {
    const id = selectedIds[i];

    try {
      await supabaseDelete('db_agent', id);
      deleted++;
      selectedAgentIds.delete(id);
      
      const index = agentsData.findIndex(item => item.id === id);
      if (index !== -1) agentsData.splice(index, 1);
    } catch (e) {
      failed++;
      console.error(`Gagal hapus ${id}:`, e);
    }

    const percent = Math.floor(((deleted + failed) / selectedIds.length) * 100);
    progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted + failed}/${selectedIds.length})`, deleted + failed, selectedIds.length);

    if ((i + 1) % 10 === 0) {
      renderAgentList(agentsData);
    }
  }

  renderAgentList(agentsData);
  progress.update(100, '✅ Selesai', `Berhasil: ${deleted}, Gagal: ${failed}`, selectedIds.length, selectedIds.length);
  showNotifTop(`✅ ${deleted} data agent berhasil dihapus${failed > 0 ? `, ${failed} gagal` : ''}`);

  setTimeout(() => {
    if (progress && progress.hide) progress.hide();
  }, 3000);
}

function deleteAgentItem(id) {
  if (!confirm('Yakin hapus data agent ini? Data akan dihapus permanen!')) return;

  const progress = showFloatingProgress('🗑️ Menghapus Data Agent', 1);
  progress.update(50, '🗑️ Menghapus', 'Menghapus data agent...', 0, 1);

  try {
    supabaseDelete('db_agent', id);

    selectedAgentIds.delete(id);

    const index = agentsData.findIndex(item => item.id === id);
    if (index !== -1) agentsData.splice(index, 1);

    const filteredIndex = agentsFilteredData.findIndex(item => item.id === id);
    if (filteredIndex !== -1) agentsFilteredData.splice(filteredIndex, 1);

    renderAgentList(agentsData);

    progress.update(100, '✅ Selesai', 'Data agent berhasil dihapus', 1, 1);
    showNotifTop('🗑️ Data agent berhasil dihapus');

    setTimeout(() => progress.hide(), 1500);
  } catch (e) {
    console.error('Error delete single:', e);
    showNotifTop('❌ Gagal hapus: ' + e.message, true);
    progress.hide();
  }
}

// Assign deleteSelectedAgent to the safe version
window.deleteSelectedAgent = deleteSelectedAgentSafe;

function setupAgentImport() {
  const importBtn = document.getElementById('importAgentExcelBtn');
  const fileInput = document.getElementById('agentExcelFile');
  if (!importBtn || !fileInput) return;

  const newImportBtn = importBtn.cloneNode(true);
  importBtn.parentNode.replaceChild(newImportBtn, importBtn);

  newImportBtn.onclick = () => fileInput.click();

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btn = newImportBtn;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Memproses...';
    btn.disabled = true;

    const progress = showFloatingProgress('📥 Import Data Agent', 0);
    progress.update(0, '📥 Import Data', 'Membaca file Excel...');

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        progress.update(5, '📥 Import Data', 'Memproses file Excel...');

        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });
        
        if (!json || json.length === 0) {
          showNotifTop('❌ File Excel kosong!', true);
          progress.hide();
          return;
        }

        const headers = json[0] || [];
        
        let agentIdCol = -1, namaCol = -1, hpCol = -1;
        
        for (let i = 0; i < headers.length; i++) {
          const header = String(headers[i] || '').toLowerCase().trim();
          if (header === 'agent_id' || header.includes('agent')) agentIdCol = i;
          if (header === 'nama' || header === 'name') namaCol = i;
          if (header === 'hp' || header === 'phone' || header === 'no_hp') hpCol = i;
        }
        
        if (agentIdCol === -1 || namaCol === -1 || hpCol === -1) {
          showNotifTop('❌ Format Excel tidak sesuai! Kolom wajib: agent_id, nama, hp', true);
          progress.hide();
          return;
        }
        
        const dataRows = json.slice(1);
        
        if (dataRows.length === 0) {
          showNotifTop('❌ Tidak ada data untuk diimport!', true);
          progress.hide();
          return;
        }
        
        progress.update(10, '📥 Import Data', `Memproses ${dataRows.length} baris data...`);
        progress.setTotal(dataRows.length);
        
        const { data: existingAgents, error: existingError } = await supabase
          .from('db_agent')
          .select('agent_id');
        
        const existingAgentIds = new Set();
        if (!existingError && existingAgents) {
          existingAgents.forEach(doc => {
            if (doc.agent_id) existingAgentIds.add(doc.agent_id);
          });
        }
        
        let success = 0, duplicate = 0, failed = 0;
        const errors = [];
        
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          if (!row || row.length === 0) continue;
          
          if (i % 10 === 0) {
            const percent = 10 + Math.floor((i / dataRows.length) * 80);
            progress.update(percent, '📥 Import Data', `Memproses... (${i + 1}/${dataRows.length})`, i + 1, dataRows.length);
          }
          
          try {
            let agentId = row[agentIdCol];
            let nama = row[namaCol];
            let hp = row[hpCol];
            
            if (!agentId || !nama || !hp) {
              failed++;
              errors.push(`Baris ${i + 2}: Data tidak lengkap (Agent ID/Nama/HP kosong)`);
              continue;
            }
            
            agentId = String(agentId).trim().toUpperCase();
            nama = String(nama).trim();
            
            let cleanHp = String(hp).replace(/[^\d+]/g, '');
            if (!cleanHp.startsWith('+')) {
              cleanHp = cleanHp.replace(/^0+/, '');
              if (cleanHp.startsWith('62')) cleanHp = '+' + cleanHp;
              else cleanHp = '+62' + cleanHp;
            }
            
            if (existingAgentIds.has(agentId)) {
              duplicate++;
              continue;
            }
            
            existingAgentIds.add(agentId);
            
            await supabase.from('db_agent').insert([{
              agent_id: agentId,
              nama: nama,
              hp: cleanHp,
              user_id: currentUser.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              agent_type: '',
              pemilik: '',
              alamat: '',
              email: '',
              tlp: '',
              upline: '',
              no_rekening: '',
              atas_nama: '',
              jenis_bank: '',
              no_ktp: '',
              cid: '',
              apk: '',
              produk: []
            }]);
            
            success++;
            
          } catch (rowError) {
            failed++;
            errors.push(`Baris ${i + 2}: ${rowError.message}`);
          }
        }
        
        progress.update(100, '✅ Import Selesai', `Berhasil: ${success}, Duplikat: ${duplicate}, Gagal: ${failed}`, success, dataRows.length);
        
        let resultMsg = `✅ Import selesai!\n📊 Total data: ${dataRows.length}\n✅ Berhasil: ${success}\n⏭ Duplikat: ${duplicate}\n❌ Gagal: ${failed}`;
        if (errors.length > 0 && errors.length <= 5) {
          resultMsg += `\n\n❌ Error:\n${errors.join('\n')}`;
        } else if (errors.length > 5) {
          resultMsg += `\n\n❌ ${errors.length} error terjadi.`;
        }
        alert(resultMsg);
        
        await loadDatabaseAgent();
        fileInput.value = '';
        
        setTimeout(() => progress.hide(), 3000);
        
      } catch (err) {
        console.error('Import error:', err);
        showNotifTop('❌ Gagal memproses file: ' + err.message, true);
        if (progress) progress.hide();
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    };
    
    reader.onerror = () => {
      showNotifTop('❌ Gagal membaca file', true);
      btn.textContent = originalText;
      btn.disabled = false;
      if (progress) progress.hide();
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

  const applyFilters = () => {
    renderAgentList(agentsData);
  };

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

  try {
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
  } catch (error) {
    console.error('Export error:', error);
    showNotifTop('❌ Gagal export: ' + error.message, true);
  }
}

async function downloadAgentExample() {
  try {
    showNotifTop('⏳ Memuat data produk...');

    const { data: produkList, error: produkError } = await supabase
      .from('produk')
      .select('id, nama');

    if (produkError || !produkList || produkList.length === 0) {
      showNotifTop('⚠️ Belum ada data produk. Silakan tambahkan produk terlebih dahulu!', true);
      return;
    }

    const baseData = {
      'agent_id': 'AG-001',
      'nama': 'Budi Santoso',
      'agent_type': 'CollectingAgent (CA)',
      'pemilik': 'PT. Contoh',
      'alamat': 'Jl. Raya No. 123, Jakarta',
      'email': 'budi@example.com',
      'hp': '6281234567890',
      'upline': 'KORWIL Jakarta',
      'no_rekening': '1234567890',
      'atas_nama': 'Budi Santoso',
      'jenis_bank': 'BCA',
      'no_ktp': '3172010101950001',
      'cid': '5213247',
      'apk': 'GNP'
    };

    const produkColumns = {};
    for (const produk of produkList) {
      let cleanNama = produk.nama
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();

      produkColumns[`profit_${cleanNama}`] = 0;
      produkColumns[`fee_upline_${cleanNama}`] = 0;
    }

    if (produkList.length > 0) {
      const firstProductClean = produkList[0].nama
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
      produkColumns[`profit_${firstProductClean}`] = 5000;
      produkColumns[`fee_upline_${firstProductClean}`] = 1000;
    }

    const exampleData = [{ ...baseData, ...produkColumns }];

    const ws = XLSX.utils.json_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database Agent');
    XLSX.writeFile(wb, `contoh_database_agent_${new Date().toISOString().split('T')[0]}.xlsx`);

    showNotifTop('📋 Contoh file Excel berhasil diunduh (Fee Agent akan dihitung otomatis)');
  } catch (error) {
    console.error('Error download contoh:', error);
    showNotifTop('❌ Gagal mengunduh contoh: ' + error.message, true);
  }
}

// ========== AGENT DETAIL FUNCTIONS ==========
function openAgentDetail(id) {
  try {
    const doc = agentsData.find(a => a.id === id);
    if (!doc) {
      showNotifTop('❌ Data agent tidak ditemukan!', true);
      return;
    }

    currentAgentIdForProduct = id;
    currentAgentProducts = doc.produk || [];

    document.getElementById('agentDetailId').value = doc.agent_id || '';
    document.getElementById('agentDetailNama').value = (doc.nama || '').replace(/ \(.*\)/, '');
    document.getElementById('agentDetailType').value = doc.agent_type || '';
    document.getElementById('agentDetailPemilik').value = doc.pemilik || '';
    document.getElementById('agentDetailAlamat').value = doc.alamat || '';
    document.getElementById('agentDetailEmail').value = doc.email || '';
    document.getElementById('agentDetailTlp').value = doc.tlp || '';
    document.getElementById('agentDetailNoRekening').value = doc.no_rekening || '';
    document.getElementById('agentDetailAtasNama').value = doc.atas_nama || '';
    document.getElementById('agentDetailBank').value = doc.jenis_bank || '';
    document.getElementById('agentDetailNoKtp').value = doc.no_ktp || '';
    document.getElementById('agentDetailCid').value = doc.cid || '';
    document.getElementById('agentDetailUpline').value = doc.upline || '';

    if (doc.cid) {
      loadTarifAdminByCid(doc.cid);
    } else {
      currentTarifData = [];
    }

    renderAgentProducts();

    document.getElementById('agentDetailModal').style.display = 'flex';
    document.body.classList.add('modal-open');
  } catch (error) {
    console.error('Error:', error);
    showNotifTop('❌ Gagal membuka detail: ' + error.message, true);
  }
}

function saveAgentDetail() {
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
    supabaseUpdate('db_agent', currentAgentIdForProduct, {
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
    });

    showNotifTop('✅ Data agent berhasil disimpan!');
    closeModal('agentDetailModal');
    loadDatabaseAgent();
  } catch (error) {
    showNotifTop('❌ Gagal menyimpan: ' + error.message, true);
    console.error(error);
  }
}

async function loadTarifAdminByCid(cid) {
  if (!cid) {
    currentTarifData = [];
    return;
  }
  const { data, error } = await supabase
    .from('tarif_admin')
    .select('*')
    .eq('cid', cid);
  
  currentTarifData = data || [];
}

async function renderAgentProducts() {
  const container = document.getElementById('agentProductsContainer');
  if (!container) return;

  let searchInput = document.getElementById('searchProdukAgent');
  if (!searchInput) {
    const searchWrapper = document.createElement('div');
    searchWrapper.style.marginBottom = '12px';
    searchWrapper.innerHTML = '<input type="text" id="searchProdukAgent" placeholder="🔍 Cari produk..." style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">';
    container.parentNode.insertBefore(searchWrapper, container);
    searchInput = document.getElementById('searchProdukAgent');

    searchInput.addEventListener('input', function() {
      renderAgentProducts();
    });
  }

  const searchKeyword = searchInput.value.toLowerCase();
  let filteredProduk = produkData.filter(p =>
    p.nama.toLowerCase().includes(searchKeyword)
  );

  if (filteredProduk.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#9ca3af; padding:20px;">🔍 Tidak ada produk yang ditemukan</p>';
    return;
  }

  const cid = document.getElementById('agentDetailCid')?.value || '';

  let tarifData = null;
  if (cid) {
    const { data: tarifSnapshot, error: tarifError } = await supabase
      .from('tarif_admin')
      .select('*')
      .eq('cid', cid);
    
    if (!tarifError && tarifSnapshot && tarifSnapshot.length > 0) {
      tarifData = tarifSnapshot[0];
    }
  }

  const existingMap = new Map();
  if (currentAgentProducts) {
    currentAgentProducts.forEach(p => existingMap.set(p.produk_id, p));
  }

  let html = '<table style="width:100%; border-collapse: collapse;">';
  html += `
        <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
                <th style="text-align:left; padding:10px;">Produk</th>
                <th style="text-align:left; padding:10px;">Admin (Otomatis dari CID)</th>
                <th style="text-align:left; padding:10px;">HPP</th>
                <th style="text-align:left; padding:10px;">Profit</th>
                <th style="text-align:left; padding:10px;">Fee Upline</th>
                <th style="text-align:left; padding:10px;">Fee Agent</th>
            </table>
        </thead>
        <tbody>
    `;

  for (const produk of filteredProduk) {
    const isAdminBased = produk.jenis_produk === 'beradmin';
    const existing = existingMap.get(produk.id);

    let adminValue = 0;
    let profit = 0;
    let feeUpline = 0;
    let feeAgent = 0;

    if (isAdminBased) {
      const produkNamaLower = produk.nama.toLowerCase();

      if (produk.cid_based && cid && tarifData) {
        if (produkNamaLower.includes('prepaid') || produkNamaLower.includes('prep')) {
          adminValue = tarifData.admin_prepaid || 0;
        } else if (produkNamaLower.includes('postpaid') || produkNamaLower.includes('posp')) {
          adminValue = tarifData.admin_pospaid || 0;
        } else if (produkNamaLower.includes('nontaglis') || produkNamaLower.includes('nont')) {
          adminValue = tarifData.admin_nontaglis || 0;
        } else {
          adminValue = existing?.admin || produk.admin_default || 0;
        }
      } else {
        adminValue = existing?.admin || produk.admin_default || 0;
      }

      profit = existing?.profit || 0;
      feeUpline = existing?.fee_upline || 0;

      let calculatedFeeAgent = adminValue - profit - feeUpline;
      if (calculatedFeeAgent < 0) {
        profit = adminValue - feeUpline;
        if (profit < 0) profit = 0;
        calculatedFeeAgent = adminValue - profit - feeUpline;
        if (calculatedFeeAgent < 0) calculatedFeeAgent = 0;
      }
      feeAgent = calculatedFeeAgent;
    }

    const adminWarning = (isAdminBased && adminValue === 0 && cid) ?
      '<span style="color: #f59e0b; font-size: 10px; margin-left: 5px;">⚠️ CID tidak ditemukan di Tarif Admin</span>' : '';

    const adminDisplay = isAdminBased ?
      `<span class="admin-value" data-id="${produk.id}" style="font-weight: 600; color: ${adminValue === 0 ? '#f59e0b' : '#4f46e5'};">${formatRupiah(adminValue)}</span>${adminWarning}` : '-';

    const profitInput = isAdminBased ?
      `<input type="number" class="profit-input" data-id="${produk.id}" value="${profit}" step="100" style="width:100px; padding:6px; border-radius:8px; border:1px solid #e5e7eb;">` : '-';

    const feeUplineInput = isAdminBased ?
      `<input type="number" class="fee-upline-input" data-id="${produk.id}" value="${feeUpline}" step="100" style="width:100px; padding:6px; border-radius:8px; border:1px solid #e5e7eb;">` : '-';

    const feeAgentDisplay = isAdminBased ?
      `<span class="fee-agent-value" data-id="${produk.id}" style="font-weight: 600; color: ${feeAgent >= 0 ? '#10b981' : '#ef4444'};">${formatRupiah(feeAgent)}</span>` : '-';

    html += `
            <tr data-produk-id="${produk.id}" style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px;">
                    <strong>${escapeHtml(produk.nama)}</strong><br>
                    <small style="color:#9ca3af;">${isAdminBased ? '🏷️ Berdasarkan Admin' : '💰 Tanpa Admin'}</small>
                </td>
                <td style="padding:10px;">${adminDisplay}</td>
                <td style="padding:10px;"><span class="hpp-value">${formatRupiah(produk.hpp)}</span></td>
                <td style="padding:10px;">${profitInput}</td>
                <td style="padding:10px;">${feeUplineInput}</td>
                <td style="padding:10px;">${feeAgentDisplay}</td>
            </tr>
        `;
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  document.querySelectorAll('.profit-input').forEach(input => {
    input.removeEventListener('change', handleProfitChange);
    input.addEventListener('change', handleProfitChange);
  });

  document.querySelectorAll('.fee-upline-input').forEach(input => {
    input.removeEventListener('change', handleFeeUplineChange);
    input.addEventListener('change', handleFeeUplineChange);
  });
}

function handleProfitChange(e) {
  const produkId = e.target.dataset.id;
  let profit = parseInt(e.target.value) || 0;
  if (profit < 0) profit = 0;
  updateAgentProductField(produkId, 'profit', profit);
}

function handleFeeUplineChange(e) {
  const produkId = e.target.dataset.id;
  let feeUpline = parseInt(e.target.value) || 0;
  if (feeUpline < 0) feeUpline = 0;
  updateAgentProductField(produkId, 'fee_upline', feeUpline);
}

function updateAgentProductField(produkId, field, value) {
  if (!currentAgentProducts) currentAgentProducts = [];

  const produk = produkData.find(p => p.id === produkId);
  if (!produk) return;

  const isAdminBased = produk.jenis_produk === 'beradmin';
  const index = currentAgentProducts.findIndex(p => p.produk_id === produkId);

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

function openAddProductModal() {
  if (!currentAgentIdForProduct) {
    showNotifTop('⚠️ Pilih agent terlebih dahulu!', true);
    return;
  }

  document.getElementById('productModalTitle').innerText = '📦 Tambah Produk';
  document.getElementById('productSelect').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productQty').value = '1';
  document.getElementById('productModal').style.display = 'flex';
}

function saveAgentProduct() {
  const produkId = document.getElementById('productSelect').value;
  const price = parseInt(document.getElementById('productPrice').value);
  const qty = parseInt(document.getElementById('productQty').value) || 1;

  if (!produkId || !price) {
    showNotifTop('⚠️ Pilih produk dan isi harga!', true);
    return;
  }

  const produk = produkData.find(p => p.id === produkId);
  if (!produk) return;

  if (!currentAgentProducts) currentAgentProducts = [];

  currentAgentProducts.push({
    produk_id: produkId,
    nama_produk: produk.nama,
    harga: price,
    qty: qty,
    added_at: new Date().toISOString()
  });

  renderAgentProducts();
  closeModal('productModal');
}

function removeAgentProduct(index) {
  if (!currentAgentProducts) return;
  currentAgentProducts.splice(index, 1);
  renderAgentProducts();
}

// ========== PRODUK IMPORT/EXPORT ==========
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
            let nama = row.nama || row.Nama || row.name || row.Name || '';
            let hpp = row.hpp || row.HPP || row.harga_modal || row.HargaModal || '';
            let hargaJual = row.harga_jual || row.HargaJual || row.harga || row.Harga || '';
            let keterangan = row.keterangan || row.Keterangan || '';

            if (!nama || !hpp) {
              failed++;
              continue;
            }

            await supabase.from('produk').insert([{
              nama: nama.toString().trim(),
              hpp: parseInt(hpp) || 0,
              harga_jual: parseInt(hargaJual) || 0,
              keterangan: keterangan || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
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
    'Keterangan': item.keterangan || '',
    'Tanggal Dibuat': new Date(item.created_at).toLocaleDateString('id-ID')
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produk');
  XLSX.writeFile(wb, `produk_${new Date().toISOString().split('T')[0]}.xlsx`);
  showNotifTop('✅ Export produk berhasil!');
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
}

// ========== BROADCAST FUNCTIONS ==========
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
    
    let collection = '';
    let statusField = 'status';
    let statusValues = [];
    
    if (sourceType === 'customer') {
        collection = 'customers';
        statusValues = Array.from(document.querySelectorAll('#customerFilter input:checked')).map(cb => cb.value);
    } else if (sourceType === 'prospek') {
        collection = 'prospek';
        statusValues = Array.from(document.querySelectorAll('#prospekFilter input:checked')).map(cb => cb.value);
    } else if (sourceType === 'tidak_tertarik') {
        collection = 'db_tidak_tertarik';
        statusField = null;
    }
    
    if (!collection) {
        showNotifTop('⚠️ Sumber tidak valid!', true);
        return;
    }
    
    if (sourceType !== 'custom' && statusValues.length === 0 && sourceType !== 'tidak_tertarik') {
        showNotifTop('⚠️ Pilih minimal satu status!', true);
        return;
    }
    
    showNotifTop('⏳ Memuat nomor...');
    
    let query = supabase.from(collection).select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    query = query.limit(2000);
    
    if (statusField && statusValues.length > 0) {
        query = query.in(statusField, statusValues);
    }
    
    const { data, error } = await query;
    
    if (error) {
        showNotifTop('❌ Gagal memuat nomor: ' + error.message, true);
        return;
    }
    
    const numbers = [];
    
    for (const doc of (data || [])) {
        let hp = doc.hp || '';
        
        if (hp && hp !== '+62' && hp !== '62') {
            numbers.push({
                hp: hp,
                nama: doc.nama || 'Customer',
                id: doc.id
            });
        }
    }
    
    currentNumbers = numbers;
    document.getElementById('numberCount').innerText = currentNumbers.length;
    
    const listDiv = document.getElementById('numbersList');
    if (listDiv) {
        if (numbers.length === 0) {
            listDiv.innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Tidak ada nomor yang ditemukan!</p>';
        } else {
            listDiv.innerHTML = numbers.map(item => `
                <div class="number-item">
                    👤 ${escapeHtml(item.nama)}<br>
                    📞 ${escapeHtml(item.hp)}
                </div>
            `).join('');
        }
    }
    
    showNotifTop(`✅ ${numbers.length} nomor ditemukan`);
}

async function sendBroadcast() {
    const messageTemplate = document.getElementById('broadcastMessage')?.value;
    const sourceType = document.querySelector('input[name="sourceType"]:checked')?.value;
    
    // Ambil status filter yang dipilih
    let selectedStatuses = [];
    if (sourceType === 'customer') {
        selectedStatuses = Array.from(document.querySelectorAll('#customerFilter input:checked')).map(cb => cb.value);
    } else if (sourceType === 'prospek') {
        selectedStatuses = Array.from(document.querySelectorAll('#prospekFilter input:checked')).map(cb => cb.value);
    }
    
    if (!messageTemplate) {
        showNotifTop('⚠️ Pesan tidak boleh kosong!', true);
        return;
    }
    
    if (currentNumbers.length === 0) {
        showNotifTop('⚠️ Tidak ada nomor tujuan!', true);
        return;
    }
    
    if (isBroadcasting) {
        showNotifTop('⚠️ Broadcast sedang berjalan!', true);
        return;
    }
    
    // Konfirmasi dengan user
    const confirmMsg = confirm(
        '📢 KONFIRMASI BROADCAST\n\n' +
        `Total: ${currentNumbers.length} nomor\n` +
        `Sumber: ${sourceType === 'customer' ? 'Followup Agen' : sourceType === 'prospek' ? 'Prospek Agen' : 'Custom'}\n\n` +
        `✅ Jika SUKSES: Data akan pindah ke tahap berikutnya\n` +
        `❌ Jika GAGAL: Data akan pindah ke DATABASE NOMOR SALAH\n\n` +
        `Lanjutkan?`
    );
    
    if (!confirmMsg) return;
    
    // Simpan source type untuk digunakan di proses
    currentBroadcastSourceType = sourceType;
    currentBroadcastSelectedStatuses = selectedStatuses;
    
    broadcastNumbers = [...currentNumbers];
    broadcastMessageTemplate = messageTemplate;
    currentBroadcastIndex = 0;
    broadcastStatus = [];
    isBroadcasting = true;
    
    showBroadcastPanel();
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
                    <div class="current-info">
                        <div class="current-label">Sedang Diproses:</div>
                        <div class="current-name" id="currentName">-</div>
                        <div class="current-number" id="currentNumber">-</div>
                    </div>
                    <div class="message-preview" id="messagePreview"></div>
                    <div class="action-buttons">
                        <button id="markSentBtn" class="mark-sent-btn">✅ Tandai Terkirim & Lanjut</button>
                        <button id="markFailedBtn" class="mark-failed-btn">❌ Tandai Gagal Kirim & Lanjut</button>
                        <button id="stopBroadcastPanelBtn" class="stop-btn">⏹️ Hentikan Broadcast</button>
                    </div>
                    <div class="whatsapp-link-container">
                        <a href="#" id="whatsappLink" target="_blank" class="whatsapp-link-btn">💬 Buka WhatsApp</a>
                    </div>
                </div>
                <div class="progress-panel">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" id="progressBarFillPanel"></div>
                    </div>
                    <div class="progress-text" id="progressTextPanel">0 / 0</div>
                    <div class="progress-list" id="progressListPanel"></div>
                </div>
            `;
            broadcastCard.parentNode.insertBefore(panelDiv, broadcastCard.nextSibling);
            
            document.getElementById('closeBroadcastPanelBtn')?.addEventListener('click', () => {
                document.getElementById('broadcastPanel').style.display = 'none';
                isBroadcasting = false;
            });
            
document.getElementById('markSentBtn')?.addEventListener('click', async () => {
    if (isBroadcasting) {
        const item = broadcastNumbers[currentBroadcastIndex];
        
        // PROSES SUKSES - Update status data
        await handleBroadcastSuccess(item, currentBroadcastSourceType, currentBroadcastSelectedStatuses);
        
        broadcastStatus[currentBroadcastIndex] = 'success';
        currentBroadcastIndex++;
        updateBroadcastPanel();
        
        if (currentBroadcastIndex >= broadcastNumbers.length) {
            finishBroadcast();
        } else {
            processNextBroadcast();
        }
    }
});

document.getElementById('markFailedBtn')?.addEventListener('click', async () => {
    if (isBroadcasting) {
        const item = broadcastNumbers[currentBroadcastIndex];
        
        // PROSES GAGAL - Pindah ke Nomor Salah
        await handleBroadcastFailed(item, currentBroadcastSourceType);
        
        broadcastStatus[currentBroadcastIndex] = 'failed';
        currentBroadcastIndex++;
        updateBroadcastPanel();
        
        if (currentBroadcastIndex >= broadcastNumbers.length) {
            finishBroadcast();
        } else {
            processNextBroadcast();
        }
    }
});
            
            document.getElementById('stopBroadcastPanelBtn')?.addEventListener('click', () => {
                if (confirm('⏹️ Hentikan broadcast?')) {
                    isBroadcasting = false;
                    document.getElementById('broadcastPanel').style.display = 'none';
                    showNotif('⏹️ Broadcast dihentikan');
                }
            });
        }
    } else {
        panelDiv.style.display = 'block';
    }
}

function processNextBroadcast() {
    if (!isBroadcasting) return;
    if (currentBroadcastIndex >= broadcastNumbers.length) {
        finishBroadcast();
        return;
    }
    
    const item = broadcastNumbers[currentBroadcastIndex];
    let hp = item.hp || '';
    let nama = item.nama || '';
    
    const message = broadcastMessageTemplate.replace(/{nama}/g, nama || 'Customer');
    const nomor = hp.toString().replace('+', '').replace(/^0/, '62').replace(/[^\d]/g, '');
    
    document.getElementById('currentName').innerHTML = escapeHtml(nama || '-');
    document.getElementById('currentNumber').innerHTML = escapeHtml(hp);
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
            const hp = item.hp || '';
            const nama = item.nama || '';
            const displayName = nama ? `${nama} (${hp})` : hp;
            const isCurrent = i === currentBroadcastIndex;
            const status = broadcastStatus[i];
            
            let statusIcon = '⭕';
            let statusClass = '';
            if (status === 'success') {
                statusIcon = '✅';
                statusClass = 'success';
            } else if (status === 'failed') {
                statusIcon = '❌';
                statusClass = 'failed';
            } else if (i < currentBroadcastIndex) {
                statusIcon = '✅';
                statusClass = 'success';
            }
            
            html += `<div class="panel-progress-item ${statusClass} ${isCurrent ? 'current' : ''}">
                        <span class="panel-status">${statusIcon}</span>
                        <span class="panel-number">${escapeHtml(displayName)}</span>
                    </div>`;
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
    
    // Refresh semua data setelah broadcast selesai
    loadAllData();
    if (currentBroadcastSourceType === 'customer') {
        loadNumbers(); // Refresh nomor
    } else if (currentBroadcastSourceType === 'prospek') {
        loadNumbers();
    }
    
    isBroadcasting = false;
    const panel = document.getElementById('broadcastPanel');
    if (panel) panel.style.display = 'none';
    broadcastStatus = [];
    currentBroadcastSourceType = null;
}

// ========== HANDLE BROADCAST SUKSES ==========
async function handleBroadcastSuccess(item, sourceType, selectedStatuses) {
    try {
        if (sourceType === 'customer') {
            const currentStatus = item.status || 'baru';
            let nextStatus = '';
            let newDeadline = addDaysToDate(getTodayDate(), 3);
            
            switch (currentStatus) {
                case 'baru':
                    nextStatus = 'followup';
                    break;
                case 'followup':
                    nextStatus = 'pending';
                    newDeadline = addDaysToDate(getTodayDate(), 1);
                    break;
                case 'pending':
                    nextStatus = 'closing';
                    newDeadline = addDaysToDate(getTodayDate(), 1);
                    break;
                case 'closing':
                    // Pindah ke DB Closing
                    await saveToClosingDB(item.id, item);
                    showNotifTop(`✅ ${item.nama} berhasil closing!`);
                    await loadAllData();
                    return;
                default:
                    return;
            }
            
            // Update status customer
            await supabaseUpdate('customers', item.id, {
                status: nextStatus,
                tanggal: newDeadline,
                followup_data: {
                    terkirim: true,
                    dibalas: true,
                    via_broadcast: true,
                    timestamp: new Date().toISOString()
                }
            });
            
            showNotifTop(`✅ ${item.nama} dipindahkan ke ${nextStatus.toUpperCase()}`);
            
        } else if (sourceType === 'prospek') {
            const currentStatus = item.status || 'Baru';
            let nextStatus = '';
            let newDeadline = addDaysToDate(getTodayDate(), 3);
            
            switch (currentStatus) {
                case 'Baru':
                    nextStatus = 'Dihubungi';
                    break;
                case 'Dihubungi':
                    nextStatus = 'Negosiasi';
                    break;
                case 'Negosiasi':
                    nextStatus = 'Tertarik';
                    newDeadline = addDaysToDate(getTodayDate(), 7);
                    break;
                case 'Tertarik':
                    // Pindah ke Customer + DB Commitment
                    await convertProspekToCustomer(item.id);
                    showNotifTop(`✅ ${item.nama} berhasil menjadi customer!`);
                    await loadAllData();
                    return;
                default:
                    return;
            }
            
            // Update status prospek
            await supabaseUpdate('prospek', item.id, {
                status: nextStatus,
                deadline: newDeadline,
                dihubungi_data: {
                    terkirim: true,
                    dibalas: true,
                    via_broadcast: true,
                    timestamp: new Date().toISOString()
                }
            });
            
            showNotifTop(`✅ ${item.nama} dipindahkan ke ${nextStatus}`);
        }
        
        // Refresh data
        await loadAllData();
        
    } catch (error) {
        console.error('Error handle success:', error);
        showNotifTop(`❌ Gagal update status: ${error.message}`, true);
    }
}

// ========== HANDLE BROADCAST GAGAL ==========
async function handleBroadcastFailed(item, sourceType) {
    try {
        // Cek apakah data sudah ada di nomor_salah
        const { data: existing } = await supabase
            .from('nomor_salah')
            .select('id')
            .eq('hp', item.hp)
            .maybeSingle();
        
        if (!existing) {
            await supabase.from('nomor_salah').insert([{
                nama: item.nama,
                hp: item.hp,
                alasan: `Broadcast gagal - nomor tidak bisa dihubungi via WhatsApp`,
                deleted_at: new Date().toISOString(),
                user_id: item.user_id || currentUser.id,
                original_table: sourceType,
                original_id: item.id
            }]);
        }
        
        // Hapus dari tabel asal
        if (sourceType === 'customer') {
            await supabaseDelete('customers', item.id);
        } else if (sourceType === 'prospek') {
            await supabaseDelete('prospek', item.id);
        }
        
        showNotifTop(`📵 ${item.nama} dipindahkan ke Database Nomor Salah`);
        
        // Refresh data
        await loadAllData();
        
    } catch (error) {
        console.error('Error handle failed:', error);
        showNotifTop(`❌ Gagal pindah ke nomor salah: ${error.message}`, true);
    }
}

// ========== KONVERSI PROSPEK KE CUSTOMER ==========
async function convertProspekToCustomer(prospekId) {
    const doc = await supabaseGetById('prospek', prospekId);
    if (!doc) return;
    
    const newAgentId = `AG-${Date.now()}`;
    const followupDate = addDaysToDate(getTodayDate(), 30);
    
    // Cek duplikat
    const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(newAgentId, doc.hp);
    if (duplicateAgent || duplicateHp) {
        showNotifTop(`⚠️ Data ${doc.nama} sudah ada di Followup!`, true);
        return;
    }
    
    // Simpan ke DB Commitment
    await supabase.from('db_commitment').insert([{
        nama: doc.nama,
        hp: doc.hp,
        negosiasi_data: doc.negosiasi_data || null,
        agent_id: newAgentId,
        aplikasi: doc.negosiasi_data?.aplikasi || '',
        committed_at: new Date().toISOString(),
        user_id: doc.user_id,
        original_prospek_id: prospekId,
        followup_date: followupDate
    }]);
    
    // Pindahkan ke Customers
    await supabase.from('customers').insert([{
        agent_id: newAgentId,
        nama: doc.nama,
        hp: doc.hp,
        apk: doc.negosiasi_data?.aplikasi || '',
        agent_type: doc.agent_type || '',
        tanggal: followupDate,
        status: 'baru',
        user_id: doc.user_id,
        created_at: new Date().toISOString(),
        converted_from: 'prospek_broadcast'
    }]);
    
    // Hapus dari prospek
    await supabaseDelete('prospek', prospekId);
}

// ========== SAVE TO CLOSING DB ==========
async function saveToClosingDB(customerId, customerData) {
    await supabase.from('db_closing').insert([{
        nama: customerData.nama,
        hp: customerData.hp,
        closing_date: new Date().toISOString(),
        followup_data: customerData.followup_data || null,
        pending_data: customerData.pending_data || [],
        user_id: customerData.user_id
    }]);
    
    await supabaseDelete('customers', customerId);
}

function initTemplateFeature() {
    loadTemplates();
    
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    if (saveTemplateBtn) {
        saveTemplateBtn.onclick = () => {
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

function deleteTemplate(index) {
    savedTemplates.splice(index, 1);
    localStorage.setItem('broadcast_templates', JSON.stringify(savedTemplates));
    renderTemplateList();
    showNotifTop('🗑️ Template dihapus');
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
            <div style="font-size:11px;color:#6b7280;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(template.message.substring(0,100))}${template.message.length>100?'...':''}</div>
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
            if (confirm('Hapus template ini?')) deleteTemplate(idx);
        };
    });
}

// ========== UPLINE BROADCAST LENGKAP ==========
async function loadUplineNumbers() {
    const sourceType = document.querySelector('input[name="uplineSourceType"]:checked')?.value || 'transaksi';
    
    let collection = '';
    let statusField = 'status';
    let statusValues = [];
    
    if (sourceType === 'transaksi') {
        collection = 'db_transaksi';
        statusField = null;
    } else if (sourceType === 'customer') {
        collection = 'customers';
        statusValues = Array.from(document.querySelectorAll('#uplineCustomerFilter input:checked')).map(cb => cb.value);
    } else if (sourceType === 'custom') {
        const customNumbers = document.getElementById('uplineCustomNumbers')?.value || '';
        const numbers = customNumbers.split('\n').filter(n => n.trim());
        
        const listDiv = document.getElementById('uplineNumbersList');
        const countSpan = document.getElementById('uplineCount');
        
        if (listDiv) {
            if (numbers.length === 0) {
                listDiv.innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Masukkan nomor tujuan!</p>';
            } else {
                listDiv.innerHTML = numbers.map(num => `
                    <div class="number-item">
                        📞 ${escapeHtml(num.trim())}
                    </div>
                `).join('');
            }
        }
        if (countSpan) countSpan.innerText = numbers.length;
        return;
    }
    
    if (!collection) {
        showNotifTop('⚠️ Sumber tidak valid!', true);
        return;
    }
    
    if (sourceType === 'customer' && statusValues.length === 0) {
        showNotifTop('⚠️ Pilih minimal satu status!', true);
        const listDiv = document.getElementById('uplineNumbersList');
        if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Silakan pilih minimal satu status terlebih dahulu!</p>';
        document.getElementById('uplineCount').innerText = '0';
        return;
    }
    
    showNotifTop('⏳ Mengelompokkan data berdasarkan Upline...');
    
    let query = supabase.from(collection).select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    query = query.limit(2000);
    
    if (statusField && statusValues.length > 0) {
        query = query.in(statusField, statusValues);
    }
    
    const { data, error } = await query;
    const listDiv = document.getElementById('uplineNumbersList');
    const countSpan = document.getElementById('uplineCount');
    
    if (error || !data || data.length === 0) {
        if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; padding:20px;">⚠️ Tidak ada data dengan filter yang dipilih.</p>';
        if (countSpan) countSpan.innerText = '0';
        return;
    }
    
    const uplineMap = new Map();
    let dataWithoutUpline = 0;
    
    for (const doc of data) {
        const uplinePhone = doc.upline_phone || '';
        const uplineName = doc.upline_name || 'Tidak ada upline';
        
        if (!uplinePhone || uplinePhone === '+62' || uplinePhone === '62' || uplinePhone === '' || uplinePhone === '0') {
            dataWithoutUpline++;
            return;
        }
        
        if (!uplineMap.has(uplinePhone)) {
            uplineMap.set(uplinePhone, {
                upline_phone: uplinePhone,
                upline_name: uplineName,
                agents: []
            });
        }
        
        uplineMap.get(uplinePhone).agents.push({
            agent_id: doc.agent_id || '-',
            nama: doc.nama || '-',
            hp: doc.hp || '-'
        });
    }
    
    uplineDataList = Array.from(uplineMap.values());
    
    if (listDiv) {
        if (uplineDataList.length === 0) {
            listDiv.innerHTML = `<p style="color:#ef4444; padding:20px;">⚠️ Tidak ada data upline yang ditemukan!</p>
                <p style="color:#6b7280; font-size: 12px; padding: 0 20px 20px 20px;">
                📌 Pastikan data memiliki field:<br>
                • <strong>upline_phone</strong> (nomor HP upline)<br>
                • <strong>upline_name</strong> (nama upline)<br><br>
                ⏭ Data tanpa upline: ${dataWithoutUpline}
                </p>`;
            if (countSpan) countSpan.innerText = '0';
        } else {
            const totalAgent = uplineDataList.reduce((sum, u) => sum + u.agents.length, 0);
            if (countSpan) countSpan.innerText = uplineDataList.length;
            
            listDiv.innerHTML = `
                <div style="background: #eef2ff; padding: 10px; border-radius: 8px; margin-bottom: 12px;">
                    <strong>📊 Ringkasan:</strong><br>
                    Upline: ${uplineDataList.length} | Total Agent: ${totalAgent} | Data tanpa upline: ${dataWithoutUpline}
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
    
    showNotifTop(`✅ Ditemukan ${uplineDataList.length} Upline dengan total ${uplineDataList.reduce((sum, u) => sum + u.agents.length, 0)} agent`);
}

async function sendUplineBroadcast() {
    const messageTemplate = document.getElementById('uplineBroadcastMessage')?.value;
    const sendOneByOne = document.getElementById('uplineSendOneByOne')?.checked;
    
    if (!messageTemplate) {
        showNotifTop('⚠️ Pesan tidak boleh kosong!', true);
        return;
    }
    
    if (uplineDataList.length === 0) {
        showNotifTop('⚠️ Tidak ada data upline! Klik "Refresh Data Upline" terlebih dahulu.', true);
        return;
    }
    
    const totalAgent = uplineDataList.reduce((sum, u) => sum + u.agents.length, 0);
    
    if (!confirm(`⭐ KIRIM BROADCAST KE UPLINE\n\n👥 Upline: ${uplineDataList.length}\n📋 Total Agent: ${totalAgent}\n\nKlik OK untuk melanjutkan.`)) {
        return;
    }
    
    const progress = showFloatingProgress('⭐ Broadcast ke Upline', uplineDataList.length);
    progress.update(0, '🚀 Mengirim Broadcast', 'Memulai pengiriman...');
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < uplineDataList.length; i++) {
        const upline = uplineDataList[i];
        
        let message = messageTemplate;
        message = message.replace(/{nama_upline}/g, upline.upline_name);
        message = message.replace(/{total_agent}/g, upline.agents.length);
        
        let tableText = '';
        for (let j = 0; j < upline.agents.length; j++) {
            const agent = upline.agents[j];
            const nomorUrut = j + 1;
            tableText += `${nomorUrut}. ${agent.nama} (${agent.agent_id})\n`;
        }
        message = message.replace(/{tabel_agent}/g, tableText);
        
        let nomor = upline.upline_phone.toString();
        nomor = nomor.replace(/[^\d+]/g, '');
        if (!nomor.startsWith('+')) {
            nomor = nomor.replace(/^0+/, '');
            if (nomor.startsWith('62')) nomor = '+' + nomor;
            else nomor = '+62' + nomor;
        }
        const cleanNomor = nomor.replace(/[^\d]/g, '');
        
        try {
            window.open('https://wa.me/' + cleanNomor + '?text=' + encodeURIComponent(message), '_blank');
            success++;
            
            const percent = Math.floor(((i + 1) / uplineDataList.length) * 100);
            progress.update(percent, '⭐ Mengirim', `Mengirim ke ${upline.upline_name} (${i + 1}/${uplineDataList.length})...`, i + 1, uplineDataList.length);
            
            if (sendOneByOne) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        } catch (e) {
            failed++;
            console.error(`Gagal kirim ke ${upline.upline_name}:`, e);
        }
    }
    
    progress.update(100, '✅ Selesai', `Berhasil: ${success}, Gagal: ${failed}`, uplineDataList.length, uplineDataList.length);
    showNotifTop(`✅ Broadcast ke Upline selesai! Terkirim ke ${success} upline, Gagal: ${failed}`);
    setTimeout(() => progress.hide(), 4000);
}

// ========== REMINDER FUNCTIONS ==========
async function loadReminders() {
    try {
        let query = supabase.from('reminders').select('*');
        if (currentUserRole !== 'owner') {
            query = query.eq('user_id', currentUser.id);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        
        const reminderList = document.getElementById('reminderList');
        if (!reminderList) return;
        
        if (error || !data || data.length === 0) {
            reminderList.innerHTML = '<p style="text-align:center;padding:40px;">⏰ Belum ada pengingat</p>';
            return;
        }
        
        const items = data;
        
        reminderList.innerHTML = items.map(item => {
            let ownerInfo = '';
            if (currentUserRole === 'owner' && item.user_id !== currentUser.id) {
                ownerInfo = `<small style="color:#4f46e5;">(Milik: ${escapeHtml(item.user_name || 'CS Lain')})</small>`;
            }
            return `<div class="db-item"><div class="db-item-info"><h4>📝 ${escapeHtml(item.title)}</h4><p>${escapeHtml(item.description || '-')}</p><small>⏰ ${item.datetime ? new Date(item.datetime).toLocaleString('id-ID') : '-'} ${ownerInfo}</small></div><div class="db-item-actions"><button class="db-item-delete" onclick="deleteReminder('${item.id}')">🗑️ Hapus</button></div></div>`;
        }).join('');
    } catch (e) {
        console.error('Error loadReminders:', e);
        const reminderList = document.getElementById('reminderList');
        if (reminderList) reminderList.innerHTML = '<p style="text-align:center;padding:40px;color:red;">❌ Gagal memuat pengingat</p>';
    }
}

window.deleteReminder = async function(id) {
    if (!confirm('Hapus pengingat ini?')) return;
    await supabaseDelete('reminders', id);
    showNotifTop('🗑️ Pengingat dihapus');
    loadReminders();
};

async function loadPesan() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('to_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        const pesanList = document.getElementById('pesanList');
        if (!pesanList) return;
        
        if (error || !data || data.length === 0) {
            pesanList.innerHTML = '<p style="text-align:center;padding:40px;">💬 Belum ada pesan</p>';
            return;
        }
        
        const items = [];
        for (const doc of data) {
            let fromName = 'Unknown';
            try {
                const { data: fromUser } = await supabase
                    .from('users')
                    .select('nama, email')
                    .eq('id', doc.from_id)
                    .single();
                if (fromUser) fromName = fromUser.nama || fromUser.email || 'CS Agent';
            } catch (e) {}
            items.push({ id: doc.id, ...doc, fromName });
        }
        
        pesanList.innerHTML = items.map(item => `
            <div class="db-item ${!item.is_read ? 'unread' : ''}">
                <div class="db-item-info">
                    <h4>📨 Dari: ${escapeHtml(item.fromName)}</h4>
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
    } catch (e) {
        console.error(e);
        const pesanList = document.getElementById('pesanList');
        if (pesanList) pesanList.innerHTML = '<p style="text-align:center;padding:40px;color:red;">❌ Gagal memuat pesan</p>';
    }
}

window.markAsRead = async function(id) {
    await supabaseUpdate('messages', id, { is_read: true });
    showNotif('Pesan ditandai dibaca');
    loadPesan();
    updateAllBadges();
};

window.deletePesan = async function(id) {
    if (confirm('Hapus pesan ini?')) {
        await supabaseDelete('messages', id);
        showNotif('Pesan dihapus');
        loadPesan();
        updateAllBadges();
    }
};

// ========== MANAGE USERS FUNCTIONS ==========
async function loadUsersList() {
    if (currentUserRole !== 'owner') return;

    const { data, error } = await supabase.from('users').select('*');
    
    if (error) {
        console.error('Error load users:', error);
        return;
    }
    
    const users = [];
    for (const user of (data || [])) {
        if (user.id !== currentUser.id) {
            users.push({ id: user.id, ...user });
        }
    }

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

window.deleteUser = async function(userId) {
    if (!confirm('Yakin ingin menghapus CS Agent ini? Data CS akan tetap ada tetapi tidak bisa login.')) return;
    try {
        await supabase.auth.admin.deleteUser(userId);
        await supabaseDelete('users', userId);
        showNotif('✅ CS Agent berhasil dihapus');
        loadUsersList();
    } catch (e) {
        showNotif('❌ Gagal: ' + e.message, true);
    }
};

async function loadUsersForSelect() {
    const { data, error } = await supabase.from('users').select('*');
    const select = document.getElementById('pesanTo');
    if (!select) return;
    select.innerHTML = '<option value="">Pilih CS Tujuan</option>';
    if (!error && data) {
        for (const user of data) {
            if (user.id !== currentUser.id) {
                select.innerHTML += `<option value="${user.id}">${escapeHtml(user.nama || user.email || 'CS Agent')}</option>`;
            }
        }
    }
}

// ========== INIT BROADCAST LENGKAP ==========
function initBroadcast() {
    if (!document.querySelector('input[name="sourceType"]')) return;

    document.querySelectorAll('input[name="sourceType"]').forEach(radio => {
        radio.removeEventListener('change', handleSourceChange);
        radio.addEventListener('change', handleSourceChange);
    });

    function handleSourceChange(e) {
        const value = e.target.value;
        const filterCard = document.getElementById('filterStatusCard');
        const customCard = document.getElementById('customNumbersCard');
        const prospekFilter = document.getElementById('prospekFilter');
        const customerFilter = document.getElementById('customerFilter');

        if (filterCard) filterCard.style.display = 'none';
        if (prospekFilter) prospekFilter.style.display = 'none';
        if (customerFilter) customerFilter.style.display = 'none';
        if (customCard) customCard.style.display = 'none';

        if (value === 'custom') {
            if (customCard) customCard.style.display = 'block';
        } else if (value === 'customer') {
            if (filterCard) filterCard.style.display = 'block';
            if (customerFilter) customerFilter.style.display = 'flex';
        } else if (value === 'prospek') {
            if (filterCard) filterCard.style.display = 'block';
            if (prospekFilter) prospekFilter.style.display = 'flex';
        } else if (value === 'tidak_tertarik') {
            if (filterCard) filterCard.style.display = 'block';
        }
        loadNumbers();
    }

    document.querySelectorAll('#customerFilter input, #prospekFilter input').forEach(cb => {
        cb.removeEventListener('change', loadNumbers);
        cb.addEventListener('change', loadNumbers);
    });

    document.getElementById('customNumbers')?.addEventListener('input', loadNumbers);
    document.getElementById('refreshNumbersBtn')?.addEventListener('click', loadNumbers);
    document.getElementById('sendBroadcastBtn')?.addEventListener('click', sendBroadcast);

    loadNumbers();
    initTemplateFeature();
}

// ========== INIT UPLINE BROADCAST ==========
function initUplineBroadcast() {
    console.log('initUplineBroadcast dipanggil');
    
    // Setup radio buttons untuk sumber data
    const radioButtons = document.querySelectorAll('input[name="uplineSourceType"]');
    const customerFilter = document.getElementById('uplineCustomerFilter');
    const transaksiFilter = document.getElementById('uplineTransaksiFilter');
    const customCard = document.getElementById('uplineCustomCard');
    
    function updateUplineSourceDisplay() {
        const selectedValue = document.querySelector('input[name="uplineSourceType"]:checked')?.value;
        
        // Sembunyikan semua filter terlebih dahulu
        if (customerFilter) customerFilter.style.display = 'none';
        if (transaksiFilter) transaksiFilter.style.display = 'none';
        if (customCard) customCard.style.display = 'none';
        
        // Tampilkan filter sesuai pilihan
        if (selectedValue === 'customer') {
            if (customerFilter) customerFilter.style.display = 'block';
        } else if (selectedValue === 'transaksi') {
            if (transaksiFilter) transaksiFilter.style.display = 'block';
        } else if (selectedValue === 'custom') {
            if (customCard) customCard.style.display = 'block';
        }
    }
    
    // Tambahkan event listener ke radio buttons
    radioButtons.forEach(radio => {
        radio.removeEventListener('change', updateUplineSourceDisplay);
        radio.addEventListener('change', updateUplineSourceDisplay);
    });
    
    // Setup filter untuk customer (checkbox)
    const customerCheckboxes = document.querySelectorAll('#uplineCustomerFilter input[type="checkbox"]');
    customerCheckboxes.forEach(cb => {
        cb.removeEventListener('change', loadUplineNumbers);
        cb.addEventListener('change', loadUplineNumbers);
    });
    
    // Setup refresh button
    const refreshBtn = document.getElementById('refreshUplineBtn');
    if (refreshBtn) {
        refreshBtn.removeEventListener('click', loadUplineNumbers);
        refreshBtn.addEventListener('click', loadUplineNumbers);
    }
    
    // Setup send button
    const sendBtn = document.getElementById('sendUplineBroadcastBtn');
    if (sendBtn) {
        sendBtn.removeEventListener('click', sendUplineBroadcast);
        sendBtn.addEventListener('click', sendUplineBroadcast);
    }
    
    // Setup custom numbers input
    const customNumbers = document.getElementById('uplineCustomNumbers');
    if (customNumbers) {
        customNumbers.removeEventListener('input', loadUplineNumbers);
        customNumbers.addEventListener('input', loadUplineNumbers);
    }
    
    // Initial display
    updateUplineSourceDisplay();
    
    // Load initial data
    loadUplineNumbers();
}

// ========== SEARCH FUNCTIONS ==========
async function performSearch() {
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!keyword) {
        showNotif('⚠️ Masukkan kata kunci pencarian!', true);
        return;
    }

    const searchCustomer = document.getElementById('searchCustomer')?.checked || false;
    const searchProspek = document.getElementById('searchProspek')?.checked || false;
    const searchClosing = document.getElementById('searchClosing')?.checked || false;
    const searchTidak = document.getElementById('searchTidak')?.checked || false;
    const searchNomorSalah = document.getElementById('searchNomorSalah')?.checked || false;
    const searchCommitment = document.getElementById('searchCommitment')?.checked || false;

    const results = [];
    const SEARCH_LIMIT = 50;

    let customersQuery, prospekQuery, closingQuery, tidakQuery, nomorSalahQuery, commitmentQuery;
    
    if (currentUserRole === 'owner') {
        customersQuery = supabase.from('customers').select('*');
        prospekQuery = supabase.from('prospek').select('*');
        closingQuery = supabase.from('db_closing').select('*');
        tidakQuery = supabase.from('db_tidak_tertarik').select('*');
        nomorSalahQuery = supabase.from('nomor_salah').select('*');
        commitmentQuery = supabase.from('db_commitment').select('*');
    } else {
        customersQuery = supabase.from('customers').select('*').eq('user_id', currentUser.id);
        prospekQuery = supabase.from('prospek').select('*').eq('user_id', currentUser.id);
        closingQuery = supabase.from('db_closing').select('*').eq('user_id', currentUser.id);
        tidakQuery = supabase.from('db_tidak_tertarik').select('*').eq('user_id', currentUser.id);
        nomorSalahQuery = supabase.from('nomor_salah').select('*').eq('user_id', currentUser.id);
        commitmentQuery = supabase.from('db_commitment').select('*').eq('user_id', currentUser.id);
    }

    if (searchCustomer) {
        const { data, error } = await customersQuery.limit(SEARCH_LIMIT);
        if (!error && data) {
            for (const doc of data) {
                const searchText = `${doc.agent_id || ''} ${doc.nama || ''} ${doc.hp || ''}`.toLowerCase();
                if (searchText.includes(keyword)) {
                    results.push({
                        id: doc.id,
                        type: 'customer',
                        title: doc.nama,
                        subtitle: doc.hp,
                        detail: `ID: ${doc.agent_id || '-'} | Deadline: ${doc.tanggal || '-'}`,
                        badge: 'Followup Agen',
                        badgeClass: 'badge-customer'
                    });
                }
            }
        }
    }

    if (searchProspek) {
        const { data, error } = await prospekQuery.limit(SEARCH_LIMIT);
        if (!error && data) {
            for (const doc of data) {
                const searchText = `${doc.nama || ''} ${doc.hp || ''}`.toLowerCase();
                if (searchText.includes(keyword)) {
                    results.push({
                        id: doc.id,
                        type: 'prospek',
                        title: doc.nama,
                        subtitle: doc.hp,
                        detail: `Status: ${doc.status || 'Baru'} | Deadline: ${doc.deadline || '-'}`,
                        badge: 'Prospek Agen',
                        badgeClass: 'badge-prospek'
                    });
                }
            }
        }
    }

    if (searchClosing) {
        const { data, error } = await closingQuery.limit(SEARCH_LIMIT);
        if (!error && data) {
            for (const doc of data) {
                const searchText = `${doc.nama || ''} ${doc.hp || ''}`.toLowerCase();
                if (searchText.includes(keyword)) {
                    results.push({
                        id: doc.id,
                        type: 'closing',
                        title: doc.nama,
                        subtitle: doc.hp,
                        detail: `Closing: ${doc.closing_date ? new Date(doc.closing_date).toLocaleDateString('id-ID') : '-'}`,
                        badge: 'DB Closing',
                        badgeClass: 'badge-closing'
                    });
                }
            }
        }
    }

    if (searchTidak) {
        const { data, error } = await tidakQuery.limit(SEARCH_LIMIT);
        if (!error && data) {
            for (const doc of data) {
                const searchText = `${doc.nama || ''} ${doc.hp || ''}`.toLowerCase();
                if (searchText.includes(keyword)) {
                    results.push({
                        id: doc.id,
                        type: 'tidak',
                        title: doc.nama,
                        subtitle: doc.hp,
                        detail: `Tanggal: ${doc.tanggal ? new Date(doc.tanggal).toLocaleDateString('id-ID') : '-'}`,
                        badge: 'DB Tidak Tertarik',
                        badgeClass: 'badge-tidak'
                    });
                }
            }
        }
    }

    if (searchNomorSalah) {
        const { data, error } = await nomorSalahQuery.limit(SEARCH_LIMIT);
        if (!error && data) {
            for (const doc of data) {
                const searchText = `${doc.nama || ''} ${doc.hp || ''}`.toLowerCase();
                if (searchText.includes(keyword)) {
                    results.push({
                        id: doc.id,
                        type: 'nomor_salah',
                        title: doc.nama,
                        subtitle: doc.hp,
                        detail: `Alasan: ${doc.alasan || '-'}`,
                        badge: 'DB Nomor Salah',
                        badgeClass: 'badge-nomor-salah'
                    });
                }
            }
        }
    }

    if (searchCommitment) {
        const { data, error } = await commitmentQuery.limit(SEARCH_LIMIT);
        if (!error && data) {
            for (const doc of data) {
                const searchText = `${doc.nama || ''} ${doc.hp || ''}`.toLowerCase();
                if (searchText.includes(keyword)) {
                    results.push({
                        id: doc.id,
                        type: 'commitment',
                        title: doc.nama,
                        subtitle: doc.hp,
                        detail: `Agent: ${doc.agent_id || '-'}`,
                        badge: 'DB Commitment',
                        badgeClass: 'badge-commitment'
                    });
                }
            }
        }
    }

    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">🔍 Tidak ada data yang ditemukan</p>';
        return;
    }

    resultsContainer.innerHTML = results.map(result => `
        <div class="search-result-item" data-id="${result.id}" data-type="${result.type}" style="cursor:pointer;">
            <div class="search-result-info">
                <h4>${escapeHtml(result.title)}</h4>
                <p>${escapeHtml(result.subtitle)}</p>
                <small>${escapeHtml(result.detail)}</small>
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

function openSearchResultDetail(id, type) {
    if (type === 'customer') {
        openDetailCustomer(id);
    } else if (type === 'prospek') {
        openDetailProspek(id);
    } else {
        openDBDetailModal(id, type);
    }
}

// ========== DATABASE ARCHIVES FUNCTIONS ==========
async function loadDBClosing() {
    if (!currentUser) return;
    const isOwner = currentUserRole === 'owner';
    let query = supabase.from('db_closing').select('*');
    if (!isOwner) {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('closing_date', { ascending: false });
    
    if (error) {
        console.error('Error load closing:', error);
        return;
    }
    
    let items = [];
    for (const doc of (data || [])) {
        let ownerName = '';
        if (isOwner && doc.user_id !== currentUser.id) {
            const { data: userData } = await supabase
                .from('users')
                .select('nama')
                .eq('id', doc.user_id)
                .single();
            ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
        }
        items.push({
            id: doc.id,
            nama: doc.nama + ownerName,
            hp: doc.hp,
            closing_date: doc.closing_date,
            checked: selectedClosingIds.get(doc.id) || false
        });
    }
    
    const html = items.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="closing" style="cursor: pointer;">
            <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${item.checked ? 'checked' : ''}>
            <div class="db-item-info"><h4>${escapeHtml(item.nama)}</h4><p>${item.hp}</p><small>Closing: ${new Date(item.closing_date).toLocaleDateString('id-ID')}</small></div>
            <div class="db-item-actions"><button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button><button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('closing', '${item.id}')">🗑️ Hapus</button></div>
        </div>
    `).join('');
    
    const container = document.getElementById('dbClosingList');
    if (container) {
        container.innerHTML = html || '<p style="text-align:center;padding:40px;">📭 Belum ada data closing</p>';
        document.querySelectorAll('#dbClosingList .db-item').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('db-item-wa') && !e.target.classList.contains('db-item-delete')) {
                    openDBDetailModal(el.dataset.id, 'closing');
                }
            };
        });
    }
    attachCheckboxEvents('#dbClosingList', selectedClosingIds, 'selectAllClosing');
}

async function loadDBTidak() {
    if (!currentUser) return;
    const isOwner = currentUserRole === 'owner';
    let query = supabase.from('db_tidak_tertarik').select('*');
    if (!isOwner) {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('tanggal', { ascending: false });
    
    if (error) {
        console.error('Error load tidak:', error);
        return;
    }
    
    let items = [];
    for (const doc of (data || [])) {
        let ownerName = '';
        if (isOwner && doc.user_id !== currentUser.id) {
            const { data: userData } = await supabase
                .from('users')
                .select('nama')
                .eq('id', doc.user_id)
                .single();
            ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
        }
        items.push({
            id: doc.id,
            nama: doc.nama + ownerName,
            hp: doc.hp,
            tanggal: doc.tanggal,
            checked: selectedTidakIds.get(doc.id) || false
        });
    }
    
    const html = items.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="tidak" style="cursor: pointer;">
            <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${item.checked ? 'checked' : ''}>
            <div class="db-item-info"><h4>${escapeHtml(item.nama)}</h4><p>${item.hp}</p><small>Tanggal: ${new Date(item.tanggal).toLocaleDateString('id-ID')}</small></div>
            <div class="db-item-actions"><button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button><button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('tidak', '${item.id}')">🗑️ Hapus</button></div>
        </div>
    `).join('');
    
    const container = document.getElementById('dbTidakList');
    if (container) {
        container.innerHTML = html || '<p style="text-align:center;padding:40px;">📭 Belum ada data tidak tertarik</p>';
        document.querySelectorAll('#dbTidakList .db-item').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('db-item-wa') && !e.target.classList.contains('db-item-delete')) {
                    openDBDetailModal(el.dataset.id, 'tidak');
                }
            };
        });
    }
    attachCheckboxEvents('#dbTidakList', selectedTidakIds, 'selectAllTidak');
}

async function loadDBNomorSalah() {
    if (!currentUser) return;
    const isOwner = currentUserRole === 'owner';
    let query = supabase.from('nomor_salah').select('*');
    if (!isOwner) {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('deleted_at', { ascending: false });
    
    if (error) {
        console.error('Error load nomor salah:', error);
        return;
    }
    
    let items = [];
    for (const doc of (data || [])) {
        let ownerName = '';
        if (isOwner && doc.user_id !== currentUser.id) {
            const { data: userData } = await supabase
                .from('users')
                .select('nama')
                .eq('id', doc.user_id)
                .single();
            ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
        }
        items.push({
            id: doc.id,
            nama: doc.nama + ownerName,
            hp: doc.hp,
            alasan: doc.alasan,
            deleted_at: doc.deleted_at,
            checked: selectedNomorSalahIds.get(doc.id) || false
        });
    }
    
    const html = items.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="nomor_salah" style="cursor: pointer;">
            <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${item.checked ? 'checked' : ''}>
            <div class="db-item-info"><h4>${escapeHtml(item.nama)}</h4><p>${item.hp}</p><small>Alasan: ${item.alasan}<br>Tanggal: ${new Date(item.deleted_at).toLocaleDateString('id-ID')}</small></div>
            <div class="db-item-actions"><button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button><button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('nomor_salah', '${item.id}')">🗑️ Hapus</button></div>
        </div>
    `).join('');
    
    const container = document.getElementById('dbNomorSalahList');
    if (container) {
        container.innerHTML = html || '<p style="text-align:center;padding:40px;">📭 Belum ada data nomor salah</p>';
        document.querySelectorAll('#dbNomorSalahList .db-item').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('db-item-wa') && !e.target.classList.contains('db-item-delete')) {
                    openDBDetailModal(el.dataset.id, 'nomor_salah');
                }
            };
        });
    }
    attachCheckboxEvents('#dbNomorSalahList', selectedNomorSalahIds, 'selectAllNomorSalah');
}

async function loadDBCommitment() {
    if (!currentUser) return;
    const isOwner = currentUserRole === 'owner';
    let query = supabase.from('db_commitment').select('*');
    if (!isOwner) {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('committed_at', { ascending: false });
    
    if (error) {
        console.error('Error load commitment:', error);
        return;
    }
    
    let items = [];
    for (const doc of (data || [])) {
        let ownerName = '';
        if (isOwner && doc.user_id !== currentUser.id) {
            const { data: userData } = await supabase
                .from('users')
                .select('nama')
                .eq('id', doc.user_id)
                .single();
            ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
        }
        items.push({
            id: doc.id,
            nama: doc.nama + ownerName,
            hp: doc.hp,
            committed_at: doc.committed_at,
            agent_id: doc.agent_id,
            aplikasi: doc.aplikasi,
            followup_date: doc.followup_date,
            checked: selectedCommitmentIds.get(doc.id) || false
        });
    }
    
    const html = items.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="commitment" style="cursor: pointer;">
            <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${item.checked ? 'checked' : ''}>
            <div class="db-item-info"><h4>${escapeHtml(item.nama)}</h4><p>${item.hp}</p><small>Komitmen: ${new Date(item.committed_at).toLocaleDateString('id-ID')}<br>Followup: ${item.followup_date || '-'}<br>Agent: ${item.agent_id || '-'}<br>Aplikasi: ${item.aplikasi || '-'}</small></div>
            <div class="db-item-actions"><button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button><button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_commitment', '${item.id}')">🗑️ Hapus</button></div>
        </div>
    `).join('');
    
    const container = document.getElementById('dbCommitmentList');
    if (container) {
        container.innerHTML = html || '<p style="text-align:center;padding:40px;">📭 Belum ada data komitmen</p>';
        document.querySelectorAll('#dbCommitmentList .db-item').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('db-item-wa') && !e.target.classList.contains('db-item-delete')) {
                    openDBDetailModal(el.dataset.id, 'commitment');
                }
            };
        });
    }
    attachCheckboxEvents('#dbCommitmentList', selectedCommitmentIds, 'selectAllCommitment');
}

async function openDBDetailModal(id, type) {
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

    try {
        const { data: d, error } = await supabase
            .from(collectionName)
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !d) return;

        let ownerInfo = '';
        if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
            const { data: userData } = await supabase
                .from('users')
                .select('nama')
                .eq('id', d.user_id)
                .single();
            const ownerName = userData?.nama || 'CS Agent';
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
            
            detailHtml = `${ownerInfo}
                <div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Nama</label><div class="value">${escapeHtml(d.nama)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Tanggal Closing</label><div class="value">${new Date(d.closing_date).toLocaleDateString('id-ID')}</div></div></div>
                ${pendingHtml}
                <div class="detail-info-item"><div class="detail-info-icon">📌</div><div class="detail-info-content"><label>Catatan Followup</label><div class="value">${d.followup_data ? `Terkirim: ${d.followup_data.terkirim ? 'Ya' : 'Tidak'} | Dibalas: ${d.followup_data.dibalas ? 'Ya' : 'Tidak'}` : '-'}</div></div></div>`;
        } else if (type === 'tidak') {
            detailHtml = `${ownerInfo}<div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Nama</label><div class="value">${escapeHtml(d.nama)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Tanggal</label><div class="value">${new Date(d.tanggal).toLocaleDateString('id-ID')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">❌</div><div class="detail-info-content"><label>Alasan</label><div class="value">${d.alasan || 'Tidak tertarik'}</div></div></div>`;
        } else if (type === 'nomor_salah') {
            detailHtml = `${ownerInfo}<div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Nama</label><div class="value">${escapeHtml(d.nama)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Tanggal Dihapus</label><div class="value">${new Date(d.deleted_at).toLocaleDateString('id-ID')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📵</div><div class="detail-info-content"><label>Alasan</label><div class="value">${d.alasan || 'Nomor tidak bisa dihubungi'}</div></div></div>`;
        } else if (type === 'commitment') {
            detailHtml = `${ownerInfo}<div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Nama</label><div class="value">${escapeHtml(d.nama)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Tanggal Komitmen</label><div class="value">${new Date(d.committed_at).toLocaleDateString('id-ID')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">🆔</div><div class="detail-info-content"><label>ID Agent</label><div class="value">${d.agent_id || '-'}</div></div></div>`;
        }

        document.getElementById('detailContent').innerHTML = `
            <div class="detail-header"><div class="detail-avatar">📁</div><h3>${title}</h3><div class="detail-status">Arsip</div></div>
            <div class="detail-body">
                <div class="detail-info">${detailHtml}</div>
                <div class="detail-actions"><button class="btn-success" onclick="openWA('${d.hp}')">💬 WhatsApp</button></div>
            </div>
            <div class="detail-footer"><button class="btn-outline" onclick="closeModal('detailModal')">❌ Tutup</button><button class="btn-danger" onclick="deleteDBItem('${type}', '${id}'); closeModal('detailModal');">🗑️ Hapus</button></div>
        `;
        showModal('detailModal');
    } catch (error) {
        console.error('Error openDBDetailModal:', error);
        showNotifTop('❌ Gagal memuat detail: ' + error.message, true);
    }
}

function deleteDBItem(type, id) {
    if (!confirm('Yakin hapus data ini? Data akan dihapus permanen!')) return;

    let collectionName = '';
    let mapRef = null;

    switch (type) {
        case 'closing':
            collectionName = 'db_closing';
            mapRef = selectedClosingIds;
            break;
        case 'tidak':
            collectionName = 'db_tidak_tertarik';
            mapRef = selectedTidakIds;
            break;
        case 'nomor_salah':
            collectionName = 'nomor_salah';
            mapRef = selectedNomorSalahIds;
            break;
        case 'db_commitment':
            collectionName = 'db_commitment';
            mapRef = selectedCommitmentIds;
            break;
        default:
            showNotifTop('❌ Tipe tidak dikenal', true);
            return;
    }

    try {
        supabaseDelete(collectionName, id);
        if (mapRef) mapRef.delete(id);
        showNotifTop('🗑️ Data berhasil dihapus');

        if (type === 'closing') loadDBClosing();
        else if (type === 'tidak') loadDBTidak();
        else if (type === 'nomor_salah') loadDBNomorSalah();
        else if (type === 'db_commitment') loadDBCommitment();
    } catch (e) {
        showNotifTop('❌ Gagal hapus: ' + e.message, true);
    }
}

function attachCheckboxEvents(selector, map, selectAllId) {
    const checkboxes = document.querySelectorAll(`${selector} .db-item-checkbox`);
    checkboxes.forEach(cb => {
        cb.onchange = (e) => {
            const id = cb.dataset.id;
            cb.checked ? map.set(id, true) : map.delete(id);
            const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(c => c.checked);
            const btn = document.getElementById(selectAllId);
            if (btn) btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
        };
    });
    const btn = document.getElementById(selectAllId);
    if (btn) {
        btn.onclick = () => {
            const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => {
                cb.checked = !allChecked;
                const id = cb.dataset.id;
                !allChecked ? map.set(id, true) : map.delete(id);
            });
            btn.textContent = !allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
        };
    }
}

// ========== DB TRANSAKSI FUNCTIONS ==========
let transaksiData = [];
let transaksiLastDoc = null;
let transaksiHasMore = true;
let isLoadingMore = false;
let isDeletingAll = false;
let totalTransaksiCount = 0;

// ========== VARIABEL UNTUK PEMINDAHAN KE CS ==========
let pendingMoveData = [];
let daftarCs = [];

// ========== FUNGSI UNTUK LOAD DAFTAR CS ==========
async function loadDaftarCs() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'cs');
        
        if (error) throw error;
        
        daftarCs = [];
        for (const doc of (data || [])) {
            daftarCs.push({
                id: doc.id,
                nama: doc.nama || doc.email || 'CS Agent',
                email: doc.email,
                hp: doc.hp
            });
        }
        
        const csSelect = document.getElementById('csTujuanSelect');
        if (csSelect) {
            csSelect.innerHTML = '<option value="">Pilih CS Agent</option>' + 
                daftarCs.map(cs => `<option value="${cs.id}">${escapeHtml(cs.nama)}</option>`).join('');
        }
        
        const csMultiContainer = document.getElementById('csMultiSelect');
        if (csMultiContainer) {
            csMultiContainer.innerHTML = daftarCs.map(cs => `
                <label style="display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; cursor: pointer; border-bottom: 1px solid #e5e7eb;">
                    <input type="checkbox" value="${cs.id}" class="cs-checkbox" style="width: 18px; height: 18px;">
                    <span>👤 ${escapeHtml(cs.nama)}</span>
                    <small style="color: #9ca3af; margin-left: auto;">${escapeHtml(cs.email)}</small>
                </label>
            `).join('');
        }
    } catch (e) {
        console.error('Error load CS:', e);
    }
}

// ========== FUNGSI MENAMPILKAN MODAL PILIH CS ==========
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
        satuGroup.style.display = 'block';
        rataGroup.style.display = 'none';
        
        metodeSelect.onchange = () => {
            const metode = metodeSelect.value;
            if (metode === 'satu') {
                satuGroup.style.display = 'block';
                rataGroup.style.display = 'none';
            } else {
                satuGroup.style.display = 'none';
                rataGroup.style.display = 'block';
            }
        };
    }
    
    const confirmBtn = document.getElementById('confirmPindahKeCsBtn');
    if (confirmBtn) {
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.onclick = async () => {
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
    if (batalBtn) {
        const newBatalBtn = batalBtn.cloneNode(true);
        batalBtn.parentNode.replaceChild(newBatalBtn, batalBtn);
        newBatalBtn.onclick = () => {
            closeModal('pilihCsTujuanModal');
            pendingMoveData = [];
        };
    }
}

// ========== FUNGSI PROSES PEMINDAHAN KE CS ==========
function bagiDataBerdasarkanUpline(dataToMove, csIds) {
    console.log('========== DEBUG PEMBAGIAN UPLINE ==========');
    console.log('Total data yang akan dibagi:', dataToMove.length);
    console.log('Jumlah CS:', csIds.length);
    
    const uplineGroups = new Map();
    
    for (const item of dataToMove) {
        let uplineKey = item.upline_phone || 'NO_UPLINE';
        uplineKey = String(uplineKey).trim();
        
        if (!uplineKey || uplineKey === '' || uplineKey === '0' || uplineKey === '+62') {
            uplineKey = 'NO_UPLINE';
        }
        
        const uplineName = item.upline_name || 'Tanpa Upline';
        
        if (!uplineGroups.has(uplineKey)) {
            uplineGroups.set(uplineKey, {
                upline_phone: uplineKey,
                upline_name: uplineName,
                agents: [],
                totalAgent: 0
            });
        }
        
        uplineGroups.get(uplineKey).agents.push(item);
        uplineGroups.get(uplineKey).totalAgent++;
    }
    
    let groups = Array.from(uplineGroups.values());
    groups.sort((a, b) => b.totalAgent - a.totalAgent);
    
    const result = csIds.map(csId => ({
        csId: csId,
        data: [],
        totalAgent: 0,
        groups: []
    }));
    
    for (const group of groups) {
        let minIndex = 0;
        let minTotal = result[0].totalAgent;
        
        for (let i = 1; i < result.length; i++) {
            if (result[i].totalAgent < minTotal) {
                minTotal = result[i].totalAgent;
                minIndex = i;
            }
        }
        
        result[minIndex].data.push(...group.agents);
        result[minIndex].totalAgent += group.totalAgent;
        result[minIndex].groups.push(group);
    }
    
    result.sort((a, b) => b.totalAgent - a.totalAgent);
    
    return result;
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
    } else if (metode === 'upline') {
        const pembagian = bagiDataBerdasarkanUpline(dataToMove, csIds);
        dataPerCs = pembagian.map(item => ({
            csId: item.csId,
            data: item.data,
            count: item.totalAgent
        }));
    } else {
        dataPerCs.push({
            csId: csIds[0],
            data: dataToMove,
            count: totalData
        });
    }
    
    const progress = showFloatingProgressWithCancel('📋 Memindahkan ke Followup', totalData, () => {
        showNotifTop('⏹️ Pemindahan dibatalkan');
    });
    progress.update(0, '📋 Memindahkan', 'Memulai proses...');
    
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    
    for (const csItem of dataPerCs) {
        const csInfo = daftarCs.find(c => c.id === csItem.csId);
        const csName = csInfo ? csInfo.nama : 'CS Agent';
        
        for (let i = 0; i < csItem.data.length; i++) {
            const item = csItem.data[i];
            
            try {
                const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(item.agent_id, item.hp);
                
                if (duplicateAgent) {
                    totalSkipped++;
                    continue;
                }
                if (duplicateHp) {
                    totalSkipped++;
                    continue;
                }
                
                let totalTercapai = 0;
                if (item.progres_jenis === 'naik') {
                    totalTercapai = Math.abs(item.progres_jumlah || 0);
                } else if (item.progres_jenis === 'turun') {
                    totalTercapai = -Math.abs(item.progres_jumlah || 0);
                } else {
                    totalTercapai = item.progres_jumlah || 0;
                }
                
                const progresItem = {
                    tanggal: item.tanggal_transaksi || getTodayDate(),
                    jenis: item.progres_jenis || 'normal',
                    jumlah: Math.abs(item.progres_jumlah || 0),
                    keterangan: `Dipindahkan dari DB Transaksi oleh ${currentUserName} ke CS: ${csName}`,
                    created_at: new Date().toISOString()
                };
                
                await supabase.from('customers').insert([{
                    agent_id: item.agent_id,
                    nama: item.nama,
                    hp: item.hp,
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
                }]);
                
                await supabaseUpdate('db_transaksi', item.id, {
                    status: 'imported',
                    moved_to_followup_at: new Date().toISOString(),
                    moved_to_cs_id: csItem.csId,
                    moved_to_cs_name: csName
                });
                
                selectedTransaksiIds.delete(item.id);
                totalSuccess++;
                
            } catch (e) {
                totalFailed++;
                console.error(`Gagal pindah ${item.nama}:`, e);
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
    
    setTimeout(() => progress.hide(), 3000);
}

// ========== FUNGSI MOVE SELECTED TO FOLLOWUP ==========
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

// ========== FUNGSI SHOW FLOATING PROGRESS WITH CANCEL ==========
function showFloatingProgressWithCancel(title, total = 0, onCancel = null) {
    if (activeProgress) {
        activeProgress.remove();
        activeProgress = null;
    }

    const container = document.createElement('div');
    container.className = 'floating-progress';
    container.innerHTML = `
        <button class="progress-close" id="progressCloseBtn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; padding: 4px; border-radius: 6px; position: absolute; top: 12px; right: 12px;">✕</button>
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
            if (onCancel) {
                onCancel();
            }
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

// ========== FUNGSI LOAD DB TRANSAKSI ==========
async function loadDbTransaksi(loadMore = false) {
    if (!currentUser) {
        console.log('loadDbTransaksi: No user logged in');
        return;
    }
    
    console.log('loadDbTransaksi: Memuat data transaksi...', loadMore ? '(load more)' : '(fresh)');
    
    if (!loadMore) {
        transaksiData = [];
        transaksiLastDoc = null;
        transaksiHasMore = true;
        isLoadingMore = false;
    }
    
    if (isLoadingMore || !transaksiHasMore) {
        if (!transaksiHasMore && loadMore) {
            showNotifTop('📭 Tidak ada data lagi untuk dimuat');
        }
        return;
    }
    
    isLoadingMore = true;
    
    const container = document.getElementById('dbTransaksiList');
    if (container && loadMore) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingMoreTransaksi';
        loadingDiv.style.textAlign = 'center';
        loadingDiv.style.padding = '20px';
        loadingDiv.innerHTML = '⏳ Memuat lebih banyak data...';
        container.appendChild(loadingDiv);
    }
    
    try {
        const isOwner = currentUserRole === 'owner';
        let query = supabase.from('db_transaksi').select('*');
        
        if (!isOwner) {
            query = query.eq('user_id', currentUser.id);
        }
        
        query = query.order('tanggal_transaksi', { ascending: false });
        
        if (loadMore && transaksiLastDoc) {
            query = query.lt('created_at', transaksiLastDoc);
        }
        
        query = query.limit(500);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        console.log('loadDbTransaksi: Data ditemukan:', data?.length || 0);
        
        // Hitung total data
        let countQuery = supabase.from('db_transaksi').select('*', { count: 'exact', head: true });
        if (!isOwner) {
            countQuery = countQuery.eq('user_id', currentUser.id);
        }
        const { count, error: countError } = await countQuery;
        
        if (!countError) {
            totalTransaksiCount = count || 0;
            const totalCountSpan = document.getElementById('transaksiTotalCount');
            if (totalCountSpan) totalCountSpan.innerText = totalTransaksiCount;
        }
        
        if (!data || data.length === 0) {
            transaksiHasMore = false;
            if (loadMore && container) {
                const noMoreDiv = document.createElement('div');
                noMoreDiv.style.textAlign = 'center';
                noMoreDiv.style.padding = '20px';
                noMoreDiv.style.color = '#9ca3af';
                noMoreDiv.innerHTML = '📭 Tidak ada data lagi';
                container.appendChild(noMoreDiv);
                setTimeout(() => noMoreDiv.remove(), 2000);
            }
        } else {
            transaksiLastDoc = data[data.length - 1]?.created_at || null;
            transaksiHasMore = data.length === 500;
            
            for (const d of data) {
                let ownerName = '';
                if (isOwner && d.user_id !== currentUser.id) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('nama')
                        .eq('id', d.user_id)
                        .single();
                    ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
                }
                transaksiData.push({ 
                    id: d.id, 
                    ...d, 
                    displayName: (d.nama || '') + ownerName 
                });
            }
        }
        
        if (container) {
            const loadingDiv = document.getElementById('loadingMoreTransaksi');
            if (loadingDiv) loadingDiv.remove();
        }
        
        if (!loadMore && typeof getTransaksiStats === 'function') {
            await getTransaksiStats();
        }
        
        renderTransaksiList(transaksiData);
        updateTransaksiStatsDisplay(transaksiData.length, totalTransaksiCount);
        
        if (transaksiHasMore && !loadMore) {
            addLoadMoreButton();
        } else if (!transaksiHasMore && !loadMore) {
            removeLoadMoreButton();
        }
        
        await updateTotalTransaksiDariDBTransaksi();
        
    } catch (error) {
        console.error('Error loadDbTransaksi:', error);
        showNotifTop('❌ Gagal memuat data transaksi: ' + error.message, true);
        const container = document.getElementById('dbTransaksiList');
        if (container && !loadMore) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:#ef4444;">❌ Gagal memuat data transaksi</p>';
        }
    } finally {
        isLoadingMore = false;
    }
}

// ========== FUNGSI RENDER TRANSAKSI LIST ==========
function renderTransaksiList(items) {
    console.log('renderTransaksiList dipanggil dengan', items.length, 'item');
    
    const container = document.getElementById('dbTransaksiList');
    if (!container) {
        console.error('ERROR: Container dbTransaksiList TIDAK DITEMUKAN!');
        return;
    }
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data transaksi. Silakan import data terlebih dahulu.</p>';
        return;
    }
    
    const formatRupiah = (angka) => {
        if (!angka && angka !== 0) return '0';
        return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };
    
    const getProgresIcon = (jenis) => {
        if (jenis === 'naik') return '📈';
        if (jenis === 'turun') return '📉';
        return '⚖️';
    };
    
    const formatProgresJumlah = (jenis, jumlah) => {
        const absJumlah = Math.abs(jumlah);
        if (jenis === 'naik') {
            return `+${absJumlah.toLocaleString()}`;
        } else if (jenis === 'turun') {
            return `-${absJumlah.toLocaleString()}`;
        } else {
            if (jumlah < 0) {
                return `${jumlah.toLocaleString()}`;
            } else if (jumlah > 0) {
                return `+${jumlah.toLocaleString()}`;
            }
            return '0';
        }
    };
    
    const getStatusBadge = (status) => {
        if (status === 'imported') {
            return '<span style="background:#10b981; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">✅ Sudah Dipindah</span>';
        } else if (status === 'duplicate') {
            return '<span style="background:#f59e0b; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">⚠️ Duplikat</span>';
        } else if (status === 'error') {
            return '<span style="background:#ef4444; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">❌ Gagal</span>';
        }
        return '<span style="background:#3b82f6; color:white; padding:2px 8px; border-radius:12px; font-size:10px;">⏳ Pending</span>';
    };
    
    let html = '';
    
    for (const item of items) {
        const isChecked = selectedTransaksiIds.get(item.id) === true;
        
        let progresColor = '#6b7280';
        let progresBg = '#f3f4f6';
        if (item.progres_jenis === 'naik') {
            progresColor = '#10b981';
            progresBg = '#ecfdf5';
        } else if (item.progres_jenis === 'turun') {
            progresColor = '#ef4444';
            progresBg = '#fef2f2';
        } else if (item.progres_jenis === 'normal' && item.progres_jumlah < 0) {
            progresColor = '#ef4444';
            progresBg = '#fef2f2';
        } else if (item.progres_jenis === 'normal' && item.progres_jumlah > 0) {
            progresColor = '#10b981';
            progresBg = '#ecfdf5';
        }
        
        const formattedJumlah = formatProgresJumlah(item.progres_jenis, item.progres_jumlah || 0);
        
        html += `
            <div class="db-item-agent" data-id="${item.id}" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #e5e7eb; cursor: pointer; transition: all 0.2s;">
                <input type="checkbox" class="db-item-checkbox-transaksi" data-id="${item.id}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" onclick="event.stopPropagation()">
                <div class="db-item-agent-info" style="flex: 1;">
                    <h4 style="font-size: 14px; margin-bottom: 2px;">${escapeHtml(item.displayName || item.nama)}</h4>
                    <p style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">📱 ${escapeHtml(item.hp || '-')} | 🆔 ${escapeHtml(item.agent_id || '-')}</p>
                    <p style="font-size: 12px; margin-bottom: 2px; background: ${progresBg}; padding: 4px 8px; border-radius: 8px; display: inline-block;">
                        ${getProgresIcon(item.progres_jenis)} <strong style="color: ${progresColor};">${item.progres_jenis?.toUpperCase() || 'NORMAL'}</strong> | 
                        Jumlah: ${formattedJumlah}
                    </p>
                    <p style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">👤 Upline: ${escapeHtml(item.upline_name || '-')} | 📞 ${escapeHtml(item.upline_phone || '-')}</p>
                    <small style="font-size: 10px; color: #9ca3af;">📅 ${item.tanggal_transaksi ? new Date(item.tanggal_transaksi).toLocaleDateString('id-ID') : '-'} | Status: ${getStatusBadge(item.status)}</small>
                </div>
                <div class="db-item-agent-actions" style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${escapeHtml(item.hp || '')}')" style="background: #25D366; color: white; padding: 4px 10px; border: none; border-radius: 6px; cursor: pointer;">💬 WA</button>
                    ${item.status !== 'imported' ? 
                        `<button class="db-item-move-followup" onclick="event.stopPropagation(); moveSingleToFollowup('${item.id}')" style="background: #4f46e5; color: white; padding: 4px 10px; border: none; border-radius: 6px; cursor: pointer;">📋 Pindah ke Followup</button>` : ''}
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteTransaksiItem('${item.id}')" style="background: #fef2f2; color: #dc2626; padding: 4px 10px; border: none; border-radius: 6px; cursor: pointer;">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    document.querySelectorAll('#dbTransaksiList .db-item-agent').forEach(el => {
        el.removeEventListener('click', handleTransaksiItemClick);
        el.addEventListener('click', handleTransaksiItemClick);
    });
    
    document.querySelectorAll('#dbTransaksiList .db-item-checkbox-transaksi').forEach(cb => {
        const id = cb.dataset.id;
        if (selectedTransaksiIds.get(id) === true) {
            cb.checked = true;
        } else {
            cb.checked = false;
        }
        
        cb.removeEventListener('change', handleTransaksiCheckboxChange);
        cb.addEventListener('change', handleTransaksiCheckboxChange);
    });
    
    updateSelectAllTransaksiButton();
}

function addLoadMoreButton() {
    const container = document.getElementById('dbTransaksiList');
    if (!container) return;
    
    removeLoadMoreButton();
    
    const btnContainer = document.createElement('div');
    btnContainer.id = 'loadMoreTransaksiContainer';
    btnContainer.style.textAlign = 'center';
    btnContainer.style.padding = '20px';
    btnContainer.innerHTML = `
        <button id="loadMoreTransaksiBtn" style="background: #4f46e5; color: white; border: none; border-radius: 10px; padding: 10px 20px; cursor: pointer;">
            📥 Muat Lebih Banyak (500 data lagi)
        </button>
    `;
    container.appendChild(btnContainer);
    
    const loadMoreBtn = document.getElementById('loadMoreTransaksiBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            document.getElementById('loadMoreTransaksiContainer')?.remove();
            await loadDbTransaksi(true);
        });
    }
}

function removeLoadMoreButton() {
    const btnContainer = document.getElementById('loadMoreTransaksiContainer');
    if (btnContainer) btnContainer.remove();
}

async function getTransaksiStats() {
    try {
        const isOwner = currentUserRole === 'owner';
        let query = supabase.from('db_transaksi').select('*');
        
        if (!isOwner) {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        let stats = {
            total: 0,
            naik: 0,
            turun: 0,
            normal: 0,
            pending: 0,
            imported: 0
        };
        
        for (const doc of (data || [])) {
            stats.total++;
            
            if (doc.progres_jenis === 'naik') stats.naik++;
            else if (doc.progres_jenis === 'turun') stats.turun++;
            else if (doc.progres_jenis === 'normal') stats.normal++;
            
            if (doc.status === 'imported') stats.imported++;
            else stats.pending++;
        }
        
        console.log('📊 Statistik Transaksi:', stats);
        updateTransaksiStatsPanel(stats);
        
        return stats;
    } catch (e) {
        console.error('Error get transaksi stats:', e);
        return null;
    }
}

function updateTransaksiStatsPanel(stats) {
    if (!stats) return;
    
    let statsPanel = document.getElementById('transaksiStatsPanel');
    const container = document.querySelector('#dbTransaksiPage .db-section');
    
    if (!statsPanel && container) {
        statsPanel = document.createElement('div');
        statsPanel.id = 'transaksiStatsPanel';
        statsPanel.style.cssText = 'display: flex; gap: 16px; flex-wrap: wrap; padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 16px;';
        const filterDiv = container.querySelector('#transaksiStats');
        if (filterDiv) {
            filterDiv.insertAdjacentElement('afterend', statsPanel);
        } else {
            container.insertBefore(statsPanel, container.firstChild);
        }
    }
    
    if (statsPanel) {
        statsPanel.innerHTML = `
            <div style="background: #eef2ff; padding: 8px 16px; border-radius: 10px;">
                <strong>📊 Total:</strong> ${stats.total}
            </div>
            <div style="background: #ecfdf5; padding: 8px 16px; border-radius: 10px;">
                <strong>📈 Naik:</strong> ${stats.naik}
            </div>
            <div style="background: #fef2f2; padding: 8px 16px; border-radius: 10px;">
                <strong>📉 Turun:</strong> ${stats.turun}
            </div>
            <div style="background: #f3f4f6; padding: 8px 16px; border-radius: 10px;">
                <strong>⚖️ Normal:</strong> ${stats.normal}
            </div>
            <div style="background: #fef3c7; padding: 8px 16px; border-radius: 10px;">
                <strong>⏳ Pending:</strong> ${stats.pending}
            </div>
            <div style="background: #d1fae5; padding: 8px 16px; border-radius: 10px;">
                <strong>✅ Imported:</strong> ${stats.imported}
            </div>
        `;
    }
}

function updateTransaksiStatsDisplay(filteredCount, totalCount) {
    const statsDiv = document.getElementById('transaksiStats');
    if (statsDiv) {
        statsDiv.innerHTML = `📊 Menampilkan <strong>${filteredCount}</strong> dari <strong>${totalCount}</strong> data transaksi`;
    }
}

async function updateTotalTransaksiDariDBTransaksi() {
    try {
        const isOwner = currentUserRole === 'owner';
        let query = supabase.from('db_transaksi').select('*');
        
        if (!isOwner) {
            query = query.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        let totalBersih = 0;
        let totalNaik = 0;
        let totalTurun = 0;
        let totalNormalPositif = 0;
        let totalNormalNegatif = 0;
        
        for (const doc of (data || [])) {
            const jenis = doc.progres_jenis;
            const jumlah = doc.progres_jumlah || 0;
            
            if (jenis === 'naik') {
                totalNaik += Math.abs(jumlah);
                totalBersih += jumlah;
            } else if (jenis === 'turun') {
                totalTurun += Math.abs(jumlah);
                totalBersih += jumlah;
            } else {
                if (jumlah > 0) {
                    totalNormalPositif += jumlah;
                } else if (jumlah < 0) {
                    totalNormalNegatif += Math.abs(jumlah);
                }
                totalBersih += jumlah;
            }
        }
        
        console.log('📊 Statistik Transaksi:', { 
            totalNaik, 
            totalTurun, 
            totalNormalPositif, 
            totalNormalNegatif, 
            totalBersih 
        });
        
        window.totalTransaksiGlobal = totalBersih;
        await updateTargetDisplay();
        
        return totalBersih;
    } catch (e) {
        console.error('Error hitung total transaksi:', e);
        return 0;
    }
}

function handleTransaksiCheckboxChange(e) {
    e.stopPropagation();
    const id = e.target.dataset.id;
    if (e.target.checked) {
        selectedTransaksiIds.set(id, true);
    } else {
        selectedTransaksiIds.delete(id);
    }
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

function handleTransaksiItemClick(e) {
    if (e.target.type === 'checkbox' ||
        e.target.classList.contains('db-item-wa') ||
        e.target.classList.contains('db-item-move-followup') ||
        e.target.classList.contains('db-item-delete')) {
        return;
    }
    const card = e.currentTarget;
    const id = card.dataset.id;
    showTransaksiDetail(id);
}

function showTransaksiDetail(id) {
    const item = transaksiData.find(t => t.id === id);
    if (!item) return;
    
    const formatProgresJumlahDetail = (jenis, jumlah) => {
        const absJumlah = Math.abs(jumlah);
        if (jenis === 'naik') {
            return `+${absJumlah.toLocaleString()}`;
        } else if (jenis === 'turun') {
            return `-${absJumlah.toLocaleString()}`;
        } else {
            if (jumlah < 0) {
                return `${jumlah.toLocaleString()}`;
            } else if (jumlah > 0) {
                return `+${jumlah.toLocaleString()}`;
            }
            return '0';
        }
    };
    
    const getStatusIcon = (status) => {
        if (status === 'imported') return '✅';
        return '⏳';
    };
    
    const getProgresColor = (jenis, jumlah) => {
        if (jenis === 'naik') return '#10b981';
        if (jenis === 'turun') return '#ef4444';
        if (jumlah < 0) return '#ef4444';
        if (jumlah > 0) return '#10b981';
        return '#6b7280';
    };
    
    const formattedJumlah = formatProgresJumlahDetail(item.progres_jenis, item.progres_jumlah || 0);
    const progresColor = getProgresColor(item.progres_jenis, item.progres_jumlah || 0);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '999999';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 480px; border-radius: 24px; overflow: hidden; animation: modalPopup 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);">
            <div style="background: linear-gradient(135deg, #4f46e5, #8b5cf6); padding: 20px 24px; color: white;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(255,255,255,0.2); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                        ${getStatusIcon(item.status)}
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 18px; color: white;">Detail Transaksi</h3>
                        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">ID: ${escapeHtml(item.id.substring(0, 8))}...</p>
                    </div>
                </div>
            </div>
            <div style="padding: 20px 24px; background: #fff;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                    <div>
                        <div style="font-size: 12px; color: #9ca3af;">Nama Agent</div>
                        <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${escapeHtml(item.nama)}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: #9ca3af;">ID Agent</div>
                        <div style="font-size: 14px; font-weight: 500; color: #4f46e5;">${escapeHtml(item.agent_id)}</div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 12px;">
                    <div>
                        <div style="font-size: 11px; color: #9ca3af;">📱 Nomor HP</div>
                        <div style="font-size: 13px; font-weight: 500;">${escapeHtml(item.hp || '-')}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #9ca3af;">📅 Tanggal Transaksi</div>
                        <div style="font-size: 13px; font-weight: 500;">${new Date(item.tanggal_transaksi).toLocaleDateString('id-ID')}</div>
                    </div>
                </div>
                <div style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 12px;">
                    <div style="font-size: 11px; color: #9ca3af; margin-bottom: 8px;">👤 Upline / Atasan</div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-size: 13px;">${escapeHtml(item.upline_name || '-')}</span>
                        <span style="font-size: 12px; color: #6b7280;">📞 ${escapeHtml(item.upline_phone || '-')}</span>
                    </div>
                </div>
                <div style="margin-bottom: 16px; padding: 16px; background: ${progresColor === '#10b981' ? '#ecfdf5' : (progresColor === '#ef4444' ? '#fef2f2' : '#f3f4f6')}; border-radius: 16px; text-align: center;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">📊 Progres Transaksi</div>
                    <div style="font-size: 32px; font-weight: 700; color: ${progresColor};">
                        ${formattedJumlah}
                    </div>
                    <div style="font-size: 13px; margin-top: 4px;">
                        <span style="background: ${progresColor === '#10b981' ? '#10b981' : (progresColor === '#ef4444' ? '#ef4444' : '#6b7280')}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px;">
                            ${item.progres_jenis === 'naik' ? '📈 NAIK' : (item.progres_jenis === 'turun' ? '📉 TURUN' : '⚖️ NORMAL')}
                        </span>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-radius: 12px;">
                    <span style="font-size: 12px; color: #6b7280;">📌 Status</span>
                    <span style="font-size: 13px; font-weight: 500; padding: 4px 12px; border-radius: 20px; background: ${item.status === 'imported' ? '#d1fae5' : '#fef3c7'}; color: ${item.status === 'imported' ? '#065f46' : '#b45309'};">
                        ${item.status === 'imported' ? '✅ Sudah Dipindah ke Followup' : '⏳ Pending Import'}
                    </span>
                </div>
            </div>
            <div style="display: flex; gap: 12px; padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                <button class="btn-primary" onclick="window.open('https://wa.me/${item.hp?.replace(/[^\d]/g, '')}', '_blank')" style="flex: 1; background: #25D366; border: none; padding: 12px; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    💬 WhatsApp
                </button>
                ${item.status !== 'imported' ? `<button class="btn-primary" onclick="moveSingleToFollowup('${item.id}'); closeModalFromElement(this)" style="flex: 1; background: #4f46e5; border: none; padding: 12px; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    📋 Pindah ke Followup
                </button>` : ''}
                <button class="btn-outline" onclick="closeModalFromElement(this)" style="flex: 0.5; background: #f3f4f6; border: none; padding: 12px; border-radius: 12px; color: #374151; font-weight: 600; cursor: pointer;">
                    Tutup
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.classList.remove('modal-open');
        }
    };
}

function closeModalFromElement(btn) {
    const modal = btn.closest('.modal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
}

function setupTransaksiFilters() {
    const searchInput = document.getElementById('searchTransaksiInput');
    const filterProgres = document.getElementById('filterProgresTransaksi');
    const filterStatus = document.getElementById('filterStatusTransaksi');
    const resetBtn = document.getElementById('resetTransaksiFilterBtn');
    
    if (filterProgres) {
        filterProgres.innerHTML = `
            <option value="">Semua Progres</option>
            <option value="naik">📈 Naik</option>
            <option value="turun">📉 Turun</option>
            <option value="normal">⚖️ Normal</option>
        `;
    }
    
    if (filterStatus) {
        filterStatus.innerHTML = `
            <option value="">Semua</option>
            <option value="pending_import">⏳ Pending</option>
            <option value="imported">✅ Sudah Dipindah</option>
            <option value="duplicate">⚠️ Duplikat</option>
            <option value="error">❌ Gagal</option>
        `;
    }
    
    let filteredDataCache = [];
    let isFiltering = false;
    let debounceTimer;
    
    const applyFilters = async () => {
        if (isFiltering) return;
        isFiltering = true;
        
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const progresFilter = filterProgres?.value || '';
        const statusFilter = filterStatus?.value || '';
        
        const container = document.getElementById('dbTransaksiList');
        if (container) {
            container.innerHTML = '<div style="text-align:center;padding:40px;">⏳ Memuat data filter...</div>';
        }
        
        try {
            const isOwner = currentUserRole === 'owner';
            let query = supabase.from('db_transaksi').select('*');
            
            if (!isOwner) {
                query = query.eq('user_id', currentUser.id);
            }
            
            if (progresFilter) {
                query = query.eq('progres_jenis', progresFilter);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            let results = [];
            for (const d of (data || [])) {
                let ownerName = '';
                if (isOwner && d.user_id !== currentUser.id) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('nama')
                        .eq('id', d.user_id)
                        .single();
                    ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
                }
                results.push({
                    id: d.id,
                    ...d,
                    displayName: (d.nama || '') + ownerName
                });
            }
            
            if (searchTerm) {
                results = results.filter(item =>
                    (item.nama && item.nama.toLowerCase().includes(searchTerm)) ||
                    (item.agent_id && String(item.agent_id).toLowerCase().includes(searchTerm)) ||
                    (item.hp && String(item.hp).includes(searchTerm))
                );
            }
            
            if (statusFilter) {
                results = results.filter(item => item.status === statusFilter);
            }
            
            results.sort((a, b) => new Date(b.tanggal_transaksi) - new Date(a.tanggal_transaksi));
            
            filteredDataCache = results;
            
            const filteredCountSpan = document.getElementById('transaksiFilteredCount');
            if (filteredCountSpan) filteredCountSpan.innerText = results.length;
            
            renderTransaksiList(results);
            
        } catch (error) {
            console.error('Error filtering:', error);
            showNotifTop('❌ Gagal memfilter data: ' + error.message, true);
        } finally {
            isFiltering = false;
        }
    };
    
    const updateFilterDisplay = () => {
        const progresFilter = filterProgres?.value || '';
        const statusFilter = filterStatus?.value || '';
        const searchTermValue = searchInput?.value || '';
        
        let filterText = '';
        if (progresFilter) filterText += `📊 ${progresFilter === 'naik' ? 'Naik' : (progresFilter === 'turun' ? 'Turun' : 'Normal')} `;
        if (statusFilter) filterText += `📌 ${statusFilter === 'imported' ? 'Sudah Dipindah' : 'Pending'} `;
        if (searchTermValue) filterText += `🔍 "${searchTermValue}"`;
        
        const filterInfo = document.getElementById('activeFilterInfo');
        if (filterInfo) {
            if (filterText) {
                filterInfo.innerHTML = `🎯 Filter aktif: ${filterText}`;
                filterInfo.style.display = 'block';
            } else {
                filterInfo.style.display = 'none';
            }
        }
    };
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                applyFilters();
                updateFilterDisplay();
            }, 500);
        });
    }
    
    if (filterProgres) {
        filterProgres.addEventListener('change', () => {
            applyFilters();
            updateFilterDisplay();
        });
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            applyFilters();
            updateFilterDisplay();
        });
    }
    
    if (resetBtn) {
        resetBtn.onclick = async () => {
            if (searchInput) searchInput.value = '';
            if (filterProgres) filterProgres.value = '';
            if (filterStatus) filterStatus.value = '';
            
            selectedTransaksiIds.clear();
            await loadDbTransaksi();
            updateFilterDisplay();
        };
    }
}

async function deleteTransaksiItem(id) {
    if (!confirm('Yakin hapus data transaksi ini?')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Data', 1);
    progress.update(50, '🗑️ Menghapus', 'Menghapus data...', 0, 1);
    
    try {
        await supabaseDelete('db_transaksi', id);
        selectedTransaksiIds.delete(id);
        progress.update(100, '✅ Selesai', 'Data berhasil dihapus', 1, 1);
        showNotifTop('🗑️ Data transaksi berhasil dihapus');
        setTimeout(() => progress.hide(), 1500);
        await loadDbTransaksi();
    } catch (e) {
        showNotifTop('❌ Gagal hapus: ' + e.message, true);
        progress.hide();
    }
}

async function moveSingleToFollowup(id, silent = false) {
    const { data: doc, error } = await supabase
        .from('db_transaksi')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error || !doc) return;
    
    const data = doc;
    
    const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(data.agent_id, data.hp);
    if (duplicateAgent) {
        if (!silent) showNotifTop(`⚠️ ID Agent "${data.agent_id}" sudah terdaftar!`, true);
        return false;
    }
    if (duplicateHp) {
        if (!silent) showNotifTop(`⚠️ Nomor WhatsApp "${data.hp}" sudah terdaftar!`, true);
        return false;
    }
    
    let totalTercapai = 0;
    if (data.progres_jenis === 'naik') {
        totalTercapai = Math.abs(data.progres_jumlah || 0);
    } else if (data.progres_jenis === 'turun') {
        totalTercapai = -Math.abs(data.progres_jumlah || 0);
    } else {
        totalTercapai = data.progres_jumlah || 0;
    }
    
    const progresItem = {
        tanggal: data.tanggal_transaksi || getTodayDate(),
        jenis: data.progres_jenis || 'normal',
        jumlah: Math.abs(data.progres_jumlah || 0),
        keterangan: `Dipindahkan dari DB Transaksi (ID: ${data.agent_id})`,
        created_at: new Date().toISOString()
    };
    
    await supabase.from('customers').insert([{
        agent_id: data.agent_id,
        nama: data.nama,
        hp: data.hp,
        upline_name: data.upline_name || '',
        upline_phone: data.upline_phone || '',
        status: 'baru',
        tanggal: getTodayDate(),
        user_id: data.user_id,
        created_at: new Date().toISOString(),
        followup_data: null,
        pending_data: [],
        progres_transaksi: {
            items: [progresItem],
            total_tercapai: totalTercapai
        },
        moved_from_transaksi: true,
        original_transaksi_id: id
    }]);
    
    await supabaseUpdate('db_transaksi', id, {
        status: 'imported',
        moved_to_followup_at: new Date().toISOString()
    });
    
    if (!silent) showNotifTop('✅ Data berhasil dipindahkan ke Followup Agen!');
    return true;
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
    
    let deleted = 0;
    let failed = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
        const chunk = selectedIds.slice(i, i + BATCH_SIZE);
        
        for (const id of chunk) {
            try {
                await supabaseDelete('db_transaksi', id);
                selectedTransaksiIds.delete(id);
                deleted++;
            } catch (e) {
                failed++;
                console.error(`Gagal hapus ${id}:`, e);
            }
        }
        
        const percent = Math.floor((deleted / selectedIds.length) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${selectedIds.length})`, deleted, selectedIds.length);
    }
    
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}, Gagal: ${failed}`, deleted, selectedIds.length);
    showNotifTop(`✅ ${deleted} data berhasil dihapus${failed > 0 ? `, ${failed} gagal` : ''}`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadDbTransaksi();
}

// ========== HAPUS SEMUA DATA FOLLOWUP AGEN (FULL MODE) ==========
async function deleteAllFullFollowup() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus semua data!', true);
        return;
    }
    
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Data Followup Agen (Full Mode).\n\nData yang dihapus mencakup SEMUA status (Baru, Follow Up, Pending, Closing).\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Followup Agen', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('customers').select('*');
    
    if (error) {
        showNotifTop('❌ Gagal mengambil data: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data?.length || 0;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    let failed = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < (data || []).length; i += BATCH_SIZE) {
        const chunk = (data || []).slice(i, i + BATCH_SIZE);
        
        for (const doc of chunk) {
            try {
                await supabaseDelete('customers', doc.id);
                deleted++;
            } catch (e) {
                failed++;
                console.error(`Gagal hapus ${doc.id}:`, e);
            }
        }
        
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedFullFollowupIds.clear();
    
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}, Gagal: ${failed}`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Followup Agen berhasil dihapus${failed > 0 ? `, ${failed} gagal` : ''}`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadAllData();
    renderFullFollowupKanban();
}

// ========== HAPUS SEMUA DATA PROSPEK AGEN (FULL MODE) ==========
async function deleteAllFullProspek() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus semua data!', true);
        return;
    }
    
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Data Prospek Agen (Full Mode).\n\nData yang dihapus mencakup SEMUA status (Baru, Dihubungi, Negosiasi, Tertarik).\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Prospek Agen', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('prospek').select('*');
    
    if (error) {
        showNotifTop('❌ Gagal mengambil data: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data?.length || 0;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    let failed = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < (data || []).length; i += BATCH_SIZE) {
        const chunk = (data || []).slice(i, i + BATCH_SIZE);
        
        for (const doc of chunk) {
            try {
                await supabaseDelete('prospek', doc.id);
                deleted++;
            } catch (e) {
                failed++;
                console.error(`Gagal hapus ${doc.id}:`, e);
            }
        }
        
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedFullProspekIds.clear();
    
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}, Gagal: ${failed}`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Prospek Agen berhasil dihapus${failed > 0 ? `, ${failed} gagal` : ''}`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadAllData();
    renderFullProspekKanban();
}

// ========== HAPUS SEMUA DATA DB TRANSAKSI ==========
async function deleteAllTransaksi() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Transaksi.\n\nProses ini TIDAK BISA dibatalkan dan data akan hilang permanen!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Data', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    let allIds = [];
    let lastId = null;
    let hasMore = true;
    
    while (hasMore) {
        let query = supabase.from('db_transaksi').select('id');
        if (lastId) {
            query = query.gt('id', lastId);
        }
        query = query.limit(500);
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error mengambil ID:', error);
            break;
        }
        
        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            for (const item of data) {
                allIds.push(item.id);
            }
            lastId = data[data.length - 1]?.id;
            hasMore = data.length === 500;
        }
        
        progress.update(10, '🗑️ Menghapus', `Mengambil ID... (${allIds.length})`, allIds.length, 0);
        await delay(100);
    }
    
    const totalData = allIds.length;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    progress.update(10, '🗑️ Menghapus', `Memulai hapus ${totalData} data...`, 0, totalData);
    
    let deleted = 0;
    let failed = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const chunk = allIds.slice(i, i + BATCH_SIZE);
        
        for (const id of chunk) {
            try {
                await supabaseDelete('db_transaksi', id);
                deleted++;
            } catch (e) {
                failed++;
                console.error(`Gagal hapus ${id}:`, e);
            }
        }
        
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
        await delay(50);
    }
    
    if (deleted > 0) {
        selectedTransaksiIds.clear();
        await loadDbTransaksi();
    }
    
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}, Gagal: ${failed}`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data berhasil dihapus${failed > 0 ? `, ${failed} gagal` : ''}`);
    setTimeout(() => progress.hide(), 3000);
}

// ========== HAPUS SEMUA UNTUK SEMUA DATABASE ==========
async function deleteAllAgent() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Agent.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Agent', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('db_agent').select('*');
    
    if (error) {
        showNotifTop('❌ Gagal mengambil data: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data?.length || 0;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < (data || []).length; i += BATCH_SIZE) {
        const chunk = (data || []).slice(i, i + BATCH_SIZE);
        
        for (const doc of chunk) {
            try {
                await supabaseDelete('db_agent', doc.id);
                deleted++;
            } catch (e) {
                console.error(`Gagal hapus ${doc.id}:`, e);
            }
        }
        
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedAgentIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Agent berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    await loadDatabaseAgent();
}

async function deleteAllClosing() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Closing.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Closing', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('db_closing').select('*');
    
    if (error) {
        showNotifTop('❌ Gagal mengambil data: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data?.length || 0;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < (data || []).length; i += BATCH_SIZE) {
        const chunk = (data || []).slice(i, i + BATCH_SIZE);
        
        for (const doc of chunk) {
            try {
                await supabaseDelete('db_closing', doc.id);
                deleted++;
            } catch (e) {
                console.error(`Gagal hapus ${doc.id}:`, e);
            }
        }
        
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedClosingIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Closing berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    loadDBClosing();
}

async function deleteAllTidak() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Tidak Tertarik.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Tidak Tertarik', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('db_tidak_tertarik').select('*');
    
    if (error) {
        showNotifTop('❌ Gagal mengambil data: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data?.length || 0;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < (data || []).length; i += BATCH_SIZE) {
        const chunk = (data || []).slice(i, i + BATCH_SIZE);
        
        for (const doc of chunk) {
            try {
                await supabaseDelete('db_tidak_tertarik', doc.id);
                deleted++;
            } catch (e) {
                console.error(`Gagal hapus ${doc.id}:`, e);
            }
        }
        
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedTidakIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Tidak Tertarik berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    loadDBTidak();
}

async function deleteAllNomorSalah() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Nomor Salah.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Nomor Salah', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil数据...');
    
    const { data, error } = await supabase.from('nomor_salah').select('*');
    
    if (error) {
        showNotifTop('❌ Gagal mengambil data: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data?.length || 0;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < (data || []).length; i += BATCH_SIZE) {
        const chunk = (data || []).slice(i, i + BATCH_SIZE);
        
        for (const doc of chunk) {
            try {
                await supabaseDelete('nomor_salah', doc.id);
                deleted++;
            } catch (e) {
                console.error(`Gagal hapus ${doc.id}:`, e);
            }
        }
        
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedNomorSalahIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Nomor Salah berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    loadDBNomorSalah();
}

async function deleteAllCommitment() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Database Commitment.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Commitment', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('db_commitment').select('*');
    
    if (error) {
        showNotifTop('❌ Gagal mengambil data: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data?.length || 0;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < (data || []).length; i += BATCH_SIZE) {
        const chunk = (data || []).slice(i, i + BATCH_SIZE);
        
        for (const doc of chunk) {
            try {
                await supabaseDelete('db_commitment', doc.id);
                deleted++;
            } catch (e) {
                console.error(`Gagal hapus ${doc.id}:`, e);
            }
        }
        
        const percent = Math.floor((deleted / totalData) * 100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    
    selectedCommitmentIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Commitment berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    
    loadDBCommitment();
}

async function deleteAllProduk() {
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data Produk.\n\nProduk yang sudah terpakai di Agent akan kehilangan referensi!\n\nKlik OK untuk melanjutkan.')) return;
    
    const progress = showFloatingProgress('🗑️ Menghapus Semua Produk', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    
    const { data, error } = await supabase.from('produk').select('*');
    
    if (error) {
        showNotifTop('❌ Gagal mengambil data: ' + error.message, true);
        progress.hide();
        return;
    }
    
    const totalData = data?.length || 0;
    progress.setTotal(totalData);
    
    if (totalData === 0) {
        showNotifTop('📭 Tidak ada data untuk dihapus', true);
        progress.hide();
        return;
    }
    
    let deleted = 0;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < (data || []).length; i += BATCH_SIZE) {
        const chunk = (data || []).slice(i, i + BATCH_SIZE);
        
        for (const doc of chunk) {
            try {
                await supabaseDelete('produk', doc.id);
                deleted++;
            } catch (e) {
                console.error(`Gagal hapus ${doc.id}:`, e);
            }
        }
        
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

// ========== FULL PAGE KANBAN FUNCTIONS ==========
function renderFullFollowupKanban() {
    console.log('renderFullFollowupKanban - jumlah customersData:', customersData.length);
    
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
    
    document.getElementById('fullCountBaru').innerText = lists.baru.length;
    document.getElementById('fullCountFollowup').innerText = lists.followup.length;
    document.getElementById('fullCountPending').innerText = lists.pending.length;
    document.getElementById('fullCountClosing').innerText = lists.closing.length;
    
    const isOwner = currentUserRole === 'owner';
    
    const baruContainer = document.getElementById('fullBaruList');
    if (baruContainer) {
        baruContainer.innerHTML = lists.baru.map(item => {
            const isOverdue = item.tanggal && item.tanggal < today;
            const isToday = item.tanggal === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            const isChecked = selectedFullFollowupIds.get(item.id) === true;
            const checkboxHtml = isOwner ? `<input type="checkbox" class="full-item-checkbox" data-id="${item.id}" data-column="baru" ${isChecked ? 'checked' : ''}>` : '';
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}" data-status="baru">
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
        }).join('');
        
        if (isOwner) {
            document.querySelectorAll('#fullBaruList .full-item-checkbox').forEach(cb => {
                cb.removeEventListener('change', handleFullFollowupCheckboxChange);
                cb.addEventListener('change', handleFullFollowupCheckboxChange);
            });
        }
        
        document.querySelectorAll('#fullBaruList .card-click-area').forEach(area => {
            const newArea = area.cloneNode(true);
            area.parentNode.replaceChild(newArea, area);
            newArea.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = newArea.closest('.card-item');
                if (card) {
                    const id = card.dataset.id;
                    openDetailCustomer(id);
                }
            });
        });
    }
    
    const followupContainer = document.getElementById('fullFollowupList');
    if (followupContainer) {
        followupContainer.innerHTML = lists.followup.map(item => {
            const isOverdue = item.tanggal && item.tanggal < today;
            const isToday = item.tanggal === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}" data-status="followup">
                <div style="flex: 1; cursor: pointer;" class="card-click-area">
                    <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
                    <div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                    <div class="card-phone"><span title="${item.hp}">${item.hp}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWAById('${item.id}')">💬</span></div>
                    <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
                </div>
            </div>`;
        }).join('');
        
        document.querySelectorAll('#fullFollowupList .card-click-area').forEach(area => {
            const newArea = area.cloneNode(true);
            area.parentNode.replaceChild(newArea, area);
            newArea.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = newArea.closest('.card-item');
                if (card) openDetailCustomer(card.dataset.id);
            });
        });
    }
    
    const pendingContainer = document.getElementById('fullPendingList');
    if (pendingContainer) {
        pendingContainer.innerHTML = lists.pending.map(item => {
            const isOverdue = item.tanggal && item.tanggal < today;
            const isToday = item.tanggal === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}" data-status="pending">
                <div style="flex: 1; cursor: pointer;" class="card-click-area">
                    <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
                    <div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                    <div class="card-phone"><span title="${item.hp}">${item.hp}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWAById('${item.id}')">💬</span></div>
                    <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
                </div>
            </div>`;
        }).join('');
        
        document.querySelectorAll('#fullPendingList .card-click-area').forEach(area => {
            const newArea = area.cloneNode(true);
            area.parentNode.replaceChild(newArea, area);
            newArea.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = newArea.closest('.card-item');
                if (card) openDetailCustomer(card.dataset.id);
            });
        });
    }
    
    const closingContainer = document.getElementById('fullClosingList');
    if (closingContainer) {
        closingContainer.innerHTML = lists.closing.map(item => {
            const isOverdue = item.tanggal && item.tanggal < today;
            const isToday = item.tanggal === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}" data-status="closing">
                <div style="flex: 1; cursor: pointer;" class="card-click-area">
                    <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
                    <div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                    <div class="card-phone"><span title="${item.hp}">${item.hp}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWAById('${item.id}')">💬</span></div>
                    <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
                </div>
            </div>`;
        }).join('');
        
        document.querySelectorAll('#fullClosingList .card-click-area').forEach(area => {
            const newArea = area.cloneNode(true);
            area.parentNode.replaceChild(newArea, area);
            newArea.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = newArea.closest('.card-item');
                if (card) openDetailCustomer(card.dataset.id);
            });
        });
    }
    
    updateSelectAllFullFollowupButton();
}

function handleFullFollowupCheckboxChange(e) {
    e.stopPropagation();
    const id = e.target.dataset.id;
    if (e.target.checked) {
        selectedFullFollowupIds.set(id, true);
        const card = e.target.closest('.card-item');
        if (card) {
            card.style.opacity = '0.6';
            card.style.background = '#eef2ff';
        }
    } else {
        selectedFullFollowupIds.delete(id);
        const card = e.target.closest('.card-item');
        if (card) {
            card.style.opacity = '1';
            card.style.background = '';
        }
    }
    updateSelectAllFullFollowupButton();
}

function updateSelectAllFullFollowupButton() {
    const cards = document.querySelectorAll('#fullBaruList .full-item-checkbox');
    const allChecked = cards.length > 0 && Array.from(cards).every(cb => cb.checked);
    const btn = document.getElementById('selectAllFullFollowup');
    if (btn) {
        btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
        if (currentUserRole !== 'owner') {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'inline-block';
        }
    }
}

function toggleSelectAllFullFollowup() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menggunakan fitur ini!', true);
        return;
    }
    
    const cards = document.querySelectorAll('#fullBaruList .full-item-checkbox');
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
            await supabaseDelete('customers', id);
            selectedFullFollowupIds.delete(id);
            deleted++;
            const percent = Math.floor((deleted / selectedIds.length) * 100);
            progress.update(percent, '🗑️ Menghapus', `Menghapus... (${deleted}/${selectedIds.length})`, deleted, selectedIds.length);
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

// ========== FULL PROSPEK KANBAN ==========
function renderFullProspekKanban() {
    const today = getTodayDate();
    const lists = {
        prospekBaru: [],
        prospekDihubungi: [],
        prospekNegosiasi: [],
        prospekTertarik: []
    };
    
    prospekData.forEach(item => {
        const status = item.status || 'Baru';
        if (status === 'Baru') lists.prospekBaru.push(item);
        else if (status === 'Dihubungi') lists.prospekDihubungi.push(item);
        else if (status === 'Negosiasi') lists.prospekNegosiasi.push(item);
        else if (status === 'Tertarik') lists.prospekTertarik.push(item);
    });
    
    lists.prospekBaru.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.prospekDihubungi.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.prospekNegosiasi.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    lists.prospekTertarik.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    
    document.getElementById('fullCountProspekBaru').innerText = lists.prospekBaru.length;
    document.getElementById('fullCountDihubungi').innerText = lists.prospekDihubungi.length;
    document.getElementById('fullCountNegosiasi').innerText = lists.prospekNegosiasi.length;
    document.getElementById('fullCountTertarik').innerText = lists.prospekTertarik.length;
    
    const isOwner = currentUserRole === 'owner';
    
    const baruContainer = document.getElementById('fullProspekBaruList');
    if (baruContainer) {
        baruContainer.innerHTML = lists.prospekBaru.map(item => {
            const isOverdue = item.deadline && item.deadline < today;
            const isToday = item.deadline === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            const isChecked = selectedFullProspekIds.get(item.id) === true;
            const checkboxHtml = isOwner ? `<input type="checkbox" class="full-item-checkbox" data-id="${item.id}" style="margin-right: 8px;" ${isChecked ? 'checked' : ''}>` : '';
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
        }).join('');
        
        if (isOwner) {
            document.querySelectorAll('#fullProspekBaruList .full-item-checkbox').forEach(cb => {
                cb.onchange = (e) => handleFullProspekCheckboxChange(e);
            });
        }
        
        document.querySelectorAll('#fullProspekBaruList .card-click-area').forEach(area => {
            area.onclick = (e) => {
                e.stopPropagation();
                const card = area.closest('.card-item');
                if (card) openDetailProspek(card.dataset.id);
            };
        });
    }
    
    const dihubungiContainer = document.getElementById('fullProspekDihubungiList');
    if (dihubungiContainer) {
        dihubungiContainer.innerHTML = lists.prospekDihubungi.map(item => {
            const isOverdue = item.deadline && item.deadline < today;
            const isToday = item.deadline === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            const isChecked = selectedFullProspekIds.get(item.id) === true;
            const checkboxHtml = isOwner ? `<input type="checkbox" class="full-item-checkbox" data-id="${item.id}" style="margin-right: 8px;" ${isChecked ? 'checked' : ''}>` : '';
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
        }).join('');
        
        if (isOwner) {
            document.querySelectorAll('#fullProspekDihubungiList .full-item-checkbox').forEach(cb => {
                cb.onchange = (e) => handleFullProspekCheckboxChange(e);
            });
        }
        
        document.querySelectorAll('#fullProspekDihubungiList .card-click-area').forEach(area => {
            area.onclick = (e) => {
                e.stopPropagation();
                const card = area.closest('.card-item');
                if (card) openDetailProspek(card.dataset.id);
            };
        });
    }
    
    const negosiasiContainer = document.getElementById('fullProspekNegosiasiList');
    if (negosiasiContainer) {
        negosiasiContainer.innerHTML = lists.prospekNegosiasi.map(item => {
            const isOverdue = item.deadline && item.deadline < today;
            const isToday = item.deadline === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            const isChecked = selectedFullProspekIds.get(item.id) === true;
            const checkboxHtml = isOwner ? `<input type="checkbox" class="full-item-checkbox" data-id="${item.id}" style="margin-right: 8px;" ${isChecked ? 'checked' : ''}>` : '';
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
        }).join('');
        
        if (isOwner) {
            document.querySelectorAll('#fullProspekNegosiasiList .full-item-checkbox').forEach(cb => {
                cb.onchange = (e) => handleFullProspekCheckboxChange(e);
            });
        }
        
        document.querySelectorAll('#fullProspekNegosiasiList .card-click-area').forEach(area => {
            area.onclick = (e) => {
                e.stopPropagation();
                const card = area.closest('.card-item');
                if (card) openDetailProspek(card.dataset.id);
            };
        });
    }
    
    const tertarikContainer = document.getElementById('fullProspekTertarikList');
    if (tertarikContainer) {
        tertarikContainer.innerHTML = lists.prospekTertarik.map(item => {
            const isOverdue = item.deadline && item.deadline < today;
            const isToday = item.deadline === today;
            let deadlineClass = '';
            if (isOverdue) deadlineClass = 'deadline-overdue';
            else if (isToday) deadlineClass = 'deadline-today';
            const isChecked = selectedFullProspekIds.get(item.id) === true;
            const checkboxHtml = isOwner ? `<input type="checkbox" class="full-item-checkbox" data-id="${item.id}" style="margin-right: 8px;" ${isChecked ? 'checked' : ''}>` : '';
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
        }).join('');
        
        if (isOwner) {
            document.querySelectorAll('#fullProspekTertarikList .full-item-checkbox').forEach(cb => {
                cb.onchange = (e) => handleFullProspekCheckboxChange(e);
            });
        }
        
        document.querySelectorAll('#fullProspekTertarikList .card-click-area').forEach(area => {
            area.onclick = (e) => {
                e.stopPropagation();
                const card = area.closest('.card-item');
                if (card) openDetailProspek(card.dataset.id);
            };
        });
    }
}

function handleFullProspekCheckboxChange(e) {
    e.stopPropagation();
    const id = e.target.dataset.id;
    if (e.target.checked) {
        selectedFullProspekIds.set(id, true);
        const card = e.target.closest('.card-item');
        if (card) {
            card.style.opacity = '0.6';
            card.style.background = '#eef2ff';
        }
    } else {
        selectedFullProspekIds.delete(id);
        const card = e.target.closest('.card-item');
        if (card) {
            card.style.opacity = '1';
            card.style.background = '';
        }
    }
    updateSelectAllFullProspekButton();
}

function updateSelectAllFullProspekButton() {
    const cards = document.querySelectorAll('#fullProspekBaruList .full-item-checkbox, #fullProspekDihubungiList .full-item-checkbox, #fullProspekNegosiasiList .full-item-checkbox, #fullProspekTertarikList .full-item-checkbox');
    const allChecked = cards.length > 0 && Array.from(cards).every(cb => cb.checked);
    const btn = document.getElementById('selectAllFullProspek');
    if (btn) {
        btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
        if (currentUserRole !== 'owner') btn.style.display = 'none';
        else btn.style.display = 'inline-block';
    }
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
            await supabaseDelete('prospek', id);
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

// ========== CHART FUNCTIONS ==========
function updateChartCustomer(total, closing, pending, followup) {
  const ctx = document.getElementById('chartCustomer');
  if (!ctx) return;
  if (chartCustomer) chartCustomer.destroy();
  const baru = total - (closing + pending + followup);
  
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
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            font: { size: 11 }
          }
        },
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

function updateChartProspek(baru, dihubungi, negosiasi, tertarik) {
  const ctx = document.getElementById('chartProspek');
  if (!ctx) return;

  if (chartProspek) {
    chartProspek.destroy();
    chartProspek = null;
  }

  let dataArr = [baru, dihubungi, negosiasi, tertarik];

  chartProspek = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Baru', 'Dihubungi', 'Negosiasi', 'Tertarik'],
      datasets: [{
        data: dataArr,
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
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              return `${label}: ${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`;
            }
          }
        }
      }
    }
  });
}

// ========== PROGRES FUNCTIONS ==========
function openTambahProgres(customerId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3>📊 Tambah Progres Transaksi</h3>
            <div class="modal-subtitle">Catat perubahan jumlah transaksi customer</div>
            <div style="padding: 0 20px;">
                <div class="form-group">
                    <label>Jenis Perubahan <span class="required">*</span></label>
                    <select id="progresJenis" style="width:100%; padding:12px; border-radius:14px; border:1.5px solid #e5e7eb;">
                        <option value="naik">📈 Naik (Transaksi bertambah)</option>
                        <option value="turun">📉 Turun (Transaksi berkurang)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Jumlah Perubahan <span class="required">*</span></label>
                    <input type="number" id="progresJumlah" placeholder="Contoh: 25" style="width:100%; padding:12px; border-radius:14px; border:1.5px solid #e5e7eb;">
                    <small>Jumlah kenaikan/turunan transaksi (dalam Transaksi, selalu positif)</small>
                </div>
                <div class="form-group">
                    <label>Keterangan</label>
                    <textarea id="progresKeterangan" rows="2" placeholder="Contoh: Penambahan outlet baru" style="width:100%; padding:12px; border-radius:14px; border:1.5px solid #e5e7eb;"></textarea>
                </div>
            </div>
            <div class="modal-buttons">
                <button id="simpanProgresBtn" class="btn-primary">💾 Simpan Progres</button>
                <button id="batalProgresBtn" class="btn-outline">Batal</button>
            </div>
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
    
    try {
      const doc = await supabaseGetById('customers', customerId);
      const currentData = doc;
      const progresData = currentData.progres_transaksi || { items: [], total_tercapai: 0 };
      
      let perubahan = jenis === 'naik' ? jumlah : -jumlah;
      const newTotalTercapai = (progresData.total_tercapai || 0) + perubahan;
      
      const newItem = {
        tanggal: getTodayDate(),
        jenis: jenis,
        jumlah: jumlah,
        keterangan: keterangan,
        created_at: new Date().toISOString()
      };
      
      await supabaseUpdate('customers', customerId, {
        progres_transaksi: {
          items: [...(progresData.items || []), newItem],
          total_tercapai: newTotalTercapai
        },
        updated_at: new Date().toISOString()
      });
      
      showNotifTop(`✅ Progres berhasil ditambahkan! Total transaksi tercapai: ${newTotalTercapai > 0 ? '+' : ''}${newTotalTercapai} Transaksi`);
      modal.remove();
      
      await loadAllData();
      await updateTargetDisplay();
      closeModal('detailModal');
    } catch (err) {
      showNotifTop('❌ Gagal: ' + err.message, true);
    }
  };
  
  batalBtn.onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// ========== BADGE FUNCTIONS ==========
async function updateDeadlineBadge() {
  if (!currentUser) return;
  const badge = document.getElementById('deadlineCount');
  if (!badge) return;
  try {
    const today = getTodayDate();
    
    let customerQuery = supabase.from('customers').select('*', { count: 'exact', head: true });
    if (currentUserRole !== 'owner') {
      customerQuery = customerQuery.eq('user_id', currentUser.id);
    }
    customerQuery = customerQuery.lt('tanggal', today);
    
    let prospekQuery = supabase.from('prospek').select('*', { count: 'exact', head: true });
    if (currentUserRole !== 'owner') {
      prospekQuery = prospekQuery.eq('user_id', currentUser.id);
    }
    prospekQuery = prospekQuery.lt('deadline', today);
    
    const { count: customerOverdue } = await customerQuery;
    const { count: prospekOverdue } = await prospekQuery;
    
    const deadlineCount = (customerOverdue || 0) + (prospekOverdue || 0);
    badge.innerText = deadlineCount;
    if (deadlineCount > 0) badge.classList.add('has-notif');
    else badge.classList.remove('has-notif');
  } catch (e) {
    console.error(e);
  }
}

async function updatePesanBadge() {
  if (!currentUser) return;
  const badge = document.getElementById('pesanCount');
  if (!badge) return;
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('to_id', currentUser.id)
      .eq('is_read', false);
    
    if (error) throw error;
    
    const pesanCount = count || 0;
    badge.innerText = pesanCount;
    if (pesanCount > 0) badge.classList.add('has-notif');
    else badge.classList.remove('has-notif');
  } catch (e) {
    console.error(e);
  }
}

async function updateAllBadges() {
  await updateDeadlineBadge();
  await updatePesanBadge();
}

// ========== LOAD ALL DATA ==========
function loadAllData() {
  if (!currentUser) return;
  
  customersData = [];
  prospekData = [];
  
  const today = getTodayDate();
  const isOwner = currentUserRole === 'owner';

  async function loadCustomers() {
    let query = supabase.from('customers').select('*');
    if (!isOwner) {
      query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading customers:', error);
      return;
    }
    
    let total = 0, closing = 0, pending = 0, followup = 0;
    const lists = { baru: [], followup: [], pending: [], closing: [] };
    
    for (const d of (data || [])) {
      let ownerName = '';
      if (isOwner && d.user_id !== currentUser.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('nama')
          .eq('id', d.user_id)
          .single();
        ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
      }
      const itemData = {
        id: d.id,
        agent_id: d.agent_id,
        nama: d.nama + ownerName,
        hp: d.hp,
        tanggal: d.tanggal,
        status: d.status,
        ownerId: d.user_id
      };
      customersData.push({ id: d.id, ...d, displayName: d.nama + ownerName });
      total++;
      if (d.status === 'closing') closing++;
      else if (d.status === 'pending') pending++;
      else if (d.status === 'followup') followup++;
      else lists.baru.push(itemData);
      if (d.status === 'followup') lists.followup.push(itemData);
      if (d.status === 'pending') lists.pending.push(itemData);
      if (d.status === 'closing') lists.closing.push(itemData);
    }
    
    for (let status in lists) {
      lists[status].sort((a, b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
    }
    
    document.getElementById('countBaru').innerText = total - (closing + pending + followup);
    document.getElementById('countFollowup').innerText = followup;
    document.getElementById('countPending').innerText = pending;
    document.getElementById('countClosing').innerText = closing;
    document.getElementById('totalData').innerText = total;
    document.getElementById('closingTotal').innerText = closing;
    document.getElementById('activeProspek').innerText = total - closing;
    document.getElementById('rateClosing').innerText = total ? Math.round((closing / total) * 100) + '%' : '0%';
    
    for (let status in lists) {
      const container = document.getElementById(status + 'List');
      if (container) {
        container.innerHTML = lists[status].map(item => {
          const isOverdue = item.tanggal && item.tanggal < today;
          const isToday = item.tanggal === today;
          let deadlineClass = '';
          if (isOverdue) deadlineClass = 'deadline-overdue';
          else if (isToday) deadlineClass = 'deadline-today';
          return `<div class="card-item ${deadlineClass}" data-id="${item.id}" data-status="${status}" data-deadline="${item.tanggal || ''}"><div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div><div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div><div class="card-phone"><span title="${item.hp}">${item.hp}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWAById('${item.id}')">💬</span></div><div class="card-deadline">📅 ${item.tanggal || '-'}</div></div>`;
        }).join('');
        container.querySelectorAll('.card-item').forEach(card => {
          card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('whatsapp-icon')) openDetailCustomer(card.dataset.id);
          });
        });
      }
    }
    updateChartCustomer(total, closing, pending, followup);
    updateAllBadges();
    renderFullFollowupKanban();
  }
  
  async function loadProspek() {
    let query = supabase.from('prospek').select('*');
    if (!isOwner) {
      query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading prospek:', error);
      return;
    }
    
    let baru = 0, dihubungi = 0, negosiasi = 0, tertarik = 0;
    const lists = { prospekBaru: [], prospekDihubungi: [], prospekNegosiasi: [], prospekTertarik: [] };
    
    for (const d of (data || [])) {
      let ownerName = '';
      if (isOwner && d.user_id !== currentUser.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('nama')
          .eq('id', d.user_id)
          .single();
        ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
      }
      const st = d.status || 'Baru';
      const deadline = d.deadline || '';
      const itemData = {
        id: d.id,
        nama: d.nama + ownerName,
        hp: d.hp,
        status: st,
        deadline: deadline,
        ownerId: d.user_id
      };
      prospekData.push({ id: d.id, ...d, displayName: d.nama + ownerName });
      if (st === 'Baru') {
        baru++;
        lists.prospekBaru.push(itemData);
      } else if (st === 'Dihubungi') {
        dihubungi++;
        lists.prospekDihubungi.push(itemData);
      } else if (st === 'Negosiasi') {
        negosiasi++;
        lists.prospekNegosiasi.push(itemData);
      } else if (st === 'Tertarik') {
        tertarik++;
        lists.prospekTertarik.push(itemData);
      } else {
        tertarik++;
        lists.prospekTertarik.push(itemData);
      }
    }
    
    for (let col in lists) {
      lists[col].sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
    }
    
    document.getElementById('countProspekBaru').innerText = baru;
    document.getElementById('countDihubungi').innerText = dihubungi;
    document.getElementById('countNegosiasi').innerText = negosiasi;
    document.getElementById('countTertarik').innerText = tertarik;
    
    for (let col in lists) {
      const container = document.getElementById(col + 'List');
      if (container) {
        container.innerHTML = lists[col].map(item => {
          const isOverdue = item.deadline && item.deadline < today;
          const isToday = item.deadline === today;
          let deadlineClass = '';
          if (isOverdue) deadlineClass = 'deadline-overdue';
          else if (isToday) deadlineClass = 'deadline-today';
          return `<div class="card-item ${deadlineClass}" data-id="${item.id}" data-status="${item.status}" data-deadline="${item.deadline || ''}"><div class="card-name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div><div class="card-phone"><span title="${item.hp}">${item.hp}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWAById('${item.id}')">💬</span></div><div class="card-deadline">📅 ${item.deadline || '-'}</div></div>`;
        }).join('');
        container.querySelectorAll('.card-item').forEach(card => {
          card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('whatsapp-icon')) openDetailProspek(card.dataset.id);
          });
        });
      }
    }
    updateChartProspek(baru, dihubungi, negosiasi, tertarik);
    updateAllBadges();
    renderFullProspekKanban();
  }
  
  loadCustomers();
  loadProspek();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">🔍 Masukkan kata kunci untuk mencari data</p>';
}

// ========== AUTH STATE ==========
async function checkSession() {
  const loginPage = document.getElementById('loginPage');
  const app = document.getElementById('app');
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .single();
    
    if (!error && userData) {
      currentUserRole = userData.role || 'cs';
      currentUserName = userData.nama || 'CS Agent';
    } else {
      currentUserRole = 'cs';
      currentUserName = 'CS Agent';
    }
    
    document.getElementById('topUserName').innerText = currentUserName;
    document.getElementById('profileName').value = currentUserName;
    document.getElementById('profileEmail').value = session.user.email;
    
    if (currentUserRole === 'owner') {
      document.getElementById('ownerMenu').style.display = 'block';
    } else {
      document.getElementById('ownerMenu').style.display = 'none';
    }
    
    // Sembunyikan semua page content terlebih dahulu
    const allPages = ['dashboardPage', 'importPage', 'dbClosingPage', 'dbTidakPage', 
                      'dbNomorSalahPage', 'dbCommitmentPage', 'dbAgentPage', 'produkPage', 
                      'reminderPage', 'pesanPage', 'broadcastPage', 'broadcastUplinePage', 
                      'followupFullPage', 'prospekFullPage', 'searchPage', 'manageUsersPage', 
                      'dbTransaksiPage'];
    
    allPages.forEach(pageId => {
      const el = document.getElementById(pageId);
      if (el) el.style.display = 'none';
    });
    
    const dashboardPage = document.getElementById('dashboardPage');
    if (dashboardPage) dashboardPage.style.display = 'block';
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    const dashboardMenu = document.querySelector('.menu-item[data-page="dashboard"]');
    if (dashboardMenu) dashboardMenu.classList.add('active');
    
    loginPage.style.display = 'none';
    app.style.display = 'block';
    
    // Load semua data
    await loadUserProfile();
    await updateAllBadges();
    initFullModeSelection();
    loadAllData();
    await updateTotalTransaksiDariCustomer();
    loadReminders();
    loadPesan();
    loadDBClosing();
    loadDBTidak();
    loadDBNomorSalah();
    loadDBCommitment();
    loadDatabaseAgent();
    await loadTargetData();
    await loadTransaksiGlobal();
    loadProduk();
    loadUsersList();
    await loadDbTransaksi();
    
    setTimeout(() => {
      const manageTargetBtn = document.getElementById('manageTargetBtn');
      if (manageTargetBtn) {
        if (currentUserRole === 'owner') {
          manageTargetBtn.style.display = 'block';
          const newManageBtn = manageTargetBtn.cloneNode(true);
          manageTargetBtn.parentNode.replaceChild(newManageBtn, manageTargetBtn);
          newManageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const agentInput = document.getElementById('targetAgentInput');
            const koorInput = document.getElementById('targetKoorInput');
            const caInput = document.getElementById('targetCAInput');
            const transaksiInput = document.getElementById('targetTransaksiInput');
            
            if (agentInput) agentInput.value = targetData.agent || 0;
            if (koorInput) koorInput.value = targetData.koordinator || 0;
            if (caInput) caInput.value = targetData.ca || 0;
            if (transaksiInput) transaksiInput.value = targetData.transaksi || 0;
            
            renderMonthlyTargetList();
            
            const modal = document.getElementById('manageTargetModal');
            if (modal) modal.style.display = 'flex';
          });
        } else {
          manageTargetBtn.style.display = 'none';
        }
      }
    }, 500);
    
  } else {
    loginPage.style.display = 'flex';
    app.style.display = 'none';
    currentUser = null;
  }
}

// ========== LOAD USER PROFILE ==========
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
            // Update nama
            if (data.nama) {
                currentUserName = data.nama;
                document.getElementById('topUserName').innerText = data.nama;
                document.getElementById('profileName').value = data.nama;
            }
            
            // Update foto header
            if (data.foto && data.foto !== '') {
                const profileImg = document.getElementById('profileImg');
                if (profileImg) profileImg.src = data.foto;
                
                const previewFoto = document.getElementById('previewFoto');
                if (previewFoto) previewFoto.src = data.foto;
            }
            
            // Update HP
            if (data.hp) {
                let hpDisplay = data.hp.replace('+62', '');
                const profilePhone = document.getElementById('profilePhone');
                if (profilePhone) profilePhone.value = hpDisplay;
            }
        }
    } catch (err) {
        console.error('Error loading user profile:', err);
    }
}

// ========== AUTH STATE & INITIALIZATION ==========

// Fungsi untuk memulai aplikasi
async function initApp() {
  await checkSession();
  console.log('✅ Aplikasi PROSPEKTA siap!');
}

// Panggil initApp
initApp();

// Listen untuk perubahan auth state
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  if (event === 'SIGNED_IN') {
    checkSession();
  } else if (event === 'SIGNED_OUT') {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    currentUser = null;
    currentUserRole = 'cs';
  }
});

// Panggil checkSession saat aplikasi mulai
checkSession();

// ========== DOMContentLoaded - Setup Event Listeners ==========
document.addEventListener('DOMContentLoaded', function() {
  // Dark mode
  function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    function enableDarkMode() {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'enabled');
      if (darkModeToggle) darkModeToggle.classList.add('active');
    }
    
    function disableDarkMode() {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'disabled');
      if (darkModeToggle) darkModeToggle.classList.remove('active');
    }
    
    if (savedMode === 'enabled') enableDarkMode();
    else disableDarkMode();
    
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (document.body.classList.contains('dark-mode')) {
          disableDarkMode();
          showNotifTop('🌞 Mode Terang diaktifkan');
        } else {
          enableDarkMode();
          showNotifTop('🌙 Mode Gelap diaktifkan');
        }
      });
    }
  }
  initDarkMode();
  
  // ========== SIDEBAR ==========
  const sidebar = document.getElementById('sidebar');
  const hoverZone = document.getElementById('hoverZone');
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  
  function updateState() {
    updateSidebarBodyClass();
  }
  
  if (hoverZone) {
    hoverZone.addEventListener('mouseenter', function() {
      if (!isMobile() && sidebar) {
        clearTimeout(sidebarTimeout);
        sidebar.classList.add('active');
        updateState();
      }
    });
  }
  
  if (sidebar) {
    sidebar.addEventListener('mouseleave', function() {
      if (!isMobile()) {
        sidebarTimeout = setTimeout(() => {
          sidebar.classList.remove('active');
          updateState();
        }, 200);
      }
    });
    sidebar.addEventListener('mouseenter', () => clearTimeout(sidebarTimeout));
  }
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (sidebar) sidebar.classList.toggle('active');
      updateState();
    });
  }
  
  document.addEventListener('click', function(e) {
    if (isMobile() && sidebar && toggleBtn && !sidebar.contains(e.target) && e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
      sidebar.classList.remove('active');
      updateState();
    }
  });
  
  window.addEventListener('resize', function() {
    if (sidebar) sidebar.classList.remove('active');
    updateState();
  });
  updateState();
  
  // ========== SETUP MODAL CLICK OUTSIDE ==========
  const allModalIds = [
    'detailModal', 'customerModal', 'prospekModal', 'prospekNegosiasiModal',
    'profileModal', 'previewPhotoModal', 'reminderModal', 'pesanModal',
    'convertModal', 'followupConfirmModal', 'pendingModal', 'addCsModal',
    'editDeadlineModal', 'infoModal', 'agentDetailModal', 'productModal',
    'produkMasterModal', 'manageTargetModal', 'tarifAdminModal', 'inputTransaksiModal',
    'transaksiListModal', 'pilihNomorModal'
  ];
  
  allModalIds.forEach(id => setupModalClickOutside(id));
  
  // ========== SETUP TARIF IMPORT ==========
  setupTarifImport();
  
  // ========== SETUP EXPORT/IMPORT BUTTONS ==========
  const exportTarifBtn = document.getElementById('exportTarifExcelBtn');
  if (exportTarifBtn) {
    exportTarifBtn.addEventListener('click', exportTarifToExcel);
  }
  
  const downloadTarifExampleBtn = document.getElementById('downloadTarifExampleBtn');
  if (downloadTarifExampleBtn) {
    downloadTarifExampleBtn.addEventListener('click', downloadTarifExample);
  }
  
  setupProdukImport();
  const exportProdukBtn = document.getElementById('exportProdukExcelBtn');
  if (exportProdukBtn) exportProdukBtn.addEventListener('click', exportProdukToExcel);
  
  setupAgentImport();
  setupAgentFilters();
  const exportAgentBtn = document.getElementById('exportAgentExcelBtn');
  if (exportAgentBtn) exportAgentBtn.addEventListener('click', exportAgentToExcel);
  
  // ========== SETUP SAVE/CANCEL BUTTONS ==========
  document.getElementById('saveDeadlineBtn')?.addEventListener('click', async () => {
    const newDeadline = document.getElementById('editDeadlineDate').value;
    if (!newDeadline) {
      showNotif('⚠️ Tanggal deadline harus diisi!', true);
      return;
    }
    
    try {
      if (currentEditType === 'customer') {
        await supabaseUpdate('customers', currentEditItem, { tanggal: newDeadline });
        showNotif('✅ Deadline customer berhasil diubah menjadi ' + newDeadline);
      } else if (currentEditType === 'prospek') {
        await supabaseUpdate('prospek', currentEditItem, { deadline: newDeadline });
        showNotif('✅ Deadline prospek berhasil diubah menjadi ' + newDeadline);
      }
      closeModal('editDeadlineModal');
      loadAllData();
    } catch (e) {
      showNotif('❌ Gagal: ' + e.message, true);
    }
  });
  
  document.getElementById('cancelDeadlineBtn')?.addEventListener('click', () => closeModal('editDeadlineModal'));
  
  // ========== ADD CUSTOMER/PROSPEK BUTTONS ==========
  document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
    const today = getTodayDate();
    document.getElementById('customerDate').value = today;
    document.getElementById('customerModal').style.display = 'flex';
  });
  
  document.getElementById('addProspekBtn')?.addEventListener('click', () => {
    const today = getTodayDate();
    document.getElementById('prospekDeadline').value = today;
    document.getElementById('prospekModal').style.display = 'flex';
  });
  
  // ========== PAGE NAVIGATION ==========
  document.querySelectorAll('.menu-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      const pages = ['dashboardPage', 'importPage', 'dbClosingPage', 'dbTidakPage', 'dbNomorSalahPage', 'dbCommitmentPage', 'dbAgentPage', 'produkPage', 'reminderPage', 'pesanPage', 'broadcastPage', 'broadcastUplinePage', 'followupFullPage', 'prospekFullPage', 'searchPage', 'manageUsersPage', 'dbTransaksiPage'];
      
      pages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.style.display = 'none';
      });
      
      if (page === 'dashboard') {
        document.getElementById('dashboardPage').style.display = 'block';
      } else if (page === 'import') {
        document.getElementById('importPage').style.display = 'block';
      } else if (page === 'dbClosing') {
        document.getElementById('dbClosingPage').style.display = 'block';
        loadDBClosing();
      } else if (page === 'dbTidak') {
        document.getElementById('dbTidakPage').style.display = 'block';
        loadDBTidak();
      } else if (page === 'dbNomorSalah') {
        document.getElementById('dbNomorSalahPage').style.display = 'block';
        loadDBNomorSalah();
      } else if (page === 'dbCommitment') {
        document.getElementById('dbCommitmentPage').style.display = 'block';
        loadDBCommitment();
      } else if (page === 'dbAgent') {
        document.getElementById('dbAgentPage').style.display = 'block';
        loadDatabaseAgent();
      } else if (page === 'produk') {
        document.getElementById('produkPage').style.display = 'block';
        loadProduk();
      } else if (page === 'reminder') {
        document.getElementById('reminderPage').style.display = 'block';
        loadReminders();
      } else if (page === 'pesan') {
        document.getElementById('pesanPage').style.display = 'block';
        loadPesan();
        loadUsersForSelect();
      } else if (page === 'broadcast') {
        document.getElementById('broadcastPage').style.display = 'block';
        initBroadcast();
      } else if (page === 'broadcastUpline') {
        const pageElement = document.getElementById('broadcastUplinePage');
        if (pageElement) {
          pageElement.style.display = 'block';
          initUplineBroadcast();
        }
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
        loadUsersList();
      } else if (page === 'dbTransaksi') {
        const dbTransaksiPage = document.getElementById('dbTransaksiPage');
        if (dbTransaksiPage) {
          dbTransaksiPage.style.display = 'block';
          dbTransaksiPage.style.width = '100%';
        }
        loadDbTransaksi();
      }
      
      document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar')?.classList.remove('active');
      }
      updateSidebarBodyClass();
    });
  });
  
  // ========== CLOSE MODAL BUTTONS ==========
  document.querySelectorAll('.closeModalBtn').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.modal)));
  
  // ========== INFO BUTTON ==========
  document.getElementById('infoBtn')?.addEventListener('click', () => {
    document.getElementById('infoModal').style.display = 'flex';
  });
  document.getElementById('infoModalClose')?.addEventListener('click', () => closeModal('infoModal'));
  
  // ========== PROFILE MODAL ==========
  const profileImg = document.getElementById('profileImg');
  if (profileImg) {
    profileImg.addEventListener('click', () => {
      document.getElementById('profileModal').style.display = 'flex';
      supabaseGetById('users', currentUser.id).then(doc => {
        if (doc) {
          document.getElementById('profileName').value = doc.nama || '';
          document.getElementById('profilePhone').value = doc.hp ? doc.hp.replace('+62', '') : '';
          if (doc.foto) document.getElementById('previewFoto').src = doc.foto;
        }
      }).catch(() => {});
    });
  }
  
  // ========== PREVIEW PHOTO ==========
  const previewFoto = document.getElementById('previewFoto');
  if (previewFoto) {
    previewFoto.addEventListener('click', (e) => {
      e.stopPropagation();
      showPhotoPreview(document.getElementById('previewFoto').src);
    });
  }
  
  function showPhotoPreview(imageUrl) {
    const previewModal = document.getElementById('previewPhotoModal');
    const previewImage = document.getElementById('previewPhotoLarge');
    if (previewImage && previewModal) {
      previewImage.src = imageUrl;
      previewModal.style.display = 'flex';
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
    }
  }
  
  const cameraIconBtn = document.getElementById('cameraIconBtn');
  if (cameraIconBtn) {
    cameraIconBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('profileFoto').click();
    });
  }
  
  const profileFotoInput = document.getElementById('profileFoto');
  if (profileFotoInput) {
    profileFotoInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        if (file.size > 1024 * 1024) {
          showNotif('Ukuran foto maksimal 1MB', true);
          return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('previewFoto').src = e.target.result;
          document.getElementById('profileImg').src = e.target.result;
          showNotif('Foto baru dipilih, klik Simpan untuk menyimpan');
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
// ========== SAVE PROFILE ==========
const saveProfileBtn = document.getElementById('saveProfileBtn');
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const nama = document.getElementById('profileName').value;
        let hp = document.getElementById('profilePhone').value;
        const foto = document.getElementById('previewFoto').src;
        
        if (!nama) {
            showNotifTop('⚠️ Nama wajib diisi!', true);
            return;
        }
        
        // Format nomor HP
        if (hp) {
            hp = hp.replace(/\D/g, '');
            if (hp.startsWith('0')) hp = hp.substring(1);
            if (!hp.startsWith('62')) hp = '62' + hp;
            hp = '+' + hp;
        } else {
            hp = '+62';
        }
        
        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = '⏳ Menyimpan...';
        
        try {
            // Cek apakah user sudah ada di tabel users
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('id', currentUser.id)
                .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }
            
            let updateError;
            
            if (existingUser) {
                // UPDATE existing user
                const { error } = await supabase
                    .from('users')
                    .update({
                        nama: nama,
                        hp: hp,
                        foto: foto,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentUser.id);
                updateError = error;
            } else {
                // INSERT new user
                const { error } = await supabase
                    .from('users')
                    .insert({
                        id: currentUser.id,
                        email: currentUser.email,
                        nama: nama,
                        hp: hp,
                        foto: foto,
                        role: currentUserRole || 'cs',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                updateError = error;
            }
            
            if (updateError) throw updateError;
            
            // ========== UPDATE HEADER FOTO ==========
            // Update elemen header profile
            const profileImgElement = document.getElementById('profileImg');
            if (profileImgElement) {
                profileImgElement.src = foto;
            }
            
            // Update nama di header
            const topUserName = document.getElementById('topUserName');
            if (topUserName) {
                topUserName.innerText = nama;
            }
            
            // Update currentUserName global
            currentUserName = nama;
            
            // Simpan ke localStorage sebagai backup
            localStorage.setItem('userProfile', JSON.stringify({
                nama: nama,
                hp: hp,
                foto: foto
            }));
            document.getElementById('topUserName').innerText = nama;
            document.getElementById('profileImg').src = foto;
            
            showNotifTop('✅ Profile berhasil disimpan!');
            closeModal('profileModal');
            
            // Refresh data user di memory
            await loadUserProfile();
            
        } catch (e) {
            console.error('Error saving profile:', e);
            showNotifTop('❌ Gagal menyimpan: ' + e.message, true);
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = '💾 Simpan Perubahan';
        }
    });
}
  
  // ========== LOGIN BUTTON ==========
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async function() {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const errorDiv = document.getElementById('loginError');
      if (!email || !password) {
        errorDiv.textContent = 'Email dan password harus diisi!';
        return;
      }
      errorDiv.textContent = '';
      this.textContent = 'Loading...';
      this.disabled = true;
      
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });
        if (error) throw error;
      } catch (err) {
        errorDiv.textContent = 'Login gagal: ' + err.message;
        this.textContent = 'Masuk';
        this.disabled = false;
      }
    });
  }
  
  // ========== LOGOUT BUTTON ==========
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
    });
  }
  
  // ========== TOGGLE PASSWORD ==========
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const loginPassword = document.getElementById('loginPassword');
  if (togglePasswordBtn && loginPassword) {
    togglePasswordBtn.addEventListener('click', function() {
      if (loginPassword.type === 'password') {
        loginPassword.type = 'text';
        this.textContent = '🙈';
      } else {
        loginPassword.type = 'password';
        this.textContent = '👁️';
      }
    });
  }
  
  // ========== SEARCH BUTTONS ==========
  document.getElementById('searchBtn')?.addEventListener('click', performSearch);
  document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);
  document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });
  
  // ========== TRANSAKSI CARD CLICK ==========
  const targetTransaksiCard = document.getElementById('targetTransaksiCard');
  if (targetTransaksiCard) {
    targetTransaksiCard.style.cursor = 'pointer';
    targetTransaksiCard.addEventListener('click', function(e) {
      if (e.target.closest('.progress-bar')) return;
      showInputTransaksiModal();
    });
  }
  
  // ========== SAVE TRANSAKSI BUTTON ==========
  const saveTransaksiBtn = document.getElementById('saveTransaksiBtn');
  if (saveTransaksiBtn) {
    saveTransaksiBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
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
  }
  
  const cancelTransaksiBtn = document.getElementById('cancelTransaksiBtn');
  if (cancelTransaksiBtn) {
    cancelTransaksiBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeModal('inputTransaksiModal');
      currentTransaksiId = null;
    });
  }
  
  // ========== FORMAT PHONE INPUTS ==========
  function formatPhoneInput(input) {
    if (input) input.addEventListener('input', function() {
      let value = this.value.replace(/\D/g, '');
      if (value.startsWith('0')) value = value.substring(1);
      this.value = value;
    });
  }
  formatPhoneInput(document.getElementById('customerPhone'));
  formatPhoneInput(document.getElementById('prospekPhone'));
  formatPhoneInput(document.getElementById('profilePhone'));
  
  // ========== TARGET KPI BUTTONS ==========
  const saveTargetBtn = document.getElementById('saveTargetBtn');
  if (saveTargetBtn) {
    saveTargetBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      await saveTargetData();
    });
  }
  
  const cancelTargetBtn = document.getElementById('cancelTargetBtn');
  if (cancelTargetBtn) {
    cancelTargetBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeModal('manageTargetModal');
    });
  }
  
  const addMonthlyTargetBtn = document.getElementById('addMonthlyTargetBtn');
  if (addMonthlyTargetBtn) {
    addMonthlyTargetBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
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
  }
  
  // ========== SELECT ALL AGENT BUTTON ==========
  const selectAllAgentBtn = document.getElementById('selectAllAgent');
  if (selectAllAgentBtn) {
    selectAllAgentBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!agentsFilteredData || agentsFilteredData.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang ditampilkan', true);
        return;
      }
      const allChecked = agentsFilteredData.every(item => selectedAgentIds.get(item.id) === true);
      agentsFilteredData.forEach(item => {
        if (allChecked) {
          selectedAgentIds.delete(item.id);
        } else {
          selectedAgentIds.set(item.id, true);
        }
      });
      renderAgentList(agentsData);
      selectAllAgentBtn.textContent = allChecked ? '✅ Pilih Semua' : '⬜ Batal Semua';
    });
  }
  
  // ========== SELECT ALL PRODUK BUTTON ==========
  const selectAllProdukBtn = document.getElementById('selectAllProduk');
  if (selectAllProdukBtn) {
    selectAllProdukBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const searchKeyword = document.getElementById('searchProdukInput')?.value.toLowerCase() || '';
      let filteredProduk = produkData;
      if (searchKeyword) {
        filteredProduk = produkData.filter(p =>
          p.nama.toLowerCase().includes(searchKeyword) ||
          (p.jenis_produk === 'beradmin' ? 'beradmin' : 'tanpa_admin').includes(searchKeyword)
        );
      }
      if (filteredProduk.length === 0) {
        showNotifTop('⚠️ Tidak ada produk yang ditampilkan', true);
        return;
      }
      const allChecked = filteredProduk.every(item => selectedProdukIds.get(item.id) === true);
      filteredProduk.forEach(item => {
        if (allChecked) {
          selectedProdukIds.delete(item.id);
        } else {
          selectedProdukIds.set(item.id, true);
        }
      });
      renderProdukList();
    });
  }
  
  // ========== DELETE SELECTED PRODUK ==========
  const deleteSelectedProdukBtn = document.getElementById('deleteSelectedProduk');
  if (deleteSelectedProdukBtn) {
    deleteSelectedProdukBtn.addEventListener('click', deleteSelectedProduk);
  }
  
  // ========== DELETE SELECTED AGENT ==========
  const deleteSelectedAgentBtn = document.getElementById('deleteSelectedAgent');
  if (deleteSelectedAgentBtn) {
    deleteSelectedAgentBtn.addEventListener('click', deleteSelectedAgentSafe);
  }
  
  // ========== ADD PRODUK BUTTON ==========
  document.getElementById('addProdukBtn')?.addEventListener('click', () => {
    currentEditProdukId = null;
    document.getElementById('produkMasterNama').value = '';
    document.getElementById('produkMasterHpp').value = '';
    document.getElementById('produkMasterHargaJual').value = '';
    document.getElementById('produkMasterKeterangan').value = '';
    document.getElementById('produkMasterTitle').innerText = '🏷️ Tambah Produk';
    document.getElementById('produkMasterModal').style.display = 'flex';
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
  
  document.getElementById('produkMasterJenis')?.addEventListener('change', function() {
    toggleProdukJenisFields(this.value);
  });
  
  // ========== AGENT DETAIL EVENT LISTENERS ==========
  document.getElementById('addAgentProductBtn')?.addEventListener('click', openAddProductModal);
  document.getElementById('saveAgentDetailBtn')?.addEventListener('click', saveAgentDetail);
  document.getElementById('closeAgentDetailBtn')?.addEventListener('click', () => closeModal('agentDetailModal'));
  document.getElementById('saveProductBtn')?.addEventListener('click', saveAgentProduct);
  document.getElementById('cancelProductBtn')?.addEventListener('click', () => closeModal('productModal'));
  
  document.getElementById('productSelect')?.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const harga = selectedOption.getAttribute('data-harga');
    if (harga && document.getElementById('productPrice').value === '') {
      document.getElementById('productPrice').value = harga;
    }
  });
  
  // ========== TARIF ADMIN MODAL ==========
  document.getElementById('manageTarifAdminBtn')?.addEventListener('click', () => {
    loadTarifAdmin();
    document.getElementById('tarifAdminModal').style.display = 'flex';
  });
  document.getElementById('closeTarifAdminModal')?.addEventListener('click', () => {
    setupModalClickOutside('tarifAdminModal');
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
  
  // ========== SEARCH INPUTS ==========
  document.getElementById('searchProdukInput')?.addEventListener('input', () => {
    renderProdukList();
  });
  document.getElementById('searchTarifInput')?.addEventListener('input', () => {
    renderTarifAdminList();
  });
  
  // ========== LOAD ALL AGENT BUTTON ==========
  document.getElementById('loadAllAgentBtn')?.addEventListener('click', async () => {
    showNotifTop('⏳ Memuat semua data agent...');
    await loadDatabaseAgent();
    showNotifTop(`✅ ${agentsData.length} data agent dimuat`);
  });
  
  // ========== REFRESH PRODUK BUTTON ==========
  document.getElementById('refreshProdukBtn')?.addEventListener('click', () => {
    loadProduk();
    if (currentAgentIdForProduct) {
      renderAgentProducts();
    }
    showNotifTop('🔄 Daftar produk direfresh');
  });
  
  // ========== PILIH NOMOR MODAL ==========
  const pilihNomorModal = document.getElementById('pilihNomorModal');
  if (pilihNomorModal) {
    pilihNomorModal.onclick = (e) => {
      if (e.target === pilihNomorModal) {
        closeModal('pilihNomorModal');
      }
    };
  }
  const batalPilihNomorBtn = document.getElementById('batalPilihNomorBtn');
  if (batalPilihNomorBtn) {
    batalPilihNomorBtn.onclick = () => {
      closeModal('pilihNomorModal');
    };
  }
  
  // ========== DOWNLOAD EXAMPLE BUTTONS ==========
  const downloadAgentExampleBtn = document.getElementById('downloadAgentExampleBtn');
  if (downloadAgentExampleBtn) {
    downloadAgentExampleBtn.addEventListener('click', downloadAgentExample);
  } else {
    const actionsDiv = document.querySelector('#dbAgentPage .db-actions');
    if (actionsDiv) {
      const newBtn = document.createElement('button');
      newBtn.textContent = '📋 Download Contoh Excel';
      newBtn.className = 'db-import-excel';
      newBtn.style.marginLeft = '10px';
      newBtn.style.background = '#f59e0b';
      newBtn.onclick = downloadAgentExample;
      actionsDiv.appendChild(newBtn);
    }
  }
  
  const downloadProdukExampleBtn = document.getElementById('downloadProdukExampleBtn');
  if (downloadProdukExampleBtn) {
    downloadProdukExampleBtn.addEventListener('click', downloadProdukExample);
  } else {
    const produkActionsDiv = document.querySelector('#produkPage .db-actions');
    if (produkActionsDiv) {
      const newBtn = document.createElement('button');
      newBtn.textContent = '📋 Download Contoh Excel';
      newBtn.className = 'db-import-excel';
      newBtn.style.marginLeft = '10px';
      newBtn.style.background = '#f59e0b';
      newBtn.onclick = downloadProdukExample;
      produkActionsDiv.appendChild(newBtn);
    }
  }
  
  // ========== CS MODAL ==========
  document.getElementById('addCsBtn')?.addEventListener('click', () => {
    document.getElementById('addCsModal').style.display = 'flex';
  });
  document.getElementById('saveCsBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('csEmail').value;
    const password = document.getElementById('csPassword').value;
    const nama = document.getElementById('csName').value;
    let hp = document.getElementById('csPhone').value;
    if (!email || !password || !nama) {
      showNotif('⚠️ Email, Password, dan Nama wajib diisi!', true);
      return;
    }
    if (hp) {
      hp = hp.replace(/\D/g, '');
      if (hp.startsWith('0')) hp = hp.substring(1);
      hp = '+62' + hp;
    }
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });
      if (authError) throw authError;
      
      await supabase.from('users').insert([{
        id: authData.user.id,
        email: email,
        nama: nama,
        hp: hp || '',
        role: 'cs',
        created_at: new Date().toISOString()
      }]);
      
      showNotif('✅ CS Agent berhasil ditambahkan');
      closeModal('addCsModal');
      document.getElementById('csEmail').value = '';
      document.getElementById('csPassword').value = '';
      document.getElementById('csName').value = '';
      document.getElementById('csPhone').value = '';
      loadUsersList();
    } catch (e) {
      showNotif('❌ Gagal: ' + e.message, true);
    }
  });
  
  // ========== PESAN MODAL ==========
  document.getElementById('addPesanBtn')?.addEventListener('click', async () => {
    await loadUsersForSelect();
    document.getElementById('pesanModal').style.display = 'flex';
  });
  document.getElementById('savePesanBtn')?.addEventListener('click', async () => {
    const toId = document.getElementById('pesanTo').value;
    const message = document.getElementById('pesanMessage').value;
    if (!toId || !message) {
      showNotif('Lengkapi data!', true);
      return;
    }
    await supabase.from('messages').insert([{
      from_id: currentUser.id,
      to_id: toId,
      message: message,
      is_read: false,
      created_at: new Date().toISOString()
    }]);
    closeModal('pesanModal');
    document.getElementById('pesanTo').value = '';
    document.getElementById('pesanMessage').value = '';
    showNotif('✅ Pesan terkirim');
    updateAllBadges();
  });
  
  // ========== REMINDER BUTTON ==========
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
    
    try {
      await supabase.from('reminders').insert([{
        title: title,
        description: description,
        datetime: datetime,
        user_id: currentUser.id,
        user_name: currentUserName,
        created_at: new Date().toISOString()
      }]);
      showNotifTop('✅ Pengingat berhasil ditambahkan');
      closeModal('reminderModal');
      loadReminders();
    } catch (e) {
      showNotifTop('❌ Gagal: ' + e.message, true);
    }
  });
  
  // ========== VIEW TRANSAKSI HISTORY BUTTON ==========
  document.getElementById('viewTransaksiHistoryBtn')?.addEventListener('click', () => {
    showTransaksiListModal();
  });
  
  // ========== DEADLINE NOTIFICATION BUTTON ==========
  const deadlineNotifBtn = document.getElementById('deadlineNotifBtn');
  if (deadlineNotifBtn) {
    deadlineNotifBtn.addEventListener('click', async () => {
      const today = getTodayDate();
      try {
        let customerQuery = supabase.from('customers').select('id', { count: 'exact' });
        if (currentUserRole !== 'owner') {
          customerQuery = customerQuery.eq('user_id', currentUser.id);
        }
        customerQuery = customerQuery.lt('tanggal', today);
        
        let prospekQuery = supabase.from('prospek').select('id', { count: 'exact' });
        if (currentUserRole !== 'owner') {
          prospekQuery = prospekQuery.eq('user_id', currentUser.id);
        }
        prospekQuery = prospekQuery.lt('deadline', today);
        
        const { count: customerCount } = await customerQuery;
        const { count: prospekCount } = await prospekQuery;
        
        if ((customerCount || 0) + (prospekCount || 0) > 0) {
          let message = `📅 DEADLINE TERLEWAT (${(customerCount || 0) + (prospekCount || 0)}):\n`;
          const { data: customers } = await customerQuery.limit(20);
          const { data: prospeks } = await prospekQuery.limit(20);
          
          customers?.forEach(doc => {
            message += `\n• ${doc.nama} (Customer) - ${doc.tanggal}`;
          });
          prospeks?.forEach(doc => {
            message += `\n• ${doc.nama} (Prospek) - ${doc.deadline}`;
          });
          alert(message);
        } else {
          showNotif('✅ Semua deadline terpenuhi!');
        }
      } catch (e) {
        console.error(e);
      }
    });
  }
  
  const pesanNotifBtn = document.getElementById('pesanNotifBtn');
  if (pesanNotifBtn) {
    pesanNotifBtn.addEventListener('click', () => {
      const pesanMenu = document.querySelector('.menu-item[data-page="pesan"]');
      if (pesanMenu) pesanMenu.click();
    });
  }
  
  // ==================== DB TRANSAKSI SETUP ====================
  
  setupTransaksiFilters();
  
  const deleteAllTransaksiBtn = document.getElementById('deleteAllTransaksiBtn');
  if (deleteAllTransaksiBtn) {
    deleteAllTransaksiBtn.addEventListener('click', deleteAllTransaksi);
  } else {
    const dbActions = document.querySelector('#dbTransaksiPage .db-actions');
    if (dbActions) {
      const newBtn = document.createElement('button');
      newBtn.id = 'deleteAllTransaksiBtn';
      newBtn.textContent = '🗑️ Hapus Semua';
      newBtn.className = 'db-delete-selected';
      newBtn.style.background = '#dc2626';
      newBtn.style.color = 'white';
      newBtn.style.marginLeft = '10px';
      newBtn.onclick = deleteAllTransaksi;
      dbActions.appendChild(newBtn);
    }
  }
  
  const selectAllTransaksiBtn = document.getElementById('selectAllTransaksi');
  if (selectAllTransaksiBtn) {
    const newSelectAllBtn = selectAllTransaksiBtn.cloneNode(true);
    selectAllTransaksiBtn.parentNode.replaceChild(newSelectAllBtn, selectAllTransaksiBtn);
    
    newSelectAllBtn.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('#dbTransaksiList .db-item-checkbox-transaksi');
      if (checkboxes.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang ditampilkan', true);
        return;
      }
      
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      
      checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        const event = new Event('change', { bubbles: true });
        cb.dispatchEvent(event);
      });
      
      newSelectAllBtn.textContent = !allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
    });
  }
  
  const deleteSelectedBtn = document.getElementById('deleteSelectedTransaksi');
  if (deleteSelectedBtn) {
    const newDeleteBtn = deleteSelectedBtn.cloneNode(true);
    deleteSelectedBtn.parentNode.replaceChild(newDeleteBtn, deleteSelectedBtn);
    newDeleteBtn.addEventListener('click', deleteSelectedTransaksi);
  }
  
  const moveSelectedBtn = document.getElementById('moveSelectedToFollowupBtn');
  if (moveSelectedBtn) {
    const newMoveBtn = moveSelectedBtn.cloneNode(true);
    moveSelectedBtn.parentNode.replaceChild(newMoveBtn, moveSelectedBtn);
    newMoveBtn.addEventListener('click', moveSelectedToFollowup);
  }
  
  // Tombol hapus semua untuk setiap database
  document.getElementById('deleteAllAgent')?.addEventListener('click', deleteAllAgent);
  document.getElementById('deleteAllClosing')?.addEventListener('click', deleteAllClosing);
  document.getElementById('deleteAllTidak')?.addEventListener('click', deleteAllTidak);
  document.getElementById('deleteAllNomorSalah')?.addEventListener('click', deleteAllNomorSalah);
  document.getElementById('deleteAllCommitment')?.addEventListener('click', deleteAllCommitment);
  document.getElementById('deleteAllProduk')?.addEventListener('click', deleteAllProduk);
});
