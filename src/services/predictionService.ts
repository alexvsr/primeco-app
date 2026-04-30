/**
 * Prime&Co Ops — Service de prédiction
 *
 * Régression linéaire calibrée pour estimer le chiffre d'affaires
 * d'une soirée au Stade de Genève et recommander des quantités de stock
 * par article, en fonction de l'affluence prévue et du type de compétition.
 *
 * Formule : CA = 7.10 × spectateurs + 20506 × est_européen − 2020 × est_weekend + 4103
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface QuantileRow {
  article: string;
  sl_p25: number;
  sl_p50: number;
  sl_p75: number;
  sl_max: number;
  eu_p50: number;
  eu_max: number;
}

export interface Recommendation {
  article: string;
  p25: number;
  p50: number;
  p75: number;
  recommande: number;
  note: string;
}

export interface PredictionResult {
  eventId: number;
  spectateurs: number;
  est_europeen: boolean;
  est_weekend: boolean;
  ca_predit_chf: number;
  confiance: "faible" | "normal";
  recommandations: Recommendation[];
}

// ─── Coefficients de la régression ──────────────────────────────────────────────

const COEF_SPECTATEURS = 7.10;
const COEF_EUROPEEN = 20506;
const COEF_WEEKEND = -2020;
const INTERCEPT = 4103;

// ─── Quantiles historiques par article ──────────────────────────────────────────

export const QUANTILE_TABLE: QuantileRow[] = [
  { article: "Cardinal 4dl",       sl_p25:  412, sl_p50: 1611, sl_p75: 2365, sl_max: 4385, eu_p50: 3957, eu_max: 8737 },
  { article: "Servettienne 4dl",   sl_p25:  480, sl_p50:  537, sl_p75:  715, sl_max: 1081, eu_p50: 1738, eu_max: 2067 },
  { article: "Frites",             sl_p25:  472, sl_p50:  531, sl_p75:  614, sl_max: 1199, eu_p50:  817, eu_max:  933 },
  { article: "Nestea Citron 4dl",  sl_p25:  302, sl_p50:  356, sl_p75:  449, sl_max:  730, eu_p50:  702, eu_max:  746 },
  { article: "Pepsi 4dl",          sl_p25:   47, sl_p50:  241, sl_p75:  380, sl_max:  819, eu_p50:  510, eu_max: 1099 },
  { article: "Hot Dog",            sl_p25:   87, sl_p50:  208, sl_p75:  333, sl_max:  747, eu_p50:  658, eu_max:  679 },
  { article: "Nuggets x10",        sl_p25:  112, sl_p50:  139, sl_p75:  169, sl_max:  226, eu_p50:  273, eu_max:  300 },
  { article: "Saucisses + Frites", sl_p25:   69, sl_p50:   88, sl_p75:  123, sl_max:  153, eu_p50:  270, eu_max:  320 },
  { article: "Eau Plate 4dl",      sl_p25:    9, sl_p50:   78, sl_p75:  182, sl_max:  650, eu_p50:  255, eu_max:  857 },
  { article: "Haribo Dragibus",    sl_p25:   66, sl_p50:   74, sl_p75:  117, sl_max:  164, eu_p50:  117, eu_max:  154 },
];

// ─── Calcul du CA prédit ────────────────────────────────────────────────────────

/**
 * Calcule le chiffre d'affaires estimé pour un match.
 */
export function calculerCA(
  spectateurs: number,
  estEuropeen: boolean,
  estWeekend: boolean
): number {
  const ca =
    COEF_SPECTATEURS * spectateurs +
    COEF_EUROPEEN * (estEuropeen ? 1 : 0) +
    COEF_WEEKEND * (estWeekend ? 1 : 0) +
    INTERCEPT;

  return Math.round(ca);
}

// ─── Niveau de confiance ────────────────────────────────────────────────────────

/**
 * Évalue la confiance de la prédiction selon la plage d'entraînement.
 */
export function evaluerConfiance(spectateurs: number): "faible" | "normal" {
  if (spectateurs < 3000 || spectateurs > 30000) return "faible";
  return "normal";
}

// ─── Sélection du quantile recommandé ───────────────────────────────────────────

/**
 * Choisit la valeur recommandée et génère la note explicative.
 *
 * Logique :
 *  - Match européen          → P50 européen
 *  - spectateurs < 6 000     → P25 Super League
 *  - 6 000 ≤ spec ≤ 12 000   → P50 Super League
 *  - spectateurs > 12 000    → P75 Super League
 */
export function selectionnerQuantile(
  row: QuantileRow,
  spectateurs: number,
  estEuropeen: boolean
): { recommande: number; note: string } {
  if (estEuropeen) {
    return {
      recommande: row.eu_p50,
      note: "Match européen — recommandation médiane européenne (P50 EU)",
    };
  }

  if (spectateurs < 6000) {
    return {
      recommande: row.sl_p25,
      note: "Affluence modérée (< 6 000) — recommandation basse (P25)",
    };
  }

  if (spectateurs <= 12000) {
    return {
      recommande: row.sl_p50,
      note: "Affluence standard (6 000 – 12 000) — recommandation médiane (P50)",
    };
  }

  // spectateurs > 12000
  return {
    recommande: row.sl_p75,
    note: "Soirée à forte affluence (> 12 000) — recommandation haute (P75)",
  };
}

// ─── Construction des recommandations ───────────────────────────────────────────

/**
 * Génère les recommandations de stock pour tous les articles.
 */
export function genererRecommandations(
  spectateurs: number,
  estEuropeen: boolean
): Recommendation[] {
  return QUANTILE_TABLE.map((row) => {
    const { recommande, note } = selectionnerQuantile(row, spectateurs, estEuropeen);
    return {
      article: row.article,
      p25: estEuropeen ? row.eu_p50 : row.sl_p25,
      p50: estEuropeen ? row.eu_p50 : row.sl_p50,
      p75: estEuropeen ? row.eu_max : row.sl_p75,
      recommande,
      note,
    };
  });
}

// ─── Détection du type de compétition ───────────────────────────────────────────

/**
 * Détermine si un événement est européen à partir du nom.
 * Cherche des mots‑clés courants : Conference League, Europa League, Champions League, etc.
 */
export function detecterCompetitionEuropeenne(eventName: string): boolean {
  const lower = eventName.toLowerCase();
  const motsCles = [
    "conference league",
    "europa league",
    "champions league",
    "ligue des champions",
    "coupe d'europe",
    "européen",
    "europeen",
    "uecl",
    "uel",
    "ucl",
    "europe",
  ];
  return motsCles.some((m) => lower.includes(m));
}

// ─── Détection week-end ─────────────────────────────────────────────────────────

/**
 * Indique si la date tombe un samedi (6) ou un dimanche (0).
 */
export function estWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// ─── Point d'entrée du service ──────────────────────────────────────────────────

/**
 * Calcule la prédiction complète pour un événement donné.
 */
export function predire(
  eventId: number,
  spectateurs: number,
  eventName: string,
  eventDate: Date
): PredictionResult {
  const estEuropeen = detecterCompetitionEuropeenne(eventName);
  const weekend = estWeekend(eventDate);

  const caPreditChf = calculerCA(spectateurs, estEuropeen, weekend);
  const confiance = evaluerConfiance(spectateurs);
  const recommandations = genererRecommandations(spectateurs, estEuropeen);

  return {
    eventId,
    spectateurs,
    est_europeen: estEuropeen,
    est_weekend: weekend,
    ca_predit_chf: caPreditChf,
    confiance,
    recommandations,
  };
}
