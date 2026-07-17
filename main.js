/* ===========================================
   Crown Paints — Homepage Interactions
   =========================================== */

// ---- Mobile nav toggle ----
const mobileToggle = document.querySelector('.mobile-toggle');
const mainNav = document.querySelector('.main-nav');

if (mobileToggle && mainNav) {
  mobileToggle.addEventListener('click', () => {
    mainNav.classList.toggle('open');
  });
}

// ---- Load products preview on homepage ----
async function loadProductsPreview() {
  const previewGrid = document.getElementById('products-preview-grid');
  if (!previewGrid) return;

  try {
    const res = await fetch('products.json');
    const products = await res.json();
    const previewProducts = products.slice(0, 6);

    previewGrid.innerHTML = previewProducts
      .map(
        (product) => `
        <article class="product-preview-card">
          <img src="${product.image}" alt="${product.name}">
          <h3>${product.name}</h3>
          <p>${product.subcategory}</p>
          <a href="products.html" class="btn btn-outline">View product</a>
        </article>
      `
      )
      .join('');
  } catch (err) {
    console.error('Failed to load products preview:', err);
  }
}

// Initialize products preview if on homepage
if (document.getElementById('products-preview-grid')) {
  loadProductsPreview();
}
// ---- Delivery origin: Crown Paints HQ, Likoni Road, Industrial Area, Nairobi ----
const ORIGIN = { lat: -1.29205965, lng: 36.82194619999999, label: 'Likoni Road, Industrial Area, Nairobi' };

// Haversine distance in km between two lat/lng points
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance (km) -> estimated delivery window (hours)
// NOTE: this is a straight-line-distance approximation, not real road routing.
// It is intentionally presented as an estimate, not a guarantee.
function estimateEtaHours(distanceKm) {
  if (distanceKm <= 40) return { min: 1, max: 2 };
  if (distanceKm <= 100) return { min: 2, max: 3 };
  if (distanceKm <= 250) return { min: 3, max: 5 };
  if (distanceKm <= 450) return { min: 5, max: 6 };
  return { min: 6, max: 8 };
}

let deliveryMap = null;
let originMarker = null;
let destMarker = null;

function initMap() {
  if (deliveryMap) return;
  deliveryMap = L.map('delivery-map', {
    zoomControl: false,
    attributionControl: false,
  }).setView([ORIGIN.lat, ORIGIN.lng], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(deliveryMap);

  originMarker = L.circleMarker([ORIGIN.lat, ORIGIN.lng], {
    radius: 7,
    color: '#2b2a7c',
    fillColor: '#2b2a7c',
    fillOpacity: 1,
  })
    .addTo(deliveryMap)
    .bindPopup('Crown Paints dispatch — Nairobi');
}

function plotDestination(lat, lng, label) {
  if (destMarker) deliveryMap.removeLayer(destMarker);

  destMarker = L.circleMarker([lat, lng], {
    radius: 8,
    color: '#d11f23',
    fillColor: '#d11f23',
    fillOpacity: 1,
    weight: 2,
  })
    .addTo(deliveryMap)
    .bindPopup(label || 'Your location')
    .openPopup();

  const bounds = L.latLngBounds([
    [ORIGIN.lat, ORIGIN.lng],
    [lat, lng],
  ]);
  deliveryMap.fitBounds(bounds, { padding: [30, 30] });
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  const addr = data.address || {};

  // County-level field varies; state is the most reliable for Kenyan counties via Nominatim
  const county = addr.state || addr.county || '';
  const place =
    addr.village || addr.town || addr.suburb || addr.neighbourhood || addr.city || '';

  if (place && county) return `${place}, ${county}`;
  if (county) return county;
  return data.display_name || 'your location';
}

const locateBtn = document.getElementById('locate-btn');
const locateResult = document.getElementById('locate-result');
const locateError = document.getElementById('locate-error');

if (locateBtn) {
  locateBtn.addEventListener('click', () => {
    locateError.classList.remove('show');
    locateResult.classList.remove('show');

    if (!navigator.geolocation) {
      locateError.textContent =
        'Location services are not supported on this browser. You can still order via WhatsApp and we will confirm delivery time there.';
      locateError.classList.add('show');
      return;
    }

    locateBtn.disabled = true;
    locateBtn.textContent = 'Locating…';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const placeLabel = await reverseGeocode(latitude, longitude);
          const distanceKm = haversineKm(ORIGIN.lat, ORIGIN.lng, latitude, longitude);
          const eta = estimateEtaHours(distanceKm);

          document.getElementById('eta-headline').textContent =
            `Approximate arrival time to ${placeLabel}: ~${eta.min}–${eta.max} hours`;
          document.getElementById('eta-sub').textContent =
            `Estimated straight-line distance from Nairobi: ${Math.round(distanceKm)} km. Actual delivery time depends on road conditions and county.`;

          locateResult.classList.add('show');
          initMap();
          plotDestination(latitude, longitude, placeLabel);
        } catch (err) {
          locateError.textContent =
            'We found your location but could not look up the place name. Please share your county with us on WhatsApp and we will confirm your delivery estimate.';
          locateError.classList.add('show');

          const distanceKm = haversineKm(ORIGIN.lat, ORIGIN.lng, latitude, longitude);
          const eta = estimateEtaHours(distanceKm);
          document.getElementById('eta-headline').textContent = `Approximate delivery time: ~${eta.min}–${eta.max} hours`;
          document.getElementById('eta-sub').textContent = `Estimated distance from Nairobi: ${Math.round(distanceKm)} km.`;
          locateResult.classList.add('show');

          initMap();
          plotDestination(latitude, longitude, 'Your location');
        } finally {
          locateBtn.disabled = false;
          locateBtn.textContent = 'Find My Estimated Delivery Time';
        }
      },
      (err) => {
        locateBtn.disabled = false;
        locateBtn.textContent = 'Find My Estimated Delivery Time';

        let msg = 'We could not access your location.';
        if (err.code === 1) msg = 'Location access was denied. Please allow location access, or message us on WhatsApp with your county for a delivery estimate.';
        if (err.code === 2) msg = 'Your location is currently unavailable. Please try again or contact us on WhatsApp.';
        if (err.code === 3) msg = 'Location request timed out. Please try again.';

        locateError.textContent = msg;
        locateError.classList.add('show');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
