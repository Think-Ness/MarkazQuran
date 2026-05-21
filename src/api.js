// GAS API URL — ganti dengan URL deploy GAS Anda
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbwlMF-nqfEZ7J4sg0ZFIUnVIfQuT1Ivw8IroK6aRv6GaoTTK1eg-r42eO5TiVlJkqM7/exec';

/**
 * Panggil GAS API
 * @param {string} action - nama fungsi GAS
 * @param {any} data - payload (opsional)
 */
export async function api(action, data) {
  const body = data !== undefined ? { action, data } : { action };
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { ok: false, msg: text }; }
}

// ── Convenience wrappers ──────────────────────────────────────
export const getSantri        = ()     => api('getSantri');
export const addSantri        = (d)    => api('addSantri', d);
export const updateSantri     = (d)    => api('updateSantri', d);
export const deleteSantri     = (id)   => api('deleteSantri', id);

export const getGuru          = ()     => api('getGuru');
export const addGuru          = (d)    => api('addGuru', d);
export const updateGuru       = (d)    => api('updateGuru', d);
export const deleteGuru       = (id)   => api('deleteGuru', id);

export const getTesBacaan     = ()     => api('getTesBacaan');
export const addTesBacaan     = (d)    => api('addTesBacaan', d);
export const updateTesBacaan  = (d)    => api('updateTesBacaan', d);
export const deleteTesBacaan  = (id)   => api('deleteTesBacaan', id);

export const getHafalan       = ()     => api('getHafalan');
export const addHafalan       = (d)    => api('addHafalan', d);
export const updateHafalan    = (d)    => api('updateHafalan', d);
export const deleteHafalan    = (id)   => api('deleteHafalan', id);

export const getRapot         = ()     => api('getRapot');
export const saveRapot        = (d)    => api('saveRapot', d);
export const deleteRapot      = (id)   => api('deleteRapot', id);

export const getDashboardStats = ()    => api('getDashboardStats');
export const getSurahList      = ()    => api('getSurahList');
export const getConfig         = ()    => api('getConfig');
export const saveConfig        = (d)   => api('saveConfig', d);

export const getSesiUjian      = ()    => api('getSesiUjian');
export const addSesiUjian      = (d)   => api('addSesiUjian', d);
export const updateSesiUjian   = (d)   => api('updateSesiUjian', d);
export const deleteSesiUjian   = (id)  => api('deleteSesiUjian', id);

