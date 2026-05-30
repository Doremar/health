# Deployment Plan — health project

Документ для агента/инженера, который продолжит развёртывание health-проекта на публичный домен.

---

## Цель

Сейчас весь проект (dashboard, telegram-бот, importer/watcher) живёт **локально на домашней машине (Mac mini)**. Доступ — только через Tailnet.

**Хотим:** публичный домен с HTTPS, чтобы дашборд открывался из любой точки. При этом **парсинг PDF/фото остаётся локально на домашней машине** (через `claude -p`, по подписке Claude Pro/Max — без API-ключей).

---

## Архитектура (Reverse Proxy)

```
Internet
  │
  ▼
https://<домен>                   (DNS A-запись → IP сервера)
  │
  ▼
VPS на Digital Ocean (Ubuntu LTS, ~$4/мес)
  ├── Caddy        — HTTPS через Let's Encrypt, автоматом
  └── Tailscale    — в том же Tailnet, что и домашняя машина
        │
        ▼  reverse_proxy через Tailnet
        │
Домашняя машина (Mac mini)
  ├── Dashboard (Next.js, localhost:3000)
  ├── Telegram-бот
  ├── Importer + watcher (PDF/фото → claude -p → SQLite)
  ├── Whoop-sync (после подключения)
  └── SQLite БД и vault — всё хранилище
```

**Почему так:**
- Домашняя машина уже работает 24/7 в Tailnet, контент на месте — переносить незачем.
- VPS — только "витрина" с публичным IP и HTTPS. Никакой бизнес-логики там нет.
- Если домашняя машина временно офлайн — сайт показывает 502, редкий кейс.
- Дёшево и просто (~30 минут настройки).

**Альтернатива (отложена):** Litestream-репликация SQLite на сервер + dashboard физически на сервере. Делать только если домашняя машина станет ненадёжной.

---

## Что готово

- Код в репозитории на GitHub (приватный).
- Сервисы запускаются локально через `pnpm dev` в корне проекта (concurrently поднимает watcher + dashboard + bot).
- Подписка Claude Pro/Max активна на домашней машине, `claude -p` работает.
- Telegram-бот активен, токен в локальном `.env` (не в репо).
- Домашняя машина уже добавлена в Tailnet.

---

## Шаги deploy

### 1. Создать VPS на Digital Ocean
- https://cloud.digitalocean.com → Create → Droplets
- **Region:** Frankfurt (FRA1) или ближайший к юзеру
- **Image:** Ubuntu 24.04 LTS x64
- **Size:** Basic → Regular Intel → ~$4/мес (512MB RAM, 10GB SSD достаточно)
- **Authentication:** SSH-ключ той машины, с которой будем настраивать
- Записать публичный IP

### 2. Привязать домен
В панели регистратора домена → DNS-записи:
- **A-запись:** имя поддомена (или корень) → IP сервера, TTL 600
- Подождать 5–30 минут. Проверить: `dig <домен> +short` должен вернуть IP.

### 3. Подготовить сервер
SSH в сервер (`ssh root@<IP>`):
```bash
apt update && apt upgrade -y

# Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
# (открыть URL для логина, авторизовать в том же Tailnet что и домашняя машина)

# Caddy
apt install -y caddy
```

Узнать Tailnet-имя домашней машины (выполнить на ней):
```bash
tailscale status
```
Запомнить имя ноды (например `<hostname>.<tailnet-id>.ts.net`).

### 4. Настроить Caddy
На сервере, `sudo nano /etc/caddy/Caddyfile`:
```
<домен> {
    reverse_proxy <tailnet-имя-домашней-машины>:3000
}
```
Перезапустить:
```bash
systemctl restart caddy
systemctl status caddy
```
Caddy сам выпустит Let's Encrypt сертификат — для этого DNS уже должен резолвиться на сервер.

### 5. Проверка
- `curl https://<домен>` → HTTP 200, HTML дашборда
- Открыть в браузере — должен загрузиться дашборд

### 6. Authentication (обязательно перед публикацией)
Сейчас дашборд **без авторизации** — публичный. Без защиты любой по URL увидит мед-данные. Варианты:

- **Caddy basic auth** — быстрый патч на старт.
- **Tailscale Funnel** вместо публичного домена — доступ только из Tailnet, без VPS вообще.
- **OAuth (GitHub/Google) middleware в Next.js** — правильный путь, но больше работы.

Самый быстрый — basic auth в Caddyfile:
```
<домен> {
    basic_auth {
        <username> <bcrypt-hash>
    }
    reverse_proxy <tailnet-имя-машины>:3000
}
```
Хеш генерится: `caddy hash-password`.

---

## Контекст

- **Gemini API key:** получен пользователем, но **не используется** в текущей схеме (парсинг остался на домашней машине через `claude -p`). Если потом перейдём на API парсинг — впишется в `.env`.
- **Whoop:** OAuth-каркас в `apps/whoop-sync/`. Ждёт `WHOOP_CLIENT_ID/SECRET` из developer.whoop.com. Запуск авторизации: `pnpm --filter @health/whoop-sync auth` — поднимает HTTP-сервер на `127.0.0.1:8765`. Redirect URI в Whoop App настраивать **на localhost**, не на публичный домен (поток одноразовый и локальный).
- **Весы Xiaomi:** только спека в vault, реализовывать когда юзер купит весы.

---

## Что НЕ переносить на сервер

- БД (SQLite) — остаётся на домашней машине.
- Vault с PDF/markdown — остаётся на домашней машине.
- `.env` с токенами — остаётся на домашней машине.
- Telegram-бот — на домашней машине (нужен `claude -p` для фото еды).
- Importer/watcher — на домашней машине.

На сервере **только Caddy + Tailscale**.

---

## Возможные проблемы

- **Caddy не получает сертификат:** проверь DNS прорастание (`dig <домен> +short` с сервера). Порты 80/443 должны быть открыты в DO Firewall (по умолчанию открыты).
- **502 Bad Gateway:** домашняя машина не доступна по Tailnet. Проверь `tailscale status` на обеих, `curl http://<tailnet-имя>:3000` с сервера.
- **Host header / CORS:** если Next.js ругается — в Caddyfile добавить `header_up Host {host}` или настроить Next allowedHosts.
- **DNS не прорастает:** иногда A-запись держится в кеше 1–2 часа. Подождать.

---

## После успешного deploy

Обновить этот документ:
- Добавить "Что работает" в начало с датой
- Записать выбранную схему auth
- Если возникли свои issue — задокументировать в "Возможные проблемы"
