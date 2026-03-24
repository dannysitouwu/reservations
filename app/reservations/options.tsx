import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [options, setOptions] = useState<ReservationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [sortMode, setSortMode] = useState<'relevance' | 'price_asc' | 'price_desc' | 'rating'>('relevance');
  const [page, setPage] = useState(0);
  const [facetLocations, setFacetLocations] = useState<string[]>([]);
  const [facetCategories, setFacetCategories] = useState<string[]>([]);

  const locale = i18n.language === 'es' ? 'es-CR' : 'en-US';
  const layoutWidth =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? Math.min(window.innerWidth, width)
      : width;
  const contentMax = Math.min(Math.max(layoutWidth, 320), 1240);
  const isWideFilters = layoutWidth >= 600;
  const isTwoColCards = layoutWidth >= 720;
  const isThreeColCards = layoutWidth >= 1100;
  const desktopCatalog = Platform.OS === 'web' && layoutWidth >= 960;
  const cardWidth = isThreeColCards
    ? (contentMax - 56) / 3
    : isTwoColCards
      ? (contentMax - 48) / 2
      : contentMax - 40;
  const filterCellFlex =
    isWideFilters && !desktopCatalog
      ? { flex: 1, minWidth: (contentMax - 56) / 2, maxWidth: (contentMax - 32) / 2 }
      : undefined;

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

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('services')
        .select('location_label, category_label')
        .eq('is_active', true);
      const locs = new Set<string>();
      const cats = new Set<string>();
      (data ?? []).forEach((r: { location_label?: string | null; category_label?: string | null }) => {
        if (r.location_label?.trim()) locs.add(r.location_label.trim());
        if (r.category_label?.trim()) cats.add(r.category_label.trim());
      });
      const sortEs = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' });
      setFacetLocations([...locs].sort(sortEs));
      setFacetCategories([...cats].sort(sortEs));
    })();
  }, []);

  const applyFilters = () => {
    setPage(0);
    void load();
  };

  return (
    <MainLayout>
      <ScrollView contentContainerStyle={styles.scrollOuter} keyboardShouldPersistTaps="handled">
        <View
          style={StyleSheet.flatten([
            styles.pageInner,
            { maxWidth: contentMax, width: Platform.OS === 'web' ? ('100%' as const) : '100%' },
          ])}
        >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('options.eyebrow')}</Text>
        </View>
        <Text style={[styles.title, desktopCatalog && styles.titleDesktop]}>{t('options.title')}</Text>
        <Text style={[styles.desc, desktopCatalog && styles.descDesktop]}>{t('options.description')}</Text>

        <View style={desktopCatalog ? styles.desktopSplit : undefined}>
          <View
            style={[
              desktopCatalog ? styles.filterSidebar : styles.filters,
              !desktopCatalog && isWideFilters && styles.filtersWide,
            ]}
          >
            {desktopCatalog ? <Text style={styles.filterSidebarTitle}>Filtros</Text> : null}
            <View style={[styles.filterCell, filterCellFlex]}>
              <Text style={styles.filterLabel}>{t('options.searchLabel')}</Text>
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder={t('options.searchPlaceholder') as string}
                placeholderTextColor={Colors.white40}
              />
            </View>
            <View style={[styles.filterCell, filterCellFlex]}>
              <Text style={styles.filterLabel}>{t('options.locationLabel')}</Text>
              <Picker
                value={location}
                onValueChange={(v) => {
                  setLocation(v);
                  setPage(0);
                }}
                items={[
                  { label: t('options.filterAllLocations') as string, value: '' },
                  ...facetLocations.map((l) => ({ label: l, value: l })),
                ]}
              />
            </View>
            <View style={[styles.filterCell, filterCellFlex]}>
              <Text style={styles.filterLabel}>{t('options.categoryLabel')}</Text>
              <Picker
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  setPage(0);
                }}
                items={[
                  { label: t('options.filterAllCategories') as string, value: '' },
                  ...facetCategories.map((c) => ({ label: c, value: c })),
                ]}
              />
            </View>
            <View style={[styles.filterCell, filterCellFlex]}>
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
            </View>
            <View
              style={[
                styles.filterActions,
                isWideFilters && !desktopCatalog && styles.filterActionsWide,
                desktopCatalog && styles.filterActionsStacked,
              ]}
            >
              <Pressable
                style={[styles.applyBtn, isWideFilters && !desktopCatalog && styles.applyBtnInline, desktopCatalog && styles.applyBtnSidebar]}
                onPress={applyFilters}
              >
                <Text style={styles.applyBtnText}>{t('options.applyFilters')}</Text>
              </Pressable>
              <Pressable
                style={[styles.clearBtn, isWideFilters && !desktopCatalog && styles.clearBtnInline, desktopCatalog && styles.clearBtnSidebar]}
                onPress={() => {
                  setQuery('');
                  setLocation('');
                  setCategory('');
                  setSortMode('relevance');
                  setPage(0);
                  void load();
                }}
              >
                <Text style={styles.clearBtnText}>Limpiar filtros</Text>
              </Pressable>
            </View>
          </View>

          <View style={desktopCatalog ? styles.resultsPane : undefined}>
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
          <View style={[styles.grid, (isTwoColCards || isThreeColCards) && styles.gridMultiCol]}>
            {options.map((option) => (
              <View
                key={option.id}
                style={[styles.card, (isTwoColCards || isThreeColCards) && { width: cardWidth, maxWidth: '100%' as const }]}
              >
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
                  ) : (
                    <View style={styles.cardImagePlaceholder}>
                      <Text style={styles.cardImagePlaceholderText}>ReservaPro</Text>
                    </View>
                  )}
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
                {option.category_label?.trim() ? (
                  <View style={styles.categoryChipRow}>
                    <View style={styles.categoryChip}>
                      <Text style={styles.categoryChipText}>{option.category_label.trim()}</Text>
                    </View>
                  </View>
                ) : null}
                <View style={styles.cardFooter}>
                  <Pressable
                    style={styles.footerBtnSecondary}
                    onPress={() =>
                      router.push({
                        pathname: '/experiences/[id]',
                        params: { id: option.id },
                      } as never)
                    }
                  >
                    <Text style={styles.footerBtnSecondaryText}>{t('options.viewDetail')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.footerBtnPrimary}
                    onPress={() => router.push(`/reservations/new?optionId=${option.id}`)}
                  >
                    <Text style={styles.footerBtnPrimaryText}>{t('options.bookNow')}</Text>
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

        {!loading ? <Text style={styles.resultsHint}>{options.length} resultados en esta página</Text> : null}
          </View>
        </View>
        </View>
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  scrollOuter: {
    paddingVertical: 32,
    paddingBottom: 48,
    width: '100%',
    alignItems: 'center' as const,
  },
  pageInner: {
    width: '100%',
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  desktopSplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
    width: '100%',
  },
  filterSidebar: {
    width: 300,
    maxWidth: '100%',
    flexShrink: 0,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.white15,
    borderRadius: 22,
    padding: 20,
    backgroundColor: 'rgba(2,44,34,0.55)',
  },
  filterSidebarTitle: {
    color: Colors.white90,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultsPane: { flex: 1, minWidth: 0 },
  titleDesktop: { fontSize: 34, lineHeight: 42 },
  descDesktop: { maxWidth: 640, marginBottom: 28 },
  filterActionsStacked: { flexDirection: 'column', width: '100%', marginTop: 8 },
  applyBtnSidebar: { width: '100%', marginTop: 0 },
  clearBtnSidebar: { width: '100%', marginTop: 0 },
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
  filtersWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 },
  filterCell: { gap: 6 },
  filterActions: { width: '100%', gap: 8, marginTop: 4 },
  filterActionsWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flexGrow: 1,
    minWidth: 200,
    marginTop: 0,
  },
  applyBtnInline: { flex: 1, marginTop: 0, minWidth: 160 },
  clearBtnInline: { flex: 0, marginTop: 0, paddingVertical: 12, paddingHorizontal: 16 },
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
  clearBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.white15,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  clearBtnText: { color: Colors.white70, fontSize: 13, fontWeight: '600' },
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
  gridMultiCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 20,
    columnGap: 20,
    rowGap: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white05,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 180 },
  cardImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: 'rgba(15,118,110,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.white10,
  },
  cardImagePlaceholderText: { color: Colors.white40, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
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
  categoryChipRow: { paddingHorizontal: 24, paddingTop: 10 },
  categoryChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.45)',
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryChipText: { color: Colors.accent, fontSize: 12, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.white10,
    marginTop: 12,
    gap: 10,
  },
  footerBtnSecondary: {
    flex: 1,
    minWidth: 130,
    borderWidth: 1,
    borderColor: Colors.white20,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,44,34,0.35)',
  },
  footerBtnSecondaryText: { color: Colors.white80, fontSize: 14, fontWeight: '700' },
  footerBtnPrimary: {
    flex: 1,
    minWidth: 130,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  pager: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 },
  pageBtn: { borderWidth: 1, borderColor: Colors.white20, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { color: Colors.white80, fontSize: 13, fontWeight: '600' },
  pageInd: { color: Colors.white50, fontSize: 13 },
  resultsHint: { color: Colors.white40, textAlign: 'center', fontSize: 12, marginTop: 10 },
});
