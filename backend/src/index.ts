import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import healthRouter from './routes/health.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());
app.use('/health', healthRouter);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
