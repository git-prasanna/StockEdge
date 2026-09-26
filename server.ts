import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { initializeDatabase } from './server/db.ts';
import { authRouter } from './server/routes/auth.ts';
import { warehouseRouter } from './server/routes/warehouses.ts';
import { productRouter } from './server/routes/products.ts';
import { operationRouter } from './server/routes/operations.ts';
import { ledgerRouter } from './server/routes/ledger.ts';

async function startServer() {
  // Initialize SQLite database schema and baseline records
  await initializeDatabase();
  console.log('[StockSense] Local SQLite database successfully initialized & verified.');

  const app = express();
  app.use(express.json());

  // Mount API Endpoints
  app.use('/api/auth', authRouter);
  app.use('/api/warehouses', warehouseRouter);
  app.use('/api/products', productRouter);
  app.use('/api/operations', operationRouter);
  app.use('/api/ledger', ledgerRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', system: 'StockSense Modular IMS', time: new Date().toISOString() });
  });

  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[StockSense] Server is running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[StockSense] Critical startup error:', err);
  process.exit(1);
});
