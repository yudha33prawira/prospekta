// ========== SUPABASE CONFIGURATION ==========
const SUPABASE_URL = 'https://haylblhjzfavrfiyaicq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheWxibGhqemZhdnJmaXlhaWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzgyMDIsImV4cCI6MjA5NTMxNDIwMn0.j4yQa1ZttP5_Zg0ye5lK2OLecq39QhG3tPyv5PZ3r78';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== PERFORMANCE CONFIGURATION ==========
const DB_CONFIG = {
    MAX_BATCH_SIZE: 15,
    MAX_QUERY_LIMIT: 500,
    DELETE_DELAY_MS: 500,
    IMPORT_DELAY_MS: 500,
    SEARCH_LIMIT: 50
};

const LIMIT_DATA = DB_CONFIG.MAX_QUERY_LIMIT;

// ========== HELPER FUNCTIONS ==========
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function supabaseWithRetry(operation, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    let delayMs = initialDelay;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (error.message?.includes('timeout') || error.status === 429) {
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
let currentUplineIndex = 0;
let uplineNumbers = [];
let uplineMessageTemplate = '';
let isUplineBroadcasting = false;
let uplineBroadcastStatus = [];
let activeProgress = null;
let currentTarifData = [];
let produkMapCache = null;
let deleteProgressContainer = null;

// Database archives maps
let selectedClosingIds = new Map(),
    selectedTidakIds = new Map(),
    selectedNomorSalahIds = new Map(),
    selectedCommitmentIds = new Map(),
    selectedTransaksiIds = new Map();

// Broadcast variables
let currentNumbers = [],
    currentBroadcastIndex = 0,
    broadcastNumbers = [],
    broadcastMessageTemplate = '',
    isBroadcasting = false,
    broadcastStatus = [];
let savedTemplates = [];

// Target KPI variables
let targetData = {
    agent: 0,
    ca: 0,
    koordinator: 0,
    transaksi: 0,
    monthlyTargets: []
};
let targetChart = null;

// ========== DATABASE HELPER FUNCTIONS ==========
// Karena Supabase tidak punya auto-ID seperti Firestore, kita gunakan UUID atau timestamp
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Upload file ke Supabase Storage
async function uploadProfilePhoto(file, userId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/profile.${fileExt}`;
    const { data, error } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(fileName);
    return urlData.publicUrl;
}

// ========== AUTH FUNCTIONS ==========
async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

async function createUser(email, password, userData) {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userData
    });
    if (error) throw error;
    
    // Insert ke tabel users
    const { error: insertError } = await supabase
        .from('users')
        .insert({
            id: data.user.id,
            email: email,
            nama: userData.nama,
            hp: userData.hp,
            role: userData.role || 'cs',
            foto: userData.foto || null,
            created_at: new Date().toISOString()
        });
    if (insertError) throw insertError;
    return data.user;
}

// Get current user data from users table
async function getUserData(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

// Update user profile
async function updateUserProfile(userId, updates) {
    const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);
    if (error) throw error;
}

// ========== DATA LOADING FUNCTIONS (menggantikan onSnapshot) ==========

// Load Customers (Followup Agen)
async function loadCustomers() {
    if (!currentUser) return [];
    
    let query = supabase.from('customers').select('*');
    
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(2000);
    if (error) throw error;
    
    // Enrich with owner names for owner role
    let enrichedData = data || [];
    if (currentUserRole === 'owner') {
        const userIds = [...new Set(enrichedData.map(c => c.user_id).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nama')
                .in('id', userIds);
            const userMap = new Map(users?.map(u => [u.id, u.nama]) || []);
            enrichedData = enrichedData.map(c => ({
                ...c,
                displayName: c.nama + (userMap.get(c.user_id) ? ` (${userMap.get(c.user_id)})` : '')
            }));
        } else {
            enrichedData = enrichedData.map(c => ({ ...c, displayName: c.nama }));
        }
    } else {
        enrichedData = enrichedData.map(c => ({ ...c, displayName: c.nama }));
    }
    
    customersData = enrichedData;
    return enrichedData;
}

// Load Prospek
async function loadProspek() {
    if (!currentUser) return [];
    
    let query = supabase.from('prospek').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(2000);
    if (error) throw error;
    
    let enrichedData = data || [];
    if (currentUserRole === 'owner') {
        const userIds = [...new Set(enrichedData.map(p => p.user_id).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nama')
                .in('id', userIds);
            const userMap = new Map(users?.map(u => [u.id, u.nama]) || []);
            enrichedData = enrichedData.map(p => ({
                ...p,
                displayName: p.nama + (userMap.get(p.user_id) ? ` (${userMap.get(p.user_id)})` : '')
            }));
        } else {
            enrichedData = enrichedData.map(p => ({ ...p, displayName: p.nama }));
        }
    } else {
        enrichedData = enrichedData.map(p => ({ ...p, displayName: p.nama }));
    }
    
    prospekData = enrichedData;
    return enrichedData;
}

// Load Database Agent
async function loadDatabaseAgent() {
    if (!currentUser) return [];
    
    let query = supabase.from('db_agent').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    
    let items = data || [];
    if (currentUserRole === 'owner') {
        const userIds = [...new Set(items.map(a => a.user_id).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nama')
                .in('id', userIds);
            const userMap = new Map(users?.map(u => [u.id, u.nama]) || []);
            items = items.map(a => ({
                ...a,
                nama: a.nama + (userMap.get(a.user_id) ? ` (${userMap.get(a.user_id)})` : '')
            }));
        }
    }
    
    agentsData = items;
    renderAgentList(items);
    return items;
}

// Load Database Transaksi
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
        query = query.order('tanggal_transaksi', { ascending: false }).limit(500);
        
        if (loadMore && transaksiLastDoc) {
            // Supabase uses range for pagination, but we'll simplify: just load next page
            // We'll track using offset
            const currentOffset = transaksiData.length;
            query = query.range(currentOffset, currentOffset + 499);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        let totalCount = 0;
        if (!loadMore) {
            const { count, error: countError } = await supabase
                .from('db_transaksi')
                .select('*', { count: 'exact', head: true });
            if (!countError) totalCount = count;
            window.totalTransaksiCount = totalCount;
        } else {
            totalCount = window.totalTransaksiCount || 0;
        }
        
        const totalCountSpan = document.getElementById('transaksiTotalCount');
        if (totalCountSpan) totalCountSpan.innerText = totalCount;
        
        if (!data || data.length === 0) {
            transaksiHasMore = false;
        } else {
            transaksiLastDoc = data[data.length - 1];
            transaksiHasMore = data.length === 500;
            
            let enrichedData = [...transaksiData, ...data];
            if (currentUserRole === 'owner') {
                const userIds = [...new Set(enrichedData.map(t => t.user_id).filter(Boolean))];
                if (userIds.length > 0) {
                    const { data: users } = await supabase
                        .from('users')
                        .select('id, nama')
                        .in('id', userIds);
                    const userMap = new Map(users?.map(u => [u.id, u.nama]) || []);
                    enrichedData = enrichedData.map(t => ({
                        ...t,
                        displayName: t.nama + (userMap.get(t.user_id) ? ` (${userMap.get(t.user_id)})` : '')
                    }));
                } else {
                    enrichedData = enrichedData.map(t => ({ ...t, displayName: t.nama }));
                }
            } else {
                enrichedData = enrichedData.map(t => ({ ...t, displayName: t.nama }));
            }
            transaksiData = enrichedData;
        }
        
        renderTransaksiList(transaksiData);
        updateTransaksiStatsDisplay(transaksiData.length, totalCount);
        
        if (transaksiHasMore && !loadMore) addLoadMoreButton();
        else if (!transaksiHasMore && !loadMore) removeLoadMoreButton();
        
        await updateTotalTransaksiDariDBTransaksi();
        return transaksiData;
    } catch (error) {
        console.error('Error loadDbTransaksi:', error);
        showNotifTop('❌ Gagal memuat data transaksi: ' + error.message, true);
        return [];
    } finally {
        isLoadingMore = false;
    }
}

// Load Database Closing
async function loadDBClosing() {
    if (!currentUser) return;
    
    let query = supabase.from('db_closing').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('closing_date', { ascending: false });
    if (error) throw error;
    
    let items = data || [];
    if (currentUserRole === 'owner') {
        const userIds = [...new Set(items.map(c => c.user_id).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nama')
                .in('id', userIds);
            const userMap = new Map(users?.map(u => [u.id, u.nama]) || []);
            items = items.map(c => ({
                ...c,
                nama: c.nama + (userMap.get(c.user_id) ? ` (${userMap.get(c.user_id)})` : '')
            }));
        }
    }
    
    const html = items.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="closing" style="cursor: pointer;">
            <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${selectedClosingIds.get(item.id) ? 'checked' : ''}>
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

// Load Database Tidak Tertarik
async function loadDBTidak() {
    if (!currentUser) return;
    
    let query = supabase.from('db_tidak_tertarik').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('tanggal', { ascending: false });
    if (error) throw error;
    
    let items = data || [];
    if (currentUserRole === 'owner') {
        const userIds = [...new Set(items.map(t => t.user_id).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nama')
                .in('id', userIds);
            const userMap = new Map(users?.map(u => [u.id, u.nama]) || []);
            items = items.map(t => ({
                ...t,
                nama: t.nama + (userMap.get(t.user_id) ? ` (${userMap.get(t.user_id)})` : '')
            }));
        }
    }
    
    const html = items.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="tidak" style="cursor: pointer;">
            <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${selectedTidakIds.get(item.id) ? 'checked' : ''}>
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

// Load Database Nomor Salah
async function loadDBNomorSalah() {
    if (!currentUser) return;
    
    let query = supabase.from('nomor_salah').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('deleted_at', { ascending: false });
    if (error) throw error;
    
    let items = data || [];
    if (currentUserRole === 'owner') {
        const userIds = [...new Set(items.map(n => n.user_id).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nama')
                .in('id', userIds);
            const userMap = new Map(users?.map(u => [u.id, u.nama]) || []);
            items = items.map(n => ({
                ...n,
                nama: n.nama + (userMap.get(n.user_id) ? ` (${userMap.get(n.user_id)})` : '')
            }));
        }
    }
    
    const html = items.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="nomor_salah" style="cursor: pointer;">
            <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${selectedNomorSalahIds.get(item.id) ? 'checked' : ''}>
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

// Load Database Commitment
async function loadDBCommitment() {
    if (!currentUser) return;
    
    let query = supabase.from('db_commitment').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('committed_at', { ascending: false });
    if (error) throw error;
    
    let items = data || [];
    if (currentUserRole === 'owner') {
        const userIds = [...new Set(items.map(c => c.user_id).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nama')
                .in('id', userIds);
            const userMap = new Map(users?.map(u => [u.id, u.nama]) || []);
            items = items.map(c => ({
                ...c,
                nama: c.nama + (userMap.get(c.user_id) ? ` (${userMap.get(c.user_id)})` : '')
            }));
        }
    }
    
    const html = items.map(item => `
        <div class="db-item" data-id="${item.id}" data-type="commitment" style="cursor: pointer;">
            <input type="checkbox" class="db-item-checkbox" data-id="${item.id}" ${selectedCommitmentIds.get(item.id) ? 'checked' : ''}>
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

// Load Products
async function loadProduk() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('produk')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
    if (error) throw error;
    
    produkData = data || [];
    renderProdukList();
    updateProductSelect();
}

// Load Tarif Admin
async function loadTarifAdmin() {
    if (!currentUser) return;
    
    let query = supabase.from('tarif_admin').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.limit(500);
    if (error) throw error;
    
    tarifAdminData = data || [];
    renderTarifAdminList();
}

// Load Reminders
async function loadReminders() {
    if (!currentUser) return;
    
    let query = supabase.from('reminders').select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    const reminderList = document.getElementById('reminderList');
    if (!reminderList) return;
    
    if (!data || data.length === 0) {
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
}

// Load Messages (Pesan)
async function loadPesan() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('to_id', currentUser.id)
        .order('created_at', { ascending: false });
    if (error) throw error;
    
    const pesanList = document.getElementById('pesanList');
    if (!pesanList) return;
    
    if (!data || data.length === 0) {
        pesanList.innerHTML = '<p style="text-align:center;padding:40px;">💬 Belum ada pesan</p>';
        return;
    }
    
    // Get sender names
    const fromIds = [...new Set(data.map(m => m.from_id).filter(Boolean))];
    let userMap = new Map();
    if (fromIds.length > 0) {
        const { data: users } = await supabase
            .from('users')
            .select('id, nama, email')
            .in('id', fromIds);
        userMap = new Map(users?.map(u => [u.id, u.nama || u.email]) || []);
    }
    
    pesanList.innerHTML = data.map(item => {
        const fromName = userMap.get(item.from_id) || 'Unknown';
        return `
            <div class="db-item ${!item.is_read ? 'unread' : ''}">
                <div class="db-item-info">
                    <h4>📨 Dari: ${escapeHtml(fromName)}</h4>
                    <p>${escapeHtml(item.message)}</p>
                    <small>📅 ${new Date(item.created_at).toLocaleString('id-ID')} | ${item.is_read ? '✅ Dibaca' : '🆕 Baru'}</small>
                </div>
                <div class="db-item-actions">
                    <button class="db-item-wa" onclick="markAsRead('${item.id}')">✅ Tandai Dibaca</button>
                    <button class="db-item-delete" onclick="deletePesan('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    }).join('');
    updateAllBadges();
}

// Load Users list for admin
async function loadUsersList() {
    if (currentUserRole !== 'owner') return;
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', currentUser.id);
    if (error) throw error;
    
    const container = document.getElementById('usersList');
    if (!container) return;
    
    if (!data || data.length === 0) {
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
}

// Load Users for select dropdown
async function loadUsersForSelect() {
    const { data, error } = await supabase
        .from('users')
        .select('id, nama, email')
        .neq('id', currentUser.id);
    if (error) throw error;
    
    const select = document.getElementById('pesanTo');
    if (!select) return;
    
    select.innerHTML = '<option value="">Pilih CS Tujuan</option>';
    data?.forEach(user => {
        select.innerHTML += `<option value="${user.id}">${escapeHtml(user.nama || user.email || 'CS Agent')}</option>`;
    });
}

// Load Target KPI
async function loadTargetData() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'targetKPI')
        .single();
    
    if (data) {
        targetData = data.value;
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
}

// Save Target KPI
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
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.id || 'unknown'
    };
    
    const { error } = await supabase
        .from('settings')
        .upsert({ key: 'targetKPI', value: newTarget }, { onConflict: 'key' });
    if (error) throw error;
    
    targetData = newTarget;
    showNotifTop('✅ Target berhasil disimpan!');
    closeModal('manageTargetModal');
    await updateTargetDisplay();
}

// Load Transaksi Global
async function loadTransaksiGlobal() {
    if (!currentUser) return 0;
    
    const { data, error } = await supabase
        .from('transaksi_global')
        .select('*')
        .order('tanggal', { ascending: false });
    if (error) throw error;
    
    transaksiList = data || [];
    let totalTransaksiBulanIni = 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    transaksiList.forEach(item => {
        const tglTransaksi = new Date(item.tanggal);
        if (tglTransaksi >= startOfMonth && tglTransaksi <= endOfMonth) {
            totalTransaksiBulanIni += item.nominal || 0;
        }
    });
    
    window.totalTransaksiGlobal = totalTransaksiBulanIni;
    await updateTargetDisplay();
    return totalTransaksiBulanIni;
}

// Save Transaksi Global
async function saveTransaksiGlobal(nominal, keterangan, tanggal, transaksiId = null) {
    if (!currentUser) {
        showNotifTop('⚠️ Anda harus login terlebih dahulu!', true);
        return false;
    }
    if (!nominal || nominal <= 0) {
        showNotifTop('⚠️ Jumlah transaksi harus diisi dan lebih dari 0!', true);
        return false;
    }
    
    const data = {
        nominal: parseInt(nominal),
        keterangan: keterangan || '',
        tanggal: tanggal || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
        updated_by: currentUser.id,
        updated_by_name: currentUserName
    };
    
    if (transaksiId) {
        const { error } = await supabase
            .from('transaksi_global')
            .update(data)
            .eq('id', transaksiId);
        if (error) throw error;
        showNotifTop('✅ Transaksi berhasil diupdate!');
    } else {
        data.created_at = new Date().toISOString();
        data.created_by = currentUser.id;
        data.created_by_name = currentUserName;
        const { error } = await supabase.from('transaksi_global').insert(data);
        if (error) throw error;
        showNotifTop('✅ Transaksi berhasil ditambahkan!');
    }
    
    await loadTransaksiGlobal();
    return true;
}

// Delete Transaksi Global
async function deleteTransaksiGlobal(transaksiId) {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    
    const { error } = await supabase
        .from('transaksi_global')
        .delete()
        .eq('id', transaksiId);
    if (error) throw error;
    
    showNotifTop('🗑️ Transaksi dihapus');
    await loadTransaksiGlobal();
    renderTransaksiListGlobal();
}

// ========== CRUD OPERATIONS ==========

// Add Customer
async function addCustomer(agentId, nama, hp, apk, agentType, tanggal, uplineName, uplinePhone) {
    const { duplicateAgent, duplicateHp } = await checkDuplicateCustomer(agentId, hp);
    if (duplicateAgent) {
        showNotifTop(`⚠️ ID Agent "${agentId}" sudah terdaftar!`, true);
        return false;
    }
    if (duplicateHp) {
        showNotifTop(`⚠️ Nomor WhatsApp "${hp}" sudah terdaftar!`, true);
        return false;
    }
    
    const { error } = await supabase
        .from('customers')
        .insert({
            agent_id: agentId,
            nama: nama,
            hp: hp,
            apk: apk,
            agent_type: agentType,
            tanggal: tanggal,
            status: 'baru',
            upline_name: uplineName,
            upline_phone: uplinePhone,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            followup_data: null,
            pending_data: []
        });
    if (error) throw error;
    
    showNotifTop('✅ Data customer berhasil ditambahkan!');
    await loadAllData();
    return true;
}

// Update Customer Status
async function updateCustomerStatus(id, newStatus) {
    if (newStatus === 'followup') {
        const { data: customer, error } = await supabase
            .from('customers')
            .select('tanggal')
            .eq('id', id)
            .single();
        if (error) throw error;
        
        const currentDeadline = customer.tanggal || getTodayDate();
        const newDeadline = addDaysToDate(currentDeadline, 1);
        
        const { error: updateError } = await supabase
            .from('customers')
            .update({ status: 'followup', tanggal: newDeadline })
            .eq('id', id);
        if (updateError) throw updateError;
        
        showNotif(`✅ Status berhasil diupdate ke Follow Up. Deadline +1 hari menjadi ${newDeadline}`);
    }
    closeModal('detailModal');
    await loadAllData();
}

// Delete Customer
async function deleteCustomer(id) {
    if (!confirm('Yakin hapus customer ini? Data akan dihapus permanen!')) return;
    
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
    if (error) throw error;
    
    closeModal('detailModal');
    showNotifTop('🗑️ Data customer berhasil dihapus');
    await loadAllData();
    updateAllBadges();
}

// Add Prospek
async function addProspek(agentType, nama, hp, status, deadline) {
    const duplicateHp = await checkDuplicateProspek(hp);
    if (duplicateHp) {
        showNotifTop(`⚠️ Nomor WhatsApp "${hp}" sudah terdaftar!`, true);
        return false;
    }
    
    const { error } = await supabase
        .from('prospek')
        .insert({
            agent_type: agentType,
            nama: nama,
            hp: hp,
            status: status,
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
}

// Delete Prospek
async function deleteProspek(id) {
    if (!confirm('Yakin hapus prospek ini? Data akan dihapus permanen!')) return;
    
    const { error } = await supabase
        .from('prospek')
        .delete()
        .eq('id', id);
    if (error) throw error;
    
    closeModal('detailModal');
    showNotifTop('🗑️ Data prospek berhasil dihapus');
    await loadAllData();
    updateAllBadges();
}

// Check duplicate customer
async function checkDuplicateCustomer(agentId, hp, excludeId = null) {
    let duplicateAgent = null;
    let duplicateHp = null;
    
    // Check for duplicate agent_id
    let query = supabase.from('customers').select('id, nama, user_id').eq('agent_id', agentId);
    if (excludeId) query = query.neq('id', excludeId);
    if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
    
    const { data: agentMatch } = await query.maybeSingle();
    if (agentMatch) {
        let owner = currentUserName;
        if (currentUserRole === 'owner' && agentMatch.user_id !== currentUser.id) {
            const { data: user } = await supabase.from('users').select('nama').eq('id', agentMatch.user_id).single();
            owner = user?.nama || 'CS Agent';
        }
        duplicateAgent = { id: agentMatch.id, nama: agentMatch.nama, owner };
    }
    
    // Check for duplicate phone
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
    
    return { duplicateAgent, duplicateHp };
}

// Check duplicate prospek
async function checkDuplicateProspek(hp, excludeId = null) {
    if (!hp || hp === '+62' || hp === '62' || hp === '0' || hp.trim() === '') return null;
    
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
    return null;
}

// ========== BROADCAST FUNCTIONS (sama seperti asli, hanya sesuaikan query) ==========
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
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    if (statusField && statusValues.length > 0) {
        query = query.in(statusField, statusValues);
    }
    
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

// ========== UPLINE BROADCAST FUNCTIONS ==========
async function loadUplineNumbers() {
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
        return;
    }
    
    let table = '';
    let statusValues = [];
    
    if (sourceType === 'transaksi') {
        table = 'db_transaksi';
    } else if (sourceType === 'customer') {
        table = 'customers';
        statusValues = Array.from(document.querySelectorAll('#uplineCustomerFilter input:checked')).map(cb => cb.value);
    }
    
    if (!table) {
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
    
    let query = supabase.from(table).select('*');
    if (currentUserRole !== 'owner') {
        query = query.eq('user_id', currentUser.id);
    }
    if (statusValues.length > 0) {
        query = query.in('status', statusValues);
    }
    
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
    
    // Search Customers
    if (searchCustomer) {
        let query = supabase.from('customers').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(SEARCH_LIMIT);
        for (const item of data || []) {
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
    
    // Search Prospek
    if (searchProspek) {
        let query = supabase.from('prospek').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(SEARCH_LIMIT);
        for (const item of data || []) {
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
    
    // Search Closing
    if (searchClosing) {
        let query = supabase.from('db_closing').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(SEARCH_LIMIT);
        for (const item of data || []) {
            const searchText = `${item.nama || ''} ${item.hp || ''}`.toLowerCase();
            if (searchText.includes(keyword)) {
                results.push({
                    id: item.id,
                    type: 'closing',
                    title: item.nama,
                    subtitle: item.hp,
                    detail: `Closing: ${item.closing_date ? new Date(item.closing_date).toLocaleDateString('id-ID') : '-'}`,
                    badge: 'DB Closing',
                    badgeClass: 'badge-closing'
                });
            }
        }
    }
    
    // Search Tidak Tertarik
    if (searchTidak) {
        let query = supabase.from('db_tidak_tertarik').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(SEARCH_LIMIT);
        for (const item of data || []) {
            const searchText = `${item.nama || ''} ${item.hp || ''}`.toLowerCase();
            if (searchText.includes(keyword)) {
                results.push({
                    id: item.id,
                    type: 'tidak',
                    title: item.nama,
                    subtitle: item.hp,
                    detail: `Tanggal: ${item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}`,
                    badge: 'DB Tidak Tertarik',
                    badgeClass: 'badge-tidak'
                });
            }
        }
    }
    
    // Search Nomor Salah
    if (searchNomorSalah) {
        let query = supabase.from('nomor_salah').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(SEARCH_LIMIT);
        for (const item of data || []) {
            const searchText = `${item.nama || ''} ${item.hp || ''}`.toLowerCase();
            if (searchText.includes(keyword)) {
                results.push({
                    id: item.id,
                    type: 'nomor_salah',
                    title: item.nama,
                    subtitle: item.hp,
                    detail: `Alasan: ${item.alasan || '-'}`,
                    badge: 'DB Nomor Salah',
                    badgeClass: 'badge-nomor-salah'
                });
            }
        }
    }
    
    // Search Commitment
    if (searchCommitment) {
        let query = supabase.from('db_commitment').select('*');
        if (currentUserRole !== 'owner') query = query.eq('user_id', currentUser.id);
        const { data } = await query.limit(SEARCH_LIMIT);
        for (const item of data || []) {
            const searchText = `${item.nama || ''} ${item.hp || ''}`.toLowerCase();
            if (searchText.includes(keyword)) {
                results.push({
                    id: item.id,
                    type: 'commitment',
                    title: item.nama,
                    subtitle: item.hp,
                    detail: `Agent: ${item.agent_id || '-'}`,
                    badge: 'DB Commitment',
                    badgeClass: 'badge-commitment'
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
            else openDBDetailModal(id, type);
        };
    });
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
    
    if (id) {
        const { error } = await supabase
            .from('produk')
            .update(data)
            .eq('id', id);
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
}

async function deleteProduk(id) {
    if (!confirm('Yakin hapus produk ini?')) return;
    
    const { error } = await supabase.from('produk').delete().eq('id', id);
    if (error) throw error;
    
    showNotifTop('🗑️ Produk berhasil dihapus');
    await loadProduk();
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
    
    if (id) {
        const { error } = await supabase
            .from('tarif_admin')
            .update(data)
            .eq('id', id);
        if (error) throw error;
        showNotifTop('✅ Data admin per CID berhasil diupdate');
    } else {
        const { data: existing } = await supabase
            .from('tarif_admin')
            .select('id')
            .eq('cid', cid)
            .maybeSingle();
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
}

async function deleteTarifAdmin(id) {
    if (!confirm('Yakin hapus data admin per CID ini?')) return;
    const { error } = await supabase.from('tarif_admin').delete().eq('id', id);
    if (error) throw error;
    showNotifTop('🗑️ Data dihapus');
    await loadTarifAdmin();
}

// ========== AGENT DETAIL FUNCTIONS ==========
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
    
    const { error } = await supabase
        .from('db_agent')
        .update({
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
        })
        .eq('id', currentAgentIdForProduct);
    if (error) throw error;
    
    showNotifTop('✅ Data agent berhasil disimpan!');
    closeModal('agentDetailModal');
    await loadDatabaseAgent();
}

// ========== REMINDER FUNCTIONS ==========
async function addReminder(title, description, datetime) {
    const { error } = await supabase
        .from('reminders')
        .insert({
            title: title,
            description: description,
            datetime: datetime,
            user_id: currentUser.id,
            user_name: currentUserName,
            created_at: new Date().toISOString()
        });
    if (error) throw error;
    showNotifTop('✅ Pengingat berhasil ditambahkan');
    await loadReminders();
}

async function deleteReminder(id) {
    if (!confirm('Hapus pengingat ini?')) return;
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) throw error;
    showNotifTop('🗑️ Pengingat dihapus');
    await loadReminders();
}

// ========== PESAN FUNCTIONS ==========
async function sendMessage(toId, message) {
    const { error } = await supabase
        .from('messages')
        .insert({
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
}

async function markAsRead(id) {
    const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', id);
    if (error) throw error;
    showNotif('Pesan ditandai dibaca');
    await loadPesan();
    updateAllBadges();
}

async function deletePesan(id) {
    if (confirm('Hapus pesan ini?')) {
        const { error } = await supabase.from('messages').delete().eq('id', id);
        if (error) throw error;
        showNotif('Pesan dihapus');
        await loadPesan();
        updateAllBadges();
    }
}

// ========== DATABASE ARCHIVE DELETE FUNCTIONS ==========
async function deleteDBItem(type, id) {
    if (!confirm('Yakin hapus data ini? Data akan dihapus permanen!')) return;
    
    let table = '';
    let mapRef = null;
    
    switch (type) {
        case 'closing':
            table = 'db_closing';
            mapRef = selectedClosingIds;
            break;
        case 'tidak':
            table = 'db_tidak_tertarik';
            mapRef = selectedTidakIds;
            break;
        case 'nomor_salah':
            table = 'nomor_salah';
            mapRef = selectedNomorSalahIds;
            break;
        case 'db_commitment':
            table = 'db_commitment';
            mapRef = selectedCommitmentIds;
            break;
        default:
            showNotifTop('❌ Tipe tidak dikenal', true);
            return;
    }
    
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    
    if (mapRef) mapRef.delete(id);
    showNotifTop('🗑️ Data berhasil dihapus');
    
    if (type === 'closing') await loadDBClosing();
    else if (type === 'tidak') await loadDBTidak();
    else if (type === 'nomor_salah') await loadDBNomorSalah();
    else if (type === 'db_commitment') await loadDBCommitment();
}

// ========== HELPER FUNCTIONS (tanpa perubahan) ==========
function showFloatingProgress(title, total = 0) { /* sama seperti asli */ }
function showNotif(msg, isError = false) { /* sama */ }
function showNotifTop(msg, isError = false) { /* sama */ }
function escapeHtml(text) { /* sama */ }
function getTodayDate() { /* sama */ }
function addDaysToDate(dateStr, days) { /* sama */ }
function formatRupiah(angka) { /* sama */ }
function isMobile() { /* sama */ }
function updateSidebarBodyClass() { /* sama */ }
function getStatusBadge(status) { /* sama */ }
function closeModal(modalId) { /* sama */ }
function showModal(modalId) { /* sama */ }
function setupModalClickOutside(modalId) { /* sama */ }
function formatAgentId(input) { /* sama */ }
function formatNama(input) { /* sama */ }
function formatPhone(input) { /* sama */ }
function getTargetPhone(customerData) { /* sama */ }
function getTargetName(customerData) { /* sama */ }

// ========== OPEN DETAIL FUNCTIONS (perlu disesuaikan dengan Supabase) ==========
async function openDetailCustomer(id) {
    const { data: d, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
    if (error || !d) return;
    
    const progresData = d.progres_transaksi || { items: [], total_tercapai: 0 };
    const totalTercapai = progresData.total_tercapai || 0;
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
        const { data: user } = await supabase
            .from('users')
            .select('nama')
            .eq('id', d.user_id)
            .single();
        const ownerName = user?.nama || 'CS Agent';
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
            const statusIcon = item.checked ? '✅' : '⭕';
            const textDisplay = item.text && item.text.trim() !== '' ? escapeHtml(item.text) : '<em style="color:#9ca3af;">(kosong)</em>';
            pendingItemsHtml += `<div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e5e7eb;"><span style="font-size: 14px;">${statusIcon}</span><span style="flex: 1; font-size: 12px;">${textDisplay}</span></div>`;
        });
        pendingInfo = `<div class="detail-info-item" style="align-items: flex-start;"><div class="detail-info-icon">📝</div><div class="detail-info-content"><label>Pending Responses (${completedCount}/${totalCount} balasan tercatat)</label><div class="value" style="margin-top: 8px;"><div style="background: #f9fafb; border-radius: 8px; padding: 8px; max-height: 150px; overflow-y: auto; border: 1px solid #e5e7eb;">${pendingItemsHtml}</div></div></div></div>`;
    }
    
    const deadlineDisplay = d.tanggal || '-';
    const editBtn = `<button class="edit-deadline-btn" onclick="openEditDeadlineModal('${id}','customer','${d.tanggal || ''}')" title="Edit deadline">✏️</button>`;
    const uplineName = d.upline_name || '-';
    const uplinePhone = d.upline_phone || '-';
    const targetPhone = getTargetPhone(d);
    const targetName = getTargetName(d);
    
    document.getElementById('detailContent').innerHTML = `
        <div class="detail-header"><div class="detail-avatar">${statusIcon}</div><h3>${escapeHtml(d.nama)}</h3><div class="detail-status">${getStatusBadge(d.status)}</div></div>
        <div class="detail-body">
            <div class="detail-info">
                ${ownerInfo}
                <div class="detail-info-item"><div class="detail-info-icon">🆔</div><div class="detail-info-content"><label>ID Agent</label><div class="value">${escapeHtml(d.agent_id || '-')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">🏷️</div><div class="detail-info-content"><label>Type/Class</label><div class="value">${escapeHtml(d.agent_type || '-')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Aplikasi</label><div class="value">${escapeHtml(d.apk || '-')}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor WhatsApp</label><div class="value">${escapeHtml(d.hp)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">👤</div><div class="detail-info-content"><label>Upline / Atasan</label><div class="value">${escapeHtml(uplineName)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📱</div><div class="detail-info-content"><label>Nomor HP Upline</label><div class="value">${escapeHtml(uplinePhone)}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">🎯</div><div class="detail-info-content"><label>Nomor Tujuan WA</label><div class="value" style="color: #4f46e5; font-weight: 600;">${targetName} - ${targetPhone}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">📅</div><div class="detail-info-content"><label>Deadline</label><div class="value">${deadlineDisplay} ${editBtn}</div></div></div>
                <div class="detail-info-item"><div class="detail-info-icon">🎯</div><div class="detail-info-content"><label>Total Transaksi Tercapai</label><div class="value" style="color: ${totalTercapai >= 0 ? '#10b981' : '#ef4444'}; font-weight: 700;">${totalTercapai > 0 ? '+' : ''}${totalTercapai.toLocaleString()} Transaksi</div></div></div>
                ${followupInfo}
                ${pendingInfo}
                <div class="detail-info-item"><div class="detail-info-icon">📌</div><div class="detail-info-content"><label>Status</label><div class="value">${d.status === 'followup' ? 'Follow Up' : d.status === 'baru' ? 'Baru' : d.status}</div></div></div>
            </div>
            <div class="detail-actions">
                <button class="btn-success" onclick="openWACustomer('${id}')">💬 WhatsApp</button>
                <button class="btn-primary" onclick="openTambahProgres('${id}')">📊 Tambah Progres</button>
                ${actionButtons}
            </div>
        </div>
        <div class="detail-footer"><button class="btn-outline" onclick="closeModal('detailModal')">❌ Tutup</button><button class="btn-danger" onclick="deleteCustomer('${id}')">🗑️ Hapus</button></div>
    `;
    showModal('detailModal');
}

async function openDetailProspek(id) {
    const { data: d, error } = await supabase
        .from('prospek')
        .select('*')
        .eq('id', id)
        .single();
    if (error || !d) return;
    
    let ownerInfo = '';
    if (currentUserRole === 'owner' && d.user_id !== currentUser.id) {
        const { data: user } = await supabase
            .from('users')
            .select('nama')
            .eq('id', d.user_id)
            .single();
        const ownerName = user?.nama || 'CS Agent';
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
}

// ========== LOAD ALL DATA ==========
async function loadAllData() {
    if (!currentUser) return;
    
    await Promise.all([
        loadCustomers(),
        loadProspek(),
        loadDatabaseAgent(),
        loadDBClosing(),
        loadDBTidak(),
        loadDBNomorSalah(),
        loadDBCommitment(),
        loadProduk(),
        loadReminders(),
        loadPesan(),
        updateTotalTransaksiDariDBTransaksi(),
        updateDeadlineBadge(),
        updatePesanBadge()
    ]);
    
    // Update UI components
    renderFullFollowupKanban();
    renderFullProspekKanban();
    updateDashboardStats();
}

// Update dashboard stats from customersData
function updateDashboardStats() {
    const total = customersData.length;
    const closing = customersData.filter(c => c.status === 'closing').length;
    const pending = customersData.filter(c => c.status === 'pending').length;
    const followup = customersData.filter(c => c.status === 'followup').length;
    const activeProspek = total - closing;
    const rateClosing = total ? Math.round((closing / total) * 100) : 0;
    
    document.getElementById('totalData').innerText = total;
    document.getElementById('closingTotal').innerText = closing;
    document.getElementById('activeProspek').innerText = activeProspek;
    document.getElementById('rateClosing').innerText = rateClosing + '%';
    
    updateChartCustomer(total, closing, pending, followup);
}

// ========== AUTH STATE HANDLER ==========
supabase.auth.onAuthStateChange(async (event, session) => {
    const loginPage = document.getElementById('loginPage');
    const app = document.getElementById('app');
    
    if (session?.user) {
        currentUser = session.user;
        loginPage.style.display = 'none';
        app.style.display = 'block';
        
        // Get user data from users table
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) {
            console.error('Error fetching user data:', error);
            // Create default user data if not exists
            currentUserRole = 'cs';
            currentUserName = currentUser.email?.split('@')[0] || 'CS Agent';
            currentUserEmail = currentUser.email || '';
        } else {
            currentUserRole = userData.role || 'cs';
            currentUserName = userData.nama || userData.email?.split('@')[0] || 'CS Agent';
            currentUserEmail = userData.email || '';
            const foto = userData.foto || 'https://i.pravatar.cc/40';
            document.getElementById('profileImg').src = foto;
            document.getElementById('previewFoto').src = foto;
        }
        
        document.getElementById('topUserName').innerText = currentUserName;
        document.getElementById('profileName').value = currentUserName;
        document.getElementById('profileEmail').value = currentUser.email;
        
        // Set menu visibility based on role
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
        
        // Show dashboard
        document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
        document.getElementById('dashboardPage').style.display = 'block';
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        const dashboardMenu = document.querySelector('.menu-item[data-page="dashboard"]');
        if (dashboardMenu) dashboardMenu.classList.add('active');
        
        await loadAllData();
        await loadTargetData();
        await loadTransaksiGlobal();
        await loadDbTransaksi();
        await loadTarifAdmin();
        
        initFullModeSelection();
        updateAllBadges();
        
    } else {
        loginPage.style.display = 'flex';
        app.style.display = 'none';
        currentUser = null;
    }
});

// ========== DOMContentLoaded EVENT ==========
document.addEventListener('DOMContentLoaded', function() {
    // Setup login button
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
                await signIn(email, password);
            } catch (err) {
                errorDiv.textContent = 'Login gagal: ' + err.message;
                this.textContent = 'Masuk';
                this.disabled = false;
            }
        });
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut();
        });
    }
    
    // Setup toggle password visibility
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
    
    // Setup import buttons, modals, etc. (sama seperti asli, hanya sesuaikan event listener)
    // ... (kode event listener lainnya tetap sama, hanya perlu memanggil fungsi async yang sudah disesuaikan)
    
    // Dark mode initialization
    initDarkMode();
    setupImportExcel();
    
    // Modal click outside
    const allModalIds = [
        'detailModal', 'customerModal', 'prospekModal', 'prospekNegosiasiModal',
        'profileModal', 'previewPhotoModal', 'reminderModal', 'pesanModal',
        'convertModal', 'followupConfirmModal', 'pendingModal', 'addCsModal',
        'editDeadlineModal', 'infoModal', 'agentDetailModal', 'produkMasterModal',
        'manageTargetModal', 'tarifAdminModal', 'inputTransaksiModal',
        'transaksiListModal', 'pilihNomorModal'
    ];
    allModalIds.forEach(id => setupModalClickOutside(id));
    
    // Setup target card click
    const targetTransaksiCard = document.getElementById('targetTransaksiCard');
    if (targetTransaksiCard) {
        targetTransaksiCard.style.cursor = 'pointer';
        targetTransaksiCard.addEventListener('click', () => showInputTransaksiModal());
    }
    
// ==================== TAMBAHAN: FUNGSI UI & EVENT LISTENER UNTUK SUPABASE ====================

// ---------- DARK MODE ----------
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
        darkModeToggle.addEventListener('click', (e) => {
            e.preventDefault();
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

// ---------- RENDER FULL KANBAN (FOLLOWUP) ----------
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
    lists.baru.sort((a,b) => (a.tanggal||'9999-12-31').localeCompare(b.tanggal||'9999-12-31'));
    lists.followup.sort((a,b) => (a.tanggal||'9999-12-31').localeCompare(b.tanggal||'9999-12-31'));
    lists.pending.sort((a,b) => (a.tanggal||'9999-12-31').localeCompare(b.tanggal||'9999-12-31'));
    lists.closing.sort((a,b) => (a.tanggal||'9999-12-31').localeCompare(b.tanggal||'9999-12-31'));

    document.getElementById('fullCountBaru').innerText = lists.baru.length;
    document.getElementById('fullCountFollowup').innerText = lists.followup.length;
    document.getElementById('fullCountPending').innerText = lists.pending.length;
    document.getElementById('fullCountClosing').innerText = lists.closing.length;

    const isOwner = (currentUserRole === 'owner');
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
    if (baruContainer) baruContainer.innerHTML = lists.baru.map(item => renderCard(item, 'baru')).join('');
    const followupContainer = document.getElementById('fullFollowupList');
    if (followupContainer) followupContainer.innerHTML = lists.followup.map(item => renderCard(item, 'followup')).join('');
    const pendingContainer = document.getElementById('fullPendingList');
    if (pendingContainer) pendingContainer.innerHTML = lists.pending.map(item => renderCard(item, 'pending')).join('');
    const closingContainer = document.getElementById('fullClosingList');
    if (closingContainer) closingContainer.innerHTML = lists.closing.map(item => renderCard(item, 'closing')).join('');

    if (isOwner) {
        document.querySelectorAll('#fullBaruList .full-item-checkbox, #fullFollowupList .full-item-checkbox, #fullPendingList .full-item-checkbox, #fullClosingList .full-item-checkbox').forEach(cb => {
            cb.removeEventListener('change', handleFullFollowupCheckboxChange);
            cb.addEventListener('change', handleFullFollowupCheckboxChange);
        });
    }
    document.querySelectorAll('.card-click-area').forEach(area => {
        area.removeEventListener('click', cardClickHandler);
        area.addEventListener('click', cardClickHandler);
    });
    function cardClickHandler(e) {
        const card = this.closest('.card-item');
        if (card) openDetailCustomer(card.dataset.id);
    }
    updateSelectAllFullFollowupButton();
}

function handleFullFollowupCheckboxChange(e) {
    e.stopPropagation();
    const id = e.target.dataset.id;
    if (e.target.checked) {
        selectedFullFollowupIds.set(id, true);
        const card = e.target.closest('.card-item');
        if (card) { card.style.opacity = '0.6'; card.style.background = '#eef2ff'; }
    } else {
        selectedFullFollowupIds.delete(id);
        const card = e.target.closest('.card-item');
        if (card) { card.style.opacity = '1'; card.style.background = ''; }
    }
    updateSelectAllFullFollowupButton();
}
function updateSelectAllFullFollowupButton() {
    const cards = document.querySelectorAll('#fullBaruList .full-item-checkbox');
    const allChecked = cards.length > 0 && Array.from(cards).every(cb => cb.checked);
    const btn = document.getElementById('selectAllFullFollowup');
    if (btn) {
        btn.textContent = allChecked ? '⬜ Batal Semua' : '✅ Pilih Semua';
        if (currentUserRole !== 'owner') btn.style.display = 'none';
        else btn.style.display = 'inline-block';
    }
}
function toggleSelectAllFullFollowup() {
    if (currentUserRole !== 'owner') { showNotifTop('⚠️ Hanya Owner yang dapat menggunakan fitur ini!', true); return; }
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
    if (currentUserRole !== 'owner') { showNotifTop('⚠️ Hanya Owner yang dapat menghapus massal!', true); return; }
    const selectedIds = Array.from(selectedFullFollowupIds.keys());
    if (selectedIds.length === 0) { showNotifTop('⚠️ Tidak ada data yang dipilih', true); return; }
    if (!confirm(`Hapus ${selectedIds.length} data customer?`)) return;
    const progress = showFloatingProgress('🗑️ Menghapus Data', selectedIds.length);
    let deleted = 0;
    for (const id of selectedIds) {
        try {
            await supabase.from('customers').delete().eq('id', id);
            selectedFullFollowupIds.delete(id);
            deleted++;
            progress.update(Math.floor((deleted/selectedIds.length)*100), '🗑️ Menghapus', `Menghapus... (${deleted}/${selectedIds.length})`, deleted, selectedIds.length);
        } catch(e) { console.error(e); }
    }
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, selectedIds.length);
    showNotifTop(`✅ ${deleted} data berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadAllData();
    renderFullFollowupKanban();
}
async function deleteAllFullFollowup() {
    if (currentUserRole !== 'owner') { showNotifTop('⚠️ Hanya Owner yang dapat menghapus semua data!', true); return; }
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Data Followup Agen.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    const progress = showFloatingProgress('🗑️ Menghapus Semua Followup Agen', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    const { data, error } = await supabase.from('customers').select('id');
    if (error) throw error;
    const totalData = data.length;
    progress.setTotal(totalData);
    if (totalData === 0) { showNotifTop('📭 Tidak ada data untuk dihapus', true); progress.hide(); return; }
    let deleted = 0;
    const BATCH_SIZE = 20;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i+BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('customers').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted/totalData)*100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    selectedFullFollowupIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Followup Agen berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadAllData();
    renderFullFollowupKanban();
}

// ---------- RENDER FULL PROSPEK KANBAN ----------
function renderFullProspekKanban() {
    const today = getTodayDate();
    const lists = { prospekBaru: [], prospekDihubungi: [], prospekNegosiasi: [], prospekTertarik: [] };
    prospekData.forEach(item => {
        const status = item.status || 'Baru';
        if (status === 'Baru') lists.prospekBaru.push(item);
        else if (status === 'Dihubungi') lists.prospekDihubungi.push(item);
        else if (status === 'Negosiasi') lists.prospekNegosiasi.push(item);
        else if (status === 'Tertarik') lists.prospekTertarik.push(item);
    });
    lists.prospekBaru.sort((a,b) => (a.deadline||'9999-12-31').localeCompare(b.deadline||'9999-12-31'));
    lists.prospekDihubungi.sort((a,b) => (a.deadline||'9999-12-31').localeCompare(b.deadline||'9999-12-31'));
    lists.prospekNegosiasi.sort((a,b) => (a.deadline||'9999-12-31').localeCompare(b.deadline||'9999-12-31'));
    lists.prospekTertarik.sort((a,b) => (a.deadline||'9999-12-31').localeCompare(b.deadline||'9999-12-31'));

    document.getElementById('fullCountProspekBaru').innerText = lists.prospekBaru.length;
    document.getElementById('fullCountDihubungi').innerText = lists.prospekDihubungi.length;
    document.getElementById('fullCountNegosiasi').innerText = lists.prospekNegosiasi.length;
    document.getElementById('fullCountTertarik').innerText = lists.prospekTertarik.length;

    const isOwner = (currentUserRole === 'owner');
    const renderCard = (item, columnStatus) => {
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
    if (baruContainer) baruContainer.innerHTML = lists.prospekBaru.map(item => renderCard(item, 'Baru')).join('');
    const dihubungiContainer = document.getElementById('fullProspekDihubungiList');
    if (dihubungiContainer) dihubungiContainer.innerHTML = lists.prospekDihubungi.map(item => renderCard(item, 'Dihubungi')).join('');
    const negosiasiContainer = document.getElementById('fullProspekNegosiasiList');
    if (negosiasiContainer) negosiasiContainer.innerHTML = lists.prospekNegosiasi.map(item => renderCard(item, 'Negosiasi')).join('');
    const tertarikContainer = document.getElementById('fullProspekTertarikList');
    if (tertarikContainer) tertarikContainer.innerHTML = lists.prospekTertarik.map(item => renderCard(item, 'Tertarik')).join('');

    if (isOwner) {
        document.querySelectorAll('#fullProspekBaruList .full-item-checkbox, #fullProspekDihubungiList .full-item-checkbox, #fullProspekNegosiasiList .full-item-checkbox, #fullProspekTertarikList .full-item-checkbox').forEach(cb => {
            cb.removeEventListener('change', handleFullProspekCheckboxChange);
            cb.addEventListener('change', handleFullProspekCheckboxChange);
        });
    }
    document.querySelectorAll('#fullProspekBaruList .card-click-area, #fullProspekDihubungiList .card-click-area, #fullProspekNegosiasiList .card-click-area, #fullProspekTertarikList .card-click-area').forEach(area => {
        area.removeEventListener('click', prospekCardClickHandler);
        area.addEventListener('click', prospekCardClickHandler);
    });
    function prospekCardClickHandler(e) {
        const card = this.closest('.card-item');
        if (card) openDetailProspek(card.dataset.id);
    }
    updateSelectAllFullProspekButton();
}
function handleFullProspekCheckboxChange(e) {
    e.stopPropagation();
    const id = e.target.dataset.id;
    if (e.target.checked) {
        selectedFullProspekIds.set(id, true);
        const card = e.target.closest('.card-item');
        if (card) { card.style.opacity = '0.6'; card.style.background = '#eef2ff'; }
    } else {
        selectedFullProspekIds.delete(id);
        const card = e.target.closest('.card-item');
        if (card) { card.style.opacity = '1'; card.style.background = ''; }
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
    if (currentUserRole !== 'owner') { showNotifTop('⚠️ Hanya Owner yang dapat menggunakan fitur ini!', true); return; }
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
    if (currentUserRole !== 'owner') { showNotifTop('⚠️ Hanya Owner yang dapat menghapus massal!', true); return; }
    const selectedIds = Array.from(selectedFullProspekIds.keys());
    if (selectedIds.length === 0) { showNotifTop('⚠️ Tidak ada data yang dipilih', true); return; }
    if (!confirm(`Hapus ${selectedIds.length} data prospek?`)) return;
    const progress = showFloatingProgress('🗑️ Menghapus Data Prospek', selectedIds.length);
    let deleted = 0;
    for (const id of selectedIds) {
        try {
            await supabase.from('prospek').delete().eq('id', id);
            selectedFullProspekIds.delete(id);
            deleted++;
            progress.update(Math.floor((deleted/selectedIds.length)*100), '🗑️ Menghapus', `Menghapus... (${deleted}/${selectedIds.length})`, deleted, selectedIds.length);
            await delay(100);
        } catch(e) { console.error(e); }
    }
    progress.update(100, '✅ Selesai', `Berhasil menghapus ${deleted} data`, deleted, selectedIds.length);
    showNotifTop(`✅ ${deleted} data berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadAllData();
    renderFullProspekKanban();
}
async function deleteAllFullProspek() {
    if (currentUserRole !== 'owner') { showNotifTop('⚠️ Hanya Owner yang dapat menghapus semua data!', true); return; }
    if (!confirm('⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data di Data Prospek Agen.\n\nProses ini TIDAK BISA dibatalkan!\n\nKlik OK untuk melanjutkan.')) return;
    const progress = showFloatingProgress('🗑️ Menghapus Semua Prospek Agen', 0);
    progress.update(0, '🗑️ Menghapus', 'Mengambil data...');
    const { data, error } = await supabase.from('prospek').select('id');
    if (error) throw error;
    const totalData = data.length;
    progress.setTotal(totalData);
    if (totalData === 0) { showNotifTop('📭 Tidak ada data untuk dihapus', true); progress.hide(); return; }
    let deleted = 0;
    const BATCH_SIZE = 20;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batchIds = data.slice(i, i+BATCH_SIZE).map(d => d.id);
        const { error: delErr } = await supabase.from('prospek').delete().in('id', batchIds);
        if (delErr) console.error(delErr);
        else deleted += batchIds.length;
        const percent = Math.floor((deleted/totalData)*100);
        progress.update(percent, '🗑️ Menghapus', `Memproses... (${deleted}/${totalData})`, deleted, totalData);
    }
    selectedFullProspekIds.clear();
    progress.update(100, '✅ Selesai', `Berhasil: ${deleted}`, deleted, totalData);
    showNotifTop(`✅ ${deleted} data Prospek Agen berhasil dihapus`);
    setTimeout(() => progress.hide(), 2000);
    await loadAllData();
    renderFullProspekKanban();
}

// ---------- INISIALISASI FULL MODE SELECTION ----------
function initFullModeSelection() {
    if (currentUserRole !== 'owner') {
        document.getElementById('selectAllFullFollowup')?.remove();
        document.getElementById('deleteSelectedFullFollowup')?.remove();
        document.getElementById('deleteAllFullFollowup')?.remove();
        document.getElementById('selectAllFullProspek')?.remove();
        document.getElementById('deleteSelectedFullProspek')?.remove();
        document.getElementById('deleteAllFullProspek')?.remove();
        return;
    }
    const followupSelectBtn = document.getElementById('selectAllFullFollowup');
    if (followupSelectBtn) followupSelectBtn.onclick = () => toggleSelectAllFullFollowup();
    const followupDeleteBtn = document.getElementById('deleteSelectedFullFollowup');
    if (followupDeleteBtn) followupDeleteBtn.onclick = () => deleteSelectedFullFollowup();
    const followupDeleteAllBtn = document.getElementById('deleteAllFullFollowup');
    if (followupDeleteAllBtn) followupDeleteAllBtn.onclick = () => deleteAllFullFollowup();
    const prospekSelectBtn = document.getElementById('selectAllFullProspek');
    if (prospekSelectBtn) prospekSelectBtn.onclick = () => toggleSelectAllFullProspek();
    const prospekDeleteBtn = document.getElementById('deleteSelectedFullProspek');
    if (prospekDeleteBtn) prospekDeleteBtn.onclick = () => deleteSelectedFullProspek();
    const prospekDeleteAllBtn = document.getElementById('deleteAllFullProspek');
    if (prospekDeleteAllBtn) prospekDeleteAllBtn.onclick = () => deleteAllFullProspek();
}

// ---------- EVENT LISTENER UTAMA (DOMContentLoaded) ----------
document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    setupImportExcel(); // fungsi ini harus didefinisikan sesuai asli (tidak berubah)

    // Setup modal click outside
    const allModalIds = [
        'detailModal', 'customerModal', 'prospekModal', 'prospekNegosiasiModal',
        'profileModal', 'previewPhotoModal', 'reminderModal', 'pesanModal',
        'convertModal', 'followupConfirmModal', 'pendingModal', 'addCsModal',
        'editDeadlineModal', 'infoModal', 'agentDetailModal', 'produkMasterModal',
        'manageTargetModal', 'tarifAdminModal', 'inputTransaksiModal',
        'transaksiListModal', 'pilihNomorModal'
    ];
    allModalIds.forEach(id => setupModalClickOutside(id));

    // Tombol2 utama
    document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
        document.getElementById('customerDate').value = getTodayDate();
        document.getElementById('customerModal').style.display = 'flex';
    });
    document.getElementById('addProspekBtn')?.addEventListener('click', () => {
        document.getElementById('prospekDeadline').value = getTodayDate();
        document.getElementById('prospekModal').style.display = 'flex';
    });
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
            showNotifTop('⚠️ Semua field wajib diisi!', true); return;
        }
        let hp = hpRaw.replace(/\D/g,'');
        if (hp.startsWith('0')) hp = hp.substring(1);
        hp = '+62' + hp;
        let uplinePhone = uplinePhoneRaw ? '+62' + uplinePhoneRaw.replace(/\D/g,'').replace(/^0+/,'') : '';
        const success = await addCustomer(agentId, nama, hp, apk, agentType, tanggal, uplineName, uplinePhone);
        if (success) closeModal('customerModal');
    });
    document.getElementById('saveProspekBtn')?.addEventListener('click', async () => {
        const agentType = document.getElementById('prospekType').value;
        const nama = document.getElementById('prospekName').value.trim();
        const hpRaw = document.getElementById('prospekPhone').value.trim();
        const status = document.getElementById('prospekStatusSelect').value;
        const deadline = document.getElementById('prospekDeadline').value;
        if (!agentType || !nama || !hpRaw || !deadline) {
            showNotifTop('⚠️ Semua field wajib diisi!', true); return;
        }
        let hp = hpRaw.replace(/\D/g,'');
        if (hp.startsWith('0')) hp = hp.substring(1);
        hp = '+62' + hp;
        const success = await addProspek(agentType, nama, hp, status, deadline);
        if (success) closeModal('prospekModal');
    });

    // Navigasi menu
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', async () => {
            const page = item.dataset.page;
            const pages = ['dashboardPage', 'importPage', 'dbClosingPage', 'dbTidakPage', 'dbNomorSalahPage', 'dbCommitmentPage', 'dbAgentPage', 'produkPage', 'reminderPage', 'pesanPage', 'broadcastPage', 'broadcastUplinePage', 'followupFullPage', 'prospekFullPage', 'searchPage', 'manageUsersPage', 'dbTransaksiPage'];
            pages.forEach(p => { const el = document.getElementById(p); if(el) el.style.display = 'none'; });
            if (page === 'dashboard') document.getElementById('dashboardPage').style.display = 'block';
            else if (page === 'import') document.getElementById('importPage').style.display = 'block';
            else if (page === 'dbClosing') { document.getElementById('dbClosingPage').style.display = 'block'; loadDBClosing(); }
            else if (page === 'dbTidak') { document.getElementById('dbTidakPage').style.display = 'block'; loadDBTidak(); }
            else if (page === 'dbNomorSalah') { document.getElementById('dbNomorSalahPage').style.display = 'block'; loadDBNomorSalah(); }
            else if (page === 'dbCommitment') { document.getElementById('dbCommitmentPage').style.display = 'block'; loadDBCommitment(); }
            else if (page === 'dbAgent') { document.getElementById('dbAgentPage').style.display = 'block'; loadDatabaseAgent(); }
            else if (page === 'produk') { document.getElementById('produkPage').style.display = 'block'; loadProduk(); }
            else if (page === 'reminder') { document.getElementById('reminderPage').style.display = 'block'; loadReminders(); }
            else if (page === 'pesan') { document.getElementById('pesanPage').style.display = 'block'; loadPesan(); loadUsersForSelect(); }
            else if (page === 'broadcast') { document.getElementById('broadcastPage').style.display = 'block'; initBroadcast(); }
            else if (page === 'broadcastUpline') { document.getElementById('broadcastUplinePage').style.display = 'block'; initUplineBroadcast(); }
            else if (page === 'followupFull') { document.getElementById('followupFullPage').style.display = 'block'; renderFullFollowupKanban(); }
            else if (page === 'prospekFull') { document.getElementById('prospekFullPage').style.display = 'block'; renderFullProspekKanban(); }
            else if (page === 'search') document.getElementById('searchPage').style.display = 'block';
            else if (page === 'manageUsers' && currentUserRole === 'owner') { document.getElementById('manageUsersPage').style.display = 'block'; loadUsersList(); }
            else if (page === 'dbTransaksi') { document.getElementById('dbTransaksiPage').style.display = 'block'; loadDbTransaksi(); }
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            if (window.innerWidth <= 768) document.getElementById('sidebar')?.classList.remove('active');
            updateSidebarBodyClass();
        });
    });

    // Info button
    document.getElementById('infoBtn')?.addEventListener('click', () => document.getElementById('infoModal').style.display = 'flex');
    document.getElementById('infoModalClose')?.addEventListener('click', () => closeModal('infoModal'));

    // Profile modal
    const profileImg = document.getElementById('profileImg');
    if (profileImg) {
        profileImg.addEventListener('click', () => {
            document.getElementById('profileModal').style.display = 'flex';
            supabase.from('users').select('*').eq('id', currentUser.id).single().then(({data}) => {
                if (data) {
                    document.getElementById('profileName').value = data.nama || '';
                    document.getElementById('profilePhone').value = data.hp ? data.hp.replace('+62','') : '';
                    if (data.foto) document.getElementById('previewFoto').src = data.foto;
                }
            });
        });
    }
    document.getElementById('cameraIconBtn')?.addEventListener('click', () => document.getElementById('profileFoto').click());
    document.getElementById('profileFoto')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 1024*1024) { showNotifTop('Ukuran foto maksimal 1MB', true); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('previewFoto').src = ev.target.result;
                document.getElementById('profileImg').src = ev.target.result;
                showNotifTop('Foto baru dipilih, klik Simpan untuk menyimpan');
            };
            reader.readAsDataURL(file);
        }
    });
    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
        const nama = document.getElementById('profileName').value;
        let hp = document.getElementById('profilePhone').value;
        const foto = document.getElementById('previewFoto').src;
        if (!nama) { showNotifTop('Nama wajib diisi', true); return; }
        if (hp) { hp = hp.replace(/\D/g,''); if (hp.startsWith('0')) hp = hp.substring(1); hp = '+62' + hp; }
        else hp = '+62';
        try {
            await updateUserProfile(currentUser.id, { nama, hp, foto });
            document.getElementById('topUserName').innerText = nama;
            document.getElementById('profileImg').src = foto;
            closeModal('profileModal');
            showNotifTop('Profile tersimpan');
        } catch(e) { showNotifTop('Gagal: '+e.message, true); }
    });

    // Search buttons
    document.getElementById('searchBtn')?.addEventListener('click', performSearch);
    document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">🔍 Masukkan kata kunci untuk mencari data</p>';
    });
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => { if(e.key === 'Enter') performSearch(); });

    // Target KPI
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
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        targetData.monthlyTargets.push({ month: defaultMonth, target_agent:0, target_ca:0, target_koor:0 });
        renderMonthlyTargetList();
    });

    // Transaksi global
    const targetTransaksiCard = document.getElementById('targetTransaksiCard');
    if (targetTransaksiCard) targetTransaksiCard.addEventListener('click', () => showInputTransaksiModal());
    document.getElementById('viewTransaksiHistoryBtn')?.addEventListener('click', showTransaksiListModal);
    document.getElementById('saveTransaksiBtn')?.addEventListener('click', async () => {
        const nominal = document.getElementById('transaksiNominal').value;
        const keterangan = document.getElementById('transaksiKeterangan').value;
        const tanggal = document.getElementById('transaksiTanggal').value;
        if (!nominal || parseInt(nominal) <= 0) { showNotifTop('⚠️ Masukkan jumlah transaksi yang valid!', true); return; }
        await saveTransaksiGlobal(nominal, keterangan, tanggal, currentTransaksiId);
        closeModal('inputTransaksiModal');
        document.getElementById('transaksiNominal').value = '';
        document.getElementById('transaksiKeterangan').value = '';
        document.getElementById('transaksiTanggal').value = new Date().toISOString().split('T')[0];
        currentTransaksiId = null;
    });
    document.getElementById('cancelTransaksiBtn')?.addEventListener('click', () => { closeModal('inputTransaksiModal'); currentTransaksiId = null; });

    // Deadline & pesan notification
    const deadlineNotifBtn = document.getElementById('deadlineNotifBtn');
    if (deadlineNotifBtn) deadlineNotifBtn.addEventListener('click', async () => {
        const today = getTodayDate();
        let custQuery = supabase.from('customers').select('nama,tanggal').lt('tanggal', today);
        let prosQuery = supabase.from('prospek').select('nama,deadline').lt('deadline', today);
        if (currentUserRole !== 'owner') {
            custQuery = custQuery.eq('user_id', currentUser.id);
            prosQuery = prosQuery.eq('user_id', currentUser.id);
        }
        const { data: custOverdue } = await custQuery;
        const { data: prosOverdue } = await prosQuery;
        const total = (custOverdue?.length||0) + (prosOverdue?.length||0);
        if (total > 0) {
            let msg = `📅 DEADLINE TERLEWAT (${total}):\n`;
            custOverdue?.forEach(c => msg += `\n• ${c.nama} (Customer) - ${c.tanggal}`);
            prosOverdue?.forEach(p => msg += `\n• ${p.nama} (Prospek) - ${p.deadline}`);
            alert(msg);
        } else showNotifTop('✅ Semua deadline terpenuhi!');
    });
    const pesanNotifBtn = document.getElementById('pesanNotifBtn');
    if (pesanNotifBtn) pesanNotifBtn.addEventListener('click', () => {
        const pesanMenu = document.querySelector('.menu-item[data-page="pesan"]');
        if (pesanMenu) pesanMenu.click();
    });

    // Tambahan: logout button, dll sudah di-handle di auth state change
});
