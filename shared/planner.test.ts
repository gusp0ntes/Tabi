import { describe, it, expect } from "vitest";
import {
  addDays,
  dateOf,
  estimate,
  finances,
  itinerary,
  resizeRoute,
  seedTrip,
  withRoute,
} from "./planner.js";
import { editableTripSchema } from "./schema.js";
import type { Destination, Trip } from "./schema.js";
const destination: Destination = {
  countryCode: "JP",
  country: "Japão",
  city: "",
  label: "Japão",
  flag: "JP",
  region: "asia",
  accent: "#d99470",
  cover: "/images/japan.jpg",
  coverCaption: "Japão",
  guideUrl: "https://www.japan.travel/en/",
  latitude: 36,
  longitude: 138,
};
const trip: Trip = {
  ...seedTrip(
    {
      countryCode: "JP",
      city: "",
      travelers: 2,
      days: 15,
      startDate: "2028-10-08",
      style: "balanced",
    },
    destination,
  ),
  id: "1",
  destination,
  revision: 0,
  createdAt: "",
  updatedAt: "",
};
describe("planejamento geral", () => {
  it("valida o roteiro inicial e distribui os dias sem lacunas", () => {
    expect(
      editableTripSchema.safeParse({
        ...seedTrip(
          {
            countryCode: "JP",
            city: "",
            travelers: 2,
            days: 15,
            startDate: "2028-10-08",
            style: "balanced",
          },
          destination,
        ),
      }).success,
    ).toBe(true);
    const route = itinerary(trip);
    expect(route[0].firstDay).toBe(1);
    expect(route.at(-1)?.lastDay).toBe(15);
    expect(route[1].firstDay).toBe(route[0].lastDay + 1);
  });
  it("recalcula noites e pessoas sem duplicar o custo de quarto", () => {
    const a = estimate(trip);
    const b = estimate({ ...trip, travelers: 1 });
    expect(a[0].amount).toBe(b[0].amount * 2);
    expect(a[1].amount).toBe(b[1].amount);
    expect(estimate({ ...trip, days: 1 })[1].amount).toBe(0);
  });
  it("preserva valores personalizados e permite comparar cenários", () => {
    const t = { ...trip, costs: { flights: 5000 } };
    expect(estimate(t)[0].amount).toBe(5000);
    expect(estimate(t, "comfort", false)[0].amount).not.toBe(5000);
  });
  it("soma reservas pagas e saldo disponível, sem incluir contas futuras", () => {
    const t = {
      ...trip,
      cash: 1000,
      bookings: [
        {
          id: "b",
          name: "Hotel",
          category: "hotel" as const,
          amount: 2000,
          paid: true,
          date: null,
          url: "",
          notes: "",
        },
        {
          id: "c",
          name: "Voo",
          category: "flights" as const,
          amount: 5000,
          paid: false,
          date: null,
          url: "",
          notes: "",
        },
      ],
    };
    expect(finances(t).funded).toBe(3000);
    expect(finances({ ...t, cash: 1e7 }).remaining).toBe(0);
    expect(finances({ ...t, cash: 1e7 }).percent).toBe(100);
  });
  it("ajusta dias sem perder atividades e mantém uma etapa por cidade", () => {
    const t = resizeRoute(trip, 3);
    expect(t.route.map((s) => s.days)).toEqual([1, 1, 1]);
    expect(
      withRoute(t, [{ id: "new", city: "Paris", countryCode: "FR", days: 7 }])
        .days,
    ).toBe(7);
  });
  it("conta dias em UTC atravessando meses e anos", () => {
    expect(addDays("2028-02-28", 2)).toBe("2028-03-01");
    expect(addDays("2028-12-31", 1)).toBe("2029-01-01");
    expect(dateOf("2028-10-08").getUTCHours()).toBe(12);
  });
});
