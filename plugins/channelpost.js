export default {
    command: 'channelpost',
    aliases: ['cpost', 'chpost'],
    category: 'owner',
    description: 'Post a text message to a WhatsApp Channel',
    usage: '.channelpost <message>',
    ownerOnly: true,
    isPrefixless: true,

    async handler(sock, message, args, context) {
        const chatId =
            context.chatId || message.key.remoteJid;

        const channelInfo = context.channelInfo || {};
        const senderIsOwnerOrSudo =
            context.senderIsOwnerOrSudo || message.key.fromMe;

        if (!senderIsOwnerOrSudo) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only the bot owner or sudo can use this command.',
                ...channelInfo
            }, { quoted: message });
        }

        const text = args.join(' ').trim();

        if (!text) {
            return await sock.sendMessage(chatId, {
                text:
                    '📢 *MEGA MD CHANNEL PUBLISHER*\n\n' +
                    '*Usage:* .channelpost <message>\n\n' +
                    '*Example:*\n' +
                    '.channelpost Welcome to MEGA MD! 🔥',
                ...channelInfo
            }, { quoted: message });
        }

        // Set your actual WhatsApp Channel JID here.
        const channelJid = context.config?.channelJid;

        if (
            !channelJid ||
            !channelJid.endsWith('@newsletter')
        ) {
            return await sock.sendMessage(chatId, {
                text:
                    '❌ Channel not configured.\n\n' +
                    'Add your Channel JID to config.js as channelJid.',
                ...channelInfo
            }, { quoted: message });
        }

        if (typeof sock.newsletterSendMessage !== 'function') {
            return await sock.sendMessage(chatId, {
                text:
                    '❌ Your Baileys version does not expose ' +
                    'newsletterSendMessage(). Check API compatibility.',
                ...channelInfo
            }, { quoted: message });
        }

        try {
            await sock.newsletterSendMessage(
                channelJid,
                { text },
                'text'
            );

            return await sock.sendMessage(chatId, {
                text:
                    '✅ *MEGA MD CHANNEL POST SENT!*\n\n' +
                    `📝 ${text}`,
                ...channelInfo
            }, { quoted: message });

        } catch (error) {
            console.error('[CHANNELPOST] Error:', error);

            return await sock.sendMessage(chatId, {
                text:
                    '❌ Failed to publish the channel post.\n' +
                    'Check the Channel JID, account permissions, ' +
                    'and your Baileys version.',
                ...channelInfo
            }, { quoted: message });
        }
    }
};
