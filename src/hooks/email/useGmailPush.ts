import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../../lib/auth';
import { API_BASE_URL } from '../../config/env';

export interface GmailChange {
  type: 'messageAdded' | 'messageDeleted' | 'labelAdded' | 'labelRemoved';
  messageId: string;
  threadId?: string;
  labelIds?: string[];
}

export interface GmailNotification {
  type: 'gmail_update';
  changes: GmailChange[];
  historyId: string;
}

interface UseGmailPushOptions {
  onNotification?: (notification: GmailNotification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

export function useGmailPush(options: UseGmailPushOptions = {}) {
  const {
    onNotification,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] =
    useState<GmailNotification | null>(null);

  // Store callbacks in refs to avoid re-creating connect function
  const callbacksRef = useRef({
    onNotification,
    onConnect,
    onDisconnect,
    onError,
  });
  callbacksRef.current = { onNotification, onConnect, onDisconnect, onError };

  const connect = useCallback(() => {
    // Prevent multiple connections
    if (socketRef.current) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      console.warn('No access token available for WebSocket connection');
      return;
    }

    const socket = io(`${API_BASE_URL}/gmail`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Gmail Push WebSocket connected');
      setIsConnected(true);
      callbacksRef.current.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('Gmail Push WebSocket disconnected:', reason);
      setIsConnected(false);
      callbacksRef.current.onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('Gmail Push WebSocket connection error:', error);
      callbacksRef.current.onError?.(error);
    });

    socket.on('gmail_notification', (data: GmailNotification) => {
      console.log('Received Gmail notification:', data);
      setLastNotification(data);
      callbacksRef.current.onNotification?.(data);
    });

    socket.on('connected', (data) => {
      console.log('Gmail Push confirmed:', data);
    });

    socketRef.current = socket;
  }, []); // No dependencies - callbacks are in ref

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Auto-connect on mount if enabled - runs only once
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []); // Empty deps - run only on mount/unmount

  return {
    isConnected,
    lastNotification,
    connect,
    disconnect,
    socket: socketRef.current,
  };
}
