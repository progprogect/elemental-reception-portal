import { Server } from 'socket.io';
import { createAmiClient } from './client.js';
import type { CallInfo, CallHistoryItem, PendingCall } from './types.js';

const MAX_HISTORY = 50;

export function createAmiListener(
  config: { host: string; port: number; username: string; password: string },
  io: Server
) {
  const pendingCalls = new Map<string, PendingCall>();
  let currentCall: CallInfo | null = null;
  const callHistory: CallHistoryItem[] = [];

  function emitToAll(event: string, payload: unknown) {
    io.emit(event, payload);
  }

  function addToHistory(item: CallHistoryItem) {
    callHistory.unshift(item);
    if (callHistory.length > MAX_HISTORY) {
      callHistory.pop();
    }
  }

  const client = createAmiClient(
    config,
    (event: Record<string, string>) => {
      const eventType = event.Event ?? event.event;

      if (eventType === 'Newchannel') {
        const callerId = event.CallerIDNum ?? event.CallerIDnum ?? '';
        const uniqueId = event.Uniqueid ?? event.UniqueID ?? '';
        const channel = event.Channel ?? '';

        if (callerId && uniqueId) {
          pendingCalls.set(uniqueId, {
            callerId,
            channelId: channel,
            uniqueId,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (eventType === 'AgentConnect') {
        const uniqueId = event.Uniqueid ?? event.UniqueID ?? '';
        const destUniqueId = event.DestUniqueid ?? event.DestUniqueID ?? '';
        const interfaceStr = event.Interface ?? '';
        const memberName = event.MemberName ?? '';

        const extension = interfaceStr ? interfaceStr.replace(/^SIP\//, '').split('-')[0] : memberName;
        const pending = pendingCalls.get(uniqueId) ?? pendingCalls.get(destUniqueId);

        if (pending && extension) {
          currentCall = {
            callerId: pending.callerId,
            extension,
            channelId: pending.channelId,
            uniqueId: pending.uniqueId,
            timestamp: new Date().toISOString(),
          };
          pendingCalls.delete(uniqueId);
          pendingCalls.delete(destUniqueId);

          emitToAll('call_incoming', {
            callerId: currentCall.callerId,
            extension: currentCall.extension,
            channelId: currentCall.channelId,
            timestamp: currentCall.timestamp,
          });
        }
      } else if (eventType === 'Hangup') {
        const uniqueId = event.Uniqueid ?? event.UniqueID ?? '';
        const linkedId = event.Linkedid ?? event.LinkedID ?? '';
        const duration = parseInt(event.Duration ?? '0', 10) || 0;

        const isOurChannel =
          uniqueId === currentCall?.uniqueId ||
          linkedId === currentCall?.uniqueId ||
          pendingCalls.has(uniqueId);

        if (currentCall && (isOurChannel || (duration > 0 && linkedId))) {
          const endedCall: CallHistoryItem = {
            callerId: currentCall.callerId,
            extension: currentCall.extension,
            duration,
            timestamp: new Date().toISOString(),
          };
          addToHistory(endedCall);

          emitToAll('call_ended', {
            callerId: endedCall.callerId,
            extension: endedCall.extension,
            duration: endedCall.duration,
            timestamp: endedCall.timestamp,
          });

          currentCall = null;
        }
        pendingCalls.delete(uniqueId);
      }
    }
  );

  io.on('connection', (socket) => {
    socket.emit('call_history', callHistory);
    if (currentCall) {
      socket.emit('call_incoming', {
        callerId: currentCall.callerId,
        extension: currentCall.extension,
        channelId: currentCall.channelId,
        timestamp: currentCall.timestamp,
      });
    }
  });

  return {
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
  };
}
