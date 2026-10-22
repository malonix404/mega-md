
import yts from 'yt-search';
import axios from 'axios';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'qasim-dev';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const downloadWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(DL_API, {
                params: {
                    apiKey: API_KEY,
                    format: 'mp3',
                    url
                },
                timeout: 90000
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
    command: 'play',
    aliases: ['plays', 'music'],
    category: 'music',
    description: 'Search music and download as audio or document',
    usage: '.play <song name>',

    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;

        // Button IDs can be routed back through this command:
        // .play <youtube-url> audio
        // .play <youtube-url> document
        let query = args.join(' ').trim();
        let format = 'choose';

        const lastArg = args[args.length - 1]?.toLowerCase();

        if (lastArg === 'audio' || lastArg === 'document') {
            format = lastArg;
            query = args.slice(0, -1).join(' ').trim();
        }

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '*Which song do you want to download?*\n\nUsage: .play <song name>'
            }, { quoted: message });
        }

        try {
            let video;

            // If a button supplied a YouTube URL, use it directly.
            if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(query)) {
                const result = await yts({ videoId: getVideoId(query) });
                video = result;
            } else {
                await sock.sendMessage(chatId, {
                    text: '🔍 *Searching for your song...*'
                }, { quoted: message });

                const { videos } = await yts(query);

                if (!videos?.length) {
                    return sock.sendMessage(chatId, {
                        text: '❌ *No results found!*'
                    }, { quoted: message });
                }

                video = videos[0];
            }

            if (!video?.url) {
                throw new Error('Could not retrieve video information');
            }

            if (format === 'choose') {
                // Each button ID contains a command that the bot's
                // message dispatcher must recognize when clicked.
                return sock.sendMessage(chatId, {
                    text:
                        `🎵 *${video.title}*\n\n` +
                        `👤 Artist/Channel: ${video.author?.name || 'Unknown'}\n` +
                        `⏱️ Duration: ${video.timestamp || 'Unknown'}\n\n` +
                        '*Choose your download format:*',
                    footer: 'MEGA MD • Music Downloader',
                    buttons: [
                        {
                            buttonId: `.play ${video.url} audio`,
                            buttonText: { displayText: '🎧 Audio' },
                            type: 1
                        },
                        {
                            buttonId: `.play ${video.url} document`,
                            buttonText: { displayText: '📁 Document' },
                            type: 1
                        }
                    ],
                    headerType: 1
                }, { quoted: message });
            }

            await sock.sendMessage(chatId, {
                text: `⏳ *Preparing ${format === 'audio' ? 'audio' : 'document'}...*\n\n🎵 ${video.title}`
            }, { quoted: message });

            const songData = await downloadWithRetry(video.url);

            const safeTitle = (songData.title || video.title || 'music')
                .replace(/[\\/:*?"<>|]/g, '_')
                .trim();

            const fileUrl = songData.downloadUrl;

            if (format === 'document') {
                await sock.sendMessage(chatId, {
                    document: { url: fileUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`,
                    caption: `📁 *${safeTitle}*\n🎵 Downloaded by MEGA MD`
                }, { quoted: message });
            } else {
                let thumbnailBuffer;

                try {
                    if (songData.thumbnail) {
                        const img = await axios.get(songData.thumbnail, {
                            responseType: 'arraybuffer',
                            timeout: 15000
                        });

                        thumbnailBuffer = Buffer.from(img.data);
                    }
                } catch {
                    // Thumbnail is optional.
                }

                await sock.sendMessage(chatId, {
                    audio: { url: fileUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: safeTitle,
                            body: `${video.author?.name || 'Unknown'} • ${video.timestamp || ''}`,
                            ...(thumbnailBuffer
                                ? { thumbnail: thumbnailBuffer }
                                : {}),
                            mediaType: 2,
                            sourceUrl: video.url
                        }
                    }
                }, { quoted: message });
            }
        } catch (err) {
            console.error('Play error:', err.message);

            const reason = err.response?.status === 408
                ? 'Download timed out. Try again.'
                : err.response?.status === 429
                    ? 'Too many requests. Please wait a minute.'
                    : 'Unable to download this song. Please try again.';

            await sock.sendMessage(chatId, {
                text: `❌ *Download failed:* ${reason}`
            }, { quoted: message });
        }
    }
};

function getVideoId(url) {
    try {
        const parsed = new URL(url);

        if (parsed.hostname.endsWith('youtu.be')) {
            return parsed.pathname.slice(1);
        }

        if (parsed.pathname === '/watch') {
            return parsed.searchParams.get('v');
        }

        const match = parsed.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/);
        return match?.[1] || '';
    } catch {
        return '';
    }
}
