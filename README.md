# 🏎️ NeumaticoRojo

**La Fórmula 1, vuelta a vuelta y dato a dato.**

Una plataforma web para explorar **resultados, calendario, clasificaciones y estadísticas de Fórmula 1** desde un solo lugar. Desarrollada como proyecto personal, con foco en una interfaz moderna, navegación sencilla y acceso a información de distintas temporadas.

![Estado](https://img.shields.io/badge/ESTADO-En%20desarrollo-E10600?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-171717?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![React](https://img.shields.io/badge/React-171717?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-171717?style=for-the-badge&logo=nodedotjs&logoColor=5FA04E)
![MySQL](https://img.shields.io/badge/MySQL-171717?style=for-the-badge&logo=mysql&logoColor=4479A1)

---

## 🏁 ¿Qué podés encontrar?

- **Inicio:** resumen de la temporada, fin de semana de carrera y favoritos destacados.
- **Calendario:** Grandes Premios y sesiones de cada fin de semana.
- **Resultados:** información de carreras, clasificación y sprint según la disponibilidad de datos.
- **Clasificaciones:** tablas de pilotos y constructores.
- **Pilotos y escuderías:** perfiles, estadísticas y detalles por temporada.
- **Temporadas históricas:** consulta de datos desde 2020 hasta 2026.
- **Cuentas de usuario:** registro, inicio de sesión y elección de piloto y escudería favoritos.
- **Interfaz adaptable:** diseño responsive y modos claro/oscuro.

> Las estadísticas y sesiones disponibles pueden variar según la temporada y la información proporcionada por las APIs externas.

## 🛠️ Tecnologías

| Área | Tecnologías |
| --- | --- |
| Frontend | React, Vite, JavaScript, Tailwind CSS |
| Backend | Node.js, Express |
| Base de datos | MySQL |
| Autenticación | JWT, bcryptjs, cookies HTTP-only |
| Datos externos | Jolpica F1 API, OpenF1 |
| Pruebas | Node.js Test Runner |

## 📂 Organización del proyecto

```text
NeumaticoRojo/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── tests/
│   ├── utils/
│   ├── app.js
│   ├── db.js
│   └── server.js
├── frontend/
│   ├── public/
│   └── src/
└── README.md
```

## 🚀 Ejecución local

**Requisitos:** Node.js, npm y MySQL. La base de datos `neumaticorojo` debe estar creada y contar con las tablas y los datos que utiliza el backend.

**1. Clonar el repositorio**

```bash
git clone https://github.com/FabriP11/NeumaticoRojo.git
cd NeumaticoRojo
```

**2. Configurar e iniciar el backend**

```bash
cd backend
npm install
node --watch server.js
```

Antes de iniciarlo, configurá `backend/.env` con la conexión a MySQL, el secreto JWT y las demás variables requeridas por `db.js` y `config/`. **Nunca publiques el archivo `.env`.**

Backend local: **http://localhost:3001**

**3. Iniciar el frontend** (en otra terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend local: **http://localhost:5173**

> La instalación desde cero requiere contar también con el esquema y los datos de MySQL; el repositorio está en preparación y puede que esos recursos todavía no estén publicados.

## 🔐 Seguridad y calidad

El backend incorpora distintas medidas de protección:

- Contraseñas almacenadas mediante **bcrypt**.
- Sesiones con **JWT** y cookies **HTTP-only**.
- Restricción de importaciones a cuentas administrativas.
- Límite de intentos fallidos de inicio de sesión.
- Validación de parámetros y comprobación del origen de solicitudes que modifican datos.
- Manejo centralizado de errores y pruebas automatizadas.

Para ejecutar las pruebas desde `backend/`:

```bash
node --test tests/*.test.js
```

## 🏎️ Fuentes de datos

NeumaticoRojo utiliza datos de servicios externos como **[Jolpica F1 API](https://api.jolpi.ca/)** y **[OpenF1](https://openf1.org/)**. La disponibilidad y actualización de ciertas estadísticas dependen de esos servicios.

## 🚧 Estado del proyecto

**En desarrollo.** Actualmente se ejecuta de forma local y continúa recibiendo mejoras de diseño, rendimiento, seguridad y funcionalidades. Todavía no cuenta con una versión pública desplegada.

## 👨‍💻 Autor

Desarrollado por **[FabriP11](https://github.com/FabriP11)** como proyecto personal.

---

*Proyecto independiente, no oficial ni afiliado a Formula 1, FIA o sus equipos. Las marcas y logotipos mencionados pertenecen a sus respectivos titulares.*
