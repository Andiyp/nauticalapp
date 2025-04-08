import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Omit<User, 'uid' | 'role' | 'isBlocked' | 'isOnline' | 'lastSeen'>) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle user status updates
  const updateUserStatus = async (uid: string, isOnline: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (currentUser) {
        updateUserStatus(currentUser.uid, !document.hidden);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', () => {
      if (currentUser) {
        updateUserStatus(currentUser.uid, false);
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', () => {});
    };
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, {
            isOnline: true,
            lastSeen: serverTimestamp()
          });
          setUserData(docSnap.data() as User);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function register(email: string, password: string, userData: Omit<User, 'uid' | 'role' | 'isBlocked' | 'isOnline' | 'lastSeen'>) {
    await setPersistence(auth, browserLocalPersistence);
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', user.uid), {
      ...userData,
      uid: user.uid,
      role: 'user',
      isBlocked: false,
      isOnline: true,
      lastSeen: serverTimestamp()
    });
  }

  async function login(email: string, password: string) {
    await setPersistence(auth, browserLocalPersistence);
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      isOnline: true,
      lastSeen: serverTimestamp()
    });
  }

  async function logout() {
    if (currentUser) {
      try {
        await updateUserStatus(currentUser.uid, false);
        await signOut(auth);
      } catch (error) {
        console.error('Error during logout:', error);
        throw error;
      }
    }
  }

  const value = {
    currentUser,
    userData,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}