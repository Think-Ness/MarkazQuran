// =============================================================================
// MARKAZ QUR'AN — GOOGLE APPS SCRIPT API
// Vercel Frontend → fetch(GAS_URL, {method:'POST', body:JSON.stringify({action,data})})
// =============================================================================
const SHEET = {
  SANTRI:'MasterSantri', GURU:'MasterGuru', TES_BACAAN:'TesBacaan',
  CHECKLIST:'ChecklistBacaan', HAFALAN:'Hafalan', RAPOT:'Rapot', CONFIG:'Config'
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
      getDashboardStats, getSurahList, setupSpreadsheet,
      getConfig, saveConfig
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
    [SHEET.SANTRI]    :['STambuk','Nama','Kelas','Daerah','Rayon','Kamar','TanggalMasuk','Status'],
    [SHEET.GURU]      :['IDGuru','Nama','Tahun','KamarBagian','Status'],
    [SHEET.TES_BACAAN]:['ID','TipePeserta','PesertaID','IDPenguji','Tanggal','NoSurah','NamaSurah','Halaman','JenisTes','Ind1','Ind2','Ind3','Ind4','Ind5','Ind6','Ind7','Ind8','Ind9','Ind10','NilaiAkhir','Catatan','Timestamp'],
    [SHEET.HAFALAN]   :['ID','STambuk','IDPenguji','NoSurah','NamaSurah','Juz','AyatDari','AyatSampai','Status','TanggalSetor','Catatan','Timestamp'],
    [SHEET.RAPOT]     :['ID','STambuk','NamaSantri','Periode','NilaiBacaan','NilaiTajwid','NilaiHafalan','Kehadiran','Catatan','Rekomendasi','Tanggal','Timestamp'],
    [SHEET.CONFIG]    :['Key','Value']
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
  try { const sh=getSheet(SHEET.SANTRI); sh.appendRow([d.STambuk,d.Nama,d.Kelas,d.Daerah,d.Rayon,d.Kamar||'',d.TanggalMasuk||'',d.Status||'Aktif']); return JSON.stringify({ok:true}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}
function updateSantri(d) {
  try { const sh=getSheet(SHEET.SANTRI),vals=sh.getDataRange().getValues(); for(let i=1;i<vals.length;i++){if(String(vals[i][0])===String(d.STambuk)){sh.getRange(i+1,1,1,8).setValues([[d.STambuk,d.Nama,d.Kelas,d.Daerah,d.Rayon,d.Kamar||'',d.TanggalMasuk,d.Status]]);return JSON.stringify({ok:true});}} return JSON.stringify({ok:false,msg:'Tidak ditemukan'}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
}
function deleteSantri(stambuk) {
  try { const sh=getSheet(SHEET.SANTRI),vals=sh.getDataRange().getValues(); for(let i=1;i<vals.length;i++){if(String(vals[i][0])===String(stambuk)){sh.deleteRow(i+1);return JSON.stringify({ok:true});}} return JSON.stringify({ok:false,msg:'Tidak ditemukan'}); }
  catch(e){return JSON.stringify({ok:false,msg:e.message});}
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
  const sh = getSheet(SHEET.TES_BACAAN);
  sh.appendRow([
    genId('TS-'), d.TipePeserta, d.PesertaID, d.IDPenguji, d.Tanggal,
    d.NoSurah, d.NamaSurah, d.Halaman, d.JenisTes,
    d.Ind1||'', d.Ind2||'', d.Ind3||'', d.Ind4||'', d.Ind5||'',
    d.Ind6||'', d.Ind7||'', d.Ind8||'', d.Ind9||'', d.Ind10||'',
    d.NilaiAkhir, d.Catatan, new Date()
  ]);
  return {ok:true};
}
function deleteTesBacaan(id) {
  try {
    const sh=getSheet(SHEET.TES_BACAAN), vals=sh.getDataRange().getValues();
    for(let i=1;i<vals.length;i++){
      if(String(vals[i][0])===String(id)){sh.deleteRow(i+1);return JSON.stringify({ok:true});}
    }
    return JSON.stringify({ok:false,msg:'Tidak ditemukan'});
  } catch(e){return JSON.stringify({ok:false,msg:e.message});}
}
function updateTesBacaan(d) {
  try {
    const sh=getSheet(SHEET.TES_BACAAN), vals=sh.getDataRange().getValues();
    for(let i=1; i<vals.length; i++) {
      if(String(vals[i][0]) === String(d.ID)) {
        sh.getRange(i+1, 2, 1, 20).setValues([[
          d.TipePeserta, d.PesertaID, d.IDPenguji, d.Tanggal,
          d.NoSurah, d.NamaSurah, d.Halaman, d.JenisTes,
          d.Ind1||'', d.Ind2||'', d.Ind3||'', d.Ind4||'', d.Ind5||'',
          d.Ind6||'', d.Ind7||'', d.Ind8||'', d.Ind9||'', d.Ind10||'',
          d.NilaiAkhir, d.Catatan
        ]]);
        return {ok:true};
      }
    }
    return {ok:false, msg:'Tidak ditemukan'};
  } catch(e) { return {ok:false, msg:e.message}; }
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
function defaultConfig() {
  return {
    namaLembaga  : "Markaz Qur'an",
    periodeAktif : '',
    nilaiMinLulus: 70,
    rentangNilai : [
      {min:90,max:100,label:'Sangat Baik',ket:'Lancar & tajwid tepat'},
      {min:80,max:89, label:'Baik',        ket:'Sedikit kesalahan'},
      {min:70,max:79, label:'Cukup',       ket:'Masih perlu bimbingan'},
      {min:0, max:69, label:'Perlu Pembinaan', ket:'Banyak kesalahan'}
    ],
    indikatorChecklist: [
      {key:'Makhraj',      label:'Makharijul Huruf'},
      {key:'PanjangPendek',label:'Panjang Pendek (Mad)'},
      {key:'Ghunnah',      label:'Tajwid Ghunnah'},
      {key:'Kelancaran',   label:'Kelancaran'},
      {key:'WaqafIbtida',  label:'Waqaf & Ibtida'}
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
