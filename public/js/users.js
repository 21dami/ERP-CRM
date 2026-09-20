import api from './api.js';
import { showToast, showModal, hideModal, formatDate, statusBadge, buildPagination, debounce, makeSortable, refreshSortArrows } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let currentRole = '';
let currentStatus = '';
let currentSort = 'created_at';
let currentOrder = 'DESC';

export async function renderUsers() {
  const container = document.getElementById('content-area');

  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="user-search" placeholder="Search users..." value="${currentSearch}"></div>
      <select class="filter-select" id="user-role-filter">
        <option value="">All Roles</option>
        <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin</option>
        <option value="sales" ${currentRole === 'sales' ? 'selected' : ''}>Sales</option>
        <option value="hr" ${currentRole === 'hr' ? 'selected' : ''}>HR</option>
        <option value="accounting" ${currentRole === 'accounting' ? 'selected' : ''}>Accounting</option>
        <option value="warehouse" ${currentRole === 'warehouse' ? 'selected' : ''}>Warehouse</option>
      </select>
      <select class="filter-select" id="user-status-filter">
        <option value="">All Status</option>
        <option value="active" ${currentStatus === 'active' ? 'selected' : ''}>Active</option>
        <option value="inactive" ${currentStatus === 'inactive' ? 'selected' : ''}>Inactive</option>
      </select>
      <button class="btn btn-primary" id="btn-add-user"><i class="fas fa-plus"></i> Add User</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container">
      <table>
        <thead><tr><th data-sort="username">Username<span class="sort-arrow"></span></th><th data-sort="full_name">Full Name<span class="sort-arrow"></span></th><th data-sort="email">Email<span class="sort-arrow"></span></th><th data-sort="role">Role<span class="sort-arrow"></span></th><th data-sort="status">Status<span class="sort-arrow"></span></th><th data-sort="created_at">Created<span class="sort-arrow"></span></th><th>Actions</th></tr></thead>
        <tbody id="users-tbody"></tbody>
      </table>
    </div><div id="users-pagination"></div></div></div>`;

  document.getElementById('btn-add-user').onclick = () => openUserModal();
  document.getElementById('user-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadUsers(); });
  document.getElementById('user-role-filter').onchange = e => { currentRole = e.target.value; currentPage = 1; loadUsers(); };
  document.getElementById('user-status-filter').onchange = e => { currentStatus = e.target.value; currentPage = 1; loadUsers(); };

  await loadUsers();
  makeSortable(document.querySelector('#users-tbody').closest('table').querySelector('thead'), () => currentSort, () => currentOrder, (col, order) => { currentSort = col; currentOrder = order; currentPage = 1; loadUsers(); });
}

async function loadUsers() {
  try {
    const result = await api.getUsers({ search: currentSearch, role: currentRole, status: currentStatus, page: currentPage, limit: 15, sort: currentSort, order: currentOrder });
    const tbody = document.getElementById('users-tbody');
    if (!result.data.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No users found</p></div></td></tr>';
      document.getElementById('users-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = result.data.map(u => `
      <tr>
        <td><strong>${u.username}</strong></td>
        <td>${u.full_name}</td>
        <td>${u.email || '-'}</td>
        <td>${statusBadge(u.role)}</td>
        <td>${statusBadge(u.status)}</td>
        <td>${formatDate(u.created_at)}</td>
        <td>
          ${u.username !== 'admin' ? `<button class="btn-icon" onclick="window.appImpersonateUser(${u.id})" title="Impersonate" style="color:var(--primary)"><i class="fas fa-mask"></i></button>` : ''}
          <button class="btn-icon" onclick="window.appEditUser(${u.id})" title="Edit"><i class="fas fa-edit"></i></button>
          ${u.username !== 'admin' ? `<button class="btn-icon" onclick="window.appDeleteUser(${u.id})" title="Delete" style="color:var(--danger)"><i class="fas fa-trash"></i></button>` : ''}
        </td>
      </tr>`).join('');

    document.getElementById('users-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#users-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadUsers(); } };
    });
    refreshSortArrows(document.querySelector('#users-tbody').closest('table').querySelector('thead'), currentSort, currentOrder);
  } catch (err) { showToast(err.message, 'error'); }
}

function openUserModal(user = null) {
  const isEdit = !!user;
  showModal(isEdit ? 'Edit User' : 'New User', `
    <form id="user-form">
      <div class="form-row">
        <div class="form-group"><label>Username *</label><input name="username" value="${user?.username || ''}" required ${isEdit ? 'readonly' : ''}></div>
        <div class="form-group"><label>Full Name *</label><input name="full_name" value="${user?.full_name || ''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" name="email" value="${user?.email || ''}"></div>
        <div class="form-group"><label>${isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label><input type="password" name="password" ${isEdit ? '' : 'required'} minlength="6"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Role *</label>
          <select name="role" required>
            <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="sales" ${user?.role === 'sales' ? 'selected' : ''}>Sales</option>
            <option value="hr" ${user?.role === 'hr' ? 'selected' : ''}>HR</option>
            <option value="accounting" ${user?.role === 'accounting' ? 'selected' : ''}>Accounting</option>
            <option value="warehouse" ${user?.role === 'warehouse' ? 'selected' : ''}>Warehouse</option>
          </select>
        </div>
        <div class="form-group"><label>Status</label>
          <select name="status">
            <option value="active" ${user?.status !== 'inactive' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
      </div>
    </form>`,
    `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save">${isEdit ? 'Update' : 'Create'}</button>`);

  document.getElementById('modal-cancel').onclick = hideModal;
  document.getElementById('modal-save').onclick = async () => {
    const fd = new FormData(document.getElementById('user-form'));
    const data = Object.fromEntries(fd);
    if (isEdit && !data.password) delete data.password;
    try {
      if (isEdit) { await api.updateUser(user.id, data); showToast('User updated'); }
      else { await api.createUser(data); showToast('User created'); }
      hideModal(); loadUsers();
    } catch (err) { showToast(err.message, 'error'); }
  };
}

window.appEditUser = async (id) => {
  try { const u = await api.getUser(id); openUserModal(u); } catch (err) { showToast(err.message, 'error'); }
};

window.appDeleteUser = async (id) => {
  if (!confirm('Delete this user?')) return;
  try { await api.deleteUser(id); showToast('User deleted'); loadUsers(); } catch (err) { showToast(err.message, 'error'); }
};

window.appImpersonateUser = async (id) => {
  if (!confirm('Impersonate this user? You can exit anytime from the banner.')) return;
  try {
    const result = await api.impersonateUser(id);
    const originalUser = JSON.parse(localStorage.getItem('erp_user'));
    const originalToken = localStorage.getItem('erp_token');
    localStorage.setItem('erp_impersonator', JSON.stringify({ ...originalUser, _token: originalToken }));
    localStorage.setItem('erp_token', result.token);
    localStorage.setItem('erp_user', JSON.stringify(result.user));
    api.setToken(result.token);
    window.dispatchEvent(new CustomEvent('impersonation-start', { detail: { impersonator: originalUser, impersonated: result.user } }));
    showToast(`Now impersonating ${result.user.full_name}`);
  } catch (err) { showToast(err.message, 'error'); }
};
