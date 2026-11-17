import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, Eye, MapPin, Plane, Route, Users } from "lucide-react";
import type { SharedTrip as SharedTripData } from "../shared/schema";
import { addDays, itinerary, shortDate } from "../shared/planner";
import { api } from "./api";
import { Brand, FullLoading, ThemeButton } from "./components";

export default function SharedTrip() {
  const { token } = useParams();
  const [trip, setTrip] = useState<SharedTripData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setTrip(null);
    setError("");
    api<{ trip: SharedTripData }>("/public/trips/" + token, {
      signal: controller.signal,
    })
      .then((r) => setTrip(r.trip))
      .catch((e) => {
        if (!controller.signal.aborted) setError((e as Error).message);
      });
    return () => controller.abort();
  }, [token]);
  if (error)
    return (
      <main className="service-error">
        <Eye size={32} />
        <h1>Essa jornada está reservada.</h1>
        <p>{error}</p>
        <Link to="/" className="button secondary">
          Conhecer o Tabi
        </Link>
      </main>
    );
  if (!trip)
    return (
      <FullLoading
        title="Abrindo essa jornada"
        description="Um roteiro para descobrir, um dia de cada vez."
      />
    );
  const stops = itinerary(trip);
  const activities = [...trip.activities].sort((a, b) => a.day - b.day);
  const lastDate = trip.startDate
    ? addDays(trip.startDate, trip.days - 1)
    : null;
  const period =
    trip.startDate && lastDate
      ? `${shortDate(trip.startDate)}${trip.startDate.slice(0, 4) !== lastDate.slice(0, 4) ? ", " + trip.startDate.slice(0, 4) : ""} — ${shortDate(lastDate)}, ${lastDate.slice(0, 4)}`
      : "Datas a definir";
  return (
    <div
      className="shared-page"
      style={{ "--accent": trip.destination.accent } as CSSProperties}
    >
      <header className="shared-header">
        <Brand />
        <div>
          <span className="access-badge">
            <Eye size={15} /> Somente visualização
          </span>
          <ThemeButton />
        </div>
      </header>
      <main>
        <div className="shared-intro">
          <span className="eyebrow">UMA JORNADA COMPARTILHADA</span>
          <h1>{trip.title}</h1>
          <p>Um pedacinho dos planos, para você acompanhar de perto.</p>
        </div>
        <section className="shared-hero">
          <img
            src={trip.destination.cover}
            alt={trip.destination.coverCaption}
          />
          <div>
            <span>
              {trip.destination.flag} {trip.destination.country}
            </span>
            <h2>{trip.destination.label}</h2>
            <p>
              <MapPin size={15} /> {trip.destination.coverCaption}
            </p>
          </div>
        </section>
        <div className="shared-facts">
          <div>
            <CalendarDays size={21} />
            <span>
              Quando
              <strong>{period}</strong>
            </span>
          </div>
          <div>
            <Route size={21} />
            <span>
              A jornada
              <strong>
                {trip.days} dias · {trip.route.length}{" "}
                {trip.route.length === 1 ? "cidade" : "cidades"}
              </strong>
            </span>
          </div>
          <div>
            <Users size={21} />
            <span>
              Em companhia
              <strong>
                {trip.travelers}{" "}
                {trip.travelers === 1 ? "viajante" : "viajantes"}
              </strong>
            </span>
          </div>
        </div>
        {(trip.outboundDate || trip.homeArrivalDate) && (
          <div className="shared-flights">
            <Plane size={19} />
            <div>
              <strong>Os dias de deslocamento</strong>
              <p>
                {trip.outboundDate &&
                  `Embarque de ida em ${shortDate(trip.outboundDate)}.`}{" "}
                {trip.homeArrivalDate &&
                  `Chegada de volta em ${shortDate(trip.homeArrivalDate)}.`}
              </p>
            </div>
          </div>
        )}
        <section className="shared-itinerary">
          <div className="shared-section-heading">
            <span className="eyebrow">CADA PARADA, UMA NOVA HISTÓRIA</span>
            <h2>Por onde essa viagem passa</h2>
          </div>
          <ol>
            {stops.map((stop, index) => (
              <li key={stop.id}>
                <span className="shared-stop-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{stop.city}</h3>
                  <p>
                    {stop.start
                      ? `${shortDate(stop.start)} — ${shortDate(stop.end!)}`
                      : `Dias ${stop.firstDay} a ${stop.lastDay}`}
                  </p>
                </div>
                <span className="shared-stop-days">
                  {stop.days} {stop.days === 1 ? "dia" : "dias"}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section className="shared-activities">
          <div className="shared-section-heading">
            <span className="eyebrow">PLANOS QUE VIRAM MEMÓRIAS</span>
            <h2>O que está no roteiro</h2>
          </div>
          {activities.length ? (
            <div className="shared-activity-grid">
              {activities.map((activity) => (
                <article key={activity.id}>
                  <span>
                    Dia {activity.day}
                    {trip.startDate &&
                      ` · ${shortDate(addDays(trip.startDate, activity.day - 1))}`}
                  </span>
                  <h3>{activity.name}</h3>
                  {activity.city && (
                    <p>
                      <MapPin size={14} /> {activity.city}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="shared-empty">
              Os passeios ainda estão ganhando forma. As próximas ideias
              aparecem por aqui.
            </p>
          )}
        </section>
        <div className="shared-closing">
          <span className="eyebrow">
            SEU PRÓXIMO CAPÍTULO TAMBÉM PODE COMEÇAR AQUI
          </span>
          <h2>Mais mundo. Menos planos espalhados.</h2>
          <Link className="button primary" to="/nova-viagem">
            Planejar minha própria viagem
          </Link>
        </div>
      </main>
      <footer className="shared-footer">
        <span>Planejado com Tabi.</span>
        <span>
          <Eye size={14} /> Esta página permite apenas acompanhar a viagem.
        </span>
      </footer>
    </div>
  );
}
