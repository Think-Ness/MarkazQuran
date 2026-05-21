/**
 * Unified Data Store - Central state management for Markaz Qur'an
 * Handles caching, change tracking, validation, and data consistency
 */

class DataStore {
  constructor() {
    this.cache = {};
    this.validators = {};
    this.listeners = {};
    this.transactionLog = [];
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Register a data validator for a collection
   * @param {string} key - collection name
   * @param {Function} validator - validation function(data) => { isValid, errors }
   */
  registerValidator(key, validator) {
    this.validators[key] = validator;
  }

  /**
   * Set collection data with validation
   * @param {string} key - collection name
   * @param {Array} data - data array
   * @param {Boolean} skipValidation - bypass validation if needed
   */
  set(key, data, skipValidation = false) {
    // Validate before setting
    if (!skipValidation && this.validators[key]) {
      const result = this.validators[key](data);
      if (!result.isValid) {
        console.error(`Validation failed for ${key}:`, result.errors);
        return { ok: false, errors: result.errors };
      }
    }

    // Track undo
    if (this.cache[key]) {
      this.undoStack.push({ key, data: structuredClone(this.cache[key]) });
      this.redoStack = []; // Clear redo when new change
    }

    // Store data
    this.cache[key] = Array.isArray(data) ? data : [];

    // Notify listeners
    this._notifyListeners(key);
    this.transactionLog.push({ type: 'SET', key, timestamp: Date.now() });

    return { ok: true };
  }

  /**
   * Get collection data
   */
  get(key) {
    return this.cache[key] || [];
  }

  /**
   * Get single item by ID
   * @param {string} key - collection name
   * @param {string} id - item ID (supports: id, STambuk, SesiID)
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
   * Add item to collection
   */
  add(key, item) {
    if (!this.cache[key]) this.cache[key] = [];

    // Assign ID if missing
    if (!item.id && item.STambuk) item.id = item.STambuk;
    if (!item.id && item.SesiID) item.id = item.SesiID;

    this.cache[key].push(item);
    this._notifyListeners(key);
    return { ok: true, item };
  }

  /**
   * Update item in collection
   */
  update(key, id, updates) {
    const arr = this.cache[key] || [];
    const item = this.getById(key, id);

    if (!item) {
      return { ok: false, error: `Item ${id} not found in ${key}` };
    }

    // Track undo
    this.undoStack.push({ key, id, data: structuredClone(item) });
    this.redoStack = [];

    // Merge updates
    Object.assign(item, updates);
    this._notifyListeners(key);
    return { ok: true, item };
  }

  /**
   * Delete item from collection
   */
  delete(key, id) {
    const arr = this.cache[key] || [];
    const idx = arr.findIndex(item =>
      item.id === id || item.STambuk === id || item.SesiID === id
    );

    if (idx === -1) {
      return { ok: false, error: `Item ${id} not found in ${key}` };
    }

    const deleted = arr[idx];
    this.undoStack.push({ key, deleted, index: idx });
    this.redoStack = [];

    arr.splice(idx, 1);
    this._notifyListeners(key);
    return { ok: true, deleted };
  }

  /**
   * Filter collection with smart conditions
   */
  filter(key, predicate) {
    const arr = this.cache[key] || [];
    return arr.filter(predicate);
  }

  /**
   * Map over collection
   */
  map(key, mapper) {
    const arr = this.cache[key] || [];
    return arr.map(mapper);
  }

  /**
   * Subscribe to collection changes
   */
  subscribe(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(callback);

    // Return unsubscribe function
    return () => {
      const idx = this.listeners[key].indexOf(callback);
      if (idx > -1) this.listeners[key].splice(idx, 1);
    };
  }

  /**
   * Undo last change
   */
  undo() {
    if (this.undoStack.length === 0) return { ok: false };

    const action = this.undoStack.pop();
    const current = structuredClone(this.cache[action.key]);

    if (action.data) {
      this.cache[action.key] = action.data;
    } else if (action.deleted !== undefined) {
      this.cache[action.key].splice(action.index, 0, action.deleted);
    }

    this.redoStack.push(current);
    this._notifyListeners(action.key);
    return { ok: true };
  }

  /**
   * Redo last undone change
   */
  redo() {
    if (this.redoStack.length === 0) return { ok: false };

    const toRestore = this.redoStack.pop();
    const key = Object.keys(toRestore)[0];
    this.undoStack.push(structuredClone(this.cache[key]));
    this.cache[key] = toRestore;
    this._notifyListeners(key);
    return { ok: true };
  }

  /**
   * Clear all data
   */
  clear() {
    this.cache = {};
    this.undoStack = [];
    this.redoStack = [];
    this.transactionLog = [];
  }

  /**
   * Export all data
   */
  export() {
    return structuredClone(this.cache);
  }

  /**
   * Get collection count
   */
  count(key) {
    return (this.cache[key] || []).length;
  }

  /**
   * Private: Notify listeners of change
   */
  _notifyListeners(key) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => cb(this.cache[key]));
    }
  }
}

// Export as singleton
export const dataStore = new DataStore();
