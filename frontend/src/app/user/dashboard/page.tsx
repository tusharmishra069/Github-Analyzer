'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
}

interface Analysis {
  id: string;
  repository_url: string;
  status: string;
  created_at: string;
  files_analyzed?: number;
  pattern_bugs?: Array<{ title: string; severity: string }>;
}

type TabType = 'overview' | 'analyses' | 'billing' | 'settings';

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Mock data for credits (will connect to backend)
  const [credits, setCredits] = useState({
    total: 1000,
    used: 350,
    remaining: 650,
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

    // Use mock user for testing if no user in localStorage
    const userData = userStr ? JSON.parse(userStr) : {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test'
    };
    setUser(userData);

    // COMMENTED OUT FOR UI TESTING
    // Check role
    // if (userData.role !== 'user') {
    //   router.push('/admin/dashboard');
    //   return;
    // }

    // Fetch analyses (mock data for now)
    setTimeout(() => {
      setAnalyses([
        {
          id: '1',
          repository_url: 'https://github.com/fastapi/fastapi',
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          files_analyzed: 45,
          pattern_bugs: [
            { title: 'Missing error handling', severity: 'HIGH' },
            { title: 'Unoptimized query', severity: 'MEDIUM' },
          ],
        },
        {
          id: '2',
          repository_url: 'https://github.com/django/django',
          status: 'completed',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          files_analyzed: 120,
          pattern_bugs: [
            { title: 'Security vulnerability', severity: 'CRITICAL' },
          ],
        },
      ]);
      setLoading(false);
    }, 500);
  }, [router]);

  const handleAnalyzeRepo = async () => {
    if (!newRepoUrl) return;

    setAnalyzing(true);
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY!,
        },
        body: JSON.stringify({ repository_url: newRepoUrl }),
      });

      if (!response.ok) throw new Error('Failed to start analysis');

      const data = await response.json();
      
      // Add to analyses list
      setAnalyses([
        {
          id: data.job_id,
          repository_url: newRepoUrl,
          status: 'processing',
          created_at: new Date().toISOString(),
        },
        ...analyses,
      ]);

      setNewRepoUrl('');
      // Deduct credits
      setCredits(prev => ({
        ...prev,
        used: prev.used + 100,
        remaining: prev.remaining - 100,
      }));
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to start analysis');
    } finally {
      setAnalyzing(false);
    }
  };

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
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'analyses', label: 'Analyses', icon: '📈' },
    { id: 'billing', label: 'Billing & Credits', icon: '💳' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const creditUsagePercent = (credits.used / credits.total) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold text-blue-500">CodeAnalyzer</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-b border-slate-800">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <img
              src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
              alt={user.name}
              className="w-10 h-10 rounded-full"
            />
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Credits Display */}
        <div className="p-4 border-b border-slate-800">
          <div className={`${!sidebarOpen && 'text-center'}`}>
            {sidebarOpen && <p className="text-xs font-semibold text-slate-400 mb-2">CREDITS</p>}
            <p className={`text-2xl font-bold text-blue-500 ${sidebarOpen ? '' : 'text-lg'}`}>
              {credits.remaining}
            </p>
            {sidebarOpen && (
              <p className="text-xs text-slate-500 mt-1">of {credits.total} available</p>
            )}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${creditUsagePercent}%` }}
              ></div>
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
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Upgrade Button */}
        {sidebarOpen && (
          <div className="p-4 absolute bottom-20 left-0 right-0">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
              Buy More Credits
            </Button>
          </div>
        )}

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
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">Welcome back, {user.name}!</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Credits Remaining</p>
                <p className="text-2xl font-bold text-blue-500">{credits.remaining}</p>
              </div>
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                alt={user.name}
                className="w-12 h-12 rounded-full border-2 border-blue-500"
              />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">Total Analyses</p>
                        <p className="text-3xl font-bold text-white mt-2">{analyses.length}</p>
                      </div>
                      <div className="text-4xl">📊</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700 hover:border-green-500 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">Files Analyzed</p>
                        <p className="text-3xl font-bold text-white mt-2">
                          {analyses.reduce((sum, a) => sum + (a.files_analyzed || 0), 0)}
                        </p>
                      </div>
                      <div className="text-4xl">📁</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700 hover:border-purple-500 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">Bugs Found</p>
                        <p className="text-3xl font-bold text-white mt-2">
                          {analyses.reduce((sum, a) => sum + (a.pattern_bugs?.length || 0), 0)}
                        </p>
                      </div>
                      <div className="text-4xl">🐛</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 border-0">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Credits Left</p>
                        <p className="text-3xl font-bold text-white mt-2">{credits.remaining}</p>
                        <p className="text-xs text-blue-100 mt-2">{creditUsagePercent.toFixed(0)}% used</p>
                      </div>
                      <div className="text-4xl">⚡</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Action */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Analyze Repository</CardTitle>
                  <CardDescription className="text-slate-400">
                    Enter a GitHub repository URL to analyze
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="https://github.com/owner/repo"
                      value={newRepoUrl}
                      onChange={(e) => setNewRepoUrl(e.target.value)}
                      disabled={analyzing || credits.remaining < 100}
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                    <Button
                      onClick={handleAnalyzeRepo}
                      disabled={!newRepoUrl || analyzing || credits.remaining < 100}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      {analyzing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                  </div>
                  {credits.remaining < 100 && (
                    <p className="text-red-400 text-sm mt-2">⚠️ Insufficient credits for analysis</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Analyses</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyses.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No analyses yet</p>
                  ) : (
                    <div className="space-y-3">
                      {analyses.slice(0, 3).map(analysis => (
                        <div key={analysis.id} className="p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-mono text-sm text-cyan-400">{analysis.repository_url}</p>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              analysis.status === 'completed'
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              {analysis.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{new Date(analysis.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ANALYSES TAB */}
          {activeTab === 'analyses' && (
            <div className="space-y-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">All Analyses</CardTitle>
                  <CardDescription className="text-slate-400">
                    View all repository analyses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyses.length === 0 ? (
                    <p className="text-slate-400 text-center py-12">No analyses yet. Start by analyzing a repository!</p>
                  ) : (
                    <div className="space-y-3">
                      {analyses.map(analysis => (
                        <div key={analysis.id} className="p-4 bg-slate-700 rounded-lg border border-slate-600 hover:border-blue-500 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-mono text-sm text-cyan-400 mb-1">{analysis.repository_url}</p>
                              <p className="text-xs text-slate-400">{new Date(analysis.created_at).toLocaleDateString()} at {new Date(analysis.created_at).toLocaleTimeString()}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              analysis.status === 'completed'
                                ? 'bg-green-500/20 text-green-300'
                                : analysis.status === 'failed'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-600">
                            {analysis.files_analyzed && (
                              <div>
                                <p className="text-xs text-slate-400">Files Analyzed</p>
                                <p className="text-lg font-semibold text-white">{analysis.files_analyzed}</p>
                              </div>
                            )}
                            {analysis.pattern_bugs && (
                              <div>
                                <p className="text-xs text-slate-400">Issues Found</p>
                                <p className="text-lg font-semibold text-white">{analysis.pattern_bugs.length}</p>
                              </div>
                            )}
                          </div>

                          {analysis.pattern_bugs && analysis.pattern_bugs.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {analysis.pattern_bugs.map((bug, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    bug.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300' :
                                    bug.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                                    'bg-yellow-500/20 text-yellow-300'
                                  }`}>
                                    {bug.severity}
                                  </span>
                                  <span className="text-slate-300">{bug.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Credit Overview */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Credit Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-slate-400 text-sm mb-2">Total Credits</p>
                      <p className="text-4xl font-bold text-white">{credits.total}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm mb-2">Credits Used</p>
                      <p className="text-4xl font-bold text-orange-500">{credits.used}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-4 rounded-lg border border-blue-600/20">
                      <p className="text-slate-400 text-sm mb-2">Credits Remaining</p>
                      <p className="text-4xl font-bold text-cyan-400">{credits.remaining}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-slate-400 text-sm">Usage</p>
                      <p className="text-sm font-semibold text-white">{creditUsagePercent.toFixed(1)}%</p>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${creditUsagePercent}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: 'Starter', credits: 500, price: '$19', features: ['500 credits/month', 'Email support', 'Basic analytics'] },
                  { name: 'Professional', credits: 2000, price: '$49', features: ['2000 credits/month', 'Priority support', 'Advanced analytics', 'Team collaboration'], badge: true },
                  { name: 'Enterprise', credits: 10000, price: 'Custom', features: ['Unlimited credits', '24/7 support', 'Custom integration', 'Dedicated account manager'] },
                ].map((plan, idx) => (
                  <Card key={idx} className={`border-slate-700 transition-all ${plan.badge ? 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500' : 'bg-slate-800'}`}>
                    <CardHeader>
                      {plan.badge && <div className="text-xs font-bold text-blue-400 mb-2">POPULAR</div>}
                      <CardTitle className="text-white">{plan.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-3xl font-bold text-white">{plan.price}</p>
                        <p className="text-sm text-slate-400 mt-1">{plan.credits} credits</p>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="text-sm text-slate-300">✓ {feature}</li>
                        ))}
                      </ul>
                      <Button className={`w-full ${plan.badge ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'}`}>
                        Choose Plan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Transactions */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { date: 'Mar 14, 2026', action: 'Analysis Run', credits: -100, type: 'debit' },
                      { date: 'Mar 13, 2026', action: 'Analysis Run', credits: -100, type: 'debit' },
                      { date: 'Mar 10, 2026', action: 'Credit Purchase', credits: 500, type: 'credit' },
                    ].map((tx, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                        <div>
                          <p className="text-white text-sm font-medium">{tx.action}</p>
                          <p className="text-xs text-slate-400">{tx.date}</p>
                        </div>
                        <p className={`text-lg font-semibold ${tx.type === 'credit' ? 'text-green-400' : 'text-slate-300'}`}>
                          {tx.type === 'credit' ? '+' : ''}{tx.credits}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Profile Settings */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Profile Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <img
                      src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                      alt={user.name}
                      className="w-16 h-16 rounded-full border-2 border-blue-500"
                    />
                    <Button className="bg-slate-700 hover:bg-slate-600">Change Avatar</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Full Name</label>
                      <input
                        type="text"
                        defaultValue={user.name}
                        className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">Email</label>
                      <input
                        type="email"
                        defaultValue={user.email}
                        disabled
                        className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Analysis Complete', desc: 'Notify when analysis is complete' },
                    { label: 'Weekly Report', desc: 'Get weekly summary of analyses' },
                    { label: 'Low Credits', desc: 'Alert when credits are running low' },
                    { label: 'Product Updates', desc: 'Updates about new features' },
                  ].map((notif, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div>
                        <p className="text-white text-sm font-medium">{notif.label}</p>
                        <p className="text-xs text-slate-400">{notif.desc}</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* API Settings */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">API Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300">API Key</label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="password"
                        value="sk_test_51234567890abcdef"
                        disabled
                        className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
                      />
                      <Button className="bg-slate-700 hover:bg-slate-600">Copy</Button>
                    </div>
                  </div>
                  <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/10">
                    Regenerate Key
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="bg-slate-800 border-red-600/50">
                <CardHeader>
                  <CardTitle className="text-red-400">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/10">
                    Delete Account
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
