import db from '../config/database.js';
import SalesModel from '../models/Sale.js';
import OrderModel from '../models/Order.js';
import ClientModel from '../models/Client.js';
import ProductModel from '../models/Product.js';
import EmployeeModel from '../models/Employee.js';
import InventoryModel from '../models/Inventory.js';

const DashboardController = {
  getStats(req, res) {
    try {
      const salesStats = SalesModel.getStats();
      const orderCount = OrderModel.count();
      const clientCount = ClientModel.count();
      const productCount = ProductModel.count();
      const empStats = EmployeeModel.getStats();
      const invStats = InventoryModel.getStats();
      const lowStockProducts = InventoryModel.getLowStock().slice(0, 5);
      const recentOrders = OrderModel.getRecent(5);

      const monthlyRevenue = SalesModel.getMonthlyRevenue();
      const topProducts = SalesModel.getTopProducts(5);

      const ordersByStatus = db.prepare(`SELECT status, COUNT(*) as count FROM orders GROUP BY status`).all();
      const salesByPayment = db.prepare(`SELECT payment_status, COUNT(*) as count FROM sales GROUP BY payment_status`).all();

      res.json({
        overview: {
          totalRevenue: salesStats.total.total,
          totalSales: salesStats.total.count,
          todayRevenue: salesStats.today.total,
          todaySales: salesStats.today.count,
          monthRevenue: salesStats.thisMonth.total,
          monthSales: salesStats.thisMonth.count,
          yearRevenue: salesStats.thisYear.total,
          yearSales: salesStats.thisYear.count,
          totalOrders: orderCount,
          totalClients: clientCount,
          totalProducts: productCount,
          totalEmployees: empStats.total,
          avgSalary: empStats.avgSalary,
          inventoryValue: invStats.totalValue,
          lowStockCount: invStats.lowStock,
          outOfStockCount: invStats.outOfStock,
          totalInventoryUnits: invStats.total
        },
        monthlyRevenue,
        topProducts,
        lowStockProducts,
        recentOrders,
        ordersByStatus,
        salesByPayment,
        employeesByDept: empStats.byDept
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
};

export default DashboardController;
