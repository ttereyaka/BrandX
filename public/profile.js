// Конфигурация (должна совпадать с app.js)
const SERVER_URL = 'https://brandx-production-c65f.up.railway.app';

let allUserOrders = [];

// Инициализация профиля при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  initProfile();
  
  // Слушатели для фильтров
  document.getElementById('filter-status').addEventListener('change', applyFilters);
  document.getElementById('filter-delivery').addEventListener('change', applyFilters);
  
  // Слушатели для периодов
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      // Здесь можно добавить логику фильтрации по дате, пока показываем все
      applyFilters();
    });
  });
});

function initProfile() {
  const tg = window.Telegram.WebApp;
  const user = tg.initDataUnsafe?.user;
  
  if (user) {
    document.getElementById('profile-name').textContent = user.first_name || 'Гость';
    document.getElementById('profile-username').textContent = user.username ? `@${user.username}` : 'Пользователь';
    if (user.photo_url) {
      document.getElementById('profile-photo').src = user.photo_url;
    }
  }
  
  loadUserOrders();
}

async function loadUserOrders() {
  const list = document.getElementById('orders-list');
  list.innerHTML = '<div class="empty-orders"><p>Загрузка заказов...</p></div>';

  try {
    const tg = window.Telegram.WebApp;
    const response = await fetch(`${SERVER_URL}/api/orders`, {
      headers: { 'X-Init-Data': tg.initData }
    });
    
    if (!response.ok) throw new Error('Ошибка авторизации');
    const data = await response.json();
    allUserOrders = data.orders || [];
    
    updateStats(allUserOrders);
    renderOrders(allUserOrders);
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    list.innerHTML = `
      <div class="empty-orders">
        <p>Не удалось загрузить заказы</p>
        <button class="btn-small" onclick="loadUserOrders()">Повторить</button>
      </div>`;
  }
}

function updateStats(orders) {
  document.getElementById('orders-count').textContent = orders.length;
  
  const totalSum = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  const paidSum = orders.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered')
                        .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  
  document.querySelector('.balance-amount').textContent = `${paidSum.toLocaleString()}₽`;
  document.querySelector('.balance-sub').textContent = `оплачено ${paidSum.toLocaleString()} из ${totalSum.toLocaleString()}`;
  
  // Анимация кругового прогресс-бара
  const circle = document.querySelector('.balance-circle .progress');
  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  const percent = totalSum > 0 ? (paidSum / totalSum) : 0;
  const offset = circumference - (percent * circumference);
  
  circle.style.strokeDashoffset = offset;
}

function renderOrders(orders) {
  const list = document.getElementById('orders-list');
  
  if (orders.length === 0) {
    list.innerHTML = `
      <div class="empty-orders">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <p>Заказов не найдено</p>
        <button class="btn-small" onclick="showScreen('home')">Перейти в каталог</button>
      </div>`;
    return;
  }

  list.innerHTML = orders.map(o => {
    const statusClass = `status-${o.status.toLowerCase().replace(/\s+/g, '')}`;
    const trackHtml = o.track ? `<div class="order-track">🚚 Трек: <code>${o.track}</code></div>` : '';
    const imgHtml = o.image ? `<img src="${o.image}" class="order-img" onerror="this.style.display='none'">` : '<div class="order-img"></div>';
    
    return `
      <div class="order-card">
        <div class="order-header">
          <span class="order-id">#${o.orderId}</span>
          <span class="order-status ${statusClass}">${o.status}</span>
        </div>
        <div class="order-body">
          ${imgHtml}
          <div class="order-info">
            <div class="order-title">${o.product}</div>
            <div class="order-meta">Размер: ${o.size} • ПВЗ: ${o.pvz}</div>
            <div class="order-meta">${new Date(o.date).toLocaleDateString('ru-RU')}</div>
            <div class="order-price">${Number(o.price).toLocaleString()} ₽</div>
            ${trackHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function applyFilters() {
  const status = document.getElementById('filter-status').value;
  const delivery = document.getElementById('filter-delivery').value;

  let filtered = allUserOrders;
  
  if (status !== 'all') {
    const statusMap = { 'pending': 'В обработке', 'paid': 'Оплачено', 'shipped': 'В пути' };
    filtered = filtered.filter(o => o.status === statusMap[status]);
  }
  
  if (delivery !== 'all') {
    filtered = filtered.filter(o => o.pvz && o.pvz.toLowerCase().includes(delivery));
  }
  
  renderOrders(filtered);
}

function resetFilters() {
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-delivery').value = 'all';
  renderOrders(allUserOrders);
}

// Делаем функции доступными глобально для onclick в HTML
window.resetFilters = resetFilters;
window.showScreen = function(name) {
  // Простая реализация переключения экранов, если она не определена в app.js
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
    if (name === 'profile') initProfile();
  }
};
