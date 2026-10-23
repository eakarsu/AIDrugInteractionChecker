'use strict';
// Feature pack 33C pure helpers — no DB/provider side effects.
function hasAIKey(env) { env = env || process.env; return Boolean(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY); }
function filterRecords(records, opts) {
  opts = opts || {};
  const list = Array.isArray(records) ? records : [];
  const q = String(opts.search || opts.q || '').trim().toLowerCase();
  return list.filter((r) => {
    if (!r || typeof r !== 'object') return false;
    if (opts.status !== undefined && opts.status !== '' && String(r.status ?? '') !== String(opts.status)) return false;
    if (opts.type !== undefined && opts.type !== '' && String(r.type ?? r.drug_class ?? r.matter_type ?? r.industry ?? '') !== String(opts.type)) return false;
    if (!q) return true;
    return Object.values(r).some((v) => (v === false || v === 0 ? String(v) === q : String(v ?? '').toLowerCase().includes(q)));
  });
}
function toCSV(records) {
  const list = Array.isArray(records) ? records : [];
  if (!list.length) return '';
  const keys = [...new Set(list.flatMap((r) => Object.keys(r || {})))];
  const esc = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [keys.join(','), ...list.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}
function createTaskStore() {
  const tasks = new Map(); let seq = 1;
  return {
    list(ownerId) { return [...tasks.values()].filter((t) => String(t.ownerId) === String(ownerId)); },
    create(ownerId, body) {
      body = body || {};
      const title = String(body.title || '').trim(); if (!title) throw new Error('title is required');
      const status = ['todo', 'in_progress', 'done'].includes(body.status) ? body.status : 'todo';
      const task = { id: seq++, ownerId, title, notes: body.notes ?? '', status, dueDate: body.dueDate ?? null, createdAt: new Date().toISOString() };
      tasks.set(task.id, task); return task;
    },
    update(ownerId, id, patch) {
      patch = patch || {};
      const t = tasks.get(Number(id)); if (!t || String(t.ownerId) !== String(ownerId)) return null;
      if (patch.title !== undefined) { if (!String(patch.title).trim()) throw new Error('title is required'); t.title = String(patch.title).trim(); }
      if (patch.status !== undefined) { if (!['todo', 'in_progress', 'done'].includes(patch.status)) throw new Error('invalid status'); t.status = patch.status; }
      if (patch.notes !== undefined) t.notes = patch.notes;
      if (patch.dueDate !== undefined) t.dueDate = patch.dueDate;
      return t;
    },
    _clear() { tasks.clear(); seq = 1; }
  };
}
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
function sections(pairs) { return pairs.map(([label, value]) => ({ label, value })); }

function therapeuticDuplicateCheck(records) {
  const list = Array.isArray(records) ? records : [];
  const byClass = {}; list.forEach((r) => { const c = String(r.drug_class ?? ''); if (c) byClass[c] = (byClass[c] || 0) + 1; });
  const duplicated = Object.keys(byClass).filter((c) => byClass[c] > 1);
  return { recordCount: list.length, duplicatedClasses: duplicated, duplicateClassCount: duplicated.length, isEmpty: list.length === 0,
    sections: sections([['Drugs reviewed', list.length], ['Classes with multiple drugs', duplicated.length], ['Classes', Object.keys(byClass).length]]),
    summary: duplicated.length + ' drug classes contain more than one recorded drug' };
}
function classCoverageSummary(records) {
  const list = Array.isArray(records) ? records : [];
  const byClass = {}; list.forEach((r) => { const c = String(r.drug_class ?? 'uncategorised'); byClass[c] = (byClass[c] || 0) + 1; });
  return { recordCount: list.length, classCount: Object.keys(byClass).length, byClass, hasRecords: list.length > 0,
    sections: sections([['Drugs reviewed', list.length], ['Distinct classes', Object.keys(byClass).length]]),
    summary: list.length + ' drugs across ' + Object.keys(byClass).length + ' classes' };
}
function fdaStatusDigest(records) {
  const list = Array.isArray(records) ? records : [];
  const approved = list.filter((r) => String(r.fda_status || '').toLowerCase().includes('approv')).length;
  return { recordCount: list.length, approvedCount: approved, otherCount: list.length - approved, hasApproved: approved > 0,
    sections: sections([['Drugs reviewed', list.length], ['FDA approved (recorded)', approved], ['Other / blank status', list.length - approved]]),
    summary: approved + ' of ' + list.length + ' drugs recorded as FDA approved' };
}
module.exports = { hasAIKey, filterRecords, toCSV, createTaskStore, therapeuticDuplicateCheck, classCoverageSummary, fdaStatusDigest };
