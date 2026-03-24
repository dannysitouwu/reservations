import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MainLayout from '../../src/components/MainLayout';
import { Picker } from '../../src/components/Picker';
import { Colors } from '../../src/constants/colors';
import { useSupabase } from '../../src/providers/SupabaseProvider';
import { downloadReservationPdf } from '../../src/utils/reservationPdf';
import { formatCurrency } from '../../src/utils/currency';

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
  total_amount: number | null;
  currency_code: string | null;
};

type FeedbackRow = {
  reservation_id: string;
  rating: number;
  comment: string | null;
};

type ProfileContact = {
  full_name: string | null;
  phone: string | null;
};

export default function MyReservationsPage() {
  const { client, session } = useSupabase();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { rating: number; comment: string }>>({});
  const [savingFeedbackId, setSavingFeedbackId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [profileContact, setProfileContact] = useState<ProfileContact | null>(null);

  const locale = useMemo(() => (i18n.language.startsWith('es') ? 'es-CR' : 'en-US'), [i18n.language]);
  const contactPreferenceOptions = useMemo(
    () => ({
      whatsapp: t('booking.contactPreferenceOptions.whatsapp'),
      email: t('booking.contactPreferenceOptions.email'),
      phone_call: t('booking.contactPreferenceOptions.phoneCall'),
    }),
    [t],
  );

  const fetchReservations = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!session?.user) {
        if (!opts?.silent) setLoading(false);
        return;
      }
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }

      const { data, error: fetchError } = await client
        .from('reservations_detail_view')
        .select('*')
        .eq('buyer_id', session.user.id)
        .order('created_at', { ascending: false });

      const { data: feedbackRows } = await client
        .from('reservation_feedback')
        .select('reservation_id, rating, comment')
        .eq('buyer_id', session.user.id);

      const { data: profileRow } = await client
        .from('profiles')
        .select('full_name, phone')
        .eq('id', session.user.id)
        .maybeSingle();

      if (fetchError) {
        setError(t('myReservations.error'));
        setReservations([]);
      } else {
        const rows = (data as (ReservationDetail & { buyer_archived_at?: string | null })[]) ?? [];
        setReservations(rows.filter((r) => !r.buyer_archived_at));
        const nextFeedback: Record<string, { rating: number; comment: string }> = {};
        ((feedbackRows as FeedbackRow[] | null) ?? []).forEach((row) => {
          nextFeedback[row.reservation_id] = {
            rating: Number(row.rating ?? 5),
            comment: row.comment ?? '',
          };
        });
        setFeedback(nextFeedback);
        setProfileContact((profileRow as ProfileContact | null) ?? null);
      }
      if (!opts?.silent) setLoading(false);
    },
    [client, session?.user, t],
  );

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      await fetchReservations();
    })();

    const userId = session?.user?.id;
    if (!userId) {
      return () => {
        isMounted = false;
      };
    }

    const channel = client
      .channel('my-reservations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `buyer_id=eq.${userId}`,
        },
        () => {
          if (isMounted) {
            void fetchReservations({ silent: true });
          }
        },
      );
    channel.subscribe();

    return () => {
      isMounted = false;
      void client.removeChannel(channel);
    };
  }, [client, session?.user?.id, fetchReservations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations({ silent: true });
    setRefreshing(false);
  }, [fetchReservations]);

  const cancelReservation = async (reservationId: string) => {
    if (!session?.user) return;
    setCancellingId(reservationId);
    setError(null);
    const { data, error: rpcError } = await client.rpc('client_cancel_reservation', {
      reservation_id: reservationId,
    });
    setCancellingId(null);
    if (rpcError) {
      setError(rpcError.message || (t('myReservations.cancelError') as string));
      return;
    }
    const payload = data as { success?: boolean; error?: string } | null;
    if (payload && payload.success === false) {
      setError(payload.error ?? (t('myReservations.cancelError') as string));
      return;
    }
    setReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, status: 'cancelled' } : r)));
  };

  const archiveReservation = async (reservationId: string) => {
    if (!session?.user) return;
    setError(null);
    const { error: upErr } = await client
      .from('reservations')
      .update({ buyer_archived_at: new Date().toISOString() })
      .eq('id', reservationId)
      .eq('buyer_id', session.user.id)
      .in('status', ['fulfilled', 'cancelled']);
    if (upErr) {
      setError(t('myReservations.archiveError'));
      return;
    }
    setReservations((prev) => prev.filter((r) => r.id !== reservationId));
  };

  const statusLabel = (status: string) => {
    const key = `statusLabels.${status}` as const;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  const updateFeedbackField = (reservationId: string, field: 'rating' | 'comment', value: string) => {
    setFeedback((prev) => ({
      ...prev,
      [reservationId]: {
        rating: field === 'rating' ? Number(value) : (prev[reservationId]?.rating ?? 5),
        comment: field === 'comment' ? value : (prev[reservationId]?.comment ?? ''),
      },
    }));
  };

  const submitFeedback = async (reservationId: string) => {
    if (!session?.user?.id) return;
    const payload = feedback[reservationId] ?? { rating: 5, comment: '' };
    setSavingFeedbackId(reservationId);
    const { error: saveError } = await client
      .from('reservation_feedback')
      .upsert(
        {
          reservation_id: reservationId,
          buyer_id: session.user.id,
          rating: payload.rating,
          comment: payload.comment || null,
        },
        { onConflict: 'reservation_id' },
      );
    if (saveError) {
      setError(t('myReservations.feedbackSaveError'));
    }
    setSavingFeedbackId(null);
  };

  const copyReferenceCode = async (code: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        Alert.alert(t('myReservations.copySuccessTitle'), code);
        return;
      }
    } catch {
      // Fallback below will still present the reference to the user.
    }
    Alert.alert(t('myReservations.referenceAlertTitle'), code);
  };

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={Colors.primary}
          />
        }
      >
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
              const referenceCode = r.public_reference || r.id.slice(0, 8).toUpperCase();
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
                      <Text style={styles.cardRef}>{t('myReservations.reference', { code: referenceCode })}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{statusLabel(r.status)}</Text>
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
                    <View style={styles.cardGridItem}>
                      <Text style={styles.cardGridLabel}>{t('myReservations.totalLabel')}</Text>
                      <Text style={styles.cardGridValue}>
                        {r.total_amount != null
                          ? formatCurrency(r.total_amount / 100, r.currency_code ?? 'USD', locale)
                          : '—'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>{t('myReservations.notes')}</Text>
                    <Text style={styles.notesText}>
                      {r.notes?.trim() ? r.notes : t('myReservations.notesEmpty')}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.trackBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('myReservations.trackStatus')}
                      onPress={() => router.push(`/reservations/status?ref=${referenceCode}` as any)}
                    >
                      <Text style={styles.trackBtnText}>{t('myReservations.trackStatus')}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.trackBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('myReservations.copyCode')}
                      onPress={() => {
                        void copyReferenceCode(referenceCode);
                      }}
                    >
                      <Text style={styles.trackBtnText}>{t('myReservations.copyCode')}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.trackBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('myReservations.pdf')}
                      onPress={() => {
                        const ok = downloadReservationPdf({
                          reference: referenceCode,
                          optionName: r.service_name,
                          fullName: profileContact?.full_name ?? '',
                          phone: profileContact?.phone ?? '',
                          scheduledDate,
                          scheduledTime: '',
                          partySize: r.party_size ? String(r.party_size) : '',
                          contactPreference: contactLabel,
                          notes: r.notes ?? '',
                        });
                        if (!ok) {
                          Alert.alert(t('booking.flow.pdfAlertTitle'), t('booking.flow.pdfWebOnly'));
                        }
                      }}
                    >
                      <Text style={styles.trackBtnText}>{t('myReservations.pdf')}</Text>
                    </Pressable>
                    {(r.status === 'pending' || r.status === 'paid') && (
                      <Pressable
                        style={[styles.trackBtn, styles.cancelBtn]}
                        disabled={cancellingId === r.id}
                        onPress={() => void cancelReservation(r.id)}
                      >
                        <Text style={styles.trackBtnText}>
                          {cancellingId === r.id ? t('myReservations.cancelling') : t('myReservations.cancel')}
                        </Text>
                      </Pressable>
                    )}
                    {(r.status === 'fulfilled' || r.status === 'cancelled') && (
                      <Pressable
                        style={[styles.trackBtn, styles.deleteBtnz]}
                        accessibilityLabel={t('myReservations.archiveAction')}
                        onPress={() => void archiveReservation(r.id)}
                      >
                        <Text style={styles.trackBtnText}>🗑️</Text>
                      </Pressable>
                    )}
                  </View>

                  {r.status === 'fulfilled' ? (
                    <View style={styles.feedbackBox}>
                      <Text style={styles.feedbackTitle}>{t('myReservations.feedbackTitle')}</Text>
                      <View style={styles.feedbackRow}>
                        <Picker
                          value={String(feedback[r.id]?.rating ?? 5)}
                          onValueChange={(v) => updateFeedbackField(r.id, 'rating', v)}
                          items={[5, 4, 3, 2, 1].map((score) => ({
                            label: t('myReservations.starsCount', { count: score }),
                            value: String(score),
                          }))}
                        />
                        <TextInput
                          style={styles.feedbackInput}
                          value={feedback[r.id]?.comment ?? ''}
                          onChangeText={(v) => updateFeedbackField(r.id, 'comment', v)}
                          placeholder={t('myReservations.commentPlaceholder') as string}
                          placeholderTextColor={Colors.white40}
                          multiline
                        />
                      </View>
                      <Pressable
                        style={[styles.trackBtn, savingFeedbackId === r.id && styles.trackBtnDisabled]}
                        onPress={() => submitFeedback(r.id)}
                        disabled={savingFeedbackId === r.id}
                      >
                        <Text style={styles.trackBtnText}>
                          {savingFeedbackId === r.id
                            ? t('myReservations.savingFeedback')
                            : t('myReservations.saveFeedback')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.feedbackPendingBox}>
                      <Text style={styles.feedbackPendingText}>{t('myReservations.feedbackPending')}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingVertical: 32, paddingBottom: 48 },
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
  cardActions: { marginTop: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trackBtn: {
    borderWidth: 1,
    borderColor: Colors.white20,
    borderRadius: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  trackBtnText: { color: Colors.white80, fontSize: 12, fontWeight: '600' },
  trackBtnDisabled: { opacity: 0.6 },
  cancelBtn: { borderColor: 'rgba(253,164,175,0.45)' },
  deleteBtnz: { borderColor: '#008000' },
  feedbackBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.white15,
    borderRadius: 16,
    backgroundColor: Colors.white05,
    padding: 12,
    gap: 8,
  },
  feedbackTitle: { color: Colors.white90, fontSize: 13, fontWeight: '600' },
  feedbackRow: { gap: 8 },
  feedbackInput: {
    borderWidth: 1,
    borderColor: Colors.white15,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    backgroundColor: 'rgba(2,44,34,0.5)',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  feedbackPendingBox: {
    borderWidth: 1,
    borderColor: Colors.white10,
    borderRadius: 12,
    backgroundColor: Colors.white05,
    padding: 10,
  },
  feedbackPendingText: { color: Colors.white50, fontSize: 12 },
});
