import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { verifyConnection } from '../services/mongoDbService';

// This context manages the state for an optional backend API connection.
// It uses localStorage to persist the API endpoint across sessions for a logged-in user.

const API_ENDPOINT_STORAGE_KEY_PREFIX = 'pegaLsaAssistant_apiEndpoint_';

interface MongoDbContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  apiEndpoint: string | null;
  connect: (endpoint: string) => Promise<void>;
  disconnect: () => void;
}

const MongoDbContext = createContext<MongoDbContextType | undefined>(undefined);

export const useMongoDb = () => {
  const context = useContext(MongoDbContext);
  if (context === undefined) {
    throw new Error('useMongoDb must be used within a MongoDbProvider');
  }
  return context;
};

interface MongoDbProviderProps {
  children: ReactNode;
}

export const MongoDbProvider: React.FC<MongoDbProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [apiEndpoint, setApiEndpoint] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const getStorageKey = useCallback(() => {
    return currentUser ? `${API_ENDPOINT_STORAGE_KEY_PREFIX}${currentUser.id}` : null;
  }, [currentUser]);

  const connect = useCallback(async (endpoint: string) => {
    setIsConnecting(true);
    setIsConnected(false);
    setConnectionError(null);
    setApiEndpoint(endpoint);

    // This now simulates a check against a backend API endpoint.
    const { success, message } = await verifyConnection(endpoint);

    if (success) {
      setIsConnected(true);
      const storageKey = getStorageKey();
      if(storageKey) {
          localStorage.setItem(storageKey, endpoint);
      }
    } else {
      setConnectionError(message);
      setApiEndpoint(null);
      const storageKey = getStorageKey();
       if(storageKey) {
          localStorage.removeItem(storageKey);
       }
    }
    setIsConnecting(false);
  }, [getStorageKey]);

  const disconnect = useCallback(() => {
    const storageKey = getStorageKey();
    if (storageKey) {
        localStorage.removeItem(storageKey);
    }
    setApiEndpoint(null);
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
  }, [getStorageKey]);

  // Effect to load API endpoint from localStorage on user change
  useEffect(() => {
    const storageKey = getStorageKey();
    if (storageKey) {
        const storedEndpoint = localStorage.getItem(storageKey);
        if (storedEndpoint) {
            connect(storedEndpoint);
        } else {
            disconnect();
        }
    } else {
        // If there's no user, clear any existing connection state
        disconnect();
    }
  }, [currentUser, getStorageKey, connect, disconnect]);


  const value = {
    isConnected,
    isConnecting,
    connectionError,
    apiEndpoint,
    connect,
    disconnect,
  };

  return <MongoDbContext.Provider value={value}>{children}</MongoDbContext.Provider>;
};