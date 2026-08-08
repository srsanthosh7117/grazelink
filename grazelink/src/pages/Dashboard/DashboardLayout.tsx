import { Suspense, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FiMenu, FiBell, FiSun, FiMoon } from 'react-icons/fi';
import Sidebar from '@/components/Dashboard/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { useAlerts } from '@/hooks/useAlerts';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useAlerts();

  return (
    <div className="min-h-screen bg-surface-light text-ink transition-colors duration-200 dark:bg-dark-bg dark:text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white/80 px-6 py-4 backdrop-blur-glass dark:border-white/5 dark:bg-dark-surface/80">
          <button
            className="text-2xl text-ink dark:text-white md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <FiMenu />
          </button>
          <div className="hidden md:block" />

          <div className="flex items-center gap-4">
            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-dark-card dark:text-white dark:hover:border-primary dark:hover:text-primary-light"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'dark' ? <FiSun className="text-amber-400" /> : <FiMoon />}
            </button>

            {/* Notification Bell */}
            <Link
              to="/dashboard/alerts"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-dark-card dark:text-white dark:hover:border-primary dark:hover:text-primary-light"
              aria-label="Alerts"
            >
              <FiBell />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Profile Avatar */}
            <div className="flex items-center gap-3 border-l border-black/5 pl-4 dark:border-white/5">
              <span className="hidden text-sm font-semibold text-ink dark:text-white sm:inline-block">
                {user?.displayName || user?.email?.split('@')[0] || 'Farm Owner'}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-white shadow-card">
                {(user?.displayName || user?.email || 'F').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 md:p-8">
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
