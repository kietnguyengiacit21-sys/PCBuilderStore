/* Shared customer-facing interactions. Data-changing actions remain pending until an API is connected. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const show = (element, visible) => {
    if (!element) return;
    element.classList.toggle('hidden', !visible);
    element.style.display = visible ? '' : 'none';
  };
  const toast = (message) => {
    let element = $('#pcbs-action-toast');
    if (!element) {
      element = document.createElement('div');
      element.id = 'pcbs-action-toast';
      element.setAttribute('role', 'status');
      document.body.appendChild(element);
    }
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(element._timer);
    element._timer = setTimeout(() => element.classList.remove('show'), 3200);
  };
  const pending = (feature = 'Chức năng này') => toast(`${feature} chưa được kết nối với hệ thống.`);
  window.showPendingFeature = pending;
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-requires-backend]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pending(button.dataset.requiresBackend);
  }, true);
  document.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-requires-backend]');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pending(form.dataset.requiresBackend);
  }, true);

  const routes = {
    'trang-chu': '/customer/home',
    home: '/customer/home',
    'linh-kien': '/customer/parts',
    'pc-lap-san': '/build-pc/start',
    'build-pc': '/build-pc/start',
    'Xây dựng PC': '/build-pc/start',
    'Xây dựng PC/guided': '/build-pc/guided',
    'Xây dựng PC/advanced': '/build-pc/advanced',
    'Xây dựng PC-nang-cao': '/build-pc/advanced',
    'Xây dựng PC-slot-07': '/customer/parts',
    'cau-hinh-nang-cao': '/build-pc/advanced',
    'chon-case': '/customer/parts',
    'chon-psu': '/customer/parts',
    'chon-ssd': '/customer/parts',
    'chon-tan-nhiet': '/customer/parts',
    'dang-nhap': '/customer/login',
    'do-kiem-hieu-nang': '/build-pc/benchmark',
    'goi-y-thay-the': '/build-pc/replacements',
    'kiem-tra-tuong-thich': '/build-pc/compatibility',
    'thay-doi-cpu': '/customer/parts',
    'thay-doi-gpu': '/customer/parts',
    'thay-doi-mainboard': '/customer/parts',
    'thay-doi-ram': '/customer/parts',
    'xuat-cau-hinh': '/build-pc/export',
    'tai-khoan': '/customer/account',
    'don-hang': '/customer/orders',
    'gio-hang': '/customer/cart',
    'so-sanh': '/customer/compare'
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href="#"]');
    const pathTarget = event.target.closest('[data-path]');
    if (pathTarget) {
      if (routes[pathTarget.dataset.path]) return;
      if (pathTarget.getAttribute('href') !== '#' && pathTarget.hasAttribute('href')) return;
    } else if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pending(pathTarget?.dataset.requiresBackend || link?.dataset.requiresBackend || 'Liên kết này');
  }, true);
  $$('[data-path]').forEach((link) => {
    const destination = routes[link.dataset.path];
    if (destination && (!link.hasAttribute('href') || link.getAttribute('href') === '#')) {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        location.href = destination;
      });
    }
  });

  const expandedTray = $('#compare-expanded-wrapper');
  const collapsedTray = $('#compare-collapsed-bar');
  $('#btn-collapse-tray')?.addEventListener('click', (event) => {
    event.preventDefault();
    show(expandedTray, false);
    show(collapsedTray, true);
  });
  $('#btn-expand-tray')?.addEventListener('click', (event) => {
    event.preventDefault();
    show(collapsedTray, false);
    show(expandedTray, true);
  });
  const compareTray = $('#compare-tray-section');
  if (compareTray && expandedTray && collapsedTray) {
    show(expandedTray, false);
    show(collapsedTray, true);
    compareTray.style.bottom = '1rem';
    compareTray.style.left = 'auto';
    compareTray.style.right = '1rem';
    compareTray.style.width = 'min(420px, calc(100vw - 2rem))';
    compareTray.style.maxWidth = 'none';
  }

  const categoryButtons = $$('main button').filter((button) =>
    /^(apps\s*)?Tất cả$|CPU \(Vi xử lý\)|Card đồ họa|Bo mạch chủ|Bộ nhớ RAM|Ổ cứng|Nguồn máy tính|Vỏ case|Tản nhiệt/i.test(
      button.textContent.trim().replace(/\s+/g, ' ')
    )
  );
  categoryButtons.forEach((button) => button.addEventListener('click', () => {
    categoryButtons.forEach((item) => item.classList.remove('ring-1', 'ring-primary-container'));
    button.classList.add('ring-1', 'ring-primary-container');
  }));
  $$('button').filter((button) => /^(Đặt lại|Thiết lập lại mặc định)$/i.test(button.textContent.trim()))
    .forEach((button) => button.addEventListener('click', () => {
      $$('input[type=checkbox],input[type=radio]').forEach((input) => {
        if (input.type === 'checkbox') input.checked = false;
      });
      $$('input[type=number],input[type=search],input[type=text]').forEach((input) => {
        if (!input.closest('header')) input.value = '';
      });
      toast('Đã xóa các lựa chọn bộ lọc.');
    }));

  const productTabs = $$('.product-tab-btn');
  const activateProductTab = (key, selectedButton) => {
    $$('.tab-panel').forEach((panel) => show(panel, panel.id === `tab-${key}`));
    productTabs.forEach((button) => {
      button.classList.remove('bg-surface-container', 'text-on-surface', 'font-bold', 'shadow-sm');
      button.classList.add('text-on-surface-variant', 'font-semibold');
    });
    if (selectedButton) {
      selectedButton.classList.add('bg-surface-container', 'text-on-surface', 'font-bold', 'shadow-sm');
      selectedButton.classList.remove('text-on-surface-variant', 'font-semibold');
    }
  };
  productTabs.forEach((button) => button.addEventListener('click', () => {
    const inlineHandler = button.getAttribute('onclick') || '';
    const match = inlineHandler.match(/switchProductTab\(['"]([^'"]+)/);
    const label = button.textContent.toLowerCase();
    const key = match?.[1] || (label.includes('tương thích') ? 'compatibility' : label.includes('bảo hành') ? 'warranty' : 'article');
    activateProductTab(key, button);
  }));
  window.switchProductTab = (key, button) => activateProductTab(
    key,
    button || productTabs.find((item) => (item.getAttribute('onclick') || '').includes(`'${key}'`))
  );
  window.adjustQty = (delta) => {
    const input = $('#qty-input');
    if (input) input.value = String(Math.max(1, Math.min(5, (parseInt(input.value, 10) || 1) + delta)));
  };
  window.selectThumbnail = (index, button) => {
    const wrap = button?.parentElement;
    if (!wrap) return;
    $$('button', wrap).forEach((item) => {
      item.classList.remove('ring-1', 'ring-primary-container', 'opacity-100');
      item.classList.add('opacity-70');
    });
    button.classList.add('ring-1', 'ring-primary-container', 'opacity-100');
    button.classList.remove('opacity-70');
    const image = button.querySelector('img');
    const hero = $('[data-product-hero] img') || $('#product-main-image');
    if (image && hero) hero.src = image.src;
  };
  window.selectCondition = (card) => {
    if (!card) return;
    $$('.condition-card').forEach((item) => {
      item.classList.remove('ring-1', 'ring-primary-container', 'border-primary-container');
      item.classList.add('border-surface-container-high');
    });
    card.classList.remove('border-surface-container-high');
    card.classList.add('border-primary-container', 'ring-1', 'ring-primary-container');
    const price = card.dataset.price;
    if (price && $('#displayed-price')) $('#displayed-price').textContent = price;
    const unavailable = (card.dataset.stockType || '').includes('out-stock') || /tạm hết|hết hàng/i.test(card.textContent);
    ['#btn-buy-now', '#btn-add-cart'].forEach((selector) => {
      const button = $(selector);
      if (button) {
        button.disabled = unavailable;
        button.classList.toggle('opacity-50', unavailable);
      }
    });
  };
  window.triggerCartToast = () => pending('Thêm sản phẩm vào giỏ hàng');

  const differenceToggle = $('#toggle-diff-btn');
  if (differenceToggle) {
    differenceToggle.addEventListener('click', () => {
      const enabled = differenceToggle.getAttribute('aria-checked') !== 'true';
      differenceToggle.setAttribute('aria-checked', String(enabled));
      differenceToggle.classList.toggle('bg-primary-container', enabled);
      differenceToggle.classList.toggle('bg-surface-variant', !enabled);
      $$('.spec-row[data-identical="true"], tr[data-identical="true"]').forEach((row) => show(row, !enabled));
    });
  }

  window.togglePasswordVisibility = (inputId, iconOrButton) => {
    const input = document.getElementById(inputId) || iconOrButton?.closest('button')?.parentElement?.querySelector('input');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    const icon = typeof iconOrButton === 'string'
      ? document.getElementById(iconOrButton)
      : iconOrButton?.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = input.type === 'password' ? 'visibility' : 'visibility_off';
  };
  window.openOtpModal = () => show($('#otp-verification-modal'), true);
  window.closeOtpModal = () => show($('#otp-verification-modal'), false);
  window.switchAuthMode = (mode) => {
    const passwordForm = $('#password-auth-form');
    const otpForm = $('#otp-auth-form');
    if (!passwordForm || !otpForm) return;
    const useOtp = mode === 'otp';
    show(passwordForm, !useOtp);
    show(otpForm, useOtp);
    const passwordTab = $('#subtab-password');
    const otpTab = $('#subtab-otp');
    [passwordTab, otpTab].forEach((tab, index) => {
      if (!tab) return;
      const active = useOtp === (index === 1);
      tab.classList.toggle('bg-surface-container-high', active);
      tab.classList.toggle('text-on-surface', active);
      tab.classList.toggle('font-semibold', active);
      tab.classList.toggle('shadow-sm', active);
      tab.classList.toggle('text-on-surface-variant', !active);
    });
  };

  window.switchAccountState = (state) => {
    const defaultView = $('#view-default');
    const loadingView = $('#view-loading');
    const errorView = $('#view-error');
    [defaultView, loadingView, errorView].forEach((element) => show(element, false));
    const orders = $('#orders-list-content');
    const emptyOrders = $('#orders-empty-state');
    if (orders) show(orders, state === 'default');
    if (emptyOrders) show(emptyOrders, state === 'empty-orders');
    if (state === 'default' || state === 'empty-orders') show(defaultView, true);
    else if (state === 'loading') show(loadingView, true);
    else if (state === 'error') show(errorView, true);
  };
  window.openLogoutModal = () => show($('#logout-modal'), true);
  window.closeLogoutModal = () => show($('#logout-modal'), false);
  window.requestDataRefresh = () => pending('Tải lại dữ liệu');
  window.confirmLogout = () => {
    show($('#logout-modal'), false);
    pending('Đăng xuất');
  };

  window.filterByTab = (status) => {
    const cards = $$('.order-card');
    const stream = $('#orders-stream');
    const empty = $('#state-empty');
    const skeleton = $('#state-skeleton');
    const error = $('#state-error');
    [empty, skeleton, error].forEach((element) => show(element, false));
    let visible = 0;
    cards.forEach((card) => {
      const matches = status === 'all' || card.dataset.status === status;
      show(card, matches);
      if (matches) visible += 1;
    });
    if (stream) show(stream, visible > 0);
    if (empty) show(empty, visible === 0);
    $$('#status-tab-group .tab-item').forEach((button) => {
      const active = (button.getAttribute('onclick') || '').includes(`'${status}'`);
      button.classList.toggle('bg-primary-container', active);
      button.classList.toggle('text-on-primary-container', active);
      button.classList.toggle('font-semibold', active);
    });
  };
  window.cancelOrder = (code) => pending(`Hủy đơn hàng ${code || ''}`.trim());
  window.copyText = async (value) => {
    if (!navigator.clipboard) {
      pending('Sao chép nội dung');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast('Đã sao chép.');
    } catch (error) {
      console.error('Không thể sao chép nội dung:', error);
      pending('Sao chép nội dung');
    }
  };

  $$('[role="tab"]').forEach((button) => button.addEventListener('click', () => {
    const group = button.closest('[role="tablist"]') || button.parentElement;
    $$('[role="tab"]', group).forEach((item) => {
      item.setAttribute('aria-selected', String(item === button));
      item.classList.toggle('active', item === button);
    });
    const target = button.getAttribute('aria-controls');
    if (target) $$('[role="tabpanel"]').forEach((panel) => show(panel, panel.id === target));
  }));
  $$('form').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (form.reportValidity()) {
      pending(form.getAttribute('role') === 'search' ? 'Tìm kiếm sản phẩm' : 'Gửi biểu mẫu');
    }
  }));
  $('#btn-export-spec')?.addEventListener('click', () => window.print());
})();
