# Reglas de Ingeniería y Arquitectura — Gestor Multimedia (v2)

Este documento define las reglas obligatorias y la arquitectura oficial del proyecto `gestor-multimedia` (v2 — "Archivo Editorial"). Deben cumplirse estrictamente en cada cambio, refactorización o nueva funcionalidad.

---

## 1. Reglas Inquebrantables de Ingeniería

### 1.1. Integridad y Calidad de la Suite de Tests
- **No se puede debilitar la cobertura real ni eliminar aserciones que protejan comportamiento vigente.**
- Los tests existentes pueden actualizarse, consolidarse o retirarse únicamente cuando:
  1. Validaban un **contrato OpenAPI desalineado** que acaba de corregirse contra `monolith-backend`.
  2. Cubrían **código muerto o legacy de v1** eliminado del código de producción.
  3. Se **consolidan micro-suites redundantes** en archivos cohesivos (`<= 300` líneas) preservando íntegra la cobertura funcional.
- Toda corrección de bug o nueva funcionalidad debe incluir pruebas que reproduzcan el escenario real.

### 1.2. Documentación Simultánea
- **Cada nueva función, método, hook, interfaz exportada o componente debe documentarse a la par que se crea.**
- Utilizar comentarios **TSDoc / JSDoc** (`/** ... */`) claros y concisos explicando propósito, parámetros y valor de retorno.

### 1.3. Límite Estricto Anti-"Archivos Dios" (Máximo 300 Líneas)
- **Ningún archivo de código fuente manual debe superar las 300 líneas.** (Se excluye únicamente `src/types/api.generated.ts` por ser autogenerado por OpenAPI).
- Si un archivo se acerca o supera las **300 líneas**, debe dividirse inmediatamente en subcomponentes, hooks o módulos auxiliares más pequeños.

### 1.4. Cero Sobreingeniería (Principio YAGNI — *You Aren't Gonna Need It*)
- **Si algo aún no se necesita, no se implementa.**
- Prohibido crear capas abstractas especulativas, archivos barrel gigantes que degraden el tree-shaking, estilos inline repetitivos (`style={{}}`) o código "por si acaso".

### 1.5. Disciplina de Interfaz y Rendimiento React
- **Sistema de diseño "Archivo Editorial":** todos los componentes usan tokens semánticos de `src/styles/tokens.css` (Modo Claro y Modo Oscuro), primitivas accesibles de `src/components/ui/` (construidas sobre `@radix-ui/react-*`), cero colores hex hardcodeados en `.tsx` y cero `transition: all` (animar únicamente `transform` y `opacity`, respetando `prefers-reduced-motion`).
- **Rendimiento React:** usar `React.lazy` + `Suspense` en vistas secundarias y visores pesados, `@tanstack/react-query` sin waterfalls (`Promise.all`), cero lecturas de entidades de negocio en `localStorage` durante render y `useDeferredValue` / `content-visibility: auto` en listados largos.

---

## 2. Arquitectura del Proyecto v2 (Feature-Sliced Pragmatic Layers)

```plaintext
src/
├── types/                  # Contratos OpenAPI 3.1 (api.generated.ts) y tipos por dominio
├── styles/                 # tokens.css (Claro/Oscuro), reset.css, motion.css
├── services/               # Clientes HTTP puros sin estado contra monolith-backend (75 endpoints)
│   ├── http/               # Helpers de apiClient (RFC 7807, cola refresh 401)
│   ├── apiClient.ts        # Transporte HTTP Bearer JWT + credentials: 'include'
│   ├── notificationsStream.ts # Cliente SSE fetch + ReadableStream con Authorization: Bearer
│   ├── storageService.ts   # Caché Map + localStorage solo para sesión, URL API, tema y viewMode
│   └── *Service.ts         # auth, users, folders, images, tables (.json), pdfs, forms, chat (usedAi), notifications, bulk, audit, apiKeys, storageStats, health
├── queries/                # queryClient, queryKeys y hooks de TanStack Query por dominio
├── context/                # Estado transversal mínimo (ThemeContext, AuthContext, ToastContext)
├── components/
│   └── ui/                 # Primitivas reutilizables (< 200 LOC c/u) sobre @radix-ui/react-*
├── features/               # Módulos funcionales v2 (vistas lazy + subcomponentes + CSS Modules)
│   ├── auth/               # Login real (sin fallback offline) + cambio de URL de servidor
│   ├── shell/              # AppLayout, Sidebar 228px contextual, CommandPalette (⌘K + shortCode)
│   ├── explorer/           # Explorador unificado (/ solo carpetas, /folder/:id 3 niveles, Bulk, Shares)
│   ├── images/             # ImageInspector (lazy) y mutaciones
│   ├── data-studio/        # DataStudioPage (/tables/:shortCode, lazy), DataGrid, TableMetadataDialog
│   ├── pdfs/               # PdfViewerDialog (lazy, binario + ?format=text), PdfMetadataDialog
│   ├── forms/              # FormInboxPage (/folder/:folderId/forms/:formId, lazy), Write-Once
│   ├── notifications/      # NotificationBell + Popover SSE en vivo
│   ├── chat/               # DataChatPage (/chat, lazy, badge usedAi, citas, Widget Público)
│   ├── team/               # TeamPage (/team, lazy, MANAGER y ADMIN)
│   └── admin/              # AdminPage (/admin/*, lazy, exclusivo ADMIN)
├── router.tsx              # BrowserRouter + guardas de sesión y rol + React.lazy
└── utils/                  # Funciones puras (formatters, clipboard)
```

### Responsabilidades por Capa
1. **`src/services/`:** Comunicación HTTP/SSE pura con `monolith-backend` usando contratos OpenAPI 3.1 y `apiClient`, sin guardar entidades de negocio en `localStorage`.
2. **`src/queries/`:** Caché de servidor, deduplicación, invalidación y actualizaciones optimistas mediante `@tanstack/react-query`.
3. **`src/components/ui/`:** Primitivas accesibles de diseño "Archivo Editorial" (importación directa por archivo, sin barrel).
4. **`src/features/<dominio>/`:** Pantallas, modales y subcomponentes de cada dominio (< 300 líneas c/u) conectados a `src/queries/` y `src/components/ui/`.
