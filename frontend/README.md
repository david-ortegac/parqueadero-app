# 📱 Parqueadero App - Frontend (Ionic + Angular)

Bienvenido a la documentación oficial del frontend de **Parqueadero App**. Este es un cliente híbrido moderno y altamente interactivo construido con **Angular**, **Ionic Framework**, **Capacitor** y **PrimeNG**. 

La aplicación está diseñada con una estética responsive y elegante, ofreciendo vistas personalizadas para **Administradores**, **Operarios** y **Clientes (propietarios de vehículos)**, además de integración completa con características nativas del dispositivo.

---

## 🎨 Características Principales del Frontend
* **Panel de Control Interactivo (Dashboard):** Gráficos circulares de ocupación dinámica en tiempo real (carros y motos) con tipografía ultra-premium y soporte completo para **Modo Oscuro** de alto contraste.
* **Vistas de Gestión de Operador:** Búsqueda rápida, registros de check-in, cobros por check-out en segundos y asignación directa de propietarios.
* **Notificaciones Push FCM Nativas:** Soporte nativo para registro de dispositivos y alertas emergentes interactivas, incluyendo alertas de escritorio y toasts fluidos en primer plano (foreground).
* **Gestión de Tarifas y Configuración:** Panel administrativo para configurar cupos de vehículos, tarifas de cobro e información general del negocio.
* **Diseño Premium:** Uso de componentes PrimeNG (Cards, Buttons, Inputs, Tables) estilizados con sombreados suaves y micro-animaciones dinámicas.

---

## 🛠️ Requisitos de Desarrollo Local
* **Node.js:** v18.0.0 o superior (Recomendado v20+)
* **NPM:** v9.0.0 o superior
* **Ionic CLI** (Opcional, pero recomendado): `npm install -g @ionic/cli`
* **Android Studio** (Requerido solo si vas a compilar para Android).

---

## 🚀 Configuración y Ejecución en Desarrollo Local

1. **Instalar Dependencias:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configurar el Servidor API de Desarrollo:**
   Abre el archivo [src/environments/environment.ts](file:///c:/Users/David/Documents/Github/parqueadero/parqueadero-app/frontend/src/environments/environment.ts) y ajusta la dirección IP de tu servidor backend local.
   * **Tip para pruebas en celular físico:** No utilices `localhost` o `127.0.0.1`. Configura la IP local de tu computador en la red Wi-Fi compartida, por ejemplo:
     ```typescript
     export const environment = {
       production: false,
       apiUrl: 'http://192.168.1.10:8000/api/v1'
     };
     ```

3. **Ejecutar el Servidor Web de Desarrollo:**
   ```bash
   npm run start
   ```
   *Alternativamente con Ionic CLI:* `ionic serve`  
   La aplicación web estará disponible en `http://localhost:8080` (o el puerto configurado por Ionic).

---

## 🔔 Configuración de Firebase Notificaciones Push (Android)

Para que tu dispositivo móvil Android reciba notificaciones push:
1. Asegúrate de tener tu archivo **`google-services.json`** descargado desde la consola de Firebase.
2. Colócalo dentro de la carpeta: `frontend/android/app/google-services.json`.
3. Para activarlo en la app, inicia sesión como Cliente o Administrador, ve a la pestaña **Perfil (Tab 3)** y haz clic en **Activar push (dispositivo)**.
4. Concede los permisos y tu dispositivo registrará automáticamente el token único en la base de datos del servidor.

---

## 📦 Comandos para Enviar a Producción y Compilar

Dependiendo del destino final del despliegue (Web PWA, Android APK, o iOS App), sigue estas instrucciones optimizadas:

### Opción A: Compilar para Despliegue Web (Hosting)
Si vas a subir el frontend a un hosting web (como Firebase Hosting, Netlify, Vercel, o Apache/Nginx):

1. **Compilar el proyecto optimizado para producción:**
   ```bash
   npm run build
   ```
   *Este comando ejecuta `ng build --configuration=production`, lo que minifica el Javascript/CSS, optimiza los assets y genera el directorio web final en `frontend/www/`.*

2. **Subir a Producción:**
   Sube el contenido completo de la carpeta `/www` a tu proveedor de hosting preferido.

---

### Opción B: Generar la Aplicación para Android (APK / AAB)
Para generar la aplicación nativa para celulares Android:

1. **Compilar la web y sincronizar con Capacitor:**
   ```bash
   npm run build:android
   ```
   *Esto equivale a correr `ng build` y copiar todos los archivos compilados a la carpeta nativa mediante `npx cap sync android`.*

2. **Compilar el APK de forma directa en Windows (Línea de Comandos):**
   * **Para pruebas/desarrollo (APK Debug):**
     ```bash
     npm run android:apk:debug
     ```
     Generará el archivo instalable en: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
   
   * **Para distribución/tienda (APK Release sin firmar):**
     ```bash
     npm run android:apk:release
     ```
     Generará el archivo compilado en: `frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk` *(requiere firma keystore posterior para subir a Play Store)*.

3. **Compilar a través de Android Studio (Recomendado para firmas y testing):**
   * Abre el proyecto nativo de Android en Android Studio:
     ```bash
     npx cap open android
     ```
   * En el menú superior de Android Studio, haz clic en:  
     **Build ➔ Build Bundle(s) / APK(s) ➔ Build APK(s)** o **Generate Signed Bundle / APK** para firmarla con tu llave oficial de distribución.

---

### Opción C: Generar la Aplicación para iOS (Apple App Store)
Si deseas agregar soporte y compilar para dispositivos Apple (requiere un equipo Mac con macOS):

1. **Agregar la plataforma nativa de iOS:**
   ```bash
   npx cap add ios
   ```

2. **Compilar y sincronizar cambios:**
   ```bash
   npm run build
   npx cap sync ios
   ```

3. **Abrir en Xcode:**
   ```bash
   npx cap open ios
   ```
4. En **Xcode**, selecciona tu cuenta de desarrollador de Apple, configura los perfiles de aprovisionamiento (Provisioning Profiles), y haz clic en **Product ➔ Archive** para generar el Build final de producción para TestFlight o la App Store.

---

## 🧹 Comandos Útiles de Mantenimiento

* **Limpiar y regenerar sincronización nativa (cuando agregas nuevas dependencias npm):**
  ```bash
  npx cap sync
  ```
* **Verificar el estado general de configuración de Capacitor:**
  ```bash
  npx cap doctor
  ```
