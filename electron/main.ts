import { app, BrowserWindow, globalShortcut, ipcMain, clipboard, screen } from 'electron';
import path from 'path';
import { keyboard, Key } from '@nut-tree-fork/nut-js';

// Optimize keyboard speed
keyboard.config.autoDelayMs = 0;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowWidth = 400;
    const windowHeight = 600; // Increased height to accommodate settings menu

    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: Math.round((width - windowWidth) / 2),
        y: Math.round(height - windowHeight - 20),
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        type: 'toolbar', // Helps with staying on top on some systems
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        show: false, // Start hidden
    });

    // Set to highest possible level to stay above everything
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    // Ensure it shows over fullscreen apps and on all virtual desktops
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else if (!app.isPackaged) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Start hidden - don't show until shortcut is pressed
}

app.whenReady().then(() => {
    createWindow();

    // Register a 'CommandOrControl+Shift+K' shortcut listener.
    const ret = globalShortcut.register('CommandOrControl+Shift+K', () => {
        console.log('CommandOrControl+Shift+K is pressed');
        if (mainWindow) {
            // Re-assert always on top status before showing
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.webContents.send('toggle-recording');
            // Show window WITHOUT stealing focus
            mainWindow.showInactive();
        }
    });

    // Register a 'CommandOrControl+Shift+L' shortcut listener for Settings.
    const retSettings = globalShortcut.register('CommandOrControl+Shift+L', () => {
        console.log('CommandOrControl+Shift+L is pressed');
        if (mainWindow) {
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.webContents.send('open-settings');
            mainWindow.showInactive();
        }
    });

    if (!ret) {
        console.log('registration failed');
    }

    console.log(globalShortcut.isRegistered('CommandOrControl+Shift+K'));

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setIgnoreMouseEvents(ignore, options);
});

ipcMain.on('transcription-complete', async (event, text) => {
    console.log('Transcription received:', text);
    try {
        console.log('Writing to clipboard...');
        clipboard.writeText(text);

        // Reduced delay for faster pasting (was 300ms)
        await new Promise(resolve => setTimeout(resolve, 50));

        console.log('Sending Paste command...');

        // Cross-platform paste using nut.js
        if (process.platform === 'darwin') {
            await keyboard.pressKey(Key.LeftSuper);
            await keyboard.pressKey(Key.V);
            await keyboard.releaseKey(Key.V);
            await keyboard.releaseKey(Key.LeftSuper);
        } else {
            await keyboard.pressKey(Key.LeftControl);
            await keyboard.pressKey(Key.V);
            await keyboard.releaseKey(Key.V);
            await keyboard.releaseKey(Key.LeftControl);
        }

        console.log('Paste command sent');

        // Hide the window after pasting
        setTimeout(() => {
            if (mainWindow) mainWindow.hide();
        }, 500);
    } catch (error) {
        console.error('Error pasting text:', error);
    }
});
