const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const { exec } = require('child_process')

let mainWindow;
let wallpaperWindow;

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings));
}

function loadSettings() {
  if (fs.existsSync(SETTINGS_PATH)) {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH));
  }
  return {};
}

function createWindow () {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.maximize()
  mainWindow.loadFile('index.html')
}

function createWallpaperWindow(videoPath) {
  if (wallpaperWindow) {
    wallpaperWindow.webContents.send('load-video', videoPath);
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  wallpaperWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    type: 'desktop',
    frame: false,
    show: false,
    transparent: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  wallpaperWindow.loadFile('wallpaper.html');
  
  wallpaperWindow.once('ready-to-show', () => {
    wallpaperWindow.show();
    wallpaperWindow.webContents.send('load-video', videoPath);
    
    if (process.platform === 'win32') {
      wallpaperWindow.setIgnoreMouseEvents(true);
    }
  });

  wallpaperWindow.on('closed', () => {
    wallpaperWindow = null;
  });
}

app.whenReady().then(() => {
  // Enable Auto-launch
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
  });

  createWindow()

  // Restore last wallpaper
  const settings = loadSettings();
  if (settings.lastWallpaper && settings.type === 'video') {
    if (fs.existsSync(settings.lastWallpaper)) {
      createWallpaperWindow(settings.lastWallpaper);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
ipcMain.on('set-wallpaper', async (event, { url, index }) => {
  try {
    const filename = path.basename(new URL(url).pathname);
    const downloadDir = path.join(app.getPath('pictures'), 'Fwallpapers');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    const savePath = path.join(downloadDir, filename);

    // 1. Download
    event.reply('wallpaper-progress', { index, progress: 10, status: 'Downloading...' });
    
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    const totalLength = response.headers['content-length'];
    let downloadedLength = 0;

    const writer = fs.createWriteStream(savePath);
    
    response.data.on('data', (chunk) => {
      downloadedLength += chunk.length;
      const progress = Math.round((downloadedLength / totalLength) * 80) + 10;
      event.reply('wallpaper-progress', { index, progress, status: 'Downloading...' });
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 2. Set Wallpaper
    const isVideo = filename.toLowerCase().endsWith('.mp4') || filename.toLowerCase().endsWith('.webm');
    
    if (isVideo) {
      event.reply('wallpaper-progress', { index, progress: 95, status: 'Starting Live Wallpaper...' });
      createWallpaperWindow(savePath);
      saveSettings({ lastWallpaper: savePath, type: 'video' });
      event.reply('wallpaper-success', { 
        index, 
        message: 'Live Wallpaper Started!' 
      });
    } else {
      if (process.platform === 'win32') {
        event.reply('wallpaper-progress', { index, progress: 95, status: 'Setting Wallpaper...' });
        
        const psCommand = `
          $code = '[DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int SystemParametersInfo(uint action, uint uiParam, string pvParam, uint fWinIni);';
          $type = Add-Type -MemberDefinition $code -Name "Win32SystemParametersInfo" -Namespace "Win32Utils" -PassThru;
          $type::SystemParametersInfo(0x0014, 0, "${savePath}", 0x01 -bor 0x02);
        `;

        exec(`powershell -command "${psCommand.replace(/\n/g, '')}"`, (error) => {
          if (error) {
            event.reply('wallpaper-error', { index, error: 'Failed to set wallpaper: ' + error.message });
          } else {
            saveSettings({ lastWallpaper: savePath, type: 'image' });
            event.reply('wallpaper-success', { index, message: 'Wallpaper Set!' });
          }
        });
      } else {
        event.reply('wallpaper-error', { index, error: 'Static wallpaper setting not supported on this platform.' });
      }
    }

  } catch (error) {
    event.reply('wallpaper-error', { index, error: error.message });
  }
});

ipcMain.on('stop-wallpaper', () => {
  if (wallpaperWindow) {
    wallpaperWindow.close();
    saveSettings({}); // Clear saved wallpaper if stopped manually
  }
});
