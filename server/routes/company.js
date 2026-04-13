const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const CompanyInfo = require('../models/CompanyInfo');

const DEFAULTS = {
  nom: 'YOUMBI CONCEPT',
  tagline: 'Solutions professionnelles',
  adresse: '1173 rue Léon Provancher',
  ville: 'Lévis',
  province: 'QC',
  codePostal: 'G7A 0H6',
  telephone: '+1 581 928-4374',
  email: 'youmbiconcepting@gmail.com',
  rbq: '58-50-0893',
  apchq: '208827',
};

function seedLogo() {
  try {
    const logoPath = path.join(__dirname, '../../client/src/img/YC.png');
    const buffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

router.get('/', async (req, res) => {
  try {
    let company = await CompanyInfo.findOne();
    if (!company) {
      company = await CompanyInfo.create({ ...DEFAULTS, logo: seedLogo() });
    }
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const company = await CompanyInfo.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json(company);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
