/**
 * TES BACAAN - REDESIGNED WITH PROPER WORKFLOW
 * Pre Test → Post Test → Remedial → Lulus
 *
 * Features:
 * - Dynamic button states (Pre Test / Lanjut Post Test / Edit)
 * - Complete data capture (Penguji, Surah)
 * - Clear status indicators
 * - Remedial tracking
 */

import { getTesBacaan, addTesBacaan, getSantri, getGuru, getSurahList, getSesiUjian, getTestWorkflowStatus } from '../api.js';
import { getNilaiKategori, fmtDate, showToast } from '../utils.js';

let allSantri = [], allGuru = [], allSurah = [], allTes = [], allSesi = [];
let activeTab = 'santri-list', currentSantriId = null, currentWorkflowStatus = null;

export async function renderTesBacaan(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Monitoring & Input Tes Bacaan</h2><p>Alur: Pre Test → Post Test → Lulus/Remedial</p></div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn active" data-tab="santri-list">📋 Daftar Santri</button>
      <button class="tab-btn" data-tab="riwayat">📊 Riwayat Tes</button>
      <button class="tab-btn" data-tab="rekap-remedial">🔄 Rekap Remedial</button>
    </div>

    <!-- TAB 1: DAFTAR SANTRI DENGAN WORKFLOW -->
    <div id="tab-santri-list">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div class="filter-bar">
            <div class="search-box"><span class="search-icon">🔍</span>
              <input type="text" id="srchSantri" placeholder="Cari stambuk / nama santri...">
            </div>
            <select id="filterStatus" style="width:150px;">
              <option value="">Semua Status Tes</option>
              <option value="belum">Belum Tes</option>
              <option value="pretest_done">Pre Test ✓</option>
              <option value="remedial">Remedial</option>
              <option value="lulus">Lulus ✓</option>
            </select>
            <button class="btn btn-outline btn-sm" id="btnRefresh" style="display:flex;align-items:center;gap:6px;">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Status Tes Per Santri</h3><span id="countSantri" class="text-muted">-</span></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stambuk</th>
                <th>Nama</th>
                <th>Kelas</th>
                <th style="text-align:center;">Status Tes</th>
                <th style="text-align:center;">Pre Test</th>
                <th style="text-align:center;">Post Test</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="santriTable">
              <tr><td colspan="7" class="no-data">Memuat...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: RIWAYAT TES -->
    <div id="tab-riwayat" style="display:none;">
      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div class="filter-bar">
            <div class="search-box"><span class="search-icon">🔍</span>
              <input type="text" id="srchRiwayat" placeholder="Cari peserta...">
            </div>
            <select id="filterJenis" style="width:140px;">
              <option value="">Semua Jenis</option>
              <option value="Pre Test">Pre Test</option>
              <option value="Post Test">Post Test</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Riwayat Tes Detail</h3><span id="countRiwayat" class="text-muted">-</span></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Peserta</th>
                <th>Jenis</th>
                <th>Tanggal</th>
                <th>Penguji</th>
                <th>Surah</th>
                <th>Nilai</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="riwayatBody">
              <tr><td colspan="8" class="no-data">Memuat...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: REKAP REMEDIAL -->
    <div id="tab-rekap-remedial" style="display:none;">
      <div class="card mb-16">
        <div class="card-header"><h3>Daftar Santri Remedial</h3></div>
        <div id="remedialStats" class="stat-grid" style="margin-bottom:16px;"></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Santri yang Perlu Remedial</h3><span id="countRemedial" class="text-muted">-</span></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stambuk</th>
                <th>Nama</th>
                <th>Nilai Post Test</th>
                <th>Status</th>
                <th>Remedial ke-</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="remedialBody">
              <tr><td colspan="6" class="no-data">Memuat...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL: INPUT TES DENGAN WORKFLOW -->
    <div class="modal-overlay" id="modalTes">
      <div class="modal modal-lg" style="max-width:700px;">
        <div class="modal-header">
          <div>
            <h3 id="modalTitle">Input Tes Bacaan</h3>
            <p id="modalSubtitle" style="font-size:12px;color:#64748b;margin-top:4px;"></p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="closeTesModal()">✕</button>
        </div>
        <div class="modal-body" id="modalBody">
          <!-- Content akan di-generate via JS -->
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeTesModal()">Batal</button>
          <button class="btn btn-primary" id="btnSaveTes">Simpan Tes</button>
        </div>
      </div>
    </div>

    <!-- MODAL: VIEW TEST HISTORY -->
    <div class="modal-overlay" id="modalHistory">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>Riwayat Tes - <span id="historyName"></span></h3>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalHistory').classList.remove('show')">✕</button>
        </div>
        <div class="modal-body" id="historyBody">
          <!-- Generated via JS -->
        </div>
      </div>
    </div>
  `;

  await loadAllData();

  // Setup tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  // Setup button handlers
  document.getElementById('btnRefresh').onclick = loadAllData;
  document.getElementById('srchSantri').oninput = renderSantriTable;
  document.getElementById('filterStatus').onchange = renderSantriTable;
  document.getElementById('srchRiwayat').oninput = renderRiwayatTable;
  document.getElementById('filterJenis').onchange = renderRiwayatTable;

  // Set initial tab
  switchTab('santri-list');
}

async function loadAllData() {
  const parse = d => Array.isArray(d) ? d : (typeof d === 'string' ? JSON.parse(d) : []);
  [allSantri, allGuru, allSurah, allTes, allSesi] = await Promise.all([
    (await import('../api.js')).getSantri().then(parse),
    (await import('../api.js')).getGuru().then(parse),
    (await import('../api.js')).getSurahList().then(parse),
    (await import('../api.js')).getTesBacaan().then(parse),
    (await import('../api.js')).getSesiUjian().then(parse)
  ]);

  renderSantriTable();
  renderRiwayatTable();
  renderRemedialTab();
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.style.display = 'none');
  document.getElementById(`tab-${tab}`).style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
}

async function renderSantriTable() {
  const q = document.getElementById('srchSantri').value.toLowerCase();
  const statusFilter = document.getElementById('filterStatus').value;

  let filtered = allSantri.filter(s => {
    const matches = !q || (s.STambuk + s.Nama).toLowerCase().includes(q);
    if (!statusFilter) return matches;

    const status = currentWorkflowStatus?.[s.STambuk]?.status || 'belum';
    return matches && status === statusFilter;
  });

  document.getElementById('countSantri').textContent = `${filtered.length} santri`;

  const rows = await Promise.all(filtered.map(async (s) => {
    const status = await getWorkflowStatus(s.STambuk);
    currentWorkflowStatus = currentWorkflowStatus || {};
    currentWorkflowStatus[s.STambuk] = status;

    const preTest = status.preTestData;
    const postTest = status.postTestData;

    const badgeClass = status.status === 'lulus' ? 'badge-sb' :
                       status.status === 'remedial' ? 'badge-pb' : 'badge-b';

    let actionBtn = '';
    if (status.canPreTest) {
      actionBtn = `<button class="btn btn-primary btn-sm" onclick="openTesModal('${s.STambuk}', 'Pre Test')">▶ Pre Test</button>`;
    } else if (status.canPostTest) {
      actionBtn = `<button class="btn btn-success btn-sm" onclick="openTesModal('${s.STambuk}', 'Post Test')">▶ Lanjut Post Test</button>`;
    } else {
      actionBtn = `<span class="badge badge-sb">✓ Selesai</span>`;
    }

    return `
      <tr>
        <td style="font-weight:600;">${s.STambuk}</td>
        <td>${s.Nama}</td>
        <td>${s.Kelas || '-'}</td>
        <td style="text-align:center;"><span class="badge ${badgeClass}">${status.display}</span></td>
        <td style="text-align:center;">${preTest ? `<span style="color:#16a34a;font-weight:700;">${preTest.NilaiAkhir}</span>` : '<span style="color:#94a3b8;">-</span>'}</td>
        <td style="text-align:center;">${postTest ? `<span style="font-weight:700;">${postTest.NilaiAkhir}</span>` : '<span style="color:#94a3b8;">-</span>'}</td>
        <td style="display:flex;gap:6px;">
          ${actionBtn}
          <button class="btn btn-outline btn-sm" onclick="openHistoryModal('${s.STambuk}', '${s.Nama}')">📋 Riwayat</button>
        </td>
      </tr>
    `;
  }));

  document.getElementById('santriTable').innerHTML = rows.length ? rows.join('') :
    '<tr><td colspan="7" class="no-data">Tidak ada data</td></tr>';
}

window.openTesModal = async (stambuk, jenisTes) => {
  const santri = allSantri.find(s => s.STambuk === stambuk);
  if (!santri) return;

  currentSantriId = stambuk;
  const status = await getWorkflowStatus(stambuk);

  // Set title
  document.getElementById('modalTitle').textContent = `Input ${jenisTes} - ${santri.Nama}`;
  document.getElementById('modalSubtitle').textContent = `ID: ${stambuk} | Kelas: ${santri.Kelas}`;

  // Build form
  let html = `
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px;margin-bottom:16px;border-radius:4px;">
      <strong style="color:#16a34a;">💡 Alur Tes:</strong>
      <div style="font-size:12px;color:#166534;margin-top:6px;">
        Pre Test ▶ Post Test ▶ ${status.postTestData?.NilaiAkhir >= 70 ? 'Lulus' : 'Remedial/Ulangi'}
      </div>
    </div>

    <div class="form-grid">
      <div class="form-group full">
        <label>Jenis Tes</label>
        <input type="text" value="${jenisTes}" readonly style="background:#f1f5f9;font-weight:600;">
      </div>

      <div class="form-group full">
        <label>⚠ PENGUJI (Nama Guru) *</label>
        <select id="tPenguji" style="border:2px solid #fca5a5;">
          <option value="">-- Pilih Penguji --</option>
          ${allGuru.filter(g => g.Status === 'Aktif').map(g => `<option value="${g.Nama}">${g.Nama}</option>`).join('')}
        </select>
        <div style="font-size:11px;color:#dc2626;margin-top:4px;">⚠ WAJIB diisi - jangan sampai kosong!</div>
      </div>

      <div class="form-group full">
        <label>⚠ SURAH (Materi Tes) *</label>
        <select id="tSurah" style="border:2px solid #fca5a5;">
          <option value="">-- Pilih Surah --</option>
          ${allSurah.map(s => `<option value="${s.nama}" data-no="${s.no}">${s.no}. ${s.nama}</option>`).join('')}
        </select>
        <div style="font-size:11px;color:#dc2626;margin-top:4px;">⚠ WAJIB diisi - jangan sampai kosong!</div>
      </div>

      <div class="form-group">
        <label>Tanggal Tes</label>
        <input type="date" id="tTanggal" value="${new Date().toISOString().split('T')[0]}">
      </div>

      <div class="form-group">
        <label>Halaman / Ayat (Opsional)</label>
        <input type="text" id="tHalaman" placeholder="Cth: 1-15">
      </div>
    </div>

    <div style="border:1px solid #cbd5e1;border-radius:8px;padding:14px;margin:16px 0;background:#f8fafc;">
      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:12px;">📋 Indikator Penilaian (Catat Jumlah Kesalahan)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${[
          'Kelancaran', 'Makharij Huruf', 'Sifat Huruf', "Mad Thabi'i", 'Mad Lebih 2 Harakat',
          'Dengungan', 'Waqf & Ibtida', 'Gharib', 'Keindahan', 'Lain-lain'
        ].map((ind, i) => `
          <div class="form-group">
            <label style="font-size:11px;">${i+1}. ${ind}</label>
            <input type="number" id="tInd${i+1}" value="0" min="0" oninput="calcTesScore()">
          </div>
        `).join('')}
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;background:#e2e8f0;padding:14px;border-radius:6px;margin-bottom:16px;">
      <strong>Nilai Akhir (Otomatis):</strong>
      <span id="tNilaiAkhir" style="font-size:28px;font-weight:700;color:#1b6b4a;">100</span>
    </div>

    <div class="form-group full">
      <label>Catatan / Observasi (Opsional)</label>
      <textarea id="tCatatan" placeholder="Masukkan catatan evaluasi..." style="min-height:80px;"></textarea>
    </div>
  `;

  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('btnSaveTes').onclick = saveTes;
  document.getElementById('modalTes').classList.add('show');

  // Setup event listener untuk auto-calculate
  for (let i = 1; i <= 10; i++) {
    document.getElementById(`tInd${i}`).oninput = window.calcTesScore;
  }

  calcTesScore();
};

window.calcTesScore = () => {
  let totalErrors = 0;
  for (let i = 1; i <= 10; i++) {
    totalErrors += Number(document.getElementById(`tInd${i}`).value) || 0;
  }
  const nilai = Math.max(0, 100 - (totalErrors * 2));
  document.getElementById('tNilaiAkhir').textContent = nilai;
};

async function saveTes() {
  // Validate required fields
  const penguji = document.getElementById('tPenguji').value;
  const surah = document.getElementById('tSurah').value;
  const tanggal = document.getElementById('tTanggal').value;

  if (!penguji) {
    showToast('⚠ Penguji HARUS diisi!', 'error');
    return;
  }
  if (!surah) {
    showToast('⚠ Surah HARUS diisi!', 'error');
    return;
  }

  const btn = document.getElementById('btnSaveTes');
  btn.disabled = true;
  btn.innerText = 'Menyimpan...';

  // Get jenis from button context (from modal title)
  const modalTitle = document.getElementById('modalTitle').textContent;
  const jenisTes = modalTitle.includes('Pre Test') ? 'Pre Test' : 'Post Test';

  const payload = {
    TipePeserta: 'Santri',
    PesertaID: currentSantriId,
    IDPenguji: penguji,
    Tanggal: tanggal,
    NamaSurah: surah,
    Halaman: document.getElementById('tHalaman').value,
    JenisTes: jenisTes,
    Ind1: Number(document.getElementById('tInd1').value) || 0,
    Ind2: Number(document.getElementById('tInd2').value) || 0,
    Ind3: Number(document.getElementById('tInd3').value) || 0,
    Ind4: Number(document.getElementById('tInd4').value) || 0,
    Ind5: Number(document.getElementById('tInd5').value) || 0,
    Ind6: Number(document.getElementById('tInd6').value) || 0,
    Ind7: Number(document.getElementById('tInd7').value) || 0,
    Ind8: Number(document.getElementById('tInd8').value) || 0,
    Ind9: Number(document.getElementById('tInd9').value) || 0,
    Ind10: Number(document.getElementById('tInd10').value) || 0,
    Catatan: document.getElementById('tCatatan').value
  };

  const res = await (await import('../api.js')).addTesBacaan(payload);
  btn.disabled = false;
  btn.innerText = 'Simpan Tes';

  if (res.ok) {
    showToast(`✓ ${jenisTes} disimpan! Nilai: ${res.nilaiAkhir}`);
    closeTesModal();
    await loadAllData();
  } else {
    showToast(res.msg || 'Gagal menyimpan tes', 'error');
  }
}

window.closeTesModal = () => {
  document.getElementById('modalTes').classList.remove('show');
  currentSantriId = null;
};

async function getWorkflowStatus(stambuk) {
  const res = await (await import('../api.js')).getTestWorkflowStatus(stambuk);
  return res.ok === false ? { status: 'error', display: 'Error' } : res;
}

function renderRiwayatTable() {
  const q = document.getElementById('srchRiwayat').value.toLowerCase();
  const jenisFilter = document.getElementById('filterJenis').value;

  let filtered = allTes.filter(t => {
    const santri = allSantri.find(s => s.STambuk === t.PesertaID);
    const matches = !q || (t.PesertaID + (santri?.Nama || '')).toLowerCase().includes(q);
    return matches && (!jenisFilter || t.JenisTes === jenisFilter);
  }).sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

  document.getElementById('countRiwayat').textContent = `${filtered.length} tes`;

  const rows = filtered.map((t, i) => {
    const k = getNilaiKategori(t.NilaiAkhir || 0);
    return `
      <tr>
        <td>${i+1}</td>
        <td><strong>${t.PesertaID}</strong></td>
        <td><span class="badge ${t.JenisTes === 'Pre Test' ? 'badge-pretest' : 'badge-posttest'}">${t.JenisTes}</span></td>
        <td>${fmtDate(t.Tanggal)}</td>
        <td>${t.IDPenguji || '-'}</td>
        <td>${t.NamaSurah || '-'}</td>
        <td><strong style="color:${t.NilaiAkhir >= 70 ? '#16a34a' : '#dc2626'}">${t.NilaiAkhir || '-'}</strong> <span class="badge ${k.cls}" style="font-size:10px;">${k.label}</span></td>
        <td>
          <button class="btn btn-outline btn-xs" onclick="openHistoryModal('${t.PesertaID}')">Detail</button>
        </td>
      </tr>
    `;
  });

  document.getElementById('riwayatBody').innerHTML = rows.length ? rows.join('') :
    '<tr><td colspan="8" class="no-data">Tidak ada data</td></tr>';
}

window.openHistoryModal = (stambuk, nama) => {
  const santri = allSantri.find(s => s.STambuk === stambuk);
  const tesHistory = allTes.filter(t => t.PesertaID === stambuk).sort((a,b) => new Date(b.Tanggal) - new Date(a.Tanggal));

  document.getElementById('historyName').textContent = nama || santri?.Nama || stambuk;

  let html = tesHistory.length ? tesHistory.map(t => {
    const k = getNilaiKategori(t.NilaiAkhir || 0);
    return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="font-size:14px;">${t.JenisTes}</strong>
          <span class="badge ${k.cls}">${k.label}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;margin-bottom:8px;">
          <div><span style="color:#64748b;">Tanggal:</span> ${fmtDate(t.Tanggal)}</div>
          <div><span style="color:#64748b;">Penguji:</span> ${t.IDPenguji || '-'}</div>
          <div><span style="color:#64748b;">Surah:</span> ${t.NamaSurah || '-'}</div>
          <div><span style="color:#64748b;">Nilai:</span> <strong style="font-size:16px;">${t.NilaiAkhir}</strong></div>
        </div>
        ${t.Catatan ? `<div style="background:#f1f5f9;padding:8px;border-radius:4px;font-size:11px;"><strong>Catatan:</strong> ${t.Catatan}</div>` : ''}
      </div>
    `;
  }).join('') : '<p class="no-data">Belum ada riwayat tes</p>';

  document.getElementById('historyBody').innerHTML = html;
  document.getElementById('modalHistory').classList.add('show');
};

function renderRemedialTab() {
  const remedialCases = allTes.filter(t => {
    const postTests = allTes.filter(x => x.PesertaID === t.PesertaID && x.JenisTes === 'Post Test');
    const latest = postTests[0];
    return latest && Number(latest.NilaiAkhir) < 70;
  });

  const unique = [...new Set(remedialCases.map(t => t.PesertaID))];
  document.getElementById('countRemedial').textContent = `${unique.length} santri`;

  const rows = unique.map(stambuk => {
    const santri = allSantri.find(s => s.STambuk === stambuk);
    const postTests = allTes.filter(t => t.PesertaID === stambuk && t.JenisTes === 'Post Test').sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));
    const latest = postTests[0];
    const remCount = postTests.length - 1;

    return `
      <tr>
        <td><strong>${stambuk}</strong></td>
        <td>${santri?.Nama || '-'}</td>
        <td><span style="color:#dc2626;font-weight:700;">${latest?.NilaiAkhir || '-'}</span></td>
        <td><span class="badge badge-pb">Remedial</span></td>
        <td>${remCount}</td>
        <td><button class="btn btn-primary btn-sm" onclick="openTesModal('${stambuk}', 'Post Test')">▶ Remedial</button></td>
      </tr>
    `;
  });

  document.getElementById('remedialBody').innerHTML = rows.length ? rows.join('') :
    '<tr><td colspan="6" class="no-data">Tidak ada kasus remedial</td></tr>';

  // Stats
  const stats = [
    { label: 'Sudah Tes', nilai: allTes.filter(t => t.JenisTes === 'Pre Test').length, icon: '✓' },
    { label: 'Lanjut Post', nilai: allTes.filter(t => t.JenisTes === 'Post Test').length, icon: '▶' },
    { label: 'Remedial', nilai: unique.length, icon: '🔄' }
  ];

  document.getElementById('remedialStats').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="background:#fbbf24;color:#fff;font-size:18px;">${s.icon}</div>
      <div><div class="stat-label">${s.label}</div><div class="stat-value">${s.nilai}</div></div>
    </div>
  `).join('');
}
