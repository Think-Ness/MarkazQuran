import { getSantri, addSantri, updateSantri, deleteSantri } from '../api.js';
import { fmtDate, showToast, openModal, closeModal } from '../utils.js';

let allSantri=[], editMode=false, editKey=null;

export async function renderSantri(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Data Santri</h2><p>Kelola master data seluruh santri</p></div>
      <button class="btn btn-primary" id="btnAddSantri" style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tambah Santri</button>
    </div>
    <div class="card mb-16" style="margin-bottom:16px;">
      <div class="card-body" style="padding:14px 20px;">
        <div class="filter-bar">
          <div class="search-box">
            <span class="search-icon">&#128269;</span>
            <input type="text" id="srch" placeholder="Cari nama, stambuk, daerah...">
          </div>
          <select id="flKelas" style="width:140px;"><option value="">Semua Kelas</option></select>
          <select id="flStatus" style="width:130px;">
            <option value="">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Tidak Aktif">Tidak Aktif</option>
          </select>
          <button class="btn btn-outline btn-sm" id="btnRefresh" style="display:flex;align-items:center;gap:6px;height:38px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Refresh</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Daftar Santri</h3>
        <span class="text-muted" id="countLabel">-</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Stambuk</th><th>Nama</th><th>Kelas</th><th>Daerah</th><th>Rayon</th><th>Kamar</th><th>Tgl Masuk</th><th>Status</th><th style="text-align:center">Aksi</th></tr></thead>
          <tbody id="santriBody"><tr><td colspan="10" class="no-data">Memuat...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- Modal Tambah/Edit -->
    <div class="modal-overlay" id="modalSantri">
      <div class="modal">
        <div class="modal-header">
          <h3 id="modalTitle">Tambah Santri</h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalSantri').classList.remove('show')">&#10005;</button>
        </div>
        <div class="modal-body">
          <div id="formAlert"></div>
          <div class="form-grid">
            <div class="form-group"><label>Stambuk *</label><input type="number" id="fStambuk" placeholder="20240001"></div>
            <div class="form-group"><label>Status</label>
              <select id="fStatus"><option value="Aktif">Aktif</option><option value="Tidak Aktif">Tidak Aktif</option></select>
            </div>
            <div class="form-group full"><label>Nama Lengkap *</label><input type="text" id="fNama" placeholder="Nama lengkap santri"></div>
            <div class="form-group"><label>Kelas</label><input type="text" id="fKelas" placeholder="Kelas 1"></div>
            <div class="form-group"><label>Rayon</label><input type="text" id="fRayon" placeholder="Rayon A"></div>
            <div class="form-group"><label>Kamar / Ruangan</label><input type="text" id="fKamar" placeholder="Kamar 1, Ruang B, dll"></div>
            <div class="form-group"><label>Daerah Asal</label><input type="text" id="fDaerah" placeholder="Kabupaten/Kota"></div>
            <div class="form-group"><label>Tanggal Masuk</label><input type="date" id="fTanggal"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalSantri').classList.remove('show')">Batal</button>
          <button class="btn btn-primary" id="saveBtn">Simpan</button>
        </div>
      </div>
    </div>`;

  await loadSantri();

  document.getElementById('btnAddSantri').onclick = () => openAdd();
  document.getElementById('btnRefresh').onclick   = loadSantri;
  document.getElementById('srch').oninput         = filterTable;
  document.getElementById('flKelas').onchange     = filterTable;
  document.getElementById('flStatus').onchange    = filterTable;
  document.getElementById('saveBtn').onclick      = saveSantri;
}

async function loadSantri() {
  document.getElementById('santriBody').innerHTML='<tr><td colspan="9" class="no-data">Memuat...</td></tr>';
  const safeParseArr = r => Array.isArray(r) ? r : (typeof r === 'string' ? JSON.parse(r) : []);
  allSantri = await getSantri().then(safeParseArr);
  populateKelasFilter();
  renderTable(allSantri);
}

function populateKelasFilter() {
  const kelas=[...new Set(allSantri.map(s=>s.Kelas).filter(Boolean))].sort();
  document.getElementById('flKelas').innerHTML='<option value="">Semua Kelas</option>'+kelas.map(k=>`<option>${k}</option>`).join('');
}

function filterTable() {
  const q=document.getElementById('srch').value.toLowerCase();
  const kelas=document.getElementById('flKelas').value;
  const status=document.getElementById('flStatus').value;
  renderTable(allSantri.filter(s=>
    (!q||(s.Nama+s.STambuk+s.Daerah+s.Rayon).toLowerCase().includes(q))&&
    (!kelas||s.Kelas===kelas)&&(!status||s.Status===status)
  ));
}

function renderTable(data) {
  document.getElementById('countLabel').textContent=data.length+' santri';
  if(!data.length){document.getElementById('santriBody').innerHTML='<tr><td colspan="9" class="no-data">Tidak ada data</td></tr>';return;}
  document.getElementById('santriBody').innerHTML=data.map((s,i)=>`
    <tr>
      <td style="color:var(--text-muted);font-size:12px;">${i+1}</td>
      <td><code style="font-size:12px;font-weight:600;">${s.STambuk}</code></td>
      <td style="font-weight:600;">${s.Nama}</td>
      <td>${s.Kelas||'-'}</td><td>${s.Daerah||'-'}</td><td>${s.Rayon||'-'}</td><td>${s.Kamar||'-'}</td>
      <td style="font-size:12px;">${fmtDate(s.TanggalMasuk)}</td>
      <td><span class="badge badge-${s.Status==='Aktif'?'aktif':'nonaktif'}">${s.Status||'Aktif'}</span></td>
      <td>
        <div class="flex gap-8" style="justify-content:center;">
          <button class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:4px;" data-edit="${s.STambuk}"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Edit</button>
          <button class="btn btn-danger btn-sm" style="display:inline-flex;align-items:center;justify-content:center;height:24px;width:24px;" data-del="${s.STambuk}" data-nama="${s.Nama}"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
        </div>
      </td>
    </tr>`).join('');

  document.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>openEdit(btn.dataset.edit));
  document.querySelectorAll('[data-del]').forEach(btn=>btn.onclick=()=>doDelete(btn.dataset.del, btn.dataset.nama));
}

function openAdd() {
  editMode=false; editKey=null;
  document.getElementById('modalTitle').textContent='Tambah Santri';
  document.getElementById('saveBtn').textContent='Simpan';
  ['fStambuk','fNama','fKelas','fRayon','fDaerah'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fStambuk').readOnly=false;
  document.getElementById('fStatus').value='Aktif';
  document.getElementById('fTanggal').value=new Date().toISOString().slice(0,10);
  document.getElementById('fKamar').value='';
  document.getElementById('formAlert').innerHTML='';
  document.getElementById('modalSantri').classList.add('show');
}

function openEdit(stambuk) {
  const s=allSantri.find(x=>String(x.STambuk)===String(stambuk));
  if(!s) return;
  editMode=true; editKey=stambuk;
  document.getElementById('modalTitle').textContent='Edit Santri';
  document.getElementById('saveBtn').textContent='Update';
  document.getElementById('fStambuk').value=s.STambuk;
  document.getElementById('fStambuk').readOnly=true;
  document.getElementById('fNama').value=s.Nama;
  document.getElementById('fKelas').value=s.Kelas||'';
  document.getElementById('fRayon').value=s.Rayon||'';
  document.getElementById('fKamar').value=s.Kamar||'';
  document.getElementById('fDaerah').value=s.Daerah||'';
  document.getElementById('fTanggal').value=s.TanggalMasuk||'';
  document.getElementById('fStatus').value=s.Status||'Aktif';
  document.getElementById('formAlert').innerHTML='';
  document.getElementById('modalSantri').classList.add('show');
}

async function saveSantri() {
  const data={
    STambuk:document.getElementById('fStambuk').value.trim(),
    Nama:document.getElementById('fNama').value.trim(),
    Kelas:document.getElementById('fKelas').value.trim(),
    Rayon:document.getElementById('fRayon').value.trim(),
    Kamar:document.getElementById('fKamar').value.trim(),
    Daerah:document.getElementById('fDaerah').value.trim(),
    TanggalMasuk:document.getElementById('fTanggal').value,
    Status:document.getElementById('fStatus').value
  };
  if(!data.STambuk||!data.Nama){
    document.getElementById('formAlert').innerHTML='<div class="alert alert-error">Stambuk dan Nama wajib diisi.</div>';
    return;
  }
  const btn=document.getElementById('saveBtn');
  btn.textContent='Menyimpan...'; btn.disabled=true;
  const res = editMode ? await updateSantri(data) : await addSantri(data);
  btn.textContent=editMode?'Update':'Simpan'; btn.disabled=false;
  if(res.ok){
    document.getElementById('modalSantri').classList.remove('show');
    showToast(editMode?'Data santri diperbarui':'Santri berhasil ditambahkan');
    loadSantri();
  } else {
    document.getElementById('formAlert').innerHTML=`<div class="alert alert-error">${res.msg}</div>`;
  }
}

async function doDelete(stambuk, nama) {
  if(!confirm(`Hapus santri "${nama}" (${stambuk})?\nData tidak dapat dikembalikan.`)) return;
  const res=await deleteSantri(String(stambuk));
  if(res.ok){showToast('Santri berhasil dihapus');loadSantri();}
  else showToast('Gagal: '+res.msg,'error');
}
