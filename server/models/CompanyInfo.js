const mongoose = require('mongoose');

const CompanyInfoSchema = new mongoose.Schema({
  nom: { type: String, default: 'YOUMBI CONCEPT' },
  tagline: { type: String, default: 'Solutions professionnelles' },
  adresse: { type: String, default: '1173 rue Léon Provancher' },
  ville: { type: String, default: 'Lévis' },
  province: { type: String, default: 'QC' },
  codePostal: { type: String, default: 'G7A 0H6' },
  telephone: { type: String, default: '+1 581 928-4374' },
  email: { type: String, default: 'youmbiconcepting@gmail.com' },
  rbq: { type: String, default: '58-50-0893' },
  apchq: { type: String, default: '208827' },
  logo: { type: String, default: '' },
}, {
  timestamps: true
});

module.exports = mongoose.model('CompanyInfo', CompanyInfoSchema);
