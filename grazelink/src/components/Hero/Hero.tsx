import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiMapPin,
  FiBatteryCharging,
  FiWifi,
  FiShield,
  FiCheck,
} from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { getBatteryThreshold } from '@/utils/alertThresholds';

const TRUST_POINTS = ['Encrypted & secure', 'Works offline', 'Set up in minutes'];

const LIVE_LIVESTOCK = [
  { id: 'GT-0001', name: 'Bella', battery: 97, status: 'Online', tone: 'text-emerald-500' },
  { id: 'GT-0002', name: 'Leo', battery: 84, status: 'Online', tone: 'text-emerald-500' },
  { id: 'GT-0003', name: 'Maggie', battery: 12, status: 'Low battery', tone: 'text-amber-500' },
];

export default function Hero() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-b from-surface-light via-white to-surface-light pt-28 dark:from-dark-bg dark:via-dark-surface dark:to-dark-bg"
    >
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-5 md:px-8 lg:grid-cols-2">
        {/* Left — copy */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:bg-primary/20 dark:text-primary-light">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Made for Real Farms
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink dark:text-white md:text-5xl xl:text-6xl">
            Keep every livestock in sight,
            <br />
            from{' '}
            <span className="relative inline-block text-primary">
              anywhere
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 200 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <path d="M2 7C60 2 140 2 198 7" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted dark:text-dark-muted md:text-lg">
            GPS collars that show you where your herd is, what's off, and what needs you —
            in real time.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="group flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-card transition-all hover:scale-[1.03] hover:bg-primary-dark hover:shadow-glow"
            >
              {user ? 'Go to Dashboard' : 'Start for free'}
              <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#features"
              className="rounded-full border border-ink/10 bg-white px-8 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-dark-card dark:text-white dark:hover:border-primary dark:hover:text-primary-light"
            >
              See it in action
            </a>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm text-muted dark:text-dark-muted">
                <FiCheck className="text-primary" />
                {point}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right — live dashboard preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto w-full max-w-lg"
        >
          <div className="relative rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(17,24,39,0.25)] dark:border-white/10 dark:bg-dark-card dark:shadow-dark-card">
            {/* Card header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary dark:bg-primary/20">
                GrazeLink · Live
              </span>
            </div>

            {/* Map preview */}
            <div className="relative mt-4 h-52 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-50 dark:from-emerald-950 dark:via-dark-surface dark:to-emerald-900/40">
              <div
                className="absolute inset-0 opacity-30 dark:opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle, #16a34a 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }}
              />
              {/* Geofence */}
              <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-primary/60" />
              {/* Pins */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <FiMapPin className="text-2xl text-emerald-500 drop-shadow" />
              </motion.div>
              <div className="absolute left-[22%] top-[30%]">
                <FiMapPin className="text-lg text-primary/70" />
              </div>
              <div className="absolute right-[18%] bottom-[26%]">
                <FiMapPin className="text-lg text-primary/70" />
              </div>

              {/* HUD chips */}
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm dark:bg-dark-surface/90 dark:text-white">
                <FiWifi className="text-primary" /> Wi-Fi · Sync OK
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm dark:bg-dark-surface/90 dark:text-white">
                <FiShield className="text-primary" /> 3/3 in zone
              </div>
            </div>

            {/* Livestock rows */}
            <div className="mt-4 space-y-2.5">
              {LIVE_LIVESTOCK.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-xl bg-surface-light px-4 py-2.5 dark:bg-dark-surface"
                >
                  <div className="flex items-center gap-3">
                    <span className={`relative flex h-2 w-2 ${g.tone}`}>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-ink dark:text-white">
                        {g.id} <span className="font-medium text-muted">· {g.name}</span>
                      </p>
                      <p className="text-[10px] text-muted dark:text-dark-muted">Shed A · 12s ago</p>
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      g.battery < getBatteryThreshold()
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <FiBatteryCharging /> {g.battery}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
