const CART_KEY = 'terra_cart';

const state = {
  categories: [],
  items: [],
  tables: [],
  cart: loadCart(),
  activeCategory: 'all',
  query: '',
  orderType: 'DineIn',
};

document.addEventListener('DOMContentLoaded', () => {
  bindCartEvents();
  loadMenu();
  loadTables();
});

 

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function persistCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

async function loadMenu() {
  const grid = $('#menu-grid');
  grid.innerHTML = skeletonCards(6);

  try {
    const [categories, items] = await Promise.all([
      CategoryAPI.list(),
      MenuItemAPI.list(),
    ]);

    state.categories = Array.isArray(categories) ? categories : [];
    state.items = Array.isArray(items) ? items : [];

    const wanted = new URLSearchParams(window.location.search).get('cat');
    if (wanted) state.activeCategory = wanted;

    renderChips();
    renderItems();
  } catch (error) {
    grid.innerHTML = emptyState('coffee', 'The menu is unavailable', error.message);
    refreshIcons();
  }
}

async function loadTables() {
  try {
    const tables = await TableAPI.list();
    state.tables = Array.isArray(tables) ? tables : [];
    renderTableOptions();
  } catch {

    state.tables = [];
  }
}

 

function renderChips() {
  const mount = $('#category-chips');
  const chips = [
    `<button type="button" class="chip-btn ${state.activeCategory === 'all' ? 'is-active' : ''}" data-cat="all">All</button>`,
    ...state.categories.map(
      (cat) =>
        `<button type="button" class="chip-btn ${String(cat.id) === String(state.activeCategory) ? 'is-active' : ''}" data-cat="${cat.id}">${escapeHtml(cat.name)}</button>`
    ),
  ];

  mount.innerHTML = chips.join('');
  $$('.chip-btn', mount).forEach((btn) =>
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      renderChips();
      renderItems();
    })
  );
}

function visibleItems() {
  return state.items.filter((item) => {
    const matchesCategory =
      state.activeCategory === 'all' || String(item.categoryId) === String(state.activeCategory);
    const matchesQuery =
      !state.query || (item.name || '').toLowerCase().includes(state.query.toLowerCase());
    return matchesCategory && matchesQuery;
  });
}

function renderItems() {
  const grid = $('#menu-grid');
  const items = visibleItems();

  if (items.length === 0) {
    grid.innerHTML = emptyState('search', 'Nothing matched', 'Try another category or a different search.');
    refreshIcons();
    return;
  }

  grid.innerHTML = items.map(itemCardHtml).join('');

  $$('[data-add]', grid).forEach((btn) =>
    btn.addEventListener('click', () => addToCart(Number(btn.dataset.add)))
  );

  $$('img[data-card-img]', grid).forEach((img) =>
    img.addEventListener('error', () => {
      const fallback = document.createElement('div');
      fallback.className = 'item-media-fallback';
      fallback.innerHTML = '<i data-lucide="coffee"></i>';
      img.replaceWith(fallback);
      refreshIcons();
    })
  );

  refreshIcons();
}

function itemCardHtml(item) {
  const soldOut = item.isAvailable === false;
  const image = resolveImageUrl(item.imageUrl);
  const media = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" loading="lazy" data-card-img>`
    : `<div class="item-media-fallback"><i data-lucide="coffee"></i></div>`;

  return `
    <article class="item-card ${soldOut ? 'is-soldout' : ''}">
      <div class="item-media">
        ${media}
        ${soldOut ? '<span class="soldout-flag">Sold out</span>' : ''}
      </div>
      <div class="item-body">
        <h3 class="item-name">${escapeHtml(item.name)}</h3>
        <p class="item-desc">${escapeHtml(item.description || 'Prepared fresh to order.')}</p>
        <div class="item-foot">
          <span class="item-price">${formatMoney(item.price)}</span>
          <button type="button" class="add-btn" data-add="${item.id}" ${soldOut ? 'disabled' : ''}>
            <i data-lucide="plus"></i> Add
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderTableOptions() {
  const select = $('#order-table');
  const available = state.tables.filter((t) => t.isAvailable !== false);

  if (available.length === 0) {
    select.innerHTML = '<option value="">No tables available right now</option>';
    return;
  }

  select.innerHTML = available
    .map(
      (t) =>
        `<option value="${t.id}">Table ${t.tableNumber ?? t.id} · seats ${t.capacity ?? '—'}</option>`
    )
    .join('');
}

 

function cartTotals() {
  const count = state.cart.reduce((sum, line) => sum + line.qty, 0);
  const total = state.cart.reduce((sum, line) => sum + line.qty * line.price, 0);
  return { count, total };
}

function addToCart(itemId) {
  const item = state.items.find((i) => Number(i.id) === itemId);
  if (!item) return;

  const existing = state.cart.find((line) => line.id === itemId);
  if (existing) existing.qty += 1;
  else state.cart.push({ id: item.id, name: item.name, price: Number(item.price) || 0, qty: 1 });

  persistCart();
  renderCart();
  showToast(`${item.name} added to your order.`);
  openDrawer();
}

function changeQty(itemId, delta) {
  const line = state.cart.find((l) => l.id === itemId);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.cart = state.cart.filter((l) => l.id !== itemId);
  persistCart();
  renderCart();
}

function removeLine(itemId) {
  state.cart = state.cart.filter((l) => l.id !== itemId);
  persistCart();
  renderCart();
}

function renderCart() {
  const lines = $('#cart-lines');
  const { count, total } = cartTotals();

  $('#cart-fab').classList.toggle('hidden', count === 0);
  $('#cart-count').textContent = count;
  $('#cart-summary-label').textContent =
    count === 0 ? 'Nothing added yet' : `${count} item${count > 1 ? 's' : ''}`;

  if (state.cart.length === 0) {
    lines.innerHTML = emptyState('shopping-bag', 'Your tray is empty', 'Add something delicious from the menu.');
  } else {
    lines.innerHTML = state.cart
      .map(
        (line) => `
        <div class="cart-line">
          <div>
            <p class="cart-line-name">${escapeHtml(line.name)}</p>
            <p class="cart-line-price">${formatMoney(line.price)} each</p>
            <button type="button" class="cart-remove" data-remove="${line.id}">Remove</button>
          </div>
          <div class="gap-sm">
            <div class="qty">
              <button type="button" data-dec="${line.id}" aria-label="Decrease"><i data-lucide="minus"></i></button>
              <span class="qty-value">${line.qty}</span>
              <button type="button" data-inc="${line.id}" aria-label="Increase"><i data-lucide="plus"></i></button>
            </div>
          </div>
        </div>
      `
      )
      .join('');

    $$('[data-inc]', lines).forEach((b) => b.addEventListener('click', () => changeQty(Number(b.dataset.inc), 1)));
    $$('[data-dec]', lines).forEach((b) => b.addEventListener('click', () => changeQty(Number(b.dataset.dec), -1)));
    $$('[data-remove]', lines).forEach((b) => b.addEventListener('click', () => removeLine(Number(b.dataset.remove))));
  }

  $('#cart-total').textContent = formatMoney(total);
  refreshIcons();
}

 

function bindCartEvents() {
  $('#menu-search').addEventListener('input', (event) => {
    state.query = event.target.value.trim();
    renderItems();
  });

  $('#cart-fab').addEventListener('click', openDrawer);
  $('#cart-close').addEventListener('click', closeDrawer);
  $('#cart-overlay').addEventListener('click', closeDrawer);

  $$('#order-type-seg button').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.orderType = btn.dataset.type;
        $$('#order-type-seg button').forEach((b) => b.classList.toggle('is-active', b === btn));
      $('#table-field').classList.toggle('hidden', state.orderType !== 'DineIn');
    })
  );

  $('#place-order').addEventListener('click', placeOrder);

  renderCart();
}

function openDrawer() {
  renderCart();
  const overlay = $('#cart-overlay');
  const drawer = $('#cart-drawer');
  overlay.classList.remove('hidden');
  drawer.classList.remove('hidden');
  void overlay.offsetWidth;
  overlay.classList.add('is-open');
  drawer.classList.add('is-open');
}

function closeDrawer() {
  $('#cart-overlay').classList.remove('is-open');
  setTimeout(() => $('#cart-overlay').classList.add('hidden'), 260);
  $('#cart-drawer').classList.remove('is-open');
}

 

async function placeOrder() {
  if (state.cart.length === 0) {
    showToast('Add at least one item before placing an order.', 'info');
    return;
  }

  if (!isLoggedIn()) {
    showToast('Please sign in to place your order.', 'info');
    setTimeout(redirectToLogin, 900);
    return;
  }

  const tableIdValue = $('#order-table').value;
  const dto = {
    orderType: state.orderType,
    tableId: state.orderType === 'DineIn' && tableIdValue ? Number(tableIdValue) : null,
    notes: $('#order-notes').value.trim() || null,
    orderItems: state.cart.map((line) => ({ menuItemId: line.id, quantity: line.qty })),
  };

  const button = $('#place-order');
  button.disabled = true;
  button.textContent = 'Placing your order…';

  try {
    await OrderAPI.create(dto);
    state.cart = [];
    persistCart();
    renderCart();
    closeDrawer();
    showToast('Order placed! The barista is on it.');
    setTimeout(() => { window.location.href = 'orders.html'; }, 1100);
  } catch (error) {
    showToast(error.message, 'error');
    button.disabled = false;
    button.innerHTML = 'Place order <i data-lucide="arrow-right"></i>';
    refreshIcons();
  }
}
