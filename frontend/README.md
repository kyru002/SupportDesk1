# Frontend (Vue 3 + Vite)

Este directorio contiene el **frontend** del proyecto.

- Documentación completa y guía de arranque: ver el README principal en la raíz del repositorio.

## Desarrollo

```sh
npm install
npm run dev
```

El servidor de Vite levanta por defecto en `http://localhost:5173` y hace proxy a:

- `/api` → `http://127.0.0.1:5001`
- `/socket.io` → WebSocket hacia `http://127.0.0.1:5001`

## Usuarios de prueba

Si el backend está arrancado, se crean/sincronizan cuentas demo automáticamente:

- `admin@support.com` / `admin123`
- `tecnico@support.com` / `tecnico123`