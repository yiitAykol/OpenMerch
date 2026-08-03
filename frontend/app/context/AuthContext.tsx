"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: string;
};

// Backend'in { message, token?, user? } döndüğü ortak yanıt tipi.
type AuthResponse = {
  ok: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
};

interface AuthContextProps {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  register: (username: string, email: string, password: string) => Promise<AuthResponse>;
  verify: (email: string, code: string) => Promise<AuthResponse>;
  resend: (email: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  token: null,
  loading: true,
  register: async () => ({ ok: false, message: "" }),
  verify: async () => ({ ok: false, message: "" }),
  resend: async () => ({ ok: false, message: "" }),
  login: async () => ({ ok: false, message: "" }),
  logout: () => { },
});

const API = process.env.NEXT_PUBLIC_API_URL;
const TOKEN_KEY = "sb_token";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sayfa yüklenince kayıtlı token varsa /api/auth/me ile kullanıcıyı geri yükle.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then(async (res) => {
        if (res.ok) {
          setUser(await res.json());
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const post = async (path: string, body: object): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, message: data.message ?? "", token: data.token, user: data.user };
    } catch {
      return { ok: false, message: "Sunucuya ulaşılamadı." };
    }
  };

  // Token ve kullanıcıyı hem state'e hem localStorage'a yazan yardımcı.
  const persistSession = (result: AuthResponse) => {
    if (result.ok && result.token && result.user) {
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setUser(result.user);
    }
  };

  const register = (username: string, email: string, password: string) =>
    post("/api/auth/register", { username, email, password });

  const verify = async (email: string, code: string) => {
    const result = await post("/api/auth/verify", { email, code });
    persistSession(result);
    return result;
  };

  const resend = (email: string) => post("/api/auth/resend", { email });

  const login = async (email: string, password: string) => {
    const result = await post("/api/auth/login", { email, password });
    persistSession(result);
    return result;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, register, verify, resend, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
