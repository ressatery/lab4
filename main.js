import fs from 'node:fs';
import http from 'node:http';
import { Command } from 'commander';

// ---------- 1. Параметри командного рядка ----------
const program = new Command();

program
  .name('weather-server')
  .description('HTTP-сервер, що віддає дані про погоду у форматі JSON')
  // -h потрібен для --host, тому довідку лишаємо тільки як --help
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

// ---------- 2. Допоміжні функції ----------

// Фізично надсилає відповідь клієнту.
function reply(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

// Серіалізує відповідь, за потреби записує її у --output, потім надсилає.
function send(res, status, payload) {
  const text = JSON.stringify(payload);

  if (!options.output) {
    reply(res, status, text);
    return;
  }

  fs.writeFile(options.output, text, 'utf8', (err) => {
    if (err) {
      console.error('Помилка запису у файл виводу:', err.message);
      if (status === 200) {
        // успішну відповідь не вдалося зберегти -> повідомляємо про 500
        reply(res, 500, JSON.stringify({ error: 'Не вдалося записати відповідь у файл' }));
      } else {
        // це вже відповідь про помилку; надсилаємо її як є
        reply(res, status, text);
      }
      return;
    }
    reply(res, status, text);
  });
}

function sendError(res, status, message) {
  send(res, status, { error: message });
}

// Рядок true (рівно так) вмикає прапорець, усе інше -- ні.
function readFlag(params, name) {
  return params.get(name) === 'true';
}

// null -> параметра немає; NaN -> значення не є числом; інакше число.
function readNumberParam(params, name) {
  const raw = params.get(name);
  if (raw === null) return null;
  const text = raw.trim();
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(text)) return NaN;
  return Number(text);
}

// Значення з файлу -> число або null (для відсутніх/порожніх/нечислових).
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---------- 3. Обробка запиту ----------
function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${options.host}:${port}`);

    if (url.pathname !== '/') {
      sendError(res, 404, 'Маршрут не знайдено');
      return;
    }

    const showHumidity = readFlag(url.searchParams, 'humidity');
    const minRainfall = readNumberParam(url.searchParams, 'min_rainfall');

    if (Number.isNaN(minRainfall)) {
      sendError(res, 400, 'Параметр min_rainfall має бути числом');
      return;
    }

    fs.readFile(options.input, 'utf8', (readErr, text) => {
      // Помилки в колбеку НЕ ловить зовнішній try/catch, тому тут окремий.
      try {
        if (readErr) {
          console.error('Помилка читання файлу даних:', readErr.message);
          sendError(res, 500, 'Не вдалося прочитати файл даних');
          return;
        }

        let records;
        try {
          records = JSON.parse(text.replace(/^\uFEFF/, ''));
        } catch {
          sendError(res, 500, 'Файл даних пошкоджений: некоректний JSON');
          return;
        }

        if (!Array.isArray(records)) {
          sendError(res, 500, 'Файл даних має неправильну структуру: очікується масив');
          return;
        }

        const result = [];
        for (const rec of records) {
          if (rec === null || typeof rec !== 'object') continue;

          const rainfall = toNumber(rec.Rainfall);

          // строга межа; запис без числового Rainfall під фільтр не потрапляє
          if (minRainfall !== null && !(rainfall !== null && rainfall > minRainfall)) {
            continue;
          }

          const item = {
            rainfall,
            pressure3pm: toNumber(rec.Pressure3pm),
          };
          if (showHumidity) item.humidity = toNumber(rec.Humidity3pm);
          result.push(item);
        }

        send(res, 200, result);
      } catch (err) {
        console.error('Несподівана помилка в колбеку:', err);
        sendError(res, 500, 'Внутрішня помилка сервера');
      }
    });
  } catch (err) {
    console.error('Несподівана помилка:', err);
    sendError(res, 500, 'Внутрішня помилка сервера');
  }
}

// ---------- 4. Запуск ----------
function startServer() {
  const server = http.createServer(handleRequest);

  server.on('error', (err) => {
    console.error('Не вдалося запустити сервер:', err.message);
    process.exit(1);
  });

  server.listen(port, options.host, () => {
    console.log(`Сервер запущено: http://${options.host}:${port}/`);
  });
}

// Перевірка існування файлу (колбек-API), лише потім старт
fs.access(options.input, fs.constants.R_OK, (err) => {
  if (err) {
    console.error('Cannot find input file');
    process.exit(1);
  }
  startServer();
});