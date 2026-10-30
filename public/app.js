const tg = window.Telegram.WebApp;
tg.expand();

let products = [];
let categories = [
  { id: 'all', name: 'Все' },
  { id: 'jackets', name: 'Верхняя одежда' },
  { id: 'hoodies', name: 'Худи' },
  { id: 'tshirts', name: 'Футболки' },
  { id: 'shirts', name: 'Рубашки' },
  { id: 'shorts', name: 'Шорты' },
  { id: 'accessories', name: 'Аксессуары' }
];

let currentProduct = null;
let selectedSize = null;
let uploadedFiles = { product: null, qr: null };
let returnFiles = { photo: null, qr: null };
let activeCategory = 'all';
let allUserOrders = [];

const SHEET_ID = '108ikNY2z7iMQj2PE9AC_3ege2g1_-9naUpscKnjGONs';
const SHEET_NAME = 'Лист10';
const SERVER_URL = 'https://brandx-production-c65f.up.railway.app';

if (window.location.hash === '#returns') {
  showScreen('returns');
}

async function loadData() {
  try {
    const url = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(SHEET_NAME)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Ошибка загрузки');
    
    const rawData = await response.json();
    products = rawData.map(row => {
      const sizes = {};
      if (row.s !== undefined && row.s !== '') sizes['S'] = Number(row.s) || 0;
      if (row.m !== undefined && row.m !== '') sizes['M'] = Number(row.m) || 0;
      if (row.l !== undefined && row.l !== '') sizes['L'] = Number(row.l) || 0;
      if (row.xl !== undefined && row.xl !== '') sizes['XL'] = Number(row.xl) || 0;
      if (row['2xl'] !== undefined && row['2xl'] !== '') sizes['2XL'] = Number(row['2xl']) || 0;
      if (row['3xl'] !== undefined && row['3xl'] !== '') sizes['3XL'] = Number(row['3xl']) || 0;

      return {
        id: Number(row.id) || Math.random(),
        category: row.category?.toLowerCase().trim() || 'other',
        name: row.name || 'Без названия',
        price: Number(row.price) || 0,
        image: row.image || 'https://via.placeholder.com/400x400?text=No+Image',
        sizes: sizes,
        limited: String(row.limited).toLowerCase() === 'да' || String(row.limited).toLowerCase() === 'true'
      };
    });
    renderCategories();
    renderProducts();
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.querySelectorAll(`.nav-btn[onclick="showScreen('${name}')"]`).forEach(btn => {
    btn.classList.add('active');
  });

  window.scrollTo(0, 0);

  if (name === 'profile') {
    loadProfile();
  }
}

function loadProfile() {
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
  list.innerHTML = '<div class="empty-orders"><p>Загрузка...</p></div>';

  try {
    const response = await fetch(`${SERVER_URL}/api/orders`, {
      headers: { 'X-Init-Data': tg.initData }
    });
    
    if (!response.ok) throw new Error('Ошибка');
    const data = await response.json();
    allUserOrders = data.orders || [];
    
    document.getElementById('orders-count').textContent = allUserOrders.length;
    
    const totalSum = allUserOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const paidSum = allUserOrders.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered')
      .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    
    document.getElementById('balance-amount').textContent = `${paidSum.toLocaleString()}₽`;
    document.getElementById('balance-sub').textContent = `оплачено ${paidSum.toLocaleString()} из ${totalSum.toLocaleString()}`;
    
    const circle = document.querySelector('.balance-circle .progress');
    if (circle) {
      const percent = totalSum > 0 ? (paidSum / totalSum) : 0;
      const offset = 251.2 - (percent * 251.2);
      circle.style.strokeDashoffset = offset;
    }
    
    renderOrders(allUserOrders);
  } catch (error) {
    console.error('Ошибка:', error);
    list.innerHTML = '<div class="empty-orders"><p>Не удалось загрузить заказы</p></div>';
  }
}

function renderOrders(orders) {
  const list = document.getElementById('orders-list');
  
  if (orders.length === 0) {
    list.innerHTML = '<div class="empty-orders"><p>Заказов пока нет</p></div>';
    return;
  }

  list.innerHTML = orders.map(o => {
    const statusClass = `status-${o.status.toLowerCase().replace(/\s+/g, '')}`;
    const trackHtml = o.track ? `<div class="order-track">🚚 Трек: ${o.track}</div>` : '';
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

function renderCategories() {
  const tabs = document.getElementById('category-tabs');
  tabs.innerHTML = `
    <div class="cat-tab ${activeCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all')">Все</div>
    ${categories.filter(c => c.id !== 'all').map(c => `
      <div class="cat-tab ${activeCategory === c.id ? 'active' : ''}" onclick="filterCategory('${c.id}')">${c.name}</div>
    `).join('')}
  `;
}

function filterCategory(catId) {
  activeCategory = catId;
  renderCategories();
  renderProducts();
}

function getFilteredProducts() {
  const search = document.getElementById('search-input')?.value?.toLowerCase() || '';
  return products.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const grid = document.getElementById('product-grid');
  const count = document.getElementById('catalog-count');
  count.textContent = filtered.length + ' товаров';

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Товары не найдены</div>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const totalStock = Object.values(p.sizes).reduce((a, b) => a + b, 0);
    return `
      <div class="prod-card" onclick="openProduct(${p.id})">
        <div class="prod-img-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'">
          <div class="prod-badges">
            ${totalStock > 0 ? '<span class="badge badge-stock">В НАЛИЧИИ</span>' : ''}
            ${p.limited ? '<span class="badge badge-limited">LIMITED</span>' : ''}
          </div>
        </div>
        <div class="prod-info">
          <div class="prod-name">${p.name}</div>
          <div class="prod-price">${p.price.toLocaleString()} ₽</div>
        </div>
      </div>
    `;
  }).join('');
}

function filterProducts() { renderProducts(); }

function openProduct(id) {
  currentProduct = products.find(p => p.id === id);
  if (!currentProduct) return;
  
  selectedSize = null;
  const cat = categories.find(c => c.id === currentProduct.category) || { name: 'КАТЕГОРИЯ' };
  const totalStock = Object.values(currentProduct.sizes).reduce((a, b) => a + b, 0);

  document.getElementById('p-image').src = currentProduct.image;
  document.getElementById('p-category').textContent = cat.name.toUpperCase();
  document.getElementById('p-title').textContent = currentProduct.name;
  document.getElementById('p-price').textContent = currentProduct.price.toLocaleString() + ' ₽';

  document.getElementById('p-badges').innerHTML = `
    ${totalStock > 0 ? '<span class="badge badge-stock">В НАЛИЧИИ</span>' : ''}
    ${currentProduct.limited ? '<span class="badge badge-limited">LIMITED EDITION</span>' : ''}
  `;

  const sizesEl = document.getElementById('p-sizes');
  const sizes = Object.entries(currentProduct.sizes);
  
  if (sizes.length === 0) {
    sizesEl.innerHTML = '<div class="size-btn disabled">Нет размеров</div>';
  } else {
    sizesEl.innerHTML = sizes.map(([size, stock]) => `
      <div class="size-btn ${stock === 0 ? 'disabled' : ''}" data-size="${size}" data-stock="${stock}" onclick="selectSize(this)">
        <div class="size-name">${size}</div>
        <div class="size-stock">${stock > 0 ? stock + ' шт.' : 'Нет'}</div>
      </div>
    `).join('');
  }

  document.getElementById('p-stock').innerHTML = `<div class="stock-dot"></div><div class="stock-text"><strong>Выбери размер</strong></div>`;
  document.getElementById('btn-buy').disabled = true;
  showScreen('product');
}

function selectSize(el) {
  if (el.classList.contains('disabled')) return;
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  selectedSize = el.dataset.size;
  const stock = el.dataset.stock;

  document.getElementById('sizes-hint').textContent = `Выбран: ${selectedSize}`;
  const stockEl = document.getElementById('p-stock');
  stockEl.className = 'stock-bar';
  stockEl.innerHTML = `<div class="stock-dot"></div><div class="stock-text"><strong>Есть в наличии</strong>Осталось: ${stock} шт.</div>`;
  document.getElementById('btn-buy').disabled = false;
}

function goToPayment() {
  document.getElementById('form-product').value = currentProduct.name;
  document.getElementById('form-size').value = selectedSize;
  showScreen('payment2');
}

function handleFile(input, type) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { alert('Файл слишком большой. Максимум 10 МБ.'); return; }

  uploadedFiles[type] = file;
  document.getElementById(`preview-${type}`).style.display = 'block';

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => { document.getElementById(`preview-img-${type}`).src = e.target.result; };
    reader.readAsDataURL(file);
  }
  checkFormValid();
}

function checkFormValid() {
  const product = document.getElementById('form-product').value.trim();
  const pvz = document.getElementById('form-pvz').value.trim();
  const size = document.getElementById('form-size').value.trim();
  const btn = document.getElementById('btn-finish');
  btn.disabled = !(product && pvz && size && uploadedFiles.product && uploadedFiles.qr);
}

async function submitApplication() {
  const product = document.getElementById('form-product').value.trim();
  const pvz = document.getElementById('form-pvz').value.trim();
  const size = document.getElementById('form-size').value.trim();
  const track = document.getElementById('form-track').value.trim();

  if (!product || !pvz || !size || !uploadedFiles.product || !uploadedFiles.qr) {
    alert('Заполните все поля и загрузите файлы'); return;
  }

  const btn = document.getElementById('btn-finish');
  btn.disabled = true; btn.innerHTML = '<span>ОТПРАВКА...</span>';
  const orderId = 'BX-' + Date.now().toString().slice(-6);

  const orderData = {
    orderId, product, pvz, size, track: track || 'Не указан',
    price: currentProduct ? currentProduct.price : 0,
    initData: tg.initData
  };

  try {
    const formData = new FormData();
    formData.append('order', JSON.stringify(orderData));
    formData.append('productPhoto', uploadedFiles.product);
    formData.append('qrCode', uploadedFiles.qr);
    formData.append('initData', tg.initData);

    const response = await fetch(`${SERVER_URL}/api/order`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Ошибка сервера');

    document.getElementById('success-order-id').textContent = 'ЗАЯВКА #' + orderId;
    document.getElementById('success-product').textContent = product;
    document.getElementById('success-size').textContent = size;
    document.getElementById('success-pvz').textContent = pvz;
    showScreen('success');
  } catch (err) {
    console.error('Ошибка:', err);
    alert('Произошла ошибка. Попробуйте ещё раз.');
    btn.disabled = false; btn.innerHTML = '<span>ОТПРАВИТЬ ЗАЯВКУ</span><span class="btn-arrow">→</span>';
  }
}

function handleReturnFile(input, type) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { alert('Файл слишком большой. Максимум 10 МБ.'); return; }

  returnFiles[type] = file;
  document.getElementById(`preview-return-${type}`).style.display = 'block';

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => { document.getElementById(`preview-img-return-${type}`).src = e.target.result; };
    reader.readAsDataURL(file);
  }
  checkReturnFormValid();
}

function checkReturnFormValid() {
  const orderId = document.getElementById('return-order-id').value.trim();
  const product = document.getElementById('return-product').value.trim();
  const reason = document.getElementById('return-reason').value;
  const address = document.getElementById('return-address').value.trim();
  const phone = document.getElementById('return-phone').value.trim();
  const btn = document.getElementById('btn-return');
  btn.disabled = !(orderId && product && reason && address && phone && returnFiles.photo && returnFiles.qr);
}

async function submitReturn() {
  const orderId = document.getElementById('return-order-id').value.trim();
  const product = document.getElementById('return-product').value.trim();
  const reason = document.getElementById('return-reason').value;
  const address = document.getElementById('return-address').value.trim();
  const pickupCode = document.getElementById('return-pickup-code').value.trim();
  const phone = document.getElementById('return-phone').value.trim();

  if (!orderId || !product || !reason || !address || !phone || !returnFiles.photo || !returnFiles.qr) {
    alert('Заполните все поля и загрузите файлы'); return;
  }

  const btn = document.getElementById('btn-return');
  btn.disabled = true; btn.innerHTML = '<span>ОТПРАВКА...</span>';
  const returnId = 'RET-' + Date.now().toString().slice(-6);

  const returnData = {
    returnId, orderId, product, reason, address,
    pickupCode: pickupCode || 'Не указан', phone,
    initData: tg.initData
  };

  try {
    const formData = new FormData();
    formData.append('return', JSON.stringify(returnData));
    formData.append('productPhoto', returnFiles.photo);
    formData.append('qrCode', returnFiles.qr);
    formData.append('initData', tg.initData);

    const response = await fetch(`${SERVER_URL}/api/return`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Ошибка сервера');

    alert(`✅ Заявка на возврат #${returnId} отправлена!`);
    
    ['return-order-id', 'return-product', 'return-reason', 'return-address', 'return-pickup-code', 'return-phone'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('preview-return-photo').style.display = 'none';
    document.getElementById('preview-return-qr').style.display = 'none';
    returnFiles = { photo: null, qr: null };
    btn.disabled = true; btn.innerHTML = '<span>ОТПРАВИТЬ ЗАЯВКУ НА ВОЗВРАТ</span><span class="btn-arrow">→</span>';
    showScreen('home');
  } catch (err) {
    console.error('Ошибка:', err);
    alert('Произошла ошибка. Попробуйте ещё раз.');
    btn.disabled = false; btn.innerHTML = '<span>ОТПРАВИТЬ ЗАЯВКУ НА ВОЗВРАТ</span><span class="btn-arrow">→</span>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ['form-product', 'form-pvz', 'form-size', 'form-track'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', checkFormValid);
  });

  ['return-order-id', 'return-product', 'return-reason', 'return-address', 'return-pickup-code', 'return-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', checkReturnFormValid);
      el.addEventListener('change', checkReturnFormValid);
    }
  });
});

loadData();
