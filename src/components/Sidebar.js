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
  GraduationCap,
  Settings
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/lib/rbac';

const getNavigationItems = (hasPermission) => {
  const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
  ];

  const additionalNavigation = [
    { name: 'Students', href: '/students', icon: GraduationCap, permission: PERMISSIONS.STUDENTS_VIEW },
    { name: 'Donations & Donors', href: '/donations', icon: HandHeart, permission: PERMISSIONS.DONATIONS_VIEW },
    { name: 'Expenses', href: '/expenses', icon: Receipt, permission: PERMISSIONS.EXPENSES_VIEW },
    { name: 'Staff', href: '/staff', icon: Users, permission: PERMISSIONS.STAFF_VIEW },
    { name: 'Inventory', href: '/inventory', icon: Package, permission: PERMISSIONS.INVENTORY_VIEW },
  ];

  const adminNavigation = [
    { name: 'Users', href: '/users', icon: Settings, permission: PERMISSIONS.USERS_VIEW },
  ];

  let navigation = baseNavigation;

  additionalNavigation.forEach(item => {
    if (hasPermission(item.permission)) {
      navigation.push(item);
    }
  });

  if (hasPermission(PERMISSIONS.USERS_VIEW)) {
    navigation.push(adminNavigation[0]);
  }

  return navigation;
};

export default function Sidebar() {
  const { signOut, profile, hasPermission } = useAuth();
  const pathname = usePathname();
  const navigation = getNavigationItems(hasPermission);
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  return (
    <div 
      className={`flex bg-white flex-col transition-all duration-300 ease-in-out border-r border-slate-200 h-[100dvh] sticky top-0 z-50 shadow-sm overflow-hidden ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto no-scrollbar overflow-x-hidden">
        <div className={`flex items-center flex-shrink-0 mb-8 transition-all duration-300 ${isCollapsed ? 'px-4 justify-center' : 'px-6'}`}>
          <div className="flex items-center min-w-max">
            <div className="h-10 w-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200 flex-shrink-0 transform transition-transform duration-300 hover:scale-105">
              <span className="text-white font-bold text-xl uppercase">M</span>
            </div>
            <div className={`ml-3 transition-all duration-300 truncate ${isCollapsed ? 'opacity-0 w-0 -translate-x-4' : 'opacity-100 w-auto translate-x-0'}`}>
              <h1 className="text-lg font-bold text-slate-900 leading-none">MMS</h1>
              <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">Masjid Mgmt</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-3 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ''}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all group relative ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${
                  isActive ? 'text-primary-600 scale-110' : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-110'
                } ${isCollapsed ? '' : 'mr-3'}`} />
                
                <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
                  isCollapsed ? 'opacity-0 w-0 -translate-x-4' : 'opacity-100 w-auto translate-x-0'
                }`}>
                  {item.name}
                </span>

                {isCollapsed && isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-primary-600 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-shrink-0 border-t border-slate-100 p-4 bg-slate-50/30">
        <div className="flex-shrink-0 w-full group">
          <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center min-w-0">
              <div className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white">
                <span className="text-white text-xs font-bold uppercase">{profile?.full_name?.charAt(0) || 'A'}</span>
              </div>
              <div className={`ml-3 transition-all duration-300 truncate ${isCollapsed ? 'opacity-0 w-0 -translate-x-4' : 'opacity-100 w-auto translate-x-0'}`}>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {profile?.full_name || 'Admin User'}
                </p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">
                  Manage Account
                </p>
              </div>
            </div>
            
            <button
              onClick={() => signOut()}
              className={`p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-300 cursor-pointer ${
                isCollapsed ? 'opacity-0 w-0 scale-0 pointer-events-none' : 'opacity-100 w-auto scale-100'
              }`}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
