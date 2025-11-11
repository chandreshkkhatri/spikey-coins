'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_BASE_URL = 'http://localhost:8000';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role === 'admin') {
            // Already logged in as admin, redirect to dashboard
            window.location.href = '/admin';
            return;
          }
        }
      } catch {
        // Silent fail - user will see login form
      }
      
      setCheckingAuth(false);
    };

    checkExistingAuth();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store the token in localStorage
        localStorage.setItem('authToken', data.token);
        
        // Redirect based on role - check for admin role
        const userRole = data.user?.role;
        if (userRole === 'admin') {
          window.location.href = '/admin';
          return;
        } else {
          window.location.href = '/';
          return;
        }
      } else {
        setError(data.error || 'Login failed');
        setLoading(false);
      }
    } catch {
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  // Show loading while checking existing auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Spikey Coins</h1>
          <h2 className="text-2xl font-semibold text-gray-300 mb-2">Admin Login</h2>
          <p className="text-gray-400">Sign in to access the admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl">
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-gray-700 text-white border-gray-600 focus:border-blue-500"
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-700 text-white border-gray-600 focus:border-blue-500"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="text-center mt-4">
            <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
              ← Back to Home
            </Link>
            <p className="text-xs text-gray-500 mt-2">Admin login only</p>
          </div>
        </form>

        <div className="text-center text-sm text-gray-500">
          <p>Don&apos;t have an account? Contact your administrator.</p>
        </div>
      </div>
    </div>
  );
}

