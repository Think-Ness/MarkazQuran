import { getHafalan,addHafalan,updateHafalan,deleteHafalan,getSantri,getGuru,getSurahList } from '../api.js';
import { fmtDate, showToast } from '../utils.js';
import { SearchableSelect } from '../components/searchable-select.js';

let allHafalan=[],allSantri=[],allGuru=[],allSurah=[],editingId=null;
let ssSantri, ssPenguji, ssSurah;

export async function renderHafalan(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Monitoring Hafalan</h2><p>Tracking hafalan Al-Quran per santri per surah</p></div>
      <button class="btn btn-primary" id="btnAdd" style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Input Hafalan</button>
    </div>
    <div class="stat-grid" id="summaryCards" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:20px;"></div>
    <div class="card mb-16" style="margin-bottom:16px;">
      <div class="card-body" style="padding:14px 20px;">
        <div class="filter-bar">
          <div class="search-box"><span class="search-icon">&#128269;</span><input type="text" id="srch" placeholder="Cari stambuk / surah..."></div>
          <select id="flSantri" style="width:180px;"><option value="">Semua Santri</option></select>
          <select id="flStatus" style="width:130px;"><option value="">Semua Status</option><option value="Selesai">Selesai</option><option value="Proses">Proses</option><option value="Belum">Belum</option></select>
          <select id="flJuz" style="width:110px;"><option value="">Semua Juz</option></select>
          <button class="btn btn-outline btn-sm" id="btnRefresh" style="display:flex;align-items:center;justify-content:center;height:38px;width:38px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg></button>
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h3>Daftar Setoran Hafalan</h3><span class="text-muted" id="countLabel">-</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Stambuk</th><th>Santri</th><th>Surah</th><th>Juz</th><th>Status</th><th>Terakhir Setor</th><th>Penguji</th><th>Aksi</th></tr></thead>
          <tbody id="hafalanBody"><tr><td colspan="9" class="no-data">Memuat...</td></tr></tbody>
        </table>
      </div>
    </div>
    <div class="card" id="progressSection" style="display:none;">
      <div class="card-header">
        <h3 id="progressTitle">Progress Santri</h3>
        <button class="btn btn-outline btn-sm" id="btnCloseProgress">Tutup</button>
      </div>
      <div class="card-body" id="progressBody"></div>
    </div>

    <!-- Modal Input Hafalan -->
    <div class="modal-overlay" id="modalHafalan">
      <div class="modal modal-lg">
        <div class="modal-header"><h3 id="modalTitle">Input Hafalan</h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalHafalan').classList.remove('show')">&#10005;</button>
        </div>
        <div class="modal-body">
          <div id="hfAlert"></div>
          <div id="hfWarningContainer" style="display:none;margin-bottom:16px;">
            <div class="alert alert-warning" id="hfWarningText" style="margin-bottom:8px;"></div>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;background:var(--surface2);padding:8px 12px;border-radius:6px;border:1px solid var(--border);">
              <input type="checkbox" id="hfBypassWarning"> Izinkan menambah target baru walau masih ada yang Proses
            </label>
          </div>
          <div class="form-grid">
            <div class="form-group full">
              <label>Santri *</label>
              <div id="wrapSantriHf"></div>
            </div>
            <div class="form-group full">
              <label>Penguji *</label>
              <div id="wrapPengujiHf"></div>
            </div>
            <div class="form-group full">
              <label>Surah *</label>
              <div id="wrapSurahHf"></div>
            </div>
            <div class="form-group">
              <label>Ayat Dari *</label>
              <input type="number" id="hfDari" min="1" placeholder="1">
            </div>
            <div class="form-group">
              <label>Ayat Sampai *</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="number" id="hfSampai" min="1" placeholder="40" style="flex:1;">
                <button type="button" class="btn btn-outline btn-sm" id="btnSemuaAyatHf" title="Pilih semua ayat">Semua</button>
              </div>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select id="hfStatus"><option value="Selesai">Selesai</option><option value="Proses">Proses</option><option value="Belum">Belum</option></select>
            </div>
            <div class="form-group">
              <label>Tanggal Setor</label>
              <input type="date" id="hfTanggal">
            </div>
            <div class="form-group full">
              <label>Catatan</label>
              <textarea id="hfCatatan" placeholder="Catatan setoran..."></textarea>
            </div>
          </div>
          <div id="surahInfo" style="display:none;margin-top:8px;">
            <div class="alert alert-info" id="surahInfoText"></div>
          </div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;color:var(--text-muted);">
            <input type="checkbox" id="hfKeepOpen"> Tetap buka form setelah simpan
          </label>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline" onclick="document.getElementById('modalHafalan').classList.remove('show')">Batal</button>
            <button class="btn btn-primary" id="hfSaveBtn">Simpan</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Update Status -->
    <div class="modal-overlay" id="modalUpdate">
      <div class="modal">
        <div class="modal-header"><h3>Update Status Hafalan</h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalUpdate').classList.remove('show')">&#10005;</button>
        </div>
        <div class="modal-body">
          <p id="updateDesc" style="font-size:13px;margin-bottom:14px;color:var(--text-muted);"></p>
          <div class="form-group"><label>Status</label>
            <select id="upStatus"><option value="Selesai">Selesai</option><option value="Proses">Proses</option><option value="Belum">Belum</option></select>
          </div>
          <div class="form-group mt-12"><label>Tanggal Setor</label><input type="date" id="upTanggal"></div>
          <div class="form-group mt-12"><label>Catatan</label><textarea id="upCatatan"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalUpdate').classList.remove('show')">Batal</button>
          <button class="btn btn-primary" id="upSaveBtn">Update</button>
        </div>
      </div>
    </div>`;

  await loadAll();
  document.getElementById('btnAdd').onclick            = openAdd;
  document.getElementById('btnRefresh').onclick        = loadAll;
  document.getElementById('srch').oninput             = applyFilter;
  document.getElementById('flSantri').onchange        = applyFilter;
  document.getElementById('flStatus').onchange        = applyFilter;
  document.getElementById('flJuz').onchange           = applyFilter;
  document.getElementById('hfSaveBtn').onclick        = saveHafalan;
  document.getElementById('upSaveBtn').onclick        = saveUpdate;
  document.getElementById('btnCloseProgress').onclick = () => {
    document.getElementById('progressSection').style.display = 'none';
  };
}

async function loadAll() {
  const safeParseArr = r => Array.isArray(r) ? r : (typeof r === 'string' ? JSON.parse(r) : []);
  [allSantri, allGuru, allSurah, allHafalan] = await Promise.all([
    getSantri().then(safeParseArr),
    getGuru().then(safeParseArr),
    getSurahList().then(safeParseArr),
    getHafalan().then(safeParseArr)
  ]);
  populateFilters();
  renderSummary();
  applyFilter();
}

function populateFilters() {
  document.getElementById('flSantri').innerHTML =
    '<option value="">Semua Santri</option>' +
    allSantri.map(s => `<option value="${s.STambuk}">${s.STambuk} — ${s.Nama}</option>`).join('');
  const juzList = [...new Set(allSurah.map(s => s.juz))].sort((a, b) => a - b);
  document.getElementById('flJuz').innerHTML =
    '<option value="">Semua Juz</option>' +
    juzList.map(j => `<option value="${j}">Juz ${j}</option>`).join('');
}

function renderSummary() {
  const total   = allHafalan.length;
  const selesai = allHafalan.filter(h => h.Status === 'Selesai').length;
  const proses  = allHafalan.filter(h => h.Status === 'Proses').length;
  const belum   = allHafalan.filter(h => h.Status === 'Belum').length;
  document.getElementById('summaryCards').innerHTML = `
    <div class="stat-card"><div class="stat-icon green">&#9654;</div><div><div class="stat-label">Total Setoran</div><div class="stat-value">${total}</div></div></div>
    <div class="stat-card"><div class="stat-icon green">&#10003;</div><div><div class="stat-label">Selesai</div><div class="stat-value">${selesai}</div></div></div>
    <div class="stat-card"><div class="stat-icon gold">&#8987;</div><div><div class="stat-label">Proses</div><div class="stat-value">${proses}</div></div></div>
    <div class="stat-card"><div class="stat-icon red">&#9711;</div><div><div class="stat-label">Belum</div><div class="stat-value">${belum}</div></div></div>
    <div class="stat-card"><div class="stat-icon blue">&#128100;</div><div><div class="stat-label">Santri Menyetor</div><div class="stat-value">${new Set(allHafalan.map(h => h.STambuk)).size}</div></div></div>`;
}

function applyFilter() {
  const q   = document.getElementById('srch').value.toLowerCase();
  const flS = document.getElementById('flSantri').value;
  const flSt= document.getElementById('flStatus').value;
  const flJ = document.getElementById('flJuz').value;
  renderTable(allHafalan.filter(h =>
    (!q   || (String(h.STambuk) + h.NamaSurah).toLowerCase().includes(q)) &&
    (!flS || String(h.STambuk) === flS) &&
    (!flSt|| h.Status === flSt) &&
    (!flJ || String(h.Juz) === flJ)
  ));
}

function renderTable(data) {
  const grouped = {};
  data.forEach(h => {
    if (!grouped[h.STambuk]) grouped[h.STambuk] = [];
    grouped[h.STambuk].push(h);
  });
  
  const entries = Object.entries(grouped);
  document.getElementById('countLabel').textContent = entries.length + ' santri (' + data.length + ' setoran)';
  
  if (!entries.length) {
    document.getElementById('hafalanBody').innerHTML = '<tr><td colspan="9" class="no-data">Belum ada data</td></tr>';
    return;
  }
  
  document.getElementById('hafalanBody').innerHTML = entries.map(([stambuk, items], i) => {
    // surahs
    let surahs = [...new Set(items.map(h => h.NamaSurah))];
    const sMax = 3;
    let sLabels = surahs.slice(0, sMax).map(s => `<span class="badge" style="background:var(--surface2);border:1px solid var(--border);">${s}</span>`).join(' ');
    if (surahs.length > sMax) sLabels += ` <span style="font-size:10px;color:var(--text-muted);">+${surahs.length - sMax} lainnya</span>`;
    
    // juzs
    let juzs = [...new Set(items.map(h => Number(h.Juz)||0))].sort((a,b)=>a-b);
    let jLabels = juzs.slice(0, 3).map(j => `<span class="badge badge-aktif" style="font-size:10px;">Juz ${j}</span>`).join(' ');
    if (juzs.length > 3) jLabels += ` <span style="font-size:10px;color:var(--text-muted);">...</span>`;
    
    // status
    let selesai = items.filter(h => h.Status==='Selesai').length;
    let proses = items.filter(h => h.Status==='Proses').length;
    let belum = items.filter(h => h.Status==='Belum').length;
    let stLabels = [];
    if(selesai) stLabels.push(`<span class="badge badge-selesai" style="font-size:10px;">${selesai} Selesai</span>`);
    if(proses) stLabels.push(`<span class="badge badge-proses" style="font-size:10px;">${proses} Proses</span>`);
    if(belum) stLabels.push(`<span class="badge badge-belum" style="font-size:10px;">${belum} Belum</span>`);
    
    // latest
    const sorted = [...items].sort((a,b) => new Date(b.TanggalSetor) - new Date(a.TanggalSetor));
    const latestTgl = sorted[0].TanggalSetor;
    const latestPenguji = getGuruNama(sorted[0].IDPenguji);

    return `<tr>
      <td style="color:var(--text-muted);font-size:12px;vertical-align:middle;">${i+1}</td>
      <td style="vertical-align:middle;"><code style="font-size:12px;">${stambuk}</code></td>
      <td style="vertical-align:middle;font-weight:600;">${getSantriNama(stambuk)}</td>
      <td style="vertical-align:middle;">${sLabels}</td>
      <td style="vertical-align:middle;">${jLabels}</td>
      <td style="vertical-align:middle;">${stLabels.join(' ')}</td>
      <td style="vertical-align:middle;font-size:12px;">${fmtDate(latestTgl)}</td>
      <td style="vertical-align:middle;font-size:12px;">${latestPenguji}</td>
      <td style="vertical-align:middle;">
        <button class="btn btn-outline btn-sm" data-progress="${stambuk}">Lihat Progress</button>
      </td>
    </tr>`;
  }).join('');
  
  document.querySelectorAll('[data-progress]').forEach(b => b.onclick = () => showProgress(b.dataset.progress));
}

function getSantriNama(stambuk) {
  return allSantri.find(x => String(x.STambuk) === String(stambuk))?.Nama || stambuk;
}

function getGuruNama(id) {
  return allGuru.find(g => g.IDGuru === id)?.Nama || id || '-';
}

function showProgress(stambuk) {
  const nama = getSantriNama(stambuk);
  const data = allHafalan.filter(h => String(h.STambuk) === String(stambuk));
  document.getElementById('progressTitle').textContent = `Progress — ${nama} (${stambuk})`;
  const byJuz = {};
  data.forEach(h => { const j = h.Juz||'?'; if (!byJuz[j]) byJuz[j]=[]; byJuz[j].push(h); });
  const selesai = data.filter(h => h.Status === 'Selesai').length;
  const pct     = data.length ? Math.round(selesai / data.length * 100) : 0;
  const SC = { Selesai:'badge-selesai', Proses:'badge-proses', Belum:'badge-belum' };
  let html = `<div style="margin-bottom:20px;">
    <div class="flex items-center gap-12" style="justify-content:space-between;margin-bottom:8px;">
      <span style="font-weight:600;">Total Progress</span>
      <span class="text-muted">${selesai}/${data.length} selesai (${pct}%)</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
  </div>`;
  if (!data.length) html = '<p class="no-data">Belum ada setoran hafalan.</p>';
  else Object.keys(byJuz).sort((a,b)=>Number(a)-Number(b)).forEach(j => {
    html += `<p style="font-weight:600;margin-bottom:8px;color:var(--primary);">Juz ${j}</p>
    <div class="table-wrap" style="margin-bottom:16px;"><table>
      <thead><tr><th>Surah</th><th>Ayat Dari</th><th>Ayat Sampai</th><th>Status</th><th>Tgl Setor</th><th>Catatan</th><th>Aksi</th></tr></thead>
      <tbody>${byJuz[j].map(h => `<tr>
        <td style="font-weight:600;">${h.NamaSurah||'-'}</td>
        <td>${h.AyatDari||'-'}</td><td>${h.AyatSampai||'-'}</td>
        <td><span class="badge ${SC[h.Status]||'badge-belum'}">${h.Status}</span></td>
        <td style="font-size:12px;">${fmtDate(h.TanggalSetor)}</td>
        <td style="font-size:12px;max-width:150px;overflow:hidden;text-overflow:ellipsis;">${h.Catatan||'-'}</td>
        <td>
          <div class="flex gap-4">
            <button class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;justify-content:center;height:24px;width:24px;" data-upd="${h.ID}" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
            <button class="btn btn-danger btn-sm" style="display:inline-flex;align-items:center;justify-content:center;height:24px;width:24px;" data-del="${h.ID}" title="Hapus"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
          </div>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  });
  document.getElementById('progressBody').innerHTML = html;
  
  // Bind actions
  document.getElementById('progressBody').querySelectorAll('[data-upd]').forEach(b => b.onclick = () => openUpdate(b.dataset.upd));
  document.getElementById('progressBody').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Hapus data hafalan ini?')) return;
    const r = await deleteHafalan(b.dataset.del);
    if (r.ok) { 
      showToast('Dihapus'); 
      await loadAll();
      showProgress(stambuk); // render ulang progress
    }
  });

  document.getElementById('progressSection').style.display = 'block';
  document.getElementById('progressSection').scrollIntoView({ behavior: 'smooth' });
}

function initSearchableSelects() {
  ssSantri = new SearchableSelect(
    document.getElementById('wrapSantriHf'),
    allSantri.map(s => ({
      value: String(s.STambuk),
      label: `${s.STambuk} — ${s.Nama}${s.Kelas ? ' · ' + s.Kelas : ''}`
    })),
    { 
      placeholder: 'Cari nama / stambuk santri...',
      onSelect: (val) => checkSantriProses(val)
    }
  );
  ssPenguji = new SearchableSelect(
    document.getElementById('wrapPengujiHf'),
    allGuru.map(g => ({
      value: g.IDGuru,
      label: `${g.Nama} (${g.IDGuru})${g.KamarBagian ? ' · ' + g.KamarBagian : ''}`
    })),
    { placeholder: 'Cari nama guru / penguji...' }
  );
  ssSurah = new SearchableSelect(
    document.getElementById('wrapSurahHf'),
    allSurah.map(s => ({ value: String(s.no), label: `QS. ${s.no}. ${s.nama} — Juz ${s.juz} (${s.ayat} ayat)`, _data: s })),
    {
      placeholder: 'Cari nama surah...',
      onSelect: (val) => onSurahSelect(val)
    }
  );
}

function onSurahSelect(noSurah) {
  const surah = allSurah.find(s => String(s.no) === String(noSurah));
  if (!surah) { document.getElementById('surahInfo').style.display = 'none'; return; }
  document.getElementById('hfDari').value   = 1;
  document.getElementById('hfSampai').value = surah.ayat;
  document.getElementById('surahInfoText').textContent =
    `${surah.nama} — Juz ${surah.juz} — ${surah.ayat} ayat. Klik "Semua" untuk semua ayat, atau ubah manual.`;
  document.getElementById('surahInfo').style.display = 'block';
  document.getElementById('btnSemuaAyatHf').onclick = () => {
    document.getElementById('hfDari').value   = 1;
    document.getElementById('hfSampai').value = surah.ayat;
  };
}

function checkSantriProses(stambuk) {
  if (!stambuk) return;
  const activeProses = allHafalan.filter(h => String(h.STambuk) === String(stambuk) && h.Status === 'Proses');
  const warnContainer = document.getElementById('hfWarningContainer');
  const bypass = document.getElementById('hfBypassWarning');
  const btnSave = document.getElementById('hfSaveBtn');
  
  if (activeProses.length > 0 && !editingId) {
    const list = activeProses.map(h => `<li style="padding:2px 0;">${h.NamaSurah} (Ayat ${h.AyatDari}-${h.AyatSampai})</li>`).join('');
    document.getElementById('hfWarningText').innerHTML = `
      <strong style="display:block;margin-bottom:4px;color:#d97706;">&#9888; Santri Masih Memiliki Target "Proses"</strong> 
      Santri ini masih memiliki setoran hafalan yang belum selesai:
      <ul style="margin:6px 0 0 20px;font-size:12px;color:var(--text);">${list}</ul>
      <p style="margin-top:6px;font-size:11px;">Mohon selesaikan setoran tersebut, atau centang izin di bawah untuk mengabaikan peringatan ini.</p>`;
    warnContainer.style.display = 'block';
    bypass.checked = false;
    btnSave.disabled = true;
    
    bypass.onchange = () => {
      btnSave.disabled = !bypass.checked;
    };
  } else {
    warnContainer.style.display = 'none';
    bypass.checked = false;
    btnSave.disabled = false;
  }
}

function openAdd() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Input Setoran Hafalan';
  document.getElementById('hfSaveBtn').textContent  = 'Simpan';
  document.getElementById('hfCatatan').value = '';
  document.getElementById('hfDari').value    = '';
  document.getElementById('hfSampai').value  = '';
  document.getElementById('hfStatus').value  = 'Selesai';
  document.getElementById('hfTanggal').value = new Date().toISOString().slice(0, 10);
  document.getElementById('hfAlert').innerHTML = '';
  document.getElementById('surahInfo').style.display = 'none';
  initSearchableSelects();
  document.getElementById('modalHafalan').classList.add('show');
}

async function saveHafalan() {
  const santri  = ssSantri?.getValue();
  const penguji = ssPenguji?.getValue();
  const surahNo = ssSurah?.getValue();
  const dari    = document.getElementById('hfDari').value;
  const sampai  = document.getElementById('hfSampai').value;

  if (!santri || !penguji || !surahNo || !dari || !sampai) {
    document.getElementById('hfAlert').innerHTML =
      '<div class="alert alert-error">Santri, Penguji, Surah, dan Ayat wajib diisi.</div>';
    return;
  }
  const surah = allSurah.find(s => String(s.no) === String(surahNo));
  const data  = {
    STambuk     : santri,
    IDPenguji   : penguji,
    NoSurah     : surahNo,
    NamaSurah   : surah?.nama || '',
    Juz         : surah?.juz  || '',
    AyatDari    : Number(dari),
    AyatSampai  : Number(sampai),
    Status      : document.getElementById('hfStatus').value,
    TanggalSetor: document.getElementById('hfTanggal').value,
    Catatan     : document.getElementById('hfCatatan').value
  };
  const btn = document.getElementById('hfSaveBtn');
  btn.textContent = 'Menyimpan...'; btn.disabled = true;
  const r = await addHafalan(data);
  btn.textContent = 'Simpan'; btn.disabled = false;
  if (r.ok) {
    const keepOpen = document.getElementById('hfKeepOpen').checked;
    showToast('Hafalan berhasil disimpan');
    await loadAll();
    
    if (keepOpen) {
      ssSurah.setValue('');
      document.getElementById('hfDari').value = '';
      document.getElementById('hfSampai').value = '';
      document.getElementById('surahInfo').style.display = 'none';
      checkSantriProses(santri);
    } else {
      document.getElementById('modalHafalan').classList.remove('show');
    }
  } else {
    document.getElementById('hfAlert').innerHTML = `<div class="alert alert-error">${r.msg}</div>`;
  }
}

function openUpdate(id) {
  const h = allHafalan.find(x => x.ID === id);
  if (!h) return;
  editingId = id;
  document.getElementById('updateDesc').textContent =
    `Surah: ${h.NamaSurah} | Ayat ${h.AyatDari}–${h.AyatSampai} | Santri: ${getSantriNama(h.STambuk)}`;
  document.getElementById('upStatus').value  = h.Status  || 'Belum';
  document.getElementById('upTanggal').value = h.TanggalSetor || new Date().toISOString().slice(0, 10);
  document.getElementById('upCatatan').value = h.Catatan || '';
  document.getElementById('modalUpdate').classList.add('show');
}

async function saveUpdate() {
  const data = {
    ID          : editingId,
    Status      : document.getElementById('upStatus').value,
    TanggalSetor: document.getElementById('upTanggal').value,
    Catatan     : document.getElementById('upCatatan').value
  };
  const btn = document.getElementById('upSaveBtn');
  btn.textContent = 'Menyimpan...'; btn.disabled = true;
  const r = await updateHafalan(data);
  btn.textContent = 'Update'; btn.disabled = false;
  if (r.ok) {
    document.getElementById('modalUpdate').classList.remove('show');
    showToast('Status diperbarui');
    loadAll();
  } else {
    showToast('Gagal: ' + r.msg, 'error');
  }
}
