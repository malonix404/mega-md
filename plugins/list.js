import config from '../config.js';
/*****************************************************************************
 *                                                                           *
 *                     Developed By Dev Malone                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/malonix404                         *
 *  🚀 Telegram Group: https://t.me/viralxgc                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb8QhvR6xCSJ6dLVwL0Z     *
 *                                                                           *
 *    © 2026 DevMalone Inc. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/
import commandHandler from '../lib/commandHandler.js';
import path from 'path';
import fs from 'fs';
function formatTime() {
    const now = new Date();
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: config.timeZone || 'UTC'
    };
    return now.toLocaleTimeString('en-US', options);
}
const menuStyles = [
    {
        render({ _title, info, categories, prefix }) {
            let t = `╭━━『 *MEGA MENU* 』━━⬣\n`;
            t += `┃ ✨ *Bot:* ${info.bot}\n`;
            t += `┃ 🔧 *Prefix:* ${info.prefix}\n`;
            t += `┃ 📦 *Plugin:* ${info.total}\n`;
            t += `┃ 💎 *Version:* ${info.version}\n`;
            t += `┃ 📡 *Status:* Online\n`;
            t += `┃ ☘️ *Location:* ${info.timezone}\n`;
            t += `┃ ⏰ *Time:* ${info.time}\n`;
            t += `╰━━━━━━━⬣\n`;
            for (const [cat, cmds] of categories) {
                t += `\n━━━『 *${cat.toUpperCase()}* 』━━━\n\n`;
                for (const c of cmds)
                    t += `᯽︎ ${prefix}${c}\n`;
            }
            t += `╰━━━━━━━━━━━━━⬣`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `╭─❍「 *MEGA MENU* 」❍\n`;
            t += `├• 🌟 *Bot:* ${info.bot}\n`;
            t += `├• ⚙️ *Prefix:* ${info.prefix}\n`;
            t += `├• 🍫 *Plugins:* ${info.total}\n`;
            t += `├• 🐺 *Status:* Online\n`;
            t += `├• 💎 *Version:* ${info.version}\n`;
            t += `├• 🚀 *Location:* ${info.timezone}\n`;
            t += `├• ⏰ *Time:* ${info.time}\n`;
            t += `╰──────❍\n`;
            for (const [cat, cmds] of categories) {
                t += `\n──❍「 *${cat.toUpperCase()}* 」❍──\n\n`;
                for (const c of cmds)
                    t += `├• ◈ ${prefix}${c}\n`;
            }
            t += `◈╰──★──☆──♪♪──❍`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `╭━━━━『 *MEGA MENU* 』━━━━\n`;
            t += `┃❍ *Bot :* ${info.bot}\n`;
            t += `┃❍ *Prefixes:* ${info.prefix}\n`;
            t += `┃❍ *Plugins:* ${info.total}\n`;
            t += `┃❍ *Status:* Active\n`;
            t += `┃❍ *Owner:* Malone\n`;
            t += `┃❍ *Version:* ${info.version}\n`;
            t += `┃❍ *Location:* ${info.timezone}\n`;
            t += `┃❍ *Time:* ${info.time}\n`;
            t += `╰━━━━━━♡⃝🦋\n`;
            for (const [cat, cmds] of categories) {
                t += `\n◈════〔 *${cat.toUpperCase()}* 〕════◈\n\n`;
                for (const c of cmds)
                    t += `✧ ${prefix}${c}\n`;
            }
            t += `╰━━━━━━━━━━━━━━━⬣`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `┏━━▣ ◈ *MEGA MENU* ◈\n`;
            t += `┣❍ *Bot:* ${info.bot}\n`;
            t += `┣❍ *Prefixes:* ${info.prefix}\n`;
            t += `┣❍ *Plugins:* ${info.total}\n`;
            t += `┣❍ *Version:* ${info.version}\n`;
            t += `┣❍ *Creator:* Malone\n`;
            t += `┣❍ *Location:* ${info.timezone}\n`;
            t += `┣❍ *Time:* ${info.time}\n`;
            t += `┗━▣\n`;
            for (const [cat, cmds] of categories) {
                t += `\n━━❍「 *${cat.toUpperCase()}* 」❍━━\n\n`;
                for (const c of cmds)
                    t += `┃𖥟╾ ${prefix}${c}\n`;
            }
            t += `┗━━━━━━━━━━━━━━━❍`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `┏━❐ *MEGA MENU* ❐━━━\n`;
            t += `┣❐ *ʙᴏᴛ:* ${info.bot}\n`;
            t += `┣❐ *ᴘʀᴇғɪxᴇs:* ${info.prefix}\n`;
            t += `┣❐ *ᴘʟᴜɢɪɴs:* ${info.total}\n`;
            t += `┣❐ *ᴠᴇʀsɪᴏɴ:* ${info.version}\n`;
            t += `┣❐ *ᴏᴡɴᴇʀ:* Malone\n`;
            t += `┣❐ *ʟᴏᴄᴀᴛɪᴏɴ:* ${info.timezone}\n`;
            t += `┣❐ *ᴛɪᴍᴇ:* ${info.time}\n`;
            t += `┗━❐\n\n`;
            for (const [cat, cmds] of categories) {
                t += `\n━━❍「 *${cat.toUpperCase()}* 」❍━━\n\n`;
                for (const c of cmds)
                    t += `┃𖥟╾ ${prefix}${c}\n`;
            }
            t += `┗━━━━━━━━━━━━━━━❍`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `╭──❏ *MEGA MENU* ❏──\n`;
            t += `┃ 📱 *Bot:* ${info.bot}\n`;
            t += `┃ ℹ️ *Prefixes:* ${info.prefix}\n`;
            t += `┃ 📊 *Plugins:* ${info.total}\n`;
            t += `┃ 🔖 *Version:* ${info.version}\n`;
            t += `┃ 🚀 *Status:* Active\n`;
            t += `┃ 🐿️ *Location:* ${info.timezone}\n`;
            t += `┃ ⏰ *Time:* ${info.time}\n`;
            t += `╰─❏\n`;
            for (const [cat, cmds] of categories) {
                t += `\n━━━〘 *${cat.toUpperCase()}* 〙━━━\n\n`;
                for (const c of cmds)
                    t += `➽ ${prefix}${c}\n`;
            }
            t += `╰━━━━━━━━━━━━━━❏`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `┏━━━『 *MEGA MENU* 』━━⊚\n`;
            t += `┣⊚ *Bot:* ${info.bot}\n`;
            t += `┣⊚ *Prefixes:* ${info.prefix}\n`;
            t += `┣⊚ *Plugins:* ${info.total}\n`;
            t += `┣⊚ *Version:* ${info.version}\n`;
            t += `┣⊚ *Status:* Online\n`;
            t += `┣⊚ *Location:* ${info.timezone}\n`;
            t += `┣⊚ *Time:* ${info.time}\n`;
            t += `┗━━━⊚\n`;
            for (const [cat, cmds] of categories) {
                t += `\n───⬣ *${cat.toUpperCase()}* ⬣──\n\n`;
                for (const c of cmds)
                    t += `> ツ ${prefix}${c}\n`;
            }
            t += `┗━━━━━━━━━━━━━⊚`;
            return t;
        }
    }
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export default {
    command: 'menu',
    aliases: ['help', 'commands', 'mega', 'list'],
    category: 'general',
    description: 'Show all commands',
    usage: '.menu [command]',
    isPrefixless: true,
    
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const prefix = config.prefixes[0];
        const imagePath = path.join(process.cwd(), 'assets/thumb.png');
        if (args.length) {
            const searchTerm = args[0].toLowerCase();
            let cmd = commandHandler.commands.get(searchTerm);
            if (!cmd && commandHandler.aliases.has(searchTerm)) {
                const mainCommand = commandHandler.aliases.get(searchTerm);
                cmd = commandHandler.commands.get(mainCommand);
            }
            if (!cmd) {
                return sock.sendMessage(chatId, {
                    text: `❌ Command "${args[0]}" not found.\n\nUse ${prefix}menu to see all commands.`,
                    ...channelInfo
                }, { quoted: message });
            }
            const text = `╭━━━━━━━━━━━━━━⬣
┃ 📌 *COMMAND INFO*
┃
┃ ⚡ *Command:* ${prefix}${cmd.command}
┃ 📝 *Desc:* ${cmd.description || 'No description'}
┃ 📖 *Usage:* ${cmd.usage || `${prefix}${cmd.command}`}
┃ 🏷️ *Category:* ${cmd.category || 'misc'}
┃ 🔖 *Aliases:* ${cmd.aliases?.length ? cmd.aliases.map((a) => prefix + a).join(', ') : 'None'}
┃
╰━━━━━━━━━━━━━━⬣`;
            if (fs.existsSync(imagePath)) {
                return sock.sendMessage(chatId, {
                    image: { url: imagePath },
                    caption: text,
                    ...channelInfo
                }, { quoted: message });
            }
            return sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
        const style = pick(menuStyles);
        const text = style.render({
            title: config.botName,
            prefix,
            info: {
                bot: config.botName,
                prefix: config.prefixes.join(', '),
                total: commandHandler.commands.size,
                version: config.version || "6.0.0",
                timezone: config.timezone || "Africa/Harare",
                time: formatTime()
            },
            categories: commandHandler.categories
        });
        if (fs.existsSync(imagePath)) {
            await sock.sendMessage(chatId, {
                image: { url: imagePath },
                caption: text,
                ...channelInfo
            }, { quoted: message });
        }
        else {
            await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
    }
};
/*****************************************************************************
 *                                                                           *
 *                     Developed By Dev Malone                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/malonix404                         *
 *  🚀 Telegram Group: https://t.me/viralxgc                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb8QhvR6xCSJ6dLVwL0Z     *
 *                                                                           *
 *    © 2026 DevMalone Inc. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/