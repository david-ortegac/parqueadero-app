# 🚗 Parqueadero App - Backend API (Laravel 12)

Bienvenido a la documentación oficial del backend de **Parqueadero App**. Este es un sistema robusto de gestión de parqueaderos construido con **Laravel 12**, diseñado para administrar ingresos, salidas, tarifas dinámicas, capacidades en tiempo real y notificaciones push para los clientes.

---

## 📋 Características Principales
* **Control de Ingreso y Salida (Check-In / Check-Out):** Validación automática de placas colombianas (carros y motos) y cálculo automático de cobros.
* **Tarifas Dinámicas:** Soporte de cobro por Minuto, Hora, Día, Semana y Mes.
* **Gestión de Capacidad:** Control de cupos máximos permitidos por clase de vehículo (Carro / Moto).
* **Notificaciones Push en Tiempo Real:** Integración con **Firebase Cloud Messaging (FCM)** para notificar a los clientes al instante cuando su vehículo ingresa o sale.
* **Métricas de Ingresos y Reportes:** Resumen financiero diario y por rangos de fecha, segmentado por tipo de vehículo y tarifa.

---

## 🛠️ Requisitos del Entorno
* **PHP:** ^8.2 o superior (Recomendado 8.3+)
* **Extensión Sodium:** Requerida en PHP para firmas criptográficas de Firebase JWT.
* **Gestor de BD:** SQLite (desarrollo local por defecto) o MySQL/PostgreSQL (producción).
* **Composer** para la gestión de dependencias de PHP.

---

## 🚀 Configuración en Desarrollo Local

1. **Instalar Dependencias:**
   Si estás utilizando PHP 8.2 (como en XAMPP), asegúrate de tener la extensión `sodium` activa en tu `php.ini` (descomentando `;extension=sodium`) e instala las dependencias ignorando la alerta de versión de PHP:
   ```bash
   composer install --ignore-platform-req=php
   ```

2. **Configurar el archivo de Entorno:**
   Copia el archivo de ejemplo y genera la clave de la aplicación:
   ```bash
   copy .env.example .env
   php artisan key:generate
   ```

3. **Configurar la Base de Datos:**
   Por defecto, el proyecto usa SQLite. Si no existe la base de datos, créala:
   ```bash
   # En Windows (PowerShell)
   New-Item -ItemType File -Path database/database.sqlite -Force
   ```
   Luego, ejecuta las migraciones y seeders para poblar el sistema con datos de prueba iniciales:
   ```bash
   php artisan migrate --seed
   ```

4. **Levantar Servidor Local:**
   ```bash
   php artisan serve
   ```
   La API estará disponible en `http://127.0.0.1:8000`.

---

## 🔔 Integración de Notificaciones Push (Firebase FCM)

Para enviar notificaciones push desde el backend hacia la aplicación Android/iOS:

1. Genera la **Clave Privada de Cuenta de Servicio (JSON)** desde tu Firebase Console:
   * Ajustes del Proyecto ➔ **Cuentas de servicio** ➔ **Generar nueva clave privada**.
2. Guarda el archivo descargado en el backend como:
   `backend/storage/app/firebase-service-account.json`.
3. Registra la ruta en tu archivo `.env`:
   ```env
   FIREBASE_CREDENTIALS=storage/app/firebase-service-account.json
   ```

---

## 📦 Comandos para Enviar a Producción (Deployment)

Cuando envíes la aplicación a un servidor de producción (como AWS, VPS, Forge, DigitalOcean, etc.), es fundamental optimizar la configuración y la base de datos para garantizar la máxima velocidad, seguridad y estabilidad.

Sigue esta lista de comandos ordenados en tu flujo de despliegue:

### 1. Descarga de Dependencias Optimizada (Sin dependencias de desarrollo)
```bash
composer install --no-dev --optimize-autoloader
```
*Esto elimina herramientas de testing o desarrollo y reestructura el autoload de clases para que responda a la velocidad máxima.*

### 2. Ejecutar Migraciones de Base de Datos de Forma Segura
```bash
php artisan migrate --force
```
*El flag `--force` es obligatorio en producción para ejecutar las migraciones sin que la terminal interactiva te pida confirmación visual.*

### 3. Caché de Configuración y Rutas (Crucial para el rendimiento de la API)
Laravel debe leer la configuración de archivos cacheados en lugar de procesar los archivos `.env` y de rutas en cada solicitud HTTP. Ejecuta:
```bash
# Limpiar y crear caché de configuración, rutas y vistas en un solo comando moderno
php artisan optimize
```
*Este comando almacena en caché las rutas de la API, las configuraciones del sistema y optimiza la carga general.*

> [!WARNING]
> Nunca uses variables `env()` directamente en tu código fuera de los archivos en la carpeta `config/`. Al cachear la configuración, `env()` retornará `null`. En su lugar, usa `config('services.firebase.credentials')`.

### 4. Caché del Motor de Vistas (Blade) e Hilos de Eventos
Si utilizas eventos o correos con plantillas Blade, asegúrate de cachearlos previamente:
```bash
php artisan view:cache
php artisan event:cache
```

### 5. Configurar el Escuchador de Colas (Queue Worker)
Las notificaciones push u otros procesos pesados se encolan para no retrasar la respuesta al usuario. En producción, debes tener un proceso en segundo plano (como *Supervisor*) corriendo el siguiente comando:
```bash
php artisan queue:work --queue=default --tries=3 --backoff=60
```

---

## 🧹 Comandos de Mantenimiento y Actualizaciones en Producción

Si realizas algún cambio en producción (como modificar el archivo `.env` o agregar nuevas rutas), debes limpiar y refrescar el sistema:

* **Limpiar toda la caché acumulada:**
  ```bash
  php artisan optimize:clear
  ```
  *(Limpia caché de rutas, configuración, vistas, eventos y datos generales).*

* **Volver a cachear todo optimizado tras una actualización:**
  ```bash
  php artisan optimize
  ```

* **Poner la aplicación en modo mantenimiento mientras actualizas:**
  ```bash
  php artisan down --secret="tu-clave-secreta-para-saltarte-el-bloqueo"
  ```

* **Volver a poner la aplicación en línea:**
  ```bash
  php artisan up
  ```
