export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

export function showModal(title, bodyHtml, footerHtml = '') {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  overlay.style.display = 'flex';
}

export function hideModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

export function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
}

export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function statusBadge(status) {
  const map = {
    active: 'success', inactive: 'danger', pending: 'warning', confirmed: 'info',
    processing: 'primary', shipped: 'info', delivered: 'success', cancelled: 'danger',
    paid: 'success', unpaid: 'danger', partial: 'warning', refunded: 'gray',
    cash: 'success', credit_card: 'info', bank_transfer: 'primary'
  };
  return `<span class="badge badge-${map[status] || 'gray'}">${status}</span>`;
}

export function buildPagination(current, total, onPageChange) {
  if (total <= 1) return '';
  let html = '<div class="pagination"><div class="pagination-info"></div><div class="pagination-btns">';
  html += `<button class="page-btn" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
  
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  
  if (start > 1) html += `<button class="page-btn" data-page="1">1</button><span class="page-btn" style="border:none;cursor:default">...</span>`;
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  if (end < total) html += `<span class="page-btn" style="border:none;cursor:default">...</span><button class="page-btn" data-page="${total}">${total}</button>`;
  
  html += `<button class="page-btn" data-page="${current + 1}" ${current === total ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
  html += '</div></div>';
  return html;
}

export function getRolePermissions(role) {
  const perms = {
    admin: ['dashboard','clients','products','orders','inventory','sales','employees'],
    sales: ['dashboard','clients','products','orders','sales'],
    hr: ['dashboard','employees'],
    accounting: ['dashboard','sales','orders'],
    warehouse: ['dashboard','products','inventory']
  };
  return perms[role] || [];
}

export function canAccess(page, role) {
  return getRolePermissions(role).includes(page);
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}
