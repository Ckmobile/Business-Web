import { cmd } from '../command.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "ping",
    desc: "Check bot's response time.",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const start = Date.now();
        
        // බොට් එකේ ප්‍රතිචාර දැක්වීමේ වේගය පරීක්ෂා කිරීම
        const end = Date.now();
        const latency = end - start;

        return await reply(`*🚀 QUEEN RASHU MINI Bot Ping:* ${latency}ms`);
    } catch (e) {
        console.log(e);
        reply(`*❌ Error:* ${e}`);
    }
});
