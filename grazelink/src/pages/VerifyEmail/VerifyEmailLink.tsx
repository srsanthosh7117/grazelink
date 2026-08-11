import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import logo from '@/assets/images/logo.jpeg';
import { useAuth } from '@/hooks/useAuth';
import { verifyEmailWithCode } from '@/services/auth';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { useToast } from '@/context/ToastContext';

/** Handles the verification code from the emailed link.
 *  With handleCodeInApp:true the link points straight here
 *  (e.g. https://app/verify-email/link?mode=verifyEmail&oobCode=...) so the
 *  email never has to route through Firebase's hosted action page, which
 *  some networks reset. */
export default function VerifyEmailLink() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');

    if (mode !== 'verifyEmail' || !oobCode) {
      navigate('/verify-email', { replace: true });
      return;
    }

    (async () => {
      try {
        await verifyEmailWithCode(oobCode);
        setStatus('success');
        showToast('success', 'Email verified — welcome to GrazeLink!');
        setTimeout(async () => {
          if (user) {
            await refreshUser();
            navigate('/register-device', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }, 2500);
      } catch (err) {
        setStatus('error');
        setErrorMessage(getAuthErrorMessage(err));
      }
    })();
  }, [location.search, navigate, user, refreshUser, showToast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-light via-white to-surface-light px-4 py-12 dark:from-dark-bg dark:via-dark-surface dark:to-dark-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-dark-card dark:text-white"
      >
        <img src={logo} alt="GrazeLink" className="mx-auto h-14 w-14 rounded-2xl shadow-sm" />

        {status === 'verifying' && (
          <>
            <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FiLoader className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-ink dark:text-white">Verifying your email…</h1>
            <p className="mt-2 text-sm text-muted dark:text-dark-muted">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <FiCheckCircle className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-ink dark:text-white">Email verified!</h1>
            <p className="mt-2 text-sm text-muted dark:text-dark-muted">
              Your account is now active. Taking you to your dashboard…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <FiAlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-ink dark:text-white">Couldn't verify your email</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted dark:text-dark-muted">{errorMessage}</p>
            <div className="mt-7 flex flex-col gap-3">
              <Link
                to="/login"
                className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:bg-primary-dark"
              >
                Go to login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
