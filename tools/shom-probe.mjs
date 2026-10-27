// Robot d'ESSAI : vérifie ce que le site maree.shom.fr renvoie pour Dahouet.
// Ne modifie aucun fichier du dépôt : il affiche seulement le résultat dans le journal GitHub Actions.
import { chromium } from 'playwright';
import { appendFileSync } from 'node:fs';

const DATE = process.env.DATE || new Date().toISOString().slice(0, 10);
const PAGE_URL = `https://maree.shom.fr/harbor/DAHOUET/hlt/0?date=${DATE}&utc=standard`;
const out = [];
const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-FR', timezoneId: 'Europe/Paris' });
const page = await ctx.newPage();

// 1) On écoute tout ce que la page demande en coulisses (données de marée)
const seen = [];
page.on('response', async (res) => {
  const url = res.url();
  if (!/maree\.shom\.fr/.test(url)) return;
  const type = res.headers()['content-type'] || '';
  if (!/json|text\/plain|xml/.test(type) && !/spm/.test(url)) return;
  let body = '';
  try { body = (await res.text()).slice(0, 2500); } catch {}
  seen.push({ url, status: res.status(), type, body });
});

log(`## Essai SHOM — ${PAGE_URL}`);
const resp = await page.goto(PAGE_URL, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => { log('Erreur goto :', e.message); return null; });
if (resp) log(`Page : HTTP ${resp.status()}`);
await page.waitForTimeout(5000);

log('\n### Requêtes de données vues pendant le chargement');
if (!seen.length) log('(aucune)');
for (const s of seen) {
  log(`\n- ${s.status} ${s.url}  [${s.type}]`);
  log('```\n' + s.body + '\n```');
}

// 2) Ce que la page affiche une fois chargée
log('\n### Texte affiché par la page (début)');
const text = await page.evaluate(() => document.body.innerText).catch(() => '');
log('```\n' + text.slice(0, 3500) + '\n```');

// 3) Essai d'un appel direct à l'adresse interne (paramètres supposés)
log('\n### Appel direct (paramètres supposés)');
const direct = `https://maree.shom.fr/spm/hlt?harborName=DAHOUET&duration=7&date=${DATE}&utc=standard&correlation=1`;
try {
  const r = await page.request.get(direct);
  log(`${r.status()} ${direct}`);
  log('```\n' + (await r.text()).slice(0, 2500) + '\n```');
} catch (e) { log('Erreur appel direct :', e.message); }

await browser.close();
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join('\n') + '\n');
