import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import type { User } from "../shared/schema";
import { api, ApiError } from "./api";
type AuthState = {
  user: User | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const Auth = createContext<AuthState>(null!);
export const useAuth = () => useContext(Auth);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const authRevision = useRef(0);
  async function refresh() {
    const revision = authRevision.current;
    try {
      setError("");
      const result = await api<{ user: User }>("/auth/me");
      if (revision === authRevision.current) setUser(result.user);
    } catch (e) {
      if (revision === authRevision.current) {
        setUser(null);
        if (!(e instanceof ApiError && e.status === 401))
          setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function login(email: string, password: string) {
    authRevision.current++;
    const result = await api<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(result.user);
    setError("");
    setLoading(false);
  }
  async function register(name: string, email: string, password: string) {
    authRevision.current++;
    const result = await api<{ user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setUser(result.user);
    setError("");
    setLoading(false);
  }
  async function logout() {
    authRevision.current++;
    await api<void>("/auth/logout", { method: "POST" });
    setUser(null);
  }
  return (
    <Auth.Provider
      value={{ user, loading, error, login, register, logout, refresh }}
    >
      {children}
    </Auth.Provider>
  );
}
const Theme = createContext<{ theme: "dark" | "light"; toggle: () => void }>(
  null!,
);
export const useTheme = () => useContext(Theme);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#151b17" : "#f8f8f2");
    try {
      localStorage.setItem("tabi.theme", theme);
    } catch {
      /* Theme remains available for the current session. */
    }
  }, [theme]);
  return (
    <Theme.Provider
      value={{
        theme,
        toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </Theme.Provider>
  );
}
const Notice = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export const useNotice = () => useContext(Notice);
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 5500);
    return () => clearTimeout(timeout);
  }, [notice]);
  return (
    <Notice.Provider
      value={(text, error = false) => setNotice({ text, error })}
    >
      {children}
      {notice && (
        <div
          className={`toast ${notice.error ? "is-error" : ""}`}
          role="status"
        >
          {notice.error ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{notice.text}</span>
          <button aria-label="Fechar mensagem" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </Notice.Provider>
  );
}
