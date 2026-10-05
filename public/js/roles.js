import api from './api.js';
import { showToast, showModal, hideModal, formatDate, buildPagination, debounce, makeSortable, refreshSortArrows } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let currentSort = 'created_at';
let currentOrder = 'DESC';
let catalogCache = null;

const STORAGE_KEY = 'erp_roles_hidden_columns';
const COLUMNS = [
  { key: 'name', label: 'Role' },
  { key: 'display_name', label: 'Display Name' },
  { key: 'description', label: 'Description' },
  { key: 'user_count', label: 'Users' },
  { key: 'permission_count', label: 'Permissions' },
  { key: 'is_system', label: 'Type' },
  { key: 'created_at', label: 'Created' }
];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function myRole() {
  try { return JSON.parse(localStorage.getItem('erp_user'))?.role; } catch { return null; }
}

function getHiddenColumns() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function setHiddenColumns(cols) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

function applyColumnVisibility() {
  const hidden = getHiddenColumns();
  document.querySelectorAll('th[data-col], td[data-col]').forEach(el => {
    el.classList.toggle('hidden', hidden.includes(el.dataset.col));
  });
  document.querySelectorAll('.column-dropdown-item input[type="checkbox"]').forEach(cb => {
    cb.checked = !hidden.includes(cb.dataset.col);
  });
}

async function getCatalog() {
  if (!catalogCache) catalogCache = await api.getPermissionCatalog();
  return catalogCache;
}

export async function renderRoles() {
  const container = document.getElementById('content-area');
  const hiddenCols = getHiddenColumns();

  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="role-search" placeholder="Search roles..." value="${esc(currentSearch)}"></div>
      <div class="column-toggle-wrap">
        <button class="column-toggle-btn" id="btn-columns"><i class="fas fa-columns"></i> Columns</button>
        <div class="column-dropdown" id="columns-dropdown">${COLUMNS.map(c => `<div class="column-dropdown-item"><input type="checkbox" id="col-${c.key}" data-col="${c.key}" ${!hiddenCols.includes(c.key) ? 'checked' : ''}><label for="col-${c.key}">${c.label}</label></div>`).join('')}</div>
      </div>
      <button class="btn btn-primary" id="btn-add-role" data-perm="roles.create"><i class="fas fa-plus"></i> New Role</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container">
      <table>
        <thead><tr>${COLUMNS.map(c => `<th data-col="${c.key}" data-sort="${c.key}">${c.label}<span class="sort-arrow"></span></th>`).join('')}<th>Actions</th></tr></thead>
        <tbody id="roles-tbody"></tbody>
      </table>
    </div><div id="roles-pagination"></div></div></div>`;

  document.getElementById('btn-add-role').onclick = () => openRoleModal();
  document.getElementById('role-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadRoles(); });

  const colBtn = document.getElementById('btn-columns');
  const colDropdown = document.getElementById('columns-dropdown');
  colBtn.onclick = (e) => { e.stopPropagation(); colDropdown.classList.toggle('open'); };
  document.addEventListener('click', () => colDropdown.classList.remove('open'));
  colDropdown.onclick = (e) => e.stopPropagation();
  colDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.onchange = () => {
      const hidden = getHiddenColumns();
      if (cb.checked) setHiddenColumns(hidden.filter(k => k !== cb.dataset.col));
      else { hidden.push(cb.dataset.col); setHiddenColumns(hidden); }
      applyColumnVisibility();
    };
  });

  await loadRoles();
  makeSortable(document.querySelector('#roles-tbody').closest('table').querySelector('thead'), () => currentSort, () => currentOrder, (col, order) => { currentSort = col; currentOrder = order; currentPage = 1; loadRoles(); });
  applyColumnVisibility();
}

async function loadRoles() {
  try {
    const result = await api.getRoles({ search: currentSearch, page: currentPage, limit: 15, sort: currentSort, order: currentOrder });
    const tbody = document.getElementById('roles-tbody');
    if (!result.data.length) {
      tbody.innerHTML = `<tr><td colspan="${COLUMNS.length + 1}"><div class="empty-state"><i class="fas fa-user-shield"></i><p>No roles found</p></div></td></tr>`;
      document.getElementById('roles-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = result.data.map(r => `
      <tr>
        <td data-col="name"><strong>${esc(r.name)}</strong></td>
        <td data-col="display_name">${esc(r.display_name)}</td>
        <td data-col="description">${esc(r.description) || '-'}</td>
        <td data-col="user_count">${r.user_count}</td>
        <td data-col="permission_count">${r.permission_count}</td>
        <td data-col="is_system"><span class="badge badge-${r.is_system ? 'info' : 'gray'}">${r.is_system ? 'System' : 'Custom'}</span></td>
        <td data-col="created_at">${formatDate(r.created_at)}</td>
        <td>
          <button class="btn-icon" onclick="window.appRolePermissions(${r.id})" title="Permissions" data-perm="roles.update" style="color:var(--primary)"><i class="fas fa-key"></i></button>
          <button class="btn-icon" onclick="window.appEditRole(${r.id})" title="Edit" data-perm="roles.update"><i class="fas fa-edit"></i></button>
          ${r.is_system ? '' : `<button class="btn-icon" onclick="window.appDeleteRole(${r.id})" title="Delete" data-perm="roles.delete" style="color:var(--danger)"><i class="fas fa-trash"></i></button>`}
        </td>
      </tr>`).join('');

    document.getElementById('roles-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#roles-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadRoles(); } };
    });
    refreshSortArrows(document.querySelector('#roles-tbody').closest('table').querySelector('thead'), currentSort, currentOrder);
    applyColumnVisibility();
  } catch (err) { showToast(err.message, 'error'); }
}

function openRoleModal(role = null) {
  const isEdit = !!role;
  const isSystem = !!role?.is_system;

  showModal(isEdit ? 'Edit Role' : 'New Role', `
    <form id="role-form">
      <div class="form-row">
        <div class="form-group"><label>Role Key *</label><input name="name" value="${esc(role?.name || '')}" required placeholder="e.g. purchasing" ${isSystem ? 'readonly' : ''}></div>
        <div class="form-group"><label>Display Name *</label><input name="display_name" value="${esc(role?.display_name || '')}" required placeholder="e.g. Purchasing"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="3" placeholder="What this role is allowed to do">${esc(role?.description || '')}</textarea></div>
      ${isSystem ? '<p class="perm-note"><i class="fas fa-lock"></i> System roles cannot be renamed or deleted, but their permissions can be changed.</p>' : '<p class="perm-note">The role key must be lowercase and is used to assign the role to users.</p>'}
    </form>`,
    `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save">${isEdit ? 'Update' : 'Create'}</button>`);

  document.getElementById('modal-cancel').onclick = hideModal;
  document.getElementById('modal-save').onclick = async () => {
    const form = document.getElementById('role-form');
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    try {
      if (isEdit) {
        await api.updateRole(role.id, data);
        showToast('Role updated');
        hideModal();
        loadRoles();
      } else {
        const created = await api.createRole({ ...data, permissions: [] });
        showToast('Role created. Now set its permissions.');
        openPermissionsModal(created.id);
      }
    } catch (err) { showToast(err.message, 'error'); }
  };
}

async function openPermissionsModal(roleId) {
  try {
    const [catalog, role] = await Promise.all([getCatalog(), api.getRole(roleId)]);
    const isOwnRole = role.name === myRole();
    const lockedKeys = ['roles.view', 'roles.update'];

    const groupsHtml = catalog.groups.map(group => `
      <div class="perm-group">
        <div class="perm-group-header">
          <i class="fas ${group.icon}"></i>
          <label for="perm-all-${group.key}">${group.label}</label>
          <span class="perm-group-toggle">
            <input type="checkbox" id="perm-all-${group.key}" data-group-toggle="${group.key}">
            <label for="perm-all-${group.key}">All</label>
          </span>
        </div>
        <div class="perm-group-grid">
          ${group.permissions.map(p => {
            const checked = role.permissions.includes(p.key) ? 'checked' : '';
            const locked = isOwnRole && lockedKeys.includes(p.key);
            return `<label class="perm-item"><input type="checkbox" data-perm-key="${p.key}" data-group="${group.key}" ${checked} ${locked ? 'disabled' : ''}><span>${p.label}</span></label>`;
          }).join('')}
        </div>
      </div>`).join('');

    showModal(`Permissions · ${role.display_name}`, `
      <p class="perm-note">Permissions decide which sections this role can open and what it can do inside them.</p>
      ${isOwnRole ? '<p class="perm-note perm-note-warning"><i class="fas fa-shield-alt"></i> This is your own role. Role management permissions cannot be removed.</p>' : ''}
      <div class="perm-groups">${groupsHtml}</div>`,
      `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save" data-perm="roles.update">Save Permissions</button>`,
      { large: true });

    const inputs = () => Array.from(document.querySelectorAll('#modal-body [data-perm-key]'));

    const syncGroupToggles = () => {
      catalog.groups.forEach(group => {
        const toggle = document.getElementById(`perm-all-${group.key}`);
        const boxes = inputs().filter(i => i.dataset.group === group.key);
        const enabled = boxes.filter(i => !i.disabled);
        toggle.checked = enabled.length > 0 && enabled.every(i => i.checked);
        toggle.indeterminate = enabled.some(i => i.checked) && !toggle.checked;
      });
    };

    inputs().forEach(input => { input.onchange = syncGroupToggles; });

    catalog.groups.forEach(group => {
      const toggle = document.getElementById(`perm-all-${group.key}`);
      toggle.onchange = () => {
        inputs().filter(i => i.dataset.group === group.key && !i.disabled).forEach(i => { i.checked = toggle.checked; });
        syncGroupToggles();
      };
    });

    syncGroupToggles();

    document.getElementById('modal-cancel').onclick = hideModal;
    document.getElementById('modal-save').onclick = async () => {
      const permissions = inputs().filter(i => i.checked).map(i => i.dataset.permKey);
      try {
        await api.updateRolePermissions(role.id, permissions);
        showToast('Permissions updated');
        hideModal();
        if (isOwnRole && window.appPermissionsChanged) window.appPermissionsChanged();
        loadRoles();
      } catch (err) { showToast(err.message, 'error'); }
    };
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.appEditRole = async (id) => {
  try {
    const role = await api.getRole(id);
    openRoleModal(role);
  } catch (err) { showToast(err.message, 'error'); }
};

window.appRolePermissions = (id) => openPermissionsModal(id);

window.appDeleteRole = async (id) => {
  if (!confirm('Delete this role? Users assigned to it must be moved first.')) return;
  try { await api.deleteRole(id); showToast('Role deleted'); loadRoles(); } catch (err) { showToast(err.message, 'error'); }
};
