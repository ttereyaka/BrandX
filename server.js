const express = require('express');
const multer = require('multer');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://brandx-production-c65f.up.railway.app';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `order_${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const ORDERS_FILE = path.join(__dirname, 'orders.json');
const RETURNS_FILE = path.join(__dirname, 'returns.json');

function loadOrders() {
  if (fs.existsSync(ORDERS_FILE)) {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  }
  return [];
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

function loadReturns() {
  if (fs.existsSync(RETURNS_FILE)) {
    return JSON.parse(fs.readFileSync(RETURNS_FILE, 'utf8'));
  }
  return [];
}

function saveReturns(returns) {
  fs.writeFileSync(RETURNS_FILE, JSON.stringify(returns, null, 2));
}

// Обработка заявки на заказ
app.post('/api/order', upload.fields([{ name: 'productPhoto' }, { name: 'qrCode' }]), async (req, res) => {
  try {
    const order = JSON.parse(req.body.order);
    const productPhoto = req.files['productPhoto']?.[0]?.path;
    const qrCode = req.files['qrCode']?.[0]?.path;

    const orders = loadOrders();
    orders.push({
      ...order,
      date: new Date().toISOString(),
      status: 'pending'
    });
    saveOrders(orders);

    let message = `🛒 <b>НОВАЯ ЗАЯВКА #${order.orderId}</b>\n\n`;
    message += `📦 <b>Товар:</b> ${order.product}\n`;
    message += `📏 <b>Размер:</b> ${order.size}\n`;
    message += `📍 <b>ПВЗ:</b> ${order.pvz}\n`;
    message += `🆔 <b>Трек-номер:</b> ${order.track || 'Не указан'}\n\n`;
    message += `👤 <b>Клиент:</b> @${order.username || 'неизвестно'}\n`;
    message += `📱 <b>Имя:</b> ${order.firstName || '—'}\n`;
    message += `🆔 <b>Telegram ID:</b> ${order.userId || '—'}`;

    if (productPhoto) {
      await bot.telegram.sendPhoto(ADMIN_ID, {
        source: productPhoto
      }, {
        caption: `📦 Фото товара для заявки #${order.orderId}`
      });
    }

    if (qrCode) {
      await bot.telegram.sendPhoto(ADMIN_ID, {
        source: qrCode
      }, {
        caption: message,
        parse_mode: 'HTML'
      });
    } else {
      await bot.telegram.sendMessage(ADMIN_ID, message, {
        parse_mode: 'HTML'
      });
    }

    res.json({ success: true, orderId: order.orderId });
  } catch (error) {
    console.error('Ошибка обработки заявки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обработка заявки на возврат
app.post('/api/return', upload.fields([{ name: 'productPhoto' }, { name: 'qrCode' }]), async (req, res) => {
  try {
    const returnData = JSON.parse(req.body.return);
    const productPhoto = req.files['productPhoto']?.[0]?.path;
    const qrCode = req.files['qrCode']?.[0]?.path;

    const returns = loadReturns();
    returns.push({
      ...returnData,
      date: new Date().toISOString(),
      status: 'pending'
    });
    saveReturns(returns);

    let message = `↩️ <b>НОВАЯ ЗАЯВКА НА ВОЗВРАТ #${returnData.returnId}</b>\n\n`;
    message += `📦 <b>Товар:</b> ${returnData.product}\n`;
    message += `🔢 <b>Номер заказа:</b> ${returnData.orderId}\n`;
    message += `❓ <b>Причина:</b> ${returnData.reason}\n\n`;
    message += `📍 <b>Адрес возврата:</b> ${returnData.address}\n`;
    message += `🔑 <b>Код выдачи:</b> ${returnData.pickupCode || 'Не указан'}\n`;
    message += `📱 <b>Телефон:</b> ${returnData.phone}\n\n`;
    message += `👤 <b>Клиент:</b> @${returnData.username || 'неизвестно'}\n`;
    message += `🆔 <b>Telegram ID:</b> ${returnData.userId || '—'}`;

    if (productPhoto) {
      await bot.telegram.sendPhoto(ADMIN_ID, {
        source: productPhoto
      }, {
        caption: `📸 Фото товара для возврата #${returnData.returnId}`
      });
    }

    if (qrCode) {
      await bot.telegram.sendPhoto(ADMIN_ID, {
        source: qrCode
      }, {
        caption: message,
        parse_mode: 'HTML'
      });
    } else {
      await bot.telegram.sendMessage(ADMIN_ID, message, {
        parse_mode: 'HTML'
      });
    }

    res.json({ success: true, returnId: returnData.returnId });
  } catch (error) {
    console.error('Ошибка обработки возврата:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Команды бота
bot.command('orders', async (ctx) => {
  const userId = ctx.from.id;
  const orders = loadOrders();
  const userOrders = orders.filter(o => o.userId === userId);

  if (userOrders.length === 0) {
    await ctx.reply('У вас пока нет заказов.\n\nНажмите кнопку "Магазин" чтобы сделать первый заказ! 🛍', {
      reply_markup: {
        inline_keyboard: [[
          { text: '🛍 Открыть магазин', web_app: { url: WEB_APP_URL } }
        ]]
      }
    });
    return;
  }

  let message = `📦 <b>Ваши заказы (${userOrders.length})</b>\n\n`;
  
  userOrders.slice(-5).reverse().forEach(order => {
    const date = new Date(order.date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const statusEmoji = order.status === 'pending' ? '⏳' : order.status === 'completed' ? '✅' : '❌';
    const statusText = order.status === 'pending' ? 'В обработке' : order.status === 'completed' ? 'Выполнен' : 'Отменён';
    
    message += `${statusEmoji} <b>Заказ #${order.orderId}</b>\n`;
    message += `📅 ${date}\n`;
    message += `📦 ${order.product}\n`;
    message += `📏 Размер: ${order.size}\n`;
    message += `📍 ПВЗ: ${order.pvz || '—'}\n`;
    message += `💰 ${order.price ? order.price.toLocaleString() + ' ₽' : 'Цена уточняется'}\n`;
    message += `📊 Статус: ${statusText}\n\n`;
  });

  await ctx.reply(message, { parse_mode: 'HTML' });
});

bot.command('returns', async (ctx) => {
  const userId = ctx.from.id;
  const returns = loadReturns();
  const userReturns = returns.filter(r => r.userId === userId);

  if (userReturns.length === 0) {
    await ctx.reply('У вас пока нет заявок на возврат.', {
      reply_markup: {
        inline_keyboard: [[
          { text: '↩️ Оформить возврат', web_app: { url: WEB_APP_URL + '#returns' } }
        ]]
      }
    });
    return;
  }

  let message = `↩️ <b>Ваши заявки на возврат (${userReturns.length})</b>\n\n`;
  
  userReturns.slice(-5).reverse().forEach(ret => {
    const date = new Date(ret.date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const statusEmoji = ret.status === 'pending' ? '⏳' : ret.status === 'approved' ? '✅' : '❌';
    const statusText = ret.status === 'pending' ? 'В обработке' : ret.status === 'approved' ? 'Одобрен' : 'Отклонён';
    
    message += `${statusEmoji} <b>Возврат #${ret.returnId}</b>\n`;
    message += `📅 ${date}\n`;
    message += `📦 ${ret.product}\n`;
    message += `❓ ${ret.reason}\n`;
    message += `📊 Статус: ${statusText}\n\n`;
  });

  await ctx.reply(message, { parse_mode: 'HTML' });
});

bot.command('support', (ctx) => {
  ctx.reply(
    '💬 <b>Связь с менеджером</b>\n\n' +
    'Для связи с менеджером напишите:\n' +
    '@ttereuyaka\n\n' +
    'Мы ответим в течение 30 минут в рабочее время (10:00 - 22:00 МСК)',
    { parse_mode: 'HTML' }
  );
});

bot.command('shop', (ctx) => {
  ctx.reply(
    'Открываю магазин...',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🛍 Открыть магазин', web_app: { url: WEB_APP_URL } }
        ]]
      }
    }
  );
});

bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать в <b>BRAND X</b>! 🛍\n\n' +
    'Мы продаём эксклюзивную streetwear одежду.\n\n' +
    'Используйте кнопки ниже для навигации:',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍 Открыть магазин', web_app: { url: WEB_APP_URL } }],
          [{ text: '📦 Мои заказы', callback_data: 'orders' }, { text: '↩️ Возвраты', web_app: { url: WEB_APP_URL + '#returns' } }],
          [{ text: '💬 Поддержка', callback_data: 'support' }]
        ]
      }
    }
  );
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (data === 'orders') {
    const userId = ctx.from.id;
    const orders = loadOrders();
    const userOrders = orders.filter(o => o.userId === userId);

    if (userOrders.length === 0) {
      await ctx.reply('У вас пока нет заказов. 🛍');
    } else {
      let message = `📦 <b>Ваши заказы (${userOrders.length})</b>\n\n`;
      userOrders.slice(-5).reverse().forEach(order => {
        const date = new Date(order.date).toLocaleDateString('ru-RU');
        message += `📦 #${order.orderId} — ${order.product} (${order.size}) — ${order.pvz || '—'} — ${date}\n`;
      });
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } else if (data === 'support') {
    await ctx.reply('💬 Напишите менеджеру: @ttereuyaka');
  }
  
  await ctx.answerCbQuery();
});

bot.launch();
console.log('✅ Telegram бот запущен');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
