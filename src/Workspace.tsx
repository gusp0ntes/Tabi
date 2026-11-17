import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Compass,
  Download,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Route,
  Settings2,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import {
  Brand,
  FieldError,
  FullLoading,
  Modal,
  SectionHeading,
  ThemeButton,
} from "./components";
import { useAuth, useNotice } from "./context";
import { useTrip } from "./useTrip";
import {
  finances,
  brl,
  itinerary,
  shortDate,
  styles,
  tripData,
  resizeRoute,
  addDays,
} from "../shared/planner";
import { editableTripSchema } from "../shared/schema";
import type { Trip } from "../shared/schema";
import {
  BudgetView,
  BookingsView,
  CalendarView,
  ChecklistView,
  DiscoverView,
  RouteView,
} from "./TripViews";
type Tab =
  | "overview"
  | "route"
  | "budget"
  | "calendar"
  | "discover"
  | "bookings"
  | "checklist";
const navigation = [
  { id: "overview" as Tab, label: "Minha viagem", icon: LayoutDashboard },
  { id: "route" as Tab, label: "Roteiro", icon: Route },
  { id: "budget" as Tab, label: "Orçamento", icon: Wallet },
  { id: "calendar" as Tab, label: "Calendário", icon: CalendarDays },
  { id: "discover" as Tab, label: "Explorar o destino", icon: Compass },
  { id: "bookings" as Tab, label: "Reservas", icon: Ticket },
  { id: "checklist" as Tab, label: "Checklist", icon: CheckCheck },
];
const descriptions: Record<Tab, string> = {
  overview: "Seu destino, seus dias, seu jeito.",
  route: "Organize a ordem das cidades e os dias de cada parada.",
  budget: "Uma visão clara do que já temos e do que falta.",
  calendar: "Cada dia da viagem, com tempo para descobrir.",
  discover: "Encontre ideias para transformar em memórias.",
  bookings: "Voos, hotéis e ingressos, guardados no mesmo lugar.",
  checklist: "Um passo de cada vez. Uma viagem mais tranquila.",
};
export default function Workspace() {
  const { id } = useParams();
  return <TripWorkspace key={id} id={id!} />;
}
function TripWorkspace({ id }: { id: string }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const notice = useNotice();
  const { trip, error, saveError, status, change, flush } = useTrip(id);
  const [tab, setTab] = useState<Tab>("overview");
  const [more, setMore] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [account, setAccount] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);
  if (!trip)
    return error ? (
      <div className="service-error">
        <h1>Não conseguimos abrir essa viagem.</h1>
        <p>{error}</p>
        <button className="button secondary" onClick={() => navigate("/app")}>
          Minhas viagens
        </button>
      </div>
    ) : (
      <FullLoading title="Abrindo sua viagem" />
    );
  const funds = finances(trip);
  const route = itinerary(trip);
  const done = trip.checklist.filter((t) => t.done).length;
  function exportTrip() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(trip, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "tabi-viagem-" + trip!.id + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice("Uma cópia do seu planejamento foi exportada.");
  }
  async function leave() {
    if (await flush()) navigate("/app");
    else
      notice(
        "Há alterações que ainda não foram salvas. Tente salvar novamente ou exporte uma cópia.",
        true,
      );
  }
  function navItems(items: typeof navigation) {
    return items.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        className={tab === id ? "active" : ""}
        onClick={() => {
          setTab(id);
          setMobile(false);
        }}
        aria-current={tab === id ? "page" : undefined}
      >
        <Icon size={18} strokeWidth={1.6} />
        {label}
        {id === "checklist" && (
          <small>
            {done}/{trip!.checklist.length}
          </small>
        )}
      </button>
    ));
  }
  return (
    <div
      className={`app-shell region-${trip.destination.region}`}
      style={{ "--accent": trip.destination.accent } as CSSProperties}
    >
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Brand />
        <button className="back-to-trips" onClick={() => void leave()}>
          <ArrowLeft size={13} />
          Minhas viagens
        </button>
        <div className="sidebar-label">O SEU PLANEJAMENTO</div>
        <nav aria-label="Navegação da viagem">
          {navItems(navigation.slice(0, 4))}
          <button
            className="more-toggle"
            aria-expanded={more}
            onClick={() => setMore(!more)}
          >
            <MoreHorizontal size={18} />
            Mais da viagem
            <ChevronRight size={13} />
          </button>
          {more && (
            <div className="more-items">{navItems(navigation.slice(4))}</div>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-destination">
            <span>{trip.destination.flag}</span>
            <strong>{trip.destination.label}</strong>
            <small>
              {trip.days} dias · {trip.travelers}{" "}
              {trip.travelers === 1 ? "pessoa" : "pessoas"}
            </small>
            <div className="progress">
              <span style={{ width: `${funds.percent}%` }} />
            </div>
            <small>{funds.percent}% da meta garantida</small>
          </div>
          <button className="sidebar-account" onClick={() => setAccount(true)}>
            <span>{user?.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user?.name.split(" ")[0]}</strong>
              <small>Seu cantinho de viagem</small>
            </div>
            <Settings2 size={15} />
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="workspace-topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir navegação"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              {trip.destination.label}
              <ChevronRight size={12} />
              <strong>{navigation.find((n) => n.id === tab)?.label}</strong>
            </span>
          </div>
          <div>
            <span className={`save-status ${status}`} role="status">
              {status === "saved" ? (
                <Check size={13} />
              ) : status === "saving" || status === "pending" ? (
                <LoaderCircle size={13} className="spin" />
              ) : (
                <AlertCircle size={13} />
              )}
              <span>
                {status === "saved"
                  ? "Salvo na sua conta"
                  : status === "saving" || status === "pending"
                    ? "Salvando…"
                    : "Não foi salvo"}
              </span>
            </span>
            <ThemeButton />
            <button className="edit-trip" onClick={() => setEditing(true)}>
              <Settings2 size={15} />
              <span>Editar viagem</span>
            </button>
          </div>
        </header>
        <div className="workspace-content">
          {saveError && (
            <div className="save-error" role="alert">
              <AlertCircle size={17} />
              <span>{saveError}</span>
              {status !== "conflict" && (
                <button onClick={() => void flush()}>Tentar salvar</button>
              )}
              <button onClick={exportTrip}>Exportar cópia</button>
              {status === "conflict" && (
                <button onClick={() => window.location.reload()}>
                  Recarregar
                </button>
              )}
            </div>
          )}
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">O SEU PRÓXIMO CAPÍTULO</span>
              <h1>
                {tab === "overview"
                  ? trip.title
                  : navigation.find((n) => n.id === tab)?.label}
              </h1>
              <p>{descriptions[tab]}</p>
            </div>
            <span className="destination-pill">
              {trip.destination.flag}
              <span>{trip.destination.country}</span>
            </span>
          </div>
          {tab === "overview" && (
            <>
              <section className="trip-hero">
                <img
                  src={trip.destination.cover}
                  alt={trip.destination.coverCaption}
                />
                <div className="trip-hero-shade" />
                <div>
                  <span>{trip.destination.country.toUpperCase()}</span>
                  <h2>
                    {trip.destination.label}
                    <i>.</i>
                  </h2>
                  <p>
                    O destino está escolhido.
                    <br />O resto é história para viver.
                  </p>
                  <span className="trip-hero-meta">
                    <CalendarDays size={14} />
                    {trip.startDate
                      ? shortDate(trip.startDate) +
                        " — " +
                        shortDate(addDays(trip.startDate, trip.days - 1))
                      : "As datas podem ficar para depois"}
                    <span>·</span>
                    {trip.days} dias
                  </span>
                </div>
                <small>
                  <MapPin size={11} />
                  {trip.destination.coverCaption}
                </small>
              </section>
              <div className="overview-main">
                <section className="panel overview-funds">
                  <SectionHeading
                    title="Quanto falta para ir?"
                    kicker="DO SONHO AO PLANO"
                  >
                    <Wallet size={20} />
                  </SectionHeading>
                  <div className="overview-money">
                    <div>
                      <span>
                        Meta para {trip.travelers}{" "}
                        {trip.travelers === 1 ? "pessoa" : "pessoas"}
                      </span>
                      <strong>{brl(funds.total)}</strong>
                    </div>
                    <div>
                      <span>Falta guardar</span>
                      <strong>{brl(funds.remaining)}</strong>
                    </div>
                  </div>
                  <div className="progress-label">
                    <span>{brl(funds.funded)} já garantidos</span>
                    <strong>{funds.percent}%</strong>
                  </div>
                  <div
                    className="progress"
                    role="progressbar"
                    aria-label="Progresso da meta"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={funds.percent}
                  >
                    <span style={{ width: `${funds.percent}%` }} />
                  </div>
                  <label className="field inline-cash">
                    Dinheiro guardado agora (R$)
                    <input
                      type="number"
                      min="0"
                      max="100000000"
                      step="0.01"
                      value={trip.cash}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (n >= 0 && n <= 1e8)
                          change((p) => ({ ...p, cash: n }));
                      }}
                    />
                  </label>
                  <p className="input-hint">
                    Informe o saldo disponível. Reservas já pagas são somadas
                    separadamente.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => setTab("budget")}
                  >
                    Ver divisão do orçamento
                    <ArrowUpRight size={14} />
                  </button>
                </section>
                <section className="panel overview-route">
                  <SectionHeading title="Por onde você vai passar">
                    <button
                      className="text-link"
                      onClick={() => setTab("route")}
                    >
                      Editar
                      <ArrowUpRight size={14} />
                    </button>
                  </SectionHeading>
                  <div className="mini-route">
                    {route.slice(0, 5).map((s, i) => (
                      <div key={s.id}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <strong>{s.city}</strong>
                          <small>
                            {s.start
                              ? shortDate(s.start) + " — " + shortDate(s.end!)
                              : `Dias ${s.firstDay} a ${s.lastDay}`}
                          </small>
                        </div>
                        <small>
                          {s.days} {s.days === 1 ? "dia" : "dias"}
                        </small>
                      </div>
                    ))}
                  </div>
                  {route.length > 5 && (
                    <span className="input-hint">
                      + {route.length - 5} paradas no roteiro
                    </span>
                  )}
                  <div className="route-total">
                    <span>
                      <Users size={14} />
                      {trip.travelers}{" "}
                      {trip.travelers === 1 ? "pessoa" : "pessoas"}
                    </span>
                    <span>
                      <CalendarDays size={14} />
                      {trip.days} dias
                    </span>
                    <span>{styles.find((s) => s.id === trip.style)?.name}</span>
                  </div>
                </section>
              </div>
              <div className="next-step-strip">
                <span className="next-step-icon">
                  <Bookmark size={22} />
                </span>
                <div>
                  <h3>Os detalhes podem vir aos poucos.</h3>
                  <p>
                    {done} de {trip.checklist.length} tarefas concluídas.
                    Documentos, hospedagem e passeios estão no seu checklist.
                  </p>
                </div>
                <button
                  className="text-link"
                  onClick={() => {
                    setMore(true);
                    setTab("checklist");
                  }}
                >
                  Abrir checklist
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}
          {tab === "route" && <RouteView trip={trip} change={change} />}{" "}
          {tab === "budget" && <BudgetView trip={trip} change={change} />}{" "}
          {tab === "calendar" && (
            <CalendarView
              trip={trip}
              change={change}
              onEdit={() => setEditing(true)}
            />
          )}{" "}
          {tab === "discover" && <DiscoverView trip={trip} change={change} />}{" "}
          {tab === "bookings" && <BookingsView trip={trip} change={change} />}{" "}
          {tab === "checklist" && <ChecklistView trip={trip} change={change} />}
          <footer className="workspace-footer">
            <span>Feito para as suas próximas histórias.</span>
            <span>Planejar. Partir. Descobrir.</span>
          </footer>
        </div>
      </main>
      {editing && (
        <EditTrip
          trip={trip}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            change(next);
            setEditing(false);
            notice("Planejamento atualizado.");
          }}
        />
      )}
      {account && (
        <Modal title="Seu espaço no Tabi." onClose={() => setAccount(false)}>
          <p className="muted">
            {user?.name}
            <br />
            {user?.email}
          </p>
          <p className="input-hint account-note">
            As viagens ficam salvas na sua conta. Você pode guardar uma cópia
            deste planejamento no seu dispositivo.
          </p>
          <div className="account-actions">
            <button className="button secondary" onClick={exportTrip}>
              <Download size={16} />
              Exportar esta viagem
            </button>
            <button className="button secondary" onClick={() => void leave()}>
              <ArrowLeft size={16} />
              Minhas viagens
            </button>
            <button
              className="text-link"
              onClick={async () => {
                if (!(await flush())) {
                  notice("Salve as alterações antes de sair.", true);
                  return;
                }
                try {
                  await logout();
                  navigate("/");
                } catch (e) {
                  notice((e as Error).message, true);
                }
              }}
            >
              <LogOut size={15} />
              Sair da conta
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function EditTrip({
  trip,
  onClose,
  onSave,
}: {
  trip: Trip;
  onClose: () => void;
  onSave: (t: Trip) => void;
}) {
  const [form, setForm] = useState({
    title: trip.title,
    travelers: trip.travelers,
    days: trip.days,
    startDate: trip.startDate,
    outboundDate: trip.outboundDate,
    homeArrivalDate: trip.homeArrivalDate,
  });
  const [error, setError] = useState("");
  return (
    <Modal
      title="A viagem, do seu jeito."
      description="Ajuste o essencial. As cidades, o calendário e as estimativas acompanham."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const next = { ...resizeRoute(trip, form.days), ...form };
          const check = editableTripSchema.safeParse(tripData(next));
          if (!check.success) {
            setError(check.error.issues[0].message);
            return;
          }
          onSave(next);
        }}
      >
        <label className="field">
          Nome da viagem
          <input
            required
            maxLength={120}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Pessoas
            <input
              required
              type="number"
              min="1"
              max="20"
              value={form.travelers}
              onChange={(e) =>
                setForm({ ...form, travelers: Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            Dias no destino
            <input
              required
              type="number"
              min={trip.route.length}
              max="90"
              value={form.days}
              onChange={(e) =>
                setForm({ ...form, days: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label className="field">
          Chegada ao destino <span className="optional">opcional</span>
          <input
            type="date"
            value={form.startDate || ""}
            onChange={(e) =>
              setForm({
                ...form,
                startDate: e.target.value || null,
                ...(!e.target.value
                  ? { outboundDate: null, homeArrivalDate: null }
                  : {}),
              })
            }
          />
        </label>
        <details
          className="flight-settings"
          open={!!form.outboundDate || !!form.homeArrivalDate || !!error}
        >
          <summary>
            Marcar dias em voo <span className="optional">opcional</span>
          </summary>
          <p className="input-hint">
            Use as datas locais de saída e chegada. O calendário destaca o
            deslocamento de ida e volta.
          </p>
          <div className="form-grid">
            <label className="field">
              Embarque de ida
              <input
                disabled={!form.startDate}
                type="date"
                max={form.startDate || undefined}
                value={form.outboundDate || ""}
                onChange={(e) =>
                  setForm({ ...form, outboundDate: e.target.value || null })
                }
              />
            </label>
            <label className="field">
              Chegada de volta
              <input
                disabled={!form.startDate}
                type="date"
                min={
                  form.startDate
                    ? addDays(form.startDate, form.days - 1)
                    : undefined
                }
                value={form.homeArrivalDate || ""}
                onChange={(e) =>
                  setForm({ ...form, homeArrivalDate: e.target.value || null })
                }
              />
            </label>
          </div>
        </details>
        <FieldError message={error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary">
            <Check size={15} />
            Salvar alterações
          </button>
        </div>
      </form>
    </Modal>
  );
}
