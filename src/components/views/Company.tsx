import { useState } from "react";
import { Download, Upload, Save, FolderOpen } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { loadSlot, saveSlot, validateSave } from "../../game/persistence/saves";
import { Button, Card, PanelTitle } from "../ui";
export default function CompanyView() {
  const store = useGame();
  const s = store.game;
  const [companyName, setCompanyName] = useState(s.company.name);
  const [feedback, setFeedback] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [slotDates, setSlotDates] = useState<Record<string, string>>({});
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
              Gründung<strong>01. Januar 1990</strong>
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
          zunächst pausiert.
        </p>
        {["autosave", "slot-1", "slot-2", "slot-3"].map((slot, i) => (
          <div className="save-row" key={slot}>
            <Save size={18} />
            <div>
              <strong>{i === 0 ? "Autosave" : `Spielstand ${i}`}</strong>
              <small>
                {slotDates[slot] ??
                  (i === 0 ? "Wird automatisch gesichert" : "Lokal im Browser")}
              </small>
            </div>
            {i > 0 && (
              <button
                className="icon-button"
                aria-label={`Spielstand ${i} speichern`}
                onClick={() =>
                  void report(async () => {
                    await saveSlot(slot, s);
                    setSlotDates((d) => ({
                      ...d,
                      [slot]: new Date().toLocaleString("de-DE"),
                    }));
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
              onClick={() =>
                void report(async () => {
                  const saved = await loadSlot(slot);
                  if (!saved) throw new Error("Dieser Slot ist noch leer.");
                  store.setGame(saved.state);
                  setSlotDates((d) => ({
                    ...d,
                    [slot]: new Date(saved.savedAt).toLocaleString("de-DE"),
                  }));
                  setFeedback("Spielstand geladen.");
                })
              }
            >
              <FolderOpen size={18} />
            </button>
          </div>
        ))}
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
