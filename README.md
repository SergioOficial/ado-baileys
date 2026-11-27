# @ado/baileys

Extensión ligera de [Baileys](https://github.com/WhiskeySockets/Baileys) con utilidades para enviar mensajes interactivos y stickers modificados. El paquete conserva las exportaciones originales de Baileys y añade helpers propios.

> **Compatibilidad:** CommonJS y Node.js 18 o superior. La conexión con WhatsApp requiere credenciales válidas y está sujeta a los cambios y condiciones de WhatsApp/Baileys.

## Instalación

```bash
npm install @ado/baileys
```

También puedes instalar directamente desde GitHub:

```bash
npm install github:SergioOficial/ado-baileys
```

## Uso

El paquete reexporta la API de `@whiskeysockets/baileys`. Este ejemplo muestra el flujo habitual de autenticación:

```js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@ado/baileys');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log('Conexión cerrada:', statusCode);

      if (statusCode !== DisconnectReason.loggedOut) {
        // Implementa aquí tu estrategia de reconexión.
      }
    }

    if (connection === 'open') {
      console.log('WhatsApp conectado');
    }
  });
}

start().catch(console.error);
```

Guarda la carpeta de autenticación fuera del control de versiones. No publiques credenciales, QR, tokens ni archivos de sesión.

## Helpers adicionales

### `sendInteractiveButtons(sock, jid, options)`

Envía un mensaje de flujo interactivo nativo.

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
- `jid`: identificador del chat.
- `options.buttons`: arreglo de botones con `name` y `buttonParamsJson`.
- Devuelve el mensaje generado por Baileys.

La compatibilidad de los flujos interactivos depende de WhatsApp y puede cambiar sin aviso.

### `sendModdedSticker(sock, jid, originalSticker)`

Reenvía un sticker usando los metadatos del mensaje original.

```js
const { sendModdedSticker } = require('@ado/baileys');

await sendModdedSticker(sock, jid, originalMessage.message.stickerMessage);
```

El objeto `originalSticker` debe contener los metadatos de medios requeridos por WhatsApp, normalmente obtenidos de un mensaje de sticker recibido. La función devuelve el resultado de `sock.sendMessage`.

## API de Baileys

Todas las exportaciones de `@whiskeysockets/baileys` se vuelven a exportar desde este paquete, además de:

- `sendInteractiveButtons`
- `sendModdedSticker`

## Desarrollo

Requisitos: Node.js 18+ y npm.

```bash
npm install
npm test
```

## Seguridad

- No subas `.env`, carpetas de sesión ni credenciales.
- Trata los JID y los mensajes entrantes como datos no confiables.
- Usa este paquete respetando las condiciones de WhatsApp y la licencia de Baileys.

## Licencia

MIT. Consulta también las licencias de las dependencias incluidas.
