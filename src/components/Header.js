"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  HandHeart,
  Receipt,
  Users,
  Package,
  LogOut,
  Settings,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/rbac";

const getNavigationItems = (hasPermission) => {
  const baseNavigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      permission: PERMISSIONS.DASHBOARD_VIEW,
    },
  ];

  const additionalNavigation = [
    {
      name: "Students",
      href: "/students",
      icon: GraduationCap,
      permission: PERMISSIONS.STUDENTS_VIEW,
    },
    {
      name: "Donations",
      href: "/donations",
      icon: HandHeart,
      permission: PERMISSIONS.DONATIONS_VIEW,
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: Receipt,
      permission: PERMISSIONS.EXPENSES_VIEW,
    },
    {
      name: "Staff",
      href: "/staff",
      icon: Users,
      permission: PERMISSIONS.STAFF_VIEW,
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: Package,
      permission: PERMISSIONS.INVENTORY_VIEW,
    },
  ];

  const adminNavigation = [
    {
      name: "Users",
      href: "/users",
      icon: Settings,
      permission: PERMISSIONS.USERS_VIEW,
    },
  ];

  let navigation = [...baseNavigation];

  additionalNavigation.forEach((item) => {
    if (hasPermission(item.permission)) {
      navigation.push(item);
    }
  });

  if (hasPermission(PERMISSIONS.USERS_VIEW)) {
    navigation.push(adminNavigation[0]);
  }

  return navigation;
};

export default function Header() {
  const { signOut, profile, hasPermission } = useAuth();
  const pathname = usePathname();
  const navigation = getNavigationItems(hasPermission);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0">
              <div className="h-9 w-9 bg-primary-600 rounded-xl flex items-center justify-center transform transition-transform duration-300 hover:scale-105">
                <span className="text-white font-bold text-lg uppercase">
                  M
                </span>
              </div>
              <div className="ml-3 hidden sm:block">
                <h1 className="text-lg font-bold text-slate-900 leading-none">
                  MMS
                </h1>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Masjid Mgmt
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:ml-8 md:flex md:space-x-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? "text-primary-700 bg-primary-50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center">
            {/* Profile & Sign Out - Desktop */}
            <div className="hidden md:flex md:items-center md:ml-4 space-x-4">
              <div className="flex items-center space-x-3 pr-4 border-r border-slate-200">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center ">
                  <span className="text-white text-xs font-bold uppercase">
                    {profile?.full_name?.charAt(0) || "A"}
                  </span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-800 line-clamp-1">
                    {profile?.full_name || "Admin User"}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">
                    {profile?.role || "Admin"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-300"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none"
              >
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100">
          <div className="pt-2 pb-3 space-y-1 px-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="pt-4 pb-3 border-t border-slate-100 px-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold uppercase">
                  {profile?.full_name?.charAt(0) || "A"}
                </span>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-slate-800">
                  {profile?.full_name || "Admin User"}
                </div>
                <div className="text-sm font-medium text-slate-500">
                  {profile?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                onClick={() => {
                  signOut();
                  setIsMobileMenuOpen(false);
                }}
                className="flex w-full items-center px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
