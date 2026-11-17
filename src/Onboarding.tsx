import { useEffect, useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Compass,
  Globe2,
  MapPin,
  Minus,
  Plus,
  Users,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { Country, Trip, TripInput } from "../shared/schema";
import { featured } from "../shared/destinations";
import { createTripSchema } from "../shared/schema";
import { styles } from "../shared/planner";
import { api } from "./api";
import { useAuth } from "./context";
import { Brand, FieldError, FullLoading, ThemeButton } from "./components";
let countryCache: Country[] | null = null;
export function useCountries() {
  const [data, setData] = useState<Country[]>(countryCache || []);
  const [error, setError] = useState("");
  useEffect(() => {
    if (countryCache) return;
    let active = true;
    api<{ countries: Country[] }>("/destinations/countries")
      .then((r) => {
        countryCache = r.countries;
        if (active) setData(r.countries);
      })
      .catch(() => {
        if (active)
          setError(
            "Não foi possível carregar os países. Recarregue para tentar novamente.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return { countries: data, error };
}
export function CityInput({
  countryCode,
  value,
  onChange,
  id,
}: {
  countryCode: string;
  value: string;
  onChange: (s: string) => void;
  id?: string;
}) {
  const generated = useId();
  const listId = generated + "-cities";
  const [results, setResults] = useState<
    { id: number; name: string; region: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (value.trim().length < 2 || !countryCode) {
      setResults([]);
      return;
    }
    const abort = new AbortController();
    const timer = setTimeout(() => {
      api<{ results: typeof results }>(
        "/destinations/search?country=" +
          countryCode +
          "&q=" +
          encodeURIComponent(value),
        { signal: abort.signal },
      )
        .then((r) => {
          setResults(r.results);
          setActive(0);
        })
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [value, countryCode]);
  return (
    <div className="city-search">
      <input
        id={id}
        role="combobox"
        aria-label="Cidade"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && results.length > 0}
        aria-activedescendant={
          open && results.length ? listId + "-" + active : undefined
        }
        autoComplete="off"
        placeholder="Ex.: Kyoto, Paris, Nova York…"
        maxLength={100}
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open || !results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((active + 1) % results.length);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((active - 1 + results.length) % results.length);
          }
          if (e.key === "Enter") {
            e.preventDefault();
            onChange(results[active].name);
            setOpen(false);
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && results.length > 0 && (
        <div className="city-results" id={listId} role="listbox">
          {results.map((r, i) => (
            <button
              type="button"
              id={listId + "-" + i}
              key={r.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(r.name);
                setOpen(false);
              }}
            >
              <MapPin size={14} />
              <span>
                {r.name}
                <small>{r.region}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function loadDraft(): TripInput {
  try {
    const p = createTripSchema.safeParse(
      JSON.parse(sessionStorage.getItem("tabi.onboarding") || "null"),
    );
    if (p.success) return p.data;
  } catch {
    /* Start a fresh draft when saved input is invalid. */
  }
  return {
    countryCode: "",
    city: "",
    travelers: 2,
    days: 7,
    startDate: null,
    style: "balanced",
  };
}
export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { countries, error: countryError } = useCountries();
  const [draft, setDraft] = useState<TripInput>(() => {
    const p = loadDraft();
    return params.get("pais")
      ? {
          ...p,
          countryCode: params.get("pais")!,
          city: params.get("cidade") || "",
        }
      : p;
  });
  const [step, setStep] = useState(params.has("revisar") ? 1 : 0);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const chosen = countries.find((c) => c.code === draft.countryCode);
  const visual = featured.find((f) => f.code === draft.countryCode);
  useEffect(() => {
    try {
      sessionStorage.setItem("tabi.onboarding", JSON.stringify(draft));
    } catch {
      /* The draft is still held in memory. */
    }
  }, [draft]);
  async function finish() {
    const parsed = createTripSchema.safeParse(draft);
    if (!parsed.success) {
      setError("Confira o destino e os detalhes antes de continuar.");
      return;
    }
    if (!user) {
      navigate(
        "/cadastro?next=" + encodeURIComponent("/nova-viagem?revisar=1"),
      );
      return;
    }
    setCreating(true);
    setError("");
    try {
      const [r] = await Promise.all([
        api<{ trip: Trip }>("/trips", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        }),
        new Promise((resolve) => setTimeout(resolve, 750)),
      ]);
      sessionStorage.removeItem("tabi.onboarding");
      navigate("/app/" + r.trip.id, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  }
  if (creating)
    return (
      <FullLoading
        title="Sua próxima viagem está tomando forma"
        description="Salvando seu planejamento e preparando as cores do destino."
      />
    );
  return (
    <div
      className="onboard-page"
      style={{ "--accent": visual?.accent || "#d99470" } as CSSProperties}
    >
      <header>
        <Brand />
        <div>
          {user && (
            <span className="muted onboard-welcome">
              Vamos nessa, {user.name.split(" ")[0]}.
            </span>
          )}
          <ThemeButton />
        </div>
      </header>
      <main className="onboard-layout">
        <aside className="onboard-intro">
          <Link to={user ? "/app" : "/"} className="text-link">
            <ArrowLeft size={15} />
            {user ? "Minhas viagens" : "Voltar"}
          </Link>
          <span className="eyebrow">UM NOVO CAPÍTULO</span>
          <h1>
            Vamos dar <br />
            um destino <br />
            aos seus <em>planos.</em>
          </h1>
          <p>
            Comece com o básico. <br />
            Você pode ajustar os detalhes depois.
          </p>
          <div className="onboard-steps">
            <span className={step === 0 ? "current" : "complete"}>
              <i>{step > 0 ? <Check size={13} /> : "1"}</i>Para onde vamos?
            </span>
            <span className={step === 1 ? "current" : ""}>
              <i>2</i>Do seu jeito
            </span>
          </div>
          <div className="onboard-preview">
            <img
              src={visual?.image || "/images/journey.jpg"}
              alt={
                visual
                  ? `Fotografia de ${visual.country}`
                  : "Vista da janela de um avião"
              }
            />
            <div>
              <MapPin size={14} />
              <span>
                {draft.city || chosen?.name || "O seu próximo destino"}
              </span>
            </div>
            <small>
              {visual
                ? `${visual.country} · inspiração para a sua viagem`
                : "O mundo é um bom ponto de partida."}
            </small>
          </div>
        </aside>
        <section className="panel onboard-form">
          <span className="eyebrow">PASSO {step + 1} DE 2</span>
          {step === 0 ? (
            <>
              <span className="onboard-big-icon">
                <Globe2 size={27} strokeWidth={1.3} />
              </span>
              <h2>
                Para onde o mundo
                <br />
                está chamando você?
              </h2>
              <p className="muted">
                Escolha um país. A cidade pode ficar para depois.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chosen) {
                    setError("Escolha um país para começar.");
                    return;
                  }
                  setError("");
                  setStep(1);
                }}
              >
                <label className="field">
                  País
                  <select
                    aria-label="País"
                    required
                    value={draft.countryCode}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        countryCode: e.target.value,
                        city: "",
                      })
                    }
                  >
                    <option value="">Selecione o seu destino</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Cidade <span className="optional">opcional</span>
                  <CityInput
                    countryCode={draft.countryCode}
                    value={draft.city}
                    onChange={(city) => setDraft({ ...draft, city })}
                  />
                </label>
                <span className="input-hint">
                  Pode deixar em branco e montar o roteiro de cidades depois.
                </span>
                <FieldError message={error || countryError} />
                <button
                  className="button primary full"
                  disabled={!draft.countryCode}
                >
                  Continuar
                  <ArrowRight size={16} />
                </button>
              </form>
              <div className="onboard-suggestions">
                <span className="eyebrow">OU COMECE POR UMA IDEIA</span>
                <div>
                  {featured.slice(0, 4).map((f) => (
                    <button
                      key={f.code}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          countryCode: f.code,
                          city: f.code === "JP" ? "" : f.city,
                        })
                      }
                    >
                      {f.label}
                      <ArrowUpRightIcon />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="onboard-big-icon">
                <Compass size={27} strokeWidth={1.3} />
              </span>
              <h2>
                Cada viagem tem
                <br />o seu próprio ritmo.
              </h2>
              <p className="muted">
                Só mais alguns detalhes para preparar seu espaço.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void finish();
                }}
              >
                <div className="onboard-counters">
                  {[
                    {
                      label: "Pessoas",
                      icon: Users,
                      key: "travelers" as const,
                      max: 20,
                    },
                    {
                      label: "Dias no destino",
                      icon: CalendarDays,
                      key: "days" as const,
                      max: 90,
                    },
                  ].map(({ label, icon: Icon, key, max }) => (
                    <div key={key}>
                      <label>
                        <Icon size={16} />
                        {label}
                      </label>
                      <div className="counter">
                        <button
                          type="button"
                          aria-label={`Diminuir ${label.toLowerCase()}`}
                          disabled={draft[key] <= 1}
                          onClick={() =>
                            setDraft({ ...draft, [key]: draft[key] - 1 })
                          }
                        >
                          <Minus size={15} />
                        </button>
                        <strong>{draft[key]}</strong>
                        <button
                          type="button"
                          aria-label={`Aumentar ${label.toLowerCase()}`}
                          disabled={draft[key] >= max}
                          onClick={() =>
                            setDraft({ ...draft, [key]: draft[key] + 1 })
                          }
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <label className="field">
                  Chegada ao destino <span className="optional">opcional</span>
                  <input
                    type="date"
                    value={draft.startDate || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, startDate: e.target.value || null })
                    }
                  />
                </label>
                <label className="field">Qual combina com você?</label>
                <div className="style-options">
                  {styles.map((s) => (
                    <label
                      key={s.id}
                      className={draft.style === s.id ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="style"
                        value={s.id}
                        checked={draft.style === s.id}
                        onChange={() => setDraft({ ...draft, style: s.id })}
                      />
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.description}</small>
                      </span>
                      {draft.style === s.id && <Check size={15} />}
                    </label>
                  ))}
                </div>
                <FieldError message={error} />
                <div className="onboard-form-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setStep(0)}
                  >
                    <ArrowLeft size={15} />
                    Voltar
                  </button>
                  <button className="button primary">
                    {user ? "Criar minha viagem" : "Continuar com minha conta"}
                    <ArrowRight size={16} />
                  </button>
                </div>
                {!user && (
                  <span className="onboard-account-note">
                    No próximo passo, entre ou crie sua conta para salvar tudo.
                  </span>
                )}
              </form>
            </>
          )}
        </section>
      </main>
      <footer>Um passo de cada vez. Um mundo de possibilidades.</footer>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <span aria-hidden="true">↗</span>;
}
