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
    for (let i = 0; i < 5 && current; i++) {
        if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
        else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
        else if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
        else if (current.documentWithCaptionMessage?.message) current = current.documentWithCaptionMessage.message;
        else break;
    }
    return current;
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
            console.log('\n✅ Conectado. Envía ".test" a este chat.\n');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        const m = messages[0];
        if (!m?.message) return;

        const msg = unwrapMessage(m.message);
        let texto = msg?.conversation || msg?.extendedTextMessage?.text || '';

        if (msg?.interactiveResponseMessage) {
            const paramsJson = msg.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) {
                try {
                    const data = JSON.parse(paramsJson);
                    texto = data.id || '';
                    console.log(`\n🔘 Botón presionado. Comando extraído: "${texto}"`);
                } catch (error) {
                    console.error('No se pudo leer la respuesta interactiva:', error.message);
                }
            }
        } else if (msg?.buttonsResponseMessage) {
            texto = msg.buttonsResponseMessage.selectedButtonId || '';
            console.log(`\n🔘 Botón antiguo presionado. Comando: "${texto}"`);
        }

        // Acepta tanto ".test" como "test"; los IDs de los botones siguen siendo simples.
        texto = texto.trim().replace(/^\./, '');
        if (!texto) return;

        if (texto === 'test') {
            console.log('\n⏳ Procesando .test...');
            try {
                await sendInteractiveButtons(sock, m.key.remoteJid, {
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
            console.log('\n👋 Ejecutando comando .saludar...');
            try {
                await sock.sendMessage(m.key.remoteJid, {
                    text: '👋 ¡Hola! Soy el bot. Has presionado un botón correctamente.'
                }, { quoted: m });
                console.log('✅ Mensaje enviado.');
            } catch (error) {
                console.error('❌ Error enviando saludo:', error);
            }
        }
    });
}

iniciar().catch((error) => {
    console.error('❌ No se pudo iniciar la prueba de botones:', error);
    process.exitCode = 1;
});
