import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toSlug } from '../../../src/utils/slug';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';
import { supabase } from '../lib/supabaseClient';
import { formatCurrency } from '../utils/currency';

export type ReservationOption = {
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

export function ReservationOptionsPage() {
  const { t, i18n } = useTranslation();
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
      page_offset: page * PAGE_SIZE
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
          review_count: row.review_count != null ? Number(row.review_count) : null
        }))
      );
    } else {
      setOptions([]);
    }
    setLoading(false);
  }, [query, location, category, sortMode, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const badges = useMemo(() => t('options.badges', { returnObjects: true }) as string[], [t, i18n.language]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    void load();
  };

  return (
    <section className="py-24 text-white">
      <Container>
        <SectionHeading
          align="left"
          eyebrow={t('options.eyebrow') as string}
          title={t('options.title') as string}
          description={t('options.description') as string}
        />

        <form
          onSubmit={onSearchSubmit}
          className="mt-10 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:grid-cols-2 lg:grid-cols-4"
        >
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-widest text-white/50" htmlFor="opt_q">
              {t('options.searchLabel')}
            </label>
            <input
              id="opt_q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('options.searchPlaceholder') as string}
              className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50" htmlFor="opt_loc">
              {t('options.locationLabel')}
            </label>
            <input
              id="opt_loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('options.locationPlaceholder') as string}
              className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50" htmlFor="opt_cat">
              {t('options.categoryLabel')}
            </label>
            <input
              id="opt_cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('options.categoryPlaceholder') as string}
              className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-widest text-white/50" htmlFor="opt_sort">
              {t('options.sortLabel')}
            </label>
            <select
              id="opt_sort"
              value={sortMode}
              onChange={(e) => {
                setSortMode(e.target.value as typeof sortMode);
                setPage(0);
              }}
              className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white"
            >
              <option value="relevance">{t('options.sortRelevance')}</option>
              <option value="price_asc">{t('options.sortPriceAsc')}</option>
              <option value="price_desc">{t('options.sortPriceDesc')}</option>
              <option value="rating">{t('options.sortRating')}</option>
            </select>
          </div>
          <div className="flex items-end md:col-span-2">
            <button type="submit" className="btn btn-primary w-full justify-center">
              {t('options.applyFilters')}
            </button>
          </div>
        </form>

        {loading ? (
          <div className="mt-16 flex min-h-[30vh] items-center justify-center text-white/70">
            {t('options.loading')}
          </div>
        ) : options.length === 0 ? (
          <p className="mt-16 text-center text-sm text-white/60">{t('options.empty')}</p>
        ) : (
          <>
            <div className="mt-16 grid gap-10 lg:grid-cols-2">
              {options.map((option, index) => (
                <motion.article
                  key={option.id}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-card backdrop-blur-lg"
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  viewport={{ once: true, amount: 0.3 }}
                >
                  {option.image_url ? (
                    <div className="mb-6 overflow-hidden rounded-2xl border border-white/10">
                      <img
                        src={option.image_url}
                        alt={option.name}
                        className="h-44 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                        {[option.category_label, option.location_label].filter(Boolean).join(' · ') ||
                          option.service_name}
                      </p>
                      <h2 className="font-display text-2xl font-semibold">{option.name}</h2>
                      {option.description ? (
                        <p className="mt-2 max-w-xl text-white/70">{option.description}</p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
                      {t('options.curatedTag')}
                    </span>
                  </div>
                  <dl className="mt-8 grid grid-cols-2 gap-6 text-sm text-white/70">
                    <div>
                      <dt className="uppercase tracking-widest text-white/50">
                        {i18n.language === 'es' ? 'Duración' : 'Duration'}
                      </dt>
                      <dd className="mt-2 text-lg text-white">{option.duration_minutes} min</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-widest text-white/50">
                        {i18n.language === 'es' ? 'Desde' : 'From'}
                      </dt>
                      <dd className="mt-2 text-lg text-white">
                        {formatCurrency(option.base_price / 100, option.currency_code ?? 'USD', locale)}
                      </dd>
                    </div>
                    {option.review_count != null && option.review_count > 0 ? (
                      <div className="col-span-2">
                        <dt className="uppercase tracking-widest text-white/50">
                          {t('options.reviewsShort')}
                        </dt>
                        <dd className="mt-2 text-white">
                          {Number(option.avg_rating ?? 0).toFixed(1)} · {option.review_count}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="mt-8 flex flex-wrap items-center gap-4 text-sm uppercase tracking-[0.25em] text-white/40">
                    {badges.map((badge) => (
                      <span key={badge} className="rounded-full border border-white/20 px-4 py-1">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-4 border-t border-white/10 pt-5">
                    <Link
                      to={`/experiences/${option.id}`}
                      className="text-sm font-semibold text-white/80 transition hover:text-brand-accent"
                    >
                      {t('options.viewDetail')} →
                    </Link>
                    <Link
                      to={`/reservations/new?optionId=${option.id}&optionName=${toSlug(option.name)}`}
                      className="text-lg font-semibold text-brand-primary transition hover:text-brand-accent"
                    >
                      {t('options.bookNow')} →
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="btn btn-ghost border-white/25 disabled:opacity-40"
              >
                {t('options.prevPage')}
              </button>
              <span className="text-sm text-white/50">{t('options.pageIndicator', { page: page + 1 })}</span>
              <button
                type="button"
                disabled={options.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
                className="btn btn-ghost border-white/25 disabled:opacity-40"
              >
                {t('options.nextPage')}
              </button>
            </div>
          </>
        )}
      </Container>
    </section>
  );
}
