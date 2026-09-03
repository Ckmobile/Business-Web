import { cmd } from '../command.js';
import fs from 'fs';
import config from '../config.js'; 
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "settings",
    alias: ["setting", "st", "change", "panel"], 
    react: "📍",
    desc: "Open bot settings panel.",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, pushname, prefix, isOwner, reply }) => {
    try {
        if (!isOwner) {
            return await reply(`*ඔයාට \`QUEEN RASHU MINI Bot\` වැඩ කරන්නෙ නැ*`);
        }

        let alwaysOffline = String(config.ALWAYS_OFFLINE) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let alwaysOnline = String(config.ALWAYS_ONLINE) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let autoViewStatus = String(config.AUTO_READ_STATUS) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let autoLikeStatus = String(config.AUTO_LIKE_STATUS) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let autoRecording = String(config.AUTO_RECORDING) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let autoTyping = String(config.AUTO_TYPING) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let autoReact = String(config.AUTO_REACT) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let antiBot = String(config.ANTI_BOT) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let antiBad = String(config.ANTI_BAD) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let antiLink = String(config.ANTI_LINK) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let readCmdOnly = String(config.READ_CMD_ONLY) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let autoRead = String(config.AUTO_READ) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let autoBio = String(config.AUTO_BIO) === 'true' ? '✅ 𝙾𝙽' : '❌ 𝙾𝙵𝙵';
        let workType = config.WORK_TYPE || 'public';

        const settingsText = `*⚙️ Queen Rashu All Settings..*
*╭┉━┉━┉━┉━┉━┉━┉━☉*
*┆1️⃣. Always Offline :*
* 1.1 = On
* 1.2 = Off
*┆2️⃣. Always Online :*
* 2.1 = On
* 2.2 = Off
*┆3️⃣. Status Auto Read :*
* 3.1 = On
* 3.2 = Off
*┆4️⃣. Status Auto Like :*
* 4.1 = On
* 4.2 = Off
*┆5️⃣. Auto Recording :*
* 5.1 = On
* 5.2 = Off
*┆6️⃣. Auto Typing :*
* 6.1 = On
* 6.2 = Off
*┆7️⃣. Auto React :*
* 7.1 = On
* 7.2 = Off
*┆8️⃣. Anti Bot :*
* 8.1 = On
* 8.2 = Off
*┆9️⃣. Anti Bad Word :*
* 9.1 = On
* 9.2 = Off
*┆1️⃣0️⃣. Anti Link :*
* 10.1 = On
* 10.2 = Off
*┆1️⃣1️⃣. Read Command :*
* 11.1 = On
* 11.2 = Off
*┆1️⃣2️⃣. All Msg Auto Read :*
* 12.1 = On
* 12.2 = Off
*┆1️⃣3️⃣. Auto Bio :*
* 13.1 = On
* 13.2 = Off
*┆1️⃣4️⃣. Mode :*
* 14.1 = Public
* 14.2 = Private
* 14.3 = Group
* 14.4 = Inbox
*┆1️⃣5️⃣. Anti Delete :*
* 15.1 = Off
* 15.2 = Me (Owner Inbox)
* 15.3 = Public (Resend to Chat)
*┆1️⃣6️⃣. Auto Save Contacts :*
* 16.1 = Off
* 16.2 = Auto (Save with pushname)
* 16.3 = Ask (Prompt user)
*╰┉━┉━┉━┉━┉━┉━┉━☉*
> *ᴘᴏᴡᴇʀᴅ ʙʏ Qᴜᴇᴇɴ ʀᴀꜱʜᴜ ᴏꜰᴄ*`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: "https://i.ibb.co/KxQfHDgY/file-000000007cb871faa18f1d1238542f64.png" },
            caption: settingsText
        }, { quoted: mek });

        global.numberStore = global.numberStore || {};
        global.numberStore[sentMsg.key.id] = {
            "1.1": "set_alwaysoffline_on", "1.2": "set_alwaysoffline_off",
            "2.1": "set_alwaysonline_on", "2.2": "set_alwaysonline_off",
            "3.1": "set_autoviewstatus_on", "3.2": "set_autoviewstatus_off",
            "4.1": "set_autolikestatus_on", "4.2": "set_autolikestatus_off",
            "5.1": "set_autorecording_on", "5.2": "set_autorecording_off",
            "6.1": "set_autotyping_on", "6.2": "set_autotyping_off",
            "7.1": "set_autoreact_on", "7.2": "set_autoreact_off",
            "8.1": "set_antibot_on", "8.2": "set_antibot_off",
            "9.1": "set_antibad_on", "9.2": "set_antibad_off",
            "10.1": "set_antilink_on", "10.2": "set_antilink_off",
            "11.1": "set_readcmdonly_on", "11.2": "set_readcmdonly_off",
            "12.1": "set_autoread_on", "12.2": "set_autoread_off",
            "13.1": "set_autobio_on", "13.2": "set_autobio_off",
            "14.1": "set_work_public", "14.2": "set_work_private", "14.3": "set_work_groups", "14.4": "set_work_inbox",
            "15.1": "set_antidelete_off", "15.2": "set_antidelete_me", "15.3": "set_antidelete_public",
            "16.1": "set_autosave_off", "16.2": "set_autosave_auto", "16.3": "set_autosave_ask"
        };

    } catch (e) {
        console.log(e);
        reply(`*❌ Error occurred!*\n\n${e}`);
    }
});

// Helper function to update config and reply
const updateConfig = (key, val, reply) => {
    config[key] = val;
    reply(`✅ *${key}* has been set to *${val.toString().toUpperCase()}*`);
};

// --- Commands for Each Setting ---

// Always Offline
cmd({ pattern: "set_alwaysoffline_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ALWAYS_OFFLINE', 'true', reply); });
cmd({ pattern: "set_alwaysoffline_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ALWAYS_OFFLINE', 'false', reply); });

// Always Online
cmd({ pattern: "set_alwaysonline_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ALWAYS_ONLINE', 'true', reply); });
cmd({ pattern: "set_alwaysonline_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ALWAYS_ONLINE', 'false', reply); });

// Auto View Status
cmd({ pattern: "set_autoviewstatus_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_READ_STATUS', 'true', reply); });
cmd({ pattern: "set_autoviewstatus_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_READ_STATUS', 'false', reply); });

// Auto Like Status
cmd({ pattern: "set_autolikestatus_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_LIKE_STATUS', 'true', reply); });
cmd({ pattern: "set_autolikestatus_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_LIKE_STATUS', 'false', reply); });

// Auto Recording
cmd({ pattern: "set_autorecording_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_RECORDING', 'true', reply); });
cmd({ pattern: "set_autorecording_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_RECORDING', 'false', reply); });

// Auto Typing
cmd({ pattern: "set_autotyping_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_TYPING', 'true', reply); });
cmd({ pattern: "set_autotyping_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_TYPING', 'false', reply); });

// Auto React
cmd({ pattern: "set_autoreact_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_REACT', 'true', reply); });
cmd({ pattern: "set_autoreact_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_REACT', 'false', reply); });

// Anti Bot
cmd({ pattern: "set_antibot_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ANTI_BOT', 'true', reply); });
cmd({ pattern: "set_antibot_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ANTI_BOT', 'false', reply); });

// Anti Bad
cmd({ pattern: "set_antibad_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ANTI_BAD', 'true', reply); });
cmd({ pattern: "set_antibad_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ANTI_BAD', 'false', reply); });

// Anti Link
cmd({ pattern: "set_antilink_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ANTI_LINK', 'true', reply); });
cmd({ pattern: "set_antilink_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ANTI_LINK', 'false', reply); });

// Read Cmd Only
cmd({ pattern: "set_readcmdonly_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('READ_CMD_ONLY', 'true', reply); });
cmd({ pattern: "set_readcmdonly_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('READ_CMD_ONLY', 'false', reply); });

// Auto Read
cmd({ pattern: "set_autoread_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_READ', 'true', reply); });
cmd({ pattern: "set_autoread_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_READ', 'false', reply); });

// Auto Bio
cmd({ pattern: "set_autobio_on", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_BIO', 'true', reply); });
cmd({ pattern: "set_autobio_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_BIO', 'false', reply); });

// Work Type Options
cmd({ pattern: "set_work_public", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('WORK_TYPE', 'public', reply); });
cmd({ pattern: "set_work_private", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('WORK_TYPE', 'private', reply); });
cmd({ pattern: "set_work_groups", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('WORK_TYPE', 'groups', reply); });
cmd({ pattern: "set_work_inbox", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('WORK_TYPE', 'inbox', reply); });

// Anti Delete Options
cmd({ pattern: "set_antidelete_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ANTI_DELETE', 'off', reply); });
cmd({ pattern: "set_antidelete_me", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ANTI_DELETE', 'me', reply); });
cmd({ pattern: "set_antidelete_public", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('ANTI_DELETE', 'public', reply); });

// Auto Save Contacts Options
cmd({ pattern: "set_autosave_off", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_SAVE_CONTACTS', 'off', reply); });
cmd({ pattern: "set_autosave_auto", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_SAVE_CONTACTS', 'auto', reply); });
cmd({ pattern: "set_autosave_ask", dontAddCommandList: true, filename: __filename }, async (c, m, msg, { isOwner, reply }) => { if (isOwner) updateConfig('AUTO_SAVE_CONTACTS', 'ask', reply); });