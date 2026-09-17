const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('erp_token');
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('erp_token', token);
    else localStorage.removeItem('erp_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        this.setToken(null);
        localStorage.removeItem('erp_user');
        window.location.reload();
        throw new Error('Session expired');
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      if (err.message === 'Session expired') throw err;
      throw err;
    }
  }

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`${endpoint}${query ? '?' + query : ''}`);
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth
  login(username, password) { return this.post('/auth/login', { username, password }); }
  getMe() { return this.get('/auth/me'); }

  // Clients
  getClients(params) { return this.get('/clients', params); }
  getClient(id) { return this.get(`/clients/${id}`); }
  createClient(data) { return this.post('/clients', data); }
  updateClient(id, data) { return this.put(`/clients/${id}`, data); }
  deleteClient(id) { return this.delete(`/clients/${id}`); }

  // Products
  getProducts(params) { return this.get('/products', params); }
  getProduct(id) { return this.get(`/products/${id}`); }
  createProduct(data) { return this.post('/products', data); }
  updateProduct(id, data) { return this.put(`/products/${id}`, data); }
  deleteProduct(id) { return this.delete(`/products/${id}`); }
  getCategories() { return this.get('/products/categories'); }
  getLowStockProducts() { return this.get('/products/low-stock'); }

  // Orders
  getOrders(params) { return this.get('/orders', params); }
  getOrder(id) { return this.get(`/orders/${id}`); }
  createOrder(data) { return this.post('/orders', data); }
  updateOrder(id, data) { return this.put(`/orders/${id}`, data); }
  updateOrderStatus(id, status) { return this.patch(`/orders/${id}/status`, { status }); }
  deleteOrder(id) { return this.delete(`/orders/${id}`); }

  // Inventory
  getInventory(params) { return this.get('/inventory', params); }
  adjustInventory(data) { return this.put('/inventory/adjust', data); }
  updateInventoryQuantity(data) { return this.put('/inventory/update', data); }
  getLowStock() { return this.get('/inventory/low-stock'); }
  getInventoryStats() { return this.get('/inventory/stats'); }

  // Employees
  getEmployees(params) { return this.get('/employees', params); }
  getEmployee(id) { return this.get(`/employees/${id}`); }
  createEmployee(data) { return this.post('/employees', data); }
  updateEmployee(id, data) { return this.put(`/employees/${id}`, data); }
  deleteEmployee(id) { return this.delete(`/employees/${id}`); }
  getDepartments() { return this.get('/employees/departments'); }
  getEmployeeStats() { return this.get('/employees/stats'); }

  // Sales
  getSales(params) { return this.get('/sales', params); }
  getSale(id) { return this.get(`/sales/${id}`); }
  createSale(data) { return this.post('/sales', data); }
  getSalesStats(params) { return this.get('/sales/stats', params); }
  getMonthlyRevenue(year) { return this.get('/sales/monthly-revenue', { year }); }
  getTopProducts(limit) { return this.get('/sales/top-products', { limit }); }

  // Dashboard
  getDashboard() { return this.get('/dashboard'); }

  // Users
  getUsers(params) { return this.get('/users', params); }
  getUser(id) { return this.get(`/users/${id}`); }
  createUser(data) { return this.post('/users', data); }
  updateUser(id, data) { return this.put(`/users/${id}`, data); }
  deleteUser(id) { return this.delete(`/users/${id}`); }
  impersonateUser(userId) { return this.post(`/auth/impersonate/${userId}`); }
}

export const api = new ApiClient();
export default api;
