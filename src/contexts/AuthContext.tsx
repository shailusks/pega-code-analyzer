import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';

// This implementation provides a hybrid authentication system:
// 1. Google Identity Services: Relies on a Google Client ID.
// 2. Local Authentication: Mocks a user database in localStorage.

declare global {
    interface Window {
        google: any;
    }
}

const SESSION_STORAGE_KEY = 'pegaLsaAssistant_currentUser';
const LOCAL_USERS_STORAGE_KEY = 'pegaLsaAssistant_localUsers';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  isGoogleClientInitialized: boolean;
  googleClientId: string | null;
  setGoogleClientIdFromInput: (clientId: string) => void;
  handleCredentialResponse: (response: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [isGoogleClientInitialized, setIsGoogleClientInitialized] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to get client ID from meta tag on initial load.
    const meta = document.querySelector('meta[name="google-client-id"]');
    const clientIdFromMeta = meta ? meta.getAttribute('content') : null;

    if (clientIdFromMeta && clientIdFromMeta.trim() !== '') {
      setGoogleClientId(clientIdFromMeta);
    }
  }, []);

  const setGoogleClientIdFromInput = (clientId: string) => {
      if(clientId && clientId.trim() !== '') {
          setGoogleClientId(clientId.trim());
      }
  }

  const handleCredentialResponse = useCallback((response: any) => {
    try {
        const idToken = response.credential;
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        const user: User = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            authProvider: 'google'
        };
        setCurrentUser(user);
    } catch (error) {
        console.error("Error decoding Google credential or setting user:", error);
    }
  }, []);

  useEffect(() => {
    // Dynamically load the Google GSI script and initialize it only when a client ID is available.
    if (googleClientId) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
          if (window.google) {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: handleCredentialResponse,
            });
            setIsGoogleClientInitialized(true);
          } else {
              console.error("Google Identity Services script loaded but `window.google` is not available.");
          }
      }
      script.onerror = () => {
        console.error("Failed to load Google Identity Services script.");
        setIsGoogleClientInitialized(false);
      }
      document.body.appendChild(script);
      
      // Cleanup function to remove the script when the component unmounts or the client ID changes
      return () => {
          const existingScript = document.getElementById('google-gsi-script');
          if (existingScript) {
            document.body.removeChild(existingScript);
          }
          setIsGoogleClientInitialized(false);
      }
    }
  }, [googleClientId, handleCredentialResponse]);


  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentUser]);

  const getLocalUsers = (): (User & {password: string})[] => {
      try {
          const users = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
          return users ? JSON.parse(users) : [];
      } catch {
          return [];
      }
  }
  
  const saveLocalUsers = (users: (User & {password: string})[]) => {
      localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(users));
  }

  const login = async (email: string, password: string): Promise<User> => {
      return new Promise((resolve, reject) => {
          setTimeout(() => {
            const users = getLocalUsers();
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
            if (user) {
                const { password, ...userToReturn } = user;
                setCurrentUser(userToReturn);
                resolve(userToReturn);
            } else {
                reject(new Error("Invalid email or password."));
            }
          }, 500);
      });
  }

  const signup = async (name: string, email: string, password: string): Promise<User> => {
       return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = getLocalUsers();
                if(users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                    reject(new Error("An account with this email already exists."));
                    return;
                }
                const newUser: User & {password: string} = {
                    id: `local-${crypto.randomUUID()}`,
                    name,
                    email,
                    password, // In a real app, this would be hashed
                    authProvider: 'local'
                };
                saveLocalUsers([...users, newUser]);
                const { password: _, ...userToReturn } = newUser;
                setCurrentUser(userToReturn);
                resolve(userToReturn);
            }, 500);
       });
  }

  const logout = () => {
    if (currentUser?.authProvider === 'google' && window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    signup,
    logout,
    isGoogleClientInitialized,
    googleClientId,
    setGoogleClientIdFromInput,
    handleCredentialResponse
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};