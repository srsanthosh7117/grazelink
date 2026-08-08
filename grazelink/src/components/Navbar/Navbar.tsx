import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMenu, FiX, FiSun, FiMoon, FiArrowRight } from 'react-icons/fi';
import logo from '@/assets/images/logo.jpeg';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Why GrazeLink', href: '#why' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'glass shadow-soft border-b border-black/5 dark:border-white/5' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="GrazeLink" className="h-9 w-9 rounded-xl shadow-sm" />
          <span className="text-xl font-extrabold tracking-tight text-ink dark:text-white">
            Graze<span className="text-primary">Link</span>
          </span>
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="group relative text-sm font-medium text-ink/80 transition-colors hover:text-primary dark:text-gray-300 dark:hover:text-primary-light"
            >
              {link.label}
              <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 rounded-full bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
          ))}

          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-white dark:hover:border-primary dark:hover:text-primary-light"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FiSun className="text-amber-400" /> : <FiMoon />}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-white dark:hover:border-primary dark:hover:text-primary-light"
          >
            Log in
          </button>

          <button
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-card transition-all hover:scale-105 hover:bg-primary-dark"
          >
            {user ? 'Dashboard' : 'Get Started'}
            <FiArrowRight className="text-sm" />
          </button>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-ink dark:border-white/10 dark:text-white"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FiSun className="text-amber-400" /> : <FiMoon />}
          </button>

          <button
            className="text-2xl text-ink dark:text-white"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </nav>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="glass flex flex-col gap-3 px-6 pb-6 pt-2 md:hidden dark:bg-dark-surface/95"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-primary/10 hover:text-primary dark:text-white"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            className="mt-1 w-full rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-card"
          >
            {user ? 'Dashboard' : 'Get Started'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-ink dark:border-white/10 dark:text-white"
          >
            Log in
          </button>
        </motion.div>
      )}
    </motion.header>
  );
}
