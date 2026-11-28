const {
    default: makeWASocket,
    useMultiFileAuthState,
    sendInteractiveButtons,
    DisconnectReason,
    Browsers
} = require('../index.js');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');

const logger = pino({ level: 'silent' });
let reconectando = false;

function unwrapMessage(message) {
    let current = message;
    const wrappers = [
        'ephemeralMessage',
        'viewOnceMessage',
        'viewOnceMessageV2',
        'viewOnceMessageV2Extension',
        'documentWithCaptionMessage',
        'editedMessage'
    ];

    for (let i = 0; i < 10 && current; i++) {
        const wrapper = wrappers.find((key) => current[key]?.message);
        if (!wrapper) break;
        current = current[wrapper].message;
    }
    return current;
}

function extractText(message) {
    const msg = unwrapMessage(message);
    if (!msg) return '';

    const directText =
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption;

    if (directText) return directText;

    const buttonId =
        msg.buttonsResponseMessage?.selectedButtonId ||
        msg.templateButtonReplyMessage?.selectedId ||
        msg.listResponseMessage?.singleSelectReply?.selectedRowId;

    if (buttonId) return buttonId;

    const paramsJson =
        msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;

    if (paramsJson) {
        try {
            const response = JSON.parse(paramsJson);
            return response.id || response.row_id || response.selected_id || '';
        } catch (error) {
            console.error('⚠️ No se pudo interpretar la respuesta del botón:', error.message);
        }
    }

    return '';
}

async function procesarMensaje(sock, m) {
    if (!m?.message || m.key?.fromMe) return;

    const jid = m.key?.remoteJid;
    if (!jid || jid === 'status@broadcast') return;

    const textoOriginal = extractText(m.message);
    const texto = textoOriginal.trim().replace(/^\./, '').toLowerCase();

    console.log('\n📩 Mensaje recibido de ' + jid);
    console.log(textoOriginal
        ? '📝 Texto detectado: "' + textoOriginal + '"'
        : '⚠️ No se encontró texto. Tipos recibidos: ' + (Object.keys(unwrapMessage(m.message) || {}).join(', ') || 'desconocido'));

    if (!texto) return;

    if (texto === 'test') {
        console.log('\n⏳ Procesando .test...');
        try {
            await sendInteractiveButtons(sock, jid, {
                title: '✨ Menú de Prueba',
                text: 'Selecciona una opción para ejecutar un comando:',
                footer: 'Ado-Baileys',
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: { display_text: 'saludar', id: 'saludar' }
                    },
                    {
                        name: 'cta_url',
                        buttonParamsJson: {
                            display_text: 'GitHub',
                            url: 'https://github.com/SergioOficial'
                        }
                    }
                ]
            });
            console.log('✅ Botones enviados.');
        } catch (error) {
            console.error('❌ Falló el envío de botones:', error);
        }
        return;
    }

    if (texto === 'saludar') {
        console.log('\n👋 Ejecutando comando saludar...');
        try {
            await sock.sendMessage(jid, {
                text: '👋 ¡Hola! Soy el bot. Has presionado un botón correctamente.'
            }, { quoted: m });
            console.log('✅ Mensaje enviado.');
        } catch (error) {
            console.error('❌ Error enviando saludo:', error);
        }
    }
}

async function iniciar() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_test');
    const sock = makeWASocket({
        auth: state,
        logger,
        browser: Browsers.ubuntu('Chrome')
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📸 ESCANEA EL QR:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error instanceof Boom
                ? lastDisconnect.error.output?.statusCode
                : undefined;
            const debeReconectar = statusCode !== DisconnectReason.loggedOut;

            if (debeReconectar && !reconectando) {
                reconectando = true;
                setTimeout(() => {
                    reconectando = false;
                    iniciar().catch((error) => console.error('❌ No se pudo reconectar:', error));
                }, 2000);
            } else if (!debeReconectar) {
                console.log('🔒 Sesión cerrada. Elimina auth_test solo si quieres vincular otra cuenta.');
            }
        } else if (connection === 'open') {
            console.log('\n✅ Conectado y escuchando mensajes.');
            console.log('📨 Envía ".test" o "test" desde otro chat para probar los botones.\n');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages = [], type }) => {
        console.log('📡 Evento messages.upsert: tipo=' + type + ', cantidad=' + messages.length);
        if (type !== 'notify') return;

        for (const message of messages) {
            try {
                await procesarMensaje(sock, message);
            } catch (error) {
                console.error('❌ Error procesando mensaje entrante:', error);
            }
        }
    });
}

iniciar().catch((error) => {
    console.error('❌ No se pudo iniciar la prueba de botones:', error);
    process.exitCode = 1;
});
