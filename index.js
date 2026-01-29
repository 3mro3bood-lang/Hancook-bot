const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs-extra');
const chalk = require('chalk');
const config = require('./config');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.creds, pino({ level: 'silent' })),
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // طلب كود الربط للرقم الجديد
    if (!client.authState.creds.registered) {
        let phoneNumber = config.pairingNumber.replace(/[^0-9]/g, '');
        console.log(chalk.yellow(`\n[!] جاري طلب كود الربط للرقم الجديد: ${phoneNumber}...`));
        
        setTimeout(async () => {
            try {
                let code = await client.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.black(chalk.bgGreen(`\n[+] كود الربط الخاص بك: ${code}\n`)));
            } catch (err) {
                console.log(chalk.red("\n[!] فشل طلب الكود. تأكد من استقرار الإنترنت وحذف مجلد session."));
            }
        }, 3000);
    }

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        } else if (connection === 'open') {
            console.log(chalk.green('\n[+] تم الاتصال بنجاح! هانكوك تحت أمرك يا نيغن. ✅\n'));
        }
    });

    client.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            const m = {
                id: mek.key.id,
                chat: mek.key.remoteJid,
                fromMe: mek.key.fromMe,
                pushName: mek.pushName,
                sender: (mek.key.participant || mek.key.remoteJid).split(':')[0] + "@s.whatsapp.net",
                body: mek.message.conversation || mek.message.extendedTextMessage?.text || "",
                quoted: mek,
                reply: (text, options) => client.sendMessage(mek.key.remoteJid, { text, ...options }, { quoted: mek })
            };
            require('./hancock')(client, m, chatUpdate);
        } catch (err) { console.log(err); }
    });
}

startBot();
