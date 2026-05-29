# health

Хранилище медицинских анализов + дэшборд. См. спеку:
`/Users/konstantin/Documents/AI/docs/superpowers/specs/2026-05-29-health-labs-storage-design.md`

## Установка

```bash
cp .env.example .env  # подредактируй пути
pnpm install
pnpm migrate
```

## Запуск

- Importer: `pnpm --filter importer watch`
- Dashboard: `pnpm --filter dashboard dev`

## Развёртывание на Mac mini

### Предусловия
- Node.js 22+
- pnpm 9+ (на этой машине: `/Users/konstantin/Library/pnpm/pnpm`)
- Claude Code залогинен (`claude` отвечает в терминале) — используется importer через `claude -p`
- Tailscale настроен (для доступа снаружи)

### Сборка
```bash
cd ~/projects/health
pnpm install
pnpm migrate
pnpm --filter @health/dashboard build
```

Importer и watcher запускаются через `tsx` — отдельная сборка не нужна.

### Установка сервисов
```bash
cp launchd/com.kostya.health-watcher.plist   ~/Library/LaunchAgents/
cp launchd/com.kostya.health-dashboard.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.kostya.health-watcher.plist
launchctl load ~/Library/LaunchAgents/com.kostya.health-dashboard.plist
```

### Проверка
```bash
curl -s http://localhost:3000 | head -20
tail -20 /Users/konstantin/Documents/AI/health/.import.log
tail -20 /Users/konstantin/Documents/AI/health/.dashboard.log
```

### Доступ снаружи
Mac mini добавлен в Tailnet. Открывать `http://<mac-mini-name>:3000` с любого устройства в Tailnet.

### Управление сервисами
```bash
launchctl unload ~/Library/LaunchAgents/com.kostya.health-watcher.plist
launchctl unload ~/Library/LaunchAgents/com.kostya.health-dashboard.plist
# затем launchctl load снова после изменений
```
