import { fmtDate, showToast, getNilaiKategori } from '../utils.js';
import { dataStore } from '../datastore.js';
import { SearchableSelect } from '../components/searchable-select.js';
import { ColumnFilter } from '../components/column-filter.js';

// ── Config helpers ───────────────────────────────────────────────────────────
function getMinLulus() {
  const cfg = dataStore.get('config');
  return Number(cfg?.nilaiMinLulus ?? cfg?.minLulus ?? 70);
}
function getRentang() {
  const cfg = dataStore.get('config');
  return cfg?.rentangNilai || [];
}
function predikatBadge(nilai) {
  const k = getNilaiKategori(nilai, getRentang());
  const color = nilai >= getMinLulus() ? '#16a34a' : '#dc2626';
  return `<span style="font-size:11px;font-weight:700;color:${color};background:${nilai >= getMinLulus() ? '#dcfce7' : '#fee2e2'};padding:2px 8px;border-radius:4px;">${k.label}</span>`;
}

let activeSesi = null;
let selectedPeserta = new Set();
let pesertaTab = 'santri';
let detSortCol = null, detSortDir = 'asc';
let editingSesiId = null; // null = create, string = editing
let detailFilter = null; // ColumnFilter instance

// ── Helper ─────────────────────────────────────────────────────────────────
function getPesertaLabel(p) {
  return p.tipe === 'guru'
    ? { nama: p.nama, sub: 'Guru' }
    : { nama: p.nama, sub: p.kelas || '-' };
}

function getStatusInSesi(stambuk, tipe, sesiId) {
  if (tipe === 'Bacaan') {
    const all = dataStore.get('tesBacaan').filter(t =>
      String(t.SesiID) === String(sesiId) && String(t.PesertaID) === String(stambuk)
    );
    const pre  = all.find(t => t.JenisTes === 'Pre Test');
    const posts = all.filter(t => t.JenisTes !== 'Pre Test').sort((a,b) => new Date(b.Tanggal)-new Date(a.Tanggal));
    const post  = posts[0] || null;
    return { pre, post, allTests: all };
  } else {
    const sesi = dataStore.get('sesiUjian').find(s => String(s.SesiID) === String(sesiId));
    const targetSurahs = sesi && sesi._materi ? sesi._materi.surahs : [];
    const hf = dataStore.get('hafalan').filter(h => {
      if (String(h.STambuk) !== String(stambuk)) return false;
      if (h.SesiID && String(h.SesiID) === String(sesiId)) return true;
      return targetSurahs && targetSurahs.includes(h.NamaSurah);
    });
    return { hf };
  }
}

// ── MAIN RENDER ────────────────────────────────────────────────────────────
export async function renderSesiUjian(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Manajemen Sesi Ujian</h2><p>Semua alur evaluasi (Pre Test → Post Test → Remedial) dikelola di sini</p></div>
      <button class="btn btn-primary" id="btnBuatSesi" style="display:flex;align-items:center;gap:6px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Buat Sesi Baru
      </button>
    </div>

    <!-- LIST VIEW -->
    <div id="viewList">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div class="filter-bar">
            <div class="search-box"><span class="search-icon">&#128269;</span>
              <input type="text" id="srchSesi" placeholder="Cari nama sesi / penanggung jawab...">
            </div>
            <button class="btn btn-outline btn-sm" id="btnRefresh" style="height:38px;display:flex;align-items:center;gap:6px;">&#8635; Refresh</button>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;" id="sesiGrid">
        <div style="grid-column:1/-1;padding:40px;text-align:center;color:#94a3b8;">Memuat data...</div>
      </div>
    </div>

    <!-- DETAIL VIEW -->
    <div id="viewDetail" style="display:none;">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:16px 20px;">
          <button class="btn btn-outline btn-sm" id="btnBackList" style="margin-bottom:12px;">&larr; Kembali</button>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
            <div>
              <h2 id="detNamaSesi" style="margin:0 0 6px;font-size:20px;color:#0f172a;">-</h2>
              <div style="display:flex;gap:12px;font-size:12px;color:#64748b;align-items:center;flex-wrap:wrap;">
                <span id="detTanggal"></span> &bull;
                <span id="detTipe" class="badge"></span> &bull;
                <span id="detPJ"></span>
              </div>
              <div style="margin-top:8px;font-size:12px;padding:8px 12px;background:#fef9c3;border-radius:6px;border-left:3px solid #eab308;" id="detMateriInfo"></div>
            </div>
            <div style="text-align:right;background:#f0fdf4;padding:12px 20px;border-radius:10px;border:1px solid #bbf7d0;">
              <div style="font-size:11px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Progres Evaluasi</div>
              <div style="font-size:28px;font-weight:800;color:#15803d;" id="detProgress">0 / 0</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <h3 style="margin:0;">Daftar Peserta &amp; Evaluasi</h3>
          <span style="font-size:12px;color:#64748b;">Klik tombol aksi untuk menginput atau melanjutkan penilaian</span>
        </div>
        <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafbfc;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <div class="search-box" style="flex:1;min-width:200px;">
              <span class="search-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#64748b;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
              <input type="text" id="srchPesertaDetail" placeholder="Cari nama / ID peserta..." oninput="renderPesertaList()">
            </div>
            <select id="filterTipePeserta" onchange="renderPesertaList()" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#fff;">
              <option value="">Semua Tipe</option>
              <option value="santri">Santri Saja</option>
              <option value="guru">Guru Saja</option>
            </select>
            <select id="filterStatusPeserta" onchange="renderPesertaList()" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#fff;">
              <option value="">Semua Status</option>
              <option value="belum">Belum Mulai</option>
              <option value="proses">Dalam Proses</option>
              <option value="lulus">Lulus</option>
              <option value="remedial">Remedial</option>
            </select>
            <span id="detPesertaCount" style="font-size:12px;color:#64748b;font-weight:600;"></span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr id="pesertaTableHead"></tr></thead>
            <tbody id="pesertaBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL BUAT SESI -->
    <div class="modal-overlay" id="modalSesi">
      <div class="modal modal-lg" style="max-width:860px;">
        <div class="modal-header">
          <h3 id="modalSesiTitle">Buat Sesi Ujian Baru</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal()">&#10005;</button>
        </div>
        <div class="modal-body" style="max-height:80vh;overflow-y:auto;padding-right:12px;">

          <!-- Info Sesi -->
          <div class="form-grid" style="margin-bottom:16px;">
            <div class="form-group full"><label>Nama Sesi Ujian *</label><input type="text" id="fNamaSesi" placeholder="Cth: Evaluasi Tahsin Batch 1 - 2026"></div>
            <div class="form-group"><label>Tanggal *</label><input type="date" id="fTanggal"></div>
            <div class="form-group"><label>Periode Batch *</label><input type="text" id="fPeriode" placeholder="Cth: Semester 1 2024/2025"></div>
            <div class="form-group"><label>Penanggung Jawab / Penguji *</label><div id="wrapPJ"></div></div>
            <div class="form-group"><label>Penandatangan Rapot *</label><input type="text" id="fPenandatangan" placeholder="Nama lengkap & Gelar"></div>
            <div class="form-group full"><label>URL Scan TTD Digital (Opsional)</label><input type="text" id="fTTDUrl" placeholder="https://contoh.com/ttd.png"></div>
            <div class="form-group full"><label>Tipe Sesi *</label>
              <select id="fTipe">
                <option value="Bacaan">Tes Bacaan (Tahsin) - Pre Test → Post Test → Lulus/Remedial</option>
                <option value="Hafalan">Tes Hafalan (Tahfidz) - Setoran Hafalan</option>
              </select>
            </div>
          </div>

          <!-- Materi -->
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;background:#f8fafc;">
            <h4 style="margin:0 0 12px;font-size:13px;color:#0f172a;">&#128218; Konfigurasi Materi Ujian</h4>
            <div id="cfgBacaan" class="form-grid">
              <div class="form-group"><label>Surah / Materi *</label><div id="wrapSurah"></div></div>
              <div class="form-group"><label>Rentang Ayat (Opsional)</label><input type="text" id="fAyat" placeholder="Cth: 1-15"></div>
            </div>
            <div id="cfgHafalan" style="display:none;">
              <label style="font-size:12px;font-weight:600;color:#475569;margin-bottom:8px;display:block;">Pilih Surah Target *</label>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                <select id="fFilterJuz" style="font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;min-width:120px;">
                  <option value="">Semua Juz</option>
                </select>
                <button type="button" class="btn btn-outline btn-sm" id="btnSelectAllSurah" style="font-size:10px;padding:4px 10px;">Pilih Semua</button>
                <button type="button" class="btn btn-outline btn-sm" id="btnDeselectAllSurah" style="font-size:10px;padding:4px 10px;">Hapus Semua</button>
                <span id="surahSelectedCount" style="font-size:11px;color:#64748b;font-weight:600;margin-left:auto;">0 surah dipilih</span>
              </div>
              <div id="hafalanTargetGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-height:240px;overflow-y:auto;border:1px solid #e2e8f0;padding:10px;border-radius:8px;background:#fff;"></div>
            </div>
          </div>

          <!-- Peserta Selector -->
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
              <h4 style="margin:0;font-size:13px;color:#0f172a;">&#128101; Pilih Peserta</h4>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <!-- Tab Santri / Guru -->
                <div style="display:flex;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;">
                  <button id="tabSantriBtn" onclick="switchPesertaTab('santri')" style="padding:5px 14px;font-size:12px;font-weight:600;background:#1b6b4a;color:#fff;border:none;cursor:pointer;">Santri</button>
                  <button id="tabGuruBtn" onclick="switchPesertaTab('guru')" style="padding:5px 14px;font-size:12px;font-weight:600;background:#fff;color:#475569;border:none;cursor:pointer;">Guru</button>
                </div>
              </div>
            </div>
            <!-- Filter Row -->
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
              <select id="fFilterKelas" style="font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;min-width:120px;"><option value="">Semua Kelas</option></select>
              <select id="fFilterRayon" style="font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;min-width:120px;"><option value="">Semua Rayon</option></select>
              <!-- Guru filters (hidden by default) -->
              <select id="fFilterTahunGuru" style="font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;min-width:120px;display:none;"><option value="">Semua Tahun</option></select>
              <select id="fFilterKamarGuru" style="font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;min-width:140px;display:none;"><option value="">Semua Kamar/Bagian</option></select>
              <div style="flex:1;min-width:100px;">
                <input type="text" id="fSrchPeserta" placeholder="Cari nama..." style="font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid #cbd5e1;width:100%;background:#fff;">
              </div>
              <button class="btn btn-outline btn-sm" id="btnSelectAll" style="font-size:10px;padding:4px 10px;">Pilih Semua</button>
              <button class="btn btn-outline btn-sm" id="btnClearAll" style="font-size:10px;padding:4px 10px;">Reset</button>
            </div>
            <div style="font-size:11px;color:#64748b;margin-bottom:10px;">💡 <b>Tip:</b> Klik lalu drag untuk memilih banyak sekaligus. Santri dan Guru bisa digabung dalam satu sesi.</div>
            <div id="pesertaSelectGrid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:260px;overflow-y:auto;user-select:none;padding-right:4px;"></div>
            <div style="margin-top:8px;font-size:12px;font-weight:700;color:#1b6b4a;" id="pesertaCount">Terpilih: 0 peserta</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Batal</button>
          <button class="btn btn-primary" id="btnSaveSesi">Simpan Sesi</button>
        </div>
      </div>
    </div>

    <!-- MODAL PENILAIAN -->
    <div class="modal-overlay" id="modalNilaiSesi">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div>
            <h3 id="mnTitle">Penilaian</h3>
            <div id="mnSubtitle" style="font-size:12px;color:#64748b;margin-top:2px;"></div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalNilaiSesi').classList.remove('show')">&#10005;</button>
        </div>
        <div class="modal-body" id="mnBody" style="max-height:65vh;overflow-y:auto;"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalNilaiSesi').classList.remove('show')">Batal</button>
          <button class="btn btn-primary" id="btnSaveNilaiSesi">Simpan Evaluasi</button>
        </div>
      </div>
    </div>
  `;

  // ── Event Listeners ─────────────────────────────────────────────────────
  document.getElementById('btnRefresh').onclick = () => dataStore.initialize().then(loadData);
  document.getElementById('btnBuatSesi').onclick = openModal;
  document.getElementById('btnBackList').onclick = () => {
    document.getElementById('viewDetail').style.display = 'none';
    document.getElementById('viewList').style.display = 'block';
    activeSesi = null;
  };
  document.getElementById('fTipe').onchange = (e) => {
    document.getElementById('cfgBacaan').style.display = e.target.value === 'Bacaan' ? 'grid' : 'none';
    document.getElementById('cfgHafalan').style.display = e.target.value === 'Hafalan' ? 'block' : 'none';
  };
  document.getElementById('fFilterKelas').onchange = renderPesertaSelect;
  document.getElementById('fFilterRayon').onchange  = renderPesertaSelect;
  document.getElementById('fFilterTahunGuru').onchange = renderPesertaSelect;
  document.getElementById('fFilterKamarGuru').onchange = renderPesertaSelect;
  document.getElementById('fSrchPeserta').oninput   = renderPesertaSelect;
  document.getElementById('btnSelectAll').onclick   = selectAllFiltered;
  document.getElementById('btnClearAll').onclick    = () => { selectedPeserta.clear(); renderPesertaSelect(); };
  document.getElementById('srchSesi').oninput       = renderGrid;
  document.getElementById('fFilterJuz').onchange    = filterHafalanSurahGrid;
  document.getElementById('btnSelectAllSurah').onclick = () => selectAllSurahFiltered(true);
  document.getElementById('btnDeselectAllSurah').onclick = () => selectAllSurahFiltered(false);
  document.getElementById('btnSaveSesi').onclick    = saveSesi;

  // Drag select
  let isDragging = false, dragVal = true;
  document.getElementById('pesertaSelectGrid').addEventListener('mousedown', (e) => {
    const item = e.target.closest('.peserta-item');
    if (!item) return;
    isDragging = true;
    const key = item.dataset.key;
    dragVal = !selectedPeserta.has(key);
    togglePeserta(key, dragVal, item.dataset.nama, item.dataset.kelas, item.dataset.tipe);
  });
  document.addEventListener('mouseover', (e) => {
    if (!isDragging) return;
    const item = e.target.closest('.peserta-item');
    if (item) togglePeserta(item.dataset.key, dragVal, item.dataset.nama, item.dataset.kelas, item.dataset.tipe);
  });
  document.addEventListener('mouseup', () => { isDragging = false; });

  // Subscribe
  dataStore.subscribe('sesiUjian', renderGrid);
  dataStore.subscribe('tesBacaan', () => renderPesertaList());
  dataStore.subscribe('hafalan',   () => renderPesertaList());

  loadData();
}

// ── EXPOSE GLOBALS ──────────────────────────────────────────────────────────
window.switchPesertaTab = (tab) => {
  pesertaTab = tab;
  document.getElementById('tabSantriBtn').style.background = tab === 'santri' ? '#1b6b4a' : '#fff';
  document.getElementById('tabSantriBtn').style.color      = tab === 'santri' ? '#fff' : '#475569';
  document.getElementById('tabGuruBtn').style.background   = tab === 'guru' ? '#1b6b4a' : '#fff';
  document.getElementById('tabGuruBtn').style.color        = tab === 'guru' ? '#fff' : '#475569';
  // Show/hide appropriate filters
  document.getElementById('fFilterKelas').style.display = tab === 'santri' ? '' : 'none';
  document.getElementById('fFilterRayon').style.display = tab === 'santri' ? '' : 'none';
  document.getElementById('fFilterTahunGuru').style.display = tab === 'guru' ? '' : 'none';
  document.getElementById('fFilterKamarGuru').style.display = tab === 'guru' ? '' : 'none';
  renderPesertaSelect();
};

window.closeModal = () => document.getElementById('modalSesi').classList.remove('show');
window.renderPesertaList = () => renderPesertaList();

// ── DATA ────────────────────────────────────────────────────────────────────
function loadData() {
  renderGrid();
  populateDropdowns();
}

function renderGrid() {
  const q   = (document.getElementById('srchSesi')?.value || '').toLowerCase();
  const arr = dataStore.get('sesiUjian')
    .filter(s => !q || s.NamaSesi?.toLowerCase().includes(q) || s.PenanggungJawab?.toLowerCase().includes(q))
    .sort((a,b) => new Date(b.Tanggal) - new Date(a.Tanggal));

  const grid = document.getElementById('sesiGrid');
  if (!grid) return;

  if (!arr.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:#94a3b8;">
      <div style="font-size:40px;margin-bottom:12px;">📋</div>
      <div style="font-size:16px;font-weight:600;">Belum ada sesi ujian</div>
      <div style="font-size:13px;margin-top:6px;">Klik "Buat Sesi Baru" untuk memulai evaluasi</div>
    </div>`;
    return;
  }

  grid.innerHTML = arr.map(s => {
    const peserta = s._peserta || [];
    let done = 0;
    if (s.TipeSesi === 'Bacaan') {
      const tes = dataStore.get('tesBacaan').filter(t => String(t.SesiID) === String(s.SesiID));
      const stambuks = new Set(tes.map(t => String(t.PesertaID)));
      done = peserta.filter(p => stambuks.has(String(typeof p === 'object' ? p.id : p))).length;
    } else {
      const hf = dataStore.get('hafalan').filter(h => String(h.SesiID) === String(s.SesiID));
      const stambuks = new Set(hf.map(h => String(h.STambuk)));
      done = peserta.filter(p => stambuks.has(String(typeof p === 'object' ? p.id : p))).length;
    }
    const pct = peserta.length ? Math.round((done/peserta.length)*100) : 0;
    const isSelesai = done === peserta.length && peserta.length > 0;

    return `
      <div class="card" style="cursor:pointer;border:1px solid ${isSelesai ? '#86efac' : '#e2e8f0'};transition:box-shadow .2s;position:relative;" onmouseenter="this.style.boxShadow='0 4px 20px rgba(0,0,0,.1)'" onmouseleave="this.style.boxShadow=''" onclick="openDetail('${s.SesiID}')">
        <div class="card-body" style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <div>
              <div style="font-weight:700;font-size:15px;color:#0f172a;margin-bottom:4px;">${s.NamaSesi}</div>
              <div style="font-size:11px;color:#64748b;">${fmtDate(s.Tanggal)} &bull; ${s.PenanggungJawab}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="badge ${s.TipeSesi === 'Bacaan' ? 'badge-b' : 'badge-sb'}" style="white-space:nowrap;">${s.TipeSesi}</span>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();editSesi('${s.SesiID}')" title="Edit Sesi" style="display:inline-flex;align-items:center;justify-content:center;height:26px;width:26px;padding:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteSesi('${s.SesiID}','${s.NamaSesi.replace(/'/g,"\\'").replace(/"/g,'&quot;')}')" title="Hapus Sesi" style="display:inline-flex;align-items:center;justify-content:center;height:26px;width:26px;padding:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <div style="font-size:12px;color:#64748b;margin-bottom:10px;">${(s._materi?.surah || (s._materi?.surahs || []).join(', ') || '-')} &bull; ${peserta.length} peserta</div>
          <div style="background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden;margin-bottom:6px;">
            <div style="height:100%;width:${pct}%;background:${pct === 100 ? '#16a34a' : '#3b73c8'};border-radius:99px;transition:width .5s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;color:#64748b;">${done} / ${peserta.length} selesai</span>
            <span style="font-size:11px;font-weight:700;color:${isSelesai ? '#16a34a' : '#3b73c8'};">${pct}%</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function populateDropdowns() {
  const guruOpt = dataStore.get('guru').map(g => ({ value: g.Nama, label: g.Nama }));
  const fPJ = document.getElementById('wrapPJ');
  if (fPJ) {
    if (!window.ssPJ) window.ssPJ = new SearchableSelect(fPJ, guruOpt, { placeholder: '-- Pilih Guru --' });
    else window.ssPJ.setOptions(guruOpt);
  }

  const surOpt = dataStore.get('surah').map(s => ({ value: s.nama, label: `${s.no}. ${s.nama}` }));
  const fSurah = document.getElementById('wrapSurah');
  if (fSurah) {
    if (!window.ssSurah) window.ssSurah = new SearchableSelect(fSurah, surOpt, { placeholder: '-- Pilih Surah --' });
    else window.ssSurah.setOptions(surOpt);
  }

  // Populate Juz filter
  const allSurah = dataStore.get('surah');
  const juzSet = [...new Set(allSurah.map(s => s.juz).filter(Boolean))].sort((a,b) => Number(a) - Number(b));
  const fJuz = document.getElementById('fFilterJuz');
  if (fJuz) fJuz.innerHTML = `<option value="">Semua Juz</option>` + juzSet.map(j => `<option value="${j}">Juz ${j}</option>`).join('');

  // Render hafalan surah grid
  renderHafalanSurahGrid(allSurah);

  // Santri filters
  const santriData = dataStore.get('santri');
  const kls = [...new Set(santriData.map(s => s.Kelas).filter(Boolean))].sort();
  const fKelas = document.getElementById('fFilterKelas');
  if (fKelas) fKelas.innerHTML = `<option value="">Semua Kelas</option>` + kls.map(k => `<option value="${k}">${k}</option>`).join('');

  const rayons = [...new Set(santriData.map(s => s.Rayon).filter(Boolean))].sort();
  const fRayon = document.getElementById('fFilterRayon');
  if (fRayon) fRayon.innerHTML = `<option value="">Semua Rayon</option>` + rayons.map(r => `<option value="${r}">${r}</option>`).join('');

  // Guru filters
  const guruData = dataStore.get('guru');
  const tahuns = [...new Set(guruData.map(g => g.Tahun).filter(Boolean))].sort();
  const fTahun = document.getElementById('fFilterTahunGuru');
  if (fTahun) fTahun.innerHTML = `<option value="">Semua Tahun</option>` + tahuns.map(t => `<option value="${t}">Tahun ${t}</option>`).join('');

  const kamars = [...new Set(guruData.map(g => g.KamarBagian).filter(Boolean))].sort();
  const fKamar = document.getElementById('fFilterKamarGuru');
  if (fKamar) fKamar.innerHTML = `<option value="">Semua Kamar/Bagian</option>` + kamars.map(k => `<option value="${k}">${k}</option>`).join('');

  renderPesertaSelect();
}

// ── HAFALAN SURAH GRID ──────────────────────────────────────────────────────
function renderHafalanSurahGrid(surahList) {
  const hfGrid = document.getElementById('hafalanTargetGrid');
  if (!hfGrid) return;
  const filterJuz = document.getElementById('fFilterJuz')?.value || '';
  const filtered = filterJuz ? surahList.filter(s => String(s.juz) === String(filterJuz)) : surahList;

  hfGrid.innerHTML = filtered.map(s => {
    const isChecked = hfGrid.querySelector(`input.hf-surah-cb[value="${s.nama}"]`)?.checked || false;
    return `
      <label class="hf-surah-label" style="display:flex;align-items:center;gap:8px;font-size:12px;padding:8px 10px;border-radius:6px;cursor:pointer;background:${isChecked ? '#f0fdf4' : '#f8fafc'};border:1px solid ${isChecked ? '#1b6b4a' : '#e2e8f0'};transition:all .15s;user-select:none;" onmouseenter="this.style.borderColor='#1b6b4a';this.style.background='#f0fdf4'" onmouseleave="if(!this.querySelector('input').checked){this.style.borderColor='#e2e8f0';this.style.background='#f8fafc'}">
        <input type="checkbox" value="${s.nama}" class="hf-surah-cb" style="accent-color:#1b6b4a;width:15px;height:15px;cursor:pointer;" onchange="updateSurahCheckVisual(this)">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.no}. ${s.nama}</div>
          <div style="font-size:10px;color:#64748b;">Juz ${s.juz || '-'} • ${s.ayat || '-'} ayat</div>
        </div>
      </label>`;
  }).join('');

  // Restore checked state from DOM
  updateSurahCount();
}

function filterHafalanSurahGrid() {
  // Preserve currently checked surahs
  const checkedSurahs = new Set([...document.querySelectorAll('.hf-surah-cb:checked')].map(cb => cb.value));
  const allSurah = dataStore.get('surah');
  const filterJuz = document.getElementById('fFilterJuz')?.value || '';
  const filtered = filterJuz ? allSurah.filter(s => String(s.juz) === String(filterJuz)) : allSurah;
  const hfGrid = document.getElementById('hafalanTargetGrid');
  if (!hfGrid) return;

  hfGrid.innerHTML = filtered.map(s => {
    const isChecked = checkedSurahs.has(s.nama);
    return `
      <label class="hf-surah-label" style="display:flex;align-items:center;gap:8px;font-size:12px;padding:8px 10px;border-radius:6px;cursor:pointer;background:${isChecked ? '#f0fdf4' : '#f8fafc'};border:1px solid ${isChecked ? '#1b6b4a' : '#e2e8f0'};transition:all .15s;user-select:none;" onmouseenter="this.style.borderColor='#1b6b4a';this.style.background='#f0fdf4'" onmouseleave="if(!this.querySelector('input').checked){this.style.borderColor='#e2e8f0';this.style.background='#f8fafc'}">
        <input type="checkbox" value="${s.nama}" class="hf-surah-cb" ${isChecked ? 'checked' : ''} style="accent-color:#1b6b4a;width:15px;height:15px;cursor:pointer;" onchange="updateSurahCheckVisual(this)">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.no}. ${s.nama}</div>
          <div style="font-size:10px;color:#64748b;">Juz ${s.juz || '-'} • ${s.ayat || '-'} ayat</div>
        </div>
      </label>`;
  }).join('');

  updateSurahCount();
}

function selectAllSurahFiltered(selectAll) {
  const filterJuz = document.getElementById('fFilterJuz')?.value || '';
  if (selectAll) {
    document.querySelectorAll('.hf-surah-cb').forEach(cb => {
      cb.checked = true;
      updateSurahCheckVisual(cb);
    });
  } else {
    document.querySelectorAll('.hf-surah-cb').forEach(cb => {
      cb.checked = false;
      updateSurahCheckVisual(cb);
    });
  }
  updateSurahCount();
}

window.updateSurahCheckVisual = (cb) => {
  const label = cb.closest('.hf-surah-label');
  if (label) {
    label.style.background = cb.checked ? '#f0fdf4' : '#f8fafc';
    label.style.borderColor = cb.checked ? '#1b6b4a' : '#e2e8f0';
  }
  updateSurahCount();
};

function updateSurahCount() {
  const count = document.querySelectorAll('.hf-surah-cb:checked').length;
  const el = document.getElementById('surahSelectedCount');
  if (el) el.textContent = `${count} surah dipilih`;
}

// ── PESERTA SELECT ──────────────────────────────────────────────────────────
function togglePeserta(key, val, nama, kelas, tipe) {
  if (val) {
    selectedPeserta.set = selectedPeserta.set || new Map();
    // Store as string key format "tipe:id"
    selectedPeserta.add(key);
  } else {
    selectedPeserta.delete(key);
  }
  updatePesertaCount();
  // Visual update only the clicked item
  const el = document.querySelector(`.peserta-item[data-key="${CSS.escape(key)}"]`);
  if (el) {
    el.style.background = val ? '#f0fdf4' : '#fff';
    el.style.border = `1px solid ${val ? '#1b6b4a' : '#cbd5e1'}`;
    el.querySelector('.nama')?.setAttribute('style', `font-weight:700;color:${val ? '#1b6b4a' : '#334155'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
    el.querySelector('.check')?.setAttribute('style', `display:${val ? 'flex' : 'none'};`);
  }
}

function renderPesertaSelect() {
  const fKls  = document.getElementById('fFilterKelas')?.value || '';
  const fRayon = document.getElementById('fFilterRayon')?.value || '';
  const fTahunGuru = document.getElementById('fFilterTahunGuru')?.value || '';
  const fKamarGuru = document.getElementById('fFilterKamarGuru')?.value || '';
  const srch  = (document.getElementById('fSrchPeserta')?.value || '').toLowerCase();
  const grid  = document.getElementById('pesertaSelectGrid');
  if (!grid) return;

  let items = [];
  if (pesertaTab === 'santri') {
    items = dataStore.get('santri')
      .filter(s => 
        (fKls ? s.Kelas === fKls : true) && 
        (fRayon ? s.Rayon === fRayon : true) &&
        (!srch || s.Nama.toLowerCase().includes(srch) || String(s.STambuk).includes(srch))
      )
      .sort((a,b) => a.Nama.localeCompare(b.Nama))
      .map(s => ({ key: `santri:${s.STambuk}`, id: s.STambuk, nama: s.Nama, sub: `${s.Kelas||'-'}`, sub2: s.Rayon ? ` • ${s.Rayon}` : '', tipe: 'santri' }));
  } else {
    items = dataStore.get('guru')
      .filter(g => 
        (fTahunGuru ? String(g.Tahun) === String(fTahunGuru) : true) &&
        (fKamarGuru ? g.KamarBagian === fKamarGuru : true) &&
        (!srch || g.Nama.toLowerCase().includes(srch))
      )
      .sort((a,b) => a.Nama.localeCompare(b.Nama))
      .map(g => ({ key: `guru:${g.IDGuru||g.Nama}`, id: g.IDGuru||g.Nama, nama: g.Nama, sub: g.KamarBagian||'Guru', sub2: g.Tahun ? ` • Thn ${g.Tahun}` : '', tipe: 'guru' }));
  }

  grid.innerHTML = items.map(item => {
    const isSel = selectedPeserta.has(item.key);
    return `
      <div class="peserta-item" data-key="${item.key}" data-nama="${item.nama}" data-kelas="${item.sub}" data-tipe="${item.tipe}"
        style="font-size:11px;padding:8px 10px;border:1px solid ${isSel?'#1b6b4a':'#cbd5e1'};background:${isSel?'#f0fdf4':'#fff'};border-radius:6px;cursor:pointer;user-select:none;position:relative;transition:border-color .15s,background .15s;">
        <div class="check" style="position:absolute;top:4px;right:4px;width:16px;height:16px;background:#1b6b4a;border-radius:50%;display:${isSel?'flex':'none'};align-items:center;justify-content:center;color:#fff;font-size:10px;">✓</div>
        <div class="nama" style="font-weight:700;color:${isSel?'#1b6b4a':'#334155'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.nama}</div>
        <div style="font-family:monospace;color:#64748b;margin-top:2px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.id} • ${item.sub}${item.sub2}</div>
      </div>`;
  }).join('');

  updatePesertaCount();
}

function updatePesertaCount() {
  const el = document.getElementById('pesertaCount');
  if (el) el.innerText = `Terpilih: ${selectedPeserta.size} peserta`;
}

function selectAllFiltered() {
  const fKls = document.getElementById('fFilterKelas')?.value || '';
  const fRayon = document.getElementById('fFilterRayon')?.value || '';
  const fTahunGuru = document.getElementById('fFilterTahunGuru')?.value || '';
  const fKamarGuru = document.getElementById('fFilterKamarGuru')?.value || '';
  const srch = (document.getElementById('fSrchPeserta')?.value || '').toLowerCase();
  if (pesertaTab === 'santri') {
    dataStore.get('santri')
      .filter(s => (fKls ? s.Kelas === fKls : true) && (fRayon ? s.Rayon === fRayon : true) && (!srch || s.Nama.toLowerCase().includes(srch)))
      .forEach(s => selectedPeserta.add(`santri:${s.STambuk}`));
  } else {
    dataStore.get('guru')
      .filter(g => (fTahunGuru ? String(g.Tahun) === String(fTahunGuru) : true) && (fKamarGuru ? g.KamarBagian === fKamarGuru : true) && (!srch || g.Nama.toLowerCase().includes(srch)))
      .forEach(g => selectedPeserta.add(`guru:${g.IDGuru||g.Nama}`));
  }
  renderPesertaSelect();
}

// ── SAVE SESI ───────────────────────────────────────────────────────────────
async function saveSesi() {
  const nama = document.getElementById('fNamaSesi').value;
  const tgl  = document.getElementById('fTanggal').value;
  const per  = document.getElementById('fPeriode').value;
  const pj   = window.ssPJ?.getValue() || '';
  const tipe = document.getElementById('fTipe').value;

  if (!nama) return showToast('Nama sesi harus diisi', 'error');
  if (!tgl)  return showToast('Tanggal harus diisi', 'error');
  if (!pj)   return showToast('Penanggung jawab harus dipilih', 'error');
  if (!selectedPeserta.size) return showToast('Pilih minimal 1 peserta', 'error');

  let materi = null;
  if (tipe === 'Bacaan') {
    const surah = window.ssSurah?.getValue() || '';
    if (!surah) return showToast('Surah/materi harus dipilih', 'error');
    materi = { surah, ayat: document.getElementById('fAyat').value };
  } else {
    const checked = [...document.querySelectorAll('.hf-surah-cb:checked')].map(cb => cb.value);
    if (!checked.length) return showToast('Pilih minimal 1 surah hafalan', 'error');
    materi = { surahs: checked };
  }

  const pesertaArr = [...selectedPeserta].map(key => {
    const [tipeP, ...idParts] = key.split(':');
    return { tipe: tipeP, id: idParts.join(':') };
  });

  const payload = {
    NamaSesi       : nama,
    Tanggal        : tgl,
    Periode        : document.getElementById('fPeriode').value.trim() || dataStore.get('config')?.periodeAktif || '',
    PenanggungJawab: pj,
    Penandatangan  : document.getElementById('fPenandatangan').value.trim(),
    TTDUrl         : document.getElementById('fTTDUrl').value.trim(),
    TipeSesi       : tipe,
    TargetUjian    : JSON.stringify(materi),
    Peserta        : JSON.stringify(pesertaArr),
    Status         : 'Aktif'
  };

  const btn = document.getElementById('btnSaveSesi');
  btn.disabled = true; btn.innerText = 'Menyimpan...';

  let res;
  if (editingSesiId) {
    // EDIT MODE — update
    payload.SesiID = editingSesiId;
    res = await dataStore.update('sesiUjian', editingSesiId, payload);
  } else {
    // CREATE MODE — add
    res = await dataStore.add('sesiUjian', payload);
  }
  
  btn.disabled = false; btn.innerText = editingSesiId ? 'Simpan Perubahan' : 'Simpan Sesi';

  if (res.ok) {
    showToast(editingSesiId ? '✓ Sesi berhasil diperbarui' : `✓ Sesi berhasil disimpan (${pesertaArr.length} peserta)`);
    selectedPeserta.clear();
    editingSesiId = null;
    closeModal();
  } else {
    showToast(res.msg || 'Gagal menyimpan sesi', 'error');
  }
}

// ── OPEN DETAIL ─────────────────────────────────────────────────────────────
window.openDetail = (id) => {
  activeSesi = dataStore.get('sesiUjian').find(x => String(x.SesiID) === String(id));
  if (!activeSesi) return;

  document.getElementById('viewList').style.display = 'none';
  document.getElementById('viewDetail').style.display = 'block';
  document.getElementById('detNamaSesi').innerText = activeSesi.NamaSesi;
  document.getElementById('detTanggal').innerText  = fmtDate(activeSesi.Tanggal);
  document.getElementById('detTipe').innerText     = activeSesi.TipeSesi;
  document.getElementById('detPJ').innerText       = `PJ: ${activeSesi.PenanggungJawab}`;

  const m = activeSesi._materi || {};
  const materiStr = activeSesi.TipeSesi === 'Bacaan'
    ? `📖 Surah: <strong>${m.surah || '-'}</strong>${m.ayat ? ` (Ayat ${m.ayat})` : ''}`
    : `📖 Hafalan: <strong>${(m.surahs || []).join(', ') || '-'}</strong>`;
  document.getElementById('detMateriInfo').innerHTML = materiStr;

  renderPesertaList();
};

// ── PESERTA LIST di Detail ──────────────────────────────────────────────────
function renderPesertaList() {
  if (!activeSesi) return;
  const tbody = document.getElementById('pesertaBody');
  if (!tbody) return;

  // Parse peserta – support both new structured format and legacy flat array
  const rawPeserta = activeSesi._peserta || [];
  const pesertaList = rawPeserta.map(p => {
    if (typeof p === 'object' && p.tipe) return p;
    // Legacy: just stambuk string → assume santri
    return { tipe: 'santri', id: String(p) };
  });

  if (!pesertaList.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">Tidak ada peserta</td></tr>`;
    document.getElementById('detProgress').innerText = '0 / 0';
    return;
  }

  // Set table headers based on sesi type
  const thead = document.getElementById('pesertaTableHead');
  if (thead) {
    const sortIcon = (col) => {
      if (detSortCol !== col) return '<span class="sort-icon" style="display:inline-flex;align-items:center;vertical-align:middle;margin-left:2px;opacity:.4;"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m7 10 5-5 5 5"/><path d="m7 14 5 5 5-5"/></svg></span>';
      return detSortDir === 'asc'
        ? '<span class="sort-icon" style="display:inline-flex;align-items:center;vertical-align:middle;margin-left:2px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></span>'
        : '<span class="sort-icon" style="display:inline-flex;align-items:center;vertical-align:middle;margin-left:2px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>';
    };
    const mkTh = (col, label, align) => `<th class="sortable-th" data-detsort="${col}" style="cursor:pointer;user-select:none;${align ? 'text-align:'+align+';' : ''}">${label}${sortIcon(col)}</th>`;

    if (activeSesi.TipeSesi === 'Bacaan') {
      thead.innerHTML = mkTh('id','ID','') + mkTh('nama','Nama','') + mkTh('tipe','Tipe','') + mkTh('status','Status','center') + mkTh('pre','Pre Test','center') + mkTh('post','Post Test','center') + `<th style="text-align:right;">Aksi</th>`;
    } else {
      thead.innerHTML = mkTh('id','ID','') + mkTh('nama','Nama','') + mkTh('tipe','Tipe','') + mkTh('status','Status Setoran','center') + mkTh('surah','Surah Selesai','center') + `<th style="text-align:right;">Aksi</th>`;
    }

    // Attach sort click handlers
    thead.querySelectorAll('.sortable-th[data-detsort]').forEach(th => {
      th.onclick = () => {
        const col = th.dataset.detsort;
        if (detSortCol === col) detSortDir = detSortDir === 'asc' ? 'desc' : 'asc';
        else { detSortCol = col; detSortDir = 'asc'; }
        renderPesertaList();
      };
    });
  }

  const minLulus   = getMinLulus();
  const rentang    = getRentang();
  let doneCount = 0;
  // Apply search & filter
  const srchQ  = (document.getElementById('srchPesertaDetail')?.value || '').toLowerCase();
  const fTipe  = document.getElementById('filterTipePeserta')?.value || '';
  const fStat  = document.getElementById('filterStatusPeserta')?.value || '';

  // Resolve names first for search
  const enriched = pesertaList.map(p => {
    let nama = p.id, kelas = '-';
    if (p.tipe === 'santri') {
      const s = dataStore.get('santri').find(x => String(x.STambuk) === String(p.id));
      if (s) { nama = s.Nama; kelas = s.Kelas || '-'; }
    } else {
      const g = dataStore.get('guru').find(x => String(x.IDGuru) === String(p.id) || x.Nama === p.id);
      if (g) { nama = g.Nama; kelas = 'Guru'; }
    }
    // Pre-compute status for filtering
    let statusKey = 'belum';
    if (activeSesi.TipeSesi === 'Bacaan') {
      const { pre, post } = getStatusInSesi(p.id, 'Bacaan', activeSesi.SesiID);
      if (post) {
        statusKey = Number(post.NilaiAkhir) >= minLulus ? 'lulus' : 'remedial';
      } else if (pre) {
        statusKey = 'proses';
      }
    } else {
      const { hf } = getStatusInSesi(p.id, 'Hafalan', activeSesi.SesiID);
      if (hf.length > 0) {
        const targetSurahs = activeSesi._materi?.surahs || [];
        const selesai = [...new Set(hf.filter(x => x.Status === 'Selesai').map(x => x.NamaSurah))];
        statusKey = selesai.length >= targetSurahs.length && targetSurahs.length > 0 ? 'lulus' : 'proses';
      }
    }
    return { ...p, nama, kelas, statusKey };
  });

  // Apply filters
  const filtered = enriched.filter(p => {
    if (fTipe && p.tipe !== fTipe) return false;
    if (fStat && p.statusKey !== fStat) return false;
    if (srchQ && !p.nama.toLowerCase().includes(srchQ) && !String(p.id).toLowerCase().includes(srchQ)) return false;
    return true;
  });

  // Update count
  const countEl = document.getElementById('detPesertaCount');
  if (countEl) countEl.innerText = `Menampilkan ${filtered.length} dari ${pesertaList.length} peserta`;

  // Apply sorting
  if (detSortCol) {
    filtered.sort((a, b) => {
      let vA, vB;
      switch (detSortCol) {
        case 'id': vA = String(a.id); vB = String(b.id); break;
        case 'nama': vA = a.nama.toLowerCase(); vB = b.nama.toLowerCase(); break;
        case 'tipe': vA = a.tipe; vB = b.tipe; break;
        case 'status': {
          const ord = {belum:0, proses:1, remedial:2, lulus:3};
          vA = ord[a.statusKey]||0; vB = ord[b.statusKey]||0; break;
        }
        case 'pre': case 'post': {
          const col = detSortCol;
          const getVal = (p) => {
            const { pre, post } = getStatusInSesi(p.id, 'Bacaan', activeSesi.SesiID);
            return Number((col === 'pre' ? pre : post)?.NilaiAkhir || 0);
          };
          vA = getVal(a); vB = getVal(b); break;
        }
        default: vA = 0; vB = 0;
      }
      if (typeof vA === 'string') return detSortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return detSortDir === 'asc' ? vA - vB : vB - vA;
    });
  }

  const rows = filtered.map(p => {
    const nama = p.nama;
    const sub = p.kelas;

    let statusCell = '', preCell = '-', postCell = '-', aksiBtn = '';
    const progresBtn = `<button class="btn btn-outline btn-sm" onclick="showProgressDetail('${p.id}','${p.tipe}','${encodeURIComponent(nama)}')" title="Lihat Progres" style="display:inline-flex;align-items:center;justify-content:center;height:28px;width:28px;padding:0;">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
    </button>`;

    if (activeSesi.TipeSesi === 'Bacaan') {
      const { pre, post } = getStatusInSesi(p.id, 'Bacaan', activeSesi.SesiID);

      if (!pre) {
        statusCell = `<span style="color:#94a3b8;font-size:12px;">Belum Pre Test</span>`;
        aksiBtn = `<button class="btn btn-primary btn-sm" onclick="openModalNilai('${p.id}','${p.tipe}')" style="display:inline-flex;align-items:center;gap:5px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Input Pre Test
        </button>${progresBtn}`;
      } else if (pre && !post) {
        doneCount++;
        const pk = getNilaiKategori(pre.NilaiAkhir, rentang);
        preCell = `<div style="line-height:1;">
          <div style="font-weight:800;font-size:15px;color:#1d4ed8;">${pre.NilaiAkhir}</div>
          <div style="font-size:10px;font-weight:600;color:#1d4ed8;margin-top:2px;">${pk.label}</div>
        </div>`;
        statusCell = `<span class="badge" style="background:#dbeafe;color:#1d4ed8;">Pre Test ✓</span>`;
        aksiBtn = `
          <button class="btn btn-success btn-sm" onclick="openModalNilai('${p.id}','${p.tipe}')" style="display:inline-flex;align-items:center;gap:5px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Post Test
          </button>
          <button class="btn btn-outline btn-sm" onclick="openModalNilaiEdit('${p.id}','${p.tipe}','pre')" title="Edit Pre Test" style="display:inline-flex;align-items:center;justify-content:center;height:28px;width:28px;padding:0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>${progresBtn}`;
      } else if (post) {
        doneCount++;
        const pk = getNilaiKategori(pre.NilaiAkhir, rentang);
        const postk = getNilaiKategori(post.NilaiAkhir, rentang);
        const lulus = post.NilaiAkhir >= minLulus;
        preCell = `<div style="line-height:1;">
          <div style="font-weight:800;font-size:15px;color:#1d4ed8;">${pre.NilaiAkhir}</div>
          <div style="font-size:10px;font-weight:600;color:#1d4ed8;margin-top:2px;">${pk.label}</div>
        </div>`;
        postCell = `<div style="line-height:1;">
          <div style="font-weight:800;font-size:15px;color:${lulus ? '#16a34a' : '#dc2626'};">${post.NilaiAkhir}</div>
          <div style="font-size:10px;font-weight:600;color:${lulus ? '#16a34a' : '#dc2626'};margin-top:2px;">${postk.label}</div>
        </div>`;
        if (lulus) {
          statusCell = `<span class="badge" style="background:#dcfce7;color:#16a34a;font-weight:700;">Lulus ✓</span>`;
          aksiBtn = `
            <button class="btn btn-sm" style="background:#0ea5e9;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:4px;" onclick="previewRapotSantri('${p.id}','${p.tipe}','${post.ID}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              Rapot
            </button>
            <button class="btn btn-outline btn-sm" onclick="openModalNilaiEdit('${p.id}','${p.tipe}','post')" title="Edit Post Test" style="display:inline-flex;align-items:center;justify-content:center;height:28px;width:28px;padding:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>${progresBtn}`;
        } else {
          statusCell = `<span class="badge" style="background:#fee2e2;color:#dc2626;font-weight:700;">Remedial</span>`;
          aksiBtn = `
            <button class="btn btn-sm" style="background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:4px;" onclick="openModalNilai('${p.id}','${p.tipe}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Ulang Post Test
            </button>
            <button class="btn btn-outline btn-sm" onclick="openModalNilaiEdit('${p.id}','${p.tipe}','post')" title="Edit Post Test" style="display:inline-flex;align-items:center;justify-content:center;height:28px;width:28px;padding:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>${progresBtn}`;
        }
      }
    } else {
      // ── HAFALAN ──────────────────────────────────────────────────────────
      const { hf } = getStatusInSesi(p.id, 'Hafalan', activeSesi.SesiID);
      const targetSurahs = activeSesi._materi?.surahs || [];
      const selesaiList = [...new Set(hf.filter(x => x.Status === 'Selesai').map(x => x.NamaSurah))];
      const hafalanProgresBtn = `<button class="btn btn-outline btn-sm" onclick="showProgressDetail('${p.id}','${p.tipe}','${encodeURIComponent(nama)}')" title="Lihat Setoran" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> Progres
      </button>`;

      if (selesaiList.length >= targetSurahs.length && targetSurahs.length > 0) {
        doneCount++;
        statusCell = `<span class="badge" style="background:#dcfce7;color:#16a34a;font-weight:700;">${selesaiList.length}/${targetSurahs.length} Surah ✓</span>`;
        aksiBtn = `<button class="btn btn-outline btn-sm" onclick="openModalNilai('${p.id}','${p.tipe}')" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg> Setoran</button>${hafalanProgresBtn}`;
      } else if (hf.length > 0) {
        statusCell = `<span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;">${selesaiList.length}/${targetSurahs.length} Surah</span>`;
        aksiBtn = `<button class="btn btn-primary btn-sm" onclick="openModalNilai('${p.id}','${p.tipe}')" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> Lanjut</button>${hafalanProgresBtn}`;
      } else {
        statusCell = `<span style="color:#94a3b8;font-size:12px;">Belum Mulai</span>`;
        aksiBtn = `<button class="btn btn-primary btn-sm" onclick="openModalNilai('${p.id}','${p.tipe}')" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Mulai</button>${hafalanProgresBtn}`;
      }
    }

    return `<tr>
      <td style="font-family:monospace;font-size:12px;color:#64748b;">${p.id}</td>
      <td style="font-weight:600;">${nama}</td>
      <td><span style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">${p.tipe === 'guru' ? '👨‍🏫 Guru' : sub}</span></td>
      <td style="text-align:center;">${statusCell}</td>
      ${activeSesi.TipeSesi === 'Bacaan' ? `<td style="text-align:center;">${preCell}</td><td style="text-align:center;">${postCell}</td>` : `<td style="text-align:center;">${activeSesi.TipeSesi === 'Hafalan' ? (() => { const {hf} = getStatusInSesi(p.id, 'Hafalan', activeSesi.SesiID); const ts = activeSesi._materi?.surahs||[]; const done = [...new Set(hf.filter(x=>x.Status==='Selesai').map(x=>x.NamaSurah))]; return done.length ? done.join(', ') : '-'; })() : '-'}</td>`}
      <td style="text-align:right;"><div style="display:flex;gap:4px;justify-content:flex-end;align-items:center;flex-wrap:wrap;">${aksiBtn}</div></td>
    </tr>`;
  });

  tbody.innerHTML = rows.join('');
  document.getElementById('detProgress').innerText = `${doneCount} / ${pesertaList.length}`;
}

// ── PROGRESS DETAIL POPUP ───────────────────────────────────────────────────
window.showProgressDetail = (pesertaId, pesertaTipe, encodedNama) => {
  const nama = decodeURIComponent(encodedNama);
  const rentang = getRentang();
  const minLulus = getMinLulus();
  const INDIKATOR_NAMES = ['Kelancaran','Makharij Huruf','Sifat Huruf',"Mad Thabi'i",'Mad Lebih 2 Harakat','Dengungan (Ghunnah)','Waqf & Ibtida','Gharib','Keindahan (Lagu)','Lain-lain'];
  const INDIKATOR_SHORT = ['Kelancaran','Makh. Huruf','Sifat Huruf',"Mad Thabi'i",'Mad >2 Har.','Ghunnah','Waqf/Ibtida','Gharib','Lagu','Lain-lain'];

  let content = '';
  if (activeSesi?.TipeSesi === 'Bacaan') {
    const tests = dataStore.get('tesBacaan')
      .filter(t => String(t.SesiID) === String(activeSesi.SesiID) && String(t.PesertaID) === String(pesertaId))
      .sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));

    if (!tests.length) {
      content = `<div style="padding:40px;text-align:center;color:#94a3b8;">Belum ada data tes untuk peserta ini.</div>`;
    } else {
      content = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:.4px;">
          <th style="padding:10px 12px;text-align:left;">Tanggal</th>
          <th style="padding:10px 12px;text-align:left;">Jenis Tes</th>
          <th style="padding:10px 12px;text-align:left;">Materi</th>
          <th style="padding:10px 12px;text-align:left;">Nilai</th>
          <th style="padding:10px 12px;text-align:left;">Detail Indikator</th>
          <th style="padding:10px 12px;text-align:left;">Penguji</th>
          <th style="padding:10px 12px;text-align:left;">Catatan</th>
          <th style="padding:10px 12px;text-align:left;">Aksi</th>
        </tr></thead>
        <tbody>
        ${tests.map((t, idx) => {
          const k = getNilaiKategori(t.NilaiAkhir, rentang);
          const lulus = t.NilaiAkhir >= minLulus;
          const jenisBg    = t.JenisTes === 'Post Test' ? (lulus ? '#dcfce7' : '#fee2e2') : '#dbeafe';
          const jenisColor = t.JenisTes === 'Post Test' ? (lulus ? '#16a34a' : '#dc2626') : '#3b82f6';
          const editJenis = t.JenisTes === 'Pre Test' ? 'pre' : 'post';
          
          let hal = t.Halaman || '';
          if (hal.includes('T') && !isNaN(Date.parse(hal))) {
            const d = new Date(hal); hal = `Hal. ${d.getMonth() + 1}-${d.getDate()}`;
          }

          const detailList = INDIKATOR_SHORT.map((ind, i) => {
            const v = Number(t[`Ind${i+1}`]||0);
            if (v===0) return '';
            return `<span style="display:inline-block;background:#fee2e2;color:#dc2626;padding:2px 4px;border-radius:4px;margin:2px;font-size:9px;">${ind}: ${v}</span>`;
          }).filter(Boolean).join('') || `<span style="color:#16a34a;font-weight:600;font-size:10px;">Lancar (0 Kesalahan)</span>`;

          return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;">${fmtDate(t.Tanggal)}</td>
            <td style="padding:10px 12px;"><span style="font-size:11px;font-weight:700;background:${jenisBg};color:${jenisColor};padding:4px 8px;border-radius:6px;white-space:nowrap;">${t.JenisTes}</span></td>
            <td style="padding:10px 12px;"><strong>${t.NamaSurah||'-'}</strong><div style="font-size:10px;color:#64748b;">${hal}</div></td>
            <td style="padding:10px 12px;"><strong style="font-size:14px;color:${lulus ? '#16a34a' : '#dc2626'};">${t.NilaiAkhir}</strong> <span class="badge ${k.cls}" style="font-size:9px;">${k.label}</span></td>
            <td style="padding:10px 12px;min-width:150px;">${detailList}</td>
            <td style="padding:10px 12px;">${t.IDPenguji||'-'}</td>
            <td style="padding:10px 12px;font-size:11px;max-width:120px;word-break:break-word;">${t.Catatan||'-'}</td>
            <td style="padding:10px 12px;">
              <div style="display:flex;gap:4px;margin-top:4px;">
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('progressDetailModal').classList.remove('show'); previewRapotSantri('${pesertaId}', '${pesertaTipe}', '${t.ID}')" style="display:inline-flex;align-items:center;justify-content:center;height:26px;padding:0 8px;font-size:10px;font-weight:600;" title="Cetak Rapot Tes Ini">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Rapot
                </button>
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('progressDetailModal').classList.remove('show');openModalNilaiEdit('${pesertaId}','${pesertaTipe}','${editJenis}')" style="display:inline-flex;align-items:center;justify-content:center;height:26px;width:26px;padding:0;" title="Edit">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>`;
    }
  } else {
    // HAFALAN progress
    const { hf } = getStatusInSesi(pesertaId, 'Hafalan', activeSesi?.SesiID);
    const hfs = hf.sort((a, b) => new Date(a.TanggalSetor) - new Date(b.TanggalSetor));
    if (!hfs.length) {
      content = `<div style="padding:40px;text-align:center;color:#94a3b8;">Belum ada setoran hafalan.</div>`;
    } else {
      const targetSurahs = activeSesi._materi?.surahs || [];
      content = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:.4px;">
          <th style="padding:10px 12px;text-align:left;">Tgl Setor</th>
          <th style="padding:10px 12px;text-align:left;">Surah</th>
          <th style="padding:10px 12px;text-align:center;">Ayat</th>
          <th style="padding:10px 12px;text-align:center;">Status</th>
          <th style="padding:10px 12px;text-align:left;">Penguji</th>
          <th style="padding:10px 12px;text-align:left;">Catatan</th>
        </tr></thead>
        <tbody>
        ${hfs.map(h => {
          const sc = h.Status === 'Selesai' ? { bg:'#dcfce7', clr:'#16a34a' } : { bg:'#fef3c7', clr:'#b45309' };
          return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;white-space:nowrap;">${fmtDate(h.TanggalSetor)}</td>
            <td style="padding:10px 12px;font-weight:600;">${h.NamaSurah || '-'}<br><span style="font-size:10px;color:#64748b;">Juz ${h.Juz || '-'}</span></td>
            <td style="padding:10px 12px;text-align:center;">${h.AyatDari || '-'} — ${h.AyatSampai || '-'}</td>
            <td style="padding:10px 12px;text-align:center;"><span style="font-size:11px;font-weight:700;background:${sc.bg};color:${sc.clr};padding:3px 8px;border-radius:4px;">${h.Status}</span></td>
            <td style="padding:10px 12px;font-size:11px;">${h.IDPenguji || '-'}</td>
            <td style="padding:10px 12px;font-size:11px;color:#64748b;">${h.Catatan || '-'}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>`;
    }
  }

  // Inject into or create modal
  let modal = document.getElementById('progressDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'progressDetailModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal" style="max-width:1000px;width:95vw;">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h3 id="pdTitle" style="margin:0;font-size:16px;">Progres Evaluasi</h3>
          <div id="pdSub" style="font-size:12px;color:#64748b;margin-top:2px;"></div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('progressDetailModal').classList.remove('show')" style="display:inline-flex;align-items:center;justify-content:center;height:30px;width:30px;padding:0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="modal-body" id="pdBody" style="max-height:75vh;overflow-y:auto;padding:0;"></div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
  }
  document.getElementById('pdTitle').innerText = `Progres Evaluasi — ${nama} (${pesertaTipe === 'guru' ? 'Guru' : 'Santri'})`;
  document.getElementById('pdSub').innerText   = activeSesi?.NamaSesi || '';
  document.getElementById('pdBody').innerHTML  = content;
  modal.classList.add('show');
};

// ── MODAL NILAI ─────────────────────────────────────────────────────────────
window.openModalNilai = (pesertaId, pesertaTipe) => _openNilaiModal(pesertaId, pesertaTipe, null);
window.openModalNilaiEdit = (pesertaId, pesertaTipe, jenis) => _openNilaiModal(pesertaId, pesertaTipe, jenis);

function _openNilaiModal(pesertaId, pesertaTipe, editJenis) {
  if (!activeSesi) return;

  // Resolve name
  let namaPeserta = pesertaId, kelasPeserta = '-';
  if (pesertaTipe === 'santri') {
    const s = dataStore.get('santri').find(x => String(x.STambuk) === String(pesertaId));
    if (s) { namaPeserta = s.Nama; kelasPeserta = s.Kelas || '-'; }
  } else {
    const g = dataStore.get('guru').find(x => String(x.IDGuru) === String(pesertaId) || x.Nama === pesertaId);
    if (g) { namaPeserta = g.Nama; kelasPeserta = 'Guru'; }
  }

  const isBacaan = activeSesi.TipeSesi === 'Bacaan';
  const cfg = activeSesi._materi || {};
  const { pre, post } = isBacaan ? getStatusInSesi(pesertaId, 'Bacaan', activeSesi.SesiID) : {};

  // Determine jenis tes
  let jenisTes = 'Pre Test';
  if (isBacaan) {
    const allPosts = (getStatusInSesi(pesertaId, 'Bacaan', activeSesi.SesiID).allTests || []).filter(t => t.JenisTes !== 'Pre Test');
    if (editJenis === 'pre')  jenisTes = 'Pre Test';
    else if (editJenis === 'post') jenisTes = editData ? editData.JenisTes : 'Post Test';
    else {
      if (!pre) jenisTes = 'Pre Test';
      else if (allPosts.length === 0) jenisTes = 'Post Test';
      else jenisTes = `Remedial ${allPosts.length}`;
    }
  }

  // Modal title
  if (isBacaan) {
    document.getElementById('mnTitle').innerText = `${editJenis ? 'Edit' : 'Input'} ${jenisTes} — ${namaPeserta}`;
  } else {
    document.getElementById('mnTitle').innerText = `${editJenis ? 'Edit' : ''} Setoran Hafalan — ${namaPeserta}`;
  }
  document.getElementById('mnSubtitle').innerText = `ID: ${pesertaId} | ${kelasPeserta} | Sesi: ${activeSesi.NamaSesi}`;

  // Pre-fill edit data
  const editData = editJenis === 'pre' ? pre : (editJenis === 'post' ? post : null);

  let html = `
    <input type="hidden" id="mnPesertaId" value="${pesertaId}">
    <input type="hidden" id="mnPesertaTipe" value="${pesertaTipe}">
    <input type="hidden" id="mnEditId" value="${editData?.ID || ''}">
    ${isBacaan ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:4px;margin-bottom:14px;font-size:12px;display:flex;align-items:center;gap:12px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <strong>Jenis Tes:</strong> 
        <input type="text" id="mnJenisTes" value="${jenisTes}" style="padding:2px 8px;border:1px solid #93c5fd;border-radius:4px;font-weight:700;font-size:11px;width:120px;background:#fff;color:#1e40af;">
      </div>
      ${pre && jenisTes !== 'Pre Test' ? `<div style="border-left:1px solid #93c5fd;padding-left:12px;"><strong>Nilai Pre Test:</strong> <span style="color:#16a34a;font-weight:700;">${pre.NilaiAkhir}</span></div>` : ''}
    </div>` : `<input type="hidden" id="mnJenisTes" value="${jenisTes}">`}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div class="form-group"><label>Tanggal Penilaian *</label><input type="date" id="mnTanggal" value="${editData?.Tanggal?.split('T')[0] || new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group" style="position:relative;z-index:999;"><label>Penguji *</label><div id="mnPengujiWrap" style="height:36px;"></div></div>
    </div>`;

  if (isBacaan) {
    const surahStr = cfg.surah ? `📖 Surah: <strong>${cfg.surah}</strong>${cfg.ayat ? ` (Ayat ${cfg.ayat})` : ''}` : '';
    html += `
      <div style="background:#f1f5f9;padding:10px 14px;border-radius:6px;margin-bottom:14px;font-size:13px;border-left:3px solid #3b73c8;">${surahStr}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-weight:700;font-size:12px;color:#0f172a;">Catat Jumlah Kesalahan</div>
        <div style="font-size:11px;color:#64748b;background:#e2e8f0;padding:2px 8px;border-radius:99px;">Jaliy: -15 | Khafiy: -5</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        ${['Kelancaran','Makharij Huruf','Sifat Huruf',"Mad Thabi'i",'Mad Lebih 2 Harakat','Dengungan (Ghunnah)','Waqf & Ibtida','Gharib','Keindahan (Lagu)','Lain-lain']
          .map((ind, i) => {
            const v = editData ? (editData[`Ind${i+1}`] ?? editData?.Indikator?.[`Ind${i+1}`] ?? 0) : 0;
            const isJaliy = i < 3;
            const badge = isJaliy
              ? '<span style="font-size:10px;color:#ef4444;font-weight:600;margin-left:auto;">Jaliy (-15)</span>'
              : '<span style="font-size:10px;color:#f59e0b;font-weight:600;margin-left:auto;">Khafiy (-5)</span>';
            return `<div class="form-group" style="background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;">
              <div style="display:flex;align-items:center;margin-bottom:6px;"><label style="font-size:11px;margin:0;color:#334155;">${i+1}. ${ind}</label>${badge}</div>
              <input type="number" id="mnInd${i+1}" value="${v}" min="0" oninput="calcNilaiAkhir()" style="padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;width:100%;box-sizing:border-box;">
            </div>`;
          }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:#e2e8f0;padding:14px;border-radius:6px;margin-bottom:14px;border-left:4px solid #3b73c8;">
        <strong>Nilai Akhir (Otomatis):</strong>
        <span id="mnNilaiAkhir" style="font-size:28px;font-weight:700;color:var(--primary);">${editData?.NilaiAkhir ?? 100}</span>
      </div>`;
  } else {
    // ── HAFALAN MODE ──────────────────────────────────────────────────────────
    const isEdit = !!editJenis;
    const surahList = dataStore.get('surah');

    if (isEdit && editData) {
      const surahObj = surahList.find(s => s.nama === editData.NamaSurah);
      html += `
        <div style="background:#fef3c7;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px;border-left:3px solid #d97706;">
          📝 <strong>Mode Edit Setoran:</strong> Mengedit setoran <strong>${editData.NamaSurah}</strong>.
        </div>
        <input type="hidden" class="mn-surah-cb" value="${editData.NamaSurah}" checked>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:10px;font-size:13px;">${editData.NamaSurah} — Juz ${surahObj?.juz || editData.Juz || '-'} (${surahObj?.ayat || '-'} ayat)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div><label style="font-size:11px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Mulai Ayat</label>
              <input type="number" id="mnAyatDari" min="1" max="${surahObj?.ayat || 999}" value="${editData.AyatDari || 1}" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;"></div>
            <div><label style="font-size:11px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Sampai Ayat</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="number" id="mnAyatSampai" min="1" max="${surahObj?.ayat || 999}" value="${editData.AyatSampai || surahObj?.ayat || ''}" style="flex:1;padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
                <button type="button" onclick="document.getElementById('mnAyatDari').value=1;document.getElementById('mnAyatSampai').value=${surahObj?.ayat || ''};" style="padding:8px 10px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;font-size:11px;cursor:pointer;white-space:nowrap;">Semua</button>
              </div></div>
          </div>
        </div>
        <div class="form-group full"><label style="font-size:12px;font-weight:700;">Kualitas Hafalan *</label>
          <select id="mnStatus" style="border:1px solid #cbd5e1;padding:10px;border-radius:6px;width:100%;font-size:13px;">
            <option value="Selesai" ${editData.Status==='Selesai'?'selected':''}>✅ Lancar & Selesai (Mumtaz / Jayyid Jiddan)</option>
            <option value="Proses"  ${editData.Status==='Proses'?'selected':''}>⏳ Masih Terbata-bata / Perlu Diulang</option>
          </select>
        </div>`;
    } else {
      const surahItems = (cfg.surahs || []).map(sNama => {
        const sObj = surahList.find(s => s.nama === sNama);
        const sid  = `cb_${sNama.replace(/[^a-zA-Z0-9]/g,'_')}`;
        return `
          <div class="mn-surah-item" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:8px;">
            <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:#fff;user-select:none;" onclick="toggleSurahItem('${sid}')">
              <div id="cb_box_${sid}" style="width:20px;height:20px;border:2px solid #cbd5e1;border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;">
                <svg id="cb_chk_${sid}" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <input type="checkbox" class="mn-surah-cb" id="${sid}" value="${sNama}" style="display:none;" ${cfg.surahs.length===1?'checked':''}>
              <div style="flex:1;">
                <div style="font-weight:600;font-size:13px;color:#0f172a;">${sNama}</div>
                <div style="font-size:11px;color:#64748b;">Juz ${sObj?.juz || '-'} &bull; ${sObj?.ayat || '-'} ayat</div>
              </div>
              <svg id="cb_arr_${sid}" style="color:#94a3b8;transition:transform .2s;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </label>
            <div id="cb_body_${sid}" style="display:${cfg.surahs.length===1?'block':'none'};border-top:1px solid #e2e8f0;padding:12px 14px;background:#fafafa;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
                <div><label style="font-size:11px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Mulai Ayat</label>
                  <input type="number" id="ayat_dari_${sid}" data-surah="${sNama}" min="1" max="${sObj?.ayat||999}" value="1" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;"></div>
                <div><label style="font-size:11px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Sampai Ayat</label>
                  <div style="display:flex;gap:5px;">
                    <input type="number" id="ayat_sampai_${sid}" data-surah="${sNama}" min="1" max="${sObj?.ayat||999}" value="${sObj?.ayat||''}" style="flex:1;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                    <button type="button" onclick="document.getElementById('ayat_dari_${sid}').value=1;document.getElementById('ayat_sampai_${sid}').value=${sObj?.ayat||''};" style="padding:7px 10px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;font-size:11px;cursor:pointer;white-space:nowrap;">Semua</button>
                  </div></div>
              </div>
              <div><label style="font-size:11px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Kualitas</label>
                <select id="status_${sid}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;">
                  <option value="Selesai">✅ Lancar & Selesai</option>
                  <option value="Proses">⏳ Masih Perlu Diulang</option>
                </select>
              </div>
            </div>
          </div>`;
      }).join('');

      html += `
        <div style="background:#fef3c7;padding:10px 14px;border-radius:6px;margin-bottom:14px;font-size:13px;border-left:3px solid #d97706;">
          📝 <strong>Setoran Hafalan:</strong> Centang surah yang disetorkan. Bisa pilih banyak sekaligus.
        </div>
        <div style="margin-bottom:14px;">${surahItems}</div>`;
    }
  }

  html += `<div class="form-group full"><label>Catatan Penguji (Opsional)</label>
    <textarea id="mnCatatan" style="border:1px solid #cbd5e1;padding:8px;border-radius:4px;min-height:70px;font-family:inherit;width:100%;box-sizing:border-box;" placeholder="Catatan observasi...">${editData?.Catatan || ''}</textarea>
  </div>`;

  document.getElementById('mnBody').innerHTML = html;
  
  // Initialize SearchableSelect for Penguji
  setTimeout(() => {
    window.ssPengujiNilai = new SearchableSelect(
      document.getElementById('mnPengujiWrap'),
      dataStore.get('guru').map(g => ({ value: g.Nama, label: g.Nama })),
      { placeholder: 'Cari nama penguji...' }
    );
    window.ssPengujiNilai.setValue(editData?.IDPenguji || activeSesi.PenanggungJawab);
  }, 10);

  document.getElementById('modalNilaiSesi').classList.add('show');
  
  // Set button text dynamically based on context
  const btnSave = document.getElementById('btnSaveNilaiSesi');
  if (editData?.ID) {
    btnSave.innerText = 'Simpan Perubahan';
  } else if (isBacaan) {
    // Determine if this is a remedial (post-test repeated)
    const isRemedial = jenisTes === 'Post Test' && pre; // has pre test already
    if (jenisTes === 'Pre Test') btnSave.innerText = 'Simpan Pre Test';
    else if (jenisTes === 'Post Test') btnSave.innerText = post ? 'Simpan Remedial' : 'Simpan Post Test';
    else btnSave.innerText = 'Simpan Evaluasi';
  } else {
    btnSave.innerText = 'Simpan Setoran';
  }
  btnSave.onclick = _saveNilai;
}

async function _saveNilai() {
  const btn = document.getElementById('btnSaveNilaiSesi');
  const originalBtnText = btn.innerText;
  btn.disabled = true; btn.innerText = 'Menyimpan...';

  const pesertaId   = document.getElementById('mnPesertaId').value;
  const pesertaTipe = document.getElementById('mnPesertaTipe').value;
  const jenisTes    = document.getElementById('mnJenisTes').value;
  const penguji     = window.ssPengujiNilai?.getValue() || '';
  const tanggal     = document.getElementById('mnTanggal').value;

  const resetBtn = () => { btn.disabled = false; btn.innerText = originalBtnText; };

  if (!penguji) { resetBtn(); return showToast('Penguji harus dipilih!', 'error'); }
  if (!tanggal) { resetBtn(); return showToast('Tanggal harus diisi!', 'error'); }

  const isBacaan = activeSesi.TipeSesi === 'Bacaan';
  const cfg = activeSesi._materi || {};
  let payload = {};
  let res = { ok: false, msg: 'Tidak ada aksi dilakukan' };

  if (isBacaan) {
    const nilaiAkhir = Number(document.getElementById('mnNilaiAkhir')?.innerText || 100);
    const surahObj = dataStore.get('surah').find(s => s.nama === cfg.surah);
    
    payload = {
      SesiID     : activeSesi.SesiID,
      TipePeserta: pesertaTipe === 'guru' ? 'Guru' : 'Santri',
      PesertaID  : pesertaId,
      IDPenguji  : penguji,
      JenisTes   : jenisTes,
      Tanggal    : tanggal,
      NoSurah    : surahObj ? String(surahObj.no) : '',
      NamaSurah  : cfg.surah || '-',
      Halaman    : cfg.ayat  || '-',
      Catatan    : document.getElementById('mnCatatan').value,
      NilaiAkhir : nilaiAkhir,
    };
    // Add flat indicators
    for (let i = 1; i <= 10; i++) {
      payload[`Ind${i}`] = Number(document.getElementById(`mnInd${i}`)?.value || 0);
    }

    const editId = document.getElementById('mnEditId')?.value;
    if (editId) payload.ID = editId;
    const isUpdate = !!editId;

    res = await (isUpdate
      ? dataStore.update('tesBacaan', editId, payload)
      : dataStore.add('tesBacaan', payload));

    resetBtn();
    if (res.ok) {
      const nilaiTxt = ` — Nilai: ${payload.NilaiAkhir}`;
      showToast(`✓ ${jenisTes} berhasil ${isUpdate ? 'diperbarui' : 'disimpan'}${nilaiTxt}`);
      document.getElementById('modalNilaiSesi').classList.remove('show');
      renderPesertaList();
    } else {
      const errMsg = res.errors ? (res.msg + ': ' + res.errors.join(', ')) : res.msg;
      showToast(errMsg || 'Gagal menyimpan. Coba lagi.', 'error');
    }
    return;
  }

  // ── HAFALAN ────────────────────────────────────────────────────
  const selectedSurahs = [...document.querySelectorAll('.mn-surah-cb:checked')].map(cb => cb.value);
  if (!selectedSurahs.length) { resetBtn(); return showToast('Pilih minimal 1 surah!', 'error'); }

  const basePayload = {
    SesiID      : activeSesi.SesiID,
    STambuk     : pesertaId,
    IDPenguji   : penguji,
    TanggalSetor: tanggal,
    AyatDari    : document.getElementById('mnAyatDari')?.value || '',
    AyatSampai  : document.getElementById('mnAyatSampai')?.value || '',
    Status      : document.getElementById('mnStatus')?.value || 'Selesai',
    Catatan     : document.getElementById('mnCatatan').value,
  };

  const editId = document.getElementById('mnEditId')?.value;

  if (editId) {
    // Mode Edit: Update 1 baris
    const sNama = selectedSurahs[0];
    const surahObj = dataStore.get('surah').find(s => s.nama === sNama);
    const editPayload = { ...basePayload, ID: editId, NoSurah: surahObj?.no||'', NamaSurah: sNama, Juz: surahObj?.juz||'' };
    res = await dataStore.update('hafalan', editId, editPayload);
    resetBtn();
    if (res.ok) {
      showToast('✓ Data hafalan berhasil diperbarui');
      document.getElementById('modalNilaiSesi').classList.remove('show');
      renderPesertaList();
    } else {
      showToast(res.msg || 'Gagal memperbarui.', 'error');
    }
  } else {
    // Mode Add: Bisa masuk multi surah sekaligus, with per-surah ayat/status!
    let allOk = true;
    for (const sNama of selectedSurahs) {
      const surahObj = dataStore.get('surah').find(s => s.nama === sNama);
      const sid = `cb_${sNama.replace(/[^a-zA-Z0-9]/g,'_')}`;
      // Try to read per-surah fields, fallback to base fields
      const ayatDari   = document.getElementById(`ayat_dari_${sid}`)?.value || basePayload.AyatDari || '';
      const ayatSampai = document.getElementById(`ayat_sampai_${sid}`)?.value || basePayload.AyatSampai || '';
      const status     = document.getElementById(`status_${sid}`)?.value || basePayload.Status || 'Selesai';
      const singlePayload = {
        ...basePayload,
        AyatDari: ayatDari,
        AyatSampai: ayatSampai,
        Status: status,
        NoSurah: surahObj?.no||'',
        NamaSurah: sNama,
        Juz: surahObj?.juz||''
      };
      const r = await dataStore.add('hafalan', singlePayload);
      if (!r.ok) allOk = false;
    }
    resetBtn();
    if (allOk) {
      showToast(`✓ Setoran Hafalan (${selectedSurahs.length} surah) berhasil disimpan`);
      document.getElementById('modalNilaiSesi').classList.remove('show');
      renderPesertaList();
    } else {
      showToast('Sebagian/seluruh surah gagal disimpan', 'error');
    }
  }
}

window.calcNilaiAkhir = () => {
  let jaliy = 0, khafiy = 0;
  for (let i = 1; i <= 3; i++) jaliy += Number(document.getElementById(`mnInd${i}`)?.value || 0);
  for (let i = 4; i <= 10; i++) khafiy += Number(document.getElementById(`mnInd${i}`)?.value || 0);
  const nilai = Math.max(0, 100 - (jaliy * 15) - (khafiy * 5));
  const el = document.getElementById('mnNilaiAkhir');
  if (el) el.innerText = nilai;
};

// Toggle custom surah checkbox item in hafalan modal
window.toggleSurahItem = (sid) => {
  const cb   = document.getElementById(sid);
  const box  = document.getElementById(`cb_box_${sid}`);
  const chk  = document.getElementById(`cb_chk_${sid}`);
  const body = document.getElementById(`cb_body_${sid}`);
  const arr  = document.getElementById(`cb_arr_${sid}`);
  if (!cb) return;
  cb.checked = !cb.checked;
  if (cb.checked) {
    box.style.background = '#1b6b4a';
    box.style.borderColor = '#1b6b4a';
    chk.style.display = 'block';
    body.style.display = 'block';
    if (arr) arr.style.transform = 'rotate(180deg)';
  } else {
    box.style.background = '#fff';
    box.style.borderColor = '#cbd5e1';
    chk.style.display = 'none';
    body.style.display = 'none';
    if (arr) arr.style.transform = 'rotate(0deg)';
  }
};

window.openModal = (sesiId = null) => {
  const actualSesiId = typeof sesiId === 'string' ? sesiId : null;
  editingSesiId = actualSesiId;
  selectedPeserta.clear();
  pesertaTab = 'santri';
  
  const titleEl = document.getElementById('modalSesiTitle');
  const saveBtn = document.getElementById('btnSaveSesi');
  
  if (actualSesiId) {
    // EDIT MODE
    const sesi = dataStore.get('sesiUjian').find(s => String(s.SesiID) === String(actualSesiId));
    if (!sesi) return showToast('Sesi tidak ditemukan', 'error');
    
    titleEl.innerText = 'Edit Sesi Ujian';
    saveBtn.innerText = 'Simpan Perubahan';
    
    document.getElementById('fNamaSesi').value = sesi.NamaSesi || '';
    document.getElementById('fTanggal').value = sesi.Tanggal ? new Date(sesi.Tanggal).toISOString().split('T')[0] : '';
    document.getElementById('fPeriode').value = sesi.Periode || '';
    document.getElementById('fPenandatangan').value = sesi.Penandatangan || '';
    document.getElementById('fTTDUrl').value = sesi.TTDUrl || '';
    document.getElementById('fTipe').value = sesi.TipeSesi || 'Bacaan';
    document.getElementById('fTipe').disabled = true; // Can't change type after creation
    
    // Trigger materi config visibility
    document.getElementById('cfgBacaan').style.display = sesi.TipeSesi === 'Bacaan' ? 'grid' : 'none';
    document.getElementById('cfgHafalan').style.display = sesi.TipeSesi === 'Hafalan' ? 'block' : 'none';
    
    populateDropdowns();
    
    // Set PJ after populate
    setTimeout(() => {
      window.ssPJ?.setValue(sesi.PenanggungJawab || '');
      
      // Set materi
      if (sesi.TipeSesi === 'Bacaan') {
        window.ssSurah?.setValue(sesi._materi?.surah || '');
        document.getElementById('fAyat').value = sesi._materi?.ayat || '';
      } else {
        const surahs = sesi._materi?.surahs || [];
        document.querySelectorAll('.hf-surah-cb').forEach(cb => {
          cb.checked = surahs.includes(cb.value);
        });
      }
      
      // Restore selected peserta
      (sesi._peserta || []).forEach(p => {
        if (typeof p === 'object') {
          selectedPeserta.add(`${p.tipe}:${p.id}`);
        } else {
          selectedPeserta.add(`santri:${p}`);
        }
      });
      renderPesertaSelect();
    }, 50);
  } else {
    // CREATE MODE
    titleEl.innerText = 'Buat Sesi Ujian Baru';
    saveBtn.innerText = 'Simpan Sesi';
    document.getElementById('fNamaSesi').value = '';
    document.getElementById('fTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('fPeriode').value = dataStore.get('config')?.periodeAktif || '';
    document.getElementById('fPenandatangan').value = '';
    document.getElementById('fTTDUrl').value = '';
    document.getElementById('fTipe').value = 'Bacaan';
    document.getElementById('fTipe').disabled = false;
    document.getElementById('fAyat').value = '';
    populateDropdowns();
    setTimeout(() => {
      window.ssPJ?.setValue('');
      window.ssSurah?.setValue('');
    }, 50);
  }
  
  document.getElementById('tabSantriBtn').style.background = '#1b6b4a';
  document.getElementById('tabSantriBtn').style.color      = '#fff';
  document.getElementById('tabGuruBtn').style.background   = '#fff';
  document.getElementById('tabGuruBtn').style.color        = '#475569';
  document.getElementById('modalSesi').classList.add('show');
};

// ── EDIT SESI ───────────────────────────────────────────────────────────────
window.editSesi = (sesiId) => {
  window.openModal(sesiId);
};

// ── DELETE SESI ─────────────────────────────────────────────────────────────
window.deleteSesi = async (sesiId, namaSesi) => {
  if (!confirm(`Hapus sesi "${namaSesi}"?\n\nPerhatian: Data peserta di sesi ini tidak akan terhapus dari Tes Bacaan / Hafalan.`)) return;
  
  const res = await dataStore.remove('sesiUjian', sesiId);
  if (res.ok) {
    showToast('✓ Sesi berhasil dihapus');
  } else {
    showToast(res.msg || 'Gagal menghapus sesi', 'error');
  }
};

