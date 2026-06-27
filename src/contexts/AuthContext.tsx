"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type Rol = "admin" | "director" | "user" | "vp";

export interface UserProfile {
  nombre: string;
  rol: Rol;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true,
  signIn: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /** Escribe el cookie sofiaa_role que lee el Edge Middleware para RBAC */
  const setRoleCookie = (rol: string) => {
    document.cookie = `sofiaa_role=${rol}; path=/; SameSite=Lax; Max-Age=86400`;
  };

  /** Borra el cookie de rol al cerrar sesión */
  const clearRoleCookie = () => {
    document.cookie = "sofiaa_role=; path=/; Max-Age=0";
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "usuarios", u.uid));
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile(data);
            setRoleCookie(data.rol); // ← Edge Middleware RBAC
          } else {
            setProfile({ nombre: u.email ?? "Usuario", rol: "vp" });
            setRoleCookie("vp");
          }
        } catch {
          setProfile({ nombre: u.email ?? "Usuario", rol: "vp" });
          setRoleCookie("vp");
        }
      } else {
        setProfile(null);
        clearRoleCookie(); // ← limpiar al cerrar sesión
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useIsAdmin() {
  const { profile } = useAuth();
  return profile?.rol === "admin";
}
