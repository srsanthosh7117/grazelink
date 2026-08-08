import { motion } from 'framer-motion';
import { FiUsers, FiTarget, FiEye, FiTrendingUp } from 'react-icons/fi';
import { IconType } from 'react-icons';

const ITEMS: { icon: IconType; title: string; text: string }[] = [
  {
    icon: FiUsers,
    title: 'Who we are',
    text: 'Engineers and farmers building simple tools that make caring for livestock easier and safer.',
  },
  {
    icon: FiTarget,
    title: 'Why we exist',
    text: 'Reliable, affordable tracking for every farm — big or small.',
  },
  {
    icon: FiEye,
    title: "Where we're headed",
    text: 'A world where no herd is ever out of sight, and every farmer can breathe easy.',
  },
  {
    icon: FiTrendingUp,
    title: "What's next",
    text: 'Wider coverage, tougher offline mode, and smarter herd insights.',
  },
];

export default function About() {
  return (
    <section id="about" className="py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:bg-primary/20 dark:text-primary-light">
            Our story
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-ink dark:text-white md:text-4xl">
            Built by people who get farms
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-3xl border border-black/5 bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary transition-colors group-hover:bg-primary group-hover:text-white dark:bg-primary/20 dark:text-primary-light">
                <item.icon />
              </div>
              <h3 className="mt-5 text-lg font-bold text-ink dark:text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted dark:text-dark-muted">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
