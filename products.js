/* ===========================================
   Products Page — Load, Filter, Search, Modal
   =========================================== */

const WHATSAPP_NUMBER = '254700000000'; // TODO: replace with real business number

let ALL_PRODUCTS = [];
let activeFilter = 'All'; // can be a category ("Decorative") or subcategory
let searchTerm = '';
let categoryFilter = '';
let finishFilter = '';
let priceFilter = '';
let sortFilter = 'default';
let orderItems = [];
let cart = {}; // New cart system like bamburicement

const grid = document.getElementById('product-grid');
const resultCount = document.getElementById('product-result-count');
const searchInput = document.getElementById('product-search');
const sidebar = document.getElementById('category-sidebar-list');

const modalOverlay = document.getElementById('product-modal');
const pmodalImg = document.getElementById('pmodal-img');
const pmodalName = document.getElementById('pmodal-name');
const pmodalCode = document.getElementById('pmodal-code');
const pmodalDesc = document.getElementById('pmodal-desc');
const pmodalPriceTable = document.getElementById('pmodal-price-table');
const pmodalPack = document.getElementById('pmodal-pack');
const pmodalCans = document.getElementById('pmodal-cans');
const pmodalAddBtn = document.getElementById('pmodal-add-btn');
const priceAmount = document.getElementById('price-amount');
const pmodalOrderBtn = document.getElementById('pmodal-order-btn');
const pmodalClose = document.getElementById('pmodal-close');
const orderSummaryCard = document.getElementById('order-summary-card');
const orderSummarySubtitle = document.getElementById('order-summary-subtitle');
const orderSummaryList = document.getElementById('order-summary-list');
const sendOrderBtn = document.getElementById('send-order-btn');
const clearOrderBtn = document.getElementById('clear-order-btn');

// Cart drawer elements
const floatingCartBtn = document.getElementById('floating-cart-btn');
const cartBadge = document.getElementById('cart-badge');
const cartDrawer = document.getElementById('cart-drawer');
const cartBackdrop = document.getElementById('cart-backdrop');
const cartPanel = document.getElementById('cart-panel');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItems = document.getElementById('cart-items');
const emptyCartMsg = document.getElementById('empty-cart-msg');
const cartTotal = document.getElementById('cart-total');
const whatsappOrderBtn = document.getElementById('whatsapp-order-btn');
const deliveryProgress = document.getElementById('delivery-progress');
const deliveryAmount = document.getElementById('delivery-amount');
const deliveryBar = document.getElementById('delivery-bar');
const deliveryMessage = document.getElementById('delivery-message');

const FREE_DELIVERY_THRESHOLD = 5000;

function formatKES(amount) {
  return 'KES ' + amount.toLocaleString('en-KE');
}


function showToast(msg) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'fixed bottom-24 md:bottom-24 left-1/2 -translate-x-1/2 bg-crown-navy text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-semibold opacity-0 transition-opacity duration-300 pointer-events-none';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.remove('opacity-0');
  toast.classList.add('opacity-100');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
  }, 2500);
}

function showToastWithAnimation(msg) {
  showToast(msg);
  
  // Also animate the cart indicator
  const cartIndicator = document.getElementById('cart-indicator');
  if (cartIndicator) {
    cartIndicator.classList.remove('scale-100');
    cartIndicator.classList.add('scale-150');
    setTimeout(() => {
      cartIndicator.classList.remove('scale-150');
      cartIndicator.classList.add('scale-100');
    }, 200);
  }
}

function buildWhatsAppLink(items) {
  const lines = items.map((item, index) => {
    const canLabel = item.cans > 1 ? 'cans' : 'can';
    return `${index + 1}. ${item.product.name} — ${item.packSize} • ${item.cans} ${canLabel}`;
  });

  const text = encodeURIComponent(
    `Hi, I would like to place the following order:%0A%0A${lines.join('%0A')}%0A%0APlease confirm availability, pricing and delivery.`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

function renderOrderSummary() {
  const items = Object.values(cart);
  
  if (items.length === 0) {
    orderSummarySubtitle.textContent = 'No products added yet';
    orderSummaryList.innerHTML = '<div class="text-sm text-text-muted py-4 text-center">Add products from the modal to build your order.</div>';
    return;
  }

  const totalCans = items.reduce((sum, item) => sum + item.cans, 0);
  const totalLitres = items.reduce((sum, item) => sum + item.amount * item.cans, 0);
  orderSummarySubtitle.textContent = `${totalCans} can${totalCans === 1 ? '' : 's'} • ${totalLitres} L total`;
  orderSummaryList.innerHTML = items
    .map((item, index) => `
        <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <div>
            <div class="text-sm font-semibold text-text-dark">${index + 1}. ${item.product.name}</div>
            <div class="text-xs text-text-muted">${item.packSize} • ${item.cans} can${item.cans === 1 ? '' : 's'}</div>
          </div>
          <div class="text-sm font-semibold text-crown-red">${formatKES(item.totalPrice)}</div>
        </div>
      `
    )
    .join('');
}

function quickAddProduct(product, packSize, pricePerUnit) {
  if (!packSize || !pricePerUnit) {
    openModal(product);
    return;
  }

  const cans = 1;
  const amount = parseInt(packSize.split(' ')[0], 10);
  const totalPrice = pricePerUnit * cans;

  const cartKey = `${product.name}-${packSize}`;
  
  if (cart[cartKey]) {
    cart[cartKey].cans += cans;
    cart[cartKey].totalPrice += totalPrice;
  } else {
    cart[cartKey] = { 
      product, 
      amount, 
      cans, 
      packSize, 
      pricePerUnit,
      totalPrice 
    };
  }

  renderCart();
  renderOrderSummary();
  showToastWithAnimation(`✓ Added ${product.name} to cart!`);
}

function addToOrder(product) {
  const cans = parseInt(pmodalCans.value, 10);
  const packSize = pmodalPack.value;

  if (!packSize || !Number.isFinite(cans) || cans < 1) {
    return;
  }

  // Extract the numeric value from pack size (e.g., "20 Ltrs" -> 20)
  const amount = parseInt(packSize.split(' ')[0], 10);
  
  // Get price from selected pack size
  const selectedOption = pmodalPack.options[pmodalPack.selectedIndex];
  const pricePerUnit = selectedOption ? parseFloat(selectedOption.dataset.price) || 0 : 0;
  const totalPrice = pricePerUnit * cans;

  // Create unique cart item key
  const cartKey = `${product.name}-${packSize}`;
  
  if (cart[cartKey]) {
    cart[cartKey].cans += cans;
    cart[cartKey].totalPrice += totalPrice;
  } else {
    cart[cartKey] = { 
      product, 
      amount, 
      cans, 
      packSize, 
      pricePerUnit,
      totalPrice 
    };
  }

  renderCart();
  renderOrderSummary();
  closeModal();
  pmodalCans.value = '1';
  pmodalPack.value = '';
  showToastWithAnimation(`✓ ${cans} can(s) of ${product.name} added to cart!`);
}

function renderCart() {
  const items = Object.values(cart);
  const totalCans = items.reduce((s, i) => s + i.cans, 0);
  const totalCost = items.reduce((s, i) => s + i.totalPrice, 0);
  const hasItems = totalCans > 0;

  // Update floating cart badge
  if (cartBadge) {
    cartBadge.textContent = totalCans;
    cartBadge.classList.toggle('hidden', !hasItems);
  }

  // Update cart total
  if (cartTotal) {
    cartTotal.textContent = formatKES(totalCost);
  }

  // Enable/disable WhatsApp button
  if (whatsappOrderBtn) {
    whatsappOrderBtn.disabled = !hasItems;
  }

  // Update delivery progress
  updateDeliveryProgress(totalCost);

  // Render cart items
  if (!hasItems) {
    emptyCartMsg.classList.remove('hidden');
    cartItems.innerHTML = '';
    cartItems.appendChild(emptyCartMsg);
    return;
  }

  emptyCartMsg.classList.add('hidden');
  
  cartItems.innerHTML = items.map((item, key) => `
    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div class="flex gap-3 mb-3">
        <img src="${item.product.image}" alt="${item.product.name}" class="w-16 h-16 object-contain bg-white rounded-lg p-2 flex-shrink-0">
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-bold text-crown-navy truncate">${item.product.name}</h4>
          <p class="text-xs text-text-muted">${item.packSize}</p>
          <p class="text-sm font-bold text-crown-red mt-1">${formatKES(item.pricePerUnit)}</p>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button class="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg text-xl font-bold text-crown-navy hover:bg-gray-100 active:bg-gray-200 transition-colors" data-action="decrease" data-key="${key}">−</button>
          <span class="w-12 text-center text-lg font-bold text-crown-navy">${item.cans}</span>
          <button class="w-10 h-10 flex items-center justify-center bg-crown-navy text-white rounded-lg text-xl font-bold hover:bg-crown-navy-dark active:bg-crown-navy-dark transition-colors" data-action="increase" data-key="${key}">+</button>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold text-crown-navy">${formatKES(item.totalPrice)}</p>
          <button class="text-xs text-crown-red hover:text-crown-red-dark font-medium mt-1" data-action="remove" data-key="${key}">Remove</button>
        </div>
      </div>
    </div>
  `).join('');

  // Add event listeners for cart item actions
  cartItems.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const key = btn.dataset.key;
      
      if (action === 'increase') {
        cart[key].cans += 1;
        cart[key].totalPrice = cart[key].cans * cart[key].pricePerUnit;
      } else if (action === 'decrease') {
        if (cart[key].cans > 1) {
          cart[key].cans -= 1;
          cart[key].totalPrice = cart[key].cans * cart[key].pricePerUnit;
        } else {
          delete cart[key];
        }
      } else if (action === 'remove') {
        delete cart[key];
      }
      
      renderCart();
      renderOrderSummary();
    });
  });
}

function updateDeliveryProgress(totalCost) {
  if (!deliveryProgress) return;
  
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - totalCost);
  const progress = Math.min(100, (totalCost / FREE_DELIVERY_THRESHOLD) * 100);
  
  if (totalCost >= FREE_DELIVERY_THRESHOLD) {
    deliveryProgress.classList.remove('hidden');
    deliveryAmount.textContent = 'Free Delivery!';
    deliveryBar.style.width = '100%';
    deliveryBar.classList.remove('bg-crown-red');
    deliveryBar.classList.add('bg-green-500');
    deliveryMessage.textContent = '🎉 You\'ve qualified for free delivery!';
  } else if (totalCost > 0) {
    deliveryProgress.classList.remove('hidden');
    deliveryAmount.textContent = `${formatKES(totalCost)} / ${formatKES(FREE_DELIVERY_THRESHOLD)}`;
    deliveryBar.style.width = `${progress}%`;
    deliveryBar.classList.add('bg-crown-red');
    deliveryBar.classList.remove('bg-green-500');
    deliveryMessage.textContent = `Add ${formatKES(remaining)} more for free delivery!`;
  } else {
    deliveryProgress.classList.add('hidden');
  }
}

function sendWhatsAppOrder(items, total) {
  const lines = items.map(i =>
    `• ${i.product.name}: ${i.cans} can${i.cans > 1 ? 's' : ''} × ${i.packSize} @ ${formatKES(i.pricePerUnit)} = ${formatKES(i.totalPrice)}`
  ).join('\n');
  const msg = `Hello, I would like to order:\n${lines}\n\n*Total: ${formatKES(total)}*\n\nPlease confirm availability and delivery to my location. Thank you.`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Cart drawer functions
function openCart() {
  cartDrawer.classList.remove('hidden');
  // Trigger animation
  setTimeout(() => {
    cartBackdrop.classList.remove('opacity-0');
    cartPanel.classList.remove('translate-x-full');
  }, 10);
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartBackdrop.classList.add('opacity-0');
  cartPanel.classList.add('translate-x-full');
  setTimeout(() => {
    cartDrawer.classList.add('hidden');
  }, 300);
  document.body.style.overflow = '';
}

// Cart drawer event listeners
if (floatingCartBtn) {
  floatingCartBtn.addEventListener('click', openCart);
}

if (closeCartBtn) {
  closeCartBtn.addEventListener('click', closeCart);
}

if (cartBackdrop) {
  cartBackdrop.addEventListener('click', closeCart);
}

if (whatsappOrderBtn) {
  whatsappOrderBtn.addEventListener('click', () => {
    const items = Object.values(cart);
    const totalCost = items.reduce((s, i) => s + i.totalPrice, 0);
    if (items.length > 0) {
      sendWhatsAppOrder(items, totalCost);
      closeCart();
    }
  });
}

// Close cart on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !cartDrawer.classList.contains('hidden')) {
    closeCart();
  }
});


function sendOrderToWhatsApp() {
  const items = Object.values(cart);
  if (items.length === 0) {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi, I would like to place an order. Please confirm availability and delivery.')}`, '_blank', 'noopener');
    return;
  }
  const totalCost = items.reduce((s, i) => s + i.totalPrice, 0);
  sendWhatsAppOrder(items, totalCost);
}

function clearOrder() {
  cart = {};
  renderCart();
  renderOrderSummary();
}

async function loadProducts() {
  const res = await fetch('products.json');
  ALL_PRODUCTS = await res.json();
  buildSidebar();
  render();
}

function buildSidebar() {
  const groups = {};
  ALL_PRODUCTS.forEach((p) => {
    if (!groups[p.category]) groups[p.category] = new Set();
    groups[p.category].add(p.subcategory);
  });

  let html = `<div class="px-4 py-2 bg-crown-navy text-white rounded-lg text-sm font-semibold cursor-pointer" data-filter="All">All Products</div>`;
  Object.entries(groups).forEach(([cat, subcats]) => {
    html += `<h4 class="font-bold text-crown-navy mt-4 mb-2">${cat}</h4>`;
    [...subcats].forEach((sub) => {
      html += `<div class="px-4 py-2 text-sm text-text-dark hover:bg-gray-100 rounded-lg cursor-pointer transition-colors" data-filter="${sub}">${sub}</div>`;
    });
  });
  sidebar.innerHTML = html;

  // Also populate mobile category list
  const mobileSidebar = document.getElementById('mobile-category-list');
  if (mobileSidebar) {
    mobileSidebar.innerHTML = html;
    mobileSidebar.querySelectorAll('[data-filter]').forEach((el) => {
      el.addEventListener('click', () => {
        activeFilter = el.dataset.filter;
        mobileSidebar.querySelectorAll('[data-filter]').forEach((s) => {
          s.classList.remove('bg-crown-navy', 'text-white');
          s.classList.add('text-text-dark', 'hover:bg-gray-100');
        });
        el.classList.remove('text-text-dark', 'hover:bg-gray-100');
        el.classList.add('bg-crown-navy', 'text-white');
        render();
      });
    });
  }

  sidebar.querySelectorAll('[data-filter]').forEach((el) => {
    el.addEventListener('click', () => {
      activeFilter = el.dataset.filter;
      sidebar.querySelectorAll('[data-filter]').forEach((s) => {
        s.classList.remove('bg-crown-navy', 'text-white');
        s.classList.add('text-text-dark', 'hover:bg-gray-100');
      });
      el.classList.remove('text-text-dark', 'hover:bg-gray-100');
      el.classList.add('bg-crown-navy', 'text-white');
      render();
    });
  });

  // Populate category filter dropdown
  const categoryFilterDropdown = document.getElementById('category-filter');
  if (categoryFilterDropdown) {
    const categories = Object.keys(groups);
    categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categoryFilterDropdown.appendChild(option);
    });
  }
}

function getFiltered() {
  let filtered = ALL_PRODUCTS.filter((p) => {
    const matchesFilter = activeFilter === 'All' || p.subcategory === activeFilter || p.category === activeFilter;
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm) ||
      (p.code && p.code.toLowerCase().includes(searchTerm)) ||
      p.description.toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryFilter || p.category === categoryFilter || p.subcategory === categoryFilter;
    const matchesFinish = !finishFilter || p.name.toLowerCase().includes(finishFilter.toLowerCase());
    
    // Price filter
    let matchesPrice = true;
    if (priceFilter && p.prices && p.prices.length > 0) {
      const minPrice = Math.min(...p.prices.map((x) => x.price));
      if (priceFilter === '0-1000') {
        matchesPrice = minPrice < 1000;
      } else if (priceFilter === '1000-5000') {
        matchesPrice = minPrice >= 1000 && minPrice <= 5000;
      } else if (priceFilter === '5000-10000') {
        matchesPrice = minPrice >= 5000 && minPrice <= 10000;
      } else if (priceFilter === '10000+') {
        matchesPrice = minPrice >= 10000;
      }
    }
    
    return matchesFilter && matchesSearch && matchesCategory && matchesFinish && matchesPrice;
  });

  // Sort
  if (sortFilter === 'price-low') {
    filtered.sort((a, b) => {
      const priceA = a.prices && a.prices.length > 0 ? Math.min(...a.prices.map((x) => x.price)) : Infinity;
      const priceB = b.prices && b.prices.length > 0 ? Math.min(...b.prices.map((x) => x.price)) : Infinity;
      return priceA - priceB;
    });
  } else if (sortFilter === 'price-high') {
    filtered.sort((a, b) => {
      const priceA = a.prices && a.prices.length > 0 ? Math.max(...a.prices.map((x) => x.price)) : 0;
      const priceB = b.prices && b.prices.length > 0 ? Math.max(...b.prices.map((x) => x.price)) : 0;
      return priceB - priceA;
    });
  } else if (sortFilter === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  return filtered;
}

function render() {
  const filtered = getFiltered();
  resultCount.textContent = `${filtered.length} product${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-16">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 class="text-lg font-semibold text-text-dark mb-2">No products found</h3>
        <p class="text-text-muted">Try adjusting your filters or search terms</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map((p) => {
      const idx = ALL_PRODUCTS.indexOf(p);
      const hasPrice = p.prices && p.prices.length > 0;
      const fromPrice = hasPrice ? Math.min(...p.prices.map((x) => x.price)) : null;
      const lowestPricePack = hasPrice ? p.prices.find((pr) => pr.price === fromPrice) : null;

      return `
      <div class="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer border border-gray-100" data-index="${idx}">
        <div class="relative overflow-hidden bg-gray-100">
          <img src="${p.image}" alt="${p.name}" class="w-full aspect-square object-contain p-4 group-hover:scale-105 transition-transform duration-500" loading="lazy">
          <div class="absolute top-3 left-3">
            <span class="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-xs font-semibold text-crown-red shadow-sm">${p.subcategory}</span>
          </div>
          ${hasPrice ? `
            <div class="absolute top-3 right-3">
              <span class="px-3 py-1.5 bg-crown-navy/95 backdrop-blur-sm rounded-full text-xs font-semibold text-white shadow-sm">From ${formatKES(fromPrice)}</span>
            </div>
          ` : ''}
        </div>
        <div class="p-4 md:p-5 flex flex-col flex-1">
          <h3 class="text-sm md:text-base font-bold text-crown-navy mb-2 line-clamp-2">${p.name}</h3>
          <p class="text-xs md:text-sm text-text-muted mb-4 line-clamp-2 flex-1">${p.description}</p>
          <div class="flex gap-2">
            <button class="quick-add-btn flex-1 px-4 py-2.5 bg-crown-red text-white font-semibold text-xs md:text-sm rounded-xl hover:bg-crown-red-dark transition-all flex items-center justify-center gap-2" data-index="${idx}" data-pack="${lowestPricePack ? lowestPricePack.pack : ''}" data-price="${fromPrice || 0}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Quick Add
            </button>
            <button class="view-btn px-4 py-2.5 border-2 border-crown-navy text-crown-navy font-semibold text-xs md:text-sm rounded-xl hover:bg-crown-navy hover:text-white transition-all" data-index="${idx}">
              View
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  // Quick Add buttons
  grid.querySelectorAll('.quick-add-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const product = ALL_PRODUCTS[parseInt(btn.dataset.index, 10)];
      const pack = btn.dataset.pack;
      const price = parseFloat(btn.dataset.price) || 0;
      quickAddProduct(product, pack, price);
    });
  });

  // View buttons
  grid.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const product = ALL_PRODUCTS[parseInt(btn.dataset.index, 10)];
      openModal(product);
    });
  });

  // Also make the whole card clickable (except buttons)
  grid.querySelectorAll('[data-index]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        const product = ALL_PRODUCTS[parseInt(card.dataset.index, 10)];
        openModal(product);
      }
    });
  });
}

function openModal(product) {
  pmodalImg.src = product.image;
  pmodalImg.alt = product.name;
  pmodalName.textContent = product.name;
  pmodalCode.textContent = product.code && product.code !== '—' ? `Product code: ${product.code}` : '';
  pmodalDesc.textContent = product.description;
  pmodalAddBtn.dataset.index = ALL_PRODUCTS.indexOf(product);

  if (product.prices && product.prices.length > 0) {
    pmodalPriceTable.innerHTML = `
      <div class="mb-4">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-2 text-text-muted">Pack Size</th>
              <th class="text-right py-2 text-text-muted">Price</th>
            </tr>
          </thead>
          <tbody>
            ${product.prices.map((pr) => `<tr class="border-b border-gray-100"><td class="py-2">${pr.pack}</td><td class="text-right py-2 font-semibold">${formatKES(pr.price)}</td></tr>`).join('')}
          </tbody>
        </table>
        <p class="text-xs text-text-muted mt-2">Prices sourced from Crown Paints' official price list. Final price confirmed on WhatsApp.</p>
      </div>
    `;
    
    // Populate pack size dropdown
    pmodalPack.innerHTML = '<option value="">Select pack size...</option>' +
      product.prices.map((pr) => `<option value="${pr.pack}" data-price="${pr.price}">${pr.pack}</option>`).join('');
  } else {
    pmodalPriceTable.innerHTML = `<p class="text-sm text-text-muted mb-4">${product.priceNote || 'Contact us for current pricing on this product.'}</p>`;
    pmodalPack.innerHTML = '<option value="">Contact for pricing</option>';
  }

  pmodalCans.value = '1';
  pmodalPack.value = '';
  updatePriceDisplay();
  modalOverlay.classList.remove('hidden');
  modalOverlay.classList.add('flex');
}

function updatePriceDisplay() {
  const selectedOption = pmodalPack.options[pmodalPack.selectedIndex];
  const pricePerUnit = selectedOption ? parseFloat(selectedOption.dataset.price) || 0 : 0;
  const cans = parseInt(pmodalCans.value, 10) || 0;
  const total = pricePerUnit * cans;
  
  if (total > 0) {
    priceAmount.textContent = formatKES(total);
  } else {
    priceAmount.textContent = 'KES 0';
  }
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalOverlay.classList.remove('flex');
}

pmodalAddBtn.addEventListener('click', () => {
  const product = ALL_PRODUCTS[parseInt(pmodalAddBtn.dataset.index || '0', 10)];
  if (product) addToOrder(product);
});
pmodalOrderBtn.addEventListener('click', sendOrderToWhatsApp);
pmodalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
sendOrderBtn.addEventListener('click', sendOrderToWhatsApp);
clearOrderBtn.addEventListener('click', clearOrder);

// Add event listeners for dynamic price updates
pmodalCans.addEventListener('input', updatePriceDisplay);
pmodalPack.addEventListener('change', updatePriceDisplay);

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  render();
});

// Category filter
const categoryFilterEl = document.getElementById('category-filter');
if (categoryFilterEl) {
  categoryFilterEl.addEventListener('change', (e) => {
    categoryFilter = e.target.value;
    updateClearFiltersButton();
    render();
  });
}

// Finish filter
const finishFilterEl = document.getElementById('finish-filter');
if (finishFilterEl) {
  finishFilterEl.addEventListener('change', (e) => {
    finishFilter = e.target.value;
    updateClearFiltersButton();
    render();
  });
}

// Price filter
const priceFilterEl = document.getElementById('price-filter');
if (priceFilterEl) {
  priceFilterEl.addEventListener('change', (e) => {
    priceFilter = e.target.value;
    updateClearFiltersButton();
    render();
  });
}

// Sort filter
const sortFilterEl = document.getElementById('sort-filter');
if (sortFilterEl) {
  sortFilterEl.addEventListener('change', (e) => {
    sortFilter = e.target.value;
    render();
  });
}

// Clear filters
const clearFiltersBtn = document.getElementById('clear-filters');
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', () => {
    categoryFilter = '';
    finishFilter = '';
    priceFilter = '';
    if (document.getElementById('category-filter')) document.getElementById('category-filter').value = '';
    if (document.getElementById('finish-filter')) document.getElementById('finish-filter').value = '';
    if (document.getElementById('price-filter')) document.getElementById('price-filter').value = '';
    updateClearFiltersButton();
    render();
  });
}

function updateClearFiltersButton() {
  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) {
    const hasFilters = categoryFilter || finishFilter || priceFilter;
    clearBtn.classList.toggle('hidden', !hasFilters);
  }
}

renderOrderSummary();
renderCart();
loadProducts();
