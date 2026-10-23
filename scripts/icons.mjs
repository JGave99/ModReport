// Crea assets/icons.svg (sprite) con le sole icone Lucide usate dall'app. Uso: npm run icons
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ICONS = ['mic', 'mic-off', 'archive', 'messages-square', 'circle-user', 'printer', 'copy', 'clipboard-check', 'eraser', 'save',
  'file-input', 'library-big', 'circle-play', 'users', 'pencil', 'trash-2', 'search', 'triangle-alert', 'siren', 'circle-check',
  'circle-alert', 'x', 'chevron-right', 'chevron-down', 'grip-vertical', 'log-out', 'plus', 'settings', 'download', 'upload', 'sun',
  'moon', 'type', 'shield-check', 'file-text', 'arrow-up', 'arrow-down', 'keyboard', 'info', 'lock', 'check', 'ellipsis', 'hard-drive',
  'external-link', 'menu', 'rotate-ccw', 'folder-open', 'building-2', 'mail', 'credit-card', 'graduation-cap', 'badge-check',
  'chart-column', 'list-checks', 'log-in', 'user-round', 'circle-help', 'layers', 'cloud', 'zap', 'monitor-smartphone', 'eye-off',
  'server', 'timer', 'wifi-off', 'stethoscope', 'chevron-left', 'pause', 'play', 'arrow-left',
  'calendar-days', 'megaphone', 'user-check', 'link', 'refresh-cw', 'bookmark', 'sparkles', 'star'];

const symbols = ICONS.map((name) => {
  const svg = readFileSync(join(root, 'node_modules/lucide-static/icons', name + '.svg'), 'utf8');
  const inner = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s+/g, ' ').trim();
  return `<symbol id="${name}" viewBox="0 0 24 24">${inner}</symbol>`;
});
writeFileSync(join(root, 'assets/icons.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<!-- Lucide (ISC) — https://lucide.dev — generato da scripts/icons.mjs -->\n' + symbols.join('\n') + '\n</svg>\n');
mkdirSync(join(root, 'assets/vendor/licenses'), { recursive: true });
copyFileSync(join(root, 'node_modules/lucide-static/LICENSE'), join(root, 'assets/vendor/licenses/lucide.LICENSE.txt'));
console.log(ICONS.length + ' icone in assets/icons.svg');
