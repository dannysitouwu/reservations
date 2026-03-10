import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MainLayout from '../src/components/MainLayout';
import { Colors } from '../src/constants/colors';
import { useSupabase } from '../src/providers/SupabaseProvider';

export default function AuthPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { client, session } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const isSignIn = mode === 'signIn';

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!isSignIn && password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
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
      const { data, error: signUpError } = await client.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
      } else if (data?.session) {
        // Auto signed-in (email confirmation disabled)
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

  return (
    <MainLayout>
      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.title')}</Text>
        <Text style={styles.desc}>{t('auth.description')}</Text>

        <View style={styles.formCard}>
          {session ? (
            <View style={styles.signedInContainer}>
              <Text style={styles.signedInText}>
                {t('auth.signedAs', { email: session.user?.email })}
              </Text>
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
                <View>
                  <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholderTextColor={Colors.white40}
                  />
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
    backgroundColor: Colors.white10,
    borderRadius: 24,
    padding: 24,
  },
  signedInContainer: { gap: 16 },
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
});
