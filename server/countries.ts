import worldData from "world-countries";
import type { Country as WorldCountry } from "world-countries";
const world = worldData as unknown as WorldCountry[];
import type { Country, Destination, Recommendation } from "../shared/schema.js";
import { flag } from "../shared/planner.js";
import { featured, tourism } from "../shared/destinations.js";
export const countries: Country[] = world
  .map((c) => ({
    code: c.cca2,
    name: c.translations.por?.common || c.name.common,
    flag: flag(c.cca2),
    region:
      c.region === "Asia"
        ? "asia"
        : c.region === "Europe"
          ? "europe"
          : c.region === "Africa"
            ? "africa"
            : c.region === "Oceania"
              ? "oceania"
              : c.region === "Americas"
                ? "americas"
                : "other",
    latitude: c.latlng[0] || 0,
    longitude: c.latlng[1] || 0,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
export const countryMap = new Map(countries.map((c) => [c.code, c]));
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function destinationFor(code: string, city: string): Destination {
  const c = countryMap.get(code);
  if (!c) throw new Error("País não encontrado.");
  const f = featured.find((x) => x.code === code);
  const palette: Record<string, string> = {
    asia: "#d99470",
    europe: "#b1be91",
    americas: "#9fbad0",
    africa: "#d6b47a",
    oceania: "#8dbeb1",
    other: "#a9b3ce",
  };
  return {
    countryCode: code,
    country: c.name,
    city,
    label: city || c.name,
    flag: c.flag,
    region: c.region,
    accent: f?.accent || palette[c.region],
    cover: f?.image || "/images/journey.jpg",
    coverCaption: f
      ? `${c.name} · foto ilustrativa do país`
      : "O mundo é o seu próximo destino",
    guideUrl:
      tourism[code] ||
      `https://pt.wikivoyage.org/wiki/${encodeURIComponent(c.name.replaceAll(" ", "_"))}`,
    latitude: city ? null : c.latitude,
    longitude: city ? null : c.longitude,
  };
}
const curated: Record<string, [string, string, string][]> = {
  "JP:tokyo": [
    [
      "Asakusa e Sensō-ji",
      "Tradição",
      "Reserve um tempo para o templo e as ruas do bairro.",
    ],
    [
      "Shibuya e Shinjuku",
      "Vida urbana",
      "Explore bairros, cafés e a energia de Tóquio.",
    ],
    [
      "Tokyo DisneySea",
      "Parques",
      "Consulte ingressos e regras no site oficial do resort.",
    ],
  ],
  "JP:toquio": [],
  "JP:kyoto": [
    ["Fushimi Inari", "Templos", "Uma caminhada entre os torii vermelhos."],
    ["Arashiyama", "Natureza", "Explore o bosque de bambu e a região do rio."],
    ["Higashiyama", "História", "Ruas tradicionais para descobrir a pé."],
  ],
  "JP:osaka": [
    [
      "Dotonbori",
      "Gastronomia",
      "Luzes e sabores para descobrir ao longo do canal.",
    ],
    [
      "Castelo de Osaka",
      "História",
      "Conheça o parque e consulte as condições de visita.",
    ],
    [
      "Universal Studios Japan",
      "Parques",
      "Confira ingressos e regras do Super Nintendo World no site oficial.",
    ],
  ],
  "US:nova york": [
    [
      "Central Park",
      "Ao ar livre",
      "Separe um período para caminhar e explorar o parque.",
    ],
    [
      "The Metropolitan Museum of Art",
      "Cultura",
      "Confira a programação e os ingressos no site do museu.",
    ],
    [
      "Brooklyn Bridge",
      "Paisagem",
      "Uma caminhada para observar a cidade de outro ângulo.",
    ],
  ],
  "US:new york": [],
  "FR:paris": [
    [
      "Musée du Louvre",
      "Cultura",
      "Consulte horários e reservas antes de incluir no seu dia.",
    ],
    ["Montmartre", "Bairros", "Explore as ruas e os mirantes do bairro."],
    [
      "Jardim de Luxemburgo",
      "Ao ar livre",
      "Uma pausa para caminhar e aproveitar a cidade.",
    ],
  ],
  "IT:roma": [
    [
      "Coliseu",
      "História",
      "Consulte os ingressos e programe sua visita com antecedência.",
    ],
    ["Trastevere", "Bairros", "Ruas e sabores para descobrir com calma."],
    [
      "Pantheon",
      "Arquitetura",
      "Confira as condições de visita no site oficial.",
    ],
  ],
  "PT:lisboa": [
    ["Alfama", "Bairros", "Ruas e miradouros para um passeio a pé."],
    [
      "Belém",
      "História",
      "Reserve um período para explorar os monumentos da região.",
    ],
    ["Praça do Comércio", "Paisagem", "Uma caminhada à beira do Tejo."],
  ],
  "BR:rio de janeiro": [
    [
      "Jardim Botânico",
      "Natureza",
      "Consulte horários e planeje uma caminhada pelos jardins.",
    ],
    [
      "Cristo Redentor",
      "Paisagem",
      "Verifique ingressos, acesso e condições do tempo.",
    ],
    [
      "Museu do Amanhã",
      "Cultura",
      "Confira a programação e os ingressos oficiais.",
    ],
  ],
};
curated["JP:toquio"] = curated["JP:tokyo"];
curated["US:new york"] = curated["US:nova york"];
export function recommendations(code: string, city: string): Recommendation[] {
  const destination = destinationFor(code, city);
  const list = curated[code + ":" + normalize(city)];
  return (
    list || [
      [
        "Atrações e pontos de interesse",
        "Explorar",
        "Encontre lugares para visitar e confira avaliações e horários.",
      ],
      [
        "Museus e cultura",
        "Cultura",
        "Pesquise museus, exposições e espaços culturais do destino.",
      ],
      [
        "Parques e passeios ao ar livre",
        "Natureza",
        "Descubra opções para um dia em um ritmo mais leve.",
      ],
    ]
  ).map(([name, category, description], i) => ({
    id: code + ":" + normalize(city) + ":" + i,
    name,
    category,
    description,
    curated: !!list,
    url: destination.guideUrl,
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(name + " " + city + " " + destination.country),
  }));
}
