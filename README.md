# health

Личный «дашборд здоровья». Хранилище анализов и исследований, Telegram-бот для самочувствия / лекарств / питания, веб-дашборд.

Парсинг PDF и фото идёт через `claude -p` (Claude Code CLI) — никаких платных API.

## Документация

- **[docs/SETUP_MACMINI.md](docs/SETUP_MACMINI.md)** — пошагово развернуть всё на домашней машине (vault, БД, бот, dashboard, watcher)
- **[docs/DEPLOY.md](docs/DEPLOY.md)** — публикация дашборда наружу через VPS (Caddy reverse proxy + Tailscale)

## TL;DR

```bash
git clone <repo> ~/projects/health
cd ~/projects/health
pnpm install
cp .env.example .env       # заполни HEALTH_VAULT_PATH, TELEGRAM_BOT_TOKEN
mkdir -p ~/Documents/AI/health/{inbox,originals,originals/studies,labs,studies,quarantine,nutrition}
pnpm migrate
pnpm dev
```

- Dashboard: http://localhost:3000
- Telegram-бот стартует параллельно
- Кидай PDF в `inbox/` — парсится автоматически

## Стек

| Часть | Технология |
|---|---|
| Monorepo | pnpm workspaces |
| Парсинг | `claude -p` (headless) |
| БД | SQLite (better-sqlite3) |
| Backend | Node.js 22, TypeScript, tsx |
| Dashboard | Next.js 15 (App Router), Tailwind, Recharts |
| Bot | Telegraf |
| Tests | Vitest |

## Требования

- Node.js 22+, pnpm 9+
- Claude Code CLI с активной подпиской Pro / Max
- Telegram-бот от @BotFather

## Что внутри

```
apps/
├── importer       — watcher + парсинг PDF/фото через claude -p
├── dashboard      — Next.js, страницы /, /archive, /studies, /marker/[code], /lab/[id], /settings
├── telegram-bot   — самочувствие, лекарства, питание (фото еды → КБЖУ)
└── whoop-sync     — OAuth + sync (каркас, ждёт client_id)
packages/shared/   — zod-схемы, config, классификация маркеров
migrations/        — SQL миграции 1–8
docs/              — SETUP_MACMINI.md, DEPLOY.md
```
