import express from 'express';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import errorHandler from './middleware/errorHandler.js';
import menuRouter from './routes/menu.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import waiterRouter from './routes/waiter.js';
import tableRouter from './routes/table.js';

const __dir = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.json());

// Serve frontend static files
app.use('/js', express.static(join(__dir, '../../frontend/js')));
app.use('/css', express.static(join(__dir, '../../frontend/css')));
app.use(express.static(join(__dir, '../../frontend/public')));

// Routes
app.use(tableRouter);
app.use(menuRouter);
app.use(cartRouter);
app.use(ordersRouter);
app.use(paymentsRouter);
app.use(waiterRouter);


app.use(errorHandler);

export default app;
