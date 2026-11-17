import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  GripVertical,
  Heart,
  Hotel,
  MapPin,
  Minus,
  Plane,
  Plus,
  Settings2,
  ShieldCheck,
  Ticket,
  Trash2,
  Wallet,
} from "lucide-react";
import type {
  Booking,
  CategoryId,
  Recommendation,
  Trip,
} from "../shared/schema";
import {
  addDays,
  brl,
  categories,
  dateKey,
  dateOf,
  estimate,
  finances,
  flag,
  itinerary,
  shortDate,
  styles,
  withRoute,
} from "../shared/planner";
import { api } from "./api";
import { useNotice } from "./context";
import { CityInput, useCountries } from "./Onboarding";
import {
  Empty,
  FieldError,
  Modal,
  SectionHeading,
  SourceLink,
} from "./components";
import type { ChangeTrip } from "./useTrip";
type Props = { trip: Trip; change: ChangeTrip };
function Stepper({
  value,
  min = 1,
  max = 90,
  label,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  label: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="stepper">
      <button
        aria-label={`Diminuir ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <span>
        <strong>{value}</strong> {value === 1 ? "dia" : "dias"}
      </span>
      <button
        aria-label={`Aumentar ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
export function RouteView({ trip, change }: Props) {
  const [adding, setAdding] = useState(false);
  const route = itinerary(trip);
  function move(index: number, delta: number) {
    change((t) => {
      const stops = [...t.route];
      [stops[index], stops[index + delta]] = [
        stops[index + delta],
        stops[index],
      ];
      return { ...t, route: stops };
    });
  }
  return (
    <>
      <div className="view-toolbar">
        <span className="subtle">
          {route.length} {route.length === 1 ? "cidade" : "cidades"} ·{" "}
          {trip.days} dias no destino
        </span>
        <button
          className="button primary"
          disabled={trip.days >= 90 || trip.route.length >= 20}
          onClick={() => setAdding(true)}
        >
          <Plus size={16} />
          Adicionar cidade
        </button>
      </div>
      <div className="route-layout">
        <div className="route-cards">
          {route.map((s, i) => (
            <article
              className="panel route-card"
              key={s.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                const from = trip.route.findIndex((r) => r.id === id);
                if (from < 0) return;
                const stops = [...trip.route];
                const [item] = stops.splice(from, 1);
                stops.splice(i, 0, item);
                change((t) => ({ ...t, route: stops }));
              }}
            >
              <span className="route-card-index">
                {String(i + 1).padStart(2, "0")}
                <GripVertical size={15} />
              </span>
              <div className="route-card-main">
                <span className="eyebrow">
                  {s.start
                    ? `${shortDate(s.start)} — ${shortDate(s.end!)}`
                    : `DIAS ${s.firstDay} — ${s.lastDay}`}
                </span>
                <h2>
                  {s.city}
                  <span>{flag(s.countryCode)}</span>
                </h2>
                <p>
                  {s.days === 1
                    ? "Um dia para conhecer uma nova história."
                    : "Tempo para explorar no seu ritmo."}
                </p>
                <div className="route-card-bottom">
                  <Stepper
                    label={`dias em ${s.city}`}
                    value={s.days}
                    max={90 - trip.days + s.days}
                    onChange={(days) =>
                      change((t) =>
                        withRoute(
                          t,
                          t.route.map((r) =>
                            r.id === s.id ? { ...r, days } : r,
                          ),
                        ),
                      )
                    }
                  />
                  <SourceLink
                    href={
                      "https://www.google.com/maps/search/?api=1&query=" +
                      encodeURIComponent(s.city + " " + s.countryCode)
                    }
                  >
                    Ver no mapa
                  </SourceLink>
                </div>
              </div>
              <div className="route-card-controls">
                <button
                  className="icon-button"
                  disabled={i === 0}
                  aria-label={`Mover ${s.city} para cima`}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  disabled={i === route.length - 1}
                  aria-label={`Mover ${s.city} para baixo`}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="icon-button"
                  disabled={route.length === 1}
                  aria-label={`Remover ${s.city}`}
                  onClick={() =>
                    change((t) =>
                      withRoute(
                        t,
                        t.route.filter((r) => r.id !== s.id),
                      ),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <aside className="panel route-explanation">
          <Compass size={27} strokeWidth={1.3} />
          <h3>
            A viagem acompanha
            <br />
            as suas escolhas.
          </h3>
          <p>
            Arraste as cidades ou use as setas para mudar a ordem. Ajuste os
            dias em cada parada para reorganizar o calendário e os custos
            diários.
          </p>
          <div className="divider" />
          <span className="eyebrow">ESTIMATIVA DA VIAGEM</span>
          <strong>{brl(finances(trip).total)}</strong>
          <p className="input-hint">
            O orçamento parte do destino principal. Revise passagens e
            deslocamentos ao adicionar novas regiões.
          </p>
        </aside>
      </div>
      {adding && (
        <AddStop
          trip={trip}
          onClose={() => setAdding(false)}
          onSave={(city, countryCode, days) => {
            change((t) =>
              withRoute(t, [
                ...t.route,
                { id: crypto.randomUUID(), city, countryCode, days },
              ]),
            );
            setAdding(false);
          }}
        />
      )}
    </>
  );
}
function AddStop({
  trip,
  onClose,
  onSave,
}: {
  trip: Trip;
  onClose: () => void;
  onSave: (city: string, code: string, days: number) => void;
}) {
  const { countries } = useCountries();
  const [country, setCountry] = useState(trip.destination.countryCode);
  const [city, setCity] = useState("");
  const [days, setDays] = useState(Math.min(2, 90 - trip.days));
  const [error, setError] = useState("");
  return (
    <Modal
      title="Qual é a próxima parada?"
      description="A cidade entra ao final do roteiro. Você pode mudar a ordem depois."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!city.trim()) {
            setError("Digite o nome da cidade.");
            return;
          }
          onSave(city.trim(), country, days);
        }}
      >
        <label className="field">
          País
          <select
            aria-label="País"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCity("");
            }}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Cidade
          <CityInput value={city} onChange={setCity} countryCode={country} />
        </label>
        <label className="field">
          Dias nessa cidade
          <input
            required
            type="number"
            min="1"
            max={90 - trip.days}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </label>
        <p className="input-hint">
          Adicionar uma parada estende a viagem. A duração total vai para{" "}
          {trip.days + days} dias.
        </p>
        <FieldError message={error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary">
            <Plus size={15} />
            Adicionar cidade
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function BudgetView({ trip, change }: Props) {
  const funds = finances(trip);
  const cost = estimate(trip);
  return (
    <>
      <div className="scenario-grid">
        {styles.map((s) => {
          const total = estimate(trip, s.id, false).reduce(
            (n, c) => n + c.amount,
            0,
          );
          return (
            <button
              className={`scenario ${trip.style === s.id ? "selected" : ""}`}
              key={s.id}
              aria-pressed={trip.style === s.id}
              onClick={() => change((t) => ({ ...t, style: s.id, costs: {} }))}
            >
              <div>
                <span>{s.name}</span>
                {trip.style === s.id && <Check size={15} />}
              </div>
              <strong>{brl(total)}</strong>
              <p>{s.description}</p>
              <div className="progress">
                <span
                  style={{
                    width: `${Math.min(100, (funds.funded / Math.max(1, total)) * 100)}%`,
                  }}
                />
              </div>
              <small>
                Referência para {trip.travelers}{" "}
                {trip.travelers === 1 ? "pessoa" : "pessoas"} · {trip.days} dias
              </small>
            </button>
          );
        })}
      </div>
      <div className="budget-layout">
        <section className="panel budget-breakdown">
          <SectionHeading title="Um lugar para cada real">
            <button
              className="text-link"
              disabled={!Object.keys(trip.costs).length}
              onClick={() => change((t) => ({ ...t, costs: {} }))}
            >
              Restaurar estimativas
            </button>
          </SectionHeading>
          <div className="stacked-bar">
            {cost.map((c) => (
              <span
                key={c.id}
                style={{
                  width: `${funds.total ? (c.amount / funds.total) * 100 : 0}%`,
                  background: c.color,
                }}
                title={`${c.name}: ${brl(c.amount)}`}
              />
            ))}
          </div>
          <p className="input-hint">
            Tem um preço pesquisado? Edite o valor total da categoria abaixo.
          </p>
          <div className="budget-rows">
            {cost.map((c) => (
              <label className="budget-row" key={c.id}>
                <span>
                  <i style={{ background: c.color }} />
                  {c.name}
                  {trip.costs[c.id] !== undefined && <small>ajustado</small>}
                </span>
                <div>
                  <span>R$</span>
                  <input
                    aria-label={`Orçamento de ${c.name}`}
                    type="number"
                    min="0"
                    max="100000000"
                    step="1"
                    value={c.amount}
                    onChange={(e) => {
                      const amount = Number(e.target.value);
                      if (amount >= 0 && amount <= 1e8)
                        change((t) => ({
                          ...t,
                          costs: { ...t.costs, [c.id]: amount },
                        }));
                    }}
                  />
                </div>
                <small>
                  {funds.total ? Math.round((c.amount / funds.total) * 100) : 0}
                  %
                </small>
              </label>
            ))}
          </div>
          <div className="budget-total">
            <span>Total da viagem</span>
            <strong>{brl(funds.total)}</strong>
          </div>
          <p className="footnote">
            Valores iniciais em reais para simulação, sem consulta a tarifas ou
            câmbio. As referências de passagens partem do Brasil. Custos diários
            acompanham pessoas e duração; valores que você personalizar ficam
            fixos. Trocar o cenário restaura as estimativas.
          </p>
        </section>
        <aside className="budget-side">
          <section className="panel budget-goal">
            <Wallet size={21} />
            <span className="eyebrow">O SEU PRÓXIMO DESTINO</span>
            <h2>{brl(funds.remaining)}</h2>
            <p>é o que falta guardar.</p>
            <div className="progress-label">
              <span>{brl(funds.funded)} garantidos</span>
              <strong>{funds.percent}%</strong>
            </div>
            <div className="progress">
              <span style={{ width: `${funds.percent}%` }} />
            </div>
            <label className="field">
              Dinheiro guardado (R$)
              <input
                type="number"
                min="0"
                max="100000000"
                step="0.01"
                value={trip.cash}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 0 && n <= 1e8) change((t) => ({ ...t, cash: n }));
                }}
              />
            </label>
            <p className="input-hint">
              {brl(funds.paid)} em reservas pagas já entram no progresso. Se
              pagou com a caixinha, informe o saldo que sobrou.
            </p>
          </section>
          <section className="budget-tip">
            <ShieldCheck size={22} />
            <div>
              <h3>Dinheiro que já tem destino.</h3>
              <p>
                Parcelas futuras não são saldo disponível. Considere como pago
                apenas o que já foi quitado.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
export function CalendarView({
  trip,
  change,
  onEdit,
}: Props & { onEdit: () => void }) {
  const [month, setMonth] = useState(
    (trip.startDate || dateKey(new Date())).slice(0, 7),
  );
  const [selected, setSelected] = useState(
    trip.startDate || dateKey(new Date()),
  );
  const [newActivity, setNewActivity] = useState("");
  useEffect(() => {
    if (trip.startDate) {
      setMonth(trip.startDate.slice(0, 7));
      setSelected(trip.startDate);
    }
  }, [trip.startDate]);
  if (!trip.startDate)
    return (
      <section className="panel">
        <Empty
          icon={<CalendarDays size={34} />}
          title="Um calendário esperando pelas suas datas."
          description="Defina a chegada ao destino para distribuir as cidades e os passeios nos dias da viagem."
        >
          <button className="button primary" onClick={onEdit}>
            Definir data de chegada
            <ArrowRight size={16} />
          </button>
        </Empty>
      </section>
    );
  const first = dateOf(month + "-01");
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const route = itinerary(trip);
  const end = addDays(trip.startDate, trip.days - 1);
  const dayIndex =
    Math.round(
      (dateOf(selected).getTime() - dateOf(trip.startDate).getTime()) /
        86400000,
    ) + 1;
  const stop = route.find(
    (s) => s.start && s.end && selected >= s.start && selected <= s.end,
  );
  const activities = trip.activities.filter((a) => a.day === dayIndex);
  function shift(delta: number) {
    const d = dateOf(month + "-01");
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(dateKey(d).slice(0, 7));
  }
  return (
    <>
      <div className="view-toolbar">
        <div className="legend">
          <span>
            <i />
            No destino
          </span>
          <span>
            <i className="flight" />
            Em voo / deslocamento
          </span>
        </div>
        <button className="button secondary" onClick={onEdit}>
          <Plane size={15} />
          Ajustar datas e voos
        </button>
      </div>
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-toolbar">
            <h2>
              {first.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </h2>
            <div>
              <button
                className="text-link"
                onClick={() => {
                  setMonth(trip.startDate!.slice(0, 7));
                  setSelected(trip.startDate!);
                }}
              >
                Nossa viagem
              </button>
              <button
                className="icon-button"
                aria-label="Mês anterior"
                onClick={() => shift(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Próximo mês"
                onClick={() => shift(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="calendar-week">
            {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {Array.from({ length: offset }, (_, i) => (
              <div className="calendar-empty" key={"empty" + i} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const key = month + "-" + String(i + 1).padStart(2, "0");
              const s = route.find(
                (r) => r.start && r.end && key >= r.start && key <= r.end,
              );
              const flight = !!(
                (trip.outboundDate &&
                  key >= trip.outboundDate &&
                  key <= trip.startDate!) ||
                (trip.homeArrivalDate &&
                  key >= end &&
                  key <= trip.homeArrivalDate)
              );
              const day =
                Math.round(
                  (dateOf(key).getTime() - dateOf(trip.startDate!).getTime()) /
                    86400000,
                ) + 1;
              const number = trip.activities.filter(
                (a) => a.day === day,
              ).length;
              return (
                <button
                  className={`calendar-day ${s ? "is-stay" : ""} ${flight ? "is-flight" : ""} ${selected === key ? "is-selected" : ""}`}
                  key={key}
                  aria-label={`${i + 1} de ${first.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" })}${s ? ", " + s.city : ""}${flight ? ", em deslocamento" : ""}`}
                  onClick={() => setSelected(key)}
                >
                  <span>
                    {i + 1}
                    {flight && <Plane size={11} />}
                  </span>
                  {s && <small>{s.city}</small>}
                  {flight && (
                    <small className="flight-event">
                      {key <= trip.startDate! ? "Voo de ida" : "Voo de volta"}
                    </small>
                  )}
                  {number > 0 && (
                    <i>
                      {number} {number === 1 ? "passeio" : "passeios"}
                    </i>
                  )}
                  {trip.notes[key] && <span className="note-dot" />}
                </button>
              );
            })}
          </div>
          <p className="calendar-note">
            <Plane size={13} />
            Os dias de voo aparecem depois de informar embarque de ida e chegada
            de volta em “Ajustar datas e voos”.
          </p>
        </section>
        <aside className="panel day-panel">
          <span className="eyebrow">UM DIA DO SEU CAPÍTULO</span>
          <h2>
            {dateOf(selected).toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}
          </h2>
          <span className="muted day-weekday">
            {dateOf(selected).toLocaleDateString("pt-BR", {
              weekday: "long",
              timeZone: "UTC",
            })}
          </span>
          {stop ? (
            <div className="day-city">
              <MapPin size={15} />
              <strong>{stop.city}</strong>
              <small>Dia {dayIndex}</small>
            </div>
          ) : (
            <p className="input-hint day-free">
              Um dia fora da programação no destino.
            </p>
          )}
          {activities.map((a) => (
            <div className="day-activity" key={a.id}>
              <button
                aria-label={`${a.done ? "Desmarcar" : "Concluir"} ${a.name}`}
                className={a.done ? "done" : ""}
                onClick={() =>
                  change((t) => ({
                    ...t,
                    activities: t.activities.map((x) =>
                      x.id === a.id ? { ...x, done: !x.done } : x,
                    ),
                  }))
                }
              >
                <span className="task-check">
                  {a.done && <Check size={12} />}
                </span>
                {a.name}
              </button>
              <button
                className="icon-button"
                aria-label={`Remover ${a.name}`}
                onClick={() =>
                  change((t) => ({
                    ...t,
                    activities: t.activities.filter((x) => x.id !== a.id),
                  }))
                }
              >
                <XIcon />
              </button>
            </div>
          ))}
          {stop && (
            <form
              className="inline-add"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newActivity.trim()) return;
                change((t) => ({
                  ...t,
                  activities: [
                    ...t.activities,
                    {
                      id: crypto.randomUUID(),
                      name: newActivity.trim(),
                      day: dayIndex,
                      city: stop.city,
                      done: false,
                      notes: "",
                    },
                  ],
                }));
                setNewActivity("");
              }}
            >
              <input
                aria-label="Novo passeio"
                placeholder="Adicionar um passeio…"
                maxLength={160}
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
              />
              <button
                aria-label="Adicionar passeio"
                disabled={!newActivity.trim()}
              >
                <Plus size={16} />
              </button>
            </form>
          )}
          <label className="field day-notes">
            Anotações desse dia
            <textarea
              rows={5}
              maxLength={3000}
              placeholder="Um café, um lembrete, uma ideia…"
              value={trip.notes[selected] || ""}
              onChange={(e) =>
                change((t) => ({
                  ...t,
                  notes: { ...t.notes, [selected]: e.target.value },
                }))
              }
            />
          </label>
          <span className="autosave">
            <Check size={12} />
            Salvo automaticamente na sua conta
          </span>
        </aside>
      </div>
    </>
  );
}
function XIcon() {
  return <span aria-hidden="true">×</span>;
}
export function DiscoverView({ trip, change }: Props) {
  const notice = useNotice();
  const [stop, setStop] = useState(trip.route[0].id);
  const [data, setData] = useState<Recommendation[]>([]);
  const [error, setError] = useState("");
  const [day, setDay] = useState(1);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const selected = trip.route.find((s) => s.id === stop) || trip.route[0];
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    setData([]);
    api<{ recommendations: Recommendation[] }>(
      "/trips/" + trip.id + "/discover?stop=" + stop,
      { signal: abort.signal },
    )
      .then((r) => setData(r.recommendations))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => abort.abort();
  }, [stop, trip.id]);
  return (
    <>
      <div className="view-toolbar">
        <label className="field compact-field">
          Explorando
          <select value={selected.id} onChange={(e) => setStop(e.target.value)}>
            {trip.route.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city}
              </option>
            ))}
          </select>
        </label>
        <button
          className={`button secondary ${onlyFavorites ? "selected" : ""}`}
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites(!onlyFavorites)}
        >
          <Heart size={15} />
          Favoritos ({trip.favorites.length})
        </button>
      </div>
      <section className="discover-banner">
        <div>
          <span className="eyebrow">UM DESTINO, MUITAS POSSIBILIDADES</span>
          <h2>{selected.city}, no seu ritmo.</h2>
          <p>
            {data[0]?.curated
              ? "Uma seleção de lugares para começar a explorar. Confira horários e reservas nos guias."
              : "Encontre pontos de interesse, cultura e natureza para montar o seu próprio roteiro."}
          </p>
        </div>
        <SourceLink
          href={
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(selected.city + " " + selected.countryCode)
          }
        >
          Abrir mapa do destino
        </SourceLink>
      </section>
      <FieldError message={error} />
      <div className="discover-grid">
        {data
          .filter((r) => !onlyFavorites || trip.favorites.includes(r.id))
          .map((r, i) => (
            <article className="panel recommendation" key={r.id}>
              <div className="recommendation-top">
                <span>0{i + 1}</span>
                <button
                  className={`favorite-button ${trip.favorites.includes(r.id) ? "active" : ""}`}
                  aria-label={`${trip.favorites.includes(r.id) ? "Remover" : "Salvar"} ${r.name} nos favoritos`}
                  onClick={() =>
                    change((t) => ({
                      ...t,
                      favorites: t.favorites.includes(r.id)
                        ? t.favorites.filter((f) => f !== r.id)
                        : [...t.favorites, r.id],
                    }))
                  }
                >
                  <Heart size={17} />
                </button>
              </div>
              <span className="eyebrow">{r.category}</span>
              <h3>{r.name}</h3>
              <p>{r.description}</p>
              <div className="recommendation-links">
                <SourceLink href={r.mapUrl}>Ver no mapa</SourceLink>
                <SourceLink href={r.url}>Guia do destino</SourceLink>
              </div>
              <button
                className="button secondary full"
                onClick={() => {
                  change((t) => ({
                    ...t,
                    activities: [
                      ...t.activities,
                      {
                        id: crypto.randomUUID(),
                        name: r.name,
                        day,
                        city: selected.city,
                        done: false,
                        notes: "",
                      },
                    ],
                  }));
                  notice(`Passeio adicionado ao dia ${day}.`);
                }}
              >
                <Plus size={14} />
                Incluir no dia {day}
              </button>
            </article>
          ))}
      </div>
      {onlyFavorites && !data.some((r) => trip.favorites.includes(r.id)) && (
        <Empty
          icon={<Heart size={28} />}
          title="Guarde suas próximas descobertas."
          description="Toque no coração dos lugares que quer lembrar nesta cidade."
        />
      )}
      <div className="discover-day-picker">
        <label>
          Adicionar passeios ao{" "}
          <select
            aria-label="Dia para novos passeios"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          >
            {Array.from({ length: trip.days }, (_, i) => (
              <option value={i + 1} key={i}>
                Dia {i + 1}
                {trip.startDate
                  ? " · " + shortDate(addDays(trip.startDate, i))
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <span className="input-hint">Os passeios aparecem no calendário.</span>
      </div>
      <p className="footnote">
        Sugestões para planejar, sem disponibilidade ou reservas confirmadas.
        Cidades fora da curadoria recebem links de pesquisa para explorar opções
        reais.
      </p>
    </>
  );
}
export function BookingsView({ trip, change }: Props) {
  const [editing, setEditing] = useState<Booking | null | false>(false);
  const [remove, setRemove] = useState<string | null>(null);
  return (
    <>
      <div className="view-toolbar">
        <span className="subtle">
          {trip.bookings.length}{" "}
          {trip.bookings.length === 1
            ? "reserva registrada"
            : "reservas registradas"}{" "}
          · {brl(finances(trip).paid)} pagos
        </span>
        <button className="button primary" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Adicionar reserva
        </button>
      </div>
      {!trip.bookings.length ? (
        <section className="panel">
          <Empty
            icon={<Ticket size={30} />}
            title="Os planos vão ganhando forma."
            description="Registre voos, hospedagens e ingressos com valor, link e detalhes. Reservas pagas entram no progresso da meta."
          >
            <button className="button primary" onClick={() => setEditing(null)}>
              <Plus size={15} />
              Anotar minha primeira reserva
            </button>
          </Empty>
        </section>
      ) : (
        <div className="booking-list">
          {trip.bookings.map((b) => (
            <article className="panel booking" key={b.id}>
              <span className="booking-icon">
                {b.category === "hotel" ? (
                  <Hotel size={22} />
                ) : b.category === "flights" ? (
                  <Plane size={22} />
                ) : (
                  <Ticket size={22} />
                )}
              </span>
              <div>
                <span className="eyebrow">
                  {categories.find((c) => c.id === b.category)?.name}
                  {b.date ? " · " + shortDate(b.date) : ""}
                </span>
                <h3>{b.name}</h3>
                {b.notes && <p>{b.notes}</p>}
                {b.url && <SourceLink href={b.url}>Abrir reserva</SourceLink>}
              </div>
              <div className="booking-amount">
                <strong>{brl(b.amount)}</strong>
                <span className={b.paid ? "paid" : "unpaid"}>
                  {b.paid ? "Pago" : "A pagar"}
                </span>
              </div>
              <button
                className="icon-button"
                aria-label={`Editar ${b.name}`}
                onClick={() => setEditing(b)}
              >
                <Settings2 size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={`Excluir ${b.name}`}
                onClick={() => setRemove(b.id)}
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
      )}
      <div className="booking-search">
        <div>
          <span className="eyebrow">UM LUGAR PARA CHAMAR DE SEU</span>
          <h3>Encontre sua próxima estadia.</h3>
          <p>Pesquise hospedagens nas cidades do roteiro.</p>
        </div>
        <div>
          {trip.route.map((s) => (
            <SourceLink
              key={s.id}
              href={
                "https://www.booking.com/searchresults.pt-br.html?ss=" +
                encodeURIComponent(s.city + ", " + s.countryCode) +
                "&group_adults=" +
                trip.travelers +
                "&no_rooms=" +
                Math.ceil(trip.travelers / 2)
              }
            >
              Hotéis em {s.city}
            </SourceLink>
          ))}
        </div>
      </div>
      <p className="footnote">
        O Tabi não acessa sua conta do Booking nem realiza compras. As reservas
        são registradas manualmente.
      </p>
      {editing !== false && (
        <BookingForm
          booking={editing}
          onClose={() => setEditing(false)}
          onSave={(b) => {
            change((t) => ({
              ...t,
              bookings: editing
                ? t.bookings.map((x) => (x.id === b.id ? b : x))
                : [...t.bookings, b],
            }));
            setEditing(false);
          }}
        />
      )}
      {remove && (
        <Modal
          title="Remover essa reserva?"
          description="Ela será retirada do planejamento e do cálculo de valores pagos."
          onClose={() => setRemove(null)}
        >
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setRemove(null)}
            >
              Manter reserva
            </button>
            <button
              className="button danger"
              onClick={() => {
                change((t) => ({
                  ...t,
                  bookings: t.bookings.filter((b) => b.id !== remove),
                }));
                setRemove(null);
              }}
            >
              Remover reserva
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function BookingForm({
  booking,
  onClose,
  onSave,
}: {
  booking: Booking | null;
  onClose: () => void;
  onSave: (b: Booking) => void;
}) {
  const [form, setForm] = useState<Booking>(
    booking || {
      id: crypto.randomUUID(),
      name: "",
      category: "hotel",
      amount: 0,
      paid: false,
      date: null,
      url: "",
      notes: "",
    },
  );
  return (
    <Modal
      title={booking ? "Ajustar a reserva." : "Mais um detalhe resolvido."}
      description="Guarde o essencial para encontrar tudo depois."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...form, name: form.name.trim() });
        }}
      >
        <label className="field">
          Nome da reserva
          <input
            required
            maxLength={160}
            placeholder="Ex.: hotel perto da estação"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Categoria
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as CategoryId })
              }
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Valor total (R$)
            <input
              required
              type="number"
              min="0"
              max="100000000"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label className="field">
          Data <span className="optional">opcional</span>
          <input
            type="date"
            value={form.date || ""}
            onChange={(e) => setForm({ ...form, date: e.target.value || null })}
          />
        </label>
        <label className="field">
          Link da reserva <span className="optional">opcional</span>
          <input
            type="url"
            maxLength={2000}
            placeholder="https://…"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </label>
        <label className="field">
          Detalhes para lembrar
          <textarea
            rows={3}
            maxLength={2000}
            placeholder="Localizador, check-in, cancelamento…"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.paid}
            onChange={(e) => setForm({ ...form, paid: e.target.checked })}
          />
          Essa reserva já está totalmente paga.
        </label>
        <p className="input-hint">
          Ao pagar com o dinheiro guardado, atualize o saldo disponível para não
          contar a mesma quantia duas vezes.
        </p>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={!form.name.trim()}>
            <Check size={15} />
            Salvar reserva
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ChecklistView({ trip, change }: Props) {
  const [text, setText] = useState("");
  const done = trip.checklist.filter((t) => t.done).length;
  return (
    <>
      <section className="panel checklist-summary">
        <CheckCheck size={28} />
        <div>
          <span className="eyebrow">UM PASSO MAIS PERTO</span>
          <h2>
            {done} de {trip.checklist.length} detalhes resolvidos.
          </h2>
          <p>Pequenas tarefas para uma viagem mais tranquila.</p>
        </div>
        <strong>
          {Math.round((done / Math.max(1, trip.checklist.length)) * 100)}%
        </strong>
      </section>
      <section className="panel checklist-items">
        {trip.checklist.map((task) => (
          <div
            className={`checklist-item ${task.done ? "done" : ""}`}
            key={task.id}
          >
            <button
              aria-label={`${task.done ? "Desmarcar" : "Concluir"} ${task.title}`}
              onClick={() =>
                change((t) => ({
                  ...t,
                  checklist: t.checklist.map((x) =>
                    x.id === task.id ? { ...x, done: !x.done } : x,
                  ),
                }))
              }
            >
              <span className="task-check">
                {task.done && <Check size={14} />}
              </span>
              <span>{task.title}</span>
            </button>
            <button
              className="icon-button"
              aria-label={`Remover ${task.title}`}
              onClick={() =>
                change((t) => ({
                  ...t,
                  checklist: t.checklist.filter((x) => x.id !== task.id),
                }))
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </section>
      <form
        className="panel add-task"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          change((t) => ({
            ...t,
            checklist: [
              ...t.checklist,
              { id: crypto.randomUUID(), title: text.trim(), done: false },
            ],
          }));
          setText("");
        }}
      >
        <label className="field">
          O que mais não podemos esquecer?
          <input
            maxLength={160}
            placeholder="Ex.: reservar um jantar especial"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button
          className="button primary"
          disabled={!text.trim() || trip.checklist.length >= 100}
        >
          <Plus size={15} />
          Adicionar lembrete
        </button>
      </form>
    </>
  );
}
