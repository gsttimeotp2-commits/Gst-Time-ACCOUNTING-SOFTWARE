import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut as fbSignOut, handleFirestoreError, OperationType, testConnection } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { DEFAULT_PROFILE } from '../data/seedData';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  setRole: (role: UserRole) => void;
  isOwner: boolean;
  isCashier: boolean;
  isAccountant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<UserRole>('owner');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Validate Firestore connection on boot
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(db, 'users', currentUser.uid, 'profile', 'business');
        try {
          const snap = await getDoc(profileRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile(data);
            setRoleState(data.role || 'owner');
          } else {
            // First time setup with user info
            const newProfile: UserProfile = {
              ...DEFAULT_PROFILE,
              userId: currentUser.uid,
              ownerName: currentUser.displayName || DEFAULT_PROFILE.ownerName,
              email: currentUser.email || DEFAULT_PROFILE.email,
              role: 'owner',
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
            setRoleState('owner');
          }
        } catch (error) {
          console.warn('Profile fetch warning (falling back to initial profile):', error);
          const fallbackProfile: UserProfile = {
            ...DEFAULT_PROFILE,
            userId: currentUser.uid,
            ownerName: currentUser.displayName || DEFAULT_PROFILE.ownerName,
            email: currentUser.email || DEFAULT_PROFILE.email,
          };
          setProfile(fallbackProfile);
        }
      } else {
        // Guest / Demo session
        setProfile({
          ...DEFAULT_PROFILE,
          userId: 'demo_user',
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setProfile({ ...DEFAULT_PROFILE, userId: 'demo_user' });
      setRoleState('owner');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  const updateProfile = async (updated: Partial<UserProfile>) => {
    if (!profile) return;
    const merged = { ...profile, ...updated, updatedAt: new Date().toISOString() };
    setProfile(merged);
    if (updated.role) {
      setRoleState(updated.role);
    }

    if (user) {
      const path = `users/${user.uid}/profile/business`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'profile', 'business'), merged, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (profile) {
      setProfile({ ...profile, role: newRole });
    }
  };

  const isOwner = role === 'owner';
  const isCashier = role === 'cashier';
  const isAccountant = role === 'accountant';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        signIn,
        signOut,
        updateProfile,
        setRole,
        isOwner,
        isCashier,
        isAccountant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
