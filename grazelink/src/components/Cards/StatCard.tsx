import { IconType } from 'react-icons';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: IconType;
  label: string;
  value: string | number;
  subtext?: string;
  accent?: string;
  index?: number;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  accent = 'text-primary bg-primary/10 dark:bg-primary/20 dark:text-primary-light',
  index = 0,
  trend,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${accent}`}>
          <Icon />
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              trend.isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-extrabold tracking-tight text-ink dark:text-white">{value}</p>
        <p className="mt-1 text-sm font-medium text-muted dark:text-dark-muted">{label}</p>
        {subtext && <p className="mt-1 text-xs text-muted/70 dark:text-dark-muted/60">{subtext}</p>}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
}
