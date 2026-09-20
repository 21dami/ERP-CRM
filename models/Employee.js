import db from '../config/database.js';

const EmployeeModel = {
  findAll({ search, department, status, page = 1, limit = 20, sort, order } = {}) {
    let query = 'SELECT * FROM employees WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM employees WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const s = `%${search}%`;
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR employee_id LIKE ?)';
      countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR employee_id LIKE ?)';
      params.push(s, s, s, s);
      countParams.push(s, s, s, s);
    }
    if (department) {
      query += ' AND department = ?';
      countQuery += ' AND department = ?';
      params.push(department);
      countParams.push(department);
    }
    if (status) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    const total = db.prepare(countQuery).get(...countParams).total;
    const offset = (page - 1) * limit;

    const sortCols = { employee_id: 'employee_id', first_name: 'first_name', last_name: 'last_name', email: 'email', department: 'department', position: 'position', hire_date: 'hire_date', salary: 'salary', status: 'status', created_at: 'created_at' };
    const sortCol = sortCols[sort] || 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    return db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  },

  generateEmployeeId() {
    const count = db.prepare("SELECT COUNT(*) as c FROM employees WHERE employee_id LIKE 'EMP-%'").get().c;
    return `EMP-${String(count + 1).padStart(3, '0')}`;
  },

  create(data) {
    const empId = data.employee_id || this.generateEmployeeId();
    const stmt = db.prepare(`
      INSERT INTO employees (employee_id, first_name, last_name, email, phone, department, position, hire_date, salary, status, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      empId, data.first_name, data.last_name, data.email || null,
      data.phone || null, data.department || null, data.position || null,
      data.hire_date || null, data.salary || 0, data.status || 'active', data.address || null
    );
    return this.findById(result.lastInsertRowid);
  },

  update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['employee_id','first_name','last_name','email','phone','department','position','hire_date','salary','status','address'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  },

  getDepartments() {
    return db.prepare('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department').all().map(r => r.department);
  },

  count() {
    return db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  },

  getStats() {
    const total = db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'active'").get().count;
    const avgSalary = db.prepare("SELECT AVG(salary) as avg FROM employees WHERE status = 'active'").get().avg || 0;
    const byDept = db.prepare("SELECT department, COUNT(*) as count FROM employees WHERE status = 'active' GROUP BY department ORDER BY count DESC").all();
    return { total, avgSalary, byDept };
  }
};

export default EmployeeModel;
