import { getConfig, saveConfig } from '../api.js';
import { showToast } from '../utils.js';

let cfg = null;

export async function renderSetup(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Memuat konfigurasi...</p></div>`;
  const raw = await getConfig();
  cfg = typeof raw === 'string' ? JSON.parse(raw) : raw;
  render(container);
}

function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Pengaturan Sistem</h2><p>Konfigurasi lembaga, penilaian, dan indikator evaluasi</p></div>
      <button class="btn btn-primary" id="btnSimpanSemua">&#10003; Simpan Semua Pengaturan</button>
    </div>

    <!-- Identitas Lembaga -->
    <div class="setup-section">
      <div class="setup-section-header">
        <h3>&#127970; Identitas Lembaga</h3>
      </div>
      <div class="setup-section-body">
        <div class="form-grid">
          <div class="form-group full">
            <label>Nama Lembaga</label>
            <input type="text" id="cfgNama" value="${esc(cfg.namaLembaga)}" placeholder="Markaz Qur'an">
          </div>
          <div class="form-group full">
            <label>Periode Aktif (digunakan sebagai default di Rapot)</label>
            <input type="text" id="cfgPeriode" value="${esc(cfg.periodeAktif)}" placeholder="Semester 1 2024/2025">
          </div>
        </div>
      </div>
    </div>

    <!-- Rentang Nilai -->
    <div class="setup-section">
      <div class="setup-section-header">
        <h3>&#127919; Rentang Nilai &amp; Kategori</h3>
        <span class="text-muted" style="font-size:12px;">Diurutkan dari nilai tertinggi ke terendah</span>
      </div>
      <div class="setup-section-body">
        <div style="display:grid;grid-template-columns:70px 70px 1fr 1fr;gap:10px;margin-bottom:8px;padding:0 4px;">
          <span class="text-muted" style="font-size:11px;font-weight:600;">MIN</span>
          <span class="text-muted" style="font-size:11px;font-weight:600;">MAX</span>
          <span class="text-muted" style="font-size:11px;font-weight:600;">LABEL KATEGORI</span>
          <span class="text-muted" style="font-size:11px;font-weight:600;">KETERANGAN</span>
        </div>
        <div id="rentangContainer">
          ${(cfg.rentangNilai || []).map((r, i) => renderNilaiRow(r, i)).join('')}
        </div>
        <button class="btn btn-outline btn-sm mt-12" id="btnAddNilai">+ Tambah Kategori</button>
        <div class="mt-12">
          <label style="font-size:12px;font-weight:600;color:var(--text-muted);">Nilai Minimum Lulus (threshold alert "Perlu Pembinaan" di Dashboard)</label>
          <div style="display:flex;align-items:center;gap:10px;margin-top:6px;">
            <input type="number" id="cfgNilaiMin" value="${cfg.nilaiMinLulus||70}" min="0" max="100" style="width:100px;">
            <span class="text-muted">/ 100</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Indikator Checklist -->
    <div class="setup-section">
      <div class="setup-section-header">
        <h3>&#9745; Indikator Checklist Evaluasi</h3>
        <span class="text-muted" style="font-size:12px;">Maksimal 10 indikator</span>
      </div>
      <div class="setup-section-body">
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px;">
          Indikator ini digunakan di tab <strong>Checklist Evaluasi</strong> pada modul Tes Bacaan.
          Key (ID) tidak bisa diubah setelah ada data — hanya ubah Label tampilan.
        </p>
        <div id="indikatorContainer">
          ${(cfg.indikatorChecklist || []).map((ind, i) => renderIndikatorRow(ind, i)).join('')}
        </div>
        <button class="btn btn-outline btn-sm mt-12" id="btnAddInd">+ Tambah Indikator</button>
      </div>
    </div>

    <!-- Info Deploy -->
    <div class="setup-section">
      <div class="setup-section-header"><h3>&#128279; Info API & Deploy</h3></div>
      <div class="setup-section-body">
        <div class="form-group">
          <label>GAS API URL (diubah di <code>src/api.js</code>)</label>
          <input type="text" value="Lihat src/api.js baris 2" readonly style="background:var(--surface2);color:var(--text-muted);">
        </div>
        <div style="margin-top:12px;">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Inisialisasi ulang semua sheet Google Sheets (gunakan hanya saat pertama setup):</p>
          <button class="btn btn-outline btn-sm" id="btnSetupSheet">&#9881; Inisialisasi Sheet</button>
          <span id="setupResult" style="font-size:12px;color:var(--text-muted);margin-left:10px;"></span>
        </div>
      </div>
    </div>`;

  document.getElementById('btnSimpanSemua').onclick = saveAll;
  document.getElementById('btnAddNilai').onclick    = addNilaiRow;
  document.getElementById('btnAddInd').onclick      = addIndRow;
  document.getElementById('btnSetupSheet').onclick  = doSetupSheet;

  // Delete buttons (delegated)
  document.getElementById('rentangContainer').addEventListener('click', e => {
    if (e.target.dataset.delNilai !== undefined) e.target.closest('.nilai-row').remove();
  });
  document.getElementById('indikatorContainer').addEventListener('click', e => {
    if (e.target.dataset.delInd !== undefined) e.target.closest('.indikator-row').remove();
  });
}

function renderNilaiRow(r, i) {
  return `<div class="nilai-row">
    <div><label>Min</label><input type="number" class="rv-min" value="${r.min}" min="0" max="100"></div>
    <div><label>Max</label><input type="number" class="rv-max" value="${r.max}" min="0" max="100"></div>
    <div><label>Label</label><input type="text" class="rv-label" value="${esc(r.label)}" placeholder="Sangat Baik"></div>
    <div style="display:flex;align-items:flex-end;gap:8px;">
      <div style="flex:1;"><label>Keterangan</label><input type="text" class="rv-ket" value="${esc(r.ket||'')}" placeholder="Deskripsi..."></div>
      <button class="btn btn-danger btn-sm" data-del-nilai="${i}" style="margin-bottom:0;flex-shrink:0;">&#10005;</button>
    </div>
  </div>`;
}

function renderIndikatorRow(ind, i) {
  return `<div class="indikator-row">
    <span class="indikator-key">${esc(ind.key)}<input type="hidden" class="ind-key" value="${esc(ind.key)}"></span>
    <input type="text" class="ind-label" value="${esc(ind.label)}" placeholder="Nama indikator...">
    <button class="btn btn-danger btn-sm" data-del-ind="${i}">&#10005;</button>
  </div>`;
}

function addNilaiRow() {
  const cont = document.getElementById('rentangContainer');
  const div  = document.createElement('div');
  div.innerHTML = renderNilaiRow({min:0,max:100,label:'',ket:''}, Date.now());
  cont.appendChild(div.firstElementChild);
}

function addIndRow() {
  const cont  = document.getElementById('indikatorContainer');
  const i     = cont.children.length;
  const key   = 'Indikator'+(i+1);
  const div   = document.createElement('div');
  div.innerHTML = renderIndikatorRow({key, label:''}, i);
  cont.appendChild(div.firstElementChild);
}

function collectConfig() {
  // Rentang nilai
  const rentangNilai = [];
  document.querySelectorAll('#rentangContainer .nilai-row').forEach(row => {
    rentangNilai.push({
      min  : Number(row.querySelector('.rv-min').value),
      max  : Number(row.querySelector('.rv-max').value),
      label: row.querySelector('.rv-label').value.trim(),
      ket  : row.querySelector('.rv-ket').value.trim()
    });
  });
  // Indikator
  const indikatorChecklist = [];
  document.querySelectorAll('#indikatorContainer .indikator-row').forEach(row => {
    indikatorChecklist.push({
      key  : row.querySelector('.ind-key').value,
      label: row.querySelector('.ind-label').value.trim()
    });
  });
  return {
    namaLembaga       : document.getElementById('cfgNama').value.trim(),
    periodeAktif      : document.getElementById('cfgPeriode').value.trim(),
    nilaiMinLulus     : Number(document.getElementById('cfgNilaiMin').value),
    rentangNilai,
    indikatorChecklist
  };
}

async function saveAll() {
  const btn = document.getElementById('btnSimpanSemua');
  btn.textContent = 'Menyimpan...'; btn.disabled = true;
  const data = collectConfig();
  const res  = await saveConfig(data);
  btn.textContent = '✓ Simpan Semua Pengaturan'; btn.disabled = false;
  if (res.ok) {
    cfg = data;
    showToast('Pengaturan berhasil disimpan');
  } else {
    showToast('Gagal: ' + res.msg, 'error');
  }
}

async function doSetupSheet() {
  const btn = document.getElementById('btnSetupSheet');
  btn.textContent = 'Memproses...'; btn.disabled = true;
  const { api } = await import('../api.js');
  const res = await api('setupSpreadsheet');
  btn.textContent = '⚙ Inisialisasi Sheet'; btn.disabled = false;
  document.getElementById('setupResult').textContent = res.ok ? '✓ Semua sheet berhasil dibuat!' : '✗ Gagal: ' + (res.msg||'');
}

function esc(s) { return String(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
