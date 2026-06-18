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

// ========== BROADCAST UPLINE VARIABLES ==========
let uplineDataList = [];
let currentUplineIndex = 0;
let uplineNumbers = [];
let uplineMessageTemplate = '';
let isUplineBroadcasting = false;
let uplineBroadcastStatus = [];

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

// ========== DEADLINE & NOTIFICATION VARIABLES ==========
let deadlineModalOpen = false;
let pesanModalOpen = false;

// ========== HELPER FUNCTIONS ==========
function showNotif(msg, isError = false) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.className = `notif-toast ${isError ? 'notif-error' : ''}`;
    document.getElementById('notifBox').appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// ========== LOADING SCREEN FUNCTIONS ==========
let loadingSteps = [
    'Menyiapkan sistem...',
    'Memeriksa koneksi...',
    'Memuat data user...',
    'Memuat data followup...',
    'Memuat data prospek...',
    'Memuat database agent...',
    'Memuat data produk...',
    'Memuat data transaksi...',
    'Memuat database closing...',
    'Memuat database tidak tertarik...',
    'Memuat database nomor salah...',
    'Memuat database commitment...',
    'Memuat pengingat...',
    'Memuat pesan...',
    'Memuat target KPI...',
    'Menyelesaikan...'
];

let currentLoadingStep = 0;
let loadingInterval = null;

function showLoading(message = 'Memuat aplikasi...', showProgress = true) {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const progressBar = document.getElementById('loadingProgressBar');
    const stepText = document.getElementById('loadingStepText');
    
    if (overlay) {
        overlay.classList.remove('hide');
        overlay.style.display = 'flex';
    }
    
    if (loadingText) loadingText.textContent = message;
    if (progressBar && showProgress) progressBar.style.width = '0%';
    if (stepText) stepText.textContent = loadingSteps[0] || 'Memuat data...';
    
    currentLoadingStep = 0;
    
    // Animasi progress bar
    if (showProgress && progressBar) {
        let progress = 0;
        if (loadingInterval) clearInterval(loadingInterval);
        loadingInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 10;
                if (progress > 90) progress = 90;
                progressBar.style.width = progress + '%';
            }
        }, 500);
    }
}

function updateLoadingStep(step) {
    const stepText = document.getElementById('loadingStepText');
    const progressBar = document.getElementById('loadingProgressBar');
    
    if (stepText) {
        if (step < loadingSteps.length) {
            stepText.textContent = loadingSteps[step];
        } else {
            stepText.textContent = 'Memuat data...';
        }
    }
    
    // Update progress berdasarkan step
    if (progressBar) {
        const percent = Math.min(90, Math.floor((step / loadingSteps.length) * 90));
        progressBar.style.width = percent + '%';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const progressBar = document.getElementById('loadingProgressBar');
    
    if (progressBar) progressBar.style.width = '100%';
    
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
    
    if (overlay) {
        setTimeout(() => {
            overlay.classList.add('hide');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }, 300);
    }
}

async function withLoading(promise, stepName) {
    updateLoadingStep(currentLoadingStep);
    currentLoadingStep++;
    return await promise;
}

// Tambahkan fungsi ini untuk loading data di halaman tertentu
function showPageLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.add('data-loading');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay-small';
        loadingDiv.innerHTML = '<div class="loading-spinner-small"></div><p>Memuat data...</p>';
        loadingDiv.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; flex-direction: column; z-index: 100;';
        container.style.position = 'relative';
        container.appendChild(loadingDiv);
    }
}

function hidePageLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('data-loading');
        const loadingDiv = container.querySelector('.loading-overlay-small');
        if (loadingDiv) loadingDiv.remove();
    }
}

function showNotifTop(msg, isError = false) {
    // Hapus notif lama jika ada
    const oldNotifs = document.querySelectorAll('.notif-toast');
    oldNotifs.forEach(notif => notif.remove());
    
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.className = `notif-toast ${isError ? 'notif-error' : ''}`;
    notif.style.cssText = 'z-index: 9999999999 !important; position: fixed; top: 20px; right: 20px; max-width: 350px; background: ' + (isError ? '#ef4444' : '#4f46e5') + '; color: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-size: 14px;';
    document.getElementById('notifBox').appendChild(notif);
    
    // Auto remove setelah 3 detik
    setTimeout(() => {
        if (notif && notif.remove) notif.remove();
    }, 3000);
}

// ========== FUNGSI UNTUK DARKMODE MODAL DINAMIS ==========
function applyDarkModeToModal(modalElement) {
    if (!modalElement) return;
    if (!document.body.classList.contains('dark-mode')) return;
    
    const content = modalElement.querySelector('.modal-content');
    if (!content) return;
    
    // Tambahkan class untuk styling via CSS
    content.classList.add('dark-mode-content');
    
    // FORCE OVERRIDE untuk inline style yang bandel
    // Cari semua div dengan background kuning (#fef3c7) - PERINGATAN
    const warningDivs = content.querySelectorAll('div[style*="background: #fef3c7"], div[style*="background:#fef3c7"], div[style*="background: #f3c7"]');
    warningDivs.forEach(div => {
        div.style.background = '#451a03 !important';
        div.style.border = '1px solid #78350f !important';
        div.style.borderLeft = '4px solid #f59e0b !important';
        div.style.borderRadius = '12px !important';
        div.style.color = '#fcd34d !important';
        
        // Semua p di dalamnya
        div.querySelectorAll('p').forEach(p => {
            p.style.color = '#fcd34d !important';
        });
        div.querySelectorAll('strong').forEach(s => {
            s.style.color = '#fbbf24 !important';
        });
        div.querySelectorAll('span').forEach(s => {
            s.style.color = '#fcd34d !important';
        });
    });
    
    // Cari semua div dengan background biru (#eef2ff) - KETENTUAN
    const infoDivs = content.querySelectorAll('div[style*="background: #eef2ff"], div[style*="background:#eef2ff"]');
    infoDivs.forEach(div => {
        div.style.background = '#1e293b !important';
        div.style.border = '1px solid #334155 !important';
        div.style.borderRadius = '12px !important';
        
        div.querySelectorAll('p').forEach(p => {
            p.style.color = '#a5b4fc !important';
        });
        div.querySelectorAll('strong').forEach(s => {
            s.style.color = '#818cf8 !important';
        });
        div.querySelectorAll('span').forEach(s => {
            s.style.color = '#a5b4fc !important';
        });
    });
    
    // Cari header sticky di negosiasi
    const stickyHeaders = content.querySelectorAll('div[style*="position: sticky"], div[style*="position:sticky"]');
    stickyHeaders.forEach(div => {
        if (div.style.background === '#fff' || div.style.background === 'white' || div.style.background === '') {
            div.style.background = '#1e293b !important';
            div.style.borderRadius = '24px 24px 0 0 !important';
        }
        div.querySelectorAll('h3').forEach(el => el.style.color = '#f1f5f9 !important');
        div.querySelectorAll('.modal-subtitle').forEach(el => el.style.color = '#94a3b8 !important');
        div.querySelectorAll('small').forEach(el => el.style.color = '#94a3b8 !important');
    });
    
    // Background e5e7eb (progress bar) di negosiasi
    const progressBg = content.querySelectorAll('div[style*="background: #e5e7eb"], div[style*="background:#e5e7eb"]');
    progressBg.forEach(div => {
        div.style.background = '#334155 !important';
        const childDiv = div.querySelector('div[style*="background: #10b981"]');
        if (childDiv) {
            childDiv.style.background = '#10b981 !important';
        }
    });
    
    // Background f9fafb
    const grayBg = content.querySelectorAll('div[style*="background: #f9fafb"], div[style*="background:#f9fafb"]');
    grayBg.forEach(el => {
        el.style.background = '#0f172a !important';
        el.style.color = '#f1f5f9 !important';
    });
    
    // Background putih
    const whiteBg = content.querySelectorAll('div[style*="background: #fff"], div[style*="background:#fff"], div[style*="background: white"]');
    whiteBg.forEach(el => {
        if (!el.closest('.modal-buttons') && !el.closest('.detail-footer')) {
            el.style.background = '#0f172a !important';
            el.style.color = '#f1f5f9 !important';
        }
    });
    
    // Modal buttons
    const buttons = content.querySelector('.modal-buttons');
    if (buttons) {
        buttons.style.background = '#1e293b !important';
        buttons.style.borderTop = '1px solid #334155 !important';
    }
    
    // Input dan textarea
    content.querySelectorAll('input, select, textarea').forEach(el => {
        if (!el.closest('.modal-buttons')) {
            el.style.background = '#0f172a !important';
            el.style.borderColor = '#334155 !important';
            el.style.color = '#f1f5f9 !important';
        }
    });
}

// ========== FUNGSI UNTUK MEMBUAT MODAL DINAMIS YANG BISA DIKLIK ==========
function createModalWithHighZIndex(htmlContent, onClose = null) {
    // Hapus modal yang sudah ada dengan id yang sama
    const existingModal = document.querySelector('.dynamic-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal dynamic-modal';
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
    modal.innerHTML = htmlContent;
    
    // Pastikan modal content memiliki z-index tinggi dan bisa diklik
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.zIndex = '999999999';
        modalContent.style.position = 'relative';
        modalContent.style.pointerEvents = 'auto';
    }
    
    // Pastikan semua tombol di modal bisa diklik
    const buttons = modal.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
    });
    
    // Klik di luar modal untuk menutup (hanya jika onClose tersedia)
    modal.addEventListener('click', (e) => {
        if (e.target === modal && onClose) {
            onClose();
        }
    });
    
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'auto';
    applyDarkModeToModal(modal);
    
    return modal;
}

function closeDynamicModal(modal) {
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    document.body.style.pointerEvents = '';
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDaysToDate(dateStr, days) {
    if (!dateStr) return getTodayDate();
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

// ========== CLOSE MODAL ==========
function closeModal(modalId) {
    // Jika modal adalah deadline popup, gunakan fungsi khusus
    if (modalId === 'deadlinePopupModal') {
        closeDeadlinePopup();
        return;
    }
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    document.body.style.pointerEvents = '';
}

// ========== SHOW MODAL ==========
function showModal(modalId) {
    // Deadline popup dihandle terpisah
    if (modalId === 'deadlinePopupModal') {
        showDeadlinePopup();
        return;
    }
    
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn('Modal not found:', modalId);
        return;
    }
    
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
    
    const buttons = modal.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
    });
    
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'auto';
    
    applyDarkModeToModal(modal);
}

function setupModalClickOutside(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modalId);
    });
}

// ========== AUTO FORMAT FUNCTIONS (Tanpa validasi blokir) ==========
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
                activeProgress.remove();
                activeProgress = null;
            }
        },
        setTotal: (newTotal) => {
            const countEl = document.getElementById('floatingProgressCount');
            if (countEl) countEl.innerHTML = `0 / ${newTotal}`;
        }
    };
}

// ========== DARK MODE FUNCTIONS ==========
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (!darkModeToggle) return;
    
    // ===== PERBAIKAN: Cek status yang disimpan =====
    const savedMode = localStorage.getItem('darkMode');
    const isDarkMode = savedMode === 'enabled';
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.classList.add('active');
        // Update charts setelah dark mode aktif
        setTimeout(() => {
            updateChartsForDarkMode();
            // Re-render charts dengan background gelap
            if (chartCustomer) {
                chartCustomer.options.backgroundColor = '#0f172a';
                chartCustomer.update();
            }
            if (chartProspek) {
                chartProspek.options.backgroundColor = '#0f172a';
                chartProspek.update();
            }
        }, 300);
    }
    
    // ===== PERBAIKAN: Hapus event listener lama jika ada =====
    // Clone untuk menghapus semua event listener yang terpasang
    const newToggle = darkModeToggle.cloneNode(true);
    darkModeToggle.parentNode.replaceChild(newToggle, darkModeToggle);
    
    // Gunakan referensi baru
    const freshToggle = document.getElementById('darkModeToggle');
    if (!freshToggle) return;
    
    freshToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle class
        document.body.classList.toggle('dark-mode');
        this.classList.toggle('active');
        
        const isDark = document.body.classList.contains('dark-mode');
        
        if (isDark) {
            localStorage.setItem('darkMode', 'enabled');
            showNotifTop('🌙 Mode Gelap diaktifkan');
        } else {
            localStorage.setItem('darkMode', 'disabled');
            showNotifTop('☀️ Mode Terang diaktifkan');
        }
        
        // Update charts
        setTimeout(() => {
            updateChartsForDarkMode();
            
            // Force update chart background
            if (chartCustomer) {
                chartCustomer.options.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                chartCustomer.update();
            }
            if (chartProspek) {
                chartProspek.options.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                chartProspek.update();
            }
            if (targetChart) {
                targetChart.options.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                targetChart.update();
            }
            if (trendChart) {
                trendChart.options.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                trendChart.update();
            }
        }, 200);
    });
}

// ========== UPDATE CHARTS ==========
function updateChartsForDarkMode() {
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    
    // Update semua chart yang ada
    if (chartCustomer) {
        if (chartCustomer.options && chartCustomer.options.plugins && chartCustomer.options.plugins.legend) {
            chartCustomer.options.plugins.legend.labels.color = textColor;
        }
        chartCustomer.update();
    }
    
    if (chartProspek) {
        if (chartProspek.options && chartProspek.options.plugins && chartProspek.options.plugins.legend) {
            chartProspek.options.plugins.legend.labels.color = textColor;
        }
        chartProspek.update();
    }
    
    if (targetChart) {
        if (targetChart.options && targetChart.options.plugins && targetChart.options.plugins.legend) {
            targetChart.options.plugins.legend.labels.color = textColor;
        }
        targetChart.update();
    }
    
    if (trendChart) {
        if (trendChart.options && trendChart.options.plugins && trendChart.options.plugins.legend) {
            trendChart.options.plugins.legend.labels.color = textColor;
        }
        trendChart.update();
    }
    
    // Update background canvas secara langsung
    document.querySelectorAll('canvas').forEach(canvas => {
        if (isDark) {
            canvas.style.background = '#0f172a';
            canvas.style.borderRadius = '12px';
            canvas.setAttribute('style', 
                (canvas.getAttribute('style') || '') + 
                'background: #0f172a !important; border-radius: 12px !important;'
            );
        } else {
            canvas.style.background = '';
            canvas.style.borderRadius = '';
        }
    });
    
    // ===== PERBAIKAN: Update card-id di dark mode =====
    document.querySelectorAll('.card-id').forEach(el => {
        if (isDark) {
            el.style.background = '#1e293b';
            el.style.color = '#a5b4fc';
            el.style.border = '1px solid #334155';
        } else {
            el.style.background = '#eef2ff';
            el.style.color = '#4f46e5';
            el.style.border = 'none';
        }
    });
}

// ========== SIDEBAR HOVER FUNCTIONS ==========
function initSidebarHover() {
    const hoverZone = document.getElementById('hoverZone');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    
    if (!hoverZone || !sidebar) return;
    
    // ===== PERBAIKAN: Hover untuk desktop =====
    hoverZone.addEventListener('mouseenter', function(e) {
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
    
    // ===== PERBAIKAN: Tombol toggle untuk semua device =====
    if (toggleBtn) {
        // Hapus semua event listener lama dengan clone
        const newToggleBtn = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
        
        const freshToggleBtn = document.getElementById('toggleSidebarBtn');
        if (freshToggleBtn) {
            freshToggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Toggle sidebar clicked'); // Debug
                
                sidebar.classList.toggle('active');
                updateSidebarBodyClass();
                
                // Force reflow untuk memastikan animasi
                void sidebar.offsetHeight;
            });
            
            // Pastikan pointer-events aktif
            freshToggleBtn.style.pointerEvents = 'auto';
            freshToggleBtn.style.cursor = 'pointer';
            freshToggleBtn.style.position = 'relative';
            freshToggleBtn.style.zIndex = '1000';
        }
    }
    
    // ===== PERBAIKAN: Klik di luar untuk mobile =====
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && sidebar && toggleBtn && 
            !sidebar.contains(e.target) && 
            e.target !== toggleBtn && 
            !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
            updateSidebarBodyClass();
        }
    });
}

// ===== PERBAIKAN: Fungsi update sidebar body class =====
function updateSidebarBodyClass() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        document.body.classList.add('sidebar-open');
    } else {
        document.body.classList.remove('sidebar-open');
    }
}

// ========== SHOW DEADLINE POPUP ==========
function showDeadlinePopup() {
    // Cegah multiple popup
    if (deadlineModalOpen) {
        return;
    }
    
    const today = getTodayDate();
    
    // Filter data yang overdue
    const overdueCustomers = customersData.filter(c => 
        c.tanggal && c.tanggal < today && c.status !== 'closing'
    );
    const overdueProspek = prospekData.filter(p => 
        p.deadline && p.deadline < today
    );
    const totalOverdue = overdueCustomers.length + overdueProspek.length;
    
    // Filter data yang deadline hari ini
    const todayCustomers = customersData.filter(c => 
        c.tanggal === today && c.status !== 'closing'
    );
    const todayProspek = prospekData.filter(p => 
        p.deadline === today
    );
    const totalToday = todayCustomers.length + todayProspek.length;
    
    // Hapus modal lama jika ada
    const existingModal = document.getElementById('deadlinePopupModal');
    if (existingModal) {
        existingModal.remove();
        deadlineModalOpen = false;
    }
    
    // Buat modal HTML
    const modalHtml = `
        <div class="modal-content" style="max-width: 550px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; background: #fff; border-radius: 24px;">
            <div style="padding: 20px 24px 0;">
                <h3 style="font-size: 20px; margin-bottom: 4px; color: #1f2937;">📅 Info Deadline</h3>
                <div style="font-size: 13px; color: #6b7280; padding: 0 0 12px 0;">
                    Ringkasan deadline yang perlu diperhatikan
                </div>
            </div>
            
            <div style="padding: 0 24px 12px; display: flex; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 100px; background: #fef2f2; border-radius: 12px; padding: 12px 16px; border-left: 4px solid #ef4444;">
                    <div style="font-size: 24px; font-weight: 800; color: #dc2626;">${totalOverdue}</div>
                    <div style="font-size: 11px; color: #6b7280;">⚠️ Terlewat</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #fef3c7; border-radius: 12px; padding: 12px 16px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 24px; font-weight: 800; color: #d97706;">${totalToday}</div>
                    <div style="font-size: 11px; color: #6b7280;">📌 Hari Ini</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #ecfdf5; border-radius: 12px; padding: 12px 16px; border-left: 4px solid #10b981;">
                    <div style="font-size: 24px; font-weight: 800; color: #059669;">${customersData.length + prospekData.length}</div>
                    <div style="font-size: 11px; color: #6b7280;">📋 Total Data</div>
                </div>
            </div>
            
            <div style="padding: 0 24px; flex: 1; overflow-y: auto; max-height: 300px;">
                ${totalOverdue === 0 && totalToday === 0 ? `
                    <div style="text-align: center; padding: 30px 0; color: #9ca3af;">
                        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                        <p>Semua deadline terpenuhi!</p>
                    </div>
                ` : `
                    ${totalOverdue > 0 ? `
                        <div style="margin-bottom: 16px;">
                            <div style="font-weight: 600; color: #dc2626; margin-bottom: 8px; font-size: 13px;">⚠️ Terlewat (${totalOverdue})</div>
                            ${overdueCustomers.slice(0, 10).map(c => `
                                <div class="deadline-item overdue" data-id="${c.id}" data-type="customer" style="
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                    padding: 8px 12px;
                                    margin-bottom: 4px;
                                    background: #fef2f2;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    border-left: 3px solid #ef4444;
                                ">
                                    <span style="font-size: 16px;">🔴</span>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 500; font-size: 13px; color: #1f2937;">${escapeHtml(c.nama)}</div>
                                        <div style="font-size: 11px; color: #6b7280;">📅 ${c.tanggal} | 🆔 ${escapeHtml(c.agent_id || '-')}</div>
                                    </div>
                                    <button class="wa-btn-small" onclick="event.stopPropagation(); openWA('${c.hp}')" style="
                                        background: #25D366;
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        padding: 4px 10px;
                                        font-size: 11px;
                                        cursor: pointer;
                                    ">💬</button>
                                </div>
                            `).join('')}
                            ${overdueCustomers.length > 10 ? `<div style="text-align: center; font-size: 12px; color: #9ca3af; padding: 4px 0;">... dan ${overdueCustomers.length - 10} lainnya</div>` : ''}
                            ${overdueProspek.slice(0, 10).map(p => `
                                <div class="deadline-item overdue" data-id="${p.id}" data-type="prospek" style="
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                    padding: 8px 12px;
                                    margin-bottom: 4px;
                                    background: #fef2f2;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    border-left: 3px solid #ef4444;
                                ">
                                    <span style="font-size: 16px;">🔴</span>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 500; font-size: 13px; color: #1f2937;">${escapeHtml(p.nama)}</div>
                                        <div style="font-size: 11px; color: #6b7280;">📅 ${p.deadline} | 🎯 Prospek</div>
                                    </div>
                                    <button class="wa-btn-small" onclick="event.stopPropagation(); openWA('${p.hp}')" style="
                                        background: #25D366;
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        padding: 4px 10px;
                                        font-size: 11px;
                                        cursor: pointer;
                                    ">💬</button>
                                </div>
                            `).join('')}
                            ${overdueProspek.length > 10 ? `<div style="text-align: center; font-size: 12px; color: #9ca3af; padding: 4px 0;">... dan ${overdueProspek.length - 10} lainnya</div>` : ''}
                        </div>
                    ` : ''}
                    
                    ${totalToday > 0 ? `
                        <div style="margin-bottom: 16px;">
                            <div style="font-weight: 600; color: #d97706; margin-bottom: 8px; font-size: 13px;">📌 Deadline Hari Ini (${totalToday})</div>
                            ${todayCustomers.slice(0, 10).map(c => `
                                <div class="deadline-item today" data-id="${c.id}" data-type="customer" style="
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                    padding: 8px 12px;
                                    margin-bottom: 4px;
                                    background: #fef3c7;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    border-left: 3px solid #f59e0b;
                                ">
                                    <span style="font-size: 16px;">🟡</span>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 500; font-size: 13px; color: #1f2937;">${escapeHtml(c.nama)}</div>
                                        <div style="font-size: 11px; color: #6b7280;">📅 ${c.tanggal} | 🆔 ${escapeHtml(c.agent_id || '-')}</div>
                                    </div>
                                    <button class="wa-btn-small" onclick="event.stopPropagation(); openWA('${c.hp}')" style="
                                        background: #25D366;
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        padding: 4px 10px;
                                        font-size: 11px;
                                        cursor: pointer;
                                    ">💬</button>
                                </div>
                            `).join('')}
                            ${todayCustomers.length > 10 ? `<div style="text-align: center; font-size: 12px; color: #9ca3af; padding: 4px 0;">... dan ${todayCustomers.length - 10} lainnya</div>` : ''}
                            ${todayProspek.slice(0, 10).map(p => `
                                <div class="deadline-item today" data-id="${p.id}" data-type="prospek" style="
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                    padding: 8px 12px;
                                    margin-bottom: 4px;
                                    background: #fef3c7;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    border-left: 3px solid #f59e0b;
                                ">
                                    <span style="font-size: 16px;">🟡</span>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 500; font-size: 13px; color: #1f2937;">${escapeHtml(p.nama)}</div>
                                        <div style="font-size: 11px; color: #6b7280;">📅 ${p.deadline} | 🎯 Prospek</div>
                                    </div>
                                    <button class="wa-btn-small" onclick="event.stopPropagation(); openWA('${p.hp}')" style="
                                        background: #25D366;
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        padding: 4px 10px;
                                        font-size: 11px;
                                        cursor: pointer;
                                    ">💬</button>
                                </div>
                            `).join('')}
                            ${todayProspek.length > 10 ? `<div style="text-align: center; font-size: 12px; color: #9ca3af; padding: 4px 0;">... dan ${todayProspek.length - 10} lainnya</div>` : ''}
                        </div>
                    ` : ''}
                `}
            </div>
            
            <div style="padding: 16px 24px 24px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px;">
                <button onclick="closeDeadlinePopup()" class="btn-primary" style="flex: 1; padding: 12px; border: none; border-radius: 14px; font-weight: 600; cursor: pointer; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white;">Tutup</button>
            </div>
        </div>
    `;
    
    // Buat modal
    const modal = document.createElement('div');
    modal.id = 'deadlinePopupModal';
    modal.className = 'modal';
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
    modal.innerHTML = modalHtml;
    
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'auto';
    
    deadlineModalOpen = true;
    
    // Event klik untuk item deadline
    modal.querySelectorAll('.deadline-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.closest('.wa-btn-small')) return;
            
            const id = this.dataset.id;
            const type = this.dataset.type;
            closeDeadlinePopup();
            if (type === 'customer') {
                openDetailCustomer(id);
            } else if (type === 'prospek') {
                openDetailProspek(id);
            }
        });
    });
    
    // Klik di luar modal untuk tutup
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeDeadlinePopup();
        }
    });
    
    // Apply dark mode
    applyDarkModeToModal(modal);
}

// ========== CLOSE DEADLINE POPUP ==========
function closeDeadlinePopup() {
    const modal = document.getElementById('deadlinePopupModal');
    if (modal) {
        modal.remove();
        deadlineModalOpen = false;
    }
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    document.body.style.pointerEvents = '';
}

// ========== PROFILE PHOTO FUNCTIONS ==========
function initProfilePhoto() {
    const profileImg = document.getElementById('profileImg');
    const previewFoto = document.getElementById('previewFoto');
    const cameraIconBtn = document.getElementById('cameraIconBtn');
    const profileFotoInput = document.getElementById('profileFoto');
    
    if (!profileImg) return;
    
    // ===== PERBAIKAN: Click profile untuk buka modal =====
    profileImg.addEventListener('click', () => {
        loadProfileData();
        showModal('profileModal');
    });
    
    // ===== PERBAIKAN: Preview foto di modal bisa diklik =====
    if (previewFoto) {
        // Pastikan previewFoto bisa diklik
        previewFoto.style.cursor = 'pointer';
        previewFoto.style.pointerEvents = 'auto';
        
        previewFoto.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Preview foto diklik'); // Debug
            const src = this.src;
            if (src && src !== 'https://i.pravatar.cc/100' && !src.includes('pravatar')) {
                showPhotoPreview(src);
            } else {
                showNotifTop('📸 Belum ada foto profil untuk diperbesar');
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
                if (file.size > 5 * 1024 * 1024) {
                    showNotifTop('⚠️ Ukuran foto maksimal 5MB!', true);
                    return;
                }
                
                // Kompres gambar
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 300;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height = Math.round((height * MAX_SIZE) / width);
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width = Math.round((width * MAX_SIZE) / height);
                                height = MAX_SIZE;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        
                        if (previewFoto) previewFoto.src = compressedDataUrl;
                        if (profileImg) profileImg.src = compressedDataUrl;
                        showNotifTop('📷 Foto berhasil dipilih. Klik Simpan untuk menyimpan.');
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                showNotifTop('⚠️ Silakan pilih file gambar!', true);
            }
        });
    }
}

function showPhotoPreview(imageUrl) {
    const previewModal = document.getElementById('previewPhotoModal');
    const previewImage = document.getElementById('previewPhotoLarge');
    
    if (!previewModal) {
        console.warn('Preview modal not found');
        return;
    }
    
    if (!previewImage) {
        console.warn('Preview image element not found');
        return;
    }
    
    // ===== PERBAIKAN: Set image dan tampilkan modal =====
    previewImage.src = imageUrl;
    previewImage.alt = 'Foto Profil';
    previewImage.style.display = 'block';
    previewImage.style.maxWidth = '100%';
    previewImage.style.maxHeight = '70vh';
    previewImage.style.objectFit = 'contain';
    previewImage.style.margin = '0 auto';
    
    console.log('Showing photo preview:', imageUrl.substring(0, 50) + '...');
    showModal('previewPhotoModal');
}

// ===== PERBAIKAN: Load profile data =====
function loadProfileData() {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const previewFoto = document.getElementById('previewFoto');
    const profileImg = document.getElementById('profileImg');
    
    if (profileName) profileName.value = currentUserName || '';
    if (profileEmail && currentUser) profileEmail.value = currentUser.email || '';
    
    // ===== PERBAIKAN: Set foto preview =====
    if (previewFoto && profileImg) {
        // Gunakan foto dari profileImg, jika tidak ada gunakan icon default
        const fotoSrc = profileImg.src;
        if (fotoSrc && !fotoSrc.includes('pravatar') && fotoSrc !== 'https://i.pravatar.cc/40') {
            previewFoto.src = fotoSrc;
        } else {
            // Gunakan icon default yang stabil
            previewFoto.src = 'data:image/svg+xml,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <rect width="100" height="100" rx="50" fill="#4f46e5"/>
                    <text x="50" y="65" font-size="40" text-anchor="middle" fill="white" font-family="Arial">👤</text>
                </svg>
            `);
        }
    }
    
    // Load HP secara async
    if (profilePhone && currentUser) {
        profilePhone.value = '';
        window.db.from('users')
            .select('hp')
            .eq('id', currentUser.id)
            .single()
            .then(({ data }) => {
                if (data && data.hp) {
                    profilePhone.value = data.hp.replace('+62', '');
                }
            })
            .catch(() => {});
    }
}

// ===== PERBAIKAN: Save profile =====
async function saveUserProfile() {
    const nama = document.getElementById('profileName')?.value;
    let hp = document.getElementById('profilePhone')?.value;
    const foto = document.getElementById('previewFoto')?.src;
    const profileImg = document.getElementById('profileImg');
    const saveBtn = document.getElementById('saveProfileBtn');
    
    if (!nama) {
        showNotifTop('⚠️ Nama wajib diisi!', true);
        return false;
    }
    
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Menyimpan...';
        saveBtn.style.opacity = '0.6';
    }
    
    showNotifTop('⏳ Menyimpan profile...', false);
    
    try {
        if (hp) {
            hp = hp.replace(/[^\d]/g, '');
            if (hp.startsWith('0')) hp = hp.substring(1);
            if (hp && !hp.startsWith('62')) hp = '62' + hp;
            hp = '+' + hp;
        }
        
        const { data: existingUser, error: fetchError } = await window.db
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        
        // ===== PERBAIKAN: Cek apakah foto berubah =====
        let fotoUrl = existingUser?.foto || null;
        const isDefaultFoto = foto && (foto.includes('pravatar') || foto.includes('data:image/svg'));
        
        if (foto && !isDefaultFoto && !foto.startsWith('https://i.pravatar.cc')) {
            try {
                const response = await fetch(foto);
                const blob = await response.blob();
                
                const fileName = `profile_${currentUser.id}_${Date.now()}.jpg`;
                const { data: uploadData, error: uploadError } = await window.db.storage
                    .from('profiles')
                    .upload(fileName, blob, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });
                
                if (uploadError) {
                    console.warn('Upload to storage failed:', uploadError);
                    fotoUrl = foto;
                } else {
                    const { data: publicUrlData } = window.db.storage
                        .from('profiles')
                        .getPublicUrl(fileName);
                    fotoUrl = publicUrlData.publicUrl;
                }
            } catch (err) {
                console.warn('Error uploading photo:', err);
                fotoUrl = foto;
            }
        } else if (isDefaultFoto) {
            // Jika foto default, jangan ubah
            fotoUrl = existingUser?.foto || null;
        }
        
        const updateData = {
            id: currentUser.id,
            nama: nama,
            hp: hp || null,
            foto: fotoUrl,
            email: currentUser.email,
            role: existingUser?.role || 'cs',
            updated_at: new Date().toISOString()
        };
        
        const { error } = await window.db
            .from('users')
            .upsert(updateData);
        
        if (error) throw error;
        
        currentUserName = nama;
        document.getElementById('topUserName').innerText = nama;
        
        // ===== PERBAIKAN: Update profile image =====
        if (profileImg) {
            if (fotoUrl) {
                profileImg.src = fotoUrl;
            } else {
                // Gunakan icon default yang stabil
                profileImg.src = 'data:image/svg+xml,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                        <rect width="100" height="100" rx="50" fill="#4f46e5"/>
                        <text x="50" y="65" font-size="40" text-anchor="middle" fill="white" font-family="Arial">👤</text>
                    </svg>
                `);
            }
        }
        
        showNotifTop('✅ Profile berhasil disimpan!');
        closeModal('profileModal');
        return true;
        
    } catch (error) {
        console.error('Save profile error:', error);
        showNotifTop('❌ Gagal menyimpan profile: ' + error.message, true);
        return false;
        
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Simpan';
            saveBtn.style.opacity = '1';
        }
    }
}

// ========== EDIT DEADLINE FUNCTIONS ==========
function openEditDeadlineModal(id, type, currentDeadline) {
    console.log('openEditDeadlineModal dipanggil', id, type, currentDeadline);
    currentEditItem = id;
    currentEditType = type;
    
    // Hapus modal yang sudah ada
    const existingModal = document.querySelector('.edit-deadline-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal edit-deadline-modal';
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
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; z-index: 999999999; pointer-events: auto;">
            <h3>📅 Edit Deadline</h3>
            <div class="modal-subtitle">Ubah tanggal deadline untuk data ini</div>
            <div style="padding: 20px;">
                <label for="editDeadlineDateInput">Tanggal Deadline Baru <span class="required">*</span></label>
                <input type="date" id="editDeadlineDateInput" style="width:100%; padding: 12px; border-radius: 14px; border: 1.5px solid #e5e7eb; margin-top: 8px;">
            </div>
            <div style="background: #fef3c7; padding: 10px; border-radius: 10px; margin: 0 20px 10px 20px;">
                <p style="font-size: 12px; color: #d97706; margin: 0;">⚠️ <strong>Peringatan:</strong> Perubahan deadline harus diketahui oleh Owner/Atasan.</p>
            </div>
            <div class="modal-buttons" style="display: flex; gap: 12px; padding: 16px 20px 20px;">
                <button id="saveDeadlineBtnModal" class="btn-primary" style="flex: 1; cursor: pointer;">💾 Simpan Perubahan</button>
                <button id="cancelDeadlineBtnModal" class="btn-outline" style="flex: 1; cursor: pointer;">❌ Batal</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    const dateInput = document.getElementById('editDeadlineDateInput');
    if (dateInput) {
        dateInput.value = currentDeadline || getTodayDate();
    }
    
    // Event untuk tombol simpan
    const saveBtn = document.getElementById('saveDeadlineBtnModal');
    if (saveBtn) {
        saveBtn.onclick = async () => {
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
                modal.remove();
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
            } catch (e) {
                showNotifTop('❌ Gagal: ' + e.message, true);
            }
        };
    }
    
    // Event untuk tombol batal
    const cancelBtn = document.getElementById('cancelDeadlineBtnModal');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            modal.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        };
    }
    
    // Klik di luar modal untuk menutup
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }
    };
}

async function saveDeadline() {
    const newDeadline = document.getElementById('editDeadlineDate').value;
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
        closeModal('editDeadlineModal');
    } catch (e) {
        showNotifTop('❌ Gagal: ' + e.message, true);
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

// ========== OPEN DETAIL FUNCTIONS ==========
async function openDetailCustomer(id) {
    const customer = customersData.find(c => c.id === id);
    if (!customer) return;
    
    const statusText = customer.status === 'followup' ? 'Follow Up' : customer.status;
    const statusClass = customer.status === 'followup' ? 'status-followup' : `status-${customer.status}`;
    
    const progresData = customer.progres_transaksi || { items: [], total_tercapai: 0 };
    const totalTercapai = progresData.total_tercapai || 0;
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && customer.user_id !== currentUser.id) {
        try {
            const { data: userDoc } = await window.db.from('users').select('nama').eq('id', customer.user_id).single();
            const ownerName = userDoc?.nama || 'CS Agent';
            ownerInfo = `<div class="detail-info-item"><strong>👤 Pemilik Data:</strong> ${escapeHtml(ownerName)}</div>`;
        } catch(e) { console.error(e); }
    }
    
    let followupInfo = '';
    if (customer.followup_data) {
        followupInfo = `<div class="detail-info-item"><strong>✅ Follow Up:</strong><br>
            <div style="margin-top: 5px; padding-left: 15px;">
                Terkirim: ${customer.followup_data.terkirim ? 'Ya' : 'Tidak'}<br>
                Dibalas: ${customer.followup_data.dibalas ? 'Ya' : 'Tidak'}<br>
                <strong>Pesan Terkirim:</strong> ${escapeHtml(customer.followup_data.pesan || '-')}<br>
                <strong>Balasan:</strong> ${escapeHtml(customer.followup_data.balasan || '-')}
            </div>
        </div>`;
    }
    
    let pendingInfo = '';
    if (customer.pending_data && customer.pending_data.length > 0) {
        const completedCount = customer.pending_data.filter(item => item.checked === true && item.text?.trim() !== '').length;
        const totalCount = customer.pending_data.length;
        pendingInfo = `<div class="detail-info-item"><strong>📝 Pending Responses (${completedCount}/${totalCount}):</strong><br>
            <div style="margin-top: 5px; padding-left: 15px;">${customer.pending_data.slice(0, 5).map(item => `${item.checked ? '✅' : '⭕'} ${escapeHtml(item.text || '(kosong)')}`).join('<br>')}</div>
            ${customer.pending_data.length > 5 ? `<small>... dan ${customer.pending_data.length - 5} balasan lainnya</small>` : ''}
        </div>`;
    }
    
    document.getElementById('detailContent').innerHTML = `
        <div class="detail-header">
            <h3>${escapeHtml(customer.nama)}</h3>
            <div class="status-badge ${statusClass}">${statusText}</div>
        </div>
        <div class="detail-body">
            <div class="detail-info">
                ${ownerInfo}
                <div class="detail-info-item"><strong>🆔 ID Agent:</strong> ${escapeHtml(customer.agent_id || '-')}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(customer.hp)}</div>
                <div class="detail-info-item"><strong>📱 Aplikasi:</strong> ${escapeHtml(customer.apk || '-')}</div>
                <div class="detail-info-item"><strong>👤 Upline:</strong> ${escapeHtml(customer.upline_name || '-')}</div>
                <div class="detail-info-item"><strong>📞 No. Upline:</strong> ${escapeHtml(customer.upline_phone || '-')}</div>
                <div class="detail-info-item"><strong>📅 Deadline:</strong> ${customer.tanggal || '-'} <button class="edit-deadline-btn" onclick="openEditDeadlineModal('${id}','customer','${customer.tanggal || ''}')">✏️ Edit</button></div>
                <div class="detail-info-item"><strong>🎯 Total Transaksi Tercapai:</strong> <span style="color: ${totalTercapai >= 0 ? '#10b981' : '#ef4444'}; font-weight: 700;">${totalTercapai > 0 ? '+' : ''}${totalTercapai.toLocaleString()} Transaksi</span></div>
                ${followupInfo}
                ${pendingInfo}
            </div>
            <div class="detail-actions">
                <button class="btn-success" onclick="openWA('${customer.hp}')">💬 WhatsApp</button>
                ${customer.status === 'baru' ? `<button class="btn-primary" onclick="updateCustomerStatus('${id}', 'followup')">📞 Lanjut Follow Up</button>` : ''}
                ${customer.status === 'followup' ? `<button class="btn-primary" onclick="openFollowupConfirm('${id}')">✅ Konfirmasi Follow Up</button>` : ''}
                ${customer.status === 'pending' ? `<button class="btn-primary" onclick="openPendingModal('${id}')">📝 Kelola Pending</button>` : ''}
                ${customer.status === 'closing' ? `<button class="btn-primary" onclick="confirmClosingToDB('${id}')">📁 Pindah ke DB Closing</button>` : ''}
            </div>
        </div>
        <div class="detail-footer">
            <button class="btn-outline" onclick="closeModal('detailModal')">Tutup</button>
            <button class="btn-danger" onclick="deleteCustomer('${id}')">Hapus</button>
        </div>
    `;
    showModal('detailModal');
}

// ========== FUNGSI OPEN DETAIL PROSPEK ==========
async function openDetailProspek(id) {
    const prospek = prospekData.find(p => p.id === id);
    if (!prospek) return;
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && prospek.user_id !== currentUser.id) {
        try {
            const { data: userDoc } = await window.db.from('users').select('nama').eq('id', prospek.user_id).single();
            const ownerName = userDoc?.nama || 'CS Agent';
            ownerInfo = `<div class="detail-info-item"><strong>👤 Pemilik Data:</strong> ${escapeHtml(ownerName)}</div>`;
        } catch(e) { console.error(e); }
    }
    
    let negosiasiInfo = '';
    if (prospek.negosiasi_data) {
        const nd = prospek.negosiasi_data;
        negosiasiInfo = `<div class="detail-info-item"><strong>📋 Data Negosiasi:</strong><br>
            <div style="margin-top: 5px; padding-left: 15px;">
                Aplikasi: ${escapeHtml(nd.aplikasi || '-')}<br>
                Domisili: ${escapeHtml(nd.domisili || '-')}<br>
                Transaksi: ${escapeHtml(nd.transaksi || '-')}<br>
                Deposit: ${escapeHtml(nd.deposit || '-')}<br>
                Tertarik: ${escapeHtml(nd.tertarik || '-')}<br>
                Penawaran: ${escapeHtml(nd.penawaran || '-')}
            </div>
        </div>`;
    }
    
    let dihubungiInfo = '';
    if (prospek.dihubungi_data) {
        dihubungiInfo = `<div class="detail-info-item"><strong>✅ Dihubungi:</strong><br>
            <div style="margin-top: 5px; padding-left: 15px;">
                Terkirim: ${prospek.dihubungi_data.terkirim ? 'Ya' : 'Tidak'}<br>
                Dibalas: ${prospek.dihubungi_data.dibalas ? 'Ya' : 'Tidak'}<br>
                <strong>Pesan Terkirim:</strong> ${escapeHtml(prospek.dihubungi_data.pesan || '-')}<br>
                <strong>Balasan:</strong> ${escapeHtml(prospek.dihubungi_data.balasan || '-')}
            </div>
        </div>`;
    }
    
    let followupInfo = '';
    if (prospek.followup_data) {
        followupInfo = `<div class="detail-info-item"><strong>✅ Follow Up:</strong><br>
            <div style="margin-top: 5px; padding-left: 15px;">
                Terkirim: ${prospek.followup_data.terkirim ? 'Ya' : 'Tidak'}<br>
                Dibalas: ${prospek.followup_data.dibalas ? 'Ya' : 'Tidak'}<br>
                <strong>Pesan Terkirim:</strong> ${escapeHtml(prospek.followup_data.pesan || '-')}<br>
                <strong>Balasan:</strong> ${escapeHtml(prospek.followup_data.balasan || '-')}
            </div>
        </div>`;
    }
    
    document.getElementById('detailContent').innerHTML = `
        <div class="detail-header">
            <h3>${escapeHtml(prospek.nama)}</h3>
            <div class="status-badge">${prospek.status || 'Baru'}</div>
        </div>
        <div class="detail-body">
            <div class="detail-info">
                ${ownerInfo}
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(prospek.hp)}</div>
                <div class="detail-info-item"><strong>📅 Deadline:</strong> ${prospek.deadline || '-'} <button class="edit-deadline-btn" onclick="openEditDeadlineModal('${id}','prospek','${prospek.deadline || ''}')">✏️ Edit</button></div>
                <div class="detail-info-item"><strong>👤 Upline:</strong> ${escapeHtml(prospek.upline_name || '-')}</div>
                <div class="detail-info-item"><strong>📞 No. Upline:</strong> ${escapeHtml(prospek.upline_phone || '-')}</div>
                ${dihubungiInfo}
                ${followupInfo}
                ${negosiasiInfo}
            </div>
            <div class="detail-actions">
                <button class="btn-success" onclick="openWA('${prospek.hp}')">💬 WhatsApp</button>
                ${prospek.status === 'Baru' ? `<button class="btn-primary" onclick="updateProspekStatus('${id}', 'Dihubungi')">📞 Dihubungi</button>` : ''}
                ${prospek.status === 'Dihubungi' ? `<button class="btn-primary" onclick="openProspekDihubungiConfirm('${id}')">✅ Konfirmasi Dihubungi</button>` : ''}
                ${prospek.status === 'Negosiasi' ? `<button class="btn-primary" onclick="openProspekNegosiasiModal('${id}')">📝 Kelola Negosiasi</button>` : ''}
                ${prospek.status === 'Negosiasi' && prospek.negosiasi_data?.is_complete ? `<button class="btn-primary" onclick="updateProspekStatus('${id}', 'Tertarik')">⭐ Tertarik</button>` : ''}
                ${prospek.status === 'Tertarik' ? `<button class="btn-primary" onclick="confirmTertarikToDB('${id}')">⭐ Jadikan Member Baru</button>` : ''}
            </div>
        </div>
        <div class="detail-footer">
            <button class="btn-outline" onclick="closeModal('detailModal')">Tutup</button>
            <button class="btn-danger" onclick="deleteProspek('${id}')">Hapus</button>
        </div>
    `;
    showModal('detailModal');
}

// ========== FOLLOWUP CONFIRMATION FUNCTIONS ==========
function openFollowupConfirm(id) {
    currentPendingId = id;
    
    window.db.from('customers').select('*').eq('id', id).single().then(({ data: existingData }) => {
        // ===== PERBAIKAN: Hitung jumlah followup =====
        const followupHistory = existingData?.followup_history || [];
        const followupCount = followupHistory.length;
        const nextFollowupNumber = followupCount + 1;
        
        // ===== PERBAIKAN: Ambil pesan terakhir untuk validasi =====
        const lastPesan = followupHistory.length > 0 ? followupHistory[followupHistory.length - 1].pesan : '';
        
        const modal = createModalWithHighZIndex(`
            <div class="modal-content" style="max-width: 500px;">
                <h3>✅ Konfirmasi Follow Up #${nextFollowupNumber}</h3>
                <div class="modal-subtitle">Pastikan sudah melakukan komunikasi dengan customer</div>
                <div style="background: #eef2ff; padding: 12px; border-radius: 10px; margin: 0 20px 10px 20px;">
                    <p style="font-size: 12px; color: #4f46e5; margin: 0;">📌 <strong>Ketentuan:</strong><br>
                    • Centang checklist dan isi pesan untuk menyimpan (deadline +1 hari)<br>
                    • Isi BALASAN untuk dapat pindah ke Pending<br>
                    • Pesan yang dikirim harus BERBEDA dari sebelumnya</p>
                </div>
                <div style="padding: 0 20px;">
                    <div class="form-group">
                        <label><input type="checkbox" id="followup_terkirim" style="margin-right: 8px;" ${existingData?.followup_data?.terkirim ? 'checked' : ''}> Apakah pesan sudah terkirim dan terbaca? <span style="color: #ef4444;">*</span></label>
                    </div>
                    <div class="form-group">
                        <label>Isi Pesan yang Dikirim <span style="color: #ef4444;">*</span></label>
                        <textarea id="followup_pesan" rows="3" placeholder="Tulis pesan yang dikirim ke customer..." style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">${escapeHtml(existingData?.followup_data?.pesan || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="followup_dibalas" style="margin-right: 8px;" ${existingData?.followup_data?.dibalas ? 'checked' : ''}> Apakah sudah di balas? <span style="color: #ef4444;">*</span></label>
                    </div>
                    <div class="form-group">
                        <label>Balasan dari Customer <span style="color: #ef4444;">*</span></label>
                        <textarea id="followup_balasan" rows="2" placeholder="Tulis balasan dari customer..." style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">${escapeHtml(existingData?.followup_data?.balasan || '')}</textarea>
                    </div>
                    <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 8px; margin-top: 8px;">
                        <small>📊 <strong>Riwayat Followup:</strong> ${followupCount} kali sebelumnya</small>
                        ${followupCount > 0 ? `<br><small style="color: #6b7280;">📝 Pesan terakhir: "${escapeHtml(lastPesan.substring(0, 30))}${lastPesan.length > 30 ? '...' : ''}"</small>` : ''}
                    </div>
                </div>
                <div class="modal-buttons" style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button id="followupSaveBtn" class="btn-primary" style="flex: 1;" disabled>💾 Simpan (+1 hari)</button>
                    <button id="followupMoveBtn" class="btn-success" style="flex: 1;" disabled>📋 Simpan & Pindah ke Pending</button>
                    <button id="followupConfirmNo" class="btn-danger" style="flex: 1;">📵 Nomor salah</button>
                    <button id="followupConfirmCancel" class="btn-outline" style="flex: 1;">❌ Batal</button>
                </div>
            </div>
        `, () => closeDynamicModal(modal));
        
        const cb1 = modal.querySelector('#followup_terkirim');
        const cb2 = modal.querySelector('#followup_dibalas');
        const pesanInput = modal.querySelector('#followup_pesan');
        const balasanInput = modal.querySelector('#followup_balasan');
        const saveBtn = modal.querySelector('#followupSaveBtn');
        const moveBtn = modal.querySelector('#followupMoveBtn');
        const noBtn = modal.querySelector('#followupConfirmNo');
        const cancelBtn = modal.querySelector('#followupConfirmCancel');
        
        // ===== PERBAIKAN: Validasi form tanpa peringatan =====
        function validateForm() {
            const isChecked = cb1.checked;
            const hasPesan = pesanInput.value.trim() !== '';
            const hasBalasan = balasanInput.value.trim() !== '';
            const isDibalas = cb2.checked;
            
            // ===== Cek apakah pesan berbeda dari sebelumnya =====
            const previousPesan = followupHistory.length > 0 ? followupHistory[followupHistory.length - 1].pesan : '';
            const isDifferent = pesanInput.value.trim() !== previousPesan.trim();
            
            // ===== Kondisi untuk tombol Simpan =====
            const canSave = isChecked && hasPesan && isDifferent;
            
            // ===== Kondisi untuk tombol Pindah =====
            const canMove = isChecked && hasPesan && isDifferent && hasBalasan && isDibalas;
            
            // ===== Update tombol Simpan =====
            if (canSave) {
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                saveBtn.style.background = '#4f46e5';
                saveBtn.style.cursor = 'pointer';
            } else {
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.6';
                saveBtn.style.background = '#9ca3af';
                saveBtn.style.cursor = 'not-allowed';
            }
            
            // ===== Update tombol Pindah =====
            if (canMove) {
                moveBtn.disabled = false;
                moveBtn.style.opacity = '1';
                moveBtn.style.background = '#10b981';
                moveBtn.style.cursor = 'pointer';
            } else {
                moveBtn.disabled = true;
                moveBtn.style.opacity = '0.6';
                moveBtn.style.background = '#9ca3af';
                moveBtn.style.cursor = 'not-allowed';
            }
        }
        
        cb1.onclick = validateForm;
        cb2.onclick = validateForm;
        pesanInput.oninput = validateForm;
        balasanInput.oninput = validateForm;
        validateForm();
        
        // ===== Tombol Simpan (Hanya simpan, tidak pindah) =====
        saveBtn.onclick = async () => {
            if (saveBtn.disabled) {
                showNotifTop('⚠️ Harap centang checklist dan isi pesan yang berbeda!', true);
                return;
            }
            
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Menyimpan...';
            
            try {
                const { data: doc } = await window.db.from('customers').select('*').eq('id', id).single();
                if (!doc) {
                    showNotifTop('❌ Data customer tidak ditemukan!', true);
                    return;
                }
                
                const newDeadline = addDaysFromToday(1);
                const followupHistory = doc.followup_history || [];
                
                const followupData = {
                    terkirim: true,
                    dibalas: cb2.checked,
                    pesan: pesanInput.value,
                    balasan: balasanInput.value || null,
                    timestamp: new Date().toISOString(),
                    followup_number: followupHistory.length + 1
                };
                
                const updatedHistory = [...followupHistory, {
                    pesan: pesanInput.value,
                    balasan: balasanInput.value || null,
                    timestamp: new Date().toISOString(),
                    followup_number: followupHistory.length + 1,
                    dibalas: cb2.checked
                }];
                
                await window.db.from('customers').update({
                    followup_data: followupData,
                    followup_history: updatedHistory,
                    tanggal: newDeadline,
                    pesan_terkirim: pesanInput.value,
                    balasan_diterima: balasanInput.value || null,
                    pesan_dikirim_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }).eq('id', id);
                
                closeDynamicModal(modal);
                showNotifTop(`✅ Followup #${followupHistory.length + 1} tersimpan! Deadline +1 hari menjadi ${newDeadline}`);
                await loadCustomers();
                closeModal('detailModal');
                
            } catch (err) {
                console.error('Error:', err);
                showNotifTop('❌ Gagal: ' + err.message, true);
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Simpan (+1 hari)';
            }
        };
        
        // ===== Tombol Pindah (Simpan + Pindah ke Pending) =====
        moveBtn.onclick = async () => {
            if (moveBtn.disabled) {
                showNotifTop('⚠️ Harap lengkapi semua data termasuk balasan!', true);
                return;
            }
            
            if (!confirm('Pindahkan data ke Pending? Pastikan semua data sudah lengkap.')) {
                return;
            }
            
            moveBtn.disabled = true;
            moveBtn.textContent = '⏳ Memproses...';
            
            try {
                const { data: doc } = await window.db.from('customers').select('*').eq('id', id).single();
                if (!doc) {
                    showNotifTop('❌ Data customer tidak ditemukan!', true);
                    return;
                }
                
                const newDeadline = addDaysFromToday(1);
                const followupHistory = doc.followup_history || [];
                
                const followupData = {
                    terkirim: true,
                    dibalas: true,
                    pesan: pesanInput.value,
                    balasan: balasanInput.value,
                    timestamp: new Date().toISOString(),
                    followup_number: followupHistory.length + 1
                };
                
                const updatedHistory = [...followupHistory, {
                    pesan: pesanInput.value,
                    balasan: balasanInput.value,
                    timestamp: new Date().toISOString(),
                    followup_number: followupHistory.length + 1,
                    dibalas: true
                }];
                
                await window.db.from('customers').update({
                    followup_data: followupData,
                    followup_history: updatedHistory,
                    status: 'pending',
                    tanggal: newDeadline,
                    pesan_terkirim: pesanInput.value,
                    balasan_diterima: balasanInput.value,
                    pesan_dikirim_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }).eq('id', id);
                
                closeDynamicModal(modal);
                showNotifTop(`✅ Followup #${followupHistory.length + 1} selesai! Data dipindahkan ke Pending. Deadline +1 hari menjadi ${newDeadline}`);
                await loadCustomers();
                closeModal('detailModal');
                
            } catch (err) {
                console.error('Error:', err);
                showNotifTop('❌ Gagal: ' + err.message, true);
            } finally {
                moveBtn.disabled = false;
                moveBtn.textContent = '📋 Simpan & Pindah ke Pending';
            }
        };
        
        // ===== Tombol Nomor Salah =====
        noBtn.onclick = async () => {
            const { data: doc } = await window.db.from('customers').select('*').eq('id', id).single();
            if (!doc) {
                showNotifTop('❌ Data customer tidak ditemukan!', true);
                return;
            }
            
            if (confirm(`Pindahkan "${escapeHtml(doc.nama)}" ke Database Nomor Salah?`)) {
                try {
                    const nomorSalahData = {
                        nama: doc.nama || 'Tidak ada nama',
                        hp: doc.hp || '',
                        alasan: 'Nomor tidak bisa dihubungi / tidak aktif',
                        deleted_at: new Date().toISOString()
                    };
                    
                    await window.db.from('nomor_salah').insert(nomorSalahData);
                    await window.db.from('customers').delete().eq('id', id);
                    
                    showNotifTop('📵 Data dipindahkan ke Database Nomor Salah');
                    closeDynamicModal(modal);
                    await loadCustomers();
                    await loadDBNomorSalah();
                    closeModal('detailModal');
                } catch (err) {
                    showNotifTop('❌ Gagal: ' + err.message, true);
                }
            }
        };
        
        cancelBtn.onclick = () => {
            closeDynamicModal(modal);
        };
    }).catch(err => {
        console.error('❌ Error load customer:', err);
        showNotifTop('❌ Gagal memuat data: ' + err.message, true);
    });
}

// ========== PROSPEK DIHUBUNGI CONFIRMATION ==========
function openProspekDihubungiConfirm(id) {
    currentProspekId = id;
    
    window.db.from('prospek').select('*').eq('id', id).single().then(({ data: existingData }) => {
        // ===== PERBAIKAN: Hitung jumlah dihubungi =====
        const dihubungiHistory = existingData?.dihubungi_history || [];
        const dihubungiCount = dihubungiHistory.length;
        const nextDihubungiNumber = dihubungiCount + 1;
        
        // ===== PERBAIKAN: Ambil pesan terakhir untuk validasi =====
        const lastPesan = dihubungiHistory.length > 0 ? dihubungiHistory[dihubungiHistory.length - 1].pesan : '';
        
        const modal = createModalWithHighZIndex(`
            <div class="modal-content" style="max-width: 500px;">
                <h3>✅ Konfirmasi Dihubungi #${nextDihubungiNumber}</h3>
                <div class="modal-subtitle">Pastikan sudah melakukan komunikasi dengan prospek</div>
                <div style="background: #eef2ff; padding: 12px; border-radius: 10px; margin: 0 20px 10px 20px;">
                    <p style="font-size: 12px; color: #4f46e5; margin: 0;">📌 <strong>Ketentuan:</strong><br>
                    • Centang checklist dan isi pesan untuk menyimpan (deadline +5 hari)<br>
                    • Isi BALASAN untuk dapat pindah ke Negosiasi<br>
                    • Pesan yang dikirim harus BERBEDA dari sebelumnya</p>
                </div>
                <div style="padding: 0 20px;">
                    <div class="form-group">
                        <label><input type="checkbox" id="prospek_terkirim" style="margin-right: 8px;" ${existingData?.dihubungi_data?.terkirim ? 'checked' : ''}> Apakah pesan sudah terkirim dan terbaca? <span style="color: #ef4444;">*</span></label>
                    </div>
                    <div class="form-group">
                        <label>Isi Pesan yang Dikirim <span style="color: #ef4444;">*</span></label>
                        <textarea id="prospek_pesan" rows="3" placeholder="Tulis pesan yang dikirim ke prospek..." style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">${escapeHtml(existingData?.dihubungi_data?.pesan || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="prospek_dibalas" style="margin-right: 8px;" ${existingData?.dihubungi_data?.dibalas ? 'checked' : ''}> Apakah sudah di balas? <span style="color: #ef4444;">*</span></label>
                    </div>
                    <div class="form-group">
                        <label>Balasan dari Prospek <span style="color: #ef4444;">*</span></label>
                        <textarea id="prospek_balasan" rows="2" placeholder="Tulis balasan dari prospek..." style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">${escapeHtml(existingData?.dihubungi_data?.balasan || '')}</textarea>
                    </div>
                    <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 8px; margin-top: 8px;">
                        <small>📊 <strong>Riwayat Dihubungi:</strong> ${dihubungiCount} kali sebelumnya</small>
                        ${dihubungiCount > 0 ? `<br><small style="color: #6b7280;">📝 Pesan terakhir: "${escapeHtml(lastPesan.substring(0, 30))}${lastPesan.length > 30 ? '...' : ''}"</small>` : ''}
                    </div>
                </div>
                <div class="modal-buttons" style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button id="prospekSaveBtn" class="btn-primary" style="flex: 1;" disabled>💾 Simpan (+5 hari)</button>
                    <button id="prospekMoveBtn" class="btn-success" style="flex: 1;" disabled>📋 Simpan & Pindah ke Negosiasi</button>
                    <button id="prospekConfirmNo" class="btn-danger" style="flex: 1;">📵 Nomor salah</button>
                    <button id="prospekConfirmCancel" class="btn-outline" style="flex: 1;">❌ Batal</button>
                </div>
            </div>
        `, () => closeDynamicModal(modal));
        
        const cb1 = modal.querySelector('#prospek_terkirim');
        const cb2 = modal.querySelector('#prospek_dibalas');
        const pesanInput = modal.querySelector('#prospek_pesan');
        const balasanInput = modal.querySelector('#prospek_balasan');
        const saveBtn = modal.querySelector('#prospekSaveBtn');
        const moveBtn = modal.querySelector('#prospekMoveBtn');
        const noBtn = modal.querySelector('#prospekConfirmNo');
        const cancelBtn = modal.querySelector('#prospekConfirmCancel');
        
        // ===== PERBAIKAN: Validasi form tanpa peringatan =====
        function validateForm() {
            const isChecked = cb1.checked;
            const hasPesan = pesanInput.value.trim() !== '';
            const hasBalasan = balasanInput.value.trim() !== '';
            const isDibalas = cb2.checked;
            
            // ===== Cek apakah pesan berbeda dari sebelumnya =====
            const previousPesan = dihubungiHistory.length > 0 ? dihubungiHistory[dihubungiHistory.length - 1].pesan : '';
            const isDifferent = pesanInput.value.trim() !== previousPesan.trim();
            
            // ===== Kondisi untuk tombol Simpan =====
            const canSave = isChecked && hasPesan && isDifferent;
            
            // ===== Kondisi untuk tombol Pindah =====
            const canMove = isChecked && hasPesan && isDifferent && hasBalasan && isDibalas;
            
            // ===== Update tombol Simpan =====
            if (canSave) {
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                saveBtn.style.background = '#4f46e5';
                saveBtn.style.cursor = 'pointer';
            } else {
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.6';
                saveBtn.style.background = '#9ca3af';
                saveBtn.style.cursor = 'not-allowed';
            }
            
            // ===== Update tombol Pindah =====
            if (canMove) {
                moveBtn.disabled = false;
                moveBtn.style.opacity = '1';
                moveBtn.style.background = '#10b981';
                moveBtn.style.cursor = 'pointer';
            } else {
                moveBtn.disabled = true;
                moveBtn.style.opacity = '0.6';
                moveBtn.style.background = '#9ca3af';
                moveBtn.style.cursor = 'not-allowed';
            }
        }
        
        cb1.onclick = validateForm;
        cb2.onclick = validateForm;
        pesanInput.oninput = validateForm;
        balasanInput.oninput = validateForm;
        validateForm();
        
        // ===== Tombol Simpan (Hanya simpan, tidak pindah) =====
        saveBtn.onclick = async () => {
            if (saveBtn.disabled) {
                showNotifTop('⚠️ Harap centang checklist dan isi pesan yang berbeda!', true);
                return;
            }
            
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Menyimpan...';
            
            try {
                const { data: doc } = await window.db.from('prospek').select('*').eq('id', id).single();
                if (!doc) {
                    showNotifTop('❌ Data prospek tidak ditemukan!', true);
                    return;
                }
                
                const newDeadline = addDaysFromToday(5);
                const dihubungiHistory = doc.dihubungi_history || [];
                
                const dihubungiData = {
                    terkirim: true,
                    dibalas: cb2.checked,
                    pesan: pesanInput.value,
                    balasan: balasanInput.value || null,
                    timestamp: new Date().toISOString(),
                    dihubungi_number: dihubungiHistory.length + 1
                };
                
                const updatedHistory = [...dihubungiHistory, {
                    pesan: pesanInput.value,
                    balasan: balasanInput.value || null,
                    timestamp: new Date().toISOString(),
                    dihubungi_number: dihubungiHistory.length + 1,
                    dibalas: cb2.checked
                }];
                
                await window.db.from('prospek').update({
                    dihubungi_data: dihubungiData,
                    dihubungi_history: updatedHistory,
                    deadline: newDeadline,
                    pesan_terkirim: pesanInput.value,
                    balasan_diterima: balasanInput.value || null,
                    pesan_dikirim_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }).eq('id', id);
                
                closeDynamicModal(modal);
                showNotifTop(`✅ Dihubungi #${dihubungiHistory.length + 1} tersimpan! Deadline +5 hari menjadi ${newDeadline}`);
                await loadProspek();
                closeModal('detailModal');
                
            } catch (err) {
                console.error('Error:', err);
                showNotifTop('❌ Gagal: ' + err.message, true);
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Simpan (+5 hari)';
            }
        };
        
        // ===== Tombol Pindah (Simpan + Pindah ke Negosiasi) =====
        moveBtn.onclick = async () => {
            if (moveBtn.disabled) {
                showNotifTop('⚠️ Harap lengkapi semua data termasuk balasan!', true);
                return;
            }
            
            if (!confirm('Pindahkan data ke Negosiasi? Pastikan semua data sudah lengkap.')) {
                return;
            }
            
            moveBtn.disabled = true;
            moveBtn.textContent = '⏳ Memproses...';
            
            try {
                const { data: doc } = await window.db.from('prospek').select('*').eq('id', id).single();
                if (!doc) {
                    showNotifTop('❌ Data prospek tidak ditemukan!', true);
                    return;
                }
                
                const newDeadline = addDaysFromToday(5);
                const dihubungiHistory = doc.dihubungi_history || [];
                
                const dihubungiData = {
                    terkirim: true,
                    dibalas: true,
                    pesan: pesanInput.value,
                    balasan: balasanInput.value,
                    timestamp: new Date().toISOString(),
                    dihubungi_number: dihubungiHistory.length + 1
                };
                
                const updatedHistory = [...dihubungiHistory, {
                    pesan: pesanInput.value,
                    balasan: balasanInput.value,
                    timestamp: new Date().toISOString(),
                    dihubungi_number: dihubungiHistory.length + 1,
                    dibalas: true
                }];
                
                await window.db.from('prospek').update({
                    dihubungi_data: dihubungiData,
                    dihubungi_history: updatedHistory,
                    status: 'Negosiasi',
                    deadline: newDeadline,
                    pesan_terkirim: pesanInput.value,
                    balasan_diterima: balasanInput.value,
                    pesan_dikirim_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }).eq('id', id);
                
                closeDynamicModal(modal);
                showNotifTop(`✅ Dihubungi #${dihubungiHistory.length + 1} selesai! Data dipindahkan ke Negosiasi. Deadline +5 hari menjadi ${newDeadline}`);
                await loadProspek();
                closeModal('detailModal');
                
            } catch (err) {
                console.error('Error:', err);
                showNotifTop('❌ Gagal: ' + err.message, true);
            } finally {
                moveBtn.disabled = false;
                moveBtn.textContent = '📋 Simpan & Pindah ke Negosiasi';
            }
        };
        
        // ===== Tombol Nomor Salah =====
        noBtn.onclick = async () => {
            const { data: doc } = await window.db.from('prospek').select('*').eq('id', id).single();
            if (!doc) {
                showNotifTop('❌ Data prospek tidak ditemukan!', true);
                return;
            }
            
            if (confirm(`Pindahkan "${escapeHtml(doc.nama)}" ke Database Nomor Salah?`)) {
                try {
                    const nomorSalahData = {
                        nama: doc.nama || 'Tidak ada nama',
                        hp: doc.hp || '',
                        alasan: 'Nomor tidak bisa dihubungi / tidak aktif',
                        deleted_at: new Date().toISOString()
                    };
                    
                    await window.db.from('nomor_salah').insert(nomorSalahData);
                    await window.db.from('prospek').delete().eq('id', id);
                    
                    showNotifTop('📵 Data dipindahkan ke Database Nomor Salah');
                    closeDynamicModal(modal);
                    await loadProspek();
                    await loadDBNomorSalah();
                    closeModal('detailModal');
                } catch (err) {
                    showNotifTop('❌ Gagal: ' + err.message, true);
                }
            }
        };
        
        cancelBtn.onclick = () => {
            closeDynamicModal(modal);
        };
    }).catch(err => {
        console.error('❌ Error load prospek:', err);
        showNotifTop('❌ Gagal memuat data: ' + err.message, true);
    });
}

// ========== PENDING MODAL FUNCTIONS ==========
function openPendingModal(id) {
    currentPendingId = id;
    
    window.db.from('customers').select('*').eq('id', id).single().then(({ data }) => {
        pendingItems = data.pending_data || [];
        
        const modal = createModalWithHighZIndex(`
            <div class="modal-content" style="max-width: 500px;">
                <h3>📝 Catatan Pending</h3>
                <div class="modal-subtitle">Catat setiap balasan/respon dari customer</div>
                <div style="background: #eef2ff; padding: 12px; border-radius: 10px; margin: 0 20px 10px 20px;">
                    <p style="font-size: 12px; color: #4f46e5; margin: 0;">📌 <strong>Ketentuan:</strong><br>
                    • Setiap kali menyimpan data pending, deadline akan bertambah 2 hari dari HARI INI<br>
                    • Setelah semua balasan terisi dan tercentang, Anda dapat melanjutkan ke Closing</p>
                </div>
                <div id="pendingItemsContainer" style="max-height: 300px; overflow-y: auto; padding: 0 20px;"></div>
                <button id="addPendingItemBtn" class="add-btn" style="margin: 10px 20px; width: calc(100% - 40px);">+ Tambah Balasan</button>
                <div class="modal-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="pendingFinishBtn" class="btn-success" style="flex: 1;" disabled>✅ Selesai & Lanjut ke Closing</button>
                    <button id="pendingSaveBtn" class="btn-primary" style="flex: 1;">💾 Simpan (Deadline +2 hari)</button>
                    <button id="pendingCancelBtn" class="btn-outline" style="flex: 1;">Batal</button>
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
            finishBtn.style.cursor = 'pointer';
            const newFinishBtn = finishBtn.cloneNode(true);
            finishBtn.parentNode.replaceChild(newFinishBtn, finishBtn);
            newFinishBtn.onclick = async () => {
                await window.db.from('customers').update({ pending_data: pendingItems }).eq('id', currentPendingId);
                // Pindah ke Closing dengan deadline tanggal 1 bulan depan
                await updateCustomerStatus(currentPendingId, 'closing');
                closeDynamicModal(modal);
            };
        } else {
            finishBtn.disabled = true;
            finishBtn.style.opacity = '0.5';
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
            
            // Deadline bertambah 2 hari dari HARI INI (bukan dari deadline lama)
            const newDeadline = addDaysFromToday(2);
            await window.db.from('customers').update({
                pending_data: pendingItems,
                tanggal: newDeadline
            }).eq('id', currentPendingId);
            
            showNotifTop(`💾 Data pending berhasil disimpan. Deadline +2 hari dari hari ini menjadi ${newDeadline}`);
            closeDynamicModal(modal);
            await loadCustomers();
        };
    }
    
    const cancelBtn = modal.querySelector('#pendingCancelBtn');
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.onclick = () => {
            closeDynamicModal(modal);
        };
    }
}

// ========== PROSPEK NEGOSIASI MODAL ==========
function openProspekNegosiasiModal(id) {
    currentProspekId = id;
    
    const existingModal = document.getElementById('prospekNegosiasiModalFix');
    if (existingModal) existingModal.remove();
    
    window.db.from('prospek').select('*').eq('id', id).single().then(({ data }) => {
        const modal = document.createElement('div');
        modal.id = 'prospekNegosiasiModalFix';
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.8) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 999999999 !important;
            backdrop-filter: blur(5px) !important;
        `;
        
        // Hitung persentase kelengkapan data negosiasi
        const negosiasiData = data.negosiasi_data || {};
        const fields = ['aplikasi', 'domisili', 'transaksi', 'deposit', 'tertarik', 'penawaran'];
        const filledFields = fields.filter(f => negosiasiData[f] && negosiasiData[f] !== '');
        const completePercent = Math.round((filledFields.length / fields.length) * 100);
        const isComplete = filledFields.length === fields.length;
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; max-height: 85vh; overflow-y: auto; background: #fff; border-radius: 24px;">
                <div style="position: sticky; top: 0; background: #fff; border-radius: 24px 24px 0 0; z-index: 10;">
                    <h3 style="font-size: 20px; padding: 20px 20px 0; color: #1f2937;">📋 Kuesioner Negosiasi</h3>
                    <div class="modal-subtitle" style="font-size: 12px; color: #6b7280; padding: 0 20px 12px; border-bottom: 1px solid #f0f0f0;">
                        Isi data kuesioner di bawah ini
                        <div style="margin-top: 8px; background: #e5e7eb; border-radius: 10px; height: 6px; overflow: hidden;">
                            <div style="width: ${completePercent}%; height: 100%; background: #10b981; border-radius: 10px; transition: width 0.3s;"></div>
                        </div>
                        <small>Kelengkapan data: ${completePercent}% (${filledFields.length}/${fields.length})</small>
                    </div>
                </div>
                <div style="background: #eef2ff; padding: 12px; border-radius: 10px; margin: 0 20px 10px 20px;">
                    <p style="font-size: 12px; color: #4f46e5; margin: 0;">📌 <strong>Ketentuan:</strong><br>
                    • Setiap kali menyimpan data kuesioner, deadline akan bertambah 5 hari dari HARI INI<br>
                    • Setelah semua data terisi, Anda dapat memindahkan ke Tertarik (deadline +1 hari dari HARI INI)</p>
                </div>
                <div style="padding: 20px;">
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;">Aplikasi yang dipakai? <span style="color: #ef4444;">*</span></label>
                        <input type="text" id="negosiasi_aplikasi" placeholder="Contoh: GNP, BSB, BTN" value="${escapeHtml(data.negosiasi_data?.aplikasi || '')}" style="width:100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 14px; font-size: 13px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;">Domisili dimana? <span style="color: #ef4444;">*</span></label>
                        <input type="text" id="negosiasi_domisili" placeholder="Kota/Kabupaten" value="${escapeHtml(data.negosiasi_data?.domisili || '')}" style="width:100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 14px; font-size: 13px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;">Total transaksi per bulan? <span style="color: #ef4444;">*</span></label>
                        <input type="text" id="negosiasi_transaksi" placeholder="Nominal" value="${escapeHtml(data.negosiasi_data?.transaksi || '')}" style="width:100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 14px; font-size: 13px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;">Apakah deposit atau saldo pinjaman? <span style="color: #ef4444;">*</span></label>
                        <select id="negosiasi_deposit" style="width:100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 14px; font-size: 13px;">
                            <option value="">Pilih</option>
                            <option value="Deposit" ${data.negosiasi_data?.deposit === 'Deposit' ? 'selected' : ''}>Deposit</option>
                            <option value="Saldo Pinjaman" ${data.negosiasi_data?.deposit === 'Saldo Pinjaman' ? 'selected' : ''}>Saldo Pinjaman</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;">Apakah tertarik dengan penawaran kamu? <span style="color: #ef4444;">*</span></label>
                        <select id="negosiasi_tertarik" style="width:100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 14px; font-size: 13px;">
                            <option value="">Pilih</option>
                            <option value="Ya" ${data.negosiasi_data?.tertarik === 'Ya' ? 'selected' : ''}>Ya</option>
                            <option value="Tidak" ${data.negosiasi_data?.tertarik === 'Tidak' ? 'selected' : ''}>Tidak</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;">Penawaran apa yang diberikan? <span style="color: #ef4444;">*</span></label>
                        <input type="text" id="negosiasi_penawaran" placeholder="Penawaran" value="${escapeHtml(data.negosiasi_data?.penawaran || '')}" style="width:100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 14px; font-size: 13px;">
                    </div>
                </div>
                <div class="modal-buttons" style="display: flex; gap: 10px; flex-wrap: wrap; padding: 16px 20px 20px; border-top: 1px solid #f0f0f0;">
                    <button type="button" id="negosiasiTertarikBtnFix" class="btn-success" style="flex: 1; padding: 12px; border: 0; border-radius: 14px; font-weight: 600; font-size: 13px; background: ${isComplete ? '#10b981' : '#9ca3af'}; color: white; cursor: ${isComplete ? 'pointer' : 'not-allowed'}; opacity: ${isComplete ? '1' : '0.6'};">⭐ Tertarik</button>
                    <button type="button" id="negosiasiTidakTertarikBtnFix" class="btn-danger" style="flex: 1; padding: 12px; border: 0; border-radius: 14px; font-weight: 600; font-size: 13px; background: ${isComplete ? '#ef4444' : '#9ca3af'}; color: white; cursor: ${isComplete ? 'pointer' : 'not-allowed'}; opacity: ${isComplete ? '1' : '0.6'};">❌ Tidak Tertarik</button>
                    <button type="button" id="negosiasiSimpanBtnFix" class="btn-primary" style="flex: 1; padding: 12px; border: 0; border-radius: 14px; font-weight: 600; font-size: 13px; background: #4f46e5; color: white; cursor: pointer;">💾 Simpan (Deadline +5 hari)</button>
                    <button type="button" id="negosiasiBatalBtnFix" class="btn-outline" style="flex: 1; padding: 12px; border: 0; border-radius: 14px; font-weight: 600; font-size: 13px; background: #f3f4f6; color: #374151; cursor: pointer;">❌ Batal</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        function closeModalFix() {
            if (modal && modal.remove) modal.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }
        
        function updateCompleteStatus() {
            const aplikasi = document.getElementById('negosiasi_aplikasi').value;
            const domisili = document.getElementById('negosiasi_domisili').value;
            const transaksi = document.getElementById('negosiasi_transaksi').value;
            const deposit = document.getElementById('negosiasi_deposit').value;
            const tertarik = document.getElementById('negosiasi_tertarik').value;
            const penawaran = document.getElementById('negosiasi_penawaran').value;
            
            const filled = [aplikasi, domisili, transaksi, deposit, tertarik, penawaran].filter(v => v && v !== '').length;
            const newIsComplete = filled === 6;
            
            const tertarikBtn = document.getElementById('negosiasiTertarikBtnFix');
            const tidakTertarikBtn = document.getElementById('negosiasiTidakTertarikBtnFix');
            
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
        
        // Tambahkan event listener ke semua input untuk update status
        const inputs = ['negosiasi_aplikasi', 'negosiasi_domisili', 'negosiasi_transaksi', 'negosiasi_deposit', 'negosiasi_tertarik', 'negosiasi_penawaran'];
        inputs.forEach(inputId => {
            const el = document.getElementById(inputId);
            if (el) {
                el.addEventListener('input', updateCompleteStatus);
                if (el.tagName === 'SELECT') {
                    el.addEventListener('change', updateCompleteStatus);
                }
            }
        });
        updateCompleteStatus();
        
// ===== FUNGSI UNTUK SAVE DATA NEGOSIASI =====
async function saveNegosiasiData(forceSave = false) {
    const aplikasi = document.getElementById('negosiasi_aplikasi').value;
    const domisili = document.getElementById('negosiasi_domisili').value;
    const transaksi = document.getElementById('negosiasi_transaksi').value;
    const deposit = document.getElementById('negosiasi_deposit').value;
    const tertarik = document.getElementById('negosiasi_tertarik').value;
    const penawaran = document.getElementById('negosiasi_penawaran').value;
    
    // ===== PERBAIKAN: Selalu simpan, meskipun kosong =====
    // Tapi beri peringatan jika kosong
    const hasAnyData = aplikasi || domisili || transaksi || deposit || tertarik || penawaran;
    
    // Jika tidak ada data dan bukan force save, beri peringatan
    if (!hasAnyData && !forceSave) {
        showNotifTop('⚠️ Tidak ada data untuk disimpan!', true);
        return null;
    }
    
    try {
        const { data: doc } = await window.db.from('prospek').select('*').eq('id', currentProspekId).single();
        const existingData = doc.negosiasi_data || {};
        
        // ===== PERBAIKAN: Selalu update, tidak perlu cek perubahan =====
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
        
        // Deadline bertambah 5 hari dari HARI INI (hanya jika ada data)
        let newDeadline = doc.deadline;
        if (hasAnyData) {
            newDeadline = addDaysFromToday(5);
        }
        
        const updateData = {
            negosiasi_data: negosiasi_data,
            updated_at: new Date().toISOString()
        };
        
        if (hasAnyData) {
            updateData.deadline = newDeadline;
        }
        
        await window.db.from('prospek').update(updateData).eq('id', currentProspekId);
        
        if (hasAnyData) {
            showNotifTop(`💾 Data kuesioner berhasil disimpan. Deadline +5 hari dari hari ini menjadi ${newDeadline}`);
        } else {
            showNotifTop('💾 Data kuesioner berhasil disimpan (kosong)');
        }
        
        return negosiasi_data;
        
    } catch (err) {
        console.error('Error saving negosiasi:', err);
        showNotifTop('❌ Gagal menyimpan data: ' + err.message, true);
        return null;
    }
}
        
// Tombol Simpan
const simpanBtn = document.getElementById('negosiasiSimpanBtnFix');
if (simpanBtn) {
    simpanBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.disabled = true;
        this.textContent = '⏳ Menyimpan...';
        
        try {
            // ===== PERBAIKAN: Ambil data dari input langsung =====
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
            
            // Deadline bertambah 5 hari dari HARI INI
            const newDeadline = addDaysFromToday(5);
            
            await window.db.from('prospek').update({
                negosiasi_data: negosiasi_data,
                deadline: newDeadline,
                updated_at: new Date().toISOString()
            }).eq('id', currentProspekId);
            
            showNotifTop(`💾 Data kuesioner berhasil disimpan. Deadline +5 hari dari hari ini menjadi ${newDeadline}`);
            
            // ===== PERBAIKAN: Update status kelengkapan di UI =====
            updateCompleteStatus();
            
            // Reload data
            await loadProspek();
            
        } catch (err) {
            console.error('❌ Error:', err);
            showNotifTop('❌ Gagal: ' + err.message, true);
        } finally {
            this.disabled = false;
            this.textContent = '💾 Simpan (Deadline +5 hari)';
        }
    });
}
        
// ===== PERBAIKAN: Tombol Tertarik =====
const tertarikBtn = document.getElementById('negosiasiTertarikBtnFix');
if (tertarikBtn) {
    tertarikBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (tertarikBtn.disabled) {
            showNotifTop('⚠️ Harap lengkapi semua data kuesioner terlebih dahulu!', true);
            return;
        }
        
        this.disabled = true;
        this.textContent = '⏳ Memproses...';
        
        try {
            // ===== PERBAIKAN: Ambil data dari input langsung =====
            const aplikasi = document.getElementById('negosiasi_aplikasi').value;
            const domisili = document.getElementById('negosiasi_domisili').value;
            const transaksi = document.getElementById('negosiasi_transaksi').value;
            const deposit = document.getElementById('negosiasi_deposit').value;
            const tertarik = document.getElementById('negosiasi_tertarik').value;
            const penawaran = document.getElementById('negosiasi_penawaran').value;
            
            // ===== PERBAIKAN: Buat data negosiasi dari input =====
            const negosiasiData = {
                aplikasi: aplikasi || '',
                domisili: domisili || '',
                transaksi: transaksi || '',
                deposit: deposit || '',
                tertarik: tertarik || '',
                penawaran: penawaran || '',
                timestamp: new Date().toISOString(),
                is_complete: !!(aplikasi && domisili && transaksi && deposit && tertarik && penawaran)
            };
            
            console.log('📝 Data negosiasi dari input (Tertarik):', negosiasiData);
            
            if (!confirm('Apakah Anda yakin prospek ini TERTARIK?\n\nData akan dipindahkan ke status TERTARIK dengan deadline +1 hari dari hari ini.')) {
                this.disabled = false;
                this.textContent = '⭐ Tertarik';
                return;
            }
            
            // Deadline +1 hari dari HARI INI
            const newDeadline = addDaysFromToday(1);
            
            // ===== PERBAIKAN: Update dengan data negosiasi =====
            await window.db.from('prospek').update({
                status: 'Tertarik',
                negosiasi_data: negosiasiData,
                deadline: newDeadline,
                updated_at: new Date().toISOString()
            }).eq('id', currentProspekId);
            
            showNotifTop(`✅ Prospek dipindahkan ke status TERTARIK. Deadline +1 hari dari hari ini menjadi ${newDeadline}`);
            closeModalFix();
            await loadProspek();
            closeModal('detailModal');
            
        } catch (err) {
            console.error('❌ Error:', err);
            showNotifTop('❌ Gagal: ' + err.message, true);
        } finally {
            this.disabled = false;
            this.textContent = '⭐ Tertarik';
        }
    });
}
        
// ===== PERBAIKAN: Tombol Tidak Tertarik =====
const tidakTertarikBtn = document.getElementById('negosiasiTidakTertarikBtnFix');
if (tidakTertarikBtn) {
    tidakTertarikBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (tidakTertarikBtn.disabled) {
            showNotifTop('⚠️ Harap lengkapi semua data kuesioner terlebih dahulu!', true);
            return;
        }
        
        this.disabled = true;
        this.textContent = '⏳ Memproses...';
        
        try {
            // ===== PERBAIKAN: Ambil data dari input langsung =====
            const aplikasi = document.getElementById('negosiasi_aplikasi').value;
            const domisili = document.getElementById('negosiasi_domisili').value;
            const transaksi = document.getElementById('negosiasi_transaksi').value;
            const deposit = document.getElementById('negosiasi_deposit').value;
            const tertarik = document.getElementById('negosiasi_tertarik').value;
            const penawaran = document.getElementById('negosiasi_penawaran').value;
            
            // ===== PERBAIKAN: Buat data negosiasi dari input =====
            const negosiasiData = {
                aplikasi: aplikasi || '',
                domisili: domisili || '',
                transaksi: transaksi || '',
                deposit: deposit || '',
                tertarik: tertarik || '',
                penawaran: penawaran || '',
                timestamp: new Date().toISOString(),
                is_complete: !!(aplikasi && domisili && transaksi && deposit && tertarik && penawaran)
            };
            
            console.log('📝 Data negosiasi dari input:', negosiasiData);
            
            // ===== PERBAIKAN: SIMPAN DULU KE DATABASE =====
            const hasAnyData = aplikasi || domisili || transaksi || deposit || tertarik || penawaran;
            
            const updateData = {
                negosiasi_data: negosiasiData,
                updated_at: new Date().toISOString()
            };
            
            if (hasAnyData) {
                updateData.deadline = addDaysFromToday(5);
            }
            
            const { error: updateError } = await window.db
                .from('prospek')
                .update(updateData)
                .eq('id', currentProspekId);
            
            if (updateError) {
                console.error('❌ Error update negosiasi:', updateError);
                showNotifTop('❌ Gagal menyimpan data negosiasi: ' + updateError.message, true);
                return;
            }
            
            console.log('✅ Data negosiasi berhasil disimpan ke database');
            
            // ===== TAMPILKAN POPUP ALASAN =====
            // Tutup modal negosiasi dulu
            closeModalFix();
            
            // Buka popup alasan dengan data negosiasi
            showAlasanTidakTertarikModal(currentProspekId, negosiasiData);
            
        } catch (err) {
            console.error('❌ Error:', err);
            showNotifTop('❌ Gagal: ' + err.message, true);
        } finally {
            this.disabled = false;
            this.textContent = '❌ Tidak Tertarik';
        }
    });
}
        
        // Tombol Batal
        const batalBtn = document.getElementById('negosiasiBatalBtnFix');
        if (batalBtn) {
            batalBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeModalFix();
            });
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModalFix();
        });
        
    }).catch(err => {
        console.error('Error loading prospek data:', err);
        showNotifTop('❌ Gagal memuat data prospek: ' + err.message, true);
    });
}

// ========== POPUP ALASAN TIDAK TERTARIK ==========
function showAlasanTidakTertarikModal(prospekId, negosiasiDataFromInput = null) {
    // Hapus modal lama jika ada
    const existingModal = document.querySelector('.alasan-tidak-tertarik-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal alasan-tidak-tertarik-modal';
    modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.8) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 999999999 !important;
        backdrop-filter: blur(5px) !important;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; max-height: 80vh; overflow-y: auto; background: #fff; border-radius: 24px;">
            <h3 style="font-size: 20px; padding: 20px 20px 0; color: #1f2937;">❌ Konfirmasi Tidak Tertarik</h3>
            <div class="modal-subtitle" style="font-size: 12px; color: #6b7280; padding: 0 20px 12px; border-bottom: 1px solid #f0f0f0;">
                Berikan alasan mengapa prospek tidak tertarik
            </div>
            
            <div style="padding: 20px 20px 0;">
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">
                        Alasan Tidak Tertarik <span style="color: #ef4444;">*</span>
                    </label>
                    <select id="alasanTidakTertarikSelect" style="width:100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 14px; font-size: 13px; background: #fff;">
                        <option value="">Pilih Alasan</option>
                        <option value="Harga terlalu mahal">💰 Harga terlalu mahal</option>
                        <option value="Sudah punya produk lain">🏷️ Sudah punya produk lain</option>
                        <option value="Tidak membutuhkan sekarang">⏰ Tidak membutuhkan sekarang</option>
                        <option value="Membandingkan dengan kompetitor">📊 Membandingkan dengan kompetitor</option>
                        <option value="Tidak sesuai kebutuhan">❌ Tidak sesuai kebutuhan</option>
                        <option value="Tidak ada anggaran">💸 Tidak ada anggaran</option>
                        <option value="Kurang informasi">📄 Kurang informasi</option>
                        <option value="Tidak nyaman dengan penawaran">😕 Tidak nyaman dengan penawaran</option>
                        <option value="Lainnya">📝 Lainnya (tulis di keterangan)</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">
                        Keterangan Tambahan (Opsional)
                    </label>
                    <textarea id="alasanTidakTertarikKeterangan" rows="3" placeholder="Tulis keterangan tambahan..." style="width:100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 14px; font-size: 13px; resize: vertical;"></textarea>
                </div>
            </div>
            
            <div style="background: #fef3c7; padding: 12px; border-radius: 10px; margin: 0 20px 10px 20px;">
                <p style="font-size: 12px; color: #d97706; margin: 0;">⚠️ <strong>Peringatan:</strong><br>
                Data akan dipindahkan ke DATABASE TIDAK TERTARIK dan DIHAPUS dari Prospek Agen.<br>
                Proses ini TIDAK BISA dibatalkan!</p>
            </div>
            
            <div class="modal-buttons" style="display: flex; gap: 10px; flex-wrap: wrap; padding: 16px 20px 20px; border-top: 1px solid #f0f0f0;">
                <button type="button" id="alasanTidakTertarikConfirmBtn" class="btn-danger" style="flex: 1; padding: 12px; border: 0; border-radius: 14px; font-weight: 600; font-size: 13px; background: #ef4444; color: white; cursor: pointer;">✅ Konfirmasi Pindah</button>
                <button type="button" id="alasanTidakTertarikBatalBtn" class="btn-outline" style="flex: 1; padding: 12px; border: 0; border-radius: 14px; font-weight: 600; font-size: 13px; background: #f3f4f6; color: #374151; cursor: pointer;">❌ Batal</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    function closeModalAlasan() {
        if (modal && modal.remove) modal.remove();
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    }
    
    // Tombol Konfirmasi
    document.getElementById('alasanTidakTertarikConfirmBtn').addEventListener('click', async function() {
        const alasanSelect = document.getElementById('alasanTidakTertarikSelect');
        const keterangan = document.getElementById('alasanTidakTertarikKeterangan').value;
        const alasan = alasanSelect.value;
        
        if (!alasan) {
            showNotifTop('⚠️ Silakan pilih alasan tidak tertarik!', true);
            return;
        }
        
        // Gabungkan alasan dengan keterangan
        const alasanLengkap = keterangan ? `${alasan} - ${keterangan}` : alasan;
        
        // Disable button
        this.disabled = true;
        this.textContent = '⏳ Memproses...';
        
        try {
            // ===== Ambil data prospek LENGKAP =====
            const { data: doc, error: getError } = await window.db
                .from('prospek')
                .select('*')
                .eq('id', prospekId)
                .single();
            
            if (getError || !doc) {
                showNotifTop('❌ Data prospek tidak ditemukan!', true);
                return;
            }
            
            // ===== PERBAIKAN: Gunakan data negosiasi dari parameter =====
            // Jika ada data dari input, gunakan itu
            // Jika tidak, ambil dari database
            let negosiasiData = negosiasiDataFromInput || doc.negosiasi_data || {};
            
            // ===== PERBAIKAN: Jika negosiasiDataFromInput ada tapi kosong, coba ambil dari database =====
            if (negosiasiDataFromInput && Object.keys(negosiasiDataFromInput).length > 0) {
                console.log('✅ Menggunakan data negosiasi dari input:', negosiasiDataFromInput);
            } else if (doc.negosiasi_data && Object.keys(doc.negosiasi_data).length > 0) {
                console.log('✅ Menggunakan data negosiasi dari database:', doc.negosiasi_data);
                negosiasiData = doc.negosiasi_data;
            } else {
                console.log('⚠️ Tidak ada data negosiasi, menggunakan data kosong');
                negosiasiData = {
                    aplikasi: '',
                    domisili: '',
                    transaksi: '',
                    deposit: '',
                    tertarik: '',
                    penawaran: '',
                    is_complete: false,
                    timestamp: new Date().toISOString()
                };
            }
            
            // ===== Data dihubungi =====
            const dihubungiData = doc.dihubungi_data || {};
            
            // ===== Data lengkap untuk arsip =====
            const tidakTertarikData = {
                // Field utama
                nama: doc.nama || 'Tidak ada nama',
                hp: doc.hp || '',
                tanggal: new Date().toISOString(),
                alasan: alasanLengkap,
                user_id: doc.user_id || currentUser.id,
                
                // Status sebelumnya
                status_sebelumnya: doc.status || 'Negosiasi',
                
                // DATA DIHUBUNGI (arsip)
                dihubungi_data: dihubungiData,
                pesan_terkirim: doc.pesan_terkirim || dihubungiData.pesan || null,
                balasan_diterima: doc.balasan_diterima || dihubungiData.balasan || null,
                
                // ===== DATA NEGOSIASI (arsip) =====
                negosiasi_data: {
                    aplikasi: negosiasiData.aplikasi || '',
                    domisili: negosiasiData.domisili || '',
                    transaksi: negosiasiData.transaksi || '',
                    deposit: negosiasiData.deposit || '',
                    tertarik: negosiasiData.tertarik || '',
                    penawaran: negosiasiData.penawaran || '',
                    is_complete: negosiasiData.is_complete || false,
                    timestamp: negosiasiData.timestamp || new Date().toISOString()
                },
                
                // Upline
                upline_name: doc.upline_name || null,
                upline_phone: doc.upline_phone || null,
                
                // Timestamp
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            console.log('📝 Menyimpan ke db_tidak_tertarik:', tidakTertarikData);
            
            // Simpan ke DB Tidak Tertarik
            const { error: insertError } = await window.db
                .from('db_tidak_tertarik')
                .insert(tidakTertarikData);
            
            if (insertError) {
                console.error('❌ Error insert db_tidak_tertarik:', insertError);
                showNotifTop('❌ Gagal menyimpan ke Database Tidak Tertarik: ' + insertError.message, true);
                return;
            }
            
            console.log('✅ Berhasil simpan ke db_tidak_tertarik');
            
            // Hapus dari Prospek
            await window.db.from('prospek').delete().eq('id', prospekId);
            
            showNotifTop('📵 Data dipindahkan ke Database Tidak Tertarik (dengan arsip lengkap)');
            closeModalAlasan();
            
            // Reload data
            await loadProspek();
            await loadDBTidak();
            closeModal('detailModal');
            
        } catch (err) {
            console.error('❌ Error dalam proses:', err);
            showNotifTop('❌ Terjadi kesalahan: ' + err.message, true);
        } finally {
            this.disabled = false;
            this.textContent = '✅ Konfirmasi Pindah';
        }
    });
    
    // Tombol Batal
    document.getElementById('alasanTidakTertarikBatalBtn').addEventListener('click', function() {
        closeModalAlasan();
        openProspekNegosiasiModal(prospekId);
    });
    
    // Klik di luar modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalAlasan();
            openProspekNegosiasiModal(prospekId);
        }
    });
}

// ========== SHOW CONVERT TO CUSTOMER MODAL ==========
function showConvertToCustomerModal(prospekId) {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    const followupDate = nextMonth.toISOString().split('T')[0];
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '9999999';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3>📋 Lengkapi Data Customer</h3>
            <div class="modal-subtitle">Data prospek akan dipindahkan ke Followup Agen</div>
            <div style="padding: 0 20px;">
                <div class="form-group">
                    <label>ID Agent <span class="required">*</span></label>
                    <input type="text" id="convertAgentId" placeholder="Contoh: AG-001" maxlength="17" oninput="formatAgentIdAuto(this)">
                    <small>Huruf besar, angka, max 17 karakter</small>
                </div>
                <div class="form-group">
                    <label>Aplikasi <span class="required">*</span></label>
                    <select id="convertAplikasi">
                        <option value="">Pilih Aplikasi</option>
                        <option value="GNP">GNP</option>
                        <option value="BSB">BSB</option>
                        <option value="BTN">BTN</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tanggal Followup</label>
                    <input type="date" id="convertFollowupDate" value="${followupDate}">
                </div>
            </div>
            <div class="modal-buttons">
                <button id="confirmConvertBtn" class="btn-primary">✅ Konfirmasi Pindah</button>
                <button id="cancelConvertBtn" class="btn-outline">Batal</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('confirmConvertBtn').onclick = async () => {
        const agentId = document.getElementById('convertAgentId').value;
        const aplikasi = document.getElementById('convertAplikasi').value;
        const followupDateValue = document.getElementById('convertFollowupDate').value;
        
        if (!agentId || !aplikasi) {
            showNotifTop('⚠️ ID Agent dan Aplikasi wajib diisi!', true);
            return;
        }
        
        const { data: prospekDoc } = await window.db.from('prospek').select('*').eq('id', prospekId).single();
        const data = prospekDoc;
        
        const { data: existing } = await window.db.from('customers').select('id').eq('agent_id', agentId).maybeSingle();
        if (existing) {
            showNotifTop(`⚠️ ID Agent "${agentId}" sudah terdaftar!`, true);
            return;
        }
        
        if (confirm(`Jadikan "${escapeHtml(data.nama)}" sebagai Customer?`)) {
            await window.db.from('db_commitment').insert({
                nama: data.nama,
                hp: data.hp,
                negosiasi_data: data.negosiasi_data || null,
                agent_id: agentId,
                aplikasi: aplikasi,
                committed_at: new Date().toISOString(),
                user_id: data.user_id,
                original_prospek_id: prospekId,
                followup_date: followupDateValue
            });
            
            await window.db.from('customers').insert({
                agent_id: agentId,
                nama: data.nama,
                hp: data.hp,
                apk: aplikasi,
                tanggal: followupDateValue,
                status: 'baru',
                user_id: data.user_id,
                created_at: new Date().toISOString(),
                converted_from: 'prospek_commitment',
                is_new_member: true
            });
            
            await window.db.from('prospek').delete().eq('id', prospekId);
            
            showNotifTop('✅ Berhasil! Member baru telah ditambahkan ke Followup Agen dan tersimpan di Database Commitment');
            modal.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            await loadCustomers();
            await loadProspek();
            await loadDBCommitment();
            closeModal('detailModal');
        }
    };
    
    document.getElementById('cancelConvertBtn').onclick = () => {
        modal.remove();
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }
    };
}

// ========== CRUD OPERATIONS ==========
let isAddingCustomer = false;
let isAddingProspek = false;

async function addCustomer(agentId, nama, hp, apk, uplineName, deadline) {
    // ===== PERBAIKAN: Cegah multiple submit =====
    if (isAddingCustomer) {
        showNotifTop('⏳ Data sedang diproses, harap tunggu...', true);
        return false;
    }
    isAddingCustomer = true;
    
    try {
        // ===== PERBAIKAN: Cek duplikat berdasarkan agent_id =====
        const { data: existingById } = await window.db
            .from('customers')
            .select('id')
            .eq('agent_id', agentId)
            .maybeSingle();
        
        if (existingById) {
            showNotifTop(`⚠️ ID Agent "${agentId}" sudah terdaftar!`, true);
            return false;
        }
        
        // ===== PERBAIKAN: Cek duplikat berdasarkan hp =====
        if (hp) {
            const { data: existingByHp } = await window.db
                .from('customers')
                .select('id')
                .eq('hp', hp)
                .maybeSingle();
            
            if (existingByHp) {
                showNotifTop(`⚠️ Nomor HP "${hp}" sudah terdaftar!`, true);
                return false;
            }
        }
        
        // ===== PERBAIKAN: Cek duplikat berdasarkan nama =====
        if (nama) {
            const { data: existingByName } = await window.db
                .from('customers')
                .select('id')
                .eq('nama', nama)
                .maybeSingle();
            
            if (existingByName) {
                showNotifTop(`⚠️ Nama "${nama}" sudah terdaftar!`, true);
                return false;
            }
        }
        
        const { error } = await window.db.from('customers').insert({
            agent_id: agentId,
            nama: nama,
            hp: hp || '',
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
        
    } finally {
        isAddingCustomer = false;
    }
}

async function addProspek(nama, hp, deadline) {
    // ===== PERBAIKAN: Cegah multiple submit =====
    if (isAddingProspek) {
        showNotifTop('⏳ Data sedang diproses, harap tunggu...', true);
        return false;
    }
    isAddingProspek = true;
    
    try {
        // ===== PERBAIKAN: Cek duplikat berdasarkan hp =====
        if (hp) {
            const { data: existingByHp } = await window.db
                .from('prospek')
                .select('id')
                .eq('hp', hp)
                .maybeSingle();
            
            if (existingByHp) {
                showNotifTop(`⚠️ Nomor HP "${hp}" sudah terdaftar di Prospek!`, true);
                return false;
            }
        }
        
        // ===== PERBAIKAN: Cek duplikat berdasarkan nama =====
        if (nama) {
            const { data: existingByName } = await window.db
                .from('prospek')
                .select('id')
                .eq('nama', nama)
                .maybeSingle();
            
            if (existingByName) {
                showNotifTop(`⚠️ Nama "${nama}" sudah terdaftar di Prospek!`, true);
                return false;
            }
        }
        
        const { error } = await window.db.from('prospek').insert({
            nama: nama,
            hp: hp || '',
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
        
    } finally {
        isAddingProspek = false;
    }
}

// ========== KONFIRMASI CLOSING KE DB ==========
function confirmClosingToDB(id) {
    const modal = document.createElement('div');
    modal.className = 'modal';
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
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; z-index: 999999999; pointer-events: auto;">
            <h3>📋 Pindahkan ke Database Closing</h3>
            <div class="modal-subtitle">Data customer akan dipindahkan ke Database Closing</div>
            <div style="background: #fef3c7; padding: 12px; border-radius: 10px; margin: 0 20px 10px 20px;">
                <p style="font-size: 12px; color: #d97706; margin: 0;">⚠️ <strong>Peringatan:</strong> Data yang sudah dipindahkan TIDAK BISA dikembalikan ke Followup Agen!</p>
            </div>
            <div style="padding: 0 20px 20px 20px;">
                <div class="form-group">
                    <label>Catatan Closing (Opsional)</label>
                    <textarea id="closingNote" rows="3" placeholder="Contoh: Berhasil closing dengan produk A..." style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;"></textarea>
                </div>
            </div>
            <div class="modal-buttons" style="display: flex; gap: 12px; padding: 16px 20px 20px;">
                <button id="confirmClosingToDBBtn" class="btn-primary" style="flex: 1; cursor: pointer;">✅ Ya, Pindahkan ke Closing</button>
                <button id="cancelClosingToDBBtn" class="btn-outline" style="flex: 1; cursor: pointer;">❌ Batal</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    document.getElementById('confirmClosingToDBBtn').onclick = async () => {
        const note = document.getElementById('closingNote').value;
        
        // Ambil data customer lengkap
        const { data: doc, error: getError } = await window.db
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();
        
        if (getError) {
            console.error('Error ambil data customer:', getError);
            showNotifTop('❌ Gagal mengambil data customer: ' + getError.message, true);
            return;
        }
        
        if (!doc) {
            showNotifTop('❌ Data customer tidak ditemukan!', true);
            return;
        }
        
        try {
            // Siapkan data followup yang lengkap
            const followupData = {
                terkirim: doc.followup_data?.terkirim || false,
                dibalas: doc.followup_data?.dibalas || false,
                pesan: doc.followup_data?.pesan || null,
                balasan: doc.followup_data?.balasan || null,
                timestamp: doc.followup_data?.timestamp || new Date().toISOString()
            };
            
            // Simpan ke DB Closing
            const { error: insertError } = await window.db.from('db_closing').insert({
                nama: doc.nama,
                hp: doc.hp,
                closing_date: new Date().toISOString(),
                closing_note: note || null,
                user_id: doc.user_id,
                followup_data: followupData,
                pending_data: doc.pending_data || [],
                pesan_terkirim: doc.followup_data?.pesan || null,
                balasan_diterima: doc.followup_data?.balasan || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            
            if (insertError) {
                console.error('Error simpan ke db_closing:', insertError);
                showNotifTop('❌ Gagal menyimpan ke Database Closing: ' + insertError.message, true);
                return;
            }
            
            console.log('✅ Berhasil simpan ke db_closing dengan pesan:', followupData.pesan);
            
            // Hapus dari Customers
            await window.db.from('customers').delete().eq('id', id);
            
            showNotifTop('✅ Data berhasil dipindahkan ke Database Closing!');
            modal.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            
            await loadCustomers();
            await loadDBClosing();
            closeModal('detailModal');
            
        } catch (err) {
            console.error('Error dalam proses:', err);
            showNotifTop('❌ Terjadi kesalahan: ' + err.message, true);
        }
    };
    
    document.getElementById('cancelClosingToDBBtn').onclick = () => {
        modal.remove();
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }
    };
}

// ========== KONFIRMASI PROSPEK TERTARIK KE DB COMMITMENT ==========
function confirmTertarikToDB(prospekId) {
    window.db.from('prospek').select('*').eq('id', prospekId).single().then(async ({ data: prospekData }) => {
        if (!prospekData) {
            showNotifTop('❌ Data prospek tidak ditemukan!', true);
            return;
        }
        
        const penawaranDariNegosiasi = prospekData.negosiasi_data?.penawaran || '';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
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
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; z-index: 999999999; pointer-events: auto;">
                <h3>⭐ Jadikan Member Baru</h3>
                <div class="modal-subtitle">Data akan dipindahkan ke Database Commitment dan menjadi Member Baru di Followup</div>
                <div style="background: #eef2ff; padding: 12px; border-radius: 10px; margin: 0 20px 10px 20px;">
                    <p style="font-size: 12px; color: #4f46e5; margin: 0;">📌 <strong>Ketentuan:</strong><br>
                    • Data akan disimpan ke DATABASE COMMITMENT sebagai arsip<br>
                    • Data akan DIPINDAHKAN ke FOLLOWUP AGEN dengan status "Baru"<br>
                    • Data akan DIHAPUS dari Prospek Agen<br>
                    • Proses ini TIDAK BISA dibatalkan!</p>
                </div>
                <div style="background: #fef3c7; padding: 12px; border-radius: 10px; margin: 0 20px 10px 20px;">
                    <p style="font-size: 12px; color: #d97706; margin: 0;">📋 <strong>Data Negosiasi:</strong><br>
                    Aplikasi: ${escapeHtml(prospekData.negosiasi_data?.aplikasi || '-')}<br>
                    Domisili: ${escapeHtml(prospekData.negosiasi_data?.domisili || '-')}<br>
                    Transaksi: ${escapeHtml(prospekData.negosiasi_data?.transaksi || '-')}<br>
                    Deposit: ${escapeHtml(prospekData.negosiasi_data?.deposit || '-')}<br>
                    Tertarik: ${escapeHtml(prospekData.negosiasi_data?.tertarik || '-')}<br>
                    <strong>Penawaran: ${escapeHtml(penawaranDariNegosiasi || '-')}</strong></p>
                </div>
                <div style="padding: 0 20px 20px 20px;">
                    <div class="form-group">
                        <label>ID Agent <span class="required">*</span></label>
                        <input type="text" id="commitmentAgentId" placeholder="Contoh: AG-001" maxlength="17" style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;" oninput="formatAgentIdAuto(this)" value="${escapeHtml(prospekData.agent_id || '')}">
                        <small>ID Agent untuk member baru (huruf besar, angka, max 17 karakter)</small>
                    </div>
                    <div class="form-group">
                        <label>Aplikasi <span class="required">*</span></label>
                        <select id="commitmentAplikasi" style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">
                            <option value="">Pilih Aplikasi</option>
                            <option value="GNP" ${prospekData.negosiasi_data?.aplikasi === 'GNP' ? 'selected' : ''}>GNP</option>
                            <option value="BSB" ${prospekData.negosiasi_data?.aplikasi === 'BSB' ? 'selected' : ''}>BSB</option>
                            <option value="BTN" ${prospekData.negosiasi_data?.aplikasi === 'BTN' ? 'selected' : ''}>BTN</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Upline / Atasan</label>
                        <input type="text" id="commitmentUplineName" placeholder="Nama Upline" style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;" maxlength="50" value="${escapeHtml(prospekData.upline_name || '')}">
                        <small>Nama upline/atasan dari member baru</small>
                    </div>
                    <div class="form-group">
                        <label>Nomor HP Upline</label>
                        <div class="phone-input">
                            <div class="phone-prefix">+62</div>
                            <input type="tel" id="commitmentUplinePhone" placeholder="81234567890" style="flex:1; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;" oninput="formatPhoneAuto(this)" value="${escapeHtml(prospekData.upline_phone ? prospekData.upline_phone.replace('+62', '') : '')}">
                        </div>
                        <small>Nomor WhatsApp upline (awalan 8, 9-12 digit)</small>
                    </div>
                    <div class="form-group">
                        <label>Catatan (Opsional)</label>
                        <textarea id="commitmentNote" rows="2" placeholder="Contoh: Akan followup bulan depan..." style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Tanggal Followup (Opsional)</label>
                        <input type="date" id="commitmentFollowupDate" style="width:100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb;">
                    </div>
                </div>
                <div class="modal-buttons" style="display: flex; gap: 12px; padding: 16px 20px 20px;">
                    <button id="confirmTertarikToDBBtn" class="btn-primary" style="flex: 1; cursor: pointer;">✅ Ya, Jadikan Member Baru</button>
                    <button id="cancelTertarikToDBBtn" class="btn-outline" style="flex: 1; cursor: pointer;">❌ Batal</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        document.getElementById('confirmTertarikToDBBtn').onclick = async () => {
            const agentId = document.getElementById('commitmentAgentId').value;
            const aplikasi = document.getElementById('commitmentAplikasi').value;
            const uplineName = document.getElementById('commitmentUplineName').value;
            let uplinePhone = document.getElementById('commitmentUplinePhone').value;
            const note = document.getElementById('commitmentNote').value;
            const followupDateInput = document.getElementById('commitmentFollowupDate').value;
            
            if (!agentId || !aplikasi) {
                showNotifTop('⚠️ ID Agent dan Aplikasi wajib diisi!', true);
                return;
            }
            
            let formattedUplinePhone = '';
            if (uplinePhone) {
                uplinePhone = uplinePhone.replace(/[^\d]/g, '');
                if (uplinePhone.startsWith('0')) uplinePhone = uplinePhone.substring(1);
                if (uplinePhone && !uplinePhone.startsWith('62')) uplinePhone = '62' + uplinePhone;
                formattedUplinePhone = '+' + uplinePhone;
            }
            
            const data = prospekData;
            const formattedAgentId = agentId.toUpperCase();
            
            const { data: existingCustomer } = await window.db
                .from('customers')
                .select('id')
                .eq('agent_id', formattedAgentId)
                .maybeSingle();
            
            if (existingCustomer) {
                showNotifTop(`⚠️ ID Agent "${formattedAgentId}" sudah terdaftar di Followup Agen!`, true);
                return;
            }
            
            let followupDateValue = followupDateInput;
            if (!followupDateValue) {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                followupDateValue = nextMonth.toISOString().split('T')[0];
            }
            
            // Siapkan data dihubungi yang lengkap
            const dihubungiData = data.dihubungi_data ? {
                terkirim: data.dihubungi_data.terkirim || false,
                dibalas: data.dihubungi_data.dibalas || false,
                pesan: data.dihubungi_data.pesan || null,
                balasan: data.dihubungi_data.balasan || null,
                timestamp: data.dihubungi_data.timestamp || new Date().toISOString()
            } : null;
            
            try {
                // Simpan ke DB Commitment dengan semua data
                const { error: commitError } = await window.db.from('db_commitment').insert({
                    nama: data.nama,
                    hp: data.hp,
                    agent_id: formattedAgentId,
                    aplikasi: aplikasi,
                    upline_name: uplineName || null,
                    upline_phone: formattedUplinePhone || null,
                    penawaran: penawaranDariNegosiasi,
                    commitment_note: note || null,
                    committed_at: new Date().toISOString(),
                    followup_date: followupDateValue,
                    user_id: data.user_id,
                    original_prospek_id: prospekId,
                    pesan_terkirim: data.pesan_terkirim || null,
                    balasan_diterima: data.balasan_diterima || null,
                    dihubungi_data: dihubungiData,
                    negosiasi_data: {
                        aplikasi: data.negosiasi_data?.aplikasi || '',
                        domisili: data.negosiasi_data?.domisili || '',
                        transaksi: data.negosiasi_data?.transaksi || '',
                        deposit: data.negosiasi_data?.deposit || '',
                        tertarik: data.negosiasi_data?.tertarik || '',
                        penawaran: penawaranDariNegosiasi,
                        timestamp: new Date().toISOString()
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                
                if (commitError) {
                    console.error('Error simpan ke db_commitment:', commitError);
                    showNotifTop('❌ Gagal menyimpan ke Database Commitment: ' + commitError.message, true);
                    return;
                }
                
                console.log('✅ Berhasil simpan ke db_commitment dengan pesan dihubungi:', dihubungiData?.pesan);
                
                // Pindahkan ke Followup Agen
                const followupDate = getTodayDate();
                await window.db.from('customers').insert({
                    agent_id: formattedAgentId,
                    nama: data.nama,
                    hp: data.hp,
                    apk: aplikasi,
                    upline_name: uplineName || '',
                    upline_phone: formattedUplinePhone || '',
                    tanggal: followupDate,
                    status: 'baru',
                    user_id: data.user_id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    pesan_terkirim: data.pesan_terkirim || null,
                    balasan_diterima: data.balasan_diterima || null
                });
                
                // Hapus dari Prospek
                await window.db.from('prospek').delete().eq('id', prospekId);
                
                showNotifTop('✅ Berhasil! Member baru telah ditambahkan ke Followup Agen dan tersimpan di Database Commitment');
                modal.remove();
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                
                await loadCustomers();
                await loadProspek();
                await loadDBCommitment();
                closeModal('detailModal');
                
            } catch (err) {
                console.error('Error:', err);
                showNotifTop('❌ Terjadi kesalahan: ' + err.message, true);
            }
        };
        
        document.getElementById('cancelTertarikToDBBtn').onclick = () => {
            modal.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
            }
        };
    }).catch(err => {
        console.error('Error:', err);
        showNotifTop('❌ Gagal memuat data prospek: ' + err.message, true);
    });
}

// ========== FUNGSI TAMBAHAN UNTUK DEADLINE ==========
function addDaysFromToday(days) {
    // ===== PERBAIKAN: Gunakan tanggal lokal, hindari timezone UTC =====
    const today = new Date();
    today.setDate(today.getDate() + days);
    
    // Format manual ke YYYY-MM-DD dengan waktu LOKAL
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getFirstDayOfNextMonth() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
    const day = String(nextMonth.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ========== FUNGSI updateCustomerStatus ==========
async function updateCustomerStatus(id, newStatus) {
    const customer = customersData.find(c => c.id === id);
    if (!customer) return;
    
    // Jika dari Follow Up ke Pending
    if (customer.status === 'followup' && newStatus === 'pending') {
        openFollowupConfirm(id);
        return;
    }
    
    // Jika dari Pending ke Closing
    if (customer.status === 'pending' && newStatus === 'closing') {
        const newDeadline = getFirstDayOfNextMonth();
        
        const { error } = await window.db
            .from('customers')
            .update({ status: newStatus, tanggal: newDeadline, updated_at: new Date().toISOString() })
            .eq('id', id);
        
        if (error) {
            showNotifTop('❌ Gagal update: ' + error.message, true);
            return;
        }
        
        showNotifTop(`✅ Customer dipindahkan ke Closing. Deadline menjadi tanggal 1 bulan depan (${newDeadline})`);
        closeModal('detailModal');
        await loadCustomers();
        return;
    }
    
    // Jika dari Closing ke DB Closing
    if (customer.status === 'closing' && newStatus === 'db_closing') {
        confirmClosingToDB(id);
        return;
    }
    
    // Jika dari Baru ke Follow Up
    if (customer.status === 'baru' && newStatus === 'followup') {
        const { error } = await window.db
            .from('customers')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id);
        
        if (error) {
            showNotifTop('❌ Gagal update: ' + error.message, true);
            return;
        }
        
        showNotifTop(`✅ Status berhasil diupdate ke Follow Up. Deadline tidak berubah.`);
        closeModal('detailModal');
        await loadCustomers();
        return;
    }
    
    showNotifTop('⚠️ Aksi tidak dikenali!', true);
}

// ========== FUNGSI updateProspekStatus ==========
async function updateProspekStatus(id, newStatus) {
    const prospek = prospekData.find(p => p.id === id);
    if (!prospek) return;
    
    // Jika dari Negosiasi ke Tertarik
    if (prospek.status === 'Negosiasi' && newStatus === 'Tertarik') {
        // Ambil data negosiasi yang sudah ada
        const negosiasiData = prospek.negosiasi_data || {};
        
        // Tampilkan konfirmasi dengan ringkasan data
        if (!confirm(`⭐ KONFIRMASI PINDAH KE TERTARIK\n\nData Negosiasi:\nAplikasi: ${negosiasiData.aplikasi || '-'}\nDomisili: ${negosiasiData.domisili || '-'}\nTransaksi: ${negosiasiData.transaksi || '-'}\nPenawaran: ${negosiasiData.penawaran || '-'}\n\nApakah data sudah lengkap dan prospek TERTARIK?`)) {
            return;
        }
        
        const newDeadline = addDaysFromToday(1);
        
        const { error } = await window.db
            .from('prospek')
            .update({ 
                status: newStatus, 
                deadline: newDeadline, 
                updated_at: new Date().toISOString(),
                // Pastikan negosiasi_data tetap tersimpan
                negosiasi_data: negosiasiData
            })
            .eq('id', id);
        
        if (error) {
            showNotifTop('❌ Gagal update: ' + error.message, true);
            return;
        }
        
        showNotifTop(`✅ Prospek dipindahkan ke Tertarik. Deadline +1 hari dari hari ini menjadi ${newDeadline}`);
        closeModal('detailModal');
        await loadProspek();
        return;
    }
    
    // Jika dari Tertarik ke DB Commitment - panggil confirmTertarikToDB
    if (prospek.status === 'Tertarik' && newStatus === 'db_commitment') {
        confirmTertarikToDB(id);
        return;
    }
    
    // Untuk status lainnya (Baru -> Dihubungi, Dihubungi -> Negosiasi) tidak menambah deadline
    let daysToAdd = 0;
    if (newStatus === 'Dihubungi') daysToAdd = 0;
    else if (newStatus === 'Negosiasi') daysToAdd = 0;
    
    const newDeadline = addDaysToDate(prospek.deadline || getTodayDate(), daysToAdd);
    
    const { error } = await window.db
        .from('prospek')
        .update({ status: newStatus, deadline: newDeadline, updated_at: new Date().toISOString() })
        .eq('id', id);
    
    if (error) {
        showNotifTop('❌ Gagal update: ' + error.message, true);
        return;
    }
    
    showNotifTop(`✅ Status berhasil diupdate ke ${newStatus}. Deadline tidak berubah`);
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

// ========== LOAD DB TRANSAKSI ==========
async function loadDbTransaksi() {
    if (!currentUser) return;
    
    let query = window.db.from('db_transaksi').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading transaksi:', error);
        return;
    }
    
    transaksiData = data || [];
    renderTransaksiList();
    updateTargetDisplay();
    updateTransaksiStats();
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
            
            // Validasi untuk tombol berdasarkan status
            let canProceed = true;
            let disabledReason = '';
            
            if (columnType === 'followup') {
                // Untuk tombol Konfirmasi Follow Up, perlu checklist
                canProceed = item.followup_data && item.followup_data.terkirim && item.followup_data.dibalas;
                disabledReason = 'Harap lengkapi data follow up terlebih dahulu';
            } else if (columnType === 'pending') {
                // Untuk tombol Selesai & Closing, perlu semua pending items terisi dan tercentang
                const pendingData = item.pending_data || [];
                canProceed = pendingData.length > 0 && pendingData.every(p => p.checked === true && p.text && p.text.trim() !== '');
                disabledReason = 'Harap isi semua balasan pending dan centang';
            } else if (columnType === 'closing') {
                // Untuk tombol Pindah ke DB Closing, selalu bisa
                canProceed = true;
            } else {
                canProceed = true;
            }
            
            const actionButton = getActionButtonForStatus(item.status, item.id, canProceed, disabledReason);
            
            // ===== PERBAIKAN: Tambahkan style inline untuk dark mode =====
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div class="card-id" style="background: #eef2ff; padding: 3px 8px; border-radius: 20px; margin-bottom: 6px; display: inline-block; font-weight: 600; font-size: 10px; color: #4f46e5; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🆔 ${escapeHtml(item.agent_id || '-')}</div>
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

function getActionButtonForStatus(status, id, canProceed, disabledReason) {
    let buttonHtml = '';
    let buttonText = '';
    let buttonClass = '';
    let onClickAction = '';
    
    if (status === 'baru') {
        buttonText = '📞 Lanjut Follow Up';
        buttonClass = 'action-btn followup-btn';
        onClickAction = `updateCustomerStatus('${id}', 'followup')`;
        buttonHtml = `<button class="${buttonClass}" onclick="event.stopPropagation(); ${onClickAction}" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #4f46e5; color: white;">${buttonText}</button>`;
    } else if (status === 'followup') {
        buttonText = '✅ Konfirmasi Follow Up';
        buttonClass = `action-btn confirm-followup-btn ${!canProceed ? 'disabled-btn' : ''}`;
        onClickAction = `openFollowupConfirm('${id}')`;
        const disabledAttr = !canProceed ? 'disabled' : '';
        const titleAttr = !canProceed ? `title="${disabledReason}"` : '';
        buttonHtml = `<button class="${buttonClass}" onclick="event.stopPropagation(); ${!canProceed ? 'return false;' : onClickAction}" ${disabledAttr} ${titleAttr} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: ${!canProceed ? 'not-allowed' : 'pointer'}; background: ${!canProceed ? '#9ca3af' : '#4f46e5'}; color: white; opacity: ${!canProceed ? '0.6' : '1'};">${buttonText}</button>`;
    } else if (status === 'pending') {
        buttonText = '✅ Selesai & Closing';
        buttonClass = `action-btn pending-finish-btn ${!canProceed ? 'disabled-btn' : ''}`;
        onClickAction = `openPendingModal('${id}')`;
        const disabledAttr = !canProceed ? 'disabled' : '';
        const titleAttr = !canProceed ? `title="${disabledReason}"` : '';
        buttonHtml = `<button class="${buttonClass}" onclick="event.stopPropagation(); ${!canProceed ? 'return false;' : onClickAction}" ${disabledAttr} ${titleAttr} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: ${!canProceed ? 'not-allowed' : 'pointer'}; background: ${!canProceed ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!canProceed ? '0.6' : '1'};">${buttonText}</button>`;
    } else if (status === 'closing') {
        buttonText = '📁 Pindah ke DB Closing';
        buttonClass = 'action-btn closing-db-btn';
        onClickAction = `confirmClosingToDB('${id}')`;
        buttonHtml = `<button class="${buttonClass}" onclick="event.stopPropagation(); ${onClickAction}" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #8b5cf6; color: white;">${buttonText}</button>`;
    }
    
    return buttonHtml;
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
            
            // Validasi untuk tombol berdasarkan status
            let canProceed = true;
            let disabledReason = '';
            
            if (columnType === 'dihubungi') {
                // Untuk tombol Konfirmasi Dihubungi, perlu checklist
                canProceed = item.dihubungi_data && item.dihubungi_data.terkirim && item.dihubungi_data.dibalas;
                disabledReason = 'Harap lengkapi data dihubungi terlebih dahulu';
            } else if (columnType === 'negosiasi') {
                // Untuk tombol Kelola Negosiasi, selalu bisa diklik
                canProceed = true;
                // Untuk tombol Tertarik, perlu data negosiasi lengkap
                const negosiasiComplete = item.negosiasi_data && item.negosiasi_data.is_complete;
                disabledReason = 'Harap lengkapi data kuesioner negosiasi terlebih dahulu';
            } else if (columnType === 'tertarik') {
                canProceed = true;
            } else {
                canProceed = true;
            }
            
            const actionButton = getProspekActionButtonForStatus(item.status, item.id, item, canProceed, disabledReason);
            
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

function getProspekActionButtonForStatus(status, id, item, canProceed, disabledReason) {
    let buttonHtml = '';
    let buttonText = '';
    let buttonClass = '';
    let onClickAction = '';
    
    if (status === 'Baru') {
        buttonText = '📞 Dihubungi';
        buttonClass = 'action-btn dihubungi-btn';
        onClickAction = `updateProspekStatus('${id}', 'Dihubungi')`;
        buttonHtml = `<button class="${buttonClass}" onclick="event.stopPropagation(); ${onClickAction}" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #4f46e5; color: white;">${buttonText}</button>`;
    } else if (status === 'Dihubungi') {
        buttonText = '✅ Konfirmasi Dihubungi';
        buttonClass = `action-btn confirm-dihubungi-btn ${!canProceed ? 'disabled-btn' : ''}`;
        onClickAction = `openProspekDihubungiConfirm('${id}')`;
        const disabledAttr = !canProceed ? 'disabled' : '';
        const titleAttr = !canProceed ? `title="${disabledReason}"` : '';
        buttonHtml = `<button class="${buttonClass}" onclick="event.stopPropagation(); ${!canProceed ? 'return false;' : onClickAction}" ${disabledAttr} ${titleAttr} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: ${!canProceed ? 'not-allowed' : 'pointer'}; background: ${!canProceed ? '#9ca3af' : '#4f46e5'}; color: white; opacity: ${!canProceed ? '0.6' : '1'};">${buttonText}</button>`;
    } else if (status === 'Negosiasi') {
        // Cek apakah data negosiasi sudah lengkap
        const isComplete = item.negosiasi_data && item.negosiasi_data.is_complete;
        buttonText = '⭐ Tertarik';
        buttonClass = `action-btn tertarik-btn ${!isComplete ? 'disabled-btn' : ''}`;
        onClickAction = `updateProspekStatus('${id}', 'Tertarik')`;
        const disabledAttr = !isComplete ? 'disabled' : '';
        const titleAttr = !isComplete ? 'title="Harap lengkapi data kuesioner negosiasi terlebih dahulu"' : '';
        buttonHtml = `<button class="${buttonClass}" onclick="event.stopPropagation(); ${!isComplete ? 'return false;' : onClickAction}" ${disabledAttr} ${titleAttr} style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: ${!isComplete ? 'not-allowed' : 'pointer'}; background: ${!isComplete ? '#9ca3af' : '#10b981'}; color: white; opacity: ${!isComplete ? '0.6' : '1'};">${buttonText}</button>
                        <button class="action-btn negosiasi-btn" onclick="event.stopPropagation(); openProspekNegosiasiModal('${id}')" style="margin-top: 4px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #f59e0b; color: white;">📝 Kelola Negosiasi</button>`;
    } else if (status === 'Tertarik') {
        buttonText = '📁 Pindah ke DB Commitment';
        buttonClass = 'action-btn commitment-db-btn';
        onClickAction = `confirmTertarikToDB('${id}')`;
        buttonHtml = `<button class="${buttonClass}" onclick="event.stopPropagation(); ${onClickAction}" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 10px; border-radius: 6px; border: none; cursor: pointer; background: #8b5cf6; color: white;">${buttonText}</button>`;
    }
    
    return buttonHtml;
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
    
    const renderColumn = (containerId, items, columnType) => {
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
            
            // ===== PERBAIKAN: Tambahkan tombol aksi =====
            let canProceed = true;
            let disabledReason = '';
            
            if (columnType === 'followup') {
                canProceed = item.followup_data && item.followup_data.terkirim && item.followup_data.dibalas;
                disabledReason = 'Harap lengkapi data follow up terlebih dahulu';
            } else if (columnType === 'pending') {
                const pendingData = item.pending_data || [];
                canProceed = pendingData.length > 0 && pendingData.every(p => p.checked === true && p.text && p.text.trim() !== '');
                disabledReason = 'Harap isi semua balasan pending dan centang';
            } else if (columnType === 'closing') {
                canProceed = true;
            } else {
                canProceed = true;
            }
            
            const actionButton = getActionButtonForStatus(item.status, item.id, canProceed, disabledReason);
            
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${checkboxHtml}
                    <div style="flex: 1; min-width: 0;">
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
        
        // Event listener untuk klik pada area card (tanpa checkbox)
        container.querySelectorAll('.card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                // Abaikan jika klik pada checkbox, whatsapp, atau action button
                if (e.target.classList.contains('full-item-checkbox') || 
                    e.target.classList.contains('whatsapp-icon') || 
                    e.target.classList.contains('action-btn')) {
                    return;
                }
                openDetailCustomer(card.dataset.id);
            });
        });
        
        // Event listener untuk checkbox
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
    
    renderColumn('fullBaruList', lists.baru, 'baru');
    renderColumn('fullFollowupList', lists.followup, 'followup');
    renderColumn('fullPendingList', lists.pending, 'pending');
    renderColumn('fullClosingList', lists.closing, 'closing');
    
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
    
    const renderColumn = (containerId, items, columnType) => {
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
            
            // ===== PERBAIKAN: Tambahkan tombol aksi =====
            let canProceed = true;
            let disabledReason = '';
            
            if (columnType === 'dihubungi') {
                canProceed = item.dihubungi_data && item.dihubungi_data.terkirim && item.dihubungi_data.dibalas;
                disabledReason = 'Harap lengkapi data dihubungi terlebih dahulu';
            } else if (columnType === 'negosiasi') {
                canProceed = true;
            } else if (columnType === 'tertarik') {
                canProceed = true;
            } else {
                canProceed = true;
            }
            
            const actionButton = getProspekActionButtonForStatus(item.status, item.id, item, canProceed, disabledReason);
            
            return `<div class="card-item ${deadlineClass}" data-id="${item.id}">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${checkboxHtml}
                    <div style="flex: 1; min-width: 0;">
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
        
        // Event listener untuk klik pada area card (tanpa checkbox)
        container.querySelectorAll('.card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                // Abaikan jika klik pada checkbox, whatsapp, atau action button
                if (e.target.classList.contains('full-item-checkbox') || 
                    e.target.classList.contains('whatsapp-icon') || 
                    e.target.classList.contains('action-btn')) {
                    return;
                }
                openDetailProspek(card.dataset.id);
            });
        });
        
        // Event listener untuk checkbox
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
    
    renderColumn('fullProspekBaruList', lists.baru, 'baru');
    renderColumn('fullProspekDihubungiList', lists.dihubungi, 'dihubungi');
    renderColumn('fullProspekNegosiasiList', lists.negosiasi, 'negosiasi');
    renderColumn('fullProspekTertarikList', lists.tertarik, 'tertarik');
    
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

function openAgentDetail(id) {
    const agent = agentsData.find(a => a.id === id);
    if (!agent) return;
    alert(`Detail Agent:\n\nNama: ${agent.nama}\nID Agent: ${agent.agent_id}\nHP: ${agent.hp}\nType: ${agent.agent_type || '-'}\nUpline: ${agent.upline || '-'}\nCID: ${agent.cid || '-'}\nBank: ${agent.jenis_bank || '-'}`);
}

// ========== PRODUK FUNCTIONS ==========
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
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '9999999';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <h3>✏️ Edit Produk</h3>
            <div class="modal-subtitle">Edit data produk</div>
            <div style="padding: 0 20px;">
                <div class="form-group"><label>Nama Produk</label><input type="text" id="editNama" value="${escapeHtml(produk.nama)}"></div>
                <div class="form-group"><label>HPP (Modal)</label><input type="number" id="editHpp" value="${produk.hpp}"></div>
                <div class="form-group"><label>Keterangan</label><textarea id="editKeterangan" rows="2">${escapeHtml(produk.keterangan || '')}</textarea></div>
            </div>
            <div class="modal-buttons">
                <button id="saveEditBtn" class="btn-primary">💾 Simpan</button>
                <button class="closeEditBtn btn-outline">Batal</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
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
        modal.remove();
        await loadProduk();
    };
    
    modal.querySelector('.closeEditBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ========== RENDER TRANSAKSI LIST - PREMIUM ==========
function renderTransaksiList() {
    const container = document.getElementById('dbTransaksiList');
    if (!container) return;
    
    // Filter data
    const searchTerm = document.getElementById('searchTransaksiInput')?.value.toLowerCase() || '';
    const filterJenis = document.getElementById('filterTransaksiJenis')?.value || '';
    const filterStatus = document.getElementById('filterTransaksiStatus')?.value || '';
    const filterUpline = document.getElementById('filterTransaksiUpline')?.value.toLowerCase() || '';
    
    let filtered = [...transaksiData];
    
    if (searchTerm) {
        filtered = filtered.filter(item =>
            (item.nama && String(item.nama).toLowerCase().includes(searchTerm)) ||
            (item.agent_id && String(item.agent_id).toLowerCase().includes(searchTerm)) ||
            (item.hp && String(item.hp).includes(searchTerm))
        );
    }
    
    if (filterJenis) {
        filtered = filtered.filter(item => item.progres_jenis === filterJenis);
    }
    
    if (filterStatus) {
        filtered = filtered.filter(item => item.status === filterStatus);
    }
    
    if (filterUpline) {
        filtered = filtered.filter(item => 
            item.upline_name && String(item.upline_name).toLowerCase().includes(filterUpline)
        );
    }
    
    // Update total count
    const totalCountSpan = document.getElementById('transaksiTotalCount');
    if (totalCountSpan) {
        totalCountSpan.innerText = filtered.length;
    }
    
    const totalAllSpan = document.getElementById('transaksiTotalAll');
    if (totalAllSpan) {
        totalAllSpan.innerText = transaksiData.length;
    }
    
    // Update totals
    updateTransaksiTotals(filtered);
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #9ca3af;">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <p style="font-size: 16px; font-weight: 500;">Tidak ada data transaksi</p>
                <p style="font-size: 13px; margin-top: 4px;">Coba ubah filter atau import data baru</p>
            </div>
        `;
        return;
    }
    
    // Build HTML
    let html = '';
    filtered.forEach((item, index) => {
        const isChecked = selectedTransaksiIds.get(item.id) === true;
        const absValue = Math.abs(item.progres_jumlah || 0);
        
        // Status badge class
        let statusClass = 'baru';
        let statusText = '📋 Baru';
        if (item.status === 'imported') {
            statusClass = 'imported';
            statusText = '✅ Sudah Dipindah';
        } else if (item.status === 'pending_import') {
            statusClass = 'pending';
            statusText = '⏳ Pending';
        }
        
        // Jenis badge class
        let jenisClass = 'normal';
        let jenisText = '⚖️ Normal';
        let nilaiClass = 'normal';
        let progressClass = 'normal';
        if (item.progres_jenis === 'naik') {
            jenisClass = 'naik';
            jenisText = '📈 Naik';
            nilaiClass = 'naik';
            progressClass = 'naik';
        } else if (item.progres_jenis === 'turun') {
            jenisClass = 'turun';
            jenisText = '📉 Turun';
            nilaiClass = 'turun';
            progressClass = 'turun';
        } else if (item.progres_jenis === 'tidak_transaksi') {
            jenisClass = 'tidak';
            jenisText = '🚫 Tidak Transaksi';
            nilaiClass = 'tidak';
            progressClass = 'tidak';
        }
        
        // Progress bar
        const maxValue = Math.max(...transaksiData.map(t => Math.abs(t.progres_jumlah || 0)), 1);
        const barPercent = Math.min((absValue / maxValue) * 100, 100);
        
        const bulanLalu = item.transaksi_bulan_lalu || 0;
        const bulanIni = item.transaksi_bulan_ini || 0;
        
        html += `
            <div class="transaksi-item-premium" data-id="${item.id}">
                <div class="nomor-urut">${index + 1}</div>
                <div class="checkbox-wrapper">
                    <input type="checkbox" class="transaksi-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                </div>
                <div class="info-utama">
                    <div class="header-row">
                        <span class="nama">${escapeHtml(item.nama || item.agent_id)}</span>
                        <span class="agent-id">🆔 ${escapeHtml(item.agent_id || '-')}</span>
                        <span class="badge-jenis ${jenisClass}">${jenisText}</span>
                        <span class="badge-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="detail-row">
                        <span>📱 ${escapeHtml(item.hp || '-')}</span>
                        <span>👤 ${escapeHtml(item.upline_name || '-')}</span>
                        <span>📊 ${bulanLalu.toLocaleString()} → ${bulanIni.toLocaleString()}</span>
                        ${item.apk ? `<span>📱 ${escapeHtml(item.apk)}</span>` : ''}
                    </div>
                </div>
                <div class="nilai-container">
                    <div class="nilai ${nilaiClass}">
                        ${item.progres_jenis === 'tidak_transaksi' ? '0' : (item.progres_jumlah > 0 ? '+' : '')}${(item.progres_jumlah || 0).toLocaleString()}
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill ${progressClass}" style="width: ${barPercent}%;"></div>
                    </div>
                    <span class="nilai-label">${absValue.toLocaleString()}</span>
                </div>
                <div class="aksi-container">
                    <button class="btn-wa" data-hp="${escapeHtml(item.hp || '')}">💬</button>
                    ${item.status !== 'imported' ? `
                        <button class="btn-move" data-id="${item.id}">📋 Pindah</button>
                    ` : ''}
                    <button class="btn-delete" data-id="${item.id}">🗑️</button>
                </div>
            </div>
        `;
    });
    
    // Set HTML
    container.innerHTML = html;
    
    // ===== EVENT DELEGATION - SATU EVENT LISTENER =====
    // Hapus event listener lama dengan clone
    const newContainer = container.cloneNode(false);
    container.parentNode.replaceChild(newContainer, container);
    
    const freshContainer = document.getElementById('dbTransaksiList');
    if (!freshContainer) return;
    
    // Pindahkan HTML ke container baru
    freshContainer.innerHTML = html;
    
    // ===== SATU EVENT LISTENER UNTUK SEMUA =====
    freshContainer.addEventListener('click', function(e) {
        const target = e.target;
        
        // Tombol Delete
        if (target.classList.contains('btn-delete')) {
            e.stopPropagation();
            e.preventDefault();
            const id = target.dataset.id;
            if (id) {
                deleteTransaksiItem(id);
            }
            return;
        }
        
        // Tombol WA
        if (target.classList.contains('btn-wa')) {
            e.stopPropagation();
            e.preventDefault();
            const hp = target.dataset.hp;
            if (hp) {
                openWA(hp);
            }
            return;
        }
        
        // Tombol Pindah
        if (target.classList.contains('btn-move')) {
            e.stopPropagation();
            e.preventDefault();
            const id = target.dataset.id;
            if (id) {
                moveSingleToFollowup(id);
            }
            return;
        }
        
        // Checkbox
        if (target.classList.contains('transaksi-checkbox')) {
            // Handle di event change
            return;
        }
        
        // Klik pada item (bukan tombol)
        const itemElement = target.closest('.transaksi-item-premium');
        if (itemElement && !target.closest('.aksi-container') && !target.closest('.checkbox-wrapper')) {
            const id = itemElement.dataset.id;
            if (id) {
                openDetailTransaksi(id);
            }
        }
    });
    
    // ===== SATU EVENT LISTENER UNTUK CHECKBOX =====
    freshContainer.addEventListener('change', function(e) {
        if (e.target.classList.contains('transaksi-checkbox')) {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                selectedTransaksiIds.set(id, true);
            } else {
                selectedTransaksiIds.delete(id);
            }
            updateSelectAllTransaksiButton();
            updateTransaksiSelectionCount();
        }
    });
    
    updateSelectAllTransaksiButton();
    updateTransaksiSelectionCount();
}

// ===== HANDLE TRANSAKSI CHECKBOX CHANGE =====
function handleTransaksiCheckboxChange(e) {
    e.stopPropagation();
    const id = this.dataset.id;
    if (this.checked) {
        selectedTransaksiIds.set(id, true);
    } else {
        selectedTransaksiIds.delete(id);
    }
    updateSelectAllTransaksiButton();
    updateTransaksiSelectionCount();
}

// ========== UPDATE TRANSAKSI TOTALS ==========
function updateTransaksiTotals(filteredData) {
    const data = filteredData || transaksiData;
    let totalNaik = 0;
    let totalTurun = 0;
    let totalNormal = 0;
    let totalTidak = 0;
    
    data.forEach(t => {
        const val = t.progres_jumlah || 0;
        if (t.progres_jenis === 'naik') {
            totalNaik += val;
        } else if (t.progres_jenis === 'turun') {
            totalTurun += Math.abs(val);
        } else if (t.progres_jenis === 'tidak_transaksi') {
            totalTidak++;
        } else {
            totalNormal += Math.abs(val);
        }
    });
    
    const naikSpan = document.getElementById('transaksiTotalNaik');
    const turunSpan = document.getElementById('transaksiTotalTurun');
    const normalSpan = document.getElementById('transaksiTotalNormal');
    const tidakSpan = document.getElementById('transaksiTotalTidak');
    
    if (naikSpan) naikSpan.innerText = totalNaik.toLocaleString();
    if (turunSpan) turunSpan.innerText = totalTurun.toLocaleString();
    if (normalSpan) normalSpan.innerText = totalNormal.toLocaleString();
    if (tidakSpan) tidakSpan.innerText = totalTidak.toLocaleString();
}

// ========== UPDATE TRANSAKSI SELECTION COUNT ==========
function updateTransaksiSelectionCount() {
    const countSpan = document.getElementById('transaksiSelectedCount');
    if (countSpan) {
        countSpan.innerText = selectedTransaksiIds.size;
    }
}

// ========== UPDATE TRANSAKSI STATS ==========
function updateTransaksiStats() {
    const total = transaksiData.length;
    const imported = transaksiData.filter(t => t.status === 'imported').length;
    const pending = transaksiData.filter(t => t.status !== 'imported').length;
    
    // Hitung total naik dan turun
    let totalNaik = 0;
    let totalTurun = 0;
    let totalNormal = 0;
    
    transaksiData.forEach(t => {
        const val = t.progres_jumlah || 0;
        if (t.progres_jenis === 'naik') totalNaik += val;
        else if (t.progres_jenis === 'turun') totalTurun += Math.abs(val);
        else totalNormal += Math.abs(val);
    });
    
    const statsHtml = `
        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
            <div style="background: #eef2ff; padding: 8px 16px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600; color: #4f46e5;">📊 Total</span>
                <span style="font-weight: 700; color: #1f2937;">${total}</span>
            </div>
            <div style="background: #d1fae5; padding: 8px 16px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600; color: #065f46;">✅ Imported</span>
                <span style="font-weight: 700; color: #1f2937;">${imported}</span>
            </div>
            <div style="background: #fef3c7; padding: 8px 16px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600; color: #92400e;">⏳ Pending</span>
                <span style="font-weight: 700; color: #1f2937;">${pending}</span>
            </div>
            <div style="background: #d1fae5; padding: 8px 16px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600; color: #065f46;">📈 Naik</span>
                <span style="font-weight: 700; color: #1f2937;">+${totalNaik.toLocaleString()}</span>
            </div>
            <div style="background: #fee2e2; padding: 8px 16px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600; color: #991b1b;">📉 Turun</span>
                <span style="font-weight: 700; color: #1f2937;">-${totalTurun.toLocaleString()}</span>
            </div>
            <div style="background: #fef3c7; padding: 8px 16px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600; color: #92400e;">⚖️ Normal</span>
                <span style="font-weight: 700; color: #1f2937;">${totalNormal.toLocaleString()}</span>
            </div>
        </div>
    `;
    
    const statsContainer = document.getElementById('transaksiStats');
    if (statsContainer) {
        statsContainer.innerHTML = statsHtml;
    }
}

// ========== OPEN DETAIL TRANSAKSI ==========
function openDetailTransaksi(id) {
    const item = transaksiData.find(t => t.id === id);
    if (!item) return;
    
    const modalHtml = `
        <div class="modal-content" style="max-width: 500px; max-height: 85vh; overflow-y: auto; background: #fff; border-radius: 24px; position: relative;">
            <div style="padding: 20px 24px 0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-size: 20px; margin: 0; color: #1f2937;">📊 Detail Transaksi</h3>
                <button onclick="closeDetailModal()" style="
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 0 4px;
                    transition: all 0.2s;
                    line-height: 1;
                " onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#6b7280'">✕</button>
            </div>
            <div class="modal-subtitle" style="font-size: 13px; color: #6b7280; padding: 0 24px 12px 24px; border-bottom: 1px solid #f0f0f0;">
                Informasi lengkap data transaksi
            </div>
            
            <div style="padding: 0 24px 20px;">
                <div style="background: #f9fafb; border-radius: 14px; padding: 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">ID Agent</div>
                            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">${escapeHtml(item.agent_id || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">Nama</div>
                            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">${escapeHtml(item.nama || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">Nomor HP</div>
                            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">${escapeHtml(item.hp || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">Aplikasi</div>
                            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">${escapeHtml(item.apk || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">Upline</div>
                            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">${escapeHtml(item.upline_name || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">HP Upline</div>
                            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">${escapeHtml(item.upline_phone || '-')}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 16px; background: #f9fafb; border-radius: 14px; padding: 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">Jenis Progres</div>
                            <div style="font-weight: 600; font-size: 14px; color: ${item.progres_jenis === 'naik' ? '#10b981' : (item.progres_jenis === 'turun' ? '#ef4444' : (item.progres_jenis === 'tidak_transaksi' ? '#6b7280' : '#f59e0b'))};">
                                ${item.progres_jenis === 'naik' ? '📈 Naik' : (item.progres_jenis === 'turun' ? '📉 Turun' : (item.progres_jenis === 'tidak_transaksi' ? '🚫 Tidak Transaksi' : '⚖️ Normal'))}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">Selisih</div>
                            <div style="font-weight: 700; font-size: 18px; color: ${item.progres_jenis === 'naik' ? '#10b981' : (item.progres_jenis === 'turun' ? '#ef4444' : (item.progres_jenis === 'tidak_transaksi' ? '#6b7280' : '#f59e0b'))};">
                                ${item.progres_jenis === 'tidak_transaksi' ? '0' : (item.progres_jumlah > 0 ? '+' : '')}${(item.progres_jumlah || 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- ===== DETAIL TRANSAKSI BULAN LALU & BULAN INI ===== -->
                <div style="margin-top: 16px; background: #f9fafb; border-radius: 14px; padding: 16px;">
                    <div style="font-weight: 600; font-size: 13px; color: #1f2937; margin-bottom: 12px;">📊 Data Perbandingan Transaksi</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div style="background: #f1f5f9; border-radius: 10px; padding: 12px; border-left: 3px solid #f59e0b;">
                            <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Bulan Lalu</div>
                            <div style="font-weight: 700; font-size: 20px; color: #1f2937; margin-top: 4px;">${(item.transaksi_bulan_lalu || 0).toLocaleString()}</div>
                            ${item.tanggal_bulan_lalu ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">📅 ${new Date(item.tanggal_bulan_lalu).toLocaleDateString('id-ID')}</div>` : '<div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">📅 Tanggal tidak tersedia</div>'}
                        </div>
                        <div style="background: #f1f5f9; border-radius: 10px; padding: 12px; border-left: 3px solid #4f46e5;">
                            <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Bulan Ini</div>
                            <div style="font-weight: 700; font-size: 20px; color: #1f2937; margin-top: 4px;">${(item.transaksi_bulan_ini || 0).toLocaleString()}</div>
                            ${item.tanggal_bulan_ini ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">📅 ${new Date(item.tanggal_bulan_ini).toLocaleDateString('id-ID')}</div>` : '<div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">📅 Tanggal tidak tersedia</div>'}
                        </div>
                    </div>
                    <div style="margin-top: 12px; text-align: center; font-size: 13px; color: #6b7280;">
                        Selisih: <strong style="color: ${item.progres_jenis === 'naik' ? '#10b981' : (item.progres_jenis === 'turun' ? '#ef4444' : '#f59e0b')}">
                            ${item.progres_jenis === 'tidak_transaksi' ? '0' : (item.progres_jumlah > 0 ? '+' : '')}${(item.progres_jumlah || 0).toLocaleString()}
                        </strong>
                    </div>
                </div>
                
                <div style="margin-top: 12px; background: #f9fafb; border-radius: 14px; padding: 12px 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">Status</div>
                            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">${item.status === 'imported' ? '✅ Sudah Dipindah' : (item.status === 'pending_import' ? '⏳ Pending' : '📋 Baru')}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280;">Tanggal Import</div>
                            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">${item.tanggal_transaksi ? new Date(item.tanggal_transaksi).toLocaleDateString('id-ID') : '-'}</div>
                        </div>
                    </div>
                </div>
                
                ${item.user_id && currentUserRole === 'owner' ? `
                    <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
                        👤 Pemilik: ${item.user_id === currentUser.id ? 'Anda' : 'CS Lain'}
                    </div>
                ` : ''}
            </div>
            
            <div class="modal-buttons" style="display: flex; gap: 12px; padding: 16px 24px 24px; border-top: 1px solid #e5e7eb; flex-wrap: wrap;">
                <button onclick="closeDetailModal()" class="btn-primary" style="flex: 1; padding: 12px; border: none; border-radius: 14px; font-weight: 600; cursor: pointer; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white;">Tutup</button>
                <button onclick="closeDetailModal(); openWA('${escapeHtml(item.hp || '')}')" class="btn-success" style="flex: 1; padding: 12px; border: none; border-radius: 14px; font-weight: 600; cursor: pointer; background: #25D366; color: white;">💬 WhatsApp</button>
                ${item.status !== 'imported' ? `
                    <button onclick="closeDetailModal(); moveSingleToFollowup('${item.id}')" class="btn-primary" style="flex: 1; padding: 12px; border: none; border-radius: 14px; font-weight: 600; cursor: pointer; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white;">📋 Pindah ke Followup</button>
                ` : ''}
                <button onclick="closeDetailModal(); deleteTransaksiItem('${item.id}')" class="btn-danger" style="flex: 1; padding: 12px; border: none; border-radius: 14px; font-weight: 600; cursor: pointer; background: linear-gradient(135deg, #ef4444, #dc2626); color: white;">🗑️ Hapus</button>
            </div>
        </div>
    `;
    
    // Buat modal
    const modal = document.createElement('div');
    modal.id = 'detailTransaksiModal';
    modal.className = 'modal';
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
    modal.innerHTML = modalHtml;
    
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    // Klik di luar modal untuk tutup
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeDetailModal();
        }
    });
    
    applyDarkModeToModal(modal);
}

// ========== CLOSE DETAIL MODAL ==========
function closeDetailModal() {
    const modal = document.getElementById('detailTransaksiModal');
    if (modal) {
        modal.remove();
    }
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
}

// ========== SETUP TRANSAKSI FILTERS ==========
function setupTransaksiFilters() {
    const searchInput = document.getElementById('searchTransaksiInput');
    const filterJenis = document.getElementById('filterTransaksiJenis');
    const filterStatus = document.getElementById('filterTransaksiStatus');
    const filterDateStart = document.getElementById('filterTransaksiDateStart');
    const filterDateEnd = document.getElementById('filterTransaksiDateEnd');
    const resetBtn = document.getElementById('resetTransaksiFilterBtn');
    
    const applyFilters = () => renderTransaksiList();
    
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterJenis) filterJenis.addEventListener('change', applyFilters);
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (filterDateStart) filterDateStart.addEventListener('change', applyFilters);
    if (filterDateEnd) filterDateEnd.addEventListener('change', applyFilters);
    
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            if (filterJenis) filterJenis.value = '';
            if (filterStatus) filterStatus.value = '';
            if (filterDateStart) filterDateStart.value = '';
            if (filterDateEnd) filterDateEnd.value = '';
            applyFilters();
        });
    }
}

// ========== UPDATE SELECT ALL TRANSAKSI ==========
function updateSelectAllTransaksiButton() {
    const btn = document.getElementById('selectAllTransaksi');
    if (!btn) return;
    
    // Hanya untuk owner
    if (currentUserRole !== 'owner') {
        btn.style.display = 'none';
        return;
    }
    btn.style.display = 'inline-block';
    
    const checkboxes = document.querySelectorAll('#dbTransaksiList .transaksi-checkbox');
    if (checkboxes.length === 0) {
        btn.textContent = '✅ Pilih Semua';
        return;
    }
    
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
}

// ========== SELECT ALL TRANSAKSI ==========
function toggleSelectAllTransaksi() {
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menggunakan fitur ini!', true);
        return;
    }
    
    const checkboxes = document.querySelectorAll('#dbTransaksiList .transaksi-checkbox');
    if (checkboxes.length === 0) return;
    
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        const id = cb.dataset.id;
        if (!allChecked) {
            selectedTransaksiIds.set(id, true);
        } else {
            selectedTransaksiIds.delete(id);
        }
    });
    
    updateSelectAllTransaksiButton();
    updateTransaksiSelectionCount();
}

// ========== MOVE SELECTED TO FOLLOWUP ==========
let isMovingSelected = false;

async function moveSelectedToFollowup() {
    if (isMovingSelected) {
        showNotifTop('⏳ Proses pemindahan sedang berjalan...', true);
        return;
    }
    
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat memindahkan massal!', true);
        return;
    }
    
    const selectedIds = Array.from(selectedTransaksiIds.keys());
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang dipilih!', true);
        return;
    }
    
    if (!confirm(`Pindahkan ${selectedIds.length} data ke Followup Agen?`)) {
        return;
    }
    
    isMovingSelected = true;
    const progress = showFloatingProgress('📋 Memindahkan ke Followup', selectedIds.length);
    let moved = 0;
    let failed = 0;
    
    try {
        for (const id of selectedIds) {
            try {
                const item = transaksiData.find(t => t.id === id);
                if (!item) {
                    failed++;
                    continue;
                }
                
                // Cek duplikat
                const { data: existing } = await window.db
                    .from('customers')
                    .select('id')
                    .eq('agent_id', item.agent_id)
                    .maybeSingle();
                
                if (existing) {
                    failed++;
                    continue;
                }
                
                // Insert ke customers
                await window.db.from('customers').insert({
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
                
                // Update status di db_transaksi
                await window.db.from('db_transaksi').update({ 
                    status: 'imported', 
                    updated_at: new Date().toISOString() 
                }).eq('id', id);
                
                selectedTransaksiIds.delete(id);
                moved++;
                
                const percent = Math.floor((moved / selectedIds.length) * 100);
                progress.update(percent, 'Memindahkan', `Memproses...`, moved, selectedIds.length);
                await delay(30);
                
            } catch (e) {
                console.error(`Gagal pindah ${id}:`, e);
                failed++;
            }
        }
        
        progress.update(100, 'Selesai', `Berhasil: ${moved}, Gagal: ${failed}`, moved, selectedIds.length);
        showNotifTop(`✅ ${moved} data dipindahkan ke Followup Agen, Gagal: ${failed}`);
        
        await loadDbTransaksi();
        await loadCustomers();
        
    } catch (err) {
        console.error('Error move selected:', err);
        showNotifTop('❌ Gagal: ' + err.message, true);
    } finally {
        isMovingSelected = false;
        setTimeout(() => progress.hide(), 2000);
    }
}

// ========== DELETE SELECTED TRANSAKSI ==========
let isDeletingSelectedTransaksi = false;

async function deleteSelectedTransaksi() {
    if (isDeletingSelectedTransaksi) {
        showNotifTop('⏳ Proses hapus sedang berjalan...', true);
        return;
    }
    
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus massal!', true);
        return;
    }
    
    const selectedIds = Array.from(selectedTransaksiIds.keys());
    if (selectedIds.length === 0) {
        showNotifTop('⚠️ Tidak ada data yang dipilih', true);
        return;
    }
    
    // Hanya 1 kali konfirmasi
    if (!confirm(`Hapus ${selectedIds.length} data transaksi yang dipilih?`)) {
        return;
    }
    
    isDeletingSelectedTransaksi = true;
    const progress = showFloatingProgress('🗑️ Menghapus Transaksi', selectedIds.length);
    let deleted = 0;
    
    try {
        for (const id of selectedIds) {
            try {
                await window.db.from('db_transaksi').delete().eq('id', id);
                selectedTransaksiIds.delete(id);
                
                // Hapus dari data lokal
                const index = transaksiData.findIndex(t => t.id === id);
                if (index !== -1) {
                    transaksiData.splice(index, 1);
                }
                
                deleted++;
                progress.update(Math.floor((deleted / selectedIds.length) * 100), 'Menghapus', `Memproses...`, deleted, selectedIds.length);
                await delay(30);
            } catch (e) {
                console.error(`Gagal hapus ${id}:`, e);
            }
        }
        
        progress.update(100, 'Selesai', `Berhasil menghapus ${deleted} data`, deleted, selectedIds.length);
        showNotifTop(`✅ ${deleted} data berhasil dihapus`);
        
        renderTransaksiList();
        updateTransaksiStats();
        
    } catch (err) {
        console.error('Error delete selected:', err);
        showNotifTop('❌ Gagal: ' + err.message, true);
    } finally {
        isDeletingSelectedTransaksi = false;
        setTimeout(() => progress.hide(), 2000);
    }
}

// ========== DELETE ALL TRANSAKSI ==========
let isDeletingAllTransaksi = false;

async function deleteAllTransaksi() {
    if (isDeletingAllTransaksi) {
        showNotifTop('⏳ Proses hapus sedang berjalan...', true);
        return;
    }
    
    if (currentUserRole !== 'owner') {
        showNotifTop('⚠️ Hanya Owner yang dapat menghapus semua data!', true);
        return;
    }
    
    // Hanya 1 kali konfirmasi
    if (!confirm('⚠️ PERINGATAN! Anda akan menghapus SEMUA data Transaksi. Tidak bisa dibatalkan!\n\nYakin ingin melanjutkan?')) {
        return;
    }
    
    isDeletingAllTransaksi = true;
    const progress = showFloatingProgress('🗑️ Menghapus Semua Transaksi', 0);
    progress.update(0, 'Menghapus', 'Mengambil data...');
    
    try {
        let query = window.db.from('db_transaksi').select('id');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        
        const { data, error } = await query;
        if (error) {
            showNotifTop('❌ Gagal: ' + error.message, true);
            progress.hide();
            isDeletingAllTransaksi = false;
            return;
        }
        
        const totalData = data.length;
        progress.setTotal(totalData);
        
        if (totalData === 0) {
            showNotifTop('📭 Tidak ada data untuk dihapus', true);
            progress.hide();
            isDeletingAllTransaksi = false;
            return;
        }
        
        let deleted = 0;
        for (const item of data) {
            try {
                await window.db.from('db_transaksi').delete().eq('id', item.id);
                deleted++;
                progress.update(Math.floor((deleted / totalData) * 100), 'Menghapus', `Memproses...`, deleted, totalData);
                await delay(20);
            } catch (e) {
                console.error('Gagal hapus:', e);
            }
        }
        
        selectedTransaksiIds.clear();
        transaksiData = [];
        
        progress.update(100, 'Selesai', `Berhasil menghapus ${deleted} data`, deleted, totalData);
        showNotifTop(`✅ ${deleted} data Transaksi berhasil dihapus`);
        
        renderTransaksiList();
        updateTransaksiStats();
        
    } catch (err) {
        console.error('Error delete all:', err);
        showNotifTop('❌ Gagal: ' + err.message, true);
    } finally {
        isDeletingAllTransaksi = false;
        setTimeout(() => progress.hide(), 2000);
    }
}

// ========== DELETE TRANSAKSI ITEM ==========
let isDeletingTransaksi = false;

async function deleteTransaksiItem(id) {
    // Cegah multiple delete
    if (isDeletingTransaksi) {
        console.log('Delete already in progress, ignoring...');
        return;
    }
    
    const item = transaksiData.find(t => t.id === id);
    if (!item) {
        showNotifTop('❌ Data tidak ditemukan!', true);
        return;
    }
    
    // Hanya tampilkan 1 kali konfirmasi
    if (!confirm(`Hapus data transaksi "${escapeHtml(item.nama || item.agent_id)}"?`)) {
        return;
    }
    
    isDeletingTransaksi = true;
    
    try {
        const { error } = await window.db.from('db_transaksi').delete().eq('id', id);
        if (error) {
            showNotifTop('❌ Gagal hapus: ' + error.message, true);
            isDeletingTransaksi = false;
            return;
        }
        
        // Hapus dari selected
        selectedTransaksiIds.delete(id);
        
        // Hapus dari data lokal
        const index = transaksiData.findIndex(t => t.id === id);
        if (index !== -1) {
            transaksiData.splice(index, 1);
        }
        
        showNotifTop('🗑️ Data transaksi berhasil dihapus');
        
        // Render ulang list
        renderTransaksiList();
        updateTransaksiStats();
        
    } catch (err) {
        console.error('Error delete transaksi:', err);
        showNotifTop('❌ Gagal: ' + err.message, true);
    } finally {
        isDeletingTransaksi = false;
    }
}

// ========== MOVE SINGLE TO FOLLOWUP ==========
async function moveSingleToFollowup(id) {
    const item = transaksiData.find(t => t.id === id);
    if (!item) {
        showNotifTop('❌ Data tidak ditemukan!', true);
        return;
    }
    
    // Cek apakah sudah ada di customers
    const { data: existing } = await window.db
        .from('customers')
        .select('id')
        .eq('agent_id', item.agent_id)
        .maybeSingle();
    
    if (existing) {
        showNotifTop(`⚠️ ID Agent "${item.agent_id}" sudah terdaftar di Followup Agen!`, true);
        return;
    }
    
    if (!confirm(`Pindahkan data "${escapeHtml(item.nama || item.agent_id)}" ke Followup Agen?`)) {
        return;
    }
    
    try {
        // Insert ke customers
        const { error: insertError } = await window.db.from('customers').insert({
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
        
        if (insertError) {
            showNotifTop('❌ Gagal pindah: ' + insertError.message, true);
            return;
        }
        
        // Update status di db_transaksi
        await window.db.from('db_transaksi').update({ 
            status: 'imported', 
            updated_at: new Date().toISOString() 
        }).eq('id', id);
        
        // Hapus dari selected
        selectedTransaksiIds.delete(id);
        
        showNotifTop('✅ Data berhasil dipindahkan ke Followup Agen!');
        await loadDbTransaksi();
        await loadCustomers();
        
    } catch (err) {
        console.error('Error move to followup:', err);
        showNotifTop('❌ Gagal: ' + err.message, true);
    }
}

// ========== DATABASE ARCHIVE RENDER FUNCTIONS ==========
function renderDBClosing(items) {
    const container = document.getElementById('dbClosingList');
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data closing</p>';
        return;
    }
    
    container.innerHTML = items.map(item => {
        const isChecked = selectedClosingIds.get(item.id) === true;
        let followupText = '';
        if (item.followup_data && item.followup_data.pesan) {
            followupText = `<small>📝 ${escapeHtml(item.followup_data.pesan.substring(0, 50))}${item.followup_data.pesan.length > 50 ? '...' : ''}</small>`;
        }
        return `
            <div class="db-item" data-id="${item.id}" data-type="closing" style="cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>📱 ${escapeHtml(item.hp)}</p>
                    <small>Closing: ${item.closing_date ? new Date(item.closing_date).toLocaleDateString('id-ID') : '-'}</small>
                    ${item.closing_note ? `<small>Catatan: ${escapeHtml(item.closing_note)}</small>` : ''}
                    ${followupText ? `<small>💬 ${followupText}</small>` : ''}
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_closing', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('#dbClosingList .db-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox' && 
                !e.target.classList.contains('db-item-wa') && 
                !e.target.classList.contains('db-item-delete')) {
                openDBDetailModal(el.dataset.id, 'closing');
            }
        });
    });
    
    document.querySelectorAll('#dbClosingList .db-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = cb.dataset.id;
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
        
        // ===== PERBAIKAN: Tampilkan data negosiasi jika ada =====
        let negosiasiPreview = '';
        if (item.negosiasi_data) {
            const nd = item.negosiasi_data;
            const fields = [];
            if (nd.aplikasi) fields.push(`📱 ${nd.aplikasi}`);
            if (nd.domisili) fields.push(`📍 ${nd.domisili}`);
            if (nd.transaksi) fields.push(`💰 ${nd.transaksi}`);
            if (nd.penawaran) fields.push(`🏷️ ${nd.penawaran}`);
            negosiasiPreview = fields.length > 0 ? 
                `<small>📋 ${fields.join(' | ')}</small>` : '';
        }
        
        // ===== PERBAIKAN: Tampilkan data dihubungi jika ada =====
        let dihubungiPreview = '';
        if (item.dihubungi_data && item.dihubungi_data.pesan) {
            const pesan = item.dihubungi_data.pesan.substring(0, 30);
            dihubungiPreview = `<small>💬 Pesan: ${escapeHtml(pesan)}${item.dihubungi_data.pesan.length > 30 ? '...' : ''}</small>`;
        } else if (item.pesan_terkirim) {
            const pesan = item.pesan_terkirim.substring(0, 30);
            dihubungiPreview = `<small>💬 Pesan: ${escapeHtml(pesan)}${item.pesan_terkirim.length > 30 ? '...' : ''}</small>`;
        }
        
        return `
            <div class="db-item" data-id="${item.id}" data-type="tidak" style="cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>📱 ${escapeHtml(item.hp)}</p>
                    <small>❌ Alasan: ${escapeHtml(item.alasan || '-')}</small>
                    <small>📅 ${item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}</small>
                    ${item.status_sebelumnya ? `<small>📌 Status sebelumnya: ${escapeHtml(item.status_sebelumnya)}</small>` : ''}
                    ${negosiasiPreview}
                    ${dihubungiPreview}
                    ${item.upline_name ? `<small>👤 Upline: ${escapeHtml(item.upline_name)}</small>` : ''}
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_tidak_tertarik', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Event listener untuk klik detail
    document.querySelectorAll('#dbTidakList .db-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox' && 
                !e.target.classList.contains('db-item-wa') && 
                !e.target.classList.contains('db-item-delete')) {
                openDBDetailModal(el.dataset.id, 'tidak');
            }
        });
    });
    
    // Event listener untuk checkbox
    document.querySelectorAll('#dbTidakList .db-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = cb.dataset.id;
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
        // ===== PERBAIKAN: Tambahkan tombol kembali =====
        return `
            <div class="db-item" data-id="${item.id}" data-type="nomor_salah" style="cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>📱 ${escapeHtml(item.hp)}</p>
                    <small>Alasan: ${escapeHtml(item.alasan || '-')}</small>
                    <small>📅 ${item.deleted_at ? new Date(item.deleted_at).toLocaleDateString('id-ID') : '-'}</small>
                    ${item.followup_data ? `<small>💬 Pesan: ${escapeHtml(item.followup_data.pesan?.substring(0, 30) || '-')}${item.followup_data.pesan?.length > 30 ? '...' : ''}</small>` : ''}
                    ${item.dihubungi_data ? `<small>💬 Pesan: ${escapeHtml(item.dihubungi_data.pesan?.substring(0, 30) || '-')}${item.dihubungi_data.pesan?.length > 30 ? '...' : ''}</small>` : ''}
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                    <button class="db-item-restore-followup" onclick="event.stopPropagation(); restoreToFollowup('${item.id}')">🔄 Kembali ke Followup</button>
                    <button class="db-item-restore-prospek" onclick="event.stopPropagation(); restoreToProspek('${item.id}')">🔄 Kembali ke Prospek</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('nomor_salah', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Event listener untuk klik detail
    document.querySelectorAll('#dbNomorSalahList .db-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox' && 
                !e.target.classList.contains('db-item-wa') && 
                !e.target.classList.contains('db-item-restore-followup') &&
                !e.target.classList.contains('db-item-restore-prospek') &&
                !e.target.classList.contains('db-item-delete')) {
                openDBDetailModal(el.dataset.id, 'nomor_salah');
            }
        });
    });
    
    // Event listener untuk checkbox
    document.querySelectorAll('#dbNomorSalahList .db-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = cb.dataset.id;
            if (e.target.checked) selectedNomorSalahIds.set(id, true);
            else selectedNomorSalahIds.delete(id);
            updateSelectAllButton('selectAllNomorSalah', '#dbNomorSalahList', selectedNomorSalahIds);
        });
    });
    
    updateSelectAllButton('selectAllNomorSalah', '#dbNomorSalahList', selectedNomorSalahIds);
}

// ========== RESTORE NOMOR SALAH KE FOLLOWUP ==========
async function restoreToFollowup(id) {
    // Ambil data dari nomor_salah
    const { data: item, error: getError } = await window.db
        .from('nomor_salah')
        .select('*')
        .eq('id', id)
        .single();
    
    if (getError || !item) {
        showNotifTop('❌ Gagal mengambil data: ' + (getError?.message || 'Data tidak ditemukan'), true);
        return;
    }
    
    // Cek apakah sudah ada di customers
    const { data: existing } = await window.db
        .from('customers')
        .select('id')
        .eq('hp', item.hp)
        .maybeSingle();
    
    if (existing) {
        showNotifTop(`⚠️ Nomor "${item.hp}" sudah terdaftar di Followup Agen!`, true);
        return;
    }
    
    if (!confirm(`Kembalikan data "${escapeHtml(item.nama)}" ke Followup Agen?`)) return;
    
    try {
        // Siapkan data followup
        let followupData = null;
        let dihubungiData = null;
        
        if (item.followup_data) {
            followupData = {
                terkirim: item.followup_data.terkirim || false,
                dibalas: item.followup_data.dibalas || false,
                pesan: item.followup_data.pesan || null,
                balasan: item.followup_data.balasan || null,
                timestamp: item.followup_data.timestamp || new Date().toISOString()
            };
        }
        
        if (item.dihubungi_data) {
            dihubungiData = {
                terkirim: item.dihubungi_data.terkirim || false,
                dibalas: item.dihubungi_data.dibalas || false,
                pesan: item.dihubungi_data.pesan || null,
                balasan: item.dihubungi_data.balasan || null,
                timestamp: item.dihubungi_data.timestamp || new Date().toISOString()
            };
        }
        
        // ===== PERBAIKAN: Hapus restored_from =====
        // Insert ke customers
        const { error: insertError } = await window.db.from('customers').insert({
            agent_id: item.agent_id || `NOMOR_${Date.now()}`,
            nama: item.nama,
            hp: item.hp,
            apk: item.apk || null,
            upline_name: item.upline_name || null,
            upline_phone: item.upline_phone || null,
            tanggal: getTodayDate(),
            status: 'baru',
            user_id: item.user_id || currentUser.id,
            followup_data: followupData,
            pesan_terkirim: item.followup_data?.pesan || item.dihubungi_data?.pesan || null,
            balasan_diterima: item.followup_data?.balasan || item.dihubungi_data?.balasan || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
            // restored_from: 'nomor_salah'  // <-- HAPUS BARIS INI
        });
        
        if (insertError) {
            showNotifTop('❌ Gagal memindahkan: ' + insertError.message, true);
            return;
        }
        
        // Hapus dari nomor_salah
        await window.db.from('nomor_salah').delete().eq('id', id);
        
        // Hapus dari selected jika ada
        selectedNomorSalahIds.delete(id);
        
        showNotifTop(`✅ "${escapeHtml(item.nama)}" berhasil dikembalikan ke Followup Agen!`);
        
        // Reload data
        await loadCustomers();
        await loadDBNomorSalah();
        renderFullFollowupKanban();
        updateStats();
        updateChartCustomer();
        updateDeadlineBadge();
        
    } catch (err) {
        console.error('Error restore to followup:', err);
        showNotifTop('❌ Gagal: ' + err.message, true);
    }
}

// ========== RESTORE NOMOR SALAH KE PROSPEK ==========
async function restoreToProspek(id) {
    // Ambil data dari nomor_salah
    const { data: item, error: getError } = await window.db
        .from('nomor_salah')
        .select('*')
        .eq('id', id)
        .single();
    
    if (getError || !item) {
        showNotifTop('❌ Gagal mengambil data: ' + (getError?.message || 'Data tidak ditemukan'), true);
        return;
    }
    
    // Cek apakah sudah ada di prospek
    const { data: existing } = await window.db
        .from('prospek')
        .select('id')
        .eq('hp', item.hp)
        .maybeSingle();
    
    if (existing) {
        showNotifTop(`⚠️ Nomor "${item.hp}" sudah terdaftar di Prospek Agen!`, true);
        return;
    }
    
    if (!confirm(`Kembalikan data "${escapeHtml(item.nama)}" ke Prospek Agen?`)) return;
    
    try {
        // Siapkan data dihubungi jika ada
        let dihubungiData = null;
        let negosiasiData = null;
        
        if (item.dihubungi_data) {
            dihubungiData = {
                terkirim: item.dihubungi_data.terkirim || false,
                dibalas: item.dihubungi_data.dibalas || false,
                pesan: item.dihubungi_data.pesan || null,
                balasan: item.dihubungi_data.balasan || null,
                timestamp: item.dihubungi_data.timestamp || new Date().toISOString()
            };
        }
        
        if (item.negosiasi_data) {
            negosiasiData = item.negosiasi_data;
        }
        
        // ===== PERBAIKAN: Hapus restored_from =====
        // Insert ke prospek
        const { error: insertError } = await window.db.from('prospek').insert({
            nama: item.nama,
            hp: item.hp,
            deadline: getTodayDate(),
            status: 'Baru',
            user_id: item.user_id || currentUser.id,
            dihubungi_data: dihubungiData,
            negosiasi_data: negosiasiData,
            pesan_terkirim: item.dihubungi_data?.pesan || null,
            balasan_diterima: item.dihubungi_data?.balasan || null,
            upline_name: item.upline_name || null,
            upline_phone: item.upline_phone || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
            // restored_from: 'nomor_salah'  // <-- HAPUS BARIS INI
        });
        
        if (insertError) {
            showNotifTop('❌ Gagal memindahkan: ' + insertError.message, true);
            return;
        }
        
        // Hapus dari nomor_salah
        await window.db.from('nomor_salah').delete().eq('id', id);
        
        // Hapus dari selected jika ada
        selectedNomorSalahIds.delete(id);
        
        showNotifTop(`✅ "${escapeHtml(item.nama)}" berhasil dikembalikan ke Prospek Agen!`);
        
        // Reload data
        await loadProspek();
        await loadDBNomorSalah();
        renderFullProspekKanban();
        updateChartProspek();
        updateDeadlineBadge();
        
    } catch (err) {
        console.error('Error restore to prospek:', err);
        showNotifTop('❌ Gagal: ' + err.message, true);
    }
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
        let dihubungiText = '';
        if (item.dihubungi_data && item.dihubungi_data.pesan) {
            dihubungiText = `<small>📝 ${escapeHtml(item.dihubungi_data.pesan.substring(0, 50))}${item.dihubungi_data.pesan.length > 50 ? '...' : ''}</small>`;
        }
        let penawaranText = '';
        if (item.penawaran) {
            penawaranText = `<small>🏷️ ${escapeHtml(item.penawaran)}</small>`;
        } else if (item.negosiasi_data?.penawaran) {
            penawaranText = `<small>🏷️ ${escapeHtml(item.negosiasi_data.penawaran)}</small>`;
        }
        
        return `
            <div class="db-item" data-id="${item.id}" data-type="commitment" style="cursor: pointer;">
                <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="db-item-info">
                    <h4>${escapeHtml(item.nama)}</h4>
                    <p>📱 ${escapeHtml(item.hp)}</p>
                    <small>Agent: ${escapeHtml(item.agent_id || '-')} | Aplikasi: ${escapeHtml(item.aplikasi || '-')}</small>
                    <small>Upline: ${escapeHtml(item.upline_name || '-')}</small>
                    <small>Komitmen: ${item.committed_at ? new Date(item.committed_at).toLocaleDateString('id-ID') : '-'}</small>
                    ${penawaranText}
                    ${dihubungiText}
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="event.stopPropagation(); openWA('${item.hp}')">💬 WA</button>
                    <button class="db-item-delete" onclick="event.stopPropagation(); deleteDBItem('db_commitment', '${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('#dbCommitmentList .db-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox' && 
                !e.target.classList.contains('db-item-wa') && 
                !e.target.classList.contains('db-item-delete')) {
                openDBDetailModal(el.dataset.id, 'commitment');
            }
        });
    });
    
    document.querySelectorAll('#dbCommitmentList .db-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = cb.dataset.id;
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

// ========== DELETE FUNCTIONS ==========
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

async function deleteDBItem(collection, id) {
    if (!confirm('Yakin hapus data ini?')) return;
    
    await window.db.from(collection).delete().eq('id', id);
    showNotifTop('🗑️ Data berhasil dihapus');
    
    if (collection === 'db_closing') await loadDBClosing();
    else if (collection === 'db_tidak_tertarik') await loadDBTidak();
    else if (collection === 'nomor_salah') await loadDBNomorSalah();
    else if (collection === 'db_commitment') await loadDBCommitment();
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
    } else if (sourceType === 'tidak_tertarik') {
        collection = 'db_tidak_tertarik';
    }
    
    if (!collection) return;
    
    let query = window.db.from(collection).select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    if (statusValues.length > 0 && sourceType !== 'tidak_tertarik') {
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

// ========== LOAD UPLINE NUMBERS ==========
async function loadUplineNumbers() {
    if (!currentUser) {
        console.log('loadUplineNumbers: No user logged in');
        return;
    }
    
    const sourceType = document.querySelector('input[name="uplineSourceType"]:checked')?.value || 'transaksi';
    console.log('loadUplineNumbers sourceType:', sourceType);
    
    let collection = '';
    let statusValues = [];
    
    if (sourceType === 'transaksi') {
        collection = 'db_transaksi';
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
    
    let query = window.db.from(collection).select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    query = query.limit(2000);
    
    if (statusValues.length > 0 && sourceType !== 'transaksi') {
        query = query.in('status', statusValues);
    }
    
    const { data, error } = await query;
    if (error) {
        console.error('Error loadUplineNumbers:', error);
        showNotifTop('❌ Gagal memuat data: ' + error.message, true);
        return;
    }
    
    console.log('Data ditemukan:', data?.length || 0);
    
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
        let uplinePhone = '';
        let uplineName = '';
        
        if (sourceType === 'transaksi') {
            uplinePhone = item.upline_phone || '';
            uplineName = item.upline_name || 'Tidak ada upline';
        } else if (sourceType === 'customer') {
            uplinePhone = item.upline_phone || '';
            uplineName = item.upline_name || 'Tidak ada upline';
        }
        
        if (!uplinePhone || uplinePhone === '+62' || uplinePhone === '62' || uplinePhone === '' || uplinePhone === '0') {
            dataWithoutUpline++;
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
    
    const uplineDataList = Array.from(uplineMap.values());
    window.uplineDataList = uplineDataList;
    
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

// ========== SEND UPLINE BROADCAST ==========
async function sendUplineBroadcast() {
    const messageTemplate = document.getElementById('uplineBroadcastMessage')?.value;
    const sendOneByOne = document.getElementById('uplineSendOneByOne')?.checked;
    
    if (!messageTemplate) {
        showNotifTop('⚠️ Pesan tidak boleh kosong!', true);
        return;
    }
    
    if (!window.uplineDataList || window.uplineDataList.length === 0) {
        showNotifTop('⚠️ Tidak ada data upline! Klik "Refresh Data Upline" terlebih dahulu.', true);
        return;
    }
    
    const totalAgent = window.uplineDataList.reduce((sum, u) => sum + u.agents.length, 0);
    
    if (!confirm(`⭐ KIRIM BROADCAST KE UPLINE\n\n👥 Upline: ${window.uplineDataList.length}\n📋 Total Agent: ${totalAgent}\n\nKlik OK untuk melanjutkan.`)) {
        return;
    }
    
    const progress = showFloatingProgress('⭐ Broadcast ke Upline', window.uplineDataList.length);
    progress.update(0, '🚀 Mengirim Broadcast', 'Memulai pengiriman...');
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < window.uplineDataList.length; i++) {
        const upline = window.uplineDataList[i];
        
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
            
            const percent = Math.floor(((i + 1) / window.uplineDataList.length) * 100);
            progress.update(percent, '⭐ Mengirim', `Mengirim ke ${upline.upline_name} (${i + 1}/${window.uplineDataList.length})...`, i + 1, window.uplineDataList.length);
            
            if (sendOneByOne) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        } catch (e) {
            failed++;
            console.error(`Gagal kirim ke ${upline.upline_name}:`, e);
        }
    }
    
    progress.update(100, '✅ Selesai', `Berhasil: ${success}, Gagal: ${failed}`, window.uplineDataList.length, window.uplineDataList.length);
    showNotifTop(`✅ Broadcast ke Upline selesai! Terkirim ke ${success} upline, Gagal: ${failed}`);
    setTimeout(() => progress.hide(), 4000);
}

// ========== INIT UPLINE BROADCAST ==========
function initUplineBroadcast() {
    console.log('initUplineBroadcast dipanggil');
    
    const radioButtons = document.querySelectorAll('input[name="uplineSourceType"]');
    console.log('Radio buttons ditemukan:', radioButtons.length);
    
    radioButtons.forEach(radio => {
        radio.removeEventListener('change', handleUplineSourceChange);
        radio.addEventListener('change', handleUplineSourceChange);
    });
    
    function handleUplineSourceChange(e) {
        const value = e.target.value;
        const transaksiFilter = document.getElementById('uplineTransaksiFilter');
        const customerFilter = document.getElementById('uplineCustomerFilter');
        const customCard = document.getElementById('uplineCustomCard');
        
        if (transaksiFilter) transaksiFilter.style.display = 'none';
        if (customerFilter) customerFilter.style.display = 'none';
        if (customCard) customCard.style.display = 'none';
        
        if (value === 'transaksi') {
            if (transaksiFilter) transaksiFilter.style.display = 'flex';
        } else if (value === 'customer') {
            if (customerFilter) customerFilter.style.display = 'flex';
        } else if (value === 'custom') {
            if (customCard) customCard.style.display = 'block';
        }
        
        loadUplineNumbers();
    }
    
    const customerCheckboxes = document.querySelectorAll('#uplineCustomerFilter input');
    customerCheckboxes.forEach(cb => {
        cb.removeEventListener('change', loadUplineNumbers);
        cb.addEventListener('change', loadUplineNumbers);
    });
    
    const customNumbers = document.getElementById('uplineCustomNumbers');
    if (customNumbers) {
        customNumbers.removeEventListener('input', loadUplineNumbers);
        customNumbers.addEventListener('input', loadUplineNumbers);
    }
    
    const refreshBtn = document.getElementById('refreshUplineBtn');
    if (refreshBtn) {
        refreshBtn.removeEventListener('click', loadUplineNumbers);
        refreshBtn.addEventListener('click', loadUplineNumbers);
    }
    
    const sendBtn = document.getElementById('sendUplineBroadcastBtn');
    if (sendBtn) {
        sendBtn.removeEventListener('click', sendUplineBroadcast);
        sendBtn.addEventListener('click', sendUplineBroadcast);
    }
    
    // Panggil loadUplineNumbers untuk pertama kali
    loadUplineNumbers();
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

// ========== OPEN DB DETAIL MODAL (UNTUK SEMUA DATABASE) ==========
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
        case 'db_agent':
            collectionName = 'db_agent';
            title = 'Detail Database Agent';
            break;
        default:
            return;
    }
    
    window.db.from(collectionName).select('*').eq('id', id).single().then(async ({ data: d, error }) => {
        if (error || !d) {
            console.error('Error loading data:', error);
            showNotifTop('❌ Gagal memuat data', true);
            return;
        }
        
        let ownerInfo = '';
        if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
            const { data: userDoc } = await window.db.from('users').select('nama').eq('id', d.user_id).single();
            const ownerName = userDoc?.nama || 'CS Agent';
            ownerInfo = `<div class="detail-info-item"><strong>👤 Pemilik Data:</strong> ${escapeHtml(ownerName)}</div>`;
        }
        
        let detailHtml = '';
        
        if (type === 'closing') {
            // Tampilkan data followup lengkap seperti di popup customer
            let followupInfo = '';
            if (d.followup_data) {
                followupInfo = `
                    <div class="detail-info-item">
                        <strong>✅ Follow Up:</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            Terkirim: ${d.followup_data.terkirim ? 'Ya' : 'Tidak'}<br>
                            Dibalas: ${d.followup_data.dibalas ? 'Ya' : 'Tidak'}<br>
                            <strong>Pesan Terkirim:</strong> ${escapeHtml(d.followup_data.pesan || '-')}<br>
                            <strong>Balasan:</strong> ${escapeHtml(d.followup_data.balasan || '-')}
                        </div>
                    </div>
                `;
            } else if (d.pesan_terkirim) {
                followupInfo = `
                    <div class="detail-info-item">
                        <strong>✅ Follow Up:</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            <strong>Pesan Terkirim:</strong> ${escapeHtml(d.pesan_terkirim || '-')}<br>
                            <strong>Balasan:</strong> ${escapeHtml(d.balasan_diterima || '-')}
                        </div>
                    </div>
                `;
            }
            
            // Tampilkan pending responses
            let pendingInfo = '';
            if (d.pending_data && d.pending_data.length > 0) {
                const completedCount = d.pending_data.filter(item => item.checked === true && item.text?.trim() !== '').length;
                const totalCount = d.pending_data.length;
                pendingInfo = `
                    <div class="detail-info-item">
                        <strong>📝 Pending Responses (${completedCount}/${totalCount}):</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            ${d.pending_data.map(item => `${item.checked ? '✅' : '⭕'} ${escapeHtml(item.text || '(kosong)')}`).join('<br>')}
                        </div>
                    </div>
                `;
            }
            
            detailHtml = `
                ${ownerInfo}
                <div class="detail-info-item"><strong>👤 Nama:</strong> ${escapeHtml(d.nama)}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(d.hp)}</div>
                <div class="detail-info-item"><strong>📅 Tanggal Closing:</strong> ${d.closing_date ? new Date(d.closing_date).toLocaleDateString('id-ID') : '-'}</div>
                <div class="detail-info-item"><strong>📝 Catatan Closing:</strong> ${escapeHtml(d.closing_note || '-')}</div>
                ${followupInfo}
                ${pendingInfo}
            `;
        } 
        else if (type === 'commitment') {
            // Tampilkan data dihubungi lengkap seperti di popup prospek
            let dihubungiInfo = '';
            if (d.dihubungi_data) {
                dihubungiInfo = `
                    <div class="detail-info-item">
                        <strong>✅ Dihubungi:</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            Terkirim: ${d.dihubungi_data.terkirim ? 'Ya' : 'Tidak'}<br>
                            Dibalas: ${d.dihubungi_data.dibalas ? 'Ya' : 'Tidak'}<br>
                            <strong>Pesan Terkirim:</strong> ${escapeHtml(d.dihubungi_data.pesan || '-')}<br>
                            <strong>Balasan:</strong> ${escapeHtml(d.dihubungi_data.balasan || '-')}
                        </div>
                    </div>
                `;
            } else if (d.pesan_terkirim) {
                dihubungiInfo = `
                    <div class="detail-info-item">
                        <strong>✅ Dihubungi:</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            <strong>Pesan Terkirim:</strong> ${escapeHtml(d.pesan_terkirim || '-')}<br>
                            <strong>Balasan:</strong> ${escapeHtml(d.balasan_diterima || '-')}
                        </div>
                    </div>
                `;
            }
            
            // Tampilkan data negosiasi lengkap
            let negosiasiInfo = '';
            if (d.negosiasi_data) {
                const nd = d.negosiasi_data;
                negosiasiInfo = `
                    <div class="detail-info-item">
                        <strong>📋 Data Negosiasi:</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            Aplikasi: ${escapeHtml(nd.aplikasi || '-')}<br>
                            Domisili: ${escapeHtml(nd.domisili || '-')}<br>
                            Transaksi: ${escapeHtml(nd.transaksi || '-')}<br>
                            Deposit: ${escapeHtml(nd.deposit || '-')}<br>
                            Tertarik: ${escapeHtml(nd.tertarik || '-')}<br>
                            <strong>Penawaran:</strong> ${escapeHtml(d.penawaran || nd.penawaran || '-')}
                        </div>
                    </div>
                `;
            }
            
            detailHtml = `
                ${ownerInfo}
                <div class="detail-info-item"><strong>👤 Nama:</strong> ${escapeHtml(d.nama)}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(d.hp)}</div>
                <div class="detail-info-item"><strong>🆔 ID Agent:</strong> ${escapeHtml(d.agent_id || '-')}</div>
                <div class="detail-info-item"><strong>📱 Aplikasi:</strong> ${escapeHtml(d.aplikasi || '-')}</div>
                <div class="detail-info-item"><strong>👤 Upline:</strong> ${escapeHtml(d.upline_name || '-')}</div>
                <div class="detail-info-item"><strong>📞 No. Upline:</strong> ${escapeHtml(d.upline_phone || '-')}</div>
                <div class="detail-info-item"><strong>📅 Tanggal Komitmen:</strong> ${d.committed_at ? new Date(d.committed_at).toLocaleDateString('id-ID') : '-'}</div>
                <div class="detail-info-item"><strong>📅 Followup Date:</strong> ${d.followup_date || '-'}</div>
                <div class="detail-info-item"><strong>📝 Catatan:</strong> ${escapeHtml(d.commitment_note || '-')}</div>
                ${dihubungiInfo}
                ${negosiasiInfo}
            `;
        }
        else if (type === 'tidak') {
            // Data dihubungi
            let dihubungiInfo = '';
            if (d.dihubungi_data) {
                const dd = d.dihubungi_data;
                dihubungiInfo = `
                    <div class="detail-info-item">
                        <strong>✅ Data Dihubungi:</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            Terkirim: ${dd.terkirim ? 'Ya' : 'Tidak'}<br>
                            Dibalas: ${dd.dibalas ? 'Ya' : 'Tidak'}<br>
                            <strong>Pesan Terkirim:</strong> ${escapeHtml(dd.pesan || '-')}<br>
                            <strong>Balasan:</strong> ${escapeHtml(dd.balasan || '-')}
                        </div>
                    </div>
                `;
            } else if (d.pesan_terkirim) {
                dihubungiInfo = `
                    <div class="detail-info-item">
                        <strong>✅ Data Dihubungi:</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            <strong>Pesan Terkirim:</strong> ${escapeHtml(d.pesan_terkirim || '-')}<br>
                            <strong>Balasan:</strong> ${escapeHtml(d.balasan_diterima || '-')}
                        </div>
                    </div>
                `;
            }
            
            // Data negosiasi
            let negosiasiInfo = '';
            let isComplete = false;
            if (d.negosiasi_data) {
                const nd = d.negosiasi_data;
                isComplete = nd.is_complete || false;
                negosiasiInfo = `
                    <div class="detail-info-item">
                        <strong>📋 Data Negosiasi (Arsip):</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            Aplikasi: ${escapeHtml(nd.aplikasi || '-')}<br>
                            Domisili: ${escapeHtml(nd.domisili || '-')}<br>
                            Transaksi: ${escapeHtml(nd.transaksi || '-')}<br>
                            Deposit: ${escapeHtml(nd.deposit || '-')}<br>
                            Tertarik: ${escapeHtml(nd.tertarik || '-')}<br>
                            Penawaran: ${escapeHtml(nd.penawaran || '-')}
                            ${isComplete ? '<br>✅ Kuesioner Lengkap' : '<br>⏳ Kuesioner Belum Lengkap'}
                        </div>
                    </div>
                `;
            }
            
            const statusSebelumnya = d.status_sebelumnya || 'Negosiasi';
            
            // ===== PERBAIKAN: URUTAN - Alasan di PALING BAWAH =====
    detailHtml = `
        ${ownerInfo}
        <div class="detail-info-item"><strong>👤 Nama:</strong> ${escapeHtml(d.nama)}</div>
        <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(d.hp)}</div>
        <div class="detail-info-item"><strong>📅 Tanggal Pindah:</strong> ${d.tanggal ? new Date(d.tanggal).toLocaleDateString('id-ID') : '-'}</div>
        <div class="detail-info-item"><strong>📌 Status Sebelumnya:</strong> ${escapeHtml(statusSebelumnya)}</div>
        ${d.upline_name ? `<div class="detail-info-item"><strong>👤 Upline:</strong> ${escapeHtml(d.upline_name)}</div>` : ''}
        ${d.upline_phone ? `<div class="detail-info-item"><strong>📞 No. Upline:</strong> ${escapeHtml(d.upline_phone)}</div>` : ''}
        ${dihubungiInfo}
        ${negosiasiInfo}
        <div class="detail-info-item" style="border-top: 2px solid #ef4444; padding-top: 12px; margin-top: 4px;">
            <strong>❌ Alasan Tidak Tertarik:</strong>
            <div class="alasan-container">
                ${escapeHtml(d.alasan || 'Tidak tertarik')}
            </div>
        </div>
    `;
}
        else if (type === 'nomor_salah') {
            let followupInfo = '';
            if (d.followup_data) {
                followupInfo = `
                    <div class="detail-info-item">
                        <strong>✅ Follow Up:</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            Pesan: ${escapeHtml(d.followup_data.pesan || '-')}<br>
                            Balasan: ${escapeHtml(d.followup_data.balasan || '-')}
                        </div>
                    </div>
                `;
            } else if (d.pesan_terkirim) {
                followupInfo = `
                    <div class="detail-info-item">
                        <strong>✅ Follow Up:</strong>
                        <div style="margin-top: 5px; padding-left: 15px;">
                            Pesan: ${escapeHtml(d.pesan_terkirim || '-')}<br>
                            Balasan: ${escapeHtml(d.balasan_diterima || '-')}
                        </div>
                    </div>
                `;
            }
            
            detailHtml = `
                ${ownerInfo}
                <div class="detail-info-item"><strong>👤 Nama:</strong> ${escapeHtml(d.nama)}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(d.hp)}</div>
                <div class="detail-info-item"><strong>📅 Tanggal Dihapus:</strong> ${d.deleted_at ? new Date(d.deleted_at).toLocaleDateString('id-ID') : '-'}</div>
                <div class="detail-info-item"><strong>📵 Alasan:</strong> ${escapeHtml(d.alasan || 'Nomor tidak bisa dihubungi')}</div>
                ${followupInfo}
            `;
        }
        else if (type === 'db_agent') {
            detailHtml = `
                ${ownerInfo}
                <div class="detail-info-item"><strong>🆔 ID Agent:</strong> ${escapeHtml(d.agent_id || '-')}</div>
                <div class="detail-info-item"><strong>👤 Nama:</strong> ${escapeHtml(d.nama)}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(d.hp)}</div>
                <div class="detail-info-item"><strong>🏷️ Type/Class:</strong> ${escapeHtml(d.agent_type || '-')}</div>
                <div class="detail-info-item"><strong>📱 Aplikasi:</strong> ${escapeHtml(d.apk || '-')}</div>
                <div class="detail-info-item"><strong>👤 Upline:</strong> ${escapeHtml(d.upline || '-')}</div>
                <div class="detail-info-item"><strong>🆔 CID:</strong> ${escapeHtml(d.cid || '-')}</div>
                <div class="detail-info-item"><strong>🏦 Jenis Bank:</strong> ${escapeHtml(d.jenis_bank || '-')}</div>
                <div class="detail-info-item"><strong>📅 Tanggal Dibuat:</strong> ${d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID') : '-'}</div>
            `;
        }
        
        // Tampilkan modal detail
        document.getElementById('detailContent').innerHTML = `
            <div class="detail-header">
                <h3>${title}</h3>
                <div class="status-badge">Arsip</div>
            </div>
            <div class="detail-body">
                <div class="detail-info">${detailHtml}</div>
                <div class="detail-actions">
                    <button class="btn-success" onclick="openWA('${escapeHtml(d.hp)}')">💬 WhatsApp</button>
                </div>
            </div>
            <div class="detail-footer">
                <button class="btn-outline" onclick="closeModal('detailModal')">Tutup</button>
                <button class="btn-danger" onclick="deleteDBItem('${collectionName}', '${id}'); closeModal('detailModal');">🗑️ Hapus</button>
            </div>
        `;
        showModal('detailModal');
    }).catch(err => {
        console.error('Error:', err);
        showNotifTop('❌ Gagal memuat detail: ' + err.message, true);
    });
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
    
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    
    // ===== PERBAIKAN: Set background canvas =====
    // Hapus background yang mungkin ditambahkan Chart.js
    const canvas = ctx;
    canvas.style.background = isDark ? '#0f172a' : '#ffffff';
    canvas.style.borderRadius = '12px';
    
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
            // ===== PERBAIKAN: Tambahkan plugin untuk background =====
            plugins: {
                legend: { 
                    position: 'right', 
                    labels: { 
                        font: { size: 11 },
                        color: textColor,
                        padding: 10,
                        // ===== PERBAIKAN: Background label =====
                        boxWidth: 15,
                        usePointStyle: true
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
            },
            // ===== PERBAIKAN: Background untuk seluruh chart =====
            backgroundColor: isDark ? '#0f172a' : '#ffffff'
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
    
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    
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
                legend: { 
                    position: 'right', 
                    labels: { 
                        font: { size: 11 },
                        color: textColor,
                        padding: 10
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
    
    // ===== PERBAIKAN: Update class berdasarkan nilai =====
    if (overdueCount === 0) {
        badge.classList.remove('badge-active');
        badge.classList.add('badge-zero');
    } else {
        badge.classList.remove('badge-zero');
        badge.classList.add('badge-active');
    }
}

async function updatePesanBadge() {
    if (!currentUser) return;
    const badge = document.getElementById('pesanCount');
    if (!badge) return;
    
    const unreadCount = messagesData.filter(m => !m.is_read).length;
    badge.innerText = unreadCount;
    
    // ===== PERBAIKAN: Update class berdasarkan nilai =====
    if (unreadCount === 0) {
        badge.classList.remove('badge-active');
        badge.classList.add('badge-zero');
    } else {
        badge.classList.remove('badge-zero');
        badge.classList.add('badge-active');
    }
}

// ========== DOM READY ==========
document.addEventListener('DOMContentLoaded', function() {
    
    // ===== INISIALISASI EVENT LISTENERS =====
    initEventListeners();
    
    // ===== CHECK AUTHENTICATION =====
    checkAuth();
    
    console.log('✅ PROSPEKTA loaded successfully');
});

// ========== GLOBAL FUNCTIONS ==========
window.showAlasanTidakTertarikModal = showAlasanTidakTertarikModal;

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
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '9999999';
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
        
        const { data: doc } = await window.db.from('customers').select('*').eq('id', customerId).single();
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
        
        await window.db.from('customers').update({
            progres_transaksi: {
                items: [...(progresData.items || []), newItem],
                total_tercapai: newTotalTercapai
            },
            updated_at: new Date().toISOString()
        }).eq('id', customerId);
        
        showNotifTop(`✅ Progres berhasil ditambahkan! Total transaksi tercapai: ${newTotalTercapai > 0 ? '+' : ''}${newTotalTercapai.toLocaleString()} Transaksi`);
        modal.remove();
        
        await loadCustomers();
        updateTargetDisplay();
        closeModal('detailModal');
    };
    
    batalBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
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
    if (target) {
        document.getElementById(target).style.display = 'block';
    }
    
    // Inisialisasi broadcast upline jika halaman broadcastUpline
    if (page === 'broadcastUpline') {
        setTimeout(() => {
            if (typeof initUplineBroadcast === 'function') {
                initUplineBroadcast();
            }
        }, 100);
    }
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    const activeMenu = document.querySelector(`.menu-item[data-page="${page}"]`);
    if (activeMenu) activeMenu.classList.add('active');
}

// ========== SETUP IMPORT EXCEL ==========
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
                    const errors = [];
                    
                    progress.update(10, '📥 Import Data', `Memproses ${json.length} baris...`);
                    
                    for (let i = 0; i < json.length; i++) {
                        const row = json[i];
                        try {
                            if (importType === 'customer') {
                                // ===== IMPORT CUSTOMER =====
                                const agentId = row.agent_id || row.Agent_ID || '';
                                const nama = row.nama || row.Nama || '';
                                let hp = row.hp || row.HP || '';
                                const apk = row.apk || row.APK || '';
                                const upline = row.upline_name || row.upline || '';
                                
                                if (!agentId || !nama) {
                                    failed++;
                                    errors.push(`Baris ${i+1}: agent_id atau nama kosong`);
                                    continue;
                                }
                                
                                hp = String(hp).replace(/[^\d]/g, '');
                                if (hp.startsWith('0')) hp = hp.substring(1);
                                if (hp && !hp.startsWith('62')) hp = '62' + hp;
                                
                                await window.db.from('customers').insert({
                                    agent_id: agentId.toUpperCase(),
                                    nama: nama,
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
                                // ===== IMPORT PROSPEK =====
                                const nama = row.nama || row.Nama || '';
                                let hp = row.hp || row.HP || '';
                                
                                if (!nama) {
                                    failed++;
                                    errors.push(`Baris ${i+1}: nama kosong`);
                                    continue;
                                }
                                
                                hp = String(hp).replace(/[^\d]/g, '');
                                if (hp.startsWith('0')) hp = hp.substring(1);
                                if (hp && !hp.startsWith('62')) hp = '62' + hp;
                                
                                await window.db.from('prospek').insert({
                                    nama: nama,
                                    hp: hp || '',
                                    deadline: getTodayDate(),
                                    status: 'Baru',
                                    user_id: currentUser.id,
                                    created_at: new Date().toISOString()
                                });
                                success++;
                                
                            } else if (importType === 'transaksi') {
                                // ===== IMPORT DB TRANSAKSI =====
                                const agentId = row.agent_id || row.Agent_ID || '';
                                const transaksiBulanLalu = parseFloat(row.transaksi_bulan_lalu || row.bulan_lalu || 0);
                                const transaksiBulanIni = parseFloat(row.transaksi_bulan_ini || row.bulan_ini || 0);
                                
                                let tanggalBulanLalu = row.tanggal_bulan_lalu || row.tanggal_lalu || '';
                                let tanggalBulanIni = row.tanggal_bulan_ini || row.tanggal_ini || '';
                                
                                if (!agentId) {
                                    failed++;
                                    errors.push(`Baris ${i+1}: agent_id kosong`);
                                    continue;
                                }
                                
                                if (isNaN(transaksiBulanLalu) || isNaN(transaksiBulanIni)) {
                                    failed++;
                                    errors.push(`Baris ${i+1}: transaksi_bulan_lalu atau transaksi_bulan_ini bukan angka`);
                                    continue;
                                }
                                
                                // Format tanggal jika ada
                                if (tanggalBulanLalu) {
                                    try {
                                        const dateObj = new Date(tanggalBulanLalu);
                                        if (!isNaN(dateObj.getTime())) {
                                            tanggalBulanLalu = dateObj.toISOString().split('T')[0];
                                        } else {
                                            tanggalBulanLalu = '';
                                        }
                                    } catch (err) {
                                        tanggalBulanLalu = '';
                                    }
                                }
                                
                                if (tanggalBulanIni) {
                                    try {
                                        const dateObj = new Date(tanggalBulanIni);
                                        if (!isNaN(dateObj.getTime())) {
                                            tanggalBulanIni = dateObj.toISOString().split('T')[0];
                                        } else {
                                            tanggalBulanIni = '';
                                        }
                                    } catch (err) {
                                        tanggalBulanIni = '';
                                    }
                                }
                                
                                const selisih = transaksiBulanIni - transaksiBulanLalu;
                                let progresJenis = '';
                                let progresJumlah = 0;
                                
                                if (transaksiBulanLalu === 0 && transaksiBulanIni === 0) {
                                    progresJenis = 'tidak_transaksi';
                                    progresJumlah = 0;
                                } else if (selisih >= 100) {
                                    progresJenis = 'naik';
                                    progresJumlah = selisih;
                                } else if (selisih <= -100) {
                                    progresJenis = 'turun';
                                    progresJumlah = Math.abs(selisih);
                                } else {
                                    progresJenis = 'normal';
                                    progresJumlah = selisih;
                                }
                                
                                const apk = row.apk || row.APK || '';
                                const nama = row.nama || row.Nama || `Agent ${agentId}`;
                                let hp = row.hp || row.HP || '';
                                const uplineName = row.upline || row.upline_name || '';
                                let uplinePhone = row.hp_upline || row.upline_phone || '';
                                
                                if (hp) {
                                    hp = String(hp).replace(/[^\d]/g, '');
                                    if (hp.startsWith('0')) hp = hp.substring(1);
                                    if (hp && !hp.startsWith('62')) hp = '62' + hp;
                                }
                                
                                if (uplinePhone) {
                                    uplinePhone = String(uplinePhone).replace(/[^\d]/g, '');
                                    if (uplinePhone.startsWith('0')) uplinePhone = uplinePhone.substring(1);
                                    if (uplinePhone && !uplinePhone.startsWith('62')) uplinePhone = '62' + uplinePhone;
                                }
                                
                                await window.db.from('db_transaksi').insert({
                                    agent_id: agentId.toUpperCase(),
                                    nama: nama,
                                    hp: hp || '',
                                    apk: apk || '',
                                    upline_name: uplineName || '',
                                    upline_phone: uplinePhone || '',
                                    progres_jenis: progresJenis,
                                    progres_jumlah: Math.abs(progresJumlah),
                                    transaksi_bulan_lalu: transaksiBulanLalu,
                                    transaksi_bulan_ini: transaksiBulanIni,
                                    tanggal_bulan_lalu: tanggalBulanLalu || null,
                                    tanggal_bulan_ini: tanggalBulanIni || null,
                                    tanggal_transaksi: getTodayDate(),
                                    status: 'pending_import',
                                    user_id: currentUser.id,
                                    created_at: new Date().toISOString()
                                });
                                success++;
                            }
                        } catch (err) {
                            console.error(`Error baris ${i+1}:`, err);
                            failed++;
                            errors.push(`Baris ${i+1}: ${err.message}`);
                        }
                        
                        if ((i + 1) % 50 === 0) {
                            const percent = 10 + Math.floor(((i + 1) / json.length) * 80);
                            progress.update(percent, '📥 Import Data', `Memproses... (${i+1}/${json.length})`, i+1, json.length);
                            await delay(10);
                        }
                    }
                    
                    progress.update(100, '✅ Selesai', `Berhasil: ${success}, Gagal: ${failed}`, success, json.length);
                    
                    let message = `✅ Import selesai! Berhasil: ${success}`;
                    if (failed > 0) {
                        message += `, Gagal: ${failed}`;
                        console.log('❌ Error details:', errors);
                    }
                    showNotifTop(message);
                    
                    if (failed > 0 && errors.length > 0) {
                        const errorSample = errors.slice(0, 5).join('\n');
                        showNotifTop(`⚠️ ${failed} data gagal. Detail: ${errorSample}`, true);
                    }
                    
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
    
    // ===== PERBAIKAN: Download Contoh File - Hanya 1x =====
    // Hapus event listener lama dengan clone untuk setiap tombol
    
    // Customer Example
    const customerExampleBtn = document.getElementById('downloadCustomerExample');
    if (customerExampleBtn) {
        const newCustomerBtn = customerExampleBtn.cloneNode(true);
        customerExampleBtn.parentNode.replaceChild(newCustomerBtn, customerExampleBtn);
        document.getElementById('downloadCustomerExample')?.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const data = [{ agent_id: 'AG-001', nama: 'Budi Santoso', hp: '6281234567890', apk: 'GNP' }];
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Customer');
            XLSX.writeFile(wb, 'contoh_customer.xlsx');
            showNotifTop('📋 Contoh file Customer berhasil diunduh');
        });
    }
    
    // Prospek Example
    const prospekExampleBtn = document.getElementById('downloadProspekExample');
    if (prospekExampleBtn) {
        const newProspekBtn = prospekExampleBtn.cloneNode(true);
        prospekExampleBtn.parentNode.replaceChild(newProspekBtn, prospekExampleBtn);
        document.getElementById('downloadProspekExample')?.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const data = [{ nama: 'Rina Marlina', hp: '6281234567893' }];
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Prospek');
            XLSX.writeFile(wb, 'contoh_prospek.xlsx');
            showNotifTop('📋 Contoh file Prospek berhasil diunduh');
        });
    }
    
    // Transaksi Example
    const transaksiExampleBtn = document.getElementById('downloadTransaksiExample');
    if (transaksiExampleBtn) {
        const newTransaksiBtn = transaksiExampleBtn.cloneNode(true);
        transaksiExampleBtn.parentNode.replaceChild(newTransaksiBtn, transaksiExampleBtn);
        document.getElementById('downloadTransaksiExample')?.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const data = [
                {
                    apk: 'GNP',
                    agent_id: 'AG-001',
                    nama: 'Budi Santoso',
                    hp: '6281234567890',
                    upline: 'Pak Upline',
                    hp_upline: '6281234567891',
                    tanggal_bulan_lalu: '2024-01-01',
                    transaksi_bulan_lalu: 50,
                    tanggal_bulan_ini: '2024-02-01',
                    transaksi_bulan_ini: 200
                },
                {
                    apk: 'BSB',
                    agent_id: 'AG-002',
                    nama: 'Ani Lestari',
                    hp: '6281234567892',
                    upline: 'Bu Upline',
                    hp_upline: '6281234567893',
                    tanggal_bulan_lalu: '2024-01-01',
                    transaksi_bulan_lalu: 300,
                    tanggal_bulan_ini: '2024-02-01',
                    transaksi_bulan_ini: 150
                },
                {
                    apk: 'BTN',
                    agent_id: 'AG-003',
                    nama: 'Cahya Wijaya',
                    hp: '6281234567894',
                    upline: '',
                    hp_upline: '',
                    tanggal_bulan_lalu: '2024-01-01',
                    transaksi_bulan_lalu: 50,
                    tanggal_bulan_ini: '2024-02-01',
                    transaksi_bulan_ini: 80
                },
                {
                    apk: 'GNP',
                    agent_id: 'AG-004',
                    nama: 'Dewi Sartika',
                    hp: '6281234567895',
                    upline: 'Pak Upline',
                    hp_upline: '6281234567891',
                    tanggal_bulan_lalu: '2024-01-01',
                    transaksi_bulan_lalu: 0,
                    tanggal_bulan_ini: '2024-02-01',
                    transaksi_bulan_ini: 0
                }
            ];
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'DB Transaksi');
            XLSX.writeFile(wb, 'contoh_db_transaksi.xlsx');
            showNotifTop('📋 Contoh file DB Transaksi berhasil diunduh');
        });
    }
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
                            agent_id: agentId.toUpperCase(),
                            nama: nama,
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

// ========== DELETE SELECTED FUNCTIONS ==========
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

// ========== DELETE FULL MODE FUNCTIONS ==========
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
    progress.update(0, 'Menghapus', 'Mengambil数据...');
    
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

// ========== INIT BADGES ==========
function initBadges() {
    // Deadline badge
    const deadlineBadge = document.getElementById('deadlineCount');
    if (deadlineBadge) {
        const count = parseInt(deadlineBadge.innerText) || 0;
        if (count === 0) {
            deadlineBadge.classList.add('badge-zero');
        } else {
            deadlineBadge.classList.add('badge-active');
        }
    }
    
    // Pesan badge
    const pesanBadge = document.getElementById('pesanCount');
    if (pesanBadge) {
        const count = parseInt(pesanBadge.innerText) || 0;
        if (count === 0) {
            pesanBadge.classList.add('badge-zero');
        } else {
            pesanBadge.classList.add('badge-active');
        }
    }
}

// ======================================================================
// ========== DARK MODE OBSERVER ==========
// ======================================================================
function initDarkModeObserver() {
    // ===== PERBAIKAN: Cek apakah observer sudah ada =====
    if (window._darkModeObserver) {
        window._darkModeObserver.disconnect();
    }
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                // Update charts saat dark mode berubah
                setTimeout(() => {
                    try {
                        updateChartsForDarkMode();
                        
                        // Force update chart background
                        const isDark = document.body.classList.contains('dark-mode');
                        if (chartCustomer) {
                            chartCustomer.options.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                            chartCustomer.update();
                        }
                        if (chartProspek) {
                            chartProspek.options.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                            chartProspek.update();
                        }
                        if (targetChart) {
                            targetChart.options.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                            targetChart.update();
                        }
                        if (trendChart) {
                            trendChart.options.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                            trendChart.update();
                        }
                    } catch (e) {
                        console.warn('Dark mode observer error:', e);
                    }
                }, 100);
            }
        });
    });
    
    observer.observe(document.body, { attributes: true });
    window._darkModeObserver = observer; // Simpan referensi global
    return observer;
}

// Inisialisasi observer setelah DOM siap
let darkModeObserver = null;

// ======================================================================

// ========== EVENT LISTENERS ==========
function initEventListeners() {
    initSidebarHover();
    initProfilePhoto();
    
    // Save profile
    document.getElementById('saveProfileBtn')?.addEventListener('click', saveUserProfile);

    // ===== PERBAIKAN: Hanya 1 event listener untuk transaksi =====
    // Hapus semua event listener yang ada dengan clone
    const selectAllBtn = document.getElementById('selectAllTransaksi');
    if (selectAllBtn) {
        const newSelectAll = selectAllBtn.cloneNode(true);
        selectAllBtn.parentNode.replaceChild(newSelectAll, selectAllBtn);
        document.getElementById('selectAllTransaksi')?.addEventListener('click', toggleSelectAllTransaksi);
    }
    
    const deleteSelectedBtn = document.getElementById('deleteSelectedTransaksi');
    if (deleteSelectedBtn) {
        const newDeleteSelected = deleteSelectedBtn.cloneNode(true);
        deleteSelectedBtn.parentNode.replaceChild(newDeleteSelected, deleteSelectedBtn);
        document.getElementById('deleteSelectedTransaksi')?.addEventListener('click', deleteSelectedTransaksi);
    }
    
    const deleteAllBtn = document.getElementById('deleteAllTransaksiBtn');
    if (deleteAllBtn) {
        const newDeleteAll = deleteAllBtn.cloneNode(true);
        deleteAllBtn.parentNode.replaceChild(newDeleteAll, deleteAllBtn);
        document.getElementById('deleteAllTransaksiBtn')?.addEventListener('click', deleteAllTransaksi);
    }
    
    const moveSelectedBtn = document.getElementById('moveSelectedToFollowupBtn');
    if (moveSelectedBtn) {
        const newMoveSelected = moveSelectedBtn.cloneNode(true);
        moveSelectedBtn.parentNode.replaceChild(newMoveSelected, moveSelectedBtn);
        document.getElementById('moveSelectedToFollowupBtn')?.addEventListener('click', moveSelectedToFollowup);
    }
    
    // Transaksi filters - setup sekali
    setupTransaksiFilters();
    
    let isSubmittingCustomer = false;
    let isSubmittingProspek = false;
    
    // Add customer
    document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
        document.getElementById('customerDate').value = getTodayDate();
        // Reset form
        document.getElementById('customerId').value = '';
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('customerApk').value = '';
        document.getElementById('customerUpline').value = '';
        showModal('customerModal');
    });
    
    document.getElementById('addCustomerFullBtn')?.addEventListener('click', () => {
        document.getElementById('customerDate').value = getTodayDate();
        document.getElementById('customerId').value = '';
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('customerApk').value = '';
        document.getElementById('customerUpline').value = '';
        showModal('customerModal');
    });
    
    document.getElementById('saveCustomerBtn')?.addEventListener('click', async function(e) {
        // ===== PERBAIKAN: Prevent multiple click =====
        if (this.disabled) {
            showNotifTop('⏳ Mohon tunggu, data sedang diproses...', true);
            return;
        }
        
        this.disabled = true;
        const originalText = this.textContent;
        this.textContent = '⏳ Menyimpan...';
        
        try {
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
            
            const success = await addCustomer(agentId, nama, hp, apk, upline, deadline);
            if (success) {
                closeModal('customerModal');
                document.getElementById('customerId').value = '';
                document.getElementById('customerName').value = '';
                document.getElementById('customerPhone').value = '';
                document.getElementById('customerApk').value = '';
                document.getElementById('customerUpline').value = '';
            }
        } catch (err) {
            console.error('Error:', err);
            showNotifTop('❌ Gagal: ' + err.message, true);
        } finally {
            this.disabled = false;
            this.textContent = originalText;
        }
    });
    
    // Add prospek
    document.getElementById('addProspekBtn')?.addEventListener('click', () => {
        document.getElementById('prospekDeadline').value = getTodayDate();
        document.getElementById('prospekName').value = '';
        document.getElementById('prospekPhone').value = '';
        showModal('prospekModal');
    });
    
    document.getElementById('addProspekFullBtn')?.addEventListener('click', () => {
        document.getElementById('prospekDeadline').value = getTodayDate();
        document.getElementById('prospekName').value = '';
        document.getElementById('prospekPhone').value = '';
        showModal('prospekModal');
    });
    
    document.getElementById('saveProspekBtn')?.addEventListener('click', async function(e) {
        // ===== PERBAIKAN: Prevent multiple click =====
        if (this.disabled) {
            showNotifTop('⏳ Mohon tunggu, data sedang diproses...', true);
            return;
        }
        
        this.disabled = true;
        const originalText = this.textContent;
        this.textContent = '⏳ Menyimpan...';
        
        try {
            const nama = document.getElementById('prospekName').value;
            let hp = document.getElementById('prospekPhone').value;
            const deadline = document.getElementById('prospekDeadline').value;
            
            if (!nama) {
                showNotifTop('⚠️ Nama wajib diisi!', true);
                return;
            }
            
            hp = hp.replace(/[^\d]/g, '');
            if (hp.startsWith('0')) hp = hp.substring(1);
            
            const success = await addProspek(nama, hp, deadline);
            if (success) {
                closeModal('prospekModal');
                document.getElementById('prospekName').value = '';
                document.getElementById('prospekPhone').value = '';
            }
        } catch (err) {
            console.error('Error:', err);
            showNotifTop('❌ Gagal: ' + err.message, true);
        } finally {
            this.disabled = false;
            this.textContent = originalText;
        }
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
    const deadlineBtn = document.getElementById('deadlineNotifBtn');
    if (deadlineBtn) {
        const newDeadlineBtn = deadlineBtn.cloneNode(true);
        deadlineBtn.parentNode.replaceChild(newDeadlineBtn, deadlineBtn);
        const freshDeadlineBtn = document.getElementById('deadlineNotifBtn');
        if (freshDeadlineBtn) {
            freshDeadlineBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showDeadlinePopup();
            });
        }
    }
    
    // ===== Pesan Notification =====
    const pesanBtn = document.getElementById('pesanNotifBtn');
    if (pesanBtn) {
        const newPesanBtn = pesanBtn.cloneNode(true);
        pesanBtn.parentNode.replaceChild(newPesanBtn, pesanBtn);
        const freshPesanBtn = document.getElementById('pesanNotifBtn');
        if (freshPesanBtn) {
            freshPesanBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                navigateTo('pesan');
            });
        }
    }
    
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
                    'followupConfirmModal', 'prospekDihubungiModal', 'prospekNegosiasiModal', 'convertModal'];
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

    // ========== BROADCAST UPLINE ==========
    // Inisialisasi upline broadcast (akan dipanggil saat halaman broadcastUpline dibuka)
    // Tombol dan event listener untuk upline broadcast akan diinisialisasi di initUplineBroadcast()

    
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
    
    // Edit deadline
    document.getElementById('saveDeadlineBtn')?.addEventListener('click', saveDeadline);
    document.getElementById('cancelDeadlineBtn')?.addEventListener('click', () => closeModal('editDeadlineModal'));
    
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
    showLoading('Memeriksa autentikasi...', true);
    
    const { data: { session } } = await window.db.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        updateLoadingStep(0);
        
        await withLoading(loadUserProfile(), 1);
        updateLoadingStep(2);
        
        await withLoading(loadCustomers(), 3);
        updateLoadingStep(4);
        
        await withLoading(loadProspek(), 5);
        updateLoadingStep(6);
        
        await withLoading(loadDatabaseAgent(), 7);
        updateLoadingStep(8);
        
        await withLoading(loadProduk(), 9);
        updateLoadingStep(10);
        
        await withLoading(loadDbTransaksi(), 11);
        updateLoadingStep(12);
        
        await withLoading(loadDBClosing(), 13);
        updateLoadingStep(14);
        
        await withLoading(loadDBTidak(), 15);
        updateLoadingStep(16);
        
        await withLoading(loadDBNomorSalah(), 17);
        updateLoadingStep(18);
        
        await withLoading(loadDBCommitment(), 19);
        updateLoadingStep(20);
        
        await withLoading(loadReminders(), 21);
        updateLoadingStep(22);
        
        await withLoading(loadMessages(), 23);
        updateLoadingStep(24);
        
        await withLoading(loadUsersList(), 25);
        updateLoadingStep(26);
        
        await withLoading(loadTarifAdmin(), 27);
        updateLoadingStep(28);
        
        await withLoading(loadTargetData(), 29);
        updateLoadingStep(30);
        
        await withLoading(loadTransaksiGlobal(), 31);
        
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
        
        // ===== PERBAIKAN: Inisialisasi notifikasi setelah data load =====
        setTimeout(function() {
            initBadges();
            initDarkMode();
            initDarkModeObserver();
            
            // Inisialisasi deadline notification
            var deadlineBtn = document.getElementById('deadlineNotifBtn');
            if (deadlineBtn) {
                var newDeadlineBtn = deadlineBtn.cloneNode(true);
                deadlineBtn.parentNode.replaceChild(newDeadlineBtn, deadlineBtn);
                var freshBtn = document.getElementById('deadlineNotifBtn');
                if (freshBtn) {
                    freshBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        showDeadlinePopup();
                    });
                }
            }
            
            // Inisialisasi pesan notification
            var pesanBtn = document.getElementById('pesanNotifBtn');
            if (pesanBtn) {
                var newPesanBtn = pesanBtn.cloneNode(true);
                pesanBtn.parentNode.replaceChild(newPesanBtn, pesanBtn);
                var freshPesanBtn = document.getElementById('pesanNotifBtn');
                if (freshPesanBtn) {
                    freshPesanBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        navigateTo('pesan');
                    });
                }
            }
        }, 100);
        
        setTimeout(function() {
            hideLoading();
        }, 500);
        
    } else {
        hideLoading();
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
window.showConvertToCustomerModal = showConvertToCustomerModal;
window.closeModal = closeModal;
window.formatPhone = formatPhone;
window.formatAgentIdAuto = formatAgentIdAuto;
window.formatNamaAuto = formatNamaAuto;
window.formatPhoneAuto = formatPhoneAuto;
window.saveTarifAdmin = saveTarifAdmin;
window.loadTarifAdmin = loadTarifAdmin;

// Start app
initEventListeners();
checkAuth();
