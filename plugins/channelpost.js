
export default {
    command: 'channelpost',
    aliases: ['cpost', 'chpost'],
    category: 'tools',
    description: 'Post a text update to a WhatsApp Channel',
    usage: '.channelpost <message>',
    ownerOnly: true,
    groupOnly: false,
    adminOnly: false,
    isPrefixless: false,
    cooldown: 10,

    async handler(sock, message, args, context) {
        const { chatId, senderIsOwnerOrSudo } = context;

        // Keep channel publishing restricted to the bot owner/sudo.
        if (!senderIsOwnerOrSudo) {
            return sock.sendMessage(chatId, {
                text: '❌ Only the bot owner or sudo can publish channel posts.'
            }, { quoted: message });
        }

        const text = args.join(' ').trim();

        if (!text) {
            return sock.sendMessage(chatId, {
                text: '📢 *MEGA MD CHANNEL POST*\n\n' +
                      'Usage: .channelpost Your message here\n\n' +
                      'Example: .channelpost Welcome to MEGA MD!'
            }, { quoted: message });
        }

        // Set this in config.js to your Channel JID.
        const channelJid = context.config?.channelJid;

        if (!channelJid || !channelJid.endsWith('@newsletter')) {
            return sock.sendMessage(chatId, {
                text: '⚠️ Configure config.channelJid with your WhatsApp Channel JID first.'
            }, { quoted: message });
        }

        try {
            if (typeof sock.newsletterSendMessage !== 'function') {
                return sock.sendMessage(chatId, {
                    text: '❌ Your installed Baileys version does not expose newsletterSendMessage(). Check its version/API.'
                }, { quoted: message });
            }

            await sock.newsletterSendMessage(
                channelJid,
                { text },
                'text'
            );

            return sock.sendMessage(chatId, {
                text: '✅ *MEGA MD CHANNEL POST SENT!*\n\n' +
                      text
            }, { quoted: message });

        } catch (error) {
            console.error('[CHANNEL POST ERROR]', error);

            return sock.sendMessage(chatId, {
                text: '❌ Failed to publish the channel post.\n' +
                      'Check the Channel JID, permissions, and Baileys compatibility.'
            }, { quoted: message });
        }
    }
};
