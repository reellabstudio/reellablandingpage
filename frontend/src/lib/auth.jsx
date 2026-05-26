import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [theme, setThemeState] = useState(localStorage.getItem("rl_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("rl_theme", theme);
  }, [theme]);

  const fetchMe = useCallback(async () => {
    const t = localStorage.getItem("rl_token");
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      if (data.user.theme) setThemeState(data.user.theme);
    } catch {
      localStorage.removeItem("rl_token");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("rl_token", data.token);
    setUser(data.user);
    if (data.user.theme) setThemeState(data.user.theme);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("rl_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("rl_token");
    setUser(null);
  };

  const refresh = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      /* ignore */
    }
  };

  const setTheme = async (t) => {
    setThemeState(t);
    if (user) {
      try {
        await api.patch("/auth/profile", { theme: t });
      } catch {
        /* non-blocking */
      }
    }
  };

  return (
    <AuthCtx.Provider value={{ user, login, register, logout, refresh, theme, setTheme }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
