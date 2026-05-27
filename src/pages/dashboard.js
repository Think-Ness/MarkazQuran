import { dataStore } from '../datastore.js';
import { getNilaiKategori, fmtDate } from '../utils.js';

function resolvePeserta(pesertaId, tipePeserta) {
  if (tipePeserta === 'Guru' || tipePeserta === 'guru') {
    const g = (dataStore.get('guru') || []).find(x => String(x.IDGuru) === String(pesertaId) || x.Nama === pesertaId);
    return g ? { nama: g.Nama, kelas: g.KamarBagian || 'Guru', tipe: 'guru' } : { nama: pesertaId, kelas: 'Guru', tipe: 'guru' };
  }
  const s = (dataStore.get('santri') || []).find(x => String(x.STambuk) === String(pesertaId));
  return s ? { nama: s.Nama, kelas: s.Kelas || '-', tipe: 'santri' } : { nama: pesertaId, kelas: '-', tipe: 'santri' };
}

export async function renderDashboard(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Memuat dashboard...</p></div>`;
  try {
    // Compute stats from dataStore cache
    const allSantri   = dataStore.get('santri') || [];
    const allGuru     = dataStore.get('guru') || [];
    const allTes      = dataStore.get('tesBacaan') || [];
    const allHafalan  = dataStore.get('hafalan') || [];
    const allSesi     = dataStore.get('sesiUjian') || [];
    const config      = dataStore.get('config') || {};
    const rentang     = config.rentangNilai || [];
    const minLulus    = Number(config.nilaiMinLulus || config.minLulus || 70);

    const santriAktif = allSantri.filter(s => s.Status === 'Aktif').length;
    const guruAktif   = allGuru.length;

    // Average Pre Test & Post Test
    const preTests  = allTes.filter(t => t.JenisTes === 'Pre Test');
    const postTests = allTes.filter(t => t.JenisTes === 'Post Test');
    const avgPre  = preTests.length  ? Math.round(preTests.reduce((s,t)  => s + Number(t.NilaiAkhir || 0), 0) / preTests.length)  : '-';
    const avgPost = postTests.length ? Math.round(postTests.reduce((s,t) => s + Number(t.NilaiAkhir || 0), 0) / postTests.length) : '-';

    // Perlu Pembinaan: santri with latest test score < minLulus
    const santriLatest = {};
    allTes.forEach(t => {
      const key = String(t.PesertaID);
      if (!santriLatest[key] || new Date(t.Tanggal) > new Date(santriLatest[key].Tanggal)) {
        santriLatest[key] = t;
      }
    });
    const perluPembinaan = Object.values(santriLatest).filter(t => Number(t.NilaiAkhir) < minLulus).length;

    // Hafalan stats
    const hafalSelesai = allHafalan.filter(h => h.Status === 'Selesai').length;
    const totalHafalan = allHafalan.length;

    // Sesi stats
    const sesiAktif = allSesi.filter(s => s.Status === 'Aktif').length;

    const stats = [
      { label:'Santri Aktif',      value: santriAktif,    sub: allSantri.length + ' total',       icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, cls:'green'  },
      { label:'Guru Aktif',        value: guruAktif,      sub: allGuru.length + ' total',          icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/></svg>`, cls:'blue'   },
      { label:'Rata-rata Pre Test', value: avgPre,         sub: preTests.length + ' data tes',      icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,   cls:'gold'   },
      { label:'Rata-rata Post Test',value: avgPost,        sub: postTests.length + ' data tes',     icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,   cls:'purple' },
      { label:'Perlu Pembinaan',   value: perluPembinaan, sub: 'Nilai di bawah ' + minLulus,       icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,   cls:'red'    },
      { label:'Sesi Ujian Aktif',  value: sesiAktif,      sub: allSesi.length + ' total sesi',     icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>`,   cls:'teal'   },
    ];

    // Hafalan per Juz
    const juzMap = {};
    allHafalan.filter(h => h.Status === 'Selesai').forEach(h => {
      const j = h.Juz || '?';
      juzMap[j] = (juzMap[j] || 0) + 1;
    });
    const juzKeys = Object.keys(juzMap).sort((a,b) => Number(a) - Number(b));
    const maxJuz  = Math.max(...Object.values(juzMap), 1);

    // Recent tests (last 10)
    const recent = [...allTes].sort((a,b) => new Date(b.Tanggal) - new Date(a.Tanggal)).slice(0, 10).reverse();

    // Distribusi Kategori
    const dist = {};
    if (rentang.length) {
      rentang.forEach(r => { dist[r.label] = 0; });
      allTes.forEach(t => {
        const k = getNilaiKategori(Number(t.NilaiAkhir), rentang);
        dist[k.label] = (dist[k.label] || 0) + 1;
      });
    } else {
      ['Mumtaz','Jayyid Jiddan','Jayyid','Maqbul','Rasib'].forEach(l => { dist[l] = 0; });
      allTes.forEach(t => {
        const n = Number(t.NilaiAkhir);
        if (n >= 90) dist['Mumtaz']++;
        else if (n >= 80) dist['Jayyid Jiddan']++;
        else if (n >= 70) dist['Jayyid']++;
        else if (n >= 60) dist['Maqbul']++;
        else dist['Rasib']++;
      });
    }

    // Santri terbaru
    const santriTerbaru = [...allSantri].sort((a,b) => {
      return String(b.STambuk || '').localeCompare(String(a.STambuk || ''));
    }).slice(0, 5);

    // Sesi terbaru
    const sesiTerbaru = [...allSesi].sort((a,b) => new Date(b.Tanggal) - new Date(a.Tanggal)).slice(0, 5);

    const distColors = ['#1b6b4a','#3b73c8','#c9943a','#f59e0b','#c62828','#6366f1'];

    container.innerHTML = `
      <div class="stat-grid">
        ${stats.map((s,i)=>`
          <div class="stat-card" data-statidx="${i}" style="cursor:pointer;">
            <div class="stat-icon ${s.cls}">${s.icon}</div>
            <div>
              <div class="stat-label">${s.label}</div>
              <div class="stat-value">${s.value}</div>
              <div class="stat-sub">${s.sub}</div>
            </div>
          </div>`).join('')}
      </div>

      <div class="grid-2 mb-16" style="margin-bottom:20px;">
        <div class="card">
          <div class="card-header"><h3>Trend Nilai Tes (10 Terakhir)</h3></div>
          <div class="card-body"><canvas id="chartTrend" height="180"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Distribusi Kategori Nilai</h3></div>
          <div class="card-body"><canvas id="chartDist" height="180"></canvas></div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:20px;">
        <div class="card">
          <div class="card-header"><h3>Progress Hafalan per Juz</h3></div>
          <div class="card-body">
            ${juzKeys.length ? juzKeys.map(j=>`
              <div style="margin-bottom:14px;">
                <div class="flex items-center gap-8" style="justify-content:space-between;margin-bottom:5px;">
                  <span style="font-size:13px;font-weight:600;">Juz ${j}</span>
                  <span class="text-muted">${juzMap[j]} setor</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${Math.round(juzMap[j]/maxJuz*100)}%"></div>
                </div>
              </div>`).join('')
            : '<p class="no-data">Belum ada hafalan selesai</p>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Sesi Ujian Terbaru</h3>
            <a href="#sesi-ujian" onclick="window.navigate('sesi-ujian')" style="font-size:12px;color:var(--primary);font-weight:600;">Lihat semua</a>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nama Sesi</th><th>Tipe</th><th>Tanggal</th><th>Progres</th></tr></thead>
              <tbody>
                ${sesiTerbaru.length
                  ? sesiTerbaru.map(s => {
                    const peserta = s._peserta || [];
                    let done = 0;
                    if (s.TipeSesi === 'Bacaan') {
                      const tes = allTes.filter(t => String(t.SesiID) === String(s.SesiID));
                      done = new Set(tes.map(t => String(t.PesertaID))).size;
                    } else {
                      const hf = allHafalan.filter(h => String(h.SesiID) === String(s.SesiID));
                      done = new Set(hf.map(h => String(h.STambuk))).size;
                    }
                    const pct = peserta.length ? Math.round((done/peserta.length)*100) : 0;
                    return `<tr style="cursor:pointer;" onclick="window.navigate('sesi-ujian');setTimeout(()=>window.openDetail&&window.openDetail('${s.SesiID}'),300)">
                      <td style="font-weight:600;">${s.NamaSesi}</td>
                      <td><span class="badge ${s.TipeSesi==='Bacaan'?'badge-b':'badge-sb'}">${s.TipeSesi}</span></td>
                      <td>${fmtDate(s.Tanggal)}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                          <div style="flex:1;background:#e2e8f0;border-radius:99px;height:6px;min-width:60px;"><div style="height:100%;width:${pct}%;background:${pct===100?'#16a34a':'#3b73c8'};border-radius:99px;"></div></div>
                          <span style="font-size:11px;font-weight:700;color:${pct===100?'#16a34a':'#3b73c8'};">${pct}%</span>
                        </div>
                      </td>
                    </tr>`;
                  }).join('')
                  : '<tr><td colspan="4" class="no-data">Belum ada sesi ujian</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:20px;">
        <div class="card">
          <div class="card-header">
            <h3>Santri Terbaru</h3>
            <a href="#santri" onclick="window.navigate('santri')" style="font-size:12px;color:var(--primary);font-weight:600;">Lihat semua</a>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Stambuk</th><th>Nama</th><th>Kelas</th><th>Status</th></tr></thead>
              <tbody>
                ${santriTerbaru.length
                  ? santriTerbaru.map(s=>`
                    <tr>
                      <td><code style="font-size:12px;">${s.STambuk}</code></td>
                      <td style="font-weight:600;">${s.Nama}</td>
                      <td>${s.Kelas||'-'}</td>
                      <td><span class="badge badge-${s.Status==='Aktif'?'aktif':'nonaktif'}">${s.Status||'Aktif'}</span></td>
                    </tr>`).join('')
                  : '<tr><td colspan="4" class="no-data">Belum ada santri</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card" style="grid-column: span 1;">
          <div class="card-header"><h3>Santri Terbaik (Per Batch Terbaru)</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Sesi Batch</th><th>Santri Terbaik</th><th>Nilai</th></tr></thead>
              <tbody>
                ${sesiTerbaru.length
                  ? sesiTerbaru.map(s => {
                      if (s.TipeSesi !== 'Bacaan') return ''; // Hanya untuk tes bacaan sementara
                      const tes = allTes.filter(t => String(t.SesiID) === String(s.SesiID) && t.JenisTes === 'Post Test');
                      if (!tes.length) return '';
                      const best = tes.reduce((best, cur) => Number(cur.NilaiAkhir) > Number(best.NilaiAkhir) ? cur : best);
                      const sData = allSantri.find(st => String(st.STambuk) === String(best.PesertaID));
                      if (!sData) return '';
                      return `<tr>
                        <td style="font-size:12px;">${s.NamaSesi}</td>
                        <td style="font-weight:600;color:var(--primary);">${sData.Nama}</td>
                        <td><span style="font-size:16px;font-weight:800;color:#1b6b4a;">${best.NilaiAkhir}</span></td>
                      </tr>`;
                    }).join('')
                  : '<tr><td colspan="3" class="no-data">Belum ada data nilai</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Ringkasan Hafalan</h3></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
              <div style="background:#f0fdf4;padding:16px;border-radius:10px;text-align:center;border:1px solid #bbf7d0;">
                <div style="font-size:28px;font-weight:800;color:#15803d;">${hafalSelesai}</div>
                <div style="font-size:12px;color:#16a34a;font-weight:600;">Selesai</div>
              </div>
              <div style="background:#fef9c3;padding:16px;border-radius:10px;text-align:center;border:1px solid #fde68a;">
                <div style="font-size:28px;font-weight:800;color:#b45309;">${totalHafalan - hafalSelesai}</div>
                <div style="font-size:12px;color:#b45309;font-weight:600;">Dalam Proses</div>
              </div>
            </div>
            <div style="font-size:13px;color:#64748b;text-align:center;">Total ${totalHafalan} setoran dari ${new Set(allHafalan.map(h=>h.STambuk)).size} santri</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Akses Cepat</h3></div>
        <div class="card-body">
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="window.navigate('sesi-ujian')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg> Buat Sesi Ujian</button>
            <button class="btn btn-outline" onclick="window.navigate('santri')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tambah Santri</button>
            <button class="btn btn-outline" onclick="window.navigate('guru')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tambah Guru</button>
            <button class="btn btn-outline" onclick="window.navigate('tes-bacaan')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> Monitoring Tes Bacaan</button>
            <button class="btn btn-outline" onclick="window.navigate('hafalan')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> Monitoring Hafalan</button>
            <button class="btn btn-gold" onclick="window.navigate('rapot')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Buat Rapot</button>
          </div>
        </div>
      </div>
      
      <!-- Modal Detail Chart -->
      <div class="modal-overlay" id="modalChartDetail">
        <div class="modal modal-lg" style="max-width:720px;">
          <div class="modal-header">
            <h3 id="mcdTitle">Detail Data</h3>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('modalChartDetail').classList.remove('show')">&#10005;</button>
          </div>
          <div class="modal-body" style="max-height:70vh;overflow-y:auto;" id="mcdBody"></div>
        </div>
      </div>`;

    // Charts
    if (typeof Chart !== 'undefined') {
      new Chart(document.getElementById('chartTrend'), {
        type:'bar',
        data:{
          labels: recent.map(t => fmtDate(t.Tanggal)),
          datasets:[{
            label:'Nilai', data:recent.map(t => Number(t.NilaiAkhir)),
            backgroundColor:recent.map(t => t.JenisTes==='Pre Test' ? '#3b73c8' : '#1b6b4a'),
            borderRadius:6
          }]
        },
        options:{
          responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
          scales:{y:{min:0,max:100,grid:{color:'#f0f4ef'}},x:{grid:{display:false},ticks:{font:{size:10}}}},
          onClick: (e, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const item = recent[idx];
            const p = resolvePeserta(item.PesertaID, item.TipePeserta);
            const INDIKATOR_NAMES = ['Kelancaran','Makharij Huruf','Sifat Huruf',"Mad Thabi'i",'Mad Lebih 2 Harakat','Dengungan (Ghunnah)','Waqf & Ibtida','Gharib','Keindahan (Lagu)','Lain-lain'];
            const lulus = Number(item.NilaiAkhir) >= minLulus;
            const indChips = INDIKATOR_NAMES.map((n, i) => {
              const v = Number(item[`Ind${i+1}`] || 0);
              const isJaliy = i < 3;
              let bg, clr, borderClr;
              if (v === 0) { bg = '#f0fdf4'; clr = '#16a34a'; borderClr = '#bbf7d0'; }
              else if (isJaliy) { bg = '#fef2f2'; clr = '#dc2626'; borderClr = '#fecaca'; }
              else { bg = '#fffbeb'; clr = '#d97706'; borderClr = '#fde68a'; }
              return `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;border-radius:5px;background:${bg};border:1px solid ${borderClr};">
                <span style="font-size:11px;color:#334155;">${n}</span>
                <span style="font-size:11px;font-weight:700;color:${clr};margin-left:6px;">${v === 0 ? '✓' : v}</span>
              </div>`;
            }).join('');

            document.getElementById('mcdTitle').innerText = 'Detail Tes Bacaan';
            document.getElementById('mcdBody').innerHTML = `
              <table class="table-detail" style="width:100%;font-size:13px;line-height:1.6;margin-bottom:14px;">
                <tr><td style="color:#64748b;width:120px;">Tanggal</td><td style="font-weight:600;">${fmtDate(item.Tanggal)}</td></tr>
                <tr><td style="color:#64748b;">Nama</td><td style="font-weight:600;">${p.nama}</td></tr>
                <tr><td style="color:#64748b;">Kelas</td><td>${p.kelas}</td></tr>
                <tr><td style="color:#64748b;">Jenis Tes</td><td><span class="badge ${item.JenisTes==='Pre Test'?'badge-b':'badge-sb'}">${item.JenisTes}</span></td></tr>
                <tr><td style="color:#64748b;">Surah</td><td style="font-weight:600;">${item.NamaSurah}${item.Halaman ? ' (Ayat ' + item.Halaman + ')' : ''}</td></tr>
                <tr><td style="color:#64748b;">Nilai Akhir</td><td><span style="font-size:20px;font-weight:800;color:${lulus ? '#16a34a' : '#dc2626'};">${item.NilaiAkhir}</span> <span style="font-size:12px;font-weight:700;color:${lulus ? '#16a34a' : '#dc2626'};">${getNilaiKategori(Number(item.NilaiAkhir), rentang).label}</span></td></tr>
                <tr><td style="color:#64748b;">Penguji</td><td>${item.IDPenguji || '-'}</td></tr>
                <tr><td style="color:#64748b;">Catatan</td><td style="font-style:italic;">${item.Catatan || '-'}</td></tr>
              </table>
              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px;">Detail Indikator</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:5px;">
                ${indChips}
              </div>`;
            document.getElementById('modalChartDetail').classList.add('show');
          }
        }
      });

      const distLabels = Object.keys(dist);
      const distData   = Object.values(dist);
      new Chart(document.getElementById('chartDist'), {
        type:'doughnut',
        data:{
          labels: distLabels,
          datasets:[{data: distData, backgroundColor: distColors.slice(0, distLabels.length), borderWidth:0, hoverOffset:6}]
        },
        options:{
          responsive:true,maintainAspectRatio:false,cutout:'65%',
          plugins:{legend:{position:'bottom',labels:{font:{family:'Poppins',size:11},boxWidth:12,padding:12}}},
          onClick: (e, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const label = distLabels[idx];
            
            // Temukan santri-santri yang masuk kategori ini
            const matchingTests = allTes.filter(t => {
              const k2 = getNilaiKategori(Number(t.NilaiAkhir), rentang);
              return k2.label === label;
            });
            
            // Group by peserta, get latest test
            const pesertaMap = {};
            matchingTests.forEach(t => {
              const key = String(t.PesertaID);
              if (!pesertaMap[key] || new Date(t.Tanggal) > new Date(pesertaMap[key].Tanggal)) {
                pesertaMap[key] = t;
              }
            });
            const matchingEntries = Object.values(pesertaMap).map(t => {
              const p = resolvePeserta(t.PesertaID, t.TipePeserta);
              return { ...t, pesertaNama: p.nama, pesertaKelas: p.kelas };
            });
            
            document.getElementById('mcdTitle').innerText = 'Distribusi Kategori: ' + label;
            document.getElementById('mcdBody').innerHTML = `
              <p style="font-size:12px;color:#64748b;margin-bottom:12px;">Total: ${distData[idx]} data tes dalam kategori <strong>${label}</strong></p>
              <div style="max-height:300px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;">
                <table style="width:100%;font-size:12px;border-collapse:collapse;">
                  <thead style="background:#f8fafc;position:sticky;top:0;">
                    <tr>
                      <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Nama</th>
                      <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Kelas</th>
                      <th style="padding:8px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">Jenis Tes</th>
                      <th style="padding:8px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">Nilai</th>
                      <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${matchingEntries.length ? matchingEntries.sort((a,b) => Number(b.NilaiAkhir) - Number(a.NilaiAkhir)).map(e => {
                      const lulus2 = Number(e.NilaiAkhir) >= minLulus;
                      return `<tr>
                        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-weight:600;">${e.pesertaNama}</td>
                        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${e.pesertaKelas}</td>
                        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center;"><span class="badge ${e.JenisTes==='Pre Test'?'badge-b':'badge-sb'}" style="font-size:10px;">${e.JenisTes}</span></td>
                        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:800;color:${lulus2?'#16a34a':'#dc2626'};">${e.NilaiAkhir}</td>
                        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b;">${fmtDate(e.Tanggal)}</td>
                      </tr>`;
                    }).join('') : `<tr><td colspan="5" style="padding:12px;text-align:center;color:#94a3b8;">Tidak ada data dalam kategori ini</td></tr>`}
                  </tbody>
                </table>
              </div>
            `;
            document.getElementById('modalChartDetail').classList.add('show');
          }
        }
      });
    }

    // Stat card click handlers
    document.querySelectorAll('.stat-card[data-statidx]').forEach(card => {
      card.onclick = () => {
        const idx = Number(card.dataset.statidx);
        const destinations = ['santri', 'guru', 'tes-bacaan', 'tes-bacaan', 'tes-bacaan', 'sesi-ujian'];
        if (destinations[idx]) window.navigate(destinations[idx]);
      };
    });

  } catch(err) {
    container.innerHTML = `<div class="alert alert-error">Gagal memuat dashboard: ${err.message}</div>`;
  }
}
