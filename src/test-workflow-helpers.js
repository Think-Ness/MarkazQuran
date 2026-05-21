/**
 * Test Workflow Helper Functions
 * Handles Pre Test → Post Test → Remedial workflow
 */

/**
 * Get test history for a student
 */
function getStudentTestHistory(stambuk) {
  try {
    const tes = sheetToObjects(getSheet(SHEET.TES_BACAAN));
    return tes.filter(t => String(t.PesertaID || t.STambuk) === String(stambuk)).sort((a, b) =>
      new Date(b.Tanggal) - new Date(a.Tanggal)
    );
  } catch(e) {
    return [];
  }
}

/**
 * Determine test status for UI (Pre Test, Post Test, Remedial, Lulus)
 */
function getStudentTestStatus(stambuk) {
  const history = getStudentTestHistory(stambuk);

  if (history.length === 0) {
    return { status: 'belum', display: 'Belum Tes', canPreTest: true, canPostTest: false };
  }

  const preTests = history.filter(t => t.JenisTes === 'Pre Test');
  const postTests = history.filter(t => t.JenisTes === 'Post Test');

  const latestPost = postTests[0];
  const postScore = latestPost ? Number(latestPost.NilaiAkhir || 0) : 0;

  if (preTests.length === 0) {
    return { status: 'pretest_pending', display: 'Pre Test (Pending)', canPreTest: true, canPostTest: false };
  }

  if (postTests.length === 0) {
    return { status: 'pretest_done', display: 'Pre Test ✓ → Post Test', canPreTest: false, canPostTest: true };
  }

  if (postScore >= 70) {
    return { status: 'lulus', display: 'Lulus ✓', canPreTest: false, canPostTest: false };
  } else {
    return { status: 'remedial', display: 'Remedial', canPreTest: false, canPostTest: true };
  }
}

/**
 * Get test data summary for student
 */
function getTestSummary(stambuk) {
  const history = getStudentTestHistory(stambuk);
  const preTests = history.filter(t => t.JenisTes === 'Pre Test');
  const postTests = history.filter(t => t.JenisTes === 'Post Test');

  return {
    preTestData: preTests[0] || null,
    postTestData: postTests[0] || null,
    preTestCount: preTests.length,
    postTestCount: postTests.length,
    lastPreTest: preTests[0],
    lastPostTest: postTests[0],
    allHistory: history
  };
}

/**
 * Auto-populate complete test data (used when creating new test)
 */
function getCompleteTestTemplate(pesertaId, jenisTes) {
  const template = {
    TipePeserta: 'Santri',
    PesertaID: pesertaId,
    IDPenguji: '',
    Tanggal: new Date().toISOString().split('T')[0],
    NoSurah: '',
    NamaSurah: '',
    Halaman: '',
    JenisTes: jenisTes, // 'Pre Test' atau 'Post Test'
    Ind1: '', Ind2: '', Ind3: '', Ind4: '', Ind5: '',
    Ind6: '', Ind7: '', Ind8: '', Ind9: '', Ind10: '',
    NilaiAkhir: 0,
    Catatan: ''
  };
  return template;
}

/**
 * Validate test data - enhanced version with better error messages
 */
function validateTestData(d) {
  const errors = [];

  if (!d.PesertaID) errors.push('ID Peserta harus diisi');
  if (!d.IDPenguji && !d.PengujiID) errors.push('⚠ PENTING: Penguji harus diisi');
  if (!d.NamaSurah && !d.Surah) errors.push('⚠ PENTING: Surah harus diisi');
  if (d.JenisTes && !['Pre Test', 'Post Test'].includes(d.JenisTes)) errors.push('Jenis tes tidak valid');

  // Check indicators if provided
  if (d.Ind1 !== undefined || d.Ind2 !== undefined) {
    let hasAny = false;
    for (let i = 1; i <= 10; i++) {
      if (d[`Ind${i}`] !== undefined && d[`Ind${i}`] !== '') {
        hasAny = true;
        break;
      }
    }
    if (!hasAny) errors.push('Minimal 1 indikator penilaian harus diisi');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    hasWarning: errors.some(e => e.includes('PENTING'))
  };
}
