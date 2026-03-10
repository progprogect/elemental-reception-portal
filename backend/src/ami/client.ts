import * as net from 'net';
import { parseAmiMessage } from './parser.js';

const BLOCK_END = '\r\n\r\n';

export interface AmiClientConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export type AmiMessageHandler = (event: Record<string, string>) => void;

export function createAmiClient(config: AmiClientConfig, onMessage: AmiMessageHandler) {
  let socket: net.Socket | null = null;
  let buffer = '';
  let reconnectAttempt = 0;
  const maxReconnectDelay = 60000;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let isDisconnected = false;

  function getReconnectDelay(): number {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), maxReconnectDelay);
    reconnectAttempt++;
    return delay;
  }

  function sendAction(action: Record<string, string>): void {
    if (!socket?.writable) return;

    const lines = Object.entries(action).map(([k, v]) => `${k}: ${v}`);
    const message = lines.join('\r\n') + BLOCK_END;
    socket.write(message);
  }

  function doConnect() {
    if (isDisconnected) return;

    socket = new net.Socket();
    buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();
      const { events, remainder } = parseAmiMessage(buffer);
      buffer = remainder;

      for (const event of events) {
        if (event.Response !== undefined && event.Action === 'Login') {
          if (event.Response === 'Success') {
            console.log('[AMI] Login successful');
            sendAction({ Action: 'Events', EventMask: 'call,system' });
          } else {
            console.error('[AMI] Login failed:', event.Message);
          }
        }
        onMessage(event);
      }
    });

    socket.on('close', () => {
      socket = null;
      if (!isDisconnected) {
        const delay = getReconnectDelay();
        console.log(`[AMI] Connection closed. Reconnecting in ${delay}ms...`);
        reconnectTimeout = setTimeout(doConnect, delay);
      }
    });

    socket.on('error', (err) => {
      console.error('[AMI] Error:', err.message);
    });

    socket.connect(config.port, config.host, () => {
      reconnectAttempt = 0;
      console.log('[AMI] Connected to', config.host, config.port);
      sendAction({
        Action: 'Login',
        Username: config.username,
        Secret: config.password,
      });
    });
  }

  return {
    connect: () => {
      isDisconnected = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      reconnectAttempt = 0;
      doConnect();
    },
    disconnect: () => {
      isDisconnected = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      socket?.destroy();
      socket = null;
    },
    sendAction,
  };
}
