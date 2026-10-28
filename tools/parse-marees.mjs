// Transforme le texte affiché par maree.shom.fr (annuaire de marées) en données structurées.
const MOIS = { janvier:1, février:2, fevrier:2, mars:3, avril:4, mai:5, juin:6, juillet:7,
               août:8, aout:8, septembre:9, octobre:10, novembre:11, décembre:12, decembre:12 };

export function parseTides(text) {
  const days = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // « Mardi 27 octobre 2026 »
    const d = line.match(/^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([a-zéèêûôîàç]+)\s+(\d{4})$/i);
    if (d) {
      const mois = MOIS[d[2].toLowerCase()];
      if (!mois) throw new Error('Mois inconnu : ' + d[2]);
      cur = { date: `${d[3]}-${String(mois).padStart(2, '0')}-${String(d[1]).padStart(2, '0')}`, extrema: [] };
      days.push(cur);
      continue;
    }

    // « BM  01:43  1.33  --- »   ou   « PM  07:20  11.68  99 »   (la ligne vide « --- --:-- » est ignorée)
    const m = line.match(/^(BM|PM)\s+(\d{1,2}:\d{2})\s+(\d+(?:\.\d+)?)\s+(---|\d+)$/);
    if (m && cur) {
      cur.extrema.push({
        type: m[1],
        time: m[2].padStart(5, '0'),
        height: Number(m[3]),
        coef: m[4] === '---' ? null : Number(m[4]),
      });
    }
  }
  return days;
}

// Contrôles : on refuse d'écraser de bonnes données par des données douteuses.
export function validateTides(days) {
  const errs = [];
  if (days.length < 6) errs.push(`seulement ${days.length} jour(s) lu(s) (6 attendus au minimum)`);
  days.forEach((day, i) => {
    const n = day.extrema.length;
    if (n < 3 || n > 4) errs.push(`${day.date} : ${n} marée(s) lue(s)`);
    for (let k = 0; k < n; k++) {
      const e = day.extrema[k];
      if (!(e.height > -1 && e.height < 16)) errs.push(`${day.date} ${e.time} : hauteur ${e.height} improbable`);
      if (k > 0 && e.time <= day.extrema[k - 1].time) errs.push(`${day.date} : heures dans le désordre`);
      if (k > 0 && e.type === day.extrema[k - 1].type) errs.push(`${day.date} : deux ${e.type} de suite`);
      if (e.type === 'PM' && e.coef == null) errs.push(`${day.date} ${e.time} : coefficient manquant`);
    }
    if (i > 0 && !(new Date(day.date) > new Date(days[i - 1].date))) errs.push(`${day.date} : dates dans le désordre`);
  });
  return errs;
}
