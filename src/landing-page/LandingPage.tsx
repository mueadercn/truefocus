import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Check, ArrowRight, Zap, Shield, TrendingUp, X, ChevronDown } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { AuthModal } from './AuthModal';

export function LandingPage() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<'monthly' | 'annual' | 'lifetime' | null>(null);
  const [loggedUser, setLoggedUser] = useState<{ name: string; email: string } | null>(null);

  // Check for logged user on mount
  useEffect(() => {
    const userStr = localStorage.getItem('truefocus_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setLoggedUser(user);
        console.log('👤 User logged in:', user.email);
      } catch (e) {
        console.error('Failed to parse user from localStorage');
      }
    }
  }, []);

  // Check for payment status in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const plan = params.get('plan');
    
    if (paymentStatus === 'success') {
      alert(`✅ Payment successful! Your ${plan || ''} plan is now active.`);
      // Clear URL params
      window.history.replaceState({}, '', '/landing');
    } else if (paymentStatus === 'cancelled') {
      alert('❌ Payment was cancelled. You can try again anytime.');
      // Clear URL params
      window.history.replaceState({}, '', '/landing');
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Função para criar checkout Stripe (copiada de License.tsx)
  const handlePlanClick = async (planType: 'monthly' | 'annual' | 'lifetime') => {
    try {
      console.log(`💳 Starting checkout for ${planType}...`);
      
      // Verificar se usuário está logado
      const userStr = localStorage.getItem('truefocus_user');
      if (!userStr) {
        console.log('❌ User not logged in, opening auth modal...');
        setPendingPlan(planType);
        setShowAuthModal(true);
        return;
      }

      setLoadingPlan(planType);
      
      const user = JSON.parse(userStr);
      const accessToken = localStorage.getItem('truefocus_access_token');
      const activeEndpoint = 'make-server-41f917a5';
      
      console.log('💳 Calling backend to create checkout...');
      console.log('💳 User:', user.email);
      console.log('💳 Plan:', planType);
      console.log('💳 Access Token (first 50 chars):', accessToken?.substring(0, 50));
      console.log('💳 Access Token length:', accessToken?.length);
      
      // CRITICAL: Validate token exists
      if (!accessToken) {
        console.error('❌ No access token found in localStorage!');
        alert('Session expired. Please log in again.');
        setPendingPlan(planType);
        setShowAuthModal(true);
        setLoadingPlan(null);
        return;
      }
      
      // Chamar backend para criar checkout
      const checkoutUrl = `https://${projectId}.supabase.co/functions/v1/${activeEndpoint}/stripe/create-checkout`;
      console.log('🌐 Full URL:', checkoutUrl);
      console.log('🔑 Sending userToken to backend:', accessToken.substring(0, 50) + '...');
      
      const response = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          plan: planType,
          userToken: accessToken,
          returnUrl: window.location.origin // Send origin for success/cancel URLs
        })
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const responseText = await response.text();
      console.log('🔍 Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        console.error('Raw response was:', responseText);
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
      }
      
      if (!response.ok) {
        console.error('❌ Server error response:', data);
        
        // Se erro de autenticação, abrir modal de login
        if (response.status === 401 || data.error?.includes('Unauthorized') || data.error?.includes('expired')) {
          console.log('🔐 Session expired, prompting login...');
          alert('Your session has expired. Please log in again.');
          localStorage.removeItem('truefocus_access_token');
          localStorage.removeItem('truefocus_user');
          setLoggedUser(null);
          setPendingPlan(planType);
          setShowAuthModal(true);
          setLoadingPlan(null);
          return;
        }
        
        throw new Error(data.error || 'Failed to create checkout');
      }

      console.log('✅ Checkout URL received:', data.url);

      // Redirecionar para Stripe Checkout
      if (data.url) {
        // CRITICAL: Use window.top to escape iframe if running inside one
        // This fixes Stripe's "cannot run in iframe" error
        if (window.top) {
          window.top.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('❌ Error creating checkout:', error);
      alert('Failed to create checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* USER STATUS BAR - Mostra quando logado */}
      {loggedUser && (
        <div className="fixed top-0 w-full bg-gradient-to-r from-[#8B7355] to-[#A89580] text-white py-2 px-4 z-[60] shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xs font-bold">✓</span>
              </div>
              <span className="text-sm font-semibold">
                Logged as <span className="font-bold">{loggedUser.name || loggedUser.email}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  const token = localStorage.getItem('truefocus_access_token');
                  console.log('🧪 Testing token validity...');
                  console.log('🧪 Token (first 50):', token?.substring(0, 50));
                  console.log('🧪 Token length:', token?.length);
                  
                  try {
                    const response = await fetch(
                      `https://${projectId}.supabase.co/functions/v1/make-server-41f917a5/debug/test-token`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${publicAnonKey}`
                        },
                        body: JSON.stringify({ token })
                      }
                    );
                    const result = await response.json();
                    console.log('🧪 Token test result:', result);
                    alert(`Token is ${result.success ? 'VALID ✅' : 'INVALID ❌'}\nUser: ${result.user?.email || 'N/A'}\nError: ${result.error || 'None'}`);
                  } catch (err) {
                    console.error('🧪 Token test failed:', err);
                    alert('Test failed: ' + err);
                  }
                }}
                className="text-xs px-2 py-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
              >
                Test Token
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('truefocus_user');
                  localStorage.removeItem('truefocus_access_token');
                  setLoggedUser(null);
                }}
                className="text-xs underline hover:text-white/80 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <nav className={`fixed ${loggedUser ? 'top-10' : 'top-0'} w-full bg-white/98 backdrop-blur-xl border-b border-[#E8E8E8] z-50 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Logo Row */}
            <div className="h-16 flex items-center justify-center border-b border-[#E8E8E8]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#8B7355] to-[#A89580] flex items-center justify-center">
                  <span className="text-white text-lg font-bold">T</span>
                </div>
                <span className="font-serif text-xl font-bold text-[#1A1A1A] tracking-tight">
                  TrueFocus
                </span>
              </div>
            </div>
            
            {/* Buttons Row */}
            <div className="h-16 flex items-center justify-center gap-2 px-3">
              <a
                href="/auth"
                className="flex-1 px-3 py-2.5 bg-transparent border-2 border-[#E8E8E8] rounded-lg text-[#6B6B6B] font-semibold text-xs text-center hover:bg-[#FAFAF8] transition-all"
              >
                Login
              </a>
              <button
                onClick={() => scrollToSection('download')}
                className="flex-1 px-3 py-2.5 bg-[#F5F5F5] border-2 border-[#E8E8E8] rounded-lg text-[#1A1A1A] font-semibold text-xs text-center hover:bg-[#E8E8E8] transition-all"
              >
                Download
              </button>
              <a
                href="/auth"
                className="flex-1 px-3 py-2.5 bg-gradient-to-r from-[#8B7355] to-[#A89580] rounded-lg text-white font-bold text-xs text-center shadow-md"
              >
                Start Free
              </a>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8B7355] to-[#A89580] flex items-center justify-center">
                <span className="text-white text-xl font-bold">T</span>
              </div>
              <span className="font-serif text-2xl font-bold text-[#1A1A1A] tracking-tight">
                TrueFocus
              </span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/auth"
                className="px-6 py-2.5 bg-transparent border-2 border-[#E8E8E8] rounded-lg text-[#6B6B6B] font-semibold text-sm hover:bg-[#FAFAF8] transition-all"
              >
                Login Web
              </a>
              <button
                onClick={() => scrollToSection('download')}
                className="px-6 py-2.5 bg-[#F5F5F5] border-2 border-[#E8E8E8] rounded-lg text-[#1A1A1A] font-semibold text-sm hover:bg-[#E8E8E8] transition-all"
              >
                Download App
              </button>
              <a
                href="/auth"
                className="px-8 py-2.5 bg-gradient-to-r from-[#8B7355] to-[#A89580] rounded-lg text-white font-bold text-sm shadow-lg"
              >
                Start Free
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className={`min-h-screen flex flex-col items-center justify-center px-6 md:px-12 ${loggedUser ? 'pt-48 md:pt-40' : 'pt-40 md:pt-32'} pb-20 bg-gradient-to-b from-[#FAFAF8] to-white text-center transition-all duration-300`}>
        <div className="max-w-4xl mx-auto mb-16">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1A1A] leading-tight mb-4 tracking-tight">
            Reclaim Deep Focus & Explosive Productivity
          </h1>
          <h2 className="text-3xl md:text-4xl font-semibold text-[#8B7355] leading-snug mb-8 tracking-tight">
            Escape Endless Scrolling and Cheap Dopamine Traps
          </h2>
          <p className="text-lg md:text-xl text-[#6B6B6B] leading-relaxed mb-12">
            Tired of distractions draining your energy and motivation?<br />
            <strong className="text-[#1A1A1A] font-semibold">TrueFocus</strong> is the minimalist app built to break addictive patterns — so you crush tasks, hit deadlines, and achieve real goals with unbreakable concentration.
          </p>
          <a
            href="/auth"
            className="inline-block px-12 md:px-14 py-5 bg-gradient-to-r from-[#8B7355] to-[#A89580] rounded-xl text-white text-lg font-bold hover:from-[#755E47] hover:to-[#93856C] transition-all duration-300 hover:-translate-y-1 shadow-2xl shadow-[#8B7355]/40"
          >
            Start Free – No Card Needed
          </a>
          <p className="text-sm text-[#9E9E9E] mt-4">
            30-day free trial • No credit card required
          </p>
        </div>

        <div className="max-w-6xl w-full mt-10">
          <div className="bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] rounded-2xl p-8 md:p-12 shadow-2xl border border-[#E8E8E8]">
            <div className="aspect-video bg-white rounded-xl flex items-center justify-center border border-[#E8E8E8]">
              <p className="text-[#9E9E9E] font-medium">
                Dashboard Preview (Screenshot Here)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 md:py-32 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#1A1A1A] text-center mb-20 tracking-tight">
            Everything Designed to Skyrocket Your Focus and Productivity
          </h2>

          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
                  Focus Clock
                </h3>
                <p className="text-lg text-[#6B6B6B] leading-relaxed">
                  A clean, no-nonsense timer crafted for true deep work sessions. Track genuine concentration time — no gamified distractions, just pure, accumulating progress that builds real momentum.
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] rounded-xl p-8 shadow-xl border border-[#E8E8E8]">
                <div className="aspect-video bg-white rounded-lg flex items-center justify-center border border-[#E8E8E8]">
                  <p className="text-[#9E9E9E] text-sm">Focus Clock Screenshot</p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="md:order-2">
                <h3 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
                  Monthly Dashboard
                </h3>
                <p className="text-lg text-[#6B6B6B] leading-relaxed">
                  Clean, beautiful charts and insights show your wins: tasks crushed, focused hours logged, and dopamine-free patterns revealed. See your productivity soar month after month.
                </p>
              </div>
              <div className="md:order-1 bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] rounded-xl p-8 shadow-xl border border-[#E8E8E8]">
                <div className="aspect-video bg-white rounded-lg flex items-center justify-center border border-[#E8E8E8]">
                  <p className="text-[#9E9E9E] text-sm">Dashboard Screenshot</p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
                  Theory & SOS Toolkit
                </h3>
                <p className="text-lg text-[#6B6B6B] leading-relaxed">
                  Quick, science-backed explanations of dopamine addiction + instant emergency tools to crush cravings when the scroll urge hits. Stay in control without relying on sheer willpower.
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] rounded-xl p-8 shadow-xl border border-[#E8E8E8]">
                <div className="aspect-video bg-white rounded-lg flex items-center justify-center border border-[#E8E8E8]">
                  <p className="text-[#9E9E9E] text-sm">SOS Toolkit Screenshot</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-24 md:py-32 px-6 md:px-12 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-20 tracking-tight">
            Simple, Transparent Pricing  Pick Your Path to Freedom
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Monthly */}
            <div className="bg-white border-2 border-[#E8E8E8] rounded-2xl p-8 md:p-12 hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-xl">
              <h3 className="text-sm font-bold text-[#6B6B6B] uppercase tracking-wider mb-4">
                Monthly
              </h3>
              <div className="mb-2">
                <span className="text-5xl md:text-6xl font-bold text-[#1A1A1A]">$6.99</span>
                <span className="text-lg text-[#6B6B6B]">/month</span>
              </div>
              <p className="text-[#6B6B6B] leading-relaxed mb-8 min-h-[48px]">
                Unlimited access to all features • Cloud sync • Cancel anytime
              </p>
              <button
                onClick={() => handlePlanClick('monthly')}
                disabled={loadingPlan !== null}
                className="block w-full py-4 bg-white border-2 border-[#8B7355] rounded-xl text-[#8B7355] font-bold hover:bg-[#8B7355] hover:text-white transition-all duration-200 text-center disabled:opacity-50"
              >
                {loadingPlan === 'monthly' ? 'Loading...' : 'Get Started Free'}
              </button>
            </div>

            {/* Annual (Highlighted) */}
            <div className="relative bg-gradient-to-b from-[#F9F7F5] to-white border-[3px] border-[#8B7355] rounded-2xl p-8 md:p-12 hover:-translate-y-2 transition-all duration-300 shadow-2xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#8B7355] to-[#A89580] text-white px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                Best Value – Save 30%
              </div>
              <h3 className="text-sm font-bold text-[#6B6B6B] uppercase tracking-wider mb-4">
                Annual
              </h3>
              <div className="mb-2">
                <span className="text-5xl md:text-6xl font-bold text-[#1A1A1A]">$59</span>
                <span className="text-lg text-[#6B6B6B]">/year</span>
              </div>
              <p className="text-sm text-[#8B7355] font-semibold mb-2">~$4.92/month</p>
              <p className="text-[#6B6B6B] leading-relaxed mb-8 min-h-[48px]">
                All features + priority support • Lock in massive savings • Commit to your best year yet
              </p>
              <button
                onClick={() => handlePlanClick('annual')}
                disabled={loadingPlan !== null}
                className="block w-full py-4 bg-gradient-to-r from-[#8B7355] to-[#A89580] border-2 border-[#8B7355] rounded-xl text-white font-bold hover:from-[#755E47] hover:to-[#93856C] transition-all duration-200 shadow-lg text-center disabled:opacity-50"
              >
                {loadingPlan === 'annual' ? 'Loading...' : 'Get Started Free – Upgrade Anytime'}
              </button>
            </div>

            {/* Lifetime */}
            <div className="relative bg-white border-2 border-[#E8E8E8] rounded-2xl p-8 md:p-12 hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#D4AF37] to-[#F4E5A1] text-[#1A1A1A] px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                Lifetime Access
              </div>
              <h3 className="text-sm font-bold text-[#6B6B6B] uppercase tracking-wider mb-4">
                One-Time Payment
              </h3>
              <div className="mb-2">
                <span className="text-5xl md:text-6xl font-bold text-[#1A1A1A]">$149</span>
                <span className="text-lg text-[#6B6B6B]">once</span>
              </div>
              <p className="text-[#6B6B6B] leading-relaxed mb-8 min-h-[48px]">
                Pay once, own it forever • All future updates included • The smartest investment for lifelong productivity
              </p>
              <button
                onClick={() => handlePlanClick('lifetime')}
                disabled={loadingPlan !== null}
                className="block w-full py-4 bg-white border-2 border-[#8B7355] rounded-xl text-[#8B7355] font-bold hover:bg-[#8B7355] hover:text-white transition-all duration-200 text-center disabled:opacity-50"
              >
                {loadingPlan === 'lifetime' ? 'Loading...' : 'Get Started Free – Upgrade to Lifetime'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section id="testimonials" className="py-24 md:py-32 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#1A1A1A] text-center mb-6 tracking-tight">
            What Users Are Saying
          </h2>
          <p className="text-center text-[#6B6B6B] text-lg mb-16">
            Real people reclaiming their focus and lives with TrueFocus.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                text: "TrueFocus completely changed my daily routine. I used to scroll for 4+ hours a day and barely finish articles. Now I hit deep focus sessions easily, wrote 3x more content, and actually feel motivated again. No more dopamine crashes!",
                author: "Sarah M.",
                role: "Freelance Writer"
              },
              {
                text: "After years of constant distractions, this app helped me break the cycle. My focused hours went from 2 to 7 per day. Deadlines? Crushed them. Life feels calmer and more accomplished. Worth every penny.",
                author: "Alex R.",
                role: "Software Engineer"
              },
              {
                text: "I was addicted to TikTok and Instagram — studying felt impossible. TrueFocus gave me the structure to study in real blocks without my phone. My grades jumped, and I have energy for hobbies now. Game-changer!",
                author: "Emily T.",
                role: "Student"
              },
              {
                text: "Scrolling was killing my business ideas. With the Focus Clock and dashboard, I built consistent habits and launched two projects in months instead of years. Productivity exploded — dopamine trap broken!",
                author: "Michael K.",
                role: "Entrepreneur"
              },
              {
                text: "TrueFocus is the only app that actually helped me stop mindless scrolling at night. I sleep better, wake up energized, and get so much more done during the day. My students noticed I'm more present too!",
                author: "Jessica L.",
                role: "Teacher"
              },
              {
                text: "From 6+ hours of wasted screen time to focused deep work — this minimalist approach works. The monthly insights show real progress. I feel in control of my time for the first time in years.",
                author: "David S.",
                role: "Remote Worker"
              }
            ].map((testimonial, i) => (
              <div key={i} className="bg-[#FAFAF8] border border-[#E8E8E8] rounded-xl p-8 hover:shadow-lg transition-shadow duration-200">
                <div className="text-[#D4AF37] text-xl mb-4">★★★★★</div>
                <p className="text-[#424242] leading-relaxed mb-5">
                  {testimonial.text}
                </p>
                <div className="font-bold text-[#1A1A1A] text-sm">
                  {testimonial.author}
                </div>
                <div className="text-[#6B6B6B] text-xs">
                  {testimonial.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 md:py-32 px-6 md:px-12 bg-gradient-to-br from-[#8B7355] to-[#A89580] text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white leading-snug mb-6 tracking-tight">
            Ready to Maximize Productivity, Kill the Scroll, and Break Free from Cheap Dopamine?
          </h2>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-12">
            Join the movement of people ditching distractions and building a life of real focus, consistent wins, and meaningful progress.<br />
            <strong>Your focused, high-achieving future is one click away.</strong>
          </p>
          <a
            href="/auth"
            className="inline-block px-12 md:px-14 py-5 bg-white rounded-xl text-[#8B7355] text-lg font-bold hover:bg-[#FAFAF8] transition-all duration-300 hover:-translate-y-1 shadow-2xl"
          >
            Start Free – No Card Needed
          </a>
        </div>
      </section>

      {/* DOWNLOAD SECTION */}
      <section id="download" className="py-24 md:py-32 px-6 md:px-12 bg-[#FAFAF8]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 tracking-tight">
            Download TrueFocus
          </h2>
          <p className="text-lg text-[#6B6B6B] mb-12">
            Take your focus with you — available on mobile devices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#"
              className="flex items-center gap-3 px-8 py-4 bg-[#1A1A1A] text-white rounded-xl font-semibold hover:bg-[#424242] transition-all duration-200 shadow-lg"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              <div className="text-left">
                <div className="text-xs">GET IT ON</div>
                <div className="text-lg font-bold">Google Play</div>
              </div>
            </a>
            <div className="text-[#9E9E9E] text-sm">
              iOS version coming soon
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 md:px-12 bg-[#1A1A1A] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="font-serif text-2xl font-bold mb-2">TrueFocus</h3>
            <p className="text-[#9E9E9E] text-sm">Reclaim your attention. Deliver what matters.</p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-[#9E9E9E]">
            <p>© 2026 TrueFocus</p>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="/landing-admin" className="text-[#6B6B6B] text-xs hover:text-[#9E9E9E] transition-colors">
              Admin
            </a>
          </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setLoadingPlan(null);
        }}
        onSuccess={() => {
          console.log('🎉 Auth successful! Callback triggered.');
          console.log('📋 Pending plan:', pendingPlan);
          console.log('💾 LocalStorage user:', localStorage.getItem('truefocus_user'));
          console.log('🔑 LocalStorage token exists:', !!localStorage.getItem('truefocus_access_token'));
          
          // Update logged user state
          const userStr = localStorage.getItem('truefocus_user');
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              setLoggedUser(user);
              console.log('✅ User state updated:', user.email);
            } catch (e) {
              console.error('Failed to parse user');
            }
          }
          
          if (pendingPlan) {
            console.log(`🚀 Calling handlePlanClick with ${pendingPlan}...`);
            handlePlanClick(pendingPlan);
            setPendingPlan(null);
          } else {
            console.warn('⚠️ No pending plan to process');
          }
        }}
        selectedPlan={pendingPlan || undefined}
      />
    </div>
  );
}