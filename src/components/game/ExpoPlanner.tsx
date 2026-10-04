import { useState } from "react";
import { CalendarDays, Check, Mic2, Sparkles, Store, Theater } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useGame } from "../../store/gameStore";
import {
  BOOTHS,
  boothCost,
  dayOfYear,
  daysToExpo,
  EXPO_BOOKING_START,
  expoBlocker,
} from "../../game/marketing/expo";
import { money } from "../../game/utils";
import { Button, Card } from "../ui";
import type { BoothSize } from "../../game/types";

const BOOTH_ICON: Record<BoothSize, LucideIcon> = { small: Store, medium: Mic2, large: Theater };

/** Booking card for the yearly GameExpo in the marketing page. */
export default function ExpoPlanner() {
  const store = useGame();
  const s = store.game;
  const [booth, setBooth] = useState<BoothSize>("medium");
  const [picked, setPicked] = useState<string[]>([]);
  const days = daysToExpo(s);
  const open = dayOfYear(s.day) >= EXPO_BOOKING_START && days > 0;
  const chosen = picked.filter((id) => s.projects.some((p) => p.id === id)).slice(0, BOOTHS[booth].slots);
  const blocker = expoBlocker(s, booth, chosen);
  const result = s.expo.result;
  return (
    <Card className={`expo-card ${s.expo.booth ? "booked" : ""}`}>
      <div className="expo-head">
        <span className="expo-badge">
          <Sparkles size={18} />
        </span>
        <div>
          <span className="eyebrow">DIE MESSE DES JAHRES</span>
          <h2>GameExpo {s.expo.year}</h2>
          <p>
            Zeige Spiele in Entwicklung der Presse: Hype, neue Fans und die
            Chance auf „Best of Show“.
          </p>
        </div>
        <div className="expo-countdown">
          <CalendarDays size={14} />
          {days > 0 ? (
            <>
              <strong>{days}</strong>
              <small>Tage bis zur Messe</small>
            </>
          ) : (
            <small>Nächste Messe im Juni</small>
          )}
        </div>
      </div>

      {result ? (
        <div className="expo-result">
          <strong>{result.award ? `🏆 ${result.award} gewinnt „Best of Show“` : "Dein Messeauftritt"}</strong>
          <span>
            +{result.hype} Hype · +{result.fans} Fans · {result.projects.join(", ")}
          </span>
          <ul>
            {result.reactions.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : s.expo.booth ? (
        <div className="expo-booked">
          <Check size={16} />
          <span>
            {BOOTHS[s.expo.booth].name} gebucht für{" "}
            {s.projects
              .filter((p) => s.expo.projects.includes(p.id))
              .map((p) => p.name)
              .join(", ") || "deine Projekte"}
            . Die Messe startet in {days} Tagen.
          </span>
        </div>
      ) : (
        <>
          <div className="expo-booths">
            {(Object.keys(BOOTHS) as BoothSize[]).map((b) => {
              const Icon = BOOTH_ICON[b];
              return (
                <button
                  type="button"
                  key={b}
                  className={booth === b ? "selected" : ""}
                  aria-pressed={booth === b}
                  onClick={() => setBooth(b)}
                >
                  <Icon size={20} />
                  <strong>{BOOTHS[b].name}</strong>
                  <small>
                    +{BOOTHS[b].hype} Hype · +{BOOTHS[b].fans} Fans · {BOOTHS[b].slots}{" "}
                    {BOOTHS[b].slots === 1 ? "Projekt" : "Projekte"}
                  </small>
                  <b>{money(boothCost(s, b))}</b>
                </button>
              );
            })}
          </div>
          <div className="expo-projects">
            {s.projects.length === 0 && <p className="hint">Starte ein Projekt, um es auf der Messe zu zeigen.</p>}
            {s.projects.map((p) => {
              const on = chosen.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  className={on ? "selected" : ""}
                  aria-pressed={on}
                  disabled={!on && chosen.length >= BOOTHS[booth].slots}
                  onClick={() => setPicked(on ? chosen.filter((id) => id !== p.id) : [...chosen, p.id])}
                >
                  {on && <Check size={12} />}
                  {p.name}
                  <small>{Math.round(p.progress)} %</small>
                </button>
              );
            })}
          </div>
          <div className="expo-actions">
            <Button disabled={!!blocker} onClick={() => store.bookExpo(booth, chosen)}>
              Stand buchen
            </Button>
            {blocker && (
              <small>
                {open || days <= 0
                  ? blocker
                  : `Buchung öffnet in ${EXPO_BOOKING_START - dayOfYear(s.day)} Tagen.`}
              </small>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
