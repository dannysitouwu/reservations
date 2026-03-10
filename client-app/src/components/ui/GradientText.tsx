import { PropsWithChildren } from 'react';
import { clsx } from 'clsx';

export function GradientText({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={clsx(
        'bg-gradient-to-r from-brand-secondary via-brand-accent to-brand-primary bg-clip-text text-transparent',
        className
      )}
    >
      {children}
    </span>
  );
}
