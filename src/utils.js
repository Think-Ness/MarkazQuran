// ── Nilai helpers ─────────────────────────────────────────────
const DEFAULT_RANGES = [
  { min:90, max:100, label:'Sangat Baik',      cls:'badge-sb' },
  { min:80, max:89,  label:'Baik',             cls:'badge-b'  },
  { min:70, max:79,  label:'Cukup',            cls:'badge-c'  },
  { min:0,  max:69,  label:'Perlu Pembinaan',  cls:'badge-pb' }
];

export function getNilaiKategori(n, customRanges) {
  n = Number(n);
  const ranges = customRanges?.length ? customRanges : DEFAULT_RANGES;
  // Sort descending by min so highest match wins
  const sorted = [...ranges].sort((a, b) => b.min - a.min);
  for (const r of sorted) {
    if (n >= r.min && n <= (r.max ?? 100)) {
      // Derive badge class from label if not present
      const cls = r.cls || (
        r.label.includes('Sangat') ? 'badge-sb' :
        r.label.includes('Baik')   ? 'badge-b'  :
        r.label.includes('Cukup')  ? 'badge-c'  : 'badge-pb'
      );
      return { label: r.label, cls };
    }
  }
  return { label: 'Perlu Pembinaan', cls: 'badge-pb' };
}

export function nilaiBadge(n) {
  const k = getNilaiKategori(n);
  return `<span class="badge ${k.cls}">${k.label}</span>`;
}

// ── Format tanggal ────────────────────────────────────────────
export function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return String(d); }
}

// ── Toast ─────────────────────────────────────────────────────
export function showToast(msg, type = 'success', duration = 3000) {
  let tc = document.getElementById('toast-container');
  if (!tc) {
    tc = document.createElement('div');
    tc.id = 'toast-container';
    tc.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(tc);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ── Modal helpers ─────────────────────────────────────────────
export function openModal(id)  { document.getElementById(id)?.classList.add('show'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

export function initModalClose() {
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
  });
}

// ── Topbar date ───────────────────────────────────────────────
export function setTopbarDate() {
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = new Date().toLocaleDateString('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
}
