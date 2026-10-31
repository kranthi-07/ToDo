/* ══════════════════════════════════════════════
   ToDo — app.js   (complete, bug-free)
══════════════════════════════════════════════ */
'use strict';

/* ── Constants ── */
const STORAGE_KEY = 'todo_v3';

const LIST_COLORS = [
  { id:'purple', hex:'#5B21B6', light:'#EDE9FE' },
  { id:'blue',   hex:'#1D4ED8', light:'#DBEAFE' },
  { id:'green',  hex:'#047857', light:'#D1FAE5' },
  { id:'orange', hex:'#B45309', light:'#FEF3C7' },
  { id:'red',    hex:'#B91C1C', light:'#FEE2E2' },
  { id:'pink',   hex:'#BE185D', light:'#FCE7F3' },
  { id:'teal',   hex:'#0E7490', light:'#CFFAFE' },
];

const EMOJIS = ['📋','📚','🎓','🏠','💊','🍔','🎮','✈️','💄','⚽',
                '🔧','🎁','💡','📱','💻','👕','🎵','🏋️','🐶','🌱',
                '📝','🧳','🎯','🎨','⭐'];

const CAT_LABELS = {
  education:'📚 Study', electronics:'💻 Tech', clothing:'👕 Wear',
  food:'🍔 Food', home:'🏠 Home', sports:'⚽ Sports', other:'🎁 Other',
};
const CAT_LABELS_CLIP = {
  study:'📚 Study', tech:'💻 Tech', college:'🎓 College',
  motivation:'🔥 Motivation', other:'✨ Other'
};
const PRI_ORDER = { high:0, medium:1, low:2 };

/* ── State ── */
let state = { lists:[], buys:[], clips:[], settings:{ darkMode:false } };

/* UI state */
let currentListId = null;
let editListId    = null;
let editTaskId    = null;
let editBuyId     = null;
let editClipId    = null;
let taskFilter    = 'all';
let buyCat        = 'all';
let buyFilter     = 'all';
let buySort       = 'date';
let clipCat       = 'all';
let clipType      = 'all';
let selColor      = LIST_COLORS[0].id;
let selEmoji      = EMOJIS[0];
let selPriTask    = 'medium';
let selPriBuy     = 'medium';
let selCatBuy     = 'education';
let selCatClip    = 'study';
let toastTm       = null;

/* ── Utils ── */
const $ = id => document.getElementById(id);
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const esc  = s  => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmtR = n  => (!n||n===0) ? '₹0' : '₹'+Number(n).toLocaleString('en-IN');
const clamp = (v,lo,hi) => Math.min(hi, Math.max(lo,v));

function todayStr() {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isSameDay(ts) {
  const a=new Date(ts), b=new Date();
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function fmtDue(dateStr) {
  if (!dateStr) return null;
  const t = todayStr();
  if (dateStr < t) return { label:'⚠ Overdue', cls:'overdue' };
  if (dateStr === t) return { label:'📅 Today',   cls:'today'   };
  const diff = Math.round((new Date(dateStr) - new Date(t)) / 86400000);
  if (diff===1) return { label:'📅 Tomorrow', cls:'' };
  return { label:`📅 ${diff}d left`, cls:'' };
}
function fmtDate(d) {
  return d.toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long' });
}

/* ── Persistence ── */
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(_){} }
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch(_) {}
  state.lists    = state.lists    || [];
  state.buys     = state.buys     || [];
  state.clips    = state.clips    || [];
  state.settings = state.settings || { darkMode:false };
}

/* ── Helpers ── */
function getList(id) { return state.lists.find(l=>l.id===id); }
function colCfg(id)  { return LIST_COLORS.find(c=>c.id===id) || LIST_COLORS[0]; }

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTm);
  toastTm = setTimeout(()=>el.classList.remove('show'), 2400);
}
function vibe(pattern = 30) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch(_) {}
}

/* ══════════════════════════════════
   CELEBRATION CONFETTI
══════════════════════════════════ */
let confettiParticles = [];
let confettiAnimId = null;

function celebrateConfetti(count = 60) {
  const canvas = $('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#7C3AED', '#5B21B6', '#10B981', '#059669', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];
  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: window.innerWidth * (0.2 + Math.random() * 0.6),
      y: window.innerHeight * 0.45 + (Math.random() * 60 - 30),
      w: Math.random() * 8 + 6,
      h: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: -(Math.random() * 12 + 6),
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 12,
      opacity: 1,
      decay: Math.random() * 0.012 + 0.012
    });
  }

  if (!confettiAnimId) {
    runConfettiAnim(canvas, ctx);
  }
}

function runConfettiAnim(canvas, ctx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiParticles = confettiParticles.filter(p => p.opacity > 0 && p.y < canvas.height + 25);

  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.35;
    p.vx *= 0.98;
    p.rot += p.vrot;
    p.opacity -= p.decay;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.globalAlpha = Math.max(0, p.opacity);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });

  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(() => runConfettiAnim(canvas, ctx));
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiAnimId = null;
  }
}

/* ── Theme ── */
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark?'dark':'light');
  $('icon-moon').classList.toggle('hidden', dark);
  $('icon-sun').classList.toggle('hidden', !dark);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = dark ? '#1E1830' : '#5B21B6';
}
function toggleTheme() {
  state.settings.darkMode = !state.settings.darkMode;
  applyTheme(state.settings.darkMode);
  save();
}

/* ══════════════════════════════════
   NAVIGATION
══════════════════════════════════ */
function showView(name) {
  ['home','lists','detail','buys','clips'].forEach(v => {
    const el = $('view-'+v);
    if (el) el.classList.toggle('active', v===name);
  });
  const nav = $('bottom-nav');
  if (!nav) return;
  if (name==='detail') {
    nav.classList.add('hidden');
  } else {
    nav.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.nav===name)
    );
  }
}
function goHome()  { showView('home');  renderHome(); }
function goLists() { showView('lists'); renderLists(); }
function goBuys()  { showView('buys');  renderBuys(); }
function goClips() { showView('clips'); renderClips(); }
function goDetail(id) {
  currentListId=id; taskFilter='all';
  // reset tabs
  document.querySelectorAll('#view-detail [data-filter]').forEach(t=>t.classList.remove('active'));
  const allTab = document.querySelector('#view-detail [data-filter="all"]');
  if (allTab) allTab.classList.add('active');
  showView('detail');
  renderDetail();
}

/* ══════════════════════════════════
   RENDER: HOME
══════════════════════════════════ */
function renderHome() {
  // Greeting + date
  const now = new Date();
  const h = now.getHours();
  let greet;
  if (h<5) greet='Good night 🌙';
  else if (h<12) greet='Good morning 👋';
  else if (h<17) greet='Good afternoon ☀️';
  else if (h<21) greet='Good evening 🌆';
  else greet='Good night 🌙';
  const gEl = $('hero-greeting'); if (gEl) gEl.textContent = greet;
  const dEl = $('hero-date');     if (dEl) dEl.textContent = fmtDate(now);

  const allTasks    = state.lists.flatMap(l=>l.tasks);
  const pendingBuys = state.buys.filter(b=>!b.bought);
  const totalBudget = pendingBuys.reduce((s,b)=>s+(b.price||0),0);
  const doneToday   = allTasks.filter(t=>t.done && t.doneAt && isSameDay(t.doneAt)).length;
  const totalTasks  = allTasks.length;
  const doneTasks   = allTasks.filter(t=>t.done).length;
  const pct         = totalTasks>0 ? Math.round(doneTasks/totalTasks*100) : 0;

  // Hero chips
  const tc = $('hero-tasks-chip');
  if (tc) tc.textContent = `${totalTasks - doneTasks} tasks pending`;
  const bc = $('hero-buys-chip');
  if (bc) bc.textContent = `${fmtR(totalBudget)} budgeted`;

  // Ring
  const arc = $('hero-ring-arc');
  if (arc) {
    const circ = 2 * Math.PI * 28; // r=28
    arc.style.strokeDashoffset = String(circ - (circ * pct / 100));
  }
  const pctEl = $('hero-pct'); if (pctEl) pctEl.textContent = pct+'%';

  // Stats
  const sl=$('sp-lists'); if(sl) sl.textContent=state.lists.length;
  const st=$('sp-tasks'); if(st) st.textContent=totalTasks;
  const sb=$('sp-buys');  if(sb) sb.textContent=pendingBuys.length;
  const sc=$('sp-clips'); if(sc) sc.textContent=state.clips.length;

  // Quick tiles
  const qlm=$('qc-lists-meta'); if(qlm) qlm.textContent=`${state.lists.length} list${state.lists.length!==1?'s':''}`;
  const qbm=$('qc-buys-meta');  if(qbm) qbm.textContent=`${fmtR(totalBudget)} planned`;
  const qcm=$('qc-clips-meta'); if(qcm) qcm.textContent=`${state.clips.length} saved video${state.clips.length!==1?'s':''}`;

  // High priority tasks
  const highTasks = state.lists
    .flatMap(l=>l.tasks.map(t=>({...t,listName:l.name,listId:l.id})))
    .filter(t=>!t.done && t.priority==='high')
    .slice(0,4);

  const htEl = $('home-tasks');
  if (htEl) {
    htEl.innerHTML = '';
    if (highTasks.length===0) {
      htEl.innerHTML='<p class="preview-empty">No urgent tasks right now 🎉</p>';
    } else {
      highTasks.forEach(t=>{
        const el=document.createElement('div');
        el.className='prev-card';
        el.innerHTML=`
          <div class="prev-card-body">
            <div class="prev-name">${esc(t.text)}</div>
            <div class="prev-meta">📋 ${esc(t.listName)}${t.dueDate?' · '+fmtDue(t.dueDate)?.label:''}</div>
          </div>`;
        el.addEventListener('click',()=>goDetail(t.listId));
        htEl.appendChild(el);
      });
    }
  }

  // Top buys
  const topBuys=[...state.buys]
    .filter(b=>!b.bought)
    .sort((a,b)=>PRI_ORDER[a.priority]-PRI_ORDER[b.priority]||(b.price||0)-(a.price||0))
    .slice(0,4);

  const hbEl=$('home-buys');
  if (hbEl) {
    hbEl.innerHTML='';
    if (topBuys.length===0) {
      hbEl.innerHTML='<p class="preview-empty">No upcoming buys — add some!</p>';
    } else {
      topBuys.forEach(b=>{
        const el=document.createElement('div');
        el.className='prev-card prev-card-buy';
        el.innerHTML=`
          <div class="prev-card-body">
            <div class="prev-name">${esc(b.name)}</div>
            <div class="prev-meta">${CAT_LABELS[b.category]||'🎁 Other'}</div>
          </div>
          <div class="prev-price">${b.price>0?fmtR(b.price):'—'}</div>`;
        el.addEventListener('click',()=>goBuys());
        hbEl.appendChild(el);
      });
    }
  }

  // Recent clips
  const recentClips = state.clips.slice(0, 3);
  const hcEl = $('home-clips');
  if (hcEl) {
    hcEl.innerHTML = '';
    if (recentClips.length === 0) {
      hcEl.innerHTML = '<p class="preview-empty">No saved clips yet — paste a YouTube or Insta link!</p>';
    } else {
      recentClips.forEach(c => {
        const el = document.createElement('div');
        el.className = 'prev-card';
        const icon = c.type === 'youtube' ? '▶' : c.type === 'instagram' ? '📸' : '🌐';
        el.innerHTML = `
          <div class="prev-card-body">
            <div class="prev-name">${icon} ${esc(c.caption || c.url)}</div>
            <div class="prev-meta">${CAT_LABELS_CLIP[c.category] || '✨ Other'} · ${fmtTimeAgo(c.createdAt)}</div>
          </div>
          <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;font-weight:700;color:var(--brand);text-decoration:none;padding:5px 9px;background:var(--surface-2);border-radius:6px;border:1px solid var(--border);" onclick="event.stopPropagation()">Open ↗</a>`;
        el.addEventListener('click', () => goClips());
        hcEl.appendChild(el);
      });
    }
  }
}

/* ══════════════════════════════════
   RENDER: LISTS
══════════════════════════════════ */
function renderLists() {
  const container = $('lists-container');
  const empty     = $('empty-lists');
  if (!container) return;
  container.querySelectorAll('.list-card').forEach(e=>e.remove());

  if (state.lists.length===0) {
    if (empty) empty.style.display='block';
    return;
  }
  if (empty) empty.style.display='none';

  state.lists.forEach(list=>{
    const c     = colCfg(list.color);
    const done  = list.tasks.filter(t=>t.done).length;
    const total = list.tasks.length;
    const pct   = total>0 ? Math.round(done/total*100) : 0;
    const high  = list.tasks.filter(t=>!t.done && t.priority==='high').length;

    const card = document.createElement('div');
    card.className='list-card';
    card.style.setProperty('--lc-color', c.hex);
    card.innerHTML=`
      <div class="lc-emoji">${esc(list.emoji)}</div>
      <div class="lc-body">
        <div class="lc-name">${esc(list.name)}</div>
        <div class="lc-sub">${total} task${total!==1?'s':''}${high>0?` &nbsp;·&nbsp; 🔴 ${high} urgent`:''}</div>
        <div class="lc-prog-wrap">
          <div class="lc-prog-track"><div class="lc-prog-fill" style="width:${pct}%"></div></div>
          <span class="lc-pct">${pct}%</span>
        </div>
      </div>
      <div class="lc-right">
        <span class="lc-count">${done}</span>
        <span class="lc-count-lbl">done</span>
      </div>`;
    card.addEventListener('click',()=>goDetail(list.id));
    container.appendChild(card);
  });
}

/* ══════════════════════════════════
   RENDER: DETAIL
══════════════════════════════════ */
function renderDetail() {
  const list = getList(currentListId);
  if (!list) { goLists(); return; }

  const c = colCfg(list.color);

  // Header accent
  const bar = $('detail-accent-bar');
  if (bar) bar.style.background = c.hex;

  // Title
  const em=$('detail-emoji'); if(em) em.textContent=list.emoji;
  const dt=$('detail-title'); if(dt) dt.textContent=list.name;

  // Progress
  const done  = list.tasks.filter(t=>t.done).length;
  const total = list.tasks.length;
  const pct   = total>0 ? Math.round(done/total*100) : 0;
  const pd=$('ps-done');  if(pd){ pd.textContent=done;  pd.style.color=c.hex; }
  const pt=$('ps-total'); if(pt) pt.textContent=total;
  const pp=$('ps-pct');   if(pp){ pp.textContent=pct+'%'; pp.style.color=c.hex; }
  const pf=$('detail-prog-fill'); if(pf){ pf.style.width=pct+'%'; pf.style.background=c.hex; }

  // Filter
  let tasks=[...list.tasks];
  if (taskFilter==='active') tasks=tasks.filter(t=>!t.done);
  if (taskFilter==='done')   tasks=tasks.filter(t=>t.done);
  if (taskFilter==='high')   tasks=tasks.filter(t=>!t.done&&t.priority==='high');
  tasks.sort((a,b)=>{
    if(a.done!==b.done) return a.done?1:-1;
    return PRI_ORDER[a.priority]-PRI_ORDER[b.priority];
  });

  const container = $('tasks-container');
  const empty     = $('empty-tasks');
  if (!container) return;
  container.querySelectorAll('.task-card').forEach(e=>e.remove());

  if (tasks.length===0) { if(empty)empty.style.display='block'; return; }
  if (empty) empty.style.display='none';

  tasks.forEach(task=>{
    const dueInfo = fmtDue(task.dueDate);
    const card=document.createElement('div');
    card.className=`task-card${task.done?' done-card':''}`;
    card.dataset.pri=task.priority;
    card.innerHTML=`
      <button class="check-btn${task.done?' chk-done':''}" data-id="${esc(task.id)}" aria-label="Toggle done"></button>
      <div class="task-body">
        <div class="task-text">${esc(task.text)}</div>
        ${task.note?`<div class="task-note">${esc(task.note)}</div>`:''}
        <div class="task-tags">
          <span class="ptag ptag-${task.priority}">${task.priority.charAt(0).toUpperCase()+task.priority.slice(1)}</span>
          ${dueInfo?`<span class="dtag ${dueInfo.cls}">${dueInfo.label}</span>`:''}
        </div>
      </div>
      <div class="item-actions">
        <button class="act-btn edit-task-btn" data-id="${esc(task.id)}" aria-label="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
        </button>
        <button class="act-btn del del-task-btn" data-id="${esc(task.id)}" aria-label="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>`;
    container.appendChild(card);
  });

  container.querySelectorAll('.check-btn').forEach(b=>b.addEventListener('click',()=>toggleTask(b.dataset.id)));
  container.querySelectorAll('.edit-task-btn').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openEditTask(b.dataset.id);}));
  container.querySelectorAll('.del-task-btn').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();deleteTask(b.dataset.id);}));
}

/* ══════════════════════════════════
   RENDER: BUYS
══════════════════════════════════ */
function renderBuys() {
  const total     = state.buys.reduce((s,b)=>s+(b.price||0),0);
  const boughtAmt = state.buys.filter(b=>b.bought).reduce((s,b)=>s+(b.price||0),0);
  const remaining = total-boughtAmt;
  const pct       = total>0?Math.round(boughtAmt/total*100):0;

  const bt=$('bb-total');     if(bt)bt.textContent=fmtR(total);
  const bb=$('bb-bought');    if(bb)bb.textContent=fmtR(boughtAmt);
  const br=$('bb-remaining'); if(br)br.textContent=fmtR(remaining);
  const bf=$('budget-fill');  if(bf)bf.style.width=pct+'%';

  let buys=[...state.buys];
  if (buyCat!=='all')       buys=buys.filter(b=>b.category===buyCat);
  if (buyFilter==='pending')buys=buys.filter(b=>!b.bought);
  if (buyFilter==='bought') buys=buys.filter(b=>b.bought);

  const q=$('search-buys')?.value.trim().toLowerCase()||'';
  if (q) buys=buys.filter(b=>b.name.toLowerCase().includes(q)||(b.note||'').toLowerCase().includes(q));

  if (buySort==='price-h') buys.sort((a,b)=>(b.price||0)-(a.price||0));
  else if (buySort==='price-l') buys.sort((a,b)=>(a.price||0)-(b.price||0));
  else if (buySort==='priority') buys.sort((a,b)=>PRI_ORDER[a.priority]-PRI_ORDER[b.priority]);
  else buys.sort((a,b)=>b.createdAt-a.createdAt);
  buys.sort((a,b)=>(a.bought?1:0)-(b.bought?1:0));

  const container=$('buys-container');
  const empty=$('empty-buys');
  if (!container) return;
  container.querySelectorAll('.buy-card').forEach(e=>e.remove());

  if (buys.length===0){ if(empty)empty.style.display='block'; return; }
  if (empty) empty.style.display='none';

  buys.forEach(buy=>{
    const isAfforded = allocatedBuyIds.has(buy.id);
    const card=document.createElement('div');
    card.className=`buy-card${buy.bought?' bought-card':''}${isAfforded?' afforded':''}`;
    card.dataset.pri=buy.priority;
    card.innerHTML=`
      <button class="check-btn${buy.bought?' chk-done':''}" data-id="${esc(buy.id)}" aria-label="Toggle bought"></button>
      <div class="buy-body">
        <div class="buy-name">${esc(buy.name)}</div>
        ${buy.note?`<div class="buy-note">${esc(buy.note)}</div>`:''}
        <div class="buy-tags">
          <span class="cat-tag">${CAT_LABELS[buy.category]||'🎁 Other'}</span>
          <span class="ptag ptag-${buy.priority}">${buy.priority.charAt(0).toUpperCase()+buy.priority.slice(1)}</span>
          ${isAfforded?`<span class="afford-tag">✨ In Budget</span>`:''}
        </div>
      </div>
      <div class="buy-right">
        <span class="buy-price${!buy.price?' zero':''}">${buy.price>0?fmtR(buy.price):'—'}</span>
        <div class="item-actions">
          <button class="act-btn edit-buy-btn" data-id="${esc(buy.id)}" aria-label="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
          </button>
          <button class="act-btn del del-buy-btn" data-id="${esc(buy.id)}" aria-label="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </div>`;
    container.appendChild(card);
  });

  container.querySelectorAll('.check-btn').forEach(b=>b.addEventListener('click',()=>toggleBuy(b.dataset.id)));
  container.querySelectorAll('.edit-buy-btn').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openEditBuy(b.dataset.id);}));
  container.querySelectorAll('.del-buy-btn').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();deleteBuy(b.dataset.id);}));
}

/* ══════════════════════════════════
   CRUD: Lists
══════════════════════════════════ */
function createList(name,emoji,color){
  state.lists.unshift({id:uid(),name,emoji,color,createdAt:Date.now(),tasks:[]});
  save(); renderLists(); toast('List created ✅');
}
function updateList(id,name,emoji,color){
  const l=getList(id); if(!l)return;
  l.name=name; l.emoji=emoji; l.color=color;
  save(); renderLists(); toast('List updated ✏️');
}
function deleteList(id){
  if(!confirm('Delete this list and all its tasks?'))return;
  state.lists=state.lists.filter(l=>l.id!==id);
  save(); goLists(); toast('List deleted 🗑️');
}

/* ── CRUD: Tasks ── */
function addTask(text,note,priority,dueDate){
  const l=getList(currentListId); if(!l)return;
  l.tasks.push({id:uid(),text,note:note||'',priority,dueDate:dueDate||null,done:false,doneAt:null,createdAt:Date.now()});
  save(); renderDetail(); toast('Task added ✅');
}
function updateTask(tid,text,note,priority,dueDate){
  const l=getList(currentListId); if(!l)return;
  const t=l.tasks.find(x=>x.id===tid); if(!t)return;
  t.text=text; t.note=note||''; t.priority=priority; t.dueDate=dueDate||null;
  save(); renderDetail(); toast('Task updated ✏️');
}
function toggleTask(tid){
  const l=getList(currentListId); if(!l)return;
  const t=l.tasks.find(x=>x.id===tid); if(!t)return;
  t.done=!t.done; t.doneAt=t.done?Date.now():null;
  save(); vibe(t.done?[40,50,40]:30); renderDetail();
  if(t.done) {
    const allDone = l.tasks.length>0 && l.tasks.every(x=>x.done);
    if(allDone) {
      celebrateConfetti(85);
      toast('All tasks completed! Fantastic job! 🏆');
    } else {
      celebrateConfetti(45);
      toast('Task completed 🎉');
    }
  }
}
function deleteTask(tid){
  const l=getList(currentListId); if(!l)return;
  l.tasks=l.tasks.filter(t=>t.id!==tid);
  save(); renderDetail(); toast('Task removed 🗑️');
}

/* ── CRUD: Buys ── */
function addBuy(name,price,category,priority,note){
  state.buys.unshift({id:uid(),name,price:parseFloat(price)||0,category,priority,note:note||'',bought:false,boughtAt:null,createdAt:Date.now()});
  save(); renderBuys(); toast('Item added to Upcoming Buys ✅');
}
function updateBuy(id,name,price,category,priority,note){
  const b=state.buys.find(x=>x.id===id); if(!b)return;
  b.name=name; b.price=parseFloat(price)||0; b.category=category; b.priority=priority; b.note=note||'';
  save(); renderBuys(); toast('Item updated ✏️');
}
function toggleBuy(id){
  const b=state.buys.find(x=>x.id===id); if(!b)return;
  b.bought=!b.bought; b.boughtAt=b.bought?Date.now():null;
  if(b.bought && allocatedBuyIds.has(id)) {
    allocatedBuyIds.delete(id);
  }
  save(); vibe(b.bought?[40,50,40]:30); renderBuys();
  if(b.bought) {
    celebrateConfetti(65);
    toast('Marked as bought 🎉');
  }
}
function deleteBuy(id){
  state.buys=state.buys.filter(x=>x.id!==id);
  if(allocatedBuyIds.has(id)) allocatedBuyIds.delete(id);
  save(); renderBuys(); toast('Item removed 🗑️');
}

/* ══════════════════════════════════
   SHARE: LIST & BUYS
══════════════════════════════════ */
async function shareText(title, text) {
  vibe(40);
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Share error:', e);
    }
  }

  // Fallback: Copy to clipboard & open WhatsApp
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied list! Opening WhatsApp… 📋');
  } catch (_) {
    toast('Opening WhatsApp… 💬');
  }
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
}

function shareCurrentList() {
  const l = getList(currentListId);
  if (!l) return;
  const tasks = l.tasks || [];
  const doneCount = tasks.filter(t => t.done).length;

  let msg = `${l.emoji} *${l.name}* (List Do)\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (tasks.length === 0) {
    msg += `(No tasks added yet)\n`;
  } else {
    tasks.forEach(t => {
      const box = t.done ? '✅' : '⬜';
      const due = t.dueDate ? ` (📅 ${t.dueDate})` : '';
      msg += `${box} ${t.text}${due}\n`;
    });
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Progress: ${doneCount}/${tasks.length} completed\n`;
  msg += `Organized with List Do ✅`;

  shareText(`${l.name} - List Do`, msg);
}

function shareBuysList() {
  const pending = state.buys.filter(b => !b.bought);
  const total = pending.reduce((s, b) => s + (b.price || 0), 0);

  let msg = `🛍️ *My Upcoming Buys* (List Do)\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (pending.length === 0) {
    msg += `(All planned items have been bought! 🎉)\n`;
  } else {
    pending.forEach(b => {
      const cat = CAT_LABELS[b.category] || '🎁 Other';
      const price = b.price > 0 ? fmtR(b.price) : 'Unpriced';
      msg += `• *${b.name}* — ${price} [${cat}]\n`;
    });
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Total Planned: ${fmtR(total)} (${pending.length} items)\n`;
  msg += `Planned with List Do 💰`;

  shareText(`Upcoming Buys - List Do`, msg);
}

/* ══════════════════════════════════
   SMART BUDGET ALLOCATOR
══════════════════════════════════ */
let allocatedBuyIds = new Set();
let lastAllocatedBudget = 0;

function calculateBudgetAllocation() {
  vibe(30);
  const inp = $('inp-allocator');
  const amount = parseFloat(inp?.value);
  if (!amount || amount <= 0) {
    toast('Please enter a valid amount in ₹ 💰');
    return;
  }

  const pending = state.buys.filter(b => !b.bought && b.price > 0);
  if (pending.length === 0) {
    toast('No pending priced items in your wishlist! Add items with prices first.');
    return;
  }

  // High priority first, then medium, then low. Within same priority, lower price first!
  pending.sort((a, b) => {
    const pDiff = PRI_ORDER[a.priority] - PRI_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.price - b.price;
  });

  allocatedBuyIds.clear();
  let remaining = amount;
  let totalCost = 0;

  for (const b of pending) {
    if (b.price <= remaining) {
      allocatedBuyIds.add(b.id);
      remaining -= b.price;
      totalCost += b.price;
    }
  }

  lastAllocatedBudget = amount;
  renderAllocatorResults(amount, totalCost, remaining, allocatedBuyIds.size);
  renderBuys();
  $('btn-clear-allocator')?.classList.remove('hidden');

  if (allocatedBuyIds.size > 0) {
    celebrateConfetti(45);
    toast(`Found ${allocatedBuyIds.size} item(s) you can afford today! 🎉`);
  } else {
    toast(`No items fit within ${fmtR(amount)}. Try entering a higher amount!`);
  }
}

function renderAllocatorResults(budget, totalCost, remaining, count) {
  const res = $('allocator-results');
  if (!res) return;
  res.classList.remove('hidden');

  if (count === 0) {
    res.innerHTML = `
      <div style="font-size:13px;color:var(--text-2);text-align:center;padding:4px 0;">
        ⚠️ None of your pending items fit within <strong>${fmtR(budget)}</strong>.<br/>
        <span style="font-size:11.5px;color:var(--text-3);margin-top:2px;display:inline-block;">Try entering a higher budget or adding smaller items!</span>
      </div>`;
    return;
  }

  res.innerHTML = `
    <div class="ac-summary-row">
      <div class="ac-summary-item">
        <span class="ac-sum-num">${count}</span>
        <span class="ac-sum-lbl">Affordable</span>
      </div>
      <div class="ac-summary-item">
        <span class="ac-sum-num">${fmtR(totalCost)}</span>
        <span class="ac-sum-lbl">Total Cost</span>
      </div>
      <div class="ac-summary-item">
        <span class="ac-sum-num ac-sum-green">${fmtR(remaining)}</span>
        <span class="ac-sum-lbl">Remaining</span>
      </div>
    </div>
    <button class="ac-buy-all-btn" id="btn-buy-afforded">
      🎉 Mark ${count} Afforded Item${count > 1 ? 's' : ''} as Bought
    </button>`;

  $('btn-buy-afforded')?.addEventListener('click', markAffordedAsBought);
}

function clearBudgetAllocation() {
  allocatedBuyIds.clear();
  lastAllocatedBudget = 0;
  const inp = $('inp-allocator');
  if (inp) inp.value = '';
  $('allocator-results')?.classList.add('hidden');
  $('btn-clear-allocator')?.classList.add('hidden');
  renderBuys();
}

function markAffordedAsBought() {
  const count = allocatedBuyIds.size;
  if (count === 0) return;

  state.buys.forEach(b => {
    if (allocatedBuyIds.has(b.id)) {
      b.bought = true;
      b.boughtAt = Date.now();
    }
  });

  clearBudgetAllocation();
  save();
  vibe([60, 60, 60]);
  celebrateConfetti(95);
  renderBuys();
  toast(`Purchased ${count} item${count > 1 ? 's' : ''}! Enjoy your new stuff! 🛍️`);
}

/* ══════════════════════════════════
   SAVED CLIPS & MEDIA (YouTube & Insta)
══════════════════════════════════ */
function fmtTimeAgo(ts) {
  if (!ts) return 'recently';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { month:'short', day:'numeric' });
}

function parseClipUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return null;

  // YouTube match (watch, shorts, embed, youtu.be)
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const isShorts = url.includes('/shorts/');
    return {
      type: 'youtube',
      isShorts,
      videoId,
      url: isShorts ? `https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      label: isShorts ? 'Shorts' : 'YouTube'
    };
  }

  // Instagram Reel or Post match
  const igMatch = url.match(/instagram\.com\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    const reelId = igMatch[1];
    const isReel = url.includes('/reel/');
    return {
      type: 'instagram',
      isReel,
      reelId,
      url: `https://www.instagram.com/${isReel ? 'reel' : 'p'}/${reelId}/`,
      thumbnail: null,
      label: isReel ? 'Instagram Reel' : 'Instagram Post'
    };
  }

  // General Web Link
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    return {
      type: 'web',
      url: u.href,
      domain: u.hostname.replace(/^www\./, ''),
      thumbnail: null,
      label: 'Web Link'
    };
  } catch (_) {
    return {
      type: 'web',
      url: url.startsWith('http') ? url : 'https://' + url,
      domain: 'Link',
      thumbnail: null,
      label: 'Web Link'
    };
  }
}

function addClip(rawUrl, caption, category) {
  const parsed = parseClipUrl(rawUrl);
  if (!parsed) {
    toast('Please enter a valid video or reel link! 🔗');
    return false;
  }

  let defaultCap = caption?.trim();
  if (!defaultCap) {
    if (parsed.type === 'youtube') defaultCap = parsed.isShorts ? 'YouTube Short' : 'YouTube Video';
    else if (parsed.type === 'instagram') defaultCap = parsed.isReel ? 'Instagram Reel' : 'Instagram Post';
    else defaultCap = parsed.domain || 'Saved Link';
  }

  state.clips.unshift({
    id: uid(),
    url: parsed.url,
    type: parsed.type,
    isShorts: parsed.isShorts || false,
    videoId: parsed.videoId || null,
    reelId: parsed.reelId || null,
    domain: parsed.domain || null,
    thumbnail: parsed.thumbnail || null,
    caption: defaultCap,
    category: category || 'study',
    createdAt: Date.now()
  });

  save();
  vibe(40);
  celebrateConfetti(40);
  renderClips();
  toast('Clip saved to your collection! 🎬');
  return true;
}

function updateClip(id, rawUrl, caption, category) {
  const c = state.clips.find(x => x.id === id);
  if (!c) return;
  const parsed = parseClipUrl(rawUrl);
  if (parsed) {
    c.url = parsed.url;
    c.type = parsed.type;
    c.isShorts = parsed.isShorts || false;
    c.videoId = parsed.videoId || null;
    c.reelId = parsed.reelId || null;
    c.domain = parsed.domain || null;
    c.thumbnail = parsed.thumbnail || null;
  }
  if (caption && caption.trim()) c.caption = caption.trim();
  c.category = category || c.category;

  save();
  renderClips();
  toast('Clip updated ✏️');
}

function deleteClip(id) {
  state.clips = state.clips.filter(x => x.id !== id);
  save();
  renderClips();
  toast('Clip removed 🗑️');
}

function renderClips() {
  let clips = [...state.clips];
  if (clipCat !== 'all') clips = clips.filter(c => c.category === clipCat);
  if (clipType !== 'all') clips = clips.filter(c => c.type === clipType);

  const q = $('search-clips')?.value.trim().toLowerCase() || '';
  if (q) {
    clips = clips.filter(c => (c.caption || '').toLowerCase().includes(q) || (c.url || '').toLowerCase().includes(q));
  }

  clips.sort((a, b) => b.createdAt - a.createdAt);

  const counter = $('clips-counter');
  if (counter) counter.textContent = `${clips.length} saved`;

  const container = $('clips-container');
  const empty = $('empty-clips');
  if (!container) return;

  container.querySelectorAll('.clip-card').forEach(e => e.remove());

  if (clips.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  clips.forEach(clip => {
    const card = document.createElement('div');
    card.className = `clip-card clip-${clip.type}`;
    
    let mediaHtml = '';
    if (clip.type === 'youtube' && clip.thumbnail) {
      mediaHtml = `
        <div class="clip-media-wrap" data-url="${esc(clip.url)}">
          <img class="clip-thumb" src="${esc(clip.thumbnail)}" alt="${esc(clip.caption)}" loading="lazy" onerror="this.src='icon-192.png'"/>
          <div class="clip-badge badge-yt">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <span>${clip.isShorts ? 'Shorts' : 'YouTube'}</span>
          </div>
          <div class="clip-play-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>`;
    } else if (clip.type === 'instagram') {
      mediaHtml = `
        <div class="clip-media-wrap clip-media-ig" data-url="${esc(clip.url)}">
          <div class="clip-badge badge-ig">📸 Instagram</div>
          <div class="clip-ig-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </div>
          <span class="clip-ig-brand-text">${clip.isReel ? 'Watch Reel' : 'Instagram Post'}</span>
        </div>`;
    } else {
      mediaHtml = `
        <div class="clip-media-wrap clip-media-web" data-url="${esc(clip.url)}">
          <div class="clip-badge badge-web">🌐 Link</div>
          <span class="clip-web-icon">🔗</span>
          <span class="clip-web-domain">${esc(clip.domain || 'External Website')}</span>
        </div>`;
    }

    const watchBtnClass = clip.type === 'youtube' ? 'btn-yt' : clip.type === 'instagram' ? 'btn-ig' : '';
    const watchLabel = clip.type === 'youtube' ? (clip.isShorts ? '▶ Watch Short' : '▶ Watch Video') : clip.type === 'instagram' ? '📸 Open Reel' : '🌐 Visit Link';

    card.innerHTML = `
      ${mediaHtml}
      <div class="clip-content">
        <div class="clip-caption">${esc(clip.caption || clip.url)}</div>
        <div class="clip-meta-row">
          <span class="clip-cat-tag">${CAT_LABELS_CLIP[clip.category] || '✨ Other'}</span>
          <span class="clip-date">${fmtTimeAgo(clip.createdAt)}</span>
        </div>
        <div class="clip-action-bar">
          <a href="${esc(clip.url)}" target="_blank" rel="noopener noreferrer" class="clip-watch-btn ${watchBtnClass}">
            <span>${watchLabel}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <div class="item-actions">
            <button class="act-btn share-clip-btn" data-id="${esc(clip.id)}" aria-label="Share">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button class="act-btn edit-clip-btn" data-id="${esc(clip.id)}" aria-label="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <button class="act-btn del del-clip-btn" data-id="${esc(clip.id)}" aria-label="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>`;

    container.appendChild(card);
  });

  // Clicking thumbnail opens link
  container.querySelectorAll('.clip-media-wrap').forEach(wrap => {
    wrap.addEventListener('click', () => {
      const u = wrap.dataset.url;
      if (u) window.open(u, '_blank');
    });
  });

  // Action listeners
  container.querySelectorAll('.share-clip-btn').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const c = state.clips.find(x => x.id === b.dataset.id);
      if (c) {
        shareText(c.caption, `🎬 *${c.caption}*\nWatch here: ${c.url}\n(Saved in List Do)`);
      }
    });
  });

  container.querySelectorAll('.edit-clip-btn').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      openEditClip(b.dataset.id);
    });
  });

  container.querySelectorAll('.del-clip-btn').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      deleteClip(b.dataset.id);
    });
  });
}

function openNewClip() {
  editClipId = null;
  selCatClip = 'study';
  $('mc-title').textContent = 'Save Video or Reel';
  $('inp-clip-url').value = '';
  $('inp-clip-caption').value = '';
  $('btn-save-clip').textContent = 'Save Clip';
  $('clip-modal-preview').classList.add('hidden');
  $('clip-modal-preview').innerHTML = '';
  buildCatClip('study');
  $('modal-clip').showModal();
  setTimeout(() => $('inp-clip-url').focus(), 150);
}

function openEditClip(id) {
  const c = state.clips.find(x => x.id === id);
  if (!c) return;
  editClipId = id;
  selCatClip = c.category;
  $('mc-title').textContent = 'Edit Clip';
  $('inp-clip-url').value = c.url;
  $('inp-clip-caption').value = c.caption;
  $('btn-save-clip').textContent = 'Save Changes';
  updateModalPreview(c.url);
  buildCatClip(c.category);
  $('modal-clip').showModal();
}

function closeClipModal() {
  $('modal-clip').close();
  editClipId = null;
}

function saveClip() {
  const url = $('inp-clip-url').value.trim();
  if (!url) {
    $('inp-clip-url').focus();
    toast('Please paste a video or reel link');
    return;
  }
  const cap = $('inp-clip-caption').value.trim();
  closeClipModal();
  if (editClipId) updateClip(editClipId, url, cap, selCatClip);
  else addClip(url, cap, selCatClip);
}

function updateModalPreview(rawUrl) {
  const box = $('clip-modal-preview');
  if (!box) return;
  const parsed = parseClipUrl(rawUrl);
  if (!parsed) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  box.classList.remove('hidden');
  if (parsed.type === 'youtube' && parsed.thumbnail) {
    box.innerHTML = `<img src="${esc(parsed.thumbnail)}" alt="Preview" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;display:block;" onerror="this.style.display='none'"/>`;
  } else if (parsed.type === 'instagram') {
    box.innerHTML = `
      <div style="background:linear-gradient(135deg,#833AB4,#FD1D1D,#F56040);padding:18px;text-align:center;color:#fff;border-radius:8px;font-weight:700;font-size:13px;">
        📸 Instagram Reel detected!
      </div>`;
  } else {
    box.innerHTML = `
      <div style="background:var(--surface-2);padding:14px;text-align:center;color:var(--text-2);border-radius:8px;font-weight:600;font-size:13px;">
        🌐 Web Link (${esc(parsed.domain || 'External Site')})
      </div>`;
  }
}

function buildCatClip(sel) {
  selCatClip = sel || 'study';
  document.querySelectorAll('#clip-modal-cat-picker .cat-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.ccat === selCatClip);
  });
}

/* ══════════════════════════════════
   PICKERS
══════════════════════════════════ */
function buildColorPicker(sel) {
  const el=$('color-picker'); if(!el)return;
  el.innerHTML='';
  LIST_COLORS.forEach(c=>{
    const btn=document.createElement('button');
    btn.className='col-opt'+(c.id===sel?' selected':'');
    btn.style.background=c.hex; btn.dataset.id=c.id; btn.type='button';
    btn.addEventListener('click',()=>{
      selColor=c.id;
      document.querySelectorAll('.col-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    el.appendChild(btn);
  });
  selColor=sel||LIST_COLORS[0].id;
}
function buildEmojiPicker(sel) {
  const el=$('emoji-picker'); if(!el)return;
  el.innerHTML='';
  EMOJIS.forEach(e=>{
    const btn=document.createElement('button');
    btn.className='emj-opt'+(e===sel?' selected':'');
    btn.textContent=e; btn.type='button';
    btn.addEventListener('click',()=>{
      selEmoji=e;
      document.querySelectorAll('.emj-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    el.appendChild(btn);
  });
  selEmoji=sel||EMOJIS[0];
}
function buildPri(rowId, sel) {
  document.querySelectorAll(`#${rowId} .pri-btn`).forEach(b=>{
    b.classList.toggle('active',b.dataset.p===sel);
  });
}
function buildCat(sel) {
  document.querySelectorAll('#cat-picker .cat-opt').forEach(b=>{
    b.classList.toggle('active',b.dataset.cat===sel);
  });
  selCatBuy=sel||'education';
}

/* ══════════════════════════════════
   MODALS
══════════════════════════════════ */
/* -- List modal -- */
function openNewList(){
  editListId=null;
  $('ml-title').textContent='New List';
  $('inp-list-name').value='';
  $('btn-save-list').textContent='Create List';
  buildColorPicker(LIST_COLORS[0].id);
  buildEmojiPicker(EMOJIS[0]);
  $('modal-list').showModal();
  setTimeout(()=>$('inp-list-name').focus(),150);
}
function openEditList(id){
  const l=getList(id); if(!l)return;
  editListId=id;
  $('ml-title').textContent='Edit List';
  $('inp-list-name').value=l.name;
  $('btn-save-list').textContent='Save Changes';
  buildColorPicker(l.color);
  buildEmojiPicker(l.emoji);
  $('modal-list').showModal();
  setTimeout(()=>$('inp-list-name').focus(),150);
}
function closeListModal(){ $('modal-list').close(); editListId=null; }
function saveList(){
  const name=$('inp-list-name').value.trim();
  if(!name){ $('inp-list-name').focus(); toast('Enter a list name'); return; }
  closeListModal();
  if(editListId) updateList(editListId,name,selEmoji,selColor);
  else createList(name,selEmoji,selColor);
}

/* -- Task modal -- */
function openNewTask(){
  editTaskId=null; selPriTask='medium';
  $('mt-title').textContent='New Task';
  $('inp-task-text').value='';
  $('inp-task-note').value='';
  $('inp-task-due').value='';
  $('btn-save-task').textContent='Save Task';
  buildPri('pri-row-task','medium');
  $('modal-task').showModal();
  setTimeout(()=>$('inp-task-text').focus(),150);
}
function openEditTask(tid){
  const l=getList(currentListId); if(!l)return;
  const t=l.tasks.find(x=>x.id===tid); if(!t)return;
  editTaskId=tid; selPriTask=t.priority;
  $('mt-title').textContent='Edit Task';
  $('inp-task-text').value=t.text;
  $('inp-task-note').value=t.note||'';
  $('inp-task-due').value=t.dueDate||'';
  $('btn-save-task').textContent='Save Changes';
  buildPri('pri-row-task',t.priority);
  $('modal-task').showModal();
  setTimeout(()=>$('inp-task-text').focus(),150);
}
function closeTaskModal(){ $('modal-task').close(); editTaskId=null; }
function saveTask(){
  const text=$('inp-task-text').value.trim();
  if(!text){ $('inp-task-text').focus(); toast('Enter a task name'); return; }
  const note=$('inp-task-note').value.trim();
  const due=$('inp-task-due').value;
  closeTaskModal();
  if(editTaskId) updateTask(editTaskId,text,note,selPriTask,due);
  else addTask(text,note,selPriTask,due);
}

/* -- Buy modal -- */
function openNewBuy(){
  editBuyId=null; selPriBuy='medium'; selCatBuy='education';
  $('mb-title').textContent='Add Item to Buy';
  $('inp-buy-name').value='';
  $('inp-buy-price').value='';
  $('inp-buy-note').value='';
  $('btn-save-buy').textContent='Save Item';
  buildPri('pri-row-buy','medium');
  buildCat('education');
  $('modal-buy').showModal();
  setTimeout(()=>$('inp-buy-name').focus(),150);
}
function openEditBuy(id){
  const b=state.buys.find(x=>x.id===id); if(!b)return;
  editBuyId=id; selPriBuy=b.priority; selCatBuy=b.category;
  $('mb-title').textContent='Edit Item';
  $('inp-buy-name').value=b.name;
  $('inp-buy-price').value=b.price||'';
  $('inp-buy-note').value=b.note||'';
  $('btn-save-buy').textContent='Save Changes';
  buildPri('pri-row-buy',b.priority);
  buildCat(b.category);
  $('modal-buy').showModal();
  setTimeout(()=>$('inp-buy-name').focus(),150);
}
function closeBuyModal(){ $('modal-buy').close(); editBuyId=null; }
function saveBuy(){
  const name=$('inp-buy-name').value.trim();
  if(!name){ $('inp-buy-name').focus(); toast('Enter an item name'); return; }
  const price=$('inp-buy-price').value;
  const note=$('inp-buy-note').value.trim();
  closeBuyModal();
  if(editBuyId) updateBuy(editBuyId,name,price,selCatBuy,selPriBuy,note);
  else addBuy(name,price,selCatBuy,selPriBuy,note);
}

/* -- Search -- */
function openSearch(){
  const inp=$('search-global');
  if(inp) inp.value='';
  const res=$('search-results');
  if(res) res.innerHTML='<p class="search-hint">Start typing to search…</p>';
  $('modal-search').showModal();
  setTimeout(()=>$('search-global')?.focus(),150);
}
function closeSearch(){ $('modal-search').close(); }
function doSearch(q){
  const res=$('search-results'); if(!res)return;
  if(!q){ res.innerHTML='<p class="search-hint">Start typing to search…</p>'; return; }
  const ql=q.toLowerCase();
  const results=[];

  state.lists.forEach(list=>{
    list.tasks.forEach(t=>{
      if(t.text.toLowerCase().includes(ql)||(t.note||'').toLowerCase().includes(ql))
        results.push({type:'task',text:t.text,meta:`📋 ${list.name}`,sub:t.note,listId:list.id});
    });
  });
  state.buys.forEach(b=>{
    if(b.name.toLowerCase().includes(ql)||(b.note||'').toLowerCase().includes(ql))
      results.push({type:'buy',text:b.name,meta:`${CAT_LABELS[b.category]||'Other'} · ${fmtR(b.price)}`,sub:b.note});
  });
  state.clips.forEach(c=>{
    if((c.caption||'').toLowerCase().includes(ql)||(c.url||'').toLowerCase().includes(ql))
      results.push({type:'clip',text:c.caption||c.url,meta:`🎬 ${CAT_LABELS_CLIP[c.category]||'Clip'}`,sub:c.url});
  });

  if(results.length===0){ res.innerHTML='<p class="search-hint">No results found 😕</p>'; return; }

  res.innerHTML='';
  results.slice(0,20).forEach(r=>{
    const el=document.createElement('div');
    el.className=`prev-card${r.type==='buy'?' prev-card-buy':''}`;
    el.innerHTML=`
      <div class="prev-card-body">
        <div class="prev-name">${esc(r.text)}</div>
        <div class="prev-meta">${esc(r.meta)}${r.sub?' · '+esc(r.sub):''}</div>
      </div>
      <span style="font-size:11px;color:var(--text-3);flex-shrink:0">${r.type==='task'?'Task':r.type==='buy'?'Buy':'Clip'}</span>`;
    el.addEventListener('click',()=>{
      closeSearch();
      if(r.type==='task') goDetail(r.listId);
      else if(r.type==='buy') goBuys();
      else goClips();
    });
    res.appendChild(el);
  });
}

/* ══════════════════════════════════
   EVENT BINDINGS
══════════════════════════════════ */
function bindAll() {
  // Nav
  document.querySelectorAll('.nav-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      const v=b.dataset.nav;
      if(v==='home') goHome();
      else if(v==='lists') goLists();
      else if(v==='buys') goBuys();
      else if(v==='clips') goClips();
    });
  });

  // Home
  $('qc-lists')?.addEventListener('click',goLists);
  $('qc-buys')?.addEventListener('click',goBuys);
  $('qc-clips')?.addEventListener('click',goClips);
  $('btn-search')?.addEventListener('click',openSearch);
  $('btn-darkmode')?.addEventListener('click',toggleTheme);

  // Lists
  $('btn-new-list')?.addEventListener('click',openNewList);

  // Detail
  $('btn-back')?.addEventListener('click',goLists);
  $('btn-share-list')?.addEventListener('click',shareCurrentList);
  $('btn-edit-list')?.addEventListener('click',()=>openEditList(currentListId));
  $('btn-del-list')?.addEventListener('click',()=>deleteList(currentListId));
  $('btn-new-task')?.addEventListener('click',openNewTask);

  // Task filter tabs
  document.querySelectorAll('#view-detail [data-filter]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      taskFilter=btn.dataset.filter;
      document.querySelectorAll('#view-detail [data-filter]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderDetail();
    });
  });

  // Buys
  $('btn-new-buy')?.addEventListener('click',openNewBuy);
  $('btn-share-buys')?.addEventListener('click',shareBuysList);

  // Budget Allocator
  $('btn-calc-allocator')?.addEventListener('click',calculateBudgetAllocation);
  $('inp-allocator')?.addEventListener('keydown',e=>{ if(e.key==='Enter')calculateBudgetAllocation(); });
  $('btn-clear-allocator')?.addEventListener('click',clearBudgetAllocation);

  // Category chips
  document.querySelectorAll('#cat-scroll .chip').forEach(b=>{
    b.addEventListener('click',()=>{
      buyCat=b.dataset.cat;
      document.querySelectorAll('#cat-scroll .chip').forEach(c=>c.classList.remove('active'));
      b.classList.add('active');
      renderBuys();
    });
  });

  // Buy filter tabs
  document.querySelectorAll('[data-bfilter]').forEach(b=>{
    b.addEventListener('click',()=>{
      buyFilter=b.dataset.bfilter;
      document.querySelectorAll('[data-bfilter]').forEach(c=>c.classList.remove('active'));
      b.classList.add('active');
      renderBuys();
    });
  });

  $('buy-sort')?.addEventListener('change',e=>{ buySort=e.target.value; renderBuys(); });
  $('search-buys')?.addEventListener('input',()=>renderBuys());

  // List modal
  $('btn-cancel-list')?.addEventListener('click',closeListModal);
  $('btn-save-list')?.addEventListener('click',saveList);
  $('inp-list-name')?.addEventListener('keydown',e=>{ if(e.key==='Enter')saveList(); });
  $('modal-list')?.addEventListener('click',e=>{ if(e.target===$('modal-list'))closeListModal(); });

  // Task modal
  $('btn-cancel-task')?.addEventListener('click',closeTaskModal);
  $('btn-save-task')?.addEventListener('click',saveTask);
  $('inp-task-text')?.addEventListener('keydown',e=>{ if(e.key==='Enter')$('inp-task-note')?.focus(); });
  $('inp-task-note')?.addEventListener('keydown',e=>{ if(e.key==='Enter')saveTask(); });
  $('modal-task')?.addEventListener('click',e=>{ if(e.target===$('modal-task'))closeTaskModal(); });

  // Priority (task)
  document.querySelectorAll('#pri-row-task .pri-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      selPriTask=b.dataset.p;
      document.querySelectorAll('#pri-row-task .pri-btn').forEach(c=>c.classList.remove('active'));
      b.classList.add('active');
    });
  });

  // Buy modal
  $('btn-cancel-buy')?.addEventListener('click',closeBuyModal);
  $('btn-save-buy')?.addEventListener('click',saveBuy);
  $('inp-buy-name')?.addEventListener('keydown',e=>{ if(e.key==='Enter')$('inp-buy-price')?.focus(); });
  $('inp-buy-price')?.addEventListener('keydown',e=>{ if(e.key==='Enter')$('inp-buy-note')?.focus(); });
  $('inp-buy-note')?.addEventListener('keydown',e=>{ if(e.key==='Enter')saveBuy(); });
  $('modal-buy')?.addEventListener('click',e=>{ if(e.target===$('modal-buy'))closeBuyModal(); });

  // Priority (buy)
  document.querySelectorAll('#pri-row-buy .pri-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      selPriBuy=b.dataset.p;
      document.querySelectorAll('#pri-row-buy .pri-btn').forEach(c=>c.classList.remove('active'));
      b.classList.add('active');
    });
  });

  // Category picker (modal)
  document.querySelectorAll('#cat-picker .cat-opt').forEach(b=>{
    b.addEventListener('click',()=>{
      selCatBuy=b.dataset.cat;
      document.querySelectorAll('#cat-picker .cat-opt').forEach(c=>c.classList.remove('active'));
      b.classList.add('active');
    });
  });

  // Search
  $('btn-cancel-search')?.addEventListener('click',closeSearch);
  $('search-global')?.addEventListener('input',e=>doSearch(e.target.value.trim()));
  $('modal-search')?.addEventListener('click',e=>{ if(e.target===$('modal-search'))closeSearch(); });

  // Clips
  $('btn-new-clip')?.addEventListener('click', openNewClip);
  $('btn-quick-add-clip')?.addEventListener('click', () => {
    const val = $('quick-clip-url')?.value.trim();
    if (val && addClip(val, '', 'study')) {
      $('quick-clip-url').value = '';
    }
  });
  $('quick-clip-url')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = $('quick-clip-url')?.value.trim();
      if (val && addClip(val, '', 'study')) {
        $('quick-clip-url').value = '';
      }
    }
  });

  // Clip category chips
  document.querySelectorAll('#clip-cat-scroll .chip').forEach(b => {
    b.addEventListener('click', () => {
      clipCat = b.dataset.ccat;
      document.querySelectorAll('#clip-cat-scroll .chip').forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      renderClips();
    });
  });

  // Clip type tabs
  document.querySelectorAll('#clip-type-tabs .tab').forEach(b => {
    b.addEventListener('click', () => {
      clipType = b.dataset.ctype;
      document.querySelectorAll('#clip-type-tabs .tab').forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      renderClips();
    });
  });

  $('search-clips')?.addEventListener('input', () => renderClips());

  // Clip modal
  $('btn-cancel-clip')?.addEventListener('click', closeClipModal);
  $('btn-save-clip')?.addEventListener('click', saveClip);
  $('inp-clip-url')?.addEventListener('input', e => updateModalPreview(e.target.value.trim()));
  $('inp-clip-url')?.addEventListener('keydown', e => { if (e.key === 'Enter') $('inp-clip-caption')?.focus(); });
  $('inp-clip-caption')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveClip(); });
  $('modal-clip')?.addEventListener('click', e => { if (e.target === $('modal-clip')) closeClipModal(); });

  document.querySelectorAll('#clip-modal-cat-picker .cat-opt').forEach(b => {
    b.addEventListener('click', () => {
      selCatClip = b.dataset.ccat;
      document.querySelectorAll('#clip-modal-cat-picker .cat-opt').forEach(c => c.classList.remove('active'));
      b.classList.add('active');
    });
  });
}

/* ══════════════════════════════════
   PWA — Service Worker + Install
══════════════════════════════════ */
let deferredInstallPrompt = null;

function initPWA() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[SW] Registered:', reg.scope);
        reg.update();
      })
      .catch(err => console.warn('[SW] Registration failed:', err));
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // Capture the install prompt event (Chrome / Edge / Android)
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    setTimeout(() => showInstallBanner(), 1500);
  });

  // Show banner on mobile/desktop after loading unless already in standalone mode
  if (!isStandalone) {
    const dismissed = localStorage.getItem('pwa_dismissed');
    if (!dismissed) {
      setTimeout(() => showInstallBanner(), 2200);
    }
  }

  // When the app is successfully installed
  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    deferredInstallPrompt = null;
    toast('List Do installed on your device! 🎉');
  });

  // Offline / online detection
  function updateOnlineStatus() {
    const bar = $('offline-bar');
    if (!bar) return;
    if (navigator.onLine) {
      bar.classList.add('hidden');
    } else {
      bar.classList.remove('hidden');
    }
  }
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // Banner button bindings
  $('ib-install')?.addEventListener('click', async () => {
    vibe();
    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          toast('Installing List Do… 🚀');
          hideInstallBanner();
        }
        deferredInstallPrompt = null;
      } catch (err) {
        console.warn('Install prompt error:', err);
        openInstallGuide(isIOS);
      }
    } else {
      openInstallGuide(isIOS);
    }
  });

  $('ib-dismiss')?.addEventListener('click', () => {
    hideInstallBanner();
    localStorage.setItem('pwa_dismissed', '1');
  });

  // Close guide
  $('btn-close-guide')?.addEventListener('click', () => {
    $('modal-install-guide')?.close();
  });
  $('modal-install-guide')?.addEventListener('click', e => {
    if (e.target === $('modal-install-guide')) $('modal-install-guide').close();
  });
}

function openInstallGuide(isIOS) {
  const guide = $('modal-install-guide');
  if (!guide) return;
  if (isIOS) {
    $('guide-ios')?.classList.remove('hidden');
    $('guide-android')?.classList.add('hidden');
  } else {
    $('guide-ios')?.classList.add('hidden');
    $('guide-android')?.classList.remove('hidden');
  }
  guide.showModal();
}

function showInstallBanner() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return;
  const banner = $('install-banner');
  if (banner) banner.classList.remove('hidden');
}
function hideInstallBanner() {
  const banner = $('install-banner');
  if (banner) banner.classList.add('hidden');
}

/* ══════════════════════════════════
   INIT
══════════════════════════════════ */
function init() {
  load();
  applyTheme(state.settings.darkMode);
  bindAll();
  initPWA();
  setTimeout(()=>{
    $('splash')?.classList.add('hide');
    $('main')?.classList.remove('hidden');
    goHome();
  }, 1800);
}

init();
