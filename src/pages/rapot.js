import { getRapot,saveRapot,deleteRapot,getSantri,getTesBacaan,getHafalan,getConfig } from '../api.js';
import { getNilaiKategori, fmtDate, showToast } from '../utils.js';

let allRapot=[],allSantri=[],allTes=[],allHafalan=[],activeTab='list',allConfig={};
// Simpan record tes terbaik untuk doSaveRapot
let _bestFinalRecord = null;
let _autoHfPct = 0;

export async function renderRapot(container) {
  container.innerHTML = `
    <div class="page-header no-print">
      <div><h2>Rapot Santri</h2><p>Generate, lihat, dan cetak rapot per santri</p></div>
      <div class="flex gap-8 no-print">
        <button class="btn btn-primary" id="btnGen" style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Buat Rapot</button>
      </div>
    </div>

    <div class="tab-bar no-print">
      <button class="tab-btn active" data-tab="list">Daftar Rapot</button>
      <button class="tab-btn" data-tab="preview">Preview &amp; Cetak</button>
    </div>

    <!-- LIST -->
    <div id="panelList">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div class="filter-bar">
            <div class="search-box"><span class="search-icon">&#128269;</span>
              <input type="text" id="srchRapot" placeholder="Cari stambuk / nama / periode...">
            </div>
            <button class="btn btn-outline btn-sm" id="btnRefresh" style="display:flex;align-items:center;gap:6px;height:38px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Refresh</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Riwayat Rapot</h3><span class="text-muted" id="rapotCount">-</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Stambuk</th><th>Nama</th><th>Periode</th><th>Nilai Akhir</th><th>Hafalan</th><th>Tanggal</th><th>Aksi</th></tr></thead>
            <tbody id="rapotBody"><tr><td colspan="8" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PREVIEW -->
    <div id="panelPreview" style="display:none;">
      <div class="flex gap-12 mb-16 no-print" style="margin-bottom:16px;">
        <button class="btn btn-primary" onclick="window.print()" style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Cetak / Simpan PDF</button>
        <button class="btn btn-outline" id="btnBackList" style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Kembali ke Daftar</button>
      </div>
      <div id="rapotPreviewCard" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:32px;max-width:820px;margin:0 auto;">
        <p class="no-data">Pilih rapot dari daftar untuk ditampilkan.</p>
      </div>
    </div>

    <!-- Modal Generate -->
    <div class="modal-overlay" id="modalGen">
      <div class="modal modal-lg">
        <div class="modal-header"><h3>Buat Rapot Santri</h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalGen').classList.remove('show')">&#10005;</button>
        </div>
        <div class="modal-body">
          <div id="genAlert"></div>
          <div class="form-grid">
            <div class="form-group full"><label>Santri *</label><select id="genSantri"><option value="">-- Pilih Santri --</option></select></div>
            <div class="form-group full"><label>Periode *</label><input type="text" id="genPeriode" placeholder="Semester 1 2024/2025"></div>
          </div>

          <!-- Panel Kalkulasi Nilai Otomatis -->
          <div id="autoCalcPanel" style="display:none;margin-top:16px;">
            <div style="border-radius:10px;overflow:hidden;border:1.5px solid #1b6b4a;">
              <div style="background:linear-gradient(135deg,#1b6b4a 0%,#22c55e44 100%);padding:10px 16px;display:flex;align-items:center;gap:8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                <span style="font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">Kalkulasi Nilai Otomatis</span>
              </div>
              <div style="padding:14px 16px;background:#f0fdf4;">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;" id="autoCalcGrid">
                  <!-- diisi JS -->
                </div>
                <!-- Detail indikator per tes terbaik -->
                <div id="autoCalcDetail" style="margin-top:12px;display:none;">
                  <div style="font-size:11px;font-weight:700;color:#1b6b4a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;border-top:1px solid #bbf7d0;padding-top:8px;">Detail Per Indikator (dari Tes Terbaik)</div>
                  <div id="autoCalcDetailGrid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Alert jika belum ada data -->
          <div id="autoCalcWarning" style="display:none;margin-top:12px;"></div>

          <div class="form-grid" style="margin-top:16px;">
            <input type="hidden" id="genKehadiran" value="0">
            <div class="form-group"><label>Tanggal Rapot</label><input type="date" id="genTanggal"></div>
            <div class="form-group"><label>Nama Penandatangan</label><input type="text" id="genPenguji" placeholder="Nama guru/pengurus"></div>
            <div class="form-group full"><label>Catatan Guru</label><textarea id="genCatatan" placeholder="Catatan perkembangan santri..."></textarea></div>
            <div class="form-group full"><label>Rekomendasi</label><textarea id="genReko" placeholder="Rekomendasi tindak lanjut..."></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalGen').classList.remove('show')">Batal</button>
          <button class="btn btn-primary" id="genSaveBtn" disabled>Simpan &amp; Preview</button>
        </div>
      </div>
    </div>`;

  await loadAll();

  document.getElementById('btnGen').onclick    = openGenerate;
  document.getElementById('btnRefresh').onclick= loadAll;
  document.getElementById('srchRapot').oninput = filterRapot;
  document.getElementById('genSaveBtn').onclick= doSaveRapot;
  document.getElementById('btnBackList').onclick= ()=>switchTab('list');
  document.getElementById('genSantri').onchange = onSantriChange;

  document.querySelectorAll('.tab-btn').forEach(btn=>btn.onclick=()=>{
    activeTab=btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b===btn));
    document.getElementById('panelList').style.display    = activeTab==='list'   ?'block':'none';
    document.getElementById('panelPreview').style.display = activeTab==='preview'?'block':'none';
  });
}

async function loadAll() {
  const safeParseArr = r => Array.isArray(r) ? r : (typeof r === 'string' ? JSON.parse(r) : []);
  const safeParseObj = r => typeof r === 'string' ? JSON.parse(r) : (r || {});

  [allSantri, allRapot, allConfig, allTes, allHafalan] = await Promise.all([
    getSantri().then(safeParseArr),
    getRapot().then(safeParseArr),
    getConfig().then(safeParseObj),
    getTesBacaan().then(safeParseArr),
    getHafalan().then(safeParseArr)
  ]);
  populateSantriOpts();
  renderRapotTable(allRapot);

  const autoStambuk = sessionStorage.getItem('autoRapotSantri');
  if (autoStambuk) {
    sessionStorage.removeItem('autoRapotSantri');
    setTimeout(() => {
      openGenerate();
      document.getElementById('genSantri').value = autoStambuk;
      onSantriChange();
    }, 100);
  }
}

function switchTab(tab) {
  activeTab=tab;
  document.getElementById('panelList').style.display    = tab==='list'   ?'block':'none';
  document.getElementById('panelPreview').style.display = tab==='preview'?'block':'none';
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
}

function populateSantriOpts() {
  document.getElementById('genSantri').innerHTML='<option value="">-- Pilih Santri --</option>'+
    allSantri.map(s=>`<option value="${s.STambuk}" data-nama="${s.Nama}">${s.STambuk} — ${s.Nama}</option>`).join('');
}

function filterRapot() {
  const q=document.getElementById('srchRapot').value.toLowerCase();
  renderRapotTable(allRapot.filter(r=>(!q||(r.STambuk+r.NamaSantri+r.Periode).toLowerCase().includes(q))));
}

function renderRapotTable(data) {
  document.getElementById('rapotCount').textContent=data.length+' rapot';
  if(!data.length){document.getElementById('rapotBody').innerHTML='<tr><td colspan="8" class="no-data">Belum ada rapot</td></tr>';return;}
  document.getElementById('rapotBody').innerHTML=[...data].reverse().map((r,i)=>{
    const k = getNilaiKategori(r.NilaiBacaan || r.NilaiAkhir || 0);
    const kHf = getNilaiKategori(r.NilaiHafalan || 0);
    return `
    <tr>
      <td style="color:var(--text-muted);font-size:12px;">${i+1}</td>
      <td><code style="font-size:12px;">${r.STambuk}</code></td>
      <td style="font-weight:600;">${r.NamaSantri}</td>
      <td>${r.Periode||'-'}</td>
      <td><strong style="color:var(--primary);font-size:15px;">${r.NilaiBacaan||r.NilaiAkhir||'-'}</strong> <span class="badge ${k.cls}" style="font-size:10px;">${k.label}</span></td>
      <td><strong style="color:#d97706;">${r.NilaiHafalan||'-'}%</strong> <span class="badge ${kHf.cls}" style="font-size:10px;">${kHf.label}</span></td>
      <td style="font-size:12px;">${fmtDate(r.Tanggal)}</td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:4px;" data-prev="${r.ID}"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> Preview</button>
          <button class="btn btn-danger btn-sm" style="display:inline-flex;align-items:center;justify-content:center;height:24px;width:24px;" data-del="${r.ID}"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
        </div>
      </td>
    </tr>`;
  }).join('');
  document.querySelectorAll('[data-prev]').forEach(b=>b.onclick=()=>previewRapot(b.dataset.prev));
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Hapus rapot ini?'))return;
    const r=await deleteRapot(b.dataset.del);
    if(r.ok){showToast('Rapot dihapus');loadAll();}
  });
}

// ─── Format Halaman (antisipasi auto-convert Google Sheets) ──
function formatHalaman(h) {
  if (!h) return '';
  h = String(h).trim();
  // ISO Date String e.g. "2026-01-06T17:00:00.000Z"
  if (h.includes('T') && !isNaN(Date.parse(h))) {
    const d = new Date(h);
    return `${d.getMonth() + 1}-${d.getDate()}`;
  }
  // Slash date format e.g. "1/7/2026"
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(h)) {
    const parts = h.split('/');
    return `${parseInt(parts[0])}-${parseInt(parts[1])}`;
  }
  return h;
}

// ─── Ambil indikator dari config ──────────────────────────────
function getIndikator() {
  return allConfig.indikatorChecklist || [];
}

// ─── Hitung nilai per-indikator dari sebuah record tes ───────
function getIndValues(tesRecord) {
  const inds = getIndikator();
  return inds.map((ind, i) => ({
    label: ind.label,
    nilai: Number(tesRecord?.[`Ind${i+1}`] ?? 0)
  }));
}

// ─── Cari record terbaik (NilaiAkhir tertinggi) ──────────────
function getBestRecord(records) {
  if (!records.length) return null;
  return records.reduce((best, cur) =>
    Number(cur.NilaiAkhir) > Number(best.NilaiAkhir) ? cur : best
  );
}

// ─── Kalkulasi lengkap untuk 1 santri ────────────────────────
function kalkulasiNilai(stambuk) {
  const santriTes = allTes.filter(t =>
    String(t.PesertaID) === String(stambuk) && t.TipePeserta === 'Santri'
  );
  const preTests  = santriTes.filter(t => t.JenisTes === 'Pre Test');
  const postTests = santriTes.filter(t => t.JenisTes === 'Post Test');

  const bestPreRecord  = getBestRecord(preTests);
  const bestPostRecord = getBestRecord(postTests);

  // Final = pilih record dengan NilaiAkhir tertinggi antara Pre dan Post
  let finalRecord = null;
  if (bestPreRecord && bestPostRecord) {
    finalRecord = Number(bestPostRecord.NilaiAkhir) >= Number(bestPreRecord.NilaiAkhir)
      ? bestPostRecord : bestPreRecord;
  } else {
    finalRecord = bestPostRecord || bestPreRecord || null;
  }

  // Hafalan
  const santriHf  = allHafalan.filter(h => String(h.STambuk) === String(stambuk));
  const selesai   = santriHf.filter(h => h.Status === 'Selesai').length;
  const hfPct     = santriHf.length ? Math.round(selesai / santriHf.length * 100) : null;

  return {
    bestPreRecord,
    bestPostRecord,
    finalRecord,
    hfPct,
    totalHf   : santriHf.length,
    selesaiHf : selesai,
    preTests,
    postTests,
    allTests  : santriTes
  };
}

// ─── Kartu ringkasan kalkulasi di modal ──────────────────────
function renderAutoCalcCard(label, nilai, sub, color='#1b6b4a') {
  if (nilai === null || nilai === undefined) {
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${label}</div>
      <div style="font-size:13px;color:#94a3b8;font-style:italic;">Belum ada data</div>
    </div>`;
  }
  const k = getNilaiKategori(nilai);
  return `<div style="background:#fff;border:1.5px solid ${color}33;border-radius:8px;padding:12px;">
    <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${label}</div>
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:22px;font-weight:800;color:${color};">${nilai}</span>
      <span class="badge ${k.cls}" style="font-size:10px;padding:2px 6px;">${k.label}</span>
    </div>
    ${sub ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${sub}</div>` : ''}
  </div>`;
}

function onSantriChange() {
  const sel     = document.getElementById('genSantri');
  const stambuk = sel.value;
  const panel   = document.getElementById('autoCalcPanel');
  const warning = document.getElementById('autoCalcWarning');
  const saveBtn = document.getElementById('genSaveBtn');

  if (!stambuk) {
    panel.style.display   = 'none';
    warning.style.display = 'none';
    saveBtn.disabled = true;
    _bestFinalRecord = null;
    _autoHfPct = 0;
    return;
  }

  const { bestPreRecord, bestPostRecord, finalRecord, hfPct, totalHf, selesaiHf, preTests, postTests } = kalkulasiNilai(stambuk);

  _bestFinalRecord = finalRecord;
  _autoHfPct       = hfPct ?? 0;

  const hasData = finalRecord !== null || hfPct !== null;

  if (!hasData) {
    panel.style.display = 'none';
    warning.innerHTML = `<div class="alert alert-error" style="font-size:13px;">
      <strong>⚠ Belum ada data evaluasi!</strong><br>
      Santri ini belum memiliki riwayat Pre Test, Post Test, maupun data hafalan. Rapot tidak dapat dibuat sebelum ada data evaluasi.
    </div>`;
    warning.style.display = 'block';
    saveBtn.disabled = true;
    return;
  }

  warning.style.display = 'none';

  const bestPre  = bestPreRecord  ? Number(bestPreRecord.NilaiAkhir)  : null;
  const bestPost = bestPostRecord ? Number(bestPostRecord.NilaiAkhir) : null;
  const finalVal = finalRecord    ? Number(finalRecord.NilaiAkhir)    : null;
  const hfSub = hfPct !== null ? `${selesaiHf} dari ${totalHf} surah selesai` : null;
  const finalSrc = finalRecord?.JenisTes === 'Post Test' ? 'Dari Post Test terbaik' :
                   finalRecord?.JenisTes === 'Pre Test'  ? 'Dari Pre Test terbaik (Post Test belum ada)' : null;

  document.getElementById('autoCalcGrid').innerHTML =
    renderAutoCalcCard('Pre Test Terbaik',  bestPre,  bestPre  !== null ? `${preTests.length} sesi` : null, '#3b82f6') +
    renderAutoCalcCard('Post Test Terbaik', bestPost, bestPost !== null ? `${postTests.length} sesi` : null, '#8b5cf6') +
    renderAutoCalcCard('Nilai Hafalan',     hfPct,    hfSub, '#d97706') +
    renderAutoCalcCard('Nilai Final Rapot', finalVal, finalSrc, '#1b6b4a');

  // Detail indikator dari tes terbaik
  const inds = getIndikator();
  const detailEl = document.getElementById('autoCalcDetail');
  const detailGrid = document.getElementById('autoCalcDetailGrid');
  if (finalRecord && inds.length) {
    const indVals = getIndValues(finalRecord);
    detailGrid.innerHTML = indVals.map(iv => {
      const k = getNilaiKategori(iv.nilai);
      return `<div style="background:#fff;border:1px solid #d1fae5;border-radius:6px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <span style="font-size:11px;color:#475569;font-weight:600;">${iv.label}</span>
        <div style="display:flex;align-items:center;gap:4px;">
          <strong style="font-size:13px;color:#1b6b4a;">${iv.nilai}</strong>
          <span class="badge ${k.cls}" style="font-size:9px;padding:1px 5px;">${k.label}</span>
        </div>
      </div>`;
    }).join('');
    detailEl.style.display = 'block';
  } else {
    detailEl.style.display = 'none';
  }

  panel.style.display = 'block';
  saveBtn.disabled = false;
}

function openGenerate() {
  ['genKehadiran','genCatatan','genReko','genPenguji','genPeriode'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('genSantri').value = '';
  document.getElementById('genTanggal').value=new Date().toISOString().slice(0,10);
  document.getElementById('genAlert').innerHTML='';
  document.getElementById('autoCalcPanel').style.display='none';
  document.getElementById('autoCalcWarning').style.display='none';
  document.getElementById('genSaveBtn').disabled=true;
  _bestFinalRecord = null;
  _autoHfPct = 0;
  populateSantriOpts();
  document.getElementById('modalGen').classList.add('show');
}

async function doSaveRapot() {
  const stambukEl = document.getElementById('genSantri');
  const stambuk   = stambukEl.value;
  const nama      = stambuk ? stambukEl.options[stambukEl.selectedIndex].dataset.nama : '';

  if (!stambuk) {
    document.getElementById('genAlert').innerHTML='<div class="alert alert-error">Pilih santri terlebih dahulu.</div>';return;
  }
  if (!_bestFinalRecord && !_autoHfPct) {
    document.getElementById('genAlert').innerHTML='<div class="alert alert-error">Tidak ada data evaluasi untuk santri ini.</div>';return;
  }

  // Simpan NilaiAkhir final dan hfPct ke kolom yang ada
  const finalNilai = _bestFinalRecord ? Number(_bestFinalRecord.NilaiAkhir) : 0;

  const data = {
    STambuk    : stambuk,
    NamaSantri : nama,
    Periode    : document.getElementById('genPeriode').value,
    NilaiBacaan : finalNilai,   // Nilai Akhir dari tes terbaik (Pre/Post)
    NilaiTajwid : finalNilai,   // Sama, karena satu sesi tes mencakup semua indikator
    NilaiHafalan: _autoHfPct,   // Persentase hafalan
    Kehadiran  : 0,
    Catatan    : document.getElementById('genCatatan').value,
    Rekomendasi: document.getElementById('genReko').value,
    Tanggal    : document.getElementById('genTanggal').value,
    _penguji   : document.getElementById('genPenguji').value
  };

  const btn=document.getElementById('genSaveBtn'); btn.textContent='Menyimpan...'; btn.disabled=true;
  const r=await saveRapot(data);
  btn.textContent='Simpan & Preview'; btn.disabled=false;
  if(r.ok){
    document.getElementById('modalGen').classList.remove('show');
    showToast('Rapot berhasil disimpan');
    renderRapotPreview({...data,ID:r.id});
    await loadAll();
    switchTab('preview');
  } else document.getElementById('genAlert').innerHTML=`<div class="alert alert-error">${r.msg}</div>`;
}

function previewRapot(id) {
  const r=allRapot.find(x=>x.ID===id);
  if(!r) return;
  renderRapotPreview(r);
  switchTab('preview');
}

// ═══════════════════════════════════════════════════════════════
// RENDER PREVIEW LENGKAP DENGAN SUB-TAB
// ═══════════════════════════════════════════════════════════════
function renderRapotPreview(r) {
  const penguji = r._penguji || r.Penguji || "Pengurus Markaz Qur'an";
  const tanggal = new Date(r.Tanggal || Date.now()).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

  const santri      = allSantri.find(s => String(s.STambuk) === String(r.STambuk));
  const santriKelas = santri?.Kelas || '-';

  // Hitung ulang dari data live
  const { bestPreRecord, bestPostRecord, finalRecord, hfPct, totalHf, selesaiHf, preTests, postTests, allTests } = kalkulasiNilai(r.STambuk);

  // Selalu gunakan data live hafalan (bukan nilai tersimpan yang bisa stale)
  const nilaiHafalan = hfPct !== null ? hfPct : 0;
  const finalNilai   = finalRecord ? Number(finalRecord.NilaiAkhir) : (Number(r.NilaiBacaan) || 0);
  const kFinal       = getNilaiKategori(finalNilai);

  const inds = getIndikator(); // array [{label}]

  // ── Helper: Kop Lembaga ──────────────────────────────────────
  const kopHtml = () => `
    <div style="text-align:center;border-bottom:3px double #1b6b4a;padding-bottom:14px;margin-bottom:20px;">
      <h1 style="font-size:24px;font-weight:800;color:#1b6b4a;margin:0;letter-spacing:1px;text-transform:uppercase;">MARKAZ QUR'AN</h1>
      <p style="font-size:11px;color:#64748b;margin:4px 0 0 0;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Lembaga Pendidikan &amp; Pembinaan Tahsin Tahfidz Qur'an Terpadu</p>
      ${r.Periode ? `<p style="font-size:12px;color:#1b6b4a;margin:8px 0 0 0;font-weight:700;letter-spacing:1px;text-transform:uppercase;">PERIODE EVALUASI: ${r.Periode}</p>` : ''}
    </div>`;

  // ── Helper: Info Santri ──────────────────────────────────────
  const infoSantriHtml = (predikatLabel, predikatCls) => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;font-size:13px;background:#f8fafc;padding:15px;border-radius:8px;border:1px solid #e2e8f0;">
      <div><table style="width:100%;border-collapse:collapse;">
        <tr><td style="border:none;padding:4px 0;color:#64748b;width:100px;">Nama Santri</td><td style="border:none;padding:4px 0;font-weight:700;color:#0f172a;">: ${r.NamaSantri}</td></tr>
        <tr><td style="border:none;padding:4px 0;color:#64748b;">No. Stambuk</td><td style="border:none;padding:4px 0;font-family:monospace;font-weight:700;color:#0f172a;">: ${r.STambuk}</td></tr>
      </table></div>
      <div><table style="width:100%;border-collapse:collapse;">
        <tr><td style="border:none;padding:4px 0;color:#64748b;width:110px;">Kelas / Rayon</td><td style="border:none;padding:4px 0;font-weight:600;color:#334155;">: ${santriKelas}</td></tr>
        <tr><td style="border:none;padding:4px 0;color:#64748b;">Predikat Akhir</td><td style="border:none;padding:4px 0;"><span class="badge ${predikatCls}" style="font-size:11px;font-weight:700;padding:2px 8px;">${predikatLabel}</span></td></tr>
      </table></div>
    </div>`;

  // ── Helper: Tabel Indikator dari satu record tes ─────────────
  // tesRecord = objek tes tunggal (Pre/Post terbaik)
  // accentColor = warna tema tab
  const indikatorTableHtml = (tesRecord, accentColor='#1b6b4a', showSumber=true) => {
    if (!tesRecord) {
      return `<div style="padding:14px;text-align:center;color:#94a3b8;font-style:italic;border:1px solid #e2e8f0;border-radius:6px;">Belum ada data tes evaluasi</div>`;
    }

    // Nilai per-indikator — mode kesalahan: n = jumlah kesalahan (bukan skor 0-100)
    const indRows = inds.map((ind, i) => {
      const n = Number(tesRecord[`Ind${i+1}`] ?? 0);
      // Tentukan status berdasarkan jumlah kesalahan (bukan skor)
      let statusHtml;
      if (n === 0) {
        statusHtml = `<span style="color:#16a34a;font-weight:700;font-size:12px;">✓ Tidak Ada</span>`;
      } else if (n <= 2) {
        statusHtml = `<span style="color:#d97706;font-weight:700;font-size:12px;">⚠ Sedikit</span>`;
      } else {
        statusHtml = `<span style="color:#dc2626;font-weight:700;font-size:12px;">✗ Perlu Latihan</span>`;
      }
      const countColor = n === 0 ? '#16a34a' : (n <= 2 ? '#d97706' : '#dc2626');
      return `
        <tr style="border-bottom:1px solid #e9ecef;">
          <td style="padding:7px 14px;font-weight:600;color:#334155;border:1px solid #dee2e6;font-size:12px;">${ind.label}</td>
          <td style="padding:7px 14px;font-size:14px;font-weight:800;color:${countColor};text-align:center;border:1px solid #dee2e6;">${n}×</td>
          <td style="padding:7px 14px;text-align:center;border:1px solid #dee2e6;">${statusHtml}</td>
        </tr>`;
    });

    // Baris Nilai Akhir (rata-rata)
    const nilaiAkhir = Number(tesRecord.NilaiAkhir) || 0;
    const kAkhir = getNilaiKategori(nilaiAkhir);

    // Fix Halaman: antisipasi auto-convert Google Sheets
    const halamanStr = formatHalaman(tesRecord.Halaman);
    const sumberInfo = showSumber ? `
      <div style="font-size:11px;color:#64748b;margin-top:8px;padding:6px 10px;background:#f8fafc;border-radius:4px;border-left:3px solid ${accentColor};">
        📋 Materi: <strong>${tesRecord.NamaSurah||'-'}</strong> ${halamanStr ? `(Ayat ${halamanStr})` : '(Semua Ayat)'}
        &nbsp;·&nbsp; 📅 Tanggal: <strong>${fmtDate(tesRecord.Tanggal)}</strong>
        &nbsp;·&nbsp; Jenis: <span class="badge badge-${tesRecord.JenisTes==='Pre Test'?'pretest':'posttest'}" style="font-size:9px;padding:1px 5px;">${tesRecord.JenisTes}</span>
      </div>` : '';

    return `
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #dee2e6;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="color:#334155;padding:10px 14px;text-align:left;font-weight:700;border:1px solid #dee2e6;">Indikator Penilaian</th>
            <th style="color:#334155;padding:10px 14px;text-align:center;font-weight:700;border:1px solid #dee2e6;width:90px;">Jml Kesalahan</th>
            <th style="color:#334155;padding:10px 14px;text-align:center;font-weight:700;border:1px solid #dee2e6;width:120px;">Kategori</th>
          </tr>
        </thead>
        <tbody>
          ${inds.length ? indRows.join('') : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;font-style:italic;">Tidak ada indikator terkonfigurasi</td></tr>`}
          <tr style="background:#f0fdf4;font-weight:700;">
            <td style="padding:12px 14px;color:#0f172a;border:1px solid #dee2e6;font-size:13px;">NILAI AKHIR</td>
            <td colspan="2" style="padding:12px 14px;border:1px solid #dee2e6;">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:26px;font-weight:800;color:${accentColor};">${nilaiAkhir}</span>
                <div>
                  <span class="badge ${kAkhir.cls}" style="font-size:11px;font-weight:700;padding:3px 10px;">${kAkhir.label}</span>
                  <div style="margin-top:6px;display:flex;align-items:center;gap:6px;">
                    <div style="width:120px;background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
                      <div style="height:100%;border-radius:99px;width:${nilaiAkhir}%;background:${accentColor};"></div>
                    </div>
                    <span style="font-size:11px;color:${accentColor};font-weight:700;">${nilaiAkhir}%</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      ${sumberInfo}`;
  };

  // ── Helper: Riwayat sesi evaluasi (card layout — tidak overflow) ──────
  const tesHistoryHtml = (tesArr, bestRecord, accentColor='#1b6b4a') => {
    if (!tesArr.length) return `<div style="padding:14px;text-align:center;color:#94a3b8;font-style:italic;border:1px solid #e2e8f0;border-radius:6px;">Belum ada data</div>`;
    const sorted = [...tesArr].sort((a,b)=>new Date(a.Tanggal)-new Date(b.Tanggal));
    return `<div style="display:flex;flex-direction:column;gap:10px;">
      ${sorted.map(t => {
        const k = getNilaiKategori(t.NilaiAkhir);
        const isBest = bestRecord && t.ID === bestRecord.ID;
        const hStr = formatHalaman(t.Halaman);
        const indGrid = inds.map((ind,i) => {
          const n = Number(t[`Ind${i+1}`] ?? 0);
          const c = n === 0 ? '#16a34a' : (n <= 2 ? '#d97706' : '#dc2626');
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:#fff;border-radius:4px;border:1px solid #e2e8f0;">
            <span style="font-size:10px;color:#64748b;flex:1;">${ind.label}</span>
            <span style="font-size:11px;font-weight:800;color:${c};margin-left:8px;">${n}×</span>
          </div>`;
        }).join('');
        return `<div style="border:1.5px solid ${isBest?accentColor:'#e2e8f0'};border-radius:8px;padding:12px;background:${isBest?'#f0fdf4':'#fafafa'};">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <div>
              <div style="font-size:11px;color:#64748b;margin-bottom:2px;">${fmtDate(t.Tanggal)}</div>
              <div style="font-weight:700;color:#0f172a;font-size:13px;">${t.NamaSurah||'-'} ${hStr?`<span style="font-weight:400;color:#64748b;font-size:11px;">Ayat ${hStr}</span>`:''}</div>
              <span class="badge badge-${t.JenisTes==='Pre Test'?'pretest':'posttest'}" style="font-size:9px;margin-top:4px;display:inline-block;">${t.JenisTes}</span>
              ${isBest?`<span style="font-size:9px;color:${accentColor};font-weight:700;margin-left:6px;">★ Terbaik</span>`:''}
            </div>
            <div style="text-align:right;">
              <div style="font-size:28px;font-weight:800;color:${accentColor};line-height:1;">${t.NilaiAkhir}</div>
              <span class="badge ${k.cls}" style="font-size:9px;margin-top:4px;display:inline-block;">${k.label}</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;">
            ${indGrid}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  };

  const santriHf = allHafalan.filter(h=>String(h.STambuk)===String(r.STambuk))
                             .sort((a,b)=>new Date(a.TanggalSetor)-new Date(b.TanggalSetor));
  const hafalanTableHtml = () => santriHf.length
    ? `<div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;"><table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr style="background:#fefce8;border-bottom:1px solid #e2e8f0;">
          <th style="padding:10px;text-align:left;font-weight:700;color:#475569;">Nama Surah</th>
          <th style="padding:10px;text-align:center;font-weight:700;color:#475569;width:80px;">Juz</th>
          <th style="padding:10px;text-align:center;font-weight:700;color:#475569;width:120px;">Rentang Ayat</th>
          <th style="padding:10px;text-align:center;font-weight:700;color:#475569;width:100px;">Status</th>
          <th style="padding:10px;text-align:left;font-weight:700;color:#475569;width:100px;">Tanggal Setor</th>
        </tr></thead>
        <tbody>${santriHf.map(h=>{
          const stCls=h.Status==='Selesai'?'badge-selesai':(h.Status==='Proses'?'badge-proses':'badge-belum');
          return `<tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 10px;font-weight:600;color:#0f172a;">${h.NamaSurah||'-'}</td>
            <td style="padding:8px 10px;text-align:center;color:#475569;">Juz ${h.Juz||'-'}</td>
            <td style="padding:8px 10px;text-align:center;color:#475569;">Ayat ${h.AyatDari} - ${h.AyatSampai}</td>
            <td style="padding:8px 10px;text-align:center;"><span class="badge ${stCls}" style="font-size:9px;padding:2px 6px;">${h.Status}</span></td>
            <td style="padding:8px 10px;color:#475569;">${fmtDate(h.TanggalSetor)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`
    : `<div style="padding:14px;text-align:center;color:#94a3b8;font-style:italic;border:1px solid #e2e8f0;border-radius:6px;">Belum ada riwayat setoran hafalan</div>`;

  // ── Helper: Catatan & Rekomendasi ────────────────────────────
  const catatanHtml = () => (r.Catatan || r.Rekomendasi) ? `
    <div style="display:grid;grid-template-columns:${r.Catatan&&r.Rekomendasi?'1fr 1fr':'1fr'};gap:16px;margin-bottom:30px;">
      ${r.Catatan?`<div>
        <h4 style="font-size:12px;font-weight:700;color:#334155;margin:0 0 6px 0;text-transform:uppercase;">Catatan Guru / Wali Kelas:</h4>
        <div style="font-size:12px;background:#f8fafc;padding:12px;border-radius:8px;border-left:4px solid #1b6b4a;border:1px solid #e2e8f0;border-left:4px solid #1b6b4a;min-height:80px;line-height:1.5;color:#334155;">${r.Catatan}</div>
      </div>`:''}
      ${r.Rekomendasi?`<div>
        <h4 style="font-size:12px;font-weight:700;color:#334155;margin:0 0 6px 0;text-transform:uppercase;">Rekomendasi Tindak Lanjut:</h4>
        <div style="font-size:12px;background:#fdfdf6;padding:12px;border-radius:8px;border-left:4px solid #d97706;border:1px solid #fef3c7;min-height:80px;line-height:1.5;color:#78350f;">${r.Rekomendasi}</div>
      </div>`:''}
    </div>` : '';

  // ── Helper: Tanda Tangan ─────────────────────────────────────
  const ttdHtml = () => `
    <div style="margin-top:35px;display:flex;justify-content:space-between;font-size:13px;padding:0 20px;">
      <div style="text-align:center;width:200px;">
        <p style="color:#475569;margin-bottom:65px;">Orang Tua / Wali Santri</p>
        <p style="border-bottom:1.5px solid #475569;padding-bottom:3px;font-weight:700;color:#0f172a;display:inline-block;min-width:160px;"></p>
      </div>
      <div style="text-align:center;width:220px;">
        <p style="color:#475569;margin-bottom:0;">Kediri, ${tanggal}</p>
        <p style="color:#475569;margin-top:2px;margin-bottom:65px;font-weight:500;">Wali Kelas / Penguji</p>
        <p style="border-bottom:1.5px solid #475569;padding-bottom:3px;font-weight:700;color:#0f172a;display:inline-block;min-width:160px;">${penguji}</p>
      </div>
    </div>`;

  // ── Helper: Section header ───────────────────────────────────
  const sectionTitle = (no, label, color='#1b6b4a') => `
    <h4 style="font-size:12px;font-weight:700;color:${color};margin:0 0 10px 0;border-bottom:2px solid ${color};padding-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">${no}. ${label}</h4>`;

  // ─────────────────────────────────────────────────────────────
  // KONTEN TAB FINAL (2 HALAMAN)
  // ─────────────────────────────────────────────────────────────
  const kHafalan    = getNilaiKategori(nilaiHafalan);
  const finalContent = `
    <!-- HALAMAN 1 -->
    <div style="min-height:98vh; display:flex; flex-direction:column;">
      ${kopHtml()}
      ${infoSantriHtml(kFinal.label, kFinal.cls)}

      <div style="margin-bottom:24px;">
        ${sectionTitle('I', 'PENILAIAN PER INDIKATOR (TES TERBAIK)')}
        ${indikatorTableHtml(finalRecord, '#1b6b4a', true)}
      </div>

      <div style="margin-bottom:24px;">
        ${sectionTitle('II', 'RINGKASAN HAFALAN AL-QUR\'AN')}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#d97706;text-transform:uppercase;">Total Target</div>
            <div style="font-size:24px;font-weight:800;color:#d97706;">${totalHf}</div>
            <div style="font-size:11px;color:#92400e;">Surah</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#1b6b4a;text-transform:uppercase;">Selesai</div>
            <div style="font-size:24px;font-weight:800;color:#1b6b4a;">${selesaiHf}</div>
            <div style="font-size:11px;color:#166534;">Surah Hafal</div>
          </div>
          <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase;">Nilai Hafalan</div>
            <div style="font-size:24px;font-weight:800;color:#3b82f6;">${nilaiHafalan}%</div>
            <span class="badge ${kHafalan.cls}" style="font-size:10px;">${kHafalan.label}</span>
          </div>
        </div>
      </div>

      <div style="background:#f1f5f9;border-radius:6px;padding:12px;font-size:11px;color:#475569;margin-bottom:12px;line-height:1.5;border:1px solid #e2e8f0;">
        <strong style="color:#334155;">Ketentuan Penilaian Rapot Final:</strong>
        <ul style="margin:4px 0 0 0;padding-left:18px;">
          <li><strong>Nilai Per Indikator</strong>: Diambil dari sesi tes (Pre/Post Test) dengan Nilai Akhir tertinggi.</li>
          <li><strong>Nilai Akhir Tes</strong>: Rata-rata dari semua indikator penilaian pada sesi terbaik tersebut.</li>
          <li><strong>Nilai Hafalan</strong>: Persentase surah berstatus "Selesai" dari total target hafalan santri.</li>
          ${finalRecord ? `<li><strong>Sumber Nilai Final</strong>: ${finalRecord.JenisTes} — ${finalRecord.NamaSurah||'-'} (${fmtDate(finalRecord.Tanggal)})</li>` : ''}
        </ul>
      </div>

      ${catatanHtml()}
      
      <div style="flex:1;"></div>
      ${ttdHtml()}
    </div>

    <!-- HALAMAN 2 -->
    <div style="page-break-before:always; padding-top:20px;">
      <div style="margin-bottom:24px;">
        ${sectionTitle('III', 'RIWAYAT SEMUA SESI EVALUASI BACAAN')}
        ${tesHistoryHtml(allTests, finalRecord, '#1b6b4a')}
      </div>
      <div style="margin-bottom:24px;">
        ${sectionTitle('IV', 'RIWAYAT SETORAN HAFALAN')}
        ${hafalanTableHtml()}
      </div>
    </div>`;

  // ─────────────────────────────────────────────────────────────
  // KONTEN TAB PRE TEST
  // ─────────────────────────────────────────────────────────────
  const bestPre = bestPreRecord ? Number(bestPreRecord.NilaiAkhir) : null;
  const kPre    = bestPre !== null ? getNilaiKategori(bestPre) : {label:'-',cls:''};
  const preContent = `
    <!-- HALAMAN 1 -->
    <div style="min-height:98vh; display:flex; flex-direction:column;">
      ${kopHtml()}
      ${infoSantriHtml(kPre.label, kPre.cls)}
      <div style="margin-bottom:24px;">
        ${sectionTitle('I', 'PENILAIAN PER INDIKATOR (PRE TEST TERBAIK)', '#3b82f6')}
        ${indikatorTableHtml(bestPreRecord, '#3b82f6', true)}
      </div>
      <div style="flex:1;"></div>
      ${ttdHtml()}
    </div>
    <!-- HALAMAN 2 -->
    <div style="page-break-before:always; padding-top:20px;">
      <div style="margin-bottom:24px;">
        ${sectionTitle('II', 'RIWAYAT SEMUA SESI PRE TEST', '#3b82f6')}
        ${tesHistoryHtml(preTests, bestPreRecord, '#3b82f6')}
      </div>
    </div>`;

  // ─────────────────────────────────────────────────────────────
  // KONTEN TAB POST TEST
  // ─────────────────────────────────────────────────────────────
  const bestPost = bestPostRecord ? Number(bestPostRecord.NilaiAkhir) : null;
  const kPost    = bestPost !== null ? getNilaiKategori(bestPost) : {label:'-',cls:''};
  const postContent = `
    <!-- HALAMAN 1 -->
    <div style="min-height:98vh; display:flex; flex-direction:column;">
      ${kopHtml()}
      ${infoSantriHtml(kPost.label, kPost.cls)}
      <div style="margin-bottom:24px;">
        ${sectionTitle('I', 'PENILAIAN PER INDIKATOR (POST TEST TERBAIK)', '#8b5cf6')}
        ${indikatorTableHtml(bestPostRecord, '#8b5cf6', true)}
      </div>
      <div style="flex:1;"></div>
      ${ttdHtml()}
    </div>
    <!-- HALAMAN 2 -->
    <div style="page-break-before:always; padding-top:20px;">
      <div style="margin-bottom:24px;">
        ${sectionTitle('II', 'RIWAYAT SEMUA SESI POST TEST', '#8b5cf6')}
        ${tesHistoryHtml(postTests, bestPostRecord, '#8b5cf6')}
      </div>
    </div>`;

  // ─────────────────────────────────────────────────────────────
  // KONTEN TAB HAFALAN
  // ─────────────────────────────────────────────────────────────
  const hfContent = `
    ${kopHtml("RAPOT HAFALAN AL-QUR'AN")}
    ${infoSantriHtml(kHafalan.label, kHafalan.cls)}
    <div style="margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:11px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.5px;">Total Target</div>
          <div style="font-size:28px;font-weight:800;color:#d97706;">${totalHf}</div>
          <div style="font-size:11px;color:#92400e;">Surah</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:11px;font-weight:700;color:#1b6b4a;text-transform:uppercase;letter-spacing:0.5px;">Selesai</div>
          <div style="font-size:28px;font-weight:800;color:#1b6b4a;">${selesaiHf}</div>
          <div style="font-size:11px;color:#166534;">Surah Hafal</div>
        </div>
        <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.5px;">Nilai Hafalan</div>
          <div style="font-size:28px;font-weight:800;color:#3b82f6;">${nilaiHafalan}%</div>
          <div style="font-size:11px;color:#1d4ed8;">Progres</div>
        </div>
      </div>
    </div>
    <div style="margin-bottom:24px;">
      ${sectionTitle('DETAIL SETORAN HAFALAN', '', '#d97706')}
      ${hafalanTableHtml()}
    </div>
    ${ttdHtml()}`;

  // ─────────────────────────────────────────────────────────────
  // SUSUN HTML FINAL
  // ─────────────────────────────────────────────────────────────
  document.getElementById('rapotPreviewCard').innerHTML = `
    <style>
      @media print {
        body{background:#fff!important;color:#000!important;}
        .sidebar,.topbar,.no-print,.tab-bar,button{display:none!important;}
        .app-layout{display:block!important;height:auto!important;overflow:visible!important;}
        .main-content{display:block!important;overflow:visible!important;flex:none!important;}
        .page-body{padding:0!important;overflow:visible!important;}
        #rapotPreviewCard{border:none!important;box-shadow:none!important;padding:0!important;margin:0!important;max-width:100%!important;background:#fff!important;}
        .rapot-sub-tabbar{display:none!important;}
        .rapot-tab-panel{display:none!important;}
        .rapot-tab-panel.rapot-active{display:block!important;}
        @page{margin:1.5cm;}
      }
      .rapot-sub-tabbar{display:flex;gap:6px;margin-bottom:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:5px;flex-wrap:wrap;}
      .rapot-sub-tab{flex:1;min-width:110px;padding:8px 10px;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;background:transparent;color:#64748b;text-align:center;letter-spacing:0.3px;}
      .rapot-sub-tab:hover{background:#e2e8f0;}
      .rapot-tab-panel{display:none;}
      .rapot-tab-panel.rapot-active{display:block;}
    </style>

    <div class="rapot-sub-tabbar no-print">
      <button class="rapot-sub-tab" id="rTab-final" style="background:#1b6b4a;color:#fff;box-shadow:0 2px 8px #1b6b4a44;" onclick="switchRapotTab('final')">📋 Rapot Final</button>
      <button class="rapot-sub-tab" id="rTab-pre"   onclick="switchRapotTab('pre')">📝 Pre Test</button>
      <button class="rapot-sub-tab" id="rTab-post"  onclick="switchRapotTab('post')">✅ Post Test</button>
      <button class="rapot-sub-tab" id="rTab-hf"    onclick="switchRapotTab('hf')">📖 Hafalan</button>
    </div>

    <div class="rapot-tab-panel rapot-active" id="rPanel-final">${finalContent}</div>
    <div class="rapot-tab-panel" id="rPanel-pre">${preContent}</div>
    <div class="rapot-tab-panel" id="rPanel-post">${postContent}</div>
    <div class="rapot-tab-panel" id="rPanel-hf">${hfContent}</div>
  `;

  window.switchRapotTab = (tab) => {
    const colors = { final:'#1b6b4a', pre:'#3b82f6', post:'#8b5cf6', hf:'#d97706' };
    ['final','pre','post','hf'].forEach(p => {
      const panel = document.getElementById(`rPanel-${p}`);
      const btn   = document.getElementById(`rTab-${p}`);
      if (!panel||!btn) return;
      const active = p===tab;
      panel.classList.toggle('rapot-active', active);
      btn.style.background   = active ? colors[p] : 'transparent';
      btn.style.color        = active ? '#fff' : '#64748b';
      btn.style.boxShadow    = active ? `0 2px 8px ${colors[p]}44` : 'none';
    });
  };
}
