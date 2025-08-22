-- Script de prueba para verificar la sintaxis de creación de tablas
-- Este archivo contiene ejemplos de la sintaxis SQL que debería generar el sistema

-- Ejemplo 1: Tabla simple sin esquema
CREATE TABLE "mi_tabla_ejemplo" (
  "id" INTEGER NOT NULL,
  "nombre" VARCHAR(255) NOT NULL,
  "email" VARCHAR(100) UNIQUE,
  "fecha_creacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- Ejemplo 2: Tabla con esquema
CREATE TABLE "mi_esquema"."otra_tabla" (
  "codigo" VARCHAR(50) NOT NULL,
  "descripcion" TEXT,
  "activo" BOOLEAN DEFAULT true,
  "valor" DECIMAL(10,2) DEFAULT 0.00,
  PRIMARY KEY ("codigo")
);

-- Ejemplo 3: Tabla con múltiples restricciones
CREATE TABLE "tabla_compleja" (
  "id" INTEGER NOT NULL,
  "nombre" VARCHAR(100) NOT NULL,
  "codigo" VARCHAR(20) UNIQUE NOT NULL,
  "fecha" DATE DEFAULT CURRENT_DATE,
  "estado" VARCHAR(20) DEFAULT 'ACTIVO',
  PRIMARY KEY ("id")
);

-- Comentarios sobre la sintaxis:
-- 1. Todos los nombres de tabla y columna están entre comillas dobles
-- 2. Los tipos de datos están en mayúsculas (estándar Firebird)
-- 3. Los valores por defecto están correctamente formateados
-- 4. Las restricciones PRIMARY KEY y UNIQUE están bien definidas
-- 5. No hay espacios en los nombres de objetos

