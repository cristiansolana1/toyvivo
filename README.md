# Aviso de Vida

Aplicación móvil (React Native + Expo) y panel de administración web para compartir avisos de vida y monitorear contactos.

## Stack Tecnológico

- **Mobile**: React Native 0.86, Expo 57, TypeScript, React Navigation 7
- **Backend**: Firebase Auth, Firestore y SecureStore/AsyncStorage
- **Admin Panel**: Vanilla JS + Firebase SDK (ES Modules)
- **Hosting**: Firebase Hosting (admin), EAS/Expo (mobile)

---

## Estructura del Proyecto

```
App/
├── App.tsx                 # App principal (navegación + pantallas)
├── app.json                # Configuración Expo
├── package.json
├── tsconfig.json
├── .env                    # Variables locales (NO commitear)
├── .env.example            # Plantilla de variables
├── firebase.json           # Config Firebase CLI
├── firestore.rules         # Reglas de seguridad Firestore
├── firestore.indexes.json  # Índices compuestos/single-field
├── src/
│   ├── firebase.ts         # Inicialización Firebase (lee .env)
│   ├── storage.ts          # AsyncStorage helpers
│   └── types.ts            # Tipos TypeScript
└── admin/                  # Panel de administración (sitio estático)
    ├── index.html
    ├── app.js
    ├── styles.css
    └── firebase-config.js  # Generado en build (NO commitear)
```

---

## Funcionalidades

### App Móvil
- **Autenticación**: Email/password con persistencia web y nativa
- **Perfil de usuario**: nombre, DNI, teléfono y nacimiento en documento privado; SecureStore en dispositivos nativos
- **Avisos de vida (Heartbeats)**: Botón "Estoy bien" con cooldown 24h, guardado offline-first + sync nube
- **Seguimiento contactos**: alta por DNI, aprobación explícita, estado compartido en tiempo real y revocación
- **Encuestas**: Responder encuestas activas (una vez por usuario)
- **Compartir app**: Native share dialog
- **Soporte**: Enlace mailto predefinido

### Panel Admin (`/admin`)
- **Dashboard**: Total usuarios, último heartbeat
- **Encuestas**: Crear con pregunta, 2-4 opciones
- **Resultados encuestas**: Conteo por opción

---

## Modelo de Datos Firestore

### `users/{uid}`
```typescript
{
  publicProfile: { fullName, country, province },
  emailNormalized: string, // acceso de administrador únicamente
  lastAliveAt: Timestamp,
  profileUpdatedAt: Timestamp
}
```

Los datos personales completos viven en `users/{uid}/private/profile` y solo el titular puede leerlos. `dniLookups/{dni}` contiene únicamente el UID y permite una consulta puntual por DNI; no se puede listar. Esa consulta puede revelar si un DNI corresponde a una cuenta y el UID asociado. `users/{uid}/contactRequests` recibe solicitudes, pero nombre, teléfono y estado solo se comparten después de la aprobación; las relaciones viven en `trustedContacts` y `watching`. `userStatus/{uid}` solo es legible por el titular, el administrador verificado y contactos aprobados. No se necesita Cloud Functions ni plan Blaze.

Los perfiles existentes publican su índice DNI al guardar o migrar el perfil local. Los contactos antiguos conservan su lista, pero el acceso al estado requiere que el dueño apruebe una solicitud nueva.

### `users/{uid}/heartbeats/{id}`
```typescript
{ status: "alive", createdAt: Timestamp, deviceCreatedAt: string }
```

### `surveys/{surveyId}`
```typescript
{
  question: string,
  options: string[],
  active: boolean,
  createdAt: Timestamp,
  createdBy: string
}
```

### `surveys/{surveyId}/responses/{uid}`
```typescript
{ answer: string, answeredAt: Timestamp }
```

---

## Requisitos Previos

- Node.js 20 o superior para las herramientas locales
- JDK 21 o superior para ejecutar el emulador Firestore y las pruebas de reglas
- Cuenta Firebase (proyecto `toyvivo-213f7`)
- Expo CLI: `npm install -g expo-cli`
- Firebase CLI: `npm install -g firebase-tools`
- EAS CLI (para builds móviles): `npm install -g eas-cli`

---

## Configuración Local

### 1. Clonar e instalar dependencias
```bash
cd App
npm install
```

### 2. Variables de entorno
```bash
cp .env.example .env
# Edita .env con tus credenciales Firebase
```

Variables requeridas (prefijo `EXPO_PUBLIC_` para Expo):
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### 3. Login Firebase CLI
```bash
firebase login
firebase use toyvivo-213f7
```

### 4. Probar permisos y desplegar reglas
```bash
npm run test:rules
firebase deploy --only firestore:rules,firestore:indexes
```

El test de reglas usa un proyecto `demo-*` local y no accede al proyecto de producción. El flujo de contactos funciona directamente con Firestore; no requiere Cloud Functions ni activar facturación Blaze.

La cuenta `cristiansolana1@gmail.com` debe existir en Firebase Authentication y tener el correo verificado para acceder al panel.

### 5. Panel Admin - Config local
Crear `admin/firebase-config.js` (no se commitea):
```javascript
window.FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "toyvivo-213f7.firebaseapp.com",
  projectId: "toyvivo-213f7",
  storageBucket: "toyvivo-213f7.firebasestorage.app",
  messagingSenderId: "947221650406",
  appId: "1:947221650406:web:8f922ef2a525830f9d1427"
};
```

### 6. Ejecutar en desarrollo
```bash
# Terminal 1: Mobile (Expo Go / Emulador / Web)
npx expo start

# Terminal 2: Admin panel
cd admin && npx serve .
# Abre http://localhost:3000
```

---

## Despliegue: App Móvil (EAS Build)

Después de instalar `expo-secure-store`, genera un nuevo build nativo para Android/iOS; una actualización OTA no incorpora módulos nativos.

### Configuración inicial (una sola vez)
```bash
eas login
eas build:configure
# Selecciona plataformas: Android, iOS, o ambas
```

### Build de producción
```bash
# Android (AAB para Play Store)
eas build --platform android --profile production

# iOS (IPA - requiere cuenta Apple Developer)
eas build --platform ios --profile production
```

### Publicar en stores
```bash
# Google Play Store
eas submit --platform android --profile production

# Apple App Store
eas submit --platform ios --profile production
```

### Variables de entorno en EAS (secrets)
```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "TU_API_KEY_PROD"
# Repetir para cada EXPO_PUBLIC_*
```

---

## Despliegue: Panel Admin (Firebase Hosting)

### Configuración inicial
```bash
firebase init hosting
# Project: toyvivo-213f7
# Public directory: admin
# Single-page app: No
# Overwrite index.html: No
```

### Deploy
```bash
# Desde la raíz del proyecto
firebase deploy --only hosting
```

URL resultante: `https://toyvivo-213f7.web.app` (o dominio personalizado)

---

## CI/CD Sugerido (GitHub Actions)

### `.github/workflows/deploy.yml`
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  firestore:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm install -g firebase-tools
      - run: firebase deploy --only firestore:rules,firestore:indexes --project toyvivo-213f7 --token ${{ secrets.FIREBASE_TOKEN }}

  admin-hosting:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: toyvivo-213f7
          target: admin

  mobile-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --profile production --non-interactive
```

---

## Comandos Útiles

```bash
# Ver logs Expo
npx expo start --dev-client

# Limpiar cache Metro
npx expo start -c

# Ver proyectos Firebase
firebase projects:list

# Cambiar proyecto activo
firebase use toyvivo-213f7

# Ver reglas actuales
firebase firestore:rules:get

# Ver índices
firebase firestore:indexes

# Builds EAS
eas build:list --platform android
eas build:view <BUILD_ID>

# Deploy solo reglas/índices
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Seguridad

- **Nunca commitees** `.env`, `admin/firebase-config.js`, `google-play-service-account.json`
- Las claves en `.env` tienen prefijo `EXPO_PUBLIC_` → se incluyen en el bundle JS (necesario para Firebase Web SDK)
- Restringe API Keys en Google Cloud Console: APIs > Credenciales > Restricciones de aplicación (agrega tus dominios + `localhost:3000`)
- Panel admin solo accesible para `cristiansolana1@gmail.com` (ver `admin/app.js:24`)

---

## Solución de Problemas Comunes

| Error | Solución |
|-------|----------|
| `permission-denied` al agregar DNI | Confirma que estén desplegadas las reglas actuales y que ambos usuarios hayan guardado/migrado sus perfiles |
| Login web no navega | Limpia cache navegador / verifica `browserLocalPersistence` en `src/firebase.ts` |
| Admin panel "API key not valid" | Agrega `localhost:3000` (o tu dominio) en restricciones de API Key |
| Build EAS falla | `eas build --clear-cache` |

---

## Licencia

Privado - Uso interno