# SETUP — Mac mini (домашняя часть)

Эта инструкция для **домашней машины** (Mac mini), на которой живёт всё кроме публичной витрины: БД, vault, watcher, importer, Telegram-бот, dashboard. Сайт публикуется через VPS — см. `docs/DEPLOY.md`.

---

## Предусловия

- macOS (тестировано на Sonoma+)
- **Node.js 22+** — https://nodejs.org или `brew install node`
- **pnpm 9+** — `npm install -g pnpm` или `brew install pnpm`
- **Claude Code CLI** залогинен — https://github.com/anthropics/claude-code . В терминале `claude --version` должно работать. Нужна активная **подписка Claude Pro / Max** на твоём Anthropic-аккаунте.
- **Telegram-аккаунт** для общения с ботом
- **Tailscale** (если планируешь публичный домен через VPS — см. DEPLOY.md)

---

## 1. Клонирование

```bash
git clone <repo-url> ~/projects/health
cd ~/projects/health
pnpm install
```

---

## 2. Создание vault

Vault — это директория, в которую попадают все твои данные (PDF лабораторных, markdown-отчёты, БД SQLite). Можно положить куда угодно — хоть в Obsidian-vault, хоть в обычную папку.

```bash
mkdir -p ~/Documents/AI/health/{inbox,originals,originals/studies,labs,studies,quarantine,nutrition}
```

Структура:
```
vault/health/
├── inbox/        — сюда кидаешь PDF/фото, watcher отлавливает
├── originals/    — лабораторные PDF после импорта
├── originals/studies/ — исследования (ЭКГ/КТ/МРТ/УЗИ/...) после импорта
├── labs/         — markdown отчёты лабов (для Obsidian)
├── studies/      — markdown отчёты исследований
├── quarantine/   — что не распарсилось / не медицинское
├── nutrition/    — фото еды от Telegram-бота
└── db.sqlite    ← создастся миграцией ниже
```

---

## 3. Создание Telegram-бота

1. Открой @BotFather в Telegram
2. `/newbot` → выбери имя (любое) и username (заканчивается на `bot`, например `myhealth_personal_bot`)
3. BotFather пришлёт **токен** вида `1234567890:AAH...` — запиши, понадобится ниже

---

## 4. Конфигурация `.env`

```bash
cp .env.example .env
```

Открой `.env` и заполни:

```
HEALTH_VAULT_PATH=/Users/<твой-юзер>/Documents/AI/health
CLAUDE_BIN=claude
TELEGRAM_BOT_TOKEN=<токен от @BotFather>
```

---

## 5. Инициализация БД

```bash
pnpm migrate
```

Создаст `db.sqlite` в vault, применит все миграции, засидит дефолтный список «закреплённых» маркеров.

---

## 6. Запуск

```bash
pnpm dev
```

Команда поднимет одновременно через `concurrently`:
- **watcher** — слушает `inbox/`, при появлении PDF/изображения запускает importer
- **dashboard** — http://localhost:3000
- **telegram-bot** — твой бот начинает отвечать

Останов — `Ctrl+C`.

---

## 7. Первый PDF

1. Кинь любую лабораторную PDF в `~/Documents/AI/health/inbox/`
2. Watcher увидит, importer вызовет `claude -p` для парсинга (~30-60 сек)
3. Результат попадёт в `labs/` (markdown) + `db.sqlite` (маркеры)
4. Освежи http://localhost:3000 — должна появиться сдача

Логи парсера: `tail -f ~/Library/Logs/health/import.log` (если запустил через launchd) или прямо в stdout `pnpm dev`.

---

## 8. Подключение бота

Найди своего бота в Telegram (по username, который дал BotFather), нажми `/start`. Бот привяжет твой Telegram-аккаунт к локальной БД. Доступные команды:

- `/help` — список
- `/feeling` — записать текущее самочувствие (1–10 + заметка)
- `/today` — сводка сегодняшнего дня
- `/addmed`, `/meds`, `/stopmed` — лекарства
- `/target` — норма КБЖУ
- Можно скинуть **фото еды** — бот распарсит через claude, посчитает КБЖУ

Опросы самочувствия раз в день в 10:00/15:00/21:00 МСК.

---

## 9. Публикация сайта наружу (опционально)

Чтобы открывать дашборд с любого устройства через https-домен — см. **docs/DEPLOY.md**. Схема:

```
Internet → твой VPS (Caddy + Tailscale) → reverse_proxy через Tailnet → Mac mini (dashboard)
```

VPS видит только публичный IP, Mac mini остаётся за домашним роутером.

---

## Что НЕ нужно

- `launchd` — раньше использовался для автозапуска watcher/bot/dashboard, но из-за TCC-блокировок в `~/Documents/` его выпилили. Сейчас всё запускается через `pnpm dev`.
- Анонимный shared vault — у каждого свой локальный.

---

## Если что-то не запускается

- `pnpm dev` падает с «HEALTH_VAULT_PATH env var is required» — проверь `.env`, что переменные подгружаются (в `apps/*/src/index.ts` есть `import "dotenv/config"`, но `pnpm --filter` меняет cwd — поэтому есть смысл передавать env-переменные явно при ручном запуске)
- `claude -p` молчит/таймаут — проверь подписку (`claude --version`), залогинься заново
- БД пустая в дашборде — `pnpm migrate` ещё не выполнен, или watcher не отлавливает inbox (проверь `HEALTH_VAULT_PATH` указывает на тот же путь)
- Бот не отвечает — проверь токен в `.env`, перезапусти `pnpm dev`, посмотри stdout
