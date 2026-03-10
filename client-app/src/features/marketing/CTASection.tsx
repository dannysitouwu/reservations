import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../../components/ui/Container';

export function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="pb-24">
      <Container>
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent p-[1px] shadow-card"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.4 }}
        >
          <div className="relative rounded-[calc(1.5rem-1px)] bg-brand-background/90 px-10 py-16 backdrop-blur-xl lg:flex lg:items-center lg:justify-between">
            <div className="space-y-4 text-white">
              <h3 className="font-display text-3xl font-semibold">{t('cta.title')}</h3>
              <p className="max-w-2xl text-white/70">{t('cta.description')}</p>
            </div>
            <div className="mt-8 flex flex-col gap-4 text-sm font-semibold text-white lg:mt-0 lg:flex-row">
              <Link to="/reservations/new" className="btn btn-primary">
                {t('cta.primary')}
              </Link>
              <Link to="/auth" className="btn btn-ghost border-white/30">
                {t('cta.secondary')}
              </Link>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
