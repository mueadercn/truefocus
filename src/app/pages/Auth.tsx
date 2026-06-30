import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';

export function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      // Check if there's a pending plan from the license page
      const pendingPlan = localStorage.getItem('pendingPlan');
      if (pendingPlan) {
        localStorage.removeItem('pendingPlan');
        navigate(`/home/licenca?plan=${pendingPlan}`);
      } else {
        navigate('/home');
      }
    }
  }, [user, navigate]);

  // Load saved credentials
  useEffect(() => {
    const savedEmail = localStorage.getItem('truefocus_email');
    const savedPassword = localStorage.getItem('truefocus_password');
    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password, name);
        // After signup, automatically sign in
        await signIn(email, password);
      } else {
        await signIn(email, password);
      }

      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('truefocus_email', email);
        localStorage.setItem('truefocus_password', password);
      } else {
        localStorage.removeItem('truefocus_email');
        localStorage.removeItem('truefocus_password');
      }

      // Check if there's a pending plan from the license page
      const pendingPlan = localStorage.getItem('pendingPlan');
      if (pendingPlan) {
        localStorage.removeItem('pendingPlan');
        navigate(`/home/licenca?plan=${pendingPlan}`);
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl font-light tracking-tight text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
            TrueFocus
          </h1>
          <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
            Focus, productivity, combating dopamine addiction
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl p-8 border border-[#E8E8E8] dark:border-[#2A2A2A] shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-[#FAFAF8] dark:bg-[#0A0A0A] rounded-lg">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 py-3 rounded-md text-sm font-semibold uppercase tracking-wider transition-all duration-300 ${
                  mode === 'signin'
                    ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                    : 'text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-3 rounded-md text-sm font-semibold uppercase tracking-wider transition-all duration-300 ${
                  mode === 'signup'
                    ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                    : 'text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5]'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Name (only for signup) */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#6B6B6B] dark:text-[#A0A0A0]">
                  Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="bg-[#FAFAF8] dark:bg-[#0A0A0A]"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#6B6B6B] dark:text-[#A0A0A0]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="bg-[#FAFAF8] dark:bg-[#0A0A0A]"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#6B6B6B] dark:text-[#A0A0A0]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-[#FAFAF8] dark:bg-[#0A0A0A]"
              />
              {mode === 'signup' && (
                <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mt-1">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#E8E8E8] dark:border-[#2A2A2A] text-[#8B7355] dark:text-[#A89580] focus:ring-[#8B7355] dark:focus:ring-[#A89580]"
              />
              <Label
                htmlFor="remember"
                className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] cursor-pointer"
              >
                Remember me
              </Label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Please wait...</span>
                </div>
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-[#E8E8E8] dark:border-[#2A2A2A]">
            <p className="text-xs text-center text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
              {mode === 'signup'
                ? 'By creating an account, your data is securely saved on Supabase.'
                : 'Sign in to access your tasks and progress.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}