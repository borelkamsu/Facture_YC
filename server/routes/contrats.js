const express       = require('express');
const router        = express.Router();
const { getBrowser } = require('../utils/browser');
const path          = require('path');
const fs            = require('fs');
const Contrat       = require('../models/Contrat');
const CompanyInfo   = require('../models/CompanyInfo');
const { nombreEnLettres } = require('../utils/numberToWords');

// ── Logos base64 ─────────────────────────────────────────────────────────────
const ycLogoPath    = path.join(__dirname, '../../client/src/img/Logo-final.png');
const apchqLogoPath = path.join(__dirname, '../../client/src/img/logo-apchq.png');
const ycLogoBase64  = fs.existsSync(ycLogoPath)
  ? 'data:image/png;base64,' + fs.readFileSync(ycLogoPath).toString('base64') : '';
const apchqLogoBase64 = fs.existsSync(apchqLogoPath)
  ? 'data:image/png;base64,' + fs.readFileSync(apchqLogoPath).toString('base64') : '';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(val) {
  return parseFloat(val || 0).toLocaleString('fr-CA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}
function fmtMoney(val) {
  return parseFloat(val || 0).toLocaleString('fr-CA', {
    minimumFractionDigits: 0, maximumFractionDigits: 2
  });
}
function fmtDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-CA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}
function normalizeNom(nom) {
  if (!nom) return '';
  return nom.replace(/youmbi\s+concept(?!\s+inc)/gi, 'YOUMBI CONCEPT INC');
}

// ── Générateur HTML du contrat ────────────────────────────────────────────────
function generateContratHTML(contrat, company) {
  const logo          = company.logo || ycLogoBase64;
  const nomEntreprise = normalizeNom(company.nom);
  const villePostale  = [company.ville, company.province, company.codePostal].filter(Boolean).join('  ');

  const clientAdresse = [
    contrat.client.adresse,
    [contrat.client.ville, contrat.client.codePostal].filter(Boolean).join(' ')
  ].filter(Boolean).join('<br>');

  // Items numérotés
  const itemsHTML = (contrat.items || [])
    .filter(i => i && i.trim())
    .map((item, idx) => `<li>${item.trim()}</li>`)
    .join('');

  // Modalités de paiement
  const modalitesHTML = (contrat.modalites || [])
    .filter(m => m.montant > 0 || m.description)
    .map((m, idx) => {
      const isLast = idx === (contrat.modalites.filter(x => x.montant > 0 || x.description).length - 1);
      return `<div class="modalite-row">
        <span class="modalite-amount">${fmtMoney(m.montant)} $</span>
        <span class="modalite-desc">${m.description || ''}</span>
        <span class="modalite-sep">${isLast ? '.' : ';'}</span>
      </div>`;
    }).join('');

  const totalLettres = contrat.totalEnLettres || nombreEnLettres(Math.round(contrat.total || 0));
  const contenuLibreHTML = contrat.contenuLibre
    ? contrat.contenuLibre.split('\n').map(l => `<p>${l || '&nbsp;'}</p>`).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #111;
      background: #fff;
      font-size: 13px;
      line-height: 1.6;
    }
    .page { padding: 36px 44px; max-width: 820px; margin: 0 auto; position: relative; z-index: 1; }

    /* Filigrane */
    .watermark {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none; z-index: 0;
    }
    .watermark img { width: 520px; opacity: 0.06; transform: rotate(-28deg); }

    /* En-tête */
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 24px; border-bottom: 3px solid #640000; margin-bottom: 28px;
    }
    .brand { display: flex; align-items: flex-start; gap: 14px; }
    .brand-logos { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
    .brand-logo { width: 70px; height: 70px; object-fit: contain; }
    .apchq-logo { width: 70px; height: 30px; object-fit: contain; }
    .brand-logo-placeholder {
      width: 56px; height: 56px; background: #640000; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 20px; font-weight: 800;
    }
    .brand-name { font-size: 22px; font-weight: 800; color: #640000; letter-spacing: -0.3px; }
    .brand-profession { color: #333; font-size: 11px; margin-top: 2px; font-weight: 600; }
    .brand-license { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
    .license-tag {
      background: #fdf0f0; border: 1px solid #e8b0b0; color: #640000;
      font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 10px;
    }
    .doc-meta { text-align: right; }
    .doc-label { font-size: 32px; font-weight: 800; color: #111; letter-spacing: 3px; text-transform: uppercase; }
    .doc-num   { color: #640000; font-size: 15px; font-weight: 700; margin-top: 4px; }
    .doc-date  { color: #555; font-size: 12px; margin-top: 2px; }
    .badge {
      display: inline-block; margin-top: 8px; background: #640000; color: #fff;
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }

    /* Parties */
    .parties { display: flex; justify-content: space-between; margin-bottom: 28px; gap: 20px; }
    .party { flex: 1; }
    .party-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1.2px; color: #888; margin-bottom: 6px;
    }
    .party-name { font-size: 15px; font-weight: 700; color: #000; }
    .party-detail { color: #444; font-size: 12px; margin-top: 4px; line-height: 1.7; }
    .party.right { text-align: right; }

    /* Section */
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;
      color: #640000; border-bottom: 2px solid #640000; padding-bottom: 5px; margin-bottom: 12px;
    }

    /* Phrase accroche + items */
    .accroche { font-size: 13px; font-style: italic; margin-bottom: 10px; color: #222; }
    ol { padding-left: 22px; }
    ol li { margin-bottom: 6px; color: #333; font-size: 13px; }

    /* Contenu libre */
    .contenu-libre p { margin-bottom: 6px; color: #333; }

    /* Modalités */
    .modalite-row {
      display: flex; align-items: baseline; gap: 6px;
      padding: 7px 12px; border-bottom: 1px solid #f0f0f0;
    }
    .modalite-row:last-child { border-bottom: none; }
    .modalite-amount { font-weight: 700; color: #640000; font-size: 14px; min-width: 100px; }
    .modalite-desc   { color: #333; flex: 1; }
    .modalite-sep    { color: #555; font-weight: 700; }
    .modalites-box   { background: #fafafa; border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden; margin-bottom: 14px; }

    /* Montant total */
    .total-phrase {
      background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;
      padding: 12px 16px; font-size: 13px; color: #333; margin-bottom: 20px;
      line-height: 1.7;
    }
    .total-phrase strong { color: #640000; }

    /* NB clause */
    .nb-clause {
      background: #111; color: #fff;
      padding: 12px 18px; border-radius: 8px; margin-bottom: 14px;
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; line-height: 1.6;
    }

    /* Garantie */
    .garantie {
      background: #fdf0f0; border-left: 4px solid #640000;
      padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 28px;
      color: #5a1010; font-size: 12px;
    }

    /* Signature */
    .signature-block {
      display: flex; justify-content: space-between; gap: 32px; margin-top: 40px;
    }
    .signature-col { flex: 1; }
    .signature-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 40px; }
    .signature-line { border-top: 1.5px solid #333; padding-top: 4px; font-size: 11px; color: #666; }

    /* Pied de page */
    .footer {
      border-top: 1px solid #ddd; padding-top: 14px; text-align: center;
      color: #888; font-size: 11px; line-height: 1.8; margin-top: 32px;
    }
    .footer strong { color: #444; }
  </style>
</head>
<body>

  <div class="watermark">
    ${ycLogoBase64 ? `<img src="${ycLogoBase64}" alt="" />` : ''}
  </div>

  <div class="page">

    <!-- En-tête -->
    <div class="header">
      <div class="brand">
        <div class="brand-logos">
          ${logo
            ? `<img src="${logo}" alt="Logo" class="brand-logo" />`
            : `<div class="brand-logo-placeholder">${(nomEntreprise || 'YC').substring(0, 2)}</div>`
          }
          ${apchqLogoBase64 ? `<img src="${apchqLogoBase64}" alt="APCHQ" class="apchq-logo" />` : ''}
        </div>
        <div>
          <div class="brand-name">${nomEntreprise}</div>
          <div class="brand-profession">Paysagiste</div>
          <div class="brand-profession">Entrepreneur spécialisé</div>
          <div class="brand-license">
            ${company.rbq   ? `<span class="license-tag">R.B.Q. ${company.rbq}</span>` : ''}
            ${company.apchq ? `<span class="license-tag">A.P.C.H.Q. ${company.apchq}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-label">Contrat</div>
        <div class="doc-num">N° ${contrat.numero}</div>
        <div class="doc-date">Date : ${fmtDate(contrat.date)}</div>
        ${contrat.dateDebut ? `<div class="doc-date">Début des travaux : ${fmtDate(contrat.dateDebut)}</div>` : ''}
        ${contrat.factureNumero ? `<div class="doc-date" style="color:#640000;font-size:11px;">Réf. facture : ${contrat.factureNumero}</div>` : ''}
        <span class="badge">CONTRAT DE SERVICES</span>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party">
        <div class="party-label">Entrepreneur</div>
        <div class="party-name">${nomEntreprise}</div>
        <div class="party-detail">
          ${company.adresse || ''}<br>
          ${villePostale}<br>
          ${company.telephone || ''}
        </div>
      </div>
      <div class="party right">
        <div class="party-label">Client</div>
        <div class="party-name">${contrat.client.nom || ''}</div>
        <div class="party-detail">
          ${clientAdresse}
          ${contrat.client.telephone ? '<br>Tél : ' + contrat.client.telephone : ''}
          ${contrat.client.email ? '<br>' + contrat.client.email : ''}
        </div>
      </div>
    </div>

    <!-- Objet du contrat -->
    <div class="section">
      <div class="section-title">Objet du Contrat</div>
      ${contrat.phraseAccroche
        ? `<p class="accroche">${contrat.phraseAccroche}</p>`
        : ''}
      ${itemsHTML ? `<ol>${itemsHTML}</ol>` : ''}
      ${contenuLibreHTML ? `<div class="contenu-libre" style="margin-top:10px;">${contenuLibreHTML}</div>` : ''}
    </div>

    <!-- Modalités de paiement -->
    ${modalitesHTML ? `
    <div class="section">
      <div class="section-title">Modalités de Paiement</div>
      <div class="modalites-box">${modalitesHTML}</div>
    </div>` : ''}

    <!-- Montant total -->
    ${contrat.total > 0 ? `
    <div class="total-phrase">
      Le montant total pour la réalisation des travaux ci-dessus cités a été arrêté par les deux parties à
      <strong>${fmtMoney(contrat.total)} $</strong>
      (${totalLettres} dollars).
    </div>` : ''}

    <!-- NB -->
    <div class="nb-clause">
      NB : LE DÉBUT DES TRAVAUX FERA OFFICE DE CONSENTEMENT DES DÉTAILS CI-DESSUS MENTIONNÉS ENTRE LES DEUX PARTIES.
    </div>

    <!-- Garantie -->
    <div class="garantie">
      Les travaux sont garantis <strong>deux (2) ans</strong> et le bris des blocs de <strong>cinquante (50) ans</strong>.
    </div>

    ${contrat.notes ? `
    <div class="section">
      <div class="section-title">Notes</div>
      <div style="color:#333;font-size:12px;line-height:1.7;">${contrat.notes}</div>
    </div>` : ''}

    <!-- Signatures -->
    <div class="signature-block">
      <div class="signature-col">
        <div class="signature-label">Pour ${nomEntreprise}</div>
        <div class="signature-line">Signature &amp; Date</div>
      </div>
      <div class="signature-col">
        <div class="signature-label">Le Client — ${contrat.client.nom || ''}</div>
        <div class="signature-line">Signature &amp; Date</div>
      </div>
    </div>

    <!-- Pied de page -->
    <div class="footer">
      <strong>${nomEntreprise}</strong> — Merci pour votre confiance !<br>
      ${[company.adresse, villePostale].filter(Boolean).join(', ')}
      ${company.telephone ? ' | ' + company.telephone : ''}
      ${company.email ? ' | ' + company.email : ''}<br>
      ${company.rbq   ? 'R.B.Q. ' + company.rbq : ''}
      ${company.rbq && company.apchq ? ' | ' : ''}
      ${company.apchq ? 'A.P.C.H.Q. ' + company.apchq : ''}
    </div>

  </div>
</body>
</html>`;
}

// ── Routes CRUD ───────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const contrats = await Contrat.find().sort({ createdAt: -1 });
    res.json(contrats);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const contrat = await Contrat.findById(req.params.id);
    if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé.' });
    res.json(contrat);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const contrat = new Contrat(req.body);
    const saved   = await contrat.save();
    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { numero, ...updateData } = req.body;
    const updated = await Contrat.findByIdAndUpdate(
      req.params.id, updateData, { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Contrat non trouvé.' });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Contrat.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Contrat non trouvé.' });
    res.json({ message: 'Contrat supprimé.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Route PDF ─────────────────────────────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  let page;
  try {
    const [contrat, company] = await Promise.all([
      Contrat.findById(req.params.id),
      CompanyInfo.findOne()
    ]);
    if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé.' });

    const html = generateContratHTML(contrat, company || {});

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '12mm', bottom: '12mm', left: '8mm', right: '8mm' },
      printBackground: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contrat-${contrat.numero}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('Erreur génération PDF contrat:', err);
    res.status(500).json({ message: 'Erreur PDF : ' + err.message });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

module.exports = router;
