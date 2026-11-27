'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendModdedSticker } = require('../lib/sticker');

test('sendModdedSticker preserves animated flag when true', async () => {
  let sent;
  const expectedResult = { key: { id: 'message-id' } };
  const result = await sendModdedSticker(
    { sendMessage: async (jid, content) => { sent = { jid, content }; return expectedResult; } },
    '123@s.whatsapp.net',
    { isAnimated: true, mimetype: 'image/webp' }
  );
  assert.equal(sent.jid, '123@s.whatsapp.net');
  assert.equal(sent.content.stickerMessage.isAnimated, true);
  assert.equal(result, expectedResult);
});

test('sendModdedSticker does not mark a static sticker as animated', async () => {
  let sent;
  await sendModdedSticker(
    { sendMessage: async (_jid, content) => { sent = content; } },
    '123@s.whatsapp.net',
    { isAnimated: false }
  );
  assert.equal(sent.stickerMessage.isAnimated, false);
});

test('sendModdedSticker validates socket, JID and sticker metadata', async () => {
  await assert.rejects(() => sendModdedSticker({}, '123@s.whatsapp.net', {}), TypeError);
  await assert.rejects(() => sendModdedSticker({ sendMessage() {} }, '', {}), TypeError);
  await assert.rejects(() => sendModdedSticker({ sendMessage() {} }, '123@s.whatsapp.net', null), TypeError);
});
