// Controllo di sintassi di tutti i file JavaScript del progetto (node --check).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(m?js)$/.test(name)) files.push(p);
  }
};
['js', 'scripts', 'tests'].forEach((d) => walk(join(root, d)));
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { failed++; console.error(r.stderr); }
}
console.log(files.length + ' file controllati' + (failed ? ', ' + failed + ' con errori' : ', nessun errore'));
process.exitCode = failed ? 1 : 0;
