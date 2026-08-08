import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/images/logo.jpeg';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [isShrinking, setIsShrinking] = useState(false);

  useEffect(() => {
    const shrinkTimer = setTimeout(() => setIsShrinking(true), 2200);
    const doneTimer = setTimeout(() => onComplete(), 2900);
    return () => {
      clearTimeout(shrinkTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-surface dark:bg-dark-bg text-ink dark:text-white"
        initial={{ opacity: 1 }}
        animate={{ opacity: isShrinking ? 0 : 1 }}
        transition={{ duration: 0.6, delay: isShrinking ? 0.35 : 0 }}
      >
        <motion.div
          className="flex flex-col items-center"
          animate={
            isShrinking
              ? { scale: 0.35, x: '-42vw', y: '-45vh' }
              : { scale: 1, x: 0, y: 0 }
          }
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <motion.img
            src={logo}
            alt="GrazeLink logo"
            className="h-24 w-24 rounded-3xl shadow-card md:h-28 md:w-28"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.h1
            className="mt-4 text-3xl font-extrabold tracking-tight text-ink dark:text-white md:text-4xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isShrinking ? 0 : 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Graze<span className="text-primary">Link</span>
          </motion.h1>
          <motion.p
            className="mt-2 text-xs font-bold tracking-[0.3em] text-muted dark:text-dark-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: isShrinking ? 0 : 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            CONNECT • TRACK • PROTECT
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
