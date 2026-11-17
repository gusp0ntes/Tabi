import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./context";
import { FullLoading } from "./components";
import Landing from "./Landing";
const AuthPage = lazy(() => import("./AuthPage"));
const Onboarding = lazy(() => import("./Onboarding"));
const MyTrips = lazy(() => import("./MyTrips"));
const Workspace = lazy(() => import("./Workspace"));
const SharedTrip = lazy(() => import("./SharedTrip"));
const Invite = lazy(() => import("./Invite"));
function Protected({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <FullLoading title="Abrindo sua conta" />;
  if (error)
    return (
      <div className="service-error">
        <h1>Vamos tentar de novo?</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => void refresh()}>
          Tentar novamente
        </button>
      </div>
    );
  if (!user)
    return (
      <Navigate
        to={"/entrar?next=" + encodeURIComponent(location.pathname)}
        replace
      />
    );
  return children;
}
export default function App() {
  return (
    <Suspense fallback={<FullLoading title="Abrindo o Tabi" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/entrar" element={<AuthPage />} />
        <Route path="/cadastro" element={<AuthPage register />} />
        <Route path="/nova-viagem" element={<Onboarding />} />
        <Route path="/viagem/:token" element={<SharedTrip />} />
        <Route path="/convite/:token" element={<Invite />} />
        <Route
          path="/app"
          element={
            <Protected>
              <MyTrips />
            </Protected>
          }
        />
        <Route
          path="/app/:id"
          element={
            <Protected>
              <Workspace />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
