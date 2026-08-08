import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiMapPin,
  FiWifi,
  FiBatteryCharging,
  FiShield,
  FiLoader,
  FiCheckCircle,
} from 'react-icons/fi';
import logo from '@/assets/images/logo.jpeg';
import { loginUser, resetPassword } from '@/services/auth';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { useToast } from '@/context/ToastContext';

interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

const inputClass =
  'mt-1 w-full rounded-xl border border-black/10 bg-surface-light py-3 pl-11 pr-4 text-sm text-ink outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:focus:bg-dark-surface';
const labelClass = 'text-sm font-semibold text-ink dark:text-white';
const iconClass =
  'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted dark:text-dark-muted';

const FEATURES = [
  {
    icon: FiMapPin,
    title: 'Live GPS tracking',
    text: 'Every collar streams its position straight to your dashboard.',
  },
  {
    icon: FiWifi,
    title: 'Works offline, syncs later',
    text: 'Collars buffer data when signal drops and upload when back in range.',
  },
  {
    icon: FiBatteryCharging,
    title: 'Battery & health alerts',
    text: 'Low charge, offline collar, or heat spike — you get a heads-up first.',
  },
  {
    icon: FiShield,
    title: 'Private by design',
    text: 'Your farm data is encrypted in transit and only yours to see.',
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>();

  const typedEmail = watch('username') ?? '';

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    setSubmitting(true);
    try {
      await loginUser(data.username, data.password, data.rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setServerError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      setResetEmail(typedEmail.trim());
      if (!typedEmail.trim()) return;
    }
    setResetting(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
      showToast('success', 'Password reset link sent — check your inbox.');
    } catch (err) {
      showToast('error', getAuthErrorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface dark:bg-dark-bg">
      {/* ── Brand panel ─────────────────────────────────────────── */}
      <motion.aside
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0B0F19] p-10 lg:flex xl:p-12"
      >
        {/* Decorative glow + dot grid */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-700/20 blur-[100px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Brand row */}
        <Link to="/" className="relative flex w-fit items-center gap-3 transition-opacity hover:opacity-80">
          <img
            src={logo}
            alt="GrazeLink"
            className="h-10 w-10 rounded-xl shadow-card ring-1 ring-white/20"
          />
          <span className="text-xl font-extrabold tracking-tight text-white">GrazeLink</span>
        </Link>

        {/* Pitch */}
        <div className="relative max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
            Your herd,
            <br />
            right at your{' '}
            <span className="relative inline-block text-primary-light">
              fingertips
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 200 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <path d="M2 7C60 2 140 2 198 7" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
            .
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-400 xl:text-base">
            A GPS collar on every goat, and your whole farm in your pocket. Know where each animal
            is, how it's doing, and when it needs you — before it's too late.
          </p>

          <ul className="mt-6 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-light">
                  <f.icon className="text-base" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-400 xl:text-sm">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Live status card */}
        <div className="relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Collar GZL-007 · Live</p>
            <p className="text-xs text-gray-400">Last fix 12s ago · Battery 97% · Shed A</p>
          </div>
          <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary-light">
            Online
          </span>
        </div>
      </motion.aside>

      {/* ── Form panel ──────────────────────────────────────────── */}
      <main className="flex w-full flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile brand */}
          <div className="mb-5 flex items-center justify-center gap-3 lg:hidden">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="GrazeLink" className="h-10 w-10 rounded-lg shadow-sm" />
              <span className="text-xl font-extrabold tracking-tight text-ink dark:text-white">
                Graze<span className="text-primary">Link</span>
              </span>
            </Link>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-7 shadow-soft dark:border-white/10 dark:bg-dark-card dark:shadow-dark-card sm:p-8">
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-primary dark:text-dark-muted dark:hover:text-primary-light"
            >
              <FiArrowLeft /> Back to home
            </Link>

            <h2 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white">Welcome back</h2>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">
              Good to see you again — your herd is waiting.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-email" className={labelClass}>
                  Email
                </label>
                <div className="relative">
                  <FiMail className={iconClass} />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    {...register('username', { required: true })}
                    className={inputClass}
                    placeholder="you@farm.com"
                  />
                </div>
                {errors.username && (
                  <p className="mt-1.5 text-xs font-medium text-rose-500">Email is required</p>
                )}
              </div>

              <div>
                <label htmlFor="login-password" className={labelClass}>
                  Password
                </label>
                <div className="relative">
                  <FiLock className={iconClass} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password', { required: true, minLength: 6 })}
                    className={`${inputClass} pr-12`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink dark:text-dark-muted dark:hover:text-white"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs font-medium text-rose-500">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted dark:text-dark-muted">
                  <input
                    type="checkbox"
                    {...register('rememberMe')}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen((v) => !v);
                    setResetSent(false);
                    setResetEmail(typedEmail);
                  }}
                  className="text-sm font-semibold text-primary transition-colors hover:text-primary-dark hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {forgotOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    {resetSent ? (
                      <p className="flex items-start gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <FiCheckCircle className="mt-0.5 shrink-0" />
                        If an account exists for <span className="font-bold">{resetEmail.trim()}</span>, a
                        reset link is on its way. Check your inbox (and spam).
                      </p>
                    ) : (
                      <>
                        <label htmlFor="reset-email" className="text-xs font-semibold text-muted dark:text-dark-muted">
                          Enter your email to get a reset link
                        </label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            id="reset-email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="you@farm.com"
                            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={resetting}
                            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
                          >
                            {resetting ? <FiLoader className="animate-spin" /> : 'Send Link'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {serverError && (
                <p className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm font-medium text-rose-500">
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition-all hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <FiLoader className="animate-spin" /> Logging in...
                  </>
                ) : (
                  'Log in'
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-muted dark:text-dark-muted">
            New to GrazeLink?{' '}
            <Link to="/register" className="font-semibold text-primary hover:text-primary-dark hover:underline">
              Create an account
            </Link>
          </p>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted dark:text-dark-muted">
            <FiShield className="shrink-0 text-primary" />
            <span>Protected by encrypted sign-in.</span>
            <span className="mx-1">·</span>
            <Link to="/privacy-policy" className="hover:text-primary hover:underline">
              Privacy
            </Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-primary hover:underline">
              Terms
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
