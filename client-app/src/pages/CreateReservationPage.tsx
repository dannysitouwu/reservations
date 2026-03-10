import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSupabase } from '../providers/SupabaseProvider';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

type ExperienceOption = {
  id: string;
  name: string;
  description: string | null;
};

type AvailabilitySlot = {
  weekday: number;
  start_time: string;
  end_time: string;
  capacity: number;
};

export function CreateReservationPage() {
  const { client, session } = useSupabase();
  const { t } = useTranslation();
  const [options, setOptions] = useState<ExperienceOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('');
  const [contactPreference, setContactPreference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      const { data, error: fetchError } = await client
        .from('service_options_view')
        .select('id, name, description')
        .order('name');

      if (!fetchError && data) {
        setOptions(data as ExperienceOption[]);
      }
    };

    fetchOptions();
  }, [client]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) {
        return;
      }

      const { data } = await client
        .from('profiles')
        .select('full_name, phone')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data?.full_name) {
        setFullName(data.full_name);
      }

      if (data?.phone) {
        setPhone(data.phone);
      }
    };

    loadProfile();
  }, [client, session?.user?.id]);

  useEffect(() => {
    if (!selectedOption) {
      setAvailability([]);
      return;
    }

    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      const { data, error: availabilityError } = await client
        .from('service_option_availability')
        .select('weekday, start_time, end_time, capacity')
        .eq('service_option_id', selectedOption)
        .order('weekday', { ascending: true });

      if (!availabilityError && data) {
        setAvailability(data as AvailabilitySlot[]);
      } else {
        setAvailability([]);
      }
      setLoadingAvailability(false);
    };

    fetchAvailability();
  }, [client, selectedOption]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOption) {
      setError(t('booking.errors.noOption'));
      return;
    }

    if (!fullName.trim() || !phone.trim()) {
      setError(t('booking.errors.missingContact'));
      return;
    }

    const parsedPartySize = partySize.trim() ? Number(partySize) : null;

    if (parsedPartySize !== null && (Number.isNaN(parsedPartySize) || parsedPartySize <= 0)) {
      setError(t('booking.errors.invalidPartySize'));
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: rpcError } = await client.rpc('client_create_reservation', {
      reservation_input: {
        service_option_id: selectedOption,
        scheduled_for: scheduledFor || null,
        notes,
        contact_full_name: fullName.trim(),
        contact_phone: phone.trim(),
        party_size: parsedPartySize,
        contact_preference: contactPreference || null
      }
    });

    if (rpcError) {
      setError(t('booking.errors.generic'));
    } else if (data?.reservation_id) {
      setSuccessId(data.reservation_id as string);
      setScheduledFor('');
      setNotes('');
      setPartySize('');
      setContactPreference('');
    }

    setSubmitting(false);
  };

  const availabilityList = useMemo(() => {
    if (!selectedOption || loadingAvailability) {
      return null;
    }

    if (availability.length === 0) {
      return <p className="text-sm text-white/60">{t('booking.availabilityNone')}</p>;
    }

    return (
      <ul className="space-y-3 text-sm text-white/80">
        {availability.map((slot) => (
          <li key={`${slot.weekday}-${slot.start_time}`} className="flex items-center justify-between">
            <span>
              {t(`availability.weekday.${slot.weekday}` as const)} • {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
            </span>
            <span className="text-white/50">
              {t('availability.capacity', { count: slot.capacity })}
            </span>
          </li>
        ))}
      </ul>
    );
  }, [availability, loadingAvailability, selectedOption, t]);

  if (!session) {
    return (
      <section className="py-24 text-white">
        <Container className="max-w-3xl text-center">
          <SectionHeading
            title={t('booking.title') as string}
            description={t('booking.description') as string}
          />
        </Container>
      </section>
    );
  }

  return (
    <section className="py-24 text-white">
      <Container className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <SectionHeading
            align="left"
            title={t('booking.title') as string}
            description={t('booking.description') as string}
          />
          <motion.ul
            className="mt-10 space-y-4 text-sm text-white/70"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
              • {t('flow.steps.0.description')}
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
              • {t('flow.steps.1.description')}
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
              • {t('flow.steps.2.description')}
            </li>
          </motion.ul>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-white/10 bg-white/10 p-8 shadow-card backdrop-blur-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div>
            <label className="block text-sm font-semibold text-white/80" htmlFor="experience">
              {t('booking.selectLabel')}
            </label>
            <select
              id="experience"
              value={selectedOption}
              onChange={(event) => setSelectedOption(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
            >
              <option value="">{t('booking.selectPlaceholder')}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80" htmlFor="scheduled_for">
              {t('booking.datetimeLabel')}
            </label>
            <input
              id="scheduled_for"
              name="scheduled_for"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              type="datetime-local"
              className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-white/80" htmlFor="full_name">
                {t('booking.fullNameLabel')}
              </label>
              <input
                id="full_name"
                name="full_name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                type="text"
                required
                placeholder={t('booking.fullNamePlaceholder') as string}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white/80" htmlFor="phone">
                {t('booking.phoneLabel')}
              </label>
              <input
                id="phone"
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                required
                placeholder={t('booking.phonePlaceholder') as string}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-white/80" htmlFor="party_size">
                {t('booking.partySizeLabel')}
              </label>
              <input
                id="party_size"
                name="party_size"
                value={partySize}
                onChange={(event) => setPartySize(event.target.value)}
                type="number"
                min={1}
                placeholder={t('booking.partySizePlaceholder') as string}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white/80" htmlFor="contact_preference">
                {t('booking.contactPreferenceLabel')}
              </label>
              <select
                id="contact_preference"
                name="contact_preference"
                value={contactPreference}
                onChange={(event) => setContactPreference(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
              >
                <option value="">{t('booking.contactPreferencePlaceholder')}</option>
                <option value="whatsapp">{t('booking.contactPreferenceOptions.whatsapp')}</option>
                <option value="email">{t('booking.contactPreferenceOptions.email')}</option>
                <option value="phone_call">{t('booking.contactPreferenceOptions.phoneCall')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80" htmlFor="notes">
              {t('booking.notesLabel')}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t('booking.notesPlaceholder') as string}
              className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full justify-center text-base uppercase tracking-[0.3em]"
          >
            {submitting ? t('booking.submitting') : t('booking.submit')}
          </button>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white/80">{t('booking.availabilityTitle')}</p>
            {loadingAvailability ? (
              <p className="text-sm text-white/60">{t('options.loading')}</p>
            ) : selectedOption ? (
              availabilityList ?? (
                <p className="text-sm text-white/60">{t('booking.availabilityNone')}</p>
              )
            ) : (
              <p className="text-sm text-white/60">{t('booking.availabilityEmpty')}</p>
            )}
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {successId ? (
            <p className="text-sm text-emerald-300">{t('booking.success', { code: successId })}</p>
          ) : null}
        </motion.form>
      </Container>
    </section>
  );
}
