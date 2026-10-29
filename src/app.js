'use strict';
const $ = (s) => document.querySelector(s);

function card(item) {
  const b = document.createElement('button');
  b.className = 'vcard';
  const th = document.createElement('div'); th.className = 'th';
  const img = document.createElement('img'); img.src = item.thumb; img.loading = 'lazy'; img.alt = '';
  th.appendChild(img);
  if (item.duration) { const d = document.createElement('span'); d.className = 'dur'; d.textContent = item.duration; th.appendChild(d); }
  const meta = document.createElement('div'); meta.className = 'meta';
  const t = document.createElement('div'); t.className = 't'; t.textContent = item.title;
  const a = document.createElement('div'); a.className = 'a';
  a.textContent = [item.author, item.views].filter(Boolean).join(' · ');
  meta.append(t, a);
  b.append(th, meta);
  b.addEventListener('click', () => play(item));
  return b;
}

// ---------- navigation ----------
function show(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'v-' + name));
  document.querySelectorAll('.nav').forEach((n) => n.classList.toggle('active', n.dataset.view === name));
  if (name === 'search') $('#q').focus();
}
document.querySelectorAll('.nav').forEach((n) => n.addEventListener('click', () => show(n.dataset.view)));

// ---------- settings / theme ----------
let S = {};
function applySettings(s) {
  S = s;
  $('#meName').textContent = s.username;
  $('#meDp').src = s.dpUrl;
  $('#setDp').src = s.dpUrl;
  if (document.activeElement !== $('#setName')) $('#setName').value = s.username;
  const wp = s.wallpaperUrl ? `url("${s.wallpaperUrl}")` : '';
  $('#bg').style.backgroundImage = wp || '';
  $('#wpPreview').style.backgroundImage = wp || '';
  $('#dim').style.opacity = s.wallpaperUrl ? s.dim : 0;
  $('#dimRange').value = Math.round(s.dim * 100);
  $('#dimVal').textContent = Math.round(s.dim * 100) + '%';
  $('#audioOnly').checked = !!s.audioOnly;
}

$('#setName').addEventListener('input', async (e) => {
  const v = e.target.value.trim() || 'User';
  applySettings(await window.ashu.setSettings({ username: v }));
});
$('#dpPick').addEventListener('click', async () => applySettings(await window.ashu.pickImage('dp')));
$('#dpReset').addEventListener('click', async () => applySettings(await window.ashu.resetImage('dp')));
$('#wpPick').addEventListener('click', async () => applySettings(await window.ashu.pickImage('wallpaper')));
$('#wpReset').addEventListener('click', async () => applySettings(await window.ashu.resetImage('wallpaper')));
$('#dimRange').addEventListener('input', async (e) =>
  applySettings(await window.ashu.setSettings({ dim: Number(e.target.value) / 100 })));
$('#audioOnly').addEventListener('change', async (e) =>
  applySettings(await window.ashu.setSettings({ audioOnly: e.target.checked })));
$('#igBtn').addEventListener('click', () => window.ashu.openExternal('https://instagram.com/17__ashu_'));

// ---------- search ----------
async function runSearch(q, grid, status) {
  status.className = 'status';
  status.textContent = 'Dhundh raha hu...';
  grid.replaceChildren();
  const r = await window.ashu.search(q);
  if (!r.ok) {
    status.className = 'status err';
    status.textContent = 'Search fail: ' + r.error + ' (internet check karo aur dobara try karo)';
    return;
  }
  status.textContent = r.items.length ? '' : 'Kuch nahi mila.';
  r.items.forEach((it) => grid.appendChild(card(it)));
}
$('#searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#q').value.trim();
  if (q) runSearch(q, $('#searchGrid'), $('#searchStatus'));
});

// ---------- player ----------
const media = $('#media');
async function play(item) {
  const p = $('#player');
  p.classList.remove('hidden');
  $('#pTitle').textContent = item.title;
  $('#pAuthor').textContent = item.author || '';
  const st = $('#pStatus');
  st.className = 'status'; st.textContent = 'Load ho raha hai...';
  media.classList.toggle('audio', !!S.audioOnly);
  media.pause();
  const r = await window.ashu.stream(item.id, !!S.audioOnly);
  if (!r.ok) {
    st.className = 'status err';
    st.textContent = 'Play nahi ho paya: ' + r.error;
    return;
  }
  st.textContent = '';
  media.src = r.url;
  media.play().catch(() => {});
}
media.addEventListener('error', () => {
  const st = $('#pStatus');
  st.className = 'status err';
  st.textContent = 'Stream chalane me error aaya. Dusra gaana try karo.';
});
$('#pClose').addEventListener('click', () => { media.pause(); media.removeAttribute('src'); media.load(); $('#player').classList.add('hidden'); });
$('#pSize').addEventListener('click', () => {
  const p = $('#player');
  p.classList.toggle('mini'); p.classList.toggle('big');
});

// ---------- start ----------
(async () => {
  applySettings(await window.ashu.getSettings());
  runSearch('latest hindi songs', $('#homeGrid'), $('#homeStatus'));
})();
