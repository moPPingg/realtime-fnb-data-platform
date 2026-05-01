import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import rolesRouter from './routes/roles.js';
import permissionsRouter from './routes/permissions.js';
import storesRouter from './routes/stores.js';
import productsRouter from './routes/products.js';
import { createInventoryRouter } from './routes/inventory.js';
import { createTransactionRouter } from './routes/transactions.js';
import analyticsRouter from './routes/analytics.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

const io = new SocketIO(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id} (user: ${socket.user.email})`);
  socket.join(`store:${socket.user.storeId}`);
  socket.on('disconnect', () =>
    console.log(`[WS] Client disconnected: ${socket.id}`)
  );
});

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

app.use('/auth', authLimiter, authRouter);
app.use('/users', usersRouter);
app.use('/roles', rolesRouter);
app.use('/permissions', permissionsRouter);
app.use('/stores', storesRouter);
app.use('/products', productsRouter);
app.use('/inventory', createInventoryRouter(io));
app.use('/inventory/transactions', createTransactionRouter(io));
app.use('/analytics', analyticsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';
  if (status === 500) console.error('[ERR]', err);
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () =>
  console.log(`🚀  Mopping's Cafe server running on http://localhost:${PORT}`)
);
