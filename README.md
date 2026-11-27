# @ado/baileys

A lightweight WhatsApp Web API wrapper basado en **Baileys** (WhiskeySockets), con utilities y helpers propios para bots.

> Objetivo: conservar la API original de Baileys, añadir utilidades de Ado y ofrecer una documentación clara para desarrolladores.

---

## Requisitos

- Node.js **>= 20**
- npm
- Una sesión de WhatsApp persistida para no volver a autenticar en cada inicio.

---

## Instalación

```bash
npm install @ado/baileys
```

# o directamente desde GitHub:

```bash
npm install github:SergioOficial/ado-baileys
```

---

## Uso rápido

### Ejemplo (con socket)

```js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@ado/baileys');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        // Aquí puedes implementar tu estrategia de reconexión.
      }
    }

    if (connection === 'open') {
      console.log('WhatsApp conectado');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const message = messages?.[0];
    if (!message?.message) return;

    console.log('Mensaje recibido:', message.key);
    // await sock.sendMessage(message.key.remoteJid, { text: '¡Hola!' });
  });
}

start().catch(console.error);
```

Guarda `./session` fuera del control de versiones. No publiques credenciales, códigos QR ni archivos de sesión.

---

## Funciones / Helpers incluidas

El paquete conserva las exportaciones de **@whiskeysockets/baileys** y añade estas utilidades:

- `sendInteractiveButtons(sock, jid, options)` — envía mensajes con botones interactivos nativos.
- `sendModdedSticker(sock, jid, originalSticker)` — reenvía un sticker conservando sus metadatos.

> Las demás funciones disponibles son las exportaciones de Baileys. Consulta su documentación para conocer la API completa.

---

## Utilidades recomendadas

### Media (descarga)

Puedes utilizar `downloadContentFromMessage`, exportada por Baileys, para descargar contenido multimedia de un mensaje.

Ejemplo conceptual:

```js
const { downloadContentFromMessage } = require('@ado/baileys');

// const stream = await downloadContentFromMessage(message, 'image');
// Convierte el stream a Buffer si necesitas guardar el archivo.
```

---

## Mensajes interactivos

### `sendInteractiveButtons(sock, jid, options)`

```js
const { sendInteractiveButtons } = require('@ado/baileys');

await sendInteractiveButtons(sock, '1234567890@s.whatsapp.net', {
  title: 'Menú',
  text: 'Selecciona una opción',
  footer: 'Ado',
  buttons: [
    {
      name: 'quick_reply',
      buttonParamsJson: {
        display_text: 'Saludar',
        id: 'saludar'
      }
    }
  ]
});
```

- `sock`: socket de Baileys conectado.
- `jid`: identificador del chat o grupo.
- `buttons`: arreglo de botones con `name` y `buttonParamsJson`.

La compatibilidad de los botones depende de WhatsApp y puede cambiar sin aviso.

---

## Stickers

### `sendModdedSticker(sock, jid, originalSticker)`

```js
const { sendModdedSticker } = require('@ado/baileys');

// originalSticker debe ser el objeto stickerMessage de un mensaje recibido.
await sendModdedSticker(sock, jid, originalSticker);
```

La función conserva los metadatos del sticker original y devuelve el resultado de `sock.sendMessage()`.

---

## Sesiones (Auth)

Debes persistir las credenciales en una carpeta, por ejemplo:

- `useMultiFileAuthState('./session')`
- `sock.ev.on('creds.update', saveCreds)`

No compartas ni subas esa carpeta a GitHub. Si pierdes las credenciales, tendrás que volver a vincular el dispositivo.

---

## Troubleshooting

### “Cannot find module / syntax error”
- Comprueba que instalaste `@ado/baileys`.
- Verifica que utilizas Node.js 20 o superior.
- Este paquete utiliza CommonJS (`require`).

### “Auth/credenciales se pierden”
- Verifica que registraste `sock.ev.on('creds.update', saveCreds)`.
- Comprueba que `./session` exista y tenga permisos de escritura.
- Mantén la carpeta de sesión persistente entre reinicios.

### “La conexión se cierra”
- Comprueba el código de desconexión.
- Si no fue un cierre de sesión (`DisconnectReason.loggedOut`), aplica una reconexión controlada.

---

## Contribuir

Pull requests son bienvenidas.

1. Haz un fork.
2. Crea una rama: `feat/mi-mejora`.
3. Realiza tus cambios y pruebas.
4. Abre un Pull Request describiendo lo que has modificado.

---

## Licencia

MIT. Consulta también las licencias de las dependencias utilizadas.

---
