import './style.css';
import { initModalClose, setTopbarDate, showToast } from './utils.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSantri }    from './pages/santri.js';
import { renderGuru }      from './pages/guru.js';
import { renderTesBacaan } from './pages/tes-bacaan-improved.js';
import { renderHafalan }   from './pages/hafalan.js';
import { renderRapot }     from './pages/rapot.js';
import { renderSetup }     from './pages/setup.js';
import { renderSesiUjian } from './pages/sesi-ujian.js';
import { renderSuratPanggilan } from './pages/surat-panggilan.js';
import { dataStore }       from './datastore.js'; // IMPORT DATASTORE

const ROUTES = {
  dashboard  : { title:'Dashboard',       render: renderDashboard },
  santri     : { title:'Data Santri',     render: renderSantri },
  guru       : { title:'Data Guru',       render: renderGuru },
  'tes-bacaan':{ title:'Tes Bacaan',       render: renderTesBacaan },
  hafalan    : { title:'Hafalan',         render: renderHafalan },
  'sesi-ujian':{ title:'Sesi Ujian',      render: renderSesiUjian },
  'surat-panggilan':{ title:'Surat Panggilan', render: renderSuratPanggilan },
  rapot      : { title:'Rapot Santri',    render: renderRapot },
  setup      : { title:'Pengaturan',      render: renderSetup }
};

function getCurrentPage() {
  const hash = window.location.hash.replace('#', '');
  const page = hash.split('?')[0];
  return page || 'dashboard';
}

function navigate(page) {
  window.location.hash = page;
}

function renderNav(currentPage) {
  const navItems = [
    { page:'dashboard',   icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>', label:'Dashboard',    group:'Utama' },
    { page:'santri',      icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label:'Data Santri',  group:'Master Data' },
    { page:'guru',        icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/></svg>', label:'Data Guru',    group:'Master Data' },
    { page:'sesi-ujian',  icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>', label:'Sesi Ujian',   group:'Evaluasi' },
    { page:'surat-panggilan', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"/><polyline points="22 12 18 12 18 16 22 16"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>', label:'Surat Panggilan', group:'Evaluasi' },
    { page:'tes-bacaan',  icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>', label:'Tes Bacaan',   group:'Evaluasi' },
    { page:'hafalan',     icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><polyline points="10 8 13 11 10 14"/></svg>', label:'Hafalan',      group:'Evaluasi' },
    { page:'rapot',       icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', label:'Rapot Santri', group:'Output' },
    { page:'setup',       icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>', label:'Pengaturan',   group:'Sistem' },
  ];
  const groups = [...new Set(navItems.map(n=>n.group))];
  return `
    <div class="sidebar-brand">
      <div class="brand-icon"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h6"/><path d="M8 15h4"/></svg></div>
      <h2>Markaz Qur'an</h2>
      <span>Sistem Manajemen Santri</span>
    </div>
    <nav class="sidebar-nav">
      ${groups.map(g=>`
        <div class="nav-section-label">${g}</div>
        ${navItems.filter(n=>n.group===g).map(n=>`
          <a class="nav-item${currentPage===n.page?' active':''}"
             href="#${n.page}" onclick="event.preventDefault();window.navigate('${n.page}')">
            <span class="nav-icon">${n.icon}</span>${n.label}
          </a>`).join('')}
      `).join('')}
    </nav>
    <div class="sidebar-footer">Markaz Qur'an &copy; ${new Date().getFullYear()}</div>`;
}

async function renderPage(page) {
  const route = ROUTES[page] || ROUTES['dashboard'];
  const app   = document.getElementById('app');

  // Initialize dataStore if not already initialized
  if (!dataStore.isInitialized) {
    app.innerHTML = `
      <div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;">
        <div class="spinner" style="width:40px;height:40px;border-width:4px;"></div>
        <p style="margin-top:16px;color:#64748b;font-weight:600;">Menyiapkan Data Sistem...</p>
      </div>`;
    const initRes = await dataStore.initialize();
    if (!initRes.ok) {
       app.innerHTML = `<div style="padding:40px;text-align:center;color:red;"><h3>Gagal memuat data</h3><p>${initRes.msg}</p></div>`;
       return;
    }
  }

  app.innerHTML = `
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <aside class="sidebar" id="sidebar">${renderNav(page)}</aside>
      <div class="main-content">
        <div class="topbar">
          <div class="topbar-title" style="display:flex;align-items:center;gap:12px;">
            <button class="btn-toggle-sidebar no-print" id="btnToggleSidebar" style="display:none;background:none;border:none;font-size:22px;cursor:pointer;color:var(--text);"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg></button>
            <h1>${route.title}</h1>
          </div>
          <div class="topbar-right">
            <div class="topbar-date" id="topbar-date"></div>
          </div>
        </div>
        <div class="page-body" id="page-body">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Memuat Halaman...</p>
          </div>
        </div>
      </div>
    </div>`;

  setTopbarDate();
  initModalClose();
  await route.render(document.getElementById('page-body'));

  // Mobile Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const toggleBtn = document.getElementById('btnToggleSidebar');

  function toggleSidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  }

  if (toggleBtn) toggleBtn.onclick = toggleSidebar;
  if (overlay) overlay.onclick = toggleSidebar;
  
  // Close sidebar on nav click in mobile
  sidebar.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      }
    });
  });
}

// ── Router ────────────────────────────────────────────────────
window.navigate = navigate;
window.showToast = showToast;

window.addEventListener('hashchange', () => {
  void renderPage(getCurrentPage());
});

// Init
void renderPage(getCurrentPage());
