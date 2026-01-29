const fs = require('fs-extra');
const config = require('./config');
const moment = require('moment-timezone');

// قاعدة بيانات بسيطة للمستخدمين وحالة البوت
let db = fs.existsSync('./database.json') ? JSON.parse(fs.readFileSync('./database.json')) : { users: {}, games: {}, settings: { status: true, elite: [], disabledGroups: [] } };

if (!db.settings) db.settings = { status: true, elite: [], disabledGroups: [] };
if (!db.settings.elite) db.settings.elite = [];
if (!db.settings.disabledGroups) db.settings.disabledGroups = [];

function saveDB() {
    fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

// مصفوفات الألعاب
const characters = ["لوفي", "ناروتو", "غوكو", "ليفاي", "إيرين", "زورو", "سانجي", "نامي", "روبين", "ايتاتشي", "مادارا", "كانيكي", "غون", "كيلوا", "هيسوكا", "هانكوك", "نيغن"];
const countries = { "🇸🇦": "السعودية", "🇾🇪": "اليمن", "🇪🇬": "مصر", "🇲🇦": "المغرب", "🇮🇶": "العراق", "🇰🇼": "الكويت", "🇯🇵": "اليابان" };
const emojiGames = { "🦁": "أسد", "🐯": "نمر", "🐘": "فيل", "🍎": "تفاح", "🍌": "موز", "🍓": "فراولة", "🥦": "بروكلي", "🥕": "جزر" };

// قالب الرسائل الموحد للفعاليات
const gameTemplate = (title, content) => `*┇⦏${title}⦐┇*\n\n*⊹‏⊱≼━━━━━⌬〔•❄️•〕⌬━━━━━≽⊰⊹*\n\n*❄️┇الجائزة 💵┇5k⤹*\n\n*❄️┇الكلمة┇${content}⤹*\n\n*❄️┇المقدم ┇${config.ownerName}⤹*\n\n*⊹‏⊱≼━━━━━⌬〔•❄️•〕⌬━━━━━≽⊰⊹*\n*『𝑭.𝑹.𝑺⊰❄️⊱𝑭𝑹𝑶𝑺𝑻』*`;

module.exports = async (client, m, chatUpdate) => {
    try {
        const body = m.body || '';
        const prefix = config.prefix;
        const sender = m.sender;
        const isOwner = config.owners.some(num => sender.startsWith(num.replace(/[^0-9]/g, ''))) || m.fromMe;
        
        // التحقق من الصلاحية (النخبة أو المالك)
        const isElite = db.settings.elite.includes(sender) || isOwner;

        // --- 1. الردود التلقائية (تعمل للجميع) ---
        if (body === 'نيغن') return m.reply('عمك نايم شتبي منه؟');
        if (body === 'هانكوك') return m.reply('يالبييه');
        if (body === 'احبك') return m.reply('حبك برص');

        // --- 2. نظام الصلاحيات الصارم ---
        const isCmd = body.startsWith(prefix);
        if (isCmd && !isElite && !isOwner) return m.reply(config.mess.notElite);
        if (!isElite && !isOwner) return;

        const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);

        if (!db.users[sender]) db.users[sender] = { name: m.pushName || 'مستخدم', balance: 500, bank: 0 };
        const user = db.users[sender];

        // --- 3. أوامر المالك (التحكم الكامل) ---
        if (isOwner) {
            switch (command) {
                case 'قف':
                    db.settings.status = false; saveDB();
                    return m.reply('🛑 تم إيقاف البوت بشكل كامل.');
                case 'شغ':
                    db.settings.status = true; saveDB();
                    return m.reply('✅ تم تشغيل البوت بنجاح.');
                case 'قفف':
                    if (!db.settings.disabledGroups.includes(m.chat)) {
                        db.settings.disabledGroups.push(m.chat); saveDB();
                        return m.reply('🛑 تم إيقاف البوت في هذه المجموعة.');
                    }
                    break;
                case 'شغغ':
                    db.settings.disabledGroups = db.settings.disabledGroups.filter(id => id !== m.chat);
                    saveDB(); return m.reply('✅ تم إعادة تشغيل البوت في المجموعة.');
                case 'ارفع':
                    let targetUp = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message.extendedTextMessage?.contextInfo?.participant;
                    if (!targetUp) return m.reply('❌ رد على رسالة الشخص أو منشن لرفعه.');
                    if (!db.settings.elite.includes(targetUp)) {
                        db.settings.elite.push(targetUp); saveDB();
                        m.reply(`✅ تم إعطاء الصلاحية لـ @${targetUp.split('@')[0]}`, null, { mentions: [targetUp] });
                    }
                    return;
                case 'خفض':
                    let targetDown = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message.extendedTextMessage?.contextInfo?.participant;
                    if (!targetDown) return m.reply('❌ رد على رسالة الشخص لسحب صلاحيته.');
                    db.settings.elite = db.settings.elite.filter(id => id !== targetDown); saveDB();
                    m.reply(`✅ تم سحب الصلاحية من @${targetDown.split('@')[0]}`, null, { mentions: [targetDown] });
                    return;
                case 'شحن':
                    let amountSh = parseInt(args[0]);
                    if (isNaN(amountSh)) return m.reply('❌ حدد المبلغ.');
                    user.bank += amountSh; saveDB();
                    return m.reply(`✅ تم شحن حسابك البنكي بـ ${amountSh}$`);
                case 'ادد':
                    let targetAdd = m.message.extendedTextMessage?.contextInfo?.participant;
                    let amountAdd = parseInt(args[0]);
                    if (!targetAdd || isNaN(amountAdd)) return m.reply('❌ رد على رسالة الشخص وحدد المبلغ.');
                    if (!db.users[targetAdd]) db.users[targetAdd] = { name: 'مستخدم', balance: 500, bank: 0 };
                    db.users[targetAdd].bank += amountAdd; saveDB();
                    return m.reply(`✅ تم شحن حساب @${targetAdd.split('@')[0]} بـ ${amountAdd}$`, null, { mentions: [targetAdd] });
            }
        } else if (isCmd && ['قف', 'شغ', 'ارفع', 'خفض', 'شحن', 'ادد'].includes(command)) {
            return m.reply(config.mess.owner);
        }

        // إيقاف الأوامر إذا كان البوت معطلاً (لغير المالك)
        if (!db.settings.status && !isOwner) return;
        if (db.settings.disabledGroups.includes(m.chat) && !isOwner) return;

        // --- 4. منطق الألعاب والفعاليات ---
        if (db.games[m.chat] && !isCmd) {
            const game = db.games[m.chat];
            if (body.trim() === game.answer) {
                user.balance += 5000;
                m.reply(`✅ كفوو! إجابة صحيحة. فاز @${sender.split('@')[0]} بـ 5k 💵\n\n*『𝑭.𝑹.𝑺⊰❄️⊱𝑭𝑹𝑶𝑺𝑻』*`, null, { mentions: [sender] });
                delete db.games[m.chat]; saveDB();
                return;
            }
        }

        // --- 5. الأوامر العامة ---
        switch (command) {
            case 'الاوامر':
            case 'help':
                let menu = `🐍 *أوامر ${config.botName}*\n• ${prefix}تر | .كت | .فك | .علم | .ح\n• ${prefix}رصيد | .حس | .انش | .ايداع | .سحب\n• ${prefix}اكس | .مشارك | .تخطي\n• ${prefix}متجر | .شراء | .ممتلكاتي\n• ${prefix}را | .اس | .زرف | .توب\n• ${prefix}المطور | .فحص`;
                if (isOwner) menu += `\n\n👑 *المالك:* .ارفع .خفض .قف .شغ .شحن .ادد`;
                m.reply(menu); break;

            case 'تر':
                const charTr = characters[Math.floor(Math.random() * characters.length)];
                db.games[m.chat] = { answer: charTr };
                await m.reply(gameTemplate('فعـ🃏ـالية الترتيب', charTr.split('').sort(() => Math.random() - 0.5).join(' ')));
                break;
            case 'كت':
                const charKt = characters[Math.floor(Math.random() * characters.length)];
                db.games[m.chat] = { answer: charKt };
                await m.reply(gameTemplate('فعـ🃏ـالية الكتابة', charKt));
                break;
            case 'فك':
                const charFk = characters[Math.floor(Math.random() * characters.length)];
                db.games[m.chat] = { answer: charFk.split('').join(' ') };
                await m.reply(gameTemplate('فعـ🃏ـالية التفكيك', charFk));
                break;
            case 'علم':
                const emojis = Object.keys(countries);
                const randEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                db.games[m.chat] = { answer: countries[randEmoji] };
                await m.reply(gameTemplate('فعـ🃏ـالية الاعلام', randEmoji));
                break;
            case 'ح':
                const emojiKeys = Object.keys(emojiGames);
                const randH = emojiKeys[Math.floor(Math.random() * emojiKeys.length)];
                db.games[m.chat] = { answer: emojiGames[randH] };
                await m.reply(gameTemplate('فعـ🃏ـالية احزر الايموجي', randH));
                break;
            case 'زرف':
                let victim = m.message.extendedTextMessage?.contextInfo?.participant;
                if (!victim || victim === sender) return m.reply('❌ رد على رسالة الضحية لزرفها.');
                if (Math.random() < 0.4) {
                    let stolen = Math.floor((db.users[victim]?.balance || 0) * 0.2);
                    if (stolen > 0) {
                        db.users[victim].balance -= stolen;
                        user.balance += stolen;
                        m.reply(`🥷 نجحت الزرفة! سرقت ${stolen}$ من @${victim.split('@')[0]}`, null, { mentions: [victim] });
                    } else m.reply('❌ الضحية مفلسة!');
                } else {
                    let fine = 500;
                    user.balance = Math.max(0, user.balance - fine);
                    m.reply(`👮 فشلت الزرفة! تم القبض عليك وتغريمك ${fine}$`);
                }
                saveDB();
                break;
            case 'حس':
            case 'رصيد':
                m.reply(`*🏦 حسابك البنكي*\n\n• الاسم: ${user.name}\n• البنك: ${user.bank}$\n• الكاش: ${user.balance}$\n\n*『𝑭.𝑹.𝑺⊰❄️⊱𝑭𝑹𝑶𝑺𝑻』*`);
                break;
            case 'المطور':
                m.reply(`👤 المطور: ${config.ownerName}\n📱 المالك: ${config.ownerNumber}`);
                break;
            case 'فحص':
                m.reply(`🚀 ${config.botName} متصل ومستقر بالبادئة \`${prefix}\``);
                break;
            case 'تخطي':
                if (db.games[m.chat]) {
                    delete db.games[m.chat];
                    m.reply('⏩ تم تخطي الفعالية الحالية.');
                }
                break;
        }
    } catch (err) { console.log(err); }
};
