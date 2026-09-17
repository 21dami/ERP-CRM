import api from './api.js';
import { formatCurrency, formatDate, formatDateTime, statusBadge } from './utils.js';

export async function renderDashboard() {
  const container = document.getElementById('content-area');
  container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Loading dashboard...</div>';

  try {
    const data = await api.getDashboard();
    const o = data.overview;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fas fa-dollar-sign"></i></div>
          <div class="stat-info">
            <h4>Revenue (This Month)</h4>
            <div class="stat-value">${formatCurrency(o.monthRevenue)}</div>
            <div class="stat-change">${o.monthSales} sales this month</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-shopping-cart"></i></div>
          <div class="stat-info">
            <h4>Total Orders</h4>
            <div class="stat-value">${o.totalOrders}</div>
            <div class="stat-change">${formatCurrency(o.yearRevenue)} this year</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-users"></i></div>
          <div class="stat-info">
            <h4>Active Clients</h4>
            <div class="stat-value">${o.totalClients}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="stat-info">
            <h4>Low Stock Items</h4>
            <div class="stat-value">${o.lowStockCount}</div>
            <div class="stat-change" style="color:var(--danger)">${o.outOfStockCount} out of stock</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal"><i class="fas fa-box"></i></div>
          <div class="stat-info">
            <h4>Inventory Value</h4>
            <div class="stat-value">${formatCurrency(o.inventoryValue)}</div>
            <div class="stat-change">${o.totalInventoryUnits} total units</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card dashboard-grid-full">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px">
            <h3 style="font-size:17px;font-weight:600;letter-spacing:-0.2px">Monthly Revenue</h3>
            <select id="revenue-year-select" style="padding:7px 32px 7px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-weight:500;color:var(--text);background:var(--surface-alt);cursor:pointer;appearance:none;background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2371717a' d='M5 7L1 3h8z'/%3E%3C/svg%3E&quot;);background-repeat:no-repeat;background-position:right 10px center;transition:all 0.2s ease" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'"></select>
          </div>
          <div class="card-body revenue-chart" id="revenue-chart" style="padding:24px">
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Recent Orders</h3></div>
          <div class="card-body" id="recent-orders-list"></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Low Stock Alert</h3></div>
          <div class="card-body" id="low-stock-list"></div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Top Products</h3></div>
          <div class="card-body" id="top-products-list"></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Orders by Status</h3></div>
          <div class="card-body" id="orders-status-list"></div>
        </div>
      </div>
    `;

    renderRecentOrders(data.recentOrders);
    renderLowStock(data.lowStockProducts);
    renderTopProducts(data.topProducts);
    renderOrdersByStatus(data.ordersByStatus);

    const yearSelect = document.getElementById('revenue-year-select');
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 9; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
    yearSelect.value = currentYear;
    loadRevenueChart(currentYear);
    yearSelect.addEventListener('change', () => loadRevenueChart(parseInt(yearSelect.value)));
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load dashboard: ${err.message}</p></div>`;
  }
}

async function loadRevenueChart(year) {
  const chart = document.getElementById('revenue-chart');
  chart.innerHTML = '<div class="revenue-loading"><i class="fas fa-spinner" style="animation:spin 1s linear infinite"></i> Loading revenue data...</div>';
  try {
    const monthlyData = await api.getMonthlyRevenue(year);
    renderRevenueChart(monthlyData, year);
  } catch (err) {
    chart.innerHTML = '<div class="revenue-empty"><i class="fas fa-chart-bar"></i><span>Failed to load revenue data</span></div>';
  }
}

function renderRevenueChart(monthlyData, year) {
  const chart = document.getElementById('revenue-chart');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dataMap = {};
  monthlyData.forEach(m => { dataMap[parseInt(m.month)] = m.revenue; });

  const hasData = monthlyData.some(m => m.revenue > 0);
  if (!hasData) {
    chart.innerHTML = '<div class="revenue-empty"><i class="fas fa-chart-bar"></i><span>No revenue data for ' + year + '</span></div>';
    return;
  }

  const maxVal = Math.max(...monthlyData.map(m => m.revenue), 1);
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);

  const barsHtml = months.map((label, i) => {
    const revenue = dataMap[i + 1] || 0;
    const height = maxVal > 0 ? (revenue / maxVal) * 180 : 0;
    return `
      <div class="revenue-bar-col">
        <div class="revenue-bar-value">${formatCurrency(revenue)}</div>
        <div class="revenue-bar" style="height:${Math.max(height, 4)}px" title="${formatCurrency(revenue)}">
          <div class="revenue-bar-inner"></div>
        </div>
        <div class="revenue-bar-month">${label}</div>
      </div>`;
  }).join('');

  const summaryHtml = `
    <div class="revenue-summary">
      <span class="revenue-summary-label">Total ${year}</span>
      <span class="revenue-summary-value">${formatCurrency(totalRevenue)}</span>
    </div>`;

  chart.innerHTML = `<div class="revenue-bars">${barsHtml}</div>${summaryHtml}`;
}

function renderRecentOrders(orders) {
  const el = document.getElementById('recent-orders-list');
  if (!orders.length) { el.innerHTML = '<div class="empty-state"><p>No recent orders</p></div>'; return; }
  el.innerHTML = orders.map(o => `
    <div class="list-item">
      <div class="list-item-icon" style="background:var(--primary-bg);color:var(--primary)"><i class="fas fa-file-invoice"></i></div>
      <div class="list-item-content">
        <div class="list-item-title">${o.order_number}</div>
        <div class="list-item-sub">${o.client_name || 'Unknown'} &middot; ${formatDate(o.order_date)}</div>
      </div>
      <div>
        ${statusBadge(o.status)}
        <div class="list-item-amount" style="text-align:right;margin-top:4px">${formatCurrency(o.total)}</div>
      </div>
    </div>`).join('');
}

function renderLowStock(products) {
  const el = document.getElementById('low-stock-list');
  if (!products.length) { el.innerHTML = '<div class="empty-state"><p>All stock levels OK</p></div>'; return; }
  el.innerHTML = products.map(p => `
    <div class="list-item">
      <div class="list-item-icon" style="background:var(--danger-light);color:var(--danger)"><i class="fas fa-exclamation"></i></div>
      <div class="list-item-content">
        <div class="list-item-title">${p.product_name || p.name}</div>
        <div class="list-item-sub">${p.sku} &middot; Min: ${p.min_stock}</div>
      </div>
      <div class="list-item-amount" style="color:var(--danger)">${p.quantity ?? p.stock_quantity ?? 0} left</div>
    </div>`).join('');
}

function renderTopProducts(products) {
  const el = document.getElementById('top-products-list');
  if (!products.length) { el.innerHTML = '<div class="empty-state"><p>No sales data yet</p></div>'; return; }
  el.innerHTML = products.map((p, i) => `
    <div class="list-item">
      <div class="list-item-icon" style="background:var(--warning-light);color:var(--warning)"><i class="fas fa-trophy"></i></div>
      <div class="list-item-content">
        <div class="list-item-title">#${i + 1} ${p.name}</div>
        <div class="list-item-sub">${p.total_sold} units sold</div>
      </div>
      <div class="list-item-amount">${formatCurrency(p.total_revenue)}</div>
    </div>`).join('');
}

function renderOrdersByStatus(statuses) {
  const el = document.getElementById('orders-status-list');
  if (!statuses.length) { el.innerHTML = '<div class="empty-state"><p>No order data</p></div>'; return; }
  const total = statuses.reduce((s, r) => s + r.count, 0);
  el.innerHTML = statuses.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light)">
      <div>${statusBadge(s.status)}<span style="margin-left:8px;color:var(--text-secondary);font-size:14px">${s.count} orders</span></div>
      <div style="font-weight:600;color:var(--text)">${total ? Math.round(s.count / total * 100) : 0}%</div>
    </div>`).join('');
}
