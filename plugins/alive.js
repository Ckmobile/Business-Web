import { cmd } from '../command.js';
import os from 'os';
import moment from 'moment';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "alive",
    desc: "Alive with image",
    category: "main",
    react: "🟢",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {

        const start = new Date().getTime();

        // 🕒 Uptime
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // 💾 RAM
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);

        // ⚙️ CPU
        const cpu = os.cpus()[0].model;

        // 🌍 Platform
        const platform = os.platform();

        // 📅 Time
        const time = moment().format("YYYY-MM-DD HH:mm:ss");

        const end = new Date().getTime();
        const ping = end - start;

        const caption = `
╭━━━〔 🤖 RASHU V5 BOT STATUS 〕━━━┈⊷
┃ 👑 *Bot is Alive & Running*
┃ 
┃ ⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s
┃ ⚡ Ping: ${ping} ms
┃ 📅 Time: ${time}
┃ 
┣━━━〔 💻 SYSTEM INFO 〕━━━┈⊷
┃ 🧠 RAM: ${usedMem}MB / ${totalMem}MB
┃ ⚙️ CPU: ${cpu}
┃ 🖥️ Platform: ${platform}
┃ 
┣━━━〔 🚀 STATUS 〕━━━┈⊷
┃ ✅ Speed: Fast
┃ 🔒 Mode: Public
┃ 💡 Version: 3.0 Premium
╰━━━━━━━━━━━━━━━━━━━┈⊷
* *Bot Deploy Link ⤵️*
> deploy.nipun.site 
* *Ofc Web Link ⤵️*
> Nipun.site
💗🪄 Rashu Bbh 🤭

> *ᴘᴏᴡᴇʀᴅ ʙʏ Qᴜᴇᴇɴ ʀᴀꜱʜᴜ ᴏꜰᴄ*`;

        // 🖼️ IMAGE SEND
        await conn.sendMessage(from, {
            image: { url: "https://i.ibb.co/KxQfHDgY/file-000000007cb871faa18f1d1238542f64.png" },
            caption: caption
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error!");
    }
});

cmd({
    pattern: "login",
    desc: "Get dashboard login URL and password",
    category: "main",
    react: "🔑",
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Only the Owner can use this command!");
        const botNumber = conn.user.id.split(':')[0].replace(/[^0-9]/g, '');
        const UserConfigModel = mongoose.models.UserConfig || mongoose.model('UserConfig', new mongoose.Schema({
            number: { type: String, required: true, unique: true },
            config: { type: Object, required: true }
        }));
        const dbEntry = await UserConfigModel.findOne({ number: botNumber });
        const sessionConfig = dbEntry ? dbEntry.config : {};
        const password = sessionConfig.DASHBOARD_PASSWORD || "No password generated yet";

        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        let loginUrl = redirectUri 
            ? redirectUri.replace('/auth/google/callback', '/login.html') 
            : 'https://v5-update-01-5751b71dd477.herokuapp.com/login.html';
        loginUrl = loginUrl.replace(/([^:]\/)\/+/g, "$1"); // fix double slashes

        const caption = `╭━━━〔 *QUEEN RASHU V5* 〕━━━┈⊷
┃ 🔑 *𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃 𝐋𝐎𝐆𝐈𝐍 𝐈𝐍𝐅𝐎*
╰━━━━━━━━━━━━━━━━━━━┈⊷

*┌────────────────────┐*
*├ 📱 𝐁𝐨𝐭 𝐍𝐮𝐦𝐛𝐞𝐫* : *${botNumber}*
*├ 🔑 𝐏𝐚𝐬𝐬𝐰𝐨𝐫𝐝* : *${password}*
*├ 🌐 𝐋𝐨𝐠𝐢𝐧 𝐔𝐑𝐋* : ${loginUrl}
*└────────────────────┘*

> *ᴘᴏᴡᴇʀᴅ ʙʏ Qᴜᴇᴇɴ ʀᴀꜱʜᴜ ᴏꜰᴄ*`;

        await conn.sendMessage(from, { text: caption }, { quoted: mek });
    } catch (e) {
        console.error(e);
        reply("❌ Error retrieving login info!");
    }
});

cmd({
    pattern: "setpwd",
    desc: "Set dashboard login password",
    category: "main",
    react: "🔑",
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner, q }) => {
    try {
        if (!isOwner) return reply("❌ Only the Owner can use this command!");
        if (!q) return reply("⚠️ Please provide a password!\nExample: `.setpwd MyNewPassword`");
        
        const newPassword = q.trim();
        if (newPassword.length < 4) return reply("⚠️ Password must be at least 4 characters long!");

        const botNumber = conn.user.id.split(':')[0].replace(/[^0-9]/g, '');
        const UserConfigModel = mongoose.models.UserConfig || mongoose.model('UserConfig', new mongoose.Schema({
            number: { type: String, required: true, unique: true },
            config: { type: Object, required: true }
        }));

        let dbEntry = await UserConfigModel.findOne({ number: botNumber });
        let sessionConfig = dbEntry ? dbEntry.config : {};
        sessionConfig.DASHBOARD_PASSWORD = newPassword;

        await UserConfigModel.findOneAndUpdate(
            { number: botNumber },
            { number: botNumber, config: sessionConfig, updatedAt: new Date() },
            { upsert: true }
        );

        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        let loginUrl = redirectUri 
            ? redirectUri.replace('/auth/google/callback', '/login.html') 
            : 'https://v5-update-01-5751b71dd477.herokuapp.com/login.html';
        loginUrl = loginUrl.replace(/([^:]\/)\/+/g, "$1");

        reply(`✅ *Success!* Dashboard password has been set to: *${newPassword}*\n\nLogin URL: ${loginUrl}`);
    } catch (e) {
        console.error(e);
        reply("❌ Error setting password!");
    }
});