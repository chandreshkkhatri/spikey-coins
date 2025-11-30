'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Extend window type for Google Sign-In
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);

  // Handle successful login redirect
  const handleLoginSuccess = useCallback((token: string, userRole: string) => {
    localStorage.setItem('authToken', token);
    if (userRole === 'admin') {
      window.location.href = '/admin';
    } else {
      // Non-admin users trying to access admin login - show error
      setError('Access denied. Admin privileges required.');
      localStorage.removeItem('authToken');
      setGoogleLoading(false);
      setLoading(false);
    }
  }, []);

  // Handle Google credential response
  const handleGoogleCredentialResponse = useCallback(async (response: any) => {
    setGoogleLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        handleLoginSuccess(data.token, data.user?.role);
      } else {
        setError(data.error || 'Google login failed');
        setGoogleLoading(false);
      }
    } catch {
      setError('Failed to connect to server');
      setGoogleLoading(false);
    }
  }, [handleLoginSuccess]);

  // Initialize Google Sign-In when script loads
  useEffect(() => {
    if (googleScriptLoaded && window.google && GOOGLE_CLIENT_ID) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      const buttonContainer = document.getElementById('google-signin-button');
      if (buttonContainer) {
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'filled_black',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular',
        });
      }
    }
  }, [googleScriptLoaded, handleGoogleCredentialResponse]);

  // Check if user is already logged in
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.user && data.user.role === 'admin') {
              // Already logged in as admin, redirect to dashboard
              window.location.href = '/admin';
              return;
            }
          }
        } catch {
          clearTimeout(timeoutId);
          // Silent fail - user will see login form
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok && data.success) {
        handleLoginSuccess(data.token, data.user?.role);
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

  const isLoading = loading || googleLoading;

  return (
    <>
      {/* Google Sign-In Script */}
      {GOOGLE_CLIENT_ID && (
        <Script
          src="https://accounts.google.com/gsi/client"
          onLoad={() => setGoogleScriptLoaded(true)}
          strategy="afterInteractive"
        />
      )}

      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Spikey Coins</h1>
            <h2 className="text-2xl font-semibold text-gray-300 mb-2">Admin Login</h2>
            <p className="text-gray-400">Sign in to access the admin dashboard</p>
          </div>

          <div className="mt-8 space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl">
            {error && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Google Sign-In Button */}
            {GOOGLE_CLIENT_ID && (
              <>
                <div className="flex flex-col items-center">
                  {googleLoading ? (
                    <div className="w-full flex items-center justify-center py-3 px-4 bg-gray-700 rounded-lg">
                      <svg className="animate-spin h-5 w-5 text-white mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-white">Signing in with Google...</span>
                    </div>
                  ) : (
                    <div id="google-signin-button" className="w-full flex justify-center"></div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                  </div>
                </div>
              </>
            )}

            {/* Traditional Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
            </form>

            <div className="text-center mt-4">
              <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
                ← Back to Home
              </Link>
              <p className="text-xs text-gray-500 mt-2">Admin login only</p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Don&apos;t have admin access? <Link href="/login" className="text-blue-400 hover:text-blue-300">Use regular login</Link></p>
            <p className="text-xs mt-1">Note: Google Sign-In creates regular user accounts by default.</p>
          </div>
        </div>
      </div>
    </>
  );
}

