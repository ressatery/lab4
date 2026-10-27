import { Command } from 'commander';

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

console.log(options);