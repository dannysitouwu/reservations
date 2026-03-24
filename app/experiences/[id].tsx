import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MainLayout from '../../src/components/MainLayout';
import { Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabaseClient';
import { formatCurrency } from '../../src/utils/currency';

type DetailPayload = {
  option?: {
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    base_price: number;
    currency_code: string;
    image_url: string | null;
    gallery: unknown;
  };
  service?: {
    name: string;
    description: string | null;
    location_label: string | null;
    category_label: string | null;
  };
  availability?: { weekday: number; start_time: string; end_time: string; capacity: number }[];
  reviews?: { rating: number; comment: string | null; created_at: string }[];
  rating_summary?: { average: number; count: number };
};

export default function ExperienceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { width: winW } = useWindowDimensions();
  const width =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? Math.min(window.innerWidth, winW)
      : winW;
  const router = useRouter();
  const [payload, setPayload] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language.startsWith('es') ? 'es-CR' : 'en-US';

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_experience_detail', { option_id: id });
      if (!alive) return;
      if (rpcError) {
        setError(t('experience.loadError') as string);
        setPayload(null);
      } else {
        const raw = (data as Record<string, unknown> | null) ?? {};
        const opt = raw.option as DetailPayload['option'];
        if (!opt?.id) {
          setError(t('experience.notFound') as string);
          setPayload(null);
        } else {
          const g = opt.gallery;
          const gallery = Array.isArray(g) ? (g as string[]).filter((u) => typeof u === 'string') : [];
          setPayload({
            option: { ...opt, gallery },
            service: raw.service as DetailPayload['service'],
            availability: (raw.availability as DetailPayload['availability']) ?? [],
            reviews: (raw.reviews as DetailPayload['reviews']) ?? [],
            rating_summary: raw.rating_summary as DetailPayload['rating_summary'],
          });
        }
      }
      setLoading(false);
    };
    void run();
    return () => {
      alive = false;
    };
  }, [id, t]);

  const images = useMemo(() => {
    const opt = payload?.option;
    if (!opt) return [];
    const main = opt.image_url ? [opt.image_url] : [];
    const rest = (Array.isArray(opt.gallery) ? opt.gallery : []).filter((u) => typeof u === 'string' && !main.includes(u));
    return [...main, ...rest] as string[];
  }, [payload]);

  if (loading) {
    return (
      <MainLayout>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.muted}>{t('options.loading')}</Text>
        </View>
      </MainLayout>
    );
  }

  if (error || !payload?.option) {
    return (
      <MainLayout>
        <View style={styles.centered}>
          <Text style={styles.title}>{error ?? t('experience.notFound')}</Text>
          <Pressable style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>{t('experience.backToCatalog')}</Text>
          </Pressable>
        </View>
      </MainLayout>
    );
  }

  const { option, service, availability = [], reviews = [], rating_summary } = payload;

  const contentMax = Math.min(width, 1080);
  const isWide = width >= 768;
  const heroHeight = Math.min(380, Math.round(width * 0.42));
  const heroUri = images[0];

  return (
    <MainLayout>
      <ScrollView
        contentContainerStyle={[styles.scroll, { maxWidth: contentMax, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backText}>← {t('experience.backToCatalog')}</Text>
        </Pressable>

        {heroUri ? (
          <Image source={{ uri: heroUri }} style={[styles.heroImage, { height: heroHeight }]} resizeMode="cover" />
        ) : null}

        <Text style={styles.eyebrow}>
          {[service?.category_label, service?.location_label].filter(Boolean).join(' · ') || service?.name}
        </Text>
        <Text style={styles.title}>{option.name}</Text>
        {option.description ? <Text style={styles.desc}>{option.description}</Text> : null}

        <View style={[styles.quickStats, isWide && styles.quickStatsRow]}>
          <View style={[styles.statCard, isWide && styles.statCardFlex]}>
            <Text style={styles.priceLabel}>{t('experience.from')}</Text>
            <Text style={styles.price}>
              {formatCurrency(option.base_price / 100, option.currency_code ?? 'USD', locale)}
            </Text>
          </View>
          <View style={[styles.statCard, isWide && styles.statCardFlex]}>
            <Text style={styles.priceLabel}>Duración</Text>
            <Text style={styles.dur}>{t('experience.duration', { minutes: option.duration_minutes })}</Text>
          </View>
          <View style={[styles.statCard, isWide && styles.statCardFlex]}>
            <Text style={styles.priceLabel}>Valoración</Text>
            <Text style={styles.dur}>
              {rating_summary?.count
                ? `${Number(rating_summary.average).toFixed(1)} (${rating_summary.count})`
                : t('experience.noReviews')}
            </Text>
          </View>
        </View>

        {images.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
            {images.slice(1).map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={[styles.galleryImg, isWide && styles.galleryImgWide]}
              />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('experience.about')}</Text>
          {service?.description ? <Text style={styles.sectionBody}>{service.description}</Text> : null}
          <Text style={styles.sectionBody}>
            {t('experience.rating')}:{' '}
            {rating_summary?.count
              ? t('experience.ratingValue', { avg: rating_summary.average, count: rating_summary.count })
              : t('experience.noReviews')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('experience.availabilityTitle')}</Text>
          {availability.length === 0 ? (
            <Text style={styles.muted}>{t('experience.availabilityEmpty')}</Text>
          ) : (
            availability.map((slot) => (
              <View key={`${slot.weekday}-${slot.start_time}`} style={styles.slotRow}>
                <Text style={styles.slotText}>
                  {t(`availability.weekday.${slot.weekday}` as const)} • {slot.start_time.slice(0, 5)} –{' '}
                  {slot.end_time.slice(0, 5)}
                </Text>
                <Text style={styles.muted}>{t('availability.capacity', { count: slot.capacity })}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('experience.reviewsTitle')}</Text>
          {reviews.length === 0 ? (
            <Text style={styles.muted}>{t('experience.noReviewsYet')}</Text>
          ) : (
            reviews.slice(0, 15).map((rev, i) => (
              <View key={`${rev.created_at}-${i}`} style={styles.reviewCard}>
                <Text style={styles.reviewScore}>{t('experience.reviewScore', { score: rev.rating })}</Text>
                {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
                <Text style={styles.reviewDate}>
                  {new Date(rev.created_at).toLocaleDateString(locale, { dateStyle: 'medium' })}
                </Text>
              </View>
            ))
          )}
        </View>

        <Pressable style={styles.cta} onPress={() => router.push(`/reservations/new?optionId=${option.id}`)}>
          <Text style={styles.ctaText}>{t('options.bookNow')}</Text>
        </Pressable>
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  backRow: { marginBottom: 12 },
  backText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  heroImage: {
    width: '100%',
    borderRadius: 22,
    backgroundColor: Colors.white10,
    marginBottom: 4,
  },
  eyebrow: { color: Colors.white50, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  desc: { color: Colors.white70, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  quickStats: { marginBottom: 20, gap: 10 },
  quickStatsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  statCard: {
    borderWidth: 1,
    borderColor: Colors.white15,
    backgroundColor: Colors.white05,
    borderRadius: 14,
    padding: 12,
  },
  statCardFlex: { flex: 1, minWidth: 148 },
  priceLabel: { color: Colors.white50, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  price: { color: Colors.primary, fontSize: 28, fontWeight: '800', marginTop: 4 },
  dur: { color: Colors.white80, fontSize: 14, marginTop: 4, fontWeight: '600' },
  gallery: { gap: 12, marginBottom: 24, paddingRight: 8 },
  galleryImg: { width: 220, height: 140, borderRadius: 16, backgroundColor: Colors.white10 },
  galleryImgWide: { width: 300, height: 188 },
  section: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white05,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  sectionBody: { color: Colors.white70, fontSize: 14, lineHeight: 20 },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  slotText: { color: Colors.white80, fontSize: 13, flex: 1 },
  muted: { color: Colors.white50, fontSize: 13 },
  reviewCard: {
    borderTopWidth: 1,
    borderTopColor: Colors.white10,
    paddingTop: 12,
    marginTop: 8,
    gap: 4,
  },
  reviewScore: { color: '#fff', fontSize: 14, fontWeight: '600' },
  reviewComment: { color: Colors.white70, fontSize: 13 },
  reviewDate: { color: Colors.white40, fontSize: 11 },
  cta: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 1 },
  btn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: Colors.primary, fontWeight: '700' },
});
