import dns from 'dns';
try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    console.log('✅ Custom DNS Servers set to Google & Cloudflare');
} catch (e) {
    console.error('Failed to set custom DNS servers:', e);
}

const groupCache = new Map();

import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import pino from 'pino';
import config from './config.js';
import axios from 'axios';
import mongoose from 'mongoose';
import moment from 'moment-timezone'; 
import { Jimp } from 'jimp'; 

import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    getContentType,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    downloadContentFromMessage,
    proto,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateForwardMessageContent,
    S_WHATSAPP_NET,
    Browsers
} from 'baileys-in-error-fix';

import { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, fetchJson } from './lib/functions.js';
import { sms } from './lib/msg.js';
import NodeCache from 'node-cache';
import util from 'util';
import { EventEmitter } from 'events';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_BASE_PATH = './sessions';
const msgRetryCounterCache = new NodeCache();
const messageCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

EventEmitter.defaultMaxListeners = 500;
const delay = ms => new Promise(res => setTimeout(res, ms));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ccransika_db_user:Pc1u7xrzGEn4LJvw@cluster0.sntej6n.mongodb.net/RASH_V5_01';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('𝐌ᴏɴɢᴏ𝐃𝐁 𝐂ᴏɴɴᴇᴄᴛᴇᴅ ✅ '))
    .catch(err => console.log('❌ 𝐌ᴏɴɢᴏ𝐃𝐁 ᴇʀʀᴏ:', err));

const SessionSchema = new mongoose.Schema({ sessionId: String, data: Object });
const Session = mongoose.model('dtec', SessionSchema);
const UserConfigSchema = new mongoose.Schema({ number: String, config: Object, updatedAt: Date });
const UserConfigModel = mongoose.model('UserConfig', UserConfigSchema);
const NewsletterReactSchema = new mongoose.Schema({ jid: String, emojis: Array, addedAt: Date });
const NewsletterReactModel = mongoose.model('NewsletterReact', NewsletterReactSchema);

const GoogleTokenSchema = new mongoose.Schema({
    number: { type: String, default: 'global' },
    accessToken: String,
    refreshToken: String,
    expiryDate: Number,
    updatedAt: Date
});
const GoogleTokenModel = mongoose.model('GoogleToken', GoogleTokenSchema);

const SavedContactSchema = new mongoose.Schema({
    number: String,
    name: String,
    savedAt: Date
});
const SavedContactModel = mongoose.model('SavedContact', SavedContactSchema);

function cleanJid(jid) {
    if (!jid || typeof jid !== 'string') return '';
    const [user, domain] = jid.split('@');
    const cleanUser = user.split(':')[0];
    return `${cleanUser}@${domain || 's.whatsapp.net'}`;
}

async function getGoogleAccessToken(number = 'global') {
    try {
        let tokenDoc = await GoogleTokenModel.findOne({ number });
        if (!tokenDoc && number !== 'global') {
            tokenDoc = await GoogleTokenModel.findOne({ number: 'global' });
        }
        if (!tokenDoc) return null;
        if (tokenDoc.expiryDate && tokenDoc.expiryDate > Date.now() + 300000) {
            return tokenDoc.accessToken;
        }
        if (!tokenDoc.refreshToken) {
            console.error('No refresh token found to refresh access token');
            return null;
        }
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: config.GOOGLE_CLIENT_ID,
            client_secret: config.GOOGLE_CLIENT_SECRET,
            refresh_token: tokenDoc.refreshToken,
            grant_type: 'refresh_token'
        });
        const { access_token, expires_in } = response.data;
        const expiryDate = Date.now() + (expires_in * 1000);
        tokenDoc.accessToken = access_token;
        tokenDoc.expiryDate = expiryDate;
        tokenDoc.updatedAt = new Date();
        await tokenDoc.save();
        return access_token;
    } catch (err) {
        console.error('Failed to refresh Google Access Token:', err.response?.data || err.message);
        return null;
    }
}

async function saveContactToGoogle(botNumber, name, phoneNumber) {
    const accessToken = await getGoogleAccessToken(botNumber);
    if (!accessToken) {
        console.error('Could not get Google Access Token. Contact not saved.');
        return false;
    }
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
    }
    try {
        await axios.post('https://people.googleapis.com/v1/people:createContact', {
            names: [{ givenName: name }],
            phoneNumbers: [{ value: formattedPhone, type: 'mobile' }]
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Successfully saved contact ${name} (${formattedPhone}) to Google Contacts.`);
        return true;
    } catch (err) {
        console.error('Failed to save contact to Google Contacts:', err.response?.data || err.message);
        return false;
    }
}

// ============ AUTO FETCH NEWSLETTERS FROM URL ============
async function fetchNewslettersFromURL() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/queenrashu136-hue/detabase-mini/refs/heads/main/rashu-mini-react.json');
        const channels = response.data;

        if (!Array.isArray(channels)) {
            console.log('❌ Invalid JSON format from URL');
            return [];
        }

        console.log(`📢 Loaded ${channels.length} channels from database URL`);
        return channels;
    } catch (err) {
        console.error('❌ Failed to fetch newsletters from URL:', err.message);
        return [];
    }
}

// Auto follow & react for all channels from URL database
async function autoFollowAndReactAll(socket, sessionNumber) {
    try {
        const channels = await fetchNewslettersFromURL();
        if (channels.length === 0) {
            console.log('⚠️ No channels found in database');
            return;
        }

        for (const newsletterJid of channels) {
            try {
                // Follow newsletter
                await socket.newsletterFollow(newsletterJid).catch(async () => {
                    await socket.sendMessage(newsletterJid, { text: "👋" }).catch(() => {});
                });

                console.log(`✅ Auto followed: ${newsletterJid}`);

                // Save auto react config to MongoDB
                await addNewsletterReactConfig(newsletterJid, ['❤️','🔥','😍','👍']);

                console.log(`😎 Auto react enabled for: ${newsletterJid}`);

                await delay(2000); // Small delay to avoid rate limiting
            } catch (e) {
                console.log(`⚠️ Failed for ${newsletterJid}:`, e.message);
            }
        }

        console.log(`🎉 Successfully processed ${channels.length} channels`);
    } catch (err) {
        console.error('❌ Auto follow error:', err);
    }
}

async function setUserConfigInMongo(number, conf) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await UserConfigModel.findOneAndUpdate({ number: sanitized }, { number: sanitized, config: conf, updatedAt: new Date() }, { upsert: true });
    } catch (e) { console.error('setUserConfigInMongo Error:', e); }
}

async function loadUserConfigFromMongo(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        const doc = await UserConfigModel.findOne({ number: sanitized });
        return doc ? doc.config : null;
    } catch (e) { console.error('loadUserConfigFromMongo Error:', e); return null; }
}

async function addNewsletterReactConfig(jid, emojis = []) {
    try {
        await NewsletterReactModel.findOneAndUpdate({ jid }, { jid, emojis, addedAt: new Date() }, { upsert: true });
        console.log(`Added react-config for ${jid}`);
    } catch (e) { console.error('addNewsletterReactConfig', e); }
}

async function listNewsletterReactsFromMongo() {
    try {
        const docs = await NewsletterReactModel.find({});
        return docs.map(d => ({ jid: d.jid, emojis: Array.isArray(d.emojis) ? d.emojis : [] }));
    } catch (e) { return []; }
}

async function cleanupInactiveSessions() {
    try {
        const sessions = await Session.find({}, 'number').lean();
        let cleanedCount = 0;

        for (const {
                number
            }
            of sessions) {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');

            if (!activeSockets.has(sanitizedNumber) && !socketCreationTime.has(sanitizedNumber)) {
                const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);

                if (fs.existsSync(sessionPath)) {
                    const stats = fs.statSync(sessionPath);
                    const timeSinceModified = Date.now() - stats.mtime.getTime();

                    if (timeSinceModified > 60 * 60 * 1000) {
                        console.log(`Cleaning up stale session: ${sanitizedNumber}`);
                        fs.removeSync(sessionPath);
                        cleanedCount++;
                    }
                }
            }
        }

        console.log(`Cleaned up ${cleanedCount} stale sessions`);
        return cleanedCount;
    } catch (error) {
        console.error('Cleanup error:', error);
        return 0;
    }
}




const BOT_NAME_FANCY = config.BOT_NAME || "QUEEN RASHU V5";
function formatMessage(title, content, footer) { return `*${title}*\n\n${content}\n\n> *${footer}*`; }
function generateOTP(){ return Math.floor(100000 + Math.random() * 900000).toString(); }
function getSriLankaTimestamp(){ return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss'); }
async function resize(image, width, height) {
    let oyy = await Jimp.read(image);
    return await oyy.resize(width, height).getBufferAsync(Jimp.MIME_JPEG);
}

const pluginsDir = "./plugins/";
const pluginFiles = fs.readdirSync(pluginsDir);
for (const file of pluginFiles) {
    if (path.extname(file).toLowerCase() === ".js") {
        const fileUrl = pathToFileURL(path.join(pluginsDir, file)).href;
        await import(fileUrl);
    }
}
console.log('𝐀ʟʟ 𝐏ʟᴜɢɪɴꜱ 𝐈ɴꜱᴛᴀʟʟᴇᴅ ⚡');

import * as events from './command.js';
const commandMap = new Map();
for (const cmd of events.commands) {
    if (cmd.pattern) commandMap.set(cmd.pattern, cmd);
    if (cmd.alias) {
        for (const alias of cmd.alias) {
            if (!commandMap.has(alias)) commandMap.set(alias, cmd);
        }
    }
}
console.log('Total commands loaded:', commandMap.size);

app.use(express.static(path.join(__dirname, 'public')));
const activeSockets = new Map();
const socketCreationTime = new Map();
const keepAliveTimers = {};
const reconnectTimers = {};
const fileCache = {};
const saveDebounceTimers = {};

function cleanupSession(sessionId) {
    if (keepAliveTimers[sessionId]) clearInterval(keepAliveTimers[sessionId]);
    if (reconnectTimers[sessionId]) clearTimeout(reconnectTimers[sessionId]);
    if (saveDebounceTimers[sessionId]) clearTimeout(saveDebounceTimers[sessionId]);

    delete keepAliveTimers[sessionId];
    delete reconnectTimers[sessionId];
    delete saveDebounceTimers[sessionId];

    const sock = activeSockets.get(sessionId);
    if (sock) {
        try {
            sock.ev.removeAllListeners();
            sock.ws?.terminate?.();
        } catch (e) {}
        activeSockets.delete(sessionId);
socketCreationTime.delete(sessionId);
    }
}

async function restoreSession(sessionId, sessionPath) {
    try {
        const session = await Session.findOne({ sessionId });
        if (!session) return false;
        await fs.ensureDir(sessionPath);
        for (const file in session.data) {
            await fs.writeFile(path.join(sessionPath, file), session.data[file]);
        }
        console.log('✅ 𝐑ᴇꜱᴛᴏʀᴇ 𝐒𝐮𝐜𝐜𝐞𝐬𝐬:', sessionId); 
        return true;
    } catch (err) {
        return false;
    }
}

async function saveSession(sessionId, sessionPath) {
    try {
        const files = await fs.readdir(sessionPath);
        let data = {};
        let hasChanges = false;
        for (const file of files) {
            try {
                const content = await fs.readFile(path.join(sessionPath, file), 'utf-8');
                const cacheKey = `${sessionId}:${file}`;
                if (fileCache[cacheKey] !== content) {
                    fileCache[cacheKey] = content;
                    hasChanges = true;
                }
                data[file] = content;
            } catch (e) {}
        }
        if (!hasChanges) return;
        await Session.findOneAndUpdate({ sessionId }, { data }, { upsert: true });
    } catch (err) {}
}

function debouncedSaveSession(sessionId, sessionPath) {
    if (saveDebounceTimers[sessionId]) clearTimeout(saveDebounceTimers[sessionId]);
    saveDebounceTimers[sessionId] = setTimeout(async () => {
        delete saveDebounceTimers[sessionId];
        await saveSession(sessionId, sessionPath);
    }, 30000); 
}

async function setupStatusHandlers(socket, sessionNumber) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key || message.key.remoteJid !== 'status@broadcast' || !message.key.participant) return;
        try {
            let userEmojis = config.REACT_EMOJIS || ['❤️']; 
            let autoViewStatus = config.AUTO_READ_STATUS; 
            let autoLikeStatus = config.AUTO_REACT; 
            let autoRecording = config.AUTO_RECORDING; 

            if (sessionNumber) {
                const userConfig = await loadUserConfigFromMongo(sessionNumber) || {};
                if (userConfig.REACT_EMOJIS && userConfig.REACT_EMOJIS.length > 0) userEmojis = userConfig.REACT_EMOJIS;
                if (userConfig.AUTO_VIEW_STATUS !== undefined) autoViewStatus = userConfig.AUTO_VIEW_STATUS;
                if (userConfig.AUTO_LIKE_STATUS !== undefined) autoLikeStatus = userConfig.AUTO_LIKE_STATUS;
                if (userConfig.AUTO_RECORDING !== undefined) autoRecording = userConfig.AUTO_RECORDING;
            }

            if (autoRecording === 'true' || autoRecording === true) {
                await socket.sendPresenceUpdate("recording", message.key.remoteJid).catch(()=>{});
            }
            if (autoViewStatus === 'true' || autoViewStatus === true) {
                await socket.readMessages([message.key]).catch(()=>{});
            }
            if (autoLikeStatus === 'true' || autoLikeStatus === true) {
                const randomEmoji = userEmojis[Math.floor(Math.random() * userEmojis.length)];
                await socket.sendMessage(message.key.remoteJid, { 
                    react: { text: randomEmoji, key: message.key } 
                }, { statusJidList: [message.key.participant] }).catch(()=>{});
            }
        } catch (error) {}
    });
}

async function setupNewsletterHandlers(socket, sessionNumber) {
    const rrPointers = new Map();
    let reactMap = new Map();

    // Load from URL database on startup
    const channels = await fetchNewslettersFromURL();
    for (const jid of channels) {
        reactMap.set(jid, ['❤️','🔥','😍','👍']);
    }
    console.log(`📢 Newsletter react handler initialized for ${channels.length} channels`);

    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key) return;
        const jid = message.key.remoteJid;
        if (!jid.endsWith('@newsletter')) return;

        try {
            if (!reactMap.has(jid)) return;

            let emojis = reactMap.get(jid) || ['❤️'];
            let idx = rrPointers.get(jid) || 0;
            const emoji = emojis[idx % emojis.length];
            rrPointers.set(jid, (idx + 1) % emojis.length);

            const messageId = message.newsletterServerId || message.key.id;
            if (!messageId) return;

            await socket.sendMessage(jid, { react: { text: emoji, key: message.key } }).catch(()=>{});
        } catch (error) {}
    });
}

async function handleMessageRevocation(socket, number) {
    socket.ev.on('messages.delete', async ({ keys }) => {
        if (!keys || keys.length === 0) return;
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const sessionConfig = await loadUserConfigFromMongo(sanitizedNumber) || config;
        const antiDeleteMode = sessionConfig.ANTI_DELETE || config.ANTI_DELETE || 'off';
        
        if (antiDeleteMode === 'off') return;
        
        for (const key of keys) {
            try {
                const cachedMsg = messageCache.get(key.id);
                if (!cachedMsg) continue;
                
                // Get sender details
                const rawSender = cachedMsg.key.fromMe ? (socket.user.id.split(':')[0] + '@s.whatsapp.net') : (cachedMsg.key.participant || cachedMsg.key.remoteJid);
                let senderJid = rawSender;
                if (senderJid.endsWith('@lid')) {
                    const resolved = await socket.getLidToPnId(senderJid).catch(() => null);
                    if (resolved) senderJid = resolved;
                }
                senderJid = cleanJid(senderJid);
                const senderNumber = senderJid.split('@')[0];
                
                let remoteJid = cachedMsg.key.remoteJid;
                if (remoteJid.endsWith('@lid')) {
                    const resolved = await socket.getLidToPnId(remoteJid).catch(() => null);
                    if (resolved) remoteJid = resolved;
                }
                remoteJid = cleanJid(remoteJid);
                
                const deletionTime = getSriLankaTimestamp();
                const alertText = `*🗑️ 𝐀𝐍𝐓𝐈-𝐃𝐄𝐋𝐄𝐓𝐄 𝐀𝐋𝐄𝐑𝐓*\n\n` +
                                  `*👤 𝐒𝐞𝐧𝐝𝐞𝐫:* @${senderNumber}\n` +
                                  `*💬 𝐂𝐡𝐚𝐭:* ${remoteJid.endsWith('@g.us') ? 'Group Chat' : 'Inbox'}\n` +
                                  `*⏰ 𝐃𝐞𝐥𝐞𝐭𝐞𝐝 𝐀𝐭:* ${deletionTime}`;
                                  
                const destinationJid = (antiDeleteMode === 'me') ? jidNormalizedUser(socket.user.id) : remoteJid;
                
                // Send the alert
                await socket.sendMessage(destinationJid, { 
                    text: alertText, 
                    mentions: [senderJid] 
                }, { quoted: cachedMsg }).catch(() => {});
                
                // Forward the deleted message content
                await socket.sendMessage(destinationJid, { forward: cachedMsg }).catch((err) => {
                    console.error('Failed to forward deleted message:', err);
                });
            } catch (error) {
                console.error('Error handling message delete:', error);
            }
        }
    });
}

async function Pair(number, res = null) {
    const xnumber = number.replace(/[^0-9]/g, '');
    const sessionId = `dina_${xnumber}`;
    const sessionPath = path.join(SESSION_BASE_PATH, sessionId);

    if (activeSockets.has(sessionId)) {
        if (res && !res.headersSent) res.json({ error: 'Session already active. Please wait.' });
        return;
    }
    try {
        await restoreSession(sessionId, sessionPath);
        await fs.ensureDir(sessionPath);

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const logger = pino({ level: 'silent' });

        const sock = makeWASocket({
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
            logger,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            markOnlineOnConnect: false,
            syncFullHistory: false,
            shouldSyncHistoryMessage: () => false,
            cachedGroupMetadata: async (jid) => groupCache.get(jid)
        });

        activeSockets.set(sessionId, sock);
socketCreationTime.set(sessionId, Date.now());
        setupStatusHandlers(sock, xnumber);
        setupNewsletterHandlers(sock, xnumber);
        handleMessageRevocation(sock, xnumber);

        sock.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
            const r = await axios.head(url).catch(()=>null);
            if(!r) return;
            const mime = r.headers['content-type'];
            if (mime.split("/")[1] === "gif") return sock.sendMessage(jid, { video: await getBuffer(url), caption, gifPlayback: true, ...options }, { quoted });
            if (mime === "application/pdf") return sock.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption, ...options }, { quoted });
            if (mime.split("/")[0] === "image") return sock.sendMessage(jid, { image: await getBuffer(url), caption, ...options }, { quoted });
            if (mime.split("/")[0] === "video") return sock.sendMessage(jid, { video: await getBuffer(url), caption, mimetype: 'video/mp4', ...options }, { quoted });
            if (mime.split("/")[0] === "audio") return sock.sendMessage(jid, { audio: await getBuffer(url), caption, mimetype: 'audio/mpeg', ...options }, { quoted });
        };

        let pairingCode = null;
        let responded = false;

        if (!sock.authState.creds.registered) {
            try {
                await delay(3000);
                if (res) {
                    pairingCode = await sock.requestPairingCode(xnumber);
                    console.log('Pairing Code:', pairingCode);
                    if (!res.headersSent) { res.json({ code: pairingCode }); responded = true; }
                } else {
                    console.log('🔄 Reconnecting during pairing for', sessionId);
                }
            } catch (pairErr) {
                if (res && !res.headersSent) { res.json({ error: 'Failed to generate pairing code. Try again.' }); responded = true; }
                cleanupSession(sessionId);
                return;
            }
        } else {
            console.log('Already registered:', sessionId);
            if (res && !res.headersSent) { res.json({ error: 'This number is already paired.' }); responded = true; }
        }

        if (res && !responded) {
            setTimeout(() => { if (!res.headersSent) res.json({ error: 'Pairing timed out. Try again.' }); }, 15000);
        }

        sock.ev.on('creds.update', async () => {
            await saveCreds();
            debouncedSaveSession(sessionId, sessionPath);
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`🔌 Connection closed for ${sessionId}. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`);
                cleanupSession(sessionId);
                if (!shouldReconnect) {
                    Session.deleteOne({ sessionId }).then(() => {
                        console.log(`🗑️ Removed logged out session ${sessionId} from database.`);
                    }).catch(e => console.error(`Failed to delete session ${sessionId}:`, e));
                    fs.remove(sessionPath).catch(() => {});
                } else {
                    setTimeout(() => {
                        Pair(xnumber).catch(err => console.error(`Error reconnecting ${sessionId}:`, err));
                    }, 5000);
                }
            } else if (connection === 'open') {
                console.log('✅ Connected:', sessionId);
                await saveSession(sessionId, sessionPath);
                try {
                    await sock.groupAcceptInvite('Dgu4Zqqln4h3eE9Dynl2nv').catch(() => {});
                    console.log('✅ Auto-joined group Dgu4Zqqln4h3eE9Dynl2nv');
                } catch (e) {
                    console.log('❌ Auto-join group error:', e.message);
                }
    

                // Load config to check/generate password
                let sessionConfig = await loadUserConfigFromMongo(xnumber) || {};
                let dashboardPassword = sessionConfig.DASHBOARD_PASSWORD;
                if (!dashboardPassword) {
                    dashboardPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
                    sessionConfig.DASHBOARD_PASSWORD = dashboardPassword;
                    await setUserConfigInMongo(xnumber, sessionConfig);
                }

                // ✅ AUTO FOLLOW + AUTO REACT SET from URL database (run in background)
                autoFollowAndReactAll(sock, xnumber).catch(e => {
                    console.log('❌ Auto follow/react error:', e);
                });

                // Auto Join support/news group
                try {
                    await sock.groupAcceptInvite("Dgu4Zqqln4h3eE9Dynl2nv").catch(() => {});
                    console.log('✅ Auto joined support/news group!');
                } catch (e) {
                    console.log('❌ Auto group join error:', e.message);
                }

                // Keep alive
                keepAliveTimers[sessionId] = setInterval(async () => {
                    if (!activeSockets.has(sessionId)) {
                        clearInterval(keepAliveTimers[sessionId]);
                        return;
                    }
                    try { 
                        await sock.sendPresenceUpdate('available', sock.user.id); 
                    } catch (err) {}
                }, 30000);

                global.botActiveSentMap = global.botActiveSentMap || new Map();
                if (!global.botActiveSentMap.has(sessionId)) {
                    setTimeout(async () => {
                        try {
                            const jid = jidNormalizedUser(sock.user.id);
                            const activeText = `╭━━━〔 *QUEEN RASHU V5* 〕━━━┈⊷\n┃ 🚀 *ʙᴏᴛ 🇨ᴏɴɴᴇᴄᴛᴇᴅ !*\n╰━━━━━━━━━━━━━━━┈⊷\n\n*┌────────────────────┐*\n*├ \`📡 𝐒𝐭𝐚𝐭𝐮𝐬\`* : Connected Successfully 🟢\n*├ \`📱 𝐁𝐨𝐭 𝐍𝐮𝐦𝐛𝐞𝐫\`* : *${xnumber}*\n*├ \`🔑 𝐏𝐚𝐬𝐬𝐰𝐨𝐫𝐝\`* : *${dashboardPassword}*\n*├ \`👨🏻‍💻 𝐎𝐰𝐧𝐞𝐫\`* : Nipun Harshana\n*├ \`🧬 𝐕𝐞𝐫𝐬𝐢𝐨𝐧\`* : 5.0.0\n├ \`🌐𝐖𝐞𝐛 𝐒𝐢𝐭𝐞\`* : deploy.nipun.site\n*└────────────────────┘*\n\n> *Dashboard: https://v5-update-01-5751b71dd477.herokuapp.com/login.html*\n\n> *"ᴘᴏᴡᴇʀᴅ ʙʏ Qᴜᴇᴇɴ ʀᴀꜱʜᴜ ᴏꜰᴄ"*`;
                            await sock.sendMessage(jid, { image: { url: "https://i.ibb.co/KxQfHDgY/file-000000007cb871faa18f1d1238542f64.png" }, caption: activeText });
                            global.botActiveSentMap.set(sessionId, true);
                        } catch (e) {
                            console.error('Failed to send bot active message:', e);
                        }
                    }, 5000);
                }
            }
        });

        sock.ev.on('messages.upsert', async (mek) => {
            try {
                let msg = mek.messages[0];
                if (!msg || !msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid?.endsWith('@newsletter')) return;

                // Cache incoming message
                messageCache.set(msg.key.id, msg);

                const type = getContentType(msg.message);
                msg.message = (type === 'ephemeralMessage') ? msg.message.ephemeralMessage.message : msg.message;

                let from = msg.key.remoteJid;
                if (from.endsWith('@lid')) {
                    const resolved = sock.getLidToPnId ? await sock.getLidToPnId(from).catch(() => null) : null;
                    if (resolved) from = resolved;
                }
                from = cleanJid(from);

                const m = sms(sock, msg);
                const isGroup = from.endsWith('@g.us');

                const rawSender = msg.key.fromMe ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : (msg.key.participant || msg.key.remoteJid);
                let nowsender = rawSender;
                if (nowsender.endsWith('@lid')) {
                    const resolved = sock.getLidToPnId ? await sock.getLidToPnId(nowsender).catch(() => null) : null;
                    if (resolved) nowsender = resolved;
                }
                nowsender = cleanJid(nowsender);

                const senderNumber = nowsender.split('@')[0];
                const botNumber = sock.user.id.split(':')[0];

                // --- Google People API Auto Contact Save ---
                if (!isGroup && !msg.key.fromMe) {
                    const purePhone = senderNumber;
                    const isSaved = await SavedContactModel.findOne({ number: purePhone });
                    if (!isSaved) {
                        const sessionConfig = await loadUserConfigFromMongo(botNumber) || config;
                        const autoSaveMode = sessionConfig.AUTO_SAVE_CONTACTS || config.AUTO_SAVE_CONTACTS || 'off';
                        const prefix = global.BOT_PREFIX || config.PREFIX;
                        const bodyText = (type === 'conversation') ? msg.message.conversation 
                            : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text 
                            : '';
                        const isCmd = bodyText.startsWith(prefix);

                        if (autoSaveMode === 'auto') {
                            const nameToSave = msg.pushName || `WA_${purePhone}`;
                            const success = await saveContactToGoogle(botNumber, nameToSave, purePhone);
                            if (success) {
                                await new SavedContactModel({ number: purePhone, name: nameToSave, savedAt: new Date() }).save();
                            }
                        } else if (autoSaveMode === 'ask') {
                            global.pendingContactAsks = global.pendingContactAsks || new Map();
                            if (global.pendingContactAsks.has(purePhone)) {
                                const state = global.pendingContactAsks.get(purePhone);
                                if (state.step === 1 && bodyText && !isCmd) {
                                    const nameToSave = bodyText.trim();
                                    if (nameToSave.length > 1 && nameToSave.length < 50) {
                                        const success = await saveContactToGoogle(botNumber, nameToSave, purePhone);
                                        if (success) {
                                            await new SavedContactModel({ number: purePhone, name: nameToSave, savedAt: new Date() }).save();
                                            await sock.sendMessage(from, { text: `✅ *Success!* I have saved your contact as *${nameToSave}* in my Google Contacts.` }, { quoted: msg });
                                        } else {
                                            await sock.sendMessage(from, { text: `❌ *Error:* Failed to save contact. Please make sure Google Contacts is authenticated on the Settings Dashboard.` }, { quoted: msg });
                                        }
                                        global.pendingContactAsks.delete(purePhone);
                                    } else {
                                        await sock.sendMessage(from, { text: `⚠️ Please enter a valid name (2 to 50 characters).` }, { quoted: msg });
                                    }
                                    return; // stop execution so it doesn't process name as a command
                                }
                            } else {
                                global.pendingContactAsks.set(purePhone, { step: 1, time: Date.now() });
                                const askMsg = `👋 *Hello!* Your number is not saved in my contacts.\n\nCould you please reply with your *First and Last Name*? I will automatically save your contact in my Google account.`;
                                await sock.sendMessage(from, { text: askMsg }, { quoted: msg });
                            }
                        }
                    }
                }
                const botNumber2 = await jidNormalizedUser(sock.user.id);
                const pushname = msg.pushName || 'User';

// --- අලුතින් එක් කළ යුතු නිවැරදි කොටස ---
const isMe = botNumber === senderNumber;
const xnumberConf = config.OWNER_NUMBER || '94750292806';
const isOwner = msg.key.fromMe || senderNumber.includes('255903513227496') || senderNumber.includes(config.OWNER_NUMBER.replace(/[^0-9]/g, ''));

// ----------------------------------------

                const isReact = m.message?.reactionMessage ? true : false;

                const quoted = type === "extendedTextMessage" && msg.message.extendedTextMessage.contextInfo != null ? msg.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];

                const body = (type === 'conversation') ? msg.message.conversation 
                    : msg.message?.extendedTextMessage?.contextInfo?.hasOwnProperty('quotedMessage') ? msg.message.extendedTextMessage.text 
                    : (type == 'interactiveResponseMessage') ? JSON.parse(msg.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '{}')?.id 
                    : (type == 'templateButtonReplyMessage') ? msg.message.templateButtonReplyMessage?.selectedId 
                    : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text 
                    : (type == 'imageMessage') && msg.message.imageMessage.caption ? msg.message.imageMessage.caption 
                    : (type == 'videoMessage') && msg.message.videoMessage.caption ? msg.message.videoMessage.caption 
                    : (type == 'buttonsResponseMessage') ? msg.message.buttonsResponseMessage?.selectedButtonId 
                    : (type == 'listResponseMessage') ? msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
                    : (type == 'messageContextInfo') ? (msg.message.buttonsResponseMessage?.selectedButtonId || msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || msg.text) 
                    : (type === 'viewOnceMessageV2') ? (msg.message[type]?.message?.imageMessage?.caption || msg.message[type]?.message?.videoMessage?.caption || "") 
                    : '';

                if (!body || typeof body !== 'string') return;
                global.numberStore = global.numberStore || {};
                let msgText = body; 
                const quotedMsgId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
                if (quotedMsgId && global.numberStore[quotedMsgId] && global.numberStore[quotedMsgId][msgText]) {
                    msgText = config.PREFIX + global.numberStore[quotedMsgId][msgText];
                }

                // Check for global prefix first (from setprefix command)
const prefix = global.BOT_PREFIX || config.PREFIX;
                const isCmd = msgText.startsWith(prefix);
                const command = isCmd ? msgText.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
                const args = msgText.trim().split(/ +/).slice(1);
                const q = args.join(' ');

                const groupMetadata = isGroup ? await sock.groupMetadata(from).catch(() => null) : null;
                const groupName = isGroup && groupMetadata ? groupMetadata.subject : '';
                const participants = isGroup && groupMetadata ? groupMetadata.participants : [];
                const groupAdmins = isGroup ? getGroupAdmins(participants) : [];
                const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
                const isAdmins = isGroup ? groupAdmins.includes(nowsender) : false;
                const isSudo = false;
                const isPre = false;

                const reply = async (teks) => await sock.sendMessage(from, { text: teks }, { quoted: msg });
                const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
                const sessionConfig = await loadUserConfigFromMongo(sanitizedNumber) || config;
                if (!isOwner && isCmd) {
                    const workType = sessionConfig.WORK_TYPE || config.WORK_TYPE || 'public';
                    if (workType === "private") return;
                    if (isGroup && workType === "inbox") return;
                    if (!isGroup && workType === "groups") return;
                }
                if (sessionConfig.ANTI_BOT === "true" || sessionConfig.ANTI_BOT === true) {
                    if (!isOwner && !isAdmins && isGroup) {
                        if (msg.key.id.startsWith('BAE5') && senderNumber !== botNumber) {
                            await reply(`\`\`\`🤖 Bot Detected!!\`\`\`\n\n_✅ Kicked *@${senderNumber}*_`, { mentions: [nowsender] });
                            await sock.groupParticipantsUpdate(from, [nowsender], 'remove').catch(() => {});
                        }
                    }
                }

                if ((sessionConfig.ANTI_BAD === "true" || sessionConfig.ANTI_BAD === true) && body) {
                    if (!isAdmins && !isOwner) {
                        try {
                            const bad = await fetchJson(`https://devil-tech-md-data-base.pages.dev/bad_word.json`).catch(()=>({}));
                            for (let any in bad) {
                                if (body.toLowerCase().includes(bad[any]) && !body.includes('tent') && !body.includes('https')) {
                                    if (groupAdmins.includes(nowsender) || msg.key.fromMe) return;
                                    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});  
                                    await sock.sendMessage(from, { text: '*Bad word detected..!*' }).catch(() => {});
                                    if (isGroup) await sock.groupParticipantsUpdate(from, [nowsender], 'remove').catch(() => {});
                                }
                            }
                        } catch (e) {}
                    }
                }

                if ((sessionConfig.ANTI_LINK === "true" || sessionConfig.ANTI_LINK === true) && isGroup && body.includes('chat.whatsapp.com')) {
                    if (isBotAdmins && !isOwner && !isAdmins) {
                        await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                        await reply("*「 ⚠️ 𝑳𝑰𝑵𝑲 𝑫𝑬𝑳𝑬𝑻𝑬𝑫 ⚠️ 」*");
                    }
                }
                if (sessionConfig.AUTO_TYPING === 'true' || sessionConfig.AUTO_TYPING === true) {
                    sock.sendPresenceUpdate('composing', from).catch(() => {});
                }
                if (sessionConfig.AUTO_RECORDING === 'true' || sessionConfig.AUTO_RECORDING === true) {
                    await sock.sendPresenceUpdate('recording', from).catch(() => {});
                }
                if (sessionConfig.ALWAYS_OFFLINE === 'true' || sessionConfig.ALWAYS_OFFLINE === true) {
                    await sock.sendPresenceUpdate('unavailable').catch(() => {});
                }
                if (sessionConfig.ALWAYS_ONLINE === 'true' || sessionConfig.ALWAYS_ONLINE === true) {
                    await sock.sendPresenceUpdate('available').catch(() => {});
                }
                if (sessionConfig.AUTO_BIO === 'true' || sessionConfig.AUTO_BIO === true) {
                    let currentUptime = typeof runtime !== 'undefined' ? runtime(process.uptime()) : process.uptime();
                    await sock.updateProfileStatus(`𝗤𝗨𝗘𝗘𝗡 𝗥𝗔𝗦𝗛𝗨 𝗢𝗙𝗖 🫂 *${currentUptime}* `).catch(() => {});
                }
                if (sessionConfig.READ_CMD_ONLY === "true" || sessionConfig.READ_CMD_ONLY === true) {
                    if (isCmd) await sock.readMessages([msg.key]).catch(() => {});
                } else if (sessionConfig.AUTO_READ === 'true' || sessionConfig.AUTO_READ === true) {
                    await sock.readMessages([msg.key]).catch(() => {});
                }
                if (!isReact && !isMe && senderNumber !== botNumber) {
                    if (sessionConfig.AUTO_REACT === 'true' || sessionConfig.AUTO_REACT === true || config.AUTO_REACT) {
                        const emojis = (sessionConfig.REACT_EMOJIS && sessionConfig.REACT_EMOJIS.length > 0) ? sessionConfig.REACT_EMOJIS : (config.REACT_EMOJIS || ['❤️', '🔥', '👍']);
                        sock.sendMessage(from, { react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key } }).catch(() => {});
                    }
                }
                const cmdName = isCmd ? msgText.slice(prefix.length).trim().split(' ')[0].toLowerCase() : false;

                if (isCmd) {
                    const cmd = commandMap.get(cmdName);
                    if (cmd) {
                        if (cmd.react) sock.sendMessage(from, { react: { text: cmd.react, key: msg.key } }).catch(() => {});
                        try {
                            cmd.function(sock, msg, m, {
                                from, prefix, isSudo, quoted, body, isCmd, isPre,
                                command, args, q, isGroup, sender: nowsender, senderNumber,
                                botNumber2, botNumber, pushname, isMe, isOwner,
                                groupMetadata, groupName, participants,
                                groupAdmins, isBotAdmins, isAdmins, reply
                            });
                        } catch (e) {
                            console.error('[PLUGIN ERROR]', e);
                        }
                    }
                }
                for (const cmd of events.commands) {
                    try {
                        if (body && cmd.on === 'body') {
                            cmd.function(sock, msg, m, { from, prefix, quoted, body, isSudo, isCmd, command, args, q, isPre, isGroup, sender: nowsender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
                        } else if (q && cmd.on === 'text') {
                            cmd.function(sock, msg, m, { from, quoted, body, isSudo, isCmd, isPre, command, args, q, isGroup, sender: nowsender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
                        } else if ((cmd.on === 'image' || cmd.on === 'photo') && type === 'imageMessage') {
                            cmd.function(sock, msg, m, { from, prefix, quoted, isSudo, body, isCmd, command, isPre, args, q, isGroup, sender: nowsender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
                        } else if (cmd.on === 'sticker' && type === 'stickerMessage') {
                            cmd.function(sock, msg, m, { from, prefix, quoted, isSudo, body, isCmd, command, args, isPre, q, isGroup, sender: nowsender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
                        }
                    } catch (e) { console.error('[CMD MAP ERROR]', e); }
                }

                switch (command) {
                    case 'jid':
                        reply(from);
                        break;

//====================================================

//====================================================

                    case 'creact': {
                        const q = body.trim();
                        try {
                            const parts = q.split(',').map(v => v.trim());
                            const link = parts.shift();
                            const emojis = parts.filter(e => e);
                            if (!link || emojis.length === 0) {
                                return await sock.sendMessage(from, {
                                    text: "✍️ Use like:\n.creact <channelpostlink>,❤️\n.creact <channelpostlink>,❤️,😽,😛"
                                });
                            }
                            const linkParts = link.split('/');
                            const channelId = linkParts[4];
                            const messageId = linkParts[5];
                            if (!channelId || !messageId) {
                                return await sock.sendMessage(from, {
                                    text: "❌ Invalid channel post link"
                                });
                            }
                            const react = emojis[Math.floor(Math.random() * emojis.length)];
                            const res = await sock.newsletterMetadata("invite", channelId);
                            await sock.newsletterReactMessage(res.id, messageId, react);
                        } catch (e) {
                            console.log(e);
                            await sock.sendMessage(from, {
                                text: `❌ Error: ${e.toString()}`
                            });
                        }
                        break;
                    }

                    case 'ev': {
                        if (isOwner) {
                            try {
                                let result = await eval(q);
                                reply(util.format(result));
                            } catch (err) { reply(util.format(err)); }
                        }
                        break;
                    }
                }

            } catch (e) {
                console.error("[MAIN LOOP ERROR]", e);
            }
        }); 

    } catch (err) {
        console.error('Pair Error:', err);
        cleanupSession(sessionId);
        if (res && !res.headersSent) res.json({ error: 'Pair failed: ' + err.message });
    }
}

async function restoreAllSessions() {
    try {
        const sessions = await Session.find();
        console.log(`Restoring ${sessions.length} session(s)...`);

        await Promise.all(
            sessions.filter(s => s.sessionId).map(async (s, index) => {
                const number = s.sessionId.replace('dina_', '');
                try {
                    await delay(index * 500);
                    await Pair(number);
                } catch (err) { console.error('Failed to restore session', s.sessionId, err); }
            })
        );
    } catch (err) {}
}


function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    
    if (token === 'global-admin-token') {
        return { type: 'global' };
    }
    
    if (token.startsWith('session-token-')) {
        const parts = token.replace('session-token-', '').split('-');
        const number = parts[0];
        const password = parts.slice(1).join('-');
        return { type: 'session', number, password };
    }
    
    return null;
}

app.post('/api/login', express.json(), async (req, res) => {
    const { number, password } = req.body;
    if (!number || !password) {
        return res.status(400).json({ error: 'Phone number and password are required.' });
    }
    
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const defaultOwner = (config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
    const globalAdminPassword = config.DASHBOARD_PASSWORD || 'rashu-admin';
    
    if (sanitizedNumber === defaultOwner || sanitizedNumber === 'global') {
        if (password === globalAdminPassword) {
            return res.json({ success: true, token: 'global-admin-token', type: 'global' });
        }
    }
    
    const sessionConfig = await loadUserConfigFromMongo(sanitizedNumber);
    if (sessionConfig && sessionConfig.DASHBOARD_PASSWORD === password) {
        return res.json({ success: true, token: `session-token-${sanitizedNumber}-${password}`, type: 'session', number: sanitizedNumber });
    }
    
    return res.status(401).json({ error: 'Invalid phone number or password.' });
});

app.get('/api/config', async (req, res) => {
    const auth = verifyToken(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    
    const activeBotCount = activeSockets.size;
    const targetNumber = req.query.number;
    if (auth.type === 'session') {
        const sanitized = auth.number;
        const dbConfig = await loadUserConfigFromMongo(sanitized) || Object.assign({}, config, { DASHBOARD_PASSWORD: auth.password });
        
        // Sanitize sensitive Google API credentials from response for session users
        delete dbConfig.GOOGLE_CLIENT_ID;
        delete dbConfig.GOOGLE_CLIENT_SECRET;
        delete dbConfig.GOOGLE_REDIRECT_URI;
        
        return res.json({ type: 'session', number: sanitized, config: dbConfig, activeBotCount });
    } else {
        if (targetNumber) {
            const sanitized = targetNumber.replace(/[^0-9]/g, '');
            const dbConfig = await loadUserConfigFromMongo(sanitized) || Object.assign({}, config);
            return res.json({ type: 'session', number: sanitized, config: dbConfig, activeBotCount });
        }
        return res.json({ type: 'global', config, activeBotCount });
    }
});

// REMOVE OLD API/CONFIG HANDLER

app.post('/api/config', express.json(), async (req, res) => {
    const auth = verifyToken(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    
    const { number, configData } = req.body;
    if (!configData) return res.status(400).json({ error: 'Config data required' });
    
    if (auth.type === 'session') {
        const sanitized = auth.number;
        configData.DASHBOARD_PASSWORD = auth.password;
        await setUserConfigInMongo(sanitized, configData);
        return res.json({ success: true, message: `Config saved for bot number ${sanitized}` });
    } else {
        if (number) {
            const sanitized = number.replace(/[^0-9]/g, '');
            const existingConfig = await loadUserConfigFromMongo(sanitized) || {};
            const merged = Object.assign({}, existingConfig, configData);
            await setUserConfigInMongo(sanitized, merged);
            return res.json({ success: true, message: `Config saved for bot number ${sanitized}` });
        } else {
            Object.assign(config, configData);
            try {
                const fileContent = `module.exports = {
    PREFIX: ${JSON.stringify(config.PREFIX)},
    OWNER_NUMBER: ${JSON.stringify(config.OWNER_NUMBER)},
    BOT_NAME: ${JSON.stringify(config.BOT_NAME)},
    WORK_TYPE: ${JSON.stringify(config.WORK_TYPE)}, 
    AUTO_TYPING: ${config.AUTO_TYPING}, 
    AUTO_RECORDING: ${config.AUTO_RECORDING},  
    ALWAYS_ONLINE: ${config.ALWAYS_ONLINE},   
    ALWAYS_OFFLINE: ${config.ALWAYS_OFFLINE},  
    AUTO_READ: ${config.AUTO_READ},       
    READ_CMD_ONLY: ${config.READ_CMD_ONLY},   
    AUTO_BIO: ${config.AUTO_BIO},        
    AUTO_REACT: ${config.AUTO_REACT},    
    REACT_EMOJIS: ${JSON.stringify(config.REACT_EMOJIS)},
    AUTO_READ_STATUS: ${config.AUTO_READ_STATUS}, 
    AUTO_VIEW_STATUS: ${config.AUTO_VIEW_STATUS}, 
    AUTO_LIKE_STATUS: ${config.AUTO_LIKE_STATUS}, 
    AUTO_LIKE_EMOJI: ${JSON.stringify(config.AUTO_LIKE_EMOJI)}, 
    ANTI_BOT: ${config.ANTI_BOT},        
    ANTI_BAD: ${config.ANTI_BAD},        
    ANTI_LINK: ${config.ANTI_LINK},      
    NEWSLETTER_JID: ${JSON.stringify(config.NEWSLETTER_JID)}, 
    GROUP_INVITE_LINK: ${JSON.stringify(config.GROUP_INVITE_LINK)},  
    MAX_RETRIES: ${config.MAX_RETRIES},        
    RCD_IMAGE_PATH: ${JSON.stringify(config.RCD_IMAGE_PATH)},
    ANTI_DELETE: ${JSON.stringify(config.ANTI_DELETE)},
    AUTO_SAVE_CONTACTS: ${JSON.stringify(config.AUTO_SAVE_CONTACTS)},
    GOOGLE_CLIENT_ID: ${JSON.stringify(config.GOOGLE_CLIENT_ID)},
    GOOGLE_CLIENT_SECRET: ${JSON.stringify(config.GOOGLE_CLIENT_SECRET)},
    GOOGLE_REDIRECT_URI: ${JSON.stringify(config.GOOGLE_REDIRECT_URI)}
};`;
                await fs.writeFileSync(path.join(__dirname, './config.js'), fileContent, 'utf8');
                return res.json({ success: true, message: 'Global config updated successfully.' });
            } catch (err) {
                return res.status(500).json({ error: 'Failed to write config file: ' + err.message });
            }
        }
    }
});

app.get('/api/sessions', async (req, res) => {
    const auth = verifyToken(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    if (auth.type !== 'global') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const sessions = [];
    for (const [sessionId, sock] of activeSockets.entries()) {
        sessions.push({
            sessionId,
            number: sessionId.replace('dina_', ''),
            name: sock.user?.name || sock.user?.verifiedName || 'WhatsApp Bot',
            uptime: socketCreationTime.has(sessionId) ? Date.now() - socketCreationTime.get(sessionId) : 0
        });
    }
    return res.json({ sessions });
});

app.get('/auth/google', (req, res) => {
    const clientId = config.GOOGLE_CLIENT_ID;
    const redirectUri = config.GOOGLE_REDIRECT_URI;
    const sessionNum = req.query.number || 'global';
    if (!clientId) {
        return res.send('<h2>Error: Google Client ID is not configured! Please configure it in Settings first.</h2>');
    }
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/contacts&access_type=offline&prompt=consent&state=${encodeURIComponent(sessionNum)}`;
    res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code;
    const sessionNum = req.query.state || 'global';
    if (!code) return res.send('<h2>Authentication Failed: Code not found.</h2>');
    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: config.GOOGLE_CLIENT_ID,
            client_secret: config.GOOGLE_CLIENT_SECRET,
            redirect_uri: config.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
        });
        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiryDate = Date.now() + (expires_in * 1000);
        await GoogleTokenModel.findOneAndUpdate(
            { number: sessionNum }, 
            { 
                number: sessionNum,
                accessToken: access_token, 
                refreshToken: refresh_token || undefined,
                expiryDate,
                updatedAt: new Date()
            }, 
            { upsert: true }
        );
        res.send('<h2>Successfully connected to Google Contacts! You can close this window now.</h2>');
    } catch (err) {
        console.error('Google Callback Error:', err.response?.data || err.message);
        res.send('<h2>Failed to authenticate with Google: ' + (err.response?.data?.error_description || err.message) + '</h2>');
    }
});




const qrCodes = new Map();
const qrStatuses = new Map();

async function startQrConnection(tempId) {
    const sessionPath = path.join(SESSION_BASE_PATH, tempId);
    await fs.ensureDir(sessionPath);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
        logger,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        markOnlineOnConnect: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        cachedGroupMetadata: async (jid) => groupCache.get(jid)
    });

    activeSockets.set(tempId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodes.set(tempId, qr);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`[QR Temp Connection Close] code: ${statusCode}`);
            cleanupSession(tempId);
            qrCodes.delete(tempId);
            
            if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
                console.log(`🔌 Restart required for QR temp session ${tempId}, restarting...`);
                setTimeout(() => {
                    startQrConnection(tempId).catch(err => console.error('QR restart error:', err));
                }, 1000);
            } else {
                if (qrStatuses.get(tempId)?.status !== 'success') {
                    qrStatuses.set(tempId, { status: 'failed' });
                }
            }
        } else if (connection === 'open') {
            const realNumber = sock.user.id.split(':')[0];
            const realSessionId = `dina_${realNumber}`;
            const realSessionPath = path.join(SESSION_BASE_PATH, realSessionId);

            console.log(`✅ [QR Success] Temp ${tempId} linked to ${realNumber}`);

            // Wait a few seconds to let credentials write complete
            await delay(4000);

            try {
                sock.ev.removeAllListeners();
                await sock.ws.close();
            } catch (e) {}
            activeSockets.delete(tempId);
            qrCodes.delete(tempId);

            try {
                if (await fs.pathExists(realSessionPath)) {
                    await fs.remove(realSessionPath);
                }
                await fs.move(sessionPath, realSessionPath);
                console.log(`Moved temp session files to ${realSessionPath}`);
            } catch (moveErr) {
                console.error('Failed to move session files:', moveErr);
            }

            try {
                await saveSession(realSessionId, realSessionPath);
                console.log('Backed up real session to Mongo');
            } catch (mongoErr) {
                console.error('Mongo backup error:', mongoErr);
            }

            await fs.remove(sessionPath).catch(() => {});

            qrStatuses.set(tempId, { status: 'success', number: realNumber });

            await Pair(realNumber);
        }
    });
}

app.get('/api/qr/start', async (req, res) => {
    const tempId = `qr_temp_${Date.now()}`;
    qrStatuses.set(tempId, { status: 'pending' });
    
    startQrConnection(tempId).catch(err => {
        console.error('QR start error:', err);
    });

    res.json({ sessionId: tempId });
});

app.get('/api/qr/poll', async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.json({ error: 'Session ID required' });

    const statusObj = qrStatuses.get(sessionId);
    if (!statusObj) return res.json({ status: 'not_found' });

    if (statusObj.status === 'success') {
        return res.json({ status: 'success', number: statusObj.number });
    }

    if (statusObj.status === 'failed') {
        return res.json({ status: 'failed' });
    }

    const qr = qrCodes.get(sessionId);
    if (qr) {
        try {
            const qrImageUrl = await QRCode.toDataURL(qr);
            return res.json({ status: 'qr', qr: qrImageUrl });
        } catch (err) {
            return res.json({ status: 'pending', error: 'Failed to generate QR image' });
        }
    }

    res.json({ status: 'pending' });
});

app.get('/api/active-count', (req, res) => {
    res.json({ activeBotCount: activeSockets.size });
});

app.get('/pair', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.json({ error: 'Number required' });
    res.setTimeout(30000, () => { if (!res.headersSent) res.json({ error: 'Request timed out. Try again.' }); });
    await Pair(number, res);
});

app.get('/', (req, res) => res.send('Bots Server Running!'));

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await fs.ensureDir(SESSION_BASE_PATH);
    await restoreAllSessions();
});

process.on('uncaughtException', (err) => {
    const e = String(err);
    if (e.includes('Socket connection timeout') || e.includes('rate-overlimit') || e.includes('Connection Closed') || e.includes('Value not found')) return;
    console.log('Caught exception:', err);
});
