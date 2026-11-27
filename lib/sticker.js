'use strict';

async function sendModdedSticker(sock, jid, originalSticker) {
  if (!sock || typeof sock.sendMessage !== 'function') {
    throw new TypeError('sock debe ser un socket de Baileys con sendMessage().');
  }
  if (typeof jid !== 'string' || jid.length === 0) {
    throw new TypeError('jid debe ser un identificador de chat válido.');
  }
  if (!originalSticker || typeof originalSticker !== 'object' || Array.isArray(originalSticker)) {
    throw new TypeError('originalSticker debe contener los metadatos de un sticker.');
  }

  const message = {
    stickerMessage: {
      url: originalSticker.url,
      fileSha256: originalSticker.fileSha256,
      fileEncSha256: originalSticker.fileEncSha256,
      mediaKey: originalSticker.mediaKey,
      mimetype: originalSticker.mimetype || 'image/webp',
      directPath: originalSticker.directPath,
      fileLength: originalSticker.fileLength,
      mediaKeyTimestamp: originalSticker.mediaKeyTimestamp,
      isAnimated: originalSticker.isAnimated === true,
      stickerSentTs: Date.now().toString(),
      isAvatar: originalSticker.isAvatar === true,
      isAiSticker: originalSticker.isAiSticker === true,
      isLottie: originalSticker.isLottie === true,
      firstFrameLength: originalSticker.firstFrameLength,
      firstFrameSidecar: originalSticker.firstFrameSidecar,
      accessibilityLabel: originalSticker.accessibilityLabel || ''
    }
  };

  return sock.sendMessage(jid, message);
}

module.exports = { sendModdedSticker };
