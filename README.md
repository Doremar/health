# health

Хранилище медицинских анализов + дэшборд + Telegram-бот + парсинг исследований (ЭКГ/КТ/МРТ/УЗИ/...).

## Установка

```bash
cp .env.example .env  # подредактируй HEALTH_VAULT_PATH, TELEGRAM_BOT_TOKEN
pnpm install
pnpm migrate
```

## Запуск

Один процесс на всё — `concurrently` поднимает watcher, dashboard и бота:

```bash
pnpm dev
```

Отдельно:
```bash
pnpm --filter @health/importer    watch    # watcher на inbox
pnpm --filter @health/dashboard   dev      # http://localhost:3000
pnpm --filter @health/telegram-bot dev     # Telegram-бот
```

## Требования

- Node.js 22+
- pnpm 9+
- Claude Code CLI залогинен (`claude` отвечает в терминале) — importer и бот используют `claude -p` для парсинга PDF и фото

## Доступ снаружи

Mac mini добавлен в Tailnet. Открывать `http://<mac-mini-name>:3000` с любого устройства в Tailnet.

## Логи

`pnpm dev` пишет всё в один stdout. Для отдельных запусков — стандартный stdout/stderr процесса.
