import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';

export function Highlights() {
  const { t } = useTranslation();
  const items = t('highlights.items', { returnObjects: true }) as Array<{
    icon: string;
    title: string;
    description: string;
  }>;

  return (
    <section className="py-24">
      <Container>
        <SectionHeading
          eyebrow={t('highlights.eyebrow') as string}
          title={t('highlights.title') as string}
          description={t('highlights.description') as string}
        />
        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {items.map((feature, index) => (
            <motion.article
              key={feature.title}
              className="card h-full space-y-6 text-white"
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true, amount: 0.4 }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="text-white/70">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}
