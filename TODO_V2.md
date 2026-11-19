# 📋 Plan Maestro de Reconstrucción v2 (`TODO_V2`) — Gestor Multimedia ("Archivo Editorial")

> **Documento de Diseño:** [2026-11-19-gestor-multimedia-v2-design.md](file:///c:/Users/Windows%2011/Documents/pro-n/gestor-multimedia/docs/superpowers/specs/2026-11-19-gestor-multimedia-v2-design.md)  
> **Backend Objetivo:** `monolith-backend` (Fase 21 — **75 endpoints**, OpenAPI 3.1, sin cambios en el backend)  
> **Dirección Visual:** **Opción A — Archivo Editorial** (Modo Claro "Papel y Caliza" + Modo Oscuro "Obsidiana Cálida", `Plus Jakarta Sans` + `IBM Plex Mono`, lomo tipado de 3px, `shortCode` clicable)  
> **Stack v2 (Opción A):** React 19 + Vite 8 + TypeScript + CSS Modules + `react-router` (`BrowserRouter`) + `@tanstack/react-query` + primitivas `radix-ui` sin estilos  
> **Reglas de Ingeniería:** Todos los archivos fuente manuales `< 300` líneas · TSDoc/JSDoc simultáneo · YAGNI · `oxlint` 0/0 · `tsc -b && vite build` limpio · Nueva suite de tests v2 desde cero (restaurando inmutabilidad al finalizar).

---

## 📊 Resumen de Fases

| Fase | Nombre | Enfoque Principal | Estado |
|:---:|---|---|:---:|
| **Fase 0** | Cimientos, Dependencias, SPA Fallback & OpenAPI Fase 21 | Paquetes, `.gitignore`, fallback SPA, fuentes, `types:sync`, `AGENTS.md` | ✅ Completado |
| **Fase 1** | Sistema de Diseño "Archivo Editorial" & Primitivas UI | Tokens Claro/Oscuro, `.interface-design/system.md`, primitivas `radix-ui` | ✅ Completado |
| **Fase 2** | Capa HTTP Sin Estado, TanStack Query, Fase 21 & SSE | Servicios puros, `.json` + `usedAi`, `fetch` SSE Bearer, auth 100% real | ✅ Completado |
| **Fase 3** | Shell de Aplicación, Routing SPA, Login & Paleta `⌘K` | `BrowserRouter` + `React.lazy`, Sidebar 228px, Login real, `⌘K` + `shortCode` | ✅ Completado |
| **Fase 4** | Explorador Unificado por Carpetas (3 Niveles + Bulk) | Raíz solo carpetas, grid/lista, jerarquía 3 niveles, `ai_manager`, Drag & Drop, Bulk | ✅ Completado |
| **Fase 5** | Visores Especializados, Data Studio & Formularios | Inspector Imágenes, Data Studio `.json`, Visor PDF, Formularios en `TABLE` | ✅ Completado |
| **Fase 6** | Notificaciones en Vivo (SSE) & Data Chat RAG (`usedAi`) | Campana SSE en vivo, Data Chat con `usedAi`, citas por página y Widget Público | ✅ Completado |
| **Fase 7** | Gestión de Equipo (`/team`) & Panel Admin (`/admin/*`) | Colaboradores `MANAGER`, Auditoría, API Keys, Disco, Scalar y Salud | ✅ Completado |
| **Fase 8** | Limpieza v1, Suite de Tests v2 & Auditoría Final | Borrado de vistas legacy, tests v2, auditoría React + UI Claro/Oscuro y Build | ✅ Completado |

---

## 🏗️ Fase 0: Cimientos, Dependencias, SPA Fallback y Contrato OpenAPI Fase 21

- [x] **0.1 Limpieza de Repositorio y Dependencias Base**
  - [x] `0.1.1` Agregar artefactos locales que no van al repo (`.agents/`, `skills-lock.json`, `.superpowers/`, `.interface-design/`, `docs/superpowers/`) a `.gitignore`.
  - [x] `0.1.2` Crear rama aislada `refactor/v2` desde `master` (si se trabaja en el mismo repo) para mantener `master` intacto hasta certificar v2.
  - [x] `0.1.3` Instalar dependencias de la Opción A: `react-router`, `@tanstack/react-query` y primitivas accesibles de Radix (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-popover`, `@radix-ui/react-tooltip`, `@radix-ui/react-tabs`, `@radix-ui/react-switch`).
  - [x] `0.1.4` Configurar el fallback SPA para `BrowserRouter` (recarga segura sin 404 en producción): crear `nginx.conf` (`try_files $uri $uri/ /index.html;`) y `public/_redirects` (`/* /index.html 200`), y verificar `vite.config.ts` (code splitting manual por chunks vendor `react`, `router`, `query`, `radix`, `icons`).
- [x] **0.2 Sincronización de Contrato OpenAPI Fase 21 y Gobernanza**
  - [x] `0.2.1` Ejecutar `npm run types:sync` contra `../monolith-backend/openapi.json` para incorporar Fase 21 (tablas `.json` y `usedAi` en `ChatAnswerResponse`) en `src/types/api.generated.ts`.
  - [x] `0.2.2` Actualizar `AGENTS.md` reflejando la arquitectura v2 (`src/features/`, `src/components/ui/`, `src/services/` sin estado, `react-router`, `@tanstack/react-query`) y documentando el reinicio autorizado de la suite de tests v2.
- [x] **0.3 HTML Base, Tipografías y Anti-Flicker de Tema**
  - [x] `0.3.1` Actualizar `index.html`: cargar `Plus Jakarta Sans` (400/500/600/700) e `IBM Plex Mono` (400/500) con `preconnect`, título y metadatos limpios.
  - [x] `0.3.2` Inyectar script inline síncrono en `<head>` de `index.html` que resuelva `data-theme="light" | "dark"` desde `localStorage` o `prefers-color-scheme` antes del primer paint (`rendering-hydration-no-flicker`).

---

## 🎨 Fase 1: Sistema de Diseño "Archivo Editorial" & Primitivas Accesibles (`interface-design`)

- [x] **1.1 Arquitectura de Tokens y Documentación del Sistema**
  - [x] `1.1.1` Crear `.interface-design/system.md` fijando la dirección "Archivo Editorial", escalas tipográficas (~1.25), densidad *workbench-calm* (base 4px), estrategia de profundidad (capas tonales + hairlines `rgba`), paleta dual, lomos tipados y los 5 elementos firma.
  - [x] `1.1.2` Crear `src/styles/tokens.css` definiendo tokens semánticos completos para `[data-theme="light"]` ("Papel y Caliza") y `[data-theme="dark"]` ("Obsidiana Cálida"): `--paper-*`, `--ink-*` (4 niveles), `--hairline*`, `--accent-ink*`, `--spine-*` (container/image/table/pdf/form), `--control-*` (inputs dedicados) y `--status-*` (desaturados en oscuro), más radios concéntricos (`6px / 10px / 14px`) y `color-scheme`.
  - [x] `1.1.3` Reescribir `src/styles/reset.css` y `src/styles/motion.css`: `-webkit-font-smoothing: antialiased`, `text-wrap: balance` en títulos y `pretty` en cuerpo, `tabular-nums` utilitario, animaciones exclusivamente sobre `transform` y `opacity` (`< 220ms`, `cubic-bezier(0.23, 1, 0.32, 1)`), `scale(0.97)` en `:active` y soporte completo de `@media (prefers-reduced-motion: reduce)` (cero `transition: all`).
  - [x] `1.1.4` Crear `src/context/ThemeContext.tsx` y hook `useTheme()` con soporte `light | dark | system`, persistencia en `localStorage` y sincronización reactiva con `matchMedia('(prefers-color-scheme: dark)')`.
- [x] **1.2 Librería de Primitivas UI Reutilizables (`src/components/ui/`, `< 200` LOC c/u)**
  - [x] `1.2.1` `Button.tsx` + `.module.css` (variantes `primary`, `secondary`, `ghost`, `danger`; tamaños `sm`, `md`, `icon`; estados `hover`, `active`, `focus-visible`, `disabled`, `loading`; áreas táctiles >= 40px).
  - [x] `1.2.2` `Dialog.tsx` + `.module.css` sobre Radix Dialog (foco atrapado, `Escape`, retorno de foco, `scale(0.96)` + `opacity`, cabecera y acciones concéntricas).
  - [x] `1.2.3` `DropdownMenu.tsx` y `Popover.tsx` sobre Radix (posicionamiento anti-colisión, navegación con flechas, `transform-origin` desde el trigger).
  - [x] `1.2.4` `Tooltip.tsx`, `Switch.tsx` y `Tabs.tsx` sobre Radix con estilos de tokens editoriales.
  - [x] `1.2.5` `Input.tsx` (superficie `--paper-well` más oscura/empotrada que el lienzo), `Badge.tsx`, `ShortCodeChip.tsx` (firma: chip monoespaciado clicable que copia la URL pública en 1 clic con confirmación inline), `EmptyState.tsx`, `Skeleton.tsx` y `ToastViewport.tsx`.

---

## ⚙️ Fase 2: Capa HTTP Sin Estado, TanStack Query, Fase 21 y Cliente SSE Real

- [x] **2.1 Limpieza de `storageService.ts` y Autenticación 100% Real**
  - [x] `2.1.1` Depurar `src/services/storageService.ts` con caché en memoria (`js-cache-storage`) guardando únicamente sesión (`token`, `user`), preferencias (`theme`, `viewMode`) y `apiBaseUrl` (con fallback a `VITE_API_BASE_URL`). Eliminar por completo las colecciones de entidades (`images`, `tables`, `pdfs`, `folders`, `profiles`) y la `DEFAULT_CONFIG.apiKey` hardcodeada.
  - [x] `2.1.2` Revisar `src/services/apiClient.ts` y `src/services/authService.ts`: asegurar envío estricto de `Authorization: Bearer <token>` con `credentials: 'include'`, cola única de refresh automático ante `401` (`POST /api/v1/auth/refresh`), cero inyección por defecto de `X-API-Key`, soporte limpio de `DELETE` sin `Content-Type` vacío y decodificación completa de RFC 7807 `ProblemDetails`.
  - [x] `2.1.3` Reescribir `src/context/AuthContext.tsx` eliminando el login offline/demo (`dev_jwt_admin_master_token`) y validando la sesión real al arrancar con `GET /api/v1/auth/me` (y `POST /api/v1/auth/refresh` si expiró el access token).
- [x] **2.2 Depuración de Servicios Sin Estado + Novedades Fase 21**
  - [x] `2.2.1` Limpiar efectos secundarios de `localStorage` en `foldersService.ts`, `imagesService.ts`, `tablesService.ts`, `pdfsService.ts`, `usersService.ts`, `formsService.ts`, `bulkService.ts`, `auditService.ts`, `apiKeysService.ts`, `storageStatsService.ts` y `healthService.ts` para que sean clientes HTTP puros tipados.
  - [x] `2.2.2` **Fase 21 — Tablas `.json`:** actualizar `tablesService.ts` (`uploadTable` y `hotSwapTable`) y utilidades de validación de archivos para soportar `.json` (`application/json`) además de `.csv` y `.xlsx`.
  - [x] `2.2.3` **Fase 21 — Indicador `usedAi`:** actualizar `src/types/chat.ts` y `chatService.ts` para tipar y exponer `usedAi: boolean` en respuestas de `/api/v1/chat/ask` y `/api/v1/public/chat/ask`.
  - [x] `2.2.4` **Cliente SSE con cabecera Bearer (`src/services/notificationsStream.ts`):** implementar streaming hacia `GET /api/v1/notifications/stream` usando `fetch` + `ReadableStream` con `Authorization: Bearer <token>`, parser de tramas SSE (`event: notification`, `data: ...`, heartbeats), `AbortController`, reconexión con backoff exponencial y renovación de token ante `401`.
- [x] **2.3 Configuración de `@tanstack/react-query` y Hooks de Dominio (`src/queries/`)**
  - [x] `2.3.1` Crear `src/queries/queryClient.ts` y `src/queries/queryKeys.ts` (claves tipadas para `folders`, `folderTree`, `images`, `tables`, `pdfs`, `forms`, `formEntries`, `notifications`, `users`, `auditLogs`, `apiKeys`, `storageStats`, `health`).
  - [x] `2.3.2` Crear hooks de consulta/mutación por dominio (`useFoldersQueries.ts`, `useMediaQueries.ts`, `useFormsQueries.ts`, `useNotificationsQueries.ts`, `useAdminQueries.ts`) con invalidación precisa, `Promise.all` donde corresponda (cero waterfalls) y actualizaciones optimistas seguras.

---

## 🧭 Fase 3: Shell de Aplicación, Routing SPA (`BrowserRouter`), Login y Paleta `⌘K`

- [x] **3.1 Router SPA y Code Splitting (`React.lazy`)**
  - [x] `3.1.1` Configurar `src/router.tsx` con `BrowserRouter`, guardas de autenticación (`RequireAuth`) y guardas por rol (`RequireRole` para `MANAGER`/`ADMIN` en `/team` y `ADMIN` en `/admin/*`).
  - [x] `3.1.2` Declarar carga diferida (`React.lazy` + `Suspense` con skeletons editoriales) para `/tables/:shortCode`, `/folder/:folderId/forms/:formId`, `/chat`, `/team`, `/admin/*` y los visores pesados (`ImageInspector`, `PdfViewerModal`).
- [x] **3.2 Pantalla de Inicio de Sesión (`/login`)**
  - [x] `3.2.1` Diseñar `src/features/auth/LoginPage.tsx` con estética Archivo Editorial (claro/oscuro automático, foco inmediato en usuario/contraseña, manejo claro de errores `401` y `429 RATE_LIMIT_EXCEEDED`, cero botón de demo offline).
  - [x] `3.2.2` Añadir indicador discreto de conectividad (`GET /health`) y un Popover Radix secundario **"Cambiar servidor API"** que permita editar `apiBaseUrl` antes de iniciar sesión.
- [x] **3.3 App Shell, Barra Lateral (228px) y Paleta Rápida `⌘K`**
  - [x] `3.3.1` Crear `src/features/shell/AppLayout.tsx` + `Sidebar.tsx`: barra lateral fundida al lienzo (`--paper-canvas`, hairline `1px`), marca + botón Claro/Oscuro, botón primario contextual **"+ Subir ..."** (deshabilitado con tooltip en `/`, `CONTAINER` y `READ`/`shared`), ítems `Explorador`, `Data Chat`, `Mi equipo` (`MANAGER`/`ADMIN`) y `Sistema y API` (`ADMIN`), más pie de usuario con `ChangePasswordDialog` y logout real.
  - [x] `3.3.2` Hacer responsive la barra lateral (drawer accesible en pantallas `< 900px`).
  - [x] `3.3.3` Crear `src/features/shell/CommandPalette.tsx` (`⌘K` / `Ctrl+K` con listener global deduplicado `client-event-listeners`): búsqueda instantánea de carpetas/archivos y resolución directa **"Abrir por `shortCode`"** (elige Imagen, Tabla o PDF y abre el visor o `/tables/:shortCode` sin tocar `localStorage`).

---

## 📂 Fase 4: Explorador Unificado por Carpetas (`/` y `/folder/:folderId`)

- [x] **4.1 Cabecera, Migas de Pan y Modos de Vista**
  - [x] `4.1.1` Crear `src/features/explorer/ExplorerHeader.tsx`: breadcrumbs interactivos derivados del árbol (`GET /api/v1/folders/tree`), buscador con `useDeferredValue`, botón `⌘K`, toggle persistido **Cuadrícula / Lista**, botón **`+ Carpeta`** (respeta profundidad < 3 y bloqueo de `COLLABORATOR` en raíz) y `NotificationBell`.
  - [x] `4.1.2` Implementar `ExplorerPage.tsx`:
    - En `/` (**raíz**): renderiza **únicamente carpetas de Nivel 1** (incluyendo `shared`) — cero peticiones de archivos sueltos y cero subidas sin carpeta.
    - En `/folder/:folderId`: carga en paralelo (`Promise.all` vía React Query) el contenido exacto según el tipo de carpeta (`CONTAINER` solo subcarpetas + banner sobrio; `IMAGE` subcarpetas + imágenes; `TABLE` subcarpetas + tablas + formularios vinculados; `PDF` subcarpetas + PDFs).
- [x] **4.2 Tarjetas y Filas con Firma "Archivo Editorial" (`content-visibility: auto`)**
  - [x] `4.2.1` `FolderItemCard.tsx` y fila de lista: lomo izquierdo de 3px según tipo (`--spine-*`), badge `SISTEMA` en `shared`, indicador discreto de privacidad/compartido y menú `⋯` Radix (`Compartir`, `Editar`, `Eliminar` ocultando mutaciones en `isSystem: true` y proteger `General`).
  - [x] `4.2.2` `AssetItemCard.tsx` y `ExplorerListTable.tsx` para Imágenes (miniatura WebP `?variant=thumb`, `loading="lazy"`, contorno 1px inset), Tablas (`.csv/.xlsx/.json`, filas y badge Ficha Técnica), PDFs (páginas, badge `Escaneado`) y Formularios en carpetas `TABLE` (mostrando conteo total `_count.entries` sin N+1 peticiones): clic principal abre el recurso, `ShortCodeChip` copia URL en 1 clic y menú `⋯` Radix agrupa acciones secundarias.
- [x] **4.3 Gestión de Carpetas en 3 Niveles, Compartición y `ai_manager`**
  - [x] `4.3.1` `CreateFolderDialog.tsx`: implementa las reglas exactas de `monolith-backend/src/modules/folders/folders.hierarchy.service.ts` — en raíz y dentro de `CONTAINER` ofrece los 4 tipos (`Contenedor`, `Imágenes`, `Tablas`, `PDFs`); dentro de carpeta tipada hereda y bloquea al tipo del padre; en Nivel 3 bloquea creación (`MAX_FOLDER_DEPTH_EXCEEDED`).
  - [x] `4.3.2` `EditFolderDialog.tsx` y `DeleteFolderDialog.tsx`: protege `isSystem: true` (`shared`) y evita renombrar/eliminar `General`, mostrando advertencia clara de borrado en cascada.
  - [x] `4.3.3` `ShareFolderDialog.tsx`: gestiona membresías (`/folders/:id/shares`), incluye el interruptor de 1 clic **"Publicar en Widget de Chat Web Público (`ai_manager`)"** (`READ`), excluye a `ai_manager` del selector de colaboradores y permite alternar `READ <-> EDIT` o revocar.
  - [x] `4.3.4` `MoveResourceDialog.tsx`: selector jerárquico basado en `GET /api/v1/folders/tree` que filtra exclusivamente carpetas compatibles con el tipo del recurso (`IMAGE`, `TABLE` o `PDF`) y permiso `EDIT`/`ADMIN`.
- [x] **4.4 Subida Contextual Estricta, Drag & Drop y Acciones en Lote (Bulk)**
  - [x] `4.4.1` `UploadDialog.tsx` y `DropzoneOverlay.tsx`: activos solo dentro de carpetas tipadas con `EDIT`/`ADMIN`; restringen extensiones al tipo de carpeta (`IMAGE`, `TABLE` con `.csv/.xlsx/.json`, `PDF`), muestran progreso real por archivo y validan límites (50 MB / 100 MB) antes de subir.
  - [x] `4.4.2` Selección múltiple (`useBulkSelection`) + `BulkActionBar.tsx` flotante en carpetas `IMAGE` y `TABLE` para `bulk-move` y `bulk-delete` (hasta 50 IDs) con reporte detallado de éxitos y errores parciales.

---

## 🔬 Fase 5: Visores Especializados, Data Studio y Formularios Write-Once (Lazy)

- [x] **5.1 Inspector de Imágenes y Mutaciones (`src/features/images/`)**
  - [x] `5.1.1` `ImageInspectorDialog.tsx` (lazy): carga variante original (`/i/:shortCode?v=...`), controles de zoom/ajuste, panel lateral de metadatos (dimensiones, peso, MIME, `ShortCodeChip`) y accesos a Renombrar (`PATCH`), Hot-Swap (`PUT`), Mover y Eliminar.
  - [x] `5.1.2` `RenameAssetDialog.tsx` y `HotSwapAssetDialog.tsx` reutilizables para Imágenes, Tablas (`.csv/.xlsx/.json`) y PDFs (invalidando caché de React Query y refrescando `urlWithVersion`).
- [x] **5.2 Data Studio Pantalla Completa (`/tables/:shortCode` — `src/features/data-studio/`)**
  - [x] `5.2.1` `DataStudioPage.tsx` (lazy): barra superior compacta con botón volver a la carpeta, `ShortCodeChip`, búsqueda con `useDeferredValue`, descarga original (`?download=true`), Hot-Swap (`.csv/.xlsx/.json`) y botón Ficha Técnica.
  - [x] `5.2.2` `DataGrid.tsx`: grilla densa con `tabular-nums`, soporte de `headers` multinivel, `merges` y `cellStyles`, `content-visibility: auto` y paginación server-side fluida.
  - [x] `5.2.3` `TableMetadataDialog.tsx`: editor completo de `metadataCard` (`title`, `description`, `tags`, `unit`, `columnsMeta`, `hasSummaryRows`) vía `PATCH /api/v1/tables/:id/metadata`.
- [x] **5.3 Visor y Metadatos de Documentos PDF (`src/features/pdfs/`)**
  - [x] `5.3.1` `PdfViewerDialog.tsx` (lazy): pestaña **Documento** (`<iframe>` hacia `/p/:shortCode#page=N` con descarga `?download=true`) y pestaña **Texto extraído** (`GET /p/:shortCode?format=text` por página, útil para auditar indexación RAG y detectar `isScanned`).
  - [x] `5.3.2` `PdfMetadataDialog.tsx`: editor de `metadataCard` (`category`, `summary`, `keywords`, `custom`) vía `PATCH /api/v1/pdfs/:id/metadata`.
- [x] **5.4 Formularios Dinámicos y Resolución Write-Once (`/folder/:folderId/forms/:formId` — `src/features/forms/`)**
  - [x] `5.4.1` `CreateFormDialog.tsx`: accesible desde carpetas `TABLE` con `EDIT`; constructor visual de `entryFieldsSchema`, `resolutionFieldsSchema`, `allowedResolutionStates` y `externalTargetUrl`.
  - [x] `5.4.2` `FormInboxPage.tsx` (lazy): cabecera con `FormSubscriptionControl` (`GET/POST/DELETE /api/v1/forms/:id/subscribe` con `notifyOnNewEntry` y `notifyOnResolution`), desglose numérico `NEW / VALID / INVALID`, filtro mensual (`?month=YYYY-MM`) y por estado, exportación `.xlsx`/`.csv`, y botón **Integrar en web** (modal con endpoint y snippet `fetch` para `POST /api/v1/public/forms/:slug/entries`).
  - [x] `5.4.3` `ResolveEntryDialog.tsx`: formulario dinámico de dictamen *write-once* (`PATCH /api/v1/forms/entries/:id/resolve`), manejo explícito de `409 ENTRY_ALREADY_RESOLVED` y acción de reenvío bajo demanda (`POST /api/v1/forms/entries/:id/dispatch`) para entradas selladas.

---

## 🔔 Fase 6: Notificaciones en Vivo (SSE) & Data Chat RAG (`usedAi`)

- [x] **6.1 Bandeja de Notificaciones In-App en Tiempo Real (`src/features/notifications/`)**
  - [x] `6.1.1` Hook `useLiveNotifications.ts`: inicia `fetch` SSE (`Authorization: Bearer`) al autenticarse, actualiza el cache de TanStack Query (`unreadCount` + lista) al recibir `event: notification` y muestra un Toast no intrusivo.
  - [x] `6.1.2` `NotificationBell.tsx` + `NotificationsPopover.tsx` (Radix Popover): badge numérico tabular, tabs `Todas / No leídas`, botón "Marcar todas como leídas" (`PATCH /read-all`), marcar individual (`PATCH /:id/read`), eliminar (`DELETE /:id`) y clic sobre notificación de formulario navegando directo a `/folder/:folderId/forms/:formId` (resolviendo `folderId` desde el formulario).
- [x] **6.2 Consulta Inteligente / Data Chat (`/chat` — `src/features/chat/`)**
  - [x] `6.2.1` `DataChatPage.tsx` (lazy): diseño limpio de conversación con selector de alcance (Todo mi espacio / Carpeta específica / Recurso), chips de sugerencias (`GET /api/v1/public/chat/suggestions`) y estado de carga sin bloqueos (`useTransition`).
  - [x] `6.2.2` `ChatMessageBubble.tsx`: muestra **insignia explícita de origen `usedAi` (Fase 21)** ("Generado con IA" cuando `usedAi: true` vs "Respuesta directa del sistema" cuando `usedAi: false`), citas clicables (`ChatSourcesList.tsx` — tablas abren `/tables/:shortCode`, PDFs abren `PdfViewerDialog` en la página exacta `pages[0]`) y gráfico limpio cuando viene `chartData` (`ChatBarChart.tsx`).
  - [x] `6.2.3` `PublicWidgetDrawer.tsx`: probador en vivo contra `POST /api/v1/public/chat/ask` (también mostrando `usedAi`) y generador de snippet HTML/React listo para incrustar en sitios externos.

---

## 🛡️ Fase 7: Gestión de Equipo (`/team`) y Panel de Administración (`/admin/*`)

- [x] **7.1 Mi Equipo (`/team` — `MANAGER` y `ADMIN`, `src/features/team/`)**
  - [x] `7.1.1` `TeamPage.tsx` (lazy): tabla limpia de colaboradores (`GET /api/v1/users`), modal de alta respetando jerarquía (`MANAGER` crea solo `COLLABORATOR`; `ADMIN` crea `MANAGER` y `COLLABORATOR`), toggle Activar/Suspender (`PATCH /:id/status`), modal Reset de Contraseña (`PATCH /:id/password`) y confirmación de borrado en cascada (`DELETE /:id`, protegiendo cuentas de sistema como `ai_manager` y auto-eliminación).
  - [x] `7.1.2` Pestaña secundaria de **Actividad y Cuota** del equipo consumiendo `GET /api/v1/audit-logs` y `GET /api/v1/stats/storage` con el alcance natural que devuelve el backend para `MANAGER`.
- [x] **7.2 Sistema y API (`/admin/*` — Exclusivo `ADMIN`, `src/features/admin/`)**
  - [x] `7.2.1` `AdminPage.tsx` (lazy) con navegación por pestañas en URL (`/admin/users`, `/admin/audit`, `/admin/api-keys`, `/admin/storage`, `/admin/system`).
  - [x] `7.2.2` **Auditoría (`/admin/audit`):** tabla filtrable por acción/recurso con paginación server-side (`GET /api/v1/audit-logs`).
  - [x] `7.2.3` **API Keys (`/admin/api-keys`):** emisión (`POST /api/v1/api-keys`, mostrando el secreto una sola vez con copia segura), listado con prefijo `mk_live_` y `lastUsedAt` (`GET`) y revocación (`DELETE`).
  - [x] `7.2.4` **Almacenamiento (`/admin/storage`):** desglose BD + salud de disco físico (`disk`), top carpetas más pesadas y alerta preventiva cuando `warning: true` (`GET /api/v1/stats/storage`).
  - [x] `7.2.5` **Sistema y API (`/admin/system`):** edición de URL base del backend, diagnóstico detallado de `/health`, previsualizador rápido por `shortCode` (`/i/`, `/t/`, `/p/`), acceso/visor interactivo Scalar (`/docs`) y descarga de `/openapi.json`.

---

## 🧪 Fase 8: Limpieza Legacy, Nueva Suite de Tests v2 y Certificación Integral

- [x] **8.1 Eliminación de Código Legacy v1**
  - [x] `8.1.1` Eliminar vistas obsoletas (`ImagesView`, `TablesCatalogView`, `PdfsCatalogView`, `UnifiedExplorerView` v1, `UserProfilesView`, `AuditLogsView`, `SettingsView`, `FormsStudioView`, `ChatStudioView` antiguas) y sus módulos CSS/tests legacy.
  - [x] `8.1.2` Verificar que no queden imports huérfanos, estilos inline (`style={{}}`) repetitivos, colores hex hardcodeados en `.tsx` ni reglas `transition: all`.
- [x] **8.2 Nueva Suite de Pruebas Automatizadas v2 (Vitest + Testing Library)**
  - [x] `8.2.1` **Tests de capa de servicios sin estado (`src/services/*.test.ts`):** `apiClient` (refresh queue 401, RFC 7807, DELETE sin body), `authService`, `foldersService` (3 niveles, `/tree`, shares + `ai_manager`), `imagesService`, `tablesService` (incluyendo Fase 21 `.json` upload/hot-swap), `pdfsService`, `formsService` (write-once `409`, dispatch, export), `chatService` (`usedAi` true/false), `notificationsService` + `notificationsStream` (`fetch` ReadableStream SSE con header Bearer), `usersService`, `auditService`, `apiKeysService`, `storageStatsService`, `healthService`.
  - [x] `8.2.2` **Tests de flujos críticos de UI (`src/features/**/*.test.tsx`):**
    - Login real + cambio de URL del servidor (sin demo offline).
    - Cambio de tema Claro / Oscuro y persistencia.
    - Explorador: raíz solo con carpetas, navegación a carpetas N1/N2/N3, reglas de `CreateFolderDialog`, bloqueo de subida en raíz/`CONTAINER`/`READ`, subida contextual en `IMAGE`/`TABLE`(`.json`)/`PDF`, `ShortCodeChip` copia URL, compartición con `ai_manager` y Bulk Actions.
    - Data Studio, Visor PDF con texto extraído, Formularios write-once + suscripción, Data Chat con `usedAi`, Notificaciones SSE en vivo y rutas protegidas por rol (`COLLABORATOR`, `MANAGER`, `ADMIN`).
  - [x] `8.2.3` Restaurar y confirmar en `AGENTS.md` la inmutabilidad estricta sobre la nueva suite de tests v2 congelada.
- [x] **8.3 Auditoría de Rendimiento, Diseño y Certificación de Producción**
  - [x] `8.3.1` **Auditoría React (`vercel-react-best-practices`):** verificar división de chunks en `npm run build` (bundle inicial drásticamente menor a 550 kB), cero waterfalls, cero lecturas `localStorage` en render, listas con `content-visibility: auto`.
  - [x] `8.3.2` **Auditoría Visual (`interface-design`):** auditoría completa de tokens Claro/Oscuro (0 tokens indefinidos tras limpiar `reset.css`), contraste WCAG AA/AAA, 5 elementos signature y breakpoints móviles (`<= 640px` unificados en todas las páginas). *(Nota: la captura en Chrome vivo requirió `chrome://inspect/#remote-debugging` inactivo en el host).*
  - [x] `8.3.3` **Certificación final:** `npm run test` (100% en verde, 0 fallos), `npm run lint` (0 advertencias, 0 errores), `npm run build` (0 errores TypeScript/Vite) y verificación automática de **0 archivos manuales `>= 300` líneas** en `src/`.
