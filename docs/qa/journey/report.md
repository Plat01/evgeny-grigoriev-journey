# Проверка — 28 октября 2026

База: `0d9542995d07530f56ba6c7228d5f138dde89800`, ветка `journey-scenes`. Незакоммиченные .gitignore и .taste-skill/direction.json сохранены побайтово. Исходный model sheet не изменён. Push и deploy не выполнялись; существующий noindex сохранён до публичного запуска.

## Результат

| Проверка | Результат |
| --- | --- |
| npm run check | 8 файлов, 0 errors, 0 warnings, 0 hints |
| npm run build | Успешно: корневая и вложенная сборка |
| Production base | /journey-preview/; preview http://localhost:4323/journey-preview/ |
| 390×844 / 1366×768 / 1920×1080 | Все 21 состояния: изображения загружены, заголовки в две строки, horizontal overflow отсутствует |
| Ресурсы вложенного base | Ошибок нет, обращений к ресурсам вне base нет |
| Консоль и сеть | Ошибок нет |
| Клавиатура | Home → Начало, PageDown → Любопытство, Escape закрывает меню во всех трёх размерах |
| Reduced motion / без JS | Все семь глав читаются, иллюстрации загружены, inert отсутствует |
| Прямой вход #momentum | Видимая и активная глава momentum, подпись «Движение»; direct-entry.json |
| Смена reduced motion во время работы | Pin и inert сняты; возврат к анимации работает |
| Taste lint | 0 FAIL, 1 WARN: тире в русской пунктуации |
| Taste inspector 1440 / 768 / 390 | 0 FAIL, 4 WARN |
| Taste scenes | Все сцены работают; 172 кадра, медиана 16.7ms, один >34ms. Это грубое headless-наблюдение, не замер устройства пользователя |
| Независимый Impeccable review | ship, material_fixes: none |
| git diff --check | Успешно |

Четыре предупреждения Taste: отсутствие видео соответствует запросу на иллюстрации; преобладание сцен прямо требуется брифом; предупреждение шрифта сравнивает страницу с сохранённым старым пользовательским direction.json, кириллический Manrope выбран сознательно; детектор не распознаёт русскую профессию под именем, хотя она явно видна. Правила инспектора не отключались.

Растровые позы статичны. Движение создают разные действия, сдвиг, масштаб и переходы между сценами; скелетная анимация персонажа не создавалась. Источник фактов: https://evgenygrigoriev.ru/. Мост и велосипед — визуальные метафоры. Изображения и тексты iCapital не использованы.

## Статус инструментов

| Инструмент | Что действительно сделано |
| --- | --- |
| Astro / GSAP / ScrollTrigger / Manrope | Установлены ранее, вызваны сборкой и страницей |
| Context7 | Зарегистрирован, вызван инструментами и npm run docs:check; handshake/list/call в docs/research/context7.json |
| Встроенный Imagegen | Семь отдельных вызовов с model sheet, семь PNG сохранены в проект; промпты встроены и записаны в docs/research/journey/imagegen.json |
| Playwright MCP | Зарегистрирован и вызван; заблокирован занятым профилем. Его визуальная проверка не заявляется |
| Chromium через Taste CDP | Референс и production preview действительно открыты; скриншоты и интерактивный QA выполнены; новый браузерный MCP не устанавливался |
| Taste / Impeccable | Skills и references прочитаны, draw/context/concept-seed/lint/inspect/scenes вызваны, независимые reviewer и documenter выполнены |

## Доказательства

`results.json` — 21 состояние и fallback; `runtime-media.json`, `direct-entry.json` — граничные режимы. `390-all-chapters.png`, `1366-all-chapters.png`, `1920-all-chapters.png` и отдельные PNG показывают все главы. `768-all-chapters-1.jpg` и `768-all-chapters-2.jpg` — планшет. `transitions-desktop.jpg`, `transitions-phone.jpg`, `reduced-desktop.jpg` — общая сцена. `no-js-*.png` и `reduced-*.png` — fallback после decode и ожидания отрисовки. `character-comparison.png` — семь сцен рядом с исходником.

Первый no-JS снимок был сделан до покраски кадра и заменён после decode и ожидания отрисовки. Ошибка подписи и inert при прямом hash-входе исправлена и повторно проверена. Устранено преждевременное появление текста следующей панели перед стартом tween. Финальные изображения просмотрены.
