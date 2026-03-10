import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';

export function ReservationFlow() {
  const { t } = useTranslation();
  const steps = t('flow.steps', { returnObjects: true }) as Array<{
    step: string;
    title: string;
    description: string;
  }>;

  return (
    <section className="py-24">
      <Container>
        <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-16 backdrop-blur-lg">
          <SectionHeading
            eyebrow={t('flow.eyebrow') as string}
            title={t('flow.title') as string}
            description={t('flow.description') as string}
          />
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                className="relative space-y-6 rounded-3xl border border-white/10 bg-brand-background/40 p-8 text-white"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                viewport={{ once: true, amount: 0.45 }}
              >
                <span className="text-5xl font-bold text-white/10">{step.step}</span>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-white/70">{step.description}</p>
                <motion.span
                  className="absolute -right-10 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-white md:flex"
                  initial={{ scale: 0.6, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.2 + 0.3 }}
                  viewport={{ once: true }}
                >
                  →
                </motion.span>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
