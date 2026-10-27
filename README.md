# Евгений Григорьев — человек в движении

Русскоязычный персональный сайт на Astro, TypeScript strict и GSAP + ScrollTrigger. Семь полноэкранных сцен пути: прогулка, чертёж, мост, горный подъём, велосипед, бег и знакомство за кофе. Основа — коммит `0d9542995d07530f56ba6c7228d5f138dde89800`.

## Локальная работа

```sh
npm ci
npm run dev -- --host 0.0.0.0
npm run check
npm run build
npm run preview -- --host 0.0.0.0
```

Если preview этого проекта уже работает, используйте другой порт с `--ignore-lock` или явно остановите прежний сервер. Не останавливайте серверы соседних проектов.

## Сцены

Обычная прокрутка управляет закреплённой сценой и GSAP timeline. Переходы меняют глубину и положение иллюстраций, последовательно убирают и вводят текст. Главы доступны через меню, точки, «Дальше», PageUp/PageDown, Home/End. Колесо и touch не перехватываются. При reduced motion, без JavaScript и на очень низком экране главы остаются обычными читаемыми секциями.

Исходный model sheet хранится отдельно в `assets/` и не изменён. Новые PNG с прозрачностью — `src/assets/journey-*-v1.png`. Astro создаёт адаптивные WebP. Точные промпты встроены в PNG и сохранены вместе с происхождением в `docs/research/journey/imagegen.json`.

## Проверка GitHub Pages base

```sh
PAGES_SITE=https://example.github.io PAGES_BASE=/journey-preview/ npm run build
PAGES_SITE=https://example.github.io PAGES_BASE=/journey-preview/ npm run preview -- --host 0.0.0.0 --port 4323 --ignore-lock
QA_URL=http://localhost:4323/journey-preview/ node scripts/journey-qa.mjs
```

Браузерный QA использует установленный Chromium через CDP из Taste; ничего не устанавливает. Проверяет все главы в 390×844, 1366×768 и 1920×1080, клавиатуру, изображения, ошибки, пути ресурсов, reduced motion и отсутствие JS. Артефакты — `docs/qa/journey/`. Playwright MCP в текущей сессии вызван, но его профиль был занят; детали в отчёте.

`npm run docs:check` выполняет реальный Context7 MCP handshake/list/call для Astro и GSAP и записывает `docs/research/context7.json`.

## Публикация

CI работает при push/PR. Публикация — только вручную через workflow_dispatch и после отдельного поручения. Вёрстка сохраняет noindex до подготовки публичного запуска. Push и deploy в этой сессии не выполнялись.
