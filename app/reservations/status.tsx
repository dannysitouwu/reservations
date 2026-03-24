import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MainLayout from '../../src/components/MainLayout';
import { Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabaseClient';
import { ReservationStatus } from '../../src/types/reservation';

type ReservationSearchResult = {
  id: string;
  public_reference: string;
  status: ReservationStatus;
  scheduled_for: string | null;
  service_name: string;
  assigned_worker_name: string | null;
  buyer_name: string | null;
  contact_preference: string | null;
  party_size: number | null;
};

export default function ReservationStatusPage() {
  const { t } = useTranslation();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const [reference, setReference] = useState((ref ?? '').toUpperCase());
  const [result, setResult] = useState<ReservationSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const contactPreferenceOptions = useMemo(
    () => ({
      whatsapp: t('booking.contactPreferenceOptions.whatsapp'),
      email: t('booking.contactPreferenceOptions.email'),
      phone_call: t('booking.contactPreferenceOptions.phoneCall'),
    }),
    [t],
  );

  const handleSubmit = async () => {
    if (!reference) { setError(t('statusPage.errors.empty')); return; }
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('public_find_reservation_by_reference', {
      reference_code: reference,
    });

    if (rpcError) {
      setError(t('statusPage.errors.generic'));
      setResult(null);
    } else {
      const record = Array.isArray(data) ? (data[0] as ReservationSearchResult | undefined) : (data as ReservationSearchResult | null);
      if (!record) {
        setError(t('statusPage.noResult'));
        setResult(null);
      } else {
        setResult(record);
      }
    }
    setLoading(false);
  };

  return (
    <MainLayout>
      <View style={styles.container}>
        <Text style={styles.title}>{t('statusPage.title')}</Text>
        <Text style={styles.desc}>{t('statusPage.description')}</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={reference}
            onChangeText={(v) => setReference(v.toUpperCase())}
            placeholder={t('statusPage.placeholder') as string}
            placeholderTextColor={Colors.white40}
            autoCapitalize="characters"
          />
          <Pressable
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('statusPage.search')}</Text>
            )}
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{result.service_name}</Text>
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>{t('statusPage.labels.status')}</Text>
                <Text style={styles.resultValue}>{t(`statusLabels.${result.status}` as const)}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>{t('statusPage.labels.scheduled')}</Text>
                <Text style={styles.resultValue}>
                  {result.scheduled_for
                    ? new Date(result.scheduled_for).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                    : t('statusPage.unscheduled')}
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>{t('statusPage.labels.Empleado')}</Text>
                <Text style={styles.resultValue}>{result.assigned_worker_name ?? '—'}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>{t('statusPage.labels.reference')}</Text>
                <Text style={styles.resultValue}>{result.public_reference}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>{t('statusPage.labels.guest')}</Text>
                <Text style={styles.resultValue}>{result.buyer_name ?? '—'}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>{t('statusPage.labels.partySize')}</Text>
                <Text style={styles.resultValue}>
                  {typeof result.party_size === 'number'
                    ? t('statusPage.partySizeValue', { count: result.party_size })
                    : t('statusPage.partySizeUnknown')}
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>{t('statusPage.labels.contactPreference')}</Text>
                <Text style={styles.resultValue}>
                  {result.contact_preference
                    ? contactPreferenceOptions[result.contact_preference as keyof typeof contactPreferenceOptions] ?? result.contact_preference
                    : t('statusPage.contactPreferenceNone')}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 32 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  desc: { color: Colors.white70, fontSize: 15, textAlign: 'center', marginBottom: 24 },
  searchRow: { gap: 12, marginBottom: 16 },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.white20,
    backgroundColor: 'rgba(2,44,34,0.6)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 14,
    color: '#fff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  error: { color: Colors.rose300, fontSize: 13, marginTop: 8 },
  resultCard: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white10,
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  resultTitle: { color: '#fff', fontSize: 22, fontWeight: '600' },
  resultGrid: { gap: 16 },
  resultItem: {},
  resultLabel: { color: Colors.white50, fontSize: 13 },
  resultValue: { color: '#fff', fontSize: 17, fontWeight: '600', marginTop: 2 },
});
