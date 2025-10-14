import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 세션에서 사용자 정보 확인
    const checkSession = async () => {
      try {
        const response = await fetch('/api/csv/user/info', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const userInfo = data.user_info;
          
          setUser({
            id: userInfo.user_id,
            username: userInfo.username,
            email: userInfo.email,
            name: userInfo.name
          });
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/csv/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '로그인에 실패했습니다');
      }
      
      const data = await response.json();
      const userInfo = data.user_info;
      
      const loggedInUser: User = {
        id: userInfo.user_id,
        username: userInfo.username,
        email: userInfo.email,
        name: userInfo.name
      };
      
      setUser(loggedInUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, name: string) => {
    try {
      const response = await fetch('/api/csv/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, email, password, name })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '회원가입에 실패했습니다');
      }
      
      const data = await response.json();
      const userInfo = data.user_info;
      
      const newUser: User = {
        id: userInfo.user_id,
        username: userInfo.username,
        email: userInfo.email,
        name: userInfo.name
      };
      
      setUser(newUser);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/csv/user/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

