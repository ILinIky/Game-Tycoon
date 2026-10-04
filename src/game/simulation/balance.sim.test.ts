// @ts-nocheck -- optional balance tool, uses Node APIs
/**
 * Long-term balance check with a scripted player. Skipped by default (slow).
 * Run: SIM_OUT=sim.txt SIM_YEARS=20 npx vitest run src/game/simulation/balance.sim.test.ts
 */
import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { simulate } from "./bot";

it.skipIf(!process.env.SIM_OUT)(
  "simuliert einen Langzeit-Spielverlauf",
  () => {
    const { rows } = simulate(Number(process.env.SIM_YEARS ?? 20));
    writeFileSync(process.env.SIM_OUT, rows.join("\n"));
  },
  600000,
);
