# TODO - Peningkatan Alur Tes Bacaan (Pre-Test → Post-Test → Remedial → Lulus) per Sesi

## 1. Backend (`code.gs`)
- [ ] Tambah kolom `SesiID` pada struktur `TES_BACAAN` (header + fallback kompatibilitas data lama).
- [ ] Update `addTesBacaan`:
  - [ ] Wajib validasi `SesiID`, `IDPenguji`, `NamaSurah`, `JenisTes`.
  - [ ] Enforce alur per `PesertaID + SesiID`:
    - [ ] Jika belum ada pre-test: hanya boleh `Pre Test`.
    - [ ] Jika pre-test sudah ada: boleh `Post Test`.
    - [ ] Tolak `Post Test` jika pre-test belum ada.
- [ ] Update `updateTesBacaan`:
  - [ ] Support edit nilai pre-test/post-test dengan validasi field wajib.
  - [ ] Recalculate `NilaiAkhir` dari indikator.
- [ ] Update `getTestWorkflowStatus`:
  - [ ] Terima payload object `{ pesertaId, sesiId }`.
  - [ ] Hitung status berdasarkan sesi/batch aktif.
- [ ] Tambah helper aman untuk baca indeks kolom dinamis agar data lama tetap terbaca.

## 2. Frontend API (`src/api.js`)
- [ ] Tambah wrapper status berbasis sesi:
  - [ ] `getTestWorkflowStatus(payload)` kirim `{ pesertaId, sesiId }`.
- [ ] Pastikan `addTesBacaan` / `updateTesBacaan` kompatibel payload `SesiID`.

## 3. Frontend Halaman Tes (`src/pages/tes-bacaan-improved.js`)
- [ ] Tambah pemilih "Sesi Berjalan" di toolbar.
- [ ] Semua tabel/status/tombol dihitung berdasar sesi terpilih.
- [ ] Ubah tombol aksi kontekstual:
  - [ ] `Pre Test` jika belum ada pre-test di sesi ini.
  - [ ] `Lanjut Post Test` jika pre-test sudah ada.
  - [ ] `Remedial` jika post-test terakhir < standar.
  - [ ] `Selesai/Lulus` jika post-test >= standar.
- [ ] Tambah tombol `Edit Pre Test` setelah pre-test tersimpan.
- [ ] Modal input tes:
  - [ ] Support mode Create/Edit.
  - [ ] Prefill data saat edit.
  - [ ] Simpan data lengkap (`SesiID`, penguji, surah, indikator, catatan).
- [ ] Rekap remedial difilter sesi aktif.
- [ ] Riwayat tes tampilkan nama peserta + sesi terkait agar jelas.

## 4. Validasi Alur & Profesional UX
- [ ] Beri pesan error yang jelas jika alur dilanggar.
- [ ] Tambah indikator status batch aktif.
- [ ] Pastikan flow rapot hanya untuk santri `lulus` pada sesi aktif (minimal gating di alur tes bacaan).

## 5. Final check
- [ ] Uji skenario:
  - [ ] Peserta baru batch aktif: hanya bisa pre-test.
  - [ ] Setelah pre-test: tombol berubah ke lanjut post-test + edit pre-test.
  - [ ] Post-test di bawah standar: remedial.
  - [ ] Post-test memenuhi standar: lulus.
