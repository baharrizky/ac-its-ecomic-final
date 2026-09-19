import { listKnowledgeItems, saveKnowledgeItem, deleteKnowledgeItem } from './learningDataService';

function normalize(item = {}) {
  const id = String(item.conceptId || item.code || item.id || '').trim();
  return {
    id,
    name: String(item.name || item.title || '').trim(),
    description: String(item.content || item.description || '').trim(),
    prerequisiteIds: Array.isArray(item.prerequisiteIds)
      ? item.prerequisiteIds.map(String).map(s => s.trim()).filter(Boolean)
      : [],
    type: 'concept',
    updatedAt: item.updatedAt || ''
  };
}

export async function listConcepts() {
  const items = await listKnowledgeItems();
  return items
    .filter(item => item.type === 'concept')
    .map(normalize)
    .filter(c => c.id && c.name)
    .sort((a,b) => a.id.localeCompare(b.id, undefined, { numeric:true, sensitivity:'base' }));
}

export async function saveConcept(concept) {
  const normalized = normalize(concept);
  if (!normalized.id) throw new Error('Kode konsep wajib diisi.');
  if (!normalized.name) throw new Error('Nama konsep wajib diisi.');
  await saveKnowledgeItem({
    id: normalized.id,
    type: 'concept',
    conceptId: normalized.id,
    title: normalized.name,
    name: normalized.name,
    content: normalized.description,
    prerequisiteIds: normalized.prerequisiteIds,
    updatedAt: new Date().toISOString()
  });
  return normalized;
}

export async function removeConcept(id) {
  return deleteKnowledgeItem(String(id));
}

export function conceptMap(concepts = []) {
  return Object.fromEntries(concepts.map(c => [c.id, c]));
}
