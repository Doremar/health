# Deployment Plan — health project

Документ для нового агента/человека, который продолжит развёртывание health-проекта на публичный домен.

---

## Цель

Сейчас весь проект (dashboard, telegram-бот, importer/watcher) живёт **локально на Mac mini в Дубае**. Доступ — только через Tailnet (`http://<mac-mini>:3000`).

**Хотим:** публичный домен (через reg.ru), HTTPS, чтобы открывалось `https://health.<домен>` из любой точки. При этом **парсинг PDF/фото остаётся на Mac mini** (через `claude -p`, подписка Claude Pro/Max — никаких API-ключей).

---

## Архитектура (выбранный вариант: Reverse Proxy)

```
Internet
  │
  ▼
https://health.<домен>            (DNS A-запись в reg.ru → IP droplet)
  │
  ▼
Digital Ocean Droplet (Ubuntu 24.04, $4/мес)
  ├── Caddy (HTTPS через Let's Encrypt, автоматом)
  └── Tailscale (в том же Tailnet что и Mac mini)
        │
        ▼
        reverse_proxy через Tailnet IP
        │
        ▼
Mac mini Дубай
  ├── Dashboard (Next.js, http://localhost:3000)
  ├── Telegram-бот @codebrotebot
  ├── Importer + watcher (PDF/фото → claude -p → SQLite)
  ├── Whoop-sync (когда подключим)
  └── SQLite БД, vault, всё хранилище
```

**Почему так:**
- Mac mini уже работает 24/7 в Tailnet, контент на месте — ломать незачем.
- DO droplet — только "витрина" с публичным IP и HTTPS. Никакой бизнес-логики там нет.
- Если Mac mini временно офлайн — сайт показывает 502, но это редкий кейс.
- Дешёво ($4/мес) и просто (~30 минут настройки).

**Альтернатива (отложена):** Litestream-репликация SQLite на сервер + dashboard на сервере. Делать если Mac mini станет ненадёжным.

---

## Что готово

- **Код:** https://github.com/Doremar/health (private repo, push доступен).
- **Сервисы локально на Mac mini:** запускаются через `pnpm dev` в `~/projects/health`. Concurrently поднимает watcher + dashboard + bot. Раньше был launchd — удалён, потому что macOS TCC блокировал launchd на запись в `~/Documents/` (см. историю коммитов).
- **Подписка Claude Pro/Max** активна на Mac mini, `claude -p` работает.
- **Telegram-бот** активен, @codebrotebot.
- **Tailnet:** Mac mini уже в нём. Имя ноды — узнать через `tailscale status` на Mac mini.

---

## Что нужно сделать (порядок шагов)

### 1. Создать DO droplet
- https://cloud.digitalocean.com → Create → Droplets
- **Region:** Frankfurt (FRA1) — ближе всех к РФ
- **Image:** Ubuntu 24.04 (LTS) x64
- **Size:** Basic → Regular Intel → **$4/мес** (512MB RAM, 10GB SSD)
- **Authentication:** SSH key (добавить публичный ключ с того компа, с которого будем настраивать)
- **Hostname:** `health-proxy`
- После создания — записать публичный IP

### 2. Привязать домен
В reg.ru → панель управления → DNS-записи:
- Добавить **A-запись:** `health.<домен>.ru → <IP droplet>`, TTL 600
- Подождать 5-30 минут пока DNS прорастёт. Проверить: `dig health.<домен>.ru +short` должен вернуть IP droplet.

### 3. Подготовить droplet
SSH в droplet (`ssh root@<IP>`):
```bash
# Системные обновления
apt update && apt upgrade -y

# Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
# (откроется URL для логина — авторизовать в том же Tailnet что и Mac mini)

# Caddy
apt install -y caddy

# Узнать Tailnet-имя Mac mini (с Mac mini):
#   tailscale status
# Запомнить magic-dns имя, например: macmini-dubai.tail-xxxxx.ts.net
```

### 4. Настроить Caddy
На droplet, `sudo nano /etc/caddy/Caddyfile`:
```
health.<домен>.ru {
    reverse_proxy <mac-mini-tailnet-name>:3000
}
```
Перезапустить:
```bash
systemctl restart caddy
systemctl status caddy
```
Caddy сам выпустит Let's Encrypt сертификат (домен уже должен резолвиться на droplet — это требование Let's Encrypt).

### 5. Проверить
- `curl https://health.<домен>.ru` → HTTP 200, HTML дашборда
- Открыть в браузере — должен открыться дашборд.

### 6. Authentication (важно!)
Сейчас дашборд **без авторизации** — публичный. После публикации **любой по URL увидит мед-данные**. Варианты:
- **Caddy basic auth** — простой пароль (быстрый патч на старт)
- **Tailscale Funnel** вместо публичного домена — доступ только тем кто в Tailnet
- **OAuth (GitHub/Google)** в Next.js middleware — правильный путь

Решить **до публикации**. Самое быстрое — basic auth в Caddyfile:
```
health.<домен>.ru {
    basic_auth {
        konstantin <bcrypt-hash>
    }
    reverse_proxy <mac-mini-tailnet-name>:3000
}
```
Хеш сгенерить: `caddy hash-password`.

---

## Контекст: что есть на руках

- **Gemini API key** получен, но **не используем** в текущем плане (т.к. парсинг остался на Mac mini через `claude -p`). Файл `.env` Mac mini его НЕ содержит. Если в будущем перейдём на Anthropic/Gemini API — впишется.
- **Whoop:** OAuth-каркас в `apps/whoop-sync/`. Ждёт `WHOOP_CLIENT_ID/SECRET` от developer.whoop.com. Запуск авторизации: `pnpm --filter @health/whoop-sync auth` (поднимает локальный HTTP сервер на `127.0.0.1:8765`). После публикации — настроить redirect URI в Whoop приложении именно на этот localhost, **не на публичный домен** (auth-flow одноразовый, локально).
- **Весы Xiaomi:** только спека в vault, юзер ещё не купил.

---

## Что НЕ переносить на сервер

- БД (SQLite) — остаётся на Mac mini.
- Vault (`~/Documents/AI/health/`) — остаётся на Mac mini.
- `.env` с TELEGRAM_BOT_TOKEN — остаётся на Mac mini.
- Telegram-бот — остаётся на Mac mini (нужен `claude -p` для фото еды).
- Importer/watcher — на Mac mini.

На сервере **только Caddy + Tailscale**.

---

## Возможные проблемы

- **Caddy не получает сертификат:** проверь DNS прорастание (`dig health.<домен>.ru +short` с droplet). Порты 80/443 должны быть открыты в DO Firewall (по умолчанию открыты).
- **502 Bad Gateway:** Mac mini не доступен. Проверь `tailscale status` на обеих машинах, `curl http://<mac-mini-tailnet-name>:3000` с droplet.
- **CORS/host header:** если Next.js ругается на host — добавить в Caddyfile `header_up Host {host}` или настроить Next allowed hosts.
- **Reg.ru долгий DNS:** иногда A-запись прорастает 1-2 часа. Терпение.

---

## Контакты и доступы

- **GitHub:** Doremar/health (приватный), коллаб molodros333 (нужно добавить отдельно, см. историю — аккаунт Doremar flagged GitHub'ом, в процессе восстановления через Support).
- **Telegram-бот:** @codebrotebot, токен в `.env` на Mac mini.
- **DO аккаунт:** заводится пользователем.
- **Reg.ru:** домен уже куплен, имя сообщит пользователь.
