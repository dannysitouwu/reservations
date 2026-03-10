import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSupabase } from '../providers/SupabaseProvider';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

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
};

export function MyReservationsPage() {
  const { client, session } = useSupabase();
  const { t, i18n } = useTranslation();
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = useMemo(() => (i18n.language.startsWith('es') ? 'es-CR' : 'en-US'), [i18n.language]);
  const contactPreferenceOptions = useMemo(
    () => ({
      whatsapp: t('booking.contactPreferenceOptions.whatsapp'),
      email: t('booking.contactPreferenceOptions.email'),
      phone_call: t('booking.contactPreferenceOptions.phoneCall')
    }),
    [t]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchReservations = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await client
        .from('reservations_detail_view')
        .select('*')
        .eq('buyer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError(t('myReservations.error'));
        setReservations([]);
      } else {
        setReservations((data as ReservationDetail[]) ?? []);
      }

      setLoading(false);
    };

    fetchReservations();

    return () => {
      isMounted = false;
    };
  }, [client, session?.user, t]);

  if (!session) {
    return (
      <section className="py-24 text-white">
        <Container className="max-w-3xl text-center">
          <SectionHeading
            title={t('myReservations.signInTitle') as string}
            description={t('myReservations.signInDescription') as string}
          />
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            {t('myReservations.signInCta')}
          </Link>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-24 text-white">
      <Container className="max-w-5xl">
        <SectionHeading
          title={t('myReservations.title') as string}
          description={t('myReservations.description') as string}
          align="left"
        />

        <motion.div
          className="mt-10 space-y-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              {t('myReservations.loading')}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-300/30 bg-rose-300/10 p-6 text-center text-sm text-rose-100">
              {error}
            </div>
          ) : reservations.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
              <h3 className="text-lg font-semibold text-white">{t('myReservations.emptyTitle')}</h3>
              <p className="mt-2 text-sm text-white/60">{t('myReservations.emptyDescription')}</p>
              <Link
                to="/reservations/new"
                className="mt-6 inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                {t('myReservations.emptyCta')}
              </Link>
            </div>
          ) : (
            reservations.map((reservation) => {
              const scheduledDate = reservation.scheduled_for
                ? new Date(reservation.scheduled_for).toLocaleString(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })
                : t('myReservations.unscheduled');

              const createdAt = new Date(reservation.created_at).toLocaleDateString(locale, {
                dateStyle: 'medium'
              });

              const contactPreferenceLabel = reservation.contact_preference
                ? contactPreferenceOptions[reservation.contact_preference as keyof typeof contactPreferenceOptions] ?? t('myReservations.contactPreferenceNone')
                : t('myReservations.contactPreferenceNone');

              return (
                <motion.div
                  key={reservation.id}
                  className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {reservation.service_name ?? t('myReservations.unnamedExperience')}
                      </h3>
                      <p className="text-sm text-white/60">
                        {t('myReservations.reference', { code: reservation.public_reference })}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80">
                      {t(`statusLabels.${reservation.status}` as const)}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 text-sm text-white/70 md:grid-cols-2">
                    <div>
                      <p className="font-semibold text-white/80">{t('myReservations.scheduledFor')}</p>
                      <p className="mt-1">{scheduledDate}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white/80">{t('myReservations.createdAt')}</p>
                      <p className="mt-1">{createdAt}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white/80">{t('myReservations.partySize')}</p>
                      <p className="mt-1">
                        {reservation.party_size ? t('myReservations.partySizeValue', { count: reservation.party_size }) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-white/80">{t('myReservations.contactPreference')}</p>
                      <p className="mt-1">{contactPreferenceLabel}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/70">
                    <p className="font-semibold text-white/80">{t('myReservations.notes')}</p>
                    <p className="mt-2">
                      {reservation.notes?.trim()
                        ? reservation.notes
                        : t('myReservations.notesEmpty')}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </Container>
    </section>
  );
}

