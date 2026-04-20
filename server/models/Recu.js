const mongoose = require('mongoose');

const RecuSchema = new mongoose.Schema({
  numero:                 { type: String, unique: true },
  contratId:              { type: mongoose.Schema.Types.ObjectId, ref: 'Contrat', default: null },
  contratNumero:          { type: String, default: '' },
  date:                   { type: Date, default: Date.now },
  client: {
    nom:        { type: String, default: '' },
    adresse:    { type: String, default: '' },
    ville:      { type: String, default: '' },
    codePostal: { type: String, default: '' },
    telephone:  { type: String, default: '' },
    email:      { type: String, default: '' }
  },
  montantRecu:             { type: Number, default: 0 },
  montantRecuEnLettres:    { type: String, default: '' },
  resteAPayer:             { type: Number, default: 0 },
  resteAPayerEnLettres:    { type: String, default: '' },
  dateEcheance:            { type: Date, default: null },
  descriptionTravaux:      { type: String, default: '' },
  contenuLibre:            { type: String, default: '' },
  notes:                   { type: String, default: '' }
}, { timestamps: true });

RecuSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const year      = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year + 1, 0, 1);
  const count     = await this.constructor.countDocuments({
    createdAt: { $gte: yearStart, $lt: yearEnd }
  });
  this.numero = `REC-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Recu', RecuSchema);
