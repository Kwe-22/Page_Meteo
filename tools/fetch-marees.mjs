// Lit les marées de Dahouet sur maree.shom.fr (page affichée dans un navigateur sans écran)
// et écrit marees.json à la racine du dépôt. N'écrit rien si les données semblent invalides.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { parseTides, validateTides } from './parse-marees.mjs';

const parisDate = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const DATE = process.env.DATE || parisDate();
const URL_PAGE = `https://maree.shom.fr/harbor/DAHOUET/hlt/0?date=${DATE}&utc=standard`;

const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ locale: 'fr-FR', timezoneId: 'Europe/Paris' })).newPage();
  await page.goto(URL_PAGE, { waitUntil: 'networkidle', timeout: 60000 });
  // On attend que les horaires soient affichés (ligne « BM » ou « PM »)
  await page.waitForFunction(() => /\b(BM|PM)\s+\d{1,2}:\d{2}/.test(document.body.innerText), null, { timeout: 30000 });
  const text = await page.evaluate(() => document.body.innerText);

  const days = parseTides(text);
  const errs = validateTides(days);
  if (days[0]?.date !== DATE) errs.push(`le premier jour lu est ${days[0]?.date}, ${DATE} attendu`);
  if (errs.length) {
    console.error('Données refusées, marees.json non modifié :\n- ' + errs.join('\n- '));
    process.exit(1);
  }

  const out = {
    source: 'maree.shom.fr',
    port: 'Dahouet',
    updated: new Date().toISOString(),
    days,
  };
  writeFileSync(new URL('../marees.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
  console.log(`marees.json écrit : ${days.length} jours, du ${days[0].date} au ${days.at(-1).date}`);
} finally {
  await browser.close();
}
