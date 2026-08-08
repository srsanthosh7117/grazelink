import { Link } from 'react-router-dom';
import { FiMapPin, FiMail, FiPhone, FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi';
import logo from '@/assets/images/logo.jpeg';

const QUICK_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Why GrazeLink', href: '#why' },
  { label: 'Contact', href: '#contact' },
];

const SOCIALS = [
  { icon: FiFacebook, label: 'Facebook' },
  { icon: FiTwitter, label: 'Twitter' },
  { icon: FiInstagram, label: 'Instagram' },
  { icon: FiLinkedin, label: 'LinkedIn' },
];

export default function Footer() {
  return (
    <footer className="bg-[#0B0F19] pt-16 text-white/70">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <img src={logo} alt="GrazeLink" className="h-10 w-10 rounded-xl shadow-sm" />
              <span className="text-xl font-extrabold tracking-tight text-white">
                Graze<span className="text-primary">Link</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              Every goat, one dashboard. GPS collars that keep your herd safe, healthy, and in sight.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#home"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-all hover:border-primary hover:bg-primary hover:text-white"
                >
                  <s.icon />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Quick Links</h4>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              {QUICK_LINKS.map((link) => (
                <a key={link.label} href={link.href} className="w-fit transition-colors hover:text-primary">
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Contact</h4>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              <span className="flex items-center gap-2">
                <FiMail className="shrink-0 text-primary" /> hello@grazelink.io
              </span>
              <span className="flex items-center gap-2">
                <FiPhone className="shrink-0 text-primary" /> +91 98765 43210
              </span>
              <span className="flex items-start gap-2">
                <FiMapPin className="mt-0.5 shrink-0 text-primary" /> Tiruppur, Tamil Nadu, India
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/privacy-policy" className="w-fit transition-colors hover:text-primary">
                Privacy Policy
              </Link>
              <Link to="/terms" className="w-fit transition-colors hover:text-primary">
                Terms and Conditions
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row">
          <span>© {new Date().getFullYear()} GrazeLink. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            Made for real farms
          </span>
        </div>
      </div>
    </footer>
  );
}
