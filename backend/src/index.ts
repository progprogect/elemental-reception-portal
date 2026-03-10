import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import healthRouter from './routes/health.js';
import { createAmiListener } from './ami/listener.js';

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

if (config.ami.host && config.ami.username && config.ami.password) {
  const amiListener = createAmiListener(
    {
      host: config.ami.host,
      port: config.ami.port,
      username: config.ami.username,
      password: config.ami.password,
    },
    io
  );
  amiListener.connect();
  console.log('[AMI] Listener initialized, connecting to', config.ami.host);
} else {
  console.log('[AMI] Skipped (AMI_HOST, AMI_USERNAME, AMI_PASSWORD not set)');
}

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
