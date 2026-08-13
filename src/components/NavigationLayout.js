"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function NavigationLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="min-w-0 max-w-full lg:ml-[13.5rem] min-[1700px]:ml-64">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="w-full px-3 py-4 sm:px-5 sm:py-5 min-[1700px]:px-8 min-[1700px]:py-8">
          <div className="mx-auto min-w-0 w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
