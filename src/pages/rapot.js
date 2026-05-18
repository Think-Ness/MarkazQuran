import { getRapot,saveRapot,deleteRapot,getSantri,getTesBacaan,getHafalan } from '../api.js';
import { getNilaiKategori, fmtDate, showToast } from '../utils.js';

let allRapot=[],allSantri=[],allTes=[],allHafalan=[],activeTab='list';

export async function renderRapot(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Rapot Santri</h2><p>Generate, lihat, dan cetak rapot per santri</p></div>
      <div class="flex gap-8 no-print">
        <button class="btn btn-primary" id="btnGen">+ Buat Rapot</button>
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
            <button class="btn btn-outline btn-sm" id="btnRefresh">&#8635; Refresh</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Riwayat Rapot</h3><span class="text-muted" id="rapotCount">-</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Stambuk</th><th>Nama</th><th>Periode</th><th>Bacaan</th><th>Tajwid</th><th>Hafalan</th><th>Kehadiran</th><th>Tanggal</th><th>Aksi</th></tr></thead>
            <tbody id="rapotBody"><tr><td colspan="10" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PREVIEW -->
    <div id="panelPreview" style="display:none;">
      <div class="flex gap-12 mb-16 no-print" style="margin-bottom:16px;">
        <button class="btn btn-primary" onclick="window.print()">&#128438; Cetak / Simpan PDF</button>
        <button class="btn btn-outline" id="btnBackList">Kembali ke Daftar</button>
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
            <div class="form-group"><label>Kehadiran (%)</label><input type="number" id="genKehadiran" min="0" max="100" placeholder="95"></div>
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
  [allSantri,allTes,allHafalan,allRapot]=await Promise.all([
    getSantri().then(r=>Array.isArray(r)?r:JSON.parse(r)),
    getTesBacaan().then(r=>Array.isArray(r)?r:JSON.parse(r)),
    getHafalan().then(r=>Array.isArray(r)?r:JSON.parse(r)),
    getRapot().then(r=>Array.isArray(r)?r:JSON.parse(r))
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
  if(!data.length){document.getElementById('rapotBody').innerHTML='<tr><td colspan="10" class="no-data">Belum ada rapot</td></tr>';return;}
  document.getElementById('rapotBody').innerHTML=[...data].reverse().map((r,i)=>`
    <tr>
      <td style="color:var(--text-muted);font-size:12px;">${i+1}</td>
      <td><code style="font-size:12px;">${r.STambuk}</code></td>
      <td style="font-weight:600;">${r.NamaSantri}</td>
      <td>${r.Periode||'-'}</td>
      <td>${renderNilaiCell(r.NilaiBacaan)}</td>
      <td>${renderNilaiCell(r.NilaiTajwid)}</td>
      <td>${renderNilaiCell(r.NilaiHafalan)}</td>
      <td>${r.Kehadiran||0}%</td>
      <td style="font-size:12px;">${fmtDate(r.Tanggal)}</td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-primary btn-sm" data-prev="${r.ID}">&#128065; Preview</button>
          <button class="btn btn-danger  btn-sm" data-del="${r.ID}">&#128465;</button>
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
  const santriTes=allTes.filter(t=>String(t.PesertaID)===String(stambuk)&&t.TipePeserta==='Santri');
  const src=santriTes.filter(t=>t.JenisTes==='Post Test').length?santriTes.filter(t=>t.JenisTes==='Post Test'):santriTes;
  const avgNilai=src.length?Math.round(src.reduce((a,b)=>a+Number(b.NilaiAkhir),0)/src.length):0;
  const santriHf=allHafalan.filter(h=>String(h.STambuk)===String(stambuk));
  const selesai=santriHf.filter(h=>h.Status==='Selesai').length;
  const hfPct=santriHf.length?Math.round(selesai/santriHf.length*100):0;
  if(avgNilai){document.getElementById('genBacaan').value=avgNilai;document.getElementById('genTajwid').value=avgNilai;}
  if(hfPct) document.getElementById('genHafalan').value=hfPct;
  const nama=sel.options[sel.selectedIndex].dataset.nama;
  let msg=`Auto-fill untuk ${nama}: `;
  if(src.length) msg+=`Rata-rata nilai ${avgNilai}. `;
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
  const avg=Math.round((Number(r.NilaiBacaan)+Number(r.NilaiTajwid)+Number(r.NilaiHafalan))/3);
  const kAvg=getNilaiKategori(avg);
  const penguji=r._penguji||r.Penguji||"Pengurus Markaz Qur'an";
  const tanggal=new Date(r.Tanggal||Date.now()).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('rapotPreviewCard').innerHTML=`
    <div style="text-align:center;border-bottom:3px double var(--primary);padding-bottom:16px;margin-bottom:20px;">
      <div style="font-size:32px;color:var(--primary);margin-bottom:8px;">&#9676;</div>
      <h2 style="font-size:18px;font-weight:700;color:var(--primary);">RAPOT SANTRI — MARKAZ QUR'AN</h2>
      <p style="font-size:12px;color:var(--text-muted);">Periode: ${r.Periode||'-'} &nbsp;|&nbsp; Tanggal: ${tanggal}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">
      <div>
        <p style="font-size:12px;color:var(--text-muted);">Stambuk</p><p style="font-weight:600;">${r.STambuk}</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Nama Santri</p><p style="font-weight:600;">${r.NamaSantri}</p>
      </div>
      <div>
        <p style="font-size:12px;color:var(--text-muted);">Predikat Akhir</p><span class="badge ${kAvg.cls}">${kAvg.label}</span>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Kehadiran</p><p style="font-weight:600;">${r.Kehadiran||0}%</p>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead><tr>
        <th style="background:var(--primary);color:#fff;padding:10px 14px;text-align:left;font-size:12px;">Aspek Penilaian</th>
        <th style="background:var(--primary);color:#fff;padding:10px 14px;text-align:left;font-size:12px;">Nilai</th>
        <th style="background:var(--primary);color:#fff;padding:10px 14px;text-align:left;font-size:12px;">Kategori</th>
        <th style="background:var(--primary);color:#fff;padding:10px 14px;text-align:left;font-size:12px;">Progress</th>
      </tr></thead>
      <tbody>
        ${[['Kelancaran Bacaan',r.NilaiBacaan],['Tajwid',r.NilaiTajwid],['Hafalan',r.NilaiHafalan]].map(([asp,n])=>{
          const k=getNilaiKategori(n);
          return `<tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px 14px;font-weight:600;">${asp}</td>
            <td style="padding:10px 14px;font-size:18px;font-weight:700;color:var(--primary);">${n}</td>
            <td style="padding:10px 14px;"><span class="badge ${k.cls}">${k.label}</span></td>
            <td style="padding:10px 14px;min-width:120px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;background:var(--border);border-radius:99px;height:8px;overflow:hidden;">
                  <div style="height:100%;border-radius:99px;width:${n}%;background:linear-gradient(90deg,var(--primary),var(--primary-light));"></div>
                </div>
                <span style="font-size:11px;color:var(--text-muted);">${n}%</span>
              </div>
            </td>
          </tr>`;
        }).join('')}
        <tr style="background:var(--surface2);">
          <td style="padding:10px 14px;font-weight:700;">Rata-rata</td>
          <td style="padding:10px 14px;font-size:18px;font-weight:700;color:var(--primary);">${avg}</td>
          <td style="padding:10px 14px;"><span class="badge ${kAvg.cls}">${kAvg.label}</span></td>
          <td style="padding:10px 14px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="flex:1;background:var(--border);border-radius:99px;height:8px;overflow:hidden;">
                <div style="height:100%;border-radius:99px;width:${avg}%;background:linear-gradient(90deg,var(--primary),var(--primary-light));"></div>
              </div>
              <span style="font-size:11px;color:var(--text-muted);">${avg}%</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    ${r.Catatan?`<div style="margin-bottom:16px;"><p style="font-weight:700;margin-bottom:6px;">Catatan Guru:</p><p style="font-size:13px;background:var(--surface2);padding:12px;border-radius:8px;border-left:3px solid var(--primary);">${r.Catatan}</p></div>`:''}
    ${r.Rekomendasi?`<div style="margin-bottom:16px;"><p style="font-weight:700;margin-bottom:6px;">Rekomendasi:</p><p style="font-size:13px;background:#fdf3e3;padding:12px;border-radius:8px;border-left:3px solid var(--gold);">${r.Rekomendasi}</p></div>`:''}
    <div style="margin-top:28px;display:flex;justify-content:flex-end;">
      <div style="text-align:center;min-width:160px;">
        <p style="font-size:11px;color:var(--text-muted);">Pengurus Markaz Qur'an</p>
        <div style="height:60px;"></div>
        <p style="border-top:1px solid var(--text);padding-top:6px;font-weight:600;font-size:13px;">${penguji}</p>
      </div>
    </div>`;
}
