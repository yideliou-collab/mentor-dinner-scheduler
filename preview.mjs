import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const files = new Set(['index.html', 'styles.css', 'calendar.css', 'app.js', 'config.js']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const root = import.meta.dirname;
const port = 8765;

createServer(async (request, response) => {
  const name = request.url === '/' ? 'index.html' : decodeURIComponent((request.url || '').slice(1).split('?')[0]);
  if (!files.has(name)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  try {
    const content = await readFile(join(root, name));
    response.writeHead(200, { 'Content-Type': types[extname(name)], 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(500);
    response.end('Read error');
  }
}).listen(port, '127.0.0.1', () => console.log(`預覽網址：http://127.0.0.1:${port}/`));
