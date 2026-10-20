
export default {
    command: 'groupvcf',
    aliases: ['exportcontacts', 'vcf'],
    category: 'owner',
    description: 'Export group contacts to a VCF file',
    usage: '.groupvcf',

    ownerOnly: true,
    groupOnly: true,
    adminOnly: false,
    isPrefixless: false,
    cooldown: 10,

    async handler(sock, message, args, context = {}) {
        const {
            chatId,
            senderId,
            isGroup,
            senderIsOwnerOrSudo,
            config,
            channelInfo
        } = context;

        // Normalize a phone number or WhatsApp phone JID.
        const getNumber = (value) => {
            if (typeof value !== 'string' &&
                typeof value !== 'number') return '';

            const str = String(value);
            if (str.includes('@') &&
                !str.endsWith('@s.whatsapp.net') &&
                !str.endsWith('@c.us')) return '';

            const number = str.split('@')[0].replace(/\D/g, '');
            return number.length >= 7 && number.length <= 15
                ? number
                : '';
        };

        // Resolve configured bot owners. Adjust these keys if
        // your config uses a different owner-number property.
        const ownerValues = [
            config?.ownerNumber,
            config?.ownerNumbers,
            config?.owners,
            config?.owner
        ].flat(Infinity);

        const ownerNumbers = new Set();

        for (const item of ownerValues) {
            const value =
                typeof item === 'object' && item !== null
                    ? item.number ?? item.id ?? item.phone
                    : item;

            const number = getNumber(value);
            if (number) ownerNumbers.add(number);
        }

        const senderNumber = getNumber(senderId);

        // Strict owner check: sudo status alone is not sufficient.
        if (
            !senderNumber ||
            ownerNumbers.size === 0 ||
            !ownerNumbers.has(senderNumber)
        ) {
            return sock.sendMessage(chatId, {
                text: ownerNumbers.size === 0
                    ? '❌ Owner number is not configured. Check your config owner-number setting.'
                    : '⛔ Only the bot owner can use this command.',
                ...channelInfo
            }, { quoted: message });
        }

        if (!isGroup || !chatId?.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: '⚠️ Use this command inside the group you want to export.',
                ...channelInfo
            }, { quoted: message });
        }

        try {
            const metadata = await sock.groupMetadata(chatId);
            const contacts = new Map();

            for (const participant of metadata.participants ?? []) {
                const number = getNumber(
                    participant.phoneNumber ?? participant.id
                );

                if (!number || contacts.has(number)) continue;

                contacts.set(number, `Group Contact ${contacts.size + 1}`);
            }

            if (contacts.size === 0) {
                return sock.sendMessage(chatId, {
                    text: '⚠️ No exportable phone-number contacts were found.',
                    ...channelInfo
                }, { quoted: message });
            }

            const escapeVCard = (value) => String(value)
                .replace(/\\/g, '\\\\')
                .replace(/\r?\n/g, '\\n')
                .replace(/,/g, '\\,')
                .replace(/;/g, '\\;');

            const cards = [];

            for (const [number, name] of contacts) {
                cards.push([
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    `FN:${escapeVCard(name)}`,
                    `N:${escapeVCard(name)};;;;`,
                    `TEL;TYPE=CELL;TYPE=VOICE;waid=${number}:${number}`,
                    'END:VCARD'
                ].join('\r\n'));
            }

            const vcf = Buffer.from(
                cards.join('\r\n') + '\r\n',
                'utf8'
            );

            const safeName = (metadata.subject || 'group')
                .replace(/[^\w-]+/g, '_')
                .slice(0, 40);

            // Send the contact file privately to the owner.
            await sock.sendMessage(senderId, {
                document: vcf,
                mimetype: 'text/vcard',
                fileName: `${safeName}_contacts.vcf`,
                caption:
                    `✅ *MEGA MD — Contact Export*\n\n` +
                    `Group: ${metadata.subject || 'Unnamed group'}\n` +
                    `Unique contacts: ${contacts.size}`,
                ...channelInfo
            });

            // Confirm in the group without posting the contacts.
            return sock.sendMessage(chatId, {
                text: `✅ VCF export sent privately to the owner.\nContacts: ${contacts.size}`,
                ...channelInfo
            }, { quoted: message });

        } catch (error) {
            console.error('[groupvcf] Export failed:', error);

            return sock.sendMessage(chatId, {
                text: '❌ Failed to export contacts. Check the Termux logs.',
                ...channelInfo
            }, { quoted: message });
        }
    }
};
