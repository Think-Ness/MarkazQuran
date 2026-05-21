/**
 * Smart Validation Engine - Ensures data integrity across the system
 * Prevents invalid data from being saved
 */

export class ValidationEngine {
  constructor() {
    this.rules = {};
  }

  /**
   * Register validation rules for a collection
   */
  registerRules(key, rules) {
    this.rules[key] = rules;
  }

  /**
   * Validate single item
   * Returns: { isValid, errors: [] }
   */
  validateItem(key, item) {
    const errors = [];
    const rules = this.rules[key] || [];

    rules.forEach(rule => {
      const result = rule.validate(item);
      if (!result.valid) {
        errors.push({
          field: rule.field,
          message: result.message,
          value: item[rule.field]
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate entire collection
   */
  validateCollection(key, items) {
    const results = items.map((item, idx) => ({
      index: idx,
      ...this.validateItem(key, item)
    }));

    const allErrors = results.filter(r => !r.isValid);
    return {
      isValid: allErrors.length === 0,
      totalErrors: allErrors.length,
      details: allErrors
    };
  }

  /**
   * Get formatted error message for UI
   */
  getErrorMessage(errors) {
    if (!errors.length) return '';
    return errors.map(e => `${e.field}: ${e.message}`).join('\n');
  }
}

/**
 * Pre-defined validation rules for Markaz Qur'an
 */
export const VALIDATION_RULES = {
  santri: [
    { field: 'STambuk', validate: (item) => ({
      valid: item.STambuk && String(item.STambuk).trim().length > 0,
      message: 'Stambuk santri harus diisi'
    })},
    { field: 'Nama', validate: (item) => ({
      valid: item.Nama && String(item.Nama).trim().length > 0,
      message: 'Nama santri harus diisi'
    })},
    { field: 'Status', validate: (item) => ({
      valid: ['Aktif', 'Non-Aktif', 'Lulus'].includes(item.Status),
      message: 'Status harus: Aktif, Non-Aktif, atau Lulus'
    })}
  ],

  guru: [
    { field: 'Nama', validate: (item) => ({
      valid: item.Nama && String(item.Nama).trim().length > 0,
      message: 'Nama guru harus diisi'
    })},
    { field: 'Status', validate: (item) => ({
      valid: ['Aktif', 'Non-Aktif'].includes(item.Status),
      message: 'Status harus: Aktif atau Non-Aktif'
    })}
  ],

  tesBacaan: [
    { field: 'PesertaID', validate: (item) => ({
      valid: item.PesertaID && String(item.PesertaID).trim().length > 0,
      message: 'ID Peserta harus diisi'
    })},
    { field: 'SurahTarget', validate: (item) => ({
      valid: item.SurahTarget && String(item.SurahTarget).trim().length > 0,
      message: 'Surah target harus diisi'
    })},
    { field: 'JenisTes', validate: (item) => ({
      valid: ['Pre Test', 'Post Test'].includes(item.JenisTes),
      message: 'Jenis tes harus: Pre Test atau Post Test'
    })},
    { field: 'Indikator', validate: (item) => {
      const ind = item.Indikator || {};
      const hasAny = Object.keys(ind).length > 0;
      return {
        valid: hasAny,
        message: 'Minimal 1 indikator harus terisi'
      };
    }}
  ],

  hafalan: [
    { field: 'STambuk', validate: (item) => ({
      valid: item.STambuk && String(item.STambuk).trim().length > 0,
      message: 'Stambuk santri harus diisi'
    })},
    { field: 'NamaSurah', validate: (item) => ({
      valid: item.NamaSurah && String(item.NamaSurah).trim().length > 0,
      message: 'Nama surah harus diisi'
    })},
    { field: 'Status', validate: (item) => ({
      valid: ['Selesai', 'Proses'].includes(item.Status),
      message: 'Status harus: Selesai atau Proses'
    })}
  ],

  sesiUjian: [
    { field: 'NamaSesi', validate: (item) => ({
      valid: item.NamaSesi && String(item.NamaSesi).trim().length > 0,
      message: 'Nama sesi harus diisi'
    })},
    { field: 'Tanggal', validate: (item) => ({
      valid: item.Tanggal && new Date(item.Tanggal) instanceof Date && !isNaN(new Date(item.Tanggal)),
      message: 'Tanggal tidak valid'
    })},
    { field: 'PenanggungJawab', validate: (item) => ({
      valid: item.PenanggungJawab && String(item.PenanggungJawab).trim().length > 0,
      message: 'Penanggung jawab harus diisi'
    })},
    { field: 'TipeSesi', validate: (item) => ({
      valid: ['Bacaan', 'Hafalan'].includes(item.TipeSesi),
      message: 'Tipe sesi harus: Bacaan atau Hafalan'
    })}
  ],

  rapot: [
    { field: 'STambuk', validate: (item) => ({
      valid: item.STambuk && String(item.STambuk).trim().length > 0,
      message: 'Stambuk santri harus diisi'
    })},
    { field: 'Periode', validate: (item) => ({
      valid: item.Periode && String(item.Periode).trim().length > 0,
      message: 'Periode harus diisi'
    })},
    { field: 'NilaiAkhir', validate: (item) => {
      const val = Number(item.NilaiAkhir);
      return {
        valid: !isNaN(val) && val >= 0 && val <= 100,
        message: 'Nilai harus antara 0-100'
      };
    }}
  ]
};

/**
 * Helper to check if workflow is valid before proceeding
 */
export function validateWorkflow(type, data) {
  const checks = {
    'sesiUjian->rapot': (d) => {
      // Check if session has selected participants
      if (!d.peserta || d.peserta.length === 0) {
        return { valid: false, message: 'Pilih minimal 1 peserta untuk sesi' };
      }
      if (!d.materi || Object.keys(d.materi).length === 0) {
        return { valid: false, message: 'Tentukan materi ujian' };
      }
      return { valid: true };
    },

    'session->evaluations': (d) => {
      // Check if all participants have evaluations
      if (d.totalPeserta === 0) {
        return { valid: false, message: 'Tidak ada peserta dalam sesi' };
      }
      if (d.evaluatedCount < d.totalPeserta) {
        return {
          valid: false,
          message: `${d.totalPeserta - d.evaluatedCount} peserta belum dievaluasi`,
          warning: true
        };
      }
      return { valid: true };
    },

    'rapot->print': (d) => {
      if (!d.STambuk) return { valid: false, message: 'Santri harus dipilih' };
      if (!d.Periode) return { valid: false, message: 'Periode harus diisi' };
      if (d.NilaiAkhir === undefined || d.NilaiAkhir === '') {
        return { valid: false, message: 'Nilai akhir harus diisi' };
      }
      return { valid: true };
    }
  };

  const checker = checks[type];
  if (!checker) return { valid: true };
  return checker(data);
}

export const validator = new ValidationEngine();
