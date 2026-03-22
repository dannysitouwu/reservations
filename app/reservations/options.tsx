import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MainLayout from '../../src/components/MainLayout';
import { Picker } from '../../src/components/Picker';
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
  location_label?: string | null;
  category_label?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
};

const PAGE_SIZE = 8;

export default function ReservationOptionsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [options, setOptions] = useState<ReservationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [sortMode, setSortMode] = useState<'relevance' | 'price_asc' | 'price_desc' | 'rating'>('relevance');
  const [page, setPage] = useState(0);

  const locale = i18n.language === 'es' ? 'es-CR' : 'en-US';

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('search_experience_options', {
      search_query: query.trim() || null,
      location_filter: location.trim() || null,
      category_filter: category.trim() || null,
      sort_mode: sortMode,
      page_limit: PAGE_SIZE,
      page_offset: page * PAGE_SIZE,
    });
    if (!error && Array.isArray(data)) {
      setOptions(
        (data as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          name: String(row.name ?? ''),
          description: (row.description as string | null) ?? null,
          duration_minutes: Number(row.duration_minutes ?? 0),
          base_price: Number(row.base_price ?? 0),
          currency_code: (row.currency_code as string) ?? 'USD',
          image_url: (row.image_url as string | null) ?? null,
          service_name: (row.service_name as string | null) ?? null,
          location_label: (row.location_label as string | null) ?? null,
          category_label: (row.category_label as string | null) ?? null,
          avg_rating: row.avg_rating != null ? Number(row.avg_rating) : null,
          review_count: row.review_count != null ? Number(row.review_count) : null,
        })),
      );
    } else {
      setOptions([]);
    }
    setLoading(false);
  }, [query, location, category, sortMode, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const badges = useMemo(() => (t('options.badges', { returnObjects: true }) as string[]) || [], [t, i18n.language]);

  const applyFilters = () => {
    setPage(0);
    void load();
  };

  return (
    <MainLayout>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('options.eyebrow')}</Text>
        </View>
        <Text style={styles.title}>{t('options.title')}</Text>
        <Text style={styles.desc}>{t('options.description')}</Text>

        <View style={styles.filters}>
          <Text style={styles.filterLabel}>{t('options.searchLabel')}</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t('options.searchPlaceholder') as string}
            placeholderTextColor={Colors.white40}
          />
          <Text style={styles.filterLabel}>{t('options.locationLabel')}</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder={t('options.locationPlaceholder') as string}
            placeholderTextColor={Colors.white40}
          />
          <Text style={styles.filterLabel}>{t('options.categoryLabel')}</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder={t('options.categoryPlaceholder') as string}
            placeholderTextColor={Colors.white40}
          />
          <Text style={styles.filterLabel}>{t('options.sortLabel')}</Text>
          <Picker
            value={sortMode}
            onValueChange={(v) => {
              setSortMode(v as typeof sortMode);
              setPage(0);
            }}
            items={[
              { label: t('options.sortRelevance'), value: 'relevance' },
              { label: t('options.sortPriceAsc'), value: 'price_asc' },
              { label: t('options.sortPriceDesc'), value: 'price_desc' },
              { label: t('options.sortRating'), value: 'rating' },
            ]}
          />
          <Pressable style={styles.applyBtn} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>{t('options.applyFilters')}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.grid} accessibilityRole="progressbar" accessibilityLabel={t('options.loading')}>
            {[0, 1, 2].map((key) => (
              <View key={key} style={styles.card}>
                <View style={styles.skeletonImage} />
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.skeletonMeta} />
                    <View style={styles.skeletonTitle} />
                    <View style={styles.skeletonDesc} />
                    <View style={[styles.skeletonDesc, { width: '55%' }]} />
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.skeletonStat} />
                  <View style={styles.skeletonStat} />
                </View>
              </View>
            ))}
            <View style={styles.loadingInline}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.loadingText}>{t('options.loading')}</Text>
            </View>
          </View>
        ) : options.length === 0 ? (
          <Text style={styles.empty}>{t('options.empty')}</Text>
        ) : (
          <View style={styles.grid}>
            {options.map((option) => (
              <View key={option.id} style={styles.card}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/experiences/[id]',
                      params: { id: option.id },
                    } as never)
                  }
                >
                  {option.image_url ? (
                    <Image source={{ uri: option.image_url }} style={styles.cardImage} />
                  ) : null}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.meta}>
                        {[option.category_label, option.location_label].filter(Boolean).join(' · ') ||
                          option.service_name}
                      </Text>
                      <Text style={styles.cardTitle}>{option.name}</Text>
                      {option.description ? <Text style={styles.cardDesc}>{option.description}</Text> : null}
                    </View>
                    <View style={styles.curatedBadge}>
                      <Text style={styles.curatedText}>{t('options.curatedTag')}</Text>
                    </View>
                  </View>
                </Pressable>
                <View style={styles.statsRow}>
                  <View>
                    <Text style={styles.statLabel}>{t('options.durationLabel')}</Text>
                    <Text style={styles.statValue}>{option.duration_minutes} min</Text>
                  </View>
                  <View>
                    <Text style={styles.statLabel}>{t('options.fromPriceLabel')}</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(option.base_price / 100, option.currency_code ?? 'USD', locale)}
                    </Text>
                  </View>
                </View>
                {option.review_count != null && option.review_count > 0 ? (
                  <Text style={styles.reviewsLine}>
                    {t('options.reviewsShort')}: {Number(option.avg_rating ?? 0).toFixed(1)} · {option.review_count}
                  </Text>
                ) : null}
                <View style={styles.badgesRow}>
                  {badges.map((b) => (
                    <View key={b} style={styles.miniBadge}>
                      <Text style={styles.miniBadgeText}>{b}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.cardFooter}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/experiences/[id]',
                        params: { id: option.id },
                      } as never)
                    }
                  >
                    <Text style={styles.detailLink}>{t('options.viewDetail')} →</Text>
                  </Pressable>
                  <Pressable onPress={() => router.push(`/reservations/new?optionId=${option.id}`)}>
                    <Text style={styles.bookText}>{t('options.bookNow')} →</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && options.length > 0 ? (
          <View style={styles.pager}>
            <Pressable
              style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
              disabled={page === 0}
              onPress={() => setPage((p) => Math.max(0, p - 1))}
            >
              <Text style={styles.pageBtnText}>{t('options.prevPage')}</Text>
            </Pressable>
            <Text style={styles.pageInd}>{t('options.pageIndicator', { page: page + 1 })}</Text>
            <Pressable
              style={[styles.pageBtn, options.length < PAGE_SIZE && styles.pageBtnDisabled]}
              disabled={options.length < PAGE_SIZE}
              onPress={() => setPage((p) => p + 1)}
            >
              <Text style={styles.pageBtnText}>{t('options.nextPage')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingVertical: 32, paddingBottom: 48 },
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
  desc: { color: Colors.white70, fontSize: 16, lineHeight: 24, marginBottom: 20 },
  filters: {
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.white10,
    borderRadius: 20,
    padding: 16,
    backgroundColor: Colors.white05,
  },
  filterLabel: { color: Colors.white50, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.white15,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(2,44,34,0.5)',
  },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  loadingBox: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  loadingInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  loadingText: { color: Colors.white60, fontSize: 14 },
  skeletonImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.white10,
  },
  skeletonMeta: {
    height: 10,
    width: '40%',
    borderRadius: 4,
    backgroundColor: Colors.white10,
    marginBottom: 8,
  },
  skeletonTitle: {
    height: 18,
    width: '85%',
    borderRadius: 4,
    backgroundColor: Colors.white15,
    marginBottom: 8,
  },
  skeletonDesc: {
    height: 12,
    width: '100%',
    borderRadius: 4,
    backgroundColor: Colors.white10,
    marginBottom: 6,
  },
  skeletonStat: {
    height: 36,
    width: 72,
    borderRadius: 8,
    backgroundColor: Colors.white10,
  },
  empty: { color: Colors.white50, textAlign: 'center', marginVertical: 24, fontSize: 14 },
  grid: { gap: 20 },
  card: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white05,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 180 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 24, paddingTop: 20 },
  cardHeaderLeft: { flex: 1 },
  meta: { color: Colors.white50, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
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
  reviewsLine: { color: Colors.white60, fontSize: 13, paddingHorizontal: 24, paddingTop: 8 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, paddingTop: 12 },
  miniBadge: { borderWidth: 1, borderColor: Colors.white20, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  miniBadgeText: { color: Colors.white50, fontSize: 11 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.white10,
    marginTop: 12,
    gap: 12,
  },
  detailLink: { color: Colors.white70, fontSize: 14, fontWeight: '600' },
  bookText: { color: Colors.primary, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  pager: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 },
  pageBtn: { borderWidth: 1, borderColor: Colors.white20, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { color: Colors.white80, fontSize: 13, fontWeight: '600' },
  pageInd: { color: Colors.white50, fontSize: 13 },
});
