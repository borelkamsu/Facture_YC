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
  nom: {
    type: String,
    default: ''
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
  const year   = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const last   = await this.constructor.findOne(
    { numero: { $regex: `^${prefix}` } },
    { numero: 1 },
    { sort: { numero: -1 } }
  );
  const seq    = last ? parseInt(last.numero.slice(prefix.length), 10) + 1 : 1;
  this.numero  = `${prefix}${String(seq).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Facture', FactureSchema);
