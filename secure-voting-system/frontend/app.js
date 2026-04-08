/* ============================================================
   SECURE DIGITAL VOTING SYSTEM - Frontend Application
   Single-file vanilla JS SPA
   ============================================================ */

const API = 'http://localhost:5000/api';

// ── STATE ────────────────────────────────────────────────────
const state = {
  page: 'home',
  voter: null,
  adminAuthed: false,
  chatHistory: [],
  chatOpen: false,
  toast: null,
  loading: false
};

// ── UTILS ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

function showToast(msg, type = 'info', duration = 4000) {
  const existing = $('toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'toast';
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${{success:'✅',error:'❌',info:'ℹ️',warn:'⚠️'}[type]||'ℹ️'}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, duration);
}

async function apiFetch(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API + endpoint, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (e) {
    throw e;
  }
}

function navigate(page, params = {}) {
  state.page = page;
  state.params = params;
  render();
  window.scrollTo(0, 0);
}

function formatKey(key) {
  if (!key) return '';
  return key.length > 80 ? key.substring(0, 40) + '...' + key.substring(key.length - 20) : key;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!', 'success'));
}

// ── CSS ──────────────────────────────────────────────────────
function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --bg: #050A14;
      --bg2: #0A1628;
      --bg3: #0F1E38;
      --surface: #111D35;
      --surface2: #162545;
      --border: #1E3356;
      --border2: #243D66;
      --accent: #4B9EFF;
      --accent2: #2D7AFF;
      --accent3: #7BC6FF;
      --green: #22C55E;
      --red: #EF4444;
      --orange: #F97316;
      --yellow: #EAB308;
      --purple: #A855F7;
      --text: #E8F0FF;
      --text2: #94AACF;
      --text3: #5A7A9F;
      --mono: 'JetBrains Mono', monospace;
      --radius: 12px;
      --radius2: 8px;
      --shadow: 0 4px 24px rgba(0,0,0,.5);
      --glow: 0 0 20px rgba(75,158,255,.15);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Space Grotesk', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }
    
    /* SCROLLBAR */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg2); }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

    /* LAYOUT */
    #app { min-height: 100vh; display: flex; flex-direction: column; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; width: 100%; }
    .page { flex: 1; padding: 32px 0 80px; animation: fadeIn .3s ease; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

    /* NAVBAR */
    .navbar {
      background: rgba(5,10,20,.95); backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
      padding: 0 24px;
    }
    .navbar-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between;
      height: 64px; gap: 16px;
    }
    .brand {
      display: flex; align-items: center; gap: 10px;
      font-weight: 700; font-size: 18px; cursor: pointer;
      color: var(--text); text-decoration: none; white-space: nowrap;
    }
    .brand-icon { font-size: 24px; }
    .brand span { color: var(--accent); }
    .nav-links { display: flex; align-items: center; gap: 4px; }
    .nav-link {
      padding: 8px 14px; border-radius: var(--radius2); font-size: 14px; font-weight: 500;
      color: var(--text2); cursor: pointer; border: none; background: none;
      transition: all .2s; white-space: nowrap;
    }
    .nav-link:hover { color: var(--text); background: var(--surface); }
    .nav-link.active { color: var(--accent); background: rgba(75,158,255,.1); }
    .nav-link.voter-badge {
      background: rgba(34,197,94,.1); color: var(--green); border: 1px solid rgba(34,197,94,.2);
    }
    .nav-link.logout { color: var(--red); }
    .nav-link.logout:hover { background: rgba(239,68,68,.1); }

    /* CARDS */
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 24px;
      transition: border-color .2s, box-shadow .2s;
    }
    .card:hover { border-color: var(--border2); box-shadow: var(--glow); }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .card-title { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .card-subtitle { font-size: 13px; color: var(--text2); margin-top: 4px; }

    /* GRID */
    .grid { display: grid; gap: 20px; }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    @media(max-width:768px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}}

    /* FORMS */
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .form-label { font-size: 13px; font-weight: 500; color: var(--text2); }
    .form-input, .form-select, .form-textarea {
      width: 100%; padding: 10px 14px; background: var(--bg2);
      border: 1px solid var(--border); border-radius: var(--radius2);
      color: var(--text); font-family: inherit; font-size: 14px;
      transition: border-color .2s, box-shadow .2s;
      outline: none;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: var(--accent); box-shadow: 0 0 0 3px rgba(75,158,255,.15);
    }
    .form-select option { background: var(--bg2); }
    .form-textarea { resize: vertical; min-height: 80px; }
    .form-hint { font-size: 11px; color: var(--text3); }
    .form-error { font-size: 11px; color: var(--red); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media(max-width:600px){.form-row{grid-template-columns:1fr}}

    /* BUTTONS */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 20px; border-radius: var(--radius2); font-size: 14px; font-weight: 600;
      cursor: pointer; border: none; transition: all .2s; font-family: inherit;
      text-decoration: none; white-space: nowrap;
    }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary { background: var(--accent2); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--accent); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(45,122,255,.4); }
    .btn-success { background: var(--green); color: #fff; }
    .btn-success:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
    .btn-danger { background: var(--red); color: #fff; }
    .btn-danger:hover:not(:disabled) { opacity: .9; }
    .btn-outline { background: transparent; border: 1px solid var(--border2); color: var(--text); }
    .btn-outline:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
    .btn-ghost { background: transparent; color: var(--text2); }
    .btn-ghost:hover:not(:disabled) { background: var(--surface); color: var(--text); }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .btn-lg { padding: 14px 28px; font-size: 16px; }
    .btn-full { width: 100%; }
    .btn-icon { padding: 8px; }

    /* BADGES */
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .5px;
    }
    .badge-green { background: rgba(34,197,94,.15); color: var(--green); border: 1px solid rgba(34,197,94,.3); }
    .badge-red { background: rgba(239,68,68,.15); color: var(--red); border: 1px solid rgba(239,68,68,.3); }
    .badge-blue { background: rgba(75,158,255,.15); color: var(--accent); border: 1px solid rgba(75,158,255,.3); }
    .badge-orange { background: rgba(249,115,22,.15); color: var(--orange); border: 1px solid rgba(249,115,22,.3); }
    .badge-purple { background: rgba(168,85,247,.15); color: var(--purple); border: 1px solid rgba(168,85,247,.3); }

    /* STAT CARDS */
    .stat-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .stat-label { font-size: 12px; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; }
    .stat-value { font-size: 32px; font-weight: 700; line-height: 1; }
    .stat-sub { font-size: 12px; color: var(--text2); }

    /* MONO / CODE */
    .mono { font-family: var(--mono); font-size: 12px; }
    .code-block {
      background: var(--bg); border: 1px solid var(--border);
      border-radius: var(--radius2); padding: 12px 16px;
      font-family: var(--mono); font-size: 12px; color: var(--accent3);
      word-break: break-all; position: relative;
    }
    .code-block .copy-btn {
      position: absolute; top: 8px; right: 8px;
      padding: 4px 8px; font-size: 11px;
      background: var(--surface2); border: 1px solid var(--border2);
      border-radius: 4px; color: var(--text2); cursor: pointer;
    }
    .code-block .copy-btn:hover { color: var(--accent); }

    /* HASH DISPLAY */
    .hash-chip {
      display: inline-block; font-family: var(--mono); font-size: 11px;
      color: var(--accent3); background: rgba(75,158,255,.08);
      border: 1px solid rgba(75,158,255,.2); border-radius: 4px;
      padding: 2px 8px; word-break: break-all;
    }

    /* STEPS */
    .steps { display: flex; flex-direction: column; gap: 0; }
    .step { display: flex; gap: 16px; position: relative; }
    .step:not(:last-child)::before {
      content: ''; position: absolute; left: 19px; top: 40px;
      width: 2px; height: calc(100% - 16px);
      background: var(--border); z-index: 0;
    }
    .step-num {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--surface2); border: 2px solid var(--border2);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; color: var(--accent);
      flex-shrink: 0; z-index: 1;
    }
    .step-content { padding: 8px 0 24px; flex: 1; }
    .step-title { font-weight: 600; margin-bottom: 4px; }
    .step-desc { font-size: 13px; color: var(--text2); }

    /* TOASTS */
    .toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(80px);
      background: var(--surface2); border: 1px solid var(--border2);
      border-radius: var(--radius); padding: 12px 20px; z-index: 9999;
      display: flex; align-items: center; gap: 10px; font-size: 14px;
      max-width: 480px; box-shadow: var(--shadow);
      transition: transform .3s cubic-bezier(.34,1.56,.64,1);
      pointer-events: none;
    }
    .toast.show { transform: translateX(-50%) translateY(0); }
    .toast-success { border-color: rgba(34,197,94,.4); }
    .toast-error { border-color: rgba(239,68,68,.4); }
    .toast-warn { border-color: rgba(249,115,22,.4); }

    /* TABLE */
    .table-wrap { overflow-x: auto; border-radius: var(--radius2); }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: var(--bg2); padding: 10px 14px;
      text-align: left; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .8px; color: var(--text3);
      border-bottom: 1px solid var(--border);
    }
    tbody td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: rgba(255,255,255,.02); }

    /* TABS */
    .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
    .tab {
      padding: 10px 16px; font-size: 14px; font-weight: 500; cursor: pointer;
      color: var(--text3); border: none; background: none; border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: all .2s;
    }
    .tab:hover { color: var(--text2); }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

    /* PROGRESS BAR */
    .progress-bar-wrap { background: var(--bg2); border-radius: 20px; overflow: hidden; height: 8px; }
    .progress-bar { height: 100%; border-radius: 20px; transition: width .5s ease; }

    /* MODAL */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.7); backdrop-filter: blur(4px);
      z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .modal {
      background: var(--surface); border: 1px solid var(--border2);
      border-radius: 16px; padding: 32px; max-width: 560px; width: 100%;
      animation: modalIn .25s ease; max-height: 90vh; overflow-y: auto;
    }
    @keyframes modalIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:none} }
    .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .modal-title { font-size: 20px; font-weight: 700; }
    .modal-close { cursor: pointer; color: var(--text3); font-size: 20px; line-height: 1; border: none; background: none; color: var(--text2); padding: 4px 8px; border-radius: 4px; }
    .modal-close:hover { color: var(--text); background: var(--surface2); }

    /* CHATBOT */
    .chat-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 150;
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #2D7AFF, #7BC6FF);
      border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(45,122,255,.5);
      font-size: 24px; display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    .chat-btn:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(45,122,255,.7); }
    .chat-window {
      position: fixed; bottom: 96px; right: 28px; z-index: 150;
      width: 360px; height: 480px; background: var(--surface);
      border: 1px solid var(--border2); border-radius: 16px;
      display: flex; flex-direction: column; box-shadow: var(--shadow);
      animation: chatIn .25s ease;
    }
    @keyframes chatIn { from{opacity:0;transform:translateY(20px)scale(.95)} to{opacity:1;transform:none} }
    .chat-header {
      padding: 14px 16px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg, var(--bg2), var(--surface));
      border-radius: 16px 16px 0 0;
    }
    .chat-avatar { font-size: 28px; }
    .chat-name { font-weight: 600; font-size: 14px; }
    .chat-status { font-size: 11px; color: var(--green); }
    .chat-msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .chat-msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; font-size: 13px; line-height: 1.5; }
    .chat-msg.bot { background: var(--surface2); border: 1px solid var(--border); align-self: flex-start; border-radius: 4px 12px 12px 12px; }
    .chat-msg.user { background: var(--accent2); color: #fff; align-self: flex-end; border-radius: 12px 4px 12px 12px; }
    .chat-input-row { padding: 10px; border-top: 1px solid var(--border); display: flex; gap: 8px; }
    .chat-input {
      flex: 1; padding: 8px 12px; background: var(--bg2); border: 1px solid var(--border);
      border-radius: 20px; color: var(--text); font-size: 13px; font-family: inherit; outline: none;
    }
    .chat-input:focus { border-color: var(--accent); }
    .chat-send { width: 36px; height: 36px; border-radius: 50%; background: var(--accent2); border: none; cursor: pointer; font-size: 16px; display:flex;align-items:center;justify-content:center; }
    .chat-send:hover { background: var(--accent); }

    /* HERO */
    .hero {
      text-align: center; padding: 80px 0 60px;
      background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(45,122,255,.12) 0%, transparent 70%);
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 20px;
      background: rgba(75,158,255,.1); border: 1px solid rgba(75,158,255,.25);
      font-size: 12px; color: var(--accent); margin-bottom: 24px;
    }
    .hero h1 { font-size: 52px; font-weight: 700; line-height: 1.1; margin-bottom: 16px; }
    .hero h1 span { color: var(--accent); }
    .hero p { font-size: 18px; color: var(--text2); max-width: 560px; margin: 0 auto 32px; }
    .hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    @media(max-width:600px){ .hero h1{font-size:32px} .hero p{font-size:15px} }

    /* FEATURE PILLS */
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .feature-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px;
      transition: all .2s;
    }
    .feature-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .feature-icon { font-size: 28px; margin-bottom: 10px; }
    .feature-title { font-weight: 600; margin-bottom: 6px; }
    .feature-desc { font-size: 13px; color: var(--text2); }

    /* PAGE HEADER */
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
    .page-header p { color: var(--text2); margin-top: 6px; font-size: 14px; }

    /* ALERT */
    .alert { border-radius: var(--radius2); padding: 14px 16px; margin-bottom: 16px; font-size: 14px; display: flex; gap: 10px; align-items: flex-start; }
    .alert-info { background: rgba(75,158,255,.1); border: 1px solid rgba(75,158,255,.25); color: var(--accent3); }
    .alert-success { background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.25); color: #86efac; }
    .alert-error { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.25); color: #fca5a5; }
    .alert-warn { background: rgba(249,115,22,.1); border: 1px solid rgba(249,115,22,.25); color: #fdba74; }

    /* SECTION DIVIDER */
    .divider { border: none; border-top: 1px solid var(--border); margin: 24px 0; }

    /* LOADER */
    .spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-center { display: flex; justify-content: center; padding: 48px; }

    /* BLOCKCHAIN BLOCK */
    .bc-block {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px; margin-bottom: 12px;
      position: relative; overflow: hidden;
    }
    .bc-block::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent2); }
    .bc-block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .bc-block-index { font-size: 20px; font-weight: 700; color: var(--accent); }
    .bc-block-hash { font-family: var(--mono); font-size: 11px; color: var(--text3); word-break: break-all; }
    .bc-block-field { display: flex; gap: 8px; font-size: 12px; margin-top: 6px; }
    .bc-field-label { color: var(--text3); min-width: 90px; }
    .bc-field-val { color: var(--accent3); font-family: var(--mono); word-break: break-all; }

    /* CANDIDATE CARD */
    .candidate-card {
      background: var(--surface); border: 2px solid var(--border);
      border-radius: var(--radius); padding: 20px; cursor: pointer;
      transition: all .2s; position: relative; overflow: hidden;
    }
    .candidate-card:hover { border-color: var(--accent2); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(45,122,255,.2); }
    .candidate-card.selected { border-color: var(--accent); background: rgba(75,158,255,.08); }
    .candidate-card.selected::after {
      content: '✓'; position: absolute; top: 12px; right: 12px;
      width: 24px; height: 24px; background: var(--accent); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: #fff; font-weight: 700;
    }
    .candidate-symbol { font-size: 36px; margin-bottom: 10px; }
    .candidate-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .candidate-party { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 6px; }
    .party-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

    /* RESULT BAR */
    .result-row { margin-bottom: 16px; }
    .result-meta { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
    .result-winner-badge { color: var(--yellow); font-weight: 700; }

    /* SECTION TITLE */
    .section-title {
      font-size: 22px; font-weight: 700; margin-bottom: 6px;
      display: flex; align-items: center; gap: 8px;
    }
    .section-sub { font-size: 14px; color: var(--text2); margin-bottom: 24px; }
  `;
  document.head.appendChild(style);
}

// ── NAVBAR ───────────────────────────────────────────────────
function renderNavbar() {
  const links = [
    { id: 'home', label: '🏠 Home' },
    { id: 'register', label: '📋 Register' },
    { id: 'login', label: '🔐 Login' },
    { id: 'candidates', label: '👥 Candidates' },
    { id: 'audit', label: '🔍 Audit' },
    { id: 'admin', label: '⚙️ Admin' },
  ];
  return `
    <nav class="navbar">
      <div class="navbar-inner">
        <div class="brand" onclick="navigate('home')">
          <span class="brand-icon">🗳️</span>
          Secure<span>Vote</span>
        </div>
        <div class="nav-links">
          ${links.map(l => `<button class="nav-link ${state.page===l.id?'active':''}" onclick="navigate('${l.id}')">${l.label}</button>`).join('')}
          ${state.voter ? `
            <button class="nav-link voter-badge" onclick="navigate('vote')">🗳️ Vote</button>
            <button class="nav-link logout" onclick="logout()">↩ Logout</button>
          ` : ''}
        </div>
      </div>
    </nav>`;
}

function logout() {
  state.voter = null;
  showToast('Logged out successfully', 'info');
  navigate('home');
}

// ── HOME PAGE ────────────────────────────────────────────────
async function renderHome() {
  let stats = { total_voters: '—', verified_voters: '—', total_votes: '—', blockchain_blocks: '—', is_chain_valid: null };
  try { stats = await apiFetch('/system/stats'); } catch(e) {}

  return `
    <div class="hero">
      <div class="container">
        <div class="hero-badge">🔒 RSA-4096 · SHA-3-256 · Blockchain PoW · Digital Signatures</div>
        <h1>Secure Digital<br><span>Voting System</span></h1>
        <p>Enterprise-grade cryptographic validation ensuring every vote is secure, verifiable, and tamper-proof.</p>
        <div class="hero-btns">
          <button class="btn btn-primary btn-lg" onclick="navigate('register')">📋 Register to Vote</button>
          <button class="btn btn-outline btn-lg" onclick="navigate('audit')">🔍 Audit Dashboard</button>
        </div>
      </div>
    </div>
    <div class="page">
      <div class="container">
        <div class="grid grid-4" style="margin-bottom:40px">
          <div class="stat-card">
            <div class="stat-label">Total Voters</div>
            <div class="stat-value" style="color:var(--accent)">${stats.total_voters}</div>
            <div class="stat-sub">${stats.verified_voters} verified</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Votes Cast</div>
            <div class="stat-value" style="color:var(--green)">${stats.total_votes}</div>
            <div class="stat-sub">Encrypted & signed</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Blockchain</div>
            <div class="stat-value" style="color:var(--purple)">${stats.blockchain_blocks}</div>
            <div class="stat-sub">Blocks mined</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Chain Status</div>
            <div class="stat-value" style="font-size:20px">${stats.is_chain_valid===true?'<span style="color:var(--green)">✅ Valid</span>':stats.is_chain_valid===false?'<span style="color:var(--red)">❌ Tampered</span>':'—'}</div>
            <div class="stat-sub">Integrity check</div>
          </div>
        </div>

        <div class="section-title">⚙️ System Architecture</div>
        <div class="section-sub">5 cryptographic modules working together</div>
        <div class="feature-grid" style="margin-bottom:40px">
          ${[
            {icon:'📋',title:'Voter Registration',desc:'Unique ID + RSA-4096 key pair. Aadhar/PAN hashed for duplicate prevention.'},
            {icon:'👥',title:'Candidate Management',desc:'Admin adds candidates with party, symbol and manifesto. Secure CRUD.'},
            {icon:'🗳️',title:'Vote Casting',desc:'Vote hashed with SHA-3-256, signed with RSA-PSS, encrypted with OAEP.'},
            {icon:'🔍',title:'Audit Dashboard',desc:'View encrypted votes, digital signatures, and real-time blockchain explorer.'},
            {icon:'⚙️',title:'Admin Verification',desc:'Batch signature verification, vote decryption, result tabulation.'},
            {icon:'🤖',title:'AI VoteBot',desc:'Agentic AI assistant guiding voters through registration and voting.'},
            {icon:'⛓️',title:'Blockchain PoW',desc:'Proof-of-Work consensus, Merkle tree, tamper detection per block.'},
            {icon:'🔐',title:'Zero Double Vote',desc:'Once voted, voter ID hash is permanently recorded. Cannot vote again.'}
          ].map(f=>`
            <div class="feature-card">
              <div class="feature-icon">${f.icon}</div>
              <div class="feature-title">${f.title}</div>
              <div class="feature-desc">${f.desc}</div>
            </div>
          `).join('')}
        </div>

        <div class="section-title">🔄 System Flow</div>
        <div class="section-sub">Step-by-step cryptographic voting process</div>
        <div class="card">
          <div class="steps">
            ${[
              {title:'Voter Registration',desc:'Enter personal info → System generates Voter ID + RSA-4096 key pair → Sensitive data hashed → Stored securely'},
              {title:'Admin Adds Candidates',desc:'Admin logs in → Adds candidate name, party, constituency, symbol → Candidates listed for voters'},
              {title:'Voter Authentication',desc:'Voter logs in with Voter ID + Aadhar → System verifies identity → Checks voting eligibility'},
              {title:'Vote Selection & Encryption',desc:'Voter selects candidate → Vote JSON created → SHA-3-256 hash computed → Digitally signed with private RSA key → Encrypted with admin public key (RSA-OAEP + AES-256-GCM)'},
              {title:'Blockchain Recording',desc:'Vote hash + anonymous voter hash added to blockchain → Proof-of-Work mining → Merkle root computed → Receipt issued'},
              {title:'Admin Verification & Results',desc:'Admin decrypts votes with private key → Verifies all digital signatures → Tabulates results → Declares winner'},
            ].map((s,i)=>`
              <div class="step">
                <div class="step-num">${i+1}</div>
                <div class="step-content">
                  <div class="step-title">${s.title}</div>
                  <div class="step-desc">${s.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

// ── REGISTER PAGE ────────────────────────────────────────────
function renderRegister() {
  return `
    <div class="page"><div class="container">
      <div class="page-header">
        <h1>📋 Voter Registration</h1>
        <p>Register to receive your unique Voter ID and RSA-4096 cryptographic key pair.</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 380px;gap:24px">
        <div class="card">
          <div class="alert alert-info">ℹ️ All sensitive data (Aadhar, PAN) is hashed using SHA-3-256 before storage. Your private key is shown <strong>only once</strong> — save it!</div>
          <form id="regForm" onsubmit="submitRegistration(event)">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input class="form-input" name="name" placeholder="As per Aadhar card" required>
              </div>
              <div class="form-group">
                <label class="form-label">Email *</label>
                <input class="form-input" name="email" type="email" placeholder="example@email.com" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Mobile Number *</label>
                <input class="form-input" name="phone" placeholder="10 digits, starts 6-9" maxlength="10" required>
                <span class="form-hint">Must start with 6, 7, 8, or 9</span>
              </div>
              <div class="form-group">
                <label class="form-label">Date of Birth *</label>
                <input class="form-input" name="dob" type="date" required>
                <span class="form-hint">Must be 18+ years old</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Aadhar Number *</label>
                <input class="form-input" name="aadhar" placeholder="12-digit Aadhar" maxlength="12" required>
                <span class="form-hint">Will be hashed & never stored in plaintext</span>
              </div>
              <div class="form-group">
                <label class="form-label">PAN Card *</label>
                <input class="form-input" name="pan" placeholder="ABCDE1234F" maxlength="10" style="text-transform:uppercase" required>
                <span class="form-hint">Format: ABCDE1234F</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">State *</label>
                <select class="form-select" name="state" required>
                  <option value="">Select State</option>
                  ${['TN','MH','DL','KA','KL','AP','TG','GJ','RJ','UP','MP','WB','OR','AS','PB','HR','HP','JK','GA','MN','ML','MZ','NL','SK','TR','AR','AN','CH','DN','LD','PY','DD'].map(s=>`<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Address *</label>
                <input class="form-input" name="address" placeholder="Full residential address" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-full btn-lg" id="regBtn">
              🔐 Generate Keys & Register
            </button>
          </form>
        </div>
        <div>
          <div class="card" style="margin-bottom:16px">
            <div class="card-title" style="margin-bottom:12px">🔒 Security Process</div>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
              ${[
                ['SHA-3-256','Aadhar + PAN hashed'],
                ['RSA-4096','Key pair generated'],
                ['Unique ID','State+Year+Random'],
                ['No plaintext','Sensitive data never stored as-is'],
                ['Duplicate check','Hash-based dedup across all IDs'],
              ].map(([k,v])=>`
                <div style="display:flex;justify-content:space-between;gap:8px">
                  <span class="badge badge-blue">${k}</span>
                  <span style="color:var(--text2);text-align:right">${v}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-title" style="margin-bottom:12px">📋 Requirements</div>
            <ul style="list-style:none;display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--text2)">
              <li>✅ Age: 18 years or above</li>
              <li>✅ Valid Aadhar (12 digits)</li>
              <li>✅ PAN Card (ABCDE1234F format)</li>
              <li>✅ Mobile: starts with 6-9</li>
              <li>✅ Unique email address</li>
              <li>✅ Indian residential address</li>
            </ul>
          </div>
        </div>
      </div>
      <div id="regResult"></div>
    </div></div>`;
}

async function submitRegistration(e) {
  e.preventDefault();
  const form = e.target;
  const btn = $('regBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating RSA-4096 Keys...';

  const body = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    dob: form.dob.value,
    aadhar: form.aadhar.value,
    pan: form.pan.value,
    state: form.state.value,
    address: form.address.value,
  };

  try {
    const res = await apiFetch('/voter/register', 'POST', body);
    showToast('Registration successful!', 'success');
    $('regResult').innerHTML = `
      <div class="card" style="margin-top:24px;border-color:var(--green)">
        <div class="alert alert-success">🎉 Registration Successful! Your Voter ID and keys have been generated.</div>
        <div class="form-group">
          <label class="form-label">🪪 Your Voter ID</label>
          <div class="code-block" style="font-size:18px;color:var(--green);text-align:center;letter-spacing:2px">
            ${res.voter_id}
            <span class="copy-btn" onclick="copyToClipboard('${res.voter_id}')">Copy</span>
          </div>
        </div>
        <div class="alert alert-warn" style="margin-top:8px">⚠️ <strong>Save your Private Key immediately!</strong> It will not be shown again. You need it to cast your vote.</div>
        <div class="form-group">
          <label class="form-label">🔑 Private Key (RSA-4096) — SAVE THIS NOW</label>
          <div class="code-block" style="max-height:150px;overflow-y:auto;font-size:10px;color:var(--orange)">
            ${res.private_key.replace(/\n/g,'<br>')}
            <span class="copy-btn" onclick="copyToClipboard(${JSON.stringify(res.private_key)})">Copy</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">🔓 Public Key (RSA-4096)</label>
          <div class="code-block" style="max-height:100px;overflow-y:auto;font-size:10px">
            ${res.public_key.replace(/\n/g,'<br>')}
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:16px">
          <button class="btn btn-primary" onclick="navigate('login')">🔐 Login to Vote</button>
          <button class="btn btn-outline" onclick="copyToClipboard(${JSON.stringify(JSON.stringify({voter_id:res.voter_id,private_key:res.private_key}))})">💾 Copy All Credentials</button>
        </div>
      </div>`;
  } catch(err) {
    showToast(err.message, 'error');
    $('regResult').innerHTML = `<div class="alert alert-error" style="margin-top:16px">❌ ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔐 Generate Keys & Register';
  }
}

// ── LOGIN PAGE ───────────────────────────────────────────────
function renderLogin() {
  return `
    <div class="page"><div class="container" style="max-width:480px">
      <div class="page-header">
        <h1>🔐 Voter Login</h1>
        <p>Authenticate with your Voter ID and Aadhar number to cast your vote.</p>
      </div>
      <div class="card">
        <form id="loginForm" onsubmit="submitLogin(event)">
          <div class="form-group">
            <label class="form-label">Voter ID *</label>
            <input class="form-input" id="loginVoterId" placeholder="e.g. TN2024ABCD1234" required>
          </div>
          <div class="form-group">
            <label class="form-label">Aadhar Number *</label>
            <input class="form-input" id="loginAadhar" type="password" placeholder="12-digit Aadhar" maxlength="12" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="loginBtn">🔐 Login Securely</button>
        </form>
        <hr class="divider">
        <p style="font-size:13px;color:var(--text2);text-align:center">Don't have a Voter ID? <a href="#" onclick="navigate('register')" style="color:var(--accent)">Register here</a></p>
      </div>
      <div class="alert alert-info" style="margin-top:16px">
        🔒 Your Aadhar number is verified against its SHA-3-256 hash stored in the system. The actual number is never retained.
      </div>
    </div></div>`;
}

async function submitLogin(e) {
  e.preventDefault();
  const btn = $('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Authenticating...';
  try {
    const res = await apiFetch('/voter/login', 'POST', {
      voter_id: $('loginVoterId').value.trim(),
      aadhar: $('loginAadhar').value.trim()
    });
    state.voter = res;
    showToast(`Welcome, ${res.name}!`, 'success');
    navigate(res.has_voted ? 'home' : 'vote');
  } catch(err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔐 Login Securely';
  }
}

// ── CANDIDATES PAGE ──────────────────────────────────────────
async function renderCandidates() {
  let candidates = [];
  try { const r = await apiFetch('/candidate/list'); candidates = r.candidates || []; } catch(e) {}

  return `
    <div class="page"><div class="container">
      <div class="page-header">
        <h1>👥 Candidates</h1>
        <p>${candidates.length} registered candidates for this election.</p>
      </div>
      ${candidates.length === 0 ? `
        <div class="card" style="text-align:center;padding:60px">
          <div style="font-size:48px;margin-bottom:16px">👥</div>
          <div style="font-size:18px;margin-bottom:8px">No candidates yet</div>
          <div style="color:var(--text2)">The admin needs to add candidates first.</div>
          ${state.voter && state.voter.voter_id === 'ADMIN' ? `<button class="btn btn-primary" style="margin-top:20px" onclick="navigate('admin')">Add Candidates</button>` : ''}
        </div>
      ` : `
        <div class="grid grid-3">
          ${candidates.map(c => `
            <div class="candidate-card" style="cursor:default">
              <div class="candidate-symbol">${c.symbol}</div>
              <div class="candidate-name">${c.name}</div>
              <div class="candidate-party">
                <span class="party-dot" style="background:${c.party_color||'#666'}"></span>
                ${c.party}
              </div>
              ${c.constituency ? `<div style="font-size:12px;color:var(--text3);margin-top:6px">📍 ${c.constituency}</div>` : ''}
              ${c.age ? `<div style="font-size:12px;color:var(--text3)">Age: ${c.age}</div>` : ''}
              ${c.manifesto ? `<div style="font-size:12px;color:var(--text2);margin-top:8px;border-top:1px solid var(--border);padding-top:8px">${c.manifesto.substring(0,100)}...</div>` : ''}
              <div style="margin-top:10px"><span class="badge badge-green">✓ Active</span></div>
            </div>
          `).join('')}
        </div>
      `}
    </div></div>`;
}

// ── VOTE PAGE ────────────────────────────────────────────────
async function renderVote() {
  if (!state.voter) {
    return `<div class="page"><div class="container" style="max-width:480px">
      <div class="alert alert-warn">⚠️ You must be logged in to vote.</div>
      <button class="btn btn-primary" onclick="navigate('login')">🔐 Login</button>
    </div></div>`;
  }
  if (state.voter.has_voted) {
    return `<div class="page"><div class="container" style="max-width:600px">
      <div class="card" style="text-align:center;padding:60px">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <div style="font-size:22px;font-weight:700;margin-bottom:8px">Vote Already Cast</div>
        <div style="color:var(--text2);margin-bottom:24px">Your vote has been recorded on the blockchain. You cannot vote again.</div>
        <button class="btn btn-primary" onclick="navigate('audit')">🔍 Verify Your Vote</button>
      </div>
    </div></div>`;
  }

  let candidates = [];
  try { const r = await apiFetch('/candidate/list'); candidates = r.candidates || []; } catch(e) {}

  return `
    <div class="page"><div class="container">
      <div class="page-header">
        <h1>🗳️ Cast Your Vote</h1>
        <p>Logged in as <strong>${state.voter.name}</strong> (${state.voter.voter_id})</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 340px;gap:24px">
        <div>
          <div class="alert alert-info">🔒 Your vote will be: SHA-3-256 hashed → Digitally signed with your private RSA key → Encrypted with admin's public key → Recorded on blockchain.</div>
          <div class="card">
            <div class="card-title" style="margin-bottom:16px">Step 1: Select Candidate</div>
            <div class="grid grid-2" id="candidateGrid">
              ${candidates.length===0 ? '<div class="alert alert-warn">No candidates available yet.</div>' :
                candidates.map(c=>`
                  <div class="candidate-card" id="ccard_${c.candidate_id}" onclick="selectCandidate('${c.candidate_id}')">
                    <div class="candidate-symbol">${c.symbol}</div>
                    <div class="candidate-name">${c.name}</div>
                    <div class="candidate-party">
                      <span class="party-dot" style="background:${c.party_color||'#666'}"></span>${c.party}
                    </div>
                    ${c.constituency?`<div style="font-size:11px;color:var(--text3);margin-top:4px">📍 ${c.constituency}</div>`:''}
                  </div>
                `).join('')
              }
            </div>
          </div>
          <div class="card" style="margin-top:20px">
            <div class="card-title" style="margin-bottom:16px">Step 2: Enter Private Key</div>
            <div class="form-group">
              <label class="form-label">Your RSA-4096 Private Key *</label>
              <textarea class="form-textarea" id="privateKeyInput" rows="5" placeholder="-----BEGIN PRIVATE KEY-----&#10;Paste your private key here...&#10;-----END PRIVATE KEY-----" style="font-family:var(--mono);font-size:11px"></textarea>
              <span class="form-hint">This key is used locally to digitally sign your vote. It is never sent to the server in storage.</span>
            </div>
            <button class="btn btn-success btn-full btn-lg" id="castBtn" onclick="castVote()" ${candidates.length===0?'disabled':''}>
              🗳️ Cast Vote Securely
            </button>
          </div>
        </div>
        <div>
          <div class="card" style="margin-bottom:16px">
            <div class="card-title" style="margin-bottom:12px">🔐 Encryption Process</div>
            <div class="steps">
              ${[
                ['Hash','Vote data → SHA-3-256'],
                ['Sign','Hash signed with your RSA private key'],
                ['Encrypt','Vote encrypted with admin public key'],
                ['Block','Recorded on PoW blockchain'],
                ['Receipt','Cryptographic proof issued'],
              ].map(([t,d],i)=>`
                <div class="step">
                  <div class="step-num" style="width:32px;height:32px;font-size:12px">${i+1}</div>
                  <div class="step-content" style="padding-bottom:16px">
                    <div class="step-title" style="font-size:13px">${t}</div>
                    <div class="step-desc" style="font-size:12px">${d}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="card" id="selectedInfo" style="display:none">
            <div class="card-title" style="margin-bottom:12px">Selected Candidate</div>
            <div id="selectedDisplay"></div>
          </div>
        </div>
      </div>
      <div id="voteResult"></div>
    </div></div>`;
}

let selectedCandidateId = null;

function selectCandidate(id) {
  selectedCandidateId = id;
  document.querySelectorAll('.candidate-card').forEach(el => el.classList.remove('selected'));
  const el = $('ccard_' + id);
  if (el) el.classList.add('selected');
  showToast('Candidate selected', 'success');
}

async function castVote() {
  if (!selectedCandidateId) { showToast('Please select a candidate', 'warn'); return; }
  const pk = $('privateKeyInput').value.trim();
  if (!pk || !pk.includes('PRIVATE KEY')) { showToast('Please enter your private key', 'warn'); return; }

  const btn = $('castBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Hashing → Signing → Encrypting → Mining Block...';

  try {
    const res = await apiFetch('/vote/cast', 'POST', {
      voter_id: state.voter.voter_id,
      candidate_id: selectedCandidateId,
      private_key_pem: pk
    });
    state.voter.has_voted = true;
    showToast('Vote cast successfully! Recorded on blockchain.', 'success', 6000);
    const r = res.receipt;
    $('voteResult').innerHTML = `
      <div class="card" style="margin-top:24px;border-color:var(--green)">
        <div class="alert alert-success">🎉 Vote cast successfully and recorded on the blockchain!</div>
        <div class="grid grid-2" style="gap:12px;margin-top:16px">
          ${[
            ['Vote ID', r.vote_id],
            ['Blockchain Block', '#' + r.blockchain_block],
            ['Verification Status', r.verification_status],
            ['Timestamp', r.timestamp],
          ].map(([l,v])=>`
            <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">${l}</div>
            <div style="font-size:13px;font-weight:600">${v}</div></div>
          `).join('')}
        </div>
        <div class="form-group" style="margin-top:16px">
          <label class="form-label">🔏 SHA-3-256 Vote Hash</label>
          <div class="code-block">${r.vote_hash}<span class="copy-btn" onclick="copyToClipboard('${r.vote_hash}')">Copy</span></div>
        </div>
        <div class="form-group">
          <label class="form-label">✍️ Digital Signature (preview)</label>
          <div class="code-block" style="color:var(--purple)">${r.digital_signature}</div>
        </div>
        <div class="form-group">
          <label class="form-label">⛓️ Block Hash</label>
          <div class="code-block">${r.blockchain_hash}</div>
        </div>
        <div class="form-group">
          <label class="form-label">🌳 Merkle Root</label>
          <div class="code-block">${r.merkle_root}</div>
        </div>
        <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="navigate('audit')">🔍 Verify on Blockchain</button>
          <button class="btn btn-outline" onclick="copyToClipboard('${r.vote_hash}')">💾 Save Vote Hash</button>
        </div>
      </div>`;
  } catch(err) {
    showToast(err.message, 'error');
    $('voteResult').innerHTML = `<div class="alert alert-error" style="margin-top:16px">❌ ${err.message}</div>`;
    btn.disabled = false;
    btn.innerHTML = '🗳️ Cast Vote Securely';
  }
}


// ── AUDIT PAGE ───────────────────────────────────────────────
async function renderAudit() {
  let votes = [], blockchain = { chain: [], is_valid: true };
  try { const r = await apiFetch('/audit/votes'); votes = r.votes || []; } catch(e) {}
  try { blockchain = await apiFetch('/audit/blockchain'); } catch(e) {}

  return `
    <div class="page"><div class="container">
      <div class="page-header">
        <h1>🔍 Audit Dashboard</h1>
        <p>Complete transparency: view encrypted votes, digital signatures, and blockchain explorer.</p>
      </div>
      <div class="tabs">
        <div class="tab active" onclick="switchAuditTab('votes',this)">🗳️ Encrypted Votes (${votes.length})</div>
        <div class="tab" onclick="switchAuditTab('blockchain',this)">⛓️ Blockchain (${blockchain.chain?.length||0} blocks)</div>
        <div class="tab" onclick="switchAuditTab('verify',this)">✅ Verify Vote</div>
        <div class="tab" onclick="switchAuditTab('logs',this)">📋 Audit Logs</div>
      </div>

      <div id="auditTab-votes">
        ${votes.length===0 ? `<div class="card" style="text-align:center;padding:40px"><div style="font-size:36px">🗳️</div><div style="margin-top:12px;color:var(--text2)">No votes cast yet.</div></div>` : `
          <div class="alert alert-info">📊 ${votes.length} encrypted votes. All are anonymized — voter identities are SHA-3-256 hashed.</div>
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>Vote ID</th><th>SHA-3-256 Hash</th><th>Digital Sig (preview)</th>
                <th>Block #</th><th>Status</th><th>Timestamp</th>
              </tr></thead>
              <tbody>
                ${votes.map(v=>`<tr>
                  <td class="mono">${v.vote_id||'—'}</td>
                  <td><span class="hash-chip">${(v.vote_hash||'').substring(0,20)}...</span></td>
                  <td><span class="hash-chip" style="color:var(--purple)">${(v.digital_signature||'').substring(0,20)}...</span></td>
                  <td><span class="badge badge-blue">#${v.blockchain_block??'—'}</span></td>
                  <td><span class="badge badge-green">✓ ${v.verification_status||'verified'}</span></td>
                  <td style="font-size:11px;color:var(--text3)">${(v.voted_at||'').substring(0,19)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${votes.length > 0 ? `
            <div class="card" style="margin-top:20px">
              <div class="card-title" style="margin-bottom:12px">🔎 Full Encrypted Vote Details (Latest)</div>
              ${renderVoteDetail(votes[votes.length-1])}
            </div>` : ''}
        `}
      </div>

      <div id="auditTab-blockchain" style="display:none">
        <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
          <div class="stat-card" style="flex:1">
            <div class="stat-label">Total Blocks</div>
            <div class="stat-value" style="color:var(--accent)">${blockchain.chain?.length||0}</div>
          </div>
          <div class="stat-card" style="flex:1">
            <div class="stat-label">Chain Integrity</div>
            <div class="stat-value" style="font-size:20px">${blockchain.is_valid?'<span style="color:var(--green)">✅ Valid</span>':'<span style="color:var(--red)">❌ Tampered</span>'}</div>
          </div>
        </div>
        ${(blockchain.chain||[]).map(block=>`
          <div class="bc-block">
            <div class="bc-block-header">
              <div>
                <div class="bc-block-index">Block #${block.index} ${block.index===0?'<span class="badge badge-purple">Genesis</span>':''}</div>
                <div style="font-size:11px;color:var(--text3)">${block.timestamp}</div>
              </div>
              <div><span class="badge badge-blue">${block.tx_count||0} txns</span></div>
            </div>
            <div class="bc-block-field"><span class="bc-field-label">Hash</span><span class="bc-field-val">${block.hash}</span></div>
            <div class="bc-block-field"><span class="bc-field-label">Prev Hash</span><span class="bc-field-val">${block.previous_hash?.substring(0,40)}...</span></div>
            <div class="bc-block-field"><span class="bc-field-label">Merkle Root</span><span class="bc-field-val">${block.merkle_root}</span></div>
            <div class="bc-block-field"><span class="bc-field-label">Nonce</span><span class="bc-field-val">${block.nonce}</span></div>
            <div class="bc-block-field"><span class="bc-field-label">Difficulty</span><span class="bc-field-val">${block.difficulty} (PoW leading zeros)</span></div>
          </div>
        `).join('')}
      </div>

      <div id="auditTab-verify" style="display:none">
        <div class="card" style="max-width:600px">
          <div class="card-title" style="margin-bottom:16px">✅ Verify Your Vote on Blockchain</div>
          <div class="alert alert-info">Enter your vote hash from your receipt to verify it exists on the blockchain.</div>
          <div class="form-group" style="margin-top:16px">
            <label class="form-label">Vote Hash (SHA-3-256)</label>
            <input class="form-input" id="verifyHashInput" placeholder="64-character SHA-3-256 hash">
          </div>
          <button class="btn btn-primary" onclick="verifyVoteHash()">🔍 Verify on Blockchain</button>
          <div id="verifyResult" style="margin-top:16px"></div>
        </div>
      </div>

      <div id="auditTab-logs" style="display:none">
        <div id="logsContent"><div class="loading-center"><span class="spinner"></span></div></div>
      </div>
    </div></div>`;
}

function renderVoteDetail(v) {
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">SHA-3-256 Vote Hash</div>
      <div class="code-block">${v.vote_hash||'—'}</div></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">RSA-PSS Digital Signature</div>
      <div class="code-block" style="color:var(--purple);max-height:80px;overflow:hidden">${v.digital_signature||'—'}</div></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">RSA-OAEP Encrypted Vote (AES-256-GCM hybrid)</div>
      <div class="code-block" style="max-height:60px;overflow:hidden;font-size:10px">${v.encrypted_vote||'—'}</div></div>
      <div style="display:flex;gap:12px">
        <div><div style="font-size:11px;color:var(--text3)">Block</div><span class="badge badge-blue">#${v.blockchain_block??'—'}</span></div>
        <div><div style="font-size:11px;color:var(--text3)">Merkle Root</div><span class="hash-chip">${(v.merkle_root||'').substring(0,24)}...</span></div>
      </div>
    </div>`;
}

async function switchAuditTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  ['votes','blockchain','verify','logs'].forEach(t=>{
    const el = $('auditTab-'+t);
    if(el) el.style.display = t===tab?'':'none';
  });
  if (tab === 'logs') {
    try {
      const r = await apiFetch('/audit/logs');
      const logs = r.logs || [];
      $('logsContent').innerHTML = logs.length===0 ? '<div class="alert alert-info">No logs yet.</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Action</th><th>User</th><th>Type</th><th>Timestamp</th></tr></thead>
          <tbody>${logs.map(l=>`<tr>
            <td><span class="badge badge-blue">${l.action}</span></td>
            <td class="mono" style="font-size:12px">${l.user_id}</td>
            <td><span class="badge badge-orange">${l.user_type}</span></td>
            <td style="font-size:11px;color:var(--text3)">${(l.timestamp||'').substring(0,19)}</td>
          </tr>`).join('')}</tbody>
        </table></div>`;
    } catch(e) { $('logsContent').innerHTML = '<div class="alert alert-error">Failed to load logs.</div>'; }
  }
}

async function verifyVoteHash() {
  const hash = $('verifyHashInput').value.trim();
  if (!hash) { showToast('Enter a vote hash', 'warn'); return; }
  const res = $('verifyResult');
  res.innerHTML = '<div class="loading-center"><span class="spinner"></span></div>';
  try {
    const r = await apiFetch('/vote/verify/' + hash);
    res.innerHTML = r.found ? `
      <div class="alert alert-success">✅ Vote FOUND on blockchain!</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
        <div class="bc-block-field"><span class="bc-field-label">Block #</span><span class="bc-field-val">${r.blockchain?.block_index??'—'}</span></div>
        <div class="bc-block-field"><span class="bc-field-label">Block Hash</span><span class="bc-field-val">${r.blockchain?.block_hash||'—'}</span></div>
        <div class="bc-block-field"><span class="bc-field-label">Merkle Root</span><span class="bc-field-val">${r.blockchain?.merkle_root||'—'}</span></div>
        <div class="bc-block-field"><span class="bc-field-label">Status</span><span class="bc-field-val" style="color:var(--green)">${r.verification_status||'verified'}</span></div>
      </div>` :
      '<div class="alert alert-error">❌ Vote NOT found on blockchain. Hash may be incorrect.</div>';
  } catch(e) {
    res.innerHTML = '<div class="alert alert-error">❌ Not found.</div>';
  }
}

// ── ADMIN PAGE ───────────────────────────────────────────────
function renderAdmin() {
  if (!state.adminAuthed) {
    return `
      <div class="page"><div class="container" style="max-width:420px">
        <div class="page-header"><h1>⚙️ Admin Panel</h1></div>
        <div class="card">
          <div class="alert alert-warn">Admin access only. Enter admin password to continue.</div>
          <div class="form-group" style="margin-top:16px">
            <label class="form-label">Admin Password</label>
            <input class="form-input" id="adminPass" type="password" placeholder="Admin password">
          </div>
          <button class="btn btn-primary btn-full" onclick="adminLogin()">🔓 Access Admin Panel</button>
        </div>
      </div></div>`;
  }
  return renderAdminDashboard();
}

function adminLogin() {
  const pass = $('adminPass').value;
  if (pass === 'admin@SecureVote2024') {
    state.adminAuthed = true;
    navigate('admin');
  } else {
    showToast('Invalid admin password', 'error');
  }
}

function renderAdminDashboard() {
  return `
    <div class="page"><div class="container">
      <div class="page-header">
        <h1>⚙️ Admin Dashboard</h1>
        <p>Manage candidates, verify signatures, decrypt results.</p>
      </div>
      <div class="tabs">
        <div class="tab active" onclick="switchAdminTab('candidates',this)">👥 Candidates</div>
        <div class="tab" onclick="switchAdminTab('verify',this)">🔏 Verify Signatures</div>
        <div class="tab" onclick="switchAdminTab('results',this)">📊 Decrypt Results</div>
        <div class="tab" onclick="switchAdminTab('fraud',this)">🚨 Fraud Detection</div>
        <div class="tab" onclick="switchAdminTab('chain',this)">⛓️ Blockchain</div>
      </div>

      <div id="adminTab-candidates">
        <div class="card" style="margin-bottom:20px">
          <div class="card-title" style="margin-bottom:16px">➕ Add Candidate</div>
          <form onsubmit="addCandidate(event)">
            <div class="form-row">
              <div class="form-group"><label class="form-label">Candidate Name</label><input class="form-input" id="cname" placeholder="Full name" required></div>
              <div class="form-group"><label class="form-label">Party</label>
                <select class="form-select" id="cparty" required>
                  <option value="">Select Party</option>
                  ${['BJP','INC','AAP','DMK','AIADMK','TMC','Independent','Other'].map(p=>`<option>${p}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Constituency</label><input class="form-input" id="cconstit" placeholder="e.g. Coimbatore North" required></div>
              <div class="form-group"><label class="form-label">Symbol (emoji)</label><input class="form-input" id="csymbol" placeholder="🌸 or any emoji" required></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Age</label><input class="form-input" id="cage" type="number" min="25" max="100" placeholder="Age"></div>
              <div class="form-group"><label class="form-label">Qualification</label><input class="form-input" id="cqualif" placeholder="e.g. B.Tech, MBA"></div>
            </div>
            <div class="form-group"><label class="form-label">Manifesto (brief)</label><textarea class="form-textarea" id="cmanifesto" placeholder="Key points of manifesto..."></textarea></div>
            <button type="submit" class="btn btn-success" id="addCandBtn">➕ Add Candidate</button>
          </form>
        </div>
        <div id="adminCandList"><div class="loading-center"><span class="spinner"></span></div></div>
      </div>

      <div id="adminTab-verify" style="display:none">
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">🔏 Batch Signature Verification</div>
          <div class="alert alert-info">Verify digital signatures of all cast votes to ensure authenticity.</div>
          <button class="btn btn-primary" style="margin-top:16px" onclick="runVerifySig()">▶ Run Signature Verification</button>
          <div id="sigVerifyResult" style="margin-top:20px"></div>
        </div>
      </div>

      <div id="adminTab-results" style="display:none">
        <div class="card" style="margin-bottom:20px">
          <div class="card-title" style="margin-bottom:12px">📊 Decrypt & Tabulate Results</div>
          <div class="alert alert-warn">⚠️ This decrypts all votes using the admin private key and tabulates results.</div>
          <button class="btn btn-primary" style="margin-top:16px" onclick="runDecryptResults()">🔓 Decrypt Results</button>
          <div id="resultsOutput" style="margin-top:20px"></div>
        </div>
      </div>

      <div id="adminTab-fraud" style="display:none">
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">🚨 Fraud Detection</div>
          <button class="btn btn-danger" onclick="runFraudDetect()">🔍 Run Detection</button>
          <div id="fraudResult" style="margin-top:20px"></div>
        </div>
      </div>

      <div id="adminTab-chain" style="display:none">
        <div id="chainIntegrityResult"><div class="loading-center"><span class="spinner"></span></div></div>
      </div>
    </div></div>`;
}

async function addCandidate(e) {
  e.preventDefault();
  const btn = $('addCandBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Adding...';
  try {
    await apiFetch('/candidate/add', 'POST', {
      name: $('cname').value, party: $('cparty').value,
      constituency: $('cconstit').value, symbol: $('csymbol').value,
      age: $('cage').value, qualification: $('cqualif').value,
      manifesto: $('cmanifesto').value
    });
    showToast('Candidate added!', 'success');
    e.target.reset();
    loadAdminCandidates();
  } catch(err) { showToast(err.message, 'error'); }
  finally { btn.disabled=false; btn.innerHTML='➕ Add Candidate'; }
}

async function loadAdminCandidates() {
  const el = $('adminCandList');
  if (!el) return;
  try {
    const r = await apiFetch('/candidate/list/all');
    const cands = r.candidates || [];
    el.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:12px">All Candidates (${cands.length})</div>
        <div class="table-wrap"><table>
          <thead><tr><th>ID</th><th>Name</th><th>Party</th><th>Constituency</th><th>Symbol</th><th>Votes</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${cands.map(c=>`<tr>
            <td class="mono" style="font-size:11px">${c.candidate_id}</td>
            <td><strong>${c.name}</strong></td>
            <td><span class="party-dot" style="background:${c.party_color||'#666'};display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px"></span>${c.party}</td>
            <td>${c.constituency||'—'}</td>
            <td style="font-size:20px">${c.symbol||'—'}</td>
            <td><span class="badge badge-blue">${c.vote_count||0}</span></td>
            <td><span class="badge ${c.status==='active'?'badge-green':'badge-red'}">${c.status}</span></td>
            <td><button class="btn btn-danger btn-sm" onclick="removeCandidate('${c.candidate_id}')">Remove</button></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  } catch(e) { el.innerHTML = '<div class="alert alert-error">Failed to load.</div>'; }
}

async function removeCandidate(id) {
  if (!confirm('Remove this candidate?')) return;
  try {
    await apiFetch('/candidate/delete/'+id, 'DELETE');
    showToast('Candidate removed', 'info');
    loadAdminCandidates();
  } catch(e) { showToast(e.message, 'error'); }
}

async function switchAdminTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  ['candidates','verify','results','fraud','chain'].forEach(t=>{
    const e = $('adminTab-'+t);
    if(e) e.style.display = t===tab ? '' : 'none';
  });
  if (tab==='candidates') loadAdminCandidates();
  if (tab==='chain') loadChainIntegrity();
}

async function runVerifySig() {
  const el = $('sigVerifyResult');
  el.innerHTML = '<div class="loading-center"><span class="spinner"></span></div>';
  try {
    const r = await apiFetch('/admin/verify-signatures', 'POST', {admin_password: 'admin@SecureVote2024'});
    el.innerHTML = `
      <div class="grid grid-3" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-label">Total Votes</div><div class="stat-value">${r.total}</div></div>
        <div class="stat-card"><div class="stat-label">Valid Signatures</div><div class="stat-value" style="color:var(--green)">${r.valid}</div></div>
        <div class="stat-card"><div class="stat-label">Invalid</div><div class="stat-value" style="color:var(--red)">${r.invalid}</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Vote ID</th><th>Hash (preview)</th><th>Signature</th><th>Block</th><th>Status</th></tr></thead>
        <tbody>${(r.results||[]).map(v=>`<tr>
          <td class="mono">${v.vote_id||'—'}</td>
          <td><span class="hash-chip">${(v.vote_hash||'').substring(0,16)}...</span></td>
          <td><span class="hash-chip" style="color:var(--purple)">${(v.sig_preview||'').substring(0,16)}...</span></td>
          <td><span class="badge badge-blue">#${v.blockchain_block??'—'}</span></td>
          <td><span class="badge ${v.status==='verified'?'badge-green':'badge-red'}">${v.status}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>`;
  } catch(e) { el.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
}

async function runDecryptResults() {
  const el = $('resultsOutput');
  el.innerHTML = '<div class="loading-center"><span class="spinner"></span> Decrypting votes...</div>';
  try {
    const r = await apiFetch('/admin/decrypt-results', 'POST', {admin_password: 'admin@SecureVote2024'});
    const results = r.results || [];
    const winner = r.winner;
    el.innerHTML = `
      ${winner ? `
        <div class="card" style="border-color:var(--yellow);margin-bottom:20px;background:rgba(234,179,8,.05)">
          <div style="text-align:center;padding:20px">
            <div style="font-size:48px">🏆</div>
            <div style="font-size:24px;font-weight:700;color:var(--yellow);margin:8px 0">${winner.name}</div>
            <div style="color:var(--text2)">${winner.party} · ${winner.votes} votes · ${winner.percentage}%</div>
          </div>
        </div>` : ''}
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">📊 Election Results (${r.total_votes} total votes)</div>
        ${results.map((c,i)=>`
          <div class="result-row">
            <div class="result-meta">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-weight:700">${i+1}.</span>
                <span class="party-dot" style="background:${c.party_color||'#666'};display:inline-block;width:10px;height:10px;border-radius:50%"></span>
                <strong>${c.name}</strong>
                <span style="color:var(--text2)">(${c.party})</span>
                ${i===0?'<span class="result-winner-badge">👑 WINNER</span>':''}
              </div>
              <div><strong>${c.votes}</strong> votes <span style="color:var(--text3)">(${c.percentage}%)</span></div>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar" style="width:${c.percentage}%;background:${c.party_color||'var(--accent)'}"></div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:12px">🔓 Decrypted Vote Sample (first 10)</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Vote ID</th><th>Candidate</th><th>Party</th><th>Hash</th><th>Voted At</th></tr></thead>
          <tbody>${(r.decrypted_votes_sample||[]).map(v=>`<tr>
            <td class="mono">${v.vote_id||'—'}</td>
            <td>${v.candidate_name||'—'}</td>
            <td>${v.party||'—'}</td>
            <td><span class="hash-chip">${(v.vote_hash||'').substring(0,16)}...</span></td>
            <td style="font-size:11px">${(v.voted_at||'').substring(0,16)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  } catch(e) { el.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
}

async function runFraudDetect() {
  const el = $('fraudResult');
  el.innerHTML = '<div class="loading-center"><span class="spinner"></span> Scanning...</div>';
  try {
    const r = await apiFetch('/admin/fraud-detection', 'POST', {admin_password: 'admin@SecureVote2024'});
    el.innerHTML = `
      <div class="grid grid-3" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-label">Total Voters</div><div class="stat-value">${r.total_voters}</div></div>
        <div class="stat-card"><div class="stat-label">Votes Cast</div><div class="stat-value">${r.voted_count}</div></div>
        <div class="stat-card"><div class="stat-label">Blockchain</div><div class="stat-value" style="font-size:16px">${r.blockchain_valid?'<span style="color:var(--green)">✅ Valid</span>':'<span style="color:var(--red)">❌ Invalid</span>'}</div></div>
      </div>
      <div class="alert ${r.status==='CLEAN'?'alert-success':'alert-error'}">
        ${r.status==='CLEAN'?'✅ No fraud detected. All votes appear legitimate.':'⚠️ Potential issues detected!'}
      </div>
      ${r.alerts?.length>0?`<div style="margin-top:12px">${r.alerts.map(a=>`
        <div class="alert alert-${a.severity==='HIGH'?'error':'warn'}">
          <strong>${a.severity}</strong>: ${a.type} — ${a.description}
        </div>`).join('')}</div>`:''}
      <div style="margin-top:12px;font-size:13px;color:var(--text2)">Duplicate vote hashes detected: <strong>${r.duplicate_hashes}</strong></div>`;
  } catch(e) { el.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
}

async function loadChainIntegrity() {
  const el = $('chainIntegrityResult');
  try {
    const r = await apiFetch('/admin/blockchain-integrity');
    el.innerHTML = `
      <div class="alert ${r.valid?'alert-success':'alert-error'}" style="margin-bottom:20px">
        ${r.valid?'✅ Blockchain is intact and valid.':'❌ Blockchain integrity compromised! '+r.issues?.join(', ')}
      </div>
      ${(r.chain_data||[]).map(block=>`
        <div class="bc-block">
          <div class="bc-block-header">
            <div class="bc-block-index">Block #${block.index}</div>
            <span class="badge badge-blue">${block.tx_count} txns</span>
          </div>
          <div class="bc-block-field"><span class="bc-field-label">Hash</span><span class="bc-field-val">${block.hash}</span></div>
          <div class="bc-block-field"><span class="bc-field-label">Merkle</span><span class="bc-field-val">${block.merkle_root}</span></div>
          <div class="bc-block-field"><span class="bc-field-label">Nonce</span><span class="bc-field-val">${block.nonce}</span></div>
        </div>`).join('')}`;
  } catch(e) { el.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
}

// ── CHATBOT ──────────────────────────────────────────────────
function renderChatbot() {
  return `
    <button class="chat-btn" onclick="toggleChat()" title="VoteBot AI Assistant">🤖</button>
    ${state.chatOpen ? `
      <div class="chat-window">
        <div class="chat-header">
          <div class="chat-avatar">🤖</div>
          <div>
            <div class="chat-name">VoteBot</div>
            <div class="chat-status">● Online — AI Voting Assistant</div>
          </div>
          <button class="modal-close" onclick="toggleChat()" style="margin-left:auto">✕</button>
        </div>
        <div class="chat-msgs" id="chatMsgs">
          ${state.chatHistory.length===0?`<div class="chat-msg bot">👋 Hi! I'm VoteBot. I can help you with registration, voting, encryption, blockchain verification and more. What would you like to know?</div>`:''}
          ${state.chatHistory.map(m=>`<div class="chat-msg ${m.role==='user'?'user':'bot'}">${m.content}</div>`).join('')}
        </div>
        <div class="chat-input-row">
          <input class="chat-input" id="chatInput" placeholder="Ask about voting..." onkeydown="if(event.key==='Enter')sendChat()">
          <button class="chat-send" onclick="sendChat()">➤</button>
        </div>
      </div>
    ` : ''}`;
}

function toggleChat() {
  state.chatOpen = !state.chatOpen;
  const chatArea = $('chatArea');
  if (chatArea) chatArea.innerHTML = renderChatbot();
}

async function sendChat() {
  const input = $('chatInput');
  const msg = input?.value?.trim();
  if (!msg) return;
  state.chatHistory.push({role:'user',content:msg});
  input.value = '';
  const chatArea = $('chatArea');
  if (chatArea) chatArea.innerHTML = renderChatbot();
  const msgs = $('chatMsgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;

  try {
    const r = await apiFetch('/ai/chat', 'POST', {
      message: msg,
      history: state.chatHistory.slice(0,-1)
    });
    state.chatHistory.push({role:'assistant',content:r.reply});
  } catch(e) {
    state.chatHistory.push({role:'assistant',content:'Sorry, I encountered an error. Please try again.'});
  }
  if (chatArea) chatArea.innerHTML = renderChatbot();
  const msgs2 = $('chatMsgs');
  if (msgs2) msgs2.scrollTop = msgs2.scrollHeight;
}

// ── MAIN RENDER ──────────────────────────────────────────────
async function render() {
  const app = $('app');
  if (!app) return;

  // Show loading
  let content = '';
  app.innerHTML = renderNavbar() + `<div id="mainContent" style="min-height:80vh"><div class="loading-center"><span class="spinner"></span></div></div><div id="chatArea"></div>`;

  // Render page
  const pages = {
    home: renderHome,
    register: renderRegister,
    login: renderLogin,
    candidates: renderCandidates,
    vote: renderVote,
    audit: renderAudit,
    admin: renderAdmin,
  };

  const renderer = pages[state.page] || renderHome;
  const html = await renderer();
  const mainContent = $('mainContent');
  if (mainContent) mainContent.innerHTML = html;

  // Re-render navbar (for active state)
  const navbar = qs('.navbar');
  if (navbar) navbar.outerHTML = renderNavbar();

  // Render chatbot
  const chatArea = $('chatArea');
  if (chatArea) chatArea.innerHTML = renderChatbot();

  // Post-render actions
  if (state.page === 'admin' && state.adminAuthed) {
    setTimeout(loadAdminCandidates, 100);
  }
}

// ── BOOTSTRAP ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const loader = $('loader');
  injectCSS();
  setTimeout(async () => {
    if (loader) loader.remove();
    await render();
  }, 600);
});

// Expose globals
window.navigate = navigate;
window.logout = logout;
window.submitRegistration = submitRegistration;
window.submitLogin = submitLogin;
window.selectCandidate = selectCandidate;
window.castVote = castVote;
window.copyToClipboard = copyToClipboard;
window.switchAuditTab = switchAuditTab;
window.verifyVoteHash = verifyVoteHash;
window.adminLogin = adminLogin;
window.switchAdminTab = switchAdminTab;
window.addCandidate = addCandidate;
window.removeCandidate = removeCandidate;
window.runVerifySig = runVerifySig;
window.runDecryptResults = runDecryptResults;
window.runFraudDetect = runFraudDetect;
window.toggleChat = toggleChat;
window.sendChat = sendChat;

