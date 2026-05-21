// =============================================================================
// MARKAZ QUR'AN — GOOGLE APPS SCRIPT API (Enhanced with Validation & Audit)
// Vercel Frontend → fetch(GAS_URL, {method:'POST', body:JSON.stringify({action,data})})
// Version 2.0: Smart validation, audit logging, auto-calculations
// =============================================================================
const SHEET = {
  SANTRI:'MasterSantri', GURU:'MasterGuru', TES_BACAAN:'TesBacaan',
  CHECKLIST:'ChecklistBacaan', HAFALAN:'Hafalan', RAPOT:'Rapot',
  CONFIG:'Config', SESI_UJIAN:'SesiUjian', AUDIT:'AuditLog'
};

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({status:'Markaz Quran API running'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    const req    = JSON.parse(e.postData.contents);
    const action = req.action;
    const data   = req.data;
    const map = {
      getSantri, addSantri, updateSantri, deleteSantri,
      getGuru, addGuru, updateGuru, deleteGuru,
      getTesBacaan, addTesBacaan, updateTesBacaan, deleteTesBacaan,
      getHafalan, addHafalan, updateHafalan, deleteHafalan,
      getRapot, saveRapot, deleteRapot,
      getSesiUjian, addSesiUjian, updateSesiUjian, deleteSesiUjian,
      getDashboardStats, getSurahList, setupSpreadsheet, setupSesiUjianSheet,
      getConfig, saveConfig,
      getDataHealthStatus, validateData
    };
    if (!map[action]) { out.setContent(JSON.stringify({ok:false,msg:'Unknown action: '+action})); return out; }
    const result = data !== undefined ? map[action](data) : map[action]();
    out.setContent(typeof result === 'string' ? result : JSON.stringify(result));
  } catch(err) {
    out.setContent(JSON.stringify({ok:false, msg:err.message}));
  }
  return out;
}

// ── Helpers ──────────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); initHeaders(sh, name); }
  return sh;
}
function initHeaders(sh, name) {
  const h = {
    [SHEET.SANTRI]     :['STambuk','Nama','Kelas','Daerah','Rayon','Kamar','TanggalMasuk','Status'],
    [SHEET.GURU]       :['IDGuru','Nama','Tahun','KamarBagian','Status'],
    [SHEET.TES_BACAAN] :['ID','TipePeserta','PesertaID','IDPenguji','Tanggal','NoSurah','NamaSurah','Halaman','JenisTes','Ind1','Ind2','Ind3','Ind4','Ind5','Ind6','Ind7','Ind8','Ind9','Ind10','NilaiAkhir','Catatan','Timestamp'],
    [SHEET.HAFALAN]    :['ID','STambuk','IDPenguji','NoSurah','NamaSurah','Juz','AyatDari','AyatSampai','Status','TanggalSetor','Catatan','Timestamp'],
    [SHEET.RAPOT]      :['ID','STambuk','NamaSantri','Periode','NilaiBacaan','NilaiTajwid','NilaiHafalan','Kehadiran','Catatan','Rekomendasi','Tanggal','Timestamp'],
    [SHEET.CONFIG]     :['Key','Value'],
    [SHEET.SESI_UJIAN] :['SesiID','NamaSesi','TipeSesi','Tanggal','PenanggungJawab','Peserta','TargetUjian','Status','Timestamp'],
    [SHEET.AUDIT]      :['Timestamp','Action','EntityType','EntityId','User','OldData','NewData']
  };
  if (h[name]) sh.appendRow(h[name]);
}
function sheetToObjects(sh) {
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const keys = data[0];
  return data.slice(1).map(row => { const o={}; keys.forEach((k,i)=>o[k]=row[i]); return o; });
}
function genId(p) { return p+new Date().getTime(); }
function setupSpreadsheet() { Object.values(SHEET).forEach(n=>getSheet(n)); return JSON.stringify({ok:true}); }

// ── VALIDATION LAYER (Server-side data integrity) ────────────
const VALIDATORS = {
  santri: (d) => {
    const errors = [];
    if (!d.STambuk || String(d.STambuk).trim() === '') errors.push('Stambuk santri harus diisi');
    if (!d.Nama || String(d.Nama).trim() === '') errors.push('Nama santri harus diisi');
    if (d.Status && !['Aktif', 'Non-Aktif', 'Lulus'].includes(d.Status)) errors.push('Status tidak valid');
    return { valid: errors.length === 0, errors };
  },
  guru: (d) => {
    const errors = [];
    if (!d.Nama || String(d.Nama).trim() === '') errors.push('Nama guru harus diisi');
    if (d.Status && !['Aktif', 'Non-Aktif'].includes(d.Status)) errors.push('Status guru tidak valid');
    return { valid: errors.length === 0, errors };
  },
  tesBacaan: (d) => {
    const errors = [];
    if (!d.PesertaID) errors.push('ID Peserta harus diisi');
    if (!d.NamaSurah) errors.push('Nama surah harus diisi');
    if (d.JenisTes && !['Pre Test', 'Post Test'].includes(d.JenisTes)) errors.push('Jenis tes tidak valid');
    // Calculate score if indicators provided
    if (d.Indikator || d.Ind1) {
      const ind = d.Indikator || {};
      let totalErrors = 0;
      for (let i = 1; i <= 10; i++) {
        const val = d[`Ind${i}`] !== undefined ? d[`Ind${i}`] : (ind[`Ind${i}`] || 0);
        totalErrors += Number(val) || 0;
      }
      if (totalErrors > 1000) errors.push('Total kesalahan tidak masuk akal (> 1000)');
      d.NilaiAkhir = Math.max(0, 100 - (totalErrors * 2));
    }
    return { valid: errors.length === 0, errors, data: d };
  },
  hafalan: (d) => {
    const errors = [];
    if (!d.STambuk) errors.push('Stambuk santri harus diisi');
    if (!d.NamaSurah) errors.push('Nama surah harus diisi');
    if (d.Status && !['Selesai', 'Proses'].includes(d.Status)) errors.push('Status hafalan tidak valid');
    return { valid: errors.length === 0, errors };
  },
  sesiUjian: (d) => {
    const errors = [];
    if (!d.NamaSesi) errors.push('Nama sesi harus diisi');
    if (!d.Tanggal) errors.push('Tanggal sesi harus diisi');
    if (!d.PenanggungJawab) errors.push('Penanggung jawab harus dipilih');
    if (d.TipeSesi && !['Bacaan', 'Hafalan'].includes(d.TipeSesi)) errors.push('Tipe sesi tidak valid');
    if (!d.Peserta || (Array.isArray(d.Peserta) ? d.Peserta.length === 0 : String(d.Peserta).trim() === '')) {
      errors.push('Minimal 1 peserta harus dipilih');
    }
    return { valid: errors.length === 0, errors };
  }
};

function validateData(type, data) {
  const validator = VALIDATORS[type];
  if (!validator) return { valid: true };
  return validator(data);
}

// ── AUDIT LOGGING (Track all changes) ────────────────────────
function logAudit(action, entityType, entityId, oldData, newData) {
  try {
    const user = Session.getEffectiveUser().getEmail();
    const sh = getSheet(SHEET.AUDIT);
    sh.appendRow([
      new Date().toISOString(),
      action,
      entityType,
      entityId,
      user,
      oldData ? JSON.stringify(oldData).substring(0, 500) : '',
      newData ? JSON.stringify(newData).substring(0, 500) : ''
    ]);
  } catch(e) {
    Logger.log('Audit log error: ' + e.message);
  }
}

// ── DATA CONSISTENCY CHECKS ──────────────────────────────────
function getDataHealthStatus() {
  try {
    const issues = [];
    const santri = sheetToObjects(getSheet(SHEET.SANTRI));
    const tes = sheetToObjects(getSheet(SHEET.TES_BACAAN));
    const hafalan = sheetToObjects(getSheet(SHEET.HAFALAN));

    const santriIds = new Set(santri.map(s => String(s.STambuk)));

    // Check: Peserta tes ada di master santri
    tes.forEach(t => {
      if (!santriIds.has(String(t.PesertaID))) {
        issues.push({ type: 'orphan_tes', peserta: t.PesertaID, tesId: t.ID });
      }
    });

    // Check: Peserta hafalan ada di master santri
    hafalan.forEach(h => {
      if (!santriIds.has(String(h.STambuk))) {
        issues.push({ type: 'orphan_hafalan', peserta: h.STambuk, hfId: h.ID });
      }
    });

    return { ok: true, issues, totalIssues: issues.length };
  } catch(e) {
    return { ok: false, msg: e.message };
  }
}

// ── Surah List ────────────────────────────────────────────────
function getSurahList() {
  const s=[
    {no:1,nama:'Al-Fatihah',juz:1,ayat:7},{no:2,nama:'Al-Baqarah',juz:1,ayat:286},
    {no:3,nama:'Ali Imran',juz:3,ayat:200},{no:4,nama:"An-Nisa",juz:4,ayat:176},
    {no:5,nama:"Al-Ma'idah",juz:6,ayat:120},{no:6,nama:"Al-An'am",juz:7,ayat:165},
    {no:7,nama:"Al-A'raf",juz:8,ayat:206},{no:8,nama:'Al-Anfal',juz:9,ayat:75},
    {no:9,nama:'At-Tawbah',juz:10,ayat:129},{no:10,nama:'Yunus',juz:11,ayat:109},
    {no:11,nama:'Hud',juz:11,ayat:123},{no:12,nama:'Yusuf',juz:12,ayat:111},
    {no:13,nama:"Ar-Ra'd",juz:13,ayat:43},{no:14,nama:'Ibrahim',juz:13,ayat:52},
    {no:15,nama:'Al-Hijr',juz:14,ayat:99},{no:16,nama:'An-Nahl',juz:14,ayat:128},
    {no:17,nama:"Al-Isra'",juz:15,ayat:111},{no:18,nama:'Al-Kahf',juz:15,ayat:110},
    {no:19,nama:'Maryam',juz:16,ayat:98},{no:20,nama:'Ta-Ha',juz:16,ayat:135},
    {no:21,nama:"Al-Anbiya'",juz:17,ayat:112},{no:22,nama:'Al-Hajj',juz:17,ayat:78},
    {no:23,nama:"Al-Mu'minun",juz:18,ayat:118},{no:24,nama:'An-Nur',juz:18,ayat:64},
    {no:25,nama:'Al-Furqan',juz:18,ayat:77},{no:26,nama:"Ash-Shu'ara'",juz:19,ayat:227},
    {no:27,nama:'An-Naml',juz:19,ayat:93},{no:28,nama:'Al-Qasas',juz:20,ayat:88},
    {no:29,nama:"Al-'Ankabut",juz:20,ayat:69},{no:30,nama:'Ar-Rum',juz:21,ayat:60},
    {no:31,nama:'Luqman',juz:21,ayat:34},{no:32,nama:'As-Sajdah',juz:21,ayat:30},
    {no:33,nama:'Al-Ahzab',juz:21,ayat:73},{no:34,nama:"Saba'",juz:22,ayat:54},
    {no:35,nama:'Fatir',juz:22,ayat:45},{no:36,nama:'Ya-Sin',juz:22,ayat:83},
    {no:37,nama:'As-Saffat',juz:23,ayat:182},{no:38,nama:'Sad',juz:23,ayat:88},
    {no:39,nama:'Az-Zumar',juz:23,ayat:75},{no:40,nama:'Ghafir',juz:24,ayat:85},
    {no:41,nama:'Fussilat',juz:24,ayat:54},{no:42,nama:'Ash-Shura',juz:25,ayat:53},
    {no:43,nama:'Az-Zukhruf',juz:25,ayat:89},{no:44,nama:'Ad-Dukhan',juz:25,ayat:59},
    {no:45,nama:'Al-Jathiyah',juz:25,ayat:37},{no:46,nama:'Al-Ahqaf',juz:26,ayat:35},
    {no:47,nama:'Muhammad',juz:26,ayat:38},{no:48,nama:'Al-Fath',juz:26,ayat:29},
    {no:49,nama:'Al-Hujurat',juz:26,ayat:18},{no:50,nama:'Qaf',juz:26,ayat:45},
    {no:51,nama:'Adh-Dhariyat',juz:26,ayat:60},{no:52,nama:'At-Tur',juz:27,ayat:49},
    {no:53,nama:'An-Najm',juz:27,ayat:62},{no:54,nama:'Al-Qamar',juz:27,ayat:55},
    {no:55,nama:'Ar-Rahman',juz:27,ayat:78},{no:56,nama:"Al-Waqi'ah",juz:27,ayat:96},
    {no:57,nama:'Al-Hadid',juz:27,ayat:29},{no:58,nama:'Al-Mujadila',juz:28,ayat:22},
    {no:59,nama:'Al-Hashr',juz:28,ayat:24},{no:60,nama:'Al-Mumtahanah',juz:28,ayat:13},
    {no:61,nama:'As-Saf',juz:28,ayat:14},{no:62,nama:"Al-Jumu'ah",juz:28,ayat:11},
    {no:63,nama:'Al-Munafiqun',juz:28,ayat:11},{no:64,nama:'At-Taghabun',juz:28,ayat:18},
    {no:65,nama:'At-Talaq',juz:28,ayat:12},{no:66,nama:'At-Tahrim',juz:28,ayat:12},
    {no:67,nama:'Al-Mulk',juz:29,ayat:30},{no:68,nama:'Al-Qalam',juz:29,ayat:52},
    {no:69,nama:'Al-Haqqah',juz:29,ayat:52},{no:70,nama:"Al-Ma'arij",juz:29,ayat:44},
    {no:71,nama:'Nuh',juz:29,ayat:28},{no:72,nama:'Al-Jinn',juz:29,ayat:28},
    {no:73,nama:'Al-Muzzammil',juz:29,ayat:20},{no:74,nama:'Al-Muddaththir',juz:29,ayat:56},
    {no:75,nama:'Al-Qiyamah',juz:29,ayat:40},{no:76,nama:'Al-Insan',juz:29,ayat:31},
    {no:77,nama:'Al-Mursalat',juz:29,ayat:50},{no:78,nama:"An-Naba'",juz:30,ayat:40},
    {no:79,nama:"An-Nazi'at",juz:30,ayat:46},{no:80,nama:"'Abasa",juz:30,ayat:42},
    {no:81,nama:'At-Takwir',juz:30,ayat:29},{no:82,nama:'Al-Infitar',juz:30,ayat:19},
    {no:83,nama:'Al-Mutaffifin',juz:30,ayat:36},{no:84,nama:'Al-Inshiqaq',juz:30,ayat:25},
    {no:85,nama:'Al-Buruj',juz:30,ayat:22},{no:86,nama:'At-Tariq',juz:30,ayat:17},
    {no:87,nama:"Al-A'la",juz:30,ayat:19},{no:88,nama:'Al-Ghashiyah',juz:30,ayat:26},
    {no:89,nama:'Al-Fajr',juz:30,ayat:30},{no:90,nama:'Al-Balad',juz:30,ayat:20},
    {no:91,nama:'Ash-Shams',juz:30,ayat:15},{no:92,nama:'Al-Layl',juz:30,ayat:21},
    {no:93,nama:'Ad-Duha',juz:30,ayat:11},{no:94,nama:'Ash-Sharh',juz:30,ayat:8},
    {no:95,nama:'At-Tin',juz:30,ayat:8},{no:96,nama:"Al-'Alaq",juz:30,ayat:19},
    {no:97,nama:'Al-Qadr',juz:30,ayat:5},{no:98,nama:'Al-Bayyinah',juz:30,ayat:8},
    {no:99,nama:'Az-Zalzalah',juz:30,ayat:8},{no:100,nama:"Al-'Adiyat",juz:30,ayat:11},
    {no:101,nama:"Al-Qari'ah",juz:30,ayat:11},{no:102,nama:'At-Takathur',juz:30,ayat:8},
    {no:103,nama:"Al-'Asr",juz:30,ayat:3},{no:104,nama:'Al-Humazah',juz:30,ayat:9},
    {no:105,nama:'Al-Fil',juz:30,ayat:5},{no:106,nama:'Quraish',juz:30,ayat:4},
    {no:107,nama:"Al-Ma'un",juz:30,ayat:7},{no:108,nama:'Al-Kauthar',juz:30,ayat:3},
    {no:109,nama:'Al-Kafirun',juz:30,ayat:6},{no:110,nama:'An-Nasr',juz:30,ayat:3},
    {no:111,nama:'Al-Masad',juz:30,ayat:5},{no:112,nama:'Al-Ikhlas',juz:30,ayat:4},
    {no:113,nama:'Al-Falaq',juz:30,ayat:5},{no:114,nama:'An-Nas',juz:30,ayat:6}
  ];
  return JSON.stringify(s);
}

// ── Santri ────────────────────────────────────────────────────
function getSantri() { return JSON.stringify(sheetToObjects(getSheet(SHEET.SANTRI))); }
function addSantri(d) {
  try {
    // Validate
    const val = validateData('santri', d);
    if (!val.valid) return JSON.stringify({ ok: false, msg: 'Validasi gagal', errors: val.errors });

    const sh = getSheet(SHEET.SANTRI);
    sh.appendRow([d.STambuk, d.Nama, d.Kelas, d.Daerah, d.Rayon, d.Kamar || '', d.TanggalMasuk || '', d.Status || 'Aktif']);
    logAudit('ADD', 'Santri', d.STambuk, null, d);
    return JSON.stringify({ ok: true });
  } catch(e) { return JSON.stringify({ ok: false, msg: e.message }); }
}
function updateSantri(d) {
  try {
    // Validate
    const val = validateData('santri', d);
    if (!val.valid) return JSON.stringify({ ok: false, msg: 'Validasi gagal', errors: val.errors });

    const sh = getSheet(SHEET.SANTRI), vals = sh.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) === String(d.STambuk)) {
        const old = { STambuk: vals[i][0], Nama: vals[i][1], Kelas: vals[i][2] };
        sh.getRange(i+1, 1, 1, 8).setValues([[d.STambuk, d.Nama, d.Kelas, d.Daerah, d.Rayon, d.Kamar || '', d.TanggalMasuk, d.Status]]);
        logAudit('UPDATE', 'Santri', d.STambuk, old, d);
        return JSON.stringify({ ok: true });
      }
    }
    return JSON.stringify({ ok: false, msg: 'Tidak ditemukan' });
  } catch(e) { return JSON.stringify({ ok: false, msg: e.message }); }
}
function deleteSantri(stambuk) {
  try {
    const sh = getSheet(SHEET.SANTRI), vals = sh.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) === String(stambuk)) {
        logAudit('DELETE', 'Santri', stambuk, { STambuk: vals[i][0], Nama: vals[i][1] }, null);
        sh.deleteRow(i+1);
        return JSON.stringify({ ok: true });
      }
    }
    return JSON.stringify({ ok: false, msg: 'Tidak ditemukan' });
  } catch(e) { return JSON.stringify({ ok: false, msg: e.message }); }
}

// ── Guru ──────────────────────────────────────────────────────
function getGuru() { return JSON.stringify(sheetToObjects(getSheet(SHEET.GURU))); }
function addGuru(d) {
  try { getSheet(SHEET.GURU).appendRow([d.IDGuru,d.Nama,d.Tahun,d.KamarBagian,d.Status||'Aktif']); return JSON.stringify({ok:true}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}
function updateGuru(d) {
  try { const sh=getSheet(SHEET.GURU),vals=sh.getDataRange().getValues(); for(let i=1;i<vals.length;i++){if(String(vals[i][0])===String(d.IDGuru)){sh.getRange(i+1,1,1,5).setValues([[d.IDGuru,d.Nama,d.Tahun,d.KamarBagian,d.Status]]);return JSON.stringify({ok:true});}} return JSON.stringify({ok:false,msg:'Tidak ditemukan'}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}
function deleteGuru(id) {
  try { const sh=getSheet(SHEET.GURU),vals=sh.getDataRange().getValues(); for(let i=1;i<vals.length;i++){if(String(vals[i][0])===String(id)){sh.deleteRow(i+1);return JSON.stringify({ok:true});}} return JSON.stringify({ok:false,msg:'Tidak ditemukan'}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}

// ── Tes Bacaan ────────────────────────────────────────────────
function getTesBacaan() { return JSON.stringify(sheetToObjects(getSheet(SHEET.TES_BACAAN))); }
function addTesBacaan(d) {
  try {
    // Validate and auto-calculate score
    const val = validateData('tesBacaan', d);
    if (!val.valid) return JSON.stringify({ ok: false, msg: 'Validasi gagal', errors: val.errors });

    const sh = getSheet(SHEET.TES_BACAAN);
    const finalData = val.data || d;

    sh.appendRow([
      genId('TS-'), finalData.TipePeserta, finalData.PesertaID, finalData.PengujiID || finalData.IDPenguji, finalData.Tanggal,
      finalData.NoSurah, finalData.NamaSurah || finalData.SurahTarget, finalData.Halaman, finalData.JenisTes,
      finalData.Ind1 || '', finalData.Ind2 || '', finalData.Ind3 || '', finalData.Ind4 || '', finalData.Ind5 || '',
      finalData.Ind6 || '', finalData.Ind7 || '', finalData.Ind8 || '', finalData.Ind9 || '', finalData.Ind10 || '',
      finalData.NilaiAkhir, finalData.Catatan, new Date()
    ]);
    logAudit('ADD', 'TesBacaan', finalData.PesertaID, null, finalData);
    return JSON.stringify({ ok: true, nilaiAkhir: finalData.NilaiAkhir });
  } catch(e) { return JSON.stringify({ ok: false, msg: e.message }); }
}
function deleteTesBacaan(id) {
  try {
    const sh = getSheet(SHEET.TES_BACAAN), vals = sh.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) === String(id)) {
        logAudit('DELETE', 'TesBacaan', id, { ID: vals[i][0], PesertaID: vals[i][2] }, null);
        sh.deleteRow(i+1);
        return JSON.stringify({ ok: true });
      }
    }
    return JSON.stringify({ ok: false, msg: 'Tidak ditemukan' });
  } catch(e) { return JSON.stringify({ ok: false, msg: e.message }); }
}
function updateTesBacaan(d) {
  try {
    // Validate and auto-calculate
    const val = validateData('tesBacaan', d);
    if (!val.valid) return JSON.stringify({ ok: false, msg: 'Validasi gagal', errors: val.errors });

    const sh = getSheet(SHEET.TES_BACAAN), vals = sh.getDataRange().getValues();
    const finalData = val.data || d;

    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) === String(d.ID)) {
        sh.getRange(i+1, 2, 1, 20).setValues([[
          finalData.TipePeserta, finalData.PesertaID, finalData.IDPenguji || finalData.PengujiID, finalData.Tanggal,
          finalData.NoSurah, finalData.NamaSurah, finalData.Halaman, finalData.JenisTes,
          finalData.Ind1 || '', finalData.Ind2 || '', finalData.Ind3 || '', finalData.Ind4 || '', finalData.Ind5 || '',
          finalData.Ind6 || '', finalData.Ind7 || '', finalData.Ind8 || '', finalData.Ind9 || '', finalData.Ind10 || '',
          finalData.NilaiAkhir, finalData.Catatan
        ]]);
        logAudit('UPDATE', 'TesBacaan', d.ID, null, finalData);
        return JSON.stringify({ ok: true, nilaiAkhir: finalData.NilaiAkhir });
      }
    }
    return JSON.stringify({ ok: false, msg: 'Tidak ditemukan' });
  } catch(e) { return JSON.stringify({ ok: false, msg: e.message }); }
}

// ── Hafalan ───────────────────────────────────────────────────
function getHafalan() { return JSON.stringify(sheetToObjects(getSheet(SHEET.HAFALAN))); }
function addHafalan(d) {
  try { const id=genId('HF'); getSheet(SHEET.HAFALAN).appendRow([id,d.STambuk,d.IDPenguji,d.NoSurah,d.NamaSurah,d.Juz,d.AyatDari,d.AyatSampai,d.Status,d.TanggalSetor,d.Catatan,new Date().toISOString()]); return JSON.stringify({ok:true,id}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}
function updateHafalan(d) {
  try { const sh=getSheet(SHEET.HAFALAN),vals=sh.getDataRange().getValues(); for(let i=1;i<vals.length;i++){if(String(vals[i][0])===String(d.ID)){sh.getRange(i+1,9,1,3).setValues([[d.Status,d.TanggalSetor,d.Catatan]]);return JSON.stringify({ok:true});}} return JSON.stringify({ok:false,msg:'Tidak ditemukan'}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}
function deleteHafalan(id) {
  try { const sh=getSheet(SHEET.HAFALAN),vals=sh.getDataRange().getValues(); for(let i=1;i<vals.length;i++){if(String(vals[i][0])===String(id)){sh.deleteRow(i+1);return JSON.stringify({ok:true});}} return JSON.stringify({ok:false,msg:'Tidak ditemukan'}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}

// ── Rapot ─────────────────────────────────────────────────────
function getRapot() { return JSON.stringify(sheetToObjects(getSheet(SHEET.RAPOT))); }
function saveRapot(d) {
  try { const id=genId('RP'); getSheet(SHEET.RAPOT).appendRow([id,d.STambuk,d.NamaSantri,d.Periode,d.NilaiBacaan,d.NilaiTajwid,d.NilaiHafalan,d.Kehadiran,d.Catatan,d.Rekomendasi,d.Tanggal,new Date().toISOString()]); return JSON.stringify({ok:true,id}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}
function deleteRapot(id) {
  try { const sh=getSheet(SHEET.RAPOT),vals=sh.getDataRange().getValues(); for(let i=1;i<vals.length;i++){if(String(vals[i][0])===String(id)){sh.deleteRow(i+1);return JSON.stringify({ok:true});}} return JSON.stringify({ok:false,msg:'Tidak ditemukan'}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}

// ── Dashboard ─────────────────────────────────────────────────
function getDashboardStats() {
  try {
    const santri=sheetToObjects(getSheet(SHEET.SANTRI));
    const guru=sheetToObjects(getSheet(SHEET.GURU));
    const tes=sheetToObjects(getSheet(SHEET.TES_BACAAN));
    const hafalan=sheetToObjects(getSheet(SHEET.HAFALAN));
    const preTest=tes.filter(t=>t.JenisTes==='Pre Test'&&t.TipePeserta==='Santri');
    const postTest=tes.filter(t=>t.JenisTes==='Post Test'&&t.TipePeserta==='Santri');
    const avg=(arr)=>arr.length?(arr.reduce((a,b)=>a+Number(b.Nilai),0)/arr.length).toFixed(1):0;
    const nilaiMap={};
    tes.filter(t=>t.TipePeserta==='Santri').forEach(t=>{if(!nilaiMap[t.PesertaID])nilaiMap[t.PesertaID]=[];nilaiMap[t.PesertaID].push(Number(t.Nilai));});
    const perluPembinaan=Object.values(nilaiMap).filter(v=>(v.reduce((a,b)=>a+b,0)/v.length)<70).length;
    const hafalanPerJuz={};
    hafalan.filter(h=>h.Status==='Selesai').forEach(h=>{hafalanPerJuz[h.Juz]=(hafalanPerJuz[h.Juz]||0)+1;});
    return JSON.stringify({
      santriAktif:santri.filter(s=>s.Status==='Aktif').length,
      guruAktif:guru.filter(g=>g.Status==='Aktif').length,
      totalSantri:santri.length, totalGuru:guru.length,
      avgPre:avg(preTest), avgPost:avg(postTest),
      perluPembinaan, hafalSelesai:hafalan.filter(h=>h.Status==='Selesai').length,
      totalHafalan:hafalan.length, totalTes:tes.length,
      recentTes:tes.filter(t=>t.TipePeserta==='Santri').slice(-10).map(t=>({tanggal:t.Tanggal,nilai:Number(t.Nilai),jenis:t.JenisTes})),
      hafalanPerJuz, santriTerbaru:santri.slice(-5).reverse()
    });
  } catch(e){return JSON.stringify({error:e.message});}
}

// ── Config ────────────────────────────────────────────────────
// ── Config ────────────────────────────────────────────────────
function defaultConfig() {
  return {
    namaLembaga  : "Markaz Qur'an",
    periodeAktif : '',
    nilaiMinLulus: 71,
    rentangNilai : [
      {min:91,max:100,label:'Mumtaz',       ket:'Sangat Baik / Tidak ada salah'},
      {min:81,max:90, label:'Jayyid Jiddan',ket:'Baik Sekali / Sedikit salah'},
      {min:71,max:80, label:'Jayyid',       ket:'Baik / Beberapa salah'},
      {min:51,max:70, label:'Maqbul',       ket:'Cukup / Perlu bimbingan'},
      {min:0, max:50, label:'Rasib',        ket:'Kurang / Wajib remedial'}
    ],
    indikatorChecklist: [
      {key:'Ind1',  label:'Kelancaran'},
      {key:'Ind2',  label:'Makharij Huruf'},
      {key:'Ind3',  label:'Sifat Huruf'},
      {key:'Ind4',  label:"Mad Thabi'i"},
      {key:'Ind5',  label:'Mad lbh 2 harakat'},
      {key:'Ind6',  label:'Dengungan'},
      {key:'Ind7',  label:"Waqf & Ibtida'"},
      {key:'Ind8',  label:'Gharib'},
      {key:'Ind9',  label:'Keindahan'},
      {key:'Ind10', label:'Lain-Lain'}
    ]
  };
}
function getConfig() {
  try {
    const sh=getSheet(SHEET.CONFIG), rows=sh.getDataRange().getValues();
    if(rows.length<2) return JSON.stringify(defaultConfig());
    const cfg={};
    rows.slice(1).forEach(r=>{try{cfg[r[0]]=JSON.parse(r[1]);}catch{cfg[r[0]]=r[1];}});
    const def=defaultConfig();
    Object.keys(def).forEach(k=>{if(!(k in cfg))cfg[k]=def[k];});
    return JSON.stringify(cfg);
  } catch(e){return JSON.stringify(defaultConfig());}
}
function saveConfig(data) {
  try {
    const sh=getSheet(SHEET.CONFIG), last=sh.getLastRow();
    if(last>1) sh.getRange(2,1,last-1,2).clearContent();
    Object.entries(data).forEach(([k,v])=>{sh.appendRow([k,typeof v==='object'?JSON.stringify(v):String(v)]);});
    return JSON.stringify({ok:true});
  } catch(e){return JSON.stringify({ok:false,msg:e.message});}
}

// ── Sesi Ujian ────────────────────────────────────────────────
function getSesiUjian() {
  try { return JSON.stringify(sheetToObjects(getSheet(SHEET.SESI_UJIAN))); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}

function addSesiUjian(d) {
  try {
    const id = genId('SESI-');
    const sh = getSheet(SHEET.SESI_UJIAN);
    sh.appendRow([
      id,
      d.NamaSesi        || '',
      d.TipeSesi        || '',
      d.Tanggal         || '',
      d.PenanggungJawab || '',
      typeof d.Peserta      === 'object' ? JSON.stringify(d.Peserta)      : (d.Peserta      || '[]'),
      typeof d.TargetUjian  === 'object' ? JSON.stringify(d.TargetUjian)  : (d.TargetUjian  || '[]'),
      d.Status          || 'Aktif',
      new Date().toISOString()
    ]);
    return JSON.stringify({ok:true, id});
  } catch(e){return JSON.stringify({ok:false,msg:e.message});}
}

function updateSesiUjian(d) {
  try {
    const sh=getSheet(SHEET.SESI_UJIAN), vals=sh.getDataRange().getValues();
    for(let i=1;i<vals.length;i++){
      if(String(vals[i][0])===String(d.SesiID)){
        sh.getRange(i+1,2,1,7).setValues([[
          d.NamaSesi        || '',
          d.TipeSesi        || '',
          d.Tanggal         || '',
          d.PenanggungJawab || '',
          typeof d.Peserta      === 'object' ? JSON.stringify(d.Peserta)      : (d.Peserta      || '[]'),
          typeof d.TargetUjian  === 'object' ? JSON.stringify(d.TargetUjian)  : (d.TargetUjian  || '[]'),
          d.Status          || 'Aktif'
        ]]);
        return JSON.stringify({ok:true});
      }
    }
    return JSON.stringify({ok:false,msg:'Sesi tidak ditemukan'});
  } catch(e){return JSON.stringify({ok:false,msg:e.message});}
}

function deleteSesiUjian(id) {
  try {
    const sh=getSheet(SHEET.SESI_UJIAN),vals=sh.getDataRange().getValues();
    for(let i=1;i<vals.length;i++){
      if(String(vals[i][0])===String(id)){sh.deleteRow(i+1);return JSON.stringify({ok:true});}
    }
    return JSON.stringify({ok:false,msg:'Sesi tidak ditemukan'});
  } catch(e){return JSON.stringify({ok:false,msg:e.message});}
}

/**
 * setupSesiUjianSheet()
 * ─────────────────────
 * Jalankan fungsi ini SATU KALI dari Apps Script Editor:
 *   1. Buka Apps Script (Ekstensi > Apps Script)
 *   2. Pilih fungsi "setupSesiUjianSheet" di dropdown
 *   3. Klik tombol "Jalankan (▶)"
 *
 * Fungsi ini akan:
 *   - Membuat sheet "SesiUjian" jika belum ada
 *   - Membersihkan header yang salah (jika ada)
 *   - Mengisi 9 header kolom secara akurat
 *   - Menebalkan & mewarnai baris header
 *   - Membekukan baris pertama (freeze row 1)
 *   - Merapikan lebar kolom otomatis
 */
function setupSesiUjianSheet() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = SHEET.SESI_UJIAN; // 'SesiUjian'
  const HEADERS   = ['SesiID','NamaSesi','TipeSesi','Tanggal','PenanggungJawab','Peserta','TargetUjian','Status','Timestamp'];

  // Hapus sheet lama jika ada dan headernya salah, lalu buat ulang
  let sh = ss.getSheetByName(sheetName);

  if (sh) {
    // Cek apakah header sudah benar
    const existing = sh.getRange(1,1,1,HEADERS.length).getValues()[0];
    const isCorrect = HEADERS.every((h,i) => existing[i] === h);
    if (!isCorrect) {
      // Bersihkan header baris pertama saja
      sh.getRange(1, 1, 1, sh.getLastColumn()).clearContent();
      sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      Logger.log('✅ Header SesiUjian diperbaiki.');
    } else {
      Logger.log('✅ Header SesiUjian sudah benar, tidak ada perubahan.');
    }
  } else {
    // Buat sheet baru
    sh = ss.insertSheet(sheetName);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    Logger.log('✅ Sheet "SesiUjian" baru dibuat.');
  }

  // Styling header
  const headerRange = sh.getRange(1, 1, 1, HEADERS.length);
  headerRange
    .setBackground('#1a73e8')       // Biru Google
    .setFontColor('#ffffff')         // Putih
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // Freeze baris pertama
  sh.setFrozenRows(1);

  // Auto-resize kolom
  sh.autoResizeColumns(1, HEADERS.length);

  // Lebar minimum untuk kolom JSON (Peserta & TargetUjian)
  sh.setColumnWidth(6, 250); // Peserta
  sh.setColumnWidth(7, 250); // TargetUjian

  SpreadsheetApp.flush();
  Logger.log('🎉 setupSesiUjianSheet() selesai! Sheet siap digunakan.');
  SpreadsheetApp.getUi().alert(
    '✅ Setup Berhasil!',
    'Sheet "SesiUjian" sudah disiapkan dengan benar.\n\n' +
    'Headers: ' + HEADERS.join(', ') + '\n\n' +
    'Sekarang silakan Deploy ulang (Deploy > Versi Baru) agar perubahan code aktif.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
