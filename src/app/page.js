'use client'
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  DollarSign
} from 'lucide-react';
import NavigationLayout from '@/components/NavigationLayout';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const data = [
  { name: 'Jan', donations: 4000, expenses: 2400 },
  { name: 'Feb', donations: 3000, expenses: 1398 },
  { name: 'Mar', donations: 2000, expenses: 9800 },
  { name: 'Apr', donations: 2780, expenses: 3908 },
  { name: 'May', donations: 1890, expenses: 4800 },
  { name: 'Jun', donations: 2390, expenses: 3800 },
];

import { getDashboardStats } from './actions';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalExpenses: 0,
    activeStaff: 0,
    inventoryCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const res = await getDashboardStats();
      if (res.success) {
        setStats({
          totalDonations: res.totalDonations,
          totalExpenses: res.totalExpenses,
          activeStaff: res.activeStaff,
          inventoryCount: res.inventoryCount,
        });
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  const cards = [
    { 
      name: 'Total Donations', 
      value: `रु ${stats.totalDonations.toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'bg-emerald-500',
      trend: '+12%',
      trendUp: true 
    },
    { 
      name: 'Total Expenses', 
      value: `रु ${stats.totalExpenses.toLocaleString()}`, 
      icon: TrendingDown, 
      color: 'bg-rose-500',
      trend: '+4%',
      trendUp: false 
    },
    { 
      name: 'Net Balance', 
      value: `रु ${(stats.totalDonations - stats.totalExpenses).toLocaleString()}`, 
      icon: Wallet, 
      color: 'bg-blue-500',
      trend: 'Safe',
      trendUp: true 
    },
    { 
      name: 'Active Staff', 
      value: stats.activeStaff, 
      icon: Users, 
      color: 'bg-amber-500',
      trend: 'Stable',
      trendUp: true 
    },
  ];

  return (
    <NavigationLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500">Welcome back. Here's what's happening today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <div key={card.name} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-xl text-white`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div className={`flex items-center space-x-1 text-sm font-medium ${card.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span>{card.trend}</span>
                  {card.trendUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium">{card.name}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Finances Overview</h3>
              <select className="bg-slate-50 border-none rounded-lg text-sm px-3 py-1 text-slate-600 outline-none">
                <option>Last 6 Months</option>
                <option>Last Year</option>
              </select>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="donations" stroke="#10b981" fillOpacity={1} fill="url(#colorDonations)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mr-4">
                    <DollarSign className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">New Donation Received</p>
                    <p className="text-xs text-slate-500">Rs { (i * 2500).toLocaleString() } from Recent Donor</p>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{i}h ago</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-primary-600 text-sm font-semibold hover:bg-primary-50 rounded-xl transition-colors">
              View All Activity
            </button>
          </div>
        </div>
      </div>
    </NavigationLayout>
  );
}
