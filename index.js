
const baileys = require('@whiskeysockets/baileys');

const stickerUtils = require('./lib/sticker');
const buttonsUtils = require('./lib/buttons.js');

module.exports = {
    ...baileys,
    default: baileys.default,
    ...stickerUtils,
    ...buttonsUtils
};
