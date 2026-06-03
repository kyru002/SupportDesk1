# SupportDesk — Sistema de tickets con videollamadas

![Vue](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Local-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)

Aplicación web tipo **Helpdesk** para gestionar **tickets**, **chat en tiempo real**, **videollamadas WebRTC por ticket**, y **albaranes** (registro/seguimiento de horas y trabajos) con persistencia en **MongoDB**.

---

## Funcionalidades principales

- **Autenticación JWT** (roles: `admin`, `tecnico`, `cliente`)
- **Tickets**: alta, edición, asignación, estado/prioridad e historial de mensajes
- **Chat en tiempo real** por ticket (Socket.io)
- **Videollamadas y screen sharing** por ticket (WebRTC + señalización con Socket.io)
- **Albaranes**: creación, cambio de estado, entrega/firma y cómputo de horas
- **Logs** de llamadas (Call Logs) y **logs de uso de IA** (mock) para resumen/sugerencias

---

## Estructura del proyecto

```text
.
├── backend/                  # API Express + Socket.io + MongoDB (Mongoose)
│   ├── server.js
│   ├── database.js
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
├── frontend/                 # Vue 3 + Vite + Pinia + Tailwind
│   ├── index.html
│   ├── vite.config.js
│   └── src/
├── docker-compose.yml        # MongoDB + App + Nginx (opcional)
├── nginx.conf                # Reverse proxy (API + Socket.io) + SPA fallback
└── package.json              # Scripts de arranque/instalación en monorepo
```

---

## Puertos y flujo en local

- **Frontend (Vite):** `http://localhost:5173`
- **Backend (API + Socket.io):** `http://localhost:5001`
- En desarrollo, el frontend hace proxy a:
  - `/api` → `http://127.0.0.1:5001`
  - `/socket.io` (WebSocket) → `ws://127.0.0.1:5001`

---

## Base de datos

Por defecto la API usa:

- `MONGO_URI = mongodb://127.0.0.1:27017/MyApp`

**Colecciones/modelos principales:**

| Colección | Modelo | Descripción |
|---|---|---|
| `tickets` | Ticket | Ticket y mensajes (`messages`) |
| `clientes` | Cliente | Empresas/clientes (referencia `empresa` en trabajadores) |
| `trabajadores` | Trabajador | Usuarios del sistema: admin / técnico / cliente |
| `albaranes` | Albaran | Albaranes vinculados a cliente/técnico/ticket |
| `calllogs` | CallLog | Registro de llamadas por ticket |
| `aiusages` | AIUsage | Historial de prompts/respuestas (mock) |

---

## Variables de entorno

La aplicación funciona sin `.env` usando valores por defecto, pero es recomendable configurar:

```sh
# Backend
MONGO_URI=mongodb://127.0.0.1:27017/MyApp
JWT_SECRET=tu-clave-secreta-muy-segura
NODE_ENV=development
```

Notas:
- El puerto del backend está fijado a `5001` en el código.
- En Docker, `docker-compose.yml` inyecta su propia `MONGO_URI`.

---

## Cuentas de prueba (seeding automático)

Al arrancar el backend, se ejecuta un seeder que crea/sincroniza cuentas base:

- **Admin:** `admin@support.com` / `admin123`
- **Técnico:** `tecnico@support.com` / `tecnico123`

Opcionalmente existe un script de demo que crea empresa + usuario cliente + ticket:

- **Cliente demo:** `cliente@support.com` / `cliente123`

---

## Instalación y uso (desarrollo)

### Requisitos

- Node.js 18+
- MongoDB local (o Docker para MongoDB)

### 1) Instalar dependencias

Desde la raíz:

```sh
npm run install:all
```

### 2) Levantar backend

```sh
npm run dev:backend
```

Salida esperada:
- `Servidor ejecutándose en http://localhost:5001`
- `WebSocket disponible en ws://localhost:5001`

### 3) Levantar frontend

```sh
npm run dev:frontend
```

Entrar en `http://localhost:5173`.

---

## Docker (opcional)

Levanta MongoDB + App + Nginx:

```sh
docker compose up --build
```

- Nginx expone `http://localhost` y redirige a `https://localhost`.
- `nginx.conf` hace proxy de `/api` y `/socket.io` al contenedor de la app.

---

## Notas rápidas

- El frontend guarda la sesión en `localStorage` como `currentUser` (incluye el token JWT).
- La videollamada funciona por “sala” de ticket: `ticket-{ticketId}`.
