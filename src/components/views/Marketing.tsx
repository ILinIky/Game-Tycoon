import ExpoPlanner from "../game/ExpoPlanner";
import { campaignCost } from "../../game/economy/scale";
import { Megaphone } from "lucide-react";
import { useGame } from "../../store/gameStore";
import { money } from "../../game/utils";
import { Badge, Button, Card, Empty, Progress } from "../ui";
export default function MarketingView() {
  const store = useGame();
  const s = store.game;
  return (
    <>
      <Card className="marketing-banner">
        <Megaphone size={38} />
        <div>
          <span className="eyebrow">DIE WELT SOLL DAVON HÖREN</span>
          <h2>Ein gutes Spiel verdient Aufmerksamkeit.</h2>
          <p>
            Kampagnen erhöhen Hype und Verkaufschancen. Einmal im Jahr bietet
            die GameExpo die größte Bühne der Branche.
          </p>
        </div>
      </Card>
      <ExpoPlanner />
      <div className="research-grid">
        {[...s.projects, ...s.games].map((p) => (
          <Card className="research-card" key={p.id}>
            <Badge tone="neutral">
              {"releasedDay" in p ? "Veröffentlicht" : "In Entwicklung"}
            </Badge>
            <h2>{p.name}</h2>
            <p>
              {p.genre} · {p.theme}
            </p>
            <div className="hype">
              <span>
                Aufmerksamkeit <b>{Math.round(p.hype)} / 100</b>
              </span>
              <Progress value={p.hype} />
            </div>
            <Button
              detail={money(campaignCost(s))}
              disabled={s.company.cash < campaignCost(s) || p.hype >= 100}
              onClick={() => store.campaign(p.id)}
            >
              Werbung schalten
            </Button>
          </Card>
        ))}
      </div>
      {!s.projects.length && !s.games.length && (
        <Card>
          <Empty title="Erst die Idee. Dann die Bühne.">
            Entwickle dein erstes Spiel, um Marketingkampagnen zu starten.
          </Empty>
        </Card>
      )}
    </>
  );
}
