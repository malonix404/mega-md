import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export default {
    command: 'vcf',
    aliases: ['groupvcf', 'savecontacts'],
    category: 'tools',
    description: 'Export verified group phone contacts to VCF',
    usage: '.vcf',

    ownerOnly: false,
    groupOnly: true,
    adminOnly: false,
    isPrefixless: false,
    cooldown: 5,

    async handler(sock, message, args = [], context = {}) {
        const chatId = context.chatId || message?.key?.remoteJid;
        const channelInfo = context.channelInfo || {};

        if (!chatId || !message) return;

        const reply = async (text) =>
            sock.sendMessage(
                chatId,
                { text, ...channelInfo },
                { quoted: message }
            );

        if (!(context.isGroup ?? chatId.endsWith('@g.us'))) {
            return reply('❌ This command can only be used in groups.');
        }

        let filePath;

        try {
            const metadata = await sock.groupMetadata(chatId);
            const participants = metadata.participants || [];

            if (!participants.length) {
                return reply('❌ No group participants were found.');
            }

            await reply('⏳ Resolving real participant phone numbers...');

            const contacts = [];
            const seen = new Set();
            let skipped = 0;

            for (const participant of participants) {
                // Do not mistake a LID for a phone number.
                const id = participant.id || participant.jid || '';

                let phoneJid = '';

                // Already a phone-number JID.
                if (/^\d+@s\.whatsapp\.net$/.test(id)) {
                    phoneJid = id;
                } else {
                    // Resolve LID using Baileys' mapping, when available.
                    const mapping = sock.signalRepository?.lidMapping;

                    if (
                        id.endsWith('@lid') &&
                        typeof mapping?.getPNForLID === 'function'
                    ) {
                        try {
                            const resolved = await mapping.getPNForLID(id);

                            if (
                                typeof resolved === 'string' &&
                                /^\d+@s\.whatsapp\.net$/.test(resolved)
                            ) {
                                phoneJid = resolved;
                            }
                        } catch (error) {
                            console.warn(
                                '[VCF] Could not resolve participant LID:',
                                id
                            );
                        }
                    }
                }

                if (!phoneJid) {
                    skipped++;
                    continue;
                }

                const number = phoneJid.split('@')[0];

                if (seen.has(number)) continue;
                seen.add(number);

                const name = `WhatsApp Contact ${contacts.length + 1}`;

                contacts.push([
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    `FN:${name}`,
                    `TEL;TYPE=CELL;waid=${number}:+${number}`,
                    'END:VCARD'
                ].join('\r\n'));
            }

            if (!contacts.length) {
                return reply(
                    '❌ No verified phone numbers were available.\n\n' +
                    'Baileys may only have LIDs for these participants. ' +
                    'The command skipped them rather than exporting incorrect numbers.'
                );
            }

            const tempDir = path.resolve('./temp');
            await fs.mkdir(tempDir, { recursive: true });

            filePath = path.join(
                tempDir,
                `vcf-${randomUUID()}.vcf`
            );

            await fs.writeFile(
                filePath,
                contacts.join('\r\n') + '\r\n',
                'utf8'
            );

            await sock.sendMessage(
                chatId,
                {
                    document: await fs.readFile(filePath),
                    mimetype: 'text/vcard',
                    fileName: 'MEGA-MD-Group-Contacts.vcf',
                    caption:
                        '📇 *MEGA MD — GROUP CONTACTS*\n\n' +
                        `👥 Group: ${metadata.subject || 'WhatsApp Group'}\n` +
                        `✅ Verified contacts: ${contacts.length}\n` +
                        `⏭️ Unresolved participants skipped: ${skipped}\n\n` +
                        'Import the file into your contacts app.'
                },
                { quoted: message }
            );

        } catch (error) {
            console.error('[VCF] Export failed:', error);

            await reply(
                '❌ Failed to generate the VCF file. Please try again.'
            ).catch(() => {});

        } finally {
            if (filePath) {
                await fs.unlink(filePath).catch(() => {});
            }
        }
    }
};