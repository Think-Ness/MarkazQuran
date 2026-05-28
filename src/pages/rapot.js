import { getRapot, saveRapot, deleteRapot, saveRapotPdf } from '../api.js';
import { getNilaiKategori, fmtDate, showToast } from '../utils.js';
import { dataStore } from '../datastore.js';
import { ColumnFilter } from '../components/column-filter.js';

let activeTab = 'lulus';
let allRapot = [];
let selectedForGen = new Set();
let rapotColFilter = null;
let currentRecord = null;

// ── Helpers ─────────────────────────────────────────────────────────────────
function getMinLulus() {
  const c = dataStore.get('config');
  return Number(c?.nilaiMinLulus ?? 70);
}
function getRentang() {
  const c = dataStore.get('config');
  return c?.rentangNilai || [];
}
function getPeriode() {
  const c = dataStore.get('config');
  return c?.periodeAktif || '';
}
function getSantriNama(stambuk) {
  const s = dataStore.get('santri').find(x => String(x.STambuk) === String(stambuk));
  return s ? s.Nama : stambuk;
}
function getSantriKelas(stambuk) {
  const s = dataStore.get('santri').find(x => String(x.STambuk) === String(stambuk));
  return s?.Kelas || '-';
}
function getGuruNama(id) {
  const g = dataStore.get('guru').find(x => String(x.IDGuru) === String(id) || x.Nama === id);
  return g ? g.Nama : (id || '-');
}

function resolvePeserta(pesertaId, tipePeserta) {
  if (tipePeserta === 'Guru' || tipePeserta === 'guru') {
    const g = dataStore.get('guru').find(x => String(x.IDGuru) === String(pesertaId) || x.Nama === pesertaId);
    return g ? { nama: g.Nama, kelas: g.TahunPengabdian || 'Guru', isGuru: true } : { nama: pesertaId, kelas: 'Guru', isGuru: true };
  }
  const s = dataStore.get('santri').find(x => String(x.STambuk) === String(pesertaId));
  return s ? { nama: s.Nama, kelas: s.Kelas || '-', isGuru: false } : { nama: pesertaId, kelas: '-', isGuru: false };
}

function getIndikator() {
  const c = dataStore.get('config');
  return c?.indikatorChecklist || [];
}

function getBestRecord(records) {
  if (!records.length) return null;
  return records.reduce((best, cur) => Number(cur.NilaiAkhir) > Number(best.NilaiAkhir) ? cur : best);
}

// ── Detect all lulus peserta across all sesi ─────────────────────────────
// ── Detect all lulus peserta across all sesi ─────────────────────────────
function detectPesertaLulus() {
  const minLulus = getMinLulus();
  const allTes = dataStore.get('tesBacaan');
  const allHf = dataStore.get('hafalan');
  const allSesi = dataStore.get('sesiUjian');
  const result = [];

  for (const sesi of allSesi) {
    const isBacaan = sesi.TipeSesi !== 'Hafalan';
    const pesertaList = sesi._peserta || [];
    
    for (const pItem of pesertaList) {
      // Handle both new format (object) and old format (string "santri:123")
      const isObj = typeof pItem === 'object';
      const tipePeserta = isObj ? (pItem.tipe || 'santri') : (pItem.includes(':') ? pItem.split(':')[0] : 'santri');
      const pesertaId = isObj ? (pItem.id) : (pItem.includes(':') ? pItem.split(':')[1] : pItem);
      
      const p = resolvePeserta(pesertaId, tipePeserta);
      if (!p || !p.nama) continue; // Skip invalid
      
      let nilaiPost = 0, nilaiPre = null, predikat = null, isLulus = false, jenisTesTerakhir = '-';
      let hfSelesai = 0, hfTotal = 0, hfPct = 0;
      
      if (isBacaan) {
        const tests = allTes.filter(t => String(t.SesiID) === String(sesi.SesiID) && String(t.PesertaID) === String(pesertaId));
        const postTests = tests.filter(t => t.JenisTes === 'Post Test');
        const bestPost = getBestRecord(postTests);
        if (!bestPost || Number(bestPost.NilaiAkhir) < minLulus) continue; // Only show passed participants
        
        const bestPre = getBestRecord(tests.filter(t => t.JenisTes === 'Pre Test'));
        nilaiPost = Number(bestPost.NilaiAkhir);
        nilaiPre = bestPre ? Number(bestPre.NilaiAkhir) : null;
        predikat = getNilaiKategori(nilaiPost, getRentang());
        isLulus = true;
        jenisTesTerakhir = 'Post Test';
      } else {
        // Hafalan Mode
        const targetSurahs = sesi._materi ? sesi._materi.surahs : [];
        const hfItems = allHf.filter(h => {
          if (String(h.STambuk) !== String(pesertaId)) return false;
          if (h.SesiID && String(h.SesiID) === String(sesi.SesiID)) return true;
          return targetSurahs && targetSurahs.includes(h.NamaSurah);
        });
        
        hfTotal = targetSurahs ? targetSurahs.length : 0;
        const selesaiList = [...new Set(hfItems.filter(h => h.Status === 'Selesai').map(h => h.NamaSurah))];
        hfSelesai = selesaiList.length;
        hfPct = hfTotal > 0 ? Math.round((hfSelesai / hfTotal) * 100) : (hfSelesai > 0 ? 100 : 0);
        
        if (hfTotal > 0 && hfPct === 0) continue; // Skip if 0 progress
        
        isLulus = true;
        predikat = { label: hfSelesai >= hfTotal && hfTotal > 0 ? 'Selesai' : 'Proses', cls: hfSelesai >= hfTotal && hfTotal > 0 ? 'badge-selesai' : 'badge-proses' };
        jenisTesTerakhir = 'Hafalan';
      }

      if (!isLulus) continue;

      const existingRapot = allRapot.find(r => String(r.STambuk) === String(pesertaId) && String(r.SesiID) === String(sesi.SesiID));

      result.push({
        pesertaId,
        tipePeserta,
        nama: p.nama,
        kelas: p.kelas,
        isGuru: p.isGuru,
        sesiNama: sesi.NamaSesi || '-',
        sesiId: sesi.SesiID,
        tipeSesi: sesi.TipeSesi || 'Bacaan',
        jenisTesTerakhir,
        sesiPeriode: sesi.Periode || dataStore.get('config')?.periodeAktif || '-',
        sesiPenandatangan: sesi.Penandatangan || '',
        sesiTTDUrl: sesi.TTDUrl || '',
        nilaiPost,
        nilaiPre,
        predikat,
        hfPct,
        hfSelesai,
        hfTotal,
        hasRapot: !!existingRapot,
        rapotId: existingRapot?.ID
      });
    }
  }

  return result.sort((a, b) => b.nilaiPost - a.nilaiPost);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════════════════════════
export async function renderRapot(container) {
  container.innerHTML = `
    <div class="page-header no-print">
      <div><h2>Rapot & Sertifikat</h2><p>Generate rapot batch untuk peserta yang lulus evaluasi</p></div>
      <div class="flex gap-8 no-print">
        <button class="btn btn-outline" id="btnRefreshRapot" style="display:flex;align-items:center;gap:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Refresh
        </button>
      </div>
    </div>

    <!-- Periode notification -->
    <div id="periodeAlert" style="display:none;"></div>

    <div class="tab-bar no-print" style="margin-bottom:20px;">
      <button class="tab-btn active" data-rtab="lulus">🏆 Peserta Lulus</button>
      <button class="tab-btn" data-rtab="riwayat">📋 Riwayat Rapot</button>
      <button class="tab-btn" data-rtab="preview">👁 Preview & Cetak</button>
    </div>

    <!-- TAB 1: PESERTA LULUS -->
    <div id="rTabLulus">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div class="filter-bar">
            <div class="search-box"><span class="search-icon">&#128269;</span>
              <input type="text" id="srchLulus" placeholder="Cari nama / ID...">
            </div>
            <select id="flTipeLulus" style="min-width:110px;">
              <option value="">Semua Tipe</option>
              <option value="Santri">Santri</option>
              <option value="Guru">Guru</option>
            </select>
            <select id="flKelasLulus" style="min-width:110px;">
              <option value="">Semua Kelas</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Batch Generate toolbar -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div style="font-size:13px;color:var(--text-muted);" id="lulusCount">-</div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" id="btnSelectAllLulus" style="display:flex;align-items:center;gap:4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Pilih Semua
          </button>
          <button class="btn btn-primary" id="btnGenerateBatch" style="display:flex;align-items:center;gap:6px;" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Generate Rapot (<span id="genCount">0</span>)
          </button>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr id="lulusTableHead">
              <th style="width:36px;"><input type="checkbox" id="cbSelectAllLulus" style="accent-color:var(--primary);"></th>
              <th class="sortable-th" data-lsort="no"># <span class="sort-icon"></span></th>
              <th class="sortable-th" data-lsort="nama">Nama <span class="sort-icon"></span></th>
              <th class="sortable-th" data-lsort="tipe">Tipe <span class="sort-icon"></span></th>
              <th class="sortable-th" data-lsort="kelas">Kelas <span class="sort-icon"></span></th>
              <th class="sortable-th" data-lsort="sesi">Sesi <span class="sort-icon"></span></th>
              <th class="sortable-th" data-lsort="nilai" style="text-align:center;">Nilai Post <span class="sort-icon"></span></th>
              <th style="text-align:center;">Hafalan</th>
              <th style="text-align:center;">Status</th>
            </tr></thead>
            <tbody id="lulusBody"><tr><td colspan="9" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: RIWAYAT RAPOT -->
    <div id="rTabRiwayat" style="display:none;">
      <div class="card">
        <div class="card-header"><h3>Riwayat Rapot</h3><span class="text-muted" id="riwayatCount">-</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Stambuk</th><th>Nama</th><th>Periode</th><th>Tipe Sesi</th><th>Nilai / Status</th><th>Tanggal</th><th>Aksi</th></tr></thead>
            <tbody id="riwayatBody"><tr><td colspan="8" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: PREVIEW -->
    <div id="rTabPreview" style="display:none;">
      <div class="flex gap-12 mb-16 no-print" style="margin-bottom:16px;">
        <button class="btn btn-primary" onclick="window.print()" style="display:flex;align-items:center;gap:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Cetak / Save PDF
        </button>
        <button class="btn btn-gold" id="btnSavePdfDrive" style="display:flex;align-items:center;gap:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Simpan PDF ke Drive
        </button>
        <button class="btn btn-outline" id="btnBackLulus" style="display:flex;align-items:center;gap:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Kembali
        </button>
      </div>
      <div id="rapotPreviewCard" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:32px;max-width:820px;margin:0 auto;">
        <p class="no-data">Pilih rapot dari daftar atau generate batch untuk ditampilkan.</p>
      </div>
    </div>

    <!-- MODAL BATCH GENERATE -->
    <div class="modal-overlay" id="modalBatchGen">
      <div class="modal modal-lg" style="max-width:680px;">
        <div class="modal-header">
          <h3>Generate Rapot Batch</h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalBatchGen').classList.remove('show')">&#10005;</button>
        </div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
          <div class="form-grid" style="margin-bottom:16px;">
            <div class="form-group"><label>Tanggal Rapot</label><input type="date" id="batchTanggal"></div>
            <div class="form-group"><label>Catatan (opsional)</label><input type="text" id="batchCatatan" placeholder="Catatan untuk semua rapot dalam batch ini..."></div>
          </div>
          <div style="border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--surface2);">
            <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px;">Peserta yang akan di-generate:</div>
            <div id="batchPesertaList" style="max-height:200px;overflow-y:auto;"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalBatchGen').classList.remove('show')">Batal</button>
          <button class="btn btn-primary" id="btnProcessBatch" style="display:flex;align-items:center;gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Proses Generate
          </button>
        </div>
      </div>
    </div>
  `;

  // ── Events ───────────────────────────────────────────────────────────────
  document.getElementById('btnRefreshRapot').onclick = loadData;
  document.getElementById('srchLulus').oninput = renderLulusList;
  document.getElementById('flTipeLulus').onchange = renderLulusList;
  document.getElementById('flKelasLulus').onchange = renderLulusList;
  document.getElementById('btnSelectAllLulus').onclick = selectAllLulus;
  document.getElementById('cbSelectAllLulus').onchange = (e) => {
    if (e.target.checked) selectAllLulus(); else { selectedForGen.clear(); renderLulusList(); }
  };
  document.getElementById('btnGenerateBatch').onclick = openBatchModal;
  document.getElementById('btnProcessBatch').onclick = processBatch;
  document.getElementById('btnBackLulus').onclick = () => switchRapotTab('lulus');
  document.getElementById('btnSavePdfDrive').onclick = savePdfToDrive;

  // Tab switching
  document.querySelectorAll('[data-rtab]').forEach(btn => {
    btn.onclick = () => switchRapotTab(btn.dataset.rtab);
  });

  // Sortable headers
  let lSortCol = null, lSortDir = 'asc';
  document.querySelectorAll('.sortable-th[data-lsort]').forEach(th => {
    th.onclick = () => {
      const col = th.dataset.lsort;
      if (lSortCol === col) lSortDir = lSortDir === 'asc' ? 'desc' : 'asc';
      else { lSortCol = col; lSortDir = 'asc'; }
      document.querySelectorAll('.sortable-th[data-lsort] .sort-icon').forEach(ic => ic.innerHTML = '');
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.innerHTML = lSortDir === 'asc'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>';
      renderLulusList();
    };
  });

  // Column filters for lulus table
  rapotColFilter = new ColumnFilter({
    onFilter: () => renderLulusList(),
    getValues: (colKey) => {
      const peserta = detectPesertaLulus();
      switch (colKey) {
        case 'tipe': return peserta.map(p => p.isGuru ? 'Guru' : 'Santri');
        case 'kelas': return peserta.map(p => p.kelas);
        case 'sesi': return peserta.map(p => p.sesiNama);
        default: return [];
      }
    }
  });
  ['tipe', 'kelas', 'sesi'].forEach(col => {
    const th = document.querySelector(`.sortable-th[data-lsort="${col}"]`);
    if (th) rapotColFilter.attach(th, col);
  });

  // Store sort state for access in renderLulusList
  window._rapotSort = { get col() { return lSortCol; }, get dir() { return lSortDir; } };

  await loadData();

  // Check periode
  checkPeriode();

  // Populate kelas filter
  const klasses = [...new Set(dataStore.get('santri').map(s => s.Kelas).filter(Boolean))].sort();
  document.getElementById('flKelasLulus').innerHTML = '<option value="">Semua Kelas</option>' + klasses.map(k => `<option value="${k}">${k}</option>`).join('');
}

// ── Tab Switch ──────────────────────────────────────────────────────────────
function switchRapotTab(tab) {
  activeTab = tab;
  document.getElementById('rTabLulus').style.display = tab === 'lulus' ? '' : 'none';
  document.getElementById('rTabRiwayat').style.display = tab === 'riwayat' ? '' : 'none';
  document.getElementById('rTabPreview').style.display = tab === 'preview' ? '' : 'none';
  document.querySelectorAll('[data-rtab]').forEach(b => b.classList.toggle('active', b.dataset.rtab === tab));
}

// ── Load Data ───────────────────────────────────────────────────────────────
async function loadData() {
  const safeArr = r => Array.isArray(r) ? r : (typeof r === 'string' ? JSON.parse(r) : []);
  allRapot = await getRapot().then(safeArr);
  renderLulusList();
  renderRiwayatList();
}

// ── Check Periode ───────────────────────────────────────────────────────────
function checkPeriode() {
  const config = dataStore.get('config') || {};
  const periode = config.periodeAktif || '';
  const periodeEnd = config.periodeEnd || '';
  const alert = document.getElementById('periodeAlert');
  
  if (!periode) {
    alert.style.display = 'block';
    alert.innerHTML = `<div class="alert alert-warning" style="display:flex;align-items:center;gap:10px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div><strong>Periode belum diatur!</strong> Silakan ke menu <b>Pengaturan</b> untuk mengatur periode evaluasi (contoh: "Semester 1 2024/2025") sebelum generate rapot.
      <button class="btn btn-outline btn-sm" onclick="window.navigate('setup')" style="margin-left:8px;">Ke Pengaturan</button></div>
    </div>`;
    return;
  }

  if (periodeEnd && new Date(periodeEnd) < new Date()) {
    alert.style.display = 'block';
    alert.innerHTML = `<div class="alert alert-error" style="display:flex;align-items:center;gap:10px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <div><strong>Periode "${periode}" sudah berakhir!</strong> Silakan update periode di menu <b>Pengaturan</b> sebelum generate rapot baru.
      <button class="btn btn-outline btn-sm" onclick="window.navigate('setup')" style="margin-left:8px;">Update Periode</button></div>
    </div>`;
  } else {
    alert.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: PESERTA LULUS
// ═══════════════════════════════════════════════════════════════════════════
function renderLulusList() {
  const q = (document.getElementById('srchLulus')?.value || '').toLowerCase();
  const fTipe = document.getElementById('flTipeLulus')?.value || '';
  const fKelas = document.getElementById('flKelasLulus')?.value || '';

  let peserta = detectPesertaLulus().filter(p => !p.hasRapot);

  // Text search
  if (q) peserta = peserta.filter(p => p.nama.toLowerCase().includes(q) || String(p.pesertaId).includes(q));
  // Type filter
  if (fTipe) peserta = peserta.filter(p => (p.isGuru ? 'Guru' : 'Santri') === fTipe);
  // Kelas filter
  if (fKelas) peserta = peserta.filter(p => p.kelas === fKelas);

  // Column filters
  if (rapotColFilter) {
    const filters = rapotColFilter.getActiveFilters();
    for (const [col, allowed] of Object.entries(filters)) {
      peserta = peserta.filter(p => {
        let val;
        switch (col) {
          case 'tipe': val = p.isGuru ? 'Guru' : 'Santri'; break;
          case 'kelas': val = p.kelas; break;
          case 'sesi': val = p.sesiNama; break;
          default: val = '';
        }
        return allowed.has(String(val));
      });
    }
  }

  // Sort
  const sort = window._rapotSort;
  if (sort?.col) {
    peserta.sort((a, b) => {
      let vA, vB;
      switch (sort.col) {
        case 'nama': vA = a.nama.toLowerCase(); vB = b.nama.toLowerCase(); break;
        case 'tipe': vA = a.isGuru ? 'Guru' : 'Santri'; vB = b.isGuru ? 'Guru' : 'Santri'; break;
        case 'kelas': vA = a.kelas; vB = b.kelas; break;
        case 'sesi': vA = a.sesiNama; vB = b.sesiNama; break;
        case 'nilai': vA = a.nilaiPost; vB = b.nilaiPost; break;
        default: vA = 0; vB = 0;
      }
      if (typeof vA === 'string') return sort.dir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return sort.dir === 'asc' ? vA - vB : vB - vA;
    });
  }

  const countEl = document.getElementById('lulusCount');
  if (!countEl) return;
  countEl.innerText = `${peserta.length} peserta lulus (Post Test ≥ ${getMinLulus()})`;

  const body = document.getElementById('lulusBody');
  if (!body) return;
  
  if (!peserta.length) {
    body.innerHTML = `<tr><td colspan="9" class="no-data">Tidak ada peserta yang lulus</td></tr>`;
    return;
  }

  body.innerHTML = peserta.map((p, i) => {
    const isSelected = selectedForGen.has(p.pesertaId);
    const pColor = p.predikat.cls.includes('selesai') ? '#16a34a' : (p.predikat.cls.includes('proses') ? '#d97706' : '#3b73c8');
    return `<tr style="${isSelected ? 'background:#f0fdf4;' : ''}">
      <td><input type="checkbox" class="cb-gen" data-id="${p.pesertaId}" data-tipe="${p.tipePeserta}" ${isSelected ? 'checked' : ''} style="accent-color:var(--primary);"></td>
      <td style="color:var(--text-muted);font-size:12px;">${i + 1}</td>
      <td style="font-weight:600;">${p.nama}</td>
      <td><span style="font-size:10px;color:#fff;background:${p.isGuru ? '#64748b' : '#84cc16'};padding:2px 6px;border-radius:4px;font-weight:700;">${p.isGuru ? 'Guru' : 'Santri'}</span></td>
      <td style="font-size:12px;">${p.kelas}</td>
      <td style="font-size:12px;">${p.sesiNama}</td>
      <td style="text-align:center;"><span style="font-size:18px;font-weight:800;color:${pColor};">${p.nilaiPost}</span><br><span class="badge ${p.predikat.cls}" style="font-size:9px;">${p.predikat.label}</span></td>
      <td style="text-align:center;font-size:12px;">${p.hfPct}%<br><span style="color:var(--text-muted);">${p.hfSelesai}/${p.hfTotal}</span></td>
      <td style="text-align:center;">${p.hasRapot
        ? `<span class="badge badge-selesai" style="font-size:10px;cursor:pointer;" onclick="previewExistingRapot('${p.rapotId}')">✓ Sudah</span>`
        : `<span class="badge badge-belum" style="font-size:10px;">Belum</span>`}
      </td>
    </tr>`;
  }).join('');

  // Checkbox events
  body.querySelectorAll('.cb-gen').forEach(cb => {
    cb.onchange = () => {
      if (cb.checked) selectedForGen.add(cb.dataset.id);
      else selectedForGen.delete(cb.dataset.id);
      updateGenCount();
    };
  });

  updateGenCount();
}

function selectAllLulus() {
  const peserta = detectPesertaLulus();
  peserta.forEach(p => selectedForGen.add(p.pesertaId));
  renderLulusList();
}

function updateGenCount() {
  const count = selectedForGen.size;
  document.getElementById('genCount').innerText = count;
  document.getElementById('btnGenerateBatch').disabled = count === 0;
  document.getElementById('cbSelectAllLulus').checked = count > 0 && count === detectPesertaLulus().length;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH GENERATE MODAL
// ═══════════════════════════════════════════════════════════════════════════
function openBatchModal() {
  document.getElementById('batchTanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('batchCatatan').value = '';
  
  const peserta = detectPesertaLulus().filter(p => selectedForGen.has(p.pesertaId));
  document.getElementById('batchPesertaList').innerHTML = peserta.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-bottom:1px solid var(--border);font-size:12px;">
      <div>
        <span style="font-weight:600;">${p.nama}</span>
        <span style="color:var(--text-muted);margin-left:6px;">${p.kelas}</span>
      </div>
      <div>
        <span style="font-weight:800;color:var(--primary);">${p.nilaiPost}</span>
        <span class="badge ${p.predikat.cls}" style="font-size:9px;margin-left:4px;">${p.predikat.label}</span>
      </div>
    </div>
  `).join('');

  document.getElementById('modalBatchGen').classList.add('show');
}

async function processBatch() {
  const tgl = document.getElementById('batchTanggal').value;
  const catatan = document.getElementById('batchCatatan').value.trim();
  const peserta = detectPesertaLulus().filter(p => selectedForGen.has(p.pesertaId));

  if (!peserta.length) return showToast('Tidak ada peserta terpilih', 'error');

  const btn = document.getElementById('btnProcessBatch');
  btn.disabled = true; btn.innerText = 'Memproses...';

  let successCount = 0;
  for (const p of peserta) {
    let detailIndikator = '';
    if (p.tipeSesi === 'Bacaan') {
      const tests = dataStore.get('tesBacaan').filter(t => String(t.SesiID) === String(p.sesiId) && String(t.PesertaID) === String(p.pesertaId));
      const bestPost = getBestRecord(tests.filter(t => t.JenisTes === 'Post Test'));
      if (bestPost) {
        const det = {};
        for(let i=1; i<=10; i++) det[`Ind${i}`] = bestPost[`Ind${i}`] || 0;
        detailIndikator = JSON.stringify(det);
      }
    }

    const data = {
      SesiID: p.sesiId,
      STambuk: p.pesertaId,
      NamaSantri: p.nama,
      Periode: p.sesiPeriode,
      TipeSesi: p.tipeSesi,
      JenisTes: p.jenisTesTerakhir,
      NilaiAkhir: p.tipeSesi === 'Bacaan' ? p.nilaiPost : p.hfPct,
      DetailIndikator: detailIndikator,
      Catatan: catatan,
      Tanggal: tgl,
      _penguji: p.sesiPenandatangan || 'Admin Markaz',
      _ttdUrl: p.sesiTTDUrl,
      _tipePeserta: p.tipePeserta,
      _kelas: p.kelas
    };

    try {
      const r = await saveRapot(data);
      if (r.ok) successCount++;
    } catch (e) { console.error('Batch save error:', e); }
  }

  btn.disabled = false; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Proses Generate`;

  document.getElementById('modalBatchGen').classList.remove('show');
  showToast(`✓ ${successCount} rapot berhasil di-generate`);
  selectedForGen.clear();
  await loadData();
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: RIWAYAT RAPOT
// ═══════════════════════════════════════════════════════════════════════════
function renderRiwayatList() {
  document.getElementById('riwayatCount').textContent = allRapot.length + ' rapot';
  if (!allRapot.length) {
    document.getElementById('riwayatBody').innerHTML = '<tr><td colspan="8" class="no-data">Belum ada rapot</td></tr>';
    return;
  }
  document.getElementById('riwayatBody').innerHTML = [...allRapot].reverse().map((r, i) => {
    const isHafalan = r.TipeSesi === 'Hafalan' || (r.TipeSesi === '' && r.NilaiHafalan > 0 && r.NilaiBacaan == 0);
    const k = getNilaiKategori(r.NilaiAkhir || r.NilaiBacaan || r.NilaiHafalan || 0);
    return `<tr>
      <td style="color:var(--text-muted);font-size:12px;">${i + 1}</td>
      <td><code style="font-size:12px;">${r.STambuk}</code></td>
      <td style="font-weight:600;">${r.NamaSantri}</td>
      <td>${r.Periode || '-'}</td>
      <td><span style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">${r.TipeSesi || 'Bacaan'}</span></td>
      <td>
        <strong style="color:${isHafalan ? '#d97706' : 'var(--primary)'};font-size:15px;">
          ${isHafalan ? (r.NilaiAkhir === 100 ? 'Selesai' : (r.NilaiAkhir||r.NilaiHafalan||0)+'%') : (r.NilaiAkhir||r.NilaiBacaan||'-')}
        </strong> 
        ${!isHafalan ? `<span class="badge ${k.cls}" style="font-size:10px;">${k.label}</span>` : ''}
      </td>
      <td style="font-size:12px;">${fmtDate(r.Tanggal)}</td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:4px;" data-rprev="${r.ID}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview
          </button>
          <button class="btn btn-danger btn-sm" style="display:inline-flex;align-items:center;justify-content:center;height:28px;width:28px;padding:0;" data-rdel="${r.ID}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.querySelectorAll('[data-rprev]').forEach(b => b.onclick = () => {
    const r = allRapot.find(x => x.ID === b.dataset.rprev);
    if (r) { renderRapotPreview(r); switchRapotTab('preview'); }
  });
  document.querySelectorAll('[data-rdel]').forEach(b => b.onclick = async () => {
    if (!confirm('Hapus rapot ini?')) return;
    const r = await deleteRapot(b.dataset.rdel);
    if (r.ok) { showToast('Rapot dihapus'); loadData(); }
  });
}

window.previewExistingRapot = (id) => {
  const r = allRapot.find(x => x.ID === id);
  if (r) { renderRapotPreview(r); switchRapotTab('preview'); }
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: PREVIEW (reuse existing preview logic)
// ═══════════════════════════════════════════════════════════════════════════
function renderRapotPreview(r) {
  currentRecord = r;
  const penguji = r._penguji || r.Penguji || "Pengurus Markaz Qur'an";
  const tanggal = new Date(r.Tanggal || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const ttdUrl = r._ttdUrl || '';
  const santri = dataStore.get('santri').find(s => String(s.STambuk) === String(r.STambuk));
  const santriKelas = santri?.Kelas || r._kelas || '-';

  // Live calculation
  const allTes = dataStore.get('tesBacaan').filter(t => String(t.PesertaID) === String(r.STambuk)).sort((a,b) => new Date(a.Tanggal) - new Date(b.Tanggal));
  const preTests = allTes.filter(t => t.JenisTes === 'Pre Test');
  const postTests = allTes.filter(t => t.JenisTes === 'Post Test');
  
  let finalRecord = null;
  let isFinalRapot = true;
  
  if (r._tesId) {
    finalRecord = allTes.find(t => String(t.ID) === String(r._tesId));
    isFinalRapot = false;
  } else {
    finalRecord = getBestRecord(postTests) || getBestRecord(preTests);
  }
  
  const finalNilai = finalRecord ? Number(finalRecord.NilaiAkhir) : 0;
  const kFinal = getNilaiKategori(finalNilai, getRentang());

  const allHf = dataStore.get('hafalan').filter(h => String(h.STambuk) === String(r.STambuk));
  const hfSelesai = allHf.filter(h => h.Status === 'Selesai').length;
  const hfPct = allHf.length ? Math.round(hfSelesai / allHf.length * 100) : 0;
  const kHf = getNilaiKategori(hfPct, getRentang());
  const inds = getIndikator();

  const isHafalan = r.TipeSesi === 'Hafalan' || (r.TipeSesi === '' && r.NilaiHafalan > 0 && r.NilaiBacaan == 0);
  const sesiInfo = dataStore.get('sesiUjian').find(s => String(s.SesiID) === String(r.SesiID));
  const namaBatch = sesiInfo ? sesiInfo.NamaSesi : (r.TipeSesi ? '-' : '');

  document.getElementById('rapotPreviewCard').innerHTML = `
    <style>.rapot-preview-container * { font-family: 'Inter', system-ui, -apple-system, sans-serif !important; }</style>
    <div id="rapotExportArea" class="rapot-preview-container" style="background:#fff;padding:28px 36px;color:#334155;max-width:210mm;margin:0 auto;box-sizing:border-box;">
    <div style="text-align:center;border-bottom:3px double #1b6b4a;padding-bottom:10px;margin-bottom:14px;">
      <h1 style="font-size:22px;font-weight:800;color:#1b6b4a;margin:0;letter-spacing:1px;text-transform:uppercase;">MARKAZ QUR'AN</h1>
      <p style="font-size:10px;color:#64748b;margin:3px 0 0;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Lembaga Pendidikan &amp; Pembinaan Tahsin Tahfidz Qur'an Terpadu</p>
      ${r.Periode ? `<p style="font-size:11px;color:#1b6b4a;margin:5px 0 0;font-weight:700;letter-spacing:1px;text-transform:uppercase;">PERIODE: ${r.Periode}</p>` : ''}
      ${namaBatch && namaBatch !== '-' ? `<p style="font-size:11px;color:#d97706;margin:3px 0 0;font-weight:700;letter-spacing:1px;text-transform:uppercase;">BATCH / KELOMPOK: ${namaBatch}</p>` : ''}
      <p style="font-size:13px;color:#0f172a;margin:8px 0 0;font-weight:800;text-transform:uppercase;border:1px solid #1b6b4a;display:inline-block;padding:3px 12px;border-radius:4px;">
        ${isFinalRapot ? (isHafalan ? 'RAPOT HAFALAN AKHIR' : 'RAPOT EVALUASI AKHIR') : `HASIL ${finalRecord?.JenisTes.toUpperCase() || 'TES'}`}
      </p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;font-size:12px;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;">
      <div><table style="width:100%;border-collapse:collapse;">
        <tr><td style="border:none;padding:3px 0;color:#64748b;width:100px;">Nama</td><td style="border:none;padding:3px 0;font-weight:700;color:#0f172a;">: ${r.NamaSantri}</td></tr>
        <tr><td style="border:none;padding:3px 0;color:#64748b;">No. Stambuk</td><td style="border:none;padding:3px 0;font-family:monospace;font-weight:700;">: ${r.STambuk}</td></tr>
      </table></div>
      <div><table style="width:100%;border-collapse:collapse;">
        <tr><td style="border:none;padding:3px 0;color:#64748b;width:110px;">Kelas</td><td style="border:none;padding:3px 0;font-weight:600;">: ${santriKelas}</td></tr>
        <tr><td style="border:none;padding:3px 0;color:#64748b;">Predikat</td><td style="border:none;padding:3px 0;"><span class="badge ${kFinal.cls}">${kFinal.label}</span></td></tr>
      </table></div>
    </div>

    ${!isHafalan ? `
    <h4 style="font-size:11px;font-weight:700;color:#1b6b4a;margin:0 0 8px;border-bottom:2px solid #1b6b4a;padding-bottom:5px;text-transform:uppercase;">I. PENILAIAN TES BACAAN</h4>
    ${finalRecord ? `
      <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #dee2e6;margin-bottom:12px;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:7px 12px;text-align:left;font-weight:700;border:1px solid #dee2e6;">Indikator</th>
          <th style="padding:7px 12px;text-align:center;font-weight:700;border:1px solid #dee2e6;width:80px;">Jml Kesalahan</th>
          <th style="padding:7px 12px;text-align:center;font-weight:700;border:1px solid #dee2e6;width:110px;">Kategori</th>
        </tr></thead>
        <tbody>
          ${inds.map((ind, i) => {
            const n = Number(finalRecord[`Ind${i + 1}`] ?? 0);
            const c = n === 0 ? '#16a34a' : (n <= 2 ? '#d97706' : '#dc2626');
            const st = n === 0 ? 'Tidak Ada' : (n <= 2 ? 'Sedikit' : 'Perlu Latihan');
            return '<tr style="border-bottom:1px solid #e9ecef;">'
              + '<td style="padding:5px 12px;font-weight:600;color:#334155;border:1px solid #dee2e6;">' + ind.label + '</td>'
              + '<td style="padding:5px 12px;font-size:13px;font-weight:800;color:' + c + ';text-align:center;border:1px solid #dee2e6;">' + n + '</td>'
              + '<td style="padding:5px 12px;text-align:center;border:1px solid #dee2e6;color:' + c + ';font-weight:700;font-size:11px;">' + st + '</td>'
              + '</tr>';
          }).join('')}
        </tbody>
        <tbody>
          <tr style="background:#f0fdf4;font-weight:700;">
            <td style="padding:9px 12px;border:1px solid #dee2e6;font-size:13px;color:#1b6b4a;width:50%;">NILAI AKHIR ${isFinalRapot ? '(STANDAR LULUS)' : ''}</td>
            <td colspan="2" style="padding:9px 12px;border:1px solid #dee2e6;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#1b6b4a;">${finalNilai}</span>
              <span class="badge ${kFinal.cls}" style="font-size:11px;margin-left:8px;">${kFinal.label}</span>
            </td>
          </tr>
        </tbody>
      </table>
    ` : `<p style="color:#94a3b8;font-style:italic;">Belum ada data tes</p>`}
    ` : ''}

    <!-- Hafalan - COMPACT INLINE ROW -->
    <h4 style="font-size:11px;font-weight:700;color:#d97706;margin:10px 0 6px;border-bottom:2px solid #d97706;padding-bottom:4px;text-transform:uppercase;">${isHafalan ? 'I.' : 'II.'} RINGKASAN HAFALAN</h4>
    <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #fde68a;margin-bottom:10px;">
      <thead><tr style="background:#fefce8;">
        <th style="padding:6px 12px;text-align:center;border:1px solid #fde68a;color:#92400e;font-weight:700;">Total Target</th>
        <th style="padding:6px 12px;text-align:center;border:1px solid #fde68a;color:#92400e;font-weight:700;">Selesai</th>
        <th style="padding:6px 12px;text-align:center;border:1px solid #fde68a;color:#92400e;font-weight:700;">Nilai Hafalan</th>
        <th style="padding:6px 12px;text-align:center;border:1px solid #fde68a;color:#92400e;font-weight:700;">Predikat</th>
      </tr></thead>
      <tbody><tr style="background:#fffbeb;">
        <td style="padding:7px 12px;text-align:center;border:1px solid #fde68a;font-size:18px;font-weight:800;color:#d97706;">${allHf.length}</td>
        <td style="padding:7px 12px;text-align:center;border:1px solid #fde68a;font-size:18px;font-weight:800;color:#1b6b4a;">${hfSelesai}</td>
        <td style="padding:7px 12px;text-align:center;border:1px solid #fde68a;font-size:18px;font-weight:800;color:#3b82f6;">${hfPct}%</td>
        <td style="padding:7px 12px;text-align:center;border:1px solid #fde68a;"><span class="badge ${kHf.cls}" style="font-size:11px;font-weight:700;">${kHf.label}</span></td>
      </tr></tbody>
    </table>

    ${r.Catatan || (finalRecord && finalRecord.Catatan) ? `
      <h4 style="font-size:11px;font-weight:700;color:#334155;margin:8px 0 4px;text-transform:uppercase;">Catatan:</h4>
      <div style="font-size:11px;background:#f8fafc;padding:8px 12px;border-radius:6px;border-left:3px solid #1b6b4a;border:1px solid #e2e8f0;line-height:1.5;color:#334155;">${r.Catatan || finalRecord.Catatan}</div>
    ` : ''}

    <!-- Tanda Tangan -->
    <div style="margin-top:24px;display:flex;justify-content:space-between;font-size:12px;padding:0 10px;">
      <div style="text-align:center;width:190px;">
        <p style="color:#475569;margin-bottom:52px;">Orang Tua / Wali Santri</p>
        <p style="border-bottom:1.5px solid #475569;padding-bottom:3px;font-weight:700;color:#0f172a;display:inline-block;min-width:150px;"></p>
      </div>
      <div style="text-align:center;width:210px;">
        <p style="color:#475569;margin-bottom:0;">Kediri, ${tanggal}</p>
        <p style="color:#475569;margin-top:2px;margin-bottom:${ttdUrl ? '8px' : '52px'};font-weight:500;">Wali Kelas / Penguji</p>
        ${ttdUrl ? `<img src="${ttdUrl}" style="height:45px;margin-bottom:4px;" alt="TTD">` : ''}
        <p style="border-bottom:1.5px solid #475569;padding-bottom:3px;font-weight:700;color:#0f172a;display:inline-block;min-width:150px;">${finalRecord ? (finalRecord.IDPenguji || penguji) : penguji}</p>
      </div>
    </div>

    <!-- PAGE 2: RIWAYAT / HISTORI -->
    <div id="lampiranRapotPage" style="page-break-before: always; break-before: page; margin-top: 40px; padding-top: 40px; border-top: 2px dashed #cbd5e1;">
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="font-size:18px;font-weight:800;color:#1b6b4a;margin:0;letter-spacing:1px;text-transform:uppercase;">LAMPIRAN RIWAYAT EVALUASI</h2>
        <p style="font-size:12px;color:#64748b;margin:4px 0 0;">Detail Histori Perkembangan & Setoran Santri</p>
      </div>

      <div id="lampiranGroupContainer">
        ${(() => {
          const shortInds = ['Kelancaran','Makh. Huruf','Sifat Huruf',"Mad Thabi'i",'Mad >2 Har.','Ghunnah','Waqf/Ibtida','Gharib','Lagu','Lain'];
          const allPeriodes = [...new Set([...allTes, ...allHf].map(x => x.Periode || 'Periode Sebelumnya'))];
          allPeriodes.sort((a,b) => {
            if (a === 'Periode Sebelumnya') return 1;
            if (b === 'Periode Sebelumnya') return -1;
            return b.localeCompare(a); // Sort descending
          });

          return allPeriodes.map(p => {
            const tList = allTes.filter(t => (t.Periode || 'Periode Sebelumnya') === p);
            const hList = allHf.filter(h => (h.Periode || 'Periode Sebelumnya') === p);

            let html = `
            <div style="margin-bottom:20px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #e2e8f0;overflow:hidden;">
              <div style="background:#f8fafc;border-bottom:2px solid #1b6b4a;padding:8px 14px;display:flex;align-items:center;gap:8px;">
                <span style="background:#1b6b4a;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">PERIODE</span>
                <span style="font-weight:700;font-size:12px;color:#0f172a;">${p}</span>
              </div>
              <div style="padding:12px;background:#fff;">`;

            // Tes Bacaan Table
            if (tList.length > 0) {
              html += `<h5 style="font-size:10px;font-weight:700;color:#64748b;margin:0 0 6px;text-transform:uppercase;">• Riwayat Tes Bacaan</h5>
              <table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #dee2e6;margin-bottom:12px;">
                <thead><tr style="background:#f1f5f9;color:#334155;">
                  <th style="padding:6px;text-align:left;border:1px solid #dee2e6;width:75px;">Tanggal</th>
                  <th style="padding:6px;text-align:left;border:1px solid #dee2e6;width:75px;">Jenis Tes</th>
                  <th style="padding:6px;text-align:center;border:1px solid #dee2e6;width:40px;">Nilai</th>
                  <th style="padding:6px;text-align:left;border:1px solid #dee2e6;">Catatan / Indikator (Kesalahan)</th>
                  <th style="padding:6px;text-align:left;border:1px solid #dee2e6;width:90px;">Penguji</th>
                </tr></thead>
                <tbody>
                  ${tList.map(t => {
                    const det = inds.map((ind, i) => {
                      const v = Number(t[`Ind${i+1}`] || 0);
                      return v > 0 ? `<span style="display:inline-block;background:#fee2e2;color:#dc2626;padding:1px 3px;border-radius:3px;margin:1px;font-size:8px;">${shortInds[i]}: ${v}</span>` : '';
                    }).filter(Boolean).join('');
                    return `<tr>
                      <td style="padding:5px 6px;border:1px solid #dee2e6;">${fmtDate(t.Tanggal)}</td>
                      <td style="padding:5px 6px;border:1px solid #dee2e6;font-weight:600;">${t.JenisTes}<br><span style="font-size:8px;color:#64748b;font-weight:400;">${t.NamaSurah}</span></td>
                      <td style="padding:5px 6px;border:1px solid #dee2e6;text-align:center;font-weight:800;font-size:12px;color:#1b6b4a;">${t.NilaiAkhir}</td>
                      <td style="padding:5px 6px;border:1px solid #dee2e6;">${det || '<span style="color:#16a34a;font-weight:600;font-size:9px;">Lancar (0 Kesalahan)</span>'}</td>
                      <td style="padding:5px 6px;border:1px solid #dee2e6;font-size:9px;color:#475569;">${t.IDPenguji}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>`;
            }

            // Hafalan Table
            if (hList.length > 0) {
              html += `<h5 style="font-size:10px;font-weight:700;color:#64748b;margin:0 0 6px;text-transform:uppercase;">• Setoran Hafalan</h5>
              <table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #dee2e6;">
                <thead><tr style="background:#f1f5f9;color:#334155;">
                  <th style="padding:6px;text-align:left;border:1px solid #dee2e6;">Surah / Materi</th>
                  <th style="padding:6px;text-align:left;border:1px solid #dee2e6;width:90px;">Rentang</th>
                  <th style="padding:6px;text-align:center;border:1px solid #dee2e6;width:60px;">Status</th>
                  <th style="padding:6px;text-align:left;border:1px solid #dee2e6;width:75px;">Tgl Selesai</th>
                </tr></thead>
                <tbody>
                  ${hList.map(h => `<tr>
                    <td style="padding:5px 6px;border:1px solid #dee2e6;font-weight:600;">${h.NamaSurah}</td>
                    <td style="padding:5px 6px;border:1px solid #dee2e6;color:#475569;">${h.AyatDari && h.AyatSampai ? h.AyatDari + ' - ' + h.AyatSampai : 'Semua'}</td>
                    <td style="padding:5px 6px;border:1px solid #dee2e6;text-align:center;">
                      <span style="display:inline-block;padding:2px 4px;border-radius:3px;font-size:8px;font-weight:600;background:${h.Status === 'Selesai' ? '#dcfce7' : '#fef9c3'};color:${h.Status === 'Selesai' ? '#166534' : '#854d0e'};">${h.Status}</span>
                    </td>
                    <td style="padding:5px 6px;border:1px solid #dee2e6;color:#64748b;">${h.TanggalSetor ? fmtDate(h.TanggalSetor) : '-'}</td>
                  </tr>`).join('')}
                </tbody>
              </table>`;
            }

            html += `</div></div>`;
            return html;
          }).join('');
        })()}
      </div>
    </div>
    </div>
  `;
}

async function savePdfToDrive() {
  const previewCard = document.getElementById('rapotPreviewCard');
  if (!previewCard || previewCard.querySelector('.no-data') || !currentRecord) {
    return showToast('Preview rapot terlebih dahulu', 'error');
  }

  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    return showToast('Library PDF belum siap, coba refresh halaman', 'error');
  }

  const btn = document.getElementById('btnSavePdfDrive');
  const origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerText = '⏳ Membuat PDF...';

  // Resolve data peserta untuk memastikan folder kelas akurat
  const tipePeserta = currentRecord._tipePeserta || 'Santri';
  const p = resolvePeserta(currentRecord.STambuk, tipePeserta);
  const kelas = currentRecord._kelas || (p && p.kelas) || (p && p.TahunPengabdian) || 'Umum';
  
  // Nama file = nama santri/guru saja
  const namaMurni = (p && p.nama) || currentRecord.NamaSantri || currentRecord.NamaGuru || '';
  const fileName = namaMurni.trim().replace(/\s+/g, '_') || `Rapot_${currentRecord.STambuk || 'Unknown'}`;

  try {
    const rapotEl = document.getElementById('rapotExportArea') || previewCard.firstElementChild || previewCard;
    const lampiranEl = rapotEl.querySelector('#lampiranRapotPage');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 10;
    const usableW = pdf.internal.pageSize.getWidth() - margin * 2;
    const usableH = pdf.internal.pageSize.getHeight() - margin * 2;

    const captureOpts = {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    };

    const addCanvasToPdf = (canvas, isFirstPage) => {
      if (!isFirstPage) pdf.addPage();
      const imgH = (canvas.height * usableW) / canvas.width;
      let yOff = 0, pg = 0;
      while (yOff < imgH) {
        if (pg > 0) pdf.addPage();
        const srcY = Math.round((yOff / imgH) * canvas.height);
        const srcH = Math.min(Math.round((usableH / imgH) * canvas.height), canvas.height - srcY);
        const sc = document.createElement('canvas');
        sc.width = canvas.width; sc.height = srcH;
        const cx = sc.getContext('2d');
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, sc.width, sc.height);
        cx.drawImage(canvas, 0, -srcY, canvas.width, canvas.height);
        pdf.addImage(sc.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, usableW, Math.min((srcH / canvas.height) * imgH, usableH));
        yOff += usableH; pg++;
      }
    };

    if (lampiranEl) {
      // Sembunyikan lampiran saat capture halaman pertama
      lampiranEl.style.display = 'none';
      const canvas1 = await html2canvas(rapotEl, captureOpts);
      
      // Tampilkan lagi dan capture hanya lampirannya
      lampiranEl.style.display = 'block';
      const canvas2 = await html2canvas(lampiranEl, captureOpts);

      addCanvasToPdf(canvas1, true);
      addCanvasToPdf(canvas2, false);
    } else {
      const canvas = await html2canvas(rapotEl, captureOpts);
      addCanvasToPdf(canvas, true);
    }

    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    btn.innerText = '⬆️ Mengupload ke Drive...';

    const res = await saveRapotPdf({
      pdfBase64,
      fileName,
      periode: currentRecord.Periode || 'Default',
      kelas: kelas,
      tipePeserta: tipePeserta
    });

    if (res.ok) {
      showToast('✓ PDF rapot berhasil disimpan ke Google Drive!');
      if (res.url) window.open(res.url, '_blank');
    } else {
      showToast(res.msg || 'Gagal menyimpan PDF', 'error');
    }
  } catch (e) {
    console.error('savePdfToDrive:', e);
    showToast('Error: ' + e.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = origHTML;
}

// ── Expose for sesi-ujian integration ───────────────────────────────────────
window.previewRapotSantri = (pesertaId, pesertaTipe, tesId = null) => {
  window.navigate('rapot');
  setTimeout(() => {
    const p = resolvePeserta(pesertaId, pesertaTipe);
    renderRapotPreview({
      STambuk: pesertaId,
      NamaSantri: p.nama,
      Periode: getPeriode(),
      Tanggal: new Date().toISOString(),
      _kelas: p.kelas,
      _tipePeserta: pesertaTipe,
      _tesId: tesId
    });
    switchRapotTab('preview');
  }, 100);
};
