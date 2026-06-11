// ========== SUPABASE CONFIG ==========
// JANGAN deklarasikan ulang const supabase - gunakan yang sudah ada dari CDN
// Langsung gunakan window.supabase yang sudah tersedia

const SUPABASE_URL = 'https://haylblhjzfavrfiyaicq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheWxibGhqemZhdnJmaXlhaWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzgyMDIsImV4cCI6MjA5NTMxNDIwMn0.j4yQa1ZttP5_Zg0ye5lK2OLecq39QhG3tPyv5PZ3r78';

// Inisialisasi Supabase client dengan nama variabel berbeda
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export ke global untuk digunakan di seluruh aplikasi
window.db = _supabase;

// ========== GLOBAL VARIABLES ==========
let currentUser = null;
let currentUserName = '';
let currentUserRole = 'cs';
let customersData = [];
let prospekData = [];
let chartCustomer = null;
let chartProspek = null;

// ========== HELPER FUNCTIONS ==========
function showNotif(msg, isError = false) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.className = `notif-toast ${isError ? 'notif-error' : ''}`;
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

function formatPhone(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value.startsWith('0')) value = value.substring(1);
    if (value.length > 12) value = value.slice(0, 12);
    input.value = value;
}

function openWA(hp) {
    if (!hp) {
        showNotif('⚠️ Nomor WhatsApp tidak ditemukan!', true);
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
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    }
}

function setupModalClickOutside(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modalId);
        });
    }
}

function updateSidebarBodyClass() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        document.body.classList.add('sidebar-open');
    } else {
        document.body.classList.remove('sidebar-open');
    }
}

// ========== LOAD DATA ==========
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
    renderFullFollowupList();
    updateStats();
    updateChartCustomer();
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
    renderFullProspekList();
    updateChartProspek();
}

// ========== RENDER FOLLOWUP KANBAN ==========
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
    
    // Render Baru
    const baruContainer = document.getElementById('baruList');
    if (baruContainer) {
        baruContainer.innerHTML = lists.baru.map(item => {
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
        
        document.querySelectorAll('#baruList .card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon')) {
                    openDetailCustomer(card.dataset.id);
                }
            });
        });
    }
    
    // Render Followup
    const followupContainer = document.getElementById('followupList');
    if (followupContainer) {
        followupContainer.innerHTML = lists.followup.map(item => {
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
        
        document.querySelectorAll('#followupList .card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon')) {
                    openDetailCustomer(card.dataset.id);
                }
            });
        });
    }
    
    // Render Pending
    const pendingContainer = document.getElementById('pendingList');
    if (pendingContainer) {
        pendingContainer.innerHTML = lists.pending.map(item => {
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
        
        document.querySelectorAll('#pendingList .card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon')) {
                    openDetailCustomer(card.dataset.id);
                }
            });
        });
    }
    
    // Render Closing
    const closingContainer = document.getElementById('closingList');
    if (closingContainer) {
        closingContainer.innerHTML = lists.closing.map(item => {
            return `<div class="card-item" data-id="${item.id}">
                <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
                <div class="card-name">${escapeHtml(item.nama)}</div>
                <div class="card-phone"><span>${escapeHtml(item.hp)}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span></div>
                <div class="card-deadline">📅 ${item.tanggal || '-'}</div>
            </div>`;
        }).join('');
        
        document.querySelectorAll('#closingList .card-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('whatsapp-icon')) {
                    openDetailCustomer(card.dataset.id);
                }
            });
        });
    }
}

// ========== RENDER PROSPEK KANBAN ==========
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
        
        document.querySelectorAll(`#${containerId} .card-item`).forEach(card => {
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

function renderFullFollowupList() {
    const container = document.getElementById('followupFullList');
    if (!container) return;
    
    if (customersData.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data followup</p>';
        return;
    }
    
    container.innerHTML = customersData.map(item => `
        <div class="card-item" data-id="${item.id}" style="margin-bottom:8px;">
            <div class="card-id">🆔 ${escapeHtml(item.agent_id || '-')}</div>
            <div class="card-name">${escapeHtml(item.nama)}</div>
            <div class="card-phone"><span>${escapeHtml(item.hp)}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span></div>
            <div class="card-deadline">📅 ${item.tanggal || '-'} | Status: ${item.status || 'baru'}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('#followupFullList .card-item').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('whatsapp-icon')) {
                openDetailCustomer(card.dataset.id);
            }
        });
    });
}

function renderFullProspekList() {
    const container = document.getElementById('prospekFullList');
    if (!container) return;
    
    if (prospekData.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#9ca3af;">📭 Belum ada data prospek</p>';
        return;
    }
    
    container.innerHTML = prospekData.map(item => `
        <div class="card-item" data-id="${item.id}" style="margin-bottom:8px;">
            <div class="card-name">${escapeHtml(item.nama)}</div>
            <div class="card-phone"><span>${escapeHtml(item.hp)}</span><span class="whatsapp-icon" onclick="event.stopPropagation(); openWA('${item.hp}')">💬</span></div>
            <div class="card-deadline">📅 ${item.deadline || '-'} | Status: ${item.status || 'Baru'}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('#prospekFullList .card-item').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('whatsapp-icon')) {
                openDetailProspek(card.dataset.id);
            }
        });
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

// ========== OPEN DETAILS ==========
async function openDetailCustomer(id) {
    const customer = customersData.find(c => c.id === id);
    if (!customer) return;
    
    const statusText = customer.status === 'followup' ? 'Follow Up' : customer.status;
    const statusClass = customer.status === 'followup' ? 'status-followup' : `status-${customer.status}`;
    
    document.getElementById('detailContent').innerHTML = `
        <div class="detail-header">
            <h3>${escapeHtml(customer.nama)}</h3>
            <div class="status-badge ${statusClass}">${statusText}</div>
        </div>
        <div class="detail-body">
            <div class="detail-info">
                <div class="detail-info-item"><strong>🆔 ID Agent:</strong> ${escapeHtml(customer.agent_id || '-')}</div>
                <div class="detail-info-item"><strong>📱 Nomor WA:</strong> ${escapeHtml(customer.hp)}</div>
                <div class="detail-info-item"><strong>📱 Aplikasi:</strong> ${escapeHtml(customer.apk || '-')}</div>
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
        showNotif('❌ Gagal update: ' + error.message, true);
        return;
    }
    
    const statusText = newStatus === 'followup' ? 'Follow Up' : newStatus;
    showNotif(`✅ Status berhasil diupdate ke ${statusText}. Deadline +1 hari menjadi ${newDeadline}`);
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
        showNotif('❌ Gagal update: ' + error.message, true);
        return;
    }
    
    showNotif(`✅ Status berhasil diupdate ke ${newStatus}. Deadline +1 hari menjadi ${newDeadline}`);
    closeModal('detailModal');
    await loadProspek();
}

async function deleteCustomer(id) {
    if (!confirm('Yakin hapus customer ini? Data akan dihapus permanen!')) return;
    
    const { error } = await window.db.from('customers').delete().eq('id', id);
    if (error) {
        showNotif('❌ Gagal hapus: ' + error.message, true);
        return;
    }
    
    showNotif('🗑️ Data customer berhasil dihapus');
    closeModal('detailModal');
    await loadCustomers();
}

async function deleteProspek(id) {
    if (!confirm('Yakin hapus prospek ini? Data akan dihapus permanen!')) return;
    
    const { error } = await window.db.from('prospek').delete().eq('id', id);
    if (error) {
        showNotif('❌ Gagal hapus: ' + error.message, true);
        return;
    }
    
    showNotif('🗑️ Data prospek berhasil dihapus');
    closeModal('detailModal');
    await loadProspek();
}

async function addCustomer(agentId, nama, hp, apk, uplineName, deadline) {
    const { data, error } = await window.db
        .from('customers')
        .insert({
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
        })
        .select();
    
    if (error) {
        showNotif('❌ Gagal simpan: ' + error.message, true);
        return false;
    }
    
    showNotif('✅ Data customer berhasil ditambahkan');
    await loadCustomers();
    return true;
}

async function addProspek(nama, hp, deadline) {
    const { data, error } = await window.db
        .from('prospek')
        .insert({
            nama: nama,
            hp: hp,
            deadline: deadline,
            status: 'Baru',
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select();
    
    if (error) {
        showNotif('❌ Gagal simpan: ' + error.message, true);
        return false;
    }
    
    showNotif('✅ Data prospek berhasil ditambahkan');
    await loadProspek();
    return true;
}

// ========== LOAD USER PROFILE ==========
async function loadUserProfile() {
    if (!currentUser) return;
    
    const { data, error } = await window.db
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (data) {
        currentUserName = data.nama || currentUser.email;
        currentUserRole = data.role || 'cs';
        document.getElementById('topUserName').innerText = currentUserName;
    } else {
        currentUserName = currentUser.email;
        document.getElementById('topUserName').innerText = currentUserName;
    }
}

// ========== AUTH ==========
async function handleLogin(email, password) {
    const { data, error } = await window.db.auth.signInWithPassword({
        email: email,
        password: password
    });
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
    document.getElementById('dashboardPage').style.display = 'none';
    document.getElementById('followupPage').style.display = 'none';
    document.getElementById('prospekPage').style.display = 'none';
    
    if (page === 'dashboard') {
        document.getElementById('dashboardPage').style.display = 'block';
    } else if (page === 'followup') {
        document.getElementById('followupPage').style.display = 'block';
    } else if (page === 'prospek') {
        document.getElementById('prospekPage').style.display = 'block';
    }
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    const activeMenu = document.querySelector(`.menu-item[data-page="${page}"]`);
    if (activeMenu) activeMenu.classList.add('active');
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
        if (window.innerWidth <= 768 && sidebar && toggleBtn && 
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
            if (window.innerWidth <= 768) sidebar.classList.remove('active');
            updateSidebarBodyClass();
        });
    });
    
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Add customer modal
    const addCustomerBtns = ['addCustomerBtn', 'addCustomerFullBtn'];
    addCustomerBtns.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                document.getElementById('customerDate').value = getTodayDate();
                showModal('customerModal');
            });
        }
    });
    
    document.getElementById('saveCustomerBtn').addEventListener('click', async () => {
        const agentId = document.getElementById('customerId').value;
        const nama = document.getElementById('customerName').value;
        let hp = document.getElementById('customerPhone').value;
        const apk = document.getElementById('customerApk').value;
        const upline = document.getElementById('customerUpline').value;
        const deadline = document.getElementById('customerDate').value;
        
        if (!agentId || !nama) {
            showNotif('⚠️ ID Agent dan Nama wajib diisi!', true);
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
    
    // Add prospek modal
    const addProspekBtns = ['addProspekBtn', 'addProspekFullBtn'];
    addProspekBtns.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                document.getElementById('prospekDeadline').value = getTodayDate();
                showModal('prospekModal');
            });
        }
    });
    
    document.getElementById('saveProspekBtn').addEventListener('click', async () => {
        const nama = document.getElementById('prospekName').value;
        let hp = document.getElementById('prospekPhone').value;
        const deadline = document.getElementById('prospekDeadline').value;
        
        if (!nama) {
            showNotif('⚠️ Nama wajib diisi!', true);
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
    
    // Close modal buttons
    document.querySelectorAll('.closeModalBtn').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
    
    // Phone formatting
    const phoneInputs = ['customerPhone', 'prospekPhone'];
    phoneInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() { formatPhone(this); });
        }
    });
    
    // Modal click outside
    setupModalClickOutside('customerModal');
    setupModalClickOutside('prospekModal');
    setupModalClickOutside('detailModal');
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
window.updateCustomerStatus = updateCustomerStatus;
window.updateProspekStatus = updateProspekStatus;
window.deleteCustomer = deleteCustomer;
window.deleteProspek = deleteProspek;
window.openDetailCustomer = openDetailCustomer;
window.openDetailProspek = openDetailProspek;
window.closeModal = closeModal;
