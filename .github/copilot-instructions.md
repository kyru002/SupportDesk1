# AI Agent Coding Instructions

## Project Overview
This is a **Vue 3 + Express.js ticket management system** with integrated WebRTC video calling, real-time messaging, and invoice (albarani) tracking. The stack combines MongoDB persistence with Socket.io for live features.

**Core Entities:** Tickets → Technicians → Clients → Invoices (Albaranes)

---

## Architecture Essentials

### Backend Structure (Express.js + MongoDB)
- **Entry Point:** [server.js](../backend/server.js) - Initializes Express, Socket.io server, MongoDB connection
- **Database:** [database.js](../backend/database.js) - MongoDB connection (local: `mongodb://127.0.0.1:27017/MyApp`)
- **Models:** [backend/models/](../backend/models/) - Mongoose schemas (Ticket, Cliente, Tecnico, Albarani)
- **Routes:** [backend/routes/](../backend/routes/) - RESTful endpoints for each entity
- **Critical Pattern:** Routes **must be ordered** with specific paths before generic `/:id` patterns (see [albaranes.js](../backend/routes/albaranes.js))

### Frontend Architecture (Vue 3 + Vite + Pinia)
- **Entry Point:** [main.js](../frontend/src/main.js) - Vue app initialization with Pinia store
- **State Management:** [appStore.js](../frontend/src/stores/appStore.js) - Centralized Pinia store with `fetchAll()` parallel fetching pattern
- **API Service:** [api.js](../frontend/src/services/api.js) - Axios client with service objects (ticketsService, tecnicosService, etc.)
- **Routing:** [router/index.js](../frontend/src/router/index.js) - Protected routes with `requiresAuth` meta guard
- **UI Framework:** Tailwind CSS + Lucide Vue icons

### Real-Time Features (WebRTC + Socket.io)
- **Socket.io Setup:** Integrated in [server.js](../backend/server.js) line 3-13, handles video calls and presence
- **Event Pattern:** `join-ticket-room` (joins room `ticket-{ticketId}`), `call-offer/answer` (WebRTC negotiation), `user-joined` (broadcast)
- **Frontend Integration:** Socket.io client in views (e.g., [TicketDetail.vue](../frontend/src/views/TicketDetail.vue)) with RTCPeerConnection

---

## Critical Data Flow & ID Handling

### MongoDB ID Mapping ⚠️ ESSENTIAL
- **Stored in DB:** MongoDB ObjectId field `_id`
- **API Returns:** Always uses `_id` (not `id`)
- **Frontend Must:** Access properties as `item._id`, never assume `id`
- **Recent Fix:** ~50 lines updated across appStore.js, Clients.vue, Tickets.vue to use `._id`
- **Example:** When accessing ticket in list: `ticket._id`, not `ticket.id`

### Ticket Entity Structure (Primary Object)
```javascript
{
  _id: ObjectId,
  title, description,
  cliente: ObjectId,          // Reference to Cliente
  tecnico: ObjectId,          // Reference to Tecnico (optional)
  status: ["abierto", "en progreso", "cerrado"],
  priority: ["alta", "media", "baja"],
  startDate, endDate,
  messages: [{author, role, content, timestamp}]  // Chat history
}
```

---

## Developer Workflows

### Local Development Setup
```bash
# Root directory - install all dependencies
npm run install:all

# Terminal 1: Backend (runs on :5001)
npm run dev:backend

# Terminal 2: Frontend (runs on :5173)
npm run dev:frontend

# Alternative: Single script (requires chmod +x)
./start-app.sh
```

### Build Commands
- **Backend:** `npm run dev` (uses nodemon for auto-reload)
- **Frontend:** `npm run dev` (Vite dev server), `npm run build` (production build)

### Database
- **Local MongoDB:** Must be running on `localhost:27017`
- **Database Name:** `MyApp`
- **Collections:** Generated from Mongoose models (tickets, clientes, tecnicos, albaranes)

---

## Project-Specific Conventions

### Naming & Naming Conflicts
- **Spanish terminology preserved:** "técnico" (technician), "cliente" (client), "albarani" (invoice), not anglicized
- **Route paths:** Spanish (`/api/tecnicos`, `/api/clientes`, `/api/albaranes`)
- **Field names in API:** Spanish (`tecnico`, `cliente`, `status`, `prioridad`)
- **Vue component names:** English (Technicians.vue, Clients.vue) but internal model references are Spanish

### Frontend Patterns
1. **Pinia Store Actions:** Use `Promise.allSettled()` for parallel requests with individual error handling (see [appStore.js](../frontend/src/stores/appStore.js) `fetchAll()`)
2. **List Rendering:** Always destructure `item._id` for keys: `:key="item._id"`
3. **Form Binding:** v-model with object spread: `:value="newItem"` → use `Object.assign()` on update
4. **Route Protection:** Relies on localStorage `currentUser` JSON object, checked in router guard

### Backend Patterns
1. **Route Organization:** Specific paths (`/estado/:estado`) BEFORE generic (`/:id`) to avoid capture
2. **Middleware Order:** CORS → JSON parsing → route handlers
3. **Socket.io Rooms:** Keyed by `ticket-{ticketId}`, used for broadcasts to specific ticket participants

---

## Common Integration Points

### Adding a New CRUD Feature
1. **Backend:** Create model in [backend/models/](../backend/models/), route in [backend/routes/](../backend/routes/), add to socket if real-time needed
2. **Frontend:** Add service in [api.js](../frontend/src/services/api.js), actions in [appStore.js](../frontend/src/stores/appStore.js), route in [router/index.js](../frontend/src/router/index.js)
3. **Store:** Property name should match lowercase entity (e.g., `albaranes: []`)
4. **MongoDB ID:** Always map `_id` → use in conditionals and keys

### Modifying Ticket Structure
- Ticket is the central entity; changes cascade to: routes, socket handlers, store, TicketDetail view
- Messages array is built-in; use `sendMessage` endpoint
- Video calls tied to ticket room via Socket.io

---

## Known Issues & Workarounds

| Issue | Status | Notes |
|-------|--------|-------|
| MongoDB must be local | Open | Change URI in [database.js](../backend/database.js) for remote |
| No authentication beyond localStorage | Open | Add JWT when security needed |
| CORS set to `"*"` | Open | Restrict in production [server.js](../backend/server.js) line 10 |
| WebRTC STUN servers hard-coded | Open | Make configurable via env variables |

---

## Quick Reference: Key Files by Task

- **Fix data not appearing:** Check `_id` usage in [appStore.js](../frontend/src/stores/appStore.js) or component v-model bindings
- **Add API endpoint:** Update [backend/routes/](../backend/routes/) + corresponding service in [api.js](../frontend/src/services/api.js)
- **Style changes:** [assets/main.css](../frontend/src/assets/main.css) (global) or scoped `<style>` in .vue files
- **Real-time feature:** Add socket handler in [server.js](../backend/server.js) + listener in relevant view
- **Debug store:** Check localStorage `currentUser` and store state in browser DevTools → Pinia tab
