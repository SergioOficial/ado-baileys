'use strict';

const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const crypto = require('node:crypto');

function buildInteractiveNodes(isGroup) {
  const content = [
    {
      tag: 'interactive',
      attrs: { type: 'native_flow', v: '1' },
      content: [
        {
          tag: 'native_flow',
          attrs: { v: '9', name: 'mixed' }
        }
      ]
    }
  ];
  const biz = { tag: 'biz', attrs: {}, content };
  if (!isGroup) biz.attrs.biz_bot = '1';
  return [biz];
}

async function sendInteractiveButtons(sock, jid, options = {}) {
  if (!sock || typeof sock.relayMessage !== 'function' || !sock.user?.id) {
    throw new TypeError('sock debe ser un socket de Baileys conectado.');
  }
  if (typeof jid !== 'string' || jid.length === 0) {
    throw new TypeError('jid debe ser un identificador de chat válido.');
  }

  const { title, text, footer, buttons } = options;
  if (!Array.isArray(buttons) || buttons.length === 0) {
    throw new TypeError('options.buttons debe ser un arreglo con al menos un botón.');
  }

  const preparedButtons = buttons.map((button, index) => {
    if (!button || typeof button.name !== 'string' || button.name.length === 0) {
      throw new TypeError(`El botón ${index} debe incluir un name válido.`);
    }
    if (button.buttonParamsJson === undefined || button.buttonParamsJson === null) {
      throw new TypeError(`El botón ${index} debe incluir buttonParamsJson.`);
    }
    return {
      name: button.name,
      buttonParamsJson: typeof button.buttonParamsJson === 'string'
        ? button.buttonParamsJson
        : JSON.stringify(button.buttonParamsJson)
    };
  });

  const isGroup = jid.endsWith('@g.us');
  const interactiveMessage = proto.Message.InteractiveMessage.create({
    header: { title: title || ' ', hasMediaAttachment: false },
    body: { text: text || ' ' },
    footer: { text: footer || ' ' },
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
      buttons: preparedButtons
    })
  });

  const messageContent = isGroup
    ? { interactiveMessage }
    : { viewOnceMessageV2: { message: { interactiveMessage } } };
  const message = generateWAMessageFromContent(jid, messageContent, {
    userJid: sock.user.id,
    messageId: crypto.randomBytes(16).toString('hex').toUpperCase()
  });

  await sock.relayMessage(jid, message.message, {
    messageId: message.key.id,
    additionalNodes: buildInteractiveNodes(isGroup)
  });
  return message;
}

module.exports = { sendInteractiveButtons };
