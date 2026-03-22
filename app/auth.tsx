import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MainLayout from '../src/components/MainLayout';
import { Picker } from '../src/components/Picker';
import { Colors } from '../src/constants/colors';
import { useSupabase } from '../src/providers/SupabaseProvider';

const COUNTRY_CODES = [
  { label: 'Costa Rica (+506)', value: '+506' },
  { label: 'Panama (+507)', value: '+507' },
  { label: 'Nicaragua (+505)', value: '+505' },
  { label: 'Guatemala (+502)', value: '+502' },
  { label: 'El Salvador (+503)', value: '+503' },
  { label: 'Honduras (+504)', value: '+504' },
  { label: 'USA / Canada (+1)', value: '+1' },
];

function formatLocalPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

function parseStoredPhone(value: string | null): { countryCode: string; local: string } {
  if (!value) return { countryCode: '+506', local: '' };
  const clean = value.trim();
  const match = clean.match(/^(\+\d{1,3})\s*(.*)$/);
  const countryCode = match?.[1] ?? '+506';
  const local = formatLocalPhoneInput(match?.[2] ?? clean.replace(/^\+\d{1,3}/, ''));
  return { countryCode, local };
}

export default function AuthPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { client, session } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+506');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const isSignIn = mode === 'signIn';

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) return;
      const { data } = await client
        .from('profiles')
        .select('full_name, phone, metadata')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!data) return;
      const full = data.full_name ?? '';
      const [first = '', ...rest] = full.split(' ');
      setFirstName(first);
      setLastName(rest.join(' '));
      const parsedPhone = parseStoredPhone(data.phone ?? '');
      setPhoneCountryCode(parsedPhone.countryCode);
      setPhone(parsedPhone.local);
      const metadata = (data.metadata as Record<string, unknown> | null) ?? {};
      setUsername(typeof metadata.username === 'string' ? metadata.username : '');
    };
    void loadProfile();
  }, [client, session?.user?.id]);

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!isSignIn && password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    if (!isSignIn && password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!isSignIn && phone && phoneDigits.length !== 8) {
      setError('Ingresa un teléfono válido de 8 dígitos.');
      return;
    }

    setLoading(true);

    if (isSignIn) {
      const { error: signInError, data } = await client.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else if (data?.session) {
        setMessage(t('auth.signedIn'));
      }
    } else {
      const { data, error: signUpError } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else if (data?.session) {
        const composedName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim() || null;
        const normalizedPhone = phoneDigits ? `${phoneCountryCode} ${formatLocalPhoneInput(phone)}` : null;
        await client
          .from('profiles')
          .update({
            full_name: composedName,
            phone: normalizedPhone,
            metadata: {
              username: username.trim() || null,
              last_name: lastName.trim() || null,
            },
          })
          .eq('id', data.session.user.id);
        setMessage(t('auth.signedIn'));
      } else if (data?.user && !data.session) {
        // Fallback: sign in manually after signup
        const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setError(signInErr.message);
        } else {
          setMessage(t('auth.signedIn'));
        }
      }
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setMode(isSignIn ? 'signUp' : 'signIn');
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSignOut = async () => {
    await client.auth.signOut();
  };

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;
    setSavingProfile(true);
    setError(null);
    setMessage(null);

    const phoneDigits = phone.replace(/\D/g, '');
    if (phone && phoneDigits.length !== 8) {
      setError('Ingresa un teléfono válido de 8 dígitos.');
      setSavingProfile(false);
      return;
    }

    const composedName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim() || null;
    const normalizedPhone = phoneDigits ? `${phoneCountryCode} ${formatLocalPhoneInput(phone)}` : null;
    const { error: updateError } = await client
      .from('profiles')
      .update({
        full_name: composedName,
        phone: normalizedPhone,
        metadata: {
          username: username.trim() || null,
          last_name: lastName.trim() || null,
        },
      })
      .eq('id', session.user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage('Perfil actualizado correctamente.');
    }

    setSavingProfile(false);
  };

  return (
    <MainLayout>
      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.title')}</Text>
        <Text style={styles.desc}>{t('auth.description')}</Text>

        <View style={styles.formCard}>
          {session ? (
            <View style={styles.signedInContainer}>
              <View style={styles.accountHeaderCard}>
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarText}>
                    {(username || firstName || 'RP').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{[firstName, lastName].filter(Boolean).join(' ') || username || 'Perfil'}</Text>
                  <Text style={styles.signedInText}>{t('auth.signedAs', { email: session.user?.email })}</Text>
                </View>
              </View>

              <View style={styles.profileGrid}>
                <View style={styles.profileField}>
                  <Text style={styles.label}>Nombre</Text>
                  <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholderTextColor={Colors.white40} />
                </View>
                <View style={styles.profileField}>
                  <Text style={styles.label}>Apellidos</Text>
                  <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholderTextColor={Colors.white40} />
                </View>
                <View style={styles.profileField}>
                  <Text style={styles.label}>Teléfono</Text>
                  <View style={styles.phoneRow}>
                    <View style={styles.phoneCodeCol}>
                      <Picker value={phoneCountryCode} onValueChange={setPhoneCountryCode} items={COUNTRY_CODES} />
                    </View>
                    <View style={styles.phoneLocalCol}>
                      <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={(v) => setPhone(formatLocalPhoneInput(v))}
                        placeholder="1234-5678"
                        placeholderTextColor={Colors.white40}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.profileField}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholderTextColor={Colors.white40} autoCapitalize="none" />
                </View>
              </View>
              <Pressable style={[styles.btnPrimary, savingProfile && styles.btnDisabled]} onPress={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Guardar perfil</Text>}
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={handleSignOut}>
                <Text style={styles.btnGhostText}>{t('auth.signOut')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View>
                <Text style={styles.label}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={Colors.white40}
                />
              </View>
              <View>
                <Text style={styles.label}>{t('auth.password')}</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor={Colors.white40}
                />
              </View>
              {!isSignIn ? (
                <View style={styles.profileGrid}>
                  <View style={styles.profileField}>
                    <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      placeholderTextColor={Colors.white40}
                    />
                  </View>
                  <View style={styles.profileField}>
                    <Text style={styles.label}>Nombre</Text>
                    <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholderTextColor={Colors.white40} />
                  </View>
                  <View style={styles.profileField}>
                    <Text style={styles.label}>Apellidos</Text>
                    <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholderTextColor={Colors.white40} />
                  </View>
                  <View style={styles.profileField}>
                    <Text style={styles.label}>Teléfono</Text>
                    <View style={styles.phoneRow}>
                      <View style={styles.phoneCodeCol}>
                        <Picker value={phoneCountryCode} onValueChange={setPhoneCountryCode} items={COUNTRY_CODES} />
                      </View>
                      <View style={styles.phoneLocalCol}>
                        <TextInput
                          style={styles.input}
                          value={phone}
                          onChangeText={(v) => setPhone(formatLocalPhoneInput(v))}
                          placeholder="1234-5678"
                          placeholderTextColor={Colors.white40}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.profileField}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholderTextColor={Colors.white40} autoCapitalize="none" />
                  </View>
                </View>
              ) : null}
              <Pressable
                style={[styles.btnPrimary, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {isSignIn ? t('auth.signIn') : t('auth.createAccount')}
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={toggleMode} style={styles.toggleRow}>
                <Text style={styles.toggleText}>
                  {isSignIn ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
                </Text>
                <Text style={styles.toggleLink}>
                  {isSignIn ? t('auth.createAccount') : t('auth.signInHere')}
                </Text>
              </Pressable>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
        </View>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 32 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  desc: { color: Colors.white70, fontSize: 15, textAlign: 'center', marginBottom: 24 },
  formCard: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: 'rgba(9,66,55,0.42)',
    borderRadius: 24,
    padding: 24,
  },
  signedInContainer: { gap: 16 },
  accountHeaderCard: {
    borderWidth: 1,
    borderColor: Colors.white15,
    backgroundColor: 'rgba(2,44,34,0.55)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(14,165,233,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  accountName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  signedInText: { color: Colors.white70, fontSize: 14 },
  form: { gap: 18 },
  label: { color: Colors.white80, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.white20,
    backgroundColor: 'rgba(2,44,34,0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#fff',
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  btnGhost: {
    borderWidth: 1,
    borderColor: Colors.white20,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  btnGhostText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  toggleText: { color: Colors.white70, fontSize: 14 },
  toggleLink: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  error: { color: Colors.rose300, fontSize: 13, marginTop: 12 },
  success: { color: Colors.emerald300, fontSize: 13, marginTop: 12 },
  profileGrid: { gap: 12 },
  profileField: { gap: 6 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  phoneCodeCol: { flex: 1 },
  phoneLocalCol: { flex: 1.2 },
});
