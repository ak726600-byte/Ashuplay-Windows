const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const DEFAULTS = {
  username: 'Ashutosh',
  dp: '',            // empty = bundled default
  wallpaper: '',     // empty = default dark red background
  dim: 0.55,
  audioOnly: false,
};

let win;
let yt = null;

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveSettings(s) {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2));
  } catch (e) {
    console.error('save settings failed', e);
  }
}

function view(s) {
  // Convert stored file paths into URLs the renderer can show.
  const bundledDp = pathToFileURL(path.join(__dirname, 'assets', 'dp.jpg')).href;
  const toUrl = (p) => (p && fs.existsSync(p) ? pathToFileURL(p).href + '?t=' + fs.statSync(p).mtimeMs : '');
  return { ...s, dpUrl: toUrl(s.dp) || bundledDp, wallpaperUrl: toUrl(s.wallpaper) };
}

async function getYT() {
  if (!yt) {
    const { Innertube } = await import('youtubei.js');
    yt = await Innertube.create({ lang: 'en', location: 'IN' });
  }
  return yt;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    title: 'Ashu Play',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#14090c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // googlevideo streams reject some browser-style headers; send a neutral UA.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.googlevideo.com/*'] },
    (details, cb) => {
      const h = details.requestHeaders;
      h['User-Agent'] =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
      delete h['Origin'];
      delete h['Referer'];
      cb({ requestHeaders: h });
    }
  );
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

// ---------- settings ----------
ipcMain.handle('settings:get', () => view(loadSettings()));

ipcMain.handle('settings:set', (_e, patch) => {
  const allowed = ['username', 'dim', 'audioOnly'];
  const s = loadSettings();
  for (const k of allowed) if (k in patch) s[k] = patch[k];
  saveSettings(s);
  return view(s);
});

ipcMain.handle('settings:pickImage', async (_e, kind) => {
  if (kind !== 'dp' && kind !== 'wallpaper') return view(loadSettings());
  const r = await dialog.showOpenDialog(win, {
    title: kind === 'dp' ? 'Profile photo chuno' : 'Wallpaper chuno',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }],
  });
  const s = loadSettings();
  if (!r.canceled && r.filePaths[0]) {
    const ext = path.extname(r.filePaths[0]).toLowerCase() || '.jpg';
    const dest = path.join(app.getPath('userData'), kind + ext);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(r.filePaths[0], dest);
    s[kind] = dest;
    saveSettings(s);
  }
  return view(s);
});

ipcMain.handle('settings:resetImage', (_e, kind) => {
  if (kind !== 'dp' && kind !== 'wallpaper') return view(loadSettings());
  const s = loadSettings();
  s[kind] = '';
  saveSettings(s);
  return view(s);
});

ipcMain.handle('open-external', (_e, url) => {
  if (typeof url === 'string' && /^https:\/\//.test(url)) shell.openExternal(url);
});

// ---------- YouTube ----------
ipcMain.handle('yt:search', async (_e, query) => {
  try {
    const y = await getYT();
    const res = await y.search(query, { type: 'video' });
    const items = (res.results || [])
      .filter((n) => n && (n.type === 'Video' || n.video_id || n.id))
      .map((n) => ({
        id: n.video_id || n.id,
        title: n.title?.text || n.title?.toString?.() || 'Untitled',
        author: n.author?.name || '',
        duration: n.duration?.text || '',
        views: n.short_view_count?.text || n.view_count?.text || '',
        thumb: n.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${n.video_id || n.id}/hqdefault.jpg`,
      }))
      .filter((n) => n.id);
    return { ok: true, items };
  } catch (e) {
    yt = null;
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle('yt:stream', async (_e, { id, audioOnly }) => {
  const errors = [];
  for (const client of ['IOS', 'ANDROID', 'TV', 'WEB']) {
    try {
      const y = await getYT();
      const info = await y.getBasicInfo(id, client);
      const format = info.chooseFormat(
        audioOnly ? { type: 'audio', quality: 'best' } : { type: 'video+audio', quality: 'best' }
      );
      let url = format.url;
      if (!url && format.decipher) url = format.decipher(y.session.player);
      if (url) {
        return {
          ok: true,
          url,
          client,
          title: info.basic_info?.title || '',
          author: info.basic_info?.author || '',
        };
      }
      errors.push(`${client}: no url`);
    } catch (e) {
      errors.push(`${client}: ${e?.message || e}`);
    }
  }
  yt = null; // force a fresh session next time
  return { ok: false, error: errors.join(' | ') };
});
