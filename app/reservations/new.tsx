import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Platform,
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
import { useSupabase } from '../../src/providers/SupabaseProvider';
import { downloadReservationPdf } from '../../src/utils/reservationPdf';
import { formatCurrency } from '../../src/utils/currency';

type ExperienceOption = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  currency_code: string;
};
type AvailabilitySlot = { weekday: number; start_time: string; end_time: string; capacity: number };

function toMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function hhmmFromDate(value: Date): string {
  const hh = String(value.getHours()).padStart(2, '0');
  const mm = String(value.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function buildSlotTimes(startTime: string, endTime: string): string[] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const times: string[] = [];
  for (let current = start; current < end; current += 15) {
    const hh = String(Math.floor(current / 60)).padStart(2, '0');
    const mm = String(current % 60).padStart(2, '0');
    times.push(`${hh}:${mm}`);
  }
  return times;
}

export default function CreateReservationPage() {
  const { client, session } = useSupabase();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { optionId } = useLocalSearchParams<{ optionId?: string }>();

  const [options, setOptions] = useState<ExperienceOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(optionId ?? '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('');
  const [notes, setNotes] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [contactPreference, setContactPreference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [bookedName, setBookedName] = useState('');

  const selectedExperience = options.find((o) => o.id === selectedOption);

  const localeMoney = i18n.language.startsWith('es') ? 'es-CR' : 'en-US';
  const localeDate = i18n.language.startsWith('es') ? 'es-MX' : 'en-US';
  const estimatedTotalCents = useMemo(() => {
    const opt = options.find((o) => o.id === selectedOption);
    if (!opt) return 0;
    const n = partySize.trim() ? Number(partySize) : 1;
    const people = Number.isFinite(n) && n > 0 ? n : 1;
    return opt.base_price * people;
  }, [options, selectedOption, partySize]);
  const allowedWeekdays = useMemo(() => new Set(availability.map((slot) => slot.weekday)), [availability]);
  const hasAvailabilityRules = availability.length > 0;

  const selectedWeekday = useMemo(() => {
    if (Platform.OS === 'web') {
      if (!webDate) return null;
      return new Date(`${webDate}T10:00:00`).getDay();
    }
    return selectedDate ? selectedDate.getDay() : null;
  }, [selectedDate, webDate]);

  const isTimeAllowed = (weekday: number, timeHHMM: string) => {
    if (!hasAvailabilityRules) return true;
    const target = toMinutes(timeHHMM);
    return availability
      .filter((slot) => slot.weekday === weekday)
      .some((slot) => target >= toMinutes(slot.start_time) && target < toMinutes(slot.end_time));
  };

  const webDateItems = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }).map((_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() + idx);
      const iso = d.toISOString().slice(0, 10);
      const weekday = d.getDay();
      const isAllowedDay = !hasAvailabilityRules || allowedWeekdays.has(weekday);
      const label = d.toLocaleDateString(i18n.language.startsWith('es') ? 'es-CR' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
      return { label, value: iso, weekday, isAllowedDay };
    });
  }, [allowedWeekdays, hasAvailabilityRules, i18n.language]);

  const filteredWebDateItems = useMemo(
    () => webDateItems.filter((item) => item.isAllowedDay),
    [webDateItems],
  );

  const webTimeItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (hasAvailabilityRules) {
      if (selectedWeekday === null) return items;
      const byDay = availability.filter((slot) => slot.weekday === selectedWeekday);
      const unique = new Set<string>();
      byDay.forEach((slot) => {
        buildSlotTimes(slot.start_time, slot.end_time).forEach((time) => unique.add(time));
      });
      return Array.from(unique)
        .sort((a, b) => toMinutes(a) - toMinutes(b))
        .map((value) => ({ label: value, value }));
    }

    for (let h = 7; h <= 22; h += 1) {
      for (const m of [0, 15, 30, 45]) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        items.push({ label: `${hh}:${mm}`, value: `${hh}:${mm}` });
      }
    }
    return items;
  }, [availability, hasAvailabilityRules, selectedWeekday]);

  const selectedDateLabel = webDate
    ? webDateItems.find((d) => d.value === webDate)?.label ?? webDate
    : selectedDate
      ? selectedDate.toLocaleDateString(localeDate, { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

  useEffect(() => {
    const fetchOptions = async () => {
      const { data } = await client
        .from('service_options_view')
        .select('id, name, description, base_price, currency_code')
        .order('name');
      if (data) {
        setOptions(
          (data as ExperienceOption[]).map((row) => ({
            ...row,
            base_price: Number(row.base_price ?? 0),
            currency_code: row.currency_code ?? 'USD',
          })),
        );
      }
    };
    fetchOptions();
  }, [client]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const loadProfile = async () => {
      const { data } = await client.from('profiles').select('full_name, phone').eq('id', session.user.id).maybeSingle();
      if (data?.full_name) setFullName(data.full_name);
      if (data?.phone) setPhone(data.phone);
    };
    loadProfile();
  }, [client, session?.user?.id]);

  useEffect(() => {
    if (!selectedOption) { setAvailability([]); return; }
    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      const { data } = await client
        .from('service_option_availability')
        .select('weekday, start_time, end_time, capacity')
        .eq('service_option_id', selectedOption)
        .order('weekday', { ascending: true });
      setAvailability((data as AvailabilitySlot[]) ?? []);
      setLoadingAvailability(false);
    };
    fetchAvailability();
  }, [client, selectedOption]);

  useEffect(() => {
    setSelectedDate(null);
    setSelectedTime(null);
    setWebDate('');
    setWebTime('');
  }, [selectedOption]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!webDate || webTimeItems.some((item) => item.value === webTime)) return;
    setWebTime('');
  }, [webDate, webTime, webTimeItems]);

  const handleSubmit = async () => {
    if (!selectedOption) { setError(t('booking.errors.noOption')); return; }
    if (!fullName.trim() || !phone.trim()) { setError(t('booking.errors.missingContact')); return; }
    const parsed = partySize.trim() ? Number(partySize) : null;
    if (parsed !== null && (Number.isNaN(parsed) || parsed <= 0)) { setError(t('booking.errors.invalidPartySize')); return; }

    setSubmitting(true);
    setError(null);

    // Compose scheduled_for from date + time pickers
    let scheduledFor: string | null = null;
    if (Platform.OS === 'web' && webDate) {
      if (!webTime) {
        setSubmitting(false);
        setError(t('booking.errors.selectTime'));
        return;
      }
      const weekday = new Date(`${webDate}T10:00:00`).getDay();
      if (hasAvailabilityRules && !allowedWeekdays.has(weekday)) {
        setSubmitting(false);
        setError(t('booking.errors.dateNotAvailable'));
        return;
      }
      if (!isTimeAllowed(weekday, webTime)) {
        setSubmitting(false);
        setError(t('booking.errors.timeNotAllowed'));
        return;
      }
      const d = new Date(`${webDate}T${webTime}:00`);
      scheduledFor = d.toISOString();
    } else if (selectedDate) {
      if (!selectedTime) {
        setSubmitting(false);
        setError(t('booking.errors.selectTime'));
        return;
      }
      const weekday = selectedDate.getDay();
      const selectedHHMM = hhmmFromDate(selectedTime);
      if (hasAvailabilityRules && !allowedWeekdays.has(weekday)) {
        setSubmitting(false);
        setError(t('booking.errors.dateNotAvailable'));
        return;
      }
      if (!isTimeAllowed(weekday, selectedHHMM)) {
        setSubmitting(false);
        setError(t('booking.errors.timeNotAllowed'));
        return;
      }
      const d = new Date(selectedDate);
      d.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      scheduledFor = d.toISOString();
    } else {
      setSubmitting(false);
      setError(t('booking.errors.dateTimeRequired'));
      return;
    }

    const payload: Record<string, unknown> = {
      service_option_id: selectedOption,
      scheduled_for: scheduledFor,
      notes,
      contact_full_name: fullName.trim(),
      contact_phone: phone.trim(),
      contact_preference: contactPreference || null,
    };
    payload.party_size = parsed !== null ? String(parsed) : '1';

    const { data, error: rpcError } = await client.rpc('client_create_reservation', {
      reservation_input: payload,
    });

    if (rpcError) {
      console.error('[reservation] RPC error:', rpcError);
      setError(rpcError.message ?? t('booking.errors.generic'));
    } else if (data?.reservation_id) {
      const { data: resData } = await client
        .from('reservations')
        .select('public_reference')
        .eq('id', data.reservation_id)
        .maybeSingle();
      setBookedName(selectedExperience?.name ?? '');
      setTrackingCode(resData?.public_reference ?? data.reservation_id);
    }
    setSubmitting(false);
  };

  // ── Not authenticated ──
  if (!session) {
    return (
      <MainLayout>
        <View style={styles.authPrompt}>
          <View style={styles.authIcon}>
            <Text style={styles.authIconText}>🔒</Text>
          </View>
          <Text style={styles.authTitle}>{t('booking.title')}</Text>
          <Text style={styles.authDesc}>{t('booking.description')}</Text>
          <Pressable style={styles.btnPrimary} onPress={() => router.push('/auth')}>
            <Text style={styles.btnPrimaryText}>{t('navigation.signIn')}</Text>
          </Pressable>
        </View>
      </MainLayout>
    );
  }

  // ── Success screen with tracking code ──
  if (trackingCode) {
    return (
      <MainLayout>
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>{t('booking.flow.successTitle')}</Text>
          <Text style={styles.successDesc}>
            {t('booking.flow.successDesc', { name: bookedName })}
          </Text>

          <View style={styles.trackingCard}>
            <Text style={styles.trackingLabel}>{t('booking.flow.trackingLabel')}</Text>
            <Text style={styles.trackingCode}>{trackingCode}</Text>
            <Text style={styles.trackingHint}>{t('booking.flow.trackingHint')}</Text>
          </View>

          <View style={styles.successActions}>
            <Pressable style={styles.btnPrimary} onPress={() => router.push('/reservations/mine')}>
              <Text style={styles.btnPrimaryText}>{t('booking.flow.viewMine')}</Text>
            </Pressable>
            <Pressable style={styles.btnOutline} onPress={() => router.push('/reservations/status')}>
              <Text style={styles.btnOutlineText}>{t('booking.flow.trackReservation')}</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={() => {
              setTrackingCode(null);
              setSelectedOption('');
              setSelectedDate(null);
              setSelectedTime(null);
              setWebDate('');
              setWebTime('');
              setNotes('');
              setPartySize('1');
              setContactPreference('');
            }}>
              <Text style={styles.btnGhostText}>{t('booking.flow.bookAgain')}</Text>
            </Pressable>
            <Pressable
              style={styles.btnOutline}
              onPress={() => {
                const printed = downloadReservationPdf({
                  reference: trackingCode,
                  optionName: bookedName,
                  fullName,
                  phone,
                  scheduledDate: selectedDateLabel,
                  scheduledTime: webTime || (selectedTime
                    ? selectedTime.toLocaleTimeString(localeDate, { hour: '2-digit', minute: '2-digit' })
                    : ''),
                  partySize,
                  contactPreference,
                  notes,
                });
                if (!printed) {
                  Alert.alert(t('booking.flow.pdfAlertTitle'), t('booking.flow.pdfWebOnly'));
                }
              }}
            >
              <Text style={styles.btnOutlineText}>{t('booking.flow.downloadPdf')}</Text>
            </Pressable>
          </View>
        </View>
      </MainLayout>
    );
  }

  // ── Booking form ──
  return (
    <MainLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{t('booking.flow.headerBadge')}</Text>
          </View>
          <Text style={styles.title}>{t('booking.title')}</Text>
          <Text style={styles.desc}>{t('booking.description')}</Text>
        </View>

        {/* Progress steps */}
        <View style={styles.progressRow}>
          {[
            { num: '1', label: t('booking.flow.stepExperience') },
            { num: '2', label: t('booking.flow.stepDetails') },
            { num: '3', label: t('booking.flow.stepConfirm') },
          ].map((step, idx) => (
            <View key={step.num} style={styles.progressItem}>
              <View style={[styles.progressDot, idx === 0 && styles.progressDotActive]}>
                <Text style={[styles.progressNum, idx === 0 && styles.progressNumActive]}>
                  {step.num}
                </Text>
              </View>
              <Text style={styles.progressLabel}>{step.label}</Text>
            </View>
          ))}
        </View>

        {/* Section 1 — Experience */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNum}>01</Text>
            <Text style={styles.sectionTitle}>{t('booking.flow.sectionExperience')}</Text>
          </View>
          <Picker
            value={selectedOption}
            onValueChange={setSelectedOption}
            items={[
              { label: t('booking.selectPlaceholder'), value: '' },
              ...options.map((o) => ({ label: o.name, value: o.id })),
            ]}
          />
          {selectedExperience?.description ? (
            <View style={styles.experiencePreview}>
              <Text style={styles.experiencePreviewText}>{selectedExperience.description}</Text>
            </View>
          ) : null}

          {selectedOption ? (
            <View style={styles.availabilityBox}>
              <View style={styles.availHeader}>
                <Text style={styles.availIcon}>📅</Text>
                <Text style={styles.availabilityTitle}>{t('booking.availabilityTitle')}</Text>
              </View>
              {loadingAvailability ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : availability.length > 0 ? (
                availability.map((slot) => (
                  <View key={`${slot.weekday}-${slot.start_time}`} style={styles.availRow}>
                    <Text style={styles.availText}>
                      {t(`availability.weekday.${slot.weekday}` as const)} • {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                    </Text>
                    <View style={styles.availCapBadge}>
                      <Text style={styles.availCapText}>
                        {t('booking.flow.slotsShort', { count: slot.capacity })}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.availabilityHint}>{t('booking.availabilityNone')}</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* Section 2 — Date & Time */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNum}>02</Text>
            <Text style={styles.sectionTitle}>{t('booking.flow.sectionWhen')}</Text>
          </View>

          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeCol}>
              <Text style={styles.label}>📅  {t('booking.flow.dateLabel')}</Text>
              {Platform.OS === 'web' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {filteredWebDateItems.slice(0, 14).map((item) => {
                    const active = webDate === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setWebDate(item.value)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                  <Text style={selectedDate ? styles.dateBtnTextSelected : styles.dateBtnTextPlaceholder}>
                    {selectedDate
                      ? selectedDate.toLocaleDateString(localeDate, { day: '2-digit', month: 'short', year: 'numeric' })
                      : t('booking.flow.selectDate')}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.dateTimeCol}>
              <Text style={styles.label}>🕐  {t('booking.flow.timeLabel')}</Text>
              {Platform.OS === 'web' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {webTimeItems.map((item) => {
                    const active = webTime === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setWebTime(item.value)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <Pressable style={styles.dateBtn} onPress={() => setShowTimePicker(true)}>
                  <Text style={selectedTime ? styles.dateBtnTextSelected : styles.dateBtnTextPlaceholder}>
                    {selectedTime
                      ? selectedTime.toLocaleTimeString(localeDate, { hour: '2-digit', minute: '2-digit', hour12: true })
                      : t('booking.flow.selectTime')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {Platform.OS === 'web' && selectedOption && webDate && webTimeItems.length === 0 ? (
            <Text style={styles.helperText}>{t('booking.flow.noTimesForDate')}</Text>
          ) : null}

          {/* Native inline pickers */}
          {Platform.OS !== 'web' && showDatePicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={selectedDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_event, date) => {
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
                textColor="#fff"
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <Pressable style={styles.pickerDoneBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerDoneBtnText}>{t('booking.flow.pickerDone')}</Text>
                </Pressable>
              )}
            </View>
          )}
          {Platform.OS !== 'web' && showTimePicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={selectedTime ?? new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minuteInterval={15}
                onChange={(_event, time) => {
                  if (Platform.OS !== 'ios') setShowTimePicker(false);
                  if (time) setSelectedTime(time);
                }}
                textColor="#fff"
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <Pressable style={styles.pickerDoneBtn} onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.pickerDoneBtnText}>{t('booking.flow.pickerDone')}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Section 3 — Contact info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNum}>03</Text>
            <Text style={styles.sectionTitle}>{t('booking.flow.sectionContact')}</Text>
          </View>
          <View style={styles.fieldGroup}>
            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>{t('booking.fullNameLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={t('booking.fullNamePlaceholder') as string}
                  placeholderTextColor={Colors.white40}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>{t('booking.phoneLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder={t('booking.phonePlaceholder') as string}
                  placeholderTextColor={Colors.white40}
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>{t('booking.partySizeLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={partySize}
                  onChangeText={setPartySize}
                  keyboardType="numeric"
                  placeholder={t('booking.partySizePlaceholder') as string}
                  placeholderTextColor={Colors.white40}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>{t('booking.contactPreferenceLabel')}</Text>
                <Picker
                  value={contactPreference}
                  onValueChange={setContactPreference}
                  items={[
                    { label: t('booking.contactPreferencePlaceholder'), value: '' },
                    { label: t('booking.contactPreferenceOptions.whatsapp'), value: 'whatsapp' },
                    { label: t('booking.contactPreferenceOptions.email'), value: 'email' },
                    { label: t('booking.contactPreferenceOptions.phoneCall'), value: 'phone_call' },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNum}>04</Text>
            <Text style={styles.sectionTitle}>{t('booking.flow.sectionNotes')}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholder={t('booking.notesPlaceholder') as string}
            placeholderTextColor={Colors.white40}
          />
        </View>

        {selectedOption ? (
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>{t('booking.estimatedTotal')}</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(
                estimatedTotalCents / 100,
                selectedExperience?.currency_code ?? 'USD',
                localeMoney,
              )}
            </Text>
            <Text style={styles.totalHint}>{t('booking.priceHint')}</Text>
          </View>
        ) : null}

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠  {error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={t('booking.submit')}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>{t('booking.submit')}</Text>
              <Text style={styles.submitArrow}>→</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>{t('booking.flow.disclaimer')}</Text>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  // Auth
  authPrompt: { paddingHorizontal: 24, paddingVertical: 60, alignItems: 'center', gap: 16 },
  authIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.white10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  authIconText: { fontSize: 28 },
  authTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  authDesc: { color: Colors.white60, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 340 },

  // Success
  successContainer: { paddingHorizontal: 24, paddingVertical: 48, alignItems: 'center', gap: 16 },
  successIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 2, borderColor: Colors.emerald300,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successIconText: { color: Colors.emerald300, fontSize: 32, fontWeight: '700' },
  successTitle: { color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  successDesc: { color: Colors.white70, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 360 },
  trackingCard: {
    width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: Colors.white15, backgroundColor: Colors.white05,
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 8, marginTop: 8,
  },
  trackingLabel: { color: Colors.white50, fontSize: 12, fontWeight: '600', letterSpacing: 2 },
  trackingCode: { color: Colors.primary, fontSize: 36, fontWeight: '800', letterSpacing: 6 },
  trackingHint: { color: Colors.white50, fontSize: 13, textAlign: 'center', lineHeight: 18, marginTop: 4 },
  successActions: { width: '100%', maxWidth: 400, gap: 10, marginTop: 16 },

  // Container
  container: { paddingHorizontal: 20, paddingVertical: 32, maxWidth: 640, alignSelf: 'center', width: '100%' },

  // Header
  headerSection: { marginBottom: 28 },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderWidth: 1, borderColor: 'rgba(14,165,233,0.25)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16,
  },
  headerBadgeText: { color: Colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8, lineHeight: 36 },
  desc: { color: Colors.white60, fontSize: 15, lineHeight: 22 },

  // Progress
  progressRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 32,
    paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.white10,
  },
  progressItem: { alignItems: 'center', gap: 6 },
  progressDot: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.white20, backgroundColor: Colors.white05,
    alignItems: 'center', justifyContent: 'center',
  },
  progressDotActive: { borderColor: Colors.primary, backgroundColor: 'rgba(14,165,233,0.15)' },
  progressNum: { color: Colors.white40, fontSize: 13, fontWeight: '700' },
  progressNumActive: { color: Colors.primary },
  progressLabel: { color: Colors.white50, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },

  // Sections
  section: {
    marginBottom: 28, gap: 12,
    borderWidth: 1, borderColor: Colors.white10, backgroundColor: Colors.white05,
    borderRadius: 20, padding: 20,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionNum: { color: Colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },

  // Fields
  fieldGroup: { gap: 14 },
  label: { color: Colors.white70, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.white15, backgroundColor: 'rgba(2,44,34,0.5)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#fff',
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputCol: { flex: 1 },

  // Date/time pickers
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateTimeCol: { flex: 1 },
  chipsRow: { gap: 8, paddingBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.white20,
    backgroundColor: 'rgba(2,44,34,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14,165,233,0.2)',
  },
  chipText: { color: Colors.white70, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  helperText: { color: Colors.white50, fontSize: 12, marginTop: 8 },
  dateBtn: {
    borderWidth: 1, borderColor: Colors.white15, backgroundColor: 'rgba(2,44,34,0.5)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    alignItems: 'center',
  },
  dateBtnTextSelected: { color: '#fff', fontSize: 14, fontWeight: '600' },
  dateBtnTextPlaceholder: { color: Colors.white40, fontSize: 14 },
  pickerContainer: {
    backgroundColor: 'rgba(2,44,34,0.85)',
    borderWidth: 1, borderColor: Colors.white15,
    borderRadius: 16, overflow: 'hidden', marginTop: 4,
  },
  pickerDoneBtn: {
    alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 10,
  },
  pickerDoneBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },

  // Experience preview
  experiencePreview: { backgroundColor: Colors.white05, borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  experiencePreviewText: { color: Colors.white70, fontSize: 14, lineHeight: 20 },

  // Availability
  availabilityBox: { borderWidth: 1, borderColor: Colors.white10, backgroundColor: Colors.white05, borderRadius: 16, padding: 16, gap: 10 },
  availHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  availIcon: { fontSize: 16 },
  availabilityTitle: { color: Colors.white80, fontSize: 14, fontWeight: '600' },
  availabilityHint: { color: Colors.white50, fontSize: 13 },
  availRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  availText: { color: Colors.white70, fontSize: 13 },
  availCapBadge: { backgroundColor: Colors.white10, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  availCapText: { color: Colors.white60, fontSize: 11, fontWeight: '600' },

  // Error
  errorBox: {
    backgroundColor: 'rgba(253,164,175,0.08)', borderWidth: 1, borderColor: 'rgba(253,164,175,0.2)',
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  errorText: { color: Colors.rose300, fontSize: 14 },

  // Submit
  submitBtn: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: Colors.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase' },
  submitArrow: { color: '#fff', fontSize: 18, fontWeight: '700' },
  disclaimer: { color: Colors.white40, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16 },

  totalBox: {
    borderWidth: 1,
    borderColor: Colors.white15,
    backgroundColor: Colors.white05,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 6,
  },
  totalLabel: { color: Colors.white80, fontSize: 14, fontWeight: '600' },
  totalValue: { color: Colors.primary, fontSize: 22, fontWeight: '800' },
  totalHint: { color: Colors.white50, fontSize: 11, lineHeight: 16 },

  // Buttons
  btnPrimary: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
  btnOutline: { borderWidth: 1, borderColor: Colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnOutlineText: { color: Colors.primary, fontWeight: '700', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
  btnGhost: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnGhostText: { color: Colors.white60, fontWeight: '600', fontSize: 14 },
});
