# Studio Zero – UI-Konventionen

- Dropdowns immer mit `src/components/game/GameSelect.tsx` umsetzen. Keine nativen sichtbaren `<select>`-Elemente hinzufügen. Die gemeinsame Komponente bietet Spieldesign, kompakte HUD-Variante, Tastaturbedienung und ein Portal gegen abgeschnittene Menüs.
- Formularfelder nebeneinander erhalten dieselbe Höhe und ausgerichtete Beschriftungen. Lange Texte werden im Trigger gekürzt; das Auswahlmenü zeigt sie vollständig.
- Aktionsbuttons mit Kosten verwenden `Button` aus `src/components/ui.tsx` mit `detail={money(cost)}`. Aktion und Betrag stehen untereinander; die einheitliche Breite bleibt erhalten.
- UI-Animationen respektieren `useStudioMotion`. Büro und Kamerabedienung beim normalen Spielen freihalten.
