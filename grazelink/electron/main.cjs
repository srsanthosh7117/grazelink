const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.map': 'application/json',
};

let server = null;
let win = null;

function createServer() {
  const root = path.join(__dirname, '..', 'dist');

  return http.createServer((req, res) => {
    let pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    if (pathname.endsWith('/')) pathname += 'index.html';

    let filePath = path.normalize(path.join(root, pathname));

    if (!filePath.startsWith(path.normalize(root))) {
      filePath = path.join(root, 'index.html');
    }

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        fs.stat(path.join(root, 'index.html'), (err2, stats2) => {
          if (err2 || !stats2.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            fs.createReadStream(path.join(root, 'index.html')).pipe(res);
          }
        });
      }
    });
  });
}

app.whenReady().then(() => {
  server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    win = new BrowserWindow({
      width: 1360,
      height: 860,
      minWidth: 1024,
      minHeight: 640,
      title: 'GrazeLink',
      autoHideMenuBar: true,
      backgroundColor: '#0b0f19',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    win.loadURL(`http://127.0.0.1:${port}/`);
    win.on('closed', () => {
      win = null;
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (server) {
    server.close();
    server = null;
  }
});
