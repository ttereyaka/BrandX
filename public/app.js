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
let uploadedFile = null;
let activeCategory = 'all';

// ID твоей таблицы и имя листа
const SHEET_ID = '108ikNY2z7iMQj2PE9AC_3ege2g1_-9naUpscKnjGONs';
const SHEET_NAME = 'Лист10';


brandx-production-c65f.up.railway.app;

async function loadData() {
  try {
    const url = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(SHEET_NAME)}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Не удалось загрузить таблицу');
    
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
    console.error('Ошибка загрузки данных:', error);
  }
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  window.scrollTo(0, 0);
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

  count.textContent = filtered.length + ' item' + (filtered.length !== 1 ? 's' : '');

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
      <div class="size-btn ${stock === 0 ? 'disabled' : ''}"
           data-size="${size}" data-stock="${stock}"
           onclick="selectSize(this)">
        <div class="size-name">${size}</div>
        <div class="size-stock">${stock > 0 ? stock + ' шт.' : 'Нет'}</div>
      </div>
    `).join('');
  }

  document.getElementById('p-stock').innerHTML = `
    <div class="stock-dot"></div>
    <div class="stock-text"><strong>Выбери размер</strong></div>
  `;
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
  stockEl.innerHTML = `
    <div class="stock-dot"></div>
    <div class="stock-text">
      <strong>Есть в наличии</strong>
      Осталось: ${stock} шт.
    </div>
  `;
  document.getElementById('btn-buy').disabled = false;
}

function goToPayment() {
  document.getElementById('pay-name').textContent = currentProduct.name;
  document.getElementById('pay-size').textContent = selectedSize;
  document.getElementById('pay-total').textContent = currentProduct.price.toLocaleString() + ' ₽';
  showScreen('payment1');
}

function handleFile(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    alert('Файл слишком большой. Максимум 10 МБ.');
    return;
  }

  uploadedFile = file;
  document.getElementById('file-name-display').textContent = file.name;
  document.getElementById('btn-finish').disabled = false;

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('file-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    document.getElementById('file-preview').style.display = 'block';
    document.getElementById('preview-img').style.display = 'none';
  }
}

const uploadZone = document.getElementById('upload-zone');
if (uploadZone) {
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = document.getElementById('file-input');
      input.files = e.dataTransfer.files;
      handleFile(input);
    }
  });
}

//  ОТПРАВКА ЗАКАЗА НА СЕРВЕР
async function finishOrder() {
  if (!uploadedFile) return;

  const btn = document.getElementById('btn-finish');
  btn.disabled = true;
  btn.innerHTML = '<span>ОТПРАВКА...</span>';

  const orderId = 'BX-' + Date.now().toString().slice(-6);

  const orderData = {
    orderId,
    product: currentProduct.name,
    size: selectedSize,
    price: currentProduct.price,
    userId: tg.initDataUnsafe?.user?.id,
    username: tg.initDataUnsafe?.user?.username,
    firstName: tg.initDataUnsafe?.user?.first_name
  };

  try {
    const formData = new FormData();
    formData.append('order', JSON.stringify(orderData));
    formData.append('attachment', uploadedFile);

    const response = await fetch(`${SERVER_URL}/api/order`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Ошибка сервера');

  } catch (err) {
    console.error('Ошибка отправки:', err);
    alert('Произошла ошибка. Попробуйте ещё раз.');
    btn.disabled = false;
    btn.innerHTML = '<span>ЗАВЕРШИТЬ ЗАКАЗ</span><span class="btn-arrow">→</span>';
    return;
  }

  document.getElementById('success-order-id').textContent = 'ORDER #' + orderId;
  showScreen('success');
}

// Мок для тестов в браузере
if (!window.Telegram) {
  window.Telegram = {
    WebApp: {
      expand: () => console.log('Telegram: expand()'),
      sendData: (data) => {
        console.log('📤 sendData:', data);
        alert('Данные отправлены боту:\n' + data);
      },
      initDataUnsafe: {
        user: { id: 123456789, username: 'test_user', first_name: 'Тест' }
      }
    }
  };
}

loadData();
