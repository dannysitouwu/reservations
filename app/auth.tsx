import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

function initialsFromProfile(firstName: string, lastName: string, username: string): string {
  const f = firstName.trim();
  const l = lastName.trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f.length >= 2) return f.slice(0, 2).toUpperCase();
  const u = username.trim();
  if (u.length >= 2) return u.slice(0, 2).toUpperCase();
  if (f) return `${f[0]}P`.toUpperCase();
  if (u) return `${u[0]}?`.toUpperCase();
  return 'RP';
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
  const { width: winW } = useWindowDimensions();
  const { client, session } = useSupabase();
  const layoutW =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? Math.min(window.innerWidth, winW)
      : winW;
  const isDesktopWeb = Platform.OS === 'web' && layoutW >= 768;
  const formMaxWidth = isDesktopWeb ? (session ? 880 : 440) : undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+506');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
      setAvatarUrl(typeof metadata.avatar_url === 'string' ? metadata.avatar_url : '');
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
        const { data: prevRow } = await client
          .from('profiles')
          .select('metadata')
          .eq('id', data.session.user.id)
          .maybeSingle();
        const prevMeta = (prevRow?.metadata as Record<string, unknown> | null) ?? {};
        await client
          .from('profiles')
          .update({
            full_name: composedName,
            phone: normalizedPhone,
            metadata: {
              ...prevMeta,
              username: username.trim() || null,
              last_name: lastName.trim() || null,
              avatar_url: avatarUrl.trim() || null,
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

  const handlePickAvatar = async () => {
    if (!session?.user?.id) return;
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Necesitamos permiso para acceder a tu galería y subir la foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const uri = asset.uri;
      const isPng = asset.mimeType === 'image/png' || /\.png(\?|$)/i.test(uri);
      const ext = isPng ? 'png' : 'jpg';
      const contentType = isPng ? 'image/png' : 'image/jpeg';
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: upErr } = await client.storage.from('avatars').upload(path, blob, {
        upsert: true,
        contentType,
      });
      if (upErr) throw upErr;
      const { data: pub } = client.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto. Intenta otra imagen.');
    } finally {
      setUploadingAvatar(false);
    }
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
    const { data: prevRow } = await client.from('profiles').select('metadata').eq('id', session.user.id).maybeSingle();
    const prevMeta = (prevRow?.metadata as Record<string, unknown> | null) ?? {};
    const { error: updateError } = await client
      .from('profiles')
      .update({
        full_name: composedName,
        phone: normalizedPhone,
        metadata: {
          ...prevMeta,
          username: username.trim() || null,
          last_name: lastName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('auth.title')}</Text>
        <Text style={styles.desc}>{t('auth.description')}</Text>

        <View style={[styles.formCard, formMaxWidth != null && { maxWidth: formMaxWidth, width: '100%', alignSelf: 'center' }]}>
          {session ? (
            <View style={styles.signedInContainer}>
              {isDesktopWeb ? (
                <View style={styles.desktopProfileRow}>
                  <View style={styles.profileHeroCol}>
                    <View style={[styles.accountAvatar, styles.accountAvatarDesktop]}>
                      {avatarUrl.trim() ? (
                        <Image source={{ uri: avatarUrl.trim() }} style={styles.accountAvatarImage} />
                      ) : (
                        <Text style={styles.accountAvatarTextDesktop}>
                          {initialsFromProfile(firstName, lastName, username)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.accountNameDesktop}>
                      {[firstName, lastName].filter(Boolean).join(' ') || username || 'Perfil'}
                    </Text>
                    <Text style={styles.signedInTextDesktop}>{t('auth.signedAs', { email: session.user?.email })}</Text>
                  </View>
                  <View style={styles.profileFieldsCol}>
                    <Text style={styles.sectionEyebrow}>Datos del perfil</Text>
                    <View style={[styles.profileGrid, styles.profileGridDesktop]}>
                      <View style={[styles.profileField, styles.profileFieldHalf]}>
                        <Text style={styles.label}>Nombre</Text>
                        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholderTextColor={Colors.white40} />
                      </View>
                      <View style={[styles.profileField, styles.profileFieldHalf]}>
                        <Text style={styles.label}>Apellidos</Text>
                        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholderTextColor={Colors.white40} />
                      </View>
                      <View style={[styles.profileField, styles.profileFieldFull]}>
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
                      <View style={[styles.profileField, styles.profileFieldHalf]}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                          style={styles.input}
                          value={username}
                          onChangeText={setUsername}
                          placeholderTextColor={Colors.white40}
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={[styles.profileField, styles.profileFieldFull]}>
                        <Text style={styles.photoHint}>Elige una imagen de perfil (Opcional)</Text>
                        <View style={styles.photoActions}>
                          <Pressable
                            style={[styles.btnPhoto, (uploadingAvatar || savingProfile) && styles.btnDisabled]}
                            onPress={() => void handlePickAvatar()}
                            disabled={uploadingAvatar || savingProfile}
                          >
                            {uploadingAvatar ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.btnPhotoText}>{avatarUrl.trim() ? 'Cambiar foto' : 'Subir foto'}</Text>
                            )}
                          </Pressable>
                          {avatarUrl.trim() ? (
                            <Pressable
                              style={styles.btnPhotoGhost}
                              onPress={() => setAvatarUrl('')}
                              disabled={uploadingAvatar || savingProfile}
                            >
                              <Text style={styles.btnPhotoGhostText}>Quitar</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    </View>
                    <View style={styles.desktopActions}>
                      <Pressable
                        style={[styles.btnPrimary, styles.btnPrimaryDesktop, savingProfile && styles.btnDisabled]}
                        onPress={handleSaveProfile}
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.btnPrimaryText}>Guardar perfil</Text>
                        )}
                      </Pressable>
                      <Pressable style={styles.btnSignOutLink} onPress={handleSignOut}>
                        <Text style={styles.btnSignOutLinkText}>{t('auth.signOut')}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.accountHeaderCard}>
                    <View style={styles.accountAvatar}>
                      {avatarUrl.trim() ? (
                        <Image source={{ uri: avatarUrl.trim() }} style={styles.accountAvatarImage} />
                      ) : (
                        <Text style={styles.accountAvatarText}>{initialsFromProfile(firstName, lastName, username)}</Text>
                      )}
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
                    <View style={styles.profileField}>
                      <Text style={styles.label}>Foto de perfil</Text>
                      <Text style={styles.photoHint}>Elige una imagen de perfil</Text>
                      <View style={styles.photoActions}>
                        <Pressable
                          style={[styles.btnPhoto, (uploadingAvatar || savingProfile) && styles.btnDisabled]}
                          onPress={() => void handlePickAvatar()}
                          disabled={uploadingAvatar || savingProfile}
                        >
                          {uploadingAvatar ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.btnPhotoText}>{avatarUrl.trim() ? 'Cambiar foto' : 'Subir foto'}</Text>
                          )}
                        </Pressable>
                        {avatarUrl.trim() ? (
                          <Pressable
                            style={styles.btnPhotoGhost}
                            onPress={() => setAvatarUrl('')}
                            disabled={uploadingAvatar || savingProfile}
                          >
                            <Text style={styles.btnPhotoGhostText}>Quitar</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <Pressable style={[styles.btnPrimary, savingProfile && styles.btnDisabled]} onPress={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Guardar perfil</Text>}
                  </Pressable>
                  <Pressable style={styles.btnGhost} onPress={handleSignOut}>
                    <Text style={styles.btnGhostText}>{t('auth.signOut')}</Text>
                  </Pressable>
                </>
              )}
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
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
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
    overflow: 'hidden',
  },
  accountAvatarImage: { width: '100%', height: '100%' },
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
  btnGhostSecondary: {
    maxWidth: 220,
    alignSelf: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  btnGhostText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  toggleText: { color: Colors.white70, fontSize: 14 },
  toggleLink: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  error: { color: Colors.rose300, fontSize: 13, marginTop: 12 },
  success: { color: Colors.emerald300, fontSize: 13, marginTop: 12 },
  profileGrid: { gap: 12 },
  profileGridDesktop: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 },
  profileField: { gap: 6 },
  profileFieldHalf: { flex: 1, minWidth: 200, maxWidth: '48%' as const },
  profileFieldFull: { width: '100%' as const, flexBasis: '100%' },
  photoHint: { color: Colors.white50, fontSize: 13, lineHeight: 18 },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  btnPhoto: {
    backgroundColor: 'rgba(14,165,233,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    minWidth: 140,
    alignItems: 'center',
  },
  btnPhotoText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnPhotoGhost: {
    borderWidth: 1,
    borderColor: Colors.white20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: 'center',
  },
  btnPhotoGhostText: { color: Colors.white70, fontWeight: '600', fontSize: 14 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  phoneCodeCol: { flex: 1 },
  phoneLocalCol: { flex: 1.2 },
  desktopProfileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
    width: '100%',
  },
  profileHeroCol: {
    width: 200,
    alignItems: 'center',
    flexShrink: 0,
  },
  accountAvatarDesktop: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  accountAvatarTextDesktop: { color: '#fff', fontSize: 32, fontWeight: '800' },
  accountNameDesktop: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  signedInTextDesktop: {
    color: Colors.white60,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  profileFieldsCol: { flex: 1, minWidth: 0, gap: 16 },
  sectionEyebrow: {
    color: Colors.white50,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  desktopActions: { gap: 14, marginTop: 4 },
  btnPrimaryDesktop: { paddingVertical: 16, borderRadius: 14 },
  btnSignOutLink: { alignSelf: 'flex-start', paddingVertical: 4 },
  btnSignOutLinkText: { color: Colors.white60, fontSize: 14, fontWeight: '600' },
});
