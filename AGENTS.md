# Reglas de Ingeniería y Arquitectura — Gestor Multimedia

Este documento define las reglas obligatorias y la arquitectura oficial del proyecto `gestor-multimedia`. Deben cumplirse estrictamente en cada cambio, refactorización o nueva funcionalidad.

---

## 1. Reglas Inquebrantables de Ingeniería

### 1.1. Inmutabilidad de los Tests Existentes (Salvo Rutas de `import`)
- **La lógica, casos de prueba y aserciones de los tests existentes no se pueden modificar una vez que se creen.**
- Está estrictamente prohibido editar, eliminar o alterar el cuerpo de los tests (`describe`, `it`, `test`, `expect`, mocks o setup) en archivos `*.test.ts` o `*.test.tsx` ya creados.
- **Excepción arquitectónica:** **Únicamente las sentencias `import` pueden actualizarse** si una refactorización requiere mover o dividir módulos. Nunca se debe sacrificar la limpieza de la arquitectura por mantener rutas de `import` antiguas.
- Las nuevas funcionalidades o casos de prueba deben añadirse en **nuevos archivos de test** (por ejemplo, `*.extended.test.ts`, `*.rbac.test.tsx`, etc.).

### 1.2. Documentación Simultánea
- **Cada nueva función, método, hook o componente debe ser documentado a la par que se crea.**
- Utilizar comentarios **TSDoc / JSDoc** (`/** ... */`) claros y concisos encima de cada función, método de servicio, custom hook e interfaz exportada, explicando su propósito, parámetros y valor de retorno.

### 1.3. Límite Estricto Anti-"Archivos Dios" (Máximo 300 Líneas)
- **Ningún archivo de código fuente manual debe superar las 300 líneas.** (Se excluye únicamente `src/types/api.generated.ts` por ser autogenerado por OpenAPI).
- Si al crear o editar un archivo este supera las **300 líneas**, se debe agregar inmediatamente en `TODO.md` una tarea para refactorizarlo y dividir sus responsabilidades en subcomponentes, hooks o módulos auxiliares más pequeños.

### 1.4. Cero Sobreingeniería (Principio YAGNI — *You Aren't Gonna Need It*)
- **Si algo aún no se necesita, no se implementa.**
- Prohibido crear capas abstractas especulativas, contenedores de inyección de dependencias, patrones complejos innecesarios, librerías de estado redundantes o código "por si acaso".
- Resolver cada requerimiento de la forma más directa, legible y mantenible posible.

---

## 2. Arquitectura del Proyecto (Pragmatic Layered Architecture)

El proyecto sigue una **Arquitectura Modular por Capas + Componentes Agrupados por Dominio**, diseñada para mantener archivos cortos (< 300 líneas) y preservar intactas las rutas públicas consumidas por los tests existentes:

```plaintext
src/
├── types/                  # Contratos OpenAPI (api.generated.ts) y tipos por dominio (api, auth, media)
├── services/               # 1 Servicio = 1 recurso del backend (< 250 líneas c/u)
│   ├── http/               # Helpers internos de apiClient (errores RFC 7807, cola refresh)
│   ├── apiClient.ts        # Fachada HTTP (reexporta tipos/errores para compatibilidad con tests)
│   ├── authService.ts
│   ├── usersService.ts     # Gestión jerárquica de usuarios RBAC
│   ├── foldersService.ts   # Gestión de carpetas y permisos en PostgreSQL
│   ├── imagesService.ts
│   ├── tablesService.ts
│   ├── chatService.ts      # Asistente RAG Tabular
│   ├── healthService.ts
│   └── storageService.ts
├── hooks/                  # Custom hooks extraídos solo cuando una vista/App supere 300 líneas
├── context/                # Estado transversal global (AuthContext y ToastContext)
├── components/             # Piezas de UI cohesivas agrupadas por dominio (< 250 líneas c/u)
│   ├── common/             # Button, Modal, Toast
│   ├── layout/             # Sidebar, StatusBar
│   ├── auth/               # ChangePasswordModal
│   ├── users/              # Subcomponentes de gestión de perfiles y modales RBAC
│   ├── folders/            # Modales y selectores de carpetas y compartición
│   ├── images/             # ImageCard, ImageInspector, modales de renombrado/hot-swap
│   ├── tables/             # TableCard, DataStudioToolbar, DataGrid, editor de ficha técnica
│   ├── settings/           # Tarjetas de conexión API, importación ShortCode, seguridad y Scalar
│   ├── upload/             # DropzoneOverlay, UploadModal
│   ├── health/             # HealthBadge
│   └── chat/               # Componentes de fuentes citadas, gráficos y widget público
├── views/                  # Orquestadores ligeros de pantalla (< 200 líneas c/u)
│   ├── ImagesView.tsx
│   ├── TablesCatalogView.tsx
│   ├── TableDataStudioView.tsx
│   ├── UserProfilesView.tsx
│   ├── SettingsView.tsx
│   ├── ChatStudioView.tsx
│   └── LoginView.tsx
└── utils/                  # Funciones utilitarias puras (formatters, clipboard)
```

### Responsabilidades por Capa
1. **`src/views/` (Orquestadores de Pantalla):** Coordinan el layout general de la pantalla y conectan estado/eventos con subcomponentes. Nunca deben contener múltiples formularios extensos ni tablas complejas incrustadas que los hagan pasar de 300 líneas.
2. **`src/components/<dominio>/` (Subcomponentes de Dominio):** Encapsulan tarjetas, tablas, barras de herramientas y modales específicos con su propio `.module.css` acotado.
3. **`src/hooks/` (Custom Hooks):** Se crean únicamente cuando se necesita extraer lógica de estado/efectos de una vista o de `App.tsx` para mantener el archivo por debajo de 300 líneas.
4. **`src/services/` (Capa de Datos y Transporte):** Comunicación directa con `monolith-backend` usando los contratos de `src/types/api.ts` y `apiClient`.

