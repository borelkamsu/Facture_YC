const mongoose = require('mongoose');

const ModaliteSchema = new mongoose.Schema({
  montant:     { type: Number, default: 0 },
  description: { type: String, default: '' }
}, { _id: false });

const ContratSchema = new mongoose.Schema({
  numero:        { type: String, unique: true },
  factureId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Facture', default: null },
  factureNumero: { type: String, default: '' },
  date:          { type: Date, default: Date.now },
  dateDebut:     { type: Date, default: null },
  client: {
    nom:        { type: String, default: '' },
    adresse:    { type: String, default: '' },
    ville:      { type: String, default: '' },
    codePostal: { type: String, default: '' },
    telephone:  { type: String, default: '' },
    email:      { type: String, default: '' }
  },
  phraseAccroche: {
    type:    String,
    default: "Réalisation des travaux d'aménagement paysager énuméré comme suit :"
  },
  items:          [{ type: String }],
  contenuLibre:   { type: String, default: '' },
  modalites:      [ModaliteSchema],
  total:          { type: Number, default: 0 },
  totalEnLettres: { type: String, default: '' },
  notes:          { type: String, default: '' }
}, { timestamps: true });

ContratSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const year   = new Date().getFullYear();
  const prefix = `CON-${year}-`;
  const last   = await this.constructor.findOne(
    { numero: { $regex: `^${prefix}` } },
    { numero: 1 },
    { sort: { numero: -1 } }
  );
  const seq    = last ? parseInt(last.numero.slice(prefix.length), 10) + 1 : 1;
  this.numero  = `${prefix}${String(seq).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Contrat', ContratSchema);
