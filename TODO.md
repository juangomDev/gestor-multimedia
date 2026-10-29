# 📋 Lista de Tareas Modular (TODO) — Gestor Multimedia

> **Enfoque:** Tareas atómicas, pequeñas, fáciles de resolver y testear de forma independiente.  
> **Backend:** `monolith-backend` (Regla: solo consumo de endpoints existentes sin modificar el backend sin permiso).

---

## 🌐 Módulo 1: Conectividad, Servicios & Sincronización API

- [x] **1.1 Cliente API y Persistencia Base**
  - [x] `1.1.1` Configurar variables de entorno `.env` con `VITE_API_BASE_URL` y `VITE_API_KEY`.
  - [x] `1.1.2` Implementar `storageService.ts` con lectura/escritura segura en `localStorage`.
  - [x] `1.1.3` Crear `apiClient.ts` con soporte para inyección de cabeceras `Authorization: Bearer` y `X-API-Key`.
  - [x] `1.1.4` Implementar pruebas unitarias para `apiClient.test.ts` y `storageService.test.ts`.

- [x] **1.2 Servicio de Diagnóstico (Health)**
  - [x] `1.2.1` Implementar `healthService.ts` para consultar `GET /health`.
  - [x] `1.2.2` Calcular latencia en tiempo real (`latencyMs`) en `healthService`.
  - [x] `1.2.3` Crear componente `HealthBadge.tsx` con indicador visual de estado y latencia.
  - [x] `1.2.4` Pruebas unitarias para `healthService.test.ts` y `HealthBadge.test.tsx`.

- [x] **1.3 Sincronización Bidireccional de Activos**
  - [x] `1.3.1` Implementar `fetchRemoteImages()` en `imagesService.ts` (`GET /api/v1/images`).
  - [x] `1.3.2` Implementar `fetchRemoteTables()` en `tablesService.ts` (`GET /api/v1/tables`).
  - [x] `1.3.3` Conectar sincronización automática en `App.tsx` al montar la aplicación.
  - [x] `1.3.4` Añadir botón de sincronización manual (`RefreshCw`) en la cabecera.
  - [x] `1.3.5` Sincronizar sustituyendo la caché local para que PostgreSQL sea la única fuente de verdad.

- [x] **1.4 Corrección de URLs Públicas vs IPs Internas del Backend (Bug Visual)**
  - [x] `1.4.1` Crear función de resolución canónica de URLs (`buildPublicAssetUrl`) usando el `baseUrl` configurado en el cliente.
  - [x] `1.4.2` Actualizar `imagesService.ts` (`uploadImage` y `fetchRemoteImages`) para no usar la URL interna del contenedor (`192.168.1.167:8080`) y construir `${baseUrl}/i/${shortCode}`.
  - [x] `1.4.3` Actualizar `tablesService.ts` (`uploadTable` y `fetchRemoteTables`) para construir `${baseUrl}/t/${shortCode}`.
  - [x] `1.4.4` Crear pruebas unitarias que verifiquen que `imagesService` y `tablesService` siempre resuelvan hacia el `baseUrl` público configurado.

---

## 🖼️ Módulo 2: Galería e Inspector de Imágenes

- [x] **2.1 Visualización y Filtrado**
  - [x] `2.1.1` Crear vista `ImagesView.tsx` con diseño responsive tipo Grid.
  - [x] `2.1.2` Implementar barra de filtros por formato (`Todos`, `PNG`, `JPG`, `WebP`).
  - [x] `2.1.3` Implementar buscador en tiempo real por nombre original y `shortCode`.
  - [x] `2.1.4` Diseñar estado vacío elegante cuando no haya imágenes cargadas.

- [x] **2.2 Tarjeta de Imagen (`ImageCard`)**
  - [x] `2.2.1` Crear componente `ImageCard.tsx` con miniatura, badge de `shortCode`, peso y fecha.
  - [x] `2.2.2` Implementar acciones hover: Copiar enlace corto, previsualizar y eliminar.
  - [x] `2.2.3` Pruebas de renderizado con React Testing Library (`ImageCard.test.tsx`).
  - [x] `2.2.4` Añadir manejador `onError` en `<img />` para recuperación de imagen o placeholder si la red falla.

- [x] **2.3 Inspector Lateral y Modal de Zoom (`ImageInspector`)**
  - [x] `2.3.1` Crear componente `ImageInspector.tsx` con visualizador a escala y zoom interactivo.
  - [x] `2.3.2` Incluir comandos rápidos (cURL de descarga, copiado de URL y atajos).
  - [x] `2.3.3` Implementar acción de eliminación con diálogo de confirmación.

---

## 📊 Módulo 3: Catálogo de Datasets & Data Studio Pantalla Completa

- [x] **3.1 Catálogo de Datasets (`TablesCatalogView`)**
  - [x] `3.1.1` Crear vista `TablesCatalogView.tsx` con tarjetas de datasets.
  - [x] `3.1.2` Mostrar badges con conteo total de filas (`rowCount`), columnas detectadas y tamaño.
  - [x] `3.1.3` Acciones directas: Abrir en Data Studio, copiar URL y descargar archivo original.
  - [x] `3.1.4` Botón para subir nuevos datasets `.csv` o `.xlsx`.

- [x] **3.2 Data Studio a Pantalla Completa (`TableDataStudioView`)**
  - [x] `3.2.1` Crear layout de pantalla completa independiente (sustituye la modal reducida).
  - [x] `3.2.2` Barra de navegación superior con botón `← Volver a Datasets` e información del dataset.
  - [x] `3.2.3` Botón de descarga directa del archivo original (`?download=true`).

- [x] **3.3 Barra de Herramientas Analíticas (`DataStudioToolbar`)**
  - [x] `3.3.1` Buscador en vivo con filtrado instantáneo de filas.
  - [x] `3.3.2` Selector de selector de filas por página (`25`, `50`, `100`, `250`).
  - [x] `3.3.3` Menú desplegable para ocultar / mostrar columnas dinámicamente.

- [x] **3.4 Grilla de Datos de Alta Densidad (`DataGrid`)**
  - [x] `3.4.1` Implementar tabla con encabezados fijos (`sticky headers`) y scroll horizontal fluido.
  - [x] `3.4.2` Ordenamiento de columnas asc/desc con indicador visual.
  - [x] `3.4.3` Formateo inteligente de valores numéricos, fechas y textos.
  - [x] `3.4.4` Pruebas unitarias de renderizado (`DataGrid.test.tsx`).

- [x] **3.5 Paginación Reactiva Server-Side**
  - [x] `3.5.1` Integrar llamada a `GET /t/:short_code?page=X&limit=Y` en `tablesService.ts`.
  - [x] `3.5.2` Controles de página previa / siguiente e indicador `Página X de Y`.

---

## 🔐 Módulo 4: Autenticación, Usuarios & Sesión

- [x] **4.1 Gestión de Sesión y Contexto**
  - [x] `4.1.1` Implementar `authService.ts` con login (`POST /api/v1/auth/login`) y logout.
  - [x] `4.1.2` Crear `AuthContext.tsx` para exponer `user`, `token`, `login`, `logout` y estado de carga.
  - [x] `4.1.3` Pruebas unitarias para `authService.test.ts` y `AuthContext.test.tsx`.

- [x] **4.2 Componentes de Interfaz de Autenticación**
  - [x] `4.2.1` Crear `LoginModal.tsx` con validaciones de formulario y feedback de error.
  - [x] `4.2.2` Crear `UserMenu.tsx` en el Header (botón "Iniciar Sesión" / Avatar con rol de usuario).
  - [x] `4.2.3` Crear `UserAdminModal.tsx` exclusivo para rol `ADMIN` para registrar nuevos usuarios `USER`.
  - [x] `4.2.4` Pruebas de integración RTL para `LoginModal.test.tsx` y `UserAdminModal.test.tsx`.

- [ ] **4.3 Puerta de Enlace de Autenticación Obligatoria (Auth Guard - Planificado tras Rediseño)**
  - [ ] `4.3.1` Crear vista de pantalla completa `LoginPage.tsx` cuando no exista sesión activa (`!isAuthenticated`).
  - [ ] `4.3.2` Bloquear acceso al dashboard exigiendo login previo obligatorio (actualmente abierto para diseño visual).
  - [ ] `4.3.3` Conectar el botón de logout del Sidebar con redirección a `LoginPage.tsx` y revocación de sesión.

---

## 📁 Módulo 5: Sistema de Carpetas y Proyectos (⏸️ Congelado en Frontend a la espera de Fase 6 en Backend)

> **Nota de Estado:** Componentes y lógica implementados y testeados al 100%, pero mantenidos congelados mediante feature flag (`ENABLE_FOLDERS = false`) para evitar discrepancias con `localStorage` hasta que el backend persista carpetas en PostgreSQL de forma compartida.

- [x] **5.1 Estructura Visual de Carpetas**
  - [x] `5.1.1` Modelar tipos TypeScript `FolderItem` en `src/types/media.ts`.
  - [x] `5.1.2` Persistir carpetas creadas y carpeta activa en `storageService.ts`.
  - [x] `5.1.3` Crear modal `CreateFolderModal.tsx` para nombrar grupos y proyectos.
  - [x] `5.1.4` Mostrar lista de carpetas en el `Sidebar.tsx` con navegación y selección activa.
- [x] **5.2 Filtrado y Reasignación de Elementos**
  - [x] `5.2.1` Filtrar galería de imágenes por carpeta activa (`folderId`).
  - [x] `5.2.2` Filtrar catálogo de tablas por carpeta activa (`folderId`).
  - [x] `5.2.3` Permitir asignar carpeta al subir archivo desde el modal o dropzone.
  - [x] `5.2.4` Menú contextual en tarjetas para reasignar archivo a otra carpeta ("Mover a...").

---

## 📤 Módulo 6: Motor de Subida, Drag & Drop y Notificaciones

- [x] **6.1 Ingesta de Archivos**
  - [x] `6.1.1` Componente `DropzoneOverlay.tsx` para arrastrar archivos en toda la pantalla.
  - [x] `6.1.2` Componente `UploadModal.tsx` con selector manual y preview de archivos seleccionados.
  - [x] `6.1.3` Detección y validación automática del tipo MIME (imágenes vs tablas CSV/XLSX).
  - [x] `6.1.4` Modal para importar elementos existentes mediante su `shortCode` (`ImportShortCodeModal.tsx`).
- [x] **6.2 Sistema de Feedback Visual**
  - [x] `6.2.1` Crear `ToastContext.tsx` con soporte para tipos `success`, `error`, `info`.
  - [x] `6.2.2` Animaciones suaves de entrada y salida para notificaciones toast.

---

## 🧪 Módulo 7: Calidad, Testing Automatizado & Build

- [x] **7.1 Cobertura de Pruebas Automatizadas**
  - [x] `7.1.1` Configurar Vitest con entorno `jsdom` en `vite.config.ts`.
  - [x] `7.1.2` 100% de servicios con pruebas unitarias (`*.test.ts`).
  - [x] `7.1.3` Pruebas de componentes clave y modales (`*.test.tsx`).
  - [x] `7.1.4` Pruebas de integración global de vistas en `App.test.tsx`.
- [x] **7.2 Compilación y Verificación Estricta**
  - [x] `7.2.1` Ejecución de `npm run test` con 0 fallos.
  - [x] `7.2.2` Ejecución de `npm run build` (`tsc -b && vite build`) con 0 errores TypeScript.
- [x] **7.3 Validación de la Corrección de Carga de Imágenes**
  - [x] `7.3.1` Ejecutar `npm run test` tras aplicar la tarea 1.4 (50/50 tests pasando).
  - [x] `7.3.2` Confirmar que las imágenes registradas se visualizan correctamente en el navegador.
