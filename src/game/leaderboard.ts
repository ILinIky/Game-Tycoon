import snapshot from "./data/company-market-caps.json";
import type { Company } from "./types";
import { studioValuation } from "./economy/valuation";
import { companyFactor } from "./market/marketCycle";
import type { Merger } from "./types";

export type RankingCurrency = "EUR" | "USD";
export type Sector =
  | "Technologie"
  | "Finanzen"
  | "Gesundheit"
  | "Konsum & Handel"
  | "Energie & Rohstoffe"
  | "Industrie"
  | "Mobilität"
  | "Telekommunikation"
  | "Medien & Spiele"
  | "Immobilien";
export type CompanySector = Sector | "Weitere Branchen";
export interface RankedCompany {
  id: string;
  name: string;
  ticker: string;
  country: string;
  sector: CompanySector;
  gaming: boolean;
  valueUsd: number;
  sourceUrl?: string;
  player: boolean;
  rank: number;
  model?: boolean;
  /** The player's group as its own entry. */
  group?: boolean;
  /** Name of the player's group that owns this company. */
  memberOf?: string;
  /** Companies this one has taken over in the game world. */
  absorbed?: string[];
}
/** Day and owned companies for prices and mergers of the game world. */
export interface RankingMarket {
  day: number;
  seed: number;
  owned: string[];
}
/** The player's group as shown in the ranking. */
export interface RankingGroup {
  name: string;
  /** Group value in euros. */
  value: number;
  /** Tickers of the companies that belong to the group. */
  members: string[];
}

// Broad gameplay filters, rather than investment sector classifications.
const sectorTickers: Partial<Record<Sector, string>> = {
  Finanzen:
    "BRK-B JPM V MA 601939.SS BAC 601288.SS 1398.HK HSBC 601988.SS MS RY GS MUFG WFC C IHC.AE AXP SAN TD ALV.DE CBA.AX BLK D05.SI SCHW 3968.HK SMFG 601628.SS IBKR BBVA UBS 601318.SS UCG.MI BX MFG CB PGR INVE-B.ST ISP.MI COF HDB SPGI BMO BNP.PA 402340.KS 9984.T PRX.AS",
  Gesundheit:
    "LLY JNJ ABBV MRK RO.SW UNH NVS AZN TMO AMGN GILD ABT NVO PFE DHR ISRG VRTX BMY",
  "Konsum & Handel":
    "AMZN WMT COST KO PG PM 600519.SS NESN.SW OR.PA MC.PA ITX.MC PEP MCD RELIANCE.NS RMS.PA TJX BUD 9983.T UL CFR.SW BTI GME TOY.TO ASMDEE-B.ST",
  "Energie & Rohstoffe":
    "2222.SR XOM CVX SHEL GEV 0857.HK LIN BHP TTE SCCO NEE IBE.MC 601088.SS RIO COP 0883.HK ENR.F PBR MPC AI.PA NEM 601899.SS VLO BP",
  Industrie:
    "SPCX CAT GE RTX DE SIE.DE SU.PA ABBN.SW ETN AIR.PA RR.L 6501.T SAF.PA BA GLW LMT PH 6861.T",
  Mobilität: "TSLA TM 300750.SZ UNP UBER 002594.SZ",
  Telekommunikation: "0941.HK VZ TMUS T DTE.DE BHARTIARTL.NS",
  "Medien & Spiele": "NFLX DIS SONY NTES TCEHY SE",
  Immobilien: "WELL PLD",
};
const sectorsByTicker = new Map<string, Sector>();
for (const [sector, tickers] of Object.entries(sectorTickers)) {
  for (const ticker of tickers!.split(" "))
    sectorsByTicker.set(ticker, sector as Sector);
}
for (const ticker of "NVDA AAPL GOOG MSFT TSM META AVGO 005930.KS MU AMD 000660.KS ASML INTC 688825.SS PLTR CSCO LRCX ORCL AMAT DELL PANW ARM CRWD KLAC TXN BABA ANET SNDK 2454.TW MRVL SAP APH IBM ADI QCOM 285A.T SHOP STX CRM 6857.T 8035.T 601138.SS 2308.TW 300308.SZ NOW FTNT 402340.KS ASX ACN NET SNOW U CRSR".split(
  " ",
))
  if (!sectorsByTicker.has(ticker)) sectorsByTicker.set(ticker, "Technologie");
const extraTickers: Partial<Record<Sector, string>> = {
  Mobilität:
    "RACE GM F BMW.DE MBG.DE VOW3.DE P911.DE HMC 7201.T 7269.T 7261.T 000270.KS 005380.KS RIVN LCID LI NIO XPEV CPRT UAL DAL LUV RYAAY LHA.DE AF.PA IAG.L DHL.DE UPS FDX CSX NSC CNI CP ODFL",
  "Konsum & Handel":
    "NKE ADS.DE PUM.DE LULU ROST TGT LOW KR Ahold ATD.TO DG DLTR SBUX YUM CMG DPZ MDLZ HSY KHC GIS K KDP MNST STZ HEIA.AS DGE.L PERNOD-RICARD RKT.L BEI.DE HEN3.DE CL EL KER.PA PPRUY",
  Finanzen:
    "DB ING BCS LYG NWG.L LLOY.L LGEN.L AV.L AIG MET PRU AFL TRV MFC SLF ALL PUK AON MMC WTW AJG ICE CME NDAQ MSCI MCO VRSK PAYX ADP PNC USB TFC FITB HBAN KEY CFG STT NTRS BK DB1.DE MUV2.DE HNR1.DE LSEG.L ACA.PA GLE.PA KBC.BR ERSTE.VI OTP.BD PKO.WA CIB BBD ITUB NU XP SOFI PYPL SQ XYZ COIN HOOD",
  Gesundheit:
    "REGN BIIB MRNA BNTX ZTS SYK BSX MDT EW DXCM IDXX HCA HUM CI CVS ELV CNC MCK CAH COR IQV VEEV RMD A ALC SHL.DE BAYN.DE MRK.DE UCB.BR SAN.PA SNY GSK HLN TAK 4502.T 4519.T 4568.T 4503.T 4507.T 4523.T",
  Industrie:
    "HON MMM EMR ITW ROK DOV IR OTIS CMI CARR TT WAB GWW FAST LHX GD NOC HII TXT TDG HEI HEI-A BAE.L RHM.DE HO.PA DSY.PA DASSAULT-AVIATION STLAM STLA FER.MC ACS.MC DG.PA SIKA.SW HOLN.SW HEI.DE VIE.PA ECL DD DOW BAS.DE LYB PPG SHW APD",
  "Energie & Rohstoffe":
    "EQNR EOG OXY SLB HAL BKR PSX HES FANG DVN VST CEG SO DUK D DTE AEP EXC SRE ETR ED XEL PEG FE WEC ES PCG AES NG.L SSE.L RWE.DE EOAN.DE ENEL.MI ENI PKN.WA NTR FCX VALE RIO.L AAL.L GLEN.L 1211.HK GOLD B WPM FNV AEM TECK NTR PAAS HL AA NUE STLD X 5411.T 5401.T 5406.T",
  Technologie:
    "ADBE INTU SNPS CDNS ADSK TEAM DDOG ZS OKTA S DOCU MDB PATH CRM HPQ HPE LOGI NETAPP NTAP DELL WDC STX HPQ AKAM AVAV ERIC NOK NOKIA.HE 2308.TW 2317.TW 2357.TW 2382.TW 3231.TW 3711.TW 6502.T 6752.T 6758.T 6762.T 6902.T 6971.T 6981.T STM NXPI ON MCHP MPWR FSLR ENPH SEDG SPOT WIX GDDY DUOL RDDT PINS SNAP DASH BKNG ABNB EXPE TRIP MELI CPNG EBAY ETSY JD PDD BIDU 9988.HK 9999.HK 1024.HK 3690.HK 1810.HK 9992.HK 9618.HK 9888.HK",
  Telekommunikation:
    "AMX TEF ORAN VOD VOD.L BT-A.L 9432.T 9433.T 9434.T 0700.HK 0762.HK 0728.HK 017670.KS 032640.KS 2412.TW 3045.TW 4904.TW MTN.JO VIV TIMB TLK CHU CHA",
  "Medien & Spiele":
    "WBD PARA CMCSA FOX FOXA NWS NWSA LBRDK LBRDA LYV WMG UMG.AS NFLX DIS EA TTWO RBLX 7974.T 9684.T 7832.T 9697.T 9766.T",
  Immobilien:
    "AMT CCI EQIX DLR O VICI AVB EQR ESS MAA INVH UDR PSA EXR CUBE SPG VTR ARE BXP HST REG KIM WPC IRM SBAC CSGP VNA.DE",
};
for (const [sector, tickers] of Object.entries(extraTickers))
  for (const ticker of tickers!.split(" "))
    sectorsByTicker.set(ticker, sector as Sector);
function inferSector(name: string, gaming: boolean): CompanySector {
  if (gaming) return "Medien & Spiele";
  if (
    /\bbank\b|bancorp|insurance|financial|banco|assurance|reinsurance|capital partners|securities/i.test(
      name,
    )
  )
    return "Finanzen";
  if (
    /pharma|therapeutics|biotech|laborator|health|medical|medicines|hospital/i.test(
      name,
    )
  )
    return "Gesundheit";
  if (
    /energy|petroleum|oil |gas |mining|copper|resources|electric power|uranium|coal/i.test(
      name,
    )
  )
    return "Energie & Rohstoffe";
  if (
    /airlines|airways|railway|railroad|motors|automotive|logistics|shipping/i.test(
      name,
    )
  )
    return "Mobilität";
  if (/telecom|telecommunication|communications|mobile/i.test(name))
    return "Telekommunikation";
  if (
    /semiconductor|software|microelectronics|technology|technologies|electronics|systems|computer|internet/i.test(
      name,
    )
  )
    return "Technologie";
  if (/realty|properties|real estate|reit|land securities/i.test(name))
    return "Immobilien";
  if (
    /foods|beverage|brewer|retail|restaurants|supermarket|consumer|cosmetics/i.test(
      name,
    )
  )
    return "Konsum & Handel";
  if (
    /steel|cement|chemical|industries|industrial|aerospace|machinery|construction/i.test(
      name,
    )
  )
    return "Industrie";
  return "Weitere Branchen";
}
export const marketSnapshot = {
  retrievedOn: snapshot.retrievedOn,
  fxDate: snapshot.fxDate,
  usdPerEur: snapshot.usdPerEur,
  sources: snapshot.sources,
  fxSource: snapshot.fxSource,
};
export const realCompanies: Omit<RankedCompany, "rank">[] =
  snapshot.companies.map((entry) => ({
    id: entry.ticker,
    name: entry.name,
    ticker: entry.ticker,
    country: entry.country,
    sector:
      sectorsByTicker.get(entry.ticker) ??
      (entry.gaming &&
      entry.ticker !== "MSFT" &&
      entry.ticker !== "U" &&
      entry.ticker !== "CRSR"
        ? "Medien & Spiele"
        : inferSector(entry.name, false)),
    gaming: entry.gaming,
    valueUsd: entry.marketCapUsd,
    sourceUrl: entry.sourceUrl,
    player: false,
  }));

function seeded(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/**
 * Mergers of real companies in the game world: two per year since 1991,
 * derived from the save's seed so they stay the same on every load. Smaller
 * companies are bought by bigger ones, preferably from the same sector.
 * Companies owned by the player are never taken over.
 */
export function marketMergers({ day, seed, owned }: RankingMarket): Merger[] {
  const year = new Date(Date.UTC(1990, 0, 1 + day)).getUTCFullYear();
  const taken = new Set<string>();
  const ownedSet = new Set(owned);
  const sorted = [...realCompanies].sort((a, b) => b.valueUsd - a.valueUsd);
  const mergers: Merger[] = [];
  for (let y = 1991; y <= year; y++) {
    const rng = seeded(seed ^ (y * 2654435761));
    for (let n = 0; n < 2; n++) {
      const mergerDay =
        Math.round((Date.UTC(y, 0, 1) - Date.UTC(1990, 0, 1)) / 86400000) +
        Math.floor(rng() * 360);
      const acquirer = sorted[Math.floor(rng() * 300)];
      const pool = sorted.filter(
        (c) =>
          c.id !== acquirer.id &&
          !taken.has(c.id) &&
          !ownedSet.has(c.id) &&
          c.valueUsd < acquirer.valueUsd * 0.35 &&
          c.valueUsd > acquirer.valueUsd * 0.01,
      );
      const sameSector = pool.filter((c) => c.sector === acquirer.sector);
      const choices = sameSector.length ? sameSector : pool;
      if (
        !choices.length ||
        taken.has(acquirer.id) ||
        ownedSet.has(acquirer.id) ||
        mergerDay > day
      )
        continue;
      const target = choices[Math.floor(rng() * choices.length)];
      taken.add(target.id);
      mergers.push({
        day: mergerDay,
        acquirer: acquirer.id,
        target: target.id,
      });
    }
  }
  return mergers.sort((a, b) => b.day - a.day);
}

/** Real companies with today's share prices and all mergers applied. */
export function worldCompanies(market: RankingMarket) {
  const mergers = marketMergers(market);
  const gone = new Set(mergers.map((m) => m.target));
  const byId = new Map(realCompanies.map((c) => [c.id, c]));
  const extra = new Map<string, { value: number; names: string[] }>();
  for (const m of [...mergers].reverse()) {
    const target = byId.get(m.target)!;
    const prior = extra.get(m.target);
    const add = extra.get(m.acquirer) ?? { value: 0, names: [] };
    add.value += target.valueUsd + (prior?.value ?? 0);
    add.names.push(target.name);
    extra.set(m.acquirer, add);
  }
  return realCompanies
    .filter((c) => !gone.has(c.id))
    .map((c) => {
      const merged = extra.get(c.id);
      const baseUsd = c.valueUsd + (merged?.value ?? 0);
      return {
        ...c,
        baseUsd,
        valueUsd: baseUsd * companyFactor(c.id, market.day),
        ...(merged ? { absorbed: merged.names } : {}),
      };
    });
}

export function buildRanking(
  company: Company,
  group?: RankingGroup | null,
  market?: RankingMarket,
): RankedCompany[] {
  const members = new Set(group?.members ?? []);
  const companies = market ? worldCompanies(market) : realCompanies;
  const entries: Omit<RankedCompany, "rank">[] = [
    ...companies.map((entry) =>
      group && members.has(entry.id)
        ? { ...entry, memberOf: group.name }
        : entry,
    ),
    {
      id: "player-studio",
      name: company.name,
      ticker: "DEIN STUDIO",
      country: "",
      sector: "Medien & Spiele" as Sector,
      gaming: true,
      valueUsd: studioValuation(company) * marketSnapshot.usdPerEur,
      player: true,
    },
    ...(group
      ? [
          {
            id: "player-group",
            name: group.name,
            ticker: "DEINE GROUP",
            country: "",
            sector: "Medien & Spiele" as Sector,
            gaming: true,
            valueUsd: group.value * marketSnapshot.usdPerEur,
            player: false,
            group: true,
          },
        ]
      : []),
  ].sort(
    (a, b) =>
      b.valueUsd - a.valueUsd ||
      Number(a.player || !!a.group) - Number(b.player || !!b.group) ||
      a.id.localeCompare(b.id),
  );
  let rank = 1;
  return entries.map((entry, index) => {
    if (index && entry.valueUsd !== entries[index - 1].valueUsd)
      rank = index + 1;
    return { ...entry, rank };
  });
}

export function rankingValue(valueUsd: number, currency: RankingCurrency) {
  return currency === "USD" ? valueUsd : valueUsd / marketSnapshot.usdPerEur;
}
export function formatRankingValue(
  valueUsd: number,
  currency: RankingCurrency,
  full = false,
) {
  const value = rankingValue(valueUsd, currency);
  if (full || value < 1_000_000)
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  const units: [number, string][] = [
    [1e12, "Bio."],
    [1e9, "Mrd."],
    [1e6, "Mio."],
  ];
  const [divisor, suffix] = units.find(([limit]) => value >= limit)!;
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value / divisor)} ${suffix} ${currency === "EUR" ? "€" : "$"}`;
}
const countries = new Intl.DisplayNames(["de"], { type: "region" });
export function countryLabel(code: string) {
  return code ? (countries.of(code) ?? code) : "Dein Spielstand";
}
export function snapshotDate(date: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Gameplay assumptions, NOT a measured global valuation distribution. */
export const WORLD_COMPANY_COUNT = 200_000_000;
export const WORLD_MODEL_ANCHORS: [number, number][] = [
  [0, WORLD_COMPANY_COUNT - realCompanies.length - 1],
  [10_000, 120_000_000],
  [25_000, 65_000_000],
  [50_000, 35_000_000],
  [100_000, 20_000_000],
  [250_000, 8_000_000],
  [500_000, 3_500_000],
  [1_000_000, 1_500_000],
  [5_000_000, 250_000],
  [10_000_000, 100_000],
  [50_000_000, 22_000],
  [100_000_000, 12_000],
  [500_000_000, 2_800],
  [1_000_000_000, 1_500],
  [10_000_000_000, 180],
  [100_000_000_000, 35],
  [1_000_000_000_000, 3],
  [5_000_000_000_000, 0],
];
export function estimatedWorldRank(valueUsd: number) {
  const eur = Math.max(0, rankingValue(valueUsd, "EUR"));
  let additional = 0;
  for (let index = 1; index < WORLD_MODEL_ANCHORS.length; index++) {
    const [highValue, highCount] = WORLD_MODEL_ANCHORS[index];
    if (eur > highValue) continue;
    const [lowValue, lowCount] = WORLD_MODEL_ANCHORS[index - 1];
    const ratio =
      (Math.log1p(eur) - Math.log1p(lowValue)) /
      (Math.log1p(highValue) - Math.log1p(lowValue));
    additional = Math.round(lowCount + (highCount - lowCount) * ratio);
    break;
  }
  return Math.min(
    WORLD_COMPANY_COUNT,
    1 +
      additional +
      realCompanies.filter((entry) => entry.valueUsd > valueUsd).length,
  );
}
export function formatWorldRank(rank: number) {
  const magnitude =
    10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, rank))) - 2);
  return `≈ #${new Intl.NumberFormat("de-DE").format(Math.round(rank / magnitude) * magnitude)}`;
}
export const WORLD_MILESTONES: [number, string][] = [
  [10_000, "Kreativatelier"],
  [25_000, "Einzelunternehmen"],
  [50_000, "Kleines Indie-Studio"],
  [75_000, "Lokales Spiele-Studio"],
  [100_000, "Etabliertes Indie-Studio"],
  [250_000, "Kleines Softwarehaus"],
  [500_000, "Wachsendes Kreativteam"],
  [1e6, "Millionenunternehmen"],
  [2.5e6, "Etabliertes Softwarehaus"],
  [5e6, "Regionaler Publisher"],
  [10e6, "Mittelständisches Studio"],
  [25e6, "Überregionaler Publisher"],
  [50e6, "Internationales Studio"],
  [100e6, "Großer Publisher"],
  [250e6, "Unternehmensgruppe"],
  [500e6, "Internationaler Publisher"],
  [1e9, "Milliardenunternehmen"],
  [2.5e9, "Branchenführer"],
  [5e9, "Globaler Publisher"],
  [10e9, "Weltkonzern"],
  [25e9, "Internationaler Konzern"],
  [50e9, "Globale Unternehmensgruppe"],
  [100e9, "Globales Imperium"],
  [250e9, "Globaler Marktführer"],
  [500e9, "Wirtschaftsgigant"],
  [1e12, "Billionenunternehmen"],
  [2.5e12, "Weltwirtschaftsgröße"],
  [5e12, "Weltspitze"],
  [10e12, "Legende"],
];
export function worldMilestone(entry: [number, string]): RankedCompany {
  const [eur, name] = entry;
  const valueUsd = eur * marketSnapshot.usdPerEur;
  return {
    id: `model-${eur}`,
    name,
    ticker: "MODELLSTUFE",
    country: "",
    sector: "Medien & Spiele",
    gaming: true,
    valueUsd,
    player: false,
    rank: estimatedWorldRank(valueUsd),
    model: true,
  };
}
export function worldNeighborhood(
  company: Company,
  group?: RankingGroup | null,
  market?: RankingMarket,
): RankedCompany[] {
  const ranking = buildRanking(company, group, market);
  const own = ranking.find((entry) => entry.player)!;
  const ownGroup = ranking.find((entry) => entry.group);
  const entries = [
    ...WORLD_MILESTONES.filter(([eur]) => eur !== studioValuation(company)).map(
      worldMilestone,
    ),
    { ...own, rank: estimatedWorldRank(own.valueUsd) },
    ...(ownGroup
      ? [{ ...ownGroup, rank: estimatedWorldRank(ownGroup.valueUsd) }]
      : []),
  ].sort((a, b) => b.valueUsd - a.valueUsd);
  const index = entries.findIndex((entry) => entry.player);
  const groupIndex = entries.findIndex((entry) => entry.group);
  const from = Math.min(index, groupIndex < 0 ? index : groupIndex);
  const to = Math.max(index, groupIndex);
  return entries.slice(Math.max(0, from - 3), to + 4);
}
