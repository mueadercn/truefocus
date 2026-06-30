import { useState } from 'react';
import { X } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedPlan?: string;
}

export function AuthModal({ isOpen, onClose, onSuccess, selectedPlan }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const activeEndpoint = 'make-server-41f917a5';

      if (mode === 'signup') {
        // SIGNUP
        console.log('📝 Signup attempt:', email);
        
        const signupResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/${activeEndpoint}/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              email,
              password,
              name
            })
          }
        );

        console.log('📡 Signup response status:', signupResponse.status);
        
        // Read as text first to see what we get
        const responseText = await signupResponse.text();
        console.log('📡 Raw signup response:', responseText);
        
        let signupData;
        try {
          signupData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Failed to parse signup response:', parseError);
          console.error('❌ Raw response was:', responseText);
          
          // Check if it's a 404 error - server not deployed
          if (responseText.includes('404') || responseText.includes('Not Found')) {
            throw new Error('Backend server not available. Please deploy the Edge Function "make-server-41f917a5" in Supabase Dashboard.');
          }
          
          throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
        }

        if (!signupResponse.ok) {
          console.error('❌ Signup failed:', signupData);
          throw new Error(signupData.error || signupData.details || 'Signup failed');
        }

        console.log('✅ Signup successful:', signupData);

        // Salvar user no localStorage
        localStorage.setItem('truefocus_user', JSON.stringify(signupData.user));
        localStorage.setItem('truefocus_access_token', signupData.access_token);

        // Fechar modal e chamar onSuccess
        onClose();
        onSuccess();

      } else {
        // LOGIN
        console.log('🔐 Login attempt:', email);
        
        const loginResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/${activeEndpoint}/login`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              email,
              password
            })
          }
        );

        console.log('📡 Login response status:', loginResponse.status);
        
        // Read as text first to see what we get
        const responseText = await loginResponse.text();
        console.log('📡 Raw login response:', responseText);
        
        let loginData;
        try {
          loginData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Failed to parse login response:', parseError);
          console.error('❌ Raw response was:', responseText);
          
          // Check if it's a 404 error - server not deployed
          if (responseText.includes('404') || responseText.includes('Not Found')) {
            throw new Error('Backend server not available. Please deploy the Edge Function "make-server-41f917a5" in Supabase Dashboard.');
          }
          
          throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
        }

        if (!loginResponse.ok) {
          console.error('❌ Login failed:', loginData);
          throw new Error(loginData.error || loginData.details || 'Login failed');
        }

        console.log('✅ Login successful:', loginData);

        // Salvar user no localStorage
        localStorage.setItem('truefocus_user', JSON.stringify(loginData.user));
        localStorage.setItem('truefocus_access_token', loginData.access_token);

        // Fechar modal e chamar onSuccess
        onClose();
        onSuccess();
      }

    } catch (err: any) {
      console.error('❌ Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E8E8E8] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-[#F5F5F5] transition-colors"
        >
          <X className="w-5 h-5 text-[#6B6B6B]" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-[#E8E8E8]">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8B7355] to-[#A89580] flex items-center justify-center">
              <span className="text-white text-xl font-bold">T</span>
            </div>
            <span className="font-serif text-2xl font-bold text-[#1A1A1A]">
              TrueFocus
            </span>
          </div>
          {selectedPlan && (
            <p className="text-sm text-[#8B7355] font-semibold">
              Complete your {selectedPlan} plan purchase
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E8E8E8]">
          <button
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex-1 py-4 font-semibold transition-all ${
              mode === 'signup'
                ? 'text-[#8B7355] border-b-2 border-[#8B7355] bg-[#FAFAF8]'
                : 'text-[#6B6B6B] hover:bg-[#FAFAF8]'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-4 font-semibold transition-all ${
              mode === 'login'
                ? 'text-[#8B7355] border-b-2 border-[#8B7355] bg-[#FAFAF8]'
                : 'text-[#6B6B6B] hover:bg-[#FAFAF8]'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full px-4 py-3 border-2 border-[#E8E8E8] rounded-lg focus:border-[#8B7355] focus:outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full px-4 py-3 border-2 border-[#E8E8E8] rounded-lg focus:border-[#8B7355] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full px-4 py-3 border-2 border-[#E8E8E8] rounded-lg focus:border-[#8B7355] focus:outline-none transition-colors"
            />
            {mode === 'signup' && (
              <p className="text-xs text-[#6B6B6B] mt-1.5">
                Minimum 6 characters
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#8B7355] to-[#A89580] rounded-xl text-white font-bold hover:from-[#755E47] hover:to-[#93856C] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>

          {mode === 'signup' && (
            <p className="text-xs text-center text-[#6B6B6B] leading-relaxed">
              By signing up, you agree to our Terms of Service and Privacy Policy.
              You'll get 30 days free trial.
            </p>
          )}

          {mode === 'login' && (
            <p className="text-xs text-center text-[#6B6B6B]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-[#8B7355] font-semibold hover:underline"
              >
                Sign up
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}