import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiSend,
  FiFacebook,
  FiTwitter,
  FiInstagram,
  FiLinkedin,
} from 'react-icons/fi';

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

const CONTACTS = [
  { icon: FiMail, label: 'Email', value: 'hello@grazelink.io' },
  { icon: FiMail, label: 'Support', value: 'support@grazelink.io' },
  { icon: FiPhone, label: 'Phone', value: '+91 98765 43210' },
  { icon: FiMapPin, label: 'Address', value: 'GrazeLink HQ, Tiruppur, Tamil Nadu, India' },
];

const SOCIALS = [
  { icon: FiFacebook, label: 'Facebook' },
  { icon: FiTwitter, label: 'Twitter' },
  { icon: FiInstagram, label: 'Instagram' },
  { icon: FiLinkedin, label: 'LinkedIn' },
];

const inputClass =
  'mt-1.5 w-full rounded-xl border border-black/10 bg-surface-light px-4 py-3 text-sm text-ink outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:focus:bg-dark-surface';
const labelClass = 'text-sm font-semibold text-ink dark:text-white';

export default function Contact() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useForm<ContactFormData>();

  const onSubmit = () => {
    // Wire this up to a Firestore "messages" collection or an email API.
    reset();
  };

  return (
    <section id="contact" className="py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:bg-primary/20 dark:text-primary-light">
            Talk to us
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-ink dark:text-white md:text-4xl">
            Let's talk
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted dark:text-dark-muted">
            Questions about collars, setup, or pricing? We reply fast.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-5"
          >
            {CONTACTS.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-soft transition-colors hover:border-primary/30 dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary dark:bg-primary/20 dark:text-primary-light">
                  <c.icon />
                </span>
                <div>
                  <p className="text-sm text-muted dark:text-dark-muted">{c.label}</p>
                  <p className="font-semibold text-ink dark:text-white">{c.value}</p>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#contact"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-primary transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-white/10"
                >
                  <s.icon />
                </a>
              ))}
            </div>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 rounded-3xl border border-black/5 bg-white p-8 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card"
          >
            <div>
              <label htmlFor="contact-name" className={labelClass}>
                Name
              </label>
              <input
                id="contact-name"
                {...register('name', { required: true })}
                placeholder="John Doe"
                className={inputClass}
              />
              {errors.name && <p className="mt-1 text-xs font-medium text-rose-500">Name is required</p>}
            </div>
            <div>
              <label htmlFor="contact-email" className={labelClass}>
                Email
              </label>
              <input
                id="contact-email"
                {...register('email', { required: true })}
                type="email"
                placeholder="you@farm.com"
                className={inputClass}
              />
              {errors.email && <p className="mt-1 text-xs font-medium text-rose-500">Email is required</p>}
            </div>
            <div>
              <label htmlFor="contact-message" className={labelClass}>
                Message
              </label>
              <textarea
                id="contact-message"
                {...register('message', { required: true })}
                rows={4}
                placeholder="Tell us about your farm and what you need..."
                className={inputClass}
              />
              {errors.message && <p className="mt-1 text-xs font-medium text-rose-500">Message is required</p>}
            </div>

            <button
              type="submit"
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition-all hover:scale-[1.02] hover:bg-primary-dark hover:shadow-glow"
            >
              Send Message
              <FiSend className="transition-transform group-hover:translate-x-1" />
            </button>

            {isSubmitSuccessful && (
              <p className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Thanks — we'll get back to you soon.
              </p>
            )}
          </motion.form>
        </div>
      </div>
    </section>
  );
}
