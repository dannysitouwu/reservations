import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
};

export function SectionHeading({ eyebrow, title, description, align = 'center', className }: SectionHeadingProps) {
  return (
    <motion.header
      className={clsx('mx-auto max-w-3xl space-y-4', align === 'center' ? 'text-center' : 'text-left', className)}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true, amount: 0.4 }}
    >
      {eyebrow ? <p className="badge mx-auto w-fit text-xs uppercase tracking-[0.3em]">{eyebrow}</p> : null}
      <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">{title}</h2>
      {description ? <p className="text-lg text-white/70">{description}</p> : null}
    </motion.header>
  );
}
