/**
 * Script d'injection des articles de base dans MongoDB.
 * Usage : node server/seedArticles.js
 *
 * - Insère uniquement les articles qui n'existent pas encore (upsert par référence).
 * - N'écrase PAS les prix existants si l'article est déjà présent.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/facturedb';

const ArticleSchema = new mongoose.Schema({
  reference:    { type: String, required: true, unique: true, trim: true, uppercase: true },
  description:  { type: String, required: true, trim: true },
  prixUnitaire: { type: Number, required: false, min: 0, default: null }
}, { timestamps: true });

const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema);

// ──────────────────────────────────────────────────────────────────────────────
// Liste des articles  (référence + description + prix optionnel)
// Ajoutez / modifiez les prix ici avant de lancer le script.
// ──────────────────────────────────────────────────────────────────────────────
const articles = [
  // ── Pavés & dalles ──────────────────────────────────────────────────────────
  { reference: 'PM 80',        description: 'PAVÉ 80mm',                         prixUnitaire: null   },
  { reference: 'DM 60',        description: 'DALLE 60mm',                        prixUnitaire: null   },
  { reference: 'Pse.PM80',     description: 'POSE DALLE 80',                     prixUnitaire: 14.00  },
  { reference: 'PH',           description: 'PAVÉS HIGHTOR MJ',                  prixUnitaire: null   },

  // ── Murets ──────────────────────────────────────────────────────────────────
  { reference: 'M-RENO',       description: 'MURET RENO',                        prixUnitaire: null   },
  { reference: 'Pse.M-RENO',   description: 'POSE MURET RENO',                   prixUnitaire: null   },
  { reference: 'MURET 180',    description: 'MURET TANDEM 180',                  prixUnitaire: null   },
  { reference: 'STRUC 180',    description: 'TANDEM NEXT 180',                   prixUnitaire: null   },
  { reference: 'M.Y',          description: 'MURET YOUKA',                       prixUnitaire: null   },
  { reference: 'Pse.M.Y',      description: 'POSE MURET YOUKA',                  prixUnitaire: null   },
  { reference: 'MV',           description: 'MURRET VARIO 13',                   prixUnitaire: null   },
  { reference: 'MP',           description: 'MURRET POLYVALENT',                 prixUnitaire: null   },

  // ── Tallu & bordures ────────────────────────────────────────────────────────
  { reference: 'TAL.U',        description: 'TALLU UNIVERS',                     prixUnitaire: null   },
  { reference: 'P.TAL.U',      description: 'POSE TALLU UNIVERS',                prixUnitaire: null   },
  { reference: 'BU',           description: 'BORDURE UNIVERS',                   prixUnitaire: null   },
  { reference: 'P.BU',         description: 'POSE BORDURE UNIVERS',              prixUnitaire: 8.00   },
  { reference: 'Bmo',          description: 'BORDURE MODERNE',                   prixUnitaire: 10.00  },
  { reference: 'Pse.Bmo',      description: 'POSE BORDURE MODERNE',              prixUnitaire: 5.00   },
  { reference: 'BM',           description: 'MODULE DE DÉPART',                  prixUnitaire: null   },

  // ── Margelles ───────────────────────────────────────────────────────────────
  { reference: 'MJ',           description: 'MARGELLES 5,6"',                    prixUnitaire: null   },
  { reference: 'M. G.T',       description: 'MARGELLES G.T',                     prixUnitaire: 200.00 },
  { reference: 'P.M.G.T',      description: 'POSE MARGELLES G.T',                prixUnitaire: 50.00  },

  // ── Pas japonets ────────────────────────────────────────────────────────────
  { reference: 'PAS.J',        description: 'PAS JAPONETS',                      prixUnitaire: null   },
  { reference: 'P.PAS.J',      description: 'POSE PAS JAPONETS',                 prixUnitaire: null   },

  // ── Marches ─────────────────────────────────────────────────────────────────
  { reference: 'Pse.marche-c', description: 'POSE MARCHE COMPOSITE',             prixUnitaire: 65.00  },

  // ── Gazon & végétaux ────────────────────────────────────────────────────────
  { reference: 'GR',           description: 'GAZON',                             prixUnitaire: null   },
  { reference: 'P-GR',         description: 'POSE GAZON',                        prixUnitaire: 1.50   },
  { reference: 'Pse.GR',       description: 'POSE GAZON',                        prixUnitaire: 1.50   },
  { reference: 'TAG',          description: 'TERRE À GAZON',                     prixUnitaire: null   },
  { reference: 'TAP',          description: 'TERRE À PLANTATION',                prixUnitaire: 65.00  },
  { reference: 'FER',          description: 'FERTILISANT',                       prixUnitaire: null   },
  { reference: 'ARB',          description: 'ARBUSTE',                           prixUnitaire: null   },
  { reference: 'B.FLEUR',      description: 'BACK À FLEUR',                      prixUnitaire: 65.00  },
  { reference: 'P.GABANE',     description: 'PRÉPARATION GABANIÈRE',             prixUnitaire: 300.00 },

  // ── Granulats & pierre ──────────────────────────────────────────────────────
  { reference: 'P0,3/4',       description: 'PIERRE 0,3/4',                      prixUnitaire: null   },
  { reference: 'P3/4',         description: 'PIERRE 3/4',                        prixUnitaire: null   },
  { reference: 'GAL',          description: 'GALLET DE RIVIÈRE',                 prixUnitaire: null   },

  // ── Drains & toile ──────────────────────────────────────────────────────────
  { reference: 'TG',           description: 'TOILE GÉOTEXTILE',                  prixUnitaire: null   },
  { reference: 'DF40',         description: 'DRAIN FLEXIBLE 40',                 prixUnitaire: null   },
  { reference: 'D.E.G',        description: 'DRAIN ENTRÉE GARAGE',               prixUnitaire: null   },
  { reference: 'INS.P.SEC',    description: 'INSTALLATION PUITS SEC',            prixUnitaire: 500.00 },

  // ── Préparation & travaux ───────────────────────────────────────────────────
  { reference: 'PS-AS',        description: 'PRÉPARATION DU SOL',                prixUnitaire: null   },
  { reference: 'P.S.G',        description: 'PROPRETÉ SOUS LA DALLE/GAZON',      prixUnitaire: 300.00 },
  { reference: 'P.S.Cab',      description: 'PRÉPARATION SUPPORT CABINET',       prixUnitaire: null   },
  { reference: 'DEFRI',        description: 'DÉFRICHAGE',                        prixUnitaire: null   },
  { reference: 'EXC',          description: 'EXCAVATRICE U1',                    prixUnitaire: null   },

  // ── Divers ──────────────────────────────────────────────────────────────────
  { reference: 'Pse.PM60',     description: 'POSE PAVÉ MÉLANGE 60',              prixUnitaire: null   },
];

// ──────────────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connecté à MongoDB:', MONGODB_URI);

  let inserted = 0;
  let skipped  = 0;

  for (const art of articles) {
    const exists = await Article.findOne({ reference: art.reference.toUpperCase() });
    if (exists) {
      console.log(`  ⏭  Déjà présent : ${art.reference}`);
      skipped++;
    } else {
      await Article.create(art);
      console.log(`  ✅ Inséré       : ${art.reference} — ${art.description}`);
      inserted++;
    }
  }

  console.log(`\nTerminé. ${inserted} article(s) inséré(s), ${skipped} ignoré(s).`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
