export default {
    command: 'creator',
    aliases: ['botcreator', 'owner', 'botowner'],
    category: 'general',
    description: 'Get the contact of the bot owner',
    usage: '.creator',
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const config = context.config;
        try {
            const vcard = `
BEGIN:VCARD
VERSION:3.0
N:;Malone;;;
FN:Dev Malone
ORG:DevMalone Inc
TITLE:Owner
item1.TEL;waid=263779778079:+263779778079
item1.X-ABLabel:Owner
X-WA-BIZ-DESCRIPTION:Yo here's my contact
X-WA-BIZ-NAME:Dev Malone
END:VCARD
      `.trim();
            await sock.sendMessage(chatId, {
                contacts: { displayName: config.botOwner, contacts: [{ vcard }] },
            }, { quoted: message });
        }
        catch (error) {
            console.error('Creator Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to fetch owner contact.'
            }, { quoted: message });
        }
    }
};