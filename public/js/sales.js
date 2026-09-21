import api from './api.js';
import { showToast, showModal, hideModal, formatCurrency, formatDate, statusBadge, buildPagination, debounce, makeSortable, refreshSortArrows } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let currentSort = 'created_at';
let currentOrder = 'DESC';

const STORAGE_KEY = 'erp_sales_hidden_columns';
const COLUMNS = [
  { key: 'sale_number', label: 'Sale #' },
  { key: 'client_name', label: 'Client' },
  { key: 'sale_date', label: 'Date' },
  { key: 'total', label: 'Total' },
  { key: 'payment_method', label: 'Payment' },
  { key: 'payment_status', label: 'Status' },
  { key: 'sold_by', label: 'Sold By' }
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

export async function renderSales() {
  const container = document.getElementById('content-area');
  const hiddenCols = getHiddenColumns();
  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="sale-search" placeholder="Search sales..." value="${currentSearch}"></div>
      <div class="column-toggle-wrap">
        <button class="column-toggle-btn" id="btn-columns"><i class="fas fa-columns"></i> Columns</button>
        <div class="column-dropdown" id="columns-dropdown">${COLUMNS.map(c => `<div class="column-dropdown-item"><input type="checkbox" id="col-${c.key}" data-col="${c.key}" ${!hiddenCols.includes(c.key) ? 'checked' : ''}><label for="col-${c.key}">${c.label}</label></div>`).join('')}</div>
      </div>
      <button class="btn btn-primary" id="btn-new-sale"><i class="fas fa-plus"></i> New Sale</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container"><table><thead><tr>${COLUMNS.map(c => `<th data-col="${c.key}" data-sort="${c.key}">${c.label}<span class="sort-arrow"></span></th>`).join('')}<th>Actions</th></tr></thead><tbody id="sales-tbody"></tbody></table></div><div id="sales-pagination"></div></div></div>`;

  document.getElementById('btn-new-sale').onclick = () => openSaleModal();
  document.getElementById('sale-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadSales(); });

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

  await loadSales();
  makeSortable(document.querySelector('#sales-tbody').closest('table').querySelector('thead'), () => currentSort, () => currentOrder, (col, order) => { currentSort = col; currentOrder = order; currentPage = 1; loadSales(); });
  applyColumnVisibility();
}

async function loadSales() {
  try {
    const result = await api.getSales({ search: currentSearch, page: currentPage, limit: 15, sort: currentSort, order: currentOrder });
    const tbody = document.getElementById('sales-tbody');
    if (!result.data.length) { tbody.innerHTML = `<tr><td colspan="${COLUMNS.length + 1}"><div class="empty-state"><i class="fas fa-dollar-sign"></i><p>No sales found</p></div></td></tr>`; document.getElementById('sales-pagination').innerHTML = ''; return; }

    tbody.innerHTML = result.data.map(s => `
      <tr>
        <td data-col="sale_number"><strong>${s.sale_number}</strong></td><td data-col="client_name">${s.client_name || '-'}</td><td data-col="sale_date">${formatDate(s.sale_date)}</td><td data-col="total">${formatCurrency(s.total)}</td>
        <td data-col="payment_method">${statusBadge(s.payment_method || 'cash')}</td><td data-col="payment_status">${statusBadge(s.payment_status)}</td><td data-col="sold_by">${s.sold_by || '-'}</td>
        <td><button class="btn-icon" onclick="window.appViewSale(${s.id})" title="View"><i class="fas fa-eye"></i></button></td>
      </tr>`).join('');

    document.getElementById('sales-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#sales-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadSales(); } };
    });
    refreshSortArrows(document.querySelector('#sales-tbody').closest('table').querySelector('thead'), currentSort, currentOrder);
    applyColumnVisibility();
  } catch (err) { showToast(err.message, 'error'); }
}

async function openSaleModal() {
  let clients = [];
  let products = [];
  try { 
    const cRes = await api.getClients({ limit: 100 }); clients = cRes.data;
    const pRes = await api.getProducts({ limit: 100, status: 'active' }); products = pRes.data;
  } catch(e) {}

  showModal('New Sale', `
    <form id="sale-form">
      <div class="form-row">
        <div class="form-group"><label>Client</label><select name="client_id"><option value="">Walk-in / No client</option>${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Payment Method</label><select name="payment_method"><option value="cash">Cash</option><option value="credit_card">Credit Card</option><option value="bank_transfer">Bank Transfer</option></select></div>
      </div>
      <h4 style="margin:16px 0 12px">Sale Items</h4>
      <div id="sale-items-container"></div>
      <button type="button" class="btn btn-sm btn-outline" id="add-sale-item" style="margin-top:8px"><i class="fas fa-plus"></i> Add Item</button>
      <div class="form-group" style="margin-top:12px"><label>Notes</label><input name="notes"></div>
      <div style="text-align:right;font-size:18px;font-weight:700;margin-top:12px">Total: <span id="sale-total-display">$0.00</span></div>
    </form>`,
    `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save">Complete Sale</button>`);

  let itemIndex = 0;

  function addSaleItem() {
    const container = document.getElementById('sale-items-container');
    const idx = itemIndex++;
    const div = document.createElement('div');
    div.className = 'form-row';
    div.style.marginBottom = '8px';
    div.style.alignItems = 'end';
    div.innerHTML = `
      <div class="form-group" style="flex:2"><label>Product</label><select class="sale-product" data-idx="${idx}" required><option value="">Select</option>${products.map(p => `<option value="${p.id}" data-price="${p.unit_price}" data-stock="${p.stock_quantity}">${p.name} (${p.sku}) - Stock: ${p.stock_quantity}</option>`).join('')}</select></div>
      <div class="form-group"><label>Qty</label><input type="number" class="sale-qty" data-idx="${idx}" value="1" min="1"></div>
      <div class="form-group"><label>Price</label><input type="number" step="0.01" class="sale-price" data-idx="${idx}"></div>
      <div class="form-group"><button type="button" class="btn btn-sm btn-danger remove-sale-item"><i class="fas fa-trash"></i></button></div>`;
    container.appendChild(div);

    div.querySelector('.sale-product').onchange = function() {
      const opt = this.options[this.selectedIndex];
      div.querySelector('.sale-price').value = opt.dataset.price || 0;
      updateSaleTotal();
    };
    div.querySelector('.sale-qty').oninput = updateSaleTotal;
    div.querySelector('.sale-price').oninput = updateSaleTotal;
    div.querySelector('.remove-sale-item').onclick = () => { div.remove(); updateSaleTotal(); };
  }

  function updateSaleTotal() {
    let total = 0;
    document.querySelectorAll('.sale-product').forEach(sel => {
      const row = sel.closest('.form-row');
      const qty = parseInt(row.querySelector('.sale-qty').value) || 0;
      const price = parseFloat(row.querySelector('.sale-price').value) || 0;
      total += qty * price;
    });
    document.getElementById('sale-total-display').textContent = formatCurrency(total);
  }

  addSaleItem();
  document.getElementById('add-sale-item').onclick = addSaleItem;
  document.getElementById('modal-cancel').onclick = hideModal;
  document.getElementById('modal-save').onclick = async () => {
    const fd = new FormData(document.getElementById('sale-form'));
    const items = [];
    document.querySelectorAll('.sale-product').forEach(sel => {
      const row = sel.closest('.form-row');
      const productId = parseInt(sel.value);
      const qty = parseInt(row.querySelector('.sale-qty').value) || 0;
      const price = parseFloat(row.querySelector('.sale-price').value) || 0;
      if (productId && qty > 0) items.push({ product_id: productId, quantity: qty, unit_price: price, total: qty * price });
    });
    if (!items.length) { showToast('Add at least one item', 'error'); return; }

    const total = items.reduce((s, i) => s + i.total, 0);
    try {
      await api.createSale({ client_id: fd.get('client_id') ? parseInt(fd.get('client_id')) : null, payment_method: fd.get('payment_method'), notes: fd.get('notes'), total, items });
      showToast('Sale completed!'); hideModal(); loadSales();
    } catch (err) { showToast(err.message, 'error'); }
  };
}

window.appViewSale = async (id) => {
  try {
    const s = await api.getSale(id);
    showModal(`Sale ${s.sale_number}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><strong>Client:</strong> ${s.client_name || 'Walk-in'}</div>
        <div><strong>Date:</strong> ${formatDate(s.sale_date)}</div>
        <div><strong>Payment:</strong> ${s.payment_method}</div>
        <div><strong>Sold By:</strong> ${s.sold_by || '-'}</div>
      </div>
      <table style="width:100%;margin-bottom:16px"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${(s.items || []).map(i => `<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>${formatCurrency(i.unit_price)}</td><td>${formatCurrency(i.total)}</td></tr>`).join('')}</tbody></table>
      <div style="text-align:right;font-size:18px;font-weight:700">Total: ${formatCurrency(s.total)}</div>`,
      `<button class="btn btn-secondary" id="modal-cancel">Close</button>`);
    document.getElementById('modal-cancel').onclick = hideModal;
  } catch (err) { showToast(err.message, 'error'); }
};
