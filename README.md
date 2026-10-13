# Estoy bien

Aplicación móvil (React Native + Expo) y panel de administración web para compartir avisos de vida, monitorear la seguridad de contactos de confianza y recibir alertas en tiempo real.

---

## 🛠️ Stack Tecnológico

- **Mobile**: React Native 0.86, Expo 57, TypeScript, React Navigation 7
- **Backend & Base de Datos**: Firebase Auth, Firestore (offline-first), SecureStore / AsyncStorage
- **Notificaciones Push**: `expo-notifications` (Canales nativos de Android con visibilidad en pantalla de bloqueo, recordatorios de 24h, notificaciones de solicitudes de contacto)
- **Admin Panel**: Vanilla JS + Firebase SDK (ES Modules)
- **Hosting**: Firebase Hosting (admin panel), EAS/Expo (builds móviles)

---

## 🚀 Funcionalidades Principales

### 📱 App Móvil
- **Autenticación Adaptativa**: 
  * Inicio de sesión y registro con selector segmentado (*Segmented Control*).
  * Soporte para autocompletado nativo y gestores de contraseñas de iOS y Android.
  * Verificación de correo electrónico y recuperación de contraseña.
  * Confirmación de seguridad al cerrar sesión (`Alert.alert`).
- **Perfil de Usuario**:
  * Visualización del correo electrónico (no editable) junto al nombre completo, DNI, teléfono, fecha de nacimiento, país y provincia.
  * Almacenamiento seguro en documento privado (`users/{uid}/private/profile`).
  * Eliminación completa de cuenta con limpieza automática de Firestore (`users`, `userStatus`, `dniLookups`).
- **Notificaciones Push e Interactivas (Pantalla de Bloqueo)**:
  * **Notificación Programada de 24 Horas:** Se activa cuando se cumplen exactamente 24 horas desde el último aviso.
  * **Acciones Rápidas:** Botón **"🟢 Estoy bien"** directamente en la notificación para avisar con un toque desde la pantalla bloqueada o barra de estado.
  * **Notificación de Solicitudes de Contacto:** Alertas automáticas en tiempo real cuando un usuario solicita agregar al contacto como de seguridad.
  * **Notificación de Encuestas en Tiempo Real:** Escucha en tiempo real (`onSnapshot`) nuevas encuestas y alerta al usuario aún en segundo plano.
  * **Canales con Visibilidad Pública (`PUBLIC`):** Muestra notificaciones completas sobre la pantalla bloqueada.
- **Seguimiento de Contactos de Confianza**:
  * Alta de contactos mediante búsqueda puntual por DNI.
  * Aprobación explícita de solicitudes de contacto.
  * Contador preciso de contactos activos sincronizado con las tarjetas del panel persistente.
  * Estado compartido en tiempo real (*Activo* vs. *Sin aviso* con formato de hora en 24h), acceso telefónico directo y WhatsApp.
  * Revocación de permisos en cualquier momento.
- **Encuestas**: Responder encuestas geolocalizadas activas (una vez por usuario).

### 💻 Panel Admin (`/admin`)
- **Dashboard**: Estadísticas generales de usuarios registrados y fecha del último aviso.
- **Gestión de Encuestas**: Crear encuestas activas con preguntas y 2 a 4 opciones, con filtro por ubicación (país/provincia).
- **Resultados**: Muestra conteo de respuestas en tiempo real.

---

## 📁 Estructura del Proyecto

```
App/
├── App.tsx                 # Componente raíz con pantalla de carga oficial (Logo + Spinner)
├── app.json                # Configuración Expo (incluye plugin expo-notifications)
├── package.json
├── tsconfig.json
├── .env                    # Variables locales de entorno
├── firestore.rules         # Reglas de seguridad de Firestore
├── firestore.indexes.json  # Índices compuestos
├── src/
│   ├── firebase.ts         # Inicialización de Firebase SDK
│   ├── storage.ts          # Storage helpers (AsyncStorage / SecureStore)
│   ├── constants.ts        # Constantes del sistema y formato
│   ├── types.ts            # Tipos de TypeScript
│   ├── components/         # Componentes UI
│   │   ├── HeartbeatButton.tsx
│   │   ├── WatchedUserCard.tsx        # Tarjeta de contacto monitoreado (tiempo 24h)
│   │   ├── ProfileEditor.tsx          # Edición de perfil con correo no editable
│   │   ├── SurveyCard.tsx
│   │   ├── AddUserForm.tsx            # Formulario de alta de DNI con ocultado de teclado
│   │   └── ToastNotification.tsx
│   ├── hooks/              # Custom Hooks
│   │   ├── useAuth.ts
│   │   ├── useHeartbeat.ts            # Sincronización y estado de cuenta regresiva
│   │   ├── useWatchedUsers.ts         # Sincronización estable de contactos y conteo
│   │   ├── useContactRequests.ts      # Solicitudes de contacto con notificaciones push
│   │   ├── useSurvey.ts               # Listener en tiempo real para encuestas
│   │   └── useProfile.ts
│   ├── screens/            # Pantallas
│   │   ├── AuthScreen.tsx             # Pantalla de login/registro
│   │   ├── HomeScreen.tsx             # Pantalla principal con banners de red offline/sync
│   │   ├── VerifyEmailScreen.tsx      # Verificación de correo con confirmación de salida
│   │   └── ProfileSetupScreen.tsx     # Alta inicial de datos personales
│   └── services/           # Servicios de API y Firebase
│       ├── authService.ts             # Autenticación y borrado completo de cuenta
│       ├── heartbeatService.ts        # Persistencia local y remota de avisos de vida
│       ├── notificationService.ts     # Gestión de canales, permisos y notificaciones
│       ├── surveyService.ts
│       └── userService.ts             # Gestión de contactos, DNI y estados
└── admin/                  # Panel de administración (Web estático)
    ├── index.html
    ├── app.js
    └── styles.css
```

---

## 📊 Modelo de Datos Firestore

### `users/{uid}`
```typescript
{
  publicProfile: { fullName, country, province },
  emailNormalized: string,
  lastAliveAt: Timestamp,
  profileUpdatedAt: Timestamp
}
```

### `users/{uid}/private/profile`
Documento privado donde se almacenan datos sensibles (DNI, teléfono, fecha de nacimiento) accesibles únicamente por el titular.

### `users/{uid}/heartbeats/{id}`
```typescript
{ status: "alive", createdAt: Timestamp, deviceCreatedAt: string }
```

### `dniLookups/{dni}`
```typescript
{ uid: string }
```

### `surveys/{surveyId}`
```typescript
{
  question: string,
  options: string[],
  active: boolean,
  targetCountry?: string,
  targetProvince?: string,
  createdAt: Timestamp
}
```

---

## ⚙️ Configuración y Ejecución Local

### 1. Requisitos Previos
- Node.js 20 o superior
- JDK 17 / 21 (para builds de Android con Gradle)
- Expo CLI & EAS CLI: `npm install -g expo-cli eas-cli`
- Firebase CLI: `npm install -g firebase-tools`

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Variables de Entorno (`.env`)
Crear un archivo `.env` en la raíz del proyecto basado en `.env.example`:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=toyvivo-213f7.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=toyvivo-213f7
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=toyvivo-213f7.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=947221650406
EXPO_PUBLIC_FIREBASE_APP_ID=1:947221650406:web:8f922ef2a525830f9d1427
```

### 4. Ejecución en Desarrollo
```bash
# Iniciar servidor Expo
npx expo start

# Compilar ejecutable Android de depuración (APK)
./gradlew app:assembleDebug
```

---

## 🔐 Seguridad y Reglas de Firestore
- El acceso a la lectura de estados de contactos requiere la aprobación explícita en la subcolección `trustedContacts`.
- El panel de administración web restringe el acceso a la cuenta verificada `cristiansolana1@gmail.com`.
- Despliegue de reglas e índices:
  ```bash
  firebase deploy --only firestore:rules,firestore:indexes
  ```

---

## 📄 Licencia

Privado - Uso interno de Estoy Bien.
