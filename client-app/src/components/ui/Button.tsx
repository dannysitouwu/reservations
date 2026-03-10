import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

const baseStyles =
  'inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary: 'bg-brand-primary text-white shadow-glow hover:-translate-y-0.5 hover:shadow-lg',
  secondary: 'bg-white/10 text-white backdrop-blur border border-white/20 hover:bg-white/20',
  ghost: 'bg-transparent text-white hover:bg-white/10'
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={clsx(baseStyles, variants[variant], className)} {...props} />
  )
);

Button.displayName = 'Button';
