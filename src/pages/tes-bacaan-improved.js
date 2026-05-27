/**
 * Tes Bacaan — READ-ONLY HISTORY VIEW
 * Semua alur penilaian (Pre Test, Post Test, Remedial) dilakukan melalui Sesi Ujian.
 */

import { fmtDate, getNilaiKategori } from '../utils.js';
import { dataStore } from '../datastore.js';
import { ColumnFilter } from '../components/column-filter.js';

let tbSortCol = null, tbSortDir = 'asc';
let tbColFilter = null;

export async function renderTesBacaan(container) {
  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
      <div>
        <h2 style="font-size:24px;color:#0f172a;margin:0 0 4px;">Monitoring Tes Bacaan & Evaluasi</h2>
        <p style="color:#64748b;font-size:14px;margin:0;">Pre Test, Post Test & Rekap Remedial Terintegrasi</p>
      </div>
      <button class="btn btn-primary" onclick="window.navigate('sesi-ujian')" style="display:flex;align-items:center;gap:6px;background:#1b6b4a;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Input Tes Evaluasi
      </button>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:4px;border-bottom:2px solid #e2e8f0;margin-bottom:20px;">
      <button class="tab-btn active" data-tab="rekap" onclick="switchTabTB('rekap')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:700;font-size:13px;color:#fff;background:#1b6b4a;border-radius:8px 8px 0 0;">Riwayat Tes</button>
      <button class="tab-btn" data-tab="remedial" onclick="switchTabTB('remedial')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:600;font-size:13px;color:#64748b;border-radius:8px 8px 0 0;">Rekap Remedial</button>
    </div>

    <!-- Tab: Rekap Grouped -->
    <div id="tab-rekap">
      <div class="card" style="margin-bottom:16px;">
        <div class="card-body" style="padding:12px 16px;">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
            <div class="search-box" style="flex:1;min-width:200px;">
              <span class="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#64748b;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </span>
              <input type="text" id="srchRekap" placeholder="Cari ID peserta / surah..." oninput="renderRekap()">
            </div>
            <select id="filterJenisPeserta" onchange="renderRekap()" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;background:#f8fafc;color:#334155;">
              <option value="">Santri & Guru</option>
              <option value="Santri">Santri Saja</option>
              <option value="Guru">Guru Saja</option>
            </select>
            <button class="btn btn-outline btn-sm" onclick="renderRekap()" style="height:36px;width:36px;display:flex;align-items:center;justify-content:center;padding:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #f1f5f9;">
          <h3 style="margin:0;font-size:15px;color:#334155;">Riwayat Tes Evaluasi</h3>
          <span id="countRekap" style="font-size:12px;color:#64748b;">0 peserta (0 data tes)</span>
        </div>
        <div class="table-wrap">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
              <th class="sortable-th" data-tbsort="no" style="padding:12px 16px;text-align:left;cursor:pointer;user-select:none;"># <span class="sort-icon"></span></th>
              <th class="sortable-th" data-tbsort="peserta" style="padding:12px 16px;text-align:left;cursor:pointer;user-select:none;">PESERTA & PENGUJI TERAKHIR <span class="sort-icon"></span></th>
              <th class="sortable-th" data-tbsort="materi" style="padding:12px 16px;text-align:center;cursor:pointer;user-select:none;">MATERI TERAKHIR <span class="sort-icon"></span></th>
              <th class="sortable-th" data-tbsort="tanggal" style="padding:12px 16px;text-align:center;cursor:pointer;user-select:none;">TGL & JENIS TERAKHIR <span class="sort-icon"></span></th>
              <th class="sortable-th" data-tbsort="nilai" style="padding:12px 16px;text-align:center;cursor:pointer;user-select:none;">NILAI TERAKHIR <span class="sort-icon"></span></th>
              <th style="padding:12px 16px;text-align:right;">AKSI</th>
            </tr></thead>
            <tbody id="rekapBody"><tr><td colspan="6" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Progress View -->
    <div class="card" id="progressSectionTB" style="display:none;margin-top:20px;">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
        <h3 id="progressTitleTB">Progress Tes — Santri</h3>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('progressSectionTB').style.display='none'">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> Tutup
        </button>
      </div>
      <div class="card-body" id="progressBodyTB" style="padding:0;"></div>
    </div>

    <!-- Tab: Remedial -->
    <div id="tab-remedial" style="display:none;">
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:16px;">
        <strong style="color:#92400e;display:flex;align-items:center;gap:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          Daftar Peserta Remedial
        </strong>
        <p style="color:#b45309;font-size:12px;margin:4px 0 0 22px;">Nilai Post Test &lt; 70. Lakukan Ulang Post Test di menu Sesi Ujian.</p>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
              <th style="padding:12px 16px;text-align:left;">ID Peserta</th>
              <th style="padding:12px 16px;text-align:left;">Nama</th>
              <th style="padding:12px 16px;text-align:center;">Sesi</th>
              <th style="padding:12px 16px;text-align:center;">Nilai Terakhir</th>
              <th style="padding:12px 16px;text-align:center;">Percobaan</th>
              <th style="padding:12px 16px;text-align:right;">Aksi</th>
            </tr></thead>
            <tbody id="remedialBody"><tr><td colspan="6" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  dataStore.subscribe('tesBacaan', () => { renderRekap(); renderRemedial(); });
  dataStore.subscribe('santri', renderRekap);

  renderRekap();
  renderRemedial();

  // Sortable headers for tes bacaan
  setTimeout(() => {
    document.querySelectorAll('.sortable-th[data-tbsort]').forEach(th => {
      th.onclick = () => {
        const col = th.dataset.tbsort;
        if (tbSortCol === col) tbSortDir = tbSortDir === 'asc' ? 'desc' : 'asc';
        else { tbSortCol = col; tbSortDir = 'asc'; }
        document.querySelectorAll('.sortable-th[data-tbsort] .sort-icon').forEach(ic => { ic.innerHTML = ''; });
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.innerHTML = tbSortDir === 'asc'
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
        renderRekap();
      };
    });

    // Column filters for tes bacaan
    tbColFilter = new ColumnFilter({
      onFilter: () => renderRekap(),
      getValues: (colKey) => {
        const allTes = dataStore.get('tesBacaan');
        const grouped = {};
        allTes.forEach(t => {
          if (!grouped[t.PesertaID]) grouped[t.PesertaID] = { tipe: t.TipePeserta || 'Santri', tests: [] };
          grouped[t.PesertaID].tests.push(t);
        });
        return Object.entries(grouped).map(([id, data]) => {
          const p = resolvePeserta(id, data.tipe);
          switch (colKey) {
            case 'peserta': return p.nama;
            default: return id;
          }
        });
      }
    });
    const pesertaTh = document.querySelector('.sortable-th[data-tbsort="peserta"]');
    if (pesertaTh) tbColFilter.attach(pesertaTh, 'peserta');
  }, 100);
}

window.switchTabTB = (tab) => {
  ['rekap','remedial'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.tab-btn').forEach(b => {
    const isActive = b.dataset.tab === tab;
    b.style.color       = isActive ? '#fff' : '#64748b';
    b.style.background  = isActive ? '#1b6b4a' : 'transparent';
    b.classList.toggle('active', isActive);
  });
};

function resolvePeserta(id, tipePeserta) {
  if (tipePeserta === 'Guru') {
    const g = dataStore.get('guru').find(x => String(x.IDGuru) === String(id) || x.Nama === id);
    return g ? { nama: g.Nama, sub: 'Guru', isGuru: true } : { nama: id, sub: 'Guru', isGuru: true };
  } else {
    const s = dataStore.get('santri').find(x => String(x.STambuk) === String(id));
    return s ? { nama: s.Nama, sub: s.Kelas||'-', isGuru: false } : { nama: id, sub: 'Santri', isGuru: false };
  }
}

// ── REKAP GROUPED ────────────────────────────────────────────────────────────
window.renderRekap = () => {
  const q       = (document.getElementById('srchRekap')?.value || '').toLowerCase();
  const fJenis  = document.getElementById('filterJenisPeserta')?.value || '';
  const allTes  = dataStore.get('tesBacaan');

  const grouped = {};
  allTes.forEach(t => {
    if (!grouped[t.PesertaID]) grouped[t.PesertaID] = { tipe: t.TipePeserta || 'Santri', tests: [] };
    grouped[t.PesertaID].tests.push(t);
  });

  const config = dataStore.get('config') || {};
  const rentang = config.rentangNilai || [];

  // Sort entries if a sort column is active
  let sortedEntries = Object.entries(grouped);
  
  // Apply column filters
  if (tbColFilter) {
    const filters = tbColFilter.getActiveFilters();
    if (Object.keys(filters).length) {
      sortedEntries = sortedEntries.filter(([id, data]) => {
        const p = resolvePeserta(id, data.tipe);
        for (const [colKey, allowed] of Object.entries(filters)) {
          let val;
          switch (colKey) {
            case 'peserta': val = p.nama; break;
            default: val = id;
          }
          if (!allowed.has(String(val))) return false;
        }
        return true;
      });
    }
  }
  
  if (tbSortCol) {
    sortedEntries.sort((a, b) => {
      const [idA, dataA] = a, [idB, dataB] = b;
      const pA = resolvePeserta(idA, dataA.tipe);
      const pB = resolvePeserta(idB, dataB.tipe);
      const tesA = dataA.tests.sort((x,y) => new Date(y.Timestamp || y.Tanggal) - new Date(x.Timestamp || x.Tanggal));
      const tesB = dataB.tests.sort((x,y) => new Date(y.Timestamp || y.Tanggal) - new Date(x.Timestamp || x.Tanggal));
      const latA = tesA[0], latB = tesB[0];
      let vA, vB;
      switch (tbSortCol) {
        case 'peserta': vA = pA.nama.toLowerCase(); vB = pB.nama.toLowerCase(); break;
        case 'materi': vA = (latA?.NamaSurah||'').toLowerCase(); vB = (latB?.NamaSurah||'').toLowerCase(); break;
        case 'tanggal': vA = new Date(latA?.Tanggal||0).getTime(); vB = new Date(latB?.Tanggal||0).getTime(); break;
        case 'nilai': vA = Number(latA?.NilaiAkhir||0); vB = Number(latB?.NilaiAkhir||0); break;
        default: vA = 0; vB = 0;
      }
      if (typeof vA === 'string') return tbSortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return tbSortDir === 'asc' ? vA - vB : vB - vA;
    });
  }

  let countP = 0, countT = 0;
  const rows = sortedEntries.map(([id, data], i) => {
    if (fJenis && data.tipe !== fJenis) return null;

    const p = resolvePeserta(id, data.tipe);
    const tests = data.tests.sort((a,b) => new Date(b.Timestamp || b.Tanggal) - new Date(a.Timestamp || a.Tanggal));
    const lat = tests[0];

    if (q && !`${id}${p.nama}${lat.NamaSurah}`.toLowerCase().includes(q)) return null;

    countP++;
    countT += tests.length;

    // Tags for Jenis Terakhir
    const hasPre = tests.some(x => x.JenisTes === 'Pre Test');
    const hasPost = tests.some(x => x.JenisTes === 'Post Test');
    let tags = '';
    if (hasPre) tags += `<span style="font-size:10px;padding:2px 8px;border-radius:4px;background:#eff6ff;color:#3b82f6;font-weight:700;margin-right:4px;">Pre Test</span>`;
    if (hasPost) tags += `<span style="font-size:10px;padding:2px 8px;border-radius:4px;background:#faf5ff;color:#a855f7;font-weight:700;">Post Test</span>`;

    // Nilai & Predikat
    const n = lat.NilaiAkhir ?? '-';
    const predikat = getNilaiKategori(n, rentang);
    const pColor = n >= 70 ? '#16a34a' : '#ef4444';

    return `<tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:16px;color:#64748b;font-size:12px;">${countP}</td>
      <td style="padding:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="font-size:10px;color:#fff;background:${p.isGuru?'#64748b':'#84cc16'};padding:2px 6px;border-radius:4px;font-weight:700;">${p.isGuru?'Guru':'Santri'}</span>
          <span style="font-weight:700;color:#0f172a;font-size:14px;">${p.nama}</span>
        </div>
        <div style="font-size:11px;color:#64748b;">Penguji Terakhir: ${lat.IDPenguji||'-'}</div>
      </td>
      <td style="padding:16px;text-align:center;">
        <span style="background:#f1f5f9;color:#475569;font-size:11px;font-weight:600;padding:4px 10px;border-radius:99px;">${lat.NamaSurah||'-'}</span>
      </td>
      <td style="padding:16px;text-align:center;">
        <div style="margin-bottom:6px;">${tags}</div>
        <div style="font-size:11px;color:#64748b;">Terakhir: ${fmtDate(lat.Tanggal)}</div>
      </td>
      <td style="padding:16px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:${pColor};line-height:1;">${n}</div>
        <div style="font-size:10px;font-weight:700;color:${pColor};margin-top:4px;text-transform:uppercase;">${predikat.label}</div>
      </td>
      <td style="padding:16px;text-align:right;">
        <button class="btn btn-outline btn-sm" onclick="showProgressTB('${id}', '${data.tipe}')" style="display:inline-flex;align-items:center;gap:6px;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          Progres
        </button>
      </td>
    </tr>`;
  }).filter(Boolean);

  const body = document.getElementById('rekapBody');
  if (body) body.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="6" class="no-data">Tidak ada riwayat tes</td></tr>`;
  const cnt = document.getElementById('countRekap');
  if (cnt) cnt.innerText = `${countP} peserta (${countT} data tes)`;
};

// ── PROGRESS DETAIL ──────────────────────────────────────────────────────────
window.showProgressTB = (pesertaId, tipe) => {
  const p = resolvePeserta(pesertaId, tipe);
  const tests = dataStore.get('tesBacaan')
    .filter(t => String(t.PesertaID) === String(pesertaId))
    .sort((a,b) => new Date(b.Timestamp || b.Tanggal) - new Date(a.Timestamp || a.Tanggal));

  document.getElementById('progressTitleTB').innerText = `Riwayat Evaluasi: ${p.nama} (${pesertaId})`;

  const config = dataStore.get('config') || {};
  const rentang = config.rentangNilai || [];

  const html = `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase;">
          <th style="padding:12px;text-align:left;">Sesi / Tanggal</th>
          <th style="padding:12px;text-align:center;">Jenis Tes</th>
          <th style="padding:12px;text-align:left;">Surah & Penguji</th>
          <th style="padding:12px;text-align:center;">Nilai</th>
          <th style="padding:12px;text-align:left;">Detail Kesalahan</th>
        </tr></thead>
        <tbody>
          ${tests.map(t => {
            const sesi = dataStore.get('sesiUjian').find(x => String(x.SesiID) === String(t.SesiID));
            const color = t.JenisTes === 'Post Test' ? (t.NilaiAkhir >= 70 ? '#16a34a' : '#dc2626') : '#3b82f6';
            const bg    = t.JenisTes === 'Post Test' ? (t.NilaiAkhir >= 70 ? '#dcfce7' : '#fee2e2') : '#dbeafe';
            const pr    = getNilaiKategori(t.NilaiAkhir, rentang);
            
            // Jaliy and Khafiy
            let jaliy = (Number(t.Ind1)||0) + (Number(t.Ind2)||0) + (Number(t.Ind3)||0);
            let khafiy = 0;
            for (let i = 4; i <= 10; i++) khafiy += Number(t[`Ind${i}`]) || 0;

            return `<tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:12px;">
                <div style="font-size:12px;font-weight:600;color:#0f172a;margin-bottom:4px;">${sesi?.NamaSesi || '-'}</div>
                <div style="font-size:11px;color:#64748b;">${fmtDate(t.Tanggal)}</div>
              </td>
              <td style="padding:12px;text-align:center;">
                <span style="font-size:11px;font-weight:700;background:${bg};color:${color};padding:4px 8px;border-radius:4px;">${t.JenisTes}</span>
              </td>
              <td style="padding:12px;">
                <div style="font-size:12px;font-weight:600;color:#334155;">${t.NamaSurah||'-'} ${t.Halaman ? `(Ayat ${t.Halaman})`:''}</div>
                <div style="font-size:11px;color:#64748b;">Oleh: ${t.IDPenguji||'-'}</div>
              </td>
              <td style="padding:12px;text-align:center;">
                <div style="font-size:18px;font-weight:800;color:${color};">${t.NilaiAkhir}</div>
                <div style="font-size:10px;font-weight:600;color:${color};">${pr.label}</div>
              </td>
              <td style="padding:12px;">
                <div style="display:flex;gap:8px;">
                  <span style="font-size:11px;background:#fee2e2;color:#dc2626;padding:2px 6px;border-radius:4px;font-weight:600;">Jaliy: ${jaliy}</span>
                  <span style="font-size:11px;background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-weight:600;">Khafiy: ${khafiy}</span>
                </div>
                ${t.Catatan ? `<div style="font-size:11px;color:#64748b;margin-top:6px;max-width:200px;background:#f8fafc;padding:4px 8px;border-radius:4px;">"${t.Catatan}"</div>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('progressBodyTB').innerHTML = html;
  document.getElementById('progressSectionTB').style.display = 'block';
  document.getElementById('progressSectionTB').scrollIntoView({ behavior: 'smooth' });
};

// ── REMEDIAL ─────────────────────────────────────────────────────────────────
window.renderRemedial = () => {
  const allTes = dataStore.get('tesBacaan');

  // Collect unique peserta yang post-test-nya masih < 70
  const remedialMap = {};
  allTes.filter(t => t.JenisTes === 'Post Test').forEach(t => {
    const id = String(t.PesertaID);
    if (!remedialMap[id] || new Date(t.Tanggal) > new Date(remedialMap[id].Tanggal)) {
      remedialMap[id] = t;
    }
  });

  const remedialList = Object.values(remedialMap).filter(t => t.NilaiAkhir < 70);

  const rows = remedialList.map(t => {
    const p = resolvePeserta(t.PesertaID, t.TipePeserta);
    const postCount = allTes.filter(x => String(x.PesertaID) === String(t.PesertaID) && x.JenisTes === 'Post Test').length;
    const sesi = dataStore.get('sesiUjian').find(x => String(x.SesiID) === String(t.SesiID));
    
    return `<tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:12px;font-family:monospace;font-size:12px;">${t.PesertaID}</td>
      <td style="padding:12px;">
        <div style="font-weight:600;font-size:13px;color:#0f172a;">${p.nama}</div>
        <div style="font-size:11px;color:#64748b;">${p.sub}</div>
      </td>
      <td style="padding:12px;text-align:center;font-size:12px;color:#475569;">${sesi?.NamaSesi || '-'}</td>
      <td style="padding:12px;text-align:center;font-weight:800;color:#dc2626;font-size:16px;">${t.NilaiAkhir}</td>
      <td style="padding:12px;text-align:center;font-size:13px;color:#64748b;">${postCount}x</td>
      <td style="padding:12px;text-align:right;">
        <button class="btn btn-primary btn-sm" onclick="window.navigate('sesi-ujian')" style="display:inline-flex;align-items:center;gap:6px;">
          Ke Sesi Ujian 
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </td>
    </tr>`;
  });

  const body = document.getElementById('remedialBody');
  if (body) body.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="6" style="text-align:center;padding:30px;color:#16a34a;font-weight:600;">🎉 Tidak ada peserta remedial saat ini</td></tr>`;
};
