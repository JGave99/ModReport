// Copia le dipendenze del browser da node_modules ad assets/ (il sito non ha build).
// Uso: npm install && npm run vendor — poi committare i file copiati.
import { copyFileSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (p) => join(root, 'node_modules', p);

const FILES = [
  ['@supabase/supabase-js/dist/umd/supabase.js', 'assets/vendor/supabase.js'],
  ['pdf-lib/dist/pdf-lib.min.js', 'assets/vendor/pdf-lib.min.js'],
  ['@pdf-lib/fontkit/dist/fontkit.umd.min.js', 'assets/vendor/fontkit.umd.min.js'],
  ['@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf', 'assets/fonts/pdf/Inter-Regular.ttf'],
  ['@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf', 'assets/fonts/pdf/Inter-Bold.ttf'],
  ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'assets/fonts/inter-latin-wght-normal.woff2'],
  ['@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2', 'assets/fonts/inter-latin-ext-wght-normal.woff2'],
];

const LICENSES = [
  ['@supabase/supabase-js/LICENSE', 'supabase-js.LICENSE.txt'],
  ['pdf-lib/LICENSE.md', 'pdf-lib.LICENSE.txt'],
  ['@expo-google-fonts/inter/LICENSE_FONT', 'inter-font.OFL.txt'],
  ['@fontsource-variable/inter/LICENSE', 'fontsource-inter.LICENSE.txt'],
];

for (const [from, to] of FILES) {
  const dest = join(root, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(nm(from), dest);
  console.log('ok', to);
}

mkdirSync(join(root, 'assets/vendor/licenses'), { recursive: true });
for (const [from, to] of LICENSES) {
  copyFileSync(nm(from), join(root, 'assets/vendor/licenses', to));
}
// @pdf-lib/fontkit non include un file LICENSE nel pacchetto npm: è MIT (vedi package.json).
writeFileSync(join(root, 'assets/vendor/licenses/fontkit.LICENSE.txt'),
  '@pdf-lib/fontkit ' + JSON.parse(readFileSync(nm('@pdf-lib/fontkit/package.json'), 'utf8')).version +
  ' — MIT License — https://github.com/Hopding/fontkit\n');

const versions = Object.fromEntries(['@supabase/supabase-js', 'pdf-lib', '@pdf-lib/fontkit', '@expo-google-fonts/inter', '@fontsource-variable/inter']
  .map((p) => [p, JSON.parse(readFileSync(nm(p + '/package.json'), 'utf8')).version]));
writeFileSync(join(root, 'assets/vendor/VERSIONS.json'), JSON.stringify(versions, null, 2) + '\n');
console.log(versions);
