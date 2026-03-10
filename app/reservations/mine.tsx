import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MainLayout from '../../src/components/MainLayout';
import { Colors } from '../../src/constants/colors';
import { useSupabase } from '../../src/providers/SupabaseProvider';

type ReservationDetail = {
  id: string;
  public_reference: string;
  status: string;
  scheduled_for: string | null;
  created_at: string;
  notes: string | null;
  service_name: string;
  duration_minutes: number;
  contact_preference: string | null;
  party_size: number | null;
};

export default function MyReservationsPage() {
  const { client, session } = useSupabase();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = useMemo(() => (i18n.language.startsWith('es') ? 'es-CR' : 'en-US'), [i18n.language]);
  const contactPreferenceOptions = useMemo(
    () => ({
      whatsapp: t('booking.contactPreferenceOptions.whatsapp'),
      email: t('booking.contactPreferenceOptions.email'),
      phone_call: t('booking.contactPreferenceOptions.phoneCall'),
    }),
    [t],
  );

  useEffect(() => {
    let isMounted = true;
    const fetchReservations = async () => {
      if (!session?.user) { setLoading(false); return; }
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await client
        .from('reservations_detail_view')
        .select('*')
        .eq('buyer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;
      if (fetchError) {
        setError(t('myReservations.error'));
        setReservations([]);
      } else {
        setReservations((data as ReservationDetail[]) ?? []);
      }
      setLoading(false);
    };
    fetchReservations();
    return () => { isMounted = false; };
  }, [client, session?.user, t]);

  if (!session) {
    return (
      <MainLayout>
        <View style={styles.centeredContainer}>
          <Text style={styles.title}>{t('myReservations.signInTitle')}</Text>
          <Text style={styles.desc}>{t('myReservations.signInDescription')}</Text>
          <Pressable style={styles.btnGhost} onPress={() => router.push('/auth')}>
            <Text style={styles.btnGhostText}>{t('myReservations.signInCta')}</Text>
          </Pressable>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <View style={styles.container}>
        <Text style={styles.title}>{t('myReservations.title')}</Text>
        <Text style={styles.desc}>{t('myReservations.description')}</Text>

        {loading ? (
          <View style={styles.statusBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.statusText}>{t('myReservations.loading')}</Text>
          </View>
        ) : error ? (
          <View style={[styles.statusBox, styles.errorBox]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : reservations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{t('myReservations.emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('myReservations.emptyDescription')}</Text>
            <Pressable style={styles.btnGhost} onPress={() => router.push('/reservations/new')}>
              <Text style={styles.btnGhostText}>{t('myReservations.emptyCta')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {reservations.map((r) => {
              const scheduledDate = r.scheduled_for
                ? new Date(r.scheduled_for).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
                : t('myReservations.unscheduled');
              const createdAt = new Date(r.created_at).toLocaleDateString(locale, { dateStyle: 'medium' });
              const contactLabel = r.contact_preference
                ? contactPreferenceOptions[r.contact_preference as keyof typeof contactPreferenceOptions] ?? t('myReservations.contactPreferenceNone')
                : t('myReservations.contactPreferenceNone');

              return (
                <View key={r.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.cardTitle}>{r.service_name ?? t('myReservations.unnamedExperience')}</Text>
                      <Text style={styles.cardRef}>{t('myReservations.reference', { code: r.public_reference })}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{t(`statusLabels.${r.status}` as const)}</Text>
                    </View>
                  </View>

                  <View style={styles.cardGrid}>
                    <View style={styles.cardGridItem}>
                      <Text style={styles.cardGridLabel}>{t('myReservations.scheduledFor')}</Text>
                      <Text style={styles.cardGridValue}>{scheduledDate}</Text>
                    </View>
                    <View style={styles.cardGridItem}>
                      <Text style={styles.cardGridLabel}>{t('myReservations.createdAt')}</Text>
                      <Text style={styles.cardGridValue}>{createdAt}</Text>
                    </View>
                    <View style={styles.cardGridItem}>
                      <Text style={styles.cardGridLabel}>{t('myReservations.partySize')}</Text>
                      <Text style={styles.cardGridValue}>
                        {r.party_size ? t('myReservations.partySizeValue', { count: r.party_size }) : '—'}
                      </Text>
                    </View>
                    <View style={styles.cardGridItem}>
                      <Text style={styles.cardGridLabel}>{t('myReservations.contactPreference')}</Text>
                      <Text style={styles.cardGridValue}>{contactLabel}</Text>
                    </View>
                  </View>

                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>{t('myReservations.notes')}</Text>
                    <Text style={styles.notesText}>
                      {r.notes?.trim() ? r.notes : t('myReservations.notesEmpty')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 32 },
  centeredContainer: { paddingHorizontal: 20, paddingVertical: 48, alignItems: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  desc: { color: Colors.white70, fontSize: 15, lineHeight: 22, marginBottom: 24 },
  btnGhost: {
    borderWidth: 1,
    borderColor: Colors.white20,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  btnGhostText: { color: '#fff', fontWeight: '600', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' },
  statusBox: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white05,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  statusText: { color: Colors.white60, fontSize: 14 },
  errorBox: { borderColor: 'rgba(253,164,175,0.3)', backgroundColor: 'rgba(253,164,175,0.1)' },
  errorText: { color: '#fecdd3', fontSize: 14 },
  emptyBox: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white05,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptyDesc: { color: Colors.white60, fontSize: 14, marginTop: 8, textAlign: 'center' },
  list: { gap: 20 },
  card: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white10,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTopLeft: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  cardRef: { color: Colors.white60, fontSize: 13, marginTop: 2 },
  statusBadge: {
    borderWidth: 1,
    borderColor: Colors.white20,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { color: Colors.white80, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  cardGridItem: { minWidth: '40%' },
  cardGridLabel: { color: Colors.white80, fontSize: 13, fontWeight: '600' },
  cardGridValue: { color: Colors.white70, fontSize: 13, marginTop: 2 },
  notesBox: {
    borderWidth: 1,
    borderColor: Colors.white15,
    borderStyle: 'dashed',
    backgroundColor: Colors.white05,
    borderRadius: 16,
    padding: 14,
  },
  notesLabel: { color: Colors.white80, fontSize: 13, fontWeight: '600' },
  notesText: { color: Colors.white70, fontSize: 13, marginTop: 6 },
});
