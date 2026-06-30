import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, DollarSign, Activity, TrendingUp, LogOut, Eye, Edit2, X, RefreshCw, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { supabase } from '../app/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  license_type: 'trial' | 'monthly' | 'annual' | 'lifetime' | 'expired' | 'free';
  license_expires_at: string | null;
}

interface Stats {
  totalUsers: number;
  last30Days: number;
  revenueThisMonth: number;
  revenueThisWeek: number;
  trialUsers: number;
  paidUsers: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    last30Days: 0,
    revenueThisMonth: 0,
    revenueThisWeek: 0,
    trialUsers: 0,
    paidUsers: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newLicenseType, setNewLicenseType] = useState<'trial' | 'monthly' | 'annual' | 'lifetime'>('trial');
  const [savingLicense, setSavingLicense] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('truefocus_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadData();
    } else {
      setInitialLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Truefocus2026') {
      sessionStorage.setItem('truefocus_admin_auth', 'true');
      setIsAuthenticated(true);
      setError('');
      loadData();
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('truefocus_admin_auth');
    setIsAuthenticated(false);
    setPassword('');
  };

  const loadData = async () => {
    setLoading(true);
    setConnectionError('');
    setSuccessMessage('');
    
    try {
      console.log('🔍 Admin: Loading data from Supabase licenses table...');
      console.log('📊 Supabase URL:', supabase.supabaseUrl);
      console.log('📊 Supabase Key exists:', !!supabase.supabaseKey);
      
      // Add timeout to catch hanging queries
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
      );
      
      const queryPromise = supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('⏳ Executing query...');
      const { data: licenses, error: licensesError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      console.log('✅ Query completed!');
      
      if (licensesError) {
        console.error('❌ Error fetching licenses:', licensesError);
        setConnectionError(`Database error: ${licensesError.message}`);
        setLoading(false);
        setInitialLoading(false);
        return;
      }

      console.log('✅ Licenses loaded:', licenses?.length || 0);

      if (!licenses || licenses.length === 0) {
        setConnectionError('No users found in database. Make sure users have been created.');
        setUsers([]);
        setStats({
          totalUsers: 0,
          last30Days: 0,
          revenueThisMonth: 0,
          revenueThisWeek: 0,
          trialUsers: 0,
          paidUsers: 0
        });
        setLoading(false);
        setInitialLoading(false);
        return;
      }

      // Transform licenses into users with calculated license types
      const transformedUsers: User[] = licenses.map(license => {
        const now = new Date();
        
        // Determine which expiration date to use based on license type
        let expiresAt = null;
        if (license.license_type === 'trial' && license.trial_ends_at) {
          expiresAt = new Date(license.trial_ends_at);
        } else if ((license.license_type === 'monthly' || license.license_type === 'annual') && license.subscription_ends_at) {
          expiresAt = new Date(license.subscription_ends_at);
        }
        
        let actualType: string = license.license_type || 'free';
        
        // Check if license has expired
        if (expiresAt && expiresAt < now && license.license_type !== 'lifetime') {
          actualType = 'expired';
        }
        
        return {
          id: license.user_id,
          name: license.user_name || license.user_email?.split('@')[0] || 'Unknown',
          email: license.user_email || 'No email',
          created_at: license.created_at,
          license_type: actualType as any,
          license_expires_at: license.trial_ends_at || license.subscription_ends_at
        };
      });

      setUsers(transformedUsers);

      // Calculate stats
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const totalUsers = licenses.length;
      
      const last30Days = licenses.filter(l => {
        const createdDate = new Date(l.created_at);
        return createdDate >= thirtyDaysAgo;
      }).length;

      // Count trial vs paid users
      const trialUsers = transformedUsers.filter(u => u.license_type === 'trial' || u.license_type === 'free').length;
      const paidUsers = transformedUsers.filter(u => ['monthly', 'annual', 'lifetime'].includes(u.license_type)).length;

      // Calculate revenue - ONLY count paid licenses with stripe_customer_id (real Stripe conversions)
      // Exclude manual admin changes
      const monthlyPaidLicenses = licenses.filter(l => {
        const createdDate = new Date(l.created_at);
        return (
          createdDate >= startOfMonth && 
          ['monthly', 'annual', 'lifetime'].includes(l.license_type) &&
          l.stripe_customer_id // ONLY count if paid via Stripe
        );
      });

      const weeklyPaidLicenses = licenses.filter(l => {
        const createdDate = new Date(l.created_at);
        return (
          createdDate >= startOfWeek && 
          ['monthly', 'annual', 'lifetime'].includes(l.license_type) &&
          l.stripe_customer_id // ONLY count if paid via Stripe
        );
      });

      let revenueThisMonth = 0;
      monthlyPaidLicenses.forEach(license => {
        if (license.license_type === 'monthly') revenueThisMonth += 6.99;
        if (license.license_type === 'annual') revenueThisMonth += 59;
        if (license.license_type === 'lifetime') revenueThisMonth += 149;
      });

      let revenueThisWeek = 0;
      weeklyPaidLicenses.forEach(license => {
        if (license.license_type === 'monthly') revenueThisWeek += 6.99;
        if (license.license_type === 'annual') revenueThisWeek += 59;
        if (license.license_type === 'lifetime') revenueThisWeek += 149;
      });

      setStats({
        totalUsers,
        last30Days,
        revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
        revenueThisWeek: Math.round(revenueThisWeek * 100) / 100,
        trialUsers,
        paidUsers
      });

      console.log('✅ Admin dashboard loaded:', {
        totalUsers,
        last30Days,
        trialUsers,
        paidUsers,
        revenueThisMonth,
        revenueThisWeek
      });

      setSuccessMessage(`✅ Loaded ${totalUsers} users from database`);
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('❌ Error loading admin data:', error);
      setConnectionError(`Connection error: ${error}`);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    // Map displayed types to actual DB types
    const actualType = ['trial', 'monthly', 'annual', 'lifetime'].includes(user.license_type) 
      ? user.license_type 
      : 'trial';
    setNewLicenseType(actualType as any);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setSavingLicense(true);
    try {
      console.log(`📝 Updating license for ${editingUser.email} to ${newLicenseType}`);
      
      const now = new Date();
      let updateData: any = {
        license_type: newLicenseType,
        updated_at: now.toISOString()
      };
      
      if (newLicenseType === 'trial') {
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + 30);
        updateData.trial_started_at = now.toISOString();
        updateData.trial_ends_at = trialEnd.toISOString();
        updateData.subscription_started_at = null;
        updateData.subscription_ends_at = null;
      } else if (newLicenseType === 'monthly') {
        const monthlyEnd = new Date(now);
        monthlyEnd.setMonth(monthlyEnd.getMonth() + 1);
        updateData.subscription_started_at = now.toISOString();
        updateData.subscription_ends_at = monthlyEnd.toISOString();
        updateData.trial_started_at = null;
        updateData.trial_ends_at = null;
      } else if (newLicenseType === 'annual') {
        const annualEnd = new Date(now);
        annualEnd.setFullYear(annualEnd.getFullYear() + 1);
        updateData.subscription_started_at = now.toISOString();
        updateData.subscription_ends_at = annualEnd.toISOString();
        updateData.trial_started_at = null;
        updateData.trial_ends_at = null;
      } else if (newLicenseType === 'lifetime') {
        const lifetimeEnd = new Date(now);
        lifetimeEnd.setFullYear(lifetimeEnd.getFullYear() + 100);
        updateData.subscription_started_at = now.toISOString();
        updateData.subscription_ends_at = lifetimeEnd.toISOString();
        updateData.trial_started_at = null;
        updateData.trial_ends_at = null;
      }

      // Update license in Supabase
      const { error: updateError } = await supabase
        .from('licenses')
        .update(updateData)
        .eq('user_id', editingUser.id);

      if (updateError) {
        console.error('❌ Failed to update license:', updateError);
        setConnectionError(`Failed to update license: ${updateError.message}`);
        setSavingLicense(false);
        return;
      }

      console.log('✅ License updated successfully');
      setSuccessMessage(`✅ ${editingUser.email} updated to ${newLicenseType.toUpperCase()}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setEditingUser(null);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('❌ Error updating license:', error);
      setConnectionError(`Error updating license: ${error}`);
    } finally {
      setSavingLicense(false);
    }
  };

  const handleExpireNow = async () => {
    if (!editingUser) return;
    
    if (!confirm(`⚠️ EXPIRE ${editingUser.email}?\n\nThis will set expiration to YESTERDAY to test the lock system.\n\nContinue?`)) {
      return;
    }

    setSavingLicense(true);
    try {
      console.log(`⏰ Expiring license for ${editingUser.email}`);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      let updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (editingUser.license_type === 'trial') {
        updateData.trial_ends_at = yesterday.toISOString();
      } else if (['monthly', 'annual', 'lifetime'].includes(editingUser.license_type)) {
        updateData.subscription_ends_at = yesterday.toISOString();
      }

      const { error: updateError } = await supabase
        .from('licenses')
        .update(updateData)
        .eq('user_id', editingUser.id);

      if (updateError) {
        console.error('❌ Failed to expire license:', updateError);
        setConnectionError(`Failed to expire license: ${updateError.message}`);
        setSavingLicense(false);
        return;
      }

      console.log('✅ License expired successfully');
      setSuccessMessage(`⚠️ ${editingUser.email} license EXPIRED for testing`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
      setEditingUser(null);
      
      await loadData();
    } catch (error) {
      console.error('❌ Error expiring license:', error);
      setConnectionError(`Error expiring license: ${error}`);
    } finally {
      setSavingLicense(false);
    }
  };

  const calculateDaysRemaining = (expiresAt: string | null, licenseType: string) => {
    if (!['trial', 'monthly', 'annual'].includes(licenseType) || !expiresAt) return null;
    
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLicenseLabel = (user: User) => {
    const daysRemaining = calculateDaysRemaining(user.license_expires_at, user.license_type);
    
    if (user.license_type === 'trial') {
      return daysRemaining !== null ? `Trial (${daysRemaining}d)` : 'Trial';
    } else if (user.license_type === 'monthly') {
      return daysRemaining !== null ? `Monthly (${daysRemaining}d)` : 'Monthly';
    } else if (user.license_type === 'annual') {
      return daysRemaining !== null ? `Annual (${daysRemaining}d)` : 'Annual';
    }
    
    const labels: Record<string, string> = {
      lifetime: 'Lifetime',
      expired: 'Expired',
      free: 'Free'
    };
    
    return labels[user.license_type] || user.license_type;
  };

  const getLicenseBadgeColor = (licenseType: string) => {
    const colors: Record<string, string> = {
      trial: 'bg-blue-50 border-blue-200 text-blue-700',
      free: 'bg-gray-50 border-gray-200 text-gray-700',
      monthly: 'bg-green-50 border-green-200 text-green-700',
      annual: 'bg-purple-50 border-purple-200 text-purple-700',
      lifetime: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      expired: 'bg-red-50 border-red-200 text-red-700'
    };
    return colors[licenseType] || 'bg-gray-50 border-gray-200 text-gray-700';
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAFAF8] via-[#F5F5F5] to-[#FAFAF8] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-block w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B7355] to-[#A89580] flex items-center justify-center mb-4">
              <span className="text-white text-3xl font-bold">T</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-2">
              TrueFocus Admin
            </h1>
            <p className="text-[#6B6B6B] text-sm">
              Restricted access — authorized personnel only
            </p>
          </div>

          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#6B6B6B] mb-2">
                  Admin Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E8E8E8] rounded-lg text-[#1A1A1A] placeholder-[#9E9E9E] focus:outline-none focus:border-[#8B7355] transition-colors"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#8B7355] to-[#A89580] text-white font-semibold rounded-lg hover:from-[#755E47] hover:to-[#93856C] transition-all duration-200 shadow-lg"
              >
                Access Dashboard
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#E8E8E8]">
              <button
                onClick={() => navigate('/')}
                className="w-full text-center text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              >
                ← Back to Landing Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Screen
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E8E8] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8B7355] to-[#A89580] flex items-center justify-center">
              <span className="text-white text-xl font-bold">T</span>
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-[#1A1A1A]">
                TrueFocus Admin
              </h1>
              <p className="text-xs text-[#6B6B6B]">Dashboard & Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-[#F5F5F5] border border-[#E8E8E8] text-[#6B6B6B] rounded-lg hover:bg-[#E8E8E8] transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              <span>View Site</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-green-900">{successMessage}</p>
          </div>
        )}

        {/* Connection Error */}
        {connectionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">
                Error
              </p>
              <p className="text-sm text-red-700">{connectionError}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 hover:border-[#8B7355] transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-[#6B6B6B] font-medium">ALL TIME</span>
            </div>
            <h3 className="text-3xl font-bold text-[#1A1A1A] mb-1">
              {stats.totalUsers}
            </h3>
            <p className="text-sm text-[#6B6B6B]">Total Users</p>
            <p className="text-xs text-[#9E9E9E] mt-1">
              {stats.trialUsers} trial • {stats.paidUsers} paid
            </p>
          </div>

          {/* Last 30 Days */}
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 hover:border-[#8B7355] transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-[#6B6B6B] font-medium">LAST 30 DAYS</span>
            </div>
            <h3 className="text-3xl font-bold text-[#1A1A1A] mb-1">
              {stats.last30Days}
            </h3>
            <p className="text-sm text-[#6B6B6B]">New Users</p>
          </div>

          {/* Revenue This Month */}
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 hover:border-[#8B7355] transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-xs text-[#6B6B6B] font-medium">THIS MONTH</span>
            </div>
            <h3 className="text-3xl font-bold text-[#1A1A1A] mb-1">
              ${stats.revenueThisMonth.toFixed(2)}
            </h3>
            <p className="text-sm text-[#6B6B6B]">Revenue (paid only)</p>
          </div>

          {/* Revenue This Week */}
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 hover:border-[#8B7355] transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-[#6B6B6B] font-medium">THIS WEEK</span>
            </div>
            <h3 className="text-3xl font-bold text-[#1A1A1A] mb-1">
              ${stats.revenueThisWeek.toFixed(2)}
            </h3>
            <p className="text-sm text-[#6B6B6B]">Revenue (paid only)</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#E8E8E8] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#8B7355]" />
              All Users ({users.length})
            </h2>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#755E47] transition-all duration-200 text-sm disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FAFAF8] border-b border-[#E8E8E8]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
                    License
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E8]">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-[#8B7355] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[#6B6B6B]">Loading from database...</p>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Database className="w-12 h-12 text-[#9E9E9E]" />
                        <div>
                          <p className="text-[#1A1A1A] font-medium mb-1">No users in database</p>
                          <p className="text-sm text-[#6B6B6B]">Users will appear when they sign up</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const daysRemaining = calculateDaysRemaining(user.license_expires_at, user.license_type);
                    
                    return (
                      <tr key={user.id} className="hover:bg-[#FAFAF8] transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-[#1A1A1A]">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#6B6B6B]">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#6B6B6B]">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`inline-block px-3 py-1 border rounded-full text-xs font-medium ${getLicenseBadgeColor(user.license_type)}`}>
                              {user.license_type === 'trial' ? 'Trial' : 
                               user.license_type === 'monthly' ? 'Monthly' :
                               user.license_type === 'annual' ? 'Annual' :
                               user.license_type === 'lifetime' ? 'Lifetime' :
                               user.license_type === 'expired' ? 'Expired' : 'Free'}
                            </span>
                            {user.license_type === 'trial' && daysRemaining !== null ? (
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${daysRemaining > 7 ? 'bg-green-500' : daysRemaining > 3 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                <span className={`text-xs font-semibold ${daysRemaining > 7 ? 'text-green-700' : daysRemaining > 3 ? 'text-yellow-700' : 'text-red-700'}`}>
                                  {daysRemaining}d left
                                </span>
                              </div>
                            ) : user.license_type === 'monthly' && daysRemaining !== null ? (
                              <span className="text-xs text-[#6B6B6B] font-medium">{daysRemaining}d left</span>
                            ) : user.license_type === 'annual' && daysRemaining !== null ? (
                              <span className="text-xs text-[#6B6B6B] font-medium">{daysRemaining}d left</span>
                            ) : user.license_type === 'lifetime' ? (
                              <span className="text-xs text-green-600 font-medium">∞ Forever</span>
                            ) : user.license_type === 'expired' ? (
                              <span className="text-xs text-red-600 font-semibold">⚠️ Locked</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F5] border border-[#E8E8E8] text-[#6B6B6B] rounded-lg hover:bg-[#E8E8E8] hover:text-[#1A1A1A] transition-all duration-200 text-sm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => !savingLicense && setEditingUser(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E8E8] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#1A1A1A]">
                  Edit User License
                </h3>
                <button
                  onClick={() => !savingLicense && setEditingUser(null)}
                  disabled={savingLicense}
                  className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-[#6B6B6B]" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-[#6B6B6B] mb-1">Name</p>
                  <p className="text-[#1A1A1A] font-medium">{editingUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B6B6B] mb-1">Email</p>
                  <p className="text-[#1A1A1A] font-medium">{editingUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-[#6B6B6B] mb-2">
                    License Type
                  </label>
                  <select
                    value={newLicenseType}
                    onChange={(e) => setNewLicenseType(e.target.value as any)}
                    disabled={savingLicense}
                    className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E8E8E8] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#8B7355] transition-colors disabled:opacity-50"
                  >
                    <option value="trial">Trial (30 days)</option>
                    <option value="monthly">Monthly ($6.99/mo)</option>
                    <option value="annual">Annual ($59/year)</option>
                    <option value="lifetime">Lifetime ($149 once)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingUser(null)}
                  disabled={savingLicense}
                  className="flex-1 px-4 py-3 bg-[#F5F5F5] border border-[#E8E8E8] text-[#6B6B6B] rounded-lg hover:bg-[#E8E8E8] transition-all duration-200 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingLicense}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8B7355] to-[#A89580] text-white rounded-lg hover:from-[#755E47] hover:to-[#93856C] transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingLicense ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  onClick={handleExpireNow}
                  disabled={savingLicense}
                  className="flex-1 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingLicense ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Expire Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}