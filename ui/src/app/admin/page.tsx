'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_BASE_URL = 'http://localhost:8000';

interface DashboardData {
  system: {
    uptime: number;
    nodeVersion: string;
    memoryUsage: any;
    platform: string;
  };
  database: {
    name: string;
    collections: number;
    dataSize: number;
    storageSize: number;
  };
  counts: {
    users: number;
    summaries: number;
    watchlists: number;
  };
  user: {
    username: string;
    email: string;
    role: string;
  };
}

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Summary {
  _id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  isPublished: boolean;
  createdAt: string;
}

interface CoinSyncStatus {
  running: boolean;
  lastRun?: string;
  lastRunResult?: {
    totalCoins: number;
    newCoins: number;
    activeCoins: number;
    delistedCoins: number;
  };
  nextRun?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [coinSyncStatus, setCoinSyncStatus] = useState<CoinSyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  // Separate loading states for different operations to prevent button oscillation
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [loadingCoinSync, setLoadingCoinSync] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  // Form states
  const [articleUrl, setArticleUrl] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [researchTimeframe, setResearchTimeframe] = useState<'24h' | '7d'>('24h');

  const getAuthToken = () => localStorage.getItem('authToken');

  // Memoize fetchWithAuth to prevent unnecessary re-creations
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }, []);

  // Memoize showMessage to prevent unnecessary re-creations
  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/admin/login');
  };

  // Load dashboard data - memoized with useCallback to prevent infinite loops
  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/dashboard`);
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch {
      showMessage('error', 'Failed to load dashboard data');
    } finally {
      setLoadingDashboard(false);
    }
  }, [fetchWithAuth, showMessage]);

  // Load users - memoized with useCallback to prevent infinite loops
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/users`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch {
      showMessage('error', 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [fetchWithAuth, showMessage]);

  // Load summaries - memoized with useCallback to prevent infinite loops
  const loadSummaries = useCallback(async () => {
    setLoadingSummaries(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/summaries`);
      const data = await response.json();
      if (data.success) {
        setSummaries(data.data);
      }
    } catch {
      showMessage('error', 'Failed to load summaries');
    } finally {
      setLoadingSummaries(false);
    }
  }, [fetchWithAuth, showMessage]);

  // Load coin sync status - memoized with useCallback to prevent infinite loops
  const loadCoinSyncStatus = useCallback(async () => {
    setLoadingCoinSync(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/coins/status`);
      const data = await response.json();
      if (data.success) {
        setCoinSyncStatus(data.status);
      }
    } catch {
      showMessage('error', 'Failed to load coin sync status');
    } finally {
      setLoadingCoinSync(false);
    }
  }, [fetchWithAuth, showMessage]);

  // Trigger coin sync
  const handleCoinSync = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/coins/sync`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Coin sync completed successfully');
        loadCoinSyncStatus();
      } else {
        showMessage('error', data.error || 'Coin sync failed');
      }
    } catch {
      showMessage('error', 'Failed to trigger coin sync');
    } finally {
      setLoading(false);
    }
  };

  // Trigger research job
  const handleResearchJob = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/research/trigger`, {
        method: 'POST',
        body: JSON.stringify({ timeframe: researchTimeframe }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', `Research job started for ${researchTimeframe}`);
      } else {
        showMessage('error', data.error || 'Failed to trigger research job');
      }
    } catch {
      showMessage('error', 'Failed to trigger research job');
    } finally {
      setLoading(false);
    }
  };

  // Run Binance-CoinGecko matcher
  const handleMatcherRun = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/binance-coingecko/run`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', `Matcher completed: ${data.result.matched} matched, ${data.result.unmatched} unmatched`);
      } else {
        showMessage('error', data.error || 'Matcher failed');
      }
    } catch {
      showMessage('error', 'Failed to run matcher');
    } finally {
      setLoading(false);
    }
  };

  // Summarize article
  const handleSummarizeArticle = async () => {
    if (!articleUrl) {
      showMessage('error', 'Please enter a URL');
      return;
    }
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/summarize-article`, {
        method: 'POST',
        body: JSON.stringify({ url: articleUrl }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Article summarized successfully');
        setArticleUrl('');
        loadSummaries();
      } else {
        showMessage('error', data.error || 'Failed to summarize article');
      }
    } catch {
      showMessage('error', 'Failed to summarize article');
    } finally {
      setLoading(false);
    }
  };

  // Toggle summary publication
  const handleTogglePublish = async (summaryId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/summaries/publication`, {
        method: 'PUT',
        body: JSON.stringify({ summaryId, isPublished: !currentStatus }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', `Summary ${!currentStatus ? 'published' : 'unpublished'}`);
        loadSummaries();
      } else {
        showMessage('error', data.error || 'Failed to update summary');
      }
    } catch {
      showMessage('error', 'Failed to update summary');
    } finally {
      setLoading(false);
    }
  };

  // Reset user password
  const handleResetPassword = async () => {
    if (!resetUsername || !resetPassword) {
      showMessage('error', 'Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ username: resetUsername, newPassword: resetPassword }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', `Password reset for ${resetUsername}`);
        setResetUsername('');
        setResetPassword('');
      } else {
        showMessage('error', data.error || 'Failed to reset password');
      }
    } catch {
      showMessage('error', 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Load data when tab changes - only depends on activeTab to prevent infinite loops
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'summaries') {
      loadSummaries();
    } else if (activeTab === 'coins') {
      loadCoinSyncStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Only activeTab in dependencies - load functions are memoized with useCallback

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Manage your Spikey Coins application</p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700"
          >
            Logout
          </Button>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
          {['dashboard', 'users', 'coins', 'market-data', 'summaries', 'research'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">System Info</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-400">Uptime:</span> {formatUptime(dashboardData.system.uptime)}</p>
                  <p><span className="text-gray-400">Node:</span> {dashboardData.system.nodeVersion}</p>
                  <p><span className="text-gray-400">Platform:</span> {dashboardData.system.platform}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Memory:</span>
                    <div className="relative group">
                      <span className="cursor-help text-blue-400">ℹ️</span>
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-700 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10 shadow-lg">
                        <div className="space-y-1">
                          <div>Heap Used: {formatBytes(dashboardData.system.memoryUsage.heapUsed)}</div>
                          <div>Heap Total: {formatBytes(dashboardData.system.memoryUsage.heapTotal)}</div>
                          <div>Usage: {((dashboardData.system.memoryUsage.heapUsed / dashboardData.system.memoryUsage.heapTotal) * 100).toFixed(1)}%</div>
                        </div>
                        <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Database</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-400">Name:</span> {dashboardData.database.name}</p>
                  <p><span className="text-gray-400">Collections:</span> {dashboardData.database.collections}</p>
                  <p><span className="text-gray-400">Data Size:</span> {formatBytes(dashboardData.database.dataSize)}</p>
                  <p><span className="text-gray-400">Storage:</span> {formatBytes(dashboardData.database.storageSize)}</p>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Counts</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-400">Users:</span> {dashboardData.counts.users}</p>
                  <p><span className="text-gray-400">Summaries:</span> {dashboardData.counts.summaries}</p>
                  <p><span className="text-gray-400">Watchlists:</span> {dashboardData.counts.watchlists}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Logged In As</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-400">Username:</span> {dashboardData.user.username}</p>
                <p><span className="text-gray-400">Email:</span> {dashboardData.user.email}</p>
                <p><span className="text-gray-400">Role:</span> <span className="text-green-400 font-bold">{dashboardData.user.role}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Reset User Password</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Username"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  className="bg-gray-700 text-white border-gray-600"
                />
                <Input
                  type="password"
                  placeholder="New Password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="bg-gray-700 text-white border-gray-600"
                />
              </div>
              <Button
                onClick={handleResetPassword}
                disabled={loading}
                className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">All Users ({users.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2">Username</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Role</th>
                      <th className="text-left py-2">Active</th>
                      <th className="text-left py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b border-gray-700">
                        <td className="py-2">{user.username}</td>
                        <td className="py-2">{user.email}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-red-900' : 'bg-blue-900'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${user.isActive ? 'bg-green-900' : 'bg-gray-700'}`}>
                            {user.isActive ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="py-2">{new Date(user.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Coins Tab */}
        {activeTab === 'coins' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Coin Sync Management</h3>
              <div className="space-y-4">
                {coinSyncStatus && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Status:</p>
                      <p className={`font-bold ${coinSyncStatus.running ? 'text-yellow-400' : 'text-green-400'}`}>
                        {coinSyncStatus.running ? 'Running' : 'Idle'}
                      </p>
                    </div>
                    {coinSyncStatus.lastRun && (
                      <div>
                        <p className="text-gray-400">Last Run:</p>
                        <p>{new Date(coinSyncStatus.lastRun).toLocaleString()}</p>
                      </div>
                    )}
                    {coinSyncStatus.nextRun && (
                      <div>
                        <p className="text-gray-400">Next Run:</p>
                        <p>{new Date(coinSyncStatus.nextRun).toLocaleString()}</p>
                      </div>
                    )}
                    {coinSyncStatus.lastRunResult && (
                      <>
                        <div>
                          <p className="text-gray-400">Total Coins:</p>
                          <p className="font-bold text-blue-400">{coinSyncStatus.lastRunResult.totalCoins}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Active Coins:</p>
                          <p className="font-bold text-green-400">{coinSyncStatus.lastRunResult.activeCoins}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">New Coins:</p>
                          <p className="font-bold text-yellow-400">{coinSyncStatus.lastRunResult.newCoins}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Delisted:</p>
                          <p className="font-bold text-red-400">{coinSyncStatus.lastRunResult.delistedCoins}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <Button
                  onClick={handleCoinSync}
                  disabled={loading || (coinSyncStatus?.running || false)}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading || coinSyncStatus?.running ? 'Syncing...' : 'Trigger Coin Sync Now'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Market Data Tab */}
        {activeTab === 'market-data' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Binance-CoinGecko Matcher</h3>
              <p className="text-gray-400 mb-4">
                Matches Binance symbols with CoinGecko data to enrich with market cap information.
              </p>
              <Button
                onClick={handleMatcherRun}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Running Matcher...' : 'Run Matcher Now'}
              </Button>
            </div>
          </div>
        )}

        {/* Summaries Tab */}
        {activeTab === 'summaries' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Summarize Article</h3>
              <div className="space-y-4">
                <Input
                  type="url"
                  placeholder="Article URL"
                  value={articleUrl}
                  onChange={(e) => setArticleUrl(e.target.value)}
                  className="bg-gray-700 text-white border-gray-600"
                />
                <Button
                  onClick={handleSummarizeArticle}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Summarizing...' : 'Summarize Article'}
                </Button>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">All Summaries ({summaries.length})</h3>
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <div key={summary._id} className="border border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-semibold">{summary.title}</h4>
                      <Button
                        onClick={() => handleTogglePublish(summary._id, summary.isPublished)}
                        disabled={loading}
                        className={`text-xs disabled:opacity-50 disabled:cursor-not-allowed ${summary.isPublished ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                        {loading ? 'Updating...' : (summary.isPublished ? 'Unpublish' : 'Publish')}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {summary.summary ? summary.summary.substring(0, 200) : 'No summary available'}...
                    </p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Source: {summary.source || 'Unknown'}</span>
                      <span>Category: {summary.category || 'Uncategorized'}</span>
                      <span>Status: <span className={summary.isPublished ? 'text-green-400' : 'text-gray-400'}>
                        {summary.isPublished ? 'Published' : 'Draft'}
                      </span></span>
                      <span>{new Date(summary.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Research Tab */}
        {activeTab === 'research' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Trigger Research Job</h3>
              <p className="text-gray-400 mb-4">
                Manually trigger a research job to analyze top movers and generate insights.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Timeframe:</label>
                  <select
                    value={researchTimeframe}
                    onChange={(e) => setResearchTimeframe(e.target.value as '24h' | '7d')}
                    className="bg-gray-700 text-white border-gray-600 rounded px-4 py-2"
                  >
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                  </select>
                </div>
                <Button
                  onClick={handleResearchJob}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Triggering...' : 'Trigger Research Job'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

