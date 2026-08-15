const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        icon: __dirname + '/icon.png',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    // Loads your chat app UI
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});