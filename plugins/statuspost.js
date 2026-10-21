
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import isOwnerOrSudo from '../lib/isOwner.js';

const STATUS_JID = 'status@broadcast';
const MAX_MEDIA_BYTES = 64 * 1024 * 1024;

function getMessageContent(message) {
    let content = message?.message;

    while (content) {
        if (content.ephemeralMessage?.message) {
            content = content.ephemeralMessage.message;
            continue;
        }

        if (content.viewOnceMessage?.message) {
            content = content.viewOnceMessage.message;
            continue;
        }

        if (content.viewOnceMessageV2?.message) {
            content = content.viewOnceMessageV2.message;
            continue;
        }

        break;
    }

    return content || {};
}

function getQuotedMessage(message) {
    const content = getMessageContent(message);

    for (const value of Object.values(content)) {
        if (value?.contextInfo?.quotedMessage) {
            return value.contextInfo.quotedMessage;
        }
    }

    return null;
}

async function streamToBuffer(stream) {
    const chunks = [];
    let total = 0;

    for await (const chunk of stream) {
        total += chunk.length;

        if (total > MAX_MEDIA_BYTES) {
            throw new Error('Media exceeds the 64 MB limit.');
        }

        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

function getStatusRecipients(sock) {
    const contacts = sock.store?.contacts || {};
    const selfId = sock.user?.id?.split(':')[0];

    return [...new Set(
        Object.keys(contacts).filter(jid =>
            jid.endsWith('@s.whatsapp.net') &&
            jid !== STATUS_JID &&
            jid.split(':')[0] !== selfId
        )
    )];
}

export default {
    command: 'poststatus',
    aliases: ['statuspost', 'tostatus', 'setstatus'],
    category: 'owner',
    description: 'Publish text, photo, or video WhatsApp Status',
    usage: '.poststatus <text> or reply to a photo/video',
    ownerOnly: true,
    cooldown: 5000,

    async handler(sock, message, args, context) {
        const chatId =
            context.chatId || message.key.remoteJid;

        const senderId =
            context.senderId ||
            message.key.participant ||
            message.key.remoteJid;

        const channelInfo = context.channelInfo || {};

        const reply = async text => {
            return sock.sendMessage(
                chatId,
                { text, ...channelInfo },
                { quoted: message }
            );
        };

        try {
            // Verify owner/sudo permissions using MEGA MD's helper.
            const allowed = await isOwnerOrSudo(
                senderId,
                sock,
                chatId
            );

            if (!allowed) {
                return await reply(
                    '⛔ This command is restricted to the bot owner and sudo users.'
                );
            }

            const caption = (args || []).join(' ').trim();
            const quoted = getQuotedMessage(message);

            let statusPayload;
            let statusType;

            if (quoted?.imageMessage) {
                const stream = await downloadContentFromMessage(
                    quoted.imageMessage,
                    'image'
                );

                const buffer = await streamToBuffer(stream);

                statusPayload = {
                    image: buffer,
                    caption
                };

                statusType = 'Photo';
            } else if (quoted?.videoMessage) {
                const stream = await downloadContentFromMessage(
                    quoted.videoMessage,
                    'video'
                );

                const buffer = await streamToBuffer(stream);

                statusPayload = {
                    video: buffer,
                    caption
                };

                statusType = 'Video';
            } else if (caption) {
                statusPayload = { text: caption };
                statusType = 'Text';
            } else {
                return await reply(
                    '📣 *MEGA MD STATUS PUBLISHER*\n\n' +
                    '*Text status:*\n' +
                    '.poststatus Hello WhatsApp!\n\n' +
                    '*Photo status:*\n' +
                    'Reply to a photo with .poststatus My photo\n\n' +
                    '*Video status:*\n' +
                    'Reply to a video with .poststatus My video\n\n' +
                    '🔐 Owner and sudo only.'
                );
            }

            // Use contacts available in the current Baileys store.
            const statusJidList = getStatusRecipients(sock);

            if (statusJidList.length === 0) {
                return await reply(
                    '❌ No saved WhatsApp contacts were found. ' +
                    'Allow contact synchronization and try again.'
                );
            }

            // Publish to WhatsApp Status, not a group chat.
            await sock.sendMessage(
                STATUS_JID,
                statusPayload,
                { statusJidList }
            );

            return await reply(
                '✅ *WhatsApp Status Published*\n\n' +
                `📌 Type: ${statusType}\n` +
                `👥 Audience: ${statusJidList.length} saved contacts\n` +
                '🚀 MEGA MD completed the send request.'
            );
        } catch (error) {
            console.error(
                '[POSTSTATUS] Publish error:',
                error
            );

            return await reply(
                '❌ *Status publishing failed*\n\n' +
                `Reason: ${error?.message || 'Unknown error'}`
            );
        }
    }
};
