import fs from 'fs/promises';
import path from 'path';

export default {
    command: 'vcf',
    aliases: ['groupvcf', 'savecontacts'],
    category: 'tools',
    description: 'Export group participants as a VCF contacts file',
    usage: '.vcf',

    ownerOnly: false,
    groupOnly: true,
    adminOnly: false,
    isPrefixless: true,
    cooldown: 5,

    async handler(sock, message, args = [], context = {}) {
        const chatId = context.chatId || message?.key?.remoteJid;
        const channelInfo = context.channelInfo || {};

        const reply = async (text) => {
            return sock.sendMessage(
                chatId,
                { text, ...channelInfo },
                { quoted: message }
            );
        };

        if (!chatId || !message) return;

        // Group-only check; no owner or admin restriction.
        const isGroup =
            context.isGroup ??
            chatId.endsWith('@g.us');

        if (!isGroup) {
            return reply(
                '❌ *GROUP ONLY*\n\n' +
                'Use this command inside a WhatsApp group.'
            );
        }

        let filePath;

        try {
            await reply(
                '⏳ *MEGA MD VCF EXPORTER*\n\n' +
                'Collecting group participants and preparing contacts...'
            );

            const metadata = await sock.groupMetadata(chatId);
            const participants = metadata.participants || [];

            if (participants.length === 0) {
                return reply('❌ No group participants were found.');
            }

            const cards = participants
                .map((participant, index) => {
                    // Support common Baileys participant JID properties.
                    const jid =
                        participant.id ||
                        participant.jid ||
                        participant.lid;

                    if (!jid) return null;

                    const number = jid.split('@')[0];

                    // Escape special characters in vCard text values.
                    const name = `Group Contact ${index + 1} +${number}`
                        .replace(/\\/g, '\\\\')
                        .replace(/\n/g, '\\n')
                        .replace(/,/g, '\\,')
                        .replace(/;/g, '\\;');

                    return [
                        'BEGIN:VCARD',
                        'VERSION:3.0',
                        `FN:${name}`,
                        `TEL;TYPE=CELL;waid=${number}:+${number}`,
                        'END:VCARD'
                    ].join('\r\n');
                })
                .filter(Boolean);

            if (cards.length === 0) {
                return reply('❌ No usable participant contacts were found.');
            }

            // Unique filename prevents simultaneous requests overwriting files.
            const tempDir = path.resolve('./temp');
            await fs.mkdir(tempDir, { recursive: true });

            filePath = path.join(
                tempDir,
                `group-contacts-${Date.now()}-${Math.random()
                    .toString(36).slice(2, 8)}.vcf`
            );

            await fs.writeFile(
                filePath,
                cards.join('\r\n') + '\r\n',
                'utf8'
            );

            await sock.sendMessage(
                chatId,
                {
                    document: await fs.readFile(filePath),
                    mimetype: 'text/vcard',
                    fileName: 'MEGA-MD-Group-Contacts.vcf',
                    caption:
                        '📇 *MEGA MD CONTACT EXPORT*\n\n' +
                        `👥 Group: ${metadata.subject || 'WhatsApp Group'}\n` +
                        `📱 Contacts: ${cards.length}\n\n` +
                        'Import the VCF file into your contacts app.'
                },
                {
                    quoted: message,
                    ...(typeof metadata.ephemeralDuration === 'number'
                        ? { ephemeralExpiration: metadata.ephemeralDuration }
                        : {})
                }
            );

            console.log(
                `[VCF] Exported ${cards.length} contacts for ${chatId}`
            );

        } catch (error) {
            console.error('[VCF] Export failed:', error);

            await reply(
                '❌ *VCF EXPORT FAILED*\n\n' +
                'Could not generate or send the contacts file. ' +
                'Please try again later.'
            ).catch(() => {});

        } finally {
            if (filePath) {
                await fs.unlink(filePath).catch(() => {});
            }
        }
    }
};