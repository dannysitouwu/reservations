import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ReservationStatus } from '../types/reservation';
import { supabase } from '../lib/supabaseClient';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

type ReservationSearchResult = {
  id: string;
  public_reference: string;
  status: ReservationStatus;
  scheduled_for: string | null;
  service_name: string;
  assigned_worker_name: string | null;
  buyer_name: string | null;
  contact_preference: string | null;
  party_size: number | null;
};

export function ReservationStatusPage() {
  const { t } = useTranslation();
  const [reference, setReference] = useState('');
  const [result, setResult] = useState<ReservationSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const contactPreferenceOptions = useMemo(
    () => ({
      whatsapp: t('booking.contactPreferenceOptions.whatsapp'),
      email: t('booking.contactPreferenceOptions.email'),
      phone_call: t('booking.contactPreferenceOptions.phoneCall')
    }),
    [t]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reference) {
      setError(t('statusPage.errors.empty'));
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('public_find_reservation_by_reference', {
      reference_code: reference
    });

    if (rpcError) {
      setError(t('statusPage.errors.generic'));
      setResult(null);
    } else {
      const record = Array.isArray(data) ? (data[0] as ReservationSearchResult | undefined) : (data as ReservationSearchResult | null);

      if (!record) {
        setError(t('statusPage.noResult'));
        setResult(null);
      } else {
        setResult(record);
      }
    }

    setLoading(false);
  };

  return (
    <section className="py-24 text-white">
      <Container className="max-w-4xl">
        <SectionHeading
          title={t('statusPage.title') as string}
          description={t('statusPage.description') as string}
        />
        <motion.form
          onSubmit={handleSubmit}
          className="mt-12 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur-lg sm:flex-row sm:items-center sm:gap-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value.toUpperCase())}
            placeholder={t('statusPage.placeholder') as string}
            className="flex-1 rounded-full border border-white/20 bg-brand-background/60 px-5 py-3 text-sm uppercase tracking-[0.4em] text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center sm:w-auto sm:px-8 sm:py-3 sm:text-base"
          >
            {loading ? t('statusPage.loading') : t('statusPage.search')}
          </button>
        </motion.form>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        {result ? (
          <motion.article
            className="mt-12 space-y-4 rounded-3xl border border-white/10 bg-white/10 p-8 shadow-card backdrop-blur-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <h2 className="font-display text-2xl font-semibold">{result.service_name}</h2>
            <div className="grid gap-4 text-sm text-white/70 md:grid-cols-2">
              <div>
                <p className="text-white/50">{t('statusPage.labels.status')}</p>
                <p className="text-lg font-semibold text-white">
                  {t(`statusLabels.${result.status}` as const)}
                </p>
              </div>
              <div>
                <p className="text-white/50">{t('statusPage.labels.scheduled')}</p>
                <p className="text-lg font-semibold text-white">
                  {result.scheduled_for
                    ? new Date(result.scheduled_for).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })
                    : t('statusPage.unscheduled')}
                </p>
              </div>
              <div>
                <p className="text-white/50">{t('statusPage.labels.concierge')}</p>
                <p className="text-lg font-semibold text-white">
                  {result.assigned_worker_name ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-white/50">{t('statusPage.labels.reference')}</p>
                <p className="text-lg font-semibold text-white">{result.public_reference}</p>
              </div>
              <div>
                <p className="text-white/50">{t('statusPage.labels.guest')}</p>
                <p className="text-lg font-semibold text-white">{result.buyer_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-white/50">{t('statusPage.labels.partySize')}</p>
                <p className="text-lg font-semibold text-white">
                  {typeof result.party_size === 'number'
                    ? t('statusPage.partySizeValue', { count: result.party_size })
                    : t('statusPage.partySizeUnknown')}
                </p>
              </div>
              <div>
                <p className="text-white/50">{t('statusPage.labels.contactPreference')}</p>
                <p className="text-lg font-semibold text-white">
                  {result.contact_preference
                    ? contactPreferenceOptions[result.contact_preference as keyof typeof contactPreferenceOptions] ?? result.contact_preference
                    : t('statusPage.contactPreferenceNone')}
                </p>
              </div>
            </div>
          </motion.article>
        ) : null}
      </Container>
    </section>
  );
}
