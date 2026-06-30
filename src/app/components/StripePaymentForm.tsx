import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../utils/translations';

interface StripePaymentFormProps {
  plan: 'monthly' | 'annual' | 'lifetime';
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripePaymentForm({ plan, onSuccess, onCancel }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { settings } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const t = translations[settings.language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    console.log('💳 Submitting payment...');

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/license?success=true',
      },
      redirect: 'if_required',
    });

    if (submitError) {
      console.error('❌ Payment error:', submitError);
      setError(submitError.message || 'Error processing payment');
      setLoading(false);
    } else {
      console.log('✅ Payment successful!');
      onSuccess();
    }
  };

  const getPlanDetails = () => {
    switch (plan) {
      case 'lifetime': return { name: t.lifetime, price: `${t.lifetimePrice} ${t.oneTime}`, emoji: '💎' };
      case 'annual': return { name: t.yearly, price: `${t.yearlyPrice} ${t.perYear}`, emoji: '📅' };
      case 'monthly': return { name: t.monthly, price: `${t.monthlyPrice} ${t.perMonth}`, emoji: '📋' };
    }
  };

  const details = getPlanDetails();

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-4">
      {/* Plan Summary */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E8] dark:border-[#2A2A2A]">
        <div>
          <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.currentPlan}</p>
          <p className="text-lg font-semibold">{details.emoji} {details.name}</p>
        </div>
        <p className="text-xl font-light">{details.price}</p>
      </div>

      {/* Payment Element - Simplified */}
      <div className="min-h-[200px]">
        <PaymentElement 
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            fields: {
              billingDetails: {
                email: 'never',
                address: 'never',
              }
            }
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 pb-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-6 py-4 border border-[#E8E8E8] dark:border-[#2A2A2A] text-[#1A1A1A] dark:text-[#F5F5F5] rounded-xl hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] transition-colors disabled:opacity-50 font-medium"
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 px-6 py-4 bg-[#8B7355] hover:bg-[#6d5c47] text-white rounded-xl transition-colors disabled:opacity-50 font-semibold"
        >
          {loading ? t.processing : t.payment}
        </button>
      </div>
    </form>
  );
}