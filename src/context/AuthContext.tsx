import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  updateProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  saveUserProfile: (uid: string, data: { displayName: string; email: string; photoURL?: string; username?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        // Sync user profile in Firestore
        try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              photoURL: user.photoURL || '',
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error('Failed to sync user to Firestore:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || 'User',
          photoURL: result.user.photoURL || '',
          createdAt: serverTimestamp(),
        });
      }
    }
  };

  const saveUserProfile = async (uid: string, data: { displayName: string; email: string; photoURL?: string; username?: string }) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
    }
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL || '',
      ...(data.username ? { username: data.username } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout, signInWithGoogle, saveUserProfile }}>
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
