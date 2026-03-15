'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminStats {
  total_users: number;
  total_analyses: number;
  active_jobs: number;
  completed_analyses: number;
  failed_analyses: number;
}

interface AllUsers {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  is_active: boolean;
  last_login: string | null;
  credit_balance?: number;
  subscription?: string;
}

interface AllAnalyses {
  id: string;
  repository_url: string;
  status: string;
  user_id: string;
  created_at: string;
  total_time: number;
  files_analyzed: number;
  bugs_found: number;
}

type TabType = 'overview' | 'users' | 'analytics' | 'payments' | 'settings';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allUsers, setAllUsers] = useState<AllUsers[]>([]);
  const [analyses, setAnalyses] = useState<AllAnalyses[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Billing stats
  const [billingStats, setBillingStats] = useState({
    monthlyRevenue: 12450,
    totalRevenue: 45800,
    activeSubscriptions: 38,
    pendingPayments: 2,
  });

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');

    // COMMENTED OUT FOR UI TESTING
    // if (!userStr || !token) {
    //   router.push('/auth/login');
    //   return;
    // }

    // Use mock admin user for testing if no user in localStorage
    const userData = userStr ? JSON.parse(userStr) : {
      id: 'admin-user-123',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    };
    setUser(userData);

    // COMMENTED OUT FOR UI TESTING
    // Check role
    // if (userData.role !== 'admin') {
    //   router.push('/user/dashboard');
    //   return;
    // }

    // Fetch admin data (mock for now)
    setTimeout(() => {
      setStats({
        total_users: 42,
        total_analyses: 156,
        active_jobs: 3,
        completed_analyses: 150,
        failed_analyses: 3,
      });

      setAllUsers([
        {
          id: '1',
          email: 'user1@example.com',
          name: 'User One',
          role: 'user',
          created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
          is_active: true,
          last_login: new Date(Date.now() - 3600000).toISOString(),
          credit_balance: 450,
          subscription: 'Professional',
        },
        {
          id: '2',
          email: 'user2@example.com',
          name: 'User Two',
          role: 'user',
          created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
          is_active: true,
          last_login: new Date(Date.now() - 86400000).toISOString(),
          credit_balance: 800,
          subscription: 'Starter',
        },
        {
          id: '3',
          email: 'user3@example.com',
          name: 'User Three',
          role: 'user',
          created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
          is_active: false,
          last_login: new Date(Date.now() - 5 * 86400000).toISOString(),
          credit_balance: 0,
          subscription: 'Free',
        },
      ]);

      setAnalyses([
        {
          id: '1',
          repository_url: 'https://github.com/fastapi/fastapi',
          status: 'completed',
          user_id: '1',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          total_time: 23.4,
          files_analyzed: 45,
          bugs_found: 8,
        },
        {
          id: '2',
          repository_url: 'https://github.com/django/django',
          status: 'completed',
          user_id: '2',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          total_time: 35.2,
          files_analyzed: 120,
          bugs_found: 12,
        },
        {
          id: '3',
          repository_url: 'https://github.com/nodejs/node',
          status: 'processing',
          user_id: '1',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          total_time: 8.5,
          files_analyzed: 89,
          bugs_found: 5,
        },
      ]);

      setLoading(false);
    }, 500);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-slate-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold text-blue-500">CodeAnalyzer Admin</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        {/* Admin Profile Card */}
        <div className="p-4 border-b border-slate-800">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
              {user.name.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">Administrator</p>
              </div>
            )}
          </div>
        </div>

        {/* System Stats */}
        <div className="p-4 border-b border-slate-800">
          <div className={`${!sidebarOpen && 'text-center'}`}>
            {sidebarOpen && <p className="text-xs font-semibold text-slate-400 mb-3">SYSTEM</p>}
            <div className="space-y-2">
              <div className={`flex ${sidebarOpen ? 'justify-between' : 'justify-center'} items-center`}>
                <span className={`text-sm text-slate-400 ${!sidebarOpen && 'hidden'}`}>Users</span>
                <span className="font-bold text-cyan-400">{stats?.total_users || 0}</span>
              </div>
              <div className={`flex ${sidebarOpen ? 'justify-between' : 'justify-center'} items-center`}>
                <span className={`text-sm text-slate-400 ${!sidebarOpen && 'hidden'}`}>Analyses</span>
                <span className="font-bold text-green-400">{stats?.total_analyses || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800 absolute bottom-0 left-0 right-0">
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`w-full ${sidebarOpen ? '' : 'p-2'}`}
          >
            {sidebarOpen ? 'Logout' : '↓'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-slate-800/50 backdrop-blur border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">System Overview & Management</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Active Users</p>
                <p className="text-2xl font-bold text-cyan-400">{stats?.total_users || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-8">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition-colors">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-cyan-400 mt-2">{stats.total_users}</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700 hover:border-green-500 transition-colors">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Total Analyses</p>
                    <p className="text-3xl font-bold text-green-400 mt-2">{stats.total_analyses}</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700 hover:border-yellow-500 transition-colors">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Active Jobs</p>
                    <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.active_jobs}</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Completed</p>
                    <p className="text-3xl font-bold text-blue-400 mt-2">{stats.completed_analyses}</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700 hover:border-red-500 transition-colors">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Failed</p>
                    <p className="text-3xl font-bold text-red-400 mt-2">{stats.failed_analyses}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue & Billing Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-600/30">
                  <CardContent className="pt-6">
                    <p className="text-slate-300 text-sm">Monthly Revenue</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-2">${billingStats.monthlyRevenue}</p>
                    <p className="text-xs text-emerald-300 mt-2">↑ 12% from last month</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-white mt-2">${billingStats.totalRevenue}</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Active Subscriptions</p>
                    <p className="text-3xl font-bold text-purple-400 mt-2">{billingStats.activeSubscriptions}</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700 border-red-600/50">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Pending Payments</p>
                    <p className="text-3xl font-bold text-red-400 mt-2">{billingStats.pendingPayments}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Admin Profile */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Your Admin Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Name</label>
                      <p className="text-white mt-1">{user.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">Email</label>
                      <p className="text-white mt-1">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">Role</label>
                      <p className="text-purple-400 mt-1 font-semibold">Administrator</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">User ID</label>
                      <p className="text-slate-400 mt-1 font-mono text-sm">{user.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">All Users ({allUsers.length})</CardTitle>
                  <CardDescription className="text-slate-400">Manage system users and subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-700">
                        <tr>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Name</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Email</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Subscription</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Credits</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Joined</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Last Login</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((u) => (
                          <tr key={u.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                            <td className="py-3 px-4 text-white">{u.name}</td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-xs">{u.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                u.subscription === 'Professional' ? 'bg-purple-500/20 text-purple-300' :
                                u.subscription === 'Starter' ? 'bg-blue-500/20 text-blue-300' :
                                'bg-slate-600/50 text-slate-300'
                              }`}>
                                {u.subscription || 'Free'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-cyan-400 font-semibold">{u.credit_balance || 0}</td>
                            <td className="py-3 px-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-slate-400">
                              {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                u.is_active
                                  ? 'bg-green-500/20 text-green-300'
                                  : 'bg-red-500/20 text-red-300'
                              }`}>
                                {u.is_active ? '● Active' : '● Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Analysis Performance */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Avg Analysis Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-cyan-400">28.7s</p>
                    <p className="text-xs text-slate-400 mt-2">↓ 5% improvement</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Avg Files/Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-green-400">84.7</p>
                    <p className="text-xs text-slate-400 mt-2">from {analyses.length} analyses</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Avg Bugs Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-red-400">8.3</p>
                    <p className="text-xs text-slate-400 mt-2">per analysis</p>
                  </CardContent>
                </Card>
              </div>

              {/* All Analyses */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">All Analyses ({analyses.length})</CardTitle>
                  <CardDescription className="text-slate-400">System analysis history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-700">
                        <tr>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Repository</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">User ID</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Files</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Bugs</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Time (s)</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyses.map((a) => (
                          <tr key={a.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                            <td className="py-3 px-4 text-cyan-400 font-mono text-xs truncate">{a.repository_url}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                a.status === 'completed'
                                  ? 'bg-green-500/20 text-green-300'
                                  : a.status === 'failed'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-yellow-500/20 text-yellow-300'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400">{a.user_id}</td>
                            <td className="py-3 px-4 text-slate-300">{a.files_analyzed}</td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-red-400">{a.bugs_found}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{a.total_time.toFixed(1)}</td>
                            <td className="py-3 px-4 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Payment Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border-emerald-600/30">
                  <CardContent className="pt-6">
                    <p className="text-slate-300 text-sm">Monthly Revenue</p>
                    <p className="text-4xl font-bold text-emerald-400 mt-2">${billingStats.monthlyRevenue}</p>
                    <p className="text-xs text-emerald-300 mt-2">This month</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-600/30">
                  <CardContent className="pt-6">
                    <p className="text-slate-300 text-sm">Total Revenue</p>
                    <p className="text-4xl font-bold text-blue-400 mt-2">${billingStats.totalRevenue}</p>
                    <p className="text-xs text-blue-300 mt-2">All-time</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-600/30">
                  <CardContent className="pt-6">
                    <p className="text-slate-300 text-sm">Active Subscriptions</p>
                    <p className="text-4xl font-bold text-purple-400 mt-2">{billingStats.activeSubscriptions}</p>
                    <p className="text-xs text-purple-300 mt-2">Paying users</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { date: 'Mar 14, 2026', user: 'User One', type: 'Subscription', amount: 49, status: 'completed' },
                      { date: 'Mar 13, 2026', user: 'User Two', type: 'Credit Purchase', amount: 199, status: 'completed' },
                      { date: 'Mar 12, 2026', user: 'User Three', type: 'Subscription', amount: 19, status: 'pending' },
                      { date: 'Mar 11, 2026', user: 'User Four', type: 'Credit Purchase', amount: 99, status: 'completed' },
                    ].map((tx, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg border border-slate-700/50">
                        <div>
                          <p className="text-white font-medium">{tx.user}</p>
                          <p className="text-xs text-slate-400">{tx.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">${tx.amount}</p>
                          <span className={`text-xs font-medium ${
                            tx.status === 'completed'
                              ? 'text-green-400'
                              : 'text-yellow-400'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Payment Gateway</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-700/50">
                      <div>
                        <p className="text-white font-medium">Stripe</p>
                        <p className="text-xs text-slate-400">Primary payment processor</p>
                      </div>
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium">Connected</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Admin Settings */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Admin Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Email Notifications</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                      <span className="text-sm text-slate-300">Daily system reports</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                      <span className="text-sm text-slate-300">Failed analysis alerts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Configuration */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-700/50">
                    <p className="text-sm text-slate-300">Max Analysis Time</p>
                    <input type="number" defaultValue="600" className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
                    <p className="text-xs text-slate-400 mt-1">seconds</p>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-700/50">
                    <p className="text-sm text-slate-300">Max Files per Analysis</p>
                    <input type="number" defaultValue="1000" className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="bg-slate-800 border-red-600/50">
                <CardHeader>
                  <CardTitle className="text-red-400">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/10">
                    System Reset
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
