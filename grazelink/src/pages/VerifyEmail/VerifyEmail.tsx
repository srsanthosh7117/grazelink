import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail } from 'react-icons/fi';
import logo from '@/assets/images/logo.jpeg';
import { useAuth } from '@/hooks/useAuth';
import { sendVerificationEmail } from '@/services/auth';
import { useToast } from '@/context/ToastContext';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, loading, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (user.emailVerified) {
      navigate('/register-device', { replace: true });
      return;
    }

    // Poll Firebase every few seconds so the page advances automatically
    // once the user clicks the link in their inbox.
    const timer = setInterval(async () => {
      const fresh = await refreshUser();
      if (fresh?.emailVerified) {
        clearInterval(timer);
        showToast('success', 'Email verified!');
        navigate('/register-device', { replace: true });
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [loading, user, navigate, refreshUser, showToast]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-light dark:bg-dark-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const resend = async () => {
    setResending(true);
    try {
      await sendVerificationEmail(user);
      showToast('success', 'Verification email sent — check your inbox.');
    } catch {
      showToast('error', 'Could not send the verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      const fresh = await refreshUser();
      if (fresh?.emailVerified) {
        showToast('success', 'Email verified!');
        navigate('/register-device', { replace: true });
      } else {
        showToast('error', 'Email not verified yet — open the link we sent you and try again.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-light via-white to-surface-light px-4 py-12 dark:from-dark-bg dark:via-dark-surface dark:to-dark-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-dark-card dark:text-white"
      >
        <img src={logo} alt="GrazeLink" className="mx-auto h-14 w-14 rounded-2xl shadow-sm" />
        <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FiMail className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-ink dark:text-white">Verify your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted dark:text-dark-muted">
          We sent a verification link to{' '}
          <span className="font-semibold text-ink dark:text-white">{user.email}</span>. Open the link to activate
          your farm account. Until then, you won&apos;t be able to access the dashboard.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={checkNow}
            disabled={checking}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:bg-primary-dark disabled:opacity-60"
          >
            {checking ? 'Checking...' : "I've verified my email — continue"}
          </button>
          <button
            onClick={resend}
            disabled={resending}
            className="w-full rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-light disabled:opacity-60 dark:border-white/10 dark:text-white dark:hover:bg-dark-surface"
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </button>
        </div>

        <p className="mt-6 text-xs text-muted dark:text-dark-muted">
          Didn&apos;t get the email? Check your spam folder, or make sure the address above is correct.
        </p>
      </motion.div>
    </div>
  );
}
