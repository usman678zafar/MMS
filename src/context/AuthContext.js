"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
} from "react";
import { hasPermission } from "@/lib/rbac";
import { useRouter } from "next/navigation";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        setProfile({
          full_name: data.user.name,
          email: data.user.email,
          role: data.user.role,
        });
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(refreshAuth, 0);
    return () => clearTimeout(timer);
  }, [refreshAuth]);

  const checkPermission = (permission) => {
    return hasPermission(profile?.role, permission);
  };

  const signOut = async () => {
    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
    });
    setUser(null);
    setProfile(null);
    router.replace("/login");
    router.refresh();
  };

  const value = {
    user,
    profile,
    loading,
    hasPermission: checkPermission,
    refreshAuth,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const AuthContextProvider = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
