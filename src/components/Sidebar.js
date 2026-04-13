'use client'
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  HandHeart, 
  Receipt, 
  Users, 
  Package, 
  LogOut,
  UserRound,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: GraduationCap },
  { name: 'Donors', href: '/donors', icon: UserRound },
  { name: 'Donations', href: '/donations', icon: HandHeart },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Inventory', href: '/inventory', icon: Package },
];

export default function Sidebar() {
  const { signOut, profile } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex bg-white flex-col w-64 border-r border-slate-200 h-screen sticky top-0">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6">
          <div className="h-10 w-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-slate-900 leading-none">MMS</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Masjid Management</p>
          </div>
        </div>
        <nav className="mt-8 flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-shrink-0 flex border-t border-slate-200 p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 text-xs font-bold">{profile?.full_name?.charAt(0) || 'A'}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate max-w-[100px]">
                  {profile?.full_name || 'Admin'}
                </p>
                <p className="text-xs font-medium text-slate-500 group-hover:text-slate-700">
                  Manage Account
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
