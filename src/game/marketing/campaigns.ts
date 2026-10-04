import type {
  GameProject,
  GameState,
  MarketingPlan,
  ReleasedGame,
} from "../types";
import { BALANCE } from "../config/balance";
import { campaignCost } from "../economy/scale";
import { techEffects } from "../research/research";
import { facilityEffects } from "../office/office";
import { countPerk } from "../employees/perks";
import { notify } from "../events/events";
import { clamp } from "../utils";

/** Automatic marketing plans; campaigns run during development. */
export const MARKETING_PLANS: Record<
  MarketingPlan,
  { label: string; campaigns: number; description: string }
> = {
  none: {
    label: "Kein Marketing",
    campaigns: 0,
    description: "Du startest Kampagnen bei Bedarf selbst.",
  },
  basic: {
    label: "Basis-Kampagne",
    campaigns: 1,
    description: "Eine Kampagne kurz vor dem Release.",
  },
  strong: {
    label: "Starke Kampagne",
    campaigns: 3,
    description: "Drei Kampagnen über die Entwicklung verteilt.",
  },
  max: {
    label: "Maximaler Hype",
    campaigns: 7,
    description: "Kampagnen, bis der Hype 100 erreicht.",
  },
};
export const MARKETING_KEYS = Object.keys(MARKETING_PLANS) as MarketingPlan[];

/** Hype gained by one magazine campaign. */
export const campaignHype = (s: GameState) =>
  (BALANCE.campaignHype + techEffects(s).campaign) *
  (1 + facilityEffects(s).campaign) *
  (countPerk(s, "marketing") ? 1.25 : 1);

/** Budget the plan needs at today's prices (upper bound for "max"). */
export function marketingBudget(s: GameState, plan: MarketingPlan = "none") {
  return MARKETING_PLANS[plan].campaigns * campaignCost(s);
}

/** Runs one paid campaign for a project or released game. */
export function runCampaign(s: GameState, p: GameProject | ReleasedGame) {
  if (p.hype >= 100)
    throw new Error("Dieses Spiel hat bereits maximale Aufmerksamkeit.");
  const cost = campaignCost(s);
  if (s.company.cash < cost)
    throw new Error("Dafür reicht dein Budget aktuell nicht.");
  s.company.cash -= cost;
  s.finances.at(-1)!.expenses += cost;
  p.hype = clamp(p.hype + campaignHype(s));
}

/** Progress (in %) at which campaign `index` of `total` starts. */
const threshold = (index: number, total: number) =>
  30 + ((index + 1) * 65) / total;

/** Runs planned campaigns once projects pass their progress thresholds. */
export function autoMarketing(s: GameState) {
  for (const p of s.projects) {
    const total = MARKETING_PLANS[p.marketing ?? "none"]?.campaigns ?? 0;
    let ran = 0;
    let skipped = false;
    while (
      (p.campaigns ?? 0) < total &&
      p.progress >= threshold(p.campaigns ?? 0, total)
    ) {
      p.campaigns = (p.campaigns ?? 0) + 1;
      if (p.hype >= 100) continue;
      if (s.company.cash < campaignCost(s)) {
        skipped = true;
        continue;
      }
      runCampaign(s, p);
      ran++;
    }
    if (ran)
      notify(
        s,
        "Automatische Kampagne",
        `${p.name} wird beworben · Hype ${Math.round(p.hype)}.`,
        "success",
      );
    if (skipped)
      notify(
        s,
        "Kampagne ausgefallen",
        `Für die geplante Kampagne von ${p.name} fehlte das Budget.`,
        "warning",
      );
  }
}
