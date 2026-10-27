import { Command } from 'commander';
import fs from 'node:fs'
import http from 'node:http';

const program = new Command();

program
  .name('weather-server')
  .description('HTTP-сервер, що віддає дані про погоду у форматі JSON')
  .helpOption('--help', 'показати довідку')
  .requiredOption('-i, --input <path>', 'шлях до файлу даних')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .option('-o, --output <path>', 'файл, у який записується остання відповідь');

program.parse();
const options = program.opts();

const port = Number(options.port);
if (!/^\d+$/.test(options.port) || port > 65535) {
  program.error('error: port must be an integer from 0 to 65535');
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${options.host}:${port}`);

    if (url.pathname !== '/') {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Маршрут не знайдено' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'Сервер працює' }));
  });

  server.listen(port, options.host, () => {
    console.log(`Сервер запущено: http://${options.host}:${port}/`);
  });
}

fs.access(options.input, fs.constants.R_OK, (err) => {
  if (err) {
    console.error('Cannot find input file');
    process.exit(1);
  }
  startServer();
});