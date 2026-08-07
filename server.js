import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase, startAutoSave } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again later.'
});
app.use('/api/auth/login', authLimiter);

app.use(express.static(path.join(__dirname, 'public')));

async function startServer() {
  await initDatabase();
  startAutoSave();

  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: clientRoutes } = await import('./routes/clients.js');
  const { default: productRoutes } = await import('./routes/products.js');
  const { default: orderRoutes } = await import('./routes/orders.js');
  const { default: inventoryRoutes } = await import('./routes/inventory.js');
  const { default: employeeRoutes } = await import('./routes/employees.js');
  const { default: salesRoutes } = await import('./routes/sales.js');
  const { default: dashboardRoutes } = await import('./routes/dashboard.js');

  app.use('/api/auth', authRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`ERP Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
