# Sistema de Autenticación - loginDemo

Este proyecto es un sistema de autenticación desarrollado con Spring Boot. Permite gestionar usuarios con roles
diferenciados y realizar operaciones CRUD sobre la base de datos. La aplicación asegura la autenticación mediante
contraseñas encriptadas, gestiona sesiones de forma segura y define permisos específicos según el rol del usuario.

## Características

- **Autenticación Segura:**  
  Contraseñas encriptadas y sesiones protegidas para mayor seguridad.
- **Gestión de Roles:**
    - **Administrador:** Puede realizar todas las operaciones CRUD (Crear, Leer, Actualizar y Borrar) mediante un menú
      de gestión adicional para operar sobre la base de datos de usuarios.
    - **Usuario:** Solo puede visualizar su información personal a través de su perfil.
- **Operaciones CRUD:**  
  Permite el registro de nuevos usuarios y la administración de los existentes.
- **Pruebas Automatizadas:**  
  Se incluyen pruebas de las operaciones CRUD mediante cURL con un script (`test.sh`).

## Requisitos

- **Java:** JDK 21 o superior.
- **Maven:** 3.6 o superior.
- **Docker y Docker Compose:** (Opcional, para dockerización y despliegue).

## Instalación y Ejecución

### 1. Ejecución Local

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/AxlAleT/loginDemo
   cd loginDemo
   ```

2. **Compilar y empaquetar la aplicación:**

    ```bash
    ./mvnw clean package -DskipTests
    ```


3. **Ejecutar la aplicación:**

    ```bash
    java -jar target/*.jar
    ```

   La aplicación estará disponible en http://localhost:8080.


Actualiza **application.properties** segun tu entorno local de base de datos

### 2. Dockerización

El proyecto incluye un Dockerfile y un archivo docker-compose.yml para facilitar la creación de contenedores.

1. ***Construir la imagen Docker***

```bash
    docker build -t loginDemo .
```

2. ***Levantar la aplicación con Docker Compose***

El archivo docker-compose.yml define dos servicios:

- db: Contenedor de PostgreSQL.
- app: Contenedor de la aplicación Spring Boot.

Para iniciar ambos contenedores, ejecuta:

```bash
    docker-compose up
```

- La aplicación estará accesible en http://localhost:8080.
- La base de datos PostgreSQL se mapea al puerto 5433 en el host.

## Pruebas Automatizadas

Se incluye un script llamado test.sh para ejecutar pruebas automáticas utilizando cURL. Este script realiza solicitudes
para validar las operaciones CRUD y la seguridad del sistema.
Ejecución del Script de Pruebas en Linux

### Dar permisos de ejecución:

```bash
    chmod +x test.sh
```

Ejecutar el script:

```bash
    ./test.sh
```

El script realizará varias peticiones para comprobar que la aplicación responde correctamente a las operaciones de
autenticación y CRUD.