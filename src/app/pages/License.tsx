import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '../components/StripePaymentForm';
import { translations } from '../utils/translations';

export function License() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, license, accessStatus, refreshLicense, settings } = useApp();
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<{
    plan: 'monthly' | 'annual' | 'lifetime';
    clientSecret: string;
    publishableKey: string;
  } | null>(null);
  
  const t = translations[settings.language];
  
  // Use the currently deployed Edge Function
  const activeEndpoint = 'make-server-41f917a5';

  console.log('💳 License page rendering with:', {
    user: user?.email,
    license,
    accessStatus,
    hasAccess: accessStatus.hasAccess,
    licenseType: accessStatus.licenseType,
    daysRemaining: accessStatus.daysRemaining
  });

  // Memoize Stripe promise to prevent recreation
  const stripePromise = useMemo(() => {
    if (paymentState?.publishableKey) {
      return loadStripe(paymentState.publishableKey);
    }
    return null;
  }, [paymentState?.publishableKey]);

  // Check for payment success/cancel in URL
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const plan = searchParams.get('plan');
    
    if (paymentStatus === 'success') {
      toast.success(`Payment successful! Your ${plan || ''} plan is now active.`);
      refreshLicense();
      // Clear URL params
      window.history.replaceState({}, '', '/license');
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled. You can try again anytime.');
      // Clear URL params
      window.history.replaceState({}, '', '/license');
    }
  }, [searchParams, refreshLicense]);

  const handlePurchase = async (plan: 'monthly' | 'annual' | 'lifetime') => {
    try {
      console.log('🛒 Starting purchase flow for plan:', plan);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionError,
        user: session?.user?.email
      });
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Error getting session. Please login again.');
        return;
      }
      
      if (!session?.access_token) {
        console.error('❌ No access token available');
        console.log('🔄 Redirecting to login...');
        toast.error('Please login to continue');
        navigate('/auth');
        return;
      }

      console.log('✅ Access token available:', session.access_token.substring(0, 30) + '...');

      setLoading(plan);
      
      console.log('💳 Calling backend to create payment intent...');
      
      // Call backend to create Payment Intent (for inline drawer)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${activeEndpoint}/stripe/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            plan,
            userToken: session.access_token
          })
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error response:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.details || 'Unknown server error');
        } catch (parseError) {
          throw new Error(`Server error (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ Backend response:', data);

      const { clientSecret, publishableKey } = data;

      if (!clientSecret || !publishableKey) {
        throw new Error('Missing clientSecret or publishableKey from server');
      }

      // Set payment state to show drawer with Stripe Payment Element
      setPaymentState({ plan, clientSecret, publishableKey });

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Error processing payment');
    } finally {
      setLoading(null);
    }
  };

  const handlePaymentSuccess = async () => {
    console.log('✅ Payment successful!');
    toast.success('Payment processed successfully!');
    
    // Refresh license
    await refreshLicense();
    
    // Close payment modal
    setPaymentState(null);
    
    // Navigate to home
    setTimeout(() => {
      navigate('/home');
    }, 1500);
  };

  const handlePaymentCancel = () => {
    setPaymentState(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F5] pb-32">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#FAFAF8]/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#E8E8E8] dark:border-[#2A2A2A]">
        <div className="max-w-[800px] mx-auto px-5 md:px-10 py-10">
          <div className="flex items-center gap-4">
            {/* Only show back button if user has access */}
            {accessStatus.hasAccess && (
              <button
                onClick={() => navigate('/home')}
                className="p-2 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <h1 className="font-serif text-2xl font-light">{t.licenseTitle}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-5 md:px-10 pt-[100px]">
        {/* Status Box */}
        <div className="bg-white dark:bg-[#151515] border-2 border-[#E8E8E8] dark:border-[#2A2A2A] rounded-2xl p-6 mb-8">
          <h2 className="font-serif text-xl font-light mb-4">{t.licenseStatus}</h2>
          
          {accessStatus.licenseType === 'trial' && accessStatus.hasAccess && (
            <div className="space-y-3">
              <p className="text-lg font-semibold">{t.trialPeriod}</p>
              <p className="text-2xl font-light">{accessStatus.daysRemaining} {t.daysRemaining}</p>
              <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                {t.afterTrial}
              </p>
            </div>
          )}

          {accessStatus.licenseType === 'trial' && !accessStatus.hasAccess && (
            <div className="space-y-3">
              <p className="text-lg font-semibold text-[#8B7355]">{t.trialExpired}</p>
              <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                {t.chooseBelow}
              </p>
            </div>
          )}

          {accessStatus.licenseType === 'lifetime' && (
            <div className="space-y-3">
              <p className="text-lg font-semibold">{t.lifetimeActive}</p>
              <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                {t.permanentAccess}
              </p>
            </div>
          )}

          {(accessStatus.licenseType === 'monthly' || accessStatus.licenseType === 'annual') && accessStatus.hasAccess && (
            <div className="space-y-3">
              <p className="text-lg font-semibold">{accessStatus.licenseType === 'monthly' ? t.monthlyActive : t.annualActive}</p>
              <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                {t.autoRenewal}
              </p>
            </div>
          )}
        </div>

        {/* Plans */}
        {accessStatus.licenseType !== 'lifetime' && (
          <div className="space-y-6">
            <h2 className="font-serif text-xl font-light">{t.choosePlan}</h2>

            {/* LIFETIME - POPULAR */}
            <div className="relative bg-white dark:bg-[#151515] border-2 border-[#8B7355] rounded-2xl p-6 shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-[#8B7355] to-[#A89580] text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-md uppercase tracking-wide">
                  {t.foundersChoice}
                </span>
              </div>

              <div className="mt-2 space-y-4">
                <h3 className="font-serif text-2xl font-light">{t.lifetime}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-light">{t.lifetimePrice}</span>
                  <span className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.oneTime}</span>
                </div>

                <div className="space-y-2.5 text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                  <p>{t.lifetimeDesc}</p>
                  <p>{t.allUpdates}</p>
                  <p>{t.prioritySupport}</p>
                </div>

                <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] pt-2 border-t border-[#E8E8E8] dark:border-[#2A2A2A]">
                  {t.equivalent2Years}
                </p>

                <button
                  onClick={() => handlePurchase('lifetime')}
                  disabled={loading === 'lifetime'}
                  className="w-full bg-[#8B7355] hover:bg-[#6d5c47] text-white py-4 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'lifetime' ? t.processing : t.selectLifetime}
                </button>
              </div>
            </div>

            {/* ANNUAL */}
            <div className="relative bg-white dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-2xl p-6">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-md uppercase tracking-wide whitespace-nowrap">
                  {t.bestValue}
                </span>
              </div>

              <div className="mt-2 space-y-4">
                <h3 className="font-serif text-2xl font-light">{t.yearly}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-light">{t.yearlyPrice}</span>
                  <span className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.perYear}</span>
                </div>

                <div className="space-y-2.5 text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                  <p>{settings.language === 'en' ? '$4.91 per month — significant savings' : '$4.91 por mês — economia significativa'}</p>
                  <p>{settings.language === 'en' ? 'Annual automatic renewal' : 'Renovação automática anual'}</p>
                  <p>{t.cancelAnytime}</p>
                </div>

                <button
                  onClick={() => handlePurchase('annual')}
                  disabled={loading === 'annual'}
                  className="w-full bg-[#A89580] hover:bg-[#8B7355] text-white py-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'annual' ? t.processing : t.selectAnnual}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Drawer - Slides from bottom */}
      {paymentState && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 z-50 animate-in fade-in duration-200"
            onClick={handlePaymentCancel}
          />
          
          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="bg-white dark:bg-[#0A0A0A] rounded-t-3xl shadow-2xl max-w-[600px] mx-auto max-h-[90vh] min-h-[600px] flex flex-col">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                <div className="w-12 h-1.5 bg-[#E8E8E8] dark:bg-[#2A2A2A] rounded-full" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 pb-4 border-b border-[#E8E8E8] dark:border-[#2A2A2A] flex-shrink-0">
                <h2 className="font-serif text-2xl font-light">{t.payment}</h2>
                <button
                  onClick={handlePaymentCancel}
                  className="p-2 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content - with proper scrolling and bottom padding */}
              <div className="px-6 py-6 pb-8 overflow-y-auto flex-1">
                {!stripePromise && (
                  <div className="text-center py-8">
                    <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">Loading Stripe...</p>
                  </div>
                )}
                
                {stripePromise && paymentState.clientSecret && (
                  <Elements 
                    stripe={stripePromise} 
                    options={{ 
                      clientSecret: paymentState.clientSecret,
                      locale: 'en'
                    }}
                  >
                    <StripePaymentForm
                      plan={paymentState.plan}
                      onSuccess={handlePaymentSuccess}
                      onCancel={handlePaymentCancel}
                    />
                  </Elements>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
