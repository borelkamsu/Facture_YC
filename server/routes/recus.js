const express     = require('express');
const router      = express.Router();
const { getBrowser } = require('../utils/browser');
const path        = require('path');
const fs          = require('fs');
const Recu        = require('../models/Recu');
const CompanyInfo = require('../models/CompanyInfo');
const { nombreEnLettres } = require('../utils/numberToWords');

// ── Logos base64 ─────────────────────────────────────────────────────────────
const ycLogoPath    = path.join(__dirname, '../../client/src/img/Logo-final.png');
const apchqLogoPath = path.join(__dirname, '../../client/src/img/logo-apchq.png');
const ycLogoBase64  = fs.existsSync(ycLogoPath)
  ? 'data:image/png;base64,' + fs.readFileSync(ycLogoPath).toString('base64') : '';
const apchqLogoBase64 = fs.existsSync(apchqLogoPath)
  ? 'data:image/png;base64,' + fs.readFileSync(apchqLogoPath).toString('base64') : '';

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Générateur HTML du reçu ───────────────────────────────────────────────────
function generateRecuHTML(recu, company) {
  const logo          = company.logo || ycLogoBase64;
  const nomEntreprise = normalizeNom(company.nom);
  const villePostale  = [company.ville, company.province, company.codePostal].filter(Boolean).join('  ');

  const client = recu.client || {};
  const clientAdresse = [
    client.adresse,
    [client.ville, client.codePostal].filter(Boolean).join(' ')
  ].filter(Boolean).join('<br>');

  const montantLettres = recu.montantRecuEnLettres
    || nombreEnLettres(Math.round(recu.montantRecu || 0));
  const resteLettres   = recu.resteAPayerEnLettres
    || nombreEnLettres(Math.round(recu.resteAPayer || 0));

  const descTravaux = recu.descriptionTravaux
    || "travaux d'aménagement paysager";

  const contenuLibreHTML = recu.contenuLibre
    ? recu.contenuLibre.split('\n').map(l => `<p>${l || '&nbsp;'}</p>`).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #111; background: #fff; font-size: 13px; line-height: 1.6;
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
    .brand-logo { width: 90px; height: 90px; object-fit: contain; }
    .apchq-logo { width: 80px; height: 34px; object-fit: contain; }
    .brand-logo-placeholder {
      width: 56px; height: 56px; background: #640000; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 20px; font-weight: 800;
    }
    .brand-name { font-size: 22px; font-weight: 800; color: #640000; }
    .brand-profession { color: #333; font-size: 11px; margin-top: 2px; font-weight: 600; }
    .brand-license { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .license-tag {
      background: #fdf0f0; border: 1px solid #e8b0b0; color: #640000;
      font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 10px;
    }
    .doc-meta { text-align: right; }
    .doc-label { font-size: 36px; font-weight: 800; color: #111; letter-spacing: 4px; text-transform: uppercase; }
    .doc-num   { color: #640000; font-size: 15px; font-weight: 700; margin-top: 4px; }
    .doc-date  { color: #555; font-size: 12px; margin-top: 2px; }
    .badge {
      display: inline-block; margin-top: 8px; background: #640000; color: #fff;
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }

    /* Parties */
    .parties { display: flex; justify-content: space-between; margin-bottom: 28px; gap: 20px; }
    .party { flex: 1; }
    .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #888; margin-bottom: 6px; }
    .party-name { font-size: 15px; font-weight: 700; color: #000; }
    .party-detail { color: #444; font-size: 12px; margin-top: 4px; line-height: 1.7; }
    .party.right { text-align: right; }

    /* Corps du reçu */
    .recu-body {
      background: #fafafa; border: 1px solid #e0e0e0; border-radius: 10px;
      padding: 20px 24px; margin-bottom: 24px;
    }
    .recu-body p { font-size: 14px; color: #222; line-height: 1.8; margin-bottom: 10px; }
    .recu-body p:last-child { margin-bottom: 0; }
    .amount-highlight { color: #640000; font-weight: 700; font-size: 16px; }
    .reste-line {
      margin-top: 16px; padding-top: 14px; border-top: 1px dashed #ddd;
      font-size: 14px; color: #333; line-height: 1.8;
    }
    .reste-amount { color: #640000; font-weight: 700; }

    /* Contenu libre */
    .contenu-libre { margin-bottom: 20px; }
    .contenu-libre p { color: #333; font-size: 13px; margin-bottom: 6px; }

    /* Notes */
    .notes-box {
      background: #fdf0f0; border-left: 4px solid #640000;
      padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 24px;
      color: #5a1010; font-size: 12px;
    }
    .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #640000; margin-bottom: 4px; }

    /* Signature */
    .signature-block { display: flex; justify-content: space-between; gap: 32px; margin-top: 40px; }
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
        <div class="doc-label">Reçu</div>
        <div class="doc-num">N° ${recu.numero}</div>
        <div class="doc-date">Date : ${fmtDate(recu.date)}</div>
        ${recu.contratNumero ? `<div class="doc-date" style="color:#640000;font-size:11px;">Réf. contrat : ${recu.contratNumero}</div>` : ''}
        <span class="badge">REÇU DE PAIEMENT</span>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party">
        <div class="party-label">Émis par</div>
        <div class="party-name">${nomEntreprise}</div>
        <div class="party-detail">
          ${company.adresse || ''}<br>
          ${villePostale}<br>
          ${company.telephone || ''}
        </div>
      </div>
      <div class="party right">
        <div class="party-label">Remis à</div>
        <div class="party-name">${client.nom || ''}</div>
        <div class="party-detail">
          ${clientAdresse}
          ${client.telephone ? '<br>Tél : ' + client.telephone : ''}
          ${client.email ? '<br>' + client.email : ''}
        </div>
      </div>
    </div>

    <!-- Corps principal -->
    <div class="recu-body">
      <p>
        Nous confirmons avoir reçu une somme de
        <span class="amount-highlight">${fmtMoney(recu.montantRecu)} $</span>
        (<em>${montantLettres} dollars</em>) de votre part,
        représentant l'avance de notre contrat pour les
        ${descTravaux}.
      </p>

      ${recu.resteAPayer > 0 ? `
      <div class="reste-line">
        <strong>Reste à payer :</strong>
        <span class="reste-amount"> ${fmtMoney(recu.resteAPayer)} $</span>
        (<em>${resteLettres} dollars</em>)
        ${recu.dateEcheance ? ` au <strong>${fmtDate(recu.dateEcheance)}</strong>` : ''}.
      </div>` : `
      <div class="reste-line" style="color:#16a34a;font-weight:700;">
        ✓ Paiement intégral reçu — solde : 0 $
      </div>`}
    </div>

    <!-- Contenu libre -->
    ${contenuLibreHTML ? `<div class="contenu-libre">${contenuLibreHTML}</div>` : ''}

    <!-- Notes -->
    ${recu.notes ? `
    <div class="notes-box">
      <div class="notes-label">Notes</div>
      <div>${recu.notes}</div>
    </div>` : ''}

    <!-- Signatures -->
    <div class="signature-block">
      <div class="signature-col">
        <div class="signature-label">Pour ${nomEntreprise}</div>
        <div class="signature-line">Signature &amp; Date</div>
      </div>
      <div class="signature-col">
        <div class="signature-label">Le Client — ${client.nom || ''}</div>
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
    const recus = await Recu.find().sort({ createdAt: -1 });
    res.json(recus);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const recu = await Recu.findById(req.params.id);
    if (!recu) return res.status(404).json({ message: 'Reçu non trouvé.' });
    res.json(recu);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const recu  = new Recu(req.body);
    const saved = await recu.save();
    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { numero, ...updateData } = req.body;
    const updated = await Recu.findByIdAndUpdate(
      req.params.id, updateData, { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Reçu non trouvé.' });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Recu.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Reçu non trouvé.' });
    res.json({ message: 'Reçu supprimé.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Route PDF ─────────────────────────────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  let page;
  try {
    const [recu, company] = await Promise.all([
      Recu.findById(req.params.id),
      CompanyInfo.findOne()
    ]);
    if (!recu) return res.status(404).json({ message: 'Reçu non trouvé.' });

    const html = generateRecuHTML(recu, company || {});

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '12mm', bottom: '12mm', left: '8mm', right: '8mm' },
      printBackground: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recu-${recu.numero}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('Erreur génération PDF reçu:', err);
    res.status(500).json({ message: 'Erreur PDF : ' + err.message });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

module.exports = router;
