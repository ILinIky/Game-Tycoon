import { sequelPlan, seriesQuality } from "./franchise";
import { resolvePublisher } from "../contracts/contracts";
import { perkQuality } from "../employees/perks";
import { isAvailable } from "../market/platforms";
import type { GameState, ProjectInput, GameProject } from "../types";
import { BALANCE, OFFICES, SIZES, PLATFORMS } from "../config/balance";
import { PRICE_STEPS } from "./pricing";
import { pruneArchive } from "./archive";
import { clamp, random, uid } from "../utils";
import { notify } from "../events/events";
import { ambitionFor, DEFAULT_WEIGHTS, DESIGN_FOCUS } from "../config/design";
import { engineBonus } from "../engines/engines";
import { nice, scaled } from "../economy/scale";
import { facilityEffects } from "../office/office";
import { isAssigned } from "../employees/assignment";
import {
  marketExpectation,
  missingStandards,
  releaseResearch,
  techEffects,
  techQuality,
} from "../research/research";
export function projectDuration(s: GameState, input: ProjectInput) {
  return Math.round(
    SIZES[input.size].days *
      ambitionFor(input).days *
      (1 - techEffects(s).speed) *
      (1 - engineBonus(s, input.engine).routine),
  );
}
export function projectCost(s: GameState, input: ProjectInput) {
  return (
    nice(
      scaled(s, SIZES[input.size].cost) *
        ambitionFor(input).cost *
        (1 - techEffects(s).cost),
    ) +
    input.platforms.reduce(
      (n, id) =>
        n +
        (s.licenses.includes(id)
          ? 0
          : scaled(s, PLATFORMS.find((p) => p.id === id)?.license ?? 0)),
      0,
    )
  );
}
export function createProject(s: GameState, input: ProjectInput) {
  const cost = projectCost(s, input);
  const spec = SIZES[input.size];
  const available = input.team.every(
    (id) =>
      s.employees.some((e) => e.id === id) && !isAssigned(s, id),
  );
  if (
    !input.name.trim() ||
    !input.platforms.length ||
    input.team.length < spec.team ||
    !input.platforms.every((id) => isAvailable(s, id)) ||
    !available ||
    s.company.cash < cost ||
    s.projects.length >= BALANCE.maxProjects ||
    s.company.bankrupt
  )
    throw new Error("Prüfe Budget, Plattformen und verfügbare Teammitglieder.");
  if (s.company.office < spec.office)
    throw new Error(`${spec.label} ist ab dem Büro „${OFFICES[spec.office].name}“ möglich.`);
  const sequel = input.sequelOf ? sequelPlan(s, input.sequelOf) : null;
  if (input.sequelOf && (!sequel || !sequel.eligible || sequel.base.genre !== input.genre))
    throw new Error("Eine Fortsetzung braucht ein Original mit mindestens 6,0 im selben Genre.");
  const publisher = resolvePublisher(s, input, cost);
  s.company.cash -= cost;
  s.finances.at(-1)!.expenses += cost;
  if (publisher) {
    s.company.cash += publisher.advance;
    s.finances.at(-1)!.revenue += publisher.advance;
  }
  s.licenses = [...new Set([...s.licenses, ...input.platforms])];
  s.projects.push({
    ...input,
    publisher,
    franchise: sequel?.root,
    entry: sequel?.entry,
    name: input.name.trim(),
    id: uid(s, "game"),
    duration: projectDuration(s, input),
    elapsed: 0,
    budget: cost,
    progress: 0,
    quality: 0,
    bugs: 0,
    hype: clamp(techEffects(s).hype + (sequel?.hype ?? 0) + (publisher?.hype ?? 0)),
    priceFactor: PRICE_STEPS.includes(input.priceFactor ?? 1) ? input.priceFactor : undefined,
    campaigns: 0,
    phase: "Konzept",
    points: {
      design: 0,
      technology: 0,
      art: 0,
      content: 0,
      audio: 0,
      polish: 0,
    },
  });
  notify(
    s,
    "Eine neue Idee nimmt Form an",
    `${input.name} ist jetzt in Entwicklung.`,
    "success",
  );
}
export function synergy(genre: string, theme: string) {
  const good: Record<string, string[]> = {
    RPG: ["Fantasy", "Mittelalter"],
    Strategie: ["Militär", "Weltraum"],
    Simulation: ["Business", "Weltraum"],
    Adventure: ["Piraten", "Crime"],
    Horror: ["Zombies", "Crime"],
    Action: ["Sci-Fi", "Cyberpunk"],
    Racing: ["Sci-Fi"],
    Puzzle: ["Fantasy"],
    Sport: ["Business"],
  };
  return good[genre]?.includes(theme)
    ? 1.12
    : genre === "Racing" && theme === "Mittelalter"
      ? 0.78
      : 1;
}
export function quality(s: GameState, p: GameProject) {
  const team = s.employees.filter((e) => p.team.includes(e.id));
  const weights = p.designFocus
    ? DESIGN_FOCUS[p.designFocus].weights
    : DEFAULT_WEIGHTS;
  const skill =
    team.reduce(
      (sum, e) =>
        sum +
        e.skills.design * weights.design +
        e.skills.programming * weights.programming +
        e.skills.art * weights.art +
        e.skills.audio * weights.audio +
        e.skills.writing * weights.writing,
      0,
    ) / Math.max(team.length, 1);
  const morale =
    team.reduce((n, e) => n + e.motivation, 0) / Math.max(team.length, 1);
  const perfection = team.some((e) => e.trait === "Perfektionist") ? 1.1 : 1;
  const ambitionQuality =
    p.ambition === "focused"
      ? 0.97
      : p.ambition === "experimental"
        ? skill >= 65
          ? 1.06
          : 0.93
        : 1;
  const raw =
    (skill * 0.85 +
      morale * 0.16 +
      techQuality(s, p.genre) -
      marketExpectation(s) +
      engineBonus(s, p.engine, p.designFocus).quality +
      Math.min(BALANCE.genreExperienceCap, s.genreExperience[p.genre] ?? 0) *
        BALANCE.genreExperienceQuality +
      (facilityEffects(s).focus[p.designFocus ?? "systems"] ?? 0) +
      seriesQuality(p, s) +
      perkQuality(s, p) -
      p.bugs * 0.5) *
      synergy(p.genre, p.theme) *
      perfection *
      ambitionQuality;
  // Saturating curve: good teams reach 7–8 quickly, 9.5+ stays rare.
  return clamp(100 * (1 - Math.exp(-Math.max(0, raw) / BALANCE.qualityCurve)), 10, 97);
}
export function release(s: GameState, id: string) {
  const p = s.projects.find((p) => p.id === id);
  if (!p || p.progress < 100)
    throw new Error("Das Spiel ist noch in Entwicklung.");
  const q = quality(s, p);
  const score = Math.round((q / 10) * 10) / 10;
  const magazines = [
    "Frame Magazine",
    "Play Journal",
    "Input Review",
    "The Game Edit",
  ];
  const reviewTexts = [
    p.bugs > 8
      ? "Interessante Ideen, doch technische Fehler bremsen das Erlebnis."
      : q > 70
        ? "Stimmige Spielsysteme und ein Studio mit einer klaren kreativen Handschrift."
        : "Ein solider Einstieg. Bei der spielerischen Tiefe gibt es noch Potenzial.",
    missingStandards(s).length
      ? `Technisch wirkt das Spiel veraltet: ${missingStandards(s)
          .slice(0, 2)
          .map((t) => t.name)
          .join(" und ")} gehören längst zum Standard.`
      : p.points.design > p.points.technology
      ? "Die kreative Spielgestaltung überzeugt stärker als die technische Präsentation."
      : "Das technische Fundament trägt das Erlebnis. Das Design könnte mutiger sein.",
    (s.genreExperience[p.genre] ?? 0) > 0
      ? `Die Erfahrung des Studios im Genre ${p.genre} ist deutlich spürbar.`
      : `Ein vielversprechender erster Schritt des Studios in das Genre ${p.genre}.`,
    synergy(p.genre, p.theme) > 1
      ? `${p.theme} und ${p.genre} ergänzen sich zu einem stimmigen Gesamtbild.`
      : synergy(p.genre, p.theme) < 1
        ? "Die ungewöhnliche Kombination von Genre und Thema findet keinen klaren Rhythmus."
        : `Das Thema ${p.theme} liefert interessante Ansätze, ohne das Genre neu zu erfinden.`,
  ];
  const reviews = magazines.map((magazine, i) => ({
    magazine,
    score: Math.round(clamp(score + (random(s) - 0.5) * 0.8, 1, 10) * 10) / 10,
    text: reviewTexts[i],
  }));
  s.games.unshift({
    ...p,
    quality: q,
    score,
    reviews,
    releasedDay: s.day,
    units: 0,
    revenue: 0,
    price: Math.round(
      SIZES[p.size].price *
        (PRICE_STEPS.includes(p.priceFactor ?? 1) ? (p.priceFactor ?? 1) : 1),
    ),
    patched: false,
    salesHistory: [],
    salesHistoryStartDay: s.day + 1,
  });
  s.projects = s.projects.filter((project) => project.id !== id);
  pruneArchive(s);
  s.company.reputation = clamp(
    s.company.reputation + (score - 5) * 1.2 * SIZES[p.size].fame,
  );
  const fanGain = (score - 4.5) * 45;
  s.company.fans = Math.max(
    0,
    s.company.fans +
      Math.round(
        fanGain > 0
          ? fanGain *
              SIZES[p.size].sales *
              (1 + techEffects(s).fans + facilityEffects(s).fans)
          : fanGain,
      ),
  );
  // Every release saturates its genre a little; trends recover monthly.
  s.market.popularity[p.genre] = clamp(
    s.market.popularity[p.genre] - BALANCE.genreSaturation * SIZES[p.size].fame,
    25,
    95,
  );
  const newGenre = !s.genreExperience[p.genre];
  s.company.researchPoints += releaseResearch(s, p.size) + (newGenre ? 6 : 0);
  s.genreExperience[p.genre] = (s.genreExperience[p.genre] ?? 0) + 1;
  const engine = s.engines.find((e) => e.id === p.engine);
  if (engine) engine.games = (engine.games ?? 0) + 1;
  notify(
    s,
    `${p.name} ist veröffentlicht`,
    `Die Presse vergibt ${score.toFixed(1)} / 10. Verkäufe starten morgen.`,
    "success",
  );
}
