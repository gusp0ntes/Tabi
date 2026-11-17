import type {
  CategoryId,
  Destination,
  RouteStop,
  Trip,
  TripData,
  TripInput,
  TravelStyle,
} from "./schema.js";
export const categories: { id: CategoryId; name: string; color: string }[] = [
  { id: "flights", name: "Passagens", color: "#cf9676" },
  { id: "hotel", name: "Hospedagem", color: "#a9ba92" },
  { id: "food", name: "Alimentação", color: "#cbb379" },
  { id: "transport", name: "Transporte", color: "#8dacc0" },
  { id: "experiences", name: "Experiências", color: "#b7a0c3" },
  { id: "essentials", name: "Seguro e conexão", color: "#9eb3ab" },
  { id: "reserve", name: "Reserva de emergência", color: "#a5a78b" },
];
export const styles: {
  id: TravelStyle;
  name: string;
  description: string;
  multiplier: number;
}[] = [
  {
    id: "economy",
    name: "Econômico",
    description: "O essencial, com cuidado.",
    multiplier: 0.75,
  },
  {
    id: "balanced",
    name: "Equilibrado",
    description: "Liberdade para aproveitar.",
    multiplier: 1,
  },
  {
    id: "comfort",
    name: "Confortável",
    description: "Mais espaço para ir além.",
    multiplier: 1.5,
  },
];
export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
export const dateOf = (s: string) => new Date(s + "T12:00:00Z");
export const dateKey = (d: Date) => d.toISOString().slice(0, 10);
export function addDays(s: string, n: number) {
  const d = dateOf(s);
  d.setUTCDate(d.getUTCDate() + n);
  return dateKey(d);
}
export const shortDate = (s: string) =>
  dateOf(s)
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    })
    .replace(" de ", " ")
    .replace(".", "");
export function flag(code: string) {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}
export function estimate(
  trip: Pick<Trip, "destination" | "travelers" | "days" | "style" | "costs">,
  style = trip.style,
  custom = true,
) {
  const country = trip.destination.countryCode;
  const region = trip.destination.region;
  // Starting values for manual simulation in BRL, not current fares or exchange rates.
  const daily =
    country === "BR"
      ? 150
      : country === "US"
        ? 440
        : country === "JP"
          ? 290
          : region === "europe"
            ? 350
            : region === "asia"
              ? 220
              : region === "oceania"
                ? 370
                : 230;
  const flight =
    country === "BR"
      ? 1100
      : region === "asia"
        ? 6000
        : region === "europe"
          ? 4200
          : country === "US"
            ? 4000
            : region === "oceania"
              ? 6500
              : 4500;
  const m = styles.find((s) => s.id === style)!.multiplier;
  const p = trip.travelers;
  const days = trip.days;
  const nights = Math.max(0, days - 1);
  const rooms = Math.ceil(p / 2);
  const raw: Record<CategoryId, number> = {
    flights: flight * p,
    hotel: daily * 1.5 * nights * rooms * m,
    food: daily * 0.55 * days * p * m,
    transport: daily * 0.22 * days * p * m,
    experiences: daily * 0.25 * days * p * m,
    essentials: 140 * p + 25 * days * p,
    reserve: 0,
  };
  raw.reserve = Math.round(Object.values(raw).reduce((n, c) => n + c, 0) * 0.1);
  return categories.map((c) => ({
    ...c,
    amount:
      custom && trip.costs[c.id] !== undefined
        ? trip.costs[c.id]!
        : Math.round(raw[c.id]),
  }));
}
export function finances(trip: Trip) {
  const total = estimate(trip).reduce((n, c) => n + c.amount, 0);
  const paid = trip.bookings
    .filter((b) => b.paid)
    .reduce((n, b) => n + b.amount, 0);
  const funded = trip.cash + paid;
  return {
    total,
    paid,
    funded,
    remaining: Math.max(0, total - funded),
    percent: total ? Math.min(100, Math.round((funded / total) * 100)) : 100,
  };
}
export function itinerary(trip: Pick<Trip, "route" | "startDate">) {
  let day = 1;
  return trip.route.map((stop) => {
    const result = {
      ...stop,
      firstDay: day,
      lastDay: day + stop.days - 1,
      start: trip.startDate ? addDays(trip.startDate, day - 1) : null,
      end: trip.startDate ? addDays(trip.startDate, day + stop.days - 2) : null,
    };
    day += stop.days;
    return result;
  });
}
export function withRoute(trip: Trip, route: RouteStop[]): Trip {
  const days = route.reduce((n, s) => n + s.days, 0);
  return {
    ...trip,
    route,
    days,
    activities: trip.activities.map((a) => ({
      ...a,
      day: Math.min(days, a.day),
    })),
    homeArrivalDate:
      trip.startDate &&
      trip.homeArrivalDate &&
      trip.homeArrivalDate < addDays(trip.startDate, days - 1)
        ? null
        : trip.homeArrivalDate,
  };
}
export function resizeRoute(trip: Trip, days: number) {
  const route = trip.route.map((s) => ({ ...s }));
  let delta = days - trip.days;
  for (let i = route.length - 1; i >= 0 && delta !== 0; i--) {
    const change =
      delta > 0
        ? Math.min(delta, 90 - route[i].days)
        : Math.max(delta, 1 - route[i].days);
    route[i].days += change;
    delta -= change;
  }
  return withRoute(trip, route);
}
export function tripData(trip: TripData): TripData {
  const {
    title,
    travelers,
    days,
    startDate,
    style,
    cash,
    costs,
    route,
    activities,
    bookings,
    checklist,
    favorites,
    notes,
    outboundDate,
    homeArrivalDate,
  } = trip;
  return {
    title,
    travelers,
    days,
    startDate,
    style,
    cash,
    costs,
    route,
    activities,
    bookings,
    checklist,
    favorites,
    notes,
    outboundDate,
    homeArrivalDate,
  };
}
export function seedTrip(input: TripInput, destination: Destination): TripData {
  let route: RouteStop[] = [
    {
      id: "first-stop",
      city: input.city || destination.country,
      countryCode: input.countryCode,
      days: input.days,
    },
  ];
  if (input.countryCode === "JP" && !input.city && input.days >= 10) {
    const tokyo = Math.round(input.days * 0.45),
      kyoto = Math.round(input.days * 0.2);
    route = [
      { id: "tokyo", city: "Tóquio", countryCode: "JP", days: tokyo },
      { id: "kyoto", city: "Kyoto", countryCode: "JP", days: kyoto },
      {
        id: "osaka",
        city: "Osaka",
        countryCode: "JP",
        days: input.days - tokyo - kyoto,
      },
    ];
  }
  return {
    title: `Viagem · ${destination.label}`,
    travelers: input.travelers,
    days: input.days,
    startDate: input.startDate,
    style: input.style,
    cash: 0,
    costs: {},
    route,
    activities: [],
    bookings: [],
    favorites: [],
    notes: {},
    outboundDate: null,
    homeArrivalDate: null,
    checklist: [
      {
        id: "documents",
        title: "Conferir documentos e regras de entrada",
        done: false,
      },
      { id: "flights", title: "Pesquisar passagens e bagagens", done: false },
      {
        id: "stay",
        title: "Escolher hospedagens bem localizadas",
        done: false,
      },
      {
        id: "insurance",
        title: "Planejar seguro e conexão de internet",
        done: false,
      },
      { id: "tickets", title: "Conferir reservas dos passeios", done: false },
      {
        id: "offline",
        title: "Salvar os documentos e reservas offline",
        done: false,
      },
    ],
  };
}
