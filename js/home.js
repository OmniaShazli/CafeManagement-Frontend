document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedItems();
});

async function loadFeaturedItems() {
  const grid = $('#featured-grid');
  if (!grid) return;

  grid.innerHTML = skeletonCards(3);

  try {
    const items = await MenuItemAPI.list();
    const available = (Array.isArray(items) ? items : []).filter((i) => i.isAvailable !== false);
    const featured = available.slice(0, 6);

    if (featured.length === 0) {
      grid.innerHTML = emptyState('coffee', 'Our menu is brewing', 'Fresh items will appear here soon.');
      refreshIcons();
      return;
    }

    grid.innerHTML = featured.map(featuredCardHtml).join('');
    attachCardImages(grid);
    refreshIcons();
  } catch (error) {
    grid.innerHTML = emptyState(
      'coffee',
      'Menu preview unavailable',
      'We could not reach the kitchen right now. The full menu page has the details.'
    );
    refreshIcons();
  }
}

function featuredCardHtml(item) {
  const image = resolveImageUrl(item.imageUrl);
  const media = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" loading="lazy" data-card-img>`
    : `<div class="item-media-fallback"><i data-lucide="coffee"></i></div>`;

  return `
    <article class="item-card reveal">
      <div class="item-media">${media}</div>
      <div class="item-body">
        <h3 class="item-name">${escapeHtml(item.name)}</h3>
        <p class="item-desc">${escapeHtml(item.description || 'A house favourite, prepared fresh to order.')}</p>
        <div class="item-foot">
          <span class="item-price">${formatMoney(item.price)}</span>
          <a class="add-btn" href="menu.html"><i data-lucide="arrow-right"></i> Order</a>
        </div>
      </div>
    </article>
  `;
}

 
function attachCardImages(root) {
  $$('img[data-card-img]', root).forEach((img) => {
    img.addEventListener('error', () => {
      const fallback = document.createElement('div');
      fallback.className = 'item-media-fallback';
      fallback.innerHTML = '<i data-lucide="coffee"></i>';
      img.replaceWith(fallback);
      refreshIcons();
    });
  });
}
