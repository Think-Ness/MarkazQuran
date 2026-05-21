/**
 * Intelligent Workflow Engine
 * Handles session→evaluation→report workflows with smart automation
 */

export class WorkflowEngine {
  /**
   * Auto-generate evaluation template from exam session
   * Reduces manual data entry by pre-filling all known data
   */
  static generateEvaluationTemplate(session, santri, tipeEvaluasi = 'bacaan') {
    const baseTemplate = {
      SesiID: session.SesiID,
      Tanggal: new Date().toISOString().split('T')[0],
      PenanggungJawab: session.PenanggungJawab,
      STambuk: santri.STambuk,
      Nama: santri.Nama,
      Kelas: santri.Kelas,
      Status: 'Belum Dinilai'
    };

    if (tipeEvaluasi === 'bacaan') {
      const cfg = session._materi || {};
      return {
        ...baseTemplate,
        JenisTes: 'Post Test',
        SurahTarget: cfg.surah || '-',
        AyatDari: cfg.ayat ? cfg.ayat.split('-')[0] : '-',
        AyatSampai: cfg.ayat ? cfg.ayat.split('-')[1] : '-',
        Indikator: {
          Ind1: 0, Ind2: 0, Ind3: 0, Ind4: 0, Ind5: 0,
          Ind6: 0, Ind7: 0, Ind8: 0, Ind9: 0, Ind10: 0
        },
        Catatan: '',
        ModePenilaian: 'kesalahan'
      };
    } else {
      const cfg = session._materi || {};
      return {
        ...baseTemplate,
        NamaSurah: (cfg.surahs || [])[0] || '-',
        Status: 'Proses',
        AyatMulai: '',
        AyatSelesai: '',
        Catatan: ''
      };
    }
  }

  /**
   * Calculate final score from error indicators
   * Error-based scoring system: 100 - (errors × 2)
   */
  static calculateFinalScore(indicators) {
    let totalErrors = 0;
    Object.values(indicators).forEach(val => {
      totalErrors += Number(val) || 0;
    });

    const PENALTY_PER_ERROR = 2;
    return Math.max(0, 100 - (totalErrors * PENALTY_PER_ERROR));
  }

  /**
   * Detect remedial cases based on scores
   * Returns: { isRemedial, reason, recommendations }
   */
  static detectRemedialCase(latestScore, allScores = []) {
    const REMEDIAL_THRESHOLD = 70;
    const isRemedial = latestScore < REMEDIAL_THRESHOLD;

    if (!isRemedial) {
      return { isRemedial: false };
    }

    // Analyze trend
    const trend = allScores.length > 1
      ? allScores[allScores.length - 1] - allScores[allScores.length - 2]
      : 0;

    const recommendations = [];
    if (trend < 0) recommendations.push('Nilai menurun - perlu perhatian lebih');
    if (latestScore < 50) recommendations.push('Nilai sangat rendah - butuh bimbingan intensif');
    if (allScores.filter(s => s >= REMEDIAL_THRESHOLD).length === 0) {
      recommendations.push('Belum pernah lulus - review materi dasar');
    }

    return {
      isRemedial: true,
      latestScore,
      threshold: REMEDIAL_THRESHOLD,
      trend,
      recommendations
    };
  }

  /**
   * Generate smart rapot data from evaluations
   * Auto-fills rapot with calculations and latest data
   */
  static generateRapotData(santri, allTesBacaan = [], allHafalan = [], config = {}) {
    // Get best bacaan score
    const santriTes = allTesBacaan.filter(t =>
      String(t.PesertaID) === String(santri.STambuk) ||
      String(t.STambuk) === String(santri.STambuk)
    );

    let bestScore = 0;
    let bestRecord = null;
    santriTes.forEach(t => {
      let score = 100;
      if (t.Indikator) {
        const ind = typeof t.Indikator === 'string'
          ? JSON.parse(t.Indikator)
          : t.Indikator;
        score = this.calculateFinalScore(ind);
      }
      if (score > bestScore) {
        bestScore = score;
        bestRecord = t;
      }
    });

    // Get hafalan completion
    const santriHafalan = allHafalan.filter(h =>
      String(h.STambuk) === String(santri.STambuk)
    );
    const hafalanSelesai = santriHafalan.filter(h =>
      h.Status === 'Selesai'
    ).length;

    // Get kategori
    const kategori = this._getKategori(bestScore);

    return {
      STambuk: santri.STambuk,
      Nama: santri.Nama,
      Kelas: santri.Kelas,
      NilaiAkhir: bestScore,
      Kategori: kategori,
      HafalanSelesai: hafalanSelesai,
      TotalHafalan: santriHafalan.length,
      DetailTesBacaan: bestRecord ? {
        Tanggal: bestRecord.Tanggal,
        Surah: bestRecord.SurahTarget,
        Penguji: bestRecord.PengujiID || bestRecord.Penguji,
        Indikator: bestRecord.Indikator
      } : null,
      Catatan: '',
      Rekomendasi: ''
    };
  }

  /**
   * Get kategori nilai
   */
  static _getKategori(score) {
    if (score >= 90) return 'Sangat Baik';
    if (score >= 80) return 'Baik';
    if (score >= 70) return 'Cukup';
    return 'Perlu Pembinaan';
  }

  /**
   * Validate workflow readiness
   * Check if all prerequisites are met before proceeding
   */
  static validateReadiness(workflow, context) {
    const checks = {
      'create-session': () => {
        if (!context.name) return { ready: false, msg: 'Nama sesi harus diisi' };
        if (!context.date) return { ready: false, msg: 'Tanggal harus diisi' };
        if (!context.pj) return { ready: false, msg: 'Penanggung jawab harus dipilih' };
        if (!context.participants || context.participants.length === 0) {
          return { ready: false, msg: 'Pilih minimal 1 peserta' };
        }
        return { ready: true };
      },

      'evaluate-session': () => {
        if (!context.sessionId) return { ready: false, msg: 'Sesi harus dipilih' };
        const total = context.totalParticipants || 0;
        const evaluated = context.evaluatedCount || 0;
        if (evaluated < total) {
          return {
            ready: false,
            msg: `${total - evaluated} peserta belum dievaluasi`,
            progress: { evaluated, total }
          };
        }
        return { ready: true };
      },

      'create-rapot': () => {
        if (!context.santri) return { ready: false, msg: 'Santri harus dipilih' };
        if (!context.periode) return { ready: false, msg: 'Periode harus diisi' };
        return { ready: true };
      },

      'print-rapot': () => {
        if (!context.rapotData) return { ready: false, msg: 'Data rapot tidak tersedia' };
        if (!context.rapotData.NilaiAkhir) {
          return { ready: false, msg: 'Nilai akhir harus ada' };
        }
        return { ready: true };
      }
    };

    const checker = checks[workflow];
    if (!checker) return { ready: true };
    return checker();
  }

  /**
   * Generate completion summary for UI
   */
  static getProgressSummary(session, allEvaluations) {
    const total = session._peserta ? session._peserta.length : 0;
    const evaluated = allEvaluations ? allEvaluations.length : 0;
    const percentage = total ? Math.round((evaluated / total) * 100) : 0;

    return {
      total,
      evaluated,
      remaining: total - evaluated,
      percentage,
      isComplete: evaluated === total,
      statusText: evaluated === total
        ? 'Semua peserta sudah dievaluasi ✓'
        : `${total - evaluated} peserta belum dievaluasi`
    };
  }
}

/**
 * Smart suggestions engine
 * Provides contextual recommendations to users
 */
export class SmartSuggestions {
  /**
   * Suggest next action based on current state
   */
  static getNextAction(currentPage, context) {
    const suggestions = {
      'dashboard': [
        'Buat sesi ujian baru untuk evaluasi santri',
        'Review laporan remedial santri',
        'Update profil santri terbaru'
      ],
      'sesi-ujian': [
        'Mulai evaluasi peserta sesi',
        'Buat rapot untuk sesi yang sudah selesai',
        'Lihat progress evaluasi'
      ],
      'tes-bacaan': [
        'Lanjutkan Post Test untuk santri yang sudah Pre Test',
        'Lihat rekap remedial',
        'Update nilai santri'
      ],
      'hafalan': [
        'Catat setoran hafalan terbaru',
        'Review progress hafalan per juz',
        'Update status santri'
      ],
      'rapot': [
        'Buat rapot untuk santri baru',
        'Cetak rapot untuk arsip',
        'Review rekomendasi pembinaan'
      ]
    };

    return suggestions[currentPage] || [];
  }

  /**
   * Get alerts/notifications
   */
  static getAlerts(allData) {
    const alerts = [];

    // Check for santri belum dievaluasi
    if (allData.santri && allData.tesBacaan) {
      const tested = new Set(allData.tesBacaan.map(t => String(t.PesertaID || t.STambuk)));
      const allSantri = allData.santri.filter(s => s.Status === 'Aktif');
      const notTested = allSantri.filter(s => !tested.has(String(s.STambuk)));

      if (notTested.length > 0) {
        alerts.push({
          type: 'warning',
          icon: '⚠️',
          title: `${notTested.length} Santri Belum Dievaluasi`,
          action: 'Lihat Detail'
        });
      }
    }

    // Check for remedial cases
    if (allData.tesBacaan) {
      const remedial = allData.tesBacaan.filter(t => {
        const ind = typeof t.Indikator === 'string'
          ? JSON.parse(t.Indikator || '{}')
          : (t.Indikator || {});
        const score = WorkflowEngine.calculateFinalScore(ind);
        return score < 70;
      });

      if (remedial.length > 0) {
        alerts.push({
          type: 'alert',
          icon: '🔔',
          title: `${remedial.length} Kasus Remedial`,
          action: 'Lihat Rekap'
        });
      }
    }

    return alerts;
  }
}
