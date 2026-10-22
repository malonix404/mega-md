import yts from 'yt-search';
import axios from 'axios';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'qasim-dev';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const extractDownloadUrl = (data) => {
    if (typeof data === 'string') {
        const value = data.trim();

        // Some APIs return JSON as a string.
        try {
            return extractDownloadUrl(JSON.parse(value));
        } catch {
            return /^https?:\/\//i.test(value) ? value : null;
        }
    }

    if (!data || typeof data !== 'object') return null;

    // Support nested response formats used by download APIs.
    const candidates = [
        data.downloadUrl,
        data.download_url,
        data.download,
        data.dl_url,
        data.url,
        data.link,
        data.result,
        data.data,
        data.response,
        data.result?.downloadUrl,
        data.result?.download_url,
        data.result?.download,
        data.result?.url,
        data.result?.link,
        data.data?.downloadUrl,
        data.data?.download_url,
        data.data?.url,
        data.data?.link
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' &&
            /^https?:\/\//i.test(candidate.trim())) {
            return candidate.trim();
        }
    }

    return null;
};

const getErrorDetails = (error) => {
    const responseData = error?.response?.data;

    if (Buffer.isBuffer(responseData)) {
        return responseData.toString('utf8').slice(0, 1000);
    }

    if (typeof responseData === 'string') {
        return responseData.slice(0, 1000);
    }

    if (responseData) {
        try {
            return JSON.stringify(responseData).slice(0, 1000);
        } catch {}
    }

    return error?.message || String(error);
};

const downloadAudio = async (url, retries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 100 * 1024 * 1024,
                maxBodyLength: 100 * 1024 * 1024,
                maxRedirects: 10,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                },
                validateStatus: status => status >= 200 && status < 300
            });

            const buffer = Buffer.from(response.data);
            const contentType = String(
                response.headers['content-type'] || ''
            ).toLowerCase();

            if (!buffer.length) {
                throw new Error('Downloaded file is empty.');
            }

            // Do not send API error pages as music documents.
            if (
                contentType.includes('text/html') ||
                contentType.includes('application/json') ||
                buffer.subarray(0, 100).toString('utf8')
                    .trimStart()
                    .startsWith('<!DOCTYPE html')
            ) {
                throw new Error(
                    `Download URL returned ${contentType || 'non-audio content'}.`
                );
            }

            // Accept MP3 and other audio formats, plus octet-stream
            // when the API does not identify the content type.
            const isAudio =
                contentType.startsWith('audio/') ||
                contentType.includes('application/octet-stream') ||
                buffer.subarray(0, 4).toString() === 'ID3' ||
                buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xfb])) ||
                buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xf3])) ||
                buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xf2]));

            if (!isAudio) {
                throw new Error(
                    `Unexpected file type: ${contentType || 'unknown'}.`
                );
            }

            return buffer;
        } catch (error) {
            lastError = error;

            console.error(
                `[PLAY] Audio download attempt ${attempt}/${retries}:`,
                getErrorDetails(error)
            );

            if (attempt < retries) {
                await wait(attempt * 1500);
            }
        }
    }

    throw lastError || new Error('Audio download failed.');
};

export default {
    command: 'play',
    aliases: ['mp3doc', 'musicdoc'],
    category: 'download',
    description: 'Search and send a song as an audio document.',
    usage: '.play <song name>',

    ownerOnly: false,
    groupOnly: false,
    adminOnly: false,
    isPrefixless: true,
    cooldown: 5,

    async handler(sock, message, args, context = {}) {
        const chatId = context.chatId || message?.key?.remoteJid;
        const query = Array.isArray(args) ? args.join(' ').trim() : '';

        if (!chatId) {
            console.error('[PLAY] Missing chat ID.');
            return;
        }

        if (!query) {
            return sock.sendMessage(
                chatId,
                { text: 'Usage: .play Alan Walker Faded' },
                { quoted: message }
            );
        }

        try {
            console.log(`[PLAY] Searching: ${query}`);

            // 1. Search YouTube.
            const search = await yts(query);
            const video = search.videos?.find(
                item => item?.url && item?.title
            );

            if (!video) {
                return sock.sendMessage(
                    chatId,
                    { text: 'No matching song was found. Try another search.' },
                    { quoted: message }
                );
            }

            const videoUrl = new URL(video.url);

            if (
                !['youtube.com', 'www.youtube.com', 'm.youtube.com',
                  'youtu.be', 'www.youtu.be'].includes(videoUrl.hostname)
            ) {
                throw new Error('YouTube search returned an invalid URL.');
            }

            console.log(`[PLAY] Selected: ${video.title}`);

            // 2. Ask the download API for an audio URL.
            const apiResponse = await axios.get(DL_API, {
                params: {
                    url: video.url,
                    apikey: API_KEY,
                    key: API_KEY,
                    format: 'mp3'
                },
                timeout: 90000,
                maxRedirects: 5,
                headers: {
                    'Accept': 'application/json, audio/*, */*',
                    'User-Agent': 'Mozilla/5.0'
                },
                validateStatus: status => status >= 200 && status < 300
            });

            const data = apiResponse.data;

            console.log('[PLAY] API response type:', typeof data);

            const downloadUrl = extractDownloadUrl(data);

            if (!downloadUrl) {
                console.error(
                    '[PLAY] API did not return a usable URL:',
                    JSON.stringify(data).slice(0, 1500)
                );

                throw new Error(
                    data?.message ||
                    data?.error ||
                    'Download API returned no usable download URL.'
                );
            }

            console.log('[PLAY] Download URL received.');

            // 3. Download and validate the audio.
            const audioBuffer = await downloadAudio(downloadUrl);

            console.log(
                `[PLAY] Download complete: ${audioBuffer.length} bytes`
            );

            // 4. Send directly as a document with no caption or thumbnail.
            const safeTitle = video.title
                .replace(/[\\/:*?"<>|]/g, '_')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 140) || 'music';

            await sock.sendMessage(
                chatId,
                {
                    document: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`
                },
                {
                    quoted: message
                }
            );

            console.log(`[PLAY] Sent successfully: ${safeTitle}`);
        } catch (error) {
            console.error('[PLAY ERROR]', {
                message: error?.message,
                status: error?.response?.status,
                details: getErrorDetails(error)
            });

            try {
                await sock.sendMessage(
                    chatId,
                    {
                        text: 'Unable to download this song right now. Please try again later.'
                    },
                    {
                        quoted: message
                    }
                );
            } catch (sendError) {
                console.error(
                    '[PLAY] Failed to send error reply:',
                    sendError?.message
                );
            }
        }
    }
};