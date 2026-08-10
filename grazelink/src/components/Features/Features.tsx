import {
  FiMapPin,
  FiHardDrive,
  FiCloud,
  FiBatteryCharging,
  FiPieChart,
  FiShield,
} from 'react-icons/fi';
import FeatureCard from '@/components/Cards/FeatureCard';

const FEATURES = [
  {
    icon: FiMapPin,
    title: 'Live locations',
    description: 'See every livestock on the map in real time — no more walking the whole pasture to find one.',
  },
  {
    icon: FiHardDrive,
    title: 'Offline by design',
    description: 'No Wi-Fi? No problem. Collars keep logging in the field and catch up the moment they can.',
  },
  {
    icon: FiCloud,
    title: 'Auto-syncs',
    description: 'The second your connection returns, data uploads itself. You never lose a single reading.',
  },
  {
    icon: FiBatteryCharging,
    title: 'Low battery alerts',
    description: 'Get a heads-up before a collar dies — not after. Swap it on your own schedule.',
  },
  {
    icon: FiPieChart,
    title: 'One clean dashboard',
    description: 'Herd status, maps, history, and reports — all in a single real-time view.',
  },
  {
    icon: FiShield,
    title: 'Private by default',
    description: "Your farm's data is yours alone. Always encrypted, never shared.",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-surface-light py-24 dark:bg-dark-bg">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:bg-primary/20 dark:text-primary-light">
            The basics
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-ink dark:text-white md:text-4xl">
            All of it, in one place
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted dark:text-dark-muted">
            One collar per livestock, one dashboard, zero guesswork.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} index={i} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
