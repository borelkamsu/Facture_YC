/**
 * Singleton Puppeteer — un seul Chrome pour tout le serveur.
 * Réduit le temps de génération PDF de ~4s à ~0.5s après le premier appel.
 */
const puppeteer = require('puppeteer-core');

let _browser = null;

async function getBrowser() {
  // Réutilise le browser existant s'il est encore vivant
  if (_browser) {
    try {
      await _browser.version(); // ping rapide
      return _browser;
    } catch {
      _browser = null;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    const chromium = require('@sparticuz/chromium');
    _browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    _browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--no-first-run',
      ],
    });
  }

  // Relance automatique si le browser crashe
  _browser.on('disconnected', () => { _browser = null; });

  return _browser;
}

module.exports = { getBrowser };
