import { getDashboardStats } from '../api.js';
import { getNilaiKategori, fmtDate } from '../utils.js';

export async function renderDashboard(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Memuat dashboard...</p></div>`;
  try {
    const raw = await getDashboardStats();
    const d = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    if (d.error) throw new Error(d.error);

    const stats = [
      { label:'Santri Aktif',      value:d.santriAktif,    sub:d.totalSantri+' total',        icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, cls:'green'  },
      { label:'Guru Aktif',        value:d.guruAktif,      sub:d.totalGuru+' total',           icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, cls:'blue'   },
      { label:'Rata-rata Pre Test',value:d.avgPre,         sub:'Nilai rata-rata santri',       icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,   cls:'gold'   },
      { label:'Rata-rata Post Test',value:d.avgPost,        sub:'Nilai rata-rata santri',       icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,   cls:'purple' },
      { label:'Perlu Pembinaan',   value:d.perluPembinaan, sub:'Nilai di bawah 70',            icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,   cls:'red'    },
      { label:'Hafalan Selesai',   value:d.hafalSelesai,   sub:d.totalHafalan+' total setor',  icon:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,   cls:'teal'   },
    ];

    const juzData = d.hafalanPerJuz || {};
    const juzKeys = Object.keys(juzData).sort((a,b)=>Number(a)-Number(b));
    const maxJuz  = Math.max(...Object.values(juzData), 1);

    container.innerHTML = `
      <div class="stat-grid">
        ${stats.map(s=>`
          <div class="stat-card">
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
                  <span class="text-muted">${juzData[j]} setor</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${Math.round(juzData[j]/maxJuz*100)}%"></div>
                </div>
              </div>`).join('')
            : '<p class="no-data">Belum ada hafalan selesai</p>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Santri Terbaru</h3>
            <a href="#santri" onclick="window.navigate('santri')" style="font-size:12px;color:var(--primary);font-weight:600;">Lihat semua</a>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Stambuk</th><th>Nama</th><th>Kelas</th><th>Status</th></tr></thead>
              <tbody>
                ${(d.santriTerbaru||[]).length
                  ? (d.santriTerbaru||[]).map(s=>`
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
      </div>

      <div class="card">
        <div class="card-header"><h3>Akses Cepat</h3></div>
        <div class="card-body">
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="window.navigate('santri')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tambah Santri</button>
            <button class="btn btn-outline" onclick="window.navigate('guru')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tambah Guru</button>
            <button class="btn btn-outline" onclick="window.navigate('tes-bacaan')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Input Tes Bacaan</button>
            <button class="btn btn-outline" onclick="window.navigate('hafalan')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> Input Hafalan</button>
            <button class="btn btn-gold"    onclick="window.navigate('rapot')" style="display:inline-flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Buat Rapot</button>
          </div>
        </div>
      </div>`;

    // Charts
    const recent = d.recentTes || [];
    new Chart(document.getElementById('chartTrend'), {
      type:'bar',
      data:{
        labels: recent.map((_,i)=>'Tes '+(i+1)),
        datasets:[{
          label:'Nilai', data:recent.map(t=>t.nilai),
          backgroundColor:recent.map(t=>t.jenis==='Pre Test'?'#3b73c8':'#1b6b4a'),
          borderRadius:6
        }]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{y:{min:0,max:100,grid:{color:'#f0f4ef'}},x:{grid:{display:false}}}}
    });

    const dist=[0,0,0,0];
    recent.forEach(t=>{const n=t.nilai;if(n>=90)dist[0]++;else if(n>=80)dist[1]++;else if(n>=70)dist[2]++;else dist[3]++;});
    new Chart(document.getElementById('chartDist'), {
      type:'doughnut',
      data:{
        labels:['Sangat Baik','Baik','Cukup','Perlu Pembinaan'],
        datasets:[{data:dist,backgroundColor:['#1b6b4a','#3b73c8','#c9943a','#c62828'],borderWidth:0,hoverOffset:6}]
      },
      options:{responsive:true,maintainAspectRatio:false,cutout:'65%',
        plugins:{legend:{position:'bottom',labels:{font:{family:'Poppins',size:11},boxWidth:12,padding:12}}}}
    });

  } catch(err) {
    container.innerHTML = `<div class="alert alert-error">Gagal memuat dashboard: ${err.message}</div>`;
  }
}
