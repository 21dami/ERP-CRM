import api from './api.js';
import { showToast, showModal, hideModal, formatCurrency, statusBadge, buildPagination, debounce } from './utils.js';

let currentPage = 1;
let currentSearch = '';
let currentCategory = '';

export async function renderProducts() {
  const container = document.getElementById('content-area');
  let categories = [];
  try { categories = await api.getCategories(); } catch(e) {}

  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input type="text" id="product-search" placeholder="Search products..." value="${currentSearch}"></div>
      <select class="filter-select" id="product-category-filter"><option value="">All Categories</option>${categories.map(c => `<option value="${c}" ${currentCategory === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <button class="btn btn-primary" id="btn-add-product"><i class="fas fa-plus"></i> Add Product</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-container"><table><thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Cost</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody id="products-tbody"></tbody></table></div><div id="products-pagination"></div></div></div>`;

  document.getElementById('btn-add-product').onclick = () => openProductModal();
  document.getElementById('product-search').oninput = debounce(e => { currentSearch = e.target.value; currentPage = 1; loadProducts(); });
  document.getElementById('product-category-filter').onchange = e => { currentCategory = e.target.value; currentPage = 1; loadProducts(); };

  await loadProducts();
}

async function loadProducts() {
  try {
    const result = await api.getProducts({ search: currentSearch, category: currentCategory, page: currentPage, limit: 15 });
    const tbody = document.getElementById('products-tbody');
    if (!result.data.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-box"></i><p>No products found</p></div></td></tr>'; document.getElementById('products-pagination').innerHTML = ''; return; }

    tbody.innerHTML = result.data.map(p => `
      <tr>
        <td><code>${p.sku}</code></td><td><strong>${p.name}</strong></td><td>${p.category || '-'}</td><td>${formatCurrency(p.unit_price)}</td><td>${formatCurrency(p.cost_price)}</td>
        <td><span style="color:${p.stock_quantity <= p.min_stock ? 'var(--danger)' : 'var(--gray-800)'};font-weight:600">${p.stock_quantity}</span></td><td>${statusBadge(p.status)}</td>
        <td><button class="btn-icon" onclick="window.appEditProduct(${p.id})" title="Edit"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="window.appDeleteProduct(${p.id})" title="Delete" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td>
      </tr>`).join('');

    document.getElementById('products-pagination').innerHTML = buildPagination(result.page, result.pages);
    document.querySelectorAll('#products-pagination .page-btn').forEach(btn => {
      btn.onclick = () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= result.pages) { currentPage = p; loadProducts(); } };
    });
  } catch (err) { showToast(err.message, 'error'); }
}

function openProductModal(product = null) {
  const isEdit = !!product;
  showModal(isEdit ? 'Edit Product' : 'New Product', `
    <form id="product-form">
      <div class="form-row">
        <div class="form-group"><label>SKU *</label><input name="sku" value="${product?.sku || ''}" required ${isEdit ? 'readonly' : ''}></div>
        <div class="form-group"><label>Name *</label><input name="name" value="${product?.name || ''}" required></div>
      </div>
      <div class="form-group"><label>Description</label><textarea name="description">${product?.description || ''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Category</label><input name="category" value="${product?.category || ''}"></div>
        <div class="form-group"><label>Unit</label><input name="unit" value="${product?.unit || 'pcs'}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Unit Price *</label><input type="number" step="0.01" name="unit_price" value="${product?.unit_price || ''}" required></div>
        <div class="form-group"><label>Cost Price</label><input type="number" step="0.01" name="cost_price" value="${product?.cost_price || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tax Rate (%)</label><input type="number" step="0.01" name="tax_rate" value="${product?.tax_rate || 0}"></div>
        <div class="form-group"><label>Min Stock</label><input type="number" name="min_stock" value="${product?.min_stock || 0}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Stock Quantity</label><input type="number" name="stock_quantity" value="${product?.stock_quantity || 0}"></div>
        <div class="form-group"><label>Warehouse Location</label><input name="warehouse_location" value="${product?.warehouse_location || ''}"></div>
      </div>
      <div class="form-group"><label>Status</label><select name="status"><option value="active" ${product?.status !== 'inactive' ? 'selected' : ''}>Active</option><option value="inactive" ${product?.status === 'inactive' ? 'selected' : ''}>Inactive</option></select></div>
    </form>`,
    `<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-save">${isEdit ? 'Update' : 'Create'}</button>`);

  document.getElementById('modal-cancel').onclick = hideModal;
  document.getElementById('modal-save').onclick = async () => {
    const form = document.getElementById('product-form');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);
    data.unit_price = parseFloat(data.unit_price) || 0;
    data.cost_price = parseFloat(data.cost_price) || 0;
    data.tax_rate = parseFloat(data.tax_rate) || 0;
    data.min_stock = parseInt(data.min_stock) || 0;
    data.stock_quantity = parseInt(data.stock_quantity) || 0;
    try {
      if (isEdit) { await api.updateProduct(product.id, data); showToast('Product updated'); }
      else { await api.createProduct(data); showToast('Product created'); }
      hideModal(); loadProducts();
    } catch (err) { showToast(err.message, 'error'); }
  };
}

window.appEditProduct = async (id) => {
  try { const p = await api.getProduct(id); openProductModal(p); } catch (err) { showToast(err.message, 'error'); }
};

window.appDeleteProduct = async (id) => {
  if (!confirm('Delete this product?')) return;
  try { await api.deleteProduct(id); showToast('Product deleted'); loadProducts(); } catch (err) { showToast(err.message, 'error'); }
};
