import { getTesBacaan, addTesBacaan, updateTesBacaan, deleteTesBacaan, getSantri, getGuru, getSurahList, getConfig } from '../api.js';
import { getNilaiKategori, fmtDate, showToast } from '../utils.js';
import { SearchableSelect } from '../components/searchable-select.js';

let allTes=[], allSantri=[], allGuru=[], allSurah=[], allConfig={}, activeTab='tes', activeRekapData=[];
let ssPesertaTes, ssPengujiTes, ssSurahTes;

export async function renderTesBacaan(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Monitoring Tes Bacaan & Evaluasi</h2><p>Pre Test, Post Test & Rekap Remedial Terintegrasi</p></div>
      <button class="btn btn-primary" id="btnAddTes" style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Input Tes Evaluasi</button>
    </div>

    <div class="tab-bar">
      <button class="tab-btn active" data-tab="tes">Riwayat Tes</button>
      <button class="tab-btn" data-tab="rekap">Rekap Remedial</button>
    </div>

    <!-- Panel Riwayat Tes -->
    <div id="panelTes">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div class="filter-bar">
            <div class="search-box"><span class="search-icon">&#128269;</span>
              <input type="text" id="srchTes" placeholder="Cari ID peserta / surah...">
            </div>
            <select id="flJenis" style="width:140px;"><option value="">Semua Jenis</option><option value="Pre Test">Pre Test</option><option value="Post Test">Post Test</option></select>
            <select id="flTipe" style="width:130px;"><option value="">Santri & Guru</option><option value="Santri">Santri</option><option value="Guru">Guru</option></select>
            <button class="btn btn-outline btn-sm" id="btnRefreshTes" style="display:flex;align-items:center;justify-content:center;height:38px;width:38px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg></button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Riwayat Tes Evaluasi</h3><span class="text-muted" id="countTes">-</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th style="text-align:center;">#</th><th>Peserta &amp; Penguji Terakhir</th><th style="text-align:center;">Materi Terakhir</th><th style="text-align:center;">Tgl &amp; Jenis Terakhir</th><th style="text-align:center;">Nilai Terakhir</th><th>Detail Indikator Terakhir</th><th style="text-align:center;">Aksi</th></tr></thead>
            <tbody id="tesBody"><tr><td colspan="7" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>

      <!-- Section Progress detail per peserta -->
      <div class="card mt-16" id="progressSection" style="display:none;margin-top:16px;">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <h3 id="progressTitle">Progress Evaluasi Bacaan</h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('progressSection').style.display='none'">&#10005; Tutup</button>
        </div>
        <div class="card-body" id="progressBody">
          <!-- Content progress di-generate via JS -->
        </div>
      </div>
    </div>

    <!-- Panel Rekap Remedial -->
    <div id="panelRekap" style="display:none;">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div class="filter-bar" style="display:flex;align-items:center;gap:12px;width:100%;">
             <div class="search-box" style="flex:1;"><span class="search-icon">&#128269;</span>
              <input type="text" id="srchRekap" placeholder="Cari nama peserta...">
            </div>
            <select id="flTipeRekap" style="width:130px;"><option value="Santri">Santri</option><option value="Guru">Guru</option></select>
            <select id="flStatusRekap" style="width:170px;">
              <option value="">Semua Status</option>
              <option value="Belum">Belum Ujian</option>
              <option value="Remedial">Perlu Pembinaan (Remedial)</option>
              <option value="Lulus">Tuntas (Lulus)</option>
            </select>
            <button class="btn btn-outline" id="btnPrintRekap" style="display:flex;align-items:center;gap:6px;height:38px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Cetak Rekap</button>
          </div>
        </div>
      </div>
      <div class="stat-grid" id="rekapStats" style="margin-bottom:16px;"></div>
      <div class="card">
        <div class="card-header"><h3>Status Tes Terakhir Peserta</h3><span class="text-muted" id="countRekap">-</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>ID Peserta</th><th>Nama</th><th>Status Terakhir</th><th style="text-align:center;">Jenis Ujian</th><th style="text-align:center;">Nilai Terakhir</th><th>Tanggal</th><th style="text-align:center;">Aksi</th></tr></thead>
            <tbody id="rekapBody"><tr><td colspan="8" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Input Tes Terintegrasi -->
    <div class="modal-overlay" id="modalTes">
      <div class="modal modal-lg">
        <div class="modal-header"><h3>Input Tes & Evaluasi</h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalTes').classList.remove('show')">&#10005;</button>
        </div>
        <div class="modal-body">
          <div id="tesAlert"></div>
          <div class="form-grid">
            <div class="form-group">
              <label>Tipe Peserta</label>
              <select id="tTipe"><option value="Santri">Santri</option><option value="Guru">Guru</option></select>
            </div>
            <div class="form-group">
              <label>Jenis Tes</label>
              <select id="tJenis"><option value="Pre Test">Pre Test</option><option value="Post Test">Post Test</option><option value="Remedial">Remedial</option></select>
            </div>
            <div class="form-group">
              <label>Tanggal</label>
              <input type="date" id="tTanggal">
            </div>
            <div class="form-group">
              <!-- Placeholder agar grid sejajar -->
            </div>
            <div class="form-group full">
              <label>Peserta *</label>
              <div id="wrapPesertaTes"></div>
            </div>
            <div class="form-group full">
              <label>Penguji *</label>
              <div id="wrapPengujiTes"></div>
            </div>
            <div class="form-group full">
              <label>Surah</label>
              <div id="wrapSurahTes"></div>
            </div>
            <div class="form-group" id="wrapAyatDari" style="display:none;">
              <label>Ayat Dari</label>
              <input type="number" id="tAyatDari" min="1" placeholder="1">
            </div>
            <div class="form-group" id="wrapAyatSampai" style="display:none;">
              <label>Ayat Sampai</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="number" id="tAyatSampai" min="1" placeholder="40" style="flex:1;">
                <button type="button" class="btn btn-outline btn-sm" id="btnSemuaAyat" title="Semua Ayat">Semua</button>
              </div>
            </div>
          </div>
          
          <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <h4 style="margin:0;">Penilaian Evaluasi</h4>
                <button type="button" class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:10px;height:auto;min-height:auto;border-radius:12px;" onclick="document.getElementById('infoRentangNilai').style.display=document.getElementById('infoRentangNilai').style.display==='none'?'block':'none'">&#9432; Panduan Nilai</button>
              </div>
              <select id="tModePenilaian" style="width:auto;font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);">
                <option value="nilai">Input Nilai (0-100)</option>
                <option value="kesalahan">Input Jml Kesalahan</option>
              </select>
            </div>
            <div id="infoRentangNilai" style="display:none;background:var(--surface2);padding:12px;border-radius:8px;font-size:12px;margin-bottom:12px;border:1px solid var(--border);"></div>
            <div id="wrapIndikator" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;background:var(--surface2);padding:16px;border-radius:8px;">
              <!-- Input indikator di-generate di sini -->
            </div>
            <div style="margin-top:16px;text-align:right;">
              <h3 style="margin:0;color:var(--text-muted);font-size:14px;">Nilai Akhir (Rata-rata):</h3>
              <div style="font-size:32px;font-weight:700;color:var(--primary);" id="tNilaiAkhir">0</div>
              <div id="tKategoriLabel" style="font-weight:600;font-size:14px;">-</div>
            </div>
          </div>

          <div class="form-group full" style="margin-top:16px;">
            <label>Catatan Umum</label>
            <textarea id="tCatatan" placeholder="Catatan tambahan..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalTes').classList.remove('show')">Batal</button>
          <button class="btn btn-primary" id="tesSaveBtn">Simpan Evaluasi</button>
        </div>
      </div>
    </div>`;

  await loadAll();

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => btn.onclick = () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.getElementById('panelTes').style.display   = activeTab === 'tes' ? 'block' : 'none';
    document.getElementById('panelRekap').style.display = activeTab === 'rekap' ? 'block' : 'none';
    if(activeTab === 'rekap') filterRekap();
  });

  document.getElementById('btnAddTes').onclick  = openAddTes;
  document.getElementById('btnRefreshTes').onclick = loadAll;
  
  // Filter Tes
  document.getElementById('srchTes').oninput  = filterTes;
  document.getElementById('flJenis').onchange = filterTes;
  document.getElementById('flTipe').onchange  = filterTes;

  // Filter Rekap
  document.getElementById('srchRekap').oninput     = filterRekap;
  document.getElementById('flTipeRekap').onchange  = filterRekap;
  document.getElementById('flStatusRekap').onchange= filterRekap;
  document.getElementById('btnPrintRekap').onclick = printRekapRemedial;

  document.getElementById('tTipe').onchange     = () => {
    if(ssPesertaTes) ssPesertaTes.setOptions(buildPesertaOpts(document.getElementById('tTipe').value));
  };
  document.getElementById('tModePenilaian').onchange = () => {
    renderIndikatorInputs(null);
    calculateNilaiAkhir();
  };
  document.getElementById('tesSaveBtn').onclick = saveTes;
}

function formatHalaman(h) {
  if (!h) return '';
  h = String(h).trim();
  
  // Case 1: ISO Date String like "2026-01-06T17:00:00.000Z"
  if (h.includes('T') && !isNaN(Date.parse(h))) {
    const d = new Date(h);
    return `${d.getMonth() + 1}-${d.getDate()}`;
  }
  
  // Case 2: Slash date format like "1/7/2026" or "01/07/2026"
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(h)) {
    const parts = h.split('/');
    return `${parseInt(parts[0])}-${parseInt(parts[1])}`;
  }
  
  return h;
}

async function loadAll() {
  const safeParseArr = r => Array.isArray(r) ? r : (typeof r === 'string' ? JSON.parse(r) : []);
  const safeParseObj = r => typeof r === 'string' ? JSON.parse(r) : (r || {});
  
  [allSantri, allGuru, allSurah, allTes, allConfig] = await Promise.all([
    getSantri().then(safeParseArr),
    getGuru().then(safeParseArr),
    getSurahList().then(safeParseArr),
    getTesBacaan().then(safeParseArr),
    getConfig().then(safeParseObj)
  ]);

  // Centralized cleanup to prevent Google Sheets auto-date conversion bugs
  allTes = allTes.map(t => ({
    ...t,
    Halaman: formatHalaman(t.Halaman)
  }));

  filterTes();
  if (activeTab === 'rekap') filterRekap();
}

// ── Searchable select builders ────────────────────────────────
function buildPesertaOpts(tipe) {
  return tipe === 'Santri'
    ? allSantri.map(s => ({
        value: String(s.STambuk),
        label: `${s.STambuk} — ${s.Nama}${s.Kelas ? ' · ' + s.Kelas : ''}`
      }))
    : allGuru.map(g => ({
        value: g.IDGuru,
        label: `${g.Nama} (${g.IDGuru})${g.KamarBagian ? ' · ' + g.KamarBagian : ''}`
      }));
}

function buildPengujiOpts() {
  return allGuru.map(g => ({
    value: g.IDGuru,
    label: `${g.Nama} (${g.IDGuru})${g.KamarBagian ? ' · ' + g.KamarBagian : ''}`
  }));
}

function buildSurahOpts() {
  return allSurah.map(s => ({
    value: String(s.no),
    label: `QS. ${s.no}. ${s.nama} — Juz ${s.juz} (${s.ayat} ayat)`
  }));
}

function initSearchableSelects() {
  ssPesertaTes = new SearchableSelect(document.getElementById('wrapPesertaTes'), buildPesertaOpts('Santri'), { placeholder: 'Cari nama / ID peserta...' });
  ssPengujiTes = new SearchableSelect(document.getElementById('wrapPengujiTes'), buildPengujiOpts(), { placeholder: 'Cari nama guru / penguji...' });
  ssSurahTes   = new SearchableSelect(document.getElementById('wrapSurahTes'), buildSurahOpts(), {
    placeholder: 'Cari nama surah...',
    onSelect: (val) => onSurahSelect(val)
  });
}

function onSurahSelect(noSurah) {
  const surah = allSurah.find(s => String(s.no) === String(noSurah));
  if (!surah) { hideAyat(); return; }
  document.getElementById('wrapAyatDari').style.display   = 'block';
  document.getElementById('wrapAyatSampai').style.display = 'block';
  document.getElementById('tAyatDari').value   = 1;
  document.getElementById('tAyatSampai').value = surah.ayat;
  document.getElementById('btnSemuaAyat').onclick = () => {
    document.getElementById('tAyatDari').value   = 1;
    document.getElementById('tAyatSampai').value = surah.ayat;
  };
}
function hideAyat() {
  document.getElementById('wrapAyatDari').style.display   = 'none';
  document.getElementById('wrapAyatSampai').style.display = 'none';
}

// ── Tes History ───────────────────────────────────────────────
function getGuruNama(id) {
  const g = allGuru.find(x => x.IDGuru === id);
  return g ? g.Nama : id;
}

function getPesertaNama(tipe, id) {
  if (tipe === 'Santri') {
    const s = allSantri.find(x => String(x.STambuk) === String(id));
    return s ? s.Nama : id;
  }
  return getGuruNama(id);
}

function filterTes() {
  const q  = document.getElementById('srchTes').value.toLowerCase();
  const j  = document.getElementById('flJenis').value;
  const tp = document.getElementById('flTipe').value;
  renderTes(allTes.filter(t =>
    (!q || (t.PesertaID + t.NamaSurah).toLowerCase().includes(q)) &&
    (!j  || t.JenisTes === j) &&
    (!tp || t.TipePeserta === tp)
  ));
}

function renderTes(data) {
  // Group by participant
  const grouped = {};
  data.forEach(t => {
    const key = `${t.TipePeserta}_${t.PesertaID}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });
  
  const entries = Object.entries(grouped);
  document.getElementById('countTes').textContent = entries.length + ' peserta (' + data.length + ' data tes)';
  
  if (!entries.length) {
    document.getElementById('tesBody').innerHTML = '<tr><td colspan="6" class="no-data">Belum ada data</td></tr>';
    return;
  }
  
  document.getElementById('tesBody').innerHTML = entries.map(([key, items], i) => {
    // Sort items of this participant descending to get the latest (prioritize Post Test on identical dates)
    const sorted = [...items].sort((a,b) => {
      const dateDiff = new Date(b.Tanggal) - new Date(a.Tanggal);
      if (dateDiff !== 0) return dateDiff;
      if (a.JenisTes === 'Pre Test' && b.JenisTes === 'Post Test') return 1;
      if (a.JenisTes === 'Post Test' && b.JenisTes === 'Pre Test') return -1;
      return 0;
    });
    const t = sorted[0]; // Latest test
    const tipe = t.TipePeserta;
    const id = t.PesertaID;
    
    const k = getNilaiKategori(t.NilaiAkhir, allConfig.rentangNilai);
    
    // Get all unique surahs tested in history
    const surahs = [...new Set(items.map(x => x.NamaSurah).filter(Boolean))];
    let surahLabels = surahs.slice(0, 3).map(s => `<span class="badge" style="background:var(--surface2);border:1px solid var(--border);">${s}</span>`).join(' ');
    if (surahs.length > 3) surahLabels += ` <span style="font-size:10px;color:var(--text-muted);">+${surahs.length - 3} lainnya</span>`;
    if (!surahs.length) surahLabels = '-';
    
    // Get all completed test types
    const completedTypes = [...new Set(items.map(x => x.JenisTes))];
    const badgesHtml = completedTypes.map(type => `<span class="badge badge-${type==='Pre Test'?'pretest':'posttest'}" style="font-size:10px;margin:2px;">${type}</span>`).join(' ');
    const lastDateLabel = `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Terakhir: ${fmtDate(t.Tanggal)}</div>`;

    // Check if showing "Lihat Rapot" or "Remedial" button
    const participantTests = allTes.filter(x => String(x.PesertaID) === String(id) && x.TipePeserta === tipe);
    const hasPostOrRemedial = participantTests.some(x => x.JenisTes === 'Post Test' || x.JenisTes === 'Remedial');
    
    // Sort overall tests to find the absolute latest test status
    const latestTestOverall = [...participantTests].sort((a,b) => {
      const dateDiff = new Date(b.Tanggal) - new Date(a.Tanggal);
      if (dateDiff !== 0) return dateDiff;
      if (a.JenisTes === 'Pre Test' && b.JenisTes === 'Post Test') return 1;
      if (a.JenisTes === 'Post Test' && b.JenisTes === 'Pre Test') return -1;
      return 0;
    })[0];
    const isLulus = latestTestOverall && Number(latestTestOverall.NilaiAkhir) >= (allConfig.nilaiMinLulus || 71);
    
    let actionBtnHtml = `<button class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:4px;" data-progress-id="${id}" data-progress-tipe="${tipe}" title="Lihat Progres"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> Lihat Progres</button>`;
    if (tipe === 'Santri' && hasPostOrRemedial) {
      if (isLulus) {
        actionBtnHtml += ` <button class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:4px;" data-rapot="${id}" title="Lihat Rapot"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> Lihat Rapot</button>`;
      } else {
        actionBtnHtml += ` <button class="btn btn-sm" style="background-color: #ef4444 !important; border-color: #ef4444 !important; color: white !important; display:inline-flex; align-items:center; gap:4px; font-weight:600;" data-input-remedial-id="${id}" data-input-remedial-tipe="${tipe}" title="Input Remedial"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Remedial</button>`;
      }
    }

    return `<tr>
      <td style="color:var(--text-muted);font-size:12px;vertical-align:middle;text-align:center;padding:12px;">${i+1}</td>
      <td style="vertical-align:middle;padding:12px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span class="badge badge-${tipe==='Santri'?'aktif':'blue'}" style="font-size:9px;padding:2px 4px;">${tipe}</span>
          <strong style="font-size:13px;color:var(--text);">${getPesertaNama(tipe, id)}</strong>
        </div>
        <div style="font-size:11px;color:var(--text-muted);"><span style="font-weight:600;">Penguji Terakhir:</span> ${getGuruNama(t.IDPenguji)}</div>
      </td>
      <td style="vertical-align:middle;text-align:center;padding:12px;">
        <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;">${surahLabels}</div>
      </td>
      <td style="vertical-align:middle;text-align:center;padding:12px;">
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div>${badgesHtml}</div>
          ${lastDateLabel}
        </div>
      </td>
      <td style="vertical-align:middle;text-align:center;padding:12px;">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-weight:800;font-size:22px;color:var(--primary);line-height:1;">${t.NilaiAkhir}</div>
          <div style="margin-top:8px;"><span class="badge ${k.cls}" style="font-size:10px;">${k.label}</span></div>
        </div>
      </td>
      <td style="vertical-align:middle;text-align:center;padding:12px;">
        <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:160px;">
          ${actionBtnHtml}
        </div>
      </td>
    </tr>`;
  }).join('');
  
  document.querySelectorAll('[data-progress-id]').forEach(b => {
    b.onclick = () => showProgress(b.dataset.progressId, b.dataset.progressTipe);
  });
  document.querySelectorAll('[data-rapot]').forEach(b => b.onclick = () => openRapot(b.dataset.rapot));
  document.querySelectorAll('[data-input-remedial-id]').forEach(b => {
    b.onclick = () => openInputRemedial(b.dataset.inputRemedialId, b.dataset.inputRemedialTipe);
  });
}

function showProgress(pesertaId, tipe) {
  const nama = getPesertaNama(tipe, pesertaId);
  const data = allTes.filter(t => String(t.PesertaID) === String(pesertaId) && t.TipePeserta === tipe)
                     .sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal)); // Sort latest first
  
  document.getElementById('progressTitle').textContent = `Progres Evaluasi — ${nama} (${tipe})`;
  
  const hasPostTest = data.some(t => t.JenisTes === 'Post Test');
  const inds = allConfig.indikatorChecklist || [];
  
  let html = '';
  if (!data.length) {
    html = '<p class="no-data">Belum ada riwayat tes evaluasi.</p>';
  } else {
    html = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Jenis Tes</th>
            <th>Materi</th>
            <th>Nilai Akhir</th>
            <th>Detail Indikator</th>
            <th>Penguji</th>
            <th>Catatan</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(t => {
            const k = getNilaiKategori(t.NilaiAkhir, allConfig.rentangNilai);
            const ayat = t.Halaman && t.Halaman !== 'Semua' ? `Ayat ${t.Halaman}` : 'Semua Ayat';
            
            // Check if this test was likely inputted in "kesalahan" mode
            const vals = inds.map((_, idx) => Number(t[`Ind${idx+1}`] || 0));
            const isKesalahan = (vals.some(v => v > 0 && v <= 20) && !vals.some(v => v > 50)) || (vals.every(v => v === 0) && Number(t.NilaiAkhir) === 100);
            
            const detailList = inds.map((ind, idx) => {
              const val = t[`Ind${idx+1}`] || 0;
              const labelSalah = isKesalahan ? ' salah' : '';
              return `<div style="font-size:11px;display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding:2px 0;">
                        <span style="color:var(--text-muted);">${ind.label}</span> <strong style="color:var(--text);">${val}${labelSalah}</strong>
                      </div>`;
            }).join('');
            
            // Tampilkan tombol "Lanjut Post Test" hanya jika tipe pre-test DAN belum ada post-test sama sekali
            const showLanjutBtn = t.JenisTes === 'Pre Test' && !hasPostTest;
            
            return `<tr>
              <td>${fmtDate(t.Tanggal)}</td>
              <td><span class="badge badge-${t.JenisTes==='Pre Test'?'pretest':'posttest'}">${t.JenisTes}</span></td>
              <td><strong>${t.NamaSurah||'-'}</strong><div style="font-size:11px;color:var(--text-muted);">${ayat}</div></td>
              <td><strong style="font-size:16px;color:var(--primary);">${t.NilaiAkhir}</strong> <span class="badge ${k.cls}" style="font-size:9px;margin-left:4px;">${k.label}</span></td>
              <td style="min-width:150px;">${detailList}</td>
              <td>${getGuruNama(t.IDPenguji)}</td>
              <td style="font-size:11px;max-width:150px;white-space:normal;word-break:break-word;">${t.Catatan||'-'}</td>
              <td>
                <div style="display:flex;gap:4px;">
                  ${showLanjutBtn ? `<button class="btn btn-outline btn-sm" data-lanjut="${t.ID}">➜ Post Test</button>` : ''}
                  <button class="btn btn-outline btn-sm" data-edit="${t.ID}">&#9998;</button>
                  <button class="btn btn-danger btn-sm" data-del="${t.ID}">&#128465;</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }
  
  document.getElementById('progressBody').innerHTML = html;
  
  // Bind actions inside progress section
  document.getElementById('progressBody').querySelectorAll('[data-lanjut]').forEach(b => {
    b.onclick = () => {
      lanjutPostTest(b.dataset.lanjut);
    };
  });
  document.getElementById('progressBody').querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = () => openAddTes(allTes.find(x => x.ID === b.dataset.edit));
  });
  document.getElementById('progressBody').querySelectorAll('[data-del]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('Hapus data tes ini?')) return;
      const r = await deleteTesBacaan(b.dataset.del);
      if (r.ok) {
        showToast('Dihapus');
        await loadAll();
        const remaining = allTes.filter(t => String(t.PesertaID) === String(pesertaId) && t.TipePeserta === tipe);
        if (remaining.length) {
          showProgress(pesertaId, tipe);
        } else {
          document.getElementById('progressSection').style.display = 'none';
        }
      }
    };
  });
  
  document.getElementById('progressSection').style.display = 'block';
  document.getElementById('progressSection').scrollIntoView({ behavior: 'smooth' });
}

function lanjutPostTest(id) {
  const t = allTes.find(x => x.ID === id);
  if (!t) return;
  openAddTes(); // Buka mode tambah baru
  document.querySelector('#modalTes h3').textContent = 'Lanjut Post Test';
  
  document.getElementById('tTipe').value = t.TipePeserta;
  ssPesertaTes.setOptions(buildPesertaOpts(t.TipePeserta));
  ssPesertaTes.setValue(t.PesertaID);
  ssPengujiTes.setValue(t.IDPenguji);
  document.getElementById('tJenis').value = 'Post Test'; // Force post test
  
  if (t.NoSurah) {
    ssSurahTes.setValue(t.NoSurah);
    onSurahSelect(t.NoSurah);
    if (t.Halaman && t.Halaman !== 'Semua') {
      const [d, s] = t.Halaman.split('-');
      document.getElementById('tAyatDari').value = d || '';
      document.getElementById('tAyatSampai').value = s || '';
    }
  }
}

function openInputRemedial(pesertaId, tipe) {
  const tests = allTes.filter(t => String(t.PesertaID) === String(pesertaId) && t.TipePeserta === tipe)
                      .sort((a,b) => new Date(b.Tanggal) - new Date(a.Tanggal));
  const lastT = tests[0];
  
  openAddTes(); // Buka mode tambah baru
  document.querySelector('#modalTes h3').textContent = 'Input Remedial';
  
  document.getElementById('tTipe').value = tipe;
  ssPesertaTes.setOptions(buildPesertaOpts(tipe));
  ssPesertaTes.setValue(pesertaId);
  if (lastT) {
    ssPengujiTes.setValue(lastT.IDPenguji);
  }
  document.getElementById('tJenis').value = 'Remedial'; // Force "Remedial"
  
  if (lastT && lastT.NoSurah) {
    ssSurahTes.setValue(lastT.NoSurah);
    onSurahSelect(lastT.NoSurah);
    if (lastT.Halaman && lastT.Halaman !== 'Semua') {
      const [d, s] = lastT.Halaman.split('-');
      document.getElementById('tAyatDari').value = d || '';
      document.getElementById('tAyatSampai').value = s || '';
    }
  }
}

function openRapot(stambuk) {
  sessionStorage.setItem('autoRapotSantri', stambuk);
  window.location.hash = '#rapot';
}

function printRekapRemedial() {
  const tipe = document.getElementById('flTipeRekap').value;
  const statusFilter = document.getElementById('flStatusRekap').value;
  
  if (!activeRekapData || !activeRekapData.length) {
    alert('Tidak ada data rekap remedial yang dapat dicetak.');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  
  const rowsHtml = activeRekapData.map((r, idx) => {
    let details = '-';
    if (r.lastTest) {
      const ayatStr = r.lastTest.Halaman && r.lastTest.Halaman !== 'Semua' ? ` Ayat ${r.lastTest.Halaman}` : ' Semua Ayat';
      details = `<strong>${r.lastTest.NamaSurah || '-'}</strong> (${r.lastTest.JenisTes}${ayatStr})`;
    }
    
    const statusText = r.statusRekap === 'Lulus' ? 'Tuntas (Lulus)' : (r.statusRekap === 'Remedial' ? 'Perlu Pembinaan (Remedial)' : 'Belum Ujian');
    const badgeCls = r.statusRekap === 'Lulus' ? 'badge-sb' : (r.statusRekap === 'Remedial' ? 'badge-pb' : 'badge-belum');
    
    return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-family:monospace;font-weight:600;">${r.id}</td>
        <td><strong>${r.nama}</strong></td>
        <td><span class="badge ${badgeCls}">${statusText}</span></td>
        <td>${details}</td>
        <td style="text-align:center;font-weight:bold;font-size:14px;">${r.lastTest ? r.lastTest.NilaiAkhir : '-'}</td>
        <td>${r.lastTest ? fmtDate(r.lastTest.Tanggal) : '-'}</td>
      </tr>
    `;
  }).join('');

  const countLulus = activeRekapData.filter(x => x.statusRekap === 'Lulus').length;
  const countRemedial = activeRekapData.filter(x => x.statusRekap === 'Remedial').length;
  const countBelum = activeRekapData.filter(x => x.statusRekap === 'Belum').length;

  const html = `
    <html>
    <head>
      <title>Cetak Rekap Remedial — Markaz Qur'an</title>
      <style>
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 40px;
          line-height: 1.5;
        }
        .header {
          text-align: center;
          border-bottom: 3px double #cbd5e1;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo-text {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin: 0;
          text-transform: uppercase;
        }
        .sub-text {
          font-size: 14px;
          color: #64748b;
          margin: 5px 0 0 0;
          font-weight: 500;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          text-align: center;
          margin: 20px 0;
          text-transform: uppercase;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 25px;
          font-size: 13px;
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .meta-item span {
          font-weight: 700;
          color: #475569;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 12px;
        }
        th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          padding: 12px 10px;
          border: 1px solid #cbd5e1;
          text-align: left;
        }
        td {
          padding: 10px;
          border: 1px solid #cbd5e1;
          color: #334155;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-belum { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
        .badge-pb { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
        .badge-sb { background: #f0fdf4; color: #22c55e; border: 1px solid #bbf7d0; }
        .footer-section {
          margin-top: 60px;
          display: flex;
          justify-content: flex-end;
          font-size: 13px;
        }
        .signature-box {
          text-align: center;
          width: 250px;
        }
        .signature-space {
          height: 80px;
        }
        .signature-name {
          font-weight: 700;
          border-bottom: 1px solid #475569;
          padding-bottom: 3px;
        }
        @media print {
          body { padding: 0; }
          @page { margin: 1.5cm; }
        }
      </style>
      <script>
        window.addEventListener('afterprint', () => {
          window.close();
        });
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 500);
        };
      </script>
    </head>
    <body>
      <div class="header">
        <h1 class="logo-text">MARKAZ QUR'AN</h1>
        <p class="sub-text">Sistem Monitoring & Pembinaan Tahsin Terpadu</p>
      </div>
      
      <h2 class="title">REKAPITULASI EVALUASI & REMEDIAL BACAAN (${tipe.toUpperCase()})</h2>
      
      <div class="meta-grid">
        <div class="meta-item"><span>Tanggal Cetak:</span> ${fmtDate(new Date())}</div>
        <div class="meta-item"><span>Filter Status:</span> ${statusFilter || 'Semua Status'}</div>
        <div class="meta-item"><span>Statistik Tuntas (Lulus):</span> ${countLulus} Peserta</div>
        <div class="meta-item"><span>Statistik Remedial:</span> ${countRemedial} Peserta</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width:30px;text-align:center;">#</th>
            <th style="width:100px;">Stambuk / ID</th>
            <th>Nama Lengkap</th>
            <th style="width:180px;">Status Terakhir</th>
            <th>Ujian Terakhir</th>
            <th style="width:70px;text-align:center;">Nilai</th>
            <th style="width:100px;">Tanggal Ujian</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      
      <div class="footer-section">
        <div class="signature-box">
          <p>Kediri, ${fmtDate(new Date())}</p>
          <p style="margin-top:-10px;">Penanggung Jawab Markaz Qur'an</p>
          <div class="signature-space"></div>
          <p class="signature-name">......................................................</p>
          <p style="font-size:11px;color:#64748b;margin-top:-5px;">Staff Penguji Markaz Qur'an</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
}

// ── Rekap Remedial ────────────────────────────────────────────
function filterRekap() {
  const q    = document.getElementById('srchRekap').value.toLowerCase();
  const tipe = document.getElementById('flTipeRekap').value;
  const st   = document.getElementById('flStatusRekap').value;
  const minLulus = allConfig.nilaiMinLulus || 70;

  const people = tipe === 'Santri' ? allSantri : allGuru;
  const rekap = [];

  let countLulus = 0, countRemedial = 0, countBelum = 0;

  people.forEach(p => {
    const id = tipe === 'Santri' ? p.STambuk : p.IDGuru;
    const nama = p.Nama;
    if (q && !`${id} ${nama}`.toLowerCase().includes(q)) return;

    // Cari tes terakhir orang ini
    const tests = allTes.filter(t => t.PesertaID === id).sort((a,b) => new Date(a.Tanggal) - new Date(b.Tanggal));
    const lastTest = tests.length > 0 ? tests[tests.length-1] : null;

    let statusRekap = 'Belum';
    let k = null;
    if (lastTest) {
      if (Number(lastTest.NilaiAkhir) >= minLulus) {
        statusRekap = 'Lulus'; countLulus++;
      } else {
        statusRekap = 'Remedial'; countRemedial++;
      }
      k = getNilaiKategori(lastTest.NilaiAkhir, allConfig.rentangNilai);
    } else {
      countBelum++;
    }

    if (st && statusRekap !== st) return;

    rekap.push({
      id, nama, lastTest, statusRekap, kategori: k
    });
  });

  document.getElementById('rekapStats').innerHTML = `
    <div class="stat-card"><div class="stat-icon green" style="display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div><div class="stat-label">Tuntas (Lulus)</div><div class="stat-value">${countLulus}</div></div></div>
    <div class="stat-card"><div class="stat-icon red" style="display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div class="stat-label">Remedial</div><div class="stat-value">${countRemedial}</div></div></div>
    <div class="stat-card"><div class="stat-icon gold" style="display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div class="stat-label">Belum Ujian</div><div class="stat-value">${countBelum}</div></div></div>
  `;

  activeRekapData = rekap;

  document.getElementById('countRekap').textContent = rekap.length + ' peserta';
  if (!rekap.length) {
    document.getElementById('rekapBody').innerHTML = '<tr><td colspan="8" class="no-data">Tidak ada data sesuai filter</td></tr>';
    return;
  }

  const ST_BADGE = {
    'Belum': '<span class="badge badge-belum">Belum Ujian</span>',
    'Remedial': '<span class="badge badge-pb">Remedial</span>',
    'Lulus': '<span class="badge badge-sb">Lulus</span>'
  };

  document.getElementById('rekapBody').innerHTML = rekap.map((r, i) => {
    let actionBtn = '-';
    if (r.statusRekap === 'Remedial') {
      actionBtn = `<button class="btn btn-sm" style="background-color: #ef4444 !important; border-color: #ef4444 !important; color: white !important; display:inline-flex; align-items:center; gap:4px; font-weight:600;" data-input-remedial-id="${r.id}" data-input-remedial-tipe="${tipe}" title="Input Remedial"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Remedial</button>`;
    }
    
    let jenisBadge = '-';
    if (r.lastTest) {
      const jType = r.lastTest.JenisTes;
      const bCls = jType === 'Pre Test' ? 'pretest' : (jType === 'Post Test' ? 'posttest' : 'warning');
      jenisBadge = `<span class="badge badge-${bCls}">${jType}</span>`;
    }

    return `
      <tr>
        <td style="color:var(--text-muted);font-size:12px;">${i+1}</td>
        <td style="font-family:monospace;font-size:13px;font-weight:600;">${r.id}</td>
        <td style="font-weight:600;">${r.nama}</td>
        <td>${ST_BADGE[r.statusRekap]}</td>
        <td style="text-align:center;">${jenisBadge}</td>
        <td style="text-align:center;">${r.lastTest ? `<strong style="font-size:15px;color:var(--primary);">${r.lastTest.NilaiAkhir}</strong> <span class="badge ${r.kategori.cls}" style="margin-left:6px;font-size:10px;">${r.kategori.label}</span>` : '-'}</td>
        <td>${r.lastTest ? fmtDate(r.lastTest.Tanggal) : '-'}</td>
        <td style="text-align:center;">${actionBtn}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('rekapBody').querySelectorAll('[data-input-remedial-id]').forEach(b => {
    b.onclick = () => openInputRemedial(b.dataset.inputRemedialId, b.dataset.inputRemedialTipe);
  });
}


// ── Add Tes ───────────────────────────────────────────────────
function isJaliy(label) {
  const l = label.toLowerCase();
  return l.includes('lancar') || l.includes('makhraj') || l.includes('makharij') || l.includes('sifat') || l.includes('jaliy');
}

function renderIndikatorInputs(editData) {
  const mode = document.getElementById('tModePenilaian').value;
  const inds = allConfig.indikatorChecklist || [];
  const wrapInd = document.getElementById('wrapIndikator');
  
  wrapInd.innerHTML = inds.map((ind, i) => {
    let val = '';
    if (editData) {
      val = editData[`Ind${i+1}`] !== undefined ? editData[`Ind${i+1}`] : (mode === 'kesalahan' ? '0' : '');
    } else {
      val = mode === 'kesalahan' ? '0' : '';
    }
    
    if (mode === 'kesalahan') {
      const isJ = isJaliy(ind.label);
      return `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:11px;font-weight:600;display:flex;justify-content:space-between;">
          <span>${ind.label}</span>
          <span style="color:var(--text-muted);font-weight:normal;">${isJ?'Jaliy (-15)':'Khafiy (-5)'}</span>
        </label>
        <div style="display:flex; gap:4px;">
          <input type="number" id="indInput_${i}" min="0" placeholder="Jml Salah" style="padding:6px 10px; flex:1;" value="${val}">
          <select id="indTipe_${i}" style="width:75px; padding:6px; font-size:11px; border:1px solid var(--border); border-radius:4px;">
            <option value="15" ${isJ?'selected':''}>Jaliy</option>
            <option value="5" ${!isJ?'selected':''}>Khafiy</option>
          </select>
        </div>
      </div>`;
    } else {
      return `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:12px;font-weight:600;">${ind.label}</label>
        <input type="number" id="indInput_${i}" min="0" max="100" placeholder="0-100" style="padding:6px 10px;" value="${val}">
      </div>`;
    }
  }).join('');

  inds.forEach((ind, i) => {
    const el = document.getElementById(`indInput_${i}`);
    if(el) el.addEventListener('input', calculateNilaiAkhir);
    const sel = document.getElementById(`indTipe_${i}`);
    if(sel) sel.addEventListener('change', calculateNilaiAkhir);
  });
}

function calculateNilaiAkhir() {
  const mode = document.getElementById('tModePenilaian').value;
  const inds = allConfig.indikatorChecklist || [];
  let finalAvg = 0;
  let hasInput = false;

  if (mode === 'kesalahan') {
    let totalDeduction = 0;
    inds.forEach((ind, i) => {
      const el = document.getElementById(`indInput_${i}`);
      const sel = document.getElementById(`indTipe_${i}`);
      if (el && el.value !== '') {
        hasInput = true;
        const salah = Number(el.value);
        const bobot = sel ? Number(sel.value) : (isJaliy(ind.label) ? 15 : 5);
        totalDeduction += (salah * bobot);
      }
    });
    finalAvg = Math.max(0, 100 - totalDeduction);
  } else {
    let sum = 0, count = 0;
    inds.forEach((ind, i) => {
      const el = document.getElementById(`indInput_${i}`);
      if(el && el.value !== '') {
        hasInput = true;
        sum += Number(el.value);
        count++;
      }
    });
    finalAvg = count === 0 ? 0 : Math.round(sum / count);
  }

  if(hasInput) {
    document.getElementById('tNilaiAkhir').textContent = finalAvg;
    const k = getNilaiKategori(finalAvg, allConfig.rentangNilai);
    const lbl = document.getElementById('tKategoriLabel');
    lbl.textContent = k.label;
    lbl.style.color = k.cls.includes('sb')||k.cls.includes('b') ? 'var(--primary)' : 'var(--danger)';
  } else {
    document.getElementById('tNilaiAkhir').textContent = '0';
    document.getElementById('tKategoriLabel').textContent = '-';
  }
}

let editTesId = null;

function openAddTes(editData = null) {
  editTesId = editData && editData.ID ? editData.ID : null;
  document.querySelector('#modalTes h3').textContent = editTesId ? 'Edit Tes & Evaluasi' : 'Input Tes & Evaluasi';
  document.getElementById('tesAlert').innerHTML = '';
  hideAyat();
  initSearchableSelects();

  if (editTesId) {
    document.getElementById('tTipe').value = editData.TipePeserta;
    ssPesertaTes.setOptions(buildPesertaOpts(editData.TipePeserta));
    ssPesertaTes.setValue(editData.PesertaID);
    ssPengujiTes.setValue(editData.IDPenguji);
    document.getElementById('tTanggal').value = new Date(editData.Tanggal).toISOString().slice(0, 10);
    document.getElementById('tJenis').value = editData.JenisTes;
    if (editData.NoSurah) {
      ssSurahTes.setValue(editData.NoSurah);
      onSurahSelect(editData.NoSurah);
      if (editData.Halaman && editData.Halaman !== 'Semua') {
        const [d, s] = editData.Halaman.split('-');
        document.getElementById('tAyatDari').value = d || '';
        document.getElementById('tAyatSampai').value = s || '';
      }
    }
    document.getElementById('tCatatan').value = editData.Catatan || '';
  } else {
    document.getElementById('tTanggal').value = new Date().toISOString().slice(0, 10);
    document.getElementById('tCatatan').value = '';
  }

  // Render Rentang Nilai Info
  const rentangHtml = (allConfig.rentangNilai || []).map(r => 
    `<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding:4px 0;">
      <span style="font-weight:600;color:var(--primary);">${r.min} - ${r.max}</span>
      <span style="font-weight:600;">${r.label}</span>
      <span style="color:var(--text-muted);flex:1;text-align:right;">${r.ket}</span>
    </div>`
  ).join('');
  document.getElementById('infoRentangNilai').innerHTML = `
    <div style="margin-bottom:6px;font-weight:600;">Panduan Kategori Nilai:</div>
    ${rentangHtml}
    <div style="margin-top:6px;font-size:10px;color:var(--text-muted);">* Jika Mode Kesalahan: 1 Kesalahan Jaliy = -15, Khafiy = -5.</div>
  `;

  // Tentukan mode berdasarkan data jika edit
  const inds = allConfig.indikatorChecklist || [];
  if (editData) {
    // Kalau ada nilai <= 20 dan tidak ada yang > 50, mungkin itu mode kesalahan
    const vals = inds.map((_, i) => Number(editData[`Ind${i+1}`]||0));
    const isKesalahan = vals.some(v => v > 0 && v <= 20) && !vals.some(v => v > 50);
    document.getElementById('tModePenilaian').value = isKesalahan ? 'kesalahan' : 'nilai';
  } else {
    document.getElementById('tModePenilaian').value = 'kesalahan';
  }

  renderIndikatorInputs(editData);
  calculateNilaiAkhir(); // reset / recalc

  document.getElementById('modalTes').classList.add('show');
}

async function saveTes() {
  const peserta = ssPesertaTes?.getValue();
  const penguji = ssPengujiTes?.getValue();
  const surah   = ssSurahTes?.getValue();
  
  const inds = allConfig.indikatorChecklist || [];
  let hasMissingNilai = false;
  const values = {};
  inds.forEach((ind, i) => {
    const val = document.getElementById(`indInput_${i}`)?.value;
    if(val === '' || val === undefined) hasMissingNilai = true;
    values[`Ind${i+1}`] = Number(val||0);
  });

  if (!peserta || !penguji || hasMissingNilai) {
    document.getElementById('tesAlert').innerHTML = '<div class="alert alert-error">Peserta, Penguji, dan Semua Indikator wajib diisi (isi 0 jika tidak ada kesalahan).</div>';
    return;
  }

  calculateNilaiAkhir(); // ensure latest avg
  const nilaiAkhir = Number(document.getElementById('tNilaiAkhir').textContent);

  const surahObj   = allSurah.find(s => String(s.no) === String(surah));
  const ayatDari   = document.getElementById('tAyatDari').value;
  const ayatSampai = document.getElementById('tAyatSampai').value;
  const halaman    = surah ? (ayatDari && ayatSampai ? `${ayatDari}-${ayatSampai}` : 'Semua') : '';

  const data = {
    TipePeserta: document.getElementById('tTipe').value,
    PesertaID  : peserta,
    IDPenguji  : penguji,
    Tanggal    : document.getElementById('tTanggal').value,
    NoSurah    : surah || '',
    NamaSurah  : surahObj?.nama || '',
    Halaman    : halaman,
    JenisTes   : document.getElementById('tJenis').value,
    NilaiAkhir : nilaiAkhir,
    Catatan    : document.getElementById('tCatatan').value,
    ...values // menyebar Ind1, Ind2, dst
  };

  const btn = document.getElementById('tesSaveBtn');
  
  let r;
  if (editTesId) {
    data.ID = editTesId;
    btn.textContent = 'Menyimpan Perubahan...'; btn.disabled = true;
    r = await updateTesBacaan(data);
  } else {
    btn.textContent = 'Menyimpan...'; btn.disabled = true;
    r = await addTesBacaan(data);
  }
  
  btn.textContent = 'Simpan Evaluasi'; btn.disabled = false;
  
  if (r.ok) {
    document.getElementById('modalTes').classList.remove('show');
    showToast('Tes Evaluasi berhasil disimpan');
    loadAll();
  } else {
    document.getElementById('tesAlert').innerHTML = `<div class="alert alert-error">${r.msg}</div>`;
  }
}
