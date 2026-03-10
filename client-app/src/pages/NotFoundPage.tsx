import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/ui/Container';
import { motion } from 'framer-motion';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="py-24 text-white">
      <Container className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <motion.div
          className="rounded-full border border-white/20 bg-white/10 px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/60"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          404
        </motion.div>
        <motion.h1
          className="mt-8 font-display text-4xl font-semibold"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {t('notFound.title')}
        </motion.h1>
        <motion.p
          className="mt-4 max-w-xl text-white/70"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {t('notFound.description')}
        </motion.p>
        <Link to="/" className="btn btn-primary mt-10">
          {t('notFound.cta')}
        </Link>
      </Container>
    </section>
  );
}
