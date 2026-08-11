import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';

export interface FarmProfile {
  username: string;
  fullName: string;
  email: string;
  farmName: string;
  farmAddress: string;
  numberOfSheds: number;
  phoneNumber: string;
  country: string;
  state: string;
  district: string;
  village: string;
  pincode?: string;
  createdAt?: unknown;
}

export function useFarmProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FarmProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'farms', user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as FarmProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { profile, loading, error };
}
