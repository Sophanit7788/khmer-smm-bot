require('dotenv').config();
const express = require('express');
const TelegramBot = require("node-telegram-bot-api");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

// ===== CONFIG FROM .env (សុវត្ថិភាព 100% - គ្មាន key hard-code) =====
const TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const PANEL_API_KEY = process.env.PANEL_API_KEY;

if (!TOKEN || !SUPABASE_URL || !SUPABASE_KEY || !PANEL_API_KEY) {
    console.error("⚠️ ខ្វះតម្លៃនៅក្នុង .env! សូមបង្កើត .env និងដាក់តម្លៃឱ្យគ្រប់គ្រាន់។");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true }); // Polling mode (មិនត្រូវការ domain)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_ID = 5504306235;
const SUPPORT = "@MOUNH_sophanit";

const PANEL_API_URL = "https://morethanpanel.com/api/v2";
const MARKUP = 1.6; // ចំណេញ 60%
const ITEMS_PER_PAGE = 8;

const QR_PATH = path.join(__dirname, "aba_qr.png");

const userStates = {};

const mainKeyboard = {
    keyboard: [
        ["🛒 ទិញសេវា"],
        ["💰 សមតុល្យ", "💳 បញ្ចូលប្រាក់"],
        ["📦 ការបញ្ជាទិញរបស់ខ្ញុំ"]
    ],
    resize_keyboard: true
};

const supportButton = { text: "📞 ទាក់ទង Admin", url: `https://t.me/${SUPPORT.slice(1)}` };

const categories = ["TikTok", "Facebook", "YouTube"];

console.log("Bot is running...");

// Global error handling
process.on('unhandledRejection', reason => console.error('Unhandled Rejection:', reason));
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));

// =========================
// HELPER FUNCTIONS
// =========================
async function fetchPanelServices() {
    try {
        const res = await axios.post(PANEL_API_URL, new URLSearchParams({
            key: PANEL_API_KEY,
            action: "services"
        }));
        if (res.data.error) throw new Error(res.data.error);
        return res.data;
    } catch (err) {
        console.error("Panel services error:", err.message);
        return [];
    }
}

async function placePanelOrder(serviceId, link, quantity) {
    try {
        const res = await axios.post(PANEL_API_URL, new URLSearchParams({
            key: PANEL_API_KEY,
            action: "add",
            service: serviceId,
            link,
            quantity
        }));
        if (res.data.error) throw new Error(res.data.error);
        return res.data.order;
    } catch (err) {
        console.error("Panel order error:", err.message);
        throw err;
    }
}

async function getPanelOrderStatus(orderId) {
    try {
        const res = await axios.post(PANEL_API_URL, new URLSearchParams({
            key: PANEL_API_KEY,
            action: "status",
            order: orderId
        }));
        return res.data;
    } catch (err) {
        console.error("Panel status error:", err.message);
        return { error: "Failed" };
    }
}

async function showServicesPage(chatId, category, page = 0) {
    const services = await fetchPanelServices();
    const filtered = services.filter(s => s.category.toLowerCase().includes(category.toLowerCase()));

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

    if (pageItems.length === 0) {
        await bot.sendMessage(chatId, "❌ មិនមានសេវាក្នុងទំព័រនេះទេ", { reply_markup: mainKeyboard });
        delete userStates[chatId];
        return;
    }

    const buttons = pageItems.map(s => [{
        text: `${s.name.substring(0, 55)}${s.name.length > 55 ? "..." : ""} - $${(s.rate * MARKUP).toFixed(3)}`,
        callback_data: `svc_${s.service}`
    }]);

    const nav = [];
    if (page > 0) nav.push({ text: "⬅️ មុន", callback_data: `page_${category}_${page - 1}` });
    if (page < totalPages - 1) nav.push({ text: "បន្ទាប់ ➡️", callback_data: `page_${category}_${page + 1}` });
    if (nav.length) buttons.push(nav);

    buttons.push([supportButton]);

    await bot.sendMessage(chatId, `🛒 សេវាកម្ម ${category} (ទំព័រ ${page + 1}/${totalPages})`, {
        reply_markup: { inline_keyboard: buttons }
    });
}

// =========================
// WELCOME - ស្វាគមន៍អស្ចារ្យ ទំនើប វិជ្ជាជីវៈ
// =========================
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    await supabase.from("users").upsert({ telegram_id: chatId, balance: 0 });

    const welcome = `🌟 **សួស្តី! សូមស្វាគមន៍យ៉ាងកក់ក្តៅមកកាន់ Khmer SMM Pro** 🌟

ខ្ញុំជា bot ដែលត្រូវបានរចនាឡើងដោយយកចិត្តទុកដាក់ខ្ពស់បំផុត ដើម្បីផ្តល់សេវាកម្ម SMM ល្អបំផុត លឿនបំផុត និងសុវត្ថិភាពបំផុតនៅកម្ពុជា!

🔥 អ្វីដែលធ្វើឱ្យយើងខុសគេ
• តម្លៃថោកជាងទីផ្សារ (ចំណេញពីអ្នកប្រើ!)
• គុណភាពខ្ពស់ + មានការធានា
• គាំទ្រ 24/7 តាម @${SUPPORT.slice(1)}
• ប្រតិបត្តិការលឿន និងងាយស្រួល

ចុចខាងក្រោមដើម្បីចាប់ផ្តើមភ្លាមៗ! 🚀`;

    await bot.sendMessage(chatId, welcome, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [[supportButton]],
            keyboard: mainKeyboard.keyboard,
            resize_keyboard: true
        }
    });
});

// =========================
// MESSAGE HANDLER
// =========================
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text || text.startsWith("/")) return;

    // Cancel state if menu clicked
    if (userStates[chatId] && mainKeyboard.keyboard.flat().includes(text)) {
        delete userStates[chatId];
        await bot.sendMessage(chatId, "✅ បានបោះបង់ប្រតិបត្តិការមុន។", { reply_markup: mainKeyboard });
    }

    if (userStates[chatId]) {
        // Top-up amount
        if (userStates[chatId].step === "waiting_amount") {
            const amount = parseFloat(text);
            if (isNaN(amount) || amount < 1) {
                await bot.sendMessage(chatId, "❌ ចំនួនមិនត្រឹមត្រូវ! យ៉ាងតិច $1", { reply_markup: mainKeyboard });
                delete userStates[chatId];
                return;
            }

            const { data: payment } = await supabase.from("payments").insert({
                telegram_id: chatId,
                amount,
                status: "pending"
            }).select().single();

            const caption = `🙏 អរគុណច្រើន!

💲 ចំនួន: $${amount.toFixed(2)}
🔍 ស្កេន QR ខាងក្រោមដើម្បីបង់តាម ABA Pay

⏰ ប្រាក់នឹងចូលភ្លាមៗក្នុងរយៈពេលតិចជាង **១០ នាទី** បន្ទាប់ពី Admin អនុម័ត! 🚀
📸 ផ្ញើ Screenshot បង់ប្រាក់មក Admin

🆔 Payment ID: ${payment.id}`;

            if (fs.existsSync(QR_PATH)) {
                await bot.sendPhoto(chatId, QR_PATH, {
                    caption,
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: [[supportButton]] }
                });
            } else {
                await bot.sendMessage(chatId, caption + "\n\n⚠️ សូមទាក់ទង Admin ដើម្បីទទួល QR", {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: [[supportButton]] }
                });
            }

            await bot.sendMessage(ADMIN_ID, `💰 ការបញ្ចូលប្រាក់ថ្មី!\nUser: ${chatId}\nចំនួន: $${amount.toFixed(2)}\nPayment ID: ${payment.id}\n\nApprove: /approve ${payment.id}`);

            delete userStates[chatId];
            return;
        }

        // Buy flow: link → quantity
        if (userStates[chatId].step === "buy") {
            if (!userStates[chatId].link) {
                userStates[chatId].link = text;
                await bot.sendMessage(chatId, `🔗 Link: ${text}\n\n🔢 សូមបញ្ចូលចំនួន (min ${userStates[chatId].service.min} - max ${userStates[chatId].service.max}):`);
                return;
            }

            const quantity = parseInt(text);
            const service = userStates[chatId].service;
            if (isNaN(quantity) || quantity < service.min || quantity > service.max) {
                await bot.sendMessage(chatId, `❌ ចំនួនមិនត្រឹមត្រូវ!`);
                return;
            }

            const cost = (service.rate / 1000 * quantity * MARKUP).toFixed(2);

            const { data: user } = await supabase.from("users").select("*").eq("telegram_id", chatId).single();
            if ((user.balance || 0) < cost) {
                await bot.sendMessage(chatId, "❌ សមតុល្យមិនគ្រប់!", { reply_markup: mainKeyboard });
                delete userStates[chatId];
                return;
            }

            try {
                const panelOrderId = await placePanelOrder(service.service, userStates[chatId].link, quantity);

                await supabase.from("users").update({ balance: user.balance - cost }).eq("telegram_id", chatId);

                await supabase.from("orders").insert({
                    user_id: user.id,
                    service_name: service.name,
                    category: service.category,
                    link: userStates[chatId].link,
                    quantity,
                    cost,
                    panel_order_id: panelOrderId,
                    status: "processing"
                });

                await bot.sendMessage(chatId, `✅ បញ្ជាទិញជោគជ័យ!\nOrder ID: ${panelOrderId}\nQuantity: ${quantity}\nតម្លៃ: $${cost}\nកំពុងដំណើរការ 🚀`, { reply_markup: mainKeyboard });
            } catch (err) {
                await bot.sendMessage(chatId, "❌ បញ្ជាទិញបរាជ័យ! សូមព្យាយាមម្តងទៀត", { reply_markup: mainKeyboard });
            }

            delete userStates[chatId];
            return;
        }
    }

    // Menu handlers
    if (text === "🛒 ទិញសេវា") {
        const buttons = categories.map(c => [{ text: c, callback_data: `cat_${c}` }]);
        buttons.push([supportButton]);

        await bot.sendMessage(chatId, "🛒 សូមជ្រើសវេទិកា:", {
            reply_markup: { inline_keyboard: buttons }
        });
        return;
    }

    if (text === "💰 សមតុល្យ") {
        const { data } = await supabase.from("users").select("balance").eq("telegram_id", chatId).single();
        await bot.sendMessage(chatId, `💰 សមតុល្យបច្ចុប្បន្ន៖ $${(data?.balance || 0).toFixed(2)}`, { reply_markup: mainKeyboard });
        return;
    }

    if (text === "💳 បញ្ចូលប្រាក់") {
        userStates[chatId] = { step: "waiting_amount" };
        await bot.sendMessage(chatId, "💳 សូមបញ្ចូលចំនួនប្រាក់ដែលចង់បញ្ចូល (យ៉ាងតិច $1)", { reply_markup: { remove_keyboard: true } });
        return;
    }

    if (text === "📦 ការបញ្ជាទិញរបស់ខ្ញុំ") {
        const { data: user } = await supabase.from("users").select("id").eq("telegram_id", chatId).single();
        if (!user) return;

        const { data: orders } = await supabase.from("orders").select("*").eq("user_id", user.id).order("id", { ascending: false });

        if (!orders || orders.length === 0) {
            await bot.sendMessage(chatId, "📦 អ្នកមិនទាន់មានការបញ្ជាទិញនៅឡើយ", { reply_markup: mainKeyboard });
            return;
        }

        let message = "📦 ការបញ្ជាទិញរបស់អ្នក:\n\n";
        for (const o of orders) {
            let status = o.status;
            let extra = "";

            if (o.panel_order_id) {
                const panel = await getPanelOrderStatus(o.panel_order_id);
                if (panel.status) {
                    status = panel.status.toLowerCase();
                    if (status === "completed") status = "ជោគជ័យ";
                    if (status === "partial") extra = `\nនៅសល់: ${panel.remains || 0}`;
                    if (status === "canceled") status = "បរាជ័យ";

                    await supabase.from("orders").update({ status }).eq("id", o.id);
                }
            }

            message += `🆔 #${o.id} - ${o.category}\nសេវា: ${o.service_name}\nLink: ${o.link}\nQuantity: ${o.quantity}\nតម្លៃ: $${o.cost}\nស្ថានភាព: ${status}${extra}\n\n`;
        }

        await bot.sendMessage(chatId, message, { reply_markup: mainKeyboard });
        return;
    }
});

// =========================
// CALLBACK QUERY (with pagination)
// =========================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    await bot.answerCallbackQuery(query.id);

    if (data.startsWith("cat_")) {
        const cat = data.split("_")[1];
        userStates[chatId] = { type: "category", category: cat, page: 0 };
        await showServicesPage(chatId, cat, 0);
        return;
    }

    if (data.startsWith("page_")) {
        const parts = data.split("_");
        const cat = parts[1];
        const page = parseInt(parts[2]);
        if (userStates[chatId]?.category === cat) {
            userStates[chatId].page = page;
            await showServicesPage(chatId, cat, page);
        }
        return;
    }

    if (data.startsWith("svc_")) {
        const svcId = data.split("_")[1];
        const services = await fetchPanelServices();
        const service = services.find(s => s.service == svcId);

        if (!service) {
            await bot.sendMessage(chatId, "❌ រកមិនឃើញសេវា", { reply_markup: mainKeyboard });
            return;
        }

        const price = (service.rate * MARKUP).toFixed(3);

        await bot.sendMessage(chatId, `✅ អ្នកបានជ្រើស៖ ${service.name}\n💲 តម្លៃ: $${price}/1000\nMin: ${service.min} | Max: ${service.max}\n\n🔗 សូមផ្ញើ Link៖`, { reply_markup: { remove_keyboard: true } });

        userStates[chatId] = { step: "buy", service };
    }
});

// =========================
// ADMIN APPROVE PAYMENT
// =========================
bot.onText(/\/approve (.+)/, async (msg, match) => {
    if (msg.chat.id !== ADMIN_ID) return;

    const paymentId = parseInt(match[1]);

    const { data: payment, error: pErr } = await supabase.from("payments").select("*").eq("id", paymentId).single();
    if (pErr || !payment) {
        await bot.sendMessage(msg.chat.id, "❌ រកមិនឃើញ Payment ID នេះ");
        return;
    }

    if (payment.status === "approved") {
        await bot.sendMessage(msg.chat.id, "✅ បានអនុម័តរួចហើយ!");
        return;
    }

    const { data: user, error: uErr } = await supabase.from("users").select("*").eq("telegram_id", payment.telegram_id).single();
    if (uErr || !user) {
        await bot.sendMessage(msg.chat.id, "❌ រកមិនឃើញអ្នកប្រើប្រាស់");
        return;
    }

    const newBalance = (user.balance || 0) + payment.amount;

    const { error: balErr } = await supabase.from("users").update({ balance: newBalance }).eq("telegram_id", payment.telegram_id);
    if (balErr) {
        console.error("Balance update failed:", balErr);
        await bot.sendMessage(msg.chat.id, "❌ បរាជ័យក្នុងការបន្ថែមសមតុល្យ");
        return;
    }

    const { error: statErr } = await supabase.from("payments").update({ status: "approved" }).eq("id", paymentId);
    if (statErr) {
        await bot.sendMessage(msg.chat.id, "❌ បរាជ័យក្នុងការផ្លាស់ប្តូរស្ថានភាព");
        return;
    }

    await bot.sendMessage(msg.chat.id, `✅ បានអនុម័តជោគជ័យ Payment ID: ${paymentId}`);

    await bot.sendMessage(payment.telegram_id, 
`🎉 អបអរសាទរ! ប្រាក់ $${payment.amount.toFixed(2)} ចូលគណនីរួច!

💰 សមតុល្យថ្មី: $${newBalance.toFixed(2)}

🚀 ឥឡូវអ្នកអាចទិញសេវាកម្មបានភ្លាមៗ! 😊`, { reply_markup: mainKeyboard });
});

// Error logging to admin
bot.on("polling_error", (err) => {
    console.error("Polling error:", err);
    bot.sendMessage(ADMIN_ID, `🚨 Bot មានបញ្ហា: ${err.message || err}`);
});