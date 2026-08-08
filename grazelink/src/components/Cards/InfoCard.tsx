import { motion } from 'framer-motion';
import { IconType } from 'react-icons';

interface InfoCardProps {
  icon: IconType;
  title: string;
  description: string;
  index: number;
}

export default function InfoCard({ icon: Icon, title, description, index }: InfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group rounded-3xl border border-white/10 bg-white/[0.06] p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:bg-white/[0.09]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-2xl text-primary-light transition-colors group-hover:bg-primary group-hover:text-white">
        <Icon />
      </div>
      <h4 className="mt-5 text-lg font-bold text-white">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
    </motion.div>
  );
}
