export default {
    command: 'groupvcf',
    aliases: ['gvcf', 'vcf', 'groupcontacts'],
    category: 'group',
    description: 'Export group participants as a VCF contact file',
    usage: '.groupvcf',
    ownerOnly: true,
    groupOnly: true,
    isPrefixless: true,
    cooldown: 10,

    async handler(sock, message, args, context = {}) {
        const chatId = context.chatId || message.key?.remoteJid;
        const channelInfo = context.channelInfo || {};

        if (!chatId || !chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: '❌ Use this command inside a WhatsApp group.',
                ...channelInfo
            }, { quoted: message });
        }

        try {
            const metadata = await sock.groupMetadata(chatId);
            const participants = metadata.participants || [];

            if (!participants.length) {
                return sock.sendMessage(chatId, {
                    text: '❌ No group participants found.',
                    ...channelInfo
                }, { quoted: message });
            }

            const escapeVcf = value =>
                String(value || 'Unknown')
                    .replace(/\\/g, '\\\\')
                    .replace(/\n/g, '\\n')
                    .replace(/,/g, '\\,')
                    .replace(/;/g, '\\;');

            const contacts = participants
                .map(participant => {
                    const jid = participant.id || participant.jid;
                    if (!jid || !jid.endsWith('@s.whatsapp.net')) {
                        return null;
                    }

                    const number = jid.split('@')[0].split(':')[0];
                    if (!/^\d+$/.test(number)) return null;

                    return [
                        'BEGIN:VCARD',
                        'VERSION:3.0',
                        `FN:${escapeVcf(number)}`,
                        `TEL;TYPE=CELL:+${number}`,
                        'END:VCARD'
                    ].join('\r\n');
                })
                .filter(Boolean);

            if (!contacts.length) {
                return sock.sendMessage(chatId, {
                    text: '❌ No exportable phone contacts were found.',
                    ...channelInfo
                }, { quoted: message });
            }

            const vcf = Buffer.from(contacts.join('\r\n') + '\r\n', 'utf8');

            await sock.sendMessage(chatId, {
                document: vcf,
                mimetype: 'text/vcard',
                fileName: 'MEGA-MD-Group-Contacts.vcf',
                caption: `✅ Exported ${contacts.length} group contacts.`,
                ...channelInfo
            }, { quoted: message });

        } catch (error) {
            console.error('[groupvcf] Error:', error);

            await sock.sendMessage(chatId, {
                text: '❌ Failed to export contacts. Check the bot logs and try again.',
                ...channelInfo
            }, { quoted: message });
        }
    }
};