import { useEffect, useState } from "react";
import { Download, Upload, Save, FolderOpen } from "lucide-react";
import { useGame } from "../../store/gameStore";
import {
  loadSlot,
  saveSlot,
  slotMeta,
  validateSave,
} from "../../game/persistence/saves";
import { dateLabel, money } from "../../game/utils";
import { DIFFICULTIES, scenarioById } from "../../game/config/scenarios";
import type { Difficulty } from "../../game/types";

const SLOTS = [
  "autosave",
  "slot-1",
  "slot-2",
  "slot-3",
  "slot-4",
  "slot-5",
  "slot-6",
];

/** Small JPEG of the office scene for the save list. */
function capturePreview() {
  const source = document.querySelector<HTMLCanvasElement>(
    ".studio-world canvas",
  );
  if (!source || !source.width) return undefined;
  const thumb = document.createElement("canvas");
  thumb.width = 240;
  thumb.height = Math.round((240 * source.height) / source.width);
  thumb.getContext("2d")?.drawImage(source, 0, 0, thumb.width, thumb.height);
  try {
    return thumb.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}
import { Button, Card, PanelTitle } from "../ui";
export default function CompanyView() {
  const store = useGame();
  const s = store.game;
  const [companyName, setCompanyName] = useState(s.company.name);
  const [feedback, setFeedback] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [slots, setSlots] = useState<
    Record<string, Awaited<ReturnType<typeof slotMeta>>>
  >({});
  const refresh = async () => {
    const entries = await Promise.all(
      SLOTS.map(
        async (slot) => [slot, await slotMeta(slot).catch(() => null)] as const,
      ),
    );
    setSlots(Object.fromEntries(entries));
  };
  useEffect(() => {
    void refresh();
  }, []);
  const report = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    }
  };
  return (
    <div className="two-columns">
      <div className="stack">
        <Card className="settings-card">
          <PanelTitle title="Dein Unternehmen" eyebrow="IDENTITÄT" />
          <label>
            Firmenname
            <input
              maxLength={36}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>
          <Button onClick={() => store.rename(companyName)}>
            Änderung speichern
          </Button>
          <div className="detail-grid">
            <span>
              Gründer<strong>{s.company.founder}</strong>
            </span>
            <span>
              Gründung<strong>{dateLabel(s.finances[0]?.day ?? 0)}</strong>
            </span>
            <span>
              Schwierigkeit
              <strong>{DIFFICULTIES[s.difficulty ?? "normal"].name}</strong>
            </span>
          </div>
        </Card>
        <Card className="settings-card">
          <PanelTitle title="Ein neues Kapitel" />
          <p>
            Ein Neustart ersetzt den aktuellen Fortschritt. Sichere dein Studio
            vorher in einem Slot.
          </p>
          {confirmReset ? (
            <div className="button-row">
              <Button onClick={store.reset}>
                Studio wirklich zurücksetzen
              </Button>
              <Button secondary onClick={() => setConfirmReset(false)}>
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button secondary onClick={() => setConfirmReset(true)}>
              Neues Studio gründen
            </Button>
          )}
        </Card>
      </div>
      <Card className="settings-card">
        <PanelTitle title="Spielstände" eyebrow="LOKALE SPIELSTÄNDE" />
        <p>
          Automatische Speicherung nach Änderungen. Beim Laden bleibt die Zeit
          zunächst pausiert. Gespeicherte Slots zeigen ein Vorschaubild.
        </p>
        <div className="save-slots">
          {SLOTS.map((slot, i) => {
            const info = slots[slot];
            return (
              <div className="save-slot" key={slot}>
                <div className="save-preview">
                  {info?.meta?.preview ? (
                    <img src={info.meta.preview} alt="" />
                  ) : (
                    <Save size={20} />
                  )}
                </div>
                <div className="save-info">
                  <strong>{i === 0 ? "Autosave" : `Spielstand ${i}`}</strong>
                  {info?.meta ? (
                    <small>
                      {info.meta.name} · {dateLabel(info.meta.day)}
                      <br />
                      {money(info.meta.cash)} · {info.meta.games} Spiele
                      {info.meta.scenario &&
                        ` · ${scenarioById(info.meta.scenario).name}`}
                      {info.meta.difficulty &&
                        ` · ${DIFFICULTIES[info.meta.difficulty as Difficulty]?.name ?? ""}`}
                      <br />
                      gespeichert{" "}
                      {new Date(info.savedAt).toLocaleString("de-DE")}
                    </small>
                  ) : (
                    <small>
                      {i === 0 ? "Wird automatisch gesichert" : "Leer"}
                    </small>
                  )}
                </div>
                <div className="save-actions">
                  {i > 0 && (
                    <button
                      className="icon-button"
                      aria-label={`Spielstand ${i} speichern`}
                      title="Speichern"
                      onClick={() =>
                        void report(async () => {
                          await saveSlot(slot, s, capturePreview());
                          await refresh();
                          setFeedback("Spielstand gespeichert.");
                        })
                      }
                    >
                      <Save size={17} />
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`${i === 0 ? "Autosave" : `Spielstand ${i}`} laden`}
                    title="Laden"
                    disabled={!info}
                    onClick={() =>
                      void report(async () => {
                        const saved = await loadSlot(slot);
                        if (!saved)
                          throw new Error("Dieser Slot ist noch leer.");
                        store.setGame(saved.state);
                        setFeedback("Spielstand geladen.");
                      })
                    }
                  >
                    <FolderOpen size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="button-row">
          <Button
            secondary
            onClick={() => {
              const blob = new Blob([JSON.stringify(s, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `studio-zero-${s.day}.json`;
              a.click();
              URL.revokeObjectURL(url);
              setFeedback("Spielstand exportiert.");
            }}
          >
            <Download size={16} />
            JSON exportieren
          </Button>
          <label className="button secondary import-button">
            <Upload size={16} />
            Importieren
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void report(async () => {
                    if (file.size > 5_000_000)
                      throw new Error("Die Datei ist zu groß.");
                    const loaded = validateSave(
                      JSON.parse(await file.text()) as unknown,
                    );
                    store.setGame(loaded);
                    setFeedback("Spielstand importiert.");
                  });
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {feedback && (
          <p className="feedback" role="status">
            {feedback}
          </p>
        )}
      </Card>
    </div>
  );
}
