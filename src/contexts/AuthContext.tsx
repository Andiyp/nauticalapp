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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          // Update online status when user is authenticated
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
    // Set persistence to LOCAL to maintain the session
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
    // Set persistence to LOCAL to maintain the session
    await setPersistence(auth, browserLocalPersistence);
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    // Update online status on login
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      isOnline: true,
      lastSeen: serverTimestamp()
    });
  }

  async function logout() {
    if (currentUser) {
      // Update online status before signing out
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp()
      });
    }
    return signOut(auth);
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