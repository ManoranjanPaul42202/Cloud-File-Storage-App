import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import axios, { type AxiosInstance } from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type AuthContextValue = {
  token: string;
  setToken: (t: string) => void;
  clearAuth: () => void;
  api: AxiosInstance;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState(
    () => localStorage.getItem("token") || ""
  );

  const setToken = (t: string) => {
    setTokenState(t);
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");
  };

  const clearAuth = () => setToken("");

  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE_URL,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    [token]
  );

  return (
    <AuthContext.Provider value={{ token, setToken, clearAuth, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
