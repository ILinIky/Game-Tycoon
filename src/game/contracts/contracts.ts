import type {
  ActiveContract,
  ContractFocus,
  ContractOffer,
  GameState,
  ProjectInput,
  PublisherDeal,
} from "../types";
import { clamp, random, uid } from "../utils";
import { notify } from "../events/events";
import { isAssigned } from "../employees/assignment";
import { nice, scaled } from "../economy/scale";

const CLIENTS = [
  "Nordlicht Verlag",
  "Brause & Co.",
  "Pixelhafen Medien",
  "Sternwerk Spielzeug",
  "Kanal Vier",
  "Lernwelt AG",
  "Turbo Kiosk",
  "Mondschein Records",
  "Alpenbank",
  "Funkhaus Süd",
];
const TITLES: Record<ContractFocus, string[]> = {
  programming: [
    "Portierung auf neue Hardware",
    "Netzwerkcode für ein Rennspiel",
    "Werkzeug für ein Partnerstudio",
    "Fehlerbehebung vor dem Release",
  ],
  design: [
    "Lernspiel für Grundschulen",
    "Werbespiel für eine Limonade",
    "Rätselserie für ein Magazin",
    "Level-Pack für einen Klassiker",
  ],
  art: [
    "Grafikpaket für ein Brettspiel",
    "Animierte Figuren für eine TV-Show",
    "Cover-Artwork für eine Spielesammlung",
    "Sprites für ein Arcade-Gerät",
  ],
  audio: [
    "Soundtrack für einen Werbespot",
    "Effekte für ein Kinospiel",
    "Jingle-Sammlung für einen Sender",
    "Vertonung eines Hörspiels",
  ],
};
export const FOCUS_LABEL: Record<ContractFocus, string> = {
  programming: "Technik",
  design: "Design",
  art: "Grafik",
  audio: "Audio",
};
export const MAX_ACTIVE_CONTRACTS = 2;
const FOCI: ContractFocus[] = ["programming", "design", "art", "audio"];

function pick<T>(s: GameState, list: T[]) {
  return list[Math.floor(random(s) * list.length)];
}

/** Creates a fresh contract offer scaled to reputation and market. */
export function contractOffer(s: GameState): ContractOffer {
  const focus = pick(s, FOCI);
  const rep = s.company.reputation;
  const level = Math.round(clamp(28 + rep * 0.45 + random(s) * 25, 25, 95));
  const work = Math.round(18 + random(s) * 34 + level * 0.25);
  const days = Math.round(work * (1.5 + random(s) * 0.7));
  const payment = scaled(s, work * 430 * (0.75 + level / 100) * (1 + rep / 250));
  return {
    id: uid(s, "contract"),
    client: pick(s, CLIENTS),
    title: pick(s, TITLES[focus]),
    focus,
    level,
    work,
    days,
    payment,
    expires: s.day + 45,
  };
}

/** Offers refresh monthly; there are always three to choose from. */
export function refreshOffers(s: GameState) {
  s.contracts.offers = s.contracts.offers.filter((o) => o.expires > s.day);
  while (s.contracts.offers.length < 3) s.contracts.offers.push(contractOffer(s));
}

export function contractSpeed(s: GameState, c: Pick<ActiveContract, "team" | "focus">) {
  return s.employees
    .filter((e) => c.team.includes(e.id))
    .reduce((n, e) => n + (0.35 + e.skills[c.focus] / 100) * (0.75 + e.motivation / 400), 0);
}

/** Skill of the team relative to the requested level (1 = exactly met). */
export function contractQuality(s: GameState, c: Pick<ActiveContract, "team" | "focus" | "level">) {
  const team = s.employees.filter((e) => c.team.includes(e.id));
  if (!team.length) return 0;
  const best = Math.max(...team.map((e) => e.skills[c.focus]));
  const avg = team.reduce((n, e) => n + e.skills[c.focus], 0) / team.length;
  return (best * 0.6 + avg * 0.4) / c.level;
}

export const payoutFactor = (quality: number) => clamp(quality, 0.6, 1.2);

export function acceptContract(s: GameState, id: string, team: string[]) {
  const offer = s.contracts.offers.find((o) => o.id === id);
  if (!offer) throw new Error("Dieses Angebot ist nicht mehr verfügbar.");
  if (s.contracts.active.length >= MAX_ACTIVE_CONTRACTS)
    throw new Error(`Höchstens ${MAX_ACTIVE_CONTRACTS} Aufträge gleichzeitig.`);
  if (!team.length || team.length > 3) throw new Error("Weise 1 bis 3 Teammitglieder zu.");
  if (team.some((m) => !s.employees.some((e) => e.id === m) || isAssigned(s, m)))
    throw new Error("Ein Teammitglied ist bereits zugewiesen.");
  s.contracts.offers = s.contracts.offers.filter((o) => o.id !== id);
  s.contracts.active.push({ ...offer, team: [...team], done: 0, deadline: s.day + offer.days });
  notify(s, "Auftrag angenommen", `${offer.client}: ${offer.title}.`, "success");
}

export function cancelContract(s: GameState, id: string) {
  const c = s.contracts.active.find((x) => x.id === id);
  if (!c) throw new Error("Dieser Auftrag läuft nicht.");
  s.contracts.active = s.contracts.active.filter((x) => x !== c);
  s.contracts.failed++;
  s.company.reputation = clamp(s.company.reputation - 2);
  notify(s, "Auftrag abgebrochen", `${c.client} ist enttäuscht. −2 Ruf.`, "warning");
}

export function contractTick(s: GameState) {
  if (s.day % 30 === 15 || !s.contracts.offers.length) refreshOffers(s);
  for (const c of [...s.contracts.active]) {
    c.done = Math.min(c.work, c.done + contractSpeed(s, c));
    if (c.done >= c.work) {
      const quality = contractQuality(s, c);
      const pay = nice(c.payment * payoutFactor(quality));
      s.company.cash += pay;
      s.finances.at(-1)!.revenue += pay;
      s.company.reputation = clamp(s.company.reputation + (quality >= 1 ? 1.5 : 0.5));
      s.contracts.completed++;
      s.contracts.active = s.contracts.active.filter((x) => x !== c);
      for (const e of s.employees.filter((e) => c.team.includes(e.id)))
        e.skills[c.focus] = clamp(e.skills[c.focus] + 1, 0, Math.max(e.potential, e.skills[c.focus]));
      notify(
        s,
        "Auftrag abgeschlossen",
        `${c.client} zahlt ${pay.toLocaleString("de-DE")} €${quality >= 1 ? " und ist begeistert" : ""}.`,
        "success",
      );
    } else if (s.day > c.deadline) {
      s.contracts.active = s.contracts.active.filter((x) => x !== c);
      s.contracts.failed++;
      s.company.reputation = clamp(s.company.reputation - 3);
      notify(s, "Frist verpasst", `${c.client} storniert „${c.title}“. −3 Ruf.`, "warning");
    }
  }
}

/** Publishers fund development in exchange for a revenue share. */
const PUBLISHERS = [
  { name: "Kiosk Games", advance: 0.3, share: 0.2, hype: 5, reputation: 0 },
  { name: "Brightline Publishing", advance: 0.65, share: 0.35, hype: 12, reputation: 15 },
  { name: "Atlas Interactive", advance: 1.1, share: 0.5, hype: 22, reputation: 40 },
];

/** Publisher offers for a planned project, based on its budget. */
export function publisherOffers(
  s: GameState,
  budget: number,
): (PublisherDeal & { locked: boolean; reputation: number })[] {
  return PUBLISHERS.map((p) => ({
    name: p.name,
    advance: nice(budget * p.advance),
    share: p.share,
    hype: p.hype,
    reputation: p.reputation,
    locked: s.company.reputation < p.reputation,
  }));
}

/** Validates a publisher choice against the current offers. */
export function resolvePublisher(s: GameState, input: ProjectInput, budget: number) {
  if (!input.publisher) return undefined;
  const offer = publisherOffers(s, budget).find((o) => o.name === input.publisher!.name);
  if (!offer || offer.locked) throw new Error("Dieser Publisher ist nicht verfügbar.");
  const { name, advance, share, hype } = offer;
  return { name, advance, share, hype };
}
