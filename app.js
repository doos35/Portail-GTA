/* =========================
   État & persistence
========================= */
const STORAGE_KEY = 'portal_state_v2';

const defaultState = {
  theme: 'dark', // dark | light
  background: {
    type: 'image', // image | video
    image: { url: null, size: 'cover', attachment: 'fixed' },
    video: { url: null, muted: true, loop: true, size: 'cover' }
  },
  categories: [
    { id: uid(), name: 'Général', subs: [], collapsed: false }
  ],
  currentCategoryId: null,
  currentSubId: null,
  showFavicons: true,
  sortMode: 'dateDesc', // 'dateDesc' | 'alpha'
  bookmarks: [
    { id: uid(), title: 'OpenAI', url: 'https://openai.com', notes: '', categoryId: null, subId: null, createdAt: Date.now() }
  ],
  calcHistory: [],
  music: { visible: false, url: 'https://www.youtube.com/embed/jfKfPfyJRdk' }
};

let state = load();

function uid() { return 'id_' + Math.random().toString(36).slice(2, 10); }
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const obj = JSON.parse(raw);

    if (!obj.background) obj.background = structuredClone(defaultState.background);
    if (!Array.isArray(obj.categories)) obj.categories = structuredClone(defaultState.categories);
    if (!Array.isArray(obj.bookmarks)) obj.bookmarks = [];
    if (obj.showFavicons == null) obj.showFavicons = true;
    if (!Array.isArray(obj.calcHistory)) obj.calcHistory = [];
    if (!obj.sortMode) obj.sortMode = 'dateDesc';
    for (const c of (obj.categories || [])) if (c.collapsed == null) c.collapsed = false;
    if (!obj.music) obj.music = structuredClone(defaultState.music);

    return obj;
  } catch {
    return structuredClone(defaultState);
  }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* =========================
   Raccourcis DOM
========================= */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const els = {
  search: $('#search'),
  googleForm: $('#google-search'),
  googleInput: $('#google-search-input'),
  btnCalc: $('#btn-calculator'),
  btnSettings: $('#btn-settings'),
  btnExport: $('#btn-export'),
  btnImport: $('#btn-import'),
  fileInput: $('#file-input'),
  btnSample: $('#btn-sample'),
  categories: $('#categories'),
  newCategoryName: $('#new-category-name'),
  btnAddCategory: $('#btn-add-category'),
  newSubName: $('#new-sub-name'),
  btnCreateSub: $('#btn-create-sub'),
  currentCatTitle: $('#current-category-title'),
  bookmarks: $('#bookmarks'),
  btnAddBookmark: $('#btn-add-bookmark'),

  modal: $('#modal'),
  modalForm: $('#modal-form'),
  modalTitle: $('#modal-title'),
  btnCloseModal: $('#btn-close-modal'),
  btnCancel: $('#btn-cancel'),
  bmTitle: $('#bm-title'),
  bmUrl: $('#bm-url'),
  bmCategory: $('#bm-category'),
  bmNotes: $('#bm-notes'),

  calcModal: $('#calc-modal'),
  btnCloseCalc: $('#btn-close-calc'),
  calcInput: $('#calc-input'),
  btnCalcEval: $('#btn-calc-eval'),
  btnCalcClear: $('#btn-calc-clear'),
  calcResultValue: $('#calc-result-value'),
  calcHistory: $('#calc-history'),

  settingsPanel: $('#settings-panel'),
  btnCloseSettings: $('#btn-close-settings'),
  themeSelect: $('#theme-select'),
  bgUrl: $('#bg-url'),
  btnApplyBg: $('#btn-apply-bg'),
  btnImportBg: $('#btn-import-bg'),
  bgPreview: $('#bg-preview'),
  bgSize: $('#bg-size'),
  bgAttachment: $('#bg-attachment'),
  btnRemoveBg: $('#btn-remove-bg'),
  bgType: $('#bg-type'),
  bgVideoUrlRow: $('#bg-video-url-row'),
  bgVideoImportRow: $('#bg-video-import-row'),
  bgVideoOptionsRow: $('#bg-video-options-row'),
  bgVideoUrl: $('#bg-video-url'),
  btnApplyVideo: $('#btn-apply-video'),
  btnImportVideo: $('#btn-import-video'),
  bgVideoPreview: $('#bg-video-preview'),
  bgVideoMuted: $('#bg-video-muted'),
  bgVideoLoop: $('#bg-video-loop'),
  bgImageFile: $('#bg-file-input'),
  bgVideoFile: $('#bg-video-file-input'),
  bgVideoEl: $('#bg-video'),

  helpModal: $('#help-modal'),
  helpBtn: $('#btn-help'),
  helpClose: $('#help-modal .help-close'),

  btnMusic: $('#btn-music'),
  musicPlayer: $('#music-player'),
  musicIframe: $('#music-iframe'),
  btnMusicClose: $('#btn-music-close'),
};

/* =========================
   Helpers généraux
========================= */
function escapeHTML(s = '') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Bangs de recherche
function urlFromBangQuery(q) {
  const s = q.trim();
  const m = /^!(\w+)\s*(.*)$/.exec(s);
  if (!m) return null;
  const bang = m[1].toLowerCase();
  const rest = m[2] || '';
  const enc = encodeURIComponent;
  const map = {
    yt:   (t) => `https://www.youtube.com/results?search_query=${enc(t)}`,
    ytb:  (t) => `https://www.youtube.com/results?search_query=${enc(t)}`,
    gh:   (t) => `https://github.com/search?q=${enc(t)}`,
    ddg:  (t) => `https://duckduckgo.com/?q=${enc(t)}`,
    mdn:  (t) => `https://developer.mozilla.org/search?q=${enc(t)}`,
    amz:  (t) => `https://www.amazon.fr/s?k=${enc(t)}`,
    gi:   (t) => `https://www.google.com/search?tbm=isch&q=${enc(t)}`
  };
  const fn = map[bang];
  if (!fn) return null;
  return fn(rest);
}

function getBookmarksInCurrentView() {
  let items = state.bookmarks.slice();
  if (state.currentCategoryId) {
    items = items.filter(b => b.categoryId === state.currentCategoryId);
    if (state.currentSubId) items = items.filter(b => b.subId === state.currentSubId);
  }
  return items;
}
function openAllInView() {
  const items = getBookmarksInCurrentView();
  if (items.length === 0) { alert('Aucun favori à ouvrir.'); return; }
  if (items.length > 8 && !confirm(`Ouvrir ${items.length} onglets ?`)) return;
  for (const b of items) {
    try { window.open(b.url, '_blank', 'noopener'); } catch {}
  }
}

function handleIncomingBookmarkFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('add') !== '1') return;
  const url = params.get('url');
  const title = params.get('title') || '';
  if (!url) return;
  openBookmarkModal('add');
  els.bmUrl.value = url;
  els.bmTitle.value = title || url;
  if (window.history && window.history.replaceState) {
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  }
}

/* =========================
   Thème
========================= */
applyThemeFromState();
if (els.themeSelect) els.themeSelect.value = state.theme;
function applyThemeFromState() {
  document.body.classList.toggle('theme-dark', state.theme === 'dark');
}

/* =========================
   Background (image/vidéo)
========================= */
applyBackgroundFromState();
refreshBackgroundControlsUI();

function applyBackgroundFromState() {
  const type = state.background?.type || 'image';
  document.body.style.backgroundImage = '';
  document.body.classList.remove('has-bg');

  if (els.bgVideoEl) {
    els.bgVideoEl.removeAttribute('src');
    els.bgVideoEl.pause?.();
    els.bgVideoEl.style.display = 'none';
    els.bgVideoEl.classList.remove('contain');
  }

  if (type === 'image') {
    const img = state.background.image || {};
    if (img.url) {
      document.body.style.backgroundImage = `url("${img.url}")`;
      document.body.classList.add('has-bg');
      if (els.bgPreview) { els.bgPreview.style.backgroundImage = `url("${img.url}")`; els.bgPreview.textContent = ''; }
    } else {
      if (els.bgPreview) { els.bgPreview.style.backgroundImage = ''; els.bgPreview.textContent = 'Aucune image'; }
    }
  } else if (type === 'video') {
    const vid = state.background.video || {};
    if (els.bgVideoEl && vid.url) {
      els.bgVideoEl.style.display = 'block';
      els.bgVideoEl.muted = !!vid.muted;
      els.bgVideoEl.loop = !!vid.loop;
      if (vid.size === 'contain') els.bgVideoEl.classList.add('contain');
      els.bgVideoEl.src = vid.url;
      setTimeout(() => { els.bgVideoEl.play?.().catch(()=>{}); }, 0);
      if (els.bgVideoPreview) els.bgVideoPreview.textContent = 'Vidéo sélectionnée';
    } else {
      if (els.bgVideoPreview) els.bgVideoPreview.textContent = 'Aucune vidéo';
    }
  }
}

function refreshBackgroundControlsUI() {
  const type = state.background?.type || 'image';
  if (els.bgType) els.bgType.value = type;

  const img = state.background.image || {};
  if (els.bgUrl) els.bgUrl.value = img.url || '';

  const showVideo = type === 'video';
  if (els.bgVideoUrlRow) els.bgVideoUrlRow.style.display = showVideo ? '' : 'none';
  if (els.bgVideoImportRow) els.bgVideoImportRow.style.display = showVideo ? '' : 'none';
  if (els.bgVideoOptionsRow) els.bgVideoOptionsRow.style.display = showVideo ? '' : 'none';

  if (els.bgSize) els.bgSize.value = (type === 'video' ? (state.background.video?.size || 'cover') : (img.size || 'cover'));
  if (els.bgAttachment) els.bgAttachment.value = img.attachment || 'fixed';
  if (els.bgVideoMuted) els.bgVideoMuted.checked = !!state.background.video?.muted;
  if (els.bgVideoLoop) els.bgVideoLoop.checked = !!state.background.video?.loop;
}

/* =========================
   Catégories & sous-rubriques
========================= */
function ensureCurrentSelection() {
  if (state.currentCategoryId && !state.categories.find(c=>c.id===state.currentCategoryId)) {
    state.currentCategoryId = null;
    state.currentSubId = null;
  }
  if (state.currentCategoryId && state.currentSubId) {
    const cat = state.categories.find(c=>c.id===state.currentCategoryId);
    if (!cat || !cat.subs.find(s=>s.id===state.currentSubId)) state.currentSubId = null;
  }
}
ensureCurrentSelection();

function computeCounts() {
  const catCount = new Map(), subCount = new Map();
  for (const b of state.bookmarks) {
    if (b.categoryId) {
      catCount.set(b.categoryId, (catCount.get(b.categoryId) || 0) + 1);
      if (b.subId) subCount.set(b.subId, (subCount.get(b.subId) || 0) + 1);
    }
  }
  return { catCount, subCount };
}

function renderCategories() {
  const ul = els.categories;
  if (!ul) return;
  ul.innerHTML = '';

  const { catCount, subCount } = computeCounts();

  const liAll = document.createElement('li');
  liAll.className = state.currentCategoryId ? '' : 'active';
  const spanAll = document.createElement('span');
  spanAll.className = 'cat-name';
  spanAll.textContent = 'Tous les favoris';
  spanAll.addEventListener('click', () => {
    state.currentCategoryId = null;
    state.currentSubId = null;
    save(); updateCurrentTitle(); renderCategories(); renderBookmarks();
    toggleSubCreator(false);
  });
  liAll.append(spanAll);
  ul.appendChild(liAll);

  for (const cat of state.categories) {
    if (cat.collapsed == null) cat.collapsed = false;

    const li = document.createElement('li');
    if (state.currentCategoryId === cat.id && !state.currentSubId) li.classList.add('active');

    const name = document.createElement('span');
    name.className = 'cat-name';
    name.textContent = cat.name;

    const count = document.createElement('span');
    count.className = 'cat-count';
    count.textContent = String(catCount.get(cat.id) || 0);

    const addSub = document.createElement('button');
    addSub.className = 'icon-ghost';
    addSub.title = 'Nouvelle sous-rubrique';
    addSub.textContent = '➕';
    addSub.addEventListener('click', (e) => {
      e.stopPropagation();
      const nv = prompt(`Nom de la sous-rubrique dans "${cat.name}" :`);
      if (!nv) return;
      cat.subs = cat.subs || [];
      cat.subs.push({ id: uid(), name: nv.trim() });
      save(); renderCategories(); updateCurrentTitle(); renderBookmarks();
    });

    const gear = document.createElement('button');
    gear.className = 'cat-gear icon-ghost';
    gear.title = 'Options';
    gear.type = 'button';
    gear.setAttribute('aria-haspopup', 'menu');
    gear.textContent = '⚙️';

    const menu = document.createElement('div');
    menu.className = 'cat-menu';
    menu.innerHTML = `
      <button data-action="rename">Renommer</button>
      <button data-action="delete">Supprimer</button>
    `;
    gear.addEventListener('click', (e) => {
      e.stopPropagation();
      $$('.cat-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
      menu.classList.toggle('open');
    });
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action === 'rename') {
        const nv = prompt('Nouveau nom de catégorie :', cat.name);
        if (nv == null) return;
        cat.name = nv.trim() || cat.name;
      }
      if (action === 'delete') {
        if (!confirm('Supprimer cette catégorie (et ses sous-rubriques) ?')) return;
        state.bookmarks = state.bookmarks.map(b => (b.categoryId === cat.id ? {...b, categoryId: null, subId: null} : b));
        state.categories = state.categories.filter(c => c.id !== cat.id);
        if (state.currentCategoryId === cat.id) { state.currentCategoryId = null; state.currentSubId = null; }
      }
      save(); renderCategories(); updateCurrentTitle(); renderBookmarks(); toggleSubCreator(!!state.currentCategoryId);
    });
    document.addEventListener('click', () => { menu.classList.remove('open'); }, { capture: true });

    name.addEventListener('click', () => {
      cat.collapsed = !cat.collapsed;
      state.currentCategoryId = cat.id;
      state.currentSubId = null;
      save();
      updateCurrentTitle();
      renderCategories();
      renderBookmarks();
      toggleSubCreator(true);
      setTimeout(() => els.newSubName?.focus(), 0);
    });

    li.addEventListener('dragover', (ev) => { ev.preventDefault(); li.classList.add('droptarget'); });
    li.addEventListener('dragleave', () => li.classList.remove('droptarget'));
    li.addEventListener('drop', (ev) => {
      ev.preventDefault();
      li.classList.remove('droptarget');
      const bid = ev.dataTransfer.getData('text/plain');
      const bm = state.bookmarks.find(x => x.id === bid);
      if (!bm) return;
      bm.categoryId = cat.id;
      bm.subId = null;
      save(); renderBookmarks(); renderCategories(); updateCurrentTitle();
    });

    const rightWrap = document.createElement('div');
    rightWrap.style.display = 'inline-flex';
    rightWrap.style.alignItems = 'center';
    rightWrap.style.gap = '6px';
    rightWrap.append(addSub, gear, menu);

    li.append(name, count, rightWrap);
    ul.appendChild(li);

    const subUl = document.createElement('ul');
    subUl.className = 'sub-list';
    if (cat.collapsed) subUl.classList.add('collapsed');

    for (const sub of (cat.subs || [])) {
      const sli = document.createElement('li');
      if (state.currentCategoryId === cat.id && state.currentSubId === sub.id) sli.classList.add('active');

      const sname = document.createElement('span');
      sname.className = 'sub-name';
      sname.textContent = '↳ ' + sub.name;
      sname.addEventListener('click', (e) => {
        e.stopPropagation();
        state.currentCategoryId = cat.id;
        state.currentSubId = sub.id;
        save(); updateCurrentTitle(); renderCategories(); renderBookmarks();
        toggleSubCreator(true);
      });

      const scount = document.createElement('span');
      scount.className = 'sub-count';
      scount.textContent = String(subCount.get(sub.id) || 0);

      const scontrols = document.createElement('div');
      scontrols.className = 'sub-controls';
      const se = document.createElement('button'); se.className = 'icon-ghost'; se.textContent = '✏️';
      const sd = document.createElement('button'); sd.className = 'icon-ghost'; sd.textContent = '🗑️';

      se.addEventListener('click', (e) => {
        e.stopPropagation();
        const nv = prompt('Nouveau nom de sous-rubrique :', sub.name);
        if (nv == null) return;
        sub.name = nv.trim() || sub.name;
        save(); renderCategories(); updateCurrentTitle(); renderBookmarks();
      });
      sd.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Supprimer cette sous-rubrique ?')) return;
        state.bookmarks = state.bookmarks.map(b => (b.subId === sub.id ? {...b, subId: null} : b));
        cat.subs = cat.subs.filter(s => s.id !== sub.id);
        if (state.currentSubId === sub.id) state.currentSubId = null;
        save(); renderCategories(); updateCurrentTitle(); renderBookmarks();
      });

      sli.addEventListener('dragover', (ev) => { ev.preventDefault(); sli.classList.add('droptarget'); });
      sli.addEventListener('dragleave', () => sli.classList.remove('droptarget'));
      sli.addEventListener('drop', (ev) => {
        ev.preventDefault();
        sli.classList.remove('droptarget');
        const bid = ev.dataTransfer.getData('text/plain');
        const bm = state.bookmarks.find(x => x.id === bid);
        if (!bm) return;
        bm.categoryId = cat.id;
        bm.subId = sub.id;
        save(); renderBookmarks(); renderCategories(); updateCurrentTitle();
      });

      scontrols.append(se, sd);
      sli.append(sname, scount, scontrols);
      subUl.appendChild(sli);
    }
    ul.appendChild(subUl);
  }
}

function updateCurrentTitle() {
  const h = els.currentCatTitle;
  if (!h) return;
  if (!state.currentCategoryId) { h.textContent = 'Tous les favoris'; return; }
  const cat = state.categories.find(c=>c.id===state.currentCategoryId);
  if (!cat) { h.textContent = 'Tous les favoris'; return; }
  if (!state.currentSubId) { h.textContent = cat.name; return; }
  const sub = cat.subs.find(s=>s.id===state.currentSubId);
  h.textContent = sub ? `${cat.name} / ${sub.name}` : cat.name;
}
function toggleSubCreator(show) {
  els.newSubName && (els.newSubName.style.display = show ? '' : 'none');
  els.btnCreateSub && (els.btnCreateSub.style.display = show ? '' : 'none');
}

/* =========================
   Favicons
========================= */
function getFaviconUrl(url) {
  try {
    const u = new URL(url);
    const origin = u.origin;
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return fallbackFavicon();
  }
}
function fallbackFavicon() {
  return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666%22 viewBox=%220 0 16 16%22%3E%3Ccircle cx=%228%22 cy=%228%22 r=%226%22/%3E%3C/svg%3E';
}

/* =========================
   Menu "Déplacer vers..." (global)
========================= */
let moveMenuEl = null;
function ensureMoveMenu() {
  if (moveMenuEl) return moveMenuEl;
  moveMenuEl = document.createElement('div');
  moveMenuEl.className = 'ctx-menu';
  document.body.appendChild(moveMenuEl);
  document.addEventListener('click', () => closeMoveMenu(), { capture: true });
  window.addEventListener('resize', () => closeMoveMenu());
  return moveMenuEl;
}
function openMoveMenu(bookmark, x, y) {
  const el = ensureMoveMenu();
  let html = '';
  html += `<div class="ctx-sec-title">Déplacer vers…</div>`;
  html += `<button class="ctx-btn" data-cat="" data-sub="">(Tous / sans catégorie)</button>`;
  for (const c of state.categories) {
    html += `<div class="ctx-sec-title">${escapeHTML(c.name)}</div>`;
    html += `<button class="ctx-btn" data-cat="${c.id}" data-sub="">(Pas de sous-rubrique)</button>`;
    for (const s of (c.subs || [])) {
      html += `<button class="ctx-btn" data-cat="${c.id}" data-sub="${s.id}">↳ ${escapeHTML(s.name)}</button>`;
    }
  }
  el.innerHTML = html;
  el.style.left = Math.min(x, window.innerWidth - 260) + 'px';
  el.style.top  = Math.min(y, window.innerHeight - 200) + 'px';
  el.classList.add('open');
  el.querySelectorAll('.ctx-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat') || null;
      const sub = btn.getAttribute('data-sub') || null;
      bookmark.categoryId = cat;
      bookmark.subId = sub;
      save();
      closeMoveMenu();
      renderBookmarks();
      renderCategories();
      updateCurrentTitle();
    });
  });
}
function closeMoveMenu() { if (moveMenuEl) moveMenuEl.classList.remove('open'); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMoveMenu(); });

/* =========================
   Rendu des favoris
========================= */
function renderBookmarks() {
  const q = (els.search?.value || '').trim().toLowerCase();
  const list = els.bookmarks;
  if (!list) return;
  list.innerHTML = '';

  let items = state.bookmarks.slice();
  if (state.currentCategoryId) {
    items = items.filter(b => b.categoryId === state.currentCategoryId);
    if (state.currentSubId) items = items.filter(b => b.subId === state.currentSubId);
  }
  if (q) {
    items = items.filter(b =>
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.url && b.url.toLowerCase().includes(q)) ||
      (b.notes && b.notes.toLowerCase().includes(q))
    );
  }
  if (state.sortMode === 'alpha') {
    items.sort((a,b) => (a.title||'').localeCompare(b.title||''));
  } else {
    items.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  }

  for (const b of items) {
    const li = document.createElement('li');
    li.className = 'bookmark';
    li.draggable = true;
    li.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', b.id);
      ev.dataTransfer.effectAllowed = 'move';
    });

    const a = document.createElement('a');
    a.href = b.url; a.target = '_blank'; a.rel = 'noopener';

    const favicon = getFaviconUrl(b.url);
    const img = document.createElement('img');
    img.className = 'bm-icon';
    img.src = favicon;
    img.alt = '';
    img.onerror = () => { img.onerror = null; img.src = fallbackFavicon(); };

    const title = document.createElement('span');
    title.textContent = b.title || b.url;

    a.append(img, title);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = b.url;

    const actions = document.createElement('div');
    actions.className = 'actions';
    const bmove = document.createElement('button');
    bmove.className = 'icon-ghost';
    bmove.textContent = '📂';
    bmove.title = 'Déplacer vers…';
    bmove.addEventListener('click', (ev) => {
      const rect = ev.currentTarget.getBoundingClientRect();
      openMoveMenu(b, rect.left, rect.bottom + 6);
    });

    const be = document.createElement('button'); be.className = 'icon-ghost'; be.textContent = '✏️';
    const bd = document.createElement('button'); bd.className = 'icon-ghost'; bd.textContent = '🗑️';

    be.addEventListener('click', () => openBookmarkModal('edit', b.id));
    bd.addEventListener('click', () => {
      if (!confirm('Supprimer ce favori ?')) return;
      state.bookmarks = state.bookmarks.filter(x=>x.id!==b.id);
      save(); renderBookmarks(); renderCategories();
    });

    actions.append(bmove, be, bd);
    li.append(a, meta, actions);

    li.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      openMoveMenu(b, ev.clientX, ev.clientY);
    });

    list.appendChild(li);
  }
}

/* =========================
   Modale Favori (add/edit)
========================= */
let editingId = null;
let bmSubSelect = null;

function openBookmarkModal(mode='add', id=null) {
  editingId = (mode === 'edit') ? id : null;
  els.modalTitle.textContent = (mode === 'edit') ? 'Modifier' : 'Ajouter';
  fillCategorySelect();

  if (!bmSubSelect) {
    bmSubSelect = document.createElement('select');
    bmSubSelect.id = 'bm-sub';
    els.bmCategory.insertAdjacentElement('afterend', bmSubSelect);
  }
  fillSubSelect(els.bmCategory.value);

  if (mode === 'edit') {
    const b = state.bookmarks.find(x=>x.id===id);
    if (!b) return;
    els.bmTitle.value = b.title || '';
    els.bmUrl.value = b.url || '';
    els.bmCategory.value = b.categoryId || '';
    fillSubSelect(els.bmCategory.value);
    bmSubSelect.value = b.subId || '';
    els.bmNotes.value = b.notes || '';
  } else {
    els.bmTitle.value = '';
    els.bmUrl.value = 'https://';
    els.bmCategory.value = state.currentCategoryId || '';
    fillSubSelect(els.bmCategory.value);
    bmSubSelect.value = state.currentSubId || '';
    els.bmNotes.value = '';
  }

  els.modal.classList.remove('hidden');
}
function closeBookmarkModal(){ els.modal.classList.add('hidden'); }

function fillCategorySelect() {
  els.bmCategory.innerHTML = '';
  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = '(Aucune catégorie)';
  els.bmCategory.appendChild(optAll);
  for (const c of state.categories) {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.name;
    els.bmCategory.appendChild(o);
  }
}
function fillSubSelect(categoryId) {
  if (!bmSubSelect) return;
  bmSubSelect.innerHTML = '';
  const o0 = document.createElement('option');
  o0.value = '';
  o0.textContent = '(Aucune sous-rubrique)';
  bmSubSelect.appendChild(o0);
  const cat = state.categories.find(c=>c.id===categoryId);
  if (!cat) return;
  for (const s of (cat.subs || [])) {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.name;
    bmSubSelect.appendChild(o);
  }
}

/* =========================
   Écouteurs UI
========================= */
(function injectSortSelect(){
  const h2 = document.getElementById('current-category-title');
  if (!h2) return;
  const wrap = document.createElement('div');
  wrap.style.display = 'inline-flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '8px';

  const sel = document.createElement('select');
  sel.id = 'sort-select';
  sel.innerHTML = `
    <option value="dateDesc">Plus récents</option>
    <option value="alpha">Alphabétique</option>
  `;
  sel.value = state.sortMode || 'dateDesc';
  sel.addEventListener('change', () => {
    state.sortMode = sel.value; save(); renderBookmarks();
  });

  h2.after(wrap);
  wrap.appendChild(sel);
})();

(function injectOpenAllBtn(){
  const addBtn = document.getElementById('btn-add-bookmark');
  if (!addBtn) return;
  const btn = document.createElement('button');
  btn.id = 'btn-open-all';
  btn.title = 'Ouvrir tous les favoris de cette vue';
  btn.textContent = 'Ouvrir tout';
  btn.addEventListener('click', openAllInView);
  addBtn.after(btn);
})();

els.search?.addEventListener('input', () => renderBookmarks());

els.googleForm?.addEventListener('submit', () => {
  const q = (els.googleInput.value || '').trim();
  if (!q) return;
  const special = urlFromBangQuery(q);
  const url = special || `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  window.open(url, '_blank', 'noopener');
});

els.btnAddCategory?.addEventListener('click', () => {
  const name = (els.newCategoryName.value || '').trim();
  if (!name) return;
  state.categories.push({ id: uid(), name, subs: [], collapsed: false });
  els.newCategoryName.value = '';
  save(); renderCategories();
});

els.btnCreateSub?.addEventListener('click', () => {
  const catId = state.currentCategoryId;
  if (!catId) { alert('Sélectionne d’abord une catégorie à gauche.'); return; }
  const name = (els.newSubName.value || '').trim();
  if (!name) { els.newSubName.focus(); return; }
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) { alert('Catégorie introuvable.'); return; }
  cat.subs = cat.subs || [];
  cat.subs.push({ id: uid(), name });
  els.newSubName.value = '';
  save();
  renderCategories();
  updateCurrentTitle();
});

els.btnAddBookmark?.addEventListener('click', () => openBookmarkModal('add'));

els.btnCloseModal?.addEventListener('click', closeBookmarkModal);
els.btnCancel?.addEventListener('click', closeBookmarkModal);
els.modalForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = els.bmTitle.value.trim();
  const url = els.bmUrl.value.trim();
  const notes = els.bmNotes.value.trim();
  const categoryId = els.bmCategory.value || null;
  const subId = (bmSubSelect?.value || '') || null;
  if (!url || !/^https?:\/\//i.test(url)) { alert('URL invalide.'); return; }
  if (editingId) {
    const b = state.bookmarks.find(x=>x.id===editingId);
    if (!b) return;
    b.title = title || url;
    b.url = url;
    b.notes = notes;
    b.categoryId = categoryId;
    b.subId = subId;
  } else {
    state.bookmarks.unshift({ id: uid(), title: title || url, url, notes, categoryId, subId, createdAt: Date.now() });
  }
  save(); renderBookmarks(); closeBookmarkModal();
});

els.btnExport?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'portal-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
els.btnImport?.addEventListener('click', () => els.fileInput.click());
els.fileInput?.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const obj = JSON.parse(r.result);
      state = Object.assign(structuredClone(defaultState), obj);
      if (!state.sortMode) state.sortMode = 'dateDesc';
      for (const c of state.categories) if (c.collapsed == null) c.collapsed = false;
      if (!state.music) state.music = structuredClone(defaultState.music);
      save();
      applyThemeFromState();
      applyBackgroundFromState();
      refreshBackgroundControlsUI();
      renderCategories();
      updateCurrentTitle();
      renderBookmarks();
      updateMusicUI();
      alert('Import réussi.');
    } catch {
      alert('Import invalide.');
    }
  };
  r.readAsText(file);
});
els.btnSample?.addEventListener('click', () => {
  if (!confirm('Charger un échantillon ? (remplacera vos favoris actuels)')) return;
  state.bookmarks = [
    { id: uid(), title: 'OpenAI', url: 'https://openai.com', createdAt: Date.now() },
    { id: uid(), title: 'MDN', url: 'https://developer.mozilla.org', createdAt: Date.now() },
    { id: uid(), title: 'KiCad', url: 'https://www.kicad.org', createdAt: Date.now() },
    { id: uid(), title: 'Digi-Key', url: 'https://www.digikey.fr', createdAt: Date.now() }
  ];
  save(); renderBookmarks();
});

/* Paramètres */
els.btnSettings?.addEventListener('click', () => els.settingsPanel?.classList.toggle('hidden'));
els.btnCloseSettings?.addEventListener('click', () => els.settingsPanel?.classList.add('hidden'));
els.themeSelect?.addEventListener('change', () => {
  state.theme = els.themeSelect.value;
  save(); applyThemeFromState();
});
els.btnApplyBg?.addEventListener('click', () => {
  const url = (els.bgUrl.value || '').trim();
  state.background.type = 'image';
  state.background.image.url = url || null;
  save(); applyBackgroundFromState(); refreshBackgroundControlsUI();
});
els.btnImportBg?.addEventListener('click', () => els.bgImageFile?.click());
els.bgImageFile?.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.background.type = 'image';
    state.background.image.url = reader.result;
    save(); applyBackgroundFromState(); refreshBackgroundControlsUI();
  };
  reader.readAsDataURL(file);
});
els.bgSize?.addEventListener('change', () => {
  if (state.background.type === 'video') {
    state.background.video.size = els.bgSize.value;
  } else {
    state.background.image.size = els.bgSize.value;
  }
  save(); applyBackgroundFromState();
});
els.bgAttachment?.addEventListener('change', () => {
  state.background.image.attachment = els.bgAttachment.value;
  save(); applyBackgroundFromState();
});
els.btnRemoveBg?.addEventListener('click', () => {
  state.background = structuredClone(defaultState.background);
  save(); applyBackgroundFromState(); refreshBackgroundControlsUI();
});
els.bgType?.addEventListener('change', () => {
  state.background.type = els.bgType.value;
  save(); refreshBackgroundControlsUI(); applyBackgroundFromState();
});
els.btnApplyVideo?.addEventListener('click', () => {
  const url = (els.bgVideoUrl.value || '').trim();
  state.background.type = 'video';
  state.background.video.url = url || null;
  save(); applyBackgroundFromState(); refreshBackgroundControlsUI();
});
els.btnImportVideo?.addEventListener('click', () => els.bgVideoFile?.click());
els.bgVideoFile?.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const objectUrl = URL.createObjectURL(file);
  state.background.type = 'video';
  state.background.video.url = objectUrl;
  save(); applyBackgroundFromState(); refreshBackgroundControlsUI();
});
els.bgVideoMuted?.addEventListener('change', () => {
  state.background.video.muted = !!els.bgVideoMuted.checked;
  save(); applyBackgroundFromState();
});
els.bgVideoLoop?.addEventListener('change', () => {
  state.background.video.loop = !!els.bgVideoLoop.checked;
  save(); applyBackgroundFromState();
});

/* =========================
   Aide
========================= */
function openHelp() {
  els.helpModal?.classList.add('is-open');
  els.helpModal?.setAttribute('aria-hidden', 'false');
}
function closeHelp() {
  els.helpModal?.classList.remove('is-open');
  els.helpModal?.setAttribute('aria-hidden', 'true');
}
els.helpBtn?.addEventListener('click', openHelp);
els.helpClose?.addEventListener('click', closeHelp);
els.helpModal?.addEventListener('click', (e) => { if (e.target === els.helpModal) closeHelp(); });

/* =========================
   Calculatrice
========================= */
els.btnCalc?.addEventListener('click', () => els.calcModal?.classList.remove('hidden'));
els.btnCloseCalc?.addEventListener('click', () => els.calcModal?.classList.add('hidden'));
els.btnCalcClear?.addEventListener('click', () => { if(!els.calcInput||!els.calcResultValue) return; els.calcInput.value=''; els.calcResultValue.textContent='-'; });
$$('#calc-modal [data-insert]').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    if(!els.calcInput) return;
    els.calcInput.value += btn.getAttribute('data-insert');
    els.calcInput.focus();
  });
});
els.btnCalcEval?.addEventListener('click', ()=> {
  if(!els.calcInput||!els.calcResultValue) return;
  const expr = (els.calcInput.value || '').trim();
  if (!expr) return;
  try {
    const val = evaluateExpression(expr);
    els.calcResultValue.textContent = String(val);
    state.calcHistory.unshift({ t: Date.now(), expr, result: val });
    state.calcHistory = state.calcHistory.slice(0,50);
    save(); renderCalcHistory();
  } catch (e) {
    els.calcResultValue.textContent = 'Erreur';
  }
});
function renderCalcHistory() {
  if(!els.calcHistory) return;
  els.calcHistory.innerHTML = '';
  for (const h of state.calcHistory) {
    const li = document.createElement('li');
    li.textContent = `${h.expr} = ${h.result}`;
    els.calcHistory.appendChild(li);
  }
}
renderCalcHistory();

function evaluateExpression(input) {
  let s = input;
  s = s.replace(/\^/g, '**');
  s = s.replace(/\bln\(/g, 'Math.log(');
  s = s.replace(/\blog10\(/g, 'Math.log10(');
  s = s.replace(/\bsin\(/g, 'Math.sin(');
  s = s.replace(/\bcos\(/g, 'Math.cos(');
  s = s.replace(/\btan\(/g, 'Math.tan(');
  s = s.replace(/\bsqrt\(/g, 'Math.sqrt(');
  if (!/^[0-9+\-*/().,^ \tA-Za-z_]*$/.test(input)) throw new Error('Invalid');
  const f = new Function('Math', `return (${s})`);
  const result = f(Math);
  if (!isFinite(result)) throw new Error('Invalid');
  return result;
}

/* =========================
   🎵 Mini-lecteur — injection auto
========================= */
/* ====== 🎵 Mini-lecteur YouTube — version stable ====== */
// État par défaut si absent
if (!state.music) {
  state.music = { visible: false, url: 'https://www.youtube.com/embed/jfKfPfyJRdk' };
  save();
}

// Pointeurs (déjà définis plus haut normalement)
els.btnMusic      = document.getElementById('btn-music');
els.musicPlayer   = document.getElementById('music-player');
els.musicIframe   = document.getElementById('music-iframe');
els.btnMusicClose = document.getElementById('btn-music-close');

// Normalise une URL YouTube (watch/shorts/youtu.be) -> /embed/ID + params safe
// Retourne une liste ORDONNÉE de sources à essayer (YouTube -> nocookie -> yewtu.be)
function buildEmbedCandidates(raw) {
  const ids = extractYouTubeId(raw);
  // Si ce n'est pas une URL YouTube, on retourne la source brute
  if (!ids) return [raw];

  const id = ids;
  // Pas d'autoplay forcé pour éviter les blocages
  const yt      = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
  const ytNC    = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
  const invid   = `https://yewtu.be/embed/${id}?autoplay=0`;

  // Ordre d'essai : YouTube normal → nocookie → yewtu.be (Invidious)
  return [yt, ytNC, invid];
}

// Extrait un ID YouTube depuis watch/shorts/youtu.be/embed
function extractYouTubeId(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./,'');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v') || null;
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
      if (u.pathname.startsWith('/live/'))   return u.pathname.split('/')[2] || null;
      if (u.pathname.startsWith('/embed/'))  return u.pathname.split('/')[2] || null;
      return null;
    }
    if (host === 'youtu.be') {
      return u.pathname.slice(1) || null;
    }
    if (host === 'youtube-nocookie.com' && u.pathname.startsWith('/embed/')) {
      return u.pathname.split('/')[2] || null;
    }
  } catch {}
  return null;
}

// Essaie les URLs l'une après l'autre avec un léger timeout de garde.
// Si la lecture échoue (Erreur 153 / réseau / blocage), on bascule automatiquement.
function setMusicSrcWithFallback(urlOrVideoUrl) {
  if (!els.musicIframe) return;

  const candidates = buildEmbedCandidates(urlOrVideoUrl);
  let i = 0;

  const tryNext = () => {
    if (i >= candidates.length) {
      // Échec complet -> on propose un lien d'ouverture externe
      // (facultatif : on pourrait afficher un petit message dans la barre du player)
      return;
    }
    const url = candidates[i++];
    // Ne pas recharger si déjà cette source
    if (els.musicIframe.src !== url) els.musicIframe.src = url;

    // Gardien: si au bout de 3s, rien ne s'est stabilisé, on tente la suivante
    clearTimeout(els.musicIframe._failTimer);
    els.musicIframe._failTimer = setTimeout(() => {
      // Heuristique : si l'utilisateur n'a pas cliqué, YouTube peut rester bloqué, on tente fallback
      tryNext();
    }, 3000);
  };

  // On tente la première
  tryNext();

  // Si l'utilisateur clique Play et que ça marche, on annule le fallback
  // (on ne peut pas écouter l'état interne, on annule lorsqu'on voit l'iframe se "naviguer")
  els.musicIframe.addEventListener('load', () => {
    clearTimeout(els.musicIframe._failTimer);
  }, { once: true });
}


function updateMusicUI() {
  if (!els.musicPlayer || !els.musicIframe) return;

  if (state.music.visible) {
    els.musicPlayer.classList.remove('hidden');
    els.musicPlayer.setAttribute('aria-hidden', 'false');

    // Essais avec fallback (YT -> nocookie -> yewtu.be)
    const target = state.music.url || '';
    setMusicSrcWithFallback(target);

  } else {
    els.musicPlayer.classList.add('hidden');
    els.musicPlayer.setAttribute('aria-hidden', 'true');
    // On évite de vider le src (évite NS_BINDING_ABORTED) — si tu veux stopper net :
    // els.musicIframe.src = 'about:blank';
  }
}


// Demande d’URL (avec normalisation)
function promptMusicUrl() {
  const cur = state.music.url || '';
  const next = prompt('Colle une URL YouTube (watch/shorts/youtu.be) ou un lien direct compatible embed :', cur);
  if (!next) return;
  state.music.url = next.trim();
  save();
  updateMusicUI();
}

// Écouteurs — bindés UNE SEULE FOIS (évite la répétition)
if (els.btnMusic && !els.btnMusic.dataset.bound) {
  els.btnMusic.dataset.bound = '1';
  els.btnMusic.addEventListener('click', () => {
    state.music.visible = !state.music.visible;
    save();
    updateMusicUI();
  });
  // Alt-clic / clic-droit / molette -> modifier l’URL
  els.btnMusic.addEventListener('contextmenu', (e) => { e.preventDefault(); promptMusicUrl(); });
  els.btnMusic.addEventListener('auxclick', (e) => { if (e.button === 1) promptMusicUrl(); });
  els.btnMusic.addEventListener('mousedown', (e) => { if (e.altKey) { e.preventDefault(); promptMusicUrl(); } });
}

if (els.btnMusicClose && !els.btnMusicClose.dataset.bound) {
  els.btnMusicClose.dataset.bound = '1';
  els.btnMusicClose.addEventListener('click', () => {
    state.music.visible = false;
    save();
    updateMusicUI();
  });
}

// Init du lecteur (montre/masque + set src si visible)
updateMusicUI();

/* =========================
   Raccourcis clavier
========================= */
function isTypingInInput() {
  const a = document.activeElement;
  if (!a) return false;
  const tag = a.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || a.isContentEditable;
}
document.addEventListener('keydown', (e) => {
  if (!e.ctrlKey && !e.metaKey && e.key === '?') { e.preventDefault(); openHelp(); return; }
  if (e.key === 'Escape') { closeHelp(); els.modal?.classList.add('hidden'); els.calcModal?.classList.add('hidden'); return; }
  if (isTypingInInput() && !e.ctrlKey && !e.metaKey) return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault(); els.search?.focus(); els.search?.select(); return;
  }
  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'g') {
    els.googleInput?.focus(); els.googleInput?.select(); return;
  }
  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 't') {
    state.theme = (state.theme === 'dark') ? 'light' : 'dark';
    save(); applyThemeFromState(); if (els.themeSelect) els.themeSelect.value = state.theme;
    return;
  }
  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'n') {
    openBookmarkModal('add'); return;
  }
});

/* =========================
   Init
========================= */
renderCategories();
updateCurrentTitle();
renderBookmarks();
toggleSubCreator(!!state.currentCategoryId);
handleIncomingBookmarkFromQuery();
updateMusicUI();

