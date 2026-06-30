import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { CurrentUser, getCurrentUser, login, logout, register } from "../api/client";

type AuthContextValue = {
  user: CurrentUser | null;
  isLoading: boolean;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: { email: string; name: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((response) => setUser(response.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
    }

    window.addEventListener("usagemeter:session-expired", handleSessionExpired);
    return () => window.removeEventListener("usagemeter:session-expired", handleSessionExpired);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async signIn(input) {
        const response = await login(input);
        setUser(response.user);
      },
      async signUp(input) {
        const response = await register(input);
        setUser(response.user);
      },
      async signOut() {
        await logout();
        setUser(null);
      }
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
