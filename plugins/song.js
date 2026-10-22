import axios from 'axios';
import yts from 'yt-search';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'xbps-install-Syu';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(DL_API, {
                params: {
                    apiKey: API_KEY,
                    format: 'mp3',
                    url
                },
                timeout: 120000
            });

            if (data?.data?.downloadUrl) {
                return data.data;
            }

            throw new Error('No download URL returned by API');
        } catch (err) {
            if (i === retries - 1) throw err;

            console.log(
                `Download attempt ${i + 1} failed. Retrying in 5 seconds...`
            );

            await wait(5000);
        }
    }

    throw new Error('All download attempts failed');
};

export default {
    command: 'song',
    aliases: ['music', 'audio', 'mp3'],
    category: 'music',
    description: 'Download songs from YouTube as MP3',
    usage: '.song <song name | YouTube link>',

    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(
                chatId,
                {
                    text:
                        '🎵 *MEGA MUSIC DOWNLOADER*\n\n' +
                        'Download your favorite songs as MP3.\n\n' +
                        '*Usage:* .song <song name or YouTube link>',
                    footer: 'Powered by MEGA MD',
                    templateButtons: [
                        {
                            index: 1,
                            urlButton: {
                                displayText: 'Search YouTube',
                                url: 'https://www.youtube.com/'
                            }
                        }
                    ]
                },
                { quoted: message }
            );
        }

        try {
            let video;

            if (/youtube\.com|youtu\.be/i.test(query)) {
                video = { url: query };
            } else {
                const { videos } = await yts(query);

                if (!videos?.length) {
                    return sock.sendMessage(
                        chatId,
                        { text: '❌ No YouTube results found.' },
                        { quoted: message }
                    );
                }

                video = videos[0];
            }

            const videoUrl = video.url;

            if (!videoUrl) {
                throw new Error('Could not determine the YouTube URL');
            }

            // Search results have metadata; direct links may not.
            let details = video;

            if (!video.title || !video.thumbnail) {
                try {
                    const result = await yts(videoUrl);
                    if (result?.videos?.length) {
                        details = result.videos[0];
                    }
                } catch {
                    // Continue with the supplied URL if lookup fails.
                }
            }

            const title = details.title || video.title || query;
            const thumbnail = details.thumbnail || video.thumbnail;
            const views = details.views ?? video.views ?? 'Unknown';
            const duration = details.timestamp || video.timestamp || 'Unknown';
            const uploaded = details.ago || video.ago || 'Unknown';

            const caption =
                '╭━━━〔 *MEGA MUSIC* 〕━━━╮\n\n' +
                `🎵 *Title:* ${title}\n` +
                `👁️ *Views:* ${views}\n` +
                `⏱️ *Duration:* ${duration}\n` +
                `📅 *Uploaded:* ${uploaded}\n\n` +
                `🔗 *YouTube:* ${videoUrl}\n\n` +
                '⬇️ Preparing your MP3 download...\n\n' +
                '╰━━━━━━━━━━━━━━━━━━╯\n' +
                '_Powered by DEV MALONE INC_';

            const buttons = [
                {
                    index: 1,
                    urlButton: {
                        displayText: '▶ Watch on YouTube',
                        url: videoUrl
                    }
                },
                {
                    index: 2,
                    quickReplyButton: {
                        displayText: '🎵 Search YouTube',
                        id: '.song ' + title
                    }
                }
            ];

            if (thumbnail) {
                await sock.sendMessage(
                    chatId,
                    {
                        image: { url: thumbnail },
                        caption,
                        footer: 'MEGA MD • Music Downloader',
                        templateButtons: buttons
                    },
                    { quoted: message }
                );
            } else {
                await sock.sendMessage(
                    chatId,
                    {
                        text: caption,
                        footer: 'MEGA MD • Music Downloader',
                        templateButtons: buttons
                    },
                    { quoted: message }
                );
            }

            const audio = await downloadWithRetry(videoUrl);

            if (!audio?.downloadUrl) {
                throw new Error('The download API returned no audio URL');
            }

            await sock.sendMessage(
                chatId,
                {
                    audio: { url: audio.downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${(audio.title || title).replace(/[\\/:*?"<>|]/g, '_')}.mp3`,
                    ptt: false
                },
                { quoted: message }
            );
        } catch (err) {
            console.error('Song plugin error:', err);

            const reason =
                err.code === 'ECONNABORTED' ||
                err.response?.status === 408
                    ? 'Download timed out. Please try again.'
                    : 'Unable to download this song. Please try again later.';

            await sock.sendMessage(
                chatId,
                { text: `❌ *Download Failed*\n\n${reason}` },
                { quoted: message }
            );
        }
    }
};