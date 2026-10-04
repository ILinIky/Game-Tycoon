import type { GameState } from "../types";
import { GENRES } from "../config/balance";
import { platformNews } from "./platforms";
import { clamp, date, random } from "../utils";
import { notify } from "../events/events";
export function updateMarket(s: GameState) {
  if (s.day % 30 === 0) {
    for (const genre of GENRES)
      s.market.popularity[genre] = clamp(
        s.market.popularity[genre] + (random(s) - 0.5) * 18,
        25,
        95,
      );
    const latest = (s.market.rivalGames ?? []).find((g) => s.day - g.releasedDay < 30);
    notify(
      s,
      "Bewegung im Markt",
      latest
        ? `${latest.studio} veröffentlicht „${latest.title}“ (${latest.genre}, ${latest.score.toFixed(1)}). Die Genre-Trends verändern sich.`
        : "Die Genre-Trends verändern sich.",
    );
  }
  const year = date(s.day).getUTCFullYear();
  const yesterday = date(s.day - 1).getUTCFullYear();
  if (year !== yesterday) {
    const news = platformNews(year);
    for (const p of news.launched)
      notify(
        s,
        "Neue Plattform",
        `${p.name} kommt auf den Markt. Spiele im ersten Jahr gelten als Launch-Titel (+30 % Reichweite).`,
        "success",
      );
    for (const p of news.announced)
      notify(s, "Plattform angekündigt", `${p.name} erscheint ${p.year}. Plane deine Launch-Titel.`);
    for (const p of news.retired)
      notify(s, "Plattform eingestellt", `${p.name} wird nicht mehr verkauft.`, "warning");
    const eligible = s.games
      .filter((g) => date(g.releasedDay).getUTCFullYear() === yesterday)
      .sort((a, b) => b.score - a.score);
    if (eligible[0]?.score >= 7.5) {
      s.company.reputation = clamp(s.company.reputation + 8);
      eligible[0].hype += 20;
      s.awards.push({ year: yesterday, title: "Best Indie Game", game: eligible[0].name, kind: "indie" });
      notify(
        s,
        "Independent Game Awards",
        `${eligible[0].name} gewinnt den Preis für Best Indie Game!`,
        "success",
      );
    }
  }
}
