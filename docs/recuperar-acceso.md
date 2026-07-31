# Recuperar acceso a my notes

Hay tres formas de recuperar el acceso, en este orden. La primera es la que vas
a usar el 99% de las veces.

---

## 1. El gestor de contraseñas

La primera línea de defensa es Bitwarden. La contraseña se escribe **una sola
vez**, al crear la cuenta, y el gestor la guarda. Si está ahí, no hay nada que
recuperar.

**Guardala ahí cuando crees la cuenta.** Es literalmente el plan de recuperación.

---

## 2. "Olvidé mi contraseña" en la app

Está implementado. En la pantalla de ingreso escribís el email, tocás **Olvidé
mi contraseña**, y llega un correo con un link a `/reset` donde ponés una nueva.

El `redirectTo` sale de `window.location.origin`, así que se resuelve solo en
local, en producción y en los previews de Vercel. No es una variable de entorno
a propósito: una env var habría que mantenerla en dos lugares y quedaría mal en
alguno de los dos.

Requiere esta configuración en **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://my-notes-seven-nu.vercel.app`
- **Redirect URLs**:
  - `https://my-notes-seven-nu.vercel.app/reset`
  - `http://localhost:3000/reset`

Exactas. Ver la advertencia sobre comodines al final.

---

## 3. Salida de emergencia por SQL

Si perdés la contraseña Y el gestor, el acceso se recupera desde el SQL Editor
del dashboard. **Esto no borra ninguna nota**: solo reemplaza el hash de la
contraseña del usuario existente.

Supabase → SQL Editor → New query:

```sql
update auth.users
   set encrypted_password = crypt('LA-NUEVA-CONTRASEÑA', gen_salt('bf'))
 where email = 'tu-email@ejemplo.com';
```

Verificado en este proyecto el 2026-07-31:

- `pgcrypto` está instalada
- El hash generado es **bcrypt** (`$2a$`), que es el formato que usa Supabase Auth
- `crypt(password_correcta, hash) = hash` → `true`
- `crypt(password_incorrecta, hash) = hash` → `false`

Después entrás a la app con esa contraseña nueva. No hay ningún correo de por
medio.

### La advertencia

Esto toca una tabla interna de Supabase Auth. Funciona hoy porque el hash es
bcrypt, pero **es un detalle de implementación de Supabase, no una API pública**:
si algún día cambian el algoritmo, este método deja de andar.

Si eso pasa, el plan B es el dashboard: **Authentication → Users**, borrar el
usuario y crear la cuenta de nuevo. **Ojo: eso SÍ borra todas tus notas**, porque
`entries` y `contexts` tienen `on delete cascade` sobre `auth.users`. Es el
último recurso, no el primero.

---

## La advertencia sobre comodines

**Nunca uses comodines del tipo `https://my-notes-*.vercel.app/**`.** Ese patrón
matchea cualquier proyecto de vercel.app que empiece igual, incluido uno de otra
persona: podrían recibir tu token de sesión y entrar a la base como vos. La RLS
no protege contra eso, porque para Supabase ese token *sos vos*.
