import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MainLayout from '../../src/components/MainLayout';
import { Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabaseClient';

type FeedbackSummary = {
  total_reviews: number;
  average_rating: number;
};

type HighlightItem = { iconName?: string; title: string; description: string };

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [catalogCount, setCatalogCount] = useState<number | null>(null);

  const baseStatsRaw = t('hero.stats', { returnObjects: true }) as unknown;
  const baseStats = Array.isArray(baseStatsRaw) ? (baseStatsRaw as Array<{ value: string; label: string }>) : [];
  const stats = useMemo(() => {
    const firstStat =
      catalogCount != null
        ? { value: String(catalogCount), label: t('hero.catalogCountLabel', { count: catalogCount }) }
        : baseStats[0];
    const secondStat =
      feedbackSummary && feedbackSummary.total_reviews > 0
        ? {
            value: `${Number(feedbackSummary.average_rating).toFixed(1)}/5`,
            label: t('hero.averageFromReviews', { count: feedbackSummary.total_reviews }),
          }
        : baseStats[1];
    return [firstStat, secondStat].filter((s): s is { value: string; label: string } => Boolean(s?.label));
  }, [baseStats, catalogCount, feedbackSummary, t]);
  const teamRaw = t('hero.card.team', { returnObjects: true }) as unknown;
  const team = Array.isArray(teamRaw) ? (teamRaw as string[]) : [];
  const highlightsRaw = t('highlights.items', { returnObjects: true }) as unknown;
  const highlights = Array.isArray(highlightsRaw) ? (highlightsRaw as HighlightItem[]) : [];
  const stepsRaw = t('flow.steps', { returnObjects: true }) as unknown;
  const steps = Array.isArray(stepsRaw)
    ? (stepsRaw as Array<{ step: string; title: string; description: string }>)
    : [];
  const testimonialsRaw = t('testimonials.items', { returnObjects: true }) as unknown;
  const testimonials = Array.isArray(testimonialsRaw)
    ? (testimonialsRaw as Array<{ quote: string; name: string; role: string }>)
    : [];

  useEffect(() => {
    const fetchFeedbackSummary = async () => {
      const { data } = await supabase.rpc('public_feedback_summary');
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || typeof row !== 'object') return;
      setFeedbackSummary({
        total_reviews: Number((row as { total_reviews?: number }).total_reviews ?? 0),
        average_rating: Number((row as { average_rating?: number }).average_rating ?? 0),
      });
    };
    const fetchCatalogCount = async () => {
      const { data, error } = await supabase.rpc('public_catalog_active_option_count');
      if (error || data == null || typeof data !== 'number') return;
      setCatalogCount(data);
    };
    void fetchFeedbackSummary();
    void fetchCatalogCount();
  }, []);

  return (
    <MainLayout>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('hero.badge')}</Text>
        </View>
        <Text style={styles.heroTitle}>
          {t('hero.titleLead')}{' '}
          <Text style={styles.heroHighlight}>{t('hero.titleHighlight')}</Text>
        </Text>
        <Text style={styles.heroDesc}>{t('hero.description')}</Text>
        <View style={styles.heroCtas}>
          <Pressable style={styles.btnPrimary} onPress={() => router.push('/reservations/new')}>
            <Text style={styles.btnPrimaryText}>{t('hero.primaryCta')}</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={() => router.push('/reservations/options')}>
            <Text style={styles.btnGhostText}>{t('hero.secondaryCta')}</Text>
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroCardSection}>
            <Text style={styles.heroCardEyebrow}>{t('hero.card.statusTitle')}</Text>
            <Text style={styles.heroCardTitle}>{t('hero.card.itinerary')}</Text>
            <Text style={styles.heroCardSub}>{t('hero.card.schedule')}</Text>
          </View>
          <View style={styles.heroCardSectionAlt}>
            <Text style={styles.heroCardEyebrow}>{t('hero.card.teamTitle')}</Text>
            {team.map((member) => (
              <Text key={member} style={styles.heroCardTeamMember}>• {member}</Text>
            ))}
          </View>
          <View style={styles.heroCardSection}>
            <Text style={styles.heroCardTestimonial}>{t('hero.card.testimonial')}</Text>
          </View>
        </View>
      </View>

      {/* Highlights */}
      <View style={styles.section}>
        <Text style={styles.eyebrow}>{t('highlights.eyebrow')}</Text>
        <Text style={styles.sectionTitle}>{t('highlights.title')}</Text>
        <Text style={styles.sectionDesc}>{t('highlights.description')}</Text>
        <View style={styles.cardGrid}>
          {highlights.map((item) => (
            <View key={item.title} style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name={(item.iconName as keyof typeof Ionicons.glyphMap) || 'star-outline'}
                  size={22}
                  color={Colors.accent}
                />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Flow */}
      <View style={styles.section}>
        <View style={styles.flowContainer}>
          <Text style={styles.eyebrow}>{t('flow.eyebrow')}</Text>
          <Text style={styles.sectionTitle}>{t('flow.title')}</Text>
          <Text style={styles.sectionDesc}>{t('flow.description')}</Text>
          <View style={styles.stepsGrid}>
            {steps.map((step) => (
              <View key={step.step} style={styles.stepCard}>
                <Text style={styles.stepNumber}>{step.step}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Testimonials */}
      <View style={styles.section}>
        <Text style={styles.eyebrow}>{t('testimonials.eyebrow')}</Text>
        <Text style={styles.sectionTitle}>{t('testimonials.title')}</Text>
        <Text style={styles.sectionDesc}>{t('testimonials.description')}</Text>
        <View style={styles.cardGrid}>
          {testimonials.map((item) => (
            <View key={item.name} style={styles.testimonialCard}>
              <Text style={styles.testimonialQuote}>"{item.quote}"</Text>
              <Text style={styles.testimonialName}>{item.name}</Text>
              <Text style={styles.testimonialRole}>{item.role}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaOuter}>
        <View style={styles.ctaInner}>
          <Text style={styles.ctaTitle}>{t('cta.title')}</Text>
          <Text style={styles.ctaDesc}>{t('cta.description')}</Text>
          <View style={styles.ctaButtons}>
            <Pressable style={styles.btnPrimary} onPress={() => router.push('/reservations/new')}>
              <Text style={styles.btnPrimaryText}>{t('cta.primary')}</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={() => router.push('/contact' as any)}>
              <Text style={styles.btnGhostText}>{t('cta.secondary')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  // Hero
  hero: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 40 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white10,
    borderWidth: 1,
    borderColor: Colors.white20,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  badgeText: { color: Colors.white70, fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 34, fontWeight: '800', lineHeight: 42, marginBottom: 12 },
  heroHighlight: { color: Colors.accent },
  heroDesc: { color: Colors.white70, fontSize: 17, lineHeight: 26, marginBottom: 24, maxWidth: 500 },
  heroCtas: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhost: {
    borderWidth: 1,
    borderColor: Colors.white20,
    backgroundColor: Colors.white10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
  },
  btnGhostText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 32, marginBottom: 28 },
  statItem: {},
  statValue: { color: '#fff', fontSize: 28, fontWeight: '700' },
  statLabel: { color: Colors.white60, fontSize: 13, marginTop: 2 },
  heroCard: {
    borderWidth: 1,
    borderColor: Colors.white15,
    borderRadius: 24,
    padding: 20,
    backgroundColor: Colors.white05,
    gap: 16,
  },
  heroCardSection: { backgroundColor: Colors.white10, borderRadius: 16, padding: 16 },
  heroCardSectionAlt: { backgroundColor: Colors.white05, borderRadius: 16, padding: 16 },
  heroCardEyebrow: { color: Colors.white60, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  heroCardTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  heroCardSub: { color: Colors.white60, fontSize: 14, marginTop: 4 },
  heroCardTeamMember: { color: Colors.white70, fontSize: 14, marginTop: 4 },
  heroCardTestimonial: { color: Colors.white70, fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  // Sections
  section: { paddingHorizontal: 20, paddingVertical: 32 },
  eyebrow: {
    color: Colors.white90,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    backgroundColor: Colors.white10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionTitle: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8, lineHeight: 34 },
  sectionDesc: { color: Colors.white70, fontSize: 16, lineHeight: 24, marginBottom: 24 },

  // Cards grid
  cardGrid: { gap: 16 },
  card: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white05,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  cardDesc: { color: Colors.white70, fontSize: 14, lineHeight: 22 },

  // Flow
  flowContainer: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white05,
    borderRadius: 24,
    padding: 24,
  },
  stepsGrid: { gap: 16 },
  stepCard: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  stepNumber: { color: Colors.white10, fontSize: 40, fontWeight: '800' },
  stepTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  stepDesc: { color: Colors.white70, fontSize: 14, lineHeight: 22 },

  // Testimonials
  testimonialCard: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white05,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  testimonialQuote: { color: Colors.white90, fontSize: 16, lineHeight: 24 },
  testimonialName: { color: Colors.white60, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginTop: 8 },
  testimonialRole: { color: Colors.white40, fontSize: 12 },

  // CTA
  ctaOuter: { paddingHorizontal: 20, paddingBottom: 32 },
  ctaInner: {
    borderWidth: 1,
    borderColor: Colors.white20,
    borderRadius: 24,
    padding: 24,
    backgroundColor: Colors.background,
  },
  ctaTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  ctaDesc: { color: Colors.white70, fontSize: 15, lineHeight: 22, marginBottom: 20 },
  ctaButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
