/**
 * SearchableSelect v3 — robust fix
 * - mousedown + stopPropagation untuk cegah event bocor ke elemen bawah
 * - _filter otomatis buka dropdown saat user mengetik
 * - click input saat sudah focus tetap membuka dropdown
 * - AbortController mencegah event listener menumpuk
 */
export class SearchableSelect {
  constructor(wrapper, options = [], { placeholder = 'Cari...', onSelect = () => {} } = {}) {
    this.options  = options;
    this.filtered = [...options];
    this.onSelect = onSelect;
    this._val     = '';
    this._open    = false;
    this._wrapper = wrapper;

    // Cleanup listener instance lama pada wrapper yang sama
    if (wrapper._ssDestroy) wrapper._ssDestroy();

    wrapper.innerHTML = `
      <div class="ss-root">
        <div class="ss-control">
          <input type="text" class="ss-input" placeholder="${placeholder}" autocomplete="off" spellcheck="false" readonly>
          <span class="ss-arrow">&#9660;</span>
        </div>
        <div class="ss-dropdown" style="display:none;"></div>
      </div>`;

    this._input    = wrapper.querySelector('.ss-input');
    this._dropdown = wrapper.querySelector('.ss-dropdown');
    this._arrow    = wrapper.querySelector('.ss-arrow');

    this._ac = new AbortController();
    const sig = { signal: this._ac.signal };

    // Buka saat focus atau klik input
    this._input.addEventListener('focus',     () => this._open ? null : this._show(), sig);
    this._input.addEventListener('click',     () => this._open ? null : this._show(), sig);

    // Saat user mengetik: ubah ke mode edit, buka dropdown
    this._input.addEventListener('keydown',   (e) => this._onKeydown(e), sig);
    // Jalankan filter saat teks berubah
    this._input.addEventListener('input',     (e) => this._filter(e.target.value), sig);

    // Toggle arrow
    this._arrow.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._open ? this._hide() : this._show();
    }, sig);

    // Tutup saat klik di luar
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) this._hide();
    }, sig);

    wrapper._ssDestroy = () => this._ac.abort();
  }

  _onKeydown(e) {
    // Saat user mulai mengetik, ubah input ke mode search
    if (e.key === 'Escape') { this._hide(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Clear selection jika hapus semua teks
      this._input.removeAttribute('readonly');
      if (!this._input.value) {
        this._val = '';
        this.filtered = [...this.options];
        this._renderList();
      }
      if (!this._open) this._show();
      return;
    }
    if (e.key.length === 1 || e.key === 'Process') {
      // Karakter biasa — buka dropdown dan aktifkan search
      this._input.removeAttribute('readonly');
      if (!this._open) this._show();
    }
  }

  _filter(q) {
    const low = q.toLowerCase();
    this.filtered = this.options.filter(o => o.label.toLowerCase().includes(low));
    this._renderList();
    if (!this._open) {
      this._open = true;
      this._dropdown.style.display = 'block';
      this._arrow.style.transform  = 'rotate(180deg)';
    }
  }

  _renderList() {
    if (!this.filtered.length) {
      this._dropdown.innerHTML = '<div class="ss-empty">Tidak ditemukan</div>';
    } else {
      this._dropdown.innerHTML = this.filtered.map(o =>
        `<div class="ss-option${o.value === this._val ? ' ss-selected' : ''}" data-value="${o.value}">${o.label}</div>`
      ).join('');

      this._dropdown.querySelectorAll('.ss-option').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();    // cegah input blur
          e.stopPropagation();   // cegah dokumen listener menginterup
          this._selectOption(el.dataset.value, el.textContent.trim());
        });
      });
    }
  }

  _selectOption(val, label) {
    this._val  = val;
    this._open = false;
    this._input.value = label;
    this._input.setAttribute('readonly', '');   // kembali ke mode readonly setelah pilih
    this._dropdown.style.display = 'none';
    this._arrow.style.transform  = '';
    this.onSelect(val, label);
  }

  _show() {
    this._open    = true;
    this.filtered = [...this.options];
    this._renderList();
    this._dropdown.style.display = 'block';
    this._arrow.style.transform  = 'rotate(180deg)';
    // Kosongkan input untuk memudahkan search
    this._input.removeAttribute('readonly');
    this._input.select();
  }

  _hide() {
    if (!this._open) return;
    this._open = false;
    this._dropdown.style.display = 'none';
    this._arrow.style.transform  = '';
    this._input.setAttribute('readonly', '');
    // Kembalikan label terpilih jika ada
    if (this._val) {
      const opt = this.options.find(o => o.value === this._val);
      if (opt) this._input.value = opt.label;
      else { this._input.value = ''; this._val = ''; }
    } else {
      this._input.value = '';
    }
  }

  getValue() { return this._val; }

  setValue(v) {
    const opt = this.options.find(o => String(o.value) === String(v));
    if (opt) {
      this._val = opt.value;
      this._input.value = opt.label;
      this._input.setAttribute('readonly', '');
    } else {
      this._val = '';
      this._input.value = '';
    }
  }

  reset() {
    this._val = '';
    this._input.value = '';
    this._input.setAttribute('readonly', '');
  }

  setOptions(opts) {
    this.options  = opts;
    this.filtered = [...opts];
    this._val     = '';
    this._input.value = '';
    this._input.setAttribute('readonly', '');
  }

  destroy() { this._ac.abort(); }
}
