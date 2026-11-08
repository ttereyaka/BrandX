var tg = window.Telegram.WebApp;
tg.expand();

var currentUser = tg.initDataUnsafe ? tg.initDataUnsafe.user : null;

function checkAccess() {
  var errorEl = document.getElementById('login-error');
  if (!currentUser) {
    errorEl.innerHTML = '❌ Откройте через Telegram';
    return;
  }
  
  fetch('/api/admin/stats', { headers: { 'X-Init-Data': tg.initData } })
    .then(function(response) {
      if (!response.ok) throw new Error('Доступ запрещён');
      return response.json();
    })
    .then(function(data) {
      document.getElementById('admin-username').textContent = '@' + (currentUser.username || currentUser.first_name);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'block';
      loadStats();
      loadOrders();
      loadReturns();
    })
    .catch(function(error) {
      errorEl.innerHTML = '❌ <b>Доступ запрещён</b><br>Только владелец';
    });
}

function getHeaders() { return { 'X-Init-Data': tg.initData }; }

function loadStats() {
  fetch('/api/admin/stats', { headers: getHeaders() })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      var s = data.stats;
      document.getElementById('stat-total').textContent = s.totalOrders;
      document.getElementById('stat-pending').textContent = s.pendingOrders;
      document.getElementById('stat-paid').textContent = s.paidOrders;
      document.getElementById('stat-revenue').textContent = s.totalRevenue.toLocaleString() + ' ₽';
    })
    .catch(function(error) { console.error('Ошибка:', error); });
}

function loadOrders() {
  fetch('/api/admin/orders', { headers: getHeaders() })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      var orders = data.orders;
      var list = document.getElementById('admin-orders-list');
      if (orders.length === 0) { list.innerHTML = '<div class="empty-state">Заказов пока нет</div>'; return; }
      
      var html = '';
      for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        var statusClass = 'status-' + (o.status || 'pending');
        var date = new Date(o.date).toLocaleString('ru-RU');
        
        html += '<div class="admin-order-card">';
        html += '<div class="order-top">';
        html += '<span class="order-id">#' + o.orderId + '</span>';
        html += '<span class="order-status ' + statusClass + '">' + (o.status || 'pending') + '</span>';
        html += '</div>';
        if (o.image) html += '<img src="' + o.image + '" class="order-image" onerror="this.style.display=\'none\'">';
        html += '<div class="order-details">';
        html += '<div class="order-detail"><div class="order-detail-label">Товар</div><div class="order-detail-value">' + (o.product || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Размер</div><div class="order-detail-value">' + (o.size || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">ПВЗ</div><div class="order-detail-value">' + (o.pvz || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Цена</div><div class="order-detail-value">' + (Number(o.price) || 0).toLocaleString() + ' ₽</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Клиент</div><div class="order-detail-value">@' + (o.username || 'неизвестно') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Имя</div><div class="order-detail-value">' + (o.firstName || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Трек</div><div class="order-detail-value">' + (o.track || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Дата</div><div class="order-detail-value">' + date + '</div></div>';
        html += '</div>';
        html += '<div class="order-actions">';
        html += '<select class="action-select" id="status-' + o.orderId + '">';
        html += '<option value="pending" ' + (o.status === 'pending' ? 'selected' : '') + '>В обработке</option>';
        html += '<option value="paid" ' + (o.status === 'paid' ? 'selected' : '') + '>Оплачено</option>';
        html += '<option value="shipped" ' + (o.status === 'shipped' ? 'selected' : '') + '>В пути</option>';
        html += '<option value="delivered" ' + (o.status === 'delivered' ? 'selected' : '') + '>Получено</option>';
        html += '<option value="cancelled" ' + (o.status === 'cancelled' ? 'selected' : '') + '>Отменён</option>';
        html += '</select>';
        html += '<button class="action-btn" onclick="updateStatus(\'' + o.orderId + '\')">Обновить</button>';
        html += '<input type="text" class="track-input" id="track-' + o.orderId + '" placeholder="Трек" value="' + (o.track || '') + '">';
        html += '<button class="action-btn secondary" onclick="updateTrack(\'' + o.orderId + '\')">Трек</button>';
        html += '</div></div>';
      }
      list.innerHTML = html;
    })
    .catch(function(error) { console.error('Ошибка:', error); });
}

function loadReturns() {
  fetch('/api/admin/returns', { headers: getHeaders() })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      var returns = data.returns;
      var list = document.getElementById('admin-returns-list');
      if (returns.length === 0) { list.innerHTML = '<div class="empty-state">Возвратов пока нет</div>'; return; }
      
      var html = '';
      for (var i = 0; i < returns.length; i++) {
        var r = returns[i];
        var date = new Date(r.date).toLocaleString('ru-RU');
        html += '<div class="admin-order-card">';
        html += '<div class="order-top">';
        html += '<span class="order-id">↩️ #' + r.returnId + '</span>';
        html += '<span class="order-status status-pending">' + (r.status || 'pending') + '</span>';
        html += '</div>';
        html += '<div class="order-details">';
        html += '<div class="order-detail"><div class="order-detail-label">Товар</div><div class="order-detail-value">' + (r.product || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Заказ</div><div class="order-detail-value">#' + (r.orderId || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Причина</div><div class="order-detail-value">' + (r.reason || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Адрес</div><div class="order-detail-value">' + (r.address || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Телефон</div><div class="order-detail-value">' + (r.phone || '—') + '</div></div>';
        html += '<div class="order-detail"><div class="order-detail-label">Дата</div><div class="order-detail-value">' + date + '</div></div>';
        html += '</div></div>';
      }
      list.innerHTML = html;
    })
    .catch(function(error) { console.error('Ошибка:', error); });
}

function updateStatus(orderId) {
  var select = document.getElementById('status-' + orderId);
  fetch('/api/admin/order-status', {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ orderId: orderId, status: select.value })
  })
  .then(function(response) {
    if (!response.ok) throw new Error('Ошибка');
    alert('✅ Статус обновлён');
    loadOrders(); loadStats();
  })
  .catch(function(error) { alert('❌ Ошибка'); });
}

function updateTrack(orderId) {
  var input = document.getElementById('track-' + orderId);
  if (!input.value.trim()) { alert('Введите трек'); return; }
  fetch('/api/admin/order-track', {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ orderId: orderId, track: input.value.trim() })
  })
  .then(function(response) {
    if (!response.ok) throw new Error('Ошибка');
    alert('✅ Трек сохранён');
    loadOrders();
  })
  .catch(function(error) { alert('❌ Ошибка'); });
}

document.addEventListener('DOMContentLoaded', function() {
  var tabBtns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < tabBtns.length; i++) {
    tabBtns[i].addEventListener('click', function() {
      var tab = this.dataset.tab;
      var btns = document.querySelectorAll('.tab-btn');
      for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
      this.classList.add('active');
      var contents = document.querySelectorAll('.tab-content');
      for (var j = 0; j < contents.length; j++) contents[j].classList.remove('active');
      document.getElementById('tab-' + tab).classList.add('active');
    });
  }
});
