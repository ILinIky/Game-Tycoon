import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import { Plus } from "lucide-react";
import { Button } from "./ui";
const Studio = lazy(() => import("./views/Studio"));
const Employees = lazy(() => import("./views/Employees"));
const Projects = lazy(() => import("./views/Projects"));
const Games = lazy(() => import("./views/Games"));
const Research = lazy(() => import("./views/Research"));
const Contracts = lazy(() => import("./views/Contracts"));
const Technology = lazy(() => import("./views/Technology"));
const Marketing = lazy(() => import("./views/Marketing"));
const Finance = lazy(() => import("./views/Finance"));
const Market = lazy(() => import("./views/Market"));
const Statistics = lazy(() => import("./views/Statistics"));
const GroupStats = lazy(() => import("./views/GroupStats"));
const Journal = lazy(() => import("./views/Journal"));
const Company = lazy(() => import("./views/Company"));
const Leaderboard = lazy(() => import("./views/Leaderboard"));
const views: Record<string, ComponentType<{ newProject: (sequelOf?: string) => void }>> = {
  Studio: Studio,
  Mitarbeiter: Employees,
  Projekte: Projects,
  Spiele: Games,
  Forschung: Research,
  Aufträge: Contracts,
  Technologie: Technology,
  Marketing: Marketing,
  Finanzen: Finance,
  Markt: Market,
  Statistiken: Statistics,
  Group: GroupStats,
  Journal: Journal,
  Firma: Company,
  Weltrangliste: Leaderboard,
};
export default function Management({
  page,
  newProject,
}: {
  page: string;
  newProject: (sequelOf?: string) => void;
}) {
  const heading: Record<string, [string, string]> = {
    Studio: [
      "Raum für deine Ambitionen.",
      "Ein gutes Studio beginnt mit einem Ort, an dem Ideen wachsen.",
    ],
    Mitarbeiter: [
      "Gute Spiele sind Teamarbeit.",
      "Finde Talente, entwickle Fähigkeiten und achte auf dein Team.",
    ],
    Projekte: [
      "Von der Idee zum Erlebnis.",
      "Behalte Entwicklung, Qualität und deinen nächsten Release im Blick.",
    ],
    Spiele: [
      "Deine kreative Handschrift.",
      "Veröffentlichungen, Kritiken und die Spiele, die dein Studio prägen.",
    ],
    Aufträge: [
      "Aufträge & Publisher.",
      "Verdiene sicheres Geld mit Auftragsarbeiten und finde Partner für große Spiele.",
    ],
    Forschung: [
      "Heute neugierig. Morgen voraus.",
      "Investiere in Wissen und eröffne deinem Team neue Möglichkeiten.",
    ],
    Technologie: [
      "Das Fundament deiner Spiele.",
      "Baue Engines aus erforschten Modulen, verbessere sie und lizenziere sie.",
    ],
    Marketing: [
      "Gib deiner Idee eine Bühne.",
      "Baue Aufmerksamkeit auf und begleite deine Spiele über den Release hinaus.",
    ],
    Finanzen: [
      "Kreativität braucht Freiraum.",
      "Verstehe deine Zahlen und plane den nächsten Schritt.",
    ],
    Markt: [
      "Eine Branche in Bewegung.",
      "Lerne den Markt kennen und finde den richtigen Moment.",
    ],
    Statistiken: [
      "Deine Geschichte in Zahlen.",
      "Jeder Release und jede Entscheidung hinterlassen ihre Spuren.",
    ],
    Group: [
      "Mehr als ein Studio.",
      "Marktwert, Gewinne und Rang deiner Unternehmensgruppe.",
    ],
    Firma: [
      "Dein Studio. Deine Regeln.",
      "Verwalte dein Unternehmen und sichere deinen Fortschritt.",
    ],
    Journal: [
      "Das Studio-Journal.",
      "Die kleinen und großen Momente deiner Unternehmensgeschichte.",
    ],
  };
  const [title, subtitle] = heading[page] ?? heading.Studio;

  const View = views[page] ?? Studio;
  return (
    <>
      {page !== "Weltrangliste" && (
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              STUDIO / {page.toLocaleUpperCase("de-DE")}
            </div>
            <h1>
              {(
                {
                  Studio: "Dein Büro",
                  Mitarbeiter: "Das Team",
                  Projekte: "Spiele in Entwicklung",
                  Spiele: "Deine Veröffentlichungen",
                  Forschung: "Neue Möglichkeiten",
                  Aufträge: "Aufträge & Publisher",
                  Technologie: "Die Engine-Schmiede",
                  Marketing: "Vorhang auf",
                  Finanzen: "Dein Kapital",
                  Markt: "Die Spielebranche",
                  Statistiken: "Deine Studiogeschichte",
                  Group: "Statistik Group",
                  Firma: "Spielstand & Studio",
                  Journal: "Nachrichten aus dem Studio",
                } as Record<string, string>
              )[page] ?? title}
            </h1>
            <p>{subtitle}</p>
          </div>
          {page === "Projekte" && (
            <Button onClick={() => newProject()}>
              <Plus size={17} />
              Neues Spiel entwickeln
            </Button>
          )}
        </div>
      )}
      <Suspense fallback={<p>Dein Studio wird vorbereitet …</p>}>
        <View newProject={newProject} />
      </Suspense>
    </>
  );
}
