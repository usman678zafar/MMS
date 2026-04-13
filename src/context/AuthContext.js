'use client'
import React, { createContext, useContext } from 'react';
import { SessionProvider, useSession, signOut as nextAuthSignOut } from 'next-auth/react';

const AuthContext = createContext({});

const AuthContextProvider = ({ children }) => {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  
  const user = session?.user || null;
  const profile = session?.user ? { full_name: session.user.name, email: session.user.email } : null;

  const value = {
    signOut: () => nextAuthSignOut({ callbackUrl: '/login' }),
    user,
    profile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = ({ children }) => {
  return (
    <SessionProvider>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </SessionProvider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
