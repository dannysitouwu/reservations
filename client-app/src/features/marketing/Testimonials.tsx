import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';

export function Testimonials() {
  const { t } = useTranslation();
  const items = t('testimonials.items', { returnObjects: true }) as Array<{
    quote: string;
    name: string;
    role: string;
  }>;

  return (
    <section className="py-24">
      <Container>
        <SectionHeading
          eyebrow={t('testimonials.eyebrow') as string}
          title={t('testimonials.title') as string}
          description={t('testimonials.description') as string}
        />
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {items.map((testimonial, index) => (
            <motion.figure
              key={testimonial.name}
              className="card h-full bg-gradient-to-br from-white/10 via-white/5 to-white/10"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: index * 0.12 }}
              viewport={{ once: true, amount: 0.35 }}
            >
              <blockquote className="text-lg leading-relaxed text-white/85">“{testimonial.quote}”</blockquote>
              <figcaption className="mt-6 text-sm uppercase tracking-widest text-white/60">
                {testimonial.name}
                <br />
                <span className="text-white/40">{testimonial.role}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
