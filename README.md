# 🚀 Gestor Multimedia — Dokploy Media & Data Studio

Aplicación web moderna construida con **React 19**, **Vite 8**, **TypeScript**, **CSS Modules** y **Vitest**, diseñada como cliente frontend para el backend monolítico [`monolith-backend`](../monolith-backend).

---

## 🎨 Filosofía de Diseño y Experiencia de Usuario

1. **Separación Total de Espacios:**
   - **Galería de Imágenes:** Espacio visual optimizado para previsualización nítida, badges de shortCode, copiado instantáneo de enlace y modal de inspección con zoom de alta resolución.
   - **Data Studio de Tablas en Pantalla Completa:** Las tablas y hojas de cálculo (`.csv`, `.xlsx`) **no se comprimen en una simple modal**. Cuentan con un espacio analítico a pantalla completa con sticky headers, paginación server-side, ordenamiento por columna, búsqueda en vivo y descarga directa.
2. **Estética Glassmorphism Oscura:**
   - Paleta de colores HSL calibrada (azules eléctricos, violetas profundos y fondos dark slate).
   - Tipografía moderna con fuentes Inter y JetBrains Mono.
   - Microanimaciones fluidas para interacción y feedback instantáneo mediante Toasts.
3. **Resiliencia y Offline Fallback:**
   - Opera fluidamente con el backend en Dokploy (`VITE_API_BASE_URL`).
   - Sincroniza automáticamente los datos locales (`localStorage`) teniendo la base de datos PostgreSQL como la **fuente de verdad autoritativa**.

---

## 🏛️ Arquitectura del Proyecto

```plaintext
gestor-multimedia/
├── .env                       # Configuración de URL de la API y API Key
├── .env.example               # Plantilla de variables de entorno
├── index.html                 # Punto de entrada HTML con metadatos SEO
├── vite.config.ts             # Configuración de Vite y Vitest
├── src/
│   ├── main.tsx               # Bootstrap de React
│   ├── App.tsx                # Orquestador principal y sincronización reactiva
│   ├── types/                 # Definiciones TypeScript (auth, media, api, folder)
│   ├── styles/                # Variables CSS, reset y diseño global
│   ├── context/               # Proveedores de estado (AuthContext, ToastContext)
│   ├── services/              # Capa de comunicación HTTP y persistencia
│   │   ├── apiClient.ts       # Cliente HTTP Fetch con inyección de cabeceras
│   │   ├── authService.ts     # Login, gestión de usuarios y roles
│   │   ├── healthService.ts   # Diagnóstico de salud y latencia en milisegundos
│   │   ├── imagesService.ts   # Subida, listado, borrado y normalización de URLs
│   │   ├── tablesService.ts   # Subida, paginación server-side y descarga
│   │   └── storageService.ts  # Persistencia y caché local
│   ├── components/
│   │   ├── layout/            # Sidebar de navegación con perfil y estado
│   │   ├── images/            # ImageCard e ImageInspector (zoom)
│   │   ├── tables/            # DataGrid de alta densidad y TableCard
│   │   ├── upload/            # DropzoneOverlay y UploadModal
│   │   ├── folders/           # CreateFolderModal y MoveToFolderModal
│   │   ├── health/            # HealthBadge interactivo con latencia en vivo
│   │   └── common/            # Button, Modal, Toast
│   ├── views/
│   │   ├── ImagesView.tsx          # Espacio de trabajo de imágenes
│   │   ├── TablesCatalogView.tsx   # Catálogo de datasets registrados
│   │   ├── TableDataStudioView.tsx # Data Studio analítico a pantalla completa
│   │   ├── SettingsView.tsx        # Configuración API & Ingesta por ShortCode
│   │   ├── LoginView.tsx           # Pantalla de acceso y autenticación JWT
│   │   └── UserProfilesView.tsx    # Gestión y directorio de perfiles de usuario
│   └── utils/
│       ├── formatters.ts      # Formateo de bytes, fechas y URLs
│       └── clipboard.ts       # Copiado al portapapeles con fallback
└── tests/                     # Suites Vitest por componente y servicio (*.test.ts/tsx)
```

---

## 🔍 Contratos de API Consumidos (`monolith-backend`)

| Módulo | Método & Ruta | Auth Requerida | Parámetros / Body | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **Salud** | `GET /health` | Pública | Ninguno | Diagnóstico de base de datos y almacenamiento |
| **Auth** | `POST /api/v1/auth/login` | Pública | `{ username, password }` | Retorna token JWT y datos de sesión |
| **Usuarios** | `POST /api/v1/users` | `Bearer <token>` (ADMIN) | `{ username, password, role }` | Creación de nuevos usuarios normales |
| **Imágenes** | `GET /api/v1/images` | `Bearer` o `X-API-Key` | Ninguno | Listado de todas las imágenes registradas |
| **Imágenes** | `POST /api/v1/images` | `Bearer` o `X-API-Key` | `multipart/form-data` | Subida de imagen a disco y base de datos |
| **Imágenes** | `GET /i/:short_code` | Pública | Param `short_code` | Stream binario de imagen con caché inmutable |
| **Imágenes** | `DELETE /api/v1/images/:id` | `Bearer` o `X-API-Key` | Param `id` (UUID) | Borrado físico y en base de datos |
| **Tablas** | `GET /api/v1/tables` | `Bearer` o `X-API-Key` | Ninguno | Listado de todos los datasets registrados |
| **Tablas** | `POST /api/v1/tables` | `Bearer` o `X-API-Key` | `multipart/form-data` | Subida de `.csv` o `.xlsx` |
| **Tablas** | `GET /t/:short_code` | Pública | Query `?page=X&limit=Y` | Consulta paginada de registros en JSON |
| **Tablas** | `GET /t/:short_code?download=true` | Pública | Query `?download=true` | Descarga directa del archivo original |
| **Tablas** | `DELETE /api/v1/tables/:id` | `Bearer` o `X-API-Key` | Param `id` (UUID) | Borrado físico y en base de datos |

---

## ⚙️ Configuración y Comandos

### Variables de Entorno (`.env`)
```bash
VITE_API_BASE_URL=http://app-backend-4egks7-00ab29-192-168-1-167.sslip.io
VITE_API_KEY=mk_live_dev_test_api_key_12345
```

### Comandos de Desarrollo
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (puerto 5173)
npm run dev

# Ejecutar suite de pruebas unitarias e integradas (Vitest)
npm run test

# Compilación y verificación estricta de tipos TypeScript
npm run build
```
