import { loadStripe, type StripeElements } from '@stripe/stripe-js';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '../constants/colors';
import { getSupabaseProjectUrl } from '../lib/supabaseUrl';

type Labels = {
  title: string;
  pay: string;
  paying: string;
  dismiss: string;
  errorPrefix: string;
};

export function StripeCardPayment(props: {
  reservationId: string;
  accessToken: string;
  onPaid: () => void;
  onDismiss: () => void;
  labels: Labels;
}) {
  const { reservationId, accessToken, onPaid, onDismiss, labels } = props;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const stripeRef = useRef<Awaited<ReturnType<typeof loadStripe>> | null>(null);
  const paymentMountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    paymentMountedRef.current = false;
    setLoading(true);
    setError(null);
    setClientSecret(null);
    setPublishableKey(null);
    setReady(false);
    elementsRef.current = null;
    stripeRef.current = null;

    const run = async () => {
      const base = getSupabaseProjectUrl();
      if (!base) {
        setError('Missing Supabase URL');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${base.replace(/\/$/, '')}/functions/v1/stripe-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
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
          setError(json.error ?? 'Could not start payment');
          setLoading(false);
          return;
        }
        const pk = json.publishable_key;
        const cs = json.client_secret;
        if (!pk || !cs) {
          setError(json.error ?? 'Stripe is not configured');
          setLoading(false);
          return;
        }
        setPublishableKey(pk);
        setClientSecret(cs);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Payment setup failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [reservationId, accessToken]);

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
          theme: 'night',
          variables: {
            colorPrimary: Colors.primary,
            colorBackground: Colors.background,
            colorText: Colors.foreground,
            borderRadius: '10px',
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
    setError(null);
    try {
      const base = getSupabaseProjectUrl();
      if (!base) throw new Error('Missing Supabase URL');

      const { error: submitErr } = await elements.submit();
      if (submitErr) {
        setError(submitErr.message ?? 'Could not submit payment form');
        setSubmitting(false);
        return;
      }

      const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? window.location.href : undefined,
        },
        redirect: 'if_required',
      });

      if (confirmErr) {
        setError(confirmErr.message ?? 'Payment confirmation failed');
        setSubmitting(false);
        return;
      }

      const piid = paymentIntent?.id;
      if (!piid) {
        setError('No payment intent');
        setSubmitting(false);
        return;
      }

      const syncRes = await fetch(`${base.replace(/\/$/, '')}/functions/v1/stripe-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'sync-intent', payment_intent_id: piid }),
      });
      const syncJson = (await syncRes.json()) as { error?: string };
      if (!syncRes.ok || syncJson.error) {
        setError(syncJson.error ?? 'Could not finalize payment');
        setSubmitting(false);
        return;
      }

      onPaid();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, onPaid]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{labels.title}</Text>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
      ) : null}
      {error ? (
        <Text style={styles.err}>
          {labels.errorPrefix} {error}
        </Text>
      ) : null}
      {React.createElement('div', {
        ref: (el: HTMLDivElement | null) => {
          mountRef.current = el;
        },
        style: { minHeight: 120, marginBottom: 12 },
      })}
      {ready ? (
        <Pressable
          style={[styles.btn, submitting && styles.btnDisabled]}
          onPress={() => void handlePay()}
          disabled={submitting}
        >
          <Text style={styles.btnText}>{submitting ? labels.paying : labels.pay}</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.ghost} onPress={onDismiss} disabled={submitting}>
        <Text style={styles.ghostText}>{labels.dismiss}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.white10,
    borderWidth: 1,
    borderColor: Colors.white15,
  },
  title: {
    color: Colors.foreground,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  err: {
    color: Colors.rose300,
    fontSize: 13,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghost: { marginTop: 10, paddingVertical: 8, alignItems: 'center' },
  ghostText: { color: Colors.white60, fontSize: 14 },
});
