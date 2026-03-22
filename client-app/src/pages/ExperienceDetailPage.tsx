import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';
import { supabase } from '../lib/supabaseClient';
import { formatCurrency } from '../utils/currency';

type ExperiencePayload = {
  option?: {
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    base_price: number;
    currency_code: string;
    image_url: string | null;
    gallery: string[];
  };
  service?: {
    id: string;
    name: string;
    description: string | null;
    location_label: string | null;
    category_label: string | null;
  };
  availability?: { weekday: number; start_time: string; end_time: string; capacity: number }[];
  reviews?: { rating: number; comment: string | null; created_at: string }[];
  rating_summary?: { average: number; count: number };
};

export function ExperienceDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const [payload, setPayload] = useState<ExperiencePayload | null>(null);
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
        const opt = raw.option as ExperiencePayload['option'];
        if (!opt?.id) {
          setError(t('experience.notFound') as string);
          setPayload(null);
        } else {
          const galleryRaw = opt.gallery;
          const gallery = Array.isArray(galleryRaw)
            ? (galleryRaw as string[]).filter((u) => typeof u === 'string')
            : [];
          setPayload({
            option: { ...opt, gallery },
            service: raw.service as ExperiencePayload['service'],
            availability: (raw.availability as ExperiencePayload['availability']) ?? [],
            reviews: (raw.reviews as ExperiencePayload['reviews']) ?? [],
            rating_summary: raw.rating_summary as ExperiencePayload['rating_summary']
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
    const rest = (opt.gallery ?? []).filter((u) => u && !main.includes(u));
    return [...main, ...rest];
  }, [payload]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/70">
        {t('options.loading')}
      </div>
    );
  }

  if (error || !payload?.option) {
    return (
      <section className="py-24 text-white">
        <Container className="max-w-2xl text-center">
          <p className="text-white/80">{error ?? t('experience.notFound')}</p>
          <Link to="/reservations/options" className="btn btn-primary mt-6 inline-flex">
            {t('experience.backToCatalog')}
          </Link>
        </Container>
      </section>
    );
  }

  const { option, service, availability = [], reviews = [], rating_summary } = payload;

  return (
    <section className="py-24 text-white">
      <Container className="max-w-5xl space-y-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            align="left"
            eyebrow={service?.category_label ?? service?.name ?? ''}
            title={option.name}
            description={option.description ?? ''}
          />
          <div className="text-right">
            <p className="text-sm uppercase tracking-[0.2em] text-white/50">{t('experience.from')}</p>
            <p className="font-display text-3xl font-semibold text-brand-primary">
              {formatCurrency(option.base_price / 100, option.currency_code ?? 'USD', locale)}
            </p>
            <p className="text-xs text-white/50">
              {t('experience.duration', { minutes: option.duration_minutes })}
            </p>
          </div>
        </div>

        {images.length > 0 ? (
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {images.map((src) => (
              <div key={src} className="overflow-hidden rounded-2xl border border-white/10">
                <img src={src} alt="" className="h-48 w-full object-cover" loading="lazy" />
              </div>
            ))}
          </motion.div>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h3 className="text-lg font-semibold text-white">{t('experience.about')}</h3>
            {service?.description ? <p className="text-sm text-white/70">{service.description}</p> : null}
            <dl className="grid gap-3 text-sm text-white/75">
              {service?.location_label ? (
                <div>
                  <dt className="text-white/45">{t('experience.location')}</dt>
                  <dd>{service.location_label}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-white/45">{t('experience.rating')}</dt>
                <dd>
                  {rating_summary?.count
                    ? t('experience.ratingValue', {
                        avg: rating_summary.average,
                        count: rating_summary.count
                      })
                    : t('experience.noReviews')}
                </dd>
              </div>
            </dl>
          </motion.div>

          <motion.div
            className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-white">{t('experience.availabilityTitle')}</h3>
            {availability.length === 0 ? (
              <p className="text-sm text-white/55">{t('experience.availabilityEmpty')}</p>
            ) : (
              <ul className="space-y-2 text-sm text-white/75">
                {availability.map((slot) => (
                  <li key={`${slot.weekday}-${slot.start_time}`} className="flex justify-between gap-4">
                    <span>
                      {t(`availability.weekday.${slot.weekday}` as const)} •{' '}
                      {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                    </span>
                    <span className="text-white/45">{t('availability.capacity', { count: slot.capacity })}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to={`/reservations/new?optionId=${option.id}`}
              className="btn btn-primary mt-4 inline-flex w-full justify-center"
            >
              {t('options.bookNow')}
            </Link>
          </motion.div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('experience.reviewsTitle')}</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-white/55">{t('experience.noReviewsYet')}</p>
          ) : (
            <ul className="space-y-4">
              {reviews.slice(0, 12).map((rev, i) => (
                <li key={`${rev.created_at}-${i}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white/90">
                    {t('experience.reviewScore', { score: rev.rating })}
                  </p>
                  {rev.comment ? <p className="mt-2 text-sm text-white/65">{rev.comment}</p> : null}
                  <p className="mt-2 text-xs text-white/40">
                    {new Date(rev.created_at).toLocaleDateString(locale, { dateStyle: 'medium' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}
