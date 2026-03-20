'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command } from 'lucide-react';

/**
 * User interface - represents authenticated user data
 * @interface User
 */
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
}

/**
 * Analysis interface - represents a code analysis job
 * @interface Analysis
 */
interface Analysis {
  id: string;
  repository_url: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  files_analyzed?: number;
  pattern_bugs?: Array<{ title: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }>;
}

/**
 * Tab type union for dashboard navigation
 * @type TabType
 */
type TabType = 'overview' | 'analyses' | 'billing' | 'settings';

/**
 * Credits interface - tracks user credit usage
 * @interface Credits
 */
interface Credits {
  total: number;
  used: number;
  remaining: number;
}

/**
 * UserDashboard Component
 * 
 * Professional dashboard for managing code analyses and credits.
 * Features:
 * - Clean black/white UI with sidebar navigation
 * - Real-time credit tracking
 * - Analysis history and management
 * - Billing/credit purchase interface
 * - User settings and preferences
 * 
 * @component
 */
export default function UserDashboard() {
  const router = useRouter();
  
  // State Management
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [credits, setCredits] = useState<Credits>({
    total: 1000,
    used: 350,
    remaining: 650,
  });

  // Memoized Computations
  const creditUsagePercent = useMemo(
    () => (credits.used / credits.total) * 100,
    [credits.used, credits.total]
  );

  const navTabs = useMemo<Array<{ id: TabType; label: string }>>(() => [
    { id: 'overview', label: 'Overview' },
    { id: 'analyses', label: 'Analyses' },
    { id: 'billing', label: 'Credits' },
    { id: 'settings', label: 'Settings' },
  ], []);

  const totalFiles = useMemo(
    () => analyses.reduce((sum, a) => sum + (a.files_analyzed || 0), 0),
    [analyses]
  );

  const totalBugs = useMemo(
    () => analyses.reduce((sum, a) => sum + (a.pattern_bugs?.length || 0), 0),
    [analyses]
  );

  const mapStatus = (status: string): Analysis['status'] => {
    const normalized = status.toLowerCase();
    if (normalized === 'completed') return 'completed';
    if (normalized === 'failed') return 'failed';
    return 'processing';
  };

  // Event Handlers
  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  }, [router]);

  const handleAnalyzeRepo = useCallback(async () => {
    if (!newRepoUrl || analyzing || credits.remaining < 100) return;

    setAnalyzing(true);
    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        router.push('/auth/login');
        return;
      }
      
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
      
      setAnalyses(prev => [
        {
          id: data.job_id,
          repository_url: newRepoUrl,
          status: 'processing',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      setNewRepoUrl('');
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
  }, [newRepoUrl, analyzing, credits.remaining]);

  // Initialization
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          router.push('/auth/login');
          return;
        }

        const userData = await userResponse.json();
        setUser(userData);

        const jobsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          const items = Array.isArray(jobsData.items) ? jobsData.items : [];
          setAnalyses(
            items.map((job: any) => ({
              id: job.job_id,
              repository_url: job.repository_url,
              status: mapStatus(job.status || ''),
              created_at: job.created_at,
              files_analyzed: job.result?.files_analyzed,
              pattern_bugs: job.result?.pattern_bugs,
            }))
          );
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize user:', error);
        setLoading(false);
      }
    };

    initializeUser();
  }, [router]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Render
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Professional Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 h-screen shadow-sm">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Command className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">CodeAnalyzer</h1>
              <p className="text-xs text-gray-500">AI Code Engine</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {navTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Credits Section */}
        <div className="p-4 border-t border-gray-200 space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Credits</p>
              <span className="text-sm font-bold text-gray-900">{credits.remaining}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(100 - creditUsagePercent, 0)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{creditUsagePercent.toFixed(0)}% used</p>
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={handleLogout}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold transition-all duration-200"
          >
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 bg-gray-50">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8 p-8">
            {/* Stats Grid - Key Metrics */}
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Analyses Card */}
                <div className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Total Analyses</p>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-all">
                      📊
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 mb-4">{analyses.length}</p>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-1/3 transition-all"></div>
                  </div>
                </div>

                {/* Files Analyzed Card */}
                <div className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Files Analyzed</p>
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-all">
                      📁
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 mb-4">{totalFiles}</p>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 w-2/3 transition-all"></div>
                  </div>
                </div>

                {/* Bugs Found Card */}
                <div className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Issues Found</p>
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-100 transition-all">
                      🔍
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 mb-4">{totalBugs}</p>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-600 w-1/2 transition-all"></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Action Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">New Analysis</h3>
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all duration-300 hover:shadow-sm">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter repository URL..."
                    value={newRepoUrl}
                    onChange={(e) => setNewRepoUrl(e.target.value)}
                    disabled={analyzing || credits.remaining < 100}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none transition-all duration-200"
                  />
                  <Button
                    onClick={handleAnalyzeRepo}
                    disabled={!newRepoUrl || analyzing || credits.remaining < 100}
                    className="px-6 bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
                {credits.remaining < 100 && (
                  <p className="text-gray-500 text-xs mt-3">Insufficient credits. Upgrade to continue.</p>
                )}
              </div>
            </section>

            {/* Recent Analyses */}
            {analyses.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Activity</h3>
                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all duration-300 hover:shadow-sm">
                  <div className="space-y-3">
                    {analyses.slice(0, 5).map(analysis => (
                      <div
                        key={analysis.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-mono text-sm truncate">{analysis.repository_url}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(analysis.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <span
                          className={`ml-4 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                            analysis.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : analysis.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {analysis.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ANALYSES TAB */}
        {activeTab === 'analyses' && (
          <div className="space-y-8 p-8">
            <div className="space-y-2 mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Analysis History</h2>
              <p className="text-gray-600 text-sm">All previous code analyses and their results</p>
            </div>
            
            {analyses.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-gray-500">No analyses yet. Start by analyzing a repository.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
                {analyses.map(analysis => (
                  <div
                    key={analysis.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-white transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-gray-900 font-mono text-sm">{analysis.repository_url}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(analysis.created_at).toLocaleDateString()} •{' '}
                          {analysis.files_analyzed} files analyzed
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          analysis.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : analysis.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {analysis.status}
                      </span>
                    </div>
                    {analysis.pattern_bugs && analysis.pattern_bugs.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                        {analysis.pattern_bugs.map((bug, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700"
                          >
                            {bug.severity}: {bug.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="space-y-8 p-8">
            <div className="space-y-2 mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Credits & Billing</h2>
              <p className="text-gray-600 text-sm">Manage your analysis credits and upgrade plan</p>
            </div>

            {/* Credit Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-all">
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-2">Total Credits</p>
                <p className="text-4xl font-bold text-gray-900">{credits.total}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-all">
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-2">Used</p>
                <p className="text-4xl font-bold text-gray-700">{credits.used}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-all">
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-2">Available</p>
                <p className="text-4xl font-bold text-gray-900">{credits.remaining}</p>
              </div>
            </div>

            {/* Usage Progress */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-all">
              <div className="flex justify-between items-baseline mb-3">
                <p className="text-gray-900 font-semibold">Credit Usage</p>
                <p className="text-gray-600 text-sm">{creditUsagePercent.toFixed(1)}%</p>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${creditUsagePercent}%` }}
                ></div>
              </div>
            </div>

            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Starter', credits: 500, price: '$19/mo', desc: 'Perfect for individuals' },
                { name: 'Professional', credits: 2000, price: '$49/mo', desc: 'For active teams', featured: true },
                { name: 'Enterprise', credits: 10000, price: 'Custom', desc: 'Unlimited possibilities' },
              ].map((plan, idx) => (
                <div
                  key={idx}
                  className={`relative group ${plan.featured ? 'ring-2 ring-blue-200' : ''}`}
                >
                  <div
                    className={`bg-white border rounded-xl p-6 transition-all duration-300 h-full ${
                      plan.featured
                        ? 'border-blue-300 hover:border-blue-400 hover:shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    {plan.featured && (
                      <span className="inline-block mb-3 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        POPULAR
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-gray-600 text-xs mb-4">{plan.desc}</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{plan.price}</p>
                    <p className="text-gray-600 text-sm mb-6">{plan.credits} credits/month</p>
                    <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-all">
                      Upgrade
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-8 p-8">
            <div className="space-y-2 mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
              <p className="text-gray-600 text-sm">Manage your account and preferences</p>
            </div>

            {/* Profile Settings */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-gray-900 mb-6 uppercase tracking-wide">Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-600 text-xs font-semibold uppercase tracking-wide block mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user.name}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:border-blue-400 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-gray-600 text-xs font-semibold uppercase tracking-wide block mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    defaultValue={user.email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-gray-900 mb-6 uppercase tracking-wide">Preferences</h3>
              <div className="space-y-4">
                {['Email notifications', 'Weekly reports', 'Low credit alerts'].map((pref, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
                    />
                    <span className="text-gray-700 text-sm group-hover:text-gray-900 transition-all">
                      {pref}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
