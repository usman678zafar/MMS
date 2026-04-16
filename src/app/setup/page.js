'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function SetupPage() {
  const [email, setEmail] = useState('usman@gmail.com');
  const [name, setName] = useState('Muhammad Usman');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/users/create-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role: 'super_admin' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store user in localStorage for authentication
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/');
      } else {
        throw new Error(data.error || 'Failed to create Super Admin');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    router.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center bg-primary-600 rounded-xl shadow-sm mb-4">
              <span className="text-white text-xl font-bold">M</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Setup Super Admin</h1>
            <p className="text-xs text-slate-500">Create your first Super Admin user to access user management</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                placeholder="admin@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                placeholder="Admin Name"
              />
            </div>
            
            <div className="text-center text-slate-400 text-[10px]">
              <small>
                Creating user with <strong>super_admin</strong> role
              </small>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-2 text-sm flex items-center justify-center space-x-1.5 transition-all active:scale-95 mt-2"
            >
              {loading ? (
                <>
                  <span>Creating Super Admin...</span>
                </>
              ) : (
                <>
                  <span>Create Super Admin</span>
                </>
              )}
            </button>
          </form>
          
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-2 rounded-lg text-xs text-center">
              {error}
            </div>
          )}
          
          <div className="mt-5 text-center text-slate-400 text-[10px]">
            <small>
              Default password: <strong>admin123</strong>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
