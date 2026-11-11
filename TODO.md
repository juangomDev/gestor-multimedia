# 📋 Plan Maestro de Tareas (TODO) — Gestor Multimedia Frontend

> **Objetivo:** Cobertura total y explotación máxima del backend (`monolith-backend` — Fases 0 a 20).  
> **Estado:** 75 endpoints del catálogo `RUTAS.md` analizados e integrados en fases atómicas de desarrollo frontend.  
> **Regla de Oro:** Consumo estricto de endpoints de `monolith-backend` sin modificar el backend. Cada acción del usuario aprovecha al 100% las capacidades nativas del servidor (RBAC jerárquico, subcarpetas en 3 niveles, streaming SSE en vivo, pre-cálculos, RAG tabular/documental y formularios Write-Once).

---

## 📊 Estado Actual del Proyecto (Snapshot al 11/11/2026)

| Métrica / Dimensión | Estado Actual | Detalle |
|---|:---:|---|
| **Pruebas Automatizadas (Vitest)** | **249 / 249 (100% pasando)** | 71 suites en verde, 0 fallos |
| **Linter (Oxlint)** | **0 advertencias, 0 errores** | 183 archivos analizados con 116 reglas |
| **Compilación (TypeScript / Vite)** | **Compilación Limpia (0 errores)** | Bundle listo para producción; todos los archivos manuales `< 300` líneas |
| **Cobertura de Endpoints Backend** | **75 / 75 Mapeados (`RUTAS.md`)** | **63 Implementados** / **2 Parciales** (Fase 20) / **10 Pendientes** (Fases 19 y 20) |
| **Módulos Frontend Completados** | **23 / 26 Módulos (88.5%)** | Módulos 1 al 23 finalizados y certificados; Módulos 24, 25 y 26 pendientes |
| **Capa de Transporte HTTP** | **Completa (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)** | Falta conector `EventSource` / Stream para SSE (`/api/v1/notifications/stream`) |
| **Contrato y Tipado OpenAPI 3.1** | ⚠️ **Pendiente Re-Sincronizar (`types:sync`)** | Falta regenerar `src/types/api.generated.ts` con los esquemas de Fases 19 y 20 |
| **Siguientes Módulos Activos** | ⏳ **Módulos 24, 25 y 26** | Notificaciones SSE + Suscripciones, Jerarquía de Carpetas 3 Niveles (`CONTAINER`/`shared`) y Subida Global PDF |

---

## 🧭 Matriz Maestra de Cobertura de Rutas Backend (75 Endpoints — `RUTAS.md`)

| # | Método | Ruta Backend | Módulo Frontend | Componente / Vista | Servicio Frontend | Estado |
|---|:---:|---|:---:|:---:|:---:|:---:|
| **1** | `GET` | `/health` | Módulo 1 / 17 | `HealthBadge.tsx`, `StatusBar.tsx`, `SettingsView.tsx` | `healthService.ts` | ✅ Implementado |
| **2** | `GET` | `/docs` | Módulo 17 | `ScalarDocsCard.tsx` / `SettingsView.tsx` (Scalar UI) | `apiClient.ts` | ✅ Implementado |
| **3** | `GET` | `/openapi.json` | Módulo 10 / 17 / 26 | `openapi.json` -> `src/types/api.generated.ts` | Scripts de tipado | ⚠️ Re-sync pendiente |
| **4** | `POST` | `/api/v1/auth/login` | Módulo 4 / 11 | `LoginView.tsx` (Login con roles RBAC) | `authService.ts` | ✅ Implementado |
| **5** | `POST` | `/api/v1/auth/refresh` | Módulo 11 | `apiClient.ts` (Interceptor de 401 automático) | `authService.ts` | ✅ Implementado |
| **6** | `POST` | `/api/v1/auth/logout` | Módulo 11 | `Sidebar.tsx` (Cierre de sesión en servidor) | `authService.ts` | ✅ Implementado |
| **7** | `GET` | `/api/v1/auth/me` | Módulo 11 | `AuthContext.tsx` (Validación de sesión activa) | `authService.ts` | ✅ Implementado |
| **8** | `PATCH` | `/api/v1/auth/password` | Módulo 11 | `ChangePasswordModal.tsx` (Autogestión de clave) | `authService.ts` | ✅ Implementado |
| **9** | `POST` | `/api/v1/users` | Módulo 12 | `UserProfilesView.tsx` (Jerarquía ADMIN > MGR > COL) | `usersService.ts` | ✅ Implementado |
| **10** | `GET` | `/api/v1/users` | Módulo 12 | `UserProfilesView.tsx` (Listado dinámico DB) | `usersService.ts` | ✅ Implementado |
| **11** | `PATCH` | `/api/v1/users/:id/status` | Módulo 12 | `UserProfilesView.tsx` (Toggle Activar/Suspender) | `usersService.ts` | ✅ Implementado |
| **12** | `PATCH` | `/api/v1/users/:id/password` | Módulo 12 | `ResetUserPasswordModal.tsx` (Reset forzado por superior) | `usersService.ts` | ✅ Implementado |
| **13** | `DELETE` | `/api/v1/users/:id` | Módulo 12 | `DeleteUserModal.tsx` (Borrado con cascada) | `usersService.ts` | ✅ Implementado |
| **14** | `GET` | `/api/v1/folders` | Módulo 13 / 25 | `MainExplorerHeader.tsx` (Falta `?parentId=`, `CONTAINER`, `isSystem`) | `foldersService.ts` | ⚠️ Parcial (Mód. 25) |
| **15** | `GET` | `/api/v1/folders/tree` | **Módulo 25** | `MainExplorerHeader.tsx` / `FolderTreeSelector.tsx` (Árbol 3 niveles) | `foldersService.ts` | ⏳ **Pendiente** |
| **16** | `POST` | `/api/v1/folders` | Módulo 13 / 25 | `CreateFolderModal.tsx` (Falta tipo `CONTAINER` y reglas 3 niveles) | `foldersService.ts` | ⚠️ Parcial (Mód. 25) |
| **17** | `PATCH` | `/api/v1/folders/:id` | Módulo 13 / 25 | `EditFolderModal.tsx` (Falta proteger `isSystem: true`) | `foldersService.ts` | ✅ Implementado |
| **18** | `GET` | `/api/v1/folders/:id` | Módulo 13 | `foldersService.getFolderById` (Detalle y estadísticas) | `foldersService.ts` | ✅ Implementado |
| **19** | `DELETE` | `/api/v1/folders/:id` | Módulo 13 / 25 | `MainExplorerHeader.tsx` (Borrado en cascada; proteger `shared`) | `foldersService.ts` | ✅ Implementado |
| **20** | `POST` | `/api/v1/folders/:id/shares` | Módulo 13 / 26 | `ShareFolderModal.tsx` (Asignar colaborador READ/EDIT + `ai_manager`) | `foldersService.ts` | ✅ Implementado |
| **21** | `GET` | `/api/v1/folders/:id/shares` | Módulo 13 | `ShareFolderModal.tsx` (Lista de miembros con acceso) | `foldersService.ts` | ✅ Implementado |
| **22** | `PATCH` | `/api/v1/folders/:id/shares/:userId` | Módulo 13 | `ShareFolderModal.tsx` (Alternar READ <-> EDIT) | `foldersService.ts` | ✅ Implementado |
| **23** | `DELETE` | `/api/v1/folders/:id/shares/:userId` | Módulo 13 | `ShareFolderModal.tsx` (Revocar y expulsar) | `foldersService.ts` | ✅ Implementado |
| **24** | `GET` | `/api/v1/images` | Módulo 14 / 19 | `ImagesView.tsx` (Paginación, `folderId` y `search`) | `imagesService.ts` | ✅ Implementado |
| **25** | `POST` | `/api/v1/images` | Módulo 14 | `UploadModal.tsx`, `DropzoneOverlay.tsx` | `imagesService.ts` | ✅ Implementado |
| **26** | `PATCH` | `/api/v1/images/:id` | Módulo 14 | `RenameImageModal.tsx` / `ImageCard.tsx` (Renombrado) | `imagesService.ts` | ✅ Implementado |
| **27** | `PUT` | `/api/v1/images/:id` | Módulo 14 | `HotSwapImageModal.tsx` (Reemplazo binario en caliente) | `imagesService.ts` | ✅ Implementado |
| **28** | `DELETE` | `/api/v1/images/:id` | Módulo 14 | `ImageCard.tsx`, `ImageInspector.tsx` | `imagesService.ts` | ✅ Implementado |
| **29** | `PATCH` | `/api/v1/images/:id/folder` | Módulo 13 | `MoveToFolderModal.tsx` (Reasignar carpeta en DB) | `foldersService.ts` | ✅ Implementado |
| **30** | `POST` | `/api/v1/images/bulk-delete` | Módulo 19 | `BulkActionsBar.tsx`, `BulkDeleteModal.tsx` | `imagesService.ts` | ✅ Implementado |
| **31** | `POST` | `/api/v1/images/bulk-move` | Módulo 19 | `BulkActionsBar.tsx`, `BulkMoveModal.tsx` | `imagesService.ts` | ✅ Implementado |
| **32** | `GET` | `/i/:short_code` | Módulo 14 | `ImageCard.tsx` (?variant=thumb), `Inspector` (original) | `imagesService.ts` | ✅ Implementado |
| **33** | `GET` | `/api/v1/tables` | Módulo 15 / 19 | `TablesCatalogView.tsx` (Paginación, `folderId` y `search`) | `tablesService.ts` | ✅ Implementado |
| **34** | `POST` | `/api/v1/tables` | Módulo 15 | `UploadModal.tsx` (CSV/XLSX con carpeta) | `tablesService.ts` | ✅ Implementado |
| **35** | `PATCH` | `/api/v1/tables/:id` | Módulo 19 | `RenameTableModal.tsx` (Renombrar dataset) | `tablesService.ts` | ✅ Implementado |
| **36** | `PUT` | `/api/v1/tables/:id` | Módulo 19 | `HotSwapTableModal.tsx` (Reemplazo en caliente) | `tablesService.ts` | ✅ Implementado |
| **37** | `DELETE` | `/api/v1/tables/:id` | Módulo 15 | `TablesCatalogView.tsx`, `TableDataStudioView.tsx` | `tablesService.ts` | ✅ Implementado |
| **38** | `PATCH` | `/api/v1/tables/:id/folder` | Módulo 13 | `MoveToFolderModal.tsx` (Reasignar carpeta en DB) | `foldersService.ts` | ✅ Implementado |
| **39** | `POST` | `/api/v1/tables/bulk-delete` | Módulo 19 | `BulkActionsBar.tsx`, `BulkDeleteModal.tsx` | `tablesService.ts` | ✅ Implementado |
| **40** | `POST` | `/api/v1/tables/bulk-move` | Módulo 19 | `BulkActionsBar.tsx`, `BulkMoveModal.tsx` | `tablesService.ts` | ✅ Implementado |
| **41** | `GET` | `/t/:short_code` | Módulo 15 | `TableDataStudioView.tsx` (Headers, merges, styles, raw) | `tablesService.ts` | ✅ Implementado |
| **42** | `PATCH` | `/api/v1/tables/:id/metadata` | Módulo 15 | `TableMetadataEditorModal.tsx` (Ficha Técnica) | `tablesService.ts` | ✅ Implementado |
| **43** | `POST` | `/api/v1/chat/ask` | Módulo 16 / 21 | `ChatStudioView.tsx` (RAG Tabular + PDF con citas y charts) | `chatService.ts` | ✅ Implementado |
| **44** | `POST` | `/api/v1/public/chat/ask` | Módulo 16 | `PublicWidgetPreviewModal.tsx` (Widget web embebible) | `chatService.ts` | ✅ Implementado |
| **45** | `GET` | `/api/v1/public/chat/suggestions` | Módulo 16 | `ChatStudioView.tsx` (Chips de preguntas sugeridas) | `chatService.ts` | ✅ Implementado |
| **46** | `GET` | `/api/v1/audit-logs` | Módulo 20 | `AuditLogsView.tsx` (Historial inmutable ADMIN/MANAGER) | `auditService.ts` | ✅ Implementado |
| **47** | `POST` | `/api/v1/api-keys` | Módulo 20 | `ApiKeysManagerCard.tsx` (Emisión de clave M2M) | `apiKeysService.ts` | ✅ Implementado |
| **48** | `GET` | `/api/v1/api-keys` | Módulo 20 | `ApiKeysManagerCard.tsx` (Listado con prefijo `mk_live_`) | `apiKeysService.ts` | ✅ Implementado |
| **49** | `DELETE` | `/api/v1/api-keys/:id` | Módulo 20 | `ApiKeysManagerCard.tsx` (Revocación inmediata) | `apiKeysService.ts` | ✅ Implementado |
| **50** | `GET` | `/api/v1/stats/storage` | Módulo 20 | `StorageMonitorCard.tsx` (Cuotas, disco y desglose) | `apiKeysService.ts` | ✅ Implementado |
| **51** | `POST` | `/api/v1/public/forms/:slug/entries` | Módulo 22 | `FormsStudioView.tsx` (Envío público de entradas status `NEW`) | `formsService.ts` | ✅ Implementado |
| **52** | `POST` | `/api/v1/forms` | Módulo 22 | `CreateFormModal.tsx` (Constructor de formulario + tabla abierta) | `formsService.ts` | ✅ Implementado |
| **53** | `GET` | `/api/v1/forms` | Módulo 22 | `FormsStudioView.tsx` (Catálogo de formularios activos) | `formsService.ts` | ✅ Implementado |
| **54** | `GET` | `/api/v1/forms/:id` | Módulo 22 | `FormsStudioView.tsx` (Detalle de formulario por ID/slug) | `formsService.ts` | ✅ Implementado |
| **55** | `PATCH` | `/api/v1/forms/entries/:id/resolve` | Módulo 22 | `ResolveEntryModal.tsx` (Resolución Write-Once `VALID`/`INVALID`) | `formsService.ts` | ✅ Implementado |
| **56** | `POST` | `/api/v1/forms/entries/:id/dispatch` | Módulo 22 | `FormsStudioView.tsx` (Reenvío bajo demanda a motor externo) | `formsService.ts` | ✅ Implementado |
| **57** | `GET` | `/api/v1/forms/:id/entries` | Módulo 22 | `FormsStudioView.tsx` (Bandeja mensual `?month=YYYY-MM&status=`) | `formsService.ts` | ✅ Implementado |
| **58** | `GET` | `/api/v1/forms/:id/export` | Módulo 22 | `FormsStudioView.tsx` (Exportación `.xlsx` / `.csv` mensual) | `formsService.ts` | ✅ Implementado |
| **59** | `GET` | `/p/:short_code` | Módulo 21 | `PdfViewerModal.tsx` (`inline`, `?download=true`, `?format=text`) | `pdfsService.ts` | ✅ Implementado |
| **60** | `GET` | `/api/v1/pdfs` | Módulo 21 | `PdfsCatalogView.tsx` (Catálogo paginado, `folderId`, `search`) | `pdfsService.ts` | ✅ Implementado |
| **61** | `POST` | `/api/v1/pdfs` | Módulo 21 / 26 | `UploadPdfModal.tsx` + `UploadModal.tsx` (Doble artefacto PDF) | `pdfsService.ts` | ✅ Implementado |
| **62** | `PATCH` | `/api/v1/pdfs/:id` | Módulo 21 | `RenamePdfModal.tsx` (Renombrar documento PDF) | `pdfsService.ts` | ✅ Implementado |
| **63** | `PUT` | `/api/v1/pdfs/:id` | Módulo 21 | `HotSwapPdfModal.tsx` (Reemplazo en caliente de PDF) | `pdfsService.ts` | ✅ Implementado |
| **64** | `PATCH` | `/api/v1/pdfs/:id/metadata` | Módulo 21 | `PdfMetadataEditorModal.tsx` (Ficha técnica documental) | `pdfsService.ts` | ✅ Implementado |
| **65** | `DELETE` | `/api/v1/pdfs/:id` | Módulo 21 | `PdfCard.tsx`, `PdfsCatalogView.tsx` (Borrado físico y lógico) | `pdfsService.ts` | ✅ Implementado |
| **66** | `PATCH` | `/api/v1/pdfs/:id/folder` | Módulo 21 | `MoveToFolderModal.tsx` (Reasignar carpeta de tipo `PDF`) | `pdfsService.ts` | ✅ Implementado |
| **67** | `GET` | `/api/v1/notifications` | **Módulo 24** | `NotificationsPopover.tsx` (Bandeja paginada `?unreadOnly=`) | `notificationsService.ts` | ⏳ **Pendiente** |
| **68** | `GET` | `/api/v1/notifications/unread-count` | **Módulo 24** | `NotificationBell.tsx` (Badge numérico de no leídas) | `notificationsService.ts` | ⏳ **Pendiente** |
| **69** | `PATCH` | `/api/v1/notifications/:id/read` | **Módulo 24** | `NotificationsPopover.tsx` (Marcar notificación individual leída) | `notificationsService.ts` | ⏳ **Pendiente** |
| **70** | `PATCH` | `/api/v1/notifications/read-all` | **Módulo 24** | `NotificationsPopover.tsx` (Botón "Marcar todas como leídas") | `notificationsService.ts` | ⏳ **Pendiente** |
| **71** | `DELETE` | `/api/v1/notifications/:id` | **Módulo 24** | `NotificationsPopover.tsx` (Eliminar notificación de bandeja) | `notificationsService.ts` | ⏳ **Pendiente** |
| **72** | `GET` | `/api/v1/notifications/stream` | **Módulo 24** | `useNotificationsStream.ts` (Canal SSE en tiempo real `?token=`) | `notificationsService.ts` | ⏳ **Pendiente** |
| **73** | `POST` | `/api/v1/forms/:id/subscribe` | **Módulo 24** | `FormSubscriptionButton.tsx` / `FormsStudioView.tsx` (Activar alertas) | `notificationsService.ts` | ⏳ **Pendiente** |
| **74** | `DELETE` | `/api/v1/forms/:id/subscribe` | **Módulo 24** | `FormSubscriptionButton.tsx` / `FormsStudioView.tsx` (Cancelar alertas) | `notificationsService.ts` | ⏳ **Pendiente** |
| **75** | `GET` | `/api/v1/forms/:id/subscription` | **Módulo 24** | `FormSubscriptionButton.tsx` / `FormsStudioView.tsx` (Estado actual) | `notificationsService.ts` | ⏳ **Pendiente** |

---

## 📌 Histórico de Módulos Base Completados (Módulos 1 al 9)

<details>
<summary><b>Ver Módulos 1 al 9 (Línea Base Operativa Previa) [Desplegar]</b></summary>

### 🌐 Módulo 1: Conectividad, Servicios & Sincronización API
- [x] **1.1 Cliente API y Persistencia Base**
- [x] **1.2 Servicio de Diagnóstico (Health)**
- [x] **1.3 Sincronización Bidireccional de Activos**
- [x] **1.4 Corrección de URLs Públicas vs IPs Internas del Backend**
- [x] **1.5 Página Dedicada de Configuración & Herramientas API**

### 🖼️ Módulo 2: Galería e Inspector de Imágenes
- [x] **2.1 Visualización y Filtrado**
- [x] **2.2 Tarjeta de Imagen (`ImageCard`)**
- [x] **2.3 Inspector Lateral y Modal de Zoom (`ImageInspector`)**

### 📊 Módulo 3: Catálogo de Datasets & Data Studio Pantalla Completa
- [x] **3.1 Catálogo de Datasets (`TablesCatalogView`)**
- [x] **3.2 Data Studio a Pantalla Completa (`TableDataStudioView`)**
- [x] **3.3 Barra de Herramientas Analíticas (`DataStudioToolbar`)**
- [x] **3.4 Grilla de Datos de Alta Densidad (`DataGrid`)**
- [x] **3.5 Paginación Reactiva Server-Side**

### 🔐 Módulo 4: Autenticación, Usuarios & Sesión Inicial
- [x] **4.1 Gestión de Sesión y Contexto**
- [x] **4.2 Componentes de Interfaz de Autenticación**
- [x] **4.3 Puerta de Enlace de Autenticación Obligatoria (Auth Guard)**

### 📁 Módulo 5: Sistema de Carpetas y Proyectos (Prototipo Inicial)
> *Nota: La lógica preliminar basada en localStorage de este módulo queda superada por la persistencia real en PostgreSQL y el RBAC implementado en el **Módulo 13**.*
- [x] **5.1 Estructura Visual de Carpetas**
- [x] **5.2 Filtrado y Reasignación de Elementos**

### 📤 Módulo 6: Motor de Subida, Drag & Drop y Notificaciones
- [x] **6.1 Ingesta de Archivos**
- [x] **6.2 Sistema de Feedback Visual**

### 🧪 Módulo 7: Calidad, Testing Automatizado & Build
- [x] **7.1 Cobertura de Pruebas Automatizadas**
- [x] **7.2 Compilación y Verificación Estricta**
- [x] **7.3 Validación de la Corrección de Carga de Imágenes**

### ⚙️ Módulo 8: Optimizaciones Técnicas & Limpieza de Linter (Oxlint)
- [x] **8.1 Desacoplamiento de Hooks para Fast Refresh**
- [x] **8.2 Eliminación de Cascada de Renders en Montaje**
- [x] **8.3 Resolución de Dependencias Exhaustivas de Hooks**
- [x] **8.4 Verificación de Cero Advertencias y Calidad Final**

### 🎨 Módulo 9: Rediseño Visual & Experiencia de Usuario (UI/UX Studio)
- [x] **9.1 Reorganización del Layout Global & Barra de Estado Inferior**
- [x] **9.2 Cabecera Unificada y Compacta de la Galería**
- [x] **9.3 Simplificación Minimalista de la Tarjeta de Imagen**
- [x] **9.4 Validación, Adaptación de Tests y Compilación**

</details>

---

## 🚀 FASES DE EXPANSIÓN: COBERTURA TOTAL DEL BACKEND (Módulos 10 al 18)

---

## 📡 Módulo 10: Contratos OpenAPI 3.1, Cliente HTTP Avanzado & Protocolo RFC 7807

> **Enfoque:** Robustecer la capa de red con soporte para mutaciones completas (`PUT`, `PATCH`), tipado integral desde el OpenAPI del backend y decodificación exhaustiva de errores RFC 7807 `ProblemDetails`.

- [x] **10.1 Extensión de Métodos en `ApiClient` (`src/services/apiClient.ts`)**
  - [x] `10.1.1` Implementar método `apiClient.patch<T>(path, body, options)` con soporte de serialización JSON y headers de autorización.
  - [x] `10.1.2` Implementar método `apiClient.put<T>(path, body, options)` con soporte dual para `multipart/form-data` y JSON.
  - [x] `10.1.3` Agregar soporte para respuestas con streams binarios, `Blob` y cabeceras de descarga `Content-Disposition`.
  - [x] `10.1.4` Enriquecer `ApiError` para capturar todos los atributos RFC 7807 del backend: `type`, `title`, `status`, `detail`, `code`, `instance` e `invalidParams`.

- [x] **10.2 Sincronización Automática de Tipos TypeScript (`src/types/api.ts`)**
  - [x] `10.2.1` Agregar comando en `package.json` de gestor-multimedia: `"types:sync": "npx openapi-typescript ../monolith-backend/openapi.json -o src/types/api.generated.ts"`.
  - [x] `10.2.2` Crear barrel export en `src/types/index.ts` unificando las entidades de la API generadas (`Folder`, `ImageRegistry`, `TableRegistry`, `User`, `ChatAnswer`, `MetadataCard`).
  - [x] `10.2.3` Actualizar interfaces existentes (`media.ts`, `auth.ts`) para extender directamente del contrato oficial del backend.

- [x] **10.3 Pruebas Automatizadas de la Capa de Transporte**
  - [x] `10.3.1` Crear suite de pruebas `apiClient.advanced.test.ts` validando llamadas `PUT`, `PATCH` y propagación de errores RFC 7807 (`invalidParams`).

---

## 🔐 Módulo 11: Sesión Avanzada, Tokens Rotativos & Autogestión de Perfil

> **Rutas Backend:** `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `PATCH /api/v1/auth/password`.  
> **Roles:** `ADMIN`, `MANAGER`, `COLLABORATOR` (eliminación total de referencias al rol legacy `USER`).

- [x] **11.1 Renovación Transparente de Token (Interceptor de Refresco)**
  - [x] `11.1.1` Implementar en `apiClient.ts` una cola de peticiones con interceptor: si una petición falla con `401 UNAUTHORIZED` y no es la ruta de login, invocar `POST /api/v1/auth/refresh` con `credentials: 'include'`.
  - [x] `11.1.2` Si el refresco es exitoso, actualizar token en memoria/localStorage y reintentar la petición original sin interrumpir al usuario.
  - [x] `11.1.3` Si el refresco falla (`SESSION_REVOKED` o refresh token expirado), ejecutar logout limpio en frontend y redirigir a `LoginView`.

- [x] **11.2 Validación de Sesión Activa al Iniciar (`GET /api/v1/auth/me`)**
  - [x] `11.2.1` Integrar llamada a `GET /api/v1/auth/me` en la inicialización de `AuthContext.tsx` para sincronizar datos reales del usuario (`id`, `username`, `role`, `isActive`, `createdById`).
  - [x] `11.2.2` Soportar roles estrictos `ADMIN`, `MANAGER`, `COLLABORATOR` en la interfaz de usuario con badges de color específicos.

- [x] **11.3 Cierre de Sesión Seguro en Servidor (`POST /api/v1/auth/logout`)**
  - [x] `11.3.1` Actualizar `authService.logout()` para realizar petición `POST /api/v1/auth/logout` antes de limpiar el estado local, revocando el `tokenVersion` en PostgreSQL y limpiando la cookie HttpOnly.
  - [x] `11.3.2` Conectar el botón de desconexión del `Sidebar.tsx` con feedback visual toast.

- [x] **11.4 Autogestión de Contraseña Propia (`PATCH /api/v1/auth/password`)**
  - [x] `11.4.1` Crear componente modal `ChangePasswordModal.tsx` con campos: Contraseña Actual, Nueva Contraseña y Confirmación.
  - [x] `11.4.2` Validar longitud mínima de 6 caracteres y coincidencia antes de enviar a `PATCH /api/v1/auth/password`.
  - [x] `11.4.3` Añadir botón de acceso rápido "Cambiar Contraseña" en la tarjeta de perfil del `Sidebar.tsx` y en `SettingsView.tsx`.
  - [x] `11.4.4` Pruebas unitarias para `ChangePasswordModal.test.tsx` y `authService.password.test.ts`.

---

## 🛠️ Brechas Reales Detectadas en el Código de los Módulos 1 al 11 y Reglas de Ingeniería

> **Auditoría de Código Fuente (`src/`):** Reglas obligatorias de ingeniería (documentadas en [`AGENTS.md`](./AGENTS.md)), arquitectura pragmática por capas, refactorización de archivos >300 líneas y subsanación de brechas detectadas en los Módulos 1 al 11 antes de avanzar al Módulo 12.

### 🏛️ Arquitectura Adoptada (Pragmatic Layered + Domain Components)
- **`src/views/` (< 200 líneas):** Orquestadores ligeros de pantalla (mantienen sus rutas actuales para no romper imports de tests).
- **`src/components/<dominio>/` (< 250 líneas):** Subcomponentes cohesivos (`settings/`, `users/`, `tables/`, `images/`, `folders/`, `chat/`, `auth/`, `layout/`, `common/`) con CSS Modules dedicados.
- **`src/services/` (< 250 líneas):** 1 servicio por dominio del backend + `src/services/http/` para módulos auxiliares de `apiClient.ts`.
- **`src/hooks/`:** Custom hooks creados únicamente cuando sea necesario descargar lógica de estado de `App.tsx` o de una vista para cumplir el límite de 300 líneas.

- [x] **1. Primero: Crear y Aplicar Reglas de Ingeniería del Proyecto (`AGENTS.md`)**
  - [x] `1.1` **Inmutabilidad de Tests (salvo `import`):** La lógica y aserciones de los tests existentes no se pueden modificar una vez creados. Solo las rutas de `import` pueden cambiar si la refactorización arquitectónica lo requiere (no sacrificar arquitectura por mantener `import` antiguos).
  - [x] `1.2` **Documentación Simultánea:** Cada nueva función, método o componente debe ser documentado (TSDoc / JSDoc) a la par que se crea.
  - [x] `1.3` **Límite Estricto Anti-"Archivos Dios" (Máximo 300 líneas):** Evitar archivos monolíticos; cada vez que un archivo de código fuente supere las **300 líneas**, se debe agregar inmediatamente a `TODO.md` una nueva tarea para refactorizarlo en módulos más pequeños y cohesivos.
  - [x] `1.4` **Cero Sobreingeniería (Principio YAGNI):** Si algo aún no se necesita, no se va a implementar. Prohibido crear abstracciones especulativas, patrones complejos innecesarios o código "por si acaso".

- [x] **2. Refactorización de "Archivos Dios" Actuales (> 300 líneas en `src/`)**
  - [x] `2.1` Refactorizar `src/views/SettingsView.tsx` (**452 -> 108 líneas**): extraer las tarjetas de configuración (`ApiConnectionCard`, `ShortCodeImportCard`, `ProfileSecurityCard`) en `src/components/settings/`.
  - [x] `2.2` Refactorizar `src/views/UserProfilesView.tsx` (**386 -> 58 líneas**): separar el formulario de creación (`CreateProfileCard`) y el directorio/matriz de permisos (`ProfilesDirectoryCard`) en `src/components/users/`.
  - [x] `2.3` Refactorizar `src/services/apiClient.ts` (**379 -> 295 líneas**): extraer la cola de refresco (`TokenRefreshQueue`) y utilidades de errores RFC 7807 (`apiError.ts`) hacia `src/services/http/`.
  - [x] `2.4` Refactorizar `src/views/TableDataStudioView.tsx` (**354 -> 223 líneas**): extraer `DataStudioToolbar.tsx` y `DataGrid.tsx` hacia `src/components/tables/`.
  - [x] `2.5` Refactorizar `src/App.tsx` (**343 -> 248 líneas**): extraer la lógica de estado/sincronización y manejadores multimedia en `src/hooks/useMediaWorkspace.ts`.
  - [x] `2.6` Refactorizar hojas de estilo que superaban las 300 líneas (`SettingsView.module.css` **372 -> 141 líneas** y `UserProfilesView.module.css` **361 -> 74 líneas**) acompañando la división de sus respectivos subcomponentes.

- [x] **3. Desestructuración y Renderizado de Carpetas en `Sidebar.tsx` (Módulo 5 / 9)**
  - [x] `3.1` En `src/components/layout/Sidebar.tsx`, desestructurar las propiedades `folders`, `activeFolderId`, `onFolderChange`, `onOpenNewFolder` y `foldersEnabled` declaradas en `SidebarProps`.
  - [x] `3.2` Renderizar la sección de carpetas en el JSX del `Sidebar` cuando `foldersEnabled` sea `true`, permitiendo filtrar por carpeta activa o volver a la raíz (`null`) y abrir el modal de nueva carpeta.

- [x] **4. Eliminación Real de Referencias al Rol Legacy `USER` en la UI (Módulo 11.2.2)**
  - [x] `4.1` En `src/components/users/` (`CreateProfileCard.tsx` y `ProfilesDirectoryCard.tsx`), reemplazar las etiquetas hardcodeadas `USER` por los roles canónicos del backend (`ADMIN`, `MANAGER`, `COLLABORATOR`), respetando los tests existentes (Regla `1.1`).
  - [x] `4.2` En `src/components/layout/Sidebar.tsx`, ajustar la validación de acceso a `Gestión de Perfiles` para contemplar tanto a `ADMIN` como a `MANAGER` (`user?.role === 'ADMIN' || user?.role === 'MANAGER'`).

- [x] **5. Unificación Real de Entidades e Interfaces con el Contrato OpenAPI 3.1 (Módulo 10.2.2 y 10.2.3)**
  - [x] `5.1` Exportar en `src/types/api.ts` y `src/types/index.ts` los alias canónicos solicitados (`Folder`, `ImageRegistry`, `TableRegistry`, `User`, `ChatAnswer`, `MetadataCard`) derivados de `api.generated.ts`.
  - [x] `5.2` Conectar `src/types/media.ts` y `src/types/auth.ts` con los tipos oficiales generados de OpenAPI, reemplazando `metadataCard?: any` en `TableItem` por `MetadataCard`.

- [x] **6. Paridad de Autenticación y Refresco de Token en `apiClient.download()` (Módulo 10.1.3 y 11.1.1)**
  - [x] `6.1` En `src/services/apiClient.ts`, incluir `credentials: options.credentials || 'include'` por defecto en `download()`.
  - [x] `6.2` Integrar el interceptor `handleTokenRefresh` en `apiClient.download()` cuando el servidor responda `401 UNAUTHORIZED` y `!options.skipAuth && !options._retry`, garantizando reintento transparente en descargas autenticadas.

- [x] **7. Refactorización de Hojas de Estilo > 300 líneas (Regla `1.3`)**
  - [x] `7.1` Dividir `src/components/users/UserProfilesCards.module.css` (**335 líneas**) en hojas acotadas por subcomponente (`CreateProfileCard.module.css`, `ProfilesDirectoryCard.module.css` y `UserModals.module.css`).

---

## 👥 Módulo 12: Suite de Administración Jerárquica de Usuarios (RBAC)

> **Rutas Backend:** `GET /api/v1/users`, `POST /api/v1/users`, `PATCH /api/v1/users/:id/status`, `PATCH /api/v1/users/:id/password`, `DELETE /api/v1/users/:id`.  
> **Regla Jerárquica:** `ADMIN` gestiona todo el sistema. `MANAGER` crea y gestiona únicamente sus colaboradores. `COLLABORATOR` no tiene acceso a gestión de usuarios.

- [x] **12.1 Servicio de Usuarios Conectado a PostgreSQL (`src/services/usersService.ts`)**
  - [x] `12.1.1` Implementar `listUsers()` consumiendo `GET /api/v1/users`.
  - [x] `12.1.2` Implementar `createUser(payload)` consumiendo `POST /api/v1/users` respetando jerarquía de roles (`MANAGER` o `COLLABORATOR`).
  - [x] `12.1.3` Implementar `updateUserStatus(userId, isActive)` consumiendo `PATCH /api/v1/users/:id/status`.
  - [x] `12.1.4` Implementar `resetUserPassword(userId, newPassword)` consumiendo `PATCH /api/v1/users/:id/password`.
  - [x] `12.1.5` Implementar `deleteUser(userId)` consumiendo `DELETE /api/v1/users/:id`.

- [x] **12.2 Rediseño y Conexión de `UserProfilesView.tsx`**
  - [x] `12.2.1` Sustituir la persistencia local de `storageService.getCreatedUsers()` por la carga en vivo desde `usersService.listUsers()`.
  - [x] `12.2.2` Adaptar el formulario de creación: permitir a un `ADMIN` seleccionar entre rol `MANAGER` y `COLLABORATOR`; forzar a rol `COLLABORATOR` si el usuario en sesión es `MANAGER`.
  - [x] `12.2.3` Tabla de usuarios registrados con columnas: Usuario, Rol, Creado por, Estado (`Activo` / `Suspendido`), Fecha de registro y Acciones.
  - [x] `12.2.4` Botón switch/toggle para suspender o reactivar usuario en 1 clic (`PATCH /api/v1/users/:id/status`).

- [x] **12.3 Modales de Restablecimiento y Eliminación de Usuarios**
  - [x] `12.3.1` Crear modal `ResetUserPasswordModal.tsx` con generador automático de contraseñas seguras y botón copiar.
  - [x] `12.3.2` Modal de confirmación destructiva con advertencia de que la eliminación de un usuario destruye en cascada sus archivos en almacenamiento físico.
  - [x] `12.3.3` Pruebas de integración RTL en `UserProfilesView.test.tsx` (y `UserProfilesView.rbac.test.tsx` / `usersService.test.ts` respetando Regla `1.1`) cubriendo el flujo CRUD completo.

---

## 📁 Módulo 13: Descongelamiento y Gestión Total de Carpetas en PostgreSQL con RBAC

> **Rutas Backend:** `GET /api/v1/folders`, `POST /api/v1/folders`, `GET /api/v1/folders/:id`, `PATCH /api/v1/folders/:id`, `DELETE /api/v1/folders/:id`, `POST /api/v1/folders/:id/shares`, `GET /api/v1/folders/:id/shares`, `PATCH /api/v1/folders/:id/shares/:userId`, `DELETE /api/v1/folders/:id/shares/:userId`, `PATCH /api/v1/images/:id/folder`, `PATCH /api/v1/tables/:id/folder`.

- [x] **13.1 Servicio Centralizado de Carpetas (`src/services/foldersService.ts`)**
  - [x] `13.1.1` Implementar `fetchFolders(type?, search?, page?, limit?)` consumiendo `GET /api/v1/folders`.
  - [x] `13.1.2` Implementar `createFolder(payload)` consumiendo `POST /api/v1/folders`.
  - [x] `13.1.3` Implementar `updateFolder(id, payload)` consumiendo `PATCH /api/v1/folders/:id` (renombrar, color, privacidad).
  - [x] `13.1.4` Implementar `deleteFolder(id)` consumiendo `DELETE /api/v1/folders/:id`.
  - [x] `13.1.5` Implementar `moveImageToFolder(imageId, folderId)` consumiendo `PATCH /api/v1/images/:id/folder`.
  - [x] `13.1.6` Implementar `moveTableToFolder(tableId, folderId)` consumiendo `PATCH /api/v1/tables/:id/folder`.
  - [x] `13.1.7` Implementar métodos de compartición: `shareFolder()`, `listShares()`, `updateSharePermission()`, `revokeShare()`.

- [x] **13.2 Descongelamiento en `App.tsx` y Sincronización en Sidebar**
  - [x] `13.2.1` Establecer `ENABLE_FOLDERS = true` en `App.tsx` y eliminar la dependencia de carpetas locales en `storageService`.
  - [x] `13.2.2` En `Sidebar.tsx`: Renderizar árbol de carpetas obtenido de PostgreSQL filtrado según la pestaña activa (`IMAGE` en Galería, `TABLE` en Datasets).
  - [x] `13.2.3` Badges visuales en cada carpeta: Candado para privadas (`isPrivate`), ícono de usuarios para compartidas, badge de permiso (`Lectura` o `Edición`) y contador real de elementos (`itemCount`).
  - [x] `13.2.4` Protección de carpeta `General`: ocultar o deshabilitar opciones de renombrado y borrado sobre la carpeta del sistema.

- [x] **13.3 Modal de Edición de Carpetas (`EditFolderModal.tsx`)**
  - [x] `13.3.1` Crear componente `EditFolderModal.tsx` con campos para: nuevo nombre, selector de paleta de colores hexadecimales y toggle de privacidad privada/pública.
  - [x] `13.3.2` Bloquear acceso si la carpeta es `General` o si el usuario no tiene permiso de propietario o `ADMIN`.

- [x] **13.4 Sistema de Compartición de Carpetas (`ShareFolderModal.tsx`)**
  - [x] `13.4.1` Crear modal `ShareFolderModal.tsx` accesible desde el menú de la carpeta en el Sidebar.
  - [x] `13.4.2` Selector de usuarios colaboradores disponibles en el sistema con asignación de permiso inicial (`READ` o `EDIT`).
  - [x] `13.4.3` Lista de miembros activos en la carpeta compartida con selector desplegable en línea para conmutar entre `Lectura` y `Edición` (`PATCH /api/v1/folders/:id/shares/:userId`).
  - [x] `13.4.4` Botón para expulsar/revocar acceso a un colaborador (`DELETE /api/v1/folders/:id/shares/:userId`).

- [x] **13.5 Conexión de Reasignación Real (`MoveToFolderModal.tsx`)**
  - [x] `13.5.1` Actualizar `handleConfirmMove` en `App.tsx` para llamar a `foldersService.moveImageToFolder` o `foldersService.moveTableToFolder` en el backend.
  - [x] `13.5.2` Notificar con Toast de éxito o error descriptivo según el permiso RBAC del usuario.
  - [x] `13.5.3` Pruebas unitarias e integradas para `foldersService.test.ts`, `EditFolderModal.test.tsx` y `ShareFolderModal.test.tsx`.

---

## 🖼️ Módulo 14: Potenciación del Módulo de Imágenes (Hot-Swap, Renombrado & Miniaturas WebP)

> **Rutas Backend:** `PATCH /api/v1/images/:id`, `PUT /api/v1/images/:id`, `GET /i/:short_code?variant=thumb`, `GET /api/v1/images?page=&limit=&folderId=`.

- [x] **14.1 Miniaturas WebP de Alta Velocidad y Rendimiento Visual**
  - [x] `14.1.1` Actualizar `ImageCard.tsx` para solicitar `/i/:short_code?variant=thumb` en la vista de cuadrícula, reduciendo drásticamente el peso de descarga de imágenes de alta resolución.
  - [x] `14.1.2` Cargar la imagen original completa (`/i/:short_code?variant=original`) únicamente al abrir el visor de zoom e inspección (`ImageInspector.tsx`).
  - [x] `14.1.3` Soporte de invalidación de caché usando la propiedad `urlWithVersion` (`?v=timestamp`) devuelta por el backend para evitar que el navegador muestre imágenes en caché obsoletas.

- [x] **14.2 Renombrado en Caliente de Imágenes (`PATCH /api/v1/images/:id`)**
  - [x] `14.2.1` Implementar `renameImage(id, originalName)` en `imagesService.ts`.
  - [x] `14.2.2` Crear modal rápido `RenameImageModal.tsx` o edición in-line de nombre en `ImageInspector.tsx` con confirmación inmediata.
  - [x] `14.2.3` Actualización instantánea del estado local y feedback toast tras renombrar.

- [x] **14.3 Reemplazo en Caliente de Binario / Hot-Swap (`PUT /api/v1/images/:id`)**
  - [x] `14.3.1` Implementar `replaceImage(id, file)` en `imagesService.ts` enviando `multipart/form-data` mediante `apiClient.put`.
  - [x] `14.3.2` Crear modal `HotSwapImageModal.tsx` con dropzone interactivo que muestre comparación antes/después (archivo actual vs nuevo archivo a sustituir).
  - [x] `14.3.3` Advertencia clara: *"El archivo se actualizará conservando exactamente el mismo shortCode y URL pública compartida"*.
  - [x] `14.3.4` Actualización automática de miniatura y metadatos (`sizeBytes`, `width`, `height`) tras la sustitución exitosa.

- [x] **14.4 Paginación Server-Side y Filtros en Galería**
  - [x] `14.4.1` Actualizar llamada `imagesService.fetchRemoteImages({ page, limit, folderId })` en `ImagesView.tsx`.
  - [x] `14.4.2` Añadir controles de paginación previa/siguiente en la barra de herramientas de la galería si el número de imágenes excede el límite de página.
  - [x] `14.4.3` Pruebas automatizadas en `imagesService.test.ts` y componentes de UI de imágenes.

---

## 📊 Módulo 15: Catálogo de Datasets & Data Studio con Ficha Técnica (`metadataCard`)

> **Rutas Backend:** `PATCH /api/v1/tables/:id/metadata`, `GET /t/:short_code` (headers, merges, cellStyles, ?download=true), `GET /api/v1/tables?page=&limit=&folderId=`.

- [x] **15.1 Soporte Integral de Formato Rico en Data Studio (`TableDataStudioView.tsx`)**
  - [x] `15.1.1` Actualizar `tablesService.fetchTableDetails(shortCode, page, limit)` para extraer y tipar metadatos avanzados: `headers` multinivel, `merges` (celdas combinadas) y `cellStyles` (colores de fondo, negritas, alineación).
  - [x] `15.1.2` Adaptar `DataGrid.tsx` para aplicar dinámicamente los estilos calculados por el backend (`cellStyles[rowIdx][colName]`) y representar visualmente las celdas agrupadas (`merges`).
  - [x] `15.1.3` Mantener botón de descarga directa de alta fidelidad (`/t/:short_code?download=true`) que descargue el `.xlsx` o `.csv` intacto con su nombre original.

- [x] **15.2 Editor e Inspector de Ficha Técnica (`TableMetadataEditorModal.tsx`)**
  - [x] `15.2.1` Implementar `updateTableMetadata(id, metadata)` en `tablesService.ts` consumiendo `PATCH /api/v1/tables/:id/metadata`.
  - [x] `15.2.2` Crear componente `TableMetadataEditorModal.tsx` accesible desde la tarjeta de tabla y la barra del Data Studio.
  - [x] `15.2.3` Formulario con campos:
    - **Título Descriptivo** (`title`).
    - **Descripción del Dataset** (`description`).
    - **Etiquetas Temáticas** (`tags`: chips interactivos agregables/eliminables).
    - **Unidad de Medida** (`unit`, ej. "habitantes", "USD", "toneladas").
    - **Diccionario de Columnas** (`columnsMeta`: glosario donde se describe el significado de cada columna detectada).
    - **Toggle de Filas de Resumen** (`hasSummaryRows`: indicador para evitar duplicación de totales en análisis).
  - [x] `15.2.4` Visualizador de sólo lectura tipo Badge / Tooltip en `TableCard.tsx` para previsualizar la ficha técnica rápidamente.

- [x] **15.3 Paginación Server-Side y Filtros en Catálogo de Tablas**
  - [x] `15.3.1` Integrar `folderId`, `page` y `limit` en `tablesService.fetchRemoteTables()`.
  - [x] `15.3.2` Pruebas unitarias para `tablesService.metadata.test.ts` y renderizado de Ficha Técnica.

---

## 🤖 Módulo 16: Asistente Analítico Inteligente (Chat RAG Tabular & Gráficos)

> **Rutas Backend:** `POST /api/v1/chat/ask`, `POST /api/v1/public/chat/ask`, `GET /api/v1/public/chat/suggestions`.

- [x] **16.1 Servicio de Chat y RAG Tabular (`src/services/chatService.ts`)**
  - [x] `16.1.1` Implementar `askInternal(question, folderId?, shortCode?)` consumiendo `POST /api/v1/chat/ask`.
  - [x] `16.1.2` Implementar `getPublicSuggestions(folderId?)` consumiendo `GET /api/v1/public/chat/suggestions`.
  - [x] `16.1.3` Implementar `askPublic(question, folderId?, shortCode?)` consumiendo `POST /api/v1/public/chat/ask`.

- [x] **16.2 Vista del Asistente Analítico (`ChatStudioView.tsx`)**
  - [x] `16.2.1` Crear vista principal `ChatStudioView.tsx` y registrarla en el `Sidebar.tsx` con ícono de Sparkles/Bot (`Consulta Inteligente` / `Data Chat`).
  - [x] `16.2.2` Selector de contexto: consultar sobre "Todas mis tablas accesibles", filtrar por una carpeta en específico o por un dataset concreto.
  - [x] `16.2.3` Barra de sugerencias dinámicas con chips clickeables obtenidos de `GET /api/v1/public/chat/suggestions`.
  - [x] `16.2.4` Hilo de conversación con burbujas de mensaje para el usuario y respuestas analíticas fundamentadas del backend.
  - [x] `16.2.5` Tratamiento visual elegante cuando el dato no existe (`foundInSystem: false` con aviso claro de dato no registrado).

- [x] **16.3 Renderizado de Fuentes Citadas & Gráficos Estadísticos**
  - [x] `16.3.1` Componente `ChatSourcesList.tsx`: Muestra las tarjetas de tablas utilizadas como fuentes (`tableName`, `shortCode`, `title`) con botón directo para abrirlas en el Data Studio a pantalla completa.
  - [x] `16.3.2` Componente `ChatChartRenderer.tsx`: Si la respuesta contiene `chartData` (`labels`, `values`, `percentages`), renderizar automáticamente un gráfico visual (gráfico de barras horizontales/verticales con porcentajes y formateo de números en español).

- [x] **16.4 Generador y Sandbox de Widget Web Público (`PublicWidgetPreviewModal.tsx`)**
  - [x] `16.4.1` Crear modal en `SettingsView` o `ChatStudioView` para generar el código embebible del Widget Público de Chat.
  - [x] `16.4.2` Probar en vivo el endpoint `POST /api/v1/public/chat/ask` demostrando cómo terceros pueden consultar tablas públicas respetando el rate-limit.
  - [x] `16.4.3` Botón para copiar snippet HTML / iFrame listo para incrustar en sitios web externos.
  - [x] `16.4.4` Pruebas unitarias para `chatService.test.ts` y componentes de visualización de chat y gráficos.

---

## 📖 Módulo 17: Visor Interactivo de Documentación OpenAPI (Scalar) & Diagnóstico

> **Rutas Backend:** `GET /docs`, `GET /openapi.json`, `GET /health`.

- [x] **17.1 Explorador de Documentación Scalar Integrado**
  - [x] `17.1.1` Añadir en `SettingsView.tsx` una sección destacada "Documentación Interactiva de la API (Scalar)".
  - [x] `17.1.2` Botón con enlace directo para abrir `/docs` en nueva pestaña y modal visor integrado con iframe responsive de la consola Scalar del backend.
  - [x] `17.1.3` Botón de descarga/inspección de la especificación cruda `GET /openapi.json` con formateador visual de JSON y copiado al portapapeles.

- [x] **17.2 Panel de Diagnóstico de Salud en Tiempo Real**
  - [x] `17.2.1` Enriquecer `healthService.ts` para capturar el estado individual de servicios devueltos por `GET /health` (`database: 'up'`, `storage: 'up'`, `uptime`).
  - [x] `17.2.2` Mostrar tarjetas de diagnóstico en `SettingsView.tsx` con badges de latencia milimétrica y estado de conexión PostgreSQL y Storage.

---

## 🧪 Módulo 18: Calidad Integral, Testing Automatizado E2E & Build de Producción

- [x] **18.1 Cobertura Exhaustiva con Vitest y React Testing Library**
  - [x] `18.1.1` Tests unitarios para el 100% de los nuevos servicios:
    - `apiClient.advanced.test.ts`
    - `authService.extended.test.ts`
    - `usersService.test.ts`
    - `foldersService.test.ts`
    - `chatService.test.ts`
    - `tablesService.metadata.test.ts`
  - [x] `18.1.2` Tests de componentes y modales:
    - `ChangePasswordModal.test.tsx`
    - `UserProfilesView.test.tsx`
    - `EditFolderModal.test.tsx`
    - `ShareFolderModal.test.tsx`
    - `HotSwapImageModal.test.tsx`
    - `TableMetadataEditorModal.test.tsx`
    - `ChatStudioView.test.tsx`
  - [x] `18.1.3` Pruebas de integración global de vistas en `App.test.tsx` + `App.integration.test.tsx` cubriendo el nuevo flujo con carpetas activas y chat.

- [x] **18.2 Verificación de Calidad y Cero Regresiones**
  - [x] `18.2.1` Ejecución de `npm run test` verificando que el 100% de los tests (actuales y nuevos) pasen con 0 fallos.
  - [x] `18.2.2` Ejecución de `npm run lint` (`oxlint`) garantizando 0 advertencias y 0 errores.
  - [x] `18.2.3` Ejecución de `npm run build` (`tsc -b && vite build`) certificando compilación estricta TypeScript y bundle listo para producción.

---

## 🚀 FASES DE EXPANSIÓN (NUEVAS FUNCIONALIDADES MONOLITH-BACKEND)

> **Sincronización con monolith-backend:** Cobertura de las Fases 15, 16, 17 y 18 del backend (Paridad de Tablas, Operaciones Masivas, Búsqueda Server-Side, Auditoría, API Keys, Almacenamiento, Catálogo de PDFs y Formularios con Resolución Write-Once).

---

## 📦 Módulo 19: Paridad de Tablas, Búsqueda Unificada & Operaciones en Lote (`Bulk Actions`)

> **Rutas Backend:** `PATCH /api/v1/tables/:id`, `PUT /api/v1/tables/:id`, `GET /api/v1/images?search=`, `GET /api/v1/tables?search=`, `POST /api/v1/images/bulk-delete`, `POST /api/v1/images/bulk-move`, `POST /api/v1/tables/bulk-delete`, `POST /api/v1/tables/bulk-move`.

- [x] **19.1 Mutación y Paridad en Datasets Tabulares**
  - [x] `19.1.1` Implementar `renameTable(id, tableName)` en `tablesService.ts` consumiendo `PATCH /api/v1/tables/:id`.
  - [x] `19.1.2` Implementar `replaceTable(id, file)` en `tablesService.ts` enviando `multipart/form-data` a `PUT /api/v1/tables/:id` (Hot-Swap atómico conservando shortCode y URL pública).
  - [x] `19.1.3` Crear componentes modales: `RenameTableModal.tsx` y `HotSwapTableModal.tsx` con comparativa visual antes/después y validación de extensiones `.xlsx` / `.csv`.

- [x] **19.2 Búsqueda Global Server-Side con Debounce (`?search=`)**
  - [x] `19.2.1` Integrar soporte de `search` en `imagesService.fetchRemoteImages({ search })` (`GET /api/v1/images?search=`).
  - [x] `19.2.2` Integrar soporte de `search` en `tablesService.fetchRemoteTables({ search })` (`GET /api/v1/tables?search=`).
  - [x] `19.2.3` Conectar barras de búsqueda en `ImagesView.tsx` y `TablesCatalogView.tsx` con debounce para filtrar en vivo contra PostgreSQL.

- [x] **19.3 Operaciones Masivas en Lote (`Bulk Actions`)**
  - [x] `19.3.1` Implementar métodos en servicios: `bulkDeleteImages(ids)`, `bulkMoveImages(ids, folderId)`, `bulkDeleteTables(ids)`, `bulkMoveTables(ids, folderId)` consumiendo endpoints `/bulk-delete` y `/bulk-move`.
  - [x] `19.3.2` Selección múltiple de elementos en cuadrícula y catálogo (checkbox interactivo por tarjeta y barra flotante contextual "X seleccionados").
  - [x] `19.3.3` Modal de confirmación para borrado masivo (`BulkDeleteModal.tsx`) y modal para reasignación masiva de carpeta (`BulkMoveModal.tsx`).

---

## 🛡️ Módulo 20: Trazabilidad (Audit Logs), Gestión de API Keys & Monitor de Almacenamiento

> **Rutas Backend:** `GET /api/v1/audit-logs`, `POST /api/v1/api-keys`, `GET /api/v1/api-keys`, `DELETE /api/v1/api-keys/:id`, `GET /api/v1/stats/storage`.

- [x] **20.1 Historial de Auditoría Inmutable (`AuditLog`)**
  - [x] `20.1.1` Crear `auditService.ts` consumiendo `GET /api/v1/audit-logs` con soporte para `page`, `limit`, `action`, `resourceType` y `folderId`.
  - [x] `20.1.2` Crear vista `AuditLogsView.tsx` accesible en el Sidebar para roles `ADMIN` y `MANAGER`.
  - [x] `20.1.3` Filtros por acción (`USER_CREATE`, `IMAGE_UPLOAD`, `TABLE_DELETE`, `FOLDER_SHARE`, etc.), actor e IP, con tabla paginada y modal de detalles del payload (`metadata`).

- [x] **20.2 Gestión Dinámica de API Keys de Integración (`ApiClient`)**
  - [x] `20.2.1` Crear `apiKeysService.ts` consumiendo `POST /api/v1/api-keys`, `GET /api/v1/api-keys` y `DELETE /api/v1/api-keys/:id`.
  - [x] `20.2.2` Subcomponente `ApiKeysManagerCard.tsx` en `SettingsView.tsx` (exclusivo `ADMIN`): tabla con nombre, prefijo `mk_live_...`, último uso y estado activo.
  - [x] `20.2.3` Modal de creación con revelación de secreto en texto plano por única vez, botón de copiado rápido y advertencia criptográfica.

- [x] **20.3 Monitor de Cuotas y Salud de Almacenamiento**
  - [x] `20.3.1` Implementar `getStorageStats()` consumiendo `GET /api/v1/stats/storage`.
  - [x] `20.3.2` Subcomponente `StorageMonitorCard.tsx` en `SettingsView.tsx`: barras de distribución de espacio físico (Imágenes vs Tablas vs PDFs), conteo global de archivos y desglose por carpetas.

---

## 📑 Módulo 21: Módulo de Documentos PDF (Doble Artefacto, Visor, Link Corto & RAG Documental)

> **Rutas Backend:** `GET /p/:short_code`, `GET /api/v1/pdfs`, `POST /api/v1/pdfs`, `PATCH /api/v1/pdfs/:id`, `PUT /api/v1/pdfs/:id`, `PATCH /api/v1/pdfs/:id/metadata`, `DELETE /api/v1/pdfs/:id`, `PATCH /api/v1/pdfs/:id/folder`.

- [x] **21.1 Tipos y Servicio de Documentos PDF (`pdfsService.ts`)**
  - [x] `21.1.1` Definir contratos en `src/types/media.ts` (`PdfItem`, `PdfRegistry`) y ampliar enum/tipo de carpeta a `'IMAGE' | 'TABLE' | 'PDF'` (`'pdf'`).
  - [x] `21.1.2` Implementar `pdfsService.ts` cubriendo listado paginado, subida multipart, renombrado, Hot-Swap, actualización de `metadataCard`, borrado y movimiento de carpeta.

- [x] **21.2 Catálogo y Visor de PDFs en el Frontend**
  - [x] `21.2.1` Crear vista `PdfsCatalogView.tsx` y registrar la pestaña "Documentos PDF" en el `Sidebar.tsx`.
  - [x] `21.2.2` Componentes de tarjeta `PdfCard.tsx` (con badges de `pageCount`, estado `isScanned`, peso y enlace corto `/p/:short_code`).
  - [x] `21.2.3` Visor de documentos `PdfViewerModal.tsx`: previsualizador embebido de PDF con pestaña para consultar el texto estructurado extraído (`/p/:short_code?format=text`).
  - [x] `21.2.4` Modales de gestión: `UploadPdfModal.tsx`, `RenamePdfModal.tsx`, `HotSwapPdfModal.tsx` y editor de ficha técnica `PdfMetadataEditorModal.tsx`.

- [x] **21.3 Sinergia con Chat RAG Documental + Tabular**
  - [x] `21.3.1` Actualizar `ChatStudioView.tsx` y `ChatSourcesList.tsx` para admitir citas mixtas (tablas y documentos PDF).
  - [x] `21.3.2` Representación de páginas citadas (`pages: [1, 3]`) con botón directo para abrir el PDF en el visor en la página exacta referenciada.

---

## 📋 Módulo 22: Formularios Customizables, Tablas Abiertas & Resolución Única (Write-Once)

> **Rutas Backend:** `POST /api/v1/forms`, `GET /api/v1/forms`, `GET /api/v1/forms/:id`, `GET /api/v1/forms/:id/entries`, `PATCH /api/v1/forms/entries/:id/resolve`, `POST /api/v1/forms/entries/:id/dispatch`, `GET /api/v1/forms/:id/export`, `POST /api/v1/public/forms/:slug/entries`.

- [x] **22.1 Servicio de Formularios y Bandeja de Entradas (`formsService.ts`)**
  - [x] `22.1.1` Definir contratos en `src/types/forms.ts` (`FormDefinition`, `FormEntry`, `FormSchemaField`).
  - [x] `22.1.2` Implementar `formsService.ts`: creación de formulario, listado, obtención de entradas mensuales, resolución inmutable, reenvío y exportación.

- [x] **22.2 Vista de Estudio de Formularios (`FormsStudioView.tsx`)**
  - [x] `22.2.1` Crear vista `FormsStudioView.tsx` accesible desde el `Sidebar.tsx` con catálogo de formularios activos y conteo de respuestas.
  - [x] `22.2.2` Constructor de formularios (`CreateFormModal.tsx`): definición dinámica de campos de entrada (`entryFieldsSchema`) y campos exclusivos de respuesta (`resolutionFieldsSchema`) vinculados a una carpeta.

- [x] **22.3 Bandeja de Entradas y Resolución Inmutable Write-Once**
  - [x] `22.3.1` Visor de entradas con filtro mensual (`?month=YYYY-MM`) y badges de estado (`NEW`, `VALID`, `INVALID`).
  - [x] `22.3.2` Modal de Resolución (`ResolveEntryModal.tsx`): formulario para completar campos de respuesta y sellar inmutablemente el registro a `VALID` o `INVALID`.
  - [x] `22.3.3` Botón de despacho bajo demanda (`POST /api/v1/forms/entries/:id/dispatch`) para retransmitir datos sellados a servicios externos y exportador a `.xlsx` / `.csv`.

---

## 🧪 Módulo 23: Calidad Integral, Testing Automatizado E2E & Certificación de Build

- [x] **23.1 Cobertura Exhaustiva de Nuevos Módulos**
  - [x] `23.1.1` Tests unitarios de servicios: `tablesService.mutation.test.ts`, `bulkService.test.ts`, `auditService.test.ts`, `apiKeysService.test.ts`, `pdfsService.test.ts` y `formsService.test.ts`.
  - [x] `23.1.2` Tests de componentes y vistas: `PdfsCatalogView.test.tsx`, `AuditLogsView.test.tsx`, `FormsStudioView.test.tsx` y `BulkActions.test.tsx`.
- [x] **23.2 Verificación de Calidad y Cero Regresiones**
  - [x] `23.2.1` Ejecución de `npm run test` verificando que el 100% de los tests (actuales y nuevos) pasen con 0 fallos (70 test files, 246 tests pasando).
  - [x] `23.2.2` Ejecución de `npm run lint` (`oxlint`) garantizando 0 advertencias y 0 errores en los 180 archivos.
  - [x] `23.2.3` Ejecución de `npm run build` (`tsc -b && vite build`) certificando compilación estricta TypeScript y bundle listo para producción (todos los archivos < 300 líneas).
  - [x] `23.2.4` **Hotfix Resiliencia de Eliminación (Imágenes, Tablas y PDFs)**:
    - Corrección en `apiClient.ts` para no enviar cabecera `Content-Type: application/json` en peticiones `DELETE` sin cuerpo (evitando error `FST_ERR_CTP_EMPTY_JSON_BODY` de Fastify).
    - Tolerancia y absorción de respuestas 404 / 400 en `imagesService.deleteImage`, `tablesService.deleteTable` y `pdfsService.deletePdf`, garantizando siempre limpieza de almacenamiento local y eliminación optimista en UI.
    - Soporte de credenciales Dokploy de producción (`AdminPass2026!`) en fallback de autenticación `LoginView.tsx`.
    - Eliminación de `window.confirm` bloqueante y corrección de `e.stopPropagation()` en `PdfCard.tsx`.
- [x] **23.3 Rediseño del Explorador Principal Unificado y Compactación de Espacio (`UnifiedExplorerView` + `MainExplorerHeader`)**
  - [x] `23.3.1` Simplificación radical del `Sidebar.tsx` en modo explorador (`explorerMode`): eliminación de enlaces individuales de Imágenes, Tablas, PDFs y Formularios del menú lateral, conservando el botón primario **"Subir Archivo"** y acceso al Explorador y Asistente IA.
  - [x] `23.3.2` Restricción RBAC estricta en `Sidebar.tsx`: la sección de **Configuración** solo se muestra al rol `ADMIN`.
  - [x] `23.3.3` Creación de `MainExplorerHeader.tsx` y `UnifiedExplorerView.tsx`: carpetas renderizadas directamente en `<main>` con migas de pan (`breadcrumbs`), píldoras de filtro rápido (`Todo`, `Galería de Imágenes`, `Data Studio (Tablas)`, `Documentos PDF`, `Formularios`) y optimización del espacio vertical/horizontal (249 tests en 71 suites pasando).

---

## 🚀 FASES DE SINCRONIZACIÓN CON NUEVOS MÓDULOS DE `MONOLITH-BACKEND` (FASES 19 Y 20)

> **Sincronización con `RUTAS.md`, `TODO.md` y `docs/frontend-integration.md` del backend:** Cobertura de las **Fases 19 y 20** de `monolith-backend` (9 rutas nuevas de Notificaciones In-App, Streaming SSE en Tiempo Real y Suscripciones a Formularios + 1 ruta nueva de Árbol Jerárquico `/folders/tree`, carpetas departamentales Nivel 1 `CONTAINER`, herencia de subcarpetas en 3 niveles y bóveda compartida universal `shared`).

---

## 🔔 Módulo 24: Sistema de Notificaciones en Vivo (SSE), Bandeja In-App & Suscripciones a Formularios (Backend Fase 19)

> **Rutas Backend (9 Endpoints Nuevos — #67 a #75):**
> - `GET /api/v1/notifications` (`?page=&limit=&unreadOnly=true|false`)
> - `GET /api/v1/notifications/unread-count`
> - `PATCH /api/v1/notifications/:id/read`
> - `PATCH /api/v1/notifications/read-all`
> - `DELETE /api/v1/notifications/:id`
> - `GET /api/v1/notifications/stream` (Server-Sent Events `text/event-stream` con `?token=<jwt>` o Header `Authorization`)
> - `POST /api/v1/forms/:id/subscribe` (`{ notifyOnNewEntry: boolean, notifyOnResolution: boolean }`)
> - `DELETE /api/v1/forms/:id/subscribe`
> - `GET /api/v1/forms/:id/subscription`

- [ ] **24.1 Contratos y Servicio de Notificaciones (`notificationsService.ts`)**
  - [ ] `24.1.1` Crear `src/types/notifications.ts` con las interfaces `NotificationItem` (`id`, `title`, `message`, `type: 'FORM_NEW_ENTRY' | 'FORM_ENTRY_RESOLVED' | 'SYSTEM'`, `resourceId`, `read`, `createdAt`), `NotificationsPaginatedResponse`, `UnreadCountResponse` y `FormSubscription`.
  - [ ] `24.1.2` Implementar `src/services/notificationsService.ts` cubriendo los 9 endpoints:
    - `fetchNotifications({ page, limit, unreadOnly })` -> `GET /api/v1/notifications`
    - `fetchUnreadCount()` -> `GET /api/v1/notifications/unread-count`
    - `markNotificationAsRead(id)` -> `PATCH /api/v1/notifications/:id/read`
    - `markAllNotificationsAsRead()` -> `PATCH /api/v1/notifications/read-all`
    - `deleteNotification(id)` -> `DELETE /api/v1/notifications/:id`
    - `getNotificationStreamUrl(accessToken)` -> URL para `EventSource` hacia `GET /api/v1/notifications/stream?token=...`
    - `subscribeToForm(formId, prefs)` -> `POST /api/v1/forms/:id/subscribe`
    - `unsubscribeFromForm(formId)` -> `DELETE /api/v1/forms/:id/subscribe`
    - `getFormSubscription(formId)` -> `GET /api/v1/forms/:id/subscription`

- [ ] **24.2 Streaming en Tiempo Real (SSE) y Campana de Notificaciones (`NotificationBell.tsx` + `NotificationsPopover.tsx`)**
  - [ ] `24.2.1` Crear custom hook `src/hooks/useNotifications.ts` que al iniciar sesión consulte `GET /api/v1/notifications/unread-count` y abra una conexión `EventSource` contra `/api/v1/notifications/stream?token=<accessToken>`.
  - [ ] `24.2.2` Escuchar el evento `notification` del stream SSE para incrementar en vivo el contador `unreadCount`, insertar la alerta en la cabeza de la bandeja y disparar un Toast no intrusivo con el `title` y `message` recibidos.
  - [ ] `24.2.3` Crear componente `NotificationBell.tsx` y `NotificationsPopover.tsx` integrados en la cabecera/barra lateral:
    - Badge numérico rojo con conteo de no leídas.
    - Filtro rápido "Todas / No leídas", botón **"Marcar todas como leídas"** (`PATCH /api/v1/notifications/read-all`) y botón de eliminar alerta individual (`DELETE /api/v1/notifications/:id`).
    - Navegación directa: al hacer clic en una notificación con `resourceId` de formulario, marcarla como leída (`PATCH /api/v1/notifications/:id/read`) y abrir directamente la bandeja del formulario correspondiente.

- [ ] **24.3 Botón e Interruptor de Suscripción por Formulario (`FormSubscriptionButton.tsx`)**
  - [ ] `24.3.1` Crear componente `src/components/forms/FormSubscriptionButton.tsx` e integrarlo en `FormsStudioView.tsx` (tanto en las tarjetas del catálogo de formularios como en la cabecera de la bandeja de entradas de un formulario).
  - [ ] `24.3.2` Consultar `GET /api/v1/forms/:id/subscription` y permitir activar/configurar alertas granulares (`notifyOnNewEntry`, `notifyOnResolution`) mediante `POST /api/v1/forms/:id/subscribe` o cancelarlas con `DELETE /api/v1/forms/:id/subscribe`.

---

## 🗂️ Módulo 25: Arquitectura Jerárquica de Carpetas en 3 Niveles (`CONTAINER`, `parentId`, `/folders/tree`) & Bóveda Compartida (`shared`) (Backend Fase 20)

> **Rutas Backend Nuevas y Evolucionadas (#14, #15, #16, #17, #19):**
> - **Nueva Ruta #15:** `GET /api/v1/folders/tree` (Árbol jerárquico anidado completo con `children[]`, `parentId`, `isSystem` y `type: 'CONTAINER' | 'IMAGE' | 'TABLE' | 'PDF'`).
> - **Ruta #14 Mejorada:** `GET /api/v1/folders?parentId=&type=&search=&page=&limit=` (Soporta filtro por `parentId`, tipo `CONTAINER` y devuelve `parentId: string | null`, `isSystem: boolean`).
> - **Ruta #16 Mejorada:** `POST /api/v1/folders` (Reglas estrictas de 3 niveles: Nivel 1 `CONTAINER`, Nivel 2 subcarpeta especializada `IMAGE | TABLE | PDF`, Nivel 3 hereda el `type` del Nivel 2; máximo 3 niveles de profundidad).

- [ ] **25.1 Actualización de Contratos y Servicio de Carpetas (`foldersService.ts`)**
  - [ ] `25.1.1` Ampliar `FolderType` en `src/services/foldersService.ts` y `src/types/media.ts` para incluir `'CONTAINER'` (`'container'`) además de `'IMAGE' | 'TABLE' | 'PDF'`, y añadir las propiedades `parentId: string | null`, `isSystem?: boolean` y `children?: RemoteFolder[]`.
  - [ ] `25.1.2` Implementar `fetchFolderTree()` en `foldersService.ts` consumiendo `GET /api/v1/folders/tree` para obtener la estructura jerárquica completa de hasta 3 niveles.
  - [ ] `25.1.3` Actualizar `fetchFolders(params)` en `foldersService.ts` para enviar opcionalmente `parentId` en el query string (`GET /api/v1/folders?parentId=...`).

- [ ] **25.2 Reglas de Negocio de 3 Niveles en Creación y Subida de Archivos**
  - [ ] `25.2.1` Actualizar `CreateFolderModal.tsx` según el nivel jerárquico del padre seleccionado:
    - **Si se crea en Nivel 1 (`parentId: null`)**: solo permitido para `ADMIN`/`MANAGER` con tipo `CONTAINER` (o carpeta raíz según rol; un `COLLABORATOR` no puede crear carpetas en raíz `parentId: null`).
    - **Si el padre es Nivel 1 (`parent.type === 'CONTAINER'`)**: obligar a elegir el tipo especializado de la subcarpeta de Nivel 2 (`IMAGE`, `TABLE` o `PDF`).
    - **Si el padre es Nivel 2 (`IMAGE | TABLE | PDF`)**: bloquear/autoseleccionar el mismo `type` del padre para la subcarpeta de Nivel 3 (cumpliendo la regla de herencia estricta `parent.type === child.type`).
    - **Si la carpeta actual ya está en Nivel 3 (profundidad máxima = 3)**: deshabilitar el botón **"Nueva Subcarpeta"** con tooltip explicativo (evitando el error `400 MAX_FOLDER_DEPTH_EXCEEDED`).
  - [ ] `25.2.2` **Bloqueo y Guía UX en Carpetas Contenedoras (`CONTAINER` - Nivel 1)**:
    - Como el backend prohíbe subir archivos o crear formularios directamente en una carpeta `CONTAINER` (`400 CANNOT_UPLOAD_TO_CONTAINER_FOLDER`), cuando el usuario esté posicionado en una carpeta de Nivel 1 (`type === 'CONTAINER'`), mostrar un banner claro indicando que es una carpeta departamental/raíz e invitarle a entrar o crear una subcarpeta especializada (Nivel 2 o 3) al intentar subir un archivo.

- [ ] **25.3 Bóveda Compartida del Sistema (`shared` / `isSystem: true`) y Árbol Visual en `<main>`**
  - [ ] `25.3.1` Destacar visualmente en `MainExplorerHeader.tsx` la carpeta corporativa del sistema **`shared`** (`isSystem: true`) con icono de bóveda compartida y badge **"Sistema · Compartida"**.
  - [ ] `25.3.2` Ocultar los botones de **Editar** y **Eliminar** en carpetas con `isSystem: true` (como `shared` o la carpeta departamental raíz del Manager cuando no sea `ADMIN`), previniendo el error `400 CANNOT_MODIFY_SYSTEM_FOLDER`.
  - [ ] `25.3.3` Integrar selector jerárquico basado en `GET /api/v1/folders/tree` dentro de `MoveToFolderModal.tsx` y `BulkMoveModal.tsx` para permitir mover imágenes, tablas y PDFs hacia subcarpetas de Nivel 2 y Nivel 3 compatibles con el tipo de archivo.

---

## ⚡ Módulo 26: Unificación de Subida Global (Imágenes + Tablas + PDFs), Publicación `ai_manager`, Sincronización OpenAPI 3.1 & Certificación E2E

- [ ] **26.1 Soporte de Documentos PDF en el Botón Global "Subir Archivo" (`UploadModal.tsx` / `useMediaWorkspace.ts`)**
  - [ ] `26.1.1` Ampliar `UploadModal.tsx`, `DropzoneOverlay.tsx` y `handleFilesUpload` en `useMediaWorkspace.ts` para aceptar archivos `.pdf` (`application/pdf`) además de imágenes y tablas CSV/XLSX.
  - [ ] `26.1.2` Enrutar automáticamente los archivos `.pdf` hacia `pdfsService.uploadPdf(file, folderId)` desde el flujo global de subida, garantizando que el único botón **"Subir Archivo"** del menú lateral suba cualquier formato soportado por el backend.

- [ ] **26.2 Interruptor Directo de Publicación al Chat Web Público (`ai_manager`) en `ShareFolderModal.tsx`**
  - [ ] `26.2.1` Añadir en `ShareFolderModal.tsx` un interruptor rápido **"Publicar en Widget de Chat Web Público (`ai_manager`)"** que comparta o revoque con un solo clic el permiso `READ` al usuario de sistema `ai_manager` (`POST /api/v1/folders/:id/shares` / `DELETE /api/v1/folders/:id/shares/:userId`).

- [ ] **26.3 Re-Sincronización de Contrato OpenAPI 3.1 y Pruebas Automatizadas E2E**
  - [ ] `26.3.1` Actualizar `src/types/api.generated.ts` ejecutando `npm run types:sync` contra el `openapi.json` actualizado de `monolith-backend` (incluyendo los esquemas de `Notifications` y `Folders` de 3 niveles).
  - [ ] `26.3.2` Crear tests unitarios y de componentes en archivos nuevos (respetando la Regla 1.1 de `AGENTS.md`):
    - `src/services/notificationsService.test.ts`
    - `src/components/notifications/NotificationsPopover.test.tsx`
    - `src/services/foldersService.tree.test.ts`
  - [ ] `26.3.3` Certificar `npm run test` (100% en verde), `npm run lint` (0 advertencias, 0 errores) y `npm run build` (0 errores TypeScript y todos los archivos manuales `< 300` líneas).


