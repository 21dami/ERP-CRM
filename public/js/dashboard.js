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
          <div class="card-header"><h3>Monthly Revenue (${new Date().getFullYear()})</h3></div>
          <div class="card-body">
            <div class="chart-bar-group" id="revenue-chart"></div>
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

    renderRevenueChart(data.monthlyRevenue);
    renderRecentOrders(data.recentOrders);
    renderLowStock(data.lowStockProducts);
    renderTopProducts(data.topProducts);
    renderOrdersByStatus(data.ordersByStatus);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load dashboard: ${err.message}</p></div>`;
  }
}

function renderRevenueChart(monthlyData) {
  const chart = document.getElementById('revenue-chart');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const maxVal = Math.max(...monthlyData.map(m => m.revenue), 1);

  chart.innerHTML = monthlyData.map(m => {
    const height = (m.revenue / maxVal) * 180;
    return `
      <div class="chart-bar-wrapper">
        <div class="chart-bar-value">${m.revenue > 0 ? formatCurrency(m.revenue) : ''}</div>
        <div class="chart-bar" style="height:${Math.max(height, 4)}px" title="${formatCurrency(m.revenue)}"></div>
        <div class="chart-bar-label">${months[parseInt(m.month) - 1]}</div>
      </div>`;
  }).join('');
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
        <div class="list-item-title">${p.name}</div>
        <div class="list-item-sub">${p.sku} &middot; Min: ${p.min_stock}</div>
      </div>
      <div class="list-item-amount" style="color:var(--danger)">${p.stock_quantity} left</div>
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
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-100)">
      <div>${statusBadge(s.status)}<span style="margin-left:8px;color:var(--gray-600);font-size:14px">${s.count} orders</span></div>
      <div style="font-weight:600;color:var(--gray-700)">${total ? Math.round(s.count / total * 100) : 0}%</div>
    </div>`).join('');
}
