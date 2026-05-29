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
