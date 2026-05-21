/**
 * Enhanced Utilities - Advanced features for Markaz Qur'an
 * Extends base utils with smart calculations and recommendations
 */

import { WorkflowEngine, SmartSuggestions } from './workflow.js';
import { validator, VALIDATION_RULES, validateWorkflow } from './validation.js';

// ── Smart Calculations ─────────────────────────────────────────

/**
 * Calculate remedial recommendation intelligently
 */
export function getRemediaiRecommendation(latestScore, allScores = []) {
  const result = WorkflowEngine.detectRemedialCase(latestScore, allScores);

  if (!result.isRemedial) {
    return {
      status: 'tuntas',
      badge: '<span class="badge badge-sb">✓ Tuntas</span>',
      message: 'Santri sudah mencapai target pembelajaran'
    };
  }

  return {
    status: 'remedial',
    badge: '<span class="badge badge-pb">⚠ Remedial</span>',
    message: `Nilai ${latestScore} < 70 - Memerlukan pembinaan`,
    recommendations: result.recommendations,
    trend: result.trend < 0 ? '📉 Menurun' : result.trend > 0 ? '📈 Naik' : '→ Stabil'
  };
}

/**
 * Generate smart evaluation template
 * Pre-fills form with data from session to reduce manual entry
 */
export function getEvaluationTemplate(session, santri, type = 'bacaan') {
  return WorkflowEngine.generateEvaluationTemplate(session, santri, type);
}

/**
 * Calculate score from indicators intelligently
 */
export function calculateScoreFromIndicators(indicators) {
  return WorkflowEngine.calculateFinalScore(indicators);
}

/**
 * Get workflow readiness status
 * Returns comprehensive readiness check with messages
 */
export function checkWorkflowReadiness(workflow, context) {
  return WorkflowEngine.validateReadiness(workflow, context);
}

/**
 * Get progress completion summary with visual indicator
 */
export function getProgressBar(evaluated, total) {
  const pct = total ? Math.round((evaluated / total) * 100) : 0;
  const status = pct === 100 ? '✓ Selesai' : pct >= 75 ? 'Hampir Selesai' : 'Dalam Proses';
  const color = pct === 100 ? '#16a34a' : pct >= 75 ? '#3b82f6' : '#f59e0b';

  return {
    percentage: pct,
    evaluated,
    total,
    remaining: total - evaluated,
    status,
    html: `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:4px;">
            ${evaluated} / ${total}
          </div>
          <div style="background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden;">
            <div style="height:100%;background:${color};width:${pct}%;transition:width 0.3s;"></div>
          </div>
        </div>
        <div style="font-size:13px;font-weight:700;color:${color};">${pct}%</div>
      </div>
    `
  };
}

/**
 * Generate smart workflow checklist
 * Shows what needs to be done before proceeding
 */
export function generateWorkflowChecklist(workflow, data) {
  const checklists = {
    'session-evaluation': [
      { id: 'selected', label: 'Sesi sudah dipilih', checked: !!data.sessionId },
      { id: 'materials', label: 'Materi ujian sudah ditetapkan', checked: !!data.hasMateri },
      { id: 'participants', label: 'Peserta sudah dipilih', checked: (data.participantCount || 0) > 0 },
      { id: 'all-evaluated', label: 'Semua peserta dievaluasi', checked: data.allEvaluated, critical: true }
    ],

    'rapot-creation': [
      { id: 'santri', label: 'Santri dipilih', checked: !!data.santriId },
      { id: 'periode', label: 'Periode diisi', checked: !!data.periode },
      { id: 'nilai', label: 'Nilai tersedia dari evaluasi', checked: !!data.nilaiAkhir },
      { id: 'hafalan', label: 'Data hafalan tersedia', checked: data.hasHafalan, critical: false }
    ],

    'print-rapot': [
      { id: 'data', label: 'Data rapot lengkap', checked: !!data.rapotData },
      { id: 'signed', label: 'Sudah ditandatangani', checked: !!data.signed },
      { id: 'approved', label: 'Sudah disetujui', checked: !!data.approved, critical: true }
    ]
  };

  const checklist = checklists[workflow] || [];
  const allDone = checklist.every(c => c.checked);
  const criticalDone = checklist.filter(c => c.critical !== false).every(c => c.checked);

  return {
    checklist,
    allDone,
    criticalDone,
    remaining: checklist.filter(c => !c.checked).length,
    html: checklist.map(c => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e2e8f0;">
        <input type="checkbox" ${c.checked ? 'checked' : ''} disabled style="cursor:pointer;width:18px;height:18px;">
        <span style="font-size:13px;color:${c.checked ? '#475569' : '#94a3b8'};text-decoration:${c.checked ? 'line-through' : 'none'};">
          ${c.label}
        </span>
        ${c.critical ? '<span style="color:#dc2626;font-weight:700;font-size:10px;margin-left:auto;">KRITIS</span>' : ''}
      </div>
    `).join('')
  };
}

/**
 * Get smart alerts based on current data
 */
export function getSmartAlerts(context) {
  return SmartSuggestions.getAlerts(context);
}

/**
 * Get next action suggestions
 */
export function getNextActionSuggestions(currentPage) {
  return SmartSuggestions.getNextAction(currentPage);
}

// ── Advanced Data Filtering ────────────────────────────────────

/**
 * Filter santri yang belum dievaluasi
 */
export function filterNotEvaluated(allSantri, evaluations, idField = 'STambuk') {
  const evaluated = new Set(evaluations.map(e => String(e[idField])));
  return allSantri.filter(s => !evaluated.has(String(s[idField])));
}

/**
 * Filter santri yang remedial
 */
export function filterRemedial(evaluations, threshold = 70) {
  return evaluations.filter(e => {
    const ind = typeof e.Indikator === 'string'
      ? JSON.parse(e.Indikator || '{}')
      : (e.Indikator || {});
    const score = calculateScoreFromIndicators(ind);
    return score < threshold;
  });
}

/**
 * Get best score per santri
 */
export function getBestScorePerSantri(evaluations, idField = 'PesertaID') {
  const map = {};

  evaluations.forEach(e => {
    const id = String(e[idField]);
    const ind = typeof e.Indikator === 'string'
      ? JSON.parse(e.Indikator || '{}')
      : (e.Indikator || {});
    const score = calculateScoreFromIndicators(ind);

    if (!map[id] || score > map[id].score) {
      map[id] = { score, record: e, tanggal: e.Tanggal };
    }
  });

  return map;
}

/**
 * Group evaluations by date
 */
export function groupByDate(evaluations, dateField = 'Tanggal') {
  const grouped = {};

  evaluations.forEach(e => {
    const date = e[dateField];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(e);
  });

  return Object.entries(grouped)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
}

/**
 * Calculate statistics from evaluations
 */
export function getEvaluationStats(evaluations) {
  if (!evaluations.length) {
    return { avg: 0, min: 0, max: 0, remedial: 0, total: 0 };
  }

  const scores = evaluations.map(e => {
    const ind = typeof e.Indikator === 'string'
      ? JSON.parse(e.Indikator || '{}')
      : (e.Indikator || {});
    return calculateScoreFromIndicators(ind);
  });

  return {
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    min: Math.min(...scores),
    max: Math.max(...scores),
    remedial: scores.filter(s => s < 70).length,
    total: evaluations.length
  };
}

// ── Smart Form Helpers ─────────────────────────────────────────

/**
 * Validate entire form before submission
 */
export function validateFormData(formId, collection, rules) {
  const formData = new FormData(document.getElementById(formId));
  const data = Object.fromEntries(formData);

  // Convert based on expected types
  const schema = rules[collection] || [];
  schema.forEach(r => {
    if (r.type === 'number' && data[r.field]) {
      data[r.field] = Number(data[r.field]);
    }
  });

  const result = validator.validateItem(collection, data);
  return {
    ...result,
    data: result.isValid ? data : null,
    errorHtml: result.errors.map(e =>
      `<div style="color:#dc2626;font-size:12px;margin:4px 0;">✗ ${e.message}</div>`
    ).join('')
  };
}

/**
 * Generate error alert HTML
 */
export function getErrorAlert(title, errors) {
  const errorList = Array.isArray(errors)
    ? errors.map(e => `<li style="margin:4px 0;">${e}</li>`).join('')
    : `<li>${errors}</li>`;

  return `
    <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:12px;margin-bottom:12px;">
      <div style="font-weight:700;color:#dc2626;margin-bottom:8px;">⚠ ${title}</div>
      <ul style="margin:0;padding-left:20px;color:#991b1b;">
        ${errorList}
      </ul>
    </div>
  `;
}

/**
 * Generate success confirmation HTML
 */
export function getSuccessConfirm(title, message, details = []) {
  const detailHtml = details.map(d =>
    `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;">
      <span style="color:#6b7280;">${d.label}:</span>
      <strong style="color:#0f172a;">${d.value}</strong>
    </div>`
  ).join('');

  return `
    <div style="background:#dcfce7;border:1px solid #86efac;border-radius:6px;padding:12px;margin-bottom:12px;">
      <div style="font-weight:700;color:#16a34a;margin-bottom:8px;">✓ ${title}</div>
      <div style="font-size:13px;color:#166534;margin-bottom:8px;">${message}</div>
      ${detailHtml}
    </div>
  `;
}

export { WorkflowEngine, SmartSuggestions, validator, VALIDATION_RULES, validateWorkflow };
