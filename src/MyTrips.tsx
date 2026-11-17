import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Compass,
  LogOut,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import type { Trip } from "../shared/schema";
import { finances, shortDate } from "../shared/planner";
import { api } from "./api";
import { useAuth, useNotice } from "./context";
import {
  Brand,
  Empty,
  FieldError,
  FullLoading,
  Modal,
  ThemeButton,
} from "./components";
export default function MyTrips() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notice = useNotice();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Trip | null>(null);
  const [busy, setBusy] = useState(false);
  function load() {
    setError("");
    api<{ trips: Trip[] }>("/trips")
      .then((r) => setTrips(r.trips))
      .catch((e) => setError((e as Error).message));
  }
  useEffect(load, []);
  if (!trips && !error) return <FullLoading title="Reunindo suas viagens" />;
  return (
    <div className="my-trips">
      <header className="landing-header">
        <Brand />
        <div>
          <ThemeButton />
          <span className="account-name">{user?.name.split(" ")[0]}</span>
          <button
            className="text-link"
            onClick={async () => {
              try {
                await logout();
                navigate("/");
              } catch (e) {
                notice((e as Error).message, true);
              }
            }}
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </header>
      <main>
        <div className="my-trips-heading">
          <div>
            <span className="eyebrow">SEU MUNDO, SEUS PLANOS</span>
            <h1>
              Qual vai ser
              <br />o próximo <em>capítulo?</em>
            </h1>
            <p className="muted">
              Seus destinos e suas histórias começam por aqui,{" "}
              {user?.name.split(" ")[0]}.
            </p>
          </div>
          <Link className="button primary" to="/nova-viagem">
            <Plus size={17} />
            Nova viagem
          </Link>
        </div>
        <FieldError message={error} />
        {error && (
          <button className="button secondary" onClick={load}>
            Tentar novamente
          </button>
        )}
        {trips?.length === 0 ? (
          <div className="panel">
            <Empty
              icon={<Compass size={35} />}
              title="Um espaço esperando pelos seus planos."
              description="Comece com um destino, algumas datas e a vontade de ir."
            >
              <Link className="button primary" to="/nova-viagem">
                Criar minha primeira viagem
                <ArrowRight size={16} />
              </Link>
            </Empty>
          </div>
        ) : (
          <div className="my-trip-grid">
            {trips?.map((trip) => {
              const progress = finances(trip).percent;
              return (
                <article className="trip-card" key={trip.id}>
                  <Link to={"/app/" + trip.id} className="trip-card-photo">
                    <img
                      src={trip.destination.cover}
                      alt={trip.destination.coverCaption}
                    />
                    <span>
                      {trip.destination.flag} {trip.destination.country}
                    </span>
                    <ArrowUpRight size={21} />
                  </Link>
                  <div className="trip-card-body">
                    <div>
                      <Link to={"/app/" + trip.id}>
                        <h2>{trip.title}</h2>
                      </Link>
                      <button
                        className="icon-button"
                        aria-label={`Excluir ${trip.title}`}
                        onClick={() => setDeleting(trip)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="trip-meta">
                      <span>
                        <CalendarDays size={13} />
                        {trip.startDate
                          ? shortDate(trip.startDate)
                          : "Data a definir"}{" "}
                        · {trip.days} dias
                      </span>
                      <span>
                        <Users size={13} />
                        {trip.travelers}{" "}
                        {trip.travelers === 1 ? "pessoa" : "pessoas"}
                      </span>
                    </div>
                    <div className="trip-card-progress">
                      <span>Meta da viagem</span>
                      <strong>{progress}%</strong>
                    </div>
                    <div className="progress">
                      <span
                        style={{
                          width: `${progress}%`,
                          background: trip.destination.accent,
                        }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <p className="my-trips-note">
          Seus planos ficam na sua conta. Entre de qualquer dispositivo para
          continuar.
        </p>
      </main>
      {deleting && (
        <Modal
          title="Excluir essa viagem?"
          description={`“${deleting.title}” e seus detalhes serão removidos permanentemente da sua conta.`}
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Manter viagem
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/trips/" + deleting.id, { method: "DELETE" });
                  setTrips((t) => t!.filter((x) => x.id !== deleting.id));
                  setDeleting(null);
                  notice("Viagem excluída da sua conta.");
                } catch (e) {
                  notice((e as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Excluindo…" : "Excluir viagem"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
