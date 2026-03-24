import { loadStripe, type StripeElements } from '@stripe/stripe-js';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '../lib/supabaseClient';

type Props = {
  reservationId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
};

const functionsBase = () => {
  const u = import.meta.env.VITE_SUPABASE_URL as string;
  return `${u.replace(/\/$/, '')}/functions/v1`;
};

export function AdminStripeCardPayment({ reservationId, onSuccess, onError }: Props) {
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  onErrorRef.current = onError;
  onSuccessRef.current = onSuccess;

  const mountRef = useRef<HTMLDivElement | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const stripeRef = useRef<Awaited<ReturnType<typeof loadStripe>> | null>(null);
  const paymentMountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    paymentMountedRef.current = false;
    setLoading(true);
    setClientSecret(null);
    setPublishableKey(null);
    setReady(false);
    elementsRef.current = null;
    stripeRef.current = null;

    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        onErrorRef.current('Sesión no válida. Vuelve a iniciar sesión.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${functionsBase()}/stripe-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'create-intent', reservation_id: reservationId }),
        });
        const json = (await res.json()) as {
          client_secret?: string;
          publishable_key?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          onErrorRef.current(
            json.error ?? 'No se pudo iniciar el pago con Stripe (¿Edge Function y secretos configurados?)',
          );
          setLoading(false);
          return;
        }
        const pk = json.publishable_key?.trim();
        const cs = json.client_secret;
        if (!pk || !cs) {
          onErrorRef.current(
            json.error ??
              'Falta STRIPE_PUBLISHABLE_KEY o STRIPE_SECRET_KEY en la Edge Function. Revisa el panel de Supabase.',
          );
          setLoading(false);
          return;
        }
        setPublishableKey(pk);
        setClientSecret(cs);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Error al contactar Stripe';
          const hint =
            msg === 'Failed to fetch'
              ? ' (revisa VITE_SUPABASE_URL, que la función stripe-payment esté desplegada en ese proyecto y la red/CORS)'
              : '';
          onErrorRef.current(`${msg}${hint}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  useLayoutEffect(() => {
    if (!clientSecret || !publishableKey || !mountRef.current || paymentMountedRef.current) {
      return;
    }

    let cancelled = false;
    paymentMountedRef.current = true;

    void (async () => {
      const stripe = await loadStripe(publishableKey);
      if (cancelled || !stripe || !mountRef.current) return;
      stripeRef.current = stripe;
      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#4f46e5',
            borderRadius: '8px',
          },
        },
      });
      elementsRef.current = elements;
      const payment = elements.create('payment', { layout: 'tabs' });
      payment.mount(mountRef.current);
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      paymentMountedRef.current = false;
    };
  }, [clientSecret, publishableKey]);

  const handlePay = useCallback(async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      onErrorRef.current('Sesión expirada.');
      setSubmitting(false);
      return;
    }
    try {
      const { error: submitErr } = await elements.submit();
      if (submitErr) {
        onErrorRef.current(submitErr.message ?? 'Revisa los datos de la tarjeta.');
        setSubmitting(false);
        return;
      }

      const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (confirmErr) {
        onErrorRef.current(confirmErr.message ?? 'El pago no se completó.');
        setSubmitting(false);
        return;
      }

      const piid = paymentIntent?.id;
      if (!piid) {
        onErrorRef.current('No se recibió el PaymentIntent.');
        setSubmitting(false);
        return;
      }

      const syncRes = await fetch(`${functionsBase()}/stripe-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'sync-intent', payment_intent_id: piid }),
      });
      const syncJson = (await syncRes.json()) as { error?: string };
      if (!syncRes.ok || syncJson.error) {
        onErrorRef.current(syncJson.error ?? 'No se pudo registrar el pago en el sistema.');
        setSubmitting(false);
        return;
      }

      onSuccessRef.current();
    } catch (e) {
      onErrorRef.current(e instanceof Error ? e.message : 'Error en el pago');
    } finally {
      setSubmitting(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparando formulario de pago…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
      <p className="text-sm font-medium text-slate-900">Pago con tarjeta (Stripe)</p>
      <p className="text-xs text-slate-600">
        Modo prueba: usa por ejemplo 4242 4242 4242 4242, fecha futura y CVC cualquiera.
      </p>
      <div ref={mountRef} className="min-h-[120px] rounded-md bg-white p-2 border border-slate-200" />
      {ready ? (
        <Button
          type="button"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={submitting}
          onClick={() => void handlePay()}
        >
          {submitting ? 'Procesando…' : 'Cobrar con tarjeta'}
        </Button>
      ) : null}
    </div>
  );
}
