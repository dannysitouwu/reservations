import { motion } from 'framer-motion';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';
import { useSupabase } from '../providers/SupabaseProvider';

export function AuthPage() {
  const { client, session } = useSupabase();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      setFullName(first);
      setLastName(rest.join(' '));
      setPhone(data.phone ?? '');
      const meta = (data.metadata as Record<string, unknown> | null) ?? {};
      setUsername(typeof meta.username === 'string' ? meta.username : '');
    };

    void loadProfile();
  }, [client, session?.user?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSignIn && password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    if (isSignIn) {
      const {
        error: signInError,
        data: { session: nextSession }
      } = await client.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
      } else if (nextSession) {
        setMessage(t('auth.signedIn', { email: nextSession.user.email }));
      }
    } else {
      const { data, error: signUpError } = await client.auth.signUp({ email, password });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        if (data.session?.user?.id) {
          const composedName = [fullName.trim(), lastName.trim()].filter(Boolean).join(' ').trim() || null;
          await client
            .from('profiles')
            .update({
              full_name: composedName,
              phone: phone.trim() || null,
              metadata: {
                username: username.trim() || null,
                last_name: lastName.trim() || null
              }
            })
            .eq('id', data.session.user.id);
        }

        setMessage(t('auth.checkEmail', { email: data.user?.email ?? email }));
        setMode('signIn');
        setPassword('');
        setConfirmPassword('');
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

    const composedName = [fullName.trim(), lastName.trim()].filter(Boolean).join(' ').trim() || null;

    const { error: updateError } = await client
      .from('profiles')
      .update({
        full_name: composedName,
        phone: phone.trim() || null,
        metadata: {
          username: username.trim() || null,
          last_name: lastName.trim() || null
        }
      })
      .eq('id', session.user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(t('auth.profileSaved'));
    }
    setSavingProfile(false);
  };

  return (
    <section className="py-24 text-white">
      <Container className="max-w-3xl">
        <SectionHeading title={t('auth.title') as string} description={t('auth.description') as string} />
        <motion.div
          className="mt-12 rounded-3xl border border-white/10 bg-white/10 p-8 shadow-card backdrop-blur-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {session ? (
            <div className="space-y-4 text-sm text-white/70">
              <p>{t('auth.signedAs', { email: session.user.email })}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-white/80" htmlFor="profile_name">
                    {t('auth.profileFirstName')}
                  </label>
                  <input
                    id="profile_name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/80" htmlFor="profile_last_name">
                    {t('auth.profileLastName')}
                  </label>
                  <input
                    id="profile_last_name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/80" htmlFor="profile_phone">
                    {t('auth.profilePhone')}
                  </label>
                  <input
                    id="profile_phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    type="tel"
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/80" htmlFor="profile_username">
                    {t('auth.profileUsername')}
                  </label>
                  <input
                    id="profile_username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white"
                  />
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? t('auth.savingProfile') : t('auth.saveProfile')}
              </button>
              <button className="btn btn-ghost border-white/20" onClick={handleSignOut}>
                {t('auth.signOut')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white/80" htmlFor="email">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  required
                  className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80" htmlFor="password">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  required
                  className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
                />
              </div>
              {!isSignIn ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-white/80" htmlFor="confirmPassword">
                      {t('auth.confirmPassword')}
                    </label>
                    <input
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      type="password"
                      required
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80" htmlFor="signup_username">
                      {t('auth.profileUsername')}
                    </label>
                    <input
                      id="signup_username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      type="text"
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80" htmlFor="signup_name">
                      {t('auth.profileFirstName')}
                    </label>
                    <input
                      id="signup_name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      type="text"
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80" htmlFor="signup_last_name">
                      {t('auth.profileLastName')}
                    </label>
                    <input
                      id="signup_last_name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      type="text"
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80" htmlFor="signup_phone">
                      {t('auth.profilePhone')}
                    </label>
                    <input
                      id="signup_phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      type="tel"
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-brand-background/60 px-4 py-3 text-sm text-white"
                    />
                  </div>
                </div>
              ) : null}
              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center text-base">
                {loading ? (isSignIn ? t('auth.signingIn') : t('auth.signingUp')) : isSignIn ? t('auth.signIn') : t('auth.createAccount')}
              </button>
              <p className="text-center text-sm text-white/70">
                {isSignIn ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
                <button type="button" onClick={toggleMode} className="font-semibold text-brand-accent hover:underline">
                  {isSignIn ? t('auth.createAccount') : t('auth.signInHere')}
                </button>
              </p>
            </form>
          )}
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
        </motion.div>
      </Container>
    </section>
  );
}
