/**
 * Smart Validation Engine - Ensures data integrity across the system
 */

export class ValidationEngine {
  constructor() { this.rules = {}; }
  registerRules(key, rules) { this.rules[key] = rules; }
  validateItem(key, item) {
    const errors = [];
    (this.rules[key] || []).forEach(rule => {
      const result = rule.validate(item);
      if (!result.valid) errors.push({ field: rule.field, message: result.message });
    });
    return { isValid: errors.length === 0, errors };
  }
  getErrorMessage(errors) {
    return errors.map(e => `${e.field}: ${e.message}`).join('\n');
  }
}

export const VALIDATION_RULES = {
  santri: [
    { field: 'STambuk', validate: (i) => ({ valid: !!(i.STambuk?.toString().trim()), message: 'Stambuk harus diisi' }) },
    { field: 'Nama',    validate: (i) => ({ valid: !!(i.Nama?.toString().trim()),    message: 'Nama harus diisi' }) },
  ],
  guru: [
    { field: 'Nama',   validate: (i) => ({ valid: !!(i.Nama?.toString().trim()),            message: 'Nama guru harus diisi' }) },
    { field: 'Status', validate: (i) => ({ valid: ['Aktif','Non-Aktif'].includes(i.Status), message: 'Status tidak valid' }) },
  ],
  // NB: Indikator disimpan flat (Ind1..Ind10) bukan nested object
  tesBacaan: [
    { field: 'PesertaID', validate: (i) => ({ valid: !!(i.PesertaID?.toString().trim()),            message: 'ID Peserta harus diisi' }) },
    { field: 'NamaSurah', validate: (i) => ({ valid: !!(i.NamaSurah?.toString().trim()),            message: 'Surah harus diisi' }) },
    { field: 'IDPenguji', validate: (i) => ({ valid: !!(i.IDPenguji?.toString().trim()),            message: 'Penguji harus dipilih' }) },
    { field: 'JenisTes',  validate: (i) => ({ valid: ['Pre Test','Post Test'].includes(i.JenisTes), message: 'Jenis tes tidak valid' }) },
  ],
  hafalan: [
    { field: 'STambuk',   validate: (i) => ({ valid: !!(i.STambuk?.toString().trim()),   message: 'Stambuk harus diisi' }) },
    { field: 'NamaSurah', validate: (i) => ({ valid: !!(i.NamaSurah?.toString().trim()), message: 'Nama surah harus diisi' }) },
  ],
  sesiUjian: [
    { field: 'NamaSesi',        validate: (i) => ({ valid: !!(i.NamaSesi?.toString().trim()),        message: 'Nama sesi harus diisi' }) },
    { field: 'Tanggal',         validate: (i) => ({ valid: !!(i.Tanggal),                             message: 'Tanggal harus diisi' }) },
    { field: 'PenanggungJawab', validate: (i) => ({ valid: !!(i.PenanggungJawab?.toString().trim()), message: 'Penanggung jawab harus diisi' }) },
    { field: 'TipeSesi',        validate: (i) => ({ valid: ['Bacaan','Hafalan'].includes(i.TipeSesi), message: 'Tipe sesi tidak valid' }) },
  ],
};

export function validateWorkflow(type, data) {
  if (type === 'sesiUjian->rapot') {
    if (!data.peserta?.length) return { valid: false, message: 'Pilih minimal 1 peserta' };
    if (!data.materi || !Object.keys(data.materi).length) return { valid: false, message: 'Tentukan materi ujian' };
  }
  return { valid: true };
}

export const validator = new ValidationEngine();
