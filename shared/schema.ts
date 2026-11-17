import { z } from "zod";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Informe uma data válida.");
export const categoryIds = [
  "flights",
  "hotel",
  "food",
  "transport",
  "experiences",
  "essentials",
  "reserve",
] as const;
export const styleSchema = z.enum(["economy", "balanced", "comfort"]);
const money = z.number().finite().min(0).max(1e8);
const id = z.string().regex(/^[\w-]{1,80}$/);
const text = (max: number) => z.string().trim().min(1).max(max);
export const registerSchema = z
  .object({
    name: text(80),
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(8, "Use pelo menos 8 caracteres.").max(128),
  })
  .strict();
export const loginSchema = registerSchema.pick({ email: true, password: true });
export const createTripSchema = z
  .object({
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    city: z.string().trim().max(100).default(""),
    travelers: z.number().int().min(1).max(20),
    days: z.number().int().min(1).max(90),
    startDate: dateSchema.nullable().default(null),
    style: styleSchema.default("balanced"),
  })
  .strict();
export const routeSchema = z
  .object({
    id,
    city: text(100),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    days: z.number().int().min(1).max(90),
  })
  .strict();
export const activitySchema = z
  .object({
    id,
    name: text(160),
    day: z.number().int().min(1).max(90),
    city: z.string().trim().max(100),
    done: z.boolean(),
    notes: z.string().max(2000),
  })
  .strict();
export const bookingSchema = z
  .object({
    id,
    name: text(160),
    category: z.enum(categoryIds),
    amount: money,
    paid: z.boolean(),
    date: dateSchema.nullable(),
    url: z
      .union([z.literal(""), z.url().refine((s) => /^https?:\/\//.test(s))])
      .refine((s) => s.length <= 2000),
    notes: z.string().max(2000),
  })
  .strict();
export const taskSchema = z
  .object({ id, title: text(160), done: z.boolean() })
  .strict();
const costsSchema = z
  .object(
    Object.fromEntries(categoryIds.map((c) => [c, money.optional()])) as Record<
      (typeof categoryIds)[number],
      z.ZodOptional<typeof money>
    >,
  )
  .strict();
export const editableTripSchema = z
  .object({
    title: text(120),
    travelers: z.number().int().min(1).max(20),
    days: z.number().int().min(1).max(90),
    startDate: dateSchema.nullable(),
    style: styleSchema,
    cash: money,
    costs: costsSchema,
    route: z.array(routeSchema).min(1).max(20),
    activities: z.array(activitySchema).max(500),
    bookings: z.array(bookingSchema).max(200),
    checklist: z.array(taskSchema).max(100),
    favorites: z.array(z.string().max(200)).max(500),
    notes: z
      .record(dateSchema, z.string().max(3000))
      .refine((o) => Object.keys(o).length <= 180),
    outboundDate: dateSchema.nullable(),
    homeArrivalDate: dateSchema.nullable(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.route.reduce((n, s) => n + s.days, 0) !== p.days)
      ctx.addIssue({
        code: "custom",
        message:
          "A soma dos dias nas cidades deve ser igual à duração da viagem.",
        path: ["route"],
      });
    if (new Set(p.route.map((s) => s.id)).size !== p.route.length)
      ctx.addIssue({
        code: "custom",
        message: "Cada parada precisa de um identificador diferente.",
        path: ["route"],
      });
    if (p.activities.some((a) => a.day > p.days))
      ctx.addIssue({
        code: "custom",
        message: "Há passeios depois do último dia da viagem.",
        path: ["activities"],
      });
    if ((p.outboundDate || p.homeArrivalDate) && !p.startDate)
      ctx.addIssue({
        code: "custom",
        message: "Defina a chegada ao destino antes de marcar os voos.",
        path: ["startDate"],
      });
    if (p.startDate && p.outboundDate && p.outboundDate > p.startDate)
      ctx.addIssue({
        code: "custom",
        message: "O embarque de ida deve ser antes da chegada ao destino.",
        path: ["outboundDate"],
      });
    if (p.startDate && p.homeArrivalDate) {
      const d = new Date(p.startDate + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + p.days - 1);
      if (p.homeArrivalDate < d.toISOString().slice(0, 10))
        ctx.addIssue({
          code: "custom",
          message:
            "A chegada de volta deve ser depois do último dia no destino.",
          path: ["homeArrivalDate"],
        });
    }
  });
export const updateTripSchema = z
  .object({ revision: z.number().int().min(0), data: editableTripSchema })
  .strict();
export type TripInput = z.infer<typeof createTripSchema>;
export type TripData = z.infer<typeof editableTripSchema>;
export type TravelStyle = z.infer<typeof styleSchema>;
export type CategoryId = (typeof categoryIds)[number];
export type RouteStop = z.infer<typeof routeSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Booking = z.infer<typeof bookingSchema>;
export interface User {
  id: string;
  name: string;
  email: string;
}
export interface Country {
  code: string;
  name: string;
  flag: string;
  region: string;
  latitude: number;
  longitude: number;
}
export interface Destination {
  countryCode: string;
  country: string;
  city: string;
  label: string;
  flag: string;
  region: string;
  accent: string;
  cover: string;
  coverCaption: string;
  guideUrl: string;
  latitude: number | null;
  longitude: number | null;
}
export interface Trip extends TripData {
  id: string;
  destination: Destination;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
export interface Recommendation {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string;
  mapUrl: string;
  curated: boolean;
}
