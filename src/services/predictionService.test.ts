/**
 * Tests unitaires — predictionService
 *
 * Exécution : npx ts-node src/services/predictionService.test.ts
 * (pas de dépendance Jest requise — assertions natives Node)
 */

import {
  calculerCA,
  evaluerConfiance,
  selectionnerQuantile,
  genererRecommandations,
  detecterCompetitionEuropeenne,
  estWeekend,
  predire,
  QUANTILE_TABLE,
} from "./predictionService";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

// ── calculerCA ──────────────────────────────────────────────────────────────────

console.log("\n🧪 calculerCA");

// Cas nominal : Super League, jour de semaine
assert(
  calculerCA(12000, false, false) === Math.round(7.10 * 12000 + 0 + 0 + 4103),
  "SL semaine 12 000 spec → CA = 89 303"
);

// Match européen, semaine
assert(
  calculerCA(12000, true, false) === Math.round(7.10 * 12000 + 20506 + 0 + 4103),
  "EU semaine 12 000 spec → CA = 109 809"
);

// SL, week-end
assert(
  calculerCA(12000, false, true) === Math.round(7.10 * 12000 + 0 - 2020 + 4103),
  "SL weekend 12 000 spec → CA = 87 283"
);

// Européen + week-end
assert(
  calculerCA(12000, true, true) === Math.round(7.10 * 12000 + 20506 - 2020 + 4103),
  "EU weekend 12 000 spec → CA = 107 789"
);

// 0 spectateurs
assert(
  calculerCA(0, false, false) === 4103,
  "0 spectateurs → CA = intercept (4103)"
);

// 0 spectateurs, européen
assert(
  calculerCA(0, true, false) === 4103 + 20506,
  "0 spectateurs EU → CA = 24 609"
);

// ── evaluerConfiance ────────────────────────────────────────────────────────────

console.log("\n🧪 evaluerConfiance");

assert(evaluerConfiance(12000) === "normal", "12 000 → normal");
assert(evaluerConfiance(3000) === "normal", "3 000 (borne basse) → normal");
assert(evaluerConfiance(30000) === "normal", "30 000 (borne haute) → normal");
assert(evaluerConfiance(2999) === "faible", "2 999 → faible");
assert(evaluerConfiance(30001) === "faible", "30 001 → faible");
assert(evaluerConfiance(0) === "faible", "0 → faible");

// ── selectionnerQuantile ────────────────────────────────────────────────────────

console.log("\n🧪 selectionnerQuantile");

const cardinal = QUANTILE_TABLE[0]; // Cardinal 4dl

// SL, affluence faible
const res1 = selectionnerQuantile(cardinal, 5000, false);
assert(res1.recommande === 412, "SL < 6000 → P25 = 412");
assert(res1.note.includes("P25"), "note mentionne P25");

// SL, affluence standard
const res2 = selectionnerQuantile(cardinal, 8000, false);
assert(res2.recommande === 1611, "SL 6000–12000 → P50 = 1611");

// SL, bornes inclusives
const res2b = selectionnerQuantile(cardinal, 6000, false);
assert(res2b.recommande === 1611, "SL 6000 (borne) → P50 = 1611");

const res2c = selectionnerQuantile(cardinal, 12000, false);
assert(res2c.recommande === 1611, "SL 12000 (borne) → P50 = 1611");

// SL, forte affluence
const res3 = selectionnerQuantile(cardinal, 15000, false);
assert(res3.recommande === 2365, "SL > 12000 → P75 = 2365");

// Match européen
const res4 = selectionnerQuantile(cardinal, 15000, true);
assert(res4.recommande === 3957, "EU → P50 EU = 3957");
assert(res4.note.includes("européen"), "note mentionne européen");

// ── detecterCompetitionEuropeenne ───────────────────────────────────────────────

console.log("\n🧪 detecterCompetitionEuropeenne");

assert(detecterCompetitionEuropeenne("Servette – Chelsea (Conference League)"), "Conference League → true");
assert(detecterCompetitionEuropeenne("Servette - Roma (Europa League)"), "Europa League → true");
assert(detecterCompetitionEuropeenne("SFC vs Bayern (Champions League)"), "Champions League → true");
assert(detecterCompetitionEuropeenne("Match européen spécial"), "européen → true");
assert(!detecterCompetitionEuropeenne("Servette – Lausanne (Super League)"), "Super League → false");
assert(!detecterCompetitionEuropeenne("Servette - Young Boys"), "Nom sans mot-clé → false");

// ── estWeekend ──────────────────────────────────────────────────────────────────

console.log("\n🧪 estWeekend");

// Lundi 28 avril 2025
assert(!estWeekend(new Date("2025-04-28")), "Lundi → false");
// Samedi 26 avril 2025
assert(estWeekend(new Date("2025-04-26")), "Samedi → true");
// Dimanche 27 avril 2025
assert(estWeekend(new Date("2025-04-27")), "Dimanche → true");

// ── genererRecommandations ──────────────────────────────────────────────────────

console.log("\n🧪 genererRecommandations");

const recosSL = genererRecommandations(12000, false);
assert(recosSL.length === 10, "SL → 10 articles");
assert(recosSL[0].article === "Cardinal 4dl", "Premier article = Cardinal 4dl");
assert(recosSL[0].recommande === 1611, "Cardinal SL 12 000 → P50 = 1611");

const recosEU = genererRecommandations(12000, true);
assert(recosEU[0].recommande === 3957, "Cardinal EU → P50 EU = 3957");

// ── predire (intégration) ───────────────────────────────────────────────────────

console.log("\n🧪 predire (intégration)");

const pred = predire(42, 12000, "Servette – Lausanne (Super League)", new Date("2025-04-28"));
assert(pred.eventId === 42, "eventId correct");
assert(pred.spectateurs === 12000, "spectateurs correct");
assert(pred.est_europeen === false, "non européen");
assert(pred.est_weekend === false, "lundi → non week-end");
assert(pred.ca_predit_chf === Math.round(7.10 * 12000 + 4103), "CA prédit correct");
assert(pred.confiance === "normal", "confiance normale");
assert(pred.recommandations.length === 10, "10 recommandations");

const predEU = predire(99, 5000, "Servette – Chelsea (Conference League)", new Date("2025-04-26"));
assert(predEU.est_europeen === true, "européen détecté");
assert(predEU.est_weekend === true, "samedi détecté");
assert(predEU.confiance === "normal", "5000 → confiance normale");
assert(predEU.ca_predit_chf === Math.round(7.10 * 5000 + 20506 - 2020 + 4103), "CA EU+WE correct");

// ── Résumé ──────────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(50));
console.log(`Résultat : ${passed} passed, ${failed} failed`);
console.log("═".repeat(50) + "\n");

if (failed > 0) process.exit(1);
