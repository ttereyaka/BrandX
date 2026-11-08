const express = require('express');
const multer = require('multer');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://brandx-production-c65f.up.railway.app';

const DATA_DIR = process.env.DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const STATUS = {
  pending: 'В обработке', paid: 'Оплачено', shipped: 'В пути',
  delivered: 'Получено', cancelled: 'Отменён'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^\w.\-]/g, '_');
    cb(null, `order_${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const RETURNS_FILE = path.join(DATA_DIR, 'returns.json');

const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return []; } };
const writeJson = (f, data) => {
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, f);
};
const loadOrders = () => readJson(ORDERS_FILE);
const saveOrders = d => writeJson(ORDERS_FILE, d);
const loadReturns = () => readJson(RETURNS_FILE);
const saveReturns = d => writeJson(RETURNS_FILE, d);

function verifyTelegramInitData(initData) {
  try {
    if (!initData || !BOT_TOKEN) return null;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    if (!hash) return null;
    const dataCheck = [...params.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const calc = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
    const a = Buffer.from(calc, 'hex'), b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const age = Date.now() / 1000 - Number(params.get('auth_date') || 0);
    if (age > 3 * 24 * 3600) return null;
    return JSON.parse(params.get('user'));
  } catch (e) { return null; }
}

const cleanup = files => files.filter(Boolean).forEach(f => fs.unlink(f, () => {}));

function getUserFromRequest(req) {
  if (req.body.initData) {
    const user = verifyTelegramInitData(req.body.initData);
    if (user) { user.platform = 'telegram'; return user; }
  }
  if (req.body.platform === 'vk' && req.body.userId) {
    return { id: req.body.userId, username: req.body.username, first_name: req.body.firstName, platform: 'vk' };
  }
  return null;
}

// === ОТПРАВКА ЗАКАЗА В TELEGRAM (с фото товара и QR) ===
app.post('/api/order', upload.single('qrCode'), async (req, res) => {
  const qrCode = req.file?.path;
  try {
    const order = JSON.parse(req.body.order);
    const user = getUserFromRequest(req);
    if (user) {
      order.userId = user.id;
      order.username = user.username;
      order.firstName = user.first_name;
      order.platform = user.platform;
    }

    const orders = loadOrders();
    orders.push({ ...order, date: new Date().toISOString(), status: 'pending' });
    saveOrders(orders);

    const platformIcon = order.platform === 'vk' ? '🔵' : '✈️';
    const platformName = order.platform === 'vk' ? 'VK' : 'Telegram';
    
    const caption = `${platformIcon} <b>НОВАЯ ЗАЯВКА #${esc(order.orderId)}</b> [${platformName}]\n\n` +
      `📦 <b>Товар:</b> ${esc(order.product)}\n` +
      `📏 <b>Размер:</b> ${esc(order.size)}\n` +
      `📍 <b>ПВЗ:</b> ${esc(order.pvz)}\n` +
      `🆔 <b>Трек:</b> ${esc(order.track || 'Не указан')}\n\n` +
      `👤 <b>Клиент:</b> @${esc(order.username || 'неизвестно')}\n` +
      `📱 <b>Имя:</b> ${esc(order.firstName || '—')}\n` +
      `🆔 <b>ID:</b> ${esc(order.userId || '—')}`;

    // 1. Сначала отправляем фото товара из таблицы
    if (order.image) {
      try {
        await bot.telegram.sendPhoto(ADMIN_ID, order.image, { 
          caption: `📸 Фото товара для заявки #${esc(order.orderId)}` 
        });
      } catch (e) { console.log('Не удалось отправить фото товара:', e.message); }
    }
    
    // 2. Затем отправляем QR-код клиента с полной информацией
    if (qrCode) {
      await bot.telegram.sendPhoto(ADMIN_ID, { source: qrCode }, { caption: caption, parse_mode: 'HTML' });
    } else {
      await bot.telegram.sendMessage(ADMIN_ID, caption, { parse_mode: 'HTML' });
    }

    res.json({ success: true, orderId: order.orderId });
  } catch (error) {
    console.error('Ошибка заказа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    cleanup([qrCode]);
  }
});

app.get('/api/orders', (req, res) => {
  let userId = null;
  const tgInitData = req.get('X-Init-Data');
  if (tgInitData) {
    const user = verifyTelegramInitData(tgInitData);
    if (user) userId = user.id;
  }
  if (!userId) return res.status(401).json({ error: 'Нет доступа' });
  
  const orders = loadOrders()
    .filter(o => Number(o.userId) === Number(userId))
    .reverse()
    .map(o => ({
      orderId: o.orderId, product: o.product, size: o.size, pvz: o.pvz,
      price: o.price, image: o.image || '', track: o.track === 'Не указан' ? '' : (o.track || ''),
      status: STATUS[o.status] || o.status, date: o.date
    }));
  res.json({ orders });
});

app.get('/api/returns', (req, res) => {
  let userId = null;
  const tgInitData = req.get('X-Init-Data');
  if (tgInitData) {
    const user = verifyTelegramInitData(tgInitData);
    if (user) userId = user.id;
  }
  if (!userId) return res.status(401).json({ error: 'Нет доступа' });
  
  const returns = loadReturns()
    .filter(r => Number(r.userId) === Number(userId))
    .reverse()
    .map(r => ({
      returnId: r.returnId, orderId: r.orderId, product: r.product,
      reason: r.reason, status: STATUS[r.status] || r.status, date: r.date
    }));
  res.json({ returns });
});

app.post('/api/return', upload.single('qrCode'), async (req, res) => {
  const qrCode = req.file?.path;
  try {
    const ret = JSON.parse(req.body.return);
    const user = getUserFromRequest(req);
    if (user) {
      ret.userId = user.id;
      ret.username = user.username;
      ret.firstName = user.first_name;
      ret.platform = user.platform;
    }

    const returns = loadReturns();
    returns.push({ ...ret, date: new Date().toISOString(), status: 'pending' });
    saveReturns(returns);

    const platformIcon = ret.platform === 'vk' ? '🔵' : '✈️';
    const platformName = ret.platform === 'vk' ? 'VK' : 'Telegram';
    
    const caption = `${platformIcon} <b>ВОЗВРАТ #${esc(ret.returnId)}</b> [${platformName}]\n\n` +
      `📦 <b>Товар:</b> ${esc(ret.product)}\n` +
      `🔢 <b>Заказ:</b> ${esc(ret.orderId)}\n` +
      `❓ <b>Причина:</b> ${esc(ret.reason)}\n\n` +
      `📍 <b>Адрес возврата:</b> ${esc(ret.address)}\n` +
      `🔑 <b>Код выдачи:</b> ${esc(ret.pickupCode || 'Нет')}\n` +
      `📱 <b>Телефон:</b> ${esc(ret.phone)}\n\n` +
      `👤 <b>Клиент:</b> @${esc(ret.username || 'неизвестно')}`;

    if (ret.image) {
      try {
        await bot.telegram.sendPhoto(ADMIN_ID, ret.image, { caption: `📸 Фото товара для возврата #${esc(ret.returnId)}` });
      } catch (e) {}
    }
    
    if (qrCode) {
      await bot.telegram.sendPhoto(ADMIN_ID, { source: qrCode }, { caption: caption, parse_mode: 'HTML' });
    } else {
      await bot.telegram.sendMessage(ADMIN_ID, caption, { parse_mode: 'HTML' });
    }

    res.json({ success: true, returnId: ret.returnId });
  } catch (error) {
    console.error('Ошибка возврата:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    cleanup([qrCode]);
  }
});

// === КОМАНДЫ БОТА ===
const isAdmin = ctx => String(ctx.from?.id) === String(ADMIN_ID);

bot.command('status', async ctx => {
  if (!isAdmin(ctx)) return;
  const [, id, st] = ctx.message.text.trim().split(/\s+/);
  if (!id || !STATUS[st]) return ctx.reply('Формат: /status BX-123456 paid');
  const orders = loadOrders();
  const o = orders.find(x => x.orderId === id);
  if (!o) return ctx.reply('Заказ не найден');
  o.status = st;
  saveOrders(orders);
  if (o.userId && o.platform === 'telegram') {
    try { await bot.telegram.sendMessage(o.userId, `📦 Заказ <b>#${esc(o.orderId)}</b>: ${STATUS[st]}`, { parse_mode: 'HTML' }); } catch (e) {}
  }
  ctx.reply(`✅ #${id} → ${STATUS[st]}`);
});

bot.command('track', async ctx => {
  if (!isAdmin(ctx)) return;
  const [, id, track] = ctx.message.text.trim().split(/\s+/);
  if (!id || !track) return ctx.reply('Формат: /track BX-123456 5130008315');
  const orders = loadOrders();
  const o = orders.find(x => x.orderId === id);
  if (!o) return ctx.reply('Заказ не найден');
  o.track = track;
  saveOrders(orders);
  if (o.userId && o.platform === 'telegram') {
    try { await bot.telegram.sendMessage(o.userId, `🚚 Заказ <b>#${esc(o.orderId)}</b>: трек-номер <code>${esc(track)}</code>`, { parse_mode: 'HTML' }); } catch (e) {}
  }
  ctx.reply(`✅ Трек для #${id} сохранён`);
});

const orderLine = o => `${o.status === 'paid' ? '✅' : o.status === 'shipped' ? '🚚' : '⏳'} #${esc(o.orderId)} — ${esc(o.product)} (${esc(o.size)}) — ${STATUS[o.status] || o.status}`;

bot.command('orders', async ctx => {
  const userOrders = loadOrders().filter(o => Number(o.userId) === ctx.from.id);
  if (!userOrders.length) {
    return ctx.reply('У вас пока нет заказов. 🛍', {
      reply_markup: { inline_keyboard: [[{ text: '🛍 Магазин', web_app: { url: WEB_APP_URL } }]] }
    });
  }
  const msg = `📦 <b>Ваши заказы (${userOrders.length})</b>\n\n` + userOrders.slice(-5).reverse().map(orderLine).join('\n');
  ctx.reply(msg, { parse_mode: 'HTML' });
});

bot.command('returns', async ctx => {
  const userReturns = loadReturns().filter(r => Number(r.userId) === ctx.from.id);
  if (!userReturns.length) {
    return ctx.reply('У вас пока нет заявок на возврат.', {
      reply_markup: { inline_keyboard: [[{ text: '↩️ Оформить возврат', web_app: { url: WEB_APP_URL + '#returns' } }]] }
    });
  }
  let msg = `↩️ <b>Ваши возвраты (${userReturns.length})</b>\n\n`;
  userReturns.slice(-5).reverse().forEach(r => {
    msg += `⏳ #${esc(r.returnId)} — ${esc(r.product)} — ${esc(r.reason)} — ${new Date(r.date).toLocaleDateString('ru-RU')}\n`;
  });
  ctx.reply(msg, { parse_mode: 'HTML' });
});

bot.command('support', ctx => ctx.reply('💬 Менеджер: @managerbrandx\nРаботаем с 10:00 до 22:00 МСК'));

bot.command('shop', ctx => {
  ctx.reply('Открываю магазин...', {
    reply_markup: { inline_keyboard: [[{ text: '🛍 Открыть', web_app: { url: WEB_APP_URL } }]] }
  });
});

bot.start(ctx => {
  ctx.reply('Добро пожаловать в <b>BRAND X</b>! 🛍\nЭксклюзивный streetwear.', {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛍 Открыть магазин', web_app: { url: WEB_APP_URL } }],
        [{ text: '📦 Мои заказы', callback_data: 'orders' }, { text: '↩️ Возвраты', web_app: { url: WEB_APP_URL + '#returns' } }],
        [{ text: '💬 Поддержка', callback_data: 'support' }]
      ]
    }
  });
});

bot.on('callback_query', async ctx => {
  const data = ctx.callbackQuery.data;
  if (data === 'orders') {
    const userOrders = loadOrders().filter(o => Number(o.userId) === ctx.from.id);
    if (!userOrders.length) await ctx.reply('Заказов пока нет.');
    else await ctx.reply(`📦 <b>История:</b>\n` + userOrders.slice(-3).reverse().map(orderLine).join('\n'), { parse_mode: 'HTML' });
  } else if (data === 'support') {
    await ctx.reply('Пишите менеджеру: @managerbrandx');
  }
  await ctx.answerCbQuery();
});

bot.launch().then(() => console.log('✅ Telegram бот запущен')).catch(e => console.error('Бот не запустился:', e));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
