/**
 * ColumnFilter — Excel-style per-column filter dropdown
 * Usage:
 *   const cf = new ColumnFilter({
 *     onFilter: (activeFilters) => { // re-render },
 *     getValues: (colKey) => ['val1','val2',...],
 *   });
 *   cf.attach(thElement, 'colKey');
 *   cf.getActiveFilters() => { colKey: Set(['val1']) }
 *   cf.reset();
 */
export class ColumnFilter {
  constructor({ onFilter, getValues }) {
    this.onFilter = onFilter;
    this.getValues = getValues;
    this.filters = {}; // { colKey: Set of selected values }
    this.dropdowns = {};
    this._onDocClick = (e) => {
      Object.values(this.dropdowns).forEach(dd => {
        if (dd.el && !dd.el.contains(e.target) && !dd.th.contains(e.target)) {
          dd.el.remove();
          dd.el = null;
        }
      });
    };
    document.addEventListener('click', this._onDocClick, true);
  }

  attach(thElement, colKey) {
    // Add filter icon button
    let btn = thElement.querySelector('.cf-btn');
    if (!btn) {
      btn = document.createElement('span');
      btn.className = 'cf-btn';
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`;
      btn.style.cssText = 'cursor:pointer;display:inline-flex;align-items:center;margin-left:3px;opacity:.4;transition:all .15s;vertical-align:middle;';
      thElement.appendChild(btn);
    }

    this.dropdowns[colKey] = { th: thElement, btn };

    btn.onclick = (e) => {
      e.stopPropagation();
      this._toggleDropdown(colKey);
    };
  }

  _toggleDropdown(colKey) {
    const dd = this.dropdowns[colKey];
    if (!dd) return;

    // Close any open dropdowns
    Object.entries(this.dropdowns).forEach(([k, v]) => {
      if (k !== colKey && v.el) { v.el.remove(); v.el = null; }
    });

    if (dd.el) { dd.el.remove(); dd.el = null; return; }

    const values = this.getValues(colKey);
    const uniqueVals = [...new Set(values.map(v => String(v ?? '')))].sort((a,b) => a.localeCompare(b));
    const selected = this.filters[colKey] || new Set(uniqueVals);

    const el = document.createElement('div');
    el.className = 'cf-dropdown';
    
    el.innerHTML = `
      <div class="cf-dd-search">
        <input type="text" placeholder="Cari..." class="cf-dd-input">
      </div>
      <div class="cf-dd-actions">
        <button class="cf-dd-btn cf-select-all">Pilih Semua</button>
        <button class="cf-dd-btn cf-clear-all">Hapus Semua</button>
      </div>
      <div class="cf-dd-list">
        ${uniqueVals.map(v => `
          <label class="cf-dd-item" data-val="${v.replace(/"/g,'&quot;')}">
            <input type="checkbox" ${selected.has(v) ? 'checked' : ''} value="${v.replace(/"/g,'&quot;')}">
            <span class="cf-dd-label">${v || '(Kosong)'}</span>
          </label>
        `).join('')}
      </div>
      <div class="cf-dd-footer">
        <button class="btn btn-primary btn-sm cf-apply" style="width:100%;justify-content:center;">Terapkan</button>
      </div>
    `;

    // Position relative to th
    const thRect = dd.th.getBoundingClientRect();
    const scrollParent = dd.th.closest('.table-wrap') || dd.th.closest('.page-body') || document.body;
    const scrollRect = scrollParent.getBoundingClientRect();
    
    el.style.position = 'fixed';
    el.style.top = (thRect.bottom + 4) + 'px';
    el.style.left = Math.max(8, Math.min(thRect.left, window.innerWidth - 240)) + 'px';
    el.style.zIndex = '9999';

    document.body.appendChild(el);
    dd.el = el;

    // Search
    el.querySelector('.cf-dd-input').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      el.querySelectorAll('.cf-dd-item').forEach(item => {
        item.style.display = item.dataset.val.toLowerCase().includes(q) ? '' : 'none';
      });
    };

    // Select All / Clear All
    el.querySelector('.cf-select-all').onclick = () => {
      el.querySelectorAll('.cf-dd-item input[type="checkbox"]').forEach(cb => {
        if (cb.closest('.cf-dd-item').style.display !== 'none') cb.checked = true;
      });
    };
    el.querySelector('.cf-clear-all').onclick = () => {
      el.querySelectorAll('.cf-dd-item input[type="checkbox"]').forEach(cb => cb.checked = false);
    };

    // Apply
    el.querySelector('.cf-apply').onclick = () => {
      const checked = new Set();
      el.querySelectorAll('.cf-dd-item input:checked').forEach(cb => checked.add(cb.value));
      
      if (checked.size === uniqueVals.length) {
        delete this.filters[colKey]; // All selected = no filter
        dd.btn.style.opacity = '.4';
        dd.btn.style.color = '';
      } else {
        this.filters[colKey] = checked;
        dd.btn.style.opacity = '1';
        dd.btn.style.color = 'var(--primary)';
      }
      el.remove();
      dd.el = null;
      this.onFilter(this.filters);
    };

    // Focus search
    setTimeout(() => el.querySelector('.cf-dd-input')?.focus(), 50);
  }

  getActiveFilters() {
    return this.filters;
  }

  /** Check if a row passes all active filters */
  passesFilter(rowData) {
    for (const [colKey, allowed] of Object.entries(this.filters)) {
      const val = String(rowData[colKey] ?? '');
      if (!allowed.has(val)) return false;
    }
    return true;
  }

  reset() {
    this.filters = {};
    Object.values(this.dropdowns).forEach(dd => {
      dd.btn.style.opacity = '.4';
      dd.btn.style.color = '';
      if (dd.el) { dd.el.remove(); dd.el = null; }
    });
  }

  destroy() {
    document.removeEventListener('click', this._onDocClick, true);
    Object.values(this.dropdowns).forEach(dd => {
      if (dd.el) dd.el.remove();
    });
  }
}
