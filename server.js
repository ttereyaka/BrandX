const express = require('express');
const multer = require('multer');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

// Настройка загрузки файлов
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
app.use(express.static('public'));

// Обработка заказа
app.post('/api/order', upload.single('attachment'), async (req, res) => {
  try {
    const order = JSON.parse(req.body.order);
    const filePath = req.file ? req.file.path : null;

    let message = `🛒 <b>Новый заказ #${order.orderId}</b>\n\n`;
    message += `📦 <b>Товар:</b> ${order.product}\n`;
    message += `📏 <b>Размер:</b> ${order.size}\n`;
    message += `💰 <b>Сумма:</b> ${order.price.toLocaleString()} ₽\n`;
    message += `👤 <b>Клиент:</b> @${order.username || 'неизвестно'}\n`;
    message += ` <b>Имя:</b> ${order.firstName || '—'}\n`;
    message += `🆔 <b>Telegram ID:</b> ${order.userId || '—'}`;

    if (filePath) {
      await bot.telegram.sendDocument(ADMIN_ID, {
        source: filePath
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
    console.error('Ошибка обработки заказа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Запуск бота
bot.launch();
console.log('✅ Telegram бот запущен');

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
