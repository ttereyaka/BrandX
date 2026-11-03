// Получаем объект Telegram Web App
var tg = window.Telegram.WebApp;
tg.expand();

// Массив товаров (загружается из Google Таблицы)
var products = [];

// Категории товаров
var categories = [
  { id: 'all', name: 'Все' },
  { id: 'jackets', name: 'Верхняя одежда' },
  { id: 'hoodies', name: 'Худи' },
  { id: 'tshirts', name: 'Футболки' },
  { id: 'shirts', name: 'Рубашки' },
  { id: 'shorts', name: 'Шорты' },
  { id: 'accessories', name: 'Аксессуары' }
];

// Текущий выбранный товар
var currentProduct = null;
var selectedSize = null;

// Загруженные файлы
var uploadedFiles = { product: null, qr: null };
var returnFiles = { photo: null, qr: null };

// Активная категория
var activeCategory = 'all';

// Заказы пользователя
var allUserOrders = [];

// ID таблицы Google Sheets
var SHEET_ID = '108ikNY2z7iMQj2PE9AC_3ege2g1_-9naUpscKnjGONs';
var SHEET_NAME = 'Лист10';

// Адрес сервера
var SERVER_URL = 'https://brandx-production-c65f.up.railway.app';

// Проверяем, нужно ли сразу открыть экран возвратов
if (window.location.hash === '#returns') {
  showScreen('returns');
}

// Функция загрузки данных из Google Таблицы
function loadData() {
  console.log('Загружаем данные из таблицы...');
  
  var url = 'https://opensheet.elk.sh/' + SHEET_ID + '/' + encodeURIComponent(SHEET_NAME);
  
  fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Ошибка загрузки таблицы');
      }
      return response.json();
    })
    .then(function(rawData) {
      console.log('Данные получены:', rawData.length, 'строк');
      
      products = [];
      
      // Обрабатываем каждую строку таблицы
      for (var i = 0; i < rawData.length; i++) {
        var row = rawData[i];
        
        // Собираем информацию о размерах
        var sizes = {};
        
        if (row.s !== undefined && row.s !== '') {
          sizes['S'] = Number(row.s) || 0;
        }
        if (row.m !== undefined && row.m !== '') {
          sizes['M'] = Number(row.m) || 0;
        }
        if (row.l !== undefined && row.l !== '') {
          sizes['L'] = Number(row.l) || 0;
        }
        if (row.xl !== undefined && row.xl !== '') {
          sizes['XL'] = Number(row.xl) || 0;
        }
        if (row['2xl'] !== undefined && row['2xl'] !== '') {
          sizes['2XL'] = Number(row['2xl']) || 0;
        }
        if (row['3xl'] !== undefined && row['3xl'] !== '') {
          sizes['3XL'] = Number(row['3xl']) || 0;
        }
        
        // Определяем, является ли товар лимитированным
        var isLimited = false;
        if (row.limited) {
          var limitedStr = String(row.limited).toLowerCase();
          if (limitedStr === 'да' || limitedStr === 'true') {
            isLimited = true;
          }
        }
        
        // Создаём объект товара
        var product = {
          id: Number(row.id) || Math.random(),
          category: (row.category || 'other').toLowerCase().trim(),
          name: row.name || 'Без названия',
          price: Number(row.price) || 0,
          image: row.image || 'https://via.placeholder.com/400x400?text=No+Image',
          sizes: sizes,
          limited: isLimited
        };
        
        products.push(product);
      }
      
      console.log('Загружено товаров:', products.length);
      
      // Отрисовываем категории и товары
      renderCategories();
      renderProducts();
    })
    .catch(function(error) {
      console.error('Ошибка загрузки данных:', error);
    });
}

// Функция переключения экранов
function showScreen(name) {
  console.log('Переключаем экран на:', name);
  
  // Скрываем все экраны
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) {
    screens[i].classList.remove('active');
  }
  
  // Показываем нужный экран
  var targetScreen = document.getElementById('screen-' + name);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }
  
  // Обновляем активную кнопку в нижнем меню
  var navBtns = document.querySelectorAll('.nav-btn');
  for (var i = 0; i < navBtns.length; i++) {
    navBtns[i].classList.remove('active');
  }
  
  // Находим кнопки для нужного экрана
  var activeBtns = document.querySelectorAll('.nav-btn[onclick="showScreen(\'' + name + '\')"]');
  for (var i = 0; i < activeBtns.length; i++) {
    activeBtns[i].classList.add('active');
  }
  
  // Прокручиваем страницу вверх
  window.scrollTo(0, 0);
  
  // Если открыли профиль - загружаем данные
  if (name === 'profile') {
    loadProfile();
  }
}

// Функция прокрутки к каталогу
function scrollToCatalog() {
  var catalog = document.getElementById('catalog-section');
  if (catalog) {
    catalog.scrollIntoView({ behavior: 'smooth' });
  }
}

// Загрузка профиля пользователя
function loadProfile() {
  console.log('Загружаем профиль...');
  
  var user = tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
  
  if (user) {
    document.getElementById('profile-name').textContent = user.first_name || 'Гость';
    document.getElementById('profile-username').textContent = user.username ? '@' + user.username : 'Пользователь';
    
    if (user.photo_url) {
      document.getElementById('profile-photo').src = user.photo_url;
    }
  }
  
  // Загружаем заказы
  loadUserOrders();
}

// Загрузка заказов пользователя с сервера
function loadUserOrders() {
  console.log('Загружаем заказы...');
  
  var list = document.getElementById('orders-list');
  list.innerHTML = '<div class="empty-orders"><p>Загрузка...</p></div>';
  
  fetch(SERVER_URL + '/api/orders', {
    headers: { 'X-Init-Data': tg.initData }
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Ошибка авторизации');
    }
    return response.json();
  })
  .then(function(data) {
    allUserOrders = data.orders || [];
    console.log('Заказов загружено:', allUserOrders.length);
    
    // Обновляем счётчик заказов
    document.getElementById('orders-count').textContent = allUserOrders.length;
    
    // Считаем сумму заказов
    var totalSum = 0;
    var paidSum = 0;
    
    for (var i = 0; i < allUserOrders.length; i++) {
      var order = allUserOrders[i];
      var price = Number(order.price) || 0;
      totalSum += price;
      
      // Если заказ оплачен или отправлен - добавляем к оплаченной сумме
      if (order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') {
        paidSum += price;
      }
    }
    
    document.getElementById('balance-amount').textContent = paidSum.toLocaleString() + '₽';
    document.getElementById('balance-sub').textContent = 'оплачено ' + paidSum.toLocaleString() + ' из ' + totalSum.toLocaleString();
    
    // Отрисовываем заказы
    renderOrders(allUserOrders);
  })
  .catch(function(error) {
    console.error('Ошибка загрузки заказов:', error);
    list.innerHTML = '<div class="empty-orders"><p>Не удалось загрузить заказы</p></div>';
  });
}

// Отрисовка списка заказов
function renderOrders(orders) {
  var list = document.getElementById('orders-list');
  
  if (orders.length === 0) {
    list.innerHTML = '<div class="empty-orders"><p>Заказов пока нет</p></div>';
    return;
  }
  
  var html = '';
  
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    
    // Определяем класс статуса
    var statusClass = 'status-' + o.status.toLowerCase().replace(/\s+/g, '');
    
    // Формируем HTML карточки заказа
    html += '<div class="order-card">';
    html += '<div class="order-header">';
    html += '<span class="order-id">#' + o.orderId + '</span>';
    html += '<span class="order-status ' + statusClass + '">' + o.status + '</span>';
    html += '</div>';
    html += '<div class="order-body">';
    
    // Фото товара
    if (o.image) {
      html += '<img src="' + o.image + '" class="order-img" onerror="this.style.display=\'none\'">';
    } else {
      html += '<div class="order-img"></div>';
    }
    
    html += '<div class="order-info">';
    html += '<div class="order-title">' + o.product + '</div>';
    html += '<div class="order-meta">Размер: ' + o.size + ' • ПВЗ: ' + o.pvz + '</div>';
    
    // Форматируем дату
    var date = new Date(o.date);
    var dateStr = date.toLocaleDateString('ru-RU');
    html += '<div class="order-meta">' + dateStr + '</div>';
    html += '<div class="order-price">' + Number(o.price).toLocaleString() + ' ₽</div>';
    
    // Трек-номер
    if (o.track) {
      html += '<div class="order-track">🚚 Трек: ' + o.track + '</div>';
    }
    
    html += '</div>'; // order-info
    html += '</div>'; // order-body
    html += '</div>'; // order-card
  }
  
  list.innerHTML = html;
}

// Отрисовка вкладок категорий
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

// Фильтрация по категории
function filterCategory(catId) {
  activeCategory = catId;
  renderCategories();
  renderProducts();
}

// Получение отфильтрованных товаров
function getFilteredProducts() {
  var searchInput = document.getElementById('search-input');
  var search = searchInput ? searchInput.value.toLowerCase() : '';
  
  var filtered = [];
  
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    
    // Проверяем категорию
    var matchCat = activeCategory === 'all' || p.category === activeCategory;
    
    // Проверяем поиск
    var matchSearch = p.name.toLowerCase().indexOf(search) !== -1;
    
    if (matchCat && matchSearch) {
      filtered.push(p);
    }
  }
  
  return filtered;
}

// Отрисовка товаров
function renderProducts() {
  var filtered = getFilteredProducts();
  var grid = document.getElementById('product-grid');
  var count = document.getElementById('catalog-count');
  
  count.textContent = filtered.length + ' товаров';
  
  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Товары не найдены</div>';
    return;
  }
  
  var html = '';
  
  for (var i = 0; i < filtered.length; i++) {
    var p = filtered[i];
    
    // Считаем общее количество товара
    var totalStock = 0;
    var sizeKeys = Object.keys(p.sizes);
    for (var j = 0; j < sizeKeys.length; j++) {
      totalStock += p.sizes[sizeKeys[j]];
    }
    
    html += '<div class="prod-card" onclick="openProduct(' + p.id + ')">';
    html += '<div class="prod-img-wrap">';
    html += '<img src="' + p.image + '" alt="' + p.name + '" loading="lazy" onerror="this.src=\'https://via.placeholder.com/400x400?text=No+Image\'">';
    html += '<div class="prod-badges">';
    
    if (totalStock > 0) {
      html += '<span class="badge badge-stock">В НАЛИЧИИ</span>';
    }
    if (p.limited) {
      html += '<span class="badge badge-limited">LIMITED</span>';
    }
    
    html += '</div>'; // prod-badges
    html += '</div>'; // prod-img-wrap
    html += '<div class="prod-info">';
    html += '<div class="prod-name">' + p.name + '</div>';
    html += '<div class="prod-price">' + p.price.toLocaleString() + ' ₽</div>';
    html += '</div>'; // prod-info
    html += '</div>'; // prod-card
  }
  
  grid.innerHTML = html;
}

// Фильтрация товаров при поиске
function filterProducts() {
  renderProducts();
}

// Открытие карточки товара
function openProduct(id) {
  console.log('Открываем товар:', id);
  
  // Находим товар по ID
  currentProduct = null;
  for (var i = 0; i < products.length; i++) {
    if (products[i].id === id) {
      currentProduct = products[i];
      break;
    }
  }
  
  if (!currentProduct) return;
  
  selectedSize = null;
  
  // Находим категорию
  var cat = { name: 'КАТЕГОРИЯ' };
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].id === currentProduct.category) {
      cat = categories[i];
      break;
    }
  }
  
  // Считаем общее количество
  var totalStock = 0;
  var sizeKeys = Object.keys(currentProduct.sizes);
  for (var i = 0; i < sizeKeys.length; i++) {
    totalStock += currentProduct.sizes[sizeKeys[i]];
  }
  
  // Заполняем данные на странице
  document.getElementById('p-image').src = currentProduct.image;
  document.getElementById('p-category').textContent = cat.name.toUpperCase();
  document.getElementById('p-title').textContent = currentProduct.name;
  document.getElementById('p-price').textContent = currentProduct.price.toLocaleString() + ' ₽';
  
  // Бейджи
  var badgesHtml = '';
  if (totalStock > 0) {
    badgesHtml += '<span class="badge badge-stock">В НАЛИЧИИ</span>';
  }
  if (currentProduct.limited) {
    badgesHtml += '<span class="badge badge-limited">LIMITED EDITION</span>';
  }
  document.getElementById('p-badges').innerHTML = badgesHtml;
  
  // Размеры
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
  
  // Статус наличия
  document.getElementById('p-stock').innerHTML = '<div class="stock-dot"></div><div class="stock-text"><strong>Выбери размер</strong></div>';
  document.getElementById('btn-buy').disabled = true;
  
  // Показываем экран товара
  showScreen('product');
}

// Выбор размера
function selectSize(el) {
  if (el.classList.contains('disabled')) return;
  
  // Убираем выделение со всех кнопок
  var sizeBtns = document.querySelectorAll('.size-btn');
  for (var i = 0; i < sizeBtns.length; i++) {
    sizeBtns[i].classList.remove('active');
  }
  
  // Выделяем выбранную
  el.classList.add('active');
  selectedSize = el.dataset.size;
  var stock = el.dataset.stock;
  
  document.getElementById('sizes-hint').textContent = 'Выбран: ' + selectedSize;
  
  var stockEl = document.getElementById('p-stock');
  stockEl.className = 'stock-bar';
  stockEl.innerHTML = '<div class="stock-dot"></div><div class="stock-text"><strong>Есть в наличии</strong>Осталось: ' + stock + ' шт.</div>';
  
  document.getElementById('btn-buy').disabled = false;
}

// Переход к оформлению заявки
function goToPayment() {
  document.getElementById('form-product').value = currentProduct.name;
  document.getElementById('form-size').value = selectedSize;
  showScreen('payment2');
}

// Обработка загрузки файла
function handleFile(input, type) {
  var file = input.files[0];
  if (!file) return;
  
  // Проверяем размер файла (10 МБ)
  if (file.size > 10 * 1024 * 1024) {
    alert('Файл слишком большой. Максимум 10 МБ.');
    return;
  }
  
  uploadedFiles[type] = file;
  
  // Показываем превью
  var previewDiv = document.getElementById('preview-' + type);
  previewDiv.style.display = 'block';
  
  if (file.type.indexOf('image/') === 0) {
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-img-' + type).src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  checkFormValid();
}

// Проверка заполненности формы заявки
function checkFormValid() {
  var product = document.getElementById('form-product').value.trim();
  var pvz = document.getElementById('form-pvz').value.trim();
  var size = document.getElementById('form-size').value.trim();
  var btn = document.getElementById('btn-finish');
  
  if (product && pvz && size && uploadedFiles.product && uploadedFiles.qr) {
    btn.disabled = false;
  } else {
    btn.disabled = true;
  }
}

// Отправка заявки на заказ
function submitApplication() {
  var product = document.getElementById('form-product').value.trim();
  var pvz = document.getElementById('form-pvz').value.trim();
  var size = document.getElementById('form-size').value.trim();
  var track = document.getElementById('form-track').value.trim();
  
  if (!product || !pvz || !size || !uploadedFiles.product || !uploadedFiles.qr) {
    alert('Заполните все поля и загрузите файлы');
    return;
  }
  
  var btn = document.getElementById('btn-finish');
  btn.disabled = true;
  btn.innerHTML = 'ОТПРАВКА...';
  
  // Генерируем номер заказа
  var orderId = 'BX-' + Date.now().toString().slice(-6);
  
  var orderData = {
    orderId: orderId,
    product: product,
    pvz: pvz,
    size: size,
    track: track || 'Не указан',
    price: currentProduct ? currentProduct.price : 0,
    initData: tg.initData
  };
  
  var formData = new FormData();
  formData.append('order', JSON.stringify(orderData));
  formData.append('productPhoto', uploadedFiles.product);
  formData.append('qrCode', uploadedFiles.qr);
  formData.append('initData', tg.initData);
  
  fetch(SERVER_URL + '/api/order', {
    method: 'POST',
    body: formData
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Ошибка сервера');
    }
    return response.json();
  })
  .then(function(data) {
    console.log('Заказ отправлен:', data);
    
    document.getElementById('success-order-id').textContent = 'ЗАЯВКА #' + orderId;
    document.getElementById('success-product').textContent = product;
    document.getElementById('success-size').textContent = size;
    document.getElementById('success-pvz').textContent = pvz;
    
    showScreen('success');
  })
  .catch(function(error) {
    console.error('Ошибка:', error);
    alert('Произошла ошибка. Попробуйте ещё раз.');
    btn.disabled = false;
    btn.innerHTML = 'ОТПРАВИТЬ ЗАЯВКУ →';
  });
}

// Обработка загрузки файла для возврата
function handleReturnFile(input, type) {
  var file = input.files[0];
  if (!file) return;
  
  if (file.size > 10 * 1024 * 1024) {
    alert('Файл слишком большой. Максимум 10 МБ.');
    return;
  }
  
  returnFiles[type] = file;
  
  var previewDiv = document.getElementById('preview-return-' + type);
  previewDiv.style.display = 'block';
  
  if (file.type.indexOf('image/') === 0) {
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-img-return-' + type).src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  checkReturnFormValid();
}

// Проверка заполненности формы возврата
function checkReturnFormValid() {
  var orderId = document.getElementById('return-order-id').value.trim();
  var product = document.getElementById('return-product').value.trim();
  var reason = document.getElementById('return-reason').value;
  var address = document.getElementById('return-address').value.trim();
  var phone = document.getElementById('return-phone').value.trim();
  var btn = document.getElementById('btn-return');
  
  if (orderId && product && reason && address && phone && returnFiles.photo && returnFiles.qr) {
    btn.disabled = false;
  } else {
    btn.disabled = true;
  }
}

// Отправка заявки на возврат
function submitReturn() {
  var orderId = document.getElementById('return-order-id').value.trim();
  var product = document.getElementById('return-product').value.trim();
  var reason = document.getElementById('return-reason').value;
  var address = document.getElementById('return-address').value.trim();
  var pickupCode = document.getElementById('return-pickup-code').value.trim();
  var phone = document.getElementById('return-phone').value.trim();
  
  if (!orderId || !product || !reason || !address || !phone || !returnFiles.photo || !returnFiles.qr) {
    alert('Заполните все поля и загрузите файлы');
    return;
  }
  
  var btn = document.getElementById('btn-return');
  btn.disabled = true;
  btn.innerHTML = 'ОТПРАВКА...';
  
  var returnId = 'RET-' + Date.now().toString().slice(-6);
  
  var returnData = {
    returnId: returnId,
    orderId: orderId,
    product: product,
    reason: reason,
    address: address,
    pickupCode: pickupCode || 'Не указан',
    phone: phone,
    initData: tg.initData
  };
  
  var formData = new FormData();
  formData.append('return', JSON.stringify(returnData));
  formData.append('productPhoto', returnFiles.photo);
  formData.append('qrCode', returnFiles.qr);
  formData.append('initData', tg.initData);
  
  fetch(SERVER_URL + '/api/return', {
    method: 'POST',
    body: formData
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Ошибка сервера');
    }
    return response.json();
  })
  .then(function(data) {
    console.log('Возврат отправлен:', data);
    alert('✅ Заявка на возврат #' + returnId + ' отправлена!');
    
    // Очищаем форму
    document.getElementById('return-order-id').value = '';
    document.getElementById('return-product').value = '';
    document.getElementById('return-reason').value = '';
    document.getElementById('return-address').value = '';
    document.getElementById('return-pickup-code').value = '';
    document.getElementById('return-phone').value = '';
    document.getElementById('preview-return-photo').style.display = 'none';
    document.getElementById('preview-return-qr').style.display = 'none';
    
    returnFiles = { photo: null, qr: null };
    btn.disabled = true;
    btn.innerHTML = 'ОТПРАВИТЬ ЗАЯВКУ НА ВОЗВРАТ →';
    
    showScreen('profile');
  })
  .catch(function(error) {
    console.error('Ошибка:', error);
    alert('Произошла ошибка. Попробуйте ещё раз.');
    btn.disabled = false;
    btn.innerHTML = 'ОТПРАВИТЬ ЗАЯВКУ НА ВОЗВРАТ →';
  });
}

// Добавляем обработчики событий для полей формы
document.addEventListener('DOMContentLoaded', function() {
  var formFields = ['form-product', 'form-pvz', 'form-size', 'form-track'];
  for (var i = 0; i < formFields.length; i++) {
    var el = document.getElementById(formFields[i]);
    if (el) {
      el.addEventListener('input', checkFormValid);
    }
  }
  
  var returnFields = ['return-order-id', 'return-product', 'return-reason', 'return-address', 'return-pickup-code', 'return-phone'];
  for (var i = 0; i < returnFields.length; i++) {
    var el = document.getElementById(returnFields[i]);
    if (el) {
      el.addEventListener('input', checkReturnFormValid);
      el.addEventListener('change', checkReturnFormValid);
    }
  }
});

// Запускаем загрузку данных при открытии страницы
loadData();
