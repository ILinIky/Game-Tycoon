import type { Platform } from "../types";

/**
 * Fictional platforms with life cycles. `share` is the peak market weight,
 * `year`/`end` the launch and the last year on sale. Licenses in 1990 euros.
 */
export const PLATFORMS: Platform[] = [
  { id: "pc", name: "Personal Computer", share: 50, license: 0, year: 1990, power: 40, audience: "Teen", kind: "pc" },
  { id: "arc", name: "Arcadia 16", share: 32, license: 3500, year: 1990, end: 1997, power: 30, audience: "Everyone", kind: "console", generation: 1 },
  { id: "pocket", name: "Pocket One", share: 13, license: 2200, year: 1991, end: 1998, power: 18, audience: "Everyone", kind: "handheld", generation: 1 },
  { id: "prism", name: "Prism 32", share: 42, license: 9000, year: 1994, end: 2002, power: 65, audience: "Mature", kind: "console", generation: 2 },
  { id: "nova", name: "Nova 64", share: 38, license: 9500, year: 1996, end: 2003, power: 70, audience: "Everyone", kind: "console", generation: 2 },
  { id: "pocketc", name: "Pocket Color", share: 18, license: 4000, year: 1998, end: 2005, power: 26, audience: "Everyone", kind: "handheld", generation: 2 },
  { id: "prism2", name: "Prism 2", share: 50, license: 14000, year: 2000, end: 2009, power: 120, audience: "Mature", kind: "console", generation: 3 },
  { id: "orbit", name: "Orbit", share: 34, license: 13000, year: 2001, end: 2008, power: 125, audience: "Teen", kind: "console", generation: 3 },
  { id: "pocketd", name: "Pocket Duo", share: 26, license: 6000, year: 2004, end: 2013, power: 45, audience: "Everyone", kind: "handheld", generation: 3 },
  { id: "prism3", name: "Prism 3", share: 44, license: 20000, year: 2006, end: 2014, power: 260, audience: "Mature", kind: "console", generation: 4 },
  { id: "arcm", name: "Arcadia Motion", share: 46, license: 15000, year: 2006, end: 2013, power: 140, audience: "Everyone", kind: "console", generation: 4 },
  { id: "phone", name: "Smartphone", share: 45, license: 1500, year: 2008, power: 80, audience: "Everyone", kind: "mobile" },
  { id: "orbit2", name: "Orbit One", share: 48, license: 22000, year: 2013, end: 2021, power: 480, audience: "Teen", kind: "console", generation: 5 },
  { id: "prism4", name: "Prism 4", share: 50, license: 22000, year: 2013, end: 2021, power: 500, audience: "Mature", kind: "console", generation: 5 },
  { id: "arcf", name: "Arcadia Flex", share: 44, license: 16000, year: 2017, end: 2026, power: 300, audience: "Everyone", kind: "handheld", generation: 6 },
  { id: "cloud", name: "Cloud Play", share: 26, license: 8000, year: 2019, power: 600, audience: "Teen", kind: "cloud" },
  { id: "prism5", name: "Prism 5", share: 50, license: 26000, year: 2020, power: 1000, audience: "Mature", kind: "console", generation: 6 },
  { id: "orbitx", name: "Orbit X", share: 40, license: 26000, year: 2020, power: 980, audience: "Teen", kind: "console", generation: 6 },
];
