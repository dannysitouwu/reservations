import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../../components/ui/Container';
import { GradientText } from '../../components/ui/GradientText';

export function Hero() {
  const { t } = useTranslation();
  const stats = t('hero.stats', { returnObjects: true }) as Array<{ value: string; label: string }>;
  const team = t('hero.card.team', { returnObjects: true }) as string[];

  return (
    <section className="relative overflow-hidden pt-24 pb-32">
      <div className="absolute inset-0 bg-gradient-hero opacity-80" aria-hidden />
      <motion.div
        className="absolute left-1/2 top-40 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-secondary/30 blur-3xl"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1.05 }}
        transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse' }}
      />
      <Container className="relative">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-white/70">
              {t('hero.badge')}
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
              {t('hero.titleLead')}{' '}
              <GradientText>{t('hero.titleHighlight')}</GradientText>
            </h1>
            <p className="max-w-xl text-lg text-white/70 sm:text-xl">{t('hero.description')}</p>
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              <Link to="/reservations/new" className="btn btn-primary">
                {t('hero.primaryCta')}
              </Link>
              <Link to="/reservations/options" className="btn btn-ghost border-white/20 text-white hover:bg-white/15">
                {t('hero.secondaryCta')}
              </Link>
            </div>
            <div className="flex items-center gap-8 pt-6 text-sm text-white/60">
              {stats.map((item) => (
                <div key={item.label}>
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                  <p>{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1 }}
          >
            <div className="relative aspect-[4/5] w-full max-w-sm rounded-[3rem] border border-white/15 bg-gradient-to-b from-white/20 to-white/5 p-6 shadow-card backdrop-blur-xl">
              <motion.div
                className="absolute -top-10 right-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-center text-xs font-semibold uppercase text-white/80"
                initial={{ y: -12 }}
                animate={{ y: 12 }}
                transition={{ duration: 3.4, repeat: Infinity, repeatType: 'reverse' }}
              >
                <span>
                  AI-powered
                  <br /> concierge
                </span>
              </motion.div>

              <div className="space-y-6 text-white">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-widest text-white/60">{t('hero.card.statusTitle')}</p>
                  <p className="text-lg font-semibold">{t('hero.card.itinerary')}</p>
                  <p className="text-sm text-white/60">{t('hero.card.schedule')}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/50">{t('hero.card.teamTitle')}</p>
                  <ul className="space-y-2 text-sm text-white/70">
                    {team.map((member) => (
                      <li key={member}>• {member}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/70">{t('hero.card.testimonial')}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
