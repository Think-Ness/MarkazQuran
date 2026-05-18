import { getRapot,saveRapot,deleteRapot,getSantri,getTesBacaan,getHafalan,getConfig } from '../api.js';
import { getNilaiKategori, fmtDate, showToast } from '../utils.js';

let allRapot=[],allSantri=[],allTes=[],allHafalan=[],activeTab='list',allConfig={};

export async function renderRapot(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Rapot Santri</h2><p>Generate, lihat, dan cetak rapot per santri</p></div>
      <div class="flex gap-8 no-print">
        <button class="btn btn-primary" id="btnGen" style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Buat Rapot</button>
      </div>
    </div>

    <div class="tab-bar no-print">
      <button class="tab-btn active" data-tab="list">Daftar Rapot</button>
      <button class="tab-btn" data-tab="preview">Preview & Cetak</button>
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
            <thead><tr><th>#</th><th>Stambuk</th><th>Nama</th><th>Periode</th><th>Bacaan</th><th>Tajwid</th><th>Hafalan</th><th>Tanggal</th><th>Aksi</th></tr></thead>
            <tbody id="rapotBody"><tr><td colspan="9" class="no-data">Memuat...</td></tr></tbody>
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
      <div id="rapotPreviewCard" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:32px;max-width:760px;margin:0 auto;">
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
            <div class="form-group"><label>Nilai Kelancaran Bacaan *</label><input type="number" id="genBacaan" min="0" max="100" placeholder="85"></div>
            <div class="form-group"><label>Nilai Tajwid *</label><input type="number" id="genTajwid" min="0" max="100" placeholder="80"></div>
            <div class="form-group"><label>Nilai Hafalan *</label><input type="number" id="genHafalan" min="0" max="100" placeholder="90"></div>
            <input type="hidden" id="genKehadiran" value="0">
            <div class="form-group"><label>Tanggal Rapot</label><input type="date" id="genTanggal"></div>
            <div class="form-group"><label>Nama Penandatangan</label><input type="text" id="genPenguji" placeholder="Nama guru/pengurus"></div>
            <div class="form-group full"><label>Catatan Guru</label><textarea id="genCatatan" placeholder="Catatan perkembangan santri..."></textarea></div>
            <div class="form-group full"><label>Rekomendasi</label><textarea id="genReko" placeholder="Rekomendasi tindak lanjut..."></textarea></div>
          </div>
          <div id="autoFillInfo" style="display:none;margin-top:8px;"><div class="alert alert-info" id="autoFillText"></div></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalGen').classList.remove('show')">Batal</button>
          <button class="btn btn-primary" id="genSaveBtn">Simpan &amp; Preview</button>
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

  // Cek jika ada request auto generate dari halaman lain
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

function renderNilaiCell(n) {
  const k=getNilaiKategori(n);
  return `<strong style="color:var(--primary);">${n}</strong> <span class="badge ${k.cls}" style="font-size:10px;">${k.label}</span>`;
}

function renderRapotTable(data) {
  document.getElementById('rapotCount').textContent=data.length+' rapot';
  if(!data.length){document.getElementById('rapotBody').innerHTML='<tr><td colspan="9" class="no-data">Belum ada rapot</td></tr>';return;}
  document.getElementById('rapotBody').innerHTML=[...data].reverse().map((r,i)=>`
    <tr>
      <td style="color:var(--text-muted);font-size:12px;">${i+1}</td>
      <td><code style="font-size:12px;">${r.STambuk}</code></td>
      <td style="font-weight:600;">${r.NamaSantri}</td>
      <td>${r.Periode||'-'}</td>
      <td>${renderNilaiCell(r.NilaiBacaan)}</td>
      <td>${renderNilaiCell(r.NilaiTajwid)}</td>
      <td>${renderNilaiCell(r.NilaiHafalan)}</td>
      <td style="font-size:12px;">${fmtDate(r.Tanggal)}</td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:4px;" data-prev="${r.ID}"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> Preview</button>
          <button class="btn btn-danger btn-sm" style="display:inline-flex;align-items:center;justify-content:center;height:24px;width:24px;" data-del="${r.ID}"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
        </div>
      </td>
    </tr>`).join('');
  document.querySelectorAll('[data-prev]').forEach(b=>b.onclick=()=>previewRapot(b.dataset.prev));
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Hapus rapot ini?'))return;
    const r=await deleteRapot(b.dataset.del);
    if(r.ok){showToast('Rapot dihapus');loadAll();}
  });
}

function onSantriChange() {
  const sel=document.getElementById('genSantri');
  const stambuk=sel.value;
  if(!stambuk){document.getElementById('autoFillInfo').style.display='none';return;}
  const santriTes=allTes.filter(t=>String(t.PesertaID)===String(stambuk)&&t.TipePeserta==='Santri')
                        .sort((a,b) => new Date(b.Tanggal) - new Date(a.Tanggal));
  const latestTes=santriTes[0];
  const latestNilai=latestTes ? Number(latestTes.NilaiAkhir) : 0;
  const santriHf=allHafalan.filter(h=>String(h.STambuk)===String(stambuk));
  const selesai=santriHf.filter(h=>h.Status==='Selesai').length;
  const hfPct=santriHf.length?Math.round(selesai/santriHf.length*100):0;
  if(latestNilai){document.getElementById('genBacaan').value=latestNilai;document.getElementById('genTajwid').value=latestNilai;}
  if(hfPct) document.getElementById('genHafalan').value=hfPct;
  const nama=sel.options[sel.selectedIndex].dataset.nama;
  let msg=`Auto-fill untuk ${nama}: `;
  if(latestTes) msg+=`Nilai terakhir (${latestTes.JenisTes} - ${latestTes.NamaSurah}): ${latestNilai}. `;
  else msg+=`Belum ada tes evaluasi. `;
  if(santriHf.length) msg+=`Hafalan ${selesai}/${santriHf.length} selesai (${hfPct}%).`;
  document.getElementById('autoFillText').textContent=msg;
  document.getElementById('autoFillInfo').style.display='block';
}

function openGenerate() {
  ['genBacaan','genTajwid','genHafalan','genKehadiran','genCatatan','genReko','genPenguji','genPeriode'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('genTanggal').value=new Date().toISOString().slice(0,10);
  document.getElementById('genAlert').innerHTML='';
  document.getElementById('autoFillInfo').style.display='none';
  populateSantriOpts();
  document.getElementById('modalGen').classList.add('show');
}

async function doSaveRapot() {
  const stambukEl=document.getElementById('genSantri');
  const stambuk=stambukEl.value;
  const nama=stambuk?stambukEl.options[stambukEl.selectedIndex].dataset.nama:'';
  const bacaan=document.getElementById('genBacaan').value;
  const tajwid=document.getElementById('genTajwid').value;
  const hafalan=document.getElementById('genHafalan').value;
  const kehadiran=document.getElementById('genKehadiran').value;
  if(!stambuk||!bacaan||!tajwid||!hafalan){
    document.getElementById('genAlert').innerHTML='<div class="alert alert-error">Santri dan semua nilai wajib diisi.</div>';return;
  }
  const data={STambuk:stambuk,NamaSantri:nama,Periode:document.getElementById('genPeriode').value,NilaiBacaan:Number(bacaan),NilaiTajwid:Number(tajwid),NilaiHafalan:Number(hafalan),Kehadiran:Number(kehadiran)||0,Catatan:document.getElementById('genCatatan').value,Rekomendasi:document.getElementById('genReko').value,Tanggal:document.getElementById('genTanggal').value,_penguji:document.getElementById('genPenguji').value};
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

function renderRapotPreview(r) {
  const avg = Math.round((Number(r.NilaiBacaan) + Number(r.NilaiTajwid) + Number(r.NilaiHafalan)) / 3);
  const kAvg = getNilaiKategori(avg);
  const penguji = r._penguji || r.Penguji || "Pengurus Markaz Qur'an";
  const tanggal = new Date(r.Tanggal || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  
  // Ambil metadata santri (seperti kelas)
  const santri = allSantri.find(s => String(s.STambuk) === String(r.STambuk));
  const santriKelas = santri?.Kelas || '-';

  // Ambil riwayat evaluasi (ujian) santri
  const santriTests = allTes.filter(t => String(t.PesertaID) === String(r.STambuk) && t.TipePeserta === 'Santri')
                            .sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));

  const testRowsHtml = santriTests.length 
    ? santriTests.map(t => {
        const k = getNilaiKategori(t.NilaiAkhir);
        return `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 10px;color:#475569;">${fmtDate(t.Tanggal)}</td>
            <td style="padding:8px 10px;"><span class="badge badge-${t.JenisTes === 'Pre Test' ? 'pretest' : (t.JenisTes === 'Post Test' ? 'posttest' : 'warning')}" style="font-size:9px;padding:2px 6px;">${t.JenisTes}</span></td>
            <td style="padding:8px 10px;font-weight:600;color:#0f172a;">${t.NamaSurah || '-'} <span style="font-weight:normal;color:#64748b;font-size:11px;">(Ayat ${t.Halaman || 'Semua'})</span></td>
            <td style="padding:8px 10px;text-align:center;font-weight:700;color:#1b6b4a;font-size:13px;">${t.NilaiAkhir}</td>
            <td style="padding:8px 10px;text-align:center;"><span class="badge ${k.cls}" style="font-size:9px;padding:2px 6px;">${k.label}</span></td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:12px;color:#94a3b8;font-style:italic;">Belum ada riwayat tes bacaan</td></tr>';

  // Ambil riwayat setoran hafalan santri
  const santriHf = allHafalan.filter(h => String(h.STambuk) === String(r.STambuk))
                             .sort((a, b) => new Date(a.TanggalSetor) - new Date(b.TanggalSetor));

  const hafalanRowsHtml = santriHf.length
    ? santriHf.map(h => {
        const stCls = h.Status === 'Selesai' ? 'badge-selesai' : (h.Status === 'Proses' ? 'badge-proses' : 'badge-belum');
        return `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 10px;font-weight:600;color:#0f172a;">${h.NamaSurah || '-'}</td>
            <td style="padding:8px 10px;text-align:center;color:#475569;">Juz ${h.Juz || '-'}</td>
            <td style="padding:8px 10px;text-align:center;color:#475569;">Ayat ${h.AyatDari} - ${h.AyatSampai}</td>
            <td style="padding:8px 10px;text-align:center;"><span class="badge ${stCls}" style="font-size:9px;padding:2px 6px;">${h.Status}</span></td>
            <td style="padding:8px 10px;color:#475569;">${fmtDate(h.TanggalSetor)}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:12px;color:#94a3b8;font-style:italic;">Belum ada riwayat setoran hafalan</td></tr>';

  document.getElementById('rapotPreviewCard').innerHTML = `
    <style>
      @media print {
        body {
          background: #fff !important;
          color: #000 !important;
        }
        .sidebar, .topbar, .no-print, .tab-bar, button {
          display: none !important;
        }
        .app-layout {
          display: block !important;
          height: auto !important;
          overflow: visible !important;
        }
        .main-content {
          display: block !important;
          overflow: visible !important;
          flex: none !important;
        }
        .page-body {
          padding: 0 !important;
          overflow: visible !important;
        }
        #rapotPreviewCard {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          max-width: 100% !important;
          background: #fff !important;
        }
        @page {
          margin: 1.5cm;
        }
      }
    </style>
    <!-- KOP INSTANSI RESMI -->
    <div style="text-align:center;border-bottom:3px double #1b6b4a;padding-bottom:14px;margin-bottom:20px;">
      <h1 style="font-size:24px;font-weight:800;color:#1b6b4a;margin:0;letter-spacing:1px;text-transform:uppercase;">MARKAZ QUR'AN</h1>
      <p style="font-size:11px;color:#64748b;margin:4px 0 0 0;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Lembaga Pendidikan & Pembinaan Tahsin Tahfidz Qur'an Terpadu</p>
      ${r.Periode ? `<p style="font-size:12px;color:#1b6b4a;margin:8px 0 0 0;font-weight:700;letter-spacing:1px;text-transform:uppercase;">PERIODE EVALUASI: ${r.Periode}</p>` : ''}
    </div>

    <h2 style="font-size:15px;font-weight:700;color:#1e293b;text-align:center;margin:15px 0 20px 0;letter-spacing:0.5px;text-transform:uppercase;">RAPOT HASIL EVALUASI SANTRI</h2>

    <!-- GRID DATA SANTRI -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;font-size:13px;background:#f8fafc;padding:15px;border-radius:8px;border:1px solid #e2e8f0;">
      <div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="border:none;padding:4px 0;color:#64748b;width:100px;">Nama Santri</td>
            <td style="border:none;padding:4px 0;font-weight:700;color:#0f172a;">: ${r.NamaSantri}</td>
          </tr>
          <tr>
            <td style="border:none;padding:4px 0;color:#64748b;">No. Stambuk</td>
            <td style="border:none;padding:4px 0;font-family:monospace;font-weight:700;color:#0f172a;">: ${r.STambuk}</td>
          </tr>
        </table>
      </div>
      <div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="border:none;padding:4px 0;color:#64748b;width:110px;">Kelas / Rayon</td>
            <td style="border:none;padding:4px 0;font-weight:600;color:#334155;">: ${santriKelas}</td>
          </tr>
          <tr>
            <td style="border:none;padding:4px 0;color:#64748b;">Predikat Akhir</td>
            <td style="border:none;padding:4px 0;"><span class="badge ${kAvg.cls}" style="font-size:11px;font-weight:700;padding:2px 8px;">${kAvg.label}</span></td>
          </tr>
        </table>
      </div>
    </div>

    <!-- ASPEK PENILAIAN UTAMA -->
    <div style="margin-bottom:24px;">
      <h4 style="font-size:12px;font-weight:700;color:#1b6b4a;margin:0 0 10px 0;border-bottom:2px solid #1b6b4a;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">I. ASPEK PENILAIAN UTAMA</h4>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px;border:1px solid #cbd5e1;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="color:#334155;padding:12px 14px;text-align:left;font-weight:700;border:1px solid #cbd5e1;">Aspek Evaluasi</th>
            <th style="color:#334155;padding:12px 14px;text-align:center;font-weight:700;border:1px solid #cbd5e1;width:80px;">Nilai</th>
            <th style="color:#334155;padding:12px 14px;text-align:center;font-weight:700;border:1px solid #cbd5e1;width:120px;">Kategori</th>
            <th style="color:#334155;padding:12px 14px;text-align:left;font-weight:700;border:1px solid #cbd5e1;">Visualisasi Capaian</th>
          </tr>
        </thead>
        <tbody>
          ${[['Kelancaran Bacaan', r.NilaiBacaan], ['Tajwid / Makhraj', r.NilaiTajwid], ['Hafalan Al-Qur\'an', r.NilaiHafalan]].map(([asp, n]) => {
            const k = getNilaiKategori(n);
            return `
              <tr style="border-bottom:1px solid #cbd5e1;">
                <td style="padding:10px 14px;font-weight:700;color:#334155;border:1px solid #cbd5e1;">${asp}</td>
                <td style="padding:10px 14px;font-size:16px;font-weight:800;color:#1b6b4a;text-align:center;border:1px solid #cbd5e1;">${n}</td>
                <td style="padding:10px 14px;text-align:center;border:1px solid #cbd5e1;"><span class="badge ${k.cls}" style="font-size:10px;font-weight:700;padding:2px 8px;">${k.label}</span></td>
                <td style="padding:10px 14px;min-width:140px;border:1px solid #cbd5e1;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
                      <div style="height:100%;border-radius:99px;width:${n}%;background:#1b6b4a;"></div>
                    </div>
                    <span style="font-size:11px;color:#64748b;font-weight:600;">${n}%</span>
                  </div>
                </td>
              </tr>`;
          }).join('')}
          <tr style="background:#f8fafc;font-weight:700;">
            <td style="padding:12px 14px;color:#0f172a;border:1px solid #cbd5e1;">RATA-RATA NILAI AKHIR</td>
            <td style="padding:12px 14px;font-size:18px;font-weight:800;color:#1b6b4a;text-align:center;border:1px solid #cbd5e1;">${avg}</td>
            <td style="padding:12px 14px;text-align:center;border:1px solid #cbd5e1;"><span class="badge ${kAvg.cls}" style="font-size:11px;font-weight:700;padding:3px 8px;">${kAvg.label}</span></td>
            <td style="padding:12px 14px;border:1px solid #cbd5e1;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
                  <div style="height:100%;border-radius:99px;width:${avg}%;background:#1b6b4a;"></div>
                </div>
                <span style="font-size:11px;color:#1b6b4a;font-weight:700;">${avg}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- DETAIL RIWAYAT EVALUASI BACAAN -->
    <div style="margin-bottom:24px;">
      <h4 style="font-size:12px;font-weight:700;color:#1b6b4a;margin:0 0 10px 0;border-bottom:2px solid #1b6b4a;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">II. RIWAYAT EVALUASI HARIAN (BACAAN & TAJWID)</h4>
      <div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <th style="padding:10px;text-align:left;font-weight:700;color:#475569;width:90px;">Tanggal</th>
              <th style="padding:10px;text-align:left;font-weight:700;color:#475569;width:100px;">Jenis Evaluasi</th>
              <th style="padding:10px;text-align:left;font-weight:700;color:#475569;">Materi Ujian (Surah/Ayat)</th>
              <th style="padding:10px;text-align:center;font-weight:700;color:#475569;width:70px;">Nilai</th>
              <th style="padding:10px;text-align:center;font-weight:700;color:#475569;width:100px;">Predikat</th>
            </tr>
          </thead>
          <tbody>
            ${testRowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- DETAIL RIWAYAT PROGRESS HAFALAN -->
    <div style="margin-bottom:24px;">
      <h4 style="font-size:12px;font-weight:700;color:#1b6b4a;margin:0 0 10px 0;border-bottom:2px solid #1b6b4a;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">III. LAPORAN PERKEMBANGAN SETORAN HAFALAN</h4>
      <div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <th style="padding:10px;text-align:left;font-weight:700;color:#475569;">Nama Surah</th>
              <th style="padding:10px;text-align:center;font-weight:700;color:#475569;width:80px;">Juz</th>
              <th style="padding:10px;text-align:center;font-weight:700;color:#475569;width:120px;">Rentang Ayat</th>
              <th style="padding:10px;text-align:center;font-weight:700;color:#475569;width:100px;">Status</th>
              <th style="padding:10px;text-align:left;font-weight:700;color:#475569;width:100px;">Tanggal Setor</th>
            </tr>
          </thead>
          <tbody>
            ${hafalanRowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- KETENTUAN DAN FORMULA PENILAIAN -->
    <div style="background:#f1f5f9;border-radius:6px;padding:12px;font-size:11px;color:#475569;margin-bottom:24px;line-height:1.5;border:1px solid #e2e8f0;">
      <strong style="color:#334155;">Informasi & Ketentuan Perhitungan Penilaian:</strong>
      <ul style="margin:4px 0 0 0;padding-left:18px;color:#475569;">
        <li><strong>Nilai Kelancaran Bacaan & Tajwid</strong>: Diperoleh berdasarkan nilai evaluasi paling akhir (terbaru) yang diikuti santri.</li>
        <li><strong>Nilai Hafalan Al-Qur'an</strong>: Dihitung secara berkala dari total surah yang diselesaikan (Status: Selesai) terhadap target periode evaluasi.</li>
        <li><strong>Rata-rata Nilai Akhir</strong>: Hasil pembagian akumulatif ketiga aspek utama dengan bobot yang sama: <code>(Bacaan + Tajwid + Hafalan) / 3</code>.</li>
      </ul>
    </div>

    <!-- PANEL CATATAN DAN REKOMENDASI -->
    <div style="display:grid;grid-template-columns:${r.Catatan && r.Rekomendasi ? '1fr 1fr' : '1fr'};gap:16px;margin-bottom:30px;">
      ${r.Catatan ? `
        <div>
          <h4 style="font-size:12px;font-weight:700;color:#334155;margin:0 0 6px 0;text-transform:uppercase;">Catatan Guru / Wali Kelas:</h4>
          <div style="font-size:12px;background:#f8fafc;padding:12px;border-radius:8px;border-left:4px solid #1b6b4a;border-top:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;min-height:80px;line-height:1.5;color:#334155;">
            ${r.Catatan}
          </div>
        </div>
      ` : ''}
      ${r.Rekomendasi ? `
        <div>
          <h4 style="font-size:12px;font-weight:700;color:#334155;margin:0 0 6px 0;text-transform:uppercase;">Rekomendasi Tindak Lanjut:</h4>
          <div style="font-size:12px;background:#fdfdf6;padding:12px;border-radius:8px;border-left:4px solid #d97706;border-top:1px solid #fef3c7;border-right:1px solid #fef3c7;border-bottom:1px solid #fef3c7;min-height:80px;line-height:1.5;color:#78350f;">
            ${r.Rekomendasi}
          </div>
        </div>
      ` : ''}
    </div>

    <!-- TANDA TANGAN GANDA RESMI -->
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
}
