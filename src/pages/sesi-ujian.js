import { getSesiUjian, addSesiUjian, updateSesiUjian, deleteSesiUjian, getSantri, getGuru, getTesBacaan, addTesBacaan, getHafalan, addHafalan, getSurahList } from '../api.js';
import { fmtDate, showToast } from '../utils.js';
import { checkWorkflowReadiness, getProgressBar, getErrorAlert, getEvaluationTemplate, calculateScoreFromIndicators } from '../enhanced-utils.js';

let allSesi = [], allSantri = [], allGuru = [], allTes = [], allHafalan = [], allSurah = [];
let activeSesi = null;
let selectedPeserta = new Set();
let isDragging = false, dragVal = true;

export async function renderSesiUjian(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Manajemen Sesi Ujian</h2><p>Jadwalkan, atur materi, dan kelola peserta ujian secara serentak</p></div>
      <div class="flex gap-8">
        <button class="btn btn-primary" id="btnBuatSesi" style="display:flex;align-items:center;gap:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Buat Sesi Baru
        </button>
      </div>
    </div>

    <!-- Tampilan Dashboard Utama -->
    <div id="viewList">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div class="filter-bar">
            <div class="search-box"><span class="search-icon">&#128269;</span>
              <input type="text" id="srchSesi" placeholder="Cari nama sesi / penanggung jawab...">
            </div>
            <button class="btn btn-outline btn-sm" id="btnRefresh" style="display:flex;align-items:center;gap:6px;height:38px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;" id="sesiGrid">
        <div style="grid-column:1/-1;padding:40px;text-align:center;color:#94a3b8;">Memuat data...</div>
      </div>
    </div>

    <!-- Tampilan Detail Sesi (Live Dashboard) -->
    <div id="viewDetail" style="display:none;">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <button class="btn btn-outline btn-sm mb-16" id="btnBackList" style="margin-bottom:12px;">&larr; Kembali</button>
            <h2 id="detNamaSesi" style="margin:0 0 6px 0;font-size:20px;color:#0f172a;">-</h2>
            <div style="display:flex;gap:12px;font-size:12px;color:#64748b;align-items:center;">
              <span id="detTanggal"></span> &bull; 
              <span id="detTipe" class="badge"></span> &bull; 
              <span id="detPJ"></span>
            </div>
          </div>
          <div style="text-align:right;background:#f8fafc;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;">
            <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:4px;text-transform:uppercase;">Progres Evaluasi</div>
            <div style="font-size:24px;font-weight:800;color:#1b6b4a;" id="detProgress">0 / 0</div>
          </div>
        </div>
        <div style="padding:12px 20px;background:#fefce8;border-top:1px solid #fde68a;font-size:12px;color:#92400e;" id="detMateriInfo"></div>
      </div>

      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">Daftar Peserta &amp; Evaluasi</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Stambuk</th><th>Nama Santri</th><th>Kelas / Rayon</th><th>Status Penilaian</th><th>Aksi</th></tr></thead>
            <tbody id="pesertaBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form Sesi -->
    <div class="modal-overlay" id="modalSesi">
      <div class="modal modal-lg" style="max-width:800px;">
        <div class="modal-header"><h3>Buat Sesi Ujian Baru</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal()">&#10005;</button>
        </div>
        <div class="modal-body" style="max-height:75vh;overflow-y:auto;padding-right:12px;">
          <div class="form-grid">
            <div class="form-group full"><label>Nama Sesi Ujian *</label><input type="text" id="fNamaSesi" placeholder="Cth: Evaluasi Tahsin Tengah Semester Ganjil 2026"></div>
            <div class="form-group"><label>Tanggal *</label><input type="date" id="fTanggal"></div>
            <div class="form-group"><label>Penanggung Jawab *</label><select id="fPJ"><option value="">-- Pilih Guru --</option></select></div>
            <div class="form-group full"><label>Tipe Sesi *</label>
              <select id="fTipe">
                <option value="Bacaan">Tes Bacaan (Tahsin)</option>
                <option value="Hafalan">Tes Hafalan (Tahfidz)</option>
              </select>
            </div>
          </div>

          <div style="border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin-top:16px;background:#f8fafc;">
            <h4 style="margin:0 0 12px 0;font-size:13px;color:#0f172a;">Konfigurasi Materi Ujian</h4>
            
            <!-- Config Bacaan -->
            <div id="cfgBacaan" class="form-grid">
              <div class="form-group"><label>Materi / Surah *</label><select id="fSurah"><option value="">-- Pilih Surah --</option></select></div>
              <div class="form-group"><label>Rentang Ayat (Opsional)</label><input type="text" id="fAyat" placeholder="Cth: 1-15"></div>
            </div>

            <!-- Config Hafalan -->
            <div id="cfgHafalan" style="display:none;">
              <label style="font-size:12px;font-weight:600;color:#475569;margin-bottom:8px;display:block;">Pilih Surah Target *</label>
              <div id="hafalanTargetGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:200px;overflow-y:auto;border:1px solid #cbd5e1;padding:8px;border-radius:6px;background:#fff;">
                <!-- Dibuat via JS -->
              </div>
            </div>
          </div>

          <div style="border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h4 style="margin:0;font-size:13px;color:#0f172a;">Pilih Peserta (Santri)</h4>
              <div style="display:flex;gap:8px;align-items:center;">
                <select id="fFilterKelas" style="font-size:11px;padding:4px 8px;border-radius:4px;border:1px solid #cbd5e1;"><option value="">Semua Kelas</option></select>
                <button class="btn btn-outline btn-sm" id="btnSelectAll" style="font-size:10px;padding:4px 8px;">Pilih Semua (Filtered)</button>
                <button class="btn btn-outline btn-sm" id="btnClearAll" style="font-size:10px;padding:4px 8px;">Reset</button>
              </div>
            </div>
            <div style="font-size:11px;color:#64748b;margin-bottom:12px;">💡 <b>Tip:</b> Anda bisa mengklik lalu menahan dan menggeser kursor (drag) untuk memilih banyak santri secara cepat!</div>
            <div id="pesertaSelectGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-height:250px;overflow-y:auto;user-select:none;padding-right:6px;">
              <!-- Dibuat via JS -->
            </div>
            <div style="margin-top:8px;font-size:12px;font-weight:700;color:#1b6b4a;" id="pesertaCount">Terpilih: 0 santri</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Batal</button>
          <button class="btn btn-primary" id="btnSaveSesi">Simpan Sesi</button>
        </div>
      </div>
    </div>
    
    <!-- Modal Penilaian Cepat Sesi -->
    <div class="modal-overlay" id="modalNilaiSesi">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="mnTitle">Nilai Peserta</h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalNilaiSesi').classList.remove('show')">&#10005;</button>
        </div>
        <div class="modal-body" id="mnBody" style="max-height:60vh;overflow-y:auto;">
          <!-- Diisi via JS -->
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalNilaiSesi').classList.remove('show')">Batal</button>
          <button class="btn btn-primary" id="btnSaveNilaiSesi">Simpan Evaluasi</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnRefresh').onclick = loadData;
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
  document.getElementById('btnSelectAll').onclick = selectAllFiltered;
  document.getElementById('btnClearAll').onclick = () => { selectedPeserta.clear(); updatePesertaCount(); renderPesertaSelect(); };
  document.getElementById('btnSaveSesi').onclick = saveSesi;
  document.getElementById('srchSesi').oninput = renderGrid;

  // Global mouse up for drag selection
  window.addEventListener('mouseup', () => { isDragging = false; });

  await loadData();
}

async function loadData() {
  const parse = d => Array.isArray(d) ? d : (typeof d === 'string' ? JSON.parse(d) : []);
  [allSesi, allSantri, allGuru, allTes, allHafalan, allSurah] = await Promise.all([
    getSesiUjian().then(parse),
    getSantri().then(parse),
    getGuru().then(parse),
    getTesBacaan().then(parse),
    getHafalan().then(parse),
    getSurahList().then(parse)
  ]);
  
  // Parse configs (backend menyimpan di kolom TargetUjian & Peserta)
  allSesi.forEach(s => {
    try { s._materi  = typeof s.TargetUjian === 'string' ? JSON.parse(s.TargetUjian || '{}') : (s.TargetUjian || {}); } catch(e){ s._materi={}; }
    try { s._peserta = typeof s.Peserta === 'string'     ? JSON.parse(s.Peserta     || '[]') : (s.Peserta     || []); } catch(e){ s._peserta=[]; }
  });

  renderGrid();
  populateDropdowns();
}

function renderGrid() {
  const q = document.getElementById('srchSesi').value.toLowerCase();
  let arr = allSesi.filter(s => s.NamaSesi?.toLowerCase().includes(q) || s.PenanggungJawab?.toLowerCase().includes(q));
  arr.sort((a,b) => new Date(b.Tanggal) - new Date(a.Tanggal));

  const grid = document.getElementById('sesiGrid');
  if(!arr.length) { grid.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:#94a3b8;">Tidak ada sesi ditemukan</div>`; return; }

  grid.innerHTML = arr.map(s => {
    // Hitung progress
    let count = 0;
    if (s.TipeSesi === 'Bacaan') {
      const tesInSesi = allTes.filter(t => String(t.SesiID) === String(s.SesiID));
      const testedStambuks = new Set(tesInSesi.map(t => String(t.PesertaID)));
      count = s._peserta.filter(st => testedStambuks.has(String(st))).length;
    } else {
      const hfInSesi = allHafalan.filter(h => String(h.SesiID) === String(s.SesiID));
      const testedStambuks = new Set(hfInSesi.map(h => String(h.STambuk)));
      count = s._peserta.filter(st => testedStambuks.has(String(st))).length;
    }
    const total = s._peserta.length;
    const pct = total ? Math.round((count/total)*100) : 0;
    const badgeCls = s.TipeSesi === 'Bacaan' ? 'badge-pretest' : 'badge-posttest'; // just coloring
    
    return `
      <div class="card" style="cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;" onclick="openDetail('${s.SesiID}')" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 15px -3px rgb(0 0 0 / 0.1)';" onmouseout="this.style.transform='';this.style.boxShadow='';">
        <div style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <h3 style="margin:0;font-size:15px;color:#0f172a;line-height:1.4;">${s.NamaSesi}</h3>
            <span class="badge ${badgeCls}" style="font-size:9px;white-space:nowrap;">${s.TipeSesi}</span>
          </div>
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;display:flex;align-items:center;gap:6px;"><span style="font-size:14px;">📅</span> ${fmtDate(s.Tanggal)}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:16px;display:flex;align-items:center;gap:6px;"><span style="font-size:14px;">👨‍🏫</span> ${s.PenanggungJawab}</div>
          
          <div style="background:#f1f5f9;border-radius:6px;padding:8px 12px;">
            <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:#475569;margin-bottom:6px;">
              <span>Progress Evaluasi</span><span>${count} / ${total} (${pct}%)</span>
            </div>
            <div style="width:100%;background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden;">
              <div style="height:100%;background:${pct===100?'#16a34a':'#3b82f6'};width:${pct}%;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.openDetail = (id) => {
  activeSesi = allSesi.find(x => String(x.SesiID) === String(id));
  if (!activeSesi) return;

  document.getElementById('viewList').style.display = 'none';
  document.getElementById('viewDetail').style.display = 'block';

  document.getElementById('detNamaSesi').innerText = activeSesi.NamaSesi;
  document.getElementById('detTanggal').innerText = fmtDate(activeSesi.Tanggal);
  document.getElementById('detTipe').innerText = activeSesi.TipeSesi;
  document.getElementById('detTipe').className = 'badge ' + (activeSesi.TipeSesi==='Bacaan'?'badge-pretest':'badge-posttest');
  document.getElementById('detPJ').innerText = activeSesi.PenanggungJawab;

  let matInfo = '';
  if (activeSesi.TipeSesi === 'Bacaan') {
    matInfo = `<b>Materi Bacaan:</b> Surah ${activeSesi._materi.surah||'-'} ${activeSesi._materi.ayat?`(Ayat ${activeSesi._materi.ayat})`:''}`;
  } else {
    matInfo = `<b>Target Hafalan:</b> ${Array.isArray(activeSesi._materi.surahs) ? activeSesi._materi.surahs.join(', ') : '-'}`;
  }
  document.getElementById('detMateriInfo').innerHTML = `💡 ${matInfo}`;

  renderPesertaList();
};

function renderPesertaList() {
  if (!activeSesi) return;
  const tbody = document.getElementById('pesertaBody');
  const pesertaStambuks = new Set((activeSesi._peserta || []).map(String));
  
  const pesertaData = allSantri.filter(s => pesertaStambuks.has(String(s.STambuk)));
  
  // Calculate statuses
  let count = 0;
  const rows = pesertaData.map((s, idx) => {
    let isDone = false;
    
    if (activeSesi.TipeSesi === 'Bacaan') {
      const tesInSesi = allTes.filter(t => String(t.SesiID) === String(activeSesi.SesiID) && String(t.PesertaID) === String(s.STambuk));
      isDone = tesInSesi.length > 0;
    } else {
      const hfInSesi = allHafalan.filter(h => String(h.SesiID) === String(activeSesi.SesiID) && String(h.STambuk) === String(s.STambuk));
      isDone = hfInSesi.length > 0;
    }

    if (isDone) count++;
    const stHtml = isDone 
      ? `<span style="color:#16a34a;font-weight:700;font-size:12px;display:flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Sudah Dinilai</span>`
      : `<span style="color:#dc2626;font-weight:600;font-size:12px;">Belum Dinilai</span>`;

    const btnHtml = isDone
      ? `<button class="btn btn-outline btn-sm" onclick="openModalNilai('${s.STambuk}')">Update Nilai</button>`
      : `<button class="btn btn-primary btn-sm" onclick="openModalNilai('${s.STambuk}')">Nilai Sekarang</button>`;

    return `<tr>
      <td style="font-family:monospace;font-weight:600;color:#64748b;">${s.STambuk}</td>
      <td style="font-weight:600;color:#0f172a;">${s.Nama}</td>
      <td>${s.Kelas||'-'}</td>
      <td>${stHtml}</td>
      <td>${btnHtml}</td>
    </tr>`;
  });

  tbody.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="5" class="no-data">Belum ada peserta dipilih</td></tr>`;
  document.getElementById('detProgress').innerText = `${count} / ${pesertaData.length}`;
}

window.navigateUrl = (hash) => {
  window.location.hash = hash; // triggers main app router
};

function populateDropdowns() {
  const pjOpt = allGuru.map(g => `<option value="${g.Nama}">${g.Nama}</option>`).join('');
  document.getElementById('fPJ').innerHTML = `<option value="">-- Pilih Guru --</option>` + pjOpt;

  // Surah dari GAS: {no, nama, juz, ayat}
  const surOpt = allSurah.map(s => `<option value="${s.nama}">${s.no}. ${s.nama}</option>`).join('');
  document.getElementById('fSurah').innerHTML = `<option value="">-- Pilih Surah --</option>` + surOpt;

  const hfGrid = allSurah.map(s => `
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:6px;border-radius:4px;cursor:pointer;background:#f8fafc;border:1px solid #e2e8f0;">
      <input type="checkbox" value="${s.nama}" class="hf-surah-cb">
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.no}. ${s.nama}</span>
    </label>
  `).join('');
  document.getElementById('hafalanTargetGrid').innerHTML = hfGrid;

  const kls = [...new Set(allSantri.map(s=>s.Kelas).filter(Boolean))].sort();
  document.getElementById('fFilterKelas').innerHTML = `<option value="">Semua Kelas</option>` + kls.map(k=>`<option value="${k}">${k}</option>`).join('');
  renderPesertaSelect();
}

function renderPesertaSelect() {
  const fKls = document.getElementById('fFilterKelas').value;
  const filtered = allSantri.filter(s => fKls ? s.Kelas === fKls : true).sort((a,b) => a.Nama.localeCompare(b.Nama));
  
  const grid = document.getElementById('pesertaSelectGrid');
  grid.innerHTML = filtered.map(s => {
    const isSel = selectedPeserta.has(String(s.STambuk));
    return `
      <div class="peserta-item ${isSel?'selected':''}" data-stambuk="${s.STambuk}" style="font-size:11px;padding:8px;border:1px solid ${isSel?'#1b6b4a':'#cbd5e1'};background:${isSel?'#f0fdf4':'#fff'};border-radius:6px;cursor:pointer;user-select:none;">
        <div style="font-weight:700;color:${isSel?'#1b6b4a':'#334155'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.Nama}</div>
        <div style="font-family:monospace;color:#64748b;margin-top:2px;">${s.STambuk} • ${s.Kelas||'-'}</div>
      </div>
    `;
  }).join('');

  const items = grid.querySelectorAll('.peserta-item');
  items.forEach(el => {
    el.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragVal = !el.classList.contains('selected');
      toggleItem(el, dragVal);
    });
    el.addEventListener('mouseenter', (e) => {
      if (isDragging) toggleItem(el, dragVal);
    });
  });
  updatePesertaCount();
}

function toggleItem(el, forceState) {
  const id = String(el.dataset.stambuk);
  if (forceState) {
    el.classList.add('selected');
    el.style.borderColor = '#1b6b4a';
    el.style.background = '#f0fdf4';
    el.querySelector('div').style.color = '#1b6b4a';
    selectedPeserta.add(id);
  } else {
    el.classList.remove('selected');
    el.style.borderColor = '#cbd5e1';
    el.style.background = '#fff';
    el.querySelector('div').style.color = '#334155';
    selectedPeserta.delete(id);
  }
  updatePesertaCount();
}

function updatePesertaCount() {
  document.getElementById('pesertaCount').innerText = `Terpilih: ${selectedPeserta.size} santri`;
}

function selectAllFiltered() {
  const fKls = document.getElementById('fFilterKelas').value;
  const filtered = allSantri.filter(s => fKls ? s.Kelas === fKls : true);
  filtered.forEach(s => selectedPeserta.add(String(s.STambuk)));
  renderPesertaSelect();
}

function openModal() {
  document.getElementById('fNamaSesi').value = '';
  document.getElementById('fTanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('fPJ').value = '';
  document.getElementById('fTipe').value = 'Bacaan';
  document.getElementById('fTipe').dispatchEvent(new Event('change'));
  document.getElementById('fSurah').value = '';
  document.getElementById('fAyat').value = '';
  document.querySelectorAll('.hf-surah-cb').forEach(cb => cb.checked = false);
  selectedPeserta.clear();
  updatePesertaCount();
  renderPesertaSelect();
  document.getElementById('modalSesi').classList.add('show');
}
window.closeModal = () => document.getElementById('modalSesi').classList.remove('show');

async function saveSesi() {
  const nama = document.getElementById('fNamaSesi').value.trim();
  const tgl = document.getElementById('fTanggal').value;
  const pj = document.getElementById('fPJ').value;
  const tipe = document.getElementById('fTipe').value;

  // Smart validation with detailed errors
  const errors = [];
  if (!nama) errors.push('Nama sesi harus diisi');
  if (!tgl) errors.push('Tanggal sesi harus dipilih');
  if (!pj) errors.push('Penanggung jawab harus dipilih');
  if (selectedPeserta.size === 0) errors.push('Minimal 1 peserta harus dipilih');

  let materi = {};
  if (tipe === 'Bacaan') {
    const surah = document.getElementById('fSurah').value;
    if (!surah) errors.push('Surah target harus dipilih untuk tes bacaan');
    else materi = { surah, ayat: document.getElementById('fAyat').value.trim() };
  } else {
    const sely = Array.from(document.querySelectorAll('.hf-surah-cb:checked')).map(cb => cb.value);
    if (!sely.length) errors.push('Minimal 1 surah target harus dipilih untuk hafalan');
    else materi = { surahs: sely };
  }

  if (errors.length > 0) {
    const errorMsg = errors.join('\n');
    return showToast(`Validasi gagal:\n${errorMsg}`, 'error');
  }

  // Workflow readiness check
  const readiness = checkWorkflowReadiness('create-session', {
    name: nama,
    date: tgl,
    pj: pj,
    participants: Array.from(selectedPeserta)
  });

  if (!readiness.ready) {
    return showToast(readiness.msg, 'warning');
  }

  const payload = {
    NamaSesi       : nama,
    Tanggal        : tgl,
    PenanggungJawab: pj,
    TipeSesi       : tipe,
    TargetUjian    : materi,
    Peserta        : Array.from(selectedPeserta),
    Status         : 'Aktif'
  };

  const btn = document.getElementById('btnSaveSesi');
  btn.disabled = true; btn.innerText = 'Menyimpan...';
  const res = await addSesiUjian(payload);
  btn.disabled = false; btn.innerText = 'Simpan Sesi';

  if (res.ok) {
    showToast('✓ Sesi Ujian berhasil disimpan dengan ' + selectedPeserta.size + ' peserta');
    closeModal();
    await loadData();
  } else {
    showToast(res.msg || 'Gagal menyimpan sesi', 'error');
  }
}

window.openModalNilai = (stambuk) => {
  if (!activeSesi) return;
  const santri = allSantri.find(s => String(s.STambuk) === String(stambuk));
  if (!santri) return;

  document.getElementById('mnTitle').innerText = `Nilai: ${santri.Nama} (${santri.Kelas || '-'})`;
  const isBacaan = activeSesi.TipeSesi === 'Bacaan';
  const cfg = activeSesi._materi || {};

  // Smart template generation - pre-fills all known data
  const template = getEvaluationTemplate(activeSesi, santri, isBacaan ? 'bacaan' : 'hafalan');
  const tglDefault = template.Tanggal;

  let html = `<input type="hidden" id="mnStambuk" value="${stambuk}">
              <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px;margin-bottom:12px;border-radius:4px;font-size:12px;">
                <strong style="color:#16a34a;">💡 Smart Form:</strong> Data sudah dipopulasi otomatis dari sesi. Anda tinggal melengkapi indikator penilaian.
              </div>
              <div class="form-group full"><label>Tanggal Penilaian</label><input type="date" id="mnTanggal" value="${tglDefault}"></div>`;

  if (isBacaan) {
    const surahStr = cfg.surah ? `Surah Target: <strong>${cfg.surah}</strong> ${cfg.ayat ? '(Ayat '+cfg.ayat+')' : ''}` : '';
    html += `<div style="background:#f1f5f9;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;border-left:3px solid #3b73c8;">${surahStr}</div>
             <div style="margin-bottom:16px;">
               <div style="font-weight:700;font-size:12px;color:#0f172a;margin-bottom:12px;">Catat Jumlah Kesalahan (10 Indikator)</div>
               <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                 ${[
                   'Kelancaran', 'Makharij Huruf', 'Sifat Huruf', "Mad Thabi'i", 'Mad Lebih 2 Harakat',
                   'Dengungan (Ghunnah)', 'Waqf & Ibtida', 'Gharib', 'Keindahan (Lagu)', 'Lain-lain'
                 ].map((ind, i) => `
                   <div class="form-group">
                     <label style="font-size:11px;">${i+1}. ${ind}</label>
                     <input type="number" id="mnInd${i+1}" value="0" min="0" oninput="calcNilaiAkhir()" style="padding:8px;font-size:14px;border:1px solid #cbd5e1;border-radius:4px;">
                   </div>
                 `).join('')}
               </div>
             </div>
             <div style="display:flex;justify-content:space-between;align-items:center;background:#e2e8f0;padding:14px;border-radius:6px;margin-bottom:16px;border-left:4px solid #3b73c8;">
               <strong style="font-size:13px;">Nilai Akhir (Otomatis):</strong>
               <span id="mnNilaiAkhir" style="font-size:28px;font-weight:700;color:var(--primary);">100</span>
               <span style="font-size:11px;color:#64748b;">= 100 - (error × 2)</span>
             </div>`;
  } else {
    const surahOpts = (cfg.surahs || []).map(s => `<option value="${s}">${s}</option>`).join('');
    html += `<div class="form-group full"><label>Target Surah</label><select id="mnSurah" style="border:1px solid #cbd5e1;padding:8px;border-radius:4px;">${surahOpts}</select></div>
             <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
               <div class="form-group"><label>Ayat Dari</label><input type="number" id="mnAyatDari" min="1" placeholder="1" style="border:1px solid #cbd5e1;padding:8px;border-radius:4px;"></div>
               <div class="form-group"><label>Ayat Sampai</label><input type="number" id="mnAyatSampai" min="1" placeholder="40" style="border:1px solid #cbd5e1;padding:8px;border-radius:4px;"></div>
             </div>
             <div class="form-group full"><label>Status Setoran</label><select id="mnStatus" style="border:1px solid #cbd5e1;padding:8px;border-radius:4px;"><option value="Selesai">Selesai / Tuntas</option><option value="Proses">Dalam Proses</option></select></div>`;
  }

  html += `<div class="form-group full"><label>Catatan Penguji (Opsional)</label><textarea id="mnCatatan" placeholder="Masukkan catatan evaluasi..." style="border:1px solid #cbd5e1;padding:8px;border-radius:4px;min-height:80px;font-family:inherit;"></textarea></div>`;

  document.getElementById('mnBody').innerHTML = html;
  document.getElementById('modalNilaiSesi').classList.add('show');

  document.getElementById('btnSaveNilaiSesi').onclick = async () => {
    const btn = document.getElementById('btnSaveNilaiSesi');
    btn.disabled = true; btn.innerText = 'Menyimpan...';

    if (isBacaan) {
      // Smart score calculation from indicators
      const indicators = {};
      let allValid = true;
      for(let i=1; i<=10; i++) {
        const val = parseInt(document.getElementById(`mnInd${i}`).value) || 0;
        if (val < 0) {
          showToast('Nilai kesalahan tidak boleh negatif', 'error');
          allValid = false;
          break;
        }
        indicators[`Ind${i}`] = val;
      }
      if (!allValid) {
        btn.disabled = false;
        btn.innerText = 'Simpan Evaluasi';
        return;
      }

      const nilaiAkhir = calculateScoreFromIndicators(indicators);
      const payload = {
        SesiID: activeSesi.SesiID,
        TipePeserta: 'Santri',
        PesertaID: stambuk,
        JenisTes: 'Post Test',
        PengujiID: activeSesi.PenanggungJawab,
        Tanggal: document.getElementById('mnTanggal').value,
        SurahTarget: cfg.surah || '-',
        AyatDari: cfg.ayat ? cfg.ayat.split('-')[0] : '-',
        AyatSampai: cfg.ayat ? cfg.ayat.split('-')[1] : '-',
        ModePenilaian: 'kesalahan',
        Catatan: document.getElementById('mnCatatan').value,
        Indikator: indicators,
        NilaiAkhir: nilaiAkhir
      };

      const res = await addTesBacaan(payload);
      btn.disabled = false; btn.innerText = 'Simpan Evaluasi';
      if (res.ok) {
        showToast(`✓ Nilai disimpan (Skor: ${nilaiAkhir})`);
        document.getElementById('modalNilaiSesi').classList.remove('show');
        allTes.push(payload);
        renderPesertaList();
      } else {
        showToast(res.msg, 'error');
      }
    } else {
      const sur = allSurah.find(s => s.nama === document.getElementById('mnSurah').value) || {};
      const payload = {
        SesiID: activeSesi.SesiID,
        STambuk: stambuk,
        IDGuru: activeSesi.PenanggungJawab,
        Tanggal: document.getElementById('mnTanggal').value,
        NamaSurah: document.getElementById('mnSurah').value || '-',
        Juz: sur.juz || '-',
        AyatMulai: document.getElementById('mnAyatDari').value,
        AyatSelesai: document.getElementById('mnAyatSampai').value,
        Status: document.getElementById('mnStatus').value,
        Catatan: document.getElementById('mnCatatan').value
      };
      const res = await addHafalan(payload);
      btn.disabled = false; btn.innerText = 'Simpan Evaluasi';
      if (res.ok) {
        showToast('✓ Setoran hafalan disimpan');
        document.getElementById('modalNilaiSesi').classList.remove('show');
        allHafalan.push(payload);
        renderPesertaList();
      } else {
        showToast(res.msg, 'error');
      }
    }
  };
};

window.calcNilaiAkhir = () => {
  let totalKesalahan = 0;
  for(let i=1; i<=10; i++) {
    totalKesalahan += parseInt(document.getElementById(`mnInd${i}`).value) || 0;
  }
  const nilai = Math.max(0, 100 - (totalKesalahan * 2)); // 1 Kesalahan = -2 Poin
  const label = document.getElementById('mnNilaiAkhir');
  if(label) label.innerText = nilai;
};
