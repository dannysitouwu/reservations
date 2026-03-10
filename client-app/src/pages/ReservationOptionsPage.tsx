import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';
import { formatCurrency } from '../utils/currency';

export type ReservationOption = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  base_price: number;
  currency_code?: string | null;
};

export function ReservationOptionsPage() {
  const { t, i18n } = useTranslation();
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

  const badges = useMemo(() => t('options.badges', { returnObjects: true }) as string[], [t]);
  const locale = i18n.language === 'es' ? 'es-CR' : 'en-US';

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/70">
        {t('options.loading')}
      </div>
    );
  }

  return (
    <section className="py-24 text-white">
      <Container>
        <SectionHeading
          align="left"
          eyebrow={t('options.eyebrow') as string}
          title={t('options.title') as string}
          description={t('options.description') as string}
        />

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          {options.map((option, index) => (
            <motion.article
              key={option.id}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-card backdrop-blur-lg"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
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
                    {i18n.language === 'es' ? 'Inversión desde' : 'Starting investment'}
                  </dt>
                  <dd className="mt-2 text-lg text-white">
                    {formatCurrency(option.base_price, option.currency_code ?? 'CRC', locale)}
                  </dd>
                </div>
              </dl>
              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm uppercase tracking-[0.25em] text-white/40">
                {badges.map((badge) => (
                  <span key={badge} className="rounded-full border border-white/20 px-4 py-1">
                    {badge}
                  </span>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}
