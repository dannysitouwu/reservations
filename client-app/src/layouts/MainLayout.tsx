import { PropsWithChildren, useMemo } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/ui/Container';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function MainLayout({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const navItems = useMemo(
    () => t('navigation.items', { returnObjects: true }) as Array<{ to: string; label: string }>,
    [t]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-md transition-all duration-500">
        <Container className="flex items-center justify-between py-6 text-white">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-base font-bold">
              RP
            </div>
            ReservaPro
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/80 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative transition-colors duration-300 hover:text-white ${
                    isActive ? 'text-white after:absolute after:-bottom-2 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-brand-secondary' : ''
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitcher />
            <Link
              to="/auth"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:-translate-y-0.5 hover:text-white"
            >
              {t('navigation.signIn')}
            </Link>
          </div>
        </Container>
        <div className="px-6 pb-4 lg:hidden">
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-white/10 bg-brand-background/70 py-12 text-sm text-white/60">
        <Container className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-white">ReservaPro</p>
            <p className="max-w-md text-white/50">{t('footer.description')}</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <Link to="/reservations/options" className="hover:text-white">
              {t('footer.links.experiences')}
            </Link>
            <Link to="/reservations/new" className="hover:text-white">
              {t('footer.links.plan')}
            </Link>
            <Link to="/reservations/status" className="hover:text-white">
              {t('footer.links.status')}
            </Link>
            <Link to="/auth" className="hover:text-white">
              {t('footer.links.concierge')}
            </Link>
          </div>
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} ReservaPro. {t('footer.copyright')}
          </p>
        </Container>
      </footer>
    </div>
  );
}
