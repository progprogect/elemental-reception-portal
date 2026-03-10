import { useEffect, useState } from 'react';
import { createSocket } from '../lib/socket';

interface CallIncoming {
  callerId: string;
  extension: string;
  channelId: string;
  timestamp: string;
}

interface CallEnded {
  callerId: string;
  extension: string;
  duration: number;
  timestamp: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTimestamp(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString();
}

export function CallsTest() {
  const [currentCall, setCurrentCall] = useState<CallIncoming | null>(null);
  const [callHistory, setCallHistory] = useState<CallEnded[]>([]);
  const [duration, setDuration] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = createSocket();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('call_history', (history: CallEnded[]) => {
      setCallHistory(Array.isArray(history) ? history : []);
    });

    socket.on('call_incoming', (data: CallIncoming) => {
      setCurrentCall(data);
      setDuration(0);
    });

    socket.on('call_ended', (data: CallEnded) => {
      setCallHistory((prev) => [data, ...prev]);
      setCurrentCall(null);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!currentCall) return;

    const start = Date.now();
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentCall]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          AMI Calls Test
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {connected ? (
            <span className="text-green-600">Connected to backend</span>
          ) : (
            <span className="text-amber-600">Disconnected</span>
          )}
          {' · '}
          <a href="/" className="text-blue-600 hover:underline">
            Back to app
          </a>
        </p>

        {currentCall && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-lg font-medium text-green-800 mb-2">
              Current call
            </h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Caller:</span>{' '}
                <span className="font-mono">{currentCall.callerId}</span>
              </div>
              <div>
                <span className="text-gray-600">Extension:</span>{' '}
                <span className="font-mono">{currentCall.extension}</span>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>{' '}
                <span className="font-mono">{formatDuration(duration)}</span>
              </div>
              <div>
                <span className="text-gray-600">Started:</span>{' '}
                {formatTimestamp(currentCall.timestamp)}
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-3">
            Call history
          </h2>
          {callHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No calls yet. Connect AMI and make a test call.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Caller
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Extension
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Duration
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Ended
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {callHistory.map((call, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm font-mono">
                        {call.callerId}
                      </td>
                      <td className="px-4 py-2 text-sm font-mono">
                        {call.extension}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {formatTimestamp(call.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
