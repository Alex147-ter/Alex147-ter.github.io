# Conti-GO — Guía rápida

## ¿Qué cambió?
Antes el sitio dependía de Supabase para el registro, login, cursos y pagos.
Como no estaba configurado, el registro/login mostraba **"Failed to fetch"**.

Ahora el sitio usa un **backend 100% local** (`js/local-backend.js`), que
guarda todo en el `localStorage` del navegador. Esto significa:

- El registro y el login **funcionan de inmediato**, sin configurar nada.
- El registro como **administrador** funciona con el código secreto.
- Los datos (usuarios, cursos, pagos) se guardan **solo en el navegador**
  donde se usó el sitio. Si lo abres en otro navegador o computadora, no
  vas a ver los mismos usuarios/cursos. Para producción real, más adelante
  se puede reconectar a Supabase u otro backend.

## Registrarte como administrador
En el modal de "Crear Cuenta", marca **"Registrarme como Administrador"**
e ingresa el código:
```
CONTIGO-ADMIN-2026
```
(Puedes cambiarlo editando `ADMIN_SECRET_CODE` en `js/local-backend.js`.)

## Flujo del sitio
1. **`index.html`** — Landing. Ahora es una **suscripción de S/ 19.90 al mes**
   (antes era pago por curso). El botón **"Ver Hub"** junto a "Iniciar Sesión"
   abre una vista previa de los cursos que se desbloquean con la suscripción.
2. **`pago.html`** — Muestra el precio (S/ 19.90/mes) y el **QR de pago (Yape)**.
   - Si tu cuenta es **admin**, ves un panel para **subir/cambiar el QR**.
   - Un usuario normal presiona "Ya realicé el pago" → queda **pendiente**.
3. **`hub.html`** — Biblioteca de cursos. Bloqueada hasta que el admin
   confirme el pago (bandeja de pagos, visible solo para admin).
   El admin puede crear cursos y agregar videos por link (YouTube, Vimeo, etc.).

## Ya no se usa GitHub para iniciar sesión
Se quitaron los botones "Continuar con GitHub" de los modales de login y
registro; solo queda correo + contraseña.

## Archivos del proyecto
```
index.html          → landing con precio S/19.90/mes + vista previa del Hub
pago.html            → pantalla de pago con QR de Yape (editable por admin)
hub.html             → biblioteca de cursos + bandeja de pagos (admin)
css/theme.css         → estilos base compartidos
css/app.css           → estilos de pago.html y hub.html
js/local-backend.js  → backend local (reemplaza a Supabase)
```
