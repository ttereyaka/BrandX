/* BRAND X — патч. Подключить в index.html ПОСЛЕ app.js: <script src="/profile.js"></script> */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = 'bx_orders';
  const SUB = { product: 'home', payment2: 'product', success: 'home', returns: 'profile' };
  let period = 'today';
  let serverOrders = [];
  let serverReturns = [];
  let tab = 'orders';

  /* ---- Telegram: цвета, safe area, кнопка «Назад» ---- */
  tg.ready();
  try { tg.setHeaderColor('#000000'); tg.setBackgroundColor('#000000'); } catch (e) {}
  document.querySelector('meta[name=viewport]').content = 'width=device-width, initial-scale=1, viewport-fit=cover';
  /* ---- к запросам на сервер добавляем подпись Telegram и фото товара ---- */
  const baseFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    if (opts && opts.body instanceof FormData && String(url).startsWith(SERVER_URL + '/api/')) {
      opts.body.append('initData', tg.initData || '');
      if (opts.body.has('order')) {
        try {
          const d = JSON.parse(opts.body.get('order'));
          if (currentProduct) d.image = currentProduct.image;
          opts.body.set('order', JSON.stringify(d));
        } catch (e) {}
      }
    }
    return baseFetch(url, opts);
  };
  let backTo = null;
  if (tg.BackButton) tg.BackButton.onClick(() => backTo && showScreen(backTo));

  /* ---- одна общая нижняя навигация ---- */
  document.querySelectorAll('.bottom-nav').forEach(n => n.remove());
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.innerHTML = `
    <button class="nav-btn" data-screen="home"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg><span>Главная</span></button>
    <button class="nav-btn" data-screen="profile"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg><span>Профиль</span></button>`;
  nav.addEventListener('click', e => { const b = e.target.closest('.nav-btn'); if (b) showScreen(b.dataset.screen); });
  document.body.appendChild(nav);

  /* ---- обёртка showScreen ---- */
  const baseShow = showScreen;
  window.showScreen = function (name) {
    if (name === 'success') saveLocalOrder();
    baseShow(name);
    const main = name === 'home' || name === 'profile';
    nav.style.display = main ? 'flex' : 'none';
    document.body.classList.toggle('has-nav', main);
    nav.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
    backTo = SUB[name] || null;
    if (tg.BackButton) backTo ? tg.BackButton.show() : tg.BackButton.hide();
    if (name === 'profile') { renderProfile(); refreshData(); }
  };

  /* ---- мелкие исправления app.js ---- */
  const baseOpen = openProduct;
  window.openProduct = function (id) {
    baseOpen(id);
    document.getElementById('sizes-hint').textContent = 'Выбери размер';
    document.getElementById('p-stock').className = 'stock-bar';
  };
  const baseRender = renderProducts;
  window.renderProducts = function () {
    baseRender();
    const n = getFilteredProducts().length, m = n % 10, h = n % 100;
    const w = (h > 10 && h < 15) ? 'товаров' : m === 1 ? 'товар' : (m > 1 && m < 5) ? 'товара' : 'товаров';
    document.getElementById('catalog-count').textContent = n + ' ' + w;
  };
  const basePay = goToPayment;
  window.goToPayment = function () {
    uploadedFiles = { product: null, qr: null };
    ['product', 'qr'].forEach(t => { document.getElementById('preview-' + t).style.display = 'none'; document.getElementById('file-' + t).value = ''; });
    document.getElementById('form-track').value = '';
    document.getElementById('form-pvz').value = '';
    const b = document.getElementById('btn-finish');
    b.innerHTML = '<span>ОТПРАВИТЬ ЗАЯВКУ</span><span class="btn-arrow">→</span>';
    basePay();
    ['form-product', 'form-size'].forEach(i => document.getElementById(i).readOnly = true);
    checkFormValid();
  };

  /* ---- заказы: сервер + локальная копия ---- */
  function saveLocalOrder() {
    try {
      const id = document.getElementById('success-order-id').textContent.replace('ЗАЯВКА #', '');
      if (!id) return;
      const list = JSON.parse(localStorage.getItem(LS) || '[]');
      if (list.some(o => o.orderId === id)) return;
      list.unshift({
        orderId: id, product: document.getElementById('success-product').textContent,
        size: document.getElementById('success-size').textContent, pvz: document.getElementById('success-pvz').textContent,
        price: currentProduct ? currentProduct.price : 0, image: currentProduct ? currentProduct.image : '',
        track: '', status: 'В обработке', date: new Date().toISOString()
      });
      localStorage.setItem(LS, JSON.stringify(list.slice(0, 100)));
    } catch (e) {}
  }
  async function loadOrders() {
    try {
      const r = await fetch(SERVER_URL + '/api/orders', { headers: { 'X-Init-Data': tg.initData || '' } });
      if (r.ok) { const d = await r.json(); serverOrders = Array.isArray(d) ? d : (d.orders || []); }
    } catch (e) {}
  }
  async function loadReturns() {
    try {
      const r = await fetch(SERVER_URL + '/api/returns', { headers: { 'X-Init-Data': tg.initData || '' } });
      if (r.ok) { const d = await r.json(); serverReturns = d.returns || []; }
    } catch (e) {}
  }
  function refreshData() {
    return Promise.all([loadOrders(), loadReturns()]).then(() => {
      if (document.getElementById('screen-profile').classList.contains('active')) renderProfile();
    });
  }
  function allOrders() {
    let local = [];
    try { local = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) {}
    const ids = new Set(serverOrders.map(o => o.orderId));
    return [...serverOrders, ...local.filter(o => !ids.has(o.orderId))];
  }
  const statusKey = s => { s = (s || '').toLowerCase(); return /оплач|paid/.test(s) ? 'paid' : /путь|отправ|ship/.test(s) ? 'shipped' : 'pending'; };
  const deliveryKey = s => { s = (s || '').toLowerCase(); return /avito|авито/.test(s) ? 'avito' : /яндекс|yandex/.test(s) ? 'yandex' : /сдэк|cdek/.test(s) ? 'cdek' : 'other'; };
  const fmt = d => { const x = new Date(d); if (isNaN(x)) return esc(d || ''); const p = n => String(n).padStart(2, '0'); return `${p(x.getHours())}:${p(x.getMinutes())} ${p(x.getDate())}.${p(x.getMonth() + 1)}.${String(x.getFullYear()).slice(2)}`; };

  /* ---- профиль ---- */
  function renderProfile() {
    const u = tg.initDataUnsafe?.user || {};
    document.getElementById('profile-name').textContent = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Гость';
    document.getElementById('profile-username').textContent = u.username ? '@' + u.username : 'без ника';
    if (u.photo_url) document.getElementById('profile-photo').src = u.photo_url;
    document.querySelector('.stat-card .stat-label').textContent = 'Сумма заказов';

    const st = document.getElementById('filter-status').value, dl = document.getElementById('filter-delivery').value;
    const all = allOrders();
    const today = new Date().toDateString();
    const inPeriod = all.filter(o => period === 'all' || new Date(o.date).toDateString() === today);
    const shown = inPeriod.filter(o => (st === 'all' || statusKey(o.status) === st) && (dl === 'all' || deliveryKey(o.pvz || o.delivery) === dl));

    const sum = inPeriod.reduce((a, o) => a + (Number(o.price) || 0), 0);
    const paid = inPeriod.filter(o => statusKey(o.status) === 'paid').length;
    document.querySelector('.balance-amount').textContent = sum.toLocaleString('ru-RU') + '₽';
    document.querySelector('.balance-sub').textContent = `оплачено ${paid} из ${inPeriod.length}`;
    document.querySelector('.balance-circle .progress').style.strokeDashoffset = 251.3 * (1 - (inPeriod.length ? paid / inPeriod.length : 0));
    document.getElementById('orders-count').textContent = inPeriod.length;

    document.querySelector('.orders-filters').style.display = tab === 'orders' ? '' : 'none';
    const list = document.getElementById('orders-list');
    if (tab === 'returns') return renderReturns(list);
    if (!shown.length) {
      list.innerHTML = `<div class="empty-orders"><p>${all.length ? 'Нет заказов по фильтрам' : 'Заказов пока нет'}</p><button class="btn-small" onclick="${all.length ? 'resetFilters()' : "showScreen('home')"}">${all.length ? 'Сбросить фильтры' : 'Перейти в каталог'}</button></div>`;
      return;
    }
    list.innerHTML = shown.map(o => `
      <div class="order-card">
        <img class="order-img" src="${esc(o.image || 'https://via.placeholder.com/200?text=X')}" alt="">
        <div class="order-info">
          <div class="order-name">${esc(o.product)}</div>
          <div class="order-row"><span>Размер</span><b>${esc(o.size)}</b></div>
          <div class="order-row"><span>Заказ</span><b>${esc(o.orderId)}</b></div>
          <div class="order-row"><span>Трек</span><b>${esc(o.track || '—')}</b></div>
          <div class="order-row"><span>Доставка</span><b>${esc(o.pvz || o.delivery || '—')}</b></div>
          <div class="order-row"><span>Дата</span><b>${fmt(o.date)}</b></div>
          <div class="order-foot"><span class="order-status s-${statusKey(o.status)}">${esc(o.status || 'В обработке')}</span>
            <button class="btn-small btn-return" data-id="${esc(o.orderId)}">Возврат</button></div>
        </div>
      </div>`).join('');
  }
  window.resetFilters = function () {
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-delivery').value = 'all';
    renderProfile();
  };
  document.querySelectorAll('.period-btn').forEach(b => b.addEventListener('click', () => {
    period = b.dataset.period;
    document.querySelectorAll('.period-btn').forEach(x => x.classList.toggle('active', x === b));
    renderProfile();
  }));
  ['filter-status', 'filter-delivery'].forEach(i => document.getElementById(i).addEventListener('change', renderProfile));
  document.getElementById('orders-list').addEventListener('click', e => {
    const b = e.target.closest('.btn-return'); if (!b) return;
    const o = allOrders().find(x => x.orderId === b.dataset.id); if (!o) return;
    showScreen('returns');
    document.getElementById('return-order-id').value = o.orderId;
    document.getElementById('return-product').value = o.product;
    checkReturnFormValid();
  });

  /* ---- загрузка каталога: индикатор и повтор при ошибке ---- */
  const grid = document.getElementById('product-grid');
  const msg = t => `<div style="grid-column:1/-1;text-align:center;padding:40px 16px;color:var(--text-muted)">${t}</div>`;
  if (!products.length) grid.innerHTML = msg('Загружаем каталог…');
  setTimeout(() => {
    if (products.length) return;
    grid.innerHTML = msg('Не удалось загрузить каталог<br><br><button class="btn-small" id="retry-load">Повторить</button>');
    document.getElementById('retry-load').onclick = () => { grid.innerHTML = msg('Загружаем каталог…'); loadData(); };
  }, 8000);

  showScreen(location.hash === '#returns' ? 'returns' : 'home');
  refreshData();

  /* ---- вкладки «Заказы / Возвраты» ---- */
  const retKey = s => { s = (s || '').toLowerCase(); return /одобр|заверш/.test(s) ? 'paid' : /отклон/.test(s) ? 'rejected' : 'pending'; };
  function renderReturns(list) {
    const btn = `<button class="btn-small btn-wide" onclick="showScreen('returns')">Оформить возврат</button>`;
    if (!serverReturns.length) {
      list.innerHTML = `<div class="empty-orders"><p>Возвратов пока нет</p>${btn}</div>`;
      return;
    }
    list.innerHTML = btn + serverReturns.map(r => `
      <div class="order-card">
        <div class="order-info">
          <div class="order-name">${esc(r.product)}</div>
          <div class="order-row"><span>Возврат</span><b>${esc(r.returnId)}</b></div>
          <div class="order-row"><span>Заказ</span><b>${esc(r.orderId)}</b></div>
          <div class="order-row"><span>Причина</span><b>${esc(r.reason)}</b></div>
          <div class="order-row"><span>Дата</span><b>${fmt(r.date)}</b></div>
          <div class="order-foot"><span class="order-status s-${retKey(r.status)}">${esc(r.status || 'На рассмотрении')}</span></div>
        </div>
      </div>`).join('');
  }
  const sw = document.createElement('div');
  sw.className = 'tab-switch';
  sw.innerHTML = '<button class="tab-btn active" data-tab="orders">Заказы</button><button class="tab-btn" data-tab="returns">Возвраты</button>';
  sw.addEventListener('click', e => {
    const b = e.target.closest('.tab-btn'); if (!b) return;
    tab = b.dataset.tab;
    sw.querySelectorAll('.tab-btn').forEach(x => x.classList.toggle('active', x === b));
    renderProfile();
  });
  document.querySelector('.orders-filters').before(sw);
})();
