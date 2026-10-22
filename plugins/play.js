
import yts from 'yt-search';
import axios from 'axios';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'qasim-dev';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const downloadWithRetry = async (url, retries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 100 * 1024 * 1024,
                maxBodyLength: 100 * 1024 * 1024,
                validateStatus: status => status >= 200 && status < 300
            });

            return Buffer.from(response.data);
        } catch (error) {
            lastError = error;

            if (attempt < retries) {
                await wait(attempt * 1500);
            }
        }
    }

    throw lastError || new Error('Download failed after retries.');
};

export default {
    command: 'play',
    aliases: ['mp3doc', 'musicdoc'],
    category: 'download',
    description: 'Search for a song and send it as an audio document.',
    usage: '.play <song name>',

    ownerOnly: false,
    groupOnly: false,
    adminOnly: false,
    isPrefixless: false,
    cooldown: 10,

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
            // Search YouTube
            const search = await yts(query);
            const video = search.videos?.[0];

            if (!video) {
                return sock.sendMessage(
                    chatId,
                    { text: 'No matching song was found. Try another search.' },
                    { quoted: message }
                );
            }

            if (!video.url || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(video.url)) {
                throw new Error('Invalid video URL returned by search.');
            }

            // Request the audio download from the API
            const apiResponse = await axios.get(DL_API, {
                params: {
                    url: video.url,
                    apikey: API_KEY,
                    key: API_KEY,
                    format: 'mp3'
                },
                timeout: 60000,
                validateStatus: status => status >= 200 && status < 300
            });

            const data = apiResponse.data;

            // Support common API response structures
            const downloadUrl =
                typeof data === 'string'
                    ? data
                    : data?.result?.downloadUrl ||
                      data?.result?.download_url ||
                      data?.result?.url ||
                      data?.downloadUrl ||
                      data?.download_url ||
                      data?.url ||
                      data?.link;

            if (!downloadUrl || typeof downloadUrl !== 'string') {
                throw new Error(
                    data?.message || 'The download API did not return a download URL.'
                );
            }

            if (!/^https?:\/\//i.test(downloadUrl)) {
                throw new Error('The API returned an invalid download URL.');
            }

            // Download the actual audio file
            const audioBuffer = await downloadWithRetry(downloadUrl);

            if (!audioBuffer.length) {
                throw new Error('The downloaded audio file is empty.');
            }

            // Send directly as a document: no caption and no thumbnail
            await sock.sendMessage(chatId, {
                document: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${video.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 150)}.mp3`
            }, {
                quoted: message
            });

        } catch (error) {
            console.error('[PLAY ERROR]', error?.response?.data || error.message);

            await sock.sendMessage(
                chatId,
                {
                    text: 'Unable to download this song right now. Please try again later.'
                },
                {
                    quoted: message
                }
            );
        }
    }
};
