// All server calls. text/plain avoids CORS preflight with Apps Script.
const API = {
  token: sessionStorage.getItem('ac_token') || '',
  async call(action, body = {}) {
    let res;
    try {
      res = await fetch(window.AURACUT_API, { method: 'POST', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, token: this.token, ...body }) });
    } catch (e) { throw new Error('📡 Internet connection problem.\nPlease check your internet and try again.'); }
    let j; try { j = await res.json(); } catch (e) { throw new Error('❌ Something went wrong.\nPlease try again.'); }
    if (!j.success) { if (j.message === 'SESSION_EXPIRED') { API.setToken(''); location.reload(); } throw new Error(j.message); }
    return j;
  },
  setToken(t) { this.token = t; t ? sessionStorage.setItem('ac_token', t) : sessionStorage.removeItem('ac_token'); }
};
