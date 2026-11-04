# 📋 Plan Maestro de Tareas (TODO) — Gestor Multimedia Frontend

> **Objetivo:** Cobertura total y explotación máxima del backend (`monolith-backend`).  
> **Estado:** 38 de 38 rutas analizadas e integradas en fases atómicas de desarrollo frontend.  
> **Regla de Oro:** Consumo estricto de endpoints de `monolith-backend` sin modificar el backend. Cada acción del usuario aprovecha al 100% las capacidades nativas del servidor (RBAC, streaming de alta velocidad, pre-cálculos, RAG tabular y capacidades multimedia).

---

## 📊 Estado Actual del Proyecto (Snapshot al 03/11/2026)

| Métrica / Dimensión | Estado Actual | Detalle |
|---|:---:|---|
| **Pruebas Automatizadas (Vitest)** | **87 / 87 (100% pasando)** | 22 suites en verde, 0 fallos |
| **Linter (Oxlint)** | **0 advertencias, 0 errores** | 67 archivos analizados con 116 reglas |
| **Compilación (TypeScript / Vite)** | **Compilación Limpia (0 errores)** | Bundle listo para producción generado en 589ms |
| **Cobertura de Endpoints Backend** | **38 / 38 Mapeados** | 7 Implementados / 5 Parciales / 26 Planificados |
| **Módulos Base Completados** | **10 / 18 Módulos (55.5%)** | Módulos 1 al 10 finalizados y testeados |
| **Capa de Transporte HTTP** | **Completa (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)** | Métodos extendidos, soporte `FormData`, streams y RFC 7807 |
| **Contrato y Tipado OpenAPI 3.1** | **Sincronizado al 100%** | Generado en `src/types/api.generated.ts` (4.705 LOC) con script `types:sync` |
| **Siguiente Módulo Activo** | ⏳ **Módulo 11 o Módulo 13** | Tokens Rotativos / Sesión o Carpetas en PostgreSQL con RBAC |

---

## 🧭 Matriz Maestra de Cobertura de Rutas Backend (38 / 38 Endpoints)

| # | Método | Ruta Backend | Módulo Frontend | Componente / Vista | Servicio Frontend | Estado |
|---|:---:|---|:---:|:---:|:---:|:---:|
| **1** | `GET` | `/health` | Módulo 1 / 17 | `HealthBadge.tsx`, `StatusBar.tsx`, `SettingsView.tsx` | `healthService.ts` | ✅ Parcial / ⏳ Extendido |
| **2** | `GET` | `/docs` | Módulo 17 | `ApiDocsModal.tsx` / `SettingsView.tsx` (Scalar UI) | `apiClient.ts` | ⏳ Pendiente |
| **3** | `GET` | `/openapi.json` | Módulo 10 / 17 | `openapi.json` -> `src/types/api.ts` (Generador) | Scripts de tipado | ✅ Implementado |
| **4** | `POST` | `/api/v1/auth/login` | Módulo 4 / 11 | `LoginView.tsx` (Login con roles RBAC) | `authService.ts` | ✅ Parcial / ⏳ Refactor |
| **5** | `POST` | `/api/v1/auth/refresh` | Módulo 11 | `apiClient.ts` (Interceptor de 401 automático) | `authService.ts` | ⏳ Pendiente |
| **6** | `POST` | `/api/v1/auth/logout` | Módulo 11 | `Sidebar.tsx` / `UserMenu.tsx` (Cierre en servidor) | `authService.ts` | ⏳ Pendiente |
| **7** | `GET` | `/api/v1/auth/me` | Módulo 11 | `AuthContext.tsx` (Validación de sesión activa) | `authService.ts` | ⏳ Pendiente |
| **8** | `PATCH` | `/api/v1/auth/password` | Módulo 11 | `ChangePasswordModal.tsx` (Autogestión de clave) | `authService.ts` | ⏳ Pendiente |
| **9** | `POST` | `/api/v1/users` | Módulo 12 | `UserProfilesView.tsx` (Jerarquía ADMIN > MGR > COL) | `usersService.ts` | ⏳ Pendiente |
| **10** | `GET` | `/api/v1/users` | Módulo 12 | `UserProfilesView.tsx` (Listado dinámico DB) | `usersService.ts` | ⏳ Pendiente |
| **11** | `PATCH` | `/api/v1/users/:id/status` | Módulo 12 | `UserProfilesView.tsx` (Toggle Activar/Suspender) | `usersService.ts` | ⏳ Pendiente |
| **12** | `PATCH` | `/api/v1/users/:id/password` | Módulo 12 | `ResetPasswordModal.tsx` (Reset forzado por superior) | `usersService.ts` | ⏳ Pendiente |
| **13** | `DELETE` | `/api/v1/users/:id` | Módulo 12 | `UserProfilesView.tsx` (Borrado con cascada) | `usersService.ts` | ⏳ Pendiente |
| **14** | `GET` | `/api/v1/folders` | Módulo 13 | `Sidebar.tsx`, `FolderGrid.tsx` (Filtros, search, permisos) | `foldersService.ts` | ⏳ Pendiente |
| **15** | `POST` | `/api/v1/folders` | Módulo 13 | `CreateFolderModal.tsx` (Creación IMAGE/TABLE con color) | `foldersService.ts` | ⏳ Pendiente |
| **16** | `PATCH` | `/api/v1/folders/:id` | Módulo 13 | `EditFolderModal.tsx` (Renombrar, color, privacidad) | `foldersService.ts` | ⏳ Pendiente |
| **17** | `GET` | `/api/v1/folders/:id` | Módulo 13 | `FolderHeader.tsx` (Detalle y estadísticas) | `foldersService.ts` | ⏳ Pendiente |
| **18** | `DELETE` | `/api/v1/folders/:id` | Módulo 13 | `Sidebar.tsx` / `FolderMenu` (Borrado en cascada) | `foldersService.ts` | ⏳ Pendiente |
| **19** | `POST` | `/api/v1/folders/:id/shares` | Módulo 13 | `ShareFolderModal.tsx` (Asignar colaborador READ/EDIT) | `foldersService.ts` | ⏳ Pendiente |
| **20** | `GET` | `/api/v1/folders/:id/shares` | Módulo 13 | `ShareFolderModal.tsx` (Lista de miembros con acceso) | `foldersService.ts` | ⏳ Pendiente |
| **21** | `PATCH` | `/api/v1/folders/:id/shares/:userId` | Módulo 13 | `ShareFolderModal.tsx` (Alternar READ <-> EDIT) | `foldersService.ts` | ⏳ Pendiente |
| **22** | `DELETE` | `/api/v1/folders/:id/shares/:userId` | Módulo 13 | `ShareFolderModal.tsx` (Revocar y expulsar) | `foldersService.ts` | ⏳ Pendiente |
| **23** | `GET` | `/api/v1/images` | Módulo 14 | `ImagesView.tsx` (Paginación server-side y folderId) | `imagesService.ts` | ✅ Parcial / ⏳ Extendido |
| **24** | `POST` | `/api/v1/images` | Módulo 14 | `UploadModal.tsx`, `DropzoneOverlay.tsx` | `imagesService.ts` | ✅ Implementado |
| **25** | `PATCH` | `/api/v1/images/:id` | Módulo 14 | `RenameImageModal.tsx` / `ImageCard.tsx` (Renombrado) | `imagesService.ts` | ⏳ Pendiente |
| **26** | `PUT` | `/api/v1/images/:id` | Módulo 14 | `HotSwapImageModal.tsx` (Reemplazo binario en caliente) | `imagesService.ts` | ⏳ Pendiente |
| **27** | `DELETE` | `/api/v1/images/:id` | Módulo 14 | `ImageCard.tsx`, `ImageInspector.tsx` | `imagesService.ts` | ✅ Implementado |
| **28** | `PATCH` | `/api/v1/images/:id/folder` | Módulo 13 | `MoveToFolderModal.tsx` (Reasignar carpeta en DB) | `foldersService.ts` | ⏳ Pendiente |
| **29** | `GET` | `/i/:short_code` | Módulo 14 | `ImageCard.tsx` (?variant=thumb), `Inspector` (original) | `imagesService.ts` | ⏳ Optimización |
| **30** | `GET` | `/api/v1/tables` | Módulo 15 | `TablesCatalogView.tsx` (Paginación y folderId) | `tablesService.ts` | ✅ Parcial / ⏳ Extendido |
| **31** | `POST` | `/api/v1/tables` | Módulo 15 | `UploadModal.tsx` (CSV/XLSX con carpeta) | `tablesService.ts` | ✅ Implementado |
| **32** | `DELETE` | `/api/v1/tables/:id` | Módulo 15 | `TablesCatalogView.tsx`, `TableDataStudioView.tsx` | `tablesService.ts` | ✅ Implementado |
| **33** | `PATCH` | `/api/v1/tables/:id/folder` | Módulo 13 | `MoveToFolderModal.tsx` (Reasignar carpeta en DB) | `foldersService.ts` | ⏳ Pendiente |
| **34** | `GET` | `/t/:short_code` | Módulo 15 | `TableDataStudioView.tsx` (Headers, merges, styles, raw) | `tablesService.ts` | ✅ Parcial / ⏳ Extendido |
| **35** | `PATCH` | `/api/v1/tables/:id/metadata` | Módulo 15 | `TableMetadataEditorModal.tsx` (Ficha Técnica) | `tablesService.ts` | ⏳ Pendiente |
| **36** | `POST` | `/api/v1/chat/ask` | Módulo 16 | `ChatStudioView.tsx` (RAG Tabular con fuentes y charts) | `chatService.ts` | ⏳ Pendiente |
| **37** | `POST` | `/api/v1/public/chat/ask` | Módulo 16 | `PublicWidgetPreviewModal.tsx` (Widget web embebible) | `chatService.ts` | ⏳ Pendiente |
| **38** | `GET` | `/api/v1/public/chat/suggestions` | Módulo 16 | `ChatStudioView.tsx` (Chips de preguntas sugeridas) | `chatService.ts` | ⏳ Pendiente |

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

- [ ] **11.1 Renovación Transparente de Token (Interceptor de Refresco)**
  - [ ] `11.1.1` Implementar en `apiClient.ts` una cola de peticiones con interceptor: si una petición falla con `401 UNAUTHORIZED` y no es la ruta de login, invocar `POST /api/v1/auth/refresh` con `credentials: 'include'`.
  - [ ] `11.1.2` Si el refresco es exitoso, actualizar token en memoria/localStorage y reintentar la petición original sin interrumpir al usuario.
  - [ ] `11.1.3` Si el refresco falla (`SESSION_REVOKED` o refresh token expirado), ejecutar logout limpio en frontend y redirigir a `LoginView`.

- [ ] **11.2 Validación de Sesión Activa al Iniciar (`GET /api/v1/auth/me`)**
  - [ ] `11.2.1` Integrar llamada a `GET /api/v1/auth/me` en la inicialización de `AuthContext.tsx` para sincronizar datos reales del usuario (`id`, `username`, `role`, `isActive`, `createdById`).
  - [ ] `11.2.2` Soportar roles estrictos `ADMIN`, `MANAGER`, `COLLABORATOR` en la interfaz de usuario con badges de color específicos.

- [ ] **11.3 Cierre de Sesión Seguro en Servidor (`POST /api/v1/auth/logout`)**
  - [ ] `11.3.1` Actualizar `authService.logout()` para realizar petición `POST /api/v1/auth/logout` antes de limpiar el estado local, revocando el `tokenVersion` en PostgreSQL y limpiando la cookie HttpOnly.
  - [ ] `11.3.2` Conectar el botón de desconexión del `Sidebar.tsx` con feedback visual toast.

- [ ] **11.4 Autogestión de Contraseña Propia (`PATCH /api/v1/auth/password`)**
  - [ ] `11.4.1` Crear componente modal `ChangePasswordModal.tsx` con campos: Contraseña Actual, Nueva Contraseña y Confirmación.
  - [ ] `11.4.2` Validar longitud mínima de 6 caracteres y coincidencia antes de enviar a `PATCH /api/v1/auth/password`.
  - [ ] `11.4.3` Añadir botón de acceso rápido "Cambiar Contraseña" en la tarjeta de perfil del `Sidebar.tsx` y en `SettingsView.tsx`.
  - [ ] `11.4.4` Pruebas unitarias para `ChangePasswordModal.test.tsx` y `authService.password.test.ts`.

---

## 👥 Módulo 12: Suite de Administración Jerárquica de Usuarios (RBAC)

> **Rutas Backend:** `GET /api/v1/users`, `POST /api/v1/users`, `PATCH /api/v1/users/:id/status`, `PATCH /api/v1/users/:id/password`, `DELETE /api/v1/users/:id`.  
> **Regla Jerárquica:** `ADMIN` gestiona todo el sistema. `MANAGER` crea y gestiona únicamente sus colaboradores. `COLLABORATOR` no tiene acceso a gestión de usuarios.

- [ ] **12.1 Servicio de Usuarios Conectado a PostgreSQL (`src/services/usersService.ts`)**
  - [ ] `12.1.1` Implementar `listUsers()` consumiendo `GET /api/v1/users`.
  - [ ] `12.1.2` Implementar `createUser(payload)` consumiendo `POST /api/v1/users` respetando jerarquía de roles (`MANAGER` o `COLLABORATOR`).
  - [ ] `12.1.3` Implementar `updateUserStatus(userId, isActive)` consumiendo `PATCH /api/v1/users/:id/status`.
  - [ ] `12.1.4` Implementar `resetUserPassword(userId, newPassword)` consumiendo `PATCH /api/v1/users/:id/password`.
  - [ ] `12.1.5` Implementar `deleteUser(userId)` consumiendo `DELETE /api/v1/users/:id`.

- [ ] **12.2 Rediseño y Conexión de `UserProfilesView.tsx`**
  - [ ] `12.2.1` Sustituir la persistencia local de `storageService.getCreatedUsers()` por la carga en vivo desde `usersService.listUsers()`.
  - [ ] `12.2.2` Adaptar el formulario de creación: permitir a un `ADMIN` seleccionar entre rol `MANAGER` y `COLLABORATOR`; forzar a rol `COLLABORATOR` si el usuario en sesión es `MANAGER`.
  - [ ] `12.2.3` Tabla de usuarios registrados con columnas: Usuario, Rol, Creado por, Estado (`Activo` / `Suspendido`), Fecha de registro y Acciones.
  - [ ] `12.2.4` Botón switch/toggle para suspender o reactivar usuario en 1 clic (`PATCH /api/v1/users/:id/status`).

- [ ] **12.3 Modales de Restablecimiento y Eliminación de Usuarios**
  - [ ] `12.3.1` Crear modal `ResetUserPasswordModal.tsx` con generador automático de contraseñas seguras y botón copiar.
  - [ ] `12.3.2` Modal de confirmación destructiva con advertencia de que la eliminación de un usuario destruye en cascada sus archivos en almacenamiento físico.
  - [ ] `12.3.3` Pruebas de integración RTL en `UserProfilesView.test.tsx` cubriendo el flujo CRUD completo.

---

## 📁 Módulo 13: Descongelamiento y Gestión Total de Carpetas en PostgreSQL con RBAC

> **Rutas Backend:** `GET /api/v1/folders`, `POST /api/v1/folders`, `GET /api/v1/folders/:id`, `PATCH /api/v1/folders/:id`, `DELETE /api/v1/folders/:id`, `POST /api/v1/folders/:id/shares`, `GET /api/v1/folders/:id/shares`, `PATCH /api/v1/folders/:id/shares/:userId`, `DELETE /api/v1/folders/:id/shares/:userId`, `PATCH /api/v1/images/:id/folder`, `PATCH /api/v1/tables/:id/folder`.

- [ ] **13.1 Servicio Centralizado de Carpetas (`src/services/foldersService.ts`)**
  - [ ] `13.1.1` Implementar `fetchFolders(type?, search?, page?, limit?)` consumiendo `GET /api/v1/folders`.
  - [ ] `13.1.2` Implementar `createFolder(payload)` consumiendo `POST /api/v1/folders`.
  - [ ] `13.1.3` Implementar `updateFolder(id, payload)` consumiendo `PATCH /api/v1/folders/:id` (renombrar, color, privacidad).
  - [ ] `13.1.4` Implementar `deleteFolder(id)` consumiendo `DELETE /api/v1/folders/:id`.
  - [ ] `13.1.5` Implementar `moveImageToFolder(imageId, folderId)` consumiendo `PATCH /api/v1/images/:id/folder`.
  - [ ] `13.1.6` Implementar `moveTableToFolder(tableId, folderId)` consumiendo `PATCH /api/v1/tables/:id/folder`.
  - [ ] `13.1.7` Implementar métodos de compartición: `shareFolder()`, `listShares()`, `updateSharePermission()`, `revokeShare()`.

- [ ] **13.2 Descongelamiento en `App.tsx` y Sincronización en Sidebar**
  - [ ] `13.2.1` Establecer `ENABLE_FOLDERS = true` en `App.tsx` y eliminar la dependencia de carpetas locales en `storageService`.
  - [ ] `13.2.2` En `Sidebar.tsx`: Renderizar árbol de carpetas obtenido de PostgreSQL filtrado según la pestaña activa (`IMAGE` en Galería, `TABLE` en Datasets).
  - [ ] `13.2.3` Badges visuales en cada carpeta: Candado para privadas (`isPrivate`), ícono de usuarios para compartidas, badge de permiso (`Lectura` o `Edición`) y contador real de elementos (`itemCount`).
  - [ ] `13.2.4` Protección de carpeta `General`: ocultar o deshabilitar opciones de renombrado y borrado sobre la carpeta del sistema.

- [ ] **13.3 Modal de Edición de Carpetas (`EditFolderModal.tsx`)**
  - [ ] `13.3.1` Crear componente `EditFolderModal.tsx` con campos para: nuevo nombre, selector de paleta de colores hexadecimales y toggle de privacidad privada/pública.
  - [ ] `13.3.2` Bloquear acceso si la carpeta es `General` o si el usuario no tiene permiso de propietario o `ADMIN`.

- [ ] **13.4 Sistema de Compartición de Carpetas (`ShareFolderModal.tsx`)**
  - [ ] `13.4.1` Crear modal `ShareFolderModal.tsx` accesible desde el menú de la carpeta en el Sidebar.
  - [ ] `13.4.2` Selector de usuarios colaboradores disponibles en el sistema con asignación de permiso inicial (`READ` o `EDIT`).
  - [ ] `13.4.3` Lista de miembros activos en la carpeta compartida con selector desplegable en línea para conmutar entre `Lectura` y `Edición` (`PATCH /api/v1/folders/:id/shares/:userId`).
  - [ ] `13.4.4` Botón para expulsar/revocar acceso a un colaborador (`DELETE /api/v1/folders/:id/shares/:userId`).

- [ ] **13.5 Conexión de Reasignación Real (`MoveToFolderModal.tsx`)**
  - [ ] `13.5.1` Actualizar `handleConfirmMove` en `App.tsx` para llamar a `foldersService.moveImageToFolder` o `foldersService.moveTableToFolder` en el backend.
  - [ ] `13.5.2` Notificar con Toast de éxito o error descriptivo según el permiso RBAC del usuario.
  - [ ] `13.5.3` Pruebas unitarias e integradas para `foldersService.test.ts`, `EditFolderModal.test.tsx` y `ShareFolderModal.test.tsx`.

---

## 🖼️ Módulo 14: Potenciación del Módulo de Imágenes (Hot-Swap, Renombrado & Miniaturas WebP)

> **Rutas Backend:** `PATCH /api/v1/images/:id`, `PUT /api/v1/images/:id`, `GET /i/:short_code?variant=thumb`, `GET /api/v1/images?page=&limit=&folderId=`.

- [ ] **14.1 Miniaturas WebP de Alta Velocidad y Rendimiento Visual**
  - [ ] `14.1.1` Actualizar `ImageCard.tsx` para solicitar `/i/:short_code?variant=thumb` en la vista de cuadrícula, reduciendo drásticamente el peso de descarga de imágenes de alta resolución.
  - [ ] `14.1.2` Cargar la imagen original completa (`/i/:short_code?variant=original`) únicamente al abrir el visor de zoom e inspección (`ImageInspector.tsx`).
  - [ ] `14.1.3` Soporte de invalidación de caché usando la propiedad `urlWithVersion` (`?v=timestamp`) devuelta por el backend para evitar que el navegador muestre imágenes en caché obsoletas.

- [ ] **14.2 Renombrado en Caliente de Imágenes (`PATCH /api/v1/images/:id`)**
  - [ ] `14.2.1` Implementar `renameImage(id, originalName)` en `imagesService.ts`.
  - [ ] `14.2.2` Crear modal rápido `RenameImageModal.tsx` o edición in-line de nombre en `ImageInspector.tsx` con confirmación inmediata.
  - [ ] `14.2.3` Actualización instantánea del estado local y feedback toast tras renombrar.

- [ ] **14.3 Reemplazo en Caliente de Binario / Hot-Swap (`PUT /api/v1/images/:id`)**
  - [ ] `14.3.1` Implementar `replaceImage(id, file)` en `imagesService.ts` enviando `multipart/form-data` mediante `apiClient.put`.
  - [ ] `14.3.2` Crear modal `HotSwapImageModal.tsx` con dropzone interactivo que muestre comparación antes/después (archivo actual vs nuevo archivo a sustituir).
  - [ ] `14.3.3` Advertencia clara: *"El archivo se actualizará conservando exactamente el mismo shortCode y URL pública compartida"*.
  - [ ] `14.3.4` Actualización automática de miniatura y metadatos (`sizeBytes`, `width`, `height`) tras la sustitución exitosa.

- [ ] **14.4 Paginación Server-Side y Filtros en Galería**
  - [ ] `14.4.1` Actualizar llamada `imagesService.fetchRemoteImages({ page, limit, folderId })` en `ImagesView.tsx`.
  - [ ] `14.4.2` Añadir controles de paginación previa/siguiente en la barra de herramientas de la galería si el número de imágenes excede el límite de página.
  - [ ] `14.4.3` Pruebas automatizadas en `imagesService.test.ts` y componentes de UI de imágenes.

---

## 📊 Módulo 15: Catálogo de Datasets & Data Studio con Ficha Técnica (`metadataCard`)

> **Rutas Backend:** `PATCH /api/v1/tables/:id/metadata`, `GET /t/:short_code` (headers, merges, cellStyles, ?download=true), `GET /api/v1/tables?page=&limit=&folderId=`.

- [ ] **15.1 Soporte Integral de Formato Rico en Data Studio (`TableDataStudioView.tsx`)**
  - [ ] `15.1.1` Actualizar `tablesService.fetchTableDetails(shortCode, page, limit)` para extraer y tipar metadatos avanzados: `headers` multinivel, `merges` (celdas combinadas) y `cellStyles` (colores de fondo, negritas, alineación).
  - [ ] `15.1.2` Adaptar `DataGrid.tsx` para aplicar dinámicamente los estilos calculados por el backend (`cellStyles[rowIdx][colName]`) y representar visualmente las celdas agrupadas (`merges`).
  - [ ] `15.1.3` Mantener botón de descarga directa de alta fidelidad (`/t/:short_code?download=true`) que descargue el `.xlsx` o `.csv` intacto con su nombre original.

- [ ] **15.2 Editor e Inspector de Ficha Técnica (`TableMetadataEditorModal.tsx`)**
  - [ ] `15.2.1` Implementar `updateTableMetadata(id, metadata)` en `tablesService.ts` consumiendo `PATCH /api/v1/tables/:id/metadata`.
  - [ ] `15.2.2` Crear componente `TableMetadataEditorModal.tsx` accesible desde la tarjeta de tabla y la barra del Data Studio.
  - [ ] `15.2.3` Formulario con campos:
    - **Título Descriptivo** (`title`).
    - **Descripción del Dataset** (`description`).
    - **Etiquetas Temáticas** (`tags`: chips interactivos agregables/eliminables).
    - **Unidad de Medida** (`unit`, ej. "habitantes", "USD", "toneladas").
    - **Diccionario de Columnas** (`columnsMeta`: glosario donde se describe el significado de cada columna detectada).
    - **Toggle de Filas de Resumen** (`hasSummaryRows`: indicador para evitar duplicación de totales en análisis).
  - [ ] `15.2.4` Visualizador de sólo lectura tipo Badge / Tooltip en `TableCard.tsx` para previsualizar la ficha técnica rápidamente.

- [ ] **15.3 Paginación Server-Side y Filtros en Catálogo de Tablas**
  - [ ] `15.3.1` Integrar `folderId`, `page` y `limit` en `tablesService.fetchRemoteTables()`.
  - [ ] `15.3.2` Pruebas unitarias para `tablesService.metadata.test.ts` y renderizado de Ficha Técnica.

---

## 🤖 Módulo 16: Asistente Analítico Inteligente (Chat RAG Tabular & Gráficos)

> **Rutas Backend:** `POST /api/v1/chat/ask`, `POST /api/v1/public/chat/ask`, `GET /api/v1/public/chat/suggestions`.

- [ ] **16.1 Servicio de Chat y RAG Tabular (`src/services/chatService.ts`)**
  - [ ] `16.1.1` Implementar `askInternal(question, folderId?, shortCode?)` consumiendo `POST /api/v1/chat/ask`.
  - [ ] `16.1.2` Implementar `getPublicSuggestions(folderId?)` consumiendo `GET /api/v1/public/chat/suggestions`.
  - [ ] `16.1.3` Implementar `askPublic(question, folderId?, shortCode?)` consumiendo `POST /api/v1/public/chat/ask`.

- [ ] **16.2 Vista del Asistente Analítico (`ChatStudioView.tsx`)**
  - [ ] `16.2.1` Crear vista principal `ChatStudioView.tsx` y registrarla en el `Sidebar.tsx` con ícono de Sparkles/Bot (`Consulta Inteligente` / `Data Chat`).
  - [ ] `16.2.2` Selector de contexto: consultar sobre "Todas mis tablas accesibles", filtrar por una carpeta en específico o por un dataset concreto.
  - [ ] `16.2.3` Barra de sugerencias dinámicas con chips clickeables obtenidos de `GET /api/v1/public/chat/suggestions`.
  - [ ] `16.2.4` Hilo de conversación con burbujas de mensaje para el usuario y respuestas analíticas fundamentadas del backend.
  - [ ] `16.2.5` Tratamiento visual elegante cuando el dato no existe (`foundInSystem: false` con aviso claro de dato no registrado).

- [ ] **16.3 Renderizado de Fuentes Citadas & Gráficos Estadísticos**
  - [ ] `16.3.1` Componente `ChatSourcesList.tsx`: Muestra las tarjetas de tablas utilizadas como fuentes (`tableName`, `shortCode`, `title`) con botón directo para abrirlas en el Data Studio a pantalla completa.
  - [ ] `16.3.2` Componente `ChatChartRenderer.tsx`: Si la respuesta contiene `chartData` (`labels`, `values`, `percentages`), renderizar automáticamente un gráfico visual (gráfico de barras horizontales/verticales con porcentajes y formateo de números en español).

- [ ] **16.4 Generador y Sandbox de Widget Web Público (`PublicWidgetPreviewModal.tsx`)**
  - [ ] `16.4.1` Crear modal en `SettingsView` o `ChatStudioView` para generar el código embebible del Widget Público de Chat.
  - [ ] `16.4.2` Probar en vivo el endpoint `POST /api/v1/public/chat/ask` demostrando cómo terceros pueden consultar tablas públicas respetando el rate-limit.
  - [ ] `16.4.3` Botón para copiar snippet HTML / iFrame listo para incrustar en sitios web externos.
  - [ ] `16.4.4` Pruebas unitarias para `chatService.test.ts` y componentes de visualización de chat y gráficos.

---

## 📖 Módulo 17: Visor Interactivo de Documentación OpenAPI (Scalar) & Diagnóstico

> **Rutas Backend:** `GET /docs`, `GET /openapi.json`, `GET /health`.

- [ ] **17.1 Explorador de Documentación Scalar Integrado**
  - [ ] `17.1.1` Añadir en `SettingsView.tsx` una sección destacada "Documentación Interactiva de la API (Scalar)".
  - [ ] `17.1.2` Botón con enlace directo para abrir `/docs` en nueva pestaña y modal visor integrado con iframe responsive de la consola Scalar del backend.
  - [ ] `17.1.3` Botón de descarga/inspección de la especificación cruda `GET /openapi.json` con formateador visual de JSON y copiado al portapapeles.

- [ ] **17.2 Panel de Diagnóstico de Salud en Tiempo Real**
  - [ ] `17.2.1` Enriquecer `healthService.ts` para capturar el estado individual de servicios devueltos por `GET /health` (`database: 'up'`, `storage: 'up'`, `uptime`).
  - [ ] `17.2.2` Mostrar tarjetas de diagnóstico en `SettingsView.tsx` con badges de latencia milimétrica y estado de conexión PostgreSQL y Storage.

---

## 🧪 Módulo 18: Calidad Integral, Testing Automatizado E2E & Build de Producción

- [ ] **18.1 Cobertura Exhaustiva con Vitest y React Testing Library**
  - [ ] `18.1.1` Tests unitarios para el 100% de los nuevos servicios:
    - `apiClient.advanced.test.ts`
    - `authService.extended.test.ts`
    - `usersService.test.ts`
    - `foldersService.test.ts`
    - `chatService.test.ts`
    - `tablesService.metadata.test.ts`
  - [ ] `18.1.2` Tests de componentes y modales:
    - `ChangePasswordModal.test.tsx`
    - `UserProfilesView.test.tsx`
    - `EditFolderModal.test.tsx`
    - `ShareFolderModal.test.tsx`
    - `HotSwapImageModal.test.tsx`
    - `TableMetadataEditorModal.test.tsx`
    - `ChatStudioView.test.tsx`
  - [ ] `18.1.3` Pruebas de integración global de vistas en `App.test.tsx` cubriendo el nuevo flujo con carpetas activas y chat.

- [ ] **18.2 Verificación de Calidad y Cero Regresiones**
  - [ ] `18.2.1` Ejecución de `npm run test` verificando que el 100% de los tests (actuales y nuevos) pasen con 0 fallos.
  - [ ] `18.2.2` Ejecución de `npm run lint` (`oxlint`) garantizando 0 advertencias y 0 errores.
  - [ ] `18.2.3` Ejecución de `npm run build` (`tsc -b && vite build`) certificando compilación estricta TypeScript y bundle listo para producción.
