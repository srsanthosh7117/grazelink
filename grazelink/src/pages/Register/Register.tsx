import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import logo from '@/assets/images/logo.jpeg';
import { registerUser } from '@/services/auth';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { useToast } from '@/context/ToastContext';

interface RegisterFormData {
  username: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  farmName: string;
  farmAddress: string;
  numberOfSheds: number;
  phoneNumber: string;
  country: string;
  state: string;
  district: string;
  village: string;
  terms: boolean;
}

const inputClass =
  'mt-1 w-full rounded-xl border border-black/10 bg-surface-light px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white';
const labelClass = 'text-xs font-semibold text-muted dark:text-dark-muted';

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setServerError('');
    setSubmitting(true);
    try {
      await registerUser({
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        farmName: data.farmName,
        farmAddress: data.farmAddress,
        numberOfSheds: Number(data.numberOfSheds),
        phoneNumber: data.phoneNumber,
        country: data.country,
        state: data.state,
        district: data.district,
        village: data.village,
      });
      showToast('success', "Account created successfully! Let's register your first collar and goat.");
      navigate('/register-device');
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setServerError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-light via-white to-surface-light px-4 py-12 dark:from-dark-bg dark:via-dark-surface dark:to-dark-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl rounded-3xl border border-black/5 bg-white p-8 shadow-soft dark:border-white/10 dark:bg-dark-card dark:text-white md:p-10"
      >
        <div className="flex flex-col items-center">
          <img src={logo} alt="GrazeLink" className="h-14 w-14 rounded-2xl shadow-sm" />
          <h1 className="mt-4 text-2xl font-extrabold text-ink dark:text-white">Create your farm account</h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">Set up your farm in a couple of minutes</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Username</label>
            <input {...register('username', { required: true })} className={inputClass} placeholder="Enter username" />
            {errors.username && <p className="mt-1 text-xs text-rose-500">Required</p>}
          </div>
          <div>
            <label className={labelClass}>Full Name</label>
            <input {...register('fullName', { required: true })} className={inputClass} placeholder="Enter your name" />
            {errors.fullName && <p className="mt-1 text-xs text-rose-500">Required</p>}
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input type="email" {...register('email', { required: true })} className={inputClass} placeholder="Enter your email" />
            {errors.email && <p className="mt-1 text-xs text-rose-500">Required</p>}
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input {...register('phoneNumber', { required: true })} className={inputClass} placeholder="Enter your phone number" />
            {errors.phoneNumber && <p className="mt-1 text-xs text-rose-500">Required</p>}
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', { required: true, minLength: 6 })}
                className={`${inputClass} pr-12`}
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
            {errors.password && <p className="mt-1 text-xs text-rose-500">Min 6 characters</p>}
          </div>
          <div>
            <label className={labelClass}>Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword', {
                  required: true,
                  validate: (v) => v === password || 'Passwords do not match',
                })}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink dark:text-dark-muted dark:hover:text-white"
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Farm Name</label>
            <input {...register('farmName', { required: true })} className={inputClass} placeholder="Enter farm name" />
            {errors.farmName && <p className="mt-1 text-xs text-rose-500">Required</p>}
          </div>
          <div>
            <label className={labelClass}>Number of Sheds</label>
            <input type="number" min={1} {...register('numberOfSheds', { required: true, min: 1 })} className={inputClass} />
            {errors.numberOfSheds && <p className="mt-1 text-xs text-rose-500">Required</p>}
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Farm Address</label>
            <input {...register('farmAddress', { required: true })} className={inputClass} placeholder="Enter your address" />
            {errors.farmAddress && <p className="mt-1 text-xs text-rose-500">Required</p>}
          </div>

          <div>
            <label className={labelClass}>Country</label>
            <input {...register('country', { required: true })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input {...register('state', { required: true })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>District</label>
            <input {...register('district', { required: true })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Village</label>
            <input {...register('village', { required: true })} className={inputClass} />
          </div>

          <div className="sm:col-span-2 flex items-start gap-2 text-xs text-muted dark:text-dark-muted">
            <input type="checkbox" {...register('terms', { required: true })} className="mt-0.5 rounded accent-primary" />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="text-primary hover:underline">
                Terms &amp; Conditions
              </Link>
            </span>
          </div>
          {errors.terms && (
            <p className="sm:col-span-2 -mt-2 text-xs text-rose-500">
              You must accept the terms to continue
            </p>
          )}

          {serverError && (
            <p className="sm:col-span-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-500 font-medium">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 mt-2 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting ? 'Creating Account...' : 'Create account'}
          </button>

          <p className="sm:col-span-2 text-center text-xs text-muted dark:text-dark-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
