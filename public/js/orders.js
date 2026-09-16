import api from './api.js';
import { showToast, showModal, hideModal, formatCurrency, formatDate, statusBadge, buildPagination, debounce } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let currentStatus = '';

export async function renderOrders() {
  const container = document.getElementById('content-area');
  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="order-search" placeholder="Search orders..." value="${currentSearch}"></div>
      <select class="filter-select" id="order-status-filter"><option value="">All Status</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select>
      <button class="btn btn-primary" id="btn-add-order"><i class="fas fa-plus"></i> New Order</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container"><table><thead><tr><th>Order #</th><th>Client</th><th>Date</th><th>Total</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead><tbody id="orders-tbody"></tbody></table></div><div id="orders-pagination"></div></div></div>`;

  document.getElementById('btn-add-order').onclick = () => openOrderModal();
  document.getElementById('order-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadOrders(); });
  document.getElementById('order-status-filter').onchange = e => { currentStatus = e.target.value; currentPage = 1; loadOrders(); };

  await loadOrders();
}

async function loadOrders() {
  try {
    const result = await api.getOrders({ search: currentSearch, status: currentStatus, page: currentPage, limit: 15 });
    const tbody = document.getElementById('orders-tbody');
    if (!result.data.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-shopping-cart"></i><p>No orders found</p></div></td></tr>'; document.getElementById('orders-pagination').innerHTML = ''; return; }

    tbody.innerHTML = result.data.map(o => `
      <tr>
        <td><strong>${o.order_number}</strong></td><td>${o.client_name || '-'}</td><td>${formatDate(o.order_date)}</td><td>${formatCurrency(o.total)}</td>
        <td>${statusBadge(o.status)}</td><td>${statusBadge(o.payment_status)}</td>
        <td><button class="btn-icon" onclick="window.appViewOrder(${o.id})" title="View"><i class="fas fa-eye"></i></button><button class="btn-icon" onclick="window.appEditOrderStatus(${o.id},'${o.status}')" title="Update Status"><i class="fas fa-sync"></i></button><button class="btn-icon" onclick="window.appDeleteOrder(${o.id})" title="Delete" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td>
      </tr>`).join('');

    document.getElementById('orders-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#orders-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadOrders(); } };
    });
  } catch (err) { showToast(err.message, 'error'); }
}

async function openOrderModal() {
  let clients = [];
  let products = [];
  try { 
    const cRes = await api.getClients({ limit: 100 });
    clients = cRes.data;
    const pRes = await api.getProducts({ limit: 100, status: 'active' });
    products = pRes.data;
  } catch(e) {}

  showModal('New Order', `
    <form id="order-form">
      <div class="form-row">
        <div class="form-group"><label>Client *</label><select name="client_id" required><option value="">Select client</option>${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Due Date</label><input type="date" name="due_date"></div>
      </div>
      <div class="form-group"><label>Shipping Address</label><input name="shipping_address"></div>
      <h4 style="margin:16px 0 12px;color:var(--text)">Order Items</h4>
      <div id="order-items-container"></div>
      <button type="button" class="btn btn-sm btn-outline" id="add-order-item" style="margin-top:8px"><i class="fas fa-plus"></i> Add Item</button>
      <div class="form-row" style="margin-top:16px">
        <div class="form-group"><label>Discount</label><input type="number" step="0.01" name="discount" value="0"></div>
        <div class="form-group"><label>Notes</label><input name="notes"></div>
      </div>
      <div style="text-align:right;font-size:18px;font-weight:700;margin-top:12px">Total: <span id="order-total-display">$0.00</span></div>
    </form>`,
    `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save">Create Order</button>`);

  const productsJson = JSON.stringify(products);
  let itemIndex = 0;
  
  function addOrderItem() {
    const container = document.getElementById('order-items-container');
    const idx = itemIndex++;
    const div = document.createElement('div');
    div.className = 'form-row';
    div.style.marginBottom = '8px';
    div.style.alignItems = 'end';
    div.innerHTML = `
      <div class="form-group" style="flex:2"><label>Product</label><select class="order-product" data-idx="${idx}" required><option value="">Select</option>${products.map(p => `<option value="${p.id}" data-price="${p.unit_price}" data-tax="${p.tax_rate}">${p.name} (${p.sku}) - $${p.unit_price}</option>`).join('')}</select></div>
      <div class="form-group"><label>Qty</label><input type="number" class="order-qty" data-idx="${idx}" value="1" min="1"></div>
      <div class="form-group"><label>Price</label><input type="number" step="0.01" class="order-price" data-idx="${idx}"></div>
      <div class="form-group"><button type="button" class="btn btn-sm btn-danger remove-item"><i class="fas fa-trash"></i></button></div>`;
    container.appendChild(div);

    div.querySelector('.order-product').onchange = function() {
      const opt = this.options[this.selectedIndex];
      const price = opt.dataset.price || 0;
      div.querySelector('.order-price').value = price;
      updateOrderTotal();
    };
    div.querySelector('.order-qty').oninput = updateOrderTotal;
    div.querySelector('.order-price').oninput = updateOrderTotal;
    div.querySelector('.remove-item').onclick = () => { div.remove(); updateOrderTotal(); };
  }

  function updateOrderTotal() {
    let total = 0;
    document.querySelectorAll('.order-product').forEach(sel => {
      const row = sel.closest('.form-row');
      const qty = parseInt(row.querySelector('.order-qty').value) || 0;
      const price = parseFloat(row.querySelector('.order-price').value) || 0;
      total += qty * price;
    });
    const discount = parseFloat(document.querySelector('#order-form [name="discount"]').value) || 0;
    document.getElementById('order-total-display').textContent = formatCurrency(total - discount);
  }

  addOrderItem();
  document.getElementById('add-order-item').onclick = addOrderItem;
  document.getElementById('modal-cancel').onclick = hideModal;
  document.getElementById('modal-save').onclick = async () => {
    const form = document.getElementById('order-form');
    const fd = new FormData(form);
    const items = [];
    document.querySelectorAll('.order-product').forEach(sel => {
      const row = sel.closest('.form-row');
      const productId = parseInt(sel.value);
      const qty = parseInt(row.querySelector('.order-qty').value) || 0;
      const price = parseFloat(row.querySelector('.order-price').value) || 0;
      if (productId && qty > 0) items.push({ product_id: productId, quantity: qty, unit_price: price, total: qty * price });
    });
    if (!fd.get('client_id')) { showToast('Please select a client', 'error'); return; }
    if (!items.length) { showToast('Please add at least one item', 'error'); return; }

    let total = items.reduce((s, i) => s + i.total, 0);
    const discount = parseFloat(fd.get('discount')) || 0;
    total -= discount;

    try {
      await api.createOrder({ client_id: parseInt(fd.get('client_id')), due_date: fd.get('due_date'), shipping_address: fd.get('shipping_address'), notes: fd.get('notes'), discount, total, items });
      showToast('Order created'); hideModal(); loadOrders();
    } catch (err) { showToast(err.message, 'error'); }
  };
}

window.appViewOrder = async (id) => {
  try {
    const o = await api.getOrder(id);
    showModal(`Order ${o.order_number}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><strong>Client:</strong> ${o.client_name || '-'}</div>
        <div><strong>Date:</strong> ${formatDate(o.order_date)}</div>
        <div><strong>Status:</strong> ${statusBadge(o.status)}</div>
        <div><strong>Payment:</strong> ${statusBadge(o.payment_status)}</div>
      </div>
      <table style="width:100%;margin-bottom:16px"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${(o.items || []).map(i => `<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>${formatCurrency(i.unit_price)}</td><td>${formatCurrency(i.total)}</td></tr>`).join('')}</tbody></table>
      <div style="text-align:right;font-size:18px;font-weight:700">Total: ${formatCurrency(o.total)}</div>`,
      `<button class="btn btn-secondary" id="modal-cancel">Close</button>`);
    document.getElementById('modal-cancel').onclick = hideModal;
  } catch (err) { showToast(err.message, 'error'); }
};

window.appEditOrderStatus = async (id, currentStatus) => {
  const statuses = ['pending','confirmed','processing','shipped','delivered','cancelled'];
  showModal('Update Status', `
    <form id="status-form"><div class="form-group"><label>Status</label><select name="status">${statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`).join('')}</select></div></form>`,
    `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save">Update</button>`);
  document.getElementById('modal-cancel').onclick = hideModal;
  document.getElementById('modal-save').onclick = async () => {
    try { await api.updateOrderStatus(id, document.querySelector('#status-form select').value); showToast('Status updated'); hideModal(); loadOrders(); } catch (err) { showToast(err.message, 'error'); }
  };
};

window.appDeleteOrder = async (id) => {
  if (!confirm('Delete this order?')) return;
  try { await api.deleteOrder(id); showToast('Order deleted'); loadOrders(); } catch (err) { showToast(err.message, 'error'); }
};
