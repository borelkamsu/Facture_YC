/**
 * Conversion d'un entier en toutes lettres (français canadien).
 * Gère jusqu'à 999 999 999.
 */
function nombreEnLettres(n) {
  n = Math.round(n);
  if (isNaN(n)) return 'zéro';
  if (n === 0)  return 'zéro';
  if (n < 0)    return 'moins ' + nombreEnLettres(-n);

  const units = [
    '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf'
  ];
  const tensWords = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

  function belowHundred(x) {
    if (x === 0)  return '';
    if (x < 20)   return units[x];
    const t = Math.floor(x / 10);
    const u = x % 10;
    if (t === 7)  return 'soixante-' + units[10 + u];
    if (t === 8)  return u === 0 ? 'quatre-vingts' : 'quatre-vingt-' + units[u];
    if (t === 9)  return 'quatre-vingt-' + units[10 + u];
    if (u === 0)  return tensWords[t];
    if (u === 1)  return tensWords[t] + ' et un';
    return tensWords[t] + '-' + units[u];
  }

  function belowThousand(x) {
    if (x === 0)  return '';
    if (x < 100)  return belowHundred(x);
    const h = Math.floor(x / 100);
    const r = x % 100;
    const centBase = h === 1 ? 'cent' : units[h] + ' cent';
    if (r === 0)  return h === 1 ? 'cent' : units[h] + ' cents';
    return centBase + ' ' + belowHundred(r);
  }

  const parts = [];

  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    parts.push(m === 1 ? 'un million' : belowThousand(m) + ' millions');
    n %= 1000000;
  }

  if (n >= 1000) {
    const k = Math.floor(n / 1000);
    parts.push(k === 1 ? 'mille' : belowThousand(k) + ' mille');
    n %= 1000;
  }

  if (n > 0) parts.push(belowThousand(n));

  return parts.join(' ');
}

module.exports = { nombreEnLettres };
