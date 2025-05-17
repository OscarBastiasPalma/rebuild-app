# Rebuild - Gestión de Inspecciones

Este proyecto es una plataforma para la gestión de inspecciones de propiedades, permitiendo a profesionales y propietarios solicitar, tomar y reportar inspecciones de manera eficiente y visual.

## Características principales
- Listado de inspecciones pendientes y disponibles.
- Visualización detallada de cada inspección.
- Cambio de estado de inspecciones (SOLICITADO, PENDIENTE, FINALIZADO).
- Reporte de inspección con adjunto de fotos y comentarios.
- Filtros por comuna y búsqueda intuitiva.
- Interfaz moderna y responsiva con React Native y Next.js.

## Estructura del proyecto
- **rebuild/**: Backend (API REST con Next.js y Prisma)
- **rebuild-app/**: Frontend móvil (React Native)

## Requisitos previos
- Node.js >= 18.x
- npm >= 9.x
- (Opcional) Expo CLI para desarrollo móvil: `npm install -g expo-cli`
- Base de datos PostgreSQL (o la que definas en tu `.env`)

## Instalación y despliegue local

### 1. Clona el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd <nombre_del_proyecto>
```

### 2. Configura las variables de entorno
Copia el archivo `.env.example` a `.env` en la carpeta `rebuild/` y ajusta los valores según tu entorno (base de datos, etc).

### 3. Instala dependencias
```bash
cd rebuild
npm install
cd ../rebuild-app
npm install
```

### 4. Ejecuta las migraciones y seed (opcional)
```bash
cd ../rebuild
npx prisma migrate dev
npx prisma db seed # Si tienes datos de ejemplo
```

### 5. Inicia el backend
```bash
cd rebuild
npm run dev
```

### 6. Inicia la app móvil
```bash
cd ../rebuild-app
npm start
# O usa expo:
# expo start
```

### 7. Accede a la app
- **Backend:** [http://localhost:3000/api](http://localhost:3000/api)
- **App móvil:** Usa Expo Go en tu teléfono o un emulador Android/iOS

## Notas
- Asegúrate de que el backend y la app móvil apunten a la misma URL base en desarrollo (ajusta `API_URL` en la configuración).
- Puedes personalizar los estilos y la experiencia de usuario editando los archivos en `rebuild-app/src/screens/`.

## Licencia
MIT

---

¿Dudas o sugerencias? ¡Contribuye o abre un issue! 