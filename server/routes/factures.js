const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer-core');
const Facture = require('../models/Facture');
const CompanyInfo = require('../models/CompanyInfo');

async function launchBrowser() {
  if (process.env.NODE_ENV === 'production') {
    const chromium = require('@sparticuz/chromium');
    return puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  // Développement local (Windows/Mac) — Chrome installé sur le poste
  return puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
}

function fmt(val) {
  return parseFloat(val || 0).toLocaleString('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function fmtDate(date) {
  return new Date(date).toLocaleDateString('fr-CA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function generateInvoiceHTML(facture, company) {
  const logo = company.logo || '';
  const villePostale = [company.ville, company.province, company.codePostal].filter(Boolean).join('  ');

  const lignesHTML = facture.lignes.map((l, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td><span class="ref-badge">${l.reference || '—'}</span></td>
      <td>${l.description || ''}</td>
      <td class="center">${l.quantite}</td>
      <td class="right">${fmt(l.prixUnitaire)} $</td>
      <td class="right bold">${fmt(l.montant)} $</td>
    </tr>
  `).join('');

  const clientAdresse = [
    facture.client.adresse,
    [facture.client.ville, facture.client.codePostal].filter(Boolean).join(' ')
  ].filter(Boolean).join('<br>');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1e293b;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
    }
    .page { padding: 36px 44px; max-width: 820px; margin: 0 auto; }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 3px solid #cb4154;
      margin-bottom: 32px;
    }
    .brand { display: flex; align-items: flex-start; gap: 14px; }
    .brand-logo { width: 64px; height: 64px; object-fit: contain; }
    .brand-logo-placeholder {
      width: 56px; height: 56px;
      background: #cb4154;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 20px; font-weight: 800;
    }
    .brand-name { font-size: 22px; font-weight: 800; color: #cb4154; letter-spacing: -0.3px; }
    .brand-address { color: #64748b; font-size: 11px; margin-top: 3px; line-height: 1.7; }
    .brand-license { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
    .license-tag {
      background: #fdf2f3;
      border: 1px solid #f5c2c9;
      color: #cb4154;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 10px;
    }
    .invoice-meta { text-align: right; }
    .invoice-label {
      font-size: 32px; font-weight: 800; color: #1e293b;
      letter-spacing: 3px; text-transform: uppercase;
    }
    .invoice-num { color: #cb4154; font-size: 15px; font-weight: 700; margin-top: 4px; }
    .invoice-date { color: #64748b; font-size: 12px; margin-top: 2px; }
    .badge {
      display: inline-block; margin-top: 8px;
      background: #dcfce7; color: #15803d;
      padding: 3px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 600;
    }

    .parties { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .party { max-width: 48%; }
    .party-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1.2px; color: #94a3b8; margin-bottom: 6px;
    }
    .party-name { font-size: 15px; font-weight: 700; color: #0f172a; }
    .party-detail { color: #475569; font-size: 12px; margin-top: 4px; line-height: 1.7; }
    .party.right { text-align: right; }

    .table-wrap { margin-bottom: 28px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #cb4154; }
    th {
      color: #fff; padding: 11px 13px; font-size: 11px;
      font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
    }
    th.right, td.right { text-align: right; }
    th.center, td.center { text-align: center; }
    td { padding: 10px 13px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    td.num { color: #94a3b8; font-size: 12px; width: 30px; }
    td.bold { font-weight: 600; color: #0f172a; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .ref-badge {
      background: #fde8eb; color: #cb4154;
      padding: 2px 8px; border-radius: 12px;
      font-size: 11px; font-weight: 600; white-space: nowrap;
    }

    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 28px; }
    .totals-box {
      width: 290px; background: #f8fafc;
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    .total-row {
      display: flex; justify-content: space-between;
      padding: 9px 16px; font-size: 13px; color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }
    .total-row:last-child { border-bottom: none; }
    .total-row.grand {
      background: #cb4154; color: #fff;
      font-size: 15px; font-weight: 700; padding: 12px 16px;
    }
    .total-val { font-weight: 600; }

    .notes {
      background: #fdf2f3; border-left: 4px solid #cb4154;
      padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 28px;
    }
    .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #cb4154; margin-bottom: 4px; letter-spacing: 1px; }
    .notes-body { color: #7f1d2e; font-size: 12px; }

    .footer {
      border-top: 1px solid #e2e8f0; padding-top: 16px;
      text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.8;
    }
    .footer strong { color: #64748b; }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="brand">
      ${logo
        ? `<img src="${logo}" alt="Logo" class="brand-logo" />`
        : `<div class="brand-logo-placeholder">${(company.nom || 'YC').substring(0, 2)}</div>`
      }
      <div>
        <div class="brand-name">${company.nom || ''}</div>
        <div class="brand-address">
          ${company.adresse || ''}<br>
          ${villePostale}<br>
          ${company.telephone || ''}<br>
          ${company.email || ''}
        </div>
        <div class="brand-license">
          ${company.rbq ? `<span class="license-tag">R.B.Q. ${company.rbq}</span>` : ''}
          ${company.apchq ? `<span class="license-tag">A.P.C.H.Q. ${company.apchq}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-label">Facture</div>
      <div class="invoice-num">N° ${facture.numero}</div>
      <div class="invoice-date">Date : ${fmtDate(facture.date)}</div>
      <span class="badge">PAYABLE DÈS RÉCEPTION</span>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">De</div>
      <div class="party-name">${company.nom || ''}</div>
      <div class="party-detail">
        ${company.adresse || ''}<br>
        ${villePostale}<br>
        ${company.telephone || ''}
      </div>
    </div>
    <div class="party right">
      <div class="party-label">Facturé à</div>
      <div class="party-name">${facture.client.nom || ''}</div>
      <div class="party-detail">
        ${clientAdresse}
        ${facture.client.telephone ? '<br>Tél : ' + facture.client.telephone : ''}
        ${facture.client.email ? '<br>' + facture.client.email : ''}
      </div>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:32px">#</th>
          <th style="width:110px">Référence</th>
          <th>Description</th>
          <th class="center" style="width:60px">Qté</th>
          <th class="right" style="width:110px">Prix unit.</th>
          <th class="right" style="width:110px">Montant</th>
        </tr>
      </thead>
      <tbody>${lignesHTML}</tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="total-row">
        <span>Sous-total HT</span>
        <span class="total-val">${fmt(facture.soustotal)} $</span>
      </div>
      <div class="total-row">
        <span>TPS 782101216RT001 (5 %)</span>
        <span class="total-val">${fmt(facture.tps)} $</span>
      </div>
      <div class="total-row">
        <span>TVQ 12299719862TQ001 (9,975 %)</span>
        <span class="total-val">${fmt(facture.tvq)} $</span>
      </div>
      <div class="total-row grand">
        <span>TOTAL TTC</span>
        <span>${fmt(facture.total)} $</span>
      </div>
    </div>
  </div>

  ${facture.notes ? `
  <div class="notes">
    <div class="notes-label">Notes</div>
    <div class="notes-body">${facture.notes}</div>
  </div>` : ''}

  <div class="footer">
    <strong>${company.nom || ''}</strong> — Merci pour votre confiance !<br>
    ${[company.adresse, villePostale].filter(Boolean).join(', ')}
    ${company.telephone ? ' | ' + company.telephone : ''}
    ${company.email ? ' | ' + company.email : ''}<br>
    ${company.rbq ? 'R.B.Q. ' + company.rbq : ''}
    ${company.rbq && company.apchq ? ' | ' : ''}
    ${company.apchq ? 'A.P.C.H.Q. ' + company.apchq : ''}
  </div>

</div>
</body>
</html>`;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const factures = await Facture.find().sort({ createdAt: -1 });
    res.json(factures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    if (!facture) return res.status(404).json({ message: 'Facture non trouvée.' });
    res.json(facture);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const facture = new Facture(req.body);
    const saved = await facture.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { numero, ...updateData } = req.body;
    const updated = await Facture.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Facture non trouvée.' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/:id/pdf', async (req, res) => {
  let browser;
  try {
    const [facture, company] = await Promise.all([
      Facture.findById(req.params.id),
      CompanyInfo.findOne()
    ]);
    if (!facture) return res.status(404).json({ message: 'Facture non trouvée.' });

    const html = generateInvoiceHTML(facture, company || {});

    browser = await launchBrowser();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '12mm', bottom: '12mm', left: '8mm', right: '8mm' },
      printBackground: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${facture.numero}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('Erreur génération PDF:', err);
    res.status(500).json({ message: 'Erreur PDF : ' + err.message });
  } finally {
    if (browser) await browser.close();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Facture.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Facture non trouvée.' });
    res.json({ message: 'Facture supprimée.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
