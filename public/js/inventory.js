import api from './api.js';
import { showToast, showModal, hideModal, formatCurrency, formatDate, statusBadge, buildPagination, debounce, makeSortable, refreshSortArrows } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let lowStockOnly = false;
let currentSort = 'updated_at';
let currentOrder = 'DESC';

const STORAGE_KEY = 'erp_inventory_hidden_columns';
const COLUMNS = [
  { key: 'sku', label: 'SKU' },
  { key: 'product_name', label: 'Product' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'available', label: 'Available' },
  { key: 'min_stock', label: 'Min Stock' },
  { key: 'warehouse_location', label: 'Location' },
  { key: 'last_restocked', label: 'Last Restocked' },
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

export async function renderInventory() {
  const container = document.getElementById('content-area');
  const hiddenCols = getHiddenColumns();
  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="inv-search" placeholder="Search inventory..." value="${currentSearch}"></div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="inv-low-stock" ${lowStockOnly ? 'checked' : ''}> Low Stock Only</label>
      <div class="column-toggle-wrap">
        <button class="column-toggle-btn" id="btn-columns"><i class="fas fa-columns"></i> Columns</button>
        <div class="column-dropdown" id="columns-dropdown">${COLUMNS.map(c => `<div class="column-dropdown-item"><input type="checkbox" id="col-${c.key}" data-col="${c.key}" ${!hiddenCols.includes(c.key) ? 'checked' : ''}><label for="col-${c.key}">${c.label}</label></div>`).join('')}</div>
      </div>
      <button class="btn btn-primary" id="btn-adjust-stock"><i class="fas fa-sliders-h"></i> Adjust Stock</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container"><table><thead><tr>${COLUMNS.map(c => `<th data-col="${c.key}" ${c.key !== 'available' && c.key !== 'status' ? `data-sort="${c.key}"` : ''}>${c.label}${c.key !== 'available' && c.key !== 'status' ? '<span class="sort-arrow"></span>' : ''}</th>`).join('')}</tr></thead><tbody id="inv-tbody"></tbody></table></div><div id="inv-pagination"></div></div></div>`;

  document.getElementById('btn-adjust-stock').onclick = () => openAdjustModal();
  document.getElementById('inv-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadInventory(); });
  document.getElementById('inv-low-stock').onchange = e => { lowStockOnly = e.target.checked; currentPage = 1; loadInventory(); };

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

  await loadInventory();
  makeSortable(document.querySelector('#inv-tbody').closest('table').querySelector('thead'), () => currentSort, () => currentOrder, (col, order) => { currentSort = col; currentOrder = order; currentPage = 1; loadInventory(); });
  applyColumnVisibility();
}

async function loadInventory() {
  try {
    const result = await api.getInventory({ search: currentSearch, low_stock: lowStockOnly ? 'true' : '', page: currentPage, limit: 15, sort: currentSort, order: currentOrder });
    const tbody = document.getElementById('inv-tbody');
    if (!result.data.length) { tbody.innerHTML = `<tr><td colspan="${COLUMNS.length}"><div class="empty-state"><i class="fas fa-warehouse"></i><p>No inventory items found</p></div></td></tr>`; document.getElementById('inv-pagination').innerHTML = ''; return; }

    tbody.innerHTML = result.data.map(i => {
      const available = i.quantity - (i.reserved || 0);
      const isLow = i.quantity <= i.min_stock;
      return `<tr>
        <td data-col="sku"><code>${i.sku}</code></td><td data-col="product_name"><strong>${i.product_name}</strong></td>
        <td data-col="quantity" style="font-weight:600;color:${isLow ? 'var(--danger)' : 'var(--text)'}">${i.quantity}</td>
        <td data-col="reserved">${i.reserved || 0}</td>
        <td data-col="available">${available}</td><td data-col="min_stock">${i.min_stock}</td><td data-col="warehouse_location">${i.warehouse_location || '-'}</td><td data-col="last_restocked">${formatDate(i.last_restocked)}</td>
        <td data-col="status">${isLow ? '<span class="badge badge-danger">Low Stock</span>' : '<span class="badge badge-success">OK</span>'}</td>
      </tr>`;
    }).join('');

    document.getElementById('inv-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#inv-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadInventory(); } };
    });
    refreshSortArrows(document.querySelector('#inv-tbody').closest('table').querySelector('thead'), currentSort, currentOrder);
    applyColumnVisibility();
  } catch (err) { showToast(err.message, 'error'); }
}

async function openAdjustModal() {
  let products = [];
  try { const res = await api.getProducts({ limit: 100, status: 'active' }); products = res.data; } catch(e) {}

  showModal('Adjust Stock', `
    <form id="adjust-form">
      <div class="form-group"><label>Product *</label><select name="product_id" required><option value="">Select product</option>${products.map(p => `<option value="${p.id}">${p.name} (Current: ${p.stock_quantity})</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="form-group"><label>Adjustment (+/-) *</label><input type="number" name="adjustment" required placeholder="e.g. 10 or -5"></div>
        <div class="form-group"><label>Reason</label><input name="reason" placeholder="e.g. Restock, Damaged"></div>
      </div>
    </form>`,
    `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save">Apply</button>`);

  document.getElementById('modal-cancel').onclick = hideModal;
  document.getElementById('modal-save').onclick = async () => {
    const fd = new FormData(document.getElementById('adjust-form'));
    const productId = parseInt(fd.get('product_id'));
    const adjustment = parseInt(fd.get('adjustment'));
    if (!productId || isNaN(adjustment)) { showToast('Select a product and enter adjustment', 'error'); return; }
    try { await api.adjustInventory({ product_id: productId, adjustment }); showToast('Stock adjusted'); hideModal(); loadInventory(); } catch (err) { showToast(err.message, 'error'); }
  };
}
