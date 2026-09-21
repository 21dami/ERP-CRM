import api from './api.js';
import { showToast, showModal, hideModal, formatDate, statusBadge, buildPagination, debounce, formatCurrency, makeSortable, refreshSortArrows } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let currentDept = '';
let currentSort = 'created_at';
let currentOrder = 'DESC';

const STORAGE_KEY = 'erp_employees_hidden_columns';
const COLUMNS = [
  { key: 'employee_id', label: 'ID' },
  { key: 'first_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'position', label: 'Position' },
  { key: 'hire_date', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'status', label: 'Status' }
];

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

export async function renderEmployees() {
  const container = document.getElementById('content-area');
  let departments = [];
  try { departments = await api.getDepartments(); } catch(e) {}

  const hiddenCols = getHiddenColumns();
  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="emp-search" placeholder="Search employees..." value="${currentSearch}"></div>
      <select class="filter-select" id="emp-dept-filter"><option value="">All Departments</option>${departments.map(d => `<option value="${d}" ${currentDept === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <div class="column-toggle-wrap">
        <button class="column-toggle-btn" id="btn-columns"><i class="fas fa-columns"></i> Columns</button>
        <div class="column-dropdown" id="columns-dropdown">${COLUMNS.map(c => `<div class="column-dropdown-item"><input type="checkbox" id="col-${c.key}" data-col="${c.key}" ${!hiddenCols.includes(c.key) ? 'checked' : ''}><label for="col-${c.key}">${c.label}</label></div>`).join('')}</div>
      </div>
      <button class="btn btn-primary" id="btn-add-emp"><i class="fas fa-plus"></i> Add Employee</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container"><table><thead><tr>${COLUMNS.map(c => `<th data-col="${c.key}" data-sort="${c.key}">${c.label}<span class="sort-arrow"></span></th>`).join('')}<th>Actions</th></tr></thead><tbody id="emp-tbody"></tbody></table></div><div id="emp-pagination"></div></div></div>`;

  document.getElementById('btn-add-emp').onclick = () => openEmpModal();
  document.getElementById('emp-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadEmployees(); });
  document.getElementById('emp-dept-filter').onchange = e => { currentDept = e.target.value; currentPage = 1; loadEmployees(); };

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

  await loadEmployees();
  makeSortable(document.querySelector('#emp-tbody').closest('table').querySelector('thead'), () => currentSort, () => currentOrder, (col, order) => { currentSort = col; currentOrder = order; currentPage = 1; loadEmployees(); });
  applyColumnVisibility();
}

async function loadEmployees() {
  try {
    const result = await api.getEmployees({ search: currentSearch, department: currentDept, page: currentPage, limit: 15, sort: currentSort, order: currentOrder });
    const tbody = document.getElementById('emp-tbody');
    if (!result.data.length) { tbody.innerHTML = `<tr><td colspan="${COLUMNS.length + 1}"><div class="empty-state"><i class="fas fa-user-tie"></i><p>No employees found</p></div></td></tr>`; document.getElementById('emp-pagination').innerHTML = ''; return; }

    tbody.innerHTML = result.data.map(e => `
      <tr>
        <td data-col="employee_id"><code>${e.employee_id}</code></td><td data-col="first_name"><strong>${e.first_name} ${e.last_name}</strong></td><td data-col="email">${e.email || '-'}</td><td data-col="department">${e.department || '-'}</td><td data-col="position">${e.position || '-'}</td>
        <td data-col="hire_date">${formatDate(e.hire_date)}</td><td data-col="salary">${formatCurrency(e.salary)}</td><td data-col="status">${statusBadge(e.status)}</td>
        <td><button class="btn-icon" onclick="window.appEditEmp(${e.id})" title="Edit"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="window.appDeleteEmp(${e.id})" title="Delete" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td>
      </tr>`).join('');

    document.getElementById('emp-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#emp-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadEmployees(); } };
    });
    refreshSortArrows(document.querySelector('#emp-tbody').closest('table').querySelector('thead'), currentSort, currentOrder);
    applyColumnVisibility();
  } catch (err) { showToast(err.message, 'error'); }
}

function openEmpModal(emp = null) {
  const isEdit = !!emp;
  showModal(isEdit ? 'Edit Employee' : 'New Employee', `
    <form id="emp-form">
      <div class="form-row">
        <div class="form-group"><label>First Name *</label><input name="first_name" value="${emp?.first_name || ''}" required></div>
        <div class="form-group"><label>Last Name *</label><input name="last_name" value="${emp?.last_name || ''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" name="email" value="${emp?.email || ''}"></div>
        <div class="form-group"><label>Phone</label><input name="phone" value="${emp?.phone || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Department</label><input name="department" value="${emp?.department || ''}" list="dept-list"><datalist id="dept-list"><option value="Management"><option value="Sales"><option value="HR"><option value="Accounting"><option value="Warehouse"><option value="IT"><option value="Marketing"><option value="Operations"></datalist></div>
        <div class="form-group"><label>Position</label><input name="position" value="${emp?.position || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Hire Date</label><input type="date" name="hire_date" value="${emp?.hire_date || ''}"></div>
        <div class="form-group"><label>Salary</label><input type="number" step="0.01" name="salary" value="${emp?.salary || ''}"></div>
      </div>
      <div class="form-group"><label>Address</label><input name="address" value="${emp?.address || ''}"></div>
      <div class="form-group"><label>Status</label><select name="status"><option value="active" ${emp?.status !== 'inactive' && emp?.status !== 'terminated' ? 'selected' : ''}>Active</option><option value="inactive" ${emp?.status === 'inactive' ? 'selected' : ''}>Inactive</option><option value="terminated" ${emp?.status === 'terminated' ? 'selected' : ''}>Terminated</option></select></div>
    </form>`,
    `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save">${isEdit ? 'Update' : 'Create'}</button>`);

  document.getElementById('modal-cancel').onclick = hideModal;
  document.getElementById('modal-save').onclick = async () => {
    const fd = new FormData(document.getElementById('emp-form'));
    const data = Object.fromEntries(fd);
    data.salary = parseFloat(data.salary) || 0;
    try {
      if (isEdit) { await api.updateEmployee(emp.id, data); showToast('Employee updated'); }
      else { await api.createEmployee(data); showToast('Employee created'); }
      hideModal(); loadEmployees();
    } catch (err) { showToast(err.message, 'error'); }
  };
}

window.appEditEmp = async (id) => {
  try { const e = await api.getEmployee(id); openEmpModal(e); } catch (err) { showToast(err.message, 'error'); }
};

window.appDeleteEmp = async (id) => {
  if (!confirm('Delete this employee?')) return;
  try { await api.deleteEmployee(id); showToast('Employee deleted'); loadEmployees(); } catch (err) { showToast(err.message, 'error'); }
};
