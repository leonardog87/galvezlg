# React + TypeScript + Vite

## Acceso de administración

La pantalla de acceso está disponible únicamente escribiendo `/login` en la URL. La carga de productos requiere una sesión administrativa tanto en la interfaz como en la API.

Definí `ADMIN_USERNAME` y `ADMIN_PASSWORD` antes de iniciar la API. Para desarrollo local, los valores predeterminados son `admin` y `galvez2026`; deben reemplazarse en cualquier despliegue.

## Pagos con Mercado Pago

El checkout usa Mercado Pago Checkout Pro. Antes de iniciar la API, configurá estas variables de entorno:

```powershell
$env:MP_ACCESS_TOKEN="APP_USR-..."
$env:MP_WEBHOOK_SECRET="clave-secreta-del-webhook"
$env:PUBLIC_SITE_URL="https://www.tudominio.com"
$env:PUBLIC_API_URL="https://api.tudominio.com"
npm run api
```

`PUBLIC_API_URL` puede omitirse cuando el frontend y la API comparten el mismo dominio. Las URLs deben ser públicas y HTTPS para que Mercado Pago pueda retornar al sitio y enviar webhooks. `MP_WEBHOOK_SECRET` es la clave de Webhooks > Configurar notificaciones de la aplicación. Ambas credenciales pertenecen al servidor y nunca deben agregarse a variables `VITE_*` ni subirse al repositorio.

### Configuración de producción

El sitio público de producción es `https://galvezlg.vercel.app`. Configurá las
variables en el proveedor correspondiente (no copies `.env` al repositorio):

- En Vercel, conectar una integración Postgres (por ejemplo Neon) al proyecto;
  esta debe proporcionar `DATABASE_URL`.
- En variables de producción de Vercel, definir
  `PUBLIC_SITE_URL=https://galvezlg.vercel.app`,
  `PUBLIC_API_URL=https://galvezlg.vercel.app`, `MP_ACCESS_TOKEN`,
  `MP_WEBHOOK_SECRET`, `ADMIN_USERNAME` y `ADMIN_PASSWORD`.
- `VITE_API_URL` debe omitirse: el frontend usa la API del mismo dominio.
- En Mercado Pago, en **Tu integración > Webhooks > Producción**, registrar
  `https://galvezlg.vercel.app/api/mercadopago/webhook`, seleccionar el
  evento **Pagos** y guardar la clave generada como `MP_WEBHOOK_SECRET`.

En Vercel la API usa Postgres mediante `DATABASE_URL`. Para desarrollo local,
si esa variable no está definida, conserva automáticamente la base SQLite.
El archivo `vercel.json` también configura el frontend para que las URLs de
retorno `/pago/exitoso`, `/pago/pendiente` y `/pago/error` carguen correctamente.

## Consultas de contacto por correo

El formulario envía las consultas desde el backend mediante la API HTTP de
Resend. El destinatario configurado es `mailTest@mail.com`. Para habilitar el
envío en Vercel:

1. Creá una cuenta en Resend, verificá el dominio desde el cual enviarás los
   mensajes y generá una API key con permiso de envío.
2. Agregá estas variables de entorno al proyecto:

```text
RESEND_API_KEY=re_...
CONTACT_FROM_EMAIL=Gálvez Motos <contacto@tudominio.com>
CONTACT_TO_EMAIL=mailTest@mail.com
```

3. Volvé a desplegar el proyecto. `CONTACT_FROM_EMAIL` debe usar el dominio
   verificado en Resend. La API key es privada y nunca debe usar el prefijo
   `VITE_` ni incluirse en el repositorio.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
