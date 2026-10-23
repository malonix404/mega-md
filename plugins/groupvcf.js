
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
    isPrefixless: true,
    cooldown: 5,

    async handler(sock, message, args = [], context = {}) {
        const chatId = context.chatId || message?.key?.remoteJid;
        const channelInfo = context.channelInfo || {};

        if (!chatId || !message) return;

        const reply = (text) =>
            sock.sendMessage(
                chatId,
                { text, ...channelInfo },
                { quoted: message }
            );

        if (!(context.isGroup ?? chatId.endsWith('@g.us'))) {
            return reply('❌ This command only works in groups.');
        }

        let filePath;

        try {
            const metadata = await sock.groupMetadata(chatId);
            const participants = metadata.participants || [];

            if (!participants.length) {
                return reply('❌ No group participants were found.');
            }

            const mapping = sock.signalRepository?.lidMapping;
            const contacts = [];
            const seen = new Set();
            let skipped = 0;

            for (const participant of participants) {
                const id = participant.id || participant.jid || '';
                const possibleJids = [
                    participant.phoneNumber,
                    participant.phone_number,
                    participant.pn,
                    participant.id,
                    participant.jid
                ];

                let phoneJid = possibleJids.find(
                    (jid) =>
                        typeof jid === 'string' &&
                        /^\d+@s\.whatsapp\.net$/.test(jid)
                );

                // Resolve a LID only through Baileys' mapping API.
                if (!phoneJid && id.endsWith('@lid')) {
                    try {
                        if (typeof mapping?.getPNForLID === 'function') {
                            const resolved = await mapping.getPNForLID(id);

                            if (
                                typeof resolved === 'string' &&
                                /^\d+@s\.whatsapp\.net$/.test(resolved)
                            ) {
                                phoneJid = resolved;
                            }
                        }
                    } catch (error) {
                        console.warn(
                            '[VCF] LID resolution failed:',
                            error?.message || error
                        );
                    }
                }

                if (!phoneJid) {
                    skipped++;
                    continue;
                }

                const number = phoneJid.split('@')[0];

                if (seen.has(number)) continue;
                seen.add(number);

                // Use the participant's WhatsApp push name if available.
                const displayName = String(
                    participant.name ||
                    participant.notify ||
                    participant.verifiedName ||
                    `WhatsApp Contact ${contacts.length + 1}`
                ).replace(/[\r\n]/g, ' ').replace(/[,;]/g, ' ');

                contacts.push([
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    `FN:${displayName}`,
                    `TEL;TYPE=CELL;waid=${number}:+${number}`,
                    'END:VCARD'
                ].join('\r\n'));
            }

            if (!contacts.length) {
                console.warn('[VCF] No phone JIDs resolved.', {
                    participantCount: participants.length,
                    sample: participants.slice(0, 3).map(p => ({
                        id: p.id,
                        phoneNumber: p.phoneNumber,
                        lid: p.lid
                    })),
                    hasLidMapping: Boolean(mapping),
                    hasGetPNForLID:
                        typeof mapping?.getPNForLID === 'function'
                });

                return reply(
                    '❌ Baileys did not provide any verified phone numbers ' +
                    'for this group. Check the MEGA MD console for the [VCF] ' +
                    'diagnostic output. No fake numbers were exported.'
                );
            }

            const tempDir = path.resolve('./temp');
            await fs.mkdir(tempDir, { recursive: true });
            filePath = path.join(tempDir, `vcf-${randomUUID()}.vcf`);

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
                        `⏭️ Unresolved participants: ${skipped}`
                },
                { quoted: message }
            );
        } catch (error) {
            console.error('[VCF] Export failed:', error);
            await reply(
                '❌ Failed to export contacts: ' +
                String(error?.message || 'Unknown error').slice(0, 200)
            ).catch(() => {});
        } finally {
            if (filePath) {
                await fs.unlink(filePath).catch(() => {});
            }
        }
    }
};
