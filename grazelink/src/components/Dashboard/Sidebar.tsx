import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiGrid,
  FiActivity,
  FiMapPin,
  FiFileText,
  FiBarChart2,
  FiBell,
  FiCpu,
  FiSettings,
  FiUser,
  FiLogOut,
  FiX,
} from 'react-icons/fi';
import logo from '@/assets/images/logo.jpeg';
import { logoutUser } from '@/services/auth';
import { useAlerts } from '@/hooks/useAlerts';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { unreadCount } = useAlerts();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const LINKS = [
    { to: '/', label: 'Home', icon: FiHome, end: true },
    { to: '/dashboard', label: 'Dashboard', icon: FiGrid, end: true },
    { to: '/dashboard/livestock', label: 'Livestock Management', icon: FiActivity },
    { to: '/dashboard/gps', label: 'GPS Tracking', icon: FiMapPin },
    { to: '/dashboard/devices', label: 'Registered Devices', icon: FiCpu },
    { to: '/dashboard/alerts', label: 'Alert Center', icon: FiBell, badge: unreadCount },
    { to: '/dashboard/analytics', label: 'Analytics', icon: FiBarChart2 },
    { to: '/dashboard/reports', label: 'Reports', icon: FiFileText },
    { to: '/dashboard/settings', label: 'Settings', icon: FiSettings },
    { to: '/dashboard/account', label: 'Account Center', icon: FiUser },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-black/5 bg-white px-4 py-6 transition-transform duration-300 dark:border-white/5 dark:bg-dark-surface md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <img src={logo} alt="GrazeLink" className="h-9 w-9 rounded-xl shadow-sm" />
            <div>
              <span className="text-lg font-extrabold tracking-tight text-ink dark:text-white">
                Graze<span className="text-primary">Link</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                Livestock Tracking
              </span>
            </div>
          </div>
          <button className="md:hidden" onClick={onClose} aria-label="Close menu">
            <FiX className="text-xl text-muted dark:text-dark-muted" />
          </button>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {LINKS.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light'
                    : 'text-ink/70 hover:bg-surface-light hover:text-ink dark:text-dark-muted dark:hover:bg-dark-card dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className="text-lg transition-transform group-hover:scale-110" />
                    <span>{label}</span>
                  </div>
                  {badge != null && badge > 0 ? (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ) : null}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-black/5 pt-4 dark:border-white/5">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <FiLogOut className="text-lg" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
