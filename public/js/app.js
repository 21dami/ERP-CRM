import api from './api.js';
import { showToast, getRolePermissions, canAccess } from './utils.js';
import { renderDashboard } from './dashboard.js';
import { renderClients } from './clients.js';
import { renderProducts } from './products.js';
import { renderOrders } from './orders.js';
import { renderInventory } from './inventory.js';
import { renderSales } from './sales.js';
import { renderEmployees } from './employees.js';

const pageRenderers = {
  dashboard: renderDashboard,
  clients: renderClients,
  products: renderProducts,
  orders: renderOrders,
  inventory: renderInventory,
  sales: renderSales,
  employees: renderEmployees,
};

const pageTitles = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  products: 'Products',
  orders: 'Orders',
  inventory: 'Inventory',
  sales: 'Sales',
  employees: 'Employees',
};

let currentUser = null;
let currentPage = 'dashboard';

class App {
  constructor() {
    this.init();
  }

  async init() {
    this.bindEvents();
    const token = localStorage.getItem('erp_token');
    const userData = localStorage.getItem('erp_user');
    if (token && userData) {
      api.setToken(token);
      currentUser = JSON.parse(userData);
      try {
        const res = await api.getMe();
        currentUser = res.user;
        localStorage.setItem('erp_user', JSON.stringify(currentUser));
        this.showApp();
      } catch {
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
  }

  bindEvents() {
    document.getElementById('login-form').onsubmit = (e) => this.handleLogin(e);
    document.getElementById('btn-logout').onclick = () => this.handleLogout();
    document.getElementById('modal-close').onclick = () => document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('modal-overlay').onclick = (e) => { if (e.target === e.currentTarget) e.currentTarget.style.display = 'none'; };

    document.querySelectorAll('.nav-item').forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page && canAccess(page, currentUser?.role)) {
          this.navigateTo(page);
        } else {
          showToast('You do not have access to this section', 'error');
        }
      };
    });

    document.getElementById('sidebar-toggle').onclick = () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    };

    document.getElementById('mobile-menu-btn').onclick = () => {
      document.getElementById('sidebar').classList.toggle('open');
    };

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && !e.target.closest('.sidebar') && !e.target.closest('#mobile-menu-btn')) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'none';

    try {
      const result = await api.login(username, password);
      api.setToken(result.token);
      currentUser = result.user;
      localStorage.setItem('erp_user', JSON.stringify(currentUser));
      this.showApp();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  }

  handleLogout() {
    api.setToken(null);
    currentUser = null;
    localStorage.removeItem('erp_user');
    this.showLogin();
  }

  showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
  }

  showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('user-name').textContent = currentUser.full_name;
    document.getElementById('user-role').textContent = currentUser.role;
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const perms = getRolePermissions(currentUser.role);
    document.querySelectorAll('.nav-item').forEach(item => {
      const page = item.dataset.page;
      item.style.display = perms.includes(page) ? 'flex' : 'none';
    });

    const defaultPage = perms[0] || 'dashboard';
    this.navigateTo(defaultPage);
  }

  navigateTo(page) {
    currentPage = page;
    document.getElementById('page-title').textContent = pageTitles[page] || page;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    const renderer = pageRenderers[page];
    if (renderer) renderer();
  }
}

new App();
