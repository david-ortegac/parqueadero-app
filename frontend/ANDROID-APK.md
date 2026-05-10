# Generar APK (Capacitor + Android)

**Application ID:** `com.parqueadero.app`  
**Nombre visible:** Parqueadero  

## Requisitos locales

- [Android Studio](https://developer.android.com/studio) (incluye SDK y emulador).
- **JDK 17+** (Android Studio suele traer uno embebido).
- Variables recomendadas:
  - `ANDROID_HOME` apuntando al SDK (Android Studio → SDK Manager muestra la ruta).

## Flujo habitual

1. Compilar la web y copiar a Android:

   ```bash
   cd frontend
   npm install
   npm run build:android
   ```

   Equivale a `ng build` + `npx cap sync android`.

2. Abrir en Android Studio y generar APK desde el IDE:

   ```bash
   npm run cap:open:android
   ```

   En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Solo línea de comandos (Windows)

APK **debug** (firma de desarrollo, lista para instalar en dispositivo con depuración USB):

```bash
cd frontend
npm run android:apk:debug
```

Salida típica:

`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

APK **release** (requiere keystore configurado para firma real; si no hay keystore puede fallar):

```bash
npm run android:apk:release
```

## Linux / macOS

Los scripts npm usan `gradlew.bat` (Windows). En Unix:

```bash
cd frontend
npm run build:android
cd android && ./gradlew assembleDebug
```

## API en el teléfono

`localhost` no funciona desde el móvil. En `src/environments/environment.ts` usa la IP de tu PC en la Wi‑Fi, por ejemplo:

`http://192.168.1.10:8000/api/v1`

## CI (GitHub Actions)

El workflow `.github/workflows/android-debug-apk.yml` construye la web, sincroniza Capacitor y ejecuta `./gradlew assembleDebug`. El APK queda como **artifact** del workflow.
