import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CalendarDays, ShieldCheck, Users } from "lucide-react";
import type { SharedTrip } from "../shared/schema";
import { api } from "./api";
import { Brand, FieldError, FullLoading, ThemeButton } from "./components";
import { useAuth } from "./context";

type Preview = {
  trip: Pick<
    SharedTrip,
    "title" | "destination" | "days" | "travelers" | "startDate"
  >;
  expiresAt: string;
};
export default function Invite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setPreview(null);
    setError("");
    api<Preview>("/public/invites/" + token, { signal: controller.signal })
      .then(setPreview)
      .catch((e) => {
        if (!controller.signal.aborted) setError((e as Error).message);
      });
    return () => controller.abort();
  }, [token]);
  const next = encodeURIComponent("/convite/" + token);
  if (!preview && !error) return <FullLoading title="Abrindo seu convite" />;
  return (
    <div className="invite-page">
      <header className="shared-header">
        <Brand />
        <ThemeButton />
      </header>
      <main className="invite-card">
        {preview ? (
          <>
            <img
              className="invite-cover"
              src={preview.trip.destination.cover}
              alt={preview.trip.destination.coverCaption}
            />
            <div className="invite-body">
              <span className="eyebrow">
                TEM UM LUGAR PARA VOCÊ NESSA JORNADA
              </span>
              <h1>Vamos planejar juntos?</h1>
              <h2>{preview.trip.title}</h2>
              <p>
                {preview.trip.destination.flag} {preview.trip.destination.label}
              </p>
              <div className="invite-facts">
                <span>
                  <CalendarDays size={17} />
                  {preview.trip.days} dias
                </span>
                <span>
                  <Users size={17} />
                  {preview.trip.travelers}{" "}
                  {preview.trip.travelers === 1 ? "viajante" : "viajantes"}
                </span>
              </div>
              <p className="invite-explanation">
                Ao aceitar, você poderá ver e editar o roteiro, o orçamento e os
                detalhes dessa viagem. O organizador continua responsável pelos
                acessos.
              </p>
              <FieldError message={error || auth.error} />
              {auth.loading ? (
                <p role="status">Conferindo sua conta…</p>
              ) : auth.user ? (
                <>
                  <button
                    className="button primary full"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        const r = await api<{ tripId: string }>(
                          `/invites/${token}/accept`,
                          { method: "POST" },
                        );
                        navigate("/app/" + r.tripId, { replace: true });
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy
                      ? "Entrando na viagem…"
                      : "Aceitar convite e participar"}
                    <ArrowRight size={18} />
                  </button>
                  <p className="invite-account">
                    Você está entrando como <strong>{auth.user.name}</strong>.
                  </p>
                </>
              ) : (
                <div className="invite-auth">
                  <Link
                    className="button primary full"
                    to={`/entrar?next=${next}`}
                  >
                    Entrar para aceitar
                    <ArrowRight size={18} />
                  </Link>
                  <Link className="text-link" to={`/cadastro?next=${next}`}>
                    Ainda não tenho conta · criar minha conta
                  </Link>
                </div>
              )}
              <p className="sharing-footnote">
                <ShieldCheck size={16} /> Convite individual · válido até{" "}
                {new Date(preview.expiresAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </>
        ) : (
          <div className="invite-body">
            <Users size={36} />
            <h1>Esse convite não está disponível.</h1>
            <p>{error}</p>
            <p className="muted">Peça um novo link ao organizador da viagem.</p>
            <Link to="/" className="button secondary">
              Voltar ao Tabi
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
