import { dataStore } from '../datastore.js';
import { fmtDate, showToast } from '../utils.js';
import { ColumnFilter } from '../components/column-filter.js';

let spColFilter = null;
let spSortCol = null;
let spSortDir = 'asc';

export async function renderSuratPanggilan(container) {
  container.innerHTML = `
    <div class="page-header no-print">
      <div><h2>Surat Panggilan</h2><p>Daftar santri yang belum mengikuti ujian / remedial</p></div>
      <button class="btn btn-primary" id="btnPrintSP" style="display:flex;align-items:center;gap:6px;" disabled>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Cetak Surat Panggilan (<span id="spCount">0</span>)
      </button>
    </div>

    <!-- UI List -->
    <div id="spListView" class="no-print">
      <div class="card">
        <div class="card-header flex-between flex-wrap gap-12">
          <div class="flex gap-8 flex-wrap">
            <select id="spFilterSesi" style="min-width:180px;"></select>
            <input type="text" id="srchSP" placeholder="Cari nama atau stambuk..." style="width:200px;">
          </div>
          <button class="btn btn-outline btn-sm" id="btnSelectAllSP" style="display:flex;align-items:center;gap:4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Pilih Semua
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th style="width:36px;"><input type="checkbox" id="cbSelectAllSP" style="accent-color:var(--primary);"></th>
              <th class="sortable-th" data-spsort="no"># <span class="sort-icon"></span></th>
              <th class="sortable-th" data-spsort="stambuk">Stambuk <span class="sort-icon"></span></th>
              <th class="sortable-th" data-spsort="nama">Nama Santri <span class="sort-icon"></span></th>
              <th class="sortable-th" data-spsort="kelas">Kelas <span class="sort-icon"></span></th>
              <th class="sortable-th" data-spsort="sesi">Sesi Ujian <span class="sort-icon"></span></th>
              <th class="sortable-th" data-spsort="status">Status Ujian <span class="sort-icon"></span></th>
            </tr></thead>
            <tbody id="spBody"><tr><td colspan="7" class="no-data">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- UI Print -->
    <div id="spPrintView" style="display:none; padding:20px; background:#fff;"></div>
  `;

  document.getElementById('srchSP').oninput = renderTable;
  document.getElementById('spFilterSesi').onchange = renderTable;
  document.getElementById('btnSelectAllSP').onclick = selectAllSP;
  document.getElementById('cbSelectAllSP').onchange = (e) => {
    if (e.target.checked) selectAllSP();
    else { document.querySelectorAll('.cb-sp').forEach(cb => cb.checked = false); updatePrintCount(); }
  };
  document.getElementById('btnPrintSP').onclick = generatePrint;

  document.querySelectorAll('.sortable-th').forEach(th => {
    th.onclick = () => {
      const col = th.dataset.spsort;
      if (spSortCol === col) {
        spSortDir = spSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        spSortCol = col; spSortDir = 'asc';
      }
      document.querySelectorAll('.sortable-th .sort-icon').forEach(icon => icon.className = 'sort-icon');
      th.querySelector('.sort-icon').className = `sort-icon sort-${spSortDir}`;
      renderTable();
    };
  });

  // Attach column filter
  setTimeout(() => {
    spColFilter = new ColumnFilter({
      onFilter: renderTable,
      getValues: (colKey) => {
        const raw = detectBelumUjian();
        switch(colKey) {
          case 'kelas': return [...new Set(raw.map(x => x.kelas))];
          case 'sesi': return [...new Set(raw.map(x => x.sesiNama))];
          case 'status': return [...new Set(raw.map(x => x.statusDisplay))];
          default: return [];
        }
      }
    });
    const thKelas = document.querySelector('.sortable-th[data-spsort="kelas"]');
    if (thKelas) spColFilter.attach(thKelas, 'kelas');
    
    const thStatus = document.querySelector('.sortable-th[data-spsort="status"]');
    if (thStatus) spColFilter.attach(thStatus, 'status');
  }, 100);

  loadData();
  dataStore.subscribe('sesiUjian', loadData);
  dataStore.subscribe('tesBacaan', loadData);
}

function loadData() {
  const sesis = dataStore.get('sesiUjian').filter(s => s.TipeSesi === 'Bacaan' && s.Status !== 'Selesai');
  const sel = document.getElementById('spFilterSesi');
  sel.innerHTML = '<option value="">Semua Sesi Ujian Aktif</option>' + 
    sesis.map(s => `<option value="${s.SesiID}">${s.NamaSesi}</option>`).join('');
  renderTable();
}

function detectBelumUjian() {
  const allSesi = dataStore.get('sesiUjian').filter(s => s.TipeSesi === 'Bacaan' && s.Status !== 'Selesai');
  const allTes = dataStore.get('tesBacaan');
  const santriList = dataStore.get('santri').filter(s => s.Status === 'Aktif');
  const cfg = dataStore.get('config') || {};
  const minLulus = Number(cfg.nilaiMinLulus || 70);
  
  const result = [];

  for (const sesi of allSesi) {
    let pesertaSesi = [];
    try { pesertaSesi = JSON.parse(sesi.Peserta || '[]'); } catch(e){}
    if (!pesertaSesi.length) continue;

    for (const p of pesertaSesi) {
      if (p.tipe === 'Guru') continue; // Hanya santri
      
      const sData = santriList.find(x => String(x.STambuk) === String(p.id));
      if (!sData) continue;

      const tesSesi = allTes.filter(t => String(t.SesiID) === String(sesi.SesiID) && String(t.PesertaID) === String(p.id));
      const postTests = tesSesi.filter(t => t.JenisTes === 'Post Test');
      const preTests = tesSesi.filter(t => t.JenisTes === 'Pre Test');
      
      let isLulus = false;
      let status = 'Belum Pre Test';
      
      if (postTests.length > 0) {
        const bestPost = postTests.reduce((best, cur) => Number(cur.NilaiAkhir) > Number(best.NilaiAkhir) ? cur : best);
        if (Number(bestPost.NilaiAkhir) >= minLulus) isLulus = true;
        else status = 'Remedial (Post Test < ' + minLulus + ')';
      } else if (preTests.length > 0) {
        status = 'Belum Post Test';
      }

      if (!isLulus) {
        result.push({
          pesertaId: sData.STambuk,
          nama: sData.Nama,
          kelas: sData.Kelas || '-',
          sesiId: sesi.SesiID,
          sesiNama: sesi.NamaSesi,
          tanggalSesi: sesi.Tanggal,
          statusDisplay: status
        });
      }
    }
  }
  return result;
}

function renderTable() {
  let list = detectBelumUjian();
  
  // Search
  const q = (document.getElementById('srchSP')?.value || '').toLowerCase();
  if (q) list = list.filter(x => x.nama.toLowerCase().includes(q) || String(x.pesertaId).includes(q));

  // Filter Sesi
  const fSesi = document.getElementById('spFilterSesi')?.value;
  if (fSesi) list = list.filter(x => String(x.sesiId) === String(fSesi));

  // Column Filters
  if (spColFilter) {
    const filters = spColFilter.getActiveFilters();
    for (const [col, allowed] of Object.entries(filters)) {
      list = list.filter(x => {
        let val;
        switch (col) {
          case 'kelas': val = x.kelas; break;
          case 'sesi': val = x.sesiNama; break;
          case 'status': val = x.statusDisplay; break;
          default: val = '';
        }
        return allowed.has(String(val));
      });
    }
  }

  // Sort
  if (spSortCol) {
    list.sort((a, b) => {
      let vA, vB;
      switch(spSortCol) {
        case 'stambuk': vA = a.pesertaId; vB = b.pesertaId; break;
        case 'nama': vA = a.nama.toLowerCase(); vB = b.nama.toLowerCase(); break;
        case 'kelas': vA = a.kelas; vB = b.kelas; break;
        case 'sesi': vA = a.sesiNama; vB = b.sesiNama; break;
        case 'status': vA = a.statusDisplay; vB = b.statusDisplay; break;
        default: vA = 0; vB = 0;
      }
      if (typeof vA === 'string') return spSortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return spSortDir === 'asc' ? vA - vB : vB - vA;
    });
  }

  const body = document.getElementById('spBody');
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="7" class="no-data">Semua peserta telah lulus pada filter ini</td></tr>';
    updatePrintCount();
    return;
  }

  body.innerHTML = list.map((item, i) => {
    const isRemedial = item.statusDisplay.includes('Remedial');
    return `<tr>
      <td><input type="checkbox" class="cb-sp" data-json="${encodeURIComponent(JSON.stringify(item))}" style="accent-color:var(--primary);"></td>
      <td style="color:var(--text-muted);">${i+1}</td>
      <td style="font-family:monospace;font-size:12px;">${item.pesertaId}</td>
      <td style="font-weight:600;">${item.nama}</td>
      <td>${item.kelas}</td>
      <td style="font-size:12px;">${item.sesiNama}</td>
      <td><span class="badge ${isRemedial ? 'badge-pb' : 'badge-c'}" style="font-size:10px;">${item.statusDisplay}</span></td>
    </tr>`;
  }).join('');

  document.querySelectorAll('.cb-sp').forEach(cb => cb.onchange = updatePrintCount);
  updatePrintCount();
}

function updatePrintCount() {
  const cnt = document.querySelectorAll('.cb-sp:checked').length;
  document.getElementById('spCount').innerText = cnt;
  document.getElementById('btnPrintSP').disabled = cnt === 0;
  
  const total = document.querySelectorAll('.cb-sp').length;
  const cbAll = document.getElementById('cbSelectAllSP');
  if (cbAll) cbAll.checked = cnt > 0 && cnt === total;
}

function selectAllSP() {
  const cbs = document.querySelectorAll('.cb-sp');
  cbs.forEach(cb => cb.checked = true);
  updatePrintCount();
}

function generatePrint() {
  const checked = document.querySelectorAll('.cb-sp:checked');
  if (!checked.length) return;

  const items = Array.from(checked).map(cb => JSON.parse(decodeURIComponent(cb.dataset.json)));
  const printView = document.getElementById('spPrintView');
  
  const htmls = items.map(item => `
    <div style="width:100%;max-width:800px;margin:0 auto;page-break-after:always;padding:40px;border:1px solid #ccc;border-radius:8px;font-family:Arial,sans-serif;margin-bottom:40px;" class="print-page">
      <div style="text-align:center;border-bottom:3px double #1b6b4a;padding-bottom:14px;margin-bottom:30px;">
        <h1 style="font-size:24px;font-weight:800;color:#1b6b4a;margin:0;letter-spacing:1px;text-transform:uppercase;">MARKAZ QUR'AN</h1>
        <p style="font-size:11px;color:#64748b;margin:4px 0 0;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Lembaga Pendidikan &amp; Pembinaan Tahsin Tahfidz Qur'an Terpadu</p>
      </div>

      <h2 style="text-align:center;font-size:18px;text-transform:uppercase;margin-bottom:30px;text-decoration:underline;">SURAT PANGGILAN UJIAN</h2>

      <p style="font-size:14px;line-height:1.6;margin-bottom:20px;">
        Assalamu'alaikum Warahmatullahi Wabarakatuh,<br><br>
        Kepada Yth. Wali Santri / Saudara(i), kami beritahukan bahwa santri berikut:
      </p>

      <table style="width:80%;margin:0 auto;font-size:14px;line-height:2;">
        <tr><td style="width:150px;color:#475569;">Nama Lengkap</td><td style="font-weight:700;">: ${item.nama}</td></tr>
        <tr><td style="color:#475569;">No. Stambuk</td><td style="font-family:monospace;font-weight:700;">: ${item.pesertaId}</td></tr>
        <tr><td style="color:#475569;">Kelas / Rayon</td><td style="font-weight:600;">: ${item.kelas}</td></tr>
      </table>

      <p style="font-size:14px;line-height:1.6;margin-top:20px;">
        Belum menyelesaikan evaluasi / perlu mengikuti ujian susulan pada sesi <strong>${item.sesiNama}</strong>.<br>
        <strong>Status Ujian:</strong> <span style="color:#dc2626;font-weight:700;">${item.statusDisplay}</span>
      </p>

      <p style="font-size:14px;line-height:1.6;margin-top:20px;">
        Mohon segera menghadap pengurus atau penguji terkait untuk melaksanakan evaluasi tersebut agar proses pembelajaran dapat dilanjutkan dengan baik.
      </p>

      <div style="margin-top:50px;display:flex;justify-content:flex-end;">
        <div style="text-align:center;">
          <p style="margin:0 0 70px 0;">Pengurus Markaz Qur'an</p>
          <p style="margin:0;border-top:1px solid #000;padding-top:4px;font-weight:bold;">( Tanda Tangan & Nama )</p>
        </div>
      </div>
    </div>
  `).join('');

  printView.innerHTML = htmls;
  
  // Hide UI temporarily for printing
  document.getElementById('spListView').style.display = 'none';
  printView.style.display = 'block';

  setTimeout(() => {
    window.print();
    // Restore UI after print dialog closes
    document.getElementById('spListView').style.display = 'block';
    printView.style.display = 'none';
  }, 500);
}
