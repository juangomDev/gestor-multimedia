# Bóveda — Gestor Multimedia & Data Studio (v2)

Cliente web **v2 ("Archivo Editorial")** construido con **React 19**, **Vite 8**, **TypeScript**, **TanStack Query v5**, **React Router v7**, **Radix UI** y **CSS Modules**, conectado al backend monolítico `monolith-backend`.

## Capacidades principales

- **Explorador unificado en 3 niveles (`/`, `/folder/:folderId`):** carpetas tipadas (`CONTAINER`, `IMAGE`, `TABLE`, `PDF`), vistas Grid/Lista, permisos RBAC (`READ`/`EDIT`/`ADMIN`), compartición con colaboradores y publicación en `ai_manager`, Drag & Drop contextual y acciones en lote (hasta 50 elementos).
- **Visores especializados con carga diferida (`React.lazy`):**
  - **Imágenes:** variantes WebP (`?variant=thumb` / `original`), zoom interactivo, renombrado y reemplazo binario Hot-Swap.
  - **Data Studio (`/tables/:shortCode`):** tablas `.csv`, `.xlsx`, `.xls` y `.json` con cabeceras multinivel, estilos, paginación server-side y Ficha Técnica semántica.
  - **PDFs:** previsualización binaria vía `blob:` (`#page=N`), auditoría de texto extraído por página (`?format=text`), detección de documentos escaneados y metadatos.
  - **Formularios (`/folder/:folderId/forms/:formId`):** bandeja *write-once*, filtros mensuales/estado, despacho de webhooks, suscripciones e integración web.
- **Data Chat RAG (`/chat`):** consultas analíticas por espacio, carpeta o recurso con trazabilidad `usedAi`, gráficos, citas clicables y **Widget Público**.
- **Notificaciones en vivo (SSE):** flujo `fetch` + `ReadableStream` con `Authorization: Bearer` y campana contextual en tiempo real.
- **Equipo y Administración (`/team`, `/admin/*`):** gestión de colaboradores (`MANAGER`/`ADMIN`), logs de auditoría, API Keys, cuotas de almacenamiento y diagnóstico de salud (`/health`).
- **Sistema de diseño "Archivo Editorial":** tema Claro y Oscuro con tokens semánticos en `src/styles/tokens.css`, primitivas accesibles sobre `@radix-ui/react-*` y paleta rápida `⌘K` / `Ctrl+K`.

## Arquitectura

```plaintext
src/
├── types/          # Contratos OpenAPI (api.generated.ts) y tipos por dominio
├── styles/         # tokens.css (Claro/Oscuro), reset.css, motion.css
├── services/       # Clientes HTTP sin estado (Bearer JWT + credentials: 'include') y SSE
├── queries/        # queryClient, queryKeys y hooks de TanStack Query v5
├── context/        # ThemeContext, AuthContext y ToastContext
├── components/ui/  # Primitivas accesibles sobre @radix-ui/react-*
├── features/       # auth, shell, explorer, images, data-studio, pdfs, forms, notifications, chat, team, admin
├── router.tsx      # BrowserRouter + guardas RequireAuth/RequireRole + React.lazy
└── utils/          # formatters y clipboard
```

Consulta las reglas de arquitectura e ingeniería en [AGENTS.md](./AGENTS.md).

## Variables de entorno

Copia `.env.example` a `.env` (archivo local ignorado por Git) y define la URL base del backend:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

La autenticación en v2 es 100 % real mediante JWT (`Authorization: Bearer`) + cookie de refresco (`credentials: 'include'`), sin modo demo offline ni `VITE_API_KEY` embebida.

## Comandos

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Linter ultrarrápido (oxlint)
npm run lint

# Suite de pruebas (Vitest)
npm run test

# Verificación de tipos y build de producción
npm run build

# Sincronizar tipos OpenAPI desde monolith-backend
npm run types:sync
```
