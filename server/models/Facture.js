const mongoose = require('mongoose');

const LigneSchema = new mongoose.Schema({
  reference: String,
  description: String,
  prixUnitaire: { type: Number, default: 0 },
  quantite: { type: Number, default: 1 },
  montant: { type: Number, default: 0 }
});

const FactureSchema = new mongoose.Schema({
  numero: {
    type: String,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  client: {
    nom: String,
    adresse: String,
    ville: String,
    codePostal: String,
    telephone: String,
    email: String
  },
  lignes: [LigneSchema],
  soustotal: { type: Number, default: 0 },
  tps: { type: Number, default: 0 },
  tvq: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  notes: String
}, {
  timestamps: true
});

FactureSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const count = await this.constructor.countDocuments({
    createdAt: { $gte: yearStart, $lt: yearEnd }
  });
  this.numero = `FAC-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Facture', FactureSchema);
