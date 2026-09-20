import api from './api.js';
import { showToast, showModal, hideModal, formatCurrency, formatDate, statusBadge, buildPagination, debounce, makeSortable, refreshSortArrows } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let currentStatus = '';
let currentSort = 'created_at';
let currentOrder = 'DESC';

export async function renderClients() {
  const container = document.getElementById('content-area');
  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="client-search" placeholder="Search clients..." value="${currentSearch}"></div>
      <select class="filter-select" id="client-status-filter"><option value="">All Status</option><option value="active" ${currentStatus === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${currentStatus === 'inactive' ? 'selected' : ''}>Inactive</option></select>
      <button class="btn btn-primary" id="btn-add-client"><i class="fas fa-plus"></i> Add Client</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container"><table><thead><tr><th data-sort="name">Name<span class="sort-arrow"></span></th><th data-sort="company">Company<span class="sort-arrow"></span></th><th data-sort="email">Email<span class="sort-arrow"></span></th><th data-sort="phone">Phone<span class="sort-arrow"></span></th><th data-sort="city">City<span class="sort-arrow"></span></th><th data-sort="status">Status<span class="sort-arrow"></span></th><th>Actions</th></tr></thead><tbody id="clients-tbody"></tbody></table></div><div id="clients-pagination"></div></div></div>`;

  document.getElementById('btn-add-client').onclick = () => openClientModal();
  document.getElementById('client-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadClients(); });
  document.getElementById('client-status-filter').onchange = e => { currentStatus = e.target.value; currentPage = 1; loadClients(); };

  await loadClients();
  makeSortable(document.querySelector('#clients-tbody').closest('table').querySelector('thead'), () => currentSort, () => currentOrder, (col, order) => { currentSort = col; currentOrder = order; currentPage = 1; loadClients(); });
}

async function loadClients() {
  try {
    const result = await api.getClients({ search: currentSearch, status: currentStatus, page: currentPage, limit: 15, sort: currentSort, order: currentOrder });
    const tbody = document.getElementById('clients-tbody');
    if (!result.data.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No clients found</p></div></td></tr>'; document.getElementById('clients-pagination').innerHTML = ''; return; }

    tbody.innerHTML = result.data.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td><td>${c.company || '-'}</td><td>${c.email || '-'}</td><td>${c.phone || '-'}</td><td>${c.city || '-'}</td><td>${statusBadge(c.status)}</td>
        <td><button class="btn-icon" onclick="window.appEditClient(${c.id})" title="Edit"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="window.appDeleteClient(${c.id})" title="Delete" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td>
      </tr>`).join('');

    document.getElementById('clients-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#clients-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadClients(); } };
    });
    refreshSortArrows(document.querySelector('#clients-tbody').closest('table').querySelector('thead'), currentSort, currentOrder);
  } catch (err) { showToast(err.message, 'error'); }
}

function openClientModal(client = null) {
  const isEdit = !!client;
  showModal(isEdit ? 'Edit Client' : 'New Client', `
    <form id="client-form">
      <div class="form-row">
        <div class="form-group"><label>Name *</label><input name="name" value="${client?.name || ''}" required></div>
        <div class="form-group"><label>Company</label><input name="company" value="${client?.company || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" name="email" value="${client?.email || ''}"></div>
        <div class="form-group"><label>Phone</label><input name="phone" value="${client?.phone || ''}"></div>
      </div>
      <div class="form-group"><label>Address</label><input name="address" value="${client?.address || ''}"></div>
      <div class="form-row">
        <div class="form-group"><label>City</label><input name="city" value="${client?.city || ''}"></div>
        <div class="form-group"><label>State</label><input name="state" value="${client?.state || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ZIP Code</label><input name="zip_code" value="${client?.zip_code || ''}"></div>
        <div class="form-group"><label>Country</label><input name="country" value="${client?.country || 'USA'}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tax ID</label><input name="tax_id" value="${client?.tax_id || ''}"></div>
        <div class="form-group"><label>Status</label><select name="status"><option value="active" ${client?.status === 'active' || !isEdit ? 'selected' : ''}>Active</option><option value="inactive" ${client?.status === 'inactive' ? 'selected' : ''}>Inactive</option></select></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea name="notes">${client?.notes || ''}</textarea></div>
    </form>`,
    `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save">${isEdit ? 'Update' : 'Create'}</button>`);

  document.getElementById('modal-cancel').onclick = hideModal;
  document.getElementById('modal-save').onclick = async () => {
    const form = document.getElementById('client-form');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);
    try {
      if (isEdit) { await api.updateClient(client.id, data); showToast('Client updated'); }
      else { await api.createClient(data); showToast('Client created'); }
      hideModal(); loadClients();
    } catch (err) { showToast(err.message, 'error'); }
  };
}

window.appEditClient = async (id) => {
  try { const client = await api.getClient(id); openClientModal(client); } catch (err) { showToast(err.message, 'error'); }
};

window.appDeleteClient = async (id) => {
  if (!confirm('Delete this client?')) return;
  try { await api.deleteClient(id); showToast('Client deleted'); loadClients(); } catch (err) { showToast(err.message, 'error'); }
};
