// Versioni salvate della libreria personale (tabella library_versions; in modalità locale nel browser).
// Il server tiene le ultime 30: le più vecchie si cancellano da sole.
import { forStorage } from './library-merge.js';

export const VERSION_REASONS = {
  manuale: 'Salvata a mano',
  ripristino: 'Prima del ripristino dei predefiniti',
  importazione: 'Prima dell\'importazione da file',
  aggiornamento: 'Prima dell\'aggiornamento della libreria',
};

export async function saveVersion(sb, userId, data, { label = '', reason = 'manuale' } = {}) {
  const { error } = await sb.from('library_versions').insert({ user_id: userId, label: String(label).slice(0, 80), reason, data: forStorage(data) });
  if (error) throw new Error(error.message);
}

export async function listVersions(sb, userId) {
  const { data, error } = await sb.from('library_versions')
    .select('id, created_at, label, reason')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadVersion(sb, id) {
  const { data, error } = await sb.from('library_versions').select('data').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('versione non trovata');
  return data.data;
}

export async function deleteVersion(sb, id) {
  const { error } = await sb.from('library_versions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
