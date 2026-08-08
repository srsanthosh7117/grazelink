import { motion } from 'framer-motion';
import { IconType } from 'react-icons';

interface FeatureCardProps {
  icon: IconType;
  title: string;
  description: string;
  index: number;
}

export default function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card"
    >
      <span className="pointer-events-none absolute -right-3 -top-5 text-6xl font-extrabold text-black/[0.04] transition-colors group-hover:text-primary/10 dark:text-white/[0.06]">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-glow dark:bg-primary/20 dark:text-primary-light">
        <Icon />
      </div>
      <h3 className="relative mt-5 text-lg font-bold text-ink dark:text-white">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted dark:text-dark-muted">{description}</p>
    </motion.div>
  );
}
