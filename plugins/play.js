import yts from 'yt-search';
import axios from 'axios';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'qasim-dev';

const downloadWithRetry = async (url, retries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const { data } = await axios.get(DL_API, {
                params: {
                    apiKey: API_KEY,
                    format: 'mp3',
                    url
                },
                timeout: 120000
            });

            const downloadUrl = data?.data?.downloadUrl;

            if (!downloadUrl) {
                throw new Error('Download API returned no download URL.');
            }

            return downloadUrl;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
    }

    throw lastError;
};

export default {
    command: 'play',
    aliases: ['mp3doc', 'musicdoc'],
    category: 'downloader',
    description: 'Search and send music directly as an audio document',
    usage: '.play <song name>',
    ownerOnly: false,
    groupOnly: false,
    adminOnly: false,
    isPrefixless: false,
    cooldown: 5,

    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(
                chatId,
                { text: 'Usage: .play Alan Walker Faded' },
                { quoted: message }
            );
        }

        try {
            // Search for the requested song.
            const search = await yts(query);
            const song = search.videos?.[0];

            if (!song) {
                return sock.sendMessage(
                    chatId,
                    { text: 'No matching song was found.' },
                    { quoted: message }
                );
            }

            // Obtain the MP3 download URL.
            const fileUrl = await downloadWithRetry(song.url);

            // Send directly as a document: no caption or thumbnail.
            const safeTitle = (song.title || query)
                .replace(/[\\/:*?"<>|]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 150) || 'music';

            await sock.sendMessage(chatId, {
                document: { url: fileUrl },
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`
            });

        } catch (error) {
            console.error('[PLAY ERROR]', error);

            await sock.sendMessage(
                chatId,
                {
                    text: 'Failed to download the song. Please try again later.'
                },
                { quoted: message }
            );
        }
    }
};