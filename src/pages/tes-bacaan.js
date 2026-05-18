import { getTesBacaan, addTesBacaan, updateTesBacaan, deleteTesBacaan, getSantri, getGuru, getSurahList, getConfig } from '../api.js';
import { getNilaiKategori, fmtDate, showToast } from '../utils.js';
import { SearchableSelect } from '../components/searchable-select.js';

let allTes=[], allSantri=[], allGuru=[], allSurah=[], allConfig={}, activeTab='tes';
let ssPesertaTes, ssPengujiTes, ssSurahTes;

export async function renderTesBacaan(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Monitoring Tes Bacaan & Evaluasi</h2><p>Pre Test, Post Test & Rekap Remedial Terintegrasi</p></div>
      <button class="btn btn-primary" id="btnAddTes">+ Input Tes Evaluasi</button>
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
            <button class="btn btn-outline btn-sm" id="btnRefreshTes">&#8635;</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Riwayat Tes Evaluasi</h3><span class="text-muted" id="countTes">-</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th style="text-align:center;">#</th><th>Peserta & Penguji</th><th style="text-align:center;">Materi Ujian</th><th style="text-align:center;">Tgl & Jenis</th><th style="text-align:center;">Nilai Akhir</th><th>Detail Indikator</th><th style="text-align:center;">Aksi</th></tr></thead>
            <tbody id="tesBody"><tr><td colspan="7" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Panel Rekap Remedial -->
    <div id="panelRekap" style="display:none;">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div class="filter-bar">
             <div class="search-box"><span class="search-icon">&#128269;</span>
              <input type="text" id="srchRekap" placeholder="Cari nama peserta...">
            </div>
            <select id="flTipeRekap" style="width:130px;"><option value="Santri">Santri</option><option value="Guru">Guru</option></select>
            <select id="flStatusRekap" style="width:150px;">
              <option value="">Semua Status</option>
              <option value="Belum">Belum Ujian</option>
              <option value="Remedial">Perlu Pembinaan (Remedial)</option>
              <option value="Lulus">Tuntas (Lulus)</option>
            </select>
          </div>
        </div>
      </div>
      <div class="stat-grid" id="rekapStats" style="margin-bottom:16px;"></div>
      <div class="card">
        <div class="card-header"><h3>Status Tes Terakhir Peserta</h3><span class="text-muted" id="countRekap">-</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>ID Peserta</th><th>Nama</th><th>Status Terakhir</th><th>Jenis Tes Terakhir</th><th>Nilai Tes Terakhir</th><th>Keterangan</th></tr></thead>
            <tbody id="rekapBody"><tr><td colspan="7" class="no-data">Memuat...</td></tr></tbody>
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
              <select id="tJenis"><option value="Pre Test">Pre Test</option><option value="Post Test">Post Test</option></select>
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
              <h4 style="margin:0;">Penilaian Evaluasi</h4>
              <select id="tModePenilaian" style="width:auto;font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);">
                <option value="nilai">Input Nilai (0-100)</option>
                <option value="kesalahan">Input Jml Kesalahan</option>
              </select>
            </div>
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

  document.getElementById('tTipe').onchange     = () => {
    if(ssPesertaTes) ssPesertaTes.setOptions(buildPesertaOpts(document.getElementById('tTipe').value));
  };
  document.getElementById('tModePenilaian').onchange = () => {
    renderIndikatorInputs(null);
    calculateNilaiAkhir();
  };
  document.getElementById('tesSaveBtn').onclick = saveTes;
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
  document.getElementById('countTes').textContent = data.length + ' data';
  if (!data.length) {
    document.getElementById('tesBody').innerHTML = '<tr><td colspan="12" class="no-data">Belum ada data</td></tr>';
    return;
  }
  const inds = allConfig.indikatorChecklist || [];
  
  document.getElementById('tesBody').innerHTML = [...data].reverse().map((t, i) => {
    const k = getNilaiKategori(t.NilaiAkhir, allConfig.rentangNilai);
    const ayat = t.Halaman && t.Halaman !== 'Semua' ? `Ayat ${t.Halaman}` : 'Semua Ayat';
    
    // Build detail tooltip or list
    const detailList = inds.map((ind, idx) => {
      const val = t[`Ind${idx+1}`] || 0;
      return `<div style="font-size:11px;display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding:2px 0;">
                <span style="color:var(--text-muted);">${ind.label}</span> <strong style="color:var(--text);">${val}</strong>
              </div>`;
    }).join('');

    return `<tr>
      <td style="color:var(--text-muted);font-size:12px;vertical-align:middle;text-align:center;padding:12px;">${i+1}</td>
      <td style="vertical-align:middle;padding:12px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span class="badge badge-${t.TipePeserta==='Santri'?'aktif':'blue'}" style="font-size:9px;padding:2px 4px;">${t.TipePeserta}</span>
          <strong style="font-size:13px;color:var(--text);">${getPesertaNama(t.TipePeserta, t.PesertaID)}</strong>
        </div>
        <div style="font-size:11px;color:var(--text-muted);"><span style="font-weight:600;">Penguji:</span> ${getGuruNama(t.IDPenguji)}</div>
      </td>
      <td style="vertical-align:middle;text-align:center;padding:12px;">
        <div style="font-weight:600;font-size:13px;color:var(--text);">${t.NamaSurah||'-'}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${ayat}</div>
      </td>
      <td style="vertical-align:middle;text-align:center;padding:12px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:6px;">${fmtDate(t.Tanggal)}</div>
        <span class="badge badge-${t.JenisTes==='Pre Test'?'pretest':'posttest'}" style="font-size:10px;">${t.JenisTes}</span>
      </td>
      <td style="vertical-align:middle;text-align:center;padding:12px;">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-weight:800;font-size:22px;color:var(--primary);line-height:1;">${t.NilaiAkhir}</div>
          <div style="margin-top:8px;"><span class="badge ${k.cls}" style="font-size:10px;">${k.label}</span></div>
        </div>
      </td>
      <td style="vertical-align:middle;min-width:160px;padding:12px;">${detailList}</td>
      <td style="vertical-align:middle;text-align:center;padding:12px;">
        <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:140px;">
          ${t.JenisTes === 'Pre Test' ? `<button class="btn btn-outline btn-sm" data-lanjut="${t.ID}" title="Lanjut Post Test">&#10140; Post Test</button>` : (t.TipePeserta === 'Santri' ? `<button class="btn btn-primary btn-sm" data-rapot="${t.PesertaID}" title="Lihat Rapot">&#128065; Rapot</button>` : '')}
          <button class="btn btn-outline btn-sm" data-edit="${t.ID}" title="Edit">&#9998;</button>
          <button class="btn btn-danger btn-sm" data-del="${t.ID}" title="Hapus">&#128465;</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  
  document.querySelectorAll('[data-lanjut]').forEach(b => b.onclick = () => lanjutPostTest(b.dataset.lanjut));
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openAddTes(allTes.find(x => x.ID === b.dataset.edit)));
  document.querySelectorAll('[data-rapot]').forEach(b => b.onclick = () => openRapot(b.dataset.rapot));
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Hapus data tes ini?')) return;
    const r = await deleteTesBacaan(b.dataset.del);
    if (r.ok) { showToast('Dihapus'); loadAll(); }
  });
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

function openRapot(stambuk) {
  sessionStorage.setItem('autoRapotSantri', stambuk);
  window.location.hash = '#rapot';
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
    <div class="stat-card"><div class="stat-icon green">&#10003;</div><div><div class="stat-label">Tuntas (Lulus)</div><div class="stat-value">${countLulus}</div></div></div>
    <div class="stat-card"><div class="stat-icon red">&#9888;</div><div><div class="stat-label">Remedial</div><div class="stat-value">${countRemedial}</div></div></div>
    <div class="stat-card"><div class="stat-icon gold">&#9711;</div><div><div class="stat-label">Belum Ujian</div><div class="stat-value">${countBelum}</div></div></div>
  `;

  document.getElementById('countRekap').textContent = rekap.length + ' peserta';
  if (!rekap.length) {
    document.getElementById('rekapBody').innerHTML = '<tr><td colspan="7" class="no-data">Tidak ada data sesuai filter</td></tr>';
    return;
  }

  const ST_BADGE = {
    'Belum': '<span class="badge badge-belum">Belum Ujian</span>',
    'Remedial': '<span class="badge badge-pb">Remedial</span>',
    'Lulus': '<span class="badge badge-sb">Lulus</span>'
  };

  document.getElementById('rekapBody').innerHTML = rekap.map((r, i) => `
    <tr>
      <td style="color:var(--text-muted);font-size:12px;">${i+1}</td>
      <td style="font-family:monospace;font-size:13px;">${r.id}</td>
      <td style="font-weight:600;">${r.nama}</td>
      <td>${ST_BADGE[r.statusRekap]}</td>
      <td>${r.lastTest ? `<span class="badge badge-${r.lastTest.JenisTes==='Pre Test'?'pretest':'posttest'}">${r.lastTest.JenisTes}</span>` : '-'}</td>
      <td>${r.lastTest ? `<strong style="font-size:15px;">${r.lastTest.NilaiAkhir}</strong> <span class="badge ${r.kategori.cls}" style="margin-left:6px;font-size:10px;">${r.kategori.label}</span>` : '-'}</td>
      <td style="font-size:12px;color:var(--text-muted);">${r.lastTest ? `Ujian tgl ${fmtDate(r.lastTest.Tanggal)}` : 'Harus segera dijadwalkan'}</td>
    </tr>
  `).join('');
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
    const val = editData ? (editData[`Ind${i+1}`] || '') : '';
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

  // Tentukan mode berdasarkan data jika edit
  const inds = allConfig.indikatorChecklist || [];
  if (editData) {
    // Kalau ada nilai <= 20 dan tidak ada yang > 50, mungkin itu mode kesalahan
    const vals = inds.map((_, i) => Number(editData[`Ind${i+1}`]||0));
    const isKesalahan = vals.some(v => v > 0 && v <= 20) && !vals.some(v => v > 50);
    document.getElementById('tModePenilaian').value = isKesalahan ? 'kesalahan' : 'nilai';
  } else {
    document.getElementById('tModePenilaian').value = 'nilai';
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
