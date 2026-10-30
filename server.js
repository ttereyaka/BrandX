* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

:root {
  --bg: #050505;
  --bg-card: #111111;
  --bg-card-hover: #1a1a1a;
  --border: #222222;
  --text: #ffffff;
  --text-secondary: #a0a0a0;
  --text-muted: #666666;
  --accent: #ff7a45;
  --accent-dim: rgba(255, 122, 69, 0.1);
  --accent-border: rgba(255, 122, 69, 0.3);
  --accent-red: #ff4d6d;
  --green: #4ade80;
  --font-display: 'Unbounded', sans-serif;
  --font-body: 'Manrope', sans-serif;
}

body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
  padding-bottom: 80px; /* Отступ для нижней панели */
}

.screen { display: none; min-height: 100vh; animation: fadeIn 0.3s ease; }
.screen.active { display: block; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- HEADER & HERO --- */
.main-header { padding: 16px 16px 0; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.logo-wrap { display: flex; align-items: center; gap: 12px; }
.logo-x { width: 44px; height: 44px; background: var(--accent); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.logo-letter { font-family: var(--font-display); font-size: 24px; font-weight: 800; color: #000; line-height: 1; }
.brand-name { font-family: var(--font-display); font-size: 18px; font-weight: 800; letter-spacing: 1px; color: var(--text); }
.brand-tag { font-size: 10px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; }

.online-badge { display: flex; align-items: center; gap: 6px; background: var(--bg-card); border: 1px solid var(--accent-border); padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; color: var(--accent); }
.online-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 0 0 rgba(255, 122, 69, 0.7); animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 122, 69, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(255, 122, 69, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 122, 69, 0); } }

.hero-banner { position: relative; background: linear-gradient(135deg, var(--bg-card) 0%, rgba(255, 122, 69, 0.08) 100%); border: 1px solid var(--accent-border); border-radius: 20px; padding: 28px 24px; margin-bottom: 16px; overflow: hidden; min-height: 220px; display: flex; align-items: flex-end; }
.hero-pattern { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; }
.pattern-x { position: absolute; font-family: var(--font-display); font-size: 120px; font-weight: 900; color: rgba(255, 122, 69, 0.04); line-height: 1; }
.pattern-x { top: -20px; right: -10px; }
.pattern-x-2 { top: 30px; right: 70px; font-size: 60px; opacity: 0.5; }
.hero-content { position: relative; z-index: 2; }
.hero-label { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: var(--accent); margin-bottom: 12px; }
.label-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }
.hero-title { font-family: var(--font-display); font-size: 32px; font-weight: 800; line-height: 1.1; color: var(--text); margin-bottom: 12px; }
.accent-text { color: var(--accent); }
.hero-sub { color: var(--text-secondary); font-size: 13px; margin-bottom: 18px; line-height: 1.4; }
.hero-cta { background: var(--accent); border: none; color: #000; padding: 12px 20px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; font-family: var(--font-body); letter-spacing: 1px; transition: transform 0.2s; }
.hero-cta:active { transform: scale(0.95); }

/* --- SEARCH & TABS --- */
.search-box { position: relative; margin-bottom: 16px; }
.search-box input { width: 100%; padding: 14px 16px 14px 46px; border: 1px solid var(--border); border-radius: 12px; font-size: 14px; font-family: var(--font-body); background: var(--bg-card); color: var(--text); outline: none; transition: all 0.2s; }
.search-box input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; stroke: var(--accent); }

.category-tabs { display: flex; gap: 8px; padding: 0 16px 16px; overflow-x: auto; scrollbar-width: none; }
.category-tabs::-webkit-scrollbar { display: none; }
.cat-tab { padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary); transition: all 0.2s; }
.cat-tab.active { background: var(--accent); color: #000; border-color: var(--accent); }

/* --- CATALOG --- */
.catalog-section { padding: 0 16px 24px; }
.catalog-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
.catalog-label { color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: 2px; margin-bottom: 4px; }
.catalog-title { font-family: var(--font-display); font-size: 24px; font-weight: 800; color: var(--text); }
.catalog-count { color: var(--text-muted); font-size: 12px; font-weight: 600; }

.product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.prod-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; cursor: pointer; transition: all 0.3s ease; position: relative; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3); }
.prod-card:active { transform: translateY(-2px) scale(0.98); border-color: var(--accent); box-shadow: 0 8px 24px rgba(255, 122, 69, 0.2); }
.prod-img-wrap { position: relative; aspect-ratio: 4 / 5; overflow: hidden; background: #111; }
.prod-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.prod-card:active .prod-img-wrap img { transform: scale(1.05); }
.prod-badges { position: absolute; top: 10px; left: 10px; display: flex; flex-direction: column; gap: 6px; }
.badge { padding: 4px 8px; border-radius: 6px; font-size: 9px; font-weight: 800; color: #000; backdrop-filter: blur(10px); box-shadow: 0 2px 8px rgba(0,0,0,0.2); animation: slideIn 0.3s ease; }
@keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
.badge-stock { background: var(--accent); }
.badge-limited { background: var(--accent-red); color: #fff; }
.prod-info { padding: 12px; }
.prod-name { font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
.prod-price { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--accent); }

/* --- PRODUCT DETAILS --- */
.product-top-bar { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: var(--bg); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; }
.back-btn-icon { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-card); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.product-top-title { font-size: 14px; font-weight: 700; color: var(--text); }
.logo-x-small { width: 32px; height: 32px; background: var(--accent); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.logo-letter-small { font-family: var(--font-display); font-size: 20px; font-weight: 800; color: #000; line-height: 1; }
.product-image-wrap { position: relative; }
.product-full-img { width: 100%; height: 340px; object-fit: cover; }
.p-badges { position: absolute; top: 16px; left: 16px; display: flex; gap: 8px; }
.p-badges .badge { font-size: 10px; padding: 6px 12px; }
.product-details { padding: 20px 16px; }
.p-category { color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px; }
.p-title { font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 16px; line-height: 1.1; }
.price-block { background: var(--bg-card); border: 1px solid var(--accent-border); border-radius: 14px; padding: 16px; margin-bottom: 20px; }
.price-tag { display: flex; justify-content: space-between; align-items: center; }
.price-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: var(--text-muted); }
.price-value { font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--accent); }
.sizes-section { margin-bottom: 16px; }
.sizes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.sizes-title { font-size: 12px; font-weight: 700; letter-spacing: 2px; color: var(--text); }
.sizes-hint { font-size: 12px; color: var(--text-muted); }
.sizes { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.size-btn { min-width: 70px; padding: 12px 8px; border: 1px solid var(--border); border-radius: 10px; text-align: center; cursor: pointer; background: var(--bg-card); transition: all 0.2s; }
.size-btn.active { border-color: var(--accent); background: var(--accent-dim); }
.size-btn.disabled { opacity: 0.3; cursor: not-allowed; }
.size-name { font-size: 14px; font-weight: 700; color: var(--text); }
.size-stock { font-size: 10px; color: var(--text-muted); margin-top: 3px; }
.stock-bar { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); border-radius: 10px; margin-bottom: 16px; }
.stock-bar.out { background: rgba(255, 77, 109, 0.1); border-color: rgba(255, 77, 109, 0.2); }
.stock-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
.stock-bar.out .stock-dot { background: var(--accent-red); }
.stock-text { font-size: 13px; color: var(--text); }
.stock-text strong { display: block; font-size: 13px; font-weight: 700; }

/* --- BUTTONS --- */
.btn-primary { width: 100%; padding: 16px; background: linear-gradient(135deg, var(--accent) 0%, #ff6b35 100%); color: #000; border: none; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; font-family: var(--font-body); display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; letter-spacing: 1px; position: relative; overflow: hidden; box-shadow: 0 4px 16px rgba(255, 122, 69, 0.3); }
.btn-primary::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s; }
.btn-primary:active::before { left: 100%; }
.btn-primary:disabled { background: var(--border); color: var(--text-muted); cursor: not-allowed; box-shadow: none; }
.btn-primary:not(:disabled):active { transform: scale(0.98); }
.btn-arrow { font-size: 16px; }

/* --- FORMS & UPLOADS --- */
.form-block, .upload-block { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 18px; margin: 16px; }
.form-header, .upload-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.form-header h3, .upload-header h3 { font-size: 16px; font-weight: 700; color: var(--text); }
.required-badge { background: rgba(255, 77, 109, 0.15); color: var(--accent-red); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; letter-spacing: 0.5px; }
.form-input { width: 100%; padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; font-size: 14px; font-family: var(--font-body); background: var(--bg); color: var(--text); outline: none; transition: all 0.2s; }
.form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); transform: translateY(-1px); }
.form-input::placeholder { color: var(--text-muted); }
.form-group select.form-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a0a0a0' d='M6 9L1 4h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; padding-right: 40px; cursor: pointer; }
.form-group select.form-input option { background: var(--bg-card); color: var(--text); }

.upload-zone { display: block; border: 1px dashed var(--border); border-radius: 12px; padding: 28px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--bg); }
.upload-zone:hover, .upload-zone.dragover { border-color: var(--accent); background: var(--accent-dim); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255, 122, 69, 0.15); }
.upload-zone input { display: none; }
.upload-icon-wrap { width: 52px; height: 52px; background: var(--accent-dim); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
.upload-text { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: var(--text); }
.upload-formats { font-size: 11px; color: var(--text-muted); }
.preview-img { width: 100%; max-height: 180px; object-fit: contain; border-radius: 10px; margin-top: 12px; border: 1px solid var(--border); }

.info-note { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: var(--accent-dim); border: 1px solid var(--accent-border); border-radius: 12px; margin: 0 16px 16px; font-size: 13px; color: var(--text-secondary); line-height: 1.4; }
.info-icon { font-size: 18px; flex-shrink: 0; color: var(--accent); }

/* --- SUCCESS SCREEN --- */
.success-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; padding: 40px 24px; text-align: center; }
.success-logo { margin-bottom: 20px; }
.logo-letter-big { font-family: var(--font-display); font-size: 56px; font-weight: 800; color: var(--accent); line-height: 1; }
.success-check { width: 64px; height: 64px; background: var(--accent); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; margin-bottom: 20px; }
.success-title { font-family: var(--font-display); font-size: 28px; font-weight: 800; margin-bottom: 12px; }
.success-text { color: var(--text-secondary); font-size: 14px; line-height: 1.5; margin-bottom: 20px; max-width: 280px; }
.success-order-details { background: var(--bg-card); border: 1px solid var(--accent-border); border-radius: 14px; padding: 18px; margin: 20px 0; width: 100%; max-width: 320px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
.detail-row:last-child { border-bottom: none; }
.detail-label { font-size: 13px; color: var(--text-muted); font-weight: 600; }
.detail-value { font-size: 14px; color: var(--text); font-weight: 700; text-align: right; max-width: 60%; }
.success-order-id { background: var(--bg-card); border: 1px solid var(--accent-border); padding: 10px 20px; border-radius: 10px; font-size: 14px; color: var(--accent); font-weight: 700; margin-bottom: 24px; font-family: var(--font-display); letter-spacing: 2px; }

/* --- PROFILE SCREEN --- */
.profile-container { padding: 24px 16px 100px; }
.profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.profile-avatar { width: 64px; height: 64px; border-radius: 50%; overflow: hidden; border: 2px solid var(--accent); }
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.profile-info h2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.profile-status { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); }
.status-dot { width: 8px; height: 8px; background: var(--green); border-radius: 50%; }

.profile-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; }
.stat-label { font-size: 12px; color: var(--text-muted); font-weight: 600; margin-bottom: 12px; }
.balance-circle { position: relative; width: 100px; height: 100px; margin: 0 auto; }
.balance-circle svg { transform: rotate(-90deg); width: 100%; height: 100%; }
.balance-circle .bg { fill: none; stroke: var(--border); stroke-width: 8; }
.balance-circle .progress { fill: none; stroke: var(--accent); stroke-width: 8; stroke-dasharray: 251.2; stroke-dashoffset: 251.2; stroke-linecap: round; transition: stroke-dashoffset 1s ease; }
.balance-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
.balance-amount { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); }
.balance-sub { font-size: 10px; color: var(--text-muted); }

.period-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.period-btn { flex: 1; padding: 8px; border: 1px solid var(--border); border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.period-btn.active { background: var(--accent); color: #000; border-color: var(--accent); }
.orders-count { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: var(--text); text-align: center; }

.orders-filters { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; }
.orders-filters::-webkit-scrollbar { display: none; }
.filter-btn { padding: 8px 16px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-card); color: var(--text-secondary); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.filter-select { padding: 8px 32px 8px 12px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-card); color: var(--text); font-size: 12px; font-weight: 600; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23a0a0a0' d='M5 7L0 2h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; cursor: pointer; }
.filter-select option { background: var(--bg-card); }

.orders-list { display: flex; flex-direction: column; gap: 12px; }
.empty-orders { text-align: center; padding: 40px 20px; color: var(--text-muted); }
.empty-orders svg { margin-bottom: 16px; opacity: 0.3; }
.empty-orders p { margin-bottom: 16px; font-size: 14px; }
.btn-small { padding: 10px 20px; background: var(--bg-card); border: 1px solid var(--accent); color: var(--accent); border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }

.order-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; transition: all 0.2s; }
.order-card:active { transform: scale(0.98); border-color: var(--accent-border); }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.order-id { font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--text); }
.order-status { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
.status-pending { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
.status-paid, .status-shipped { background: rgba(74, 222, 128, 0.15); color: var(--green); }
.status-delivered { background: rgba(255, 122, 69, 0.15); color: var(--accent); }
.status-cancelled { background: rgba(255, 77, 109, 0.15); color: var(--accent-red); }

.order-body { display: flex; gap: 12px; }
.order-img { width: 60px; height: 60px; border-radius: 10px; object-fit: cover; background: #222; flex-shrink: 0; }
.order-info { flex: 1; }
.order-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; line-height: 1.3; }
.order-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }
.order-price { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--accent); margin-top: 8px; }
.order-track { font-size: 11px; color: var(--text-secondary); background: var(--bg); padding: 6px 10px; border-radius: 6px; margin-top: 8px; word-break: break-all; }

/* --- BOTTOM NAV --- */
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(17, 17, 17, 0.95); backdrop-filter: blur(10px); border-top: 1px solid var(--border); display: flex; justify-content: space-around; padding: 12px 0 24px; z-index: 100; }
.nav-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; color: var(--text-muted); cursor: pointer; transition: all 0.2s; width: 50%; }
.nav-btn svg { width: 24px; height: 24px; transition: all 0.2s; }
.nav-btn span { font-size: 11px; font-weight: 600; transition: all 0.2s; }
.nav-btn.active { color: var(--accent); }
.nav-btn.active svg { transform: translateY(-2px); }

::-webkit-scrollbar { width: 0; }
