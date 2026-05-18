import { getDashboardStats } from '../api.js';
import { getNilaiKategori, fmtDate } from '../utils.js';

export async function renderDashboard(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Memuat dashboard...</p></div>`;
  try {
    const raw = await getDashboardStats();
    const d = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    if (d.error) throw new Error(d.error);

    const stats = [
      { label:'Santri Aktif',      value:d.santriAktif,    sub:d.totalSantri+' total',        icon:'&#128100;', cls:'green'  },
      { label:'Guru Aktif',        value:d.guruAktif,      sub:d.totalGuru+' total',           icon:'&#128203;', cls:'blue'   },
      { label:'Rata-rata Pre Test',value:d.avgPre,         sub:'Nilai rata-rata santri',       icon:'&#9998;',   cls:'gold'   },
      { label:'Rata-rata Post Test',value:d.avgPost,        sub:'Nilai rata-rata santri',       icon:'&#9998;',   cls:'purple' },
      { label:'Perlu Pembinaan',   value:d.perluPembinaan, sub:'Nilai di bawah 70',            icon:'&#9888;',   cls:'red'    },
      { label:'Hafalan Selesai',   value:d.hafalSelesai,   sub:d.totalHafalan+' total setor',  icon:'&#9654;',   cls:'teal'   },
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
            <button class="btn btn-primary" onclick="window.navigate('santri')">+ Tambah Santri</button>
            <button class="btn btn-outline" onclick="window.navigate('guru')">+ Tambah Guru</button>
            <button class="btn btn-outline" onclick="window.navigate('tes-bacaan')">Input Tes Bacaan</button>
            <button class="btn btn-outline" onclick="window.navigate('hafalan')">Input Hafalan</button>
            <button class="btn btn-gold"    onclick="window.navigate('rapot')">Buat Rapot</button>
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
