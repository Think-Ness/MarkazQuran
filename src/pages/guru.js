import { getGuru, addGuru, updateGuru, deleteGuru } from '../api.js';
import { showToast } from '../utils.js';

let allGuru=[], editMode=false;

export async function renderGuru(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Data Guru</h2><p>Kelola master data guru / penguji</p></div>
      <button class="btn btn-primary" id="btnAdd">+ Tambah Guru</button>
    </div>
    <div class="card mb-16" style="margin-bottom:16px;">
      <div class="card-body" style="padding:14px 20px;">
        <div class="filter-bar">
          <div class="search-box"><span class="search-icon">&#128269;</span>
            <input type="text" id="srch" placeholder="Cari nama, ID, bagian...">
          </div>
          <select id="flStatus" style="width:140px;">
            <option value="">Semua Status</option><option value="Aktif">Aktif</option><option value="Tidak Aktif">Tidak Aktif</option>
          </select>
          <button class="btn btn-outline btn-sm" id="btnRefresh">&#8635; Refresh</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Daftar Guru</h3><span class="text-muted" id="countLabel">-</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>ID Guru</th><th>Nama</th><th>Tahun</th><th>Kamar/Bagian</th><th>Status</th><th style="text-align:center">Aksi</th></tr></thead>
          <tbody id="guruBody"><tr><td colspan="7" class="no-data">Memuat...</td></tr></tbody>
        </table>
      </div>
    </div>

    <div class="modal-overlay" id="modalGuru">
      <div class="modal">
        <div class="modal-header">
          <h3 id="modalTitle">Tambah Guru</h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalGuru').classList.remove('show')">&#10005;</button>
        </div>
        <div class="modal-body">
          <div id="formAlert"></div>
          <div class="form-grid">
            <div class="form-group"><label>ID Guru *</label><input type="text" id="fID" placeholder="GR-001"></div>
            <div class="form-group"><label>Status</label>
              <select id="fStatus"><option value="Aktif">Aktif</option><option value="Tidak Aktif">Tidak Aktif</option></select>
            </div>
            <div class="form-group full"><label>Nama Lengkap *</label><input type="text" id="fNama" placeholder="Nama lengkap guru"></div>
            <div class="form-group"><label>Tahun Mulai Mengajar</label><input type="number" id="fTahun" placeholder="2022" min="2000" max="2099"></div>
            <div class="form-group"><label>Kamar / Bagian</label><input type="text" id="fKamar" placeholder="Kamar A / Tahfidz"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalGuru').classList.remove('show')">Batal</button>
          <button class="btn btn-primary" id="saveBtn">Simpan</button>
        </div>
      </div>
    </div>`;

  await loadGuru();
  document.getElementById('btnAdd').onclick    = openAdd;
  document.getElementById('btnRefresh').onclick= loadGuru;
  document.getElementById('srch').oninput      = filterTable;
  document.getElementById('flStatus').onchange = filterTable;
  document.getElementById('saveBtn').onclick   = saveGuru;
}

async function loadGuru() {
  document.getElementById('guruBody').innerHTML='<tr><td colspan="7" class="no-data">Memuat...</td></tr>';
  const safeParseArr = r => Array.isArray(r) ? r : (typeof r === 'string' ? JSON.parse(r) : []);
  allGuru = await getGuru().then(safeParseArr);
  renderTable(allGuru);
}

function filterTable() {
  const q=document.getElementById('srch').value.toLowerCase();
  const st=document.getElementById('flStatus').value;
  renderTable(allGuru.filter(g=>(!q||(g.Nama+g.IDGuru+g.KamarBagian).toLowerCase().includes(q))&&(!st||g.Status===st)));
}

function renderTable(data) {
  document.getElementById('countLabel').textContent=data.length+' guru';
  if(!data.length){document.getElementById('guruBody').innerHTML='<tr><td colspan="7" class="no-data">Tidak ada data</td></tr>';return;}
  document.getElementById('guruBody').innerHTML=data.map((g,i)=>`
    <tr>
      <td style="color:var(--text-muted);font-size:12px;">${i+1}</td>
      <td><code style="font-size:12px;font-weight:600;">${g.IDGuru}</code></td>
      <td style="font-weight:600;">${g.Nama}</td>
      <td>${g.Tahun||'-'}</td><td>${g.KamarBagian||'-'}</td>
      <td><span class="badge badge-${g.Status==='Aktif'?'aktif':'nonaktif'}">${g.Status||'Aktif'}</span></td>
      <td>
        <div class="flex gap-8" style="justify-content:center;">
          <button class="btn btn-outline btn-sm" data-edit="${g.IDGuru}">&#9998; Edit</button>
          <button class="btn btn-danger  btn-sm" data-del="${g.IDGuru}" data-nama="${g.Nama}">&#128465;</button>
        </div>
      </td>
    </tr>`).join('');
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEdit(b.dataset.edit));
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>doDelete(b.dataset.del,b.dataset.nama));
}

function openAdd() {
  editMode=false;
  document.getElementById('modalTitle').textContent='Tambah Guru';
  document.getElementById('saveBtn').textContent='Simpan';
  document.getElementById('fID').value='GR-'+String(allGuru.length+1).padStart(3,'0');
  document.getElementById('fID').readOnly=false;
  ['fNama','fTahun','fKamar'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fStatus').value='Aktif';
  document.getElementById('formAlert').innerHTML='';
  document.getElementById('modalGuru').classList.add('show');
}

function openEdit(id) {
  const g=allGuru.find(x=>x.IDGuru===id);
  if(!g) return;
  editMode=true;
  document.getElementById('modalTitle').textContent='Edit Guru';
  document.getElementById('saveBtn').textContent='Update';
  document.getElementById('fID').value=g.IDGuru; document.getElementById('fID').readOnly=true;
  document.getElementById('fNama').value=g.Nama;
  document.getElementById('fTahun').value=g.Tahun||'';
  document.getElementById('fKamar').value=g.KamarBagian||'';
  document.getElementById('fStatus').value=g.Status||'Aktif';
  document.getElementById('formAlert').innerHTML='';
  document.getElementById('modalGuru').classList.add('show');
}

async function saveGuru() {
  const data={IDGuru:document.getElementById('fID').value.trim(),Nama:document.getElementById('fNama').value.trim(),Tahun:document.getElementById('fTahun').value,KamarBagian:document.getElementById('fKamar').value.trim(),Status:document.getElementById('fStatus').value};
  if(!data.IDGuru||!data.Nama){document.getElementById('formAlert').innerHTML='<div class="alert alert-error">ID dan Nama wajib diisi.</div>';return;}
  const btn=document.getElementById('saveBtn'); btn.textContent='Menyimpan...'; btn.disabled=true;
  const res=editMode?await updateGuru(data):await addGuru(data);
  btn.textContent=editMode?'Update':'Simpan'; btn.disabled=false;
  if(res.ok){document.getElementById('modalGuru').classList.remove('show');showToast(editMode?'Guru diperbarui':'Guru ditambahkan');loadGuru();}
  else document.getElementById('formAlert').innerHTML=`<div class="alert alert-error">${res.msg}</div>`;
}

async function doDelete(id,nama) {
  if(!confirm(`Hapus guru "${nama}"?`)) return;
  const res=await deleteGuru(id);
  if(res.ok){showToast('Guru dihapus');loadGuru();}
  else showToast('Gagal: '+res.msg,'error');
}
