// Определяем платформу
var platform = 'unknown';
var currentUser = null;

if (window.Telegram && window.Telegram.WebApp) {
  platform = 'telegram';
  var tg = window.Telegram.WebApp;
  tg.expand();
  currentUser = tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
}

if (window.vkBridge) {
  platform = 'vk';
  vkBridge.send('VKWebAppInit').then(function() {
    return vkBridge.send('VKWebAppGetUserInfo');
  }).then(function(data) {
    currentUser = {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.screen_name,
      photo_url: data.photo_100
    };
    loadData();
  }).catch(function() {
    loadData();
  });
}

var products = [];
var categories = [
  { id: 'all', name: 'Все' },
  { id: 'jackets', name: 'Верхняя одежда' },
  { id: 'hoodies', name: 'Худи' },
  { id: 'tshirts', name: 'Футболки' },
  { id: 'shirts', name: 'Рубашки' },
  { id: 'shorts', name: 'Шорты' },
  { id: 'accessories', name: 'Аксессуары' }
];

var currentProduct = null;
var selectedSize = null;
var uploadedFiles = { qr: null };
var returnFiles = { qr: null };
var activeCategory = 'all';
var allUserOrders = [];
var allUserReturns = [];

var SHEET_ID = '108ikNY2z7iMQj2PE9AC_3ege2g1_-9naUpscKnjGONs';
var SHEET_NAME = 'Лист10';
var SERVER_URL = 'https://brandx-production-c65f.up.railway.app';

if (window.location.hash === '#returns') {
  showScreen('returns');
}

function getAuthData() {
  var data = {};
  if (platform === 'telegram') {
    data.initData = tg.initData;
    data.platform = 'telegram';
  } else if (platform === 'vk') {
    data.platform = 'vk';
    data.userId = currentUser ? currentUser.id : null;
    data.username = currentUser ? currentUser.username : null;
    data.firstName = currentUser ? currentUser.first_name : null;
  }
  return data;
}

function getHeaders() {
  var authData = getAuthData();
  var headers = {};
  if (platform === 'telegram') headers['X-Init-Data'] = authData.initData;
  else if (platform === 'vk') {
    headers['X-Platform'] = 'vk';
    headers['X-User-Id'] = authData.userId;
  }
  return headers;
}

function loadData() {
  var url = 'https://opensheet.elk.sh/' + SHEET_ID + '/' + encodeURIComponent(SHEET_NAME);
  fetch(url)
    .then(function(response) {
      if (!response.ok) throw new Error('Ошибка');
      return response.json();
    })
    .then(function(rawData) {
      products = [];
      for (var i = 0; i < rawData.length; i++) {
        var row = rawData[i];
        var sizes = {};
        if (row.s !== undefined && row.s !== '') sizes['S'] = Number(row.s) || 0;
        if (row.m !== undefined && row.m !== '') sizes['M'] = Number(row.m) || 0;
        if (row.l !== undefined && row.l !== '') sizes['L'] = Number(row.l) || 0;
        if (row.xl !== undefined && row.xl !== '') sizes['XL'] = Number(row.xl) || 0;
        if (row['2xl'] !== undefined && row['2xl'] !== '') sizes['2XL'] = Number(row['2xl']) || 0;
        if (row['3xl'] !== undefined && row['3xl'] !== '') sizes['3XL'] = Number(row['3xl']) || 0;

        var isLimited = false;
        if (row.limited) {
          var limitedStr = String(row.limited).toLowerCase();
          if (limitedStr === 'да' || limitedStr === 'true') isLimited = true;
        }

        products.push({
          id: Number(row.id) || Math.random(),
          category: (row.category || 'other').toLowerCase().trim(),
          name: row.name || 'Без названия',
          price: Number(row.price) || 0,
          image: row.image || 'https://via.placeholder.com/400x400?text=No+Image',
          sizes: sizes,
          limited: isLimited
        });
      }
      renderCategories();
      renderProducts();
    })
    .catch(function(error) {
      console.error('Ошибка:', error);
    });
}

function showScreen(name) {
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
  var target = document.getElementById('screen-' + name);
  if (target) target.classList.add('active');

  var navBtns = document.querySelectorAll('.nav-btn');
  for (var i = 0; i < navBtns.length; i++) navBtns[i].classList.remove('active');
  var activeBtns = document.querySelectorAll('.nav-btn[onclick="showScreen(\'' + name + '\')"]');
  for (var i = 0; i < activeBtns.length; i++) activeBtns[i].classList.add('active');

  window.scrollTo(0, 0);

  if (name === 'profile') loadProfile();
  if (name === 'returns') loadReturnsDropdown();
}

function loadProfile() {
  if (currentUser) {
    var fullName = currentUser.first_name || 'Гость';
    if (currentUser.last_name) fullName += ' ' + currentUser.last_name;
    document.getElementById('profile-name').textContent = fullName;
    document.getElementById('profile-username').textContent = currentUser.username ? '@' + currentUser.username : 'Пользователь';
    document.getElementById('avatar-letter').textContent = (currentUser.first_name || 'X').charAt(0).toUpperCase();
  }
  loadUserData();
}

function loadUserData() {
  var headers = getHeaders();

  // Загружаем заказы
  fetch(SERVER_URL + '/api/orders', { headers: headers })
    .then(function(response) {
      if (!response.ok) throw new Error('Ошибка');
      return response.json();
    })
    .then(function(data) {
      allUserOrders = data.orders || [];
      document.getElementById('stat-ordered').textContent = allUserOrders.length;
      renderOrders(allUserOrders);
    })
    .catch(function(error) {
      console.error('Ошибка заказов:', error);
    });

  // Загружаем возвраты
  fetch(SERVER_URL + '/api/returns', { headers: headers })
    .then(function(response) {
      if (!response.ok) throw new Error('Ошибка');
      return response.json();
    })
    .then(function(data) {
      allUserReturns = data.returns || [];
      document.getElementById('stat-returns').textContent = allUserReturns.length;
      renderReturns(allUserReturns);
    })
    .catch(function(error) {
      console.error('Ошибка возвратов:', error);
    });
}

function renderOrders(orders) {
  var list = document.getElementById('orders-list');
  if (!list) return;

  if (orders.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>Заказов пока нет</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    var statusClass = 'status-' + o.status.toLowerCase().replace(/\s+/g, '');
    html += '<div class="order-card">';
    html += '<div class="order-header">';
    html += '<span class="order-id">#' + o.orderId + '</span>';
    html += '<span class="order-status ' + statusClass + '">' + o.status + '</span>';
    html += '</div>';
    html += '<div class="order-body">';
    if (o.image) html += '<img src="' + o.image + '" class="order-img">';
    else html += '<div class="order-img"></div>';
    html += '<div class="order-info">';
    html += '<div class="order-title">' + o.product + '</div>';
    html += '<div class="order-meta">Размер: ' + o.size + ' • ПВЗ: ' + o.pvz + '</div>';
    html += '<div class="order-meta">' + new Date(o.date).toLocaleDateString('ru-RU') + '</div>';
    html += '<div class="order-price">' + Number(o.price).toLocaleString() + ' ₽</div>';
    if (o.track) html += '<div class="order-track">🚚 Трек: ' + o.track + '</div>';
    html += '</div></div></div>';
  }
  list.innerHTML = html;
}

function renderReturns(returns) {
  var list = document.getElementById('returns-list');
  if (!list) return;

  if (returns.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>Возвратов пока нет</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < returns.length; i++) {
    var r = returns[i];
    var statusClass = 'status-' + r.status.toLowerCase().replace(/\s+/g, '');
    html += '<div class="order-card">';
    html += '<div class="order-header">';
    html += '<span class="order-id">#' + r.returnId + '</span>';
    html += '<span class="order-status ' + statusClass + '">' + r.status + '</span>';
    html += '</div>';
    html += '<div class="order-info" style="padding-left: 4px;">';
    html += '<div class="order-title">↩️ ' + r.product + '</div>';
    html += '<div class="order-meta">Заказ: #' + r.orderId + '</div>';
    html += '<div class="order-meta">' + r.reason + '</div>';
    html += '<div class="order-meta">' + new Date(r.date).toLocaleDateString('ru-RU') + '</div>';
    html += '</div></div>';
  }
  list.innerHTML = html;
}

function renderCategories() {
  var tabs = document.getElementById('category-tabs');
  var html = '';
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    var isActive = activeCategory === cat.id ? 'active' : '';
    html += '<div class="cat-tab ' + isActive + '" onclick="filterCategory(\'' + cat.id + '\')">' + cat.name + '</div>';
  }
  tabs.innerHTML = html;
}

function filterCategory(catId) {
  activeCategory = catId;
  renderCategories();
  renderProducts();
}

function getFilteredProducts() {
  var searchInput = document.getElementById('search-input');
  var search = searchInput ? searchInput.value.toLowerCase() : '';
  var filtered = [];
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var matchCat = activeCategory === 'all' || p.category === activeCategory;
    var matchSearch = p.name.toLowerCase().indexOf(search) !== -1;
    if (matchCat && matchSearch) filtered.push(p);
  }
  return filtered;
}

function renderProducts() {
  var filtered = getFilteredProducts();
  var grid = document.getElementById('product-grid');

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>Товары не найдены</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var p = filtered[i];
    var totalStock = 0;
    var sizeKeys = Object.keys(p.sizes);
    for (var j = 0; j < sizeKeys.length; j++) totalStock += p.sizes[sizeKeys[j]];

    var num = String(i + 1).padStart(2, '0');
    var stockText = sizeKeys.length > 1 ? sizeKeys.length + ' размера' : '1 размер';

    html += '<div class="prod-card" onclick="openProduct(' + p.id + ')">';
    html += '<div class="prod-img-wrap">';
    html += '<div class="prod-number">' + num + '</div>';
    html += '<img src="' + p.image + '" alt="' + p.name + '" loading="lazy">';
    html += '<div class="prod-badges">';
    html += '<span class="badge badge-stock">' + stockText + '</span>';
    if (p.limited) html += '<span class="badge badge-hit">ХИТ</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="prod-info">';
    html += '<div class="prod-name">' + p.name + '</div>';
    html += '<div class="prod-price">' + p.price.toLocaleString() + ' ₽</div>';
    if (totalStock > 0) html += '<div class="prod-stock"><span class="dot"></span>В наличии</div>';
    html += '</div></div>';
  }
  grid.innerHTML = html;
}

function filterProducts() { renderProducts(); }

function openProduct(id) {
  currentProduct = null;
  for (var i = 0; i < products.length; i++) {
    if (products[i].id === id) { currentProduct = products[i]; break; }
  }
  if (!currentProduct) return;

  selectedSize = null;
  var cat = { name: 'КАТЕГОРИЯ' };
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].id === currentProduct.category) { cat = categories[i]; break; }
  }

  var totalStock = 0;
  var sizeKeys = Object.keys(currentProduct.sizes);
  for (var i = 0; i < sizeKeys.length; i++) totalStock += currentProduct.sizes[sizeKeys[i]];

  document.getElementById('p-image').src = currentProduct.image;
  document.getElementById('p-brand').textContent = cat.name;
  document.getElementById('p-title').textContent = currentProduct.name;
  document.getElementById('p-price').textContent = currentProduct.price.toLocaleString() + ' ₽';

  var stockText = totalStock > 0 ? 'В наличии' : 'Нет в наличии';
  document.getElementById('stock-text').textContent = stockText;

  var sizesEl = document.getElementById('p-sizes');
  var sizesHtml = '';
  var sizes = Object.entries(currentProduct.sizes);

  if (sizes.length === 0) {
    sizesHtml = '<div class="size-btn disabled">Нет размеров</div>';
  } else {
    for (var i = 0; i < sizes.length; i++) {
      var size = sizes[i][0];
      var stock = sizes[i][1];
      var disabledClass = stock === 0 ? 'disabled' : '';
      var stockText = stock > 0 ? stock + ' шт.' : 'Нет';
      sizesHtml += '<div class="size-btn ' + disabledClass + '" data-size="' + size + '" data-stock="' + stock + '" onclick="selectSize(this)">';
      sizesHtml += '<div class="size-name">' + size + '</div>';
      sizesHtml += '<div class="size-stock">' + stockText + '</div>';
      sizesHtml += '</div>';
    }
  }
  sizesEl.innerHTML = sizesHtml;

  document.getElementById('btn-buy').disabled = true;
  showScreen('product');
}

function selectSize(el) {
  if (el.classList.contains('disabled')) return;
  var sizeBtns = document.querySelectorAll('.size-btn');
  for (var i = 0; i < sizeBtns.length; i++) sizeBtns[i].classList.remove('active');
  el.classList.add('active');
  selectedSize = el.dataset.size;
  document.getElementById('btn-buy').disabled = false;
}

function goToPayment() {
  document.getElementById('form-product').value = currentProduct.name;
  document.getElementById('form-size').value = selectedSize;
  showScreen('payment2');
}

function handleFile(input, type) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { alert('Файл слишком большой. Максимум 10 МБ.'); return; }
  uploadedFiles[type] = file;
  document.getElementById('preview-' + type).style.display = 'block';
  if (file.type.indexOf('image/') === 0) {
    var reader = new FileReader();
    reader.onload = function(e) { document.getElementById('preview-img-' + type).src = e.target.result; };
    reader.readAsDataURL(file);
  }
  checkFormValid();
}

function checkFormValid() {
  var pvz = document.getElementById('form-pvz').value.trim();
  var btn = document.getElementById('btn-finish');
  btn.disabled = !(pvz && uploadedFiles.qr);
}

function submitApplication() {
  var product = document.getElementById('form-product').value.trim();
  var pvz = document.getElementById('form-pvz').value.trim();
  var size = document.getElementById('form-size').value.trim();
  var track = document.getElementById('form-track').value.trim();

  if (!product || !pvz || !size || !uploadedFiles.qr) {
    alert('Заполните ПВЗ и загрузите QR-код'); return;
  }

  var btn = document.getElementById('btn-finish');
  btn.disabled = true;
  btn.innerHTML = 'ОТПРАВКА...';

  var orderId = 'BX-' + Date.now().toString().slice(-6);
  var authData = getAuthData();

  var orderData = {
    orderId: orderId, product: product, pvz: pvz, size: size,
    track: track || 'Не указан',
    price: currentProduct ? currentProduct.price : 0,
    image: currentProduct ? currentProduct.image : '',
    platform: platform,
    userId: authData.userId || (currentUser ? currentUser.id : null),
    username: authData.username || (currentUser ? currentUser.username : null),
    firstName: authData.firstName || (currentUser ? currentUser.first_name : null)
  };

  var formData = new FormData();
  formData.append('order', JSON.stringify(orderData));
  formData.append('qrCode', uploadedFiles.qr);
  if (platform === 'telegram') formData.append('initData', tg.initData);
  else if (platform === 'vk') {
    formData.append('platform', 'vk');
    formData.append('userId', currentUser ? currentUser.id : '');
  }

  fetch(SERVER_URL + '/api/order', { method: 'POST', body: formData })
    .then(function(response) {
      if (!response.ok) throw new Error('Ошибка');
      return response.json();
    })
    .then(function(data) {
      document.getElementById('success-order-id').textContent = 'ЗАЯВКА #' + orderId;
      document.getElementById('success-product').textContent = product;
      document.getElementById('success-size').textContent = size;
      document.getElementById('success-pvz').textContent = pvz;
      showScreen('success');
    })
    .catch(function(error) {
      alert('Произошла ошибка. Попробуйте ещё раз.');
      btn.disabled = false;
      btn.innerHTML = 'ОТПРАВИТЬ ЗАЯВКУ →';
    });
}

// === ВОЗВРАТЫ ===
function loadReturnsDropdown() {
  var select = document.getElementById('return-order-select');
  select.innerHTML = '<option value="">— Выберите заказ —</option>';

  if (allUserOrders.length === 0) {
    select.innerHTML += '<option value="" disabled>У вас нет заказов</option>';
    return;
  }

  for (var i = 0; i < allUserOrders.length; i++) {
    var o = allUserOrders[i];
    var option = document.createElement('option');
    option.value = o.orderId;
    option.textContent = '#' + o.orderId + ' — ' + o.product + ' (' + o.size + ')';
    option.dataset.image = o.image || '';
    option.dataset.product = o.product;
    option.dataset.size = o.size;
    option.dataset.pvz = o.pvz || '';
    select.appendChild(option);
  }
}

function fillReturnFromOrder() {
  var select = document.getElementById('return-order-select');
  var selected = select.options[select.selectedIndex];
  if (!selected || !selected.value) return;

  document.getElementById('return-product').value = selected.dataset.product || '';
  document.getElementById('return-address').value = selected.dataset.pvz || '';
  checkReturnFormValid();
}

function handleReturnFile(input, type) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { alert('Файл слишком большой. Максимум 10 МБ.'); return; }
  returnFiles[type] = file;
  document.getElementById('preview-return-' + type).style.display = 'block';
  if (file.type.indexOf('image/') === 0) {
    var reader = new FileReader();
    reader.onload = function(e) { document.getElementById('preview-img-return-' + type).src = e.target.result; };
    reader.readAsDataURL(file);
  }
  checkReturnFormValid();
}

function checkReturnFormValid() {
  var orderId = document.getElementById('return-order-select').value;
  var reason = document.getElementById('return-reason').value;
  var address = document.getElementById('return-address').value.trim();
  var phone = document.getElementById('return-phone').value.trim();
  var btn = document.getElementById('btn-return');
  btn.disabled = !(orderId && reason && address && phone && returnFiles.qr);
}

function submitReturn() {
  var orderId = document.getElementById('return-order-select').value;
  var reason = document.getElementById('return-reason').value;
  var address = document.getElementById('return-address').value.trim();
  var pickupCode = document.getElementById('return-pickup-code').value.trim();
  var phone = document.getElementById('return-phone').value.trim();
  var comment = document.getElementById('return-comment').value.trim();

  if (!orderId || !reason || !address || !phone || !returnFiles.qr) {
    alert('Заполните все обязательные поля и загрузите QR'); return;
  }

  // Находим заказ и берём из него данные
  var order = null;
  for (var i = 0; i < allUserOrders.length; i++) {
    if (allUserOrders[i].orderId === orderId) { order = allUserOrders[i]; break; }
  }
  if (!order) { alert('Заказ не найден'); return; }

  var btn = document.getElementById('btn-return');
  btn.disabled = true;
  btn.innerHTML = 'ОТПРАВКА...';

  var returnId = 'RET-' + Date.now().toString().slice(-6);
  var authData = getAuthData();

  var returnData = {
    returnId: returnId,
    orderId: orderId,
    product: order.product,
    image: order.image || '',
    reason: reason,
    address: address,
    pickupCode: pickupCode || 'Нет',
    phone: phone,
    comment: comment,
    platform: platform,
    userId: authData.userId || (currentUser ? currentUser.id : null),
    username: authData.username || (currentUser ? currentUser.username : null),
    firstName: authData.firstName || (currentUser ? currentUser.first_name : null)
  };

  var formData = new FormData();
  formData.append('return', JSON.stringify(returnData));
  formData.append('qrCode', returnFiles.qr);
  if (platform === 'telegram') formData.append('initData', tg.initData);
  else if (platform === 'vk') {
    formData.append('platform', 'vk');
    formData.append('userId', currentUser ? currentUser.id : '');
  }

  fetch(SERVER_URL + '/api/return', { method: 'POST', body: formData })
    .then(function(response) {
      if (!response.ok) throw new Error('Ошибка');
      return response.json();
    })
    .then(function(data) {
      alert('✅ Заявка на возврат #' + returnId + ' отправлена!');
      document.getElementById('return-order-select').value = '';
      document.getElementById('return-reason').value = '';
      document.getElementById('return-address').value = '';
      document.getElementById('return-pickup-code').value = '';
      document.getElementById('return-phone').value = '';
      document.getElementById('return-comment').value = '';
      document.getElementById('preview-return-qr').style.display = 'none';
      returnFiles = { qr: null };
      btn.disabled = true;
      btn.innerHTML = 'ОТПРАВИТЬ ЗАЯВКУ НА ВОЗВРАТ →';
      showScreen('profile');
    })
    .catch(function(error) {
      alert('Произошла ошибка. Попробуйте ещё раз.');
      btn.disabled = false;
      btn.innerHTML = 'ОТПРАВИТЬ ЗАЯВКУ НА ВОЗВРАТ →';
    });
}

document.addEventListener('DOMContentLoaded', function() {
  var formFields = ['form-pvz', 'form-track'];
  for (var i = 0; i < formFields.length; i++) {
    var el = document.getElementById(formFields[i]);
    if (el) el.addEventListener('input', checkFormValid);
  }
  var returnFields = ['return-order-select', 'return-reason', 'return-address', 'return-pickup-code', 'return-phone', 'return-comment'];
  for (var i = 0; i < returnFields.length; i++) {
    var el = document.getElementById(returnFields[i]);
    if (el) {
      el.addEventListener('input', checkReturnFormValid);
      el.addEventListener('change', checkReturnFormValid);
    }
  }
});

// Загружаем данные в любом случае
loadData();
