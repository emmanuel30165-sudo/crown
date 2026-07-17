/* ===========================================
   Colour Chart — Load, Filter, Search, Modal
   =========================================== */

const WHATSAPP_NUMBER = '254700000000'; // TODO: replace with real business number

let ALL_COLOURS = [];
let ALL_PRODUCTS = [];
let activeCategory = 'All';
let searchTerm = '';
let colourOrderItems = [];

const grid = document.getElementById('colour-grid');
const resultCount = document.getElementById('result-count');
const searchInput = document.getElementById('colour-search');
const pillsWrap = document.getElementById('category-pills');

const modalOverlay = document.getElementById('colour-modal');
const modalSwatch = document.getElementById('modal-swatch');
const modalName = document.getElementById('modal-name');
const modalCode = document.getElementById('modal-code');
const modalCategory = document.getElementById('modal-category');
const modalHex = document.getElementById('modal-hex');
const modalOrderBtn = document.getElementById('modal-order-btn');
const modalCopyBtn = document.getElementById('modal-copy-btn');
const modalAddBtn = document.getElementById('modal-add-btn');
const modalClose = document.getElementById('modal-close');
const productPreviewGrid = document.getElementById('product-preview-grid');
const colourProductSelect = document.getElementById('colour-product-select');
const colourCans = document.getElementById('colour-cans');
const colourPack = document.getElementById('colour-pack');
const colourPriceAmount = document.getElementById('colour-price-amount');
const colourOrderSummaryCard = document.getElementById('colour-order-summary-card');
const colourOrderSummarySubtitle = document.getElementById('colour-order-summary-subtitle');
const colourOrderSummaryList = document.getElementById('colour-order-summary-list');
const sendColourOrderBtn = document.getElementById('send-colour-order-btn');
const clearColourOrderBtn = document.getElementById('clear-colour-order-btn');

async function loadColours() {
  const res = await fetch('crown_colours.json');
  ALL_COLOURS = await res.json();
  buildCategoryPills();
  render();
}

async function loadFeaturedProducts() {
  const res = await fetch('products.json');
  ALL_PRODUCTS = await res.json();
  const previewProducts = ALL_PRODUCTS.slice(0, 6);
  productPreviewGrid.innerHTML = previewProducts
    .map(
      (product) => `
        <article class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100">
          <img src="${product.image}" alt="${product.name}" class="w-full aspect-square object-contain p-4 bg-gray-100">
          <div class="p-4">
            <h3 class="text-sm font-bold text-crown-navy mb-1">${product.name}</h3>
            <p class="text-xs text-text-muted mb-3">${product.subcategory}</p>
            <a href="products.html" class="inline-block px-4 py-2 border-2 border-crown-navy text-crown-navy font-semibold text-xs rounded-lg hover:bg-crown-navy hover:text-white transition-all text-center">View product</a>
          </div>
        </article>
      `
    )
    .join('');
  
  // Build product select after products are loaded
  buildProductSelect();
}

function buildProductSelect() {
  if (!colourProductSelect) return;
  
  // Filter out products that don't have decorative colors
  const nonColorSubcategories = [
    'Primers',
    'Undercoats', 
    'Putties & Fillers',
    'Wallcare'
  ];
  
  const nonColorKeywords = [
    'primer',
    'undercoat',
    'putty',
    'filler',
    'wallcare',
    'sealer',
    'clear',
    'varnish',
    'treatment',
    'sanding',
    'insulating',
    'red oxide',
    'zinc',
    'metal primer',
    'wood primer',
    'etch primer',
    'alkali'
  ];
  
  const coloredProducts = ALL_PRODUCTS.filter((product, index) => {
    const subcategory = product.subcategory.toLowerCase();
    const name = product.name.toLowerCase();
    const description = product.description.toLowerCase();
    
    // Check if it's in a non-color subcategory
    if (nonColorSubcategories.some(cat => subcategory.includes(cat.toLowerCase()))) {
      return false;
    }
    
    // Check if it contains non-color keywords
    if (nonColorKeywords.some(keyword => 
      name.includes(keyword) || description.includes(keyword)
    )) {
      return false;
    }
    
    return true;
  });
  
  colourProductSelect.innerHTML = '<option value="">Select a paint type...</option>' +
    coloredProducts.map((product) => {
      const originalIndex = ALL_PRODUCTS.indexOf(product);
      return `<option value="${originalIndex}">${product.name} (${product.subcategory})</option>`;
    }).join('');
    
  // Add event listener to update pack sizes when product is selected
  colourProductSelect.addEventListener('change', () => {
    const productIndex = colourProductSelect.value;
    if (productIndex && ALL_PRODUCTS[productIndex]) {
      const product = ALL_PRODUCTS[productIndex];
      if (product.prices && product.prices.length > 0) {
        colourPack.innerHTML = '<option value="">Select pack size...</option>' +
          product.prices.map((pr) => `<option value="${pr.pack}" data-price="${pr.price}">${pr.pack}</option>`).join('');
      } else {
        colourPack.innerHTML = '<option value="">Contact for pricing</option>';
      }
    } else {
      colourPack.innerHTML = '<option value="">Select paint first...</option>';
    }
    updateColourPriceDisplay();
  });
}

function buildCategoryPills() {
  const categories = ['All', ...new Set(ALL_COLOURS.map((c) => c.category))];
  pillsWrap.innerHTML = categories
    .map(
      (cat) =>
        `<button class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${cat === 'All' ? 'bg-crown-navy text-white' : 'bg-gray-100 text-text-dark hover:bg-gray-200'}" data-cat="${cat}">${cat}</button>`
    )
    .join('');

  pillsWrap.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      pillsWrap.querySelectorAll('button').forEach((p) => {
        p.classList.remove('bg-crown-navy', 'text-white');
        p.classList.add('bg-gray-100', 'text-text-dark', 'hover:bg-gray-200');
      });
      btn.classList.remove('bg-gray-100', 'text-text-dark', 'hover:bg-gray-200');
      btn.classList.add('bg-crown-navy', 'text-white');
      render();
    });
  });
}

function getFiltered() {
  return ALL_COLOURS.filter((c) => {
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory;
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm) ||
      c.code.toLowerCase().includes(searchTerm) ||
      c.hex.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });
}

function render() {
  const filtered = getFiltered();
  resultCount.textContent = `${filtered.length} colour${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-16 text-text-muted">No colours match "${searchTerm}". Try a different name or code.</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (c) => `
    <div class="group relative cursor-pointer rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all" data-index="${ALL_COLOURS.indexOf(c)}">
      <div class="aspect-square w-full" style="background:${c.hex};"></div>
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div class="text-white text-xs font-medium truncate">${c.name}</div>
        <div class="text-white/80 text-xs">${c.code}</div>
      </div>
    </div>
  `
    )
    .join('');

  grid.querySelectorAll('[data-index]').forEach((card) => {
    card.addEventListener('click', () => {
      const colour = ALL_COLOURS[parseInt(card.dataset.index, 10)];
      openModal(colour);
    });
  });
}

function openModal(colour) {
  modalSwatch.style.background = colour.hex;
  modalName.textContent = colour.name;
  modalCode.textContent = colour.code;
  modalCategory.textContent = colour.category;
  modalHex.textContent = colour.hex;

  // Reset form
  if (colourProductSelect) colourProductSelect.value = '';
  if (colourCans) colourCans.value = '1';
  if (colourPack) colourPack.innerHTML = '<option value="">Select paint first...</option>';
  
  // Reset price display
  if (colourPriceAmount) {
    colourPriceAmount.textContent = 'KES 0';
  }

  const msg = encodeURIComponent(
    `Hi, I'd like to order Crown Paints in "${colour.name}" (${colour.code}, ${colour.hex}). Could you confirm pricing and pack sizes?`
  );
  modalOrderBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  modalCopyBtn.dataset.text = `${colour.name} — ${colour.code} — ${colour.hex}`;

  modalOverlay.classList.remove('hidden');
  modalOverlay.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function updateColourPriceDisplay() {
  const selectedOption = colourPack.options[colourPack.selectedIndex];
  const pricePerUnit = selectedOption ? parseFloat(selectedOption.dataset.price) || 0 : 0;
  const cans = parseInt(colourCans.value, 10) || 0;
  const total = pricePerUnit * cans;
  
  if (total > 0) {
    colourPriceAmount.textContent = 'KES ' + total.toLocaleString('en-KE');
    colourPriceAmount.classList.add('has-price');
  } else {
    colourPriceAmount.textContent = 'KES 0';
    colourPriceAmount.classList.remove('has-price');
  }
}

async function copyDetails() {
  const text = modalCopyBtn.dataset.text || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    modalCopyBtn.textContent = 'Copied!';
    setTimeout(() => {
      modalCopyBtn.textContent = 'Copy Details';
    }, 1400);
  } catch (err) {
    modalCopyBtn.textContent = 'Copy failed';
    setTimeout(() => {
      modalCopyBtn.textContent = 'Copy Details';
    }, 1400);
  }
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalOverlay.classList.remove('flex');
  document.body.style.overflow = '';
}

function addColourToOrder() {
  const productIndex = colourProductSelect.value;
  const cans = parseInt(colourCans.value, 10);
  const packSize = colourPack.value;
  
  if (!productIndex || !packSize || !Number.isFinite(cans) || cans < 1) {
    alert('Please select a paint type, pack size and enter valid quantities.');
    return;
  }
  
  const product = ALL_PRODUCTS[parseInt(productIndex, 10)];
  const colour = {
    name: modalName.textContent,
    code: modalCode.textContent,
    hex: modalHex.textContent
  };
  
  // Extract the numeric value from pack size (e.g., "20 Ltrs" -> 20)
  const amount = parseInt(packSize.split(' ')[0], 10);
  
  colourOrderItems.push({ product, colour, amount, cans, packSize });
  renderColourOrderSummary();
  alert(`Added ${cans} can(s) of ${product.name} in ${colour.name} to your order!`);
  closeModal();
}

function renderColourOrderSummary() {
  if (colourOrderItems.length === 0) {
    colourOrderSummarySubtitle.textContent = 'No colours added yet';
    colourOrderSummaryList.innerHTML = '<div class="text-sm text-text-muted py-4 text-center">Add colours from the modal to build your order.</div>';
    return;
  }

  const totalCans = colourOrderItems.reduce((sum, item) => sum + item.cans, 0);
  const totalLitres = colourOrderItems.reduce((sum, item) => sum + item.amount * item.cans, 0);
  colourOrderSummarySubtitle.textContent = `${totalCans} can${totalCans === 1 ? '' : 's'} • ${totalLitres} L total`;
  colourOrderSummaryList.innerHTML = colourOrderItems
    .map(
      (item, index) => `
        <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex-shrink-0" style="background:${item.colour.hex};"></div>
            <div>
              <div class="text-sm font-semibold text-text-dark">${index + 1}. ${item.product.name} in ${item.colour.name}</div>
              <div class="text-xs text-text-muted">${item.packSize} • ${item.cans} can${item.cans === 1 ? '' : 's'}</div>
            </div>
          </div>
        </div>
      `
    )
    .join('');
}

function clearColourOrder() {
  colourOrderItems = [];
  renderColourOrderSummary();
}

function sendColourOrderToWhatsApp() {
  if (colourOrderItems.length === 0) {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi, I would like to place a colour order. Please confirm availability and delivery.')}`, '_blank', 'noopener');
    return;
  }
  window.open(buildColourWhatsAppLink(colourOrderItems), '_blank', 'noopener');
}

function buildColourWhatsAppLink(items) {
  if (!items || items.length === 0) {
    const colour = {
      name: modalName.textContent,
      code: modalCode.textContent,
      hex: modalHex.textContent
    };
    const msg = encodeURIComponent(
      `Hi, I'd like to order Crown Paints in "${colour.name}" (${colour.code}, ${colour.hex}). Could you confirm pricing and pack sizes?`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  }
  
  const lines = items.map((item, index) => {
    const canLabel = item.cans > 1 ? 'cans' : 'can';
    return `${index + 1}. ${item.product.name} in ${item.colour.name} (${item.colour.code}) — ${item.packSize} • ${item.cans} ${canLabel}`;
  });
  
  const text = encodeURIComponent(
    `Hi, I would like to place the following colour order:%0A%0A${lines.join('%0A')}%0A%0APlease confirm availability, pricing and delivery.`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

modalClose.addEventListener('click', closeModal);
modalCopyBtn.addEventListener('click', copyDetails);
modalAddBtn.addEventListener('click', addColourToOrder);
modalOrderBtn.addEventListener('click', (e) => {
  e.preventDefault();
  modalOrderBtn.href = buildColourWhatsAppLink(colourOrderItems);
});
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal();
});

// Add event listeners for dynamic price updates
colourCans.addEventListener('input', updateColourPriceDisplay);
colourPack.addEventListener('change', updateColourPriceDisplay);

// Add event listeners for colour order summary
sendColourOrderBtn.addEventListener('click', sendColourOrderToWhatsApp);
clearColourOrderBtn.addEventListener('click', clearColourOrder);

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  render();
});

loadColours();
loadFeaturedProducts();
renderColourOrderSummary();
