"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { hasPermission } from "@/lib/rbac";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check localStorage for user data
        let storedUser = null;
        if (typeof window !== "undefined") {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            storedUser = JSON.parse(userStr);
          }
        }

        if (storedUser && storedUser.email) {
          // Verify user with API
          const response = await fetch(
            `/api/auth/me?email=${encodeURIComponent(storedUser.email)}`,
          );
          const data = await response.json();

          if (data.success) {
            setUser(data.user);
            setProfile({
              full_name: data.user.name,
              email: data.user.email,
              role: data.user.role,
            });
          } else {
            // Clear invalid stored user
            if (typeof window !== "undefined") {
              localStorage.removeItem("user");
            }
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        setProfile(null);
        // Clear potentially corrupted localStorage data
        if (typeof window !== "undefined") {
          localStorage.removeItem("user");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const checkPermission = (permission) => {
    return hasPermission(profile?.role, permission);
  };

  const signOut = () => {
    setUser(null);
    setProfile(null);
    // Clear any session/storage
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
    window.location.href = "/login";
  };

  const value = {
    user,
    profile,
    loading,
    hasPermission: checkPermission,
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
