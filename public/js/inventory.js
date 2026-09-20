import api from './api.js';
import { showToast, showModal, hideModal, formatCurrency, formatDate, statusBadge, buildPagination, debounce, makeSortable, refreshSortArrows } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let lowStockOnly = false;
let currentSort = 'updated_at';
let currentOrder = 'DESC';

export async function renderInventory() {
  const container = document.getElementById('content-area');
  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="inv-search" placeholder="Search inventory..." value="${currentSearch}"></div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="inv-low-stock" ${lowStockOnly ? 'checked' : ''}> Low Stock Only</label>
      <button class="btn btn-primary" id="btn-adjust-stock"><i class="fas fa-sliders-h"></i> Adjust Stock</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container"><table><thead><tr><th data-sort="sku">SKU<span class="sort-arrow"></span></th><th data-sort="product_name">Product<span class="sort-arrow"></span></th><th data-sort="quantity">Quantity<span class="sort-arrow"></span></th><th data-sort="reserved">Reserved<span class="sort-arrow"></span></th><th>Available</th><th data-sort="min_stock">Min Stock<span class="sort-arrow"></span></th><th data-sort="warehouse_location">Location<span class="sort-arrow"></span></th><th data-sort="last_restocked">Last Restocked<span class="sort-arrow"></span></th><th>Status</th></tr></thead><tbody id="inv-tbody"></tbody></table></div><div id="inv-pagination"></div></div></div>`;

  document.getElementById('btn-adjust-stock').onclick = () => openAdjustModal();
  document.getElementById('inv-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadInventory(); });
  document.getElementById('inv-low-stock').onchange = e => { lowStockOnly = e.target.checked; currentPage = 1; loadInventory(); };

  await loadInventory();
  makeSortable(document.querySelector('#inv-tbody').closest('table').querySelector('thead'), () => currentSort, () => currentOrder, (col, order) => { currentSort = col; currentOrder = order; currentPage = 1; loadInventory(); });
}

async function loadInventory() {
  try {
    const result = await api.getInventory({ search: currentSearch, low_stock: lowStockOnly ? 'true' : '', page: currentPage, limit: 15, sort: currentSort, order: currentOrder });
    const tbody = document.getElementById('inv-tbody');
    if (!result.data.length) { tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-warehouse"></i><p>No inventory items found</p></div></td></tr>'; document.getElementById('inv-pagination').innerHTML = ''; return; }

    tbody.innerHTML = result.data.map(i => {
      const available = i.quantity - (i.reserved || 0);
      const isLow = i.quantity <= i.min_stock;
      return `<tr>
        <td><code>${i.sku}</code></td><td><strong>${i.product_name}</strong></td>
        <td style="font-weight:600;color:${isLow ? 'var(--danger)' : 'var(--text)'}">${i.quantity}</td>
        <td>${i.reserved || 0}</td>
        <td>${available}</td><td>${i.min_stock}</td><td>${i.warehouse_location || '-'}</td><td>${formatDate(i.last_restocked)}</td>
        <td>${isLow ? '<span class="badge badge-danger">Low Stock</span>' : '<span class="badge badge-success">OK</span>'}</td>
      </tr>`;
    }).join('');

    document.getElementById('inv-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#inv-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadInventory(); } };
    });
    refreshSortArrows(document.querySelector('#inv-tbody').closest('table').querySelector('thead'), currentSort, currentOrder);
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
