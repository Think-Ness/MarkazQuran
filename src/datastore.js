/**
 * Unified Data Store - Central state management for Markaz Qur'an
 * Handles caching, API sync, change tracking, and data consistency
 */

import * as api from './api.js';

class DataStore {
  constructor() {
    this.cache = {};
    this.validators = {};
    this.listeners = {};
    this.isInitialized = false;
  }

  /**
   * Register a data validator for a collection
   */
  registerValidator(key, validator) {
    this.validators[key] = validator;
  }

  /**
   * Initialize all data from API at startup
   */
  async initialize() {
    const parse = d => Array.isArray(d) ? d : (typeof d === 'string' ? JSON.parse(d) : []);
    try {
      const [santri, guru, surah, tes, hafalan, sesi, config] = await Promise.all([
        api.getSantri().then(parse),
        api.getGuru().then(parse),
        api.getSurahList().then(parse),
        api.getTesBacaan().then(parse),
        api.getHafalan().then(parse),
        api.getSesiUjian().then(parse),
        api.getConfig().then(d => typeof d === 'string' ? JSON.parse(d) : (d || {}))
      ]);
      
      this.cache['santri'] = santri;
      this.cache['guru'] = guru;
      this.cache['surah'] = surah;
      this.cache['tesBacaan'] = tes;
      this.cache['hafalan'] = hafalan;
      this.cache['sesiUjian'] = sesi;
      this.cache['config'] = config;

      // Parse configs for Sesi
      this.cache['sesiUjian'].forEach(s => {
        try { s._materi  = typeof s.TargetUjian === 'string' ? JSON.parse(s.TargetUjian || '{}') : (s.TargetUjian || {}); } catch(e){ s._materi={}; }
        try { s._peserta = typeof s.Peserta === 'string'     ? JSON.parse(s.Peserta     || '[]') : (s.Peserta     || []); } catch(e){ s._peserta=[]; }
      });

      this.isInitialized = true;
      Object.keys(this.listeners).forEach(key => this._notifyListeners(key));
      return { ok: true };
    } catch (e) {
      console.error("Initialization failed:", e);
      return { ok: false, msg: e.message };
    }
  }

  /**
   * Get collection data
   */
  get(key) {
    return this.cache[key] || [];
  }

  /**
   * Get single item by ID
   */
  getById(key, id) {
    const arr = this.cache[key] || [];
    return arr.find(item =>
      item.id === id ||
      item.STambuk === id ||
      item.SesiID === id ||
      item.IDGuru === id ||
      String(item.id) === String(id)
    );
  }

  /**
   * Add item to collection and sync to API
   */
  async add(key, item, skipValidation = false) {
    if (!skipValidation && this.validators[key]) {
      const result = this.validators[key](item);
      if (!result.isValid) return { ok: false, msg: result.errors.join(', ') };
    }

    let apiFunc;
    if (key === 'santri') apiFunc = api.addSantri;
    else if (key === 'guru') apiFunc = api.addGuru;
    else if (key === 'tesBacaan') apiFunc = api.addTesBacaan;
    else if (key === 'hafalan') apiFunc = api.addHafalan;
    else if (key === 'sesiUjian') apiFunc = api.addSesiUjian;
    else return { ok: false, msg: `API add function not mapped for ${key}` };

    const res = await apiFunc(item);
    if (res.ok) {
      if (!this.cache[key]) this.cache[key] = [];
      
      if (key === 'sesiUjian') {
        try { res.data = res.data || item; } catch(e){}
        if(res.data) {
           try { res.data._materi  = typeof res.data.TargetUjian === 'string' ? JSON.parse(res.data.TargetUjian || '{}') : (res.data.TargetUjian || {}); } catch(e){ res.data._materi={}; }
           try { res.data._peserta = typeof res.data.Peserta === 'string'     ? JSON.parse(res.data.Peserta     || '[]') : (res.data.Peserta     || []); } catch(e){ res.data._peserta=[]; }
        }
      }

      // Instead of just pushing, if API returns updated object, use it. Otherwise use item.
      const newItem = res.data ? res.data : item;

      // Assign ID if missing so getById works
      if (!newItem.id && newItem.STambuk) newItem.id = newItem.STambuk;
      if (!newItem.id && newItem.SesiID) newItem.id = newItem.SesiID;

      this.cache[key].push(newItem);
      this._notifyListeners(key);
      return { ok: true, data: res, item: newItem };
    }
    return res;
  }

  /**
   * Update item in collection and sync to API
   */
  async update(key, id, updates, skipValidation = false) {
    let apiFunc;
    if (key === 'santri') apiFunc = api.updateSantri;
    else if (key === 'guru') apiFunc = api.updateGuru;
    else if (key === 'tesBacaan') apiFunc = api.updateTesBacaan;
    else if (key === 'hafalan') apiFunc = api.updateHafalan;
    else if (key === 'sesiUjian') apiFunc = api.updateSesiUjian;
    else return { ok: false, msg: `API update function not mapped for ${key}` };

    // the payload usually needs the ID.
    const payload = { ...updates };
    if (!payload.STambuk && key === 'santri') payload.STambuk = id;
    if (!payload.SesiID && key === 'sesiUjian') payload.SesiID = id;
    if (!payload.IDGuru && key === 'guru') payload.IDGuru = id;
    // For tesBacaan and hafalan it might be row index or specific ID. Assuming ID is sent in payload.

    const res = await apiFunc(payload);
    if (res.ok) {
      const arr = this.cache[key] || [];
      const itemIndex = arr.findIndex(item =>
        item.id === id || item.STambuk === id || item.SesiID === id || item.ID === id
      );

      if (itemIndex > -1) {
        Object.assign(arr[itemIndex], updates);
        
        if (key === 'sesiUjian') {
           try { arr[itemIndex]._materi  = typeof arr[itemIndex].TargetUjian === 'string' ? JSON.parse(arr[itemIndex].TargetUjian || '{}') : (arr[itemIndex].TargetUjian || {}); } catch(e){ arr[itemIndex]._materi={}; }
           try { arr[itemIndex]._peserta = typeof arr[itemIndex].Peserta === 'string'     ? JSON.parse(arr[itemIndex].Peserta     || '[]') : (arr[itemIndex].Peserta     || []); } catch(e){ arr[itemIndex]._peserta=[]; }
        }

        this._notifyListeners(key);
      }
      return { ok: true, data: res };
    }
    return res;
  }

  /**
   * Delete item from collection and sync to API
   */
  async remove(key, id) {
    let apiFunc;
    if (key === 'santri') apiFunc = api.deleteSantri;
    else if (key === 'guru') apiFunc = api.deleteGuru;
    else if (key === 'tesBacaan') apiFunc = api.deleteTesBacaan;
    else if (key === 'hafalan') apiFunc = api.deleteHafalan;
    else if (key === 'sesiUjian') apiFunc = api.deleteSesiUjian;
    else if (key === 'rapot') apiFunc = api.deleteRapot;
    else return { ok: false, msg: `API delete function not mapped for ${key}` };

    const res = await apiFunc(id);
    if (res.ok) {
      const arr = this.cache[key] || [];
      const idx = arr.findIndex(item =>
        item.id === id || item.STambuk === id || item.SesiID === id ||
        item.ID === id || item.IDGuru === id || String(item.id) === String(id) ||
        String(item.SesiID) === String(id)
      );
      if (idx > -1) {
        arr.splice(idx, 1);
        this._notifyListeners(key);
      }
      return { ok: true };
    }
    return res;
  }

  /**
   * Subscribe to collection changes
   */
  subscribe(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(callback);
    return () => {
      const idx = this.listeners[key].indexOf(callback);
      if (idx > -1) this.listeners[key].splice(idx, 1);
    };
  }

  /**
   * Filter collection with smart conditions
   */
  filter(key, predicate) {
    const arr = this.cache[key] || [];
    return arr.filter(predicate);
  }

  _notifyListeners(key) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => cb(this.cache[key]));
    }
  }
}

export const dataStore = new DataStore();

