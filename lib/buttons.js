
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const crypto = require('crypto');

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

  // 👇 Para chats privados, WhatsApp exige el atributo biz_bot
  if (!isGroup) {
    biz.attrs.biz_bot = '1';
  }

  return [biz];
}

async function sendInteractiveButtons(sock, jid, { title, text, footer, buttons }) {
  try {
    const preparedButtons = buttons.map(btn => ({
      name: btn.name,
      buttonParamsJson: typeof btn.buttonParamsJson === 'string'
        ? btn.buttonParamsJson
        : JSON.stringify(btn.buttonParamsJson)
    }));

    const interactiveMessage = proto.Message.InteractiveMessage.create({
      header: { title: title || ' ', hasMediaAttachment: false },
      body: { text: text || ' ' },
      footer: { text: footer || ' ' },
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: preparedButtons
      })
    });

    const isGroup = jid.endsWith('@g.us');

    // 👇 En privado lo envolvemos en viewOnceMessageV2 (es más compatible)
    const messageContent = isGroup
      ? { interactiveMessage }
      : { viewOnceMessageV2: { message: { interactiveMessage } } };

    const msg = generateWAMessageFromContent(jid, messageContent, {
      userJid: sock.user.id,
      messageId: crypto.randomBytes(16).toString('hex').toUpperCase()
    });

    const additionalNodes = buildInteractiveNodes(isGroup);

    console.log(`📤 Enviando a ${isGroup ? 'grupo' : 'privado'}...`);
    await sock.relayMessage(jid, msg.message, {
      messageId: msg.key.id,
      additionalNodes
    });
    console.log("✅ Botones enviados.");

    return msg;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

module.exports = { sendInteractiveButtons };