import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

const LANG_OPTIONS = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' }
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:-translate-y-0.5 hover:text-white"
        title={t('languageSwitcher.tooltip')}
      >
        {i18n.language === 'es' ? 'ES' : 'EN'}
        <span aria-hidden className="text-white/50">▾</span>
      </button>
      {open ? (
        <ul className="absolute right-0 mt-2 w-28 rounded-xl border border-white/15 bg-brand-background/90 p-1 text-xs font-semibold text-white shadow-card backdrop-blur">
          {LANG_OPTIONS.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                onClick={() => handleSelect(option.code)}
                className={clsx(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 transition hover:bg-white/10',
                  i18n.language === option.code ? 'text-brand-accent' : 'text-white/80'
                )}
              >
                <span>{option.label}</span>
                {i18n.language === option.code ? <span aria-hidden>•</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
