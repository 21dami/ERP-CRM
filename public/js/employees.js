import api from './api.js';
import { showToast, showModal, hideModal, formatDate, statusBadge, buildPagination, debounce, formatCurrency } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let currentDept = '';

export async function renderEmployees() {
  const container = document.getElementById('content-area');
  let departments = [];
  try { departments = await api.getDepartments(); } catch(e) {}

  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="emp-search" placeholder="Search employees..." value="${currentSearch}"></div>
      <select class="filter-select" id="emp-dept-filter"><option value="">All Departments</option>${departments.map(d => `<option value="${d}" ${currentDept === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <button class="btn btn-primary" id="btn-add-emp"><i class="fas fa-plus"></i> Add Employee</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container"><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Department</th><th>Position</th><th>Hire Date</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead><tbody id="emp-tbody"></tbody></table></div><div id="emp-pagination"></div></div></div>`;

  document.getElementById('btn-add-emp').onclick = () => openEmpModal();
  document.getElementById('emp-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadEmployees(); });
  document.getElementById('emp-dept-filter').onchange = e => { currentDept = e.target.value; currentPage = 1; loadEmployees(); };

  await loadEmployees();
}

async function loadEmployees() {
  try {
    const result = await api.getEmployees({ search: currentSearch, department: currentDept, page: currentPage, limit: 15 });
    const tbody = document.getElementById('emp-tbody');
    if (!result.data.length) { tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-user-tie"></i><p>No employees found</p></div></td></tr>'; document.getElementById('emp-pagination').innerHTML = ''; return; }

    tbody.innerHTML = result.data.map(e => `
      <tr>
        <td><code>${e.employee_id}</code></td><td><strong>${e.first_name} ${e.last_name}</strong></td><td>${e.email || '-'}</td><td>${e.department || '-'}</td><td>${e.position || '-'}</td>
        <td>${formatDate(e.hire_date)}</td><td>${formatCurrency(e.salary)}</td><td>${statusBadge(e.status)}</td>
        <td><button class="btn-icon" onclick="window.appEditEmp(${e.id})" title="Edit"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="window.appDeleteEmp(${e.id})" title="Delete" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td>
      </tr>`).join('');

    document.getElementById('emp-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#emp-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadEmployees(); } };
    });
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
