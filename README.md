# Aviso de Vida

Aplicación móvil (React Native + Expo) y panel de administración web para compartir avisos de vida y monitorear contactos.

## Stack Tecnológico

- **Mobile**: React Native 0.86, Expo 57, TypeScript, React Navigation 7
- **Backend**: Firebase Auth, Firestore, AsyncStorage (offline-first)
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

## Requisitos Previos

- Node.js 18+
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

### 4. Desplegar reglas e índices Firestore
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Ejecutar en desarrollo
```bash
# Mobile (Expo Go / Emulador / Web)
npx expo start

# Admin panel (servidor estático local)
cd admin && npx serve .
# Abre http://localhost:3000
```

---

## Despliegue: App Móvil (EAS Build)

### Configuración inicial (una sola vez)
```bash
eas login
eas build:configure
# Selecciona plataformas: Android, iOS, o ambas
```

### Build de producción
```bash
# Android (APK/AAB)
eas build --platform android --profile production

# iOS (IPA - requiere cuenta Apple Developer)
eas build --platform ios --profile production

# Ambos
eas build --platform all --profile production
```

### Build de preview / desarrollo
```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

### Publicar en stores
```bash
# Google Play Store
eas submit --platform android --profile production

# Apple App Store
eas submit --platform ios --profile production
```

### Configuración `eas.json` (ejemplo)
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "aab" },
      "ios": { "buildType": "archive" }
    }
  },
  "submit": {
    "production": {}
  }
}
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

URL resultante: `https://toyvivo-213f7.web.app` (o tu dominio personalizado)

### Variables del panel admin
El archivo `admin/firebase-config.js` se genera manualmente o en CI/CD con las mismas claves Firebase. **No commitear**.

Ejemplo contenido:
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
```

---

## Seguridad

- **Nunca commitees** `.env`, `admin/firebase-config.js`
- Las claves en `.env` tienen prefijo `EXPO_PUBLIC_` → se incluyen en el bundle JS (necesario para Firebase Web SDK)
- Restringe API Keys en Google Cloud Console: APIs > Credenciales > Restricciones de aplicación
- Panel admin solo accesible para `cristiansolana1@gmail.com` (ver `admin/app.js:28`)

---

## Solución de Problemas Comunes

| Error | Solución |
|-------|----------|
| `permission-denied` al agregar DNI | Verifica índices single-field en Firebase Console > Firestore > Índices (`publicProfile.dni`, `profile.dni`) |
| Login web no navega | Limpia cache navegador / verifica `browserLocalPersistence` en `src/firebase.ts` |
| Admin panel "API key not valid" | Agrega `localhost:3000` (o tu dominio) en restricciones de API Key |
| Build EAS falla | `eas build --clear-cache` |

---

## Licencia

Privado - Uso interno