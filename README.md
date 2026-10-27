node main.js -i weather.json -h 127.0.0.1 -p 3000
сервер піу запуск термінал

 Опція | Призначення 

 `-i, --input <path>` | шлях до файлу даних 
 `-h, --host <address>` | адреса сервера 
 `-p, --port <number>` | порт сервера 
 `-o, --output <path>` | файл, у який записується остання відповідь 
 `--help` | довідка 

curl -i "http://127.0.0.1:3000/"
curl -i "http://127.0.0.1:3000/?humidity=true"
curl -i "http://127.0.0.1:3000/?min_rainfall=3.5"
curl -i "http://127.0.0.1:3000/?humidity=true&min_rainfall=3.5"

- 200: успіх
- 400: параметр `min_rainfall` не є числом
- 404: невідомий маршрут
- 500: файл даних відсутній чи пошкоджений, або помилка запису в `--output`