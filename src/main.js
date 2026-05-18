import './style.css';
import { initModalClose, setTopbarDate } from './utils.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSantri }    from './pages/santri.js';
import { renderGuru }      from './pages/guru.js';
import { renderTesBacaan } from './pages/tes-bacaan.js';
import { renderHafalan }   from './pages/hafalan.js';
import { renderRapot }     from './pages/rapot.js';
import { renderSetup }     from './pages/setup.js';

const ROUTES = {
  dashboard  : { title:'Dashboard',       render: renderDashboard },
  santri     : { title:'Data Santri',     render: renderSantri },
  guru       : { title:'Data Guru',       render: renderGuru },
  'tes-bacaan':{ title:'Tes Bacaan',       render: renderTesBacaan },
  hafalan    : { title:'Hafalan',         render: renderHafalan },
  rapot      : { title:'Rapot Santri',    render: renderRapot },
  setup      : { title:'Pengaturan',      render: renderSetup }
};

function getCurrentPage() {
  return window.location.hash.replace('#','') || 'dashboard';
}

function navigate(page) {
  window.location.hash = page;
}

function renderNav(currentPage) {
  const navItems = [
    { page:'dashboard',   icon:'&#9632;', label:'Dashboard',    group:'Utama' },
    { page:'santri',      icon:'&#9679;', label:'Data Santri',  group:'Master Data' },
    { page:'guru',        icon:'&#9679;', label:'Data Guru',    group:'Master Data' },
    { page:'tes-bacaan',  icon:'&#9632;', label:'Tes Bacaan',   group:'Monitoring' },
    { page:'hafalan',     icon:'&#9632;', label:'Hafalan',      group:'Monitoring' },
    { page:'rapot',       icon:'&#9632;', label:'Rapot Santri', group:'Output' },
    { page:'setup',       icon:'&#9881;', label:'Pengaturan',   group:'Sistem' },
  ];
  const groups = [...new Set(navItems.map(n=>n.group))];
  return `
    <div class="sidebar-brand">
      <div class="brand-icon">&#9676;</div>
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

function renderPage(page) {
  const route = ROUTES[page] || ROUTES['dashboard'];
  const app   = document.getElementById('app');

  app.innerHTML = `
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <aside class="sidebar" id="sidebar">${renderNav(page)}</aside>
      <div class="main-content">
        <div class="topbar">
          <div class="topbar-title" style="display:flex;align-items:center;gap:12px;">
            <button class="btn-toggle-sidebar no-print" id="btnToggleSidebar" style="display:none;background:none;border:none;font-size:22px;cursor:pointer;color:var(--text);">&#9776;</button>
            <h1>${route.title}</h1>
          </div>
          <div class="topbar-right">
            <div class="topbar-date" id="topbar-date"></div>
          </div>
        </div>
        <div class="page-body" id="page-body">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Memuat...</p>
          </div>
        </div>
      </div>
    </div>
    <div id="toast-container"></div>`;

  setTopbarDate();
  initModalClose();
  route.render(document.getElementById('page-body'));

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

window.addEventListener('hashchange', () => {
  renderPage(getCurrentPage());
});

// Init
renderPage(getCurrentPage());
