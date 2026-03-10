import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MainLayout from '../../src/components/MainLayout';
import { Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabaseClient';
import { formatCurrency } from '../../src/utils/currency';

type ReservationOption = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  base_price: number;
  currency_code?: string | null;
  image_url?: string | null;
  service_name?: string | null;
};

export default function ReservationOptionsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [options, setOptions] = useState<ReservationOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      const { data } = await supabase.from('service_options_view').select('*').order('name');
      setOptions((data as ReservationOption[] | null) ?? []);
      setLoading(false);
    };
    fetchOptions();
  }, []);

  const locale = i18n.language === 'es' ? 'es-CR' : 'en-US';

  if (loading) {
    return (
      <MainLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>{t('options.loading')}</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('options.eyebrow')}</Text>
        </View>
        <Text style={styles.title}>{t('options.title')}</Text>
        <Text style={styles.desc}>{t('options.description')}</Text>

        <View style={styles.grid}>
          {options.map((option) => (
            <Pressable
              key={option.id}
              style={styles.card}
              onPress={() => router.push(`/reservations/new?optionId=${option.id}`)}
            >
              {option.image_url ? (
                <Image source={{ uri: option.image_url }} style={styles.cardImage} />
              ) : null}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardTitle}>{option.name}</Text>
                  {option.description ? (
                    <Text style={styles.cardDesc}>{option.description}</Text>
                  ) : null}
                </View>
                <View style={styles.curatedBadge}>
                  <Text style={styles.curatedText}>{option.service_name ?? ''}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statLabel}>
                    {i18n.language === 'es' ? 'Duración' : 'Duration'}
                  </Text>
                  <Text style={styles.statValue}>{option.duration_minutes} min</Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>
                    {i18n.language === 'es' ? 'Inversión desde' : 'Starting investment'}
                  </Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(option.base_price, option.currency_code ?? 'CRC', locale)}
                  </Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.bookText}>
                  {i18n.language === 'es' ? 'Reservar ahora →' : 'Book now →'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: Colors.white70, marginTop: 12, fontSize: 14 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white10,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  badgeText: { color: Colors.white90, fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8, lineHeight: 34 },
  desc: { color: Colors.white70, fontSize: 16, lineHeight: 24, marginBottom: 28 },
  grid: { gap: 20 },
  card: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white05,
    borderRadius: 24,
    overflow: 'hidden',
    gap: 0,
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 24, paddingTop: 20 },
  cardHeaderLeft: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '600' },
  cardDesc: { color: Colors.white70, fontSize: 14, lineHeight: 22, marginTop: 6 },
  curatedBadge: {
    borderWidth: 1,
    borderColor: Colors.white20,
    backgroundColor: Colors.white10,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  curatedText: { color: Colors.white60, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', gap: 32, paddingHorizontal: 24, paddingTop: 16 },
  statLabel: { color: Colors.white50, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  statValue: { color: '#fff', fontSize: 18, marginTop: 4 },
  cardFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.white10,
    marginTop: 16,
  },
  bookText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
