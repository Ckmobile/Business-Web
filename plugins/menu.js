import config from '../config.js';
import { cmd, commands } from '../command.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "menu",
    desc: "Show the interactive command menu.",
    category: "main",
    react: "📑",
    filename: __filename
},
async (conn, mek, m, { from, pushname, reply }) => {
    try {
        let menuImg = "https://i.ibb.co/KxQfHDgY/file-000000007cb871faa18f1d1238542f64.png"

        let menuText = `*👋 Hᴇʟʟᴏ ${pushname}*

*ＱＵＥＥＮ   ＲＡＳＨＵ  Ｖ5   ＵＰＤＡＴＥ 🪄*

1️⃣ ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅꜱ
2️⃣ ɢʀᴏᴜᴘ ᴄᴏᴍᴍᴀɴᴅꜱ
3️⃣ ᴅᴏᴡɴʟᴏᴀᴅ ᴄᴏᴍᴍᴀɴᴅꜱ
4️⃣ ᴍᴀɪɴ ᴄᴏᴍᴍᴀɴᴅꜱ
5️⃣ ᴄᴏɴᴠᴇʀᴛ ᴄᴏᴍᴍᴀɴᴅꜱ
6️⃣ ꜱᴇᴀʀᴄʜ ᴄᴏᴍᴍᴀɴᴅꜱ
7️⃣ ᴄꜱᴏɴɢ ᴄᴏᴍᴍᴀɴᴅꜱ

*Reply with number Select Other Menu⤴️*

* *Bot Deploy Link ⤵️*
> deploy.nipun.site 
* *Ofc Web Link ⤵️*
> Nipun.site

> *ᴘᴏᴡᴇʀᴅ ʙʏ Qᴜᴇᴇɴ ʀᴀꜱʜᴜ ᴏꜰᴄ*`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: menuImg },
            caption: menuText
        }, { quoted: mek })

        const msgId = sentMsg.key.id

        const handler = async (update) => {
            try {
                const msg = update.messages[0]
                if (!msg.message?.extendedTextMessage) return

                const userReply = msg.message.extendedTextMessage.text.toLowerCase()
                const contextId = msg.message.extendedTextMessage.contextInfo?.stanzaId

                if (contextId !== msgId) return

                // 🛑 STOP
                if (userReply === "stop") {
                    conn.ev.off('messages.upsert', handler)
                    return await conn.sendMessage(from, { text: "🛑 Menu Closed" })
                }

                let selectedCategory = ""

                if (userReply === '1') selectedCategory = "owner"
                else if (userReply === '2') selectedCategory = "group"
                else if (userReply === '3') selectedCategory = "download"
                else if (userReply === '4') selectedCategory = "main"
                else if (userReply === '5') selectedCategory = "convert"
                else if (userReply === '6') selectedCategory = "search"
                else if (userReply === '7') selectedCategory = "csongst"

                if (!selectedCategory) return

                let cmdList = `📂 *RASHU ${selectedCategory.toUpperCase()} COMMANDS*\n\n`

                let found = false

                for (let i = 0; i < commands.length; i++) {
                    if (commands[i].category === selectedCategory) {
                        cmdList += `*🪄 𝐔𝐒𝐄 :* ${commands[i].pattern}\n`
                        cmdList += `*🖇️ 𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍 :* ${commands[i].desc || "No description"}\n\n`
                        found = true
                    }
                }

                if (found) {
                    await conn.sendMessage(from, {
                        image: { url: menuImg },
                        caption: cmdList
                    }, { quoted: msg })
                }

                // ❌ DO NOT OFF HERE (allow multi use)

            } catch (err) {
                console.log("Menu Handler Error:", err)
            }
        }

        conn.ev.on('messages.upsert', handler)

    } catch (e) {
        console.log(e)
        reply(`Error: ${e}`)
    }
})