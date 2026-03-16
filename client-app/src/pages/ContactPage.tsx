import { SectionHeading } from '../components/ui/SectionHeading';
import { Container } from '../components/ui/Container';
import { useTranslation } from 'react-i18next';

export function ContactPage() {
  const { t } = useTranslation();

  return (
    <section className="py-24 text-white">
      <Container className="max-w-4xl">
        <SectionHeading
          title={t('contact.title') as string}
          description={t('contact.description') as string}
          align="left"
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">WhatsApp</p>
            <a href="https://wa.me/50660001111" className="mt-3 block text-lg font-semibold text-white hover:text-brand-accent">
              +506 6000-1111
            </a>
            <p className="mt-2 text-sm text-white/60">{t('contact.whatsappHint')}</p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Email</p>
            <a href="mailto:concierge@reservapro.com" className="mt-3 block text-lg font-semibold text-white hover:text-brand-accent">
              concierge@reservapro.com
            </a>
            <p className="mt-2 text-sm text-white/60">{t('contact.emailHint')}</p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Tel</p>
            <a href="tel:+50622223333" className="mt-3 block text-lg font-semibold text-white hover:text-brand-accent">
              +506 2222-3333
            </a>
            <p className="mt-2 text-sm text-white/60">{t('contact.phoneHint')}</p>
          </article>
        </div>
      </Container>
    </section>
  );
}
