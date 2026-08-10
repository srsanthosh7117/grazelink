import { useNavigate } from 'react-router-dom';
import { FiZap, FiTarget, FiDatabase, FiLock, FiCpu, FiTruck, FiArrowRight } from 'react-icons/fi';
import InfoCard from '@/components/Cards/InfoCard';

const REASONS = [
  {
    icon: FiZap,
    title: 'Weeks of battery',
    description: 'Collars run for weeks on one charge. Charge less, worry less.',
  },
  {
    icon: FiTarget,
    title: 'Pinpoint accuracy',
    description: 'Precise GPS so every livestock is easy to find — grazing or wandering.',
  },
  {
    icon: FiDatabase,
    title: 'Auto-backups',
    description: "Your herd's history is saved safely in the cloud, always.",
  },
  {
    icon: FiLock,
    title: 'Secure by design',
    description: 'Protected sign-in. Your data stays yours.',
  },
  {
    icon: FiCpu,
    title: 'Smarter insights',
    description: 'Health and movement patterns flagged before you even notice them.',
  },
  {
    icon: FiTruck,
    title: '5-minute setup',
    description: 'From box to farm in minutes. No technician needed.',
  },
];

export default function WhyGrazeLink() {
  const navigate = useNavigate();

  return (
    <section id="why" className="relative overflow-hidden bg-[#0B0F19] py-24">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-emerald-700/15 blur-[120px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-light">
            Why us
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Built for the field
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-400">
            We sweat the small stuff, so you don't have to.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((reason, i) => (
            <InfoCard key={reason.title} index={i} {...reason} />
          ))}
        </div>

        <div className="mt-14 text-center">
          <button
            onClick={() => navigate('/register')}
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-card transition-all hover:scale-[1.03] hover:bg-primary-dark hover:shadow-glow"
          >
            Get started today
            <FiArrowRight className="transition-transform group-hover:translate-x-1" />          </button>
        </div>
      </div>
    </section>
  );
}
