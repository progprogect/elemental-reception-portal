export interface AmiEvent {
  event: string;
  [key: string]: string | undefined;
}

export interface CallInfo {
  callerId: string;
  extension: string;
  channelId: string;
  uniqueId: string;
  timestamp: string;
}

export interface CallHistoryItem {
  callerId: string;
  extension: string;
  duration: number;
  timestamp: string;
}

export interface PendingCall {
  callerId: string;
  channelId: string;
  uniqueId: string;
  timestamp: string;
}
