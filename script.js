// ========== SUPABASE CONFIGURATION ==========
const SUPABASE_URL = 'https://haylblhjzfavrfiyaicq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheWxibGhqemZhdnJmaXlhaWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzgyMDIsImV4cCI6MjA5NTMxNDIwMn0.j4yQa1ZttP5_Zg0ye5lK2OLecq39QhG3tPyv5PZ3r78';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.supabase = sb;

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

async function supabaseWithRetry(operation, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  let delayMs = initialDelay;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        console.warn(`Rate limit, retry ${i + 1}/${maxRetries} after ${delayMs}ms`);
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
  if (!angka && angka !== 0) return 'Rp 0';
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
  let query = sb.from(collection).select('*');
  
  if (currentUser && currentUserRole !== 'owner' && filters.user_id !== undefined) {
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
    .insert([{ ...data, user_id: currentUser ? currentUser.id : null, created_at: new Date().toISOString() }])
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
    .maybeSingle();
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
  
  let query = sb.from('customers').select('*');
  if (currentUser && currentUserRole !== 'owner') {
    query = query.eq('user_id', currentUser.id);
  }
  
  const { data: customers, error } = await query;
  if (error) {
    console.error('Error check duplicate:', error);
    return { duplicateAgent: null, duplicateHp: null };
  }
  
  let duplicateAgent = null;
  let duplicateHp = null;

  for (const customer of (customers || [])) {
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
  
  let query = sb.from('prospek').select('*');
  if (currentUser && currentUserRole !== 'owner') {
    query = query.eq('user_id', currentUser.id);
  }
  
  const { data: prospek, error } = await query;
  if (error) return null;
  
  let duplicateHp = null;

  for (const item of (prospek || [])) {
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
      .maybeSingle();
    
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
    agentData.push(monthlyTarget?.target_agent || 0);
    caData.push(monthlyTarget?.target_ca || 0);
    koorData.push(monthlyTarget?.target_koor || 0);
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
      .upsert(newTarget, { onConflict: 'id' });
    
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
                ${currentUserRole === 'owner' || item.created_by === currentUser?.id ? 
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

  if (currentUserRole !== 'owner' && transaksi.created_by !== currentUser?.id) {
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
    let query = sb.from('customers').select('progres_transaksi');
    
    if (currentUser && currentUserRole !== 'owner') {
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

// ========== LOAD ALL DATA - MAIN FUNCTION ==========
async function loadAllData() {
  if (!currentUser) return;
  
  console.log('loadAllData: Memuat semua data...');
  
  // Load customers
  await loadCustomers();
  // Load prospek
  await loadProspek();
  
  console.log('loadAllData: Selesai, customers:', customersData.length, 'prospek:', prospekData.length);
}

async function loadCustomers() {
  try {
    let query = sb.from('customers').select('*');
    if (currentUserRole !== 'owner') {
      query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    customersData = [];
    for (const d of (data || [])) {
      let ownerName = '';
      if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('nama')
          .eq('id', d.user_id)
          .maybeSingle();
        ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
      }
      customersData.push({ 
        id: d.id, 
        ...d, 
        displayName: d.nama + ownerName 
      });
    }
    
    renderDashboardCustomers();
    renderFullFollowupKanban();
    
  } catch (error) {
    console.error('Error loadCustomers:', error);
    showNotifTop('❌ Gagal memuat data customer: ' + error.message, true);
  }
}

function renderDashboardCustomers() {
  const today = getTodayDate();
  
  let total = 0, closing = 0, pending = 0, followup = 0;
  const lists = { baru: [], followup: [], pending: [], closing: [] };
  
  customersData.forEach(item => {
    total++;
    if (item.status === 'closing') closing++;
    else if (item.status === 'pending') pending++;
    else if (item.status === 'followup') followup++;
    else lists.baru.push(item);
    
    if (item.status === 'followup') lists.followup.push(item);
    if (item.status === 'pending') lists.pending.push(item);
    if (item.status === 'closing') lists.closing.push(item);
  });
  
  // Sort by deadline
  for (let status in lists) {
    lists[status].sort((a, b) => (a.tanggal || '9999-12-31').localeCompare(b.tanggal || '9999-12-31'));
  }
  
  // Update counts
  document.getElementById('countBaru').innerText = lists.baru.length;
  document.getElementById('countFollowup').innerText = followup;
  document.getElementById('countPending').innerText = pending;
  document.getElementById('countClosing').innerText = closing;
  document.getElementById('totalData').innerText = total;
  document.getElementById('closingTotal').innerText = closing;
  document.getElementById('activeProspek').innerText = total - closing;
  document.getElementById('rateClosing').innerText = total ? Math.round((closing / total) * 100) + '%' : '0%';
  
  // Render each column
  for (let status in lists) {
    const container = document.getElementById(status + 'List');
    if (container) {
      container.innerHTML = lists[status].map(item => {
        const isOverdue = item.tanggal && item.tanggal < today;
        const isToday = item.tanggal === today;
        let deadlineClass = '';
        if (isOverdue) deadlineClass = 'deadline-overdue';
        else if (isToday) deadlineClass = 'deadline-today';
        return `<div class="card-item ${deadlineClass}" data-id="${item.id}" data-status="${status}">
          <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
          <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
          <div class="card-phone"><span title="${item.hp}">${item.hp}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWAById('${item.id}')">💬</span></div>
          <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
        </div>`;
      }).join('');
      
      // Add click handlers
      container.querySelectorAll('.card-item').forEach(card => {
        card.addEventListener('click', (e) => {
          if (!e.target.classList.contains('whatsapp-icon')) {
            openDetailCustomer(card.dataset.id);
          }
        });
      });
    }
  }
  
  updateChartCustomer(total, closing, pending, followup);
}

async function loadProspek() {
  try {
    let query = sb.from('prospek').select('*');
    if (currentUserRole !== 'owner') {
      query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    prospekData = [];
    for (const d of (data || [])) {
      let ownerName = '';
      if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('nama')
          .eq('id', d.user_id)
          .maybeSingle();
        ownerName = userData ? ` (${userData.nama || 'CS'})` : '';
      }
      prospekData.push({ 
        id: d.id, 
        ...d, 
        displayName: d.nama + ownerName 
      });
    }
    
    renderDashboardProspek();
    renderFullProspekKanban();
    
  } catch (error) {
    console.error('Error loadProspek:', error);
    showNotifTop('❌ Gagal memuat data prospek: ' + error.message, true);
  }
}

function renderDashboardProspek() {
  const today = getTodayDate();
  
  let baru = 0, dihubungi = 0, negosiasi = 0, tertarik = 0;
  const lists = { prospekBaru: [], prospekDihubungi: [], prospekNegosiasi: [], prospekTertarik: [] };
  
  prospekData.forEach(item => {
    const status = item.status || 'Baru';
    if (status === 'Baru') {
      baru++;
      lists.prospekBaru.push(item);
    } else if (status === 'Dihubungi') {
      dihubungi++;
      lists.prospekDihubungi.push(item);
    } else if (status === 'Negosiasi') {
      negosiasi++;
      lists.prospekNegosiasi.push(item);
    } else if (status === 'Tertarik') {
      tertarik++;
      lists.prospekTertarik.push(item);
    }
  });
  
  // Sort by deadline
  for (let col in lists) {
    lists[col].sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
  }
  
  // Update counts
  document.getElementById('countProspekBaru').innerText = baru;
  document.getElementById('countDihubungi').innerText = dihubungi;
  document.getElementById('countNegosiasi').innerText = negosiasi;
  document.getElementById('countTertarik').innerText = tertarik;
  
  // Render each column
  for (let col in lists) {
    const container = document.getElementById(col + 'List');
    if (container) {
      container.innerHTML = lists[col].map(item => {
        const isOverdue = item.deadline && item.deadline < today;
        const isToday = item.deadline === today;
        let deadlineClass = '';
        if (isOverdue) deadlineClass = 'deadline-overdue';
        else if (isToday) deadlineClass = 'deadline-today';
        return `<div class="card-item ${deadlineClass}" data-id="${item.id}" data-status="${item.status}">
          <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
          <div class="card-phone"><span title="${item.hp}">${item.hp}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWAById('${item.id}')">💬</span></div>
          <div class="card-deadline">📅 ${item.deadline || '-'}</div>
        </div>`;
      }).join('');
      
      // Add click handlers
      container.querySelectorAll('.card-item').forEach(card => {
        card.addEventListener('click', (e) => {
          if (!e.target.classList.contains('whatsapp-icon')) {
            openDetailProspek(card.dataset.id);
          }
        });
      });
    }
  }
  
  updateChartProspek(baru, dihubungi, negosiasi, tertarik);
}

// ========== OPEN DETAIL FUNCTIONS ==========
async function openDetailCustomer(id) {
  try {
    const d = customersData.find(c => c.id === id);
    if (!d) {
      showNotifTop('❌ Data tidak ditemukan!', true);
      return;
    }
    
    const progresData = d.progres_transaksi || { items: [], total_tercapai: 0 };
    const totalTercapai = progresData.total_tercapai || 0;
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('nama')
        .eq('id', d.user_id)
        .maybeSingle();
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
        <h3>${escapeHtml(d.displayName || d.nama)}</h3>
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

async function openDetailProspek(id) {
  try {
    const d = prospekData.find(p => p.id === id);
    if (!d) {
      showNotifTop('❌ Data tidak ditemukan!', true);
      return;
    }
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('nama')
        .eq('id', d.user_id)
        .maybeSingle();
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
      <div class="detail-header"><div class="detail-avatar">${statusIcon}</div><h3>${escapeHtml(d.displayName || d.nama)}</h3><div class="detail-status">${getStatusBadge(d.status)}</div></div>
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
            <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
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
          <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
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
          <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
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
          <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
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
  
  await loadCustomers();
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
            <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
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
            <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
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
            <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
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
            <div class="card-name" title="${escapeHtml(item.displayName || item.nama)}">${escapeHtml(item.displayName || item.nama)}</div>
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
  
  await loadProspek();
  renderFullProspekKanban();
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

// ========== CUSTOMER STATUS UPDATE FUNCTIONS ==========
window.updateCustomerStatus = async function(id, newStatus) {
  if (newStatus === 'followup') {
    try {
      const d = await supabaseGetById('customers', id);
      const currentDeadline = d?.tanggal || getTodayDate();
      const newDeadline = addDaysToDate(currentDeadline, 1);
      await supabaseUpdate('customers', id, {
        status: 'followup',
        tanggal: newDeadline
      });
      showNotifTop(`✅ Status berhasil diupdate ke Follow Up. Deadline +1 hari menjadi ${newDeadline}`);
      closeModal('detailModal');
      await loadCustomers();
    } catch (error) {
      showNotifTop('❌ Gagal: ' + error.message, true);
    }
  }
};

window.deleteCustomer = async function(id) {
  if (!confirm('Yakin hapus customer ini? Data akan dihapus permanen!')) return;

  try {
    await supabaseDelete('customers', id);
    closeModal('detailModal');
    showNotifTop('🗑️ Data customer berhasil dihapus');
    await loadCustomers();
    updateAllBadges();
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
    await loadProspek();
    updateAllBadges();
  } catch (e) {
    showNotifTop('❌ Gagal hapus: ' + e.message, true);
  }
};

// ========== UPDATE BADGES ==========
async function updateAllBadges() {
  await updateDeadlineBadge();
  await updatePesanBadge();
}

async function updateDeadlineBadge() {
  if (!currentUser) return;
  const badge = document.getElementById('deadlineCount');
  if (!badge) return;
  try {
    const today = getTodayDate();
    
    // Count overdue customers
    let customerQuery = sb.from('customers').select('id', { count: 'exact', head: true });
    if (currentUserRole !== 'owner') {
      customerQuery = customerQuery.eq('user_id', currentUser.id);
    }
    customerQuery = customerQuery.lt('tanggal', today);
    
    // Count overdue prospek
    let prospekQuery = sb.from('prospek').select('id', { count: 'exact', head: true });
    if (currentUserRole !== 'owner') {
      prospekQuery = prospekQuery.eq('user_id', currentUser.id);
    }
    prospekQuery = prospekQuery.lt('deadline', today);
    
    const { count: customerCount } = await customerQuery;
    const { count: prospekCount } = await prospekQuery;
    
    const deadlineCount = (customerCount || 0) + (prospekCount || 0);
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
      .select('id', { count: 'exact', head: true })
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

// ========== FOLLOWUP CONFIRMATION FUNCTIONS ==========
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
    }
    
    finalCb1.onclick = updateYesButton;
    finalCb2.onclick = updateYesButton;
    
    function safeCloseModal() {
        try {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
        } catch(e) {
            console.error('Error closing modal:', e);
        }
    }
    
    finalYesBtn.onclick = function() {
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
                    loadCustomers();
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
                        await sb.from('nomor_salah').insert([{
                            nama: doc.nama,
                            hp: doc.hp,
                            alasan: 'Nomor tidak bisa dihubungi / tidak aktif',
                            deleted_at: new Date().toISOString(),
                            user_id: doc.user_id
                        }]);
                        await supabaseDelete('customers', id);
                        safeCloseModal();
                        showNotifTop('📵 Data dipindahkan ke Database Nomor Salah');
                        setTimeout(() => {
                            closeModal('detailModal');
                            loadCustomers();
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

// ========== PENDING MODAL FUNCTIONS ==========
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
                await loadCustomers();
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
                await loadCustomers();
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

// ========== CLOSING FUNCTIONS ==========
async function confirmClosing(id) {
    showConfirmDialog(
        'Pindahkan ke Database Closing?',
        `Apakah Anda yakin ingin memindahkan data ini ke DATABASE CLOSING?\n\n⚠️ Data yang sudah dipindahkan TIDAK BISA dikembalikan ke Followup Agen!`,
        async () => {
            const doc = await supabaseGetById('customers', id);
            if (doc) {
                await sb.from('db_closing').insert([{
                    nama: doc.nama,
                    hp: doc.hp,
                    tanggal: doc.tanggal || getTodayDate(),
                    closing_date: new Date().toISOString(),
                    user_id: doc.user_id,
                    followup_data: doc.followup_data || null,
                    pending_data: doc.pending_data || []
                }]);
                await supabaseDelete('customers', id);
                showNotifTop('✅ Data berhasil dipindahkan ke Database Closing!');
                await loadCustomers();
                updateAllBadges();
            }
        },
        async () => {
            await supabaseUpdate('customers', id, { status: 'closing' });
            showNotifTop('📌 Data tetap di kolom Closing');
            await loadCustomers();
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
                    await sb.from('db_closing').insert([{
                        nama: doc.nama,
                        hp: doc.hp,
                        tanggal: doc.tanggal || getTodayDate(),
                        closing_date: new Date().toISOString(),
                        user_id: doc.user_id,
                        followup_data: doc.followup_data || null,
                        pending_data: doc.pending_data || []
                    }]);
                    await supabaseDelete('customers', id);
                    closeModal('detailModal');
                    showNotifTop('✅ Data berhasil dipindahkan ke DB Closing');
                    await loadCustomers();
                    updateAllBadges();
                }
            } catch (err) {
                showNotifTop('❌ Gagal: ' + err.message, true);
            }
        }
    );
}

// ========== PROSPEK FUNCTIONS ==========
function lanjutKeDihubungi(id) {
    supabaseGetById('prospek', id).then(async (doc) => {
        const currentDeadline = doc.deadline || getTodayDate();
        const newDeadline = addDaysToDate(currentDeadline, 1);
        await supabaseUpdate('prospek', id, {
            status: 'Dihubungi',
            deadline: newDeadline
        });
        showNotifTop(`✅ Status berubah menjadi Dihubungi. Deadline +1 hari menjadi ${newDeadline}`);
        await loadProspek();
        closeModal('detailModal');
    }).catch(err => showNotifTop('❌ Gagal: ' + err.message, true));
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
        await loadProspek();
        closeModal('detailModal');
    };

    noBtn.onclick = async () => {
        const data = await supabaseGetById('prospek', id);
        if (data) {
            showConfirmDialog(
                'Pindahkan ke Database Nomor Salah?',
                `Apakah Anda yakin nomor "${escapeHtml(data.hp)}" milik "${escapeHtml(data.nama)}" tidak dapat dihubungi?\n\n⚠️ Data yang sudah dipindahkan TIDAK BISA dikembalikan!`,
                async () => {
                    await sb.from('nomor_salah').insert([{
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
                    await loadProspek();
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
        }
    };
}

function openProspekNegosiasiModal(id) {
    currentProspekId = id;
    const fields = ['prospek_aplikasi', 'prospek_domisili', 'prospek_transaksi', 'prospek_deposit', 'prospek_tertarik', 'prospek_penawaran'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });

    supabaseGetById('prospek', id).then(doc => {
        if (doc.negosiasi_data) {
            document.getElementById('prospek_aplikasi').value = doc.negosiasi_data.aplikasi || '';
            document.getElementById('prospek_domisili').value = doc.negosiasi_data.domisili || '';
            document.getElementById('prospek_transaksi').value = doc.negosiasi_data.transaksi || '';
            document.getElementById('prospek_deposit').value = doc.negosiasi_data.deposit || '';
            document.getElementById('prospek_tertarik').value = doc.negosiasi_data.tertarik || '';
            document.getElementById('prospek_penawaran').value = doc.negosiasi_data.penawaran || '';
        }
    });

    const modal = document.getElementById('prospekNegosiasiModal');
    if (!modal) return;

    modal.style.display = 'flex';
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
                    timestamp: new Date().toISOString(),
                    is_complete: true
                };
                await supabaseUpdate('prospek', currentProspekId, {
                    status: 'Tertarik',
                    negosiasi_data: negosiasi_data
                });
                showNotifTop('✅ Prospek dipindahkan ke Tertarik');
                closeModal('prospekNegosiasiModal');
                await loadProspek();
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
                    await sb.from('db_tidak_tertarik').insert([{
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
                    await loadProspek();
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
        await loadProspek();
        closeModal('detailModal');
    };

    document.getElementById('negosiasiBatalBtn').onclick = () => {
        closeModal('prospekNegosiasiModal');
    };
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
        }],
        async (values) => {
            if (!values.inputAgentId || !values.inputAplikasi) {
                showNotifTop('⚠️ ID Agent dan Aplikasi wajib diisi!', true);
                return;
            }

            const doc = await supabaseGetById('prospek', prospekId);
            const cleanHp = doc.hp;
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
                `Apakah Anda yakin ingin menjadikan "${escapeHtml(doc.nama)}" sebagai Customer?\n\n` +
                `🆔 ID Agent: ${values.inputAgentId}\n` +
                `📱 Aplikasi: ${values.inputAplikasi}\n` +
                `📅 Tanggal Followup: ${followupDate}\n\n` +
                `📋 Data akan DISIMPAN ke DATABASE COMMITMENT sebagai arsip.\n` +
                `📞 Data akan DIPINDAHKAN ke FOLLOWUP AGEN dengan status "Baru".\n\n` +
                `⚠️ Proses ini TIDAK BISA dibatalkan dan data akan DIHAPUS dari Prospek Agen!`,
                async () => {
                    try {
                        showNotifTop('⏳ Memproses pemindahan data...');

                        await sb.from('db_commitment').insert([{
                            nama: doc.nama,
                            hp: doc.hp,
                            negosiasi_data: doc.negosiasi_data || null,
                            agent_id: values.inputAgentId,
                            aplikasi: values.inputAplikasi,
                            committed_at: new Date().toISOString(),
                            user_id: doc.user_id,
                            original_prospek_id: prospekId,
                            followup_date: followupDate
                        }]);

                        await sb.from('customers').insert([{
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
                        }]);

                        await supabaseDelete('prospek', prospekId);

                        showNotifTop('✅ Berhasil! Customer telah ditambahkan ke Followup Agen dan disimpan ke DB Commitment');
                        closeModal('detailModal');
                        await loadCustomers();
                        await loadProspek();
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

// ========== TAMBAH PROGRES TRANSAKSI ==========
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

            await supabaseUpdate('customers', customerId, {
                progres_transaksi: {
                    items: [...(progresData.items || []), newItem],
                    total_tercapai: newTotalTercapai
                },
                updated_at: new Date().toISOString()
            });

            showNotifTop(`✅ Progres berhasil ditambahkan! Total transaksi tercapai: ${newTotalTercapai > 0 ? '+' : ''}${newTotalTercapai} Transaksi`);
            modal.remove();

            await loadCustomers();
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

// ========== DATABASE CLOSING, TIDAK, NOMOR SALAH, COMMITMENT ==========
async function loadDBClosing() {
    if (!currentUser) return;
    const isOwner = currentUserRole === 'owner';
    let query = sb.from('db_closing').select('*');
    if (!isOwner) {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('closing_date', { ascending: false });
    if (error) {
        console.error('Error load closing:', error);
        return;
    }
    
    const container = document.getElementById('dbClosingList');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">📭 Belum ada data closing</p>';
        return;
    }
    
    container.innerHTML = data.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="closing" style="cursor: pointer;">
            <div class="db-item-info">
                <h4>${escapeHtml(item.nama)}</h4>
                <p>${item.hp}</p>
                <small>Closing: ${new Date(item.closing_date).toLocaleDateString('id-ID')}</small>
            </div>
            <div class="db-item-actions">
                <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_closing', '${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

async function loadDBTidak() {
    if (!currentUser) return;
    const isOwner = currentUserRole === 'owner';
    let query = sb.from('db_tidak_tertarik').select('*');
    if (!isOwner) {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('tanggal', { ascending: false });
    if (error) {
        console.error('Error load tidak:', error);
        return;
    }
    
    const container = document.getElementById('dbTidakList');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">📭 Belum ada data tidak tertarik</p>';
        return;
    }
    
    container.innerHTML = data.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="tidak" style="cursor: pointer;">
            <div class="db-item-info">
                <h4>${escapeHtml(item.nama)}</h4>
                <p>${item.hp}</p>
                <small>Tanggal: ${new Date(item.tanggal).toLocaleDateString('id-ID')}</small>
            </div>
            <div class="db-item-actions">
                <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_tidak_tertarik', '${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

async function loadDBNomorSalah() {
    if (!currentUser) return;
    const isOwner = currentUserRole === 'owner';
    let query = sb.from('nomor_salah').select('*');
    if (!isOwner) {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('deleted_at', { ascending: false });
    if (error) {
        console.error('Error load nomor salah:', error);
        return;
    }
    
    const container = document.getElementById('dbNomorSalahList');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">📭 Belum ada data nomor salah</p>';
        return;
    }
    
    container.innerHTML = data.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="nomor_salah" style="cursor: pointer;">
            <div class="db-item-info">
                <h4>${escapeHtml(item.nama)}</h4>
                <p>${item.hp}</p>
                <small>Alasan: ${item.alasan}<br>Tanggal: ${new Date(item.deleted_at).toLocaleDateString('id-ID')}</small>
            </div>
            <div class="db-item-actions">
                <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('nomor_salah', '${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

async function loadDBCommitment() {
    if (!currentUser) return;
    const isOwner = currentUserRole === 'owner';
    let query = sb.from('db_commitment').select('*');
    if (!isOwner) {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('committed_at', { ascending: false });
    if (error) {
        console.error('Error load commitment:', error);
        return;
    }
    
    const container = document.getElementById('dbCommitmentList');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">📭 Belum ada data komitmen</p>';
        return;
    }
    
    container.innerHTML = data.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="commitment" style="cursor: pointer;">
            <div class="db-item-info">
                <h4>${escapeHtml(item.nama)}</h4>
                <p>${item.hp}</p>
                <small>Komitmen: ${new Date(item.committed_at).toLocaleDateString('id-ID')}<br>Agent: ${item.agent_id || '-'}</small>
            </div>
            <div class="db-item-actions">
                <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_commitment', '${item.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

window.deleteDBItem = async function(collection, id) {
    if (!confirm('Yakin hapus data ini? Data akan dihapus permanen!')) return;
    try {
        await supabaseDelete(collection, id);
        showNotifTop('🗑️ Data berhasil dihapus');
        // Refresh the specific list
        if (collection === 'db_closing') await loadDBClosing();
        else if (collection === 'db_tidak_tertarik') await loadDBTidak();
        else if (collection === 'nomor_salah') await loadDBNomorSalah();
        else if (collection === 'db_commitment') await loadDBCommitment();
    } catch (e) {
        showNotifTop('❌ Gagal hapus: ' + e.message, true);
    }
};

// ========== SEARCH FUNCTION ==========
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
        for (const item of customersData) {
            const searchText = `${item.agent_id || ''} ${item.nama || ''} ${item.hp || ''}`.toLowerCase();
            if (searchText.includes(keyword)) {
                results.push({
                    id: item.id,
                    type: 'customer',
                    title: item.nama,
                    subtitle: item.hp,
                    detail: `ID: ${item.agent_id || '-'} | Deadline: ${item.tanggal || '-'}`,
                    badge: 'Followup Agen',
                    badgeClass: 'badge-customer'
                });
            }
        }
    }

    if (searchProspek) {
        for (const item of prospekData) {
            const searchText = `${item.nama || ''} ${item.hp || ''}`.toLowerCase();
            if (searchText.includes(keyword)) {
                results.push({
                    id: item.id,
                    type: 'prospek',
                    title: item.nama,
                    subtitle: item.hp,
                    detail: `Status: ${item.status || 'Baru'} | Deadline: ${item.deadline || '-'}`,
                    badge: 'Prospek Agen',
                    badgeClass: 'badge-prospek'
                });
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
        };
    });
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">🔍 Masukkan kata kunci untuk mencari data</p>';
}

// ========== AUTH STATE ==========
async function checkSession() {
  const loginPage = document.getElementById('loginPage');
  const app = document.getElementById('app');
  
  const { data: { session } } = await sb.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    console.log('User logged in:', currentUser.email);
    
    // Load user profile from users table
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .maybeSingle();
    
    if (!error && userData) {
      currentUserRole = userData.role || 'cs';
      currentUserName = userData.nama || 'CS Agent';
      currentUser.id = userData.id;
    } else {
      currentUserRole = 'cs';
      currentUserName = 'CS Agent';
      currentUser.id = session.user.id;
    }
    
    document.getElementById('topUserName').innerText = currentUserName;
    document.getElementById('profileName').value = currentUserName;
    document.getElementById('profileEmail').value = session.user.email;
    
    // Update profile photo if exists
    if (userData?.foto) {
      document.getElementById('profileImg').src = userData.foto;
      document.getElementById('previewFoto').src = userData.foto;
    }
    
    // Show/hide owner menu
    if (currentUserRole === 'owner') {
      document.getElementById('ownerMenu').style.display = 'block';
    } else {
      document.getElementById('ownerMenu').style.display = 'none';
    }
    
    // Hide sidebar menu items for non-owner
    if (currentUserRole !== 'owner') {
      const menuDbAgent = document.getElementById('menuDbAgent');
      const menuDbTransaksi = document.getElementById('menuDbTransaksi');
      const menuImport = document.getElementById('menuImport');
      
      if (menuDbAgent) menuDbAgent.style.display = 'none';
      if (menuDbTransaksi) menuDbTransaksi.style.display = 'none';
      if (menuImport) menuImport.style.display = 'none';
    } else {
      const menuDbAgent = document.getElementById('menuDbAgent');
      const menuDbTransaksi = document.getElementById('menuDbTransaksi');
      const menuImport = document.getElementById('menuImport');
      
      if (menuDbAgent) menuDbAgent.style.display = 'flex';
      if (menuDbTransaksi) menuDbTransaksi.style.display = 'flex';
      if (menuImport) menuImport.style.display = 'flex';
    }
    
    // Hide all page contents
    const allPages = ['dashboardPage', 'importPage', 'dbClosingPage', 'dbTidakPage', 
                      'dbNomorSalahPage', 'dbCommitmentPage', 'dbAgentPage', 'produkPage', 
                      'reminderPage', 'pesanPage', 'broadcastPage', 'broadcastUplinePage', 
                      'followupFullPage', 'prospekFullPage', 'searchPage', 'manageUsersPage', 
                      'dbTransaksiPage'];
    
    allPages.forEach(pageId => {
      const el = document.getElementById(pageId);
      if (el) el.style.display = 'none';
    });
    
    // Show dashboard
    const dashboardPage = document.getElementById('dashboardPage');
    if (dashboardPage) dashboardPage.style.display = 'block';
    
    // Set active menu
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    const dashboardMenu = document.querySelector('.menu-item[data-page="dashboard"]');
    if (dashboardMenu) dashboardMenu.classList.add('active');
    
    loginPage.style.display = 'none';
    app.style.display = 'block';
    
    // Load all data
    await loadAllData();
    await loadTargetData();
    await loadTransaksiGlobal();
    await loadDatabaseAgent();
    await loadProduk();
    await loadReminders();
    await loadPesan();
    await updateAllBadges();
    
    // Initialize full mode selection (owner only)
    if (currentUserRole === 'owner') {
      initFullModeSelection();
    }
    
    // Setup manage target button for owner
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
    
  } else {
    loginPage.style.display = 'flex';
    app.style.display = 'none';
    currentUser = null;
  }
}

// ========== INIT FULL MODE SELECTION ==========
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
    followupDeleteAllBtn.onclick = async () => {
      if (confirm('⚠️ Hapus semua data Followup Agen? Tindakan ini tidak bisa dibatalkan!')) {
        const { data, error } = await sb.from('customers').select('id');
        if (!error && data) {
          for (const item of data) {
            await supabaseDelete('customers', item.id);
          }
          await loadCustomers();
          showNotifTop('✅ Semua data Followup Agen berhasil dihapus');
        }
      }
    };
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
    prospekDeleteAllBtn.onclick = async () => {
      if (confirm('⚠️ Hapus semua data Prospek Agen? Tindakan ini tidak bisa dibatalkan!')) {
        const { data, error } = await sb.from('prospek').select('id');
        if (!error && data) {
          for (const item of data) {
            await supabaseDelete('prospek', item.id);
          }
          await loadProspek();
          showNotifTop('✅ Semua data Prospek Agen berhasil dihapus');
        }
      }
    };
  }
}

// ========== LOAD REMINDERS ==========
async function loadReminders() {
  try {
    let query = sb.from('reminders').select('*');
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
    
    reminderList.innerHTML = data.map(item => {
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

// ========== LOAD PESAN ==========
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
          .maybeSingle();
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

// ========== LOAD DATABASE AGENT ==========
async function loadDatabaseAgent() {
  if (!currentUser) return;

  const isOwner = currentUserRole === 'owner';
  let query = sb.from('db_agent').select('*');
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
        .maybeSingle();
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

  // Add event listeners
  document.querySelectorAll('#dbAgentList .db-item-checkbox-agent').forEach(cb => {
    cb.onclick = (e) => {
      e.stopPropagation();
      const id = cb.dataset.id;
      if (cb.checked) {
        selectedAgentIds.set(id, true);
      } else {
        selectedAgentIds.delete(id);
      }
      updateSelectAllAgentButton();
    };
  });

  document.querySelectorAll('#dbAgentList .db-item-agent').forEach(el => {
    el.onclick = (e) => {
      if (e.target.type !== 'checkbox' &&
        !e.target.classList.contains('db-item-wa') &&
        !e.target.classList.contains('db-item-move-followup') &&
        !e.target.classList.contains('db-item-delete')) {
        openAgentDetail(el.dataset.id);
      }
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
      await sb.from('customers').insert([{
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
      loadCustomers();
    }
  );
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

// ========== LOAD PRODUK ==========
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

  // Add checkbox handlers
  document.querySelectorAll('#produkList .db-item-checkbox-produk').forEach(cb => {
    cb.onclick = (e) => {
      e.stopPropagation();
      const id = cb.dataset.id;
      if (cb.checked) {
        selectedProdukIds.set(id, true);
      } else {
        selectedProdukIds.delete(id);
      }
      updateSelectAllProdukButton();
    };
  });

  // Add click handlers for items
  document.querySelectorAll('#produkList .produk-item').forEach(el => {
    el.onclick = (e) => {
      if (e.target.type === 'checkbox') return;
      if (e.target.classList.contains('db-item-edit')) return;
      if (e.target.classList.contains('db-item-delete')) return;
      const id = el.dataset.id;
      editProduk(id);
    };
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

function editProduk(id) {
  const produk = produkData.find(p => p.id === id);
  if (!produk) return;
  currentEditProdukId = id;
  document.getElementById('produkMasterNama').value = produk.nama || '';
  document.getElementById('produkMasterHpp').value = produk.hpp || '';
  document.getElementById('produkMasterKeterangan').value = produk.keterangan || '';
  document.getElementById('produkMasterJenis').value = produk.jenis_produk || 'tanpa_admin';
  document.getElementById('produkMasterTitle').innerText = '✏️ Edit Produk';
  document.getElementById('produkMasterModal').style.display = 'flex';
  
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
}

function deleteProduk(id) {
  if (!confirm('Yakin hapus produk ini? Produk yang sudah terpakai di agent akan kehilangan referensi!')) return;
  
  supabaseDelete('produk', id);
  const index = produkData.findIndex(p => p.id === id);
  if (index !== -1) produkData.splice(index, 1);
  selectedProdukIds.delete(id);
  renderProdukList();
  showNotifTop('🗑️ Produk berhasil dihapus');
}

// ========== OPEN AGENT DETAIL ==========
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

    document.getElementById('agentDetailModal').style.display = 'flex';
    document.body.classList.add('modal-open');
  } catch (error) {
    console.error('Error:', error);
    showNotifTop('❌ Gagal membuka detail: ' + error.message, true);
  }
}

// ========== SETUP EVENT LISTENERS ==========
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
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (sidebar) sidebar.classList.toggle('active');
    });
  }
  
  // ========== SETUP MODAL CLICK OUTSIDE ==========
  const allModalIds = [
    'detailModal', 'customerModal', 'prospekModal', 'prospekNegosiasiModal',
    'profileModal', 'previewPhotoModal', 'reminderModal', 'pesanModal',
    'convertModal', 'followupConfirmModal', 'pendingModal', 'addCsModal',
    'editDeadlineModal', 'infoModal', 'agentDetailModal'
  ];
  
  allModalIds.forEach(id => setupModalClickOutside(id));
  
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
  
  // ========== SAVE CUSTOMER ==========
  document.getElementById('saveCustomerBtn')?.addEventListener('click', async () => {
    const agentId = document.getElementById('customerId')?.value;
    const agentType = document.getElementById('customerType')?.value;
    const nama = document.getElementById('customerName')?.value;
    let hp = document.getElementById('customerPhone')?.value;
    const apk = document.getElementById('customerApk')?.value;
    const uplineName = document.getElementById('customerUplineName')?.value;
    let uplinePhone = document.getElementById('customerUplinePhone')?.value;
    const tanggal = document.getElementById('customerDate')?.value;
    
    if (!agentId || !agentType || !nama || !hp || !apk || !tanggal) {
      showNotifTop('⚠️ Semua field wajib diisi!', true);
      return;
    }
    
    // Format HP
    hp = hp.replace(/\D/g, '');
    if (hp.startsWith('0')) hp = hp.substring(1);
    if (!hp.startsWith('62')) hp = '62' + hp;
    hp = '+' + hp;
    
    if (uplinePhone) {
      uplinePhone = uplinePhone.replace(/\D/g, '');
      if (uplinePhone.startsWith('0')) uplinePhone = uplinePhone.substring(1);
      if (!uplinePhone.startsWith('62')) uplinePhone = '62' + uplinePhone;
      uplinePhone = '+' + uplinePhone;
    }
    
    // Check duplicate
    const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(agentId, hp);
    if (duplicateAgent) {
      showNotifTop(`⚠️ ID Agent "${agentId}" sudah terdaftar oleh ${duplicateAgent.owner}!`, true);
      return;
    }
    if (duplicateHp) {
      showNotifTop(`⚠️ Nomor WhatsApp "${hp}" sudah terdaftar oleh ${duplicateHp.owner}!`, true);
      return;
    }
    
    try {
      await sb.from('customers').insert([{
        agent_id: agentId,
        agent_type: agentType,
        nama: nama,
        hp: hp,
        apk: apk,
        upline_name: uplineName || '',
        upline_phone: uplinePhone || '',
        tanggal: tanggal,
        status: 'baru',
        user_id: currentUser.id,
        created_at: new Date().toISOString(),
        followup_data: null,
        pending_data: []
      }]);
      
      showNotifTop('✅ Customer berhasil ditambahkan!');
      closeModal('customerModal');
      await loadCustomers();
      
    } catch (e) {
      console.error('Error save customer:', e);
      showNotifTop('❌ Gagal: ' + e.message, true);
    }
  });
  
  // ========== SAVE PROSPEK ==========
  document.getElementById('saveProspekBtn')?.addEventListener('click', async () => {
    const agentType = document.getElementById('prospekType')?.value;
    const nama = document.getElementById('prospekName')?.value;
    let hp = document.getElementById('prospekPhone')?.value;
    const status = document.getElementById('prospekStatusSelect')?.value;
    const deadline = document.getElementById('prospekDeadline')?.value;
    
    if (!agentType || !nama || !hp || !deadline) {
      showNotifTop('⚠️ Semua field wajib diisi!', true);
      return;
    }
    
    // Format HP
    hp = hp.replace(/\D/g, '');
    if (hp.startsWith('0')) hp = hp.substring(1);
    if (!hp.startsWith('62')) hp = '62' + hp;
    hp = '+' + hp;
    
    // Check duplicate
    const duplicateHp = await checkDuplicateProspek(hp);
    if (duplicateHp) {
      showNotifTop(`⚠️ Nomor WhatsApp "${hp}" sudah terdaftar oleh ${duplicateHp.owner}!`, true);
      return;
    }
    
    try {
      await sb.from('prospek').insert([{
        agent_type: agentType,
        nama: nama,
        hp: hp,
        status: status,
        deadline: deadline,
        user_id: currentUser.id,
        created_at: new Date().toISOString()
      }]);
      
      showNotifTop('✅ Prospek berhasil ditambahkan!');
      closeModal('prospekModal');
      await loadProspek();
      
    } catch (e) {
      console.error('Error save prospek:', e);
      showNotifTop('❌ Gagal: ' + e.message, true);
    }
  });
  
// ========== PAGE NAVIGATION ==========
document.querySelectorAll('.menu-item[data-page]').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    const pages = ['dashboardPage', 'importPage', 'dbClosingPage', 'dbTidakPage', 
                   'dbNomorSalahPage', 'dbCommitmentPage', 'dbAgentPage', 'produkPage', 
                   'reminderPage', 'pesanPage', 'broadcastPage', 'broadcastUplinePage', 
                   'followupFullPage', 'prospekFullPage', 'searchPage', 'manageUsersPage', 
                   'dbTransaksiPage'];
    
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
  });
});
  
  // ========== PROFILE MODAL ==========
  const profileImg = document.getElementById('profileImg');
  if (profileImg) {
    profileImg.addEventListener('click', () => {
      document.getElementById('profileModal').style.display = 'flex';
    });
  }
  
  // ========== INFO BUTTON ==========
  document.getElementById('infoBtn')?.addEventListener('click', () => {
    document.getElementById('infoModal').style.display = 'flex';
  });
  document.getElementById('infoModalClose')?.addEventListener('click', () => closeModal('infoModal'));

  // ========== SEARCH BUTTONS ==========
  document.getElementById('searchBtn')?.addEventListener('click', performSearch);
  document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);
  document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
  });
  
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
        const { error } = await sb.auth.signInWithPassword({
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
      await sb.auth.signOut();
      location.reload();
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
  
  // ========== TARGET TRANSAKSI CARD CLICK ==========
  const targetTransaksiCard = document.getElementById('targetTransaksiCard');
  if (targetTransaksiCard) {
    targetTransaksiCard.addEventListener('click', () => {
      showInputTransaksiModal();
    });
  }
  
  // ========== START AUTH CHECK ==========
  checkSession();
  
  // Listen for auth changes
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      checkSession();
    } else if (event === 'SIGNED_OUT') {
      document.getElementById('loginPage').style.display = 'flex';
      document.getElementById('app').style.display = 'none';
      currentUser = null;
    }
  });
});
