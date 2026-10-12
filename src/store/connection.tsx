/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { PocketPadMessage, HelloOkMessage, ErrorMessage } from '../lib/protocol';
import { Transport, WebSocketTransport, MockTransport, ConnectionStatus, ErrorReason } from '../lib/transport';

const SESSION_TOKEN_KEY = 'pocketpad.token';

interface ConnectionState {
  status: ConnectionStatus;
  laptopName: string | null;
  laptopOs: 'darwin' | 'win32' | 'linux' | null;
  latency: number;
  demoMode: boolean;
  errorReason: ErrorReason | null;
  recentMessages: PocketPadMessage[];
}

type ConnectionAction =
  | { type: 'SET_STATUS'; status: ConnectionStatus; errorReason?: ErrorReason }
  | { type: 'HELLO_OK'; name: string; os: 'darwin' | 'win32' | 'linux' }
  | { type: 'SET_LATENCY'; latency: number }
  | { type: 'SET_DEMO_MODE'; demoMode: boolean }
  | { type: 'ADD_MESSAGE'; message: PocketPadMessage }
  | { type: 'RESET' };

const MAX_RING_BUFFER = 50;

function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case 'SET_STATUS':
      return {
        ...state,
        status: action.status,
        errorReason: action.errorReason ?? (action.status === 'error' ? state.errorReason : null),
      };
    case 'HELLO_OK':
      return {
        ...state,
        laptopName: action.name,
        laptopOs: action.os,
        status: 'connected',
        errorReason: null,
      };
    case 'SET_LATENCY':
      return {
        ...state,
        latency: action.latency,
      };
    case 'SET_DEMO_MODE':
      return {
        ...state,
        demoMode: action.demoMode,
      };
    case 'ADD_MESSAGE': {
      const nextMessages = [...state.recentMessages, action.message];
      if (nextMessages.length > MAX_RING_BUFFER) {
        nextMessages.shift();
      }
      return {
        ...state,
        recentMessages: nextMessages,
      };
    }
    case 'RESET':
      return {
        status: 'idle',
        laptopName: null,
        laptopOs: null,
        latency: 0,
        demoMode: false,
        errorReason: null,
        recentMessages: [],
      };
    default:
      return state;
  }
}

interface ConnectionContextValue extends ConnectionState {
  connect: (token: string, demo?: boolean) => void;
  disconnect: () => void;
  send: (msg: PocketPadMessage) => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(connectionReducer, {
    status: 'idle',
    laptopName: null,
    laptopOs: null,
    latency: 0,
    demoMode: false,
    errorReason: null,
    recentMessages: [],
  });

  const activeTransportRef = useRef<Transport | null>(null);
  const currentTokenRef = useRef<string>('');

  const send = useCallback((msg: PocketPadMessage) => {
    if (activeTransportRef.current) {
      activeTransportRef.current.send(msg);
      dispatch({ type: 'ADD_MESSAGE', message: msg });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (activeTransportRef.current) {
      activeTransportRef.current.close();
      activeTransportRef.current = null;
    }
    dispatch({ type: 'RESET' });
  }, []);

  const connect = useCallback((token: string, demo = false) => {
    if (activeTransportRef.current) {
      activeTransportRef.current.close();
      activeTransportRef.current = null;
    }

    currentTokenRef.current = token;
    dispatch({ type: 'SET_DEMO_MODE', demoMode: demo });

    const transport: Transport = demo ? new MockTransport() : new WebSocketTransport();
    activeTransportRef.current = transport;

    transport.onStatus((status, errorReason) => {
      dispatch({ type: 'SET_STATUS', status, errorReason });
      if (status === 'connected') {
        try {
          sessionStorage.setItem(SESSION_TOKEN_KEY, token);
        } catch {
          // Ignore sessionStorage errors
        }
      } else if (status === 'error') {
        try {
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
        } catch {
          // Ignore
        }
      }
    });

    transport.onMessage((msg) => {
      if (msg.t === 'hello_ok') {
        dispatch({
          type: 'HELLO_OK',
          name: (msg as HelloOkMessage).name,
          os: (msg as HelloOkMessage).os,
        });
      } else if (msg.t === 'error') {
        dispatch({
          type: 'SET_STATUS',
          status: 'error',
          errorReason: (msg as ErrorMessage).reason,
        });
      }
    });

    if (transport.onLatency) {
      transport.onLatency((lat) => {
        dispatch({ type: 'SET_LATENCY', latency: lat });
      });
    }

    transport.connect(token);
  }, []);

  // Handle URL ?token= and sessionStorage restoration on load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let initialToken: string | null = null;
    let fromUrl = false;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken && urlToken.trim() !== '') {
        initialToken = urlToken.trim();
        fromUrl = true;

        // Strip token from address bar using replaceState
        urlParams.delete('token');
        const remainingQuery = urlParams.toString();
        const newUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', newUrl);
      }
    } catch {
      // URL parsing fallback
    }

    if (!initialToken) {
      try {
        const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
        if (storedToken && storedToken.trim() !== '') {
          initialToken = storedToken.trim();
        }
      } catch {
        // sessionStorage read error
      }
    }

    if (initialToken) {
      connect(initialToken, false);
    }

    return () => {
      if (activeTransportRef.current) {
        activeTransportRef.current.close();
      }
    };
  }, [connect]);

  return (
    <ConnectionContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        send,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return ctx;
}
