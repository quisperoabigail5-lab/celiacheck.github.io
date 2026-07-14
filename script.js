// =============================================
// CeliaCheck — JavaScript
// =============================================

// ---- Perfil alimentario ----
let perfilActual = null;

function elegirPerfil(btn, perfil) {
  perfilActual = perfil;
  document.querySelectorAll(".cc-profile-btn").forEach(b => {
    b.classList.remove("active");
  });
  btn.classList.add("active");
}
// seccion curiosidades y etiquetas 
function cambiarTabEducativa(btn, tab) {
  // Resaltar el botón activo
  document.querySelectorAll('.cc-edu-tab').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');

  // Mostrar el grid correspondiente y ocultar el otro
  document.getElementById('edu-curiosidades').style.display = tab === 'curiosidades' ? 'grid' : 'none';
  document.getElementById('edu-etiquetas').style.display = tab === 'etiquetas' ? 'grid' : 'none';
}

// ---- Formulario ----
function enviarFormulario() {
  const boton = document.querySelector('.cc-form .cc-submit');
  const nombre = document.querySelector('.cc-form input[type="text"]');
  const experiencia = document.querySelector('.cc-form textarea');
  const toast = document.getElementById('toast');


  // Cambiar texto y estilo del botón
  boton.textContent = "✔ Enviado";
  boton.classList.add('cc-enviado');
  boton.disabled = true;

  // Limpiar los campos del formulario
  nombre.value = "";
  experiencia.value = "";

  // Volver el botón a su estado original después de un tiempo
  setTimeout(() => {
    boton.textContent = "Enviar →";
    boton.classList.remove('cc-enviado');
    boton.disabled = false;
  }, 3000);
}

// ---- Búsqueda de producto (Open Food Facts) ----
async function buscarProductoPorCodigo(codigo) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`);
    const data = await response.json();

    if (data.status === 0) {
      return null;
    }

    return {
      nombre: data.product.product_name || "Producto sin nombre",
      ingredientes: data.product.ingredients_text || "Sin información de ingredientes"
    };
  } catch (err) {
    console.error("Error buscando producto:", err);
    return null;
  }
}

async function buscarPorInput() {
  const codigo = document.getElementById("codigo-barras").value.trim();
  if (!codigo) return;

  mostrarSemaforo();

  const producto = await buscarProductoPorCodigo(codigo);

  if (!producto) {
    ocultarSemaforo();
    mostrarResultadoSimple("⚠️ No encontrado", "No se encontró ningún producto con ese código de barras.");
    return;
  }

  await evaluarProducto(producto);
}
let html5QrCode = null;

function iniciarEscaner() {
  const lector = document.getElementById("lector-camara");
  lector.style.display = "block";

  html5QrCode = new Html5Qrcode("lector-camara");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 150 } },
    (codigoDecodificado) => {
      detenerEscaner();
      procesarCodigoEscaneado(codigoDecodificado);
    },
    (error) => {}
  ).catch((err) => {
    alert("No se pudo acceder a la cámara: " + err);
  });
}

function detenerEscaner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      document.getElementById("lector-camara").style.display = "none";
    });
  }
}

async function procesarCodigoEscaneado(codigo) {
  mostrarSemaforo();
  const producto = await buscarProductoPorCodigo(codigo);

  if (!producto) {
    ocultarSemaforo();
    mostrarResultadoSimple("⚠️ No encontrado", "No se encontró ningún producto con ese código de barras.");
    return;
  }

  await evaluarProducto(producto);
}

// ---- Resultado persistente (debajo del buscador) ----
function mostrarResultadoSimple(estadoTexto, texto) {
  const div = document.getElementById("resultado-scan");
  const estado = document.getElementById("resultado-estado");
  const textoEl = document.getElementById("resultado-texto");
  div.style.display = "block";
  div.className = "cc-resultado amarillo";
  estado.textContent = estadoTexto;
  textoEl.textContent = texto;
}

// ---- Semáforo ----
let resultadoPendiente = null;

function mostrarSemaforo() {
  document.getElementById("semaforo-overlay").classList.add("mostrar");
  document.getElementById("luz-roja").classList.remove("encendida");
  document.getElementById("luz-amarilla").classList.add("encendida");
  document.getElementById("luz-verde").classList.remove("encendida");
  document.getElementById("semaforo-texto").textContent = "Analizando producto...";
  document.getElementById("resultado-scan").style.display = "none";
  resultadoPendiente = null;
}

function ocultarSemaforo() {
  document.getElementById("semaforo-overlay").classList.remove("mostrar");
}

async function evaluarProducto(producto) {
  if (!perfilActual) {
    ocultarSemaforo();
    mostrarResultadoSimple("⚠️ Falta perfil", "Antes de buscar, seleccioná tu perfil alimentario (Celíaco, Vegetariano o Vegano) arriba en '¿Cuál es tu alimentación?'.");
    return;
  }

  if (!producto.ingredientes || producto.ingredientes === "Sin información de ingredientes") {
    ocultarSemaforo();
    mostrarResultadoSimple("ℹ️ Sin datos", `${producto.nombre}: no hay información de ingredientes disponible para evaluar este producto.`);
    return;
  }

  const evaluacion = evaluarIngredientes(producto.ingredientes, perfilActual);

  document.getElementById("luz-amarilla").classList.remove("encendida");
  if (evaluacion.resultado === "APTO") {
    document.getElementById("luz-verde").classList.add("encendida");
  } else {
    document.getElementById("luz-roja").classList.add("encendida");
  }
  document.getElementById("semaforo-texto").textContent =
    `${producto.nombre}: ${evaluacion.resultado}. Tocá la pantalla para ver el detalle.`;

  // Caja persistente con el motivo (no desaparece como el semáforo)
  const div = document.getElementById("resultado-scan");
  const estado = document.getElementById("resultado-estado");
  const texto = document.getElementById("resultado-texto");
  div.style.display = "block";
  div.className = "cc-resultado " + (evaluacion.resultado === "APTO" ? "verde" : "rojo");
  estado.textContent = evaluacion.resultado === "APTO" ? "🟢 APTO" : "🔴 NO APTO";
  texto.textContent = `${producto.nombre} — ${evaluacion.motivo}`;

  resultadoPendiente = evaluacion.resultado;
}

function cerrarSemaforoYMostrarResultado() {
  if (!resultadoPendiente) return;

  ocultarSemaforo();

  document.body.classList.remove("cc-flash-verde", "cc-flash-rojo");
  if (resultadoPendiente === "APTO") {
    document.body.classList.add("cc-flash-verde");
  } else {
    document.body.classList.add("cc-flash-rojo");
  }

  setTimeout(() => {
    document.body.classList.remove("cc-flash-verde", "cc-flash-rojo");
  }, 3000);

  resultadoPendiente = null;
}

// ---- Listas de ingredientes por perfil ----

const INGREDIENTES_NO_VEGANO = [
  "carne", "res", "vacuno", "cerdo", "pollo", "pavo", "cordero", "pescado",
  "atún", "salmón", "anchoa", "marisco", "camarón", "langostino", "calamar",
  "leche", "lácteo", "lactosa", "lactosuero", "suero de leche", "caseína",
  "queso", "manteca", "mantequilla", "crema de leche", "yogur", "nata",
  "huevo", "albúmina", "clara de huevo", "yema",
  "miel", "gelatina", "colágeno", "cera de abeja", "propóleo",
  "grasa animal", "sebo", "manteca de cerdo", "grasa vacuna",
  "carmín", "e120", "e441", "e542", "e901", "e904", "e920", "e921",
  "caseinato", "cochinilla"
];

const INGREDIENTES_NO_VEGETARIANO = [
  "carne", "res", "vacuno", "cerdo", "pollo", "pavo", "cordero", "pescado",
  "atún", "salmón", "anchoa", "marisco", "camarón", "langostino", "calamar",
  "gelatina", "colágeno", "grasa animal", "sebo", "manteca de cerdo",
  "grasa vacuna", "caldo de carne", "extracto de carne", "e441", "e542"
];

const INGREDIENTES_NO_CELIACO = [
  "trigo", "harina de trigo", "almidón de trigo", "salvado de trigo",
  "cebada", "malta", "extracto de malta", "centeno", "espelta",
  "kamut", "triticale", "escanda", "avena",
  "sémola", "cuscús", "seitan", "panko",
  "gluten", "proteína de trigo", "fécula de trigo"
];

// ---- Motor de decisión ----

function evaluarIngredientes(textoIngredientes, perfil) {
  const texto = textoIngredientes.toLowerCase();

  let listaProhibidos;
  if (perfil === "vegano") {
    listaProhibidos = INGREDIENTES_NO_VEGANO;
  } else if (perfil === "vegetariano") {
    listaProhibidos = INGREDIENTES_NO_VEGETARIANO;
  } else {
    listaProhibidos = INGREDIENTES_NO_CELIACO;
  }

  const encontrados = listaProhibidos.filter(ingrediente => texto.includes(ingrediente));

  if (encontrados.length > 0) {
    return {
      resultado: "NO APTO",
      motivo: `Contiene: ${encontrados.join(", ")}`
    };
  }

  return {
    resultado: "APTO",
    motivo: "No se detectaron ingredientes no aptos en esta lista (revisá igual el envase por trazas)."
  };
}

/* ============================================================
   MAPA INCLUSIVO
   ============================================================ */

'use strict';

const PLACES = [
  { id: 1, name: 'La Fabrica Sin Gluten', type: 'Panadería · Cafetería', category: 'celiaco', address: 'Av. Corrientes 1234, CABA', lat: -34.6037, lng: -58.3816, tags: ['Sin TACC', 'Desayuno', 'Take away'], info: 'Panadería 100% libre de gluten. Todos los productos están certificados ACELA. Menú especial celíaco con medialunas, facturas y tortas.' },
  { id: 2, name: 'Raíces Café', type: 'Cafetería', category: 'celiaco', address: 'Thames 623, Palermo, CABA', lat: -34.5895, lng: -58.4244, tags: ['Sin TACC', 'Café de especialidad', 'Brunch'], info: 'Cafetería boutique con carta celíaca completa. Opciones de desayuno y almuerzo libres de gluten.' },
  { id: 3, name: 'Green Bowl', type: 'Restaurante', category: 'celiaco', address: 'Uriarte 1499, Palermo, CABA', lat: -34.5872, lng: -58.4313, tags: ['Sin TACC', 'Bowls', 'Almuerzo'], info: 'Bowls y ensaladas gourmet, todos aptos celíacos. Ingredientes frescos y de estación.' },
  { id: 7, name: 'El Vergel', type: 'Restaurante vegano', category: 'vegano', address: 'Honduras 5587, Palermo, CABA', lat: -34.5826, lng: -58.4319, tags: ['100% vegano', 'Orgánico', 'Cena'], info: 'Restaurante íntegramente vegano desde 2015. Carta de temporada con productos orgánicos.' },
  { id: 8, name: 'Verde Siempre', type: 'Cafetería vegana', category: 'vegano', address: 'Charcas 4702, Palermo, CABA', lat: -34.5868, lng: -58.4196, tags: ['100% vegano', 'Café de especialidad', 'Brunch'], info: 'Cafetería vegana con leches vegetales propias y pastelería artesanal.' },
  { id: 9, name: 'Roots Plant Bar', type: 'Bar · Restaurante', category: 'vegano', address: 'Gurruchaga 1500, Villa Crespo, CABA', lat: -34.5942, lng: -58.4387, tags: ['100% vegano', 'Cócteles', 'Nocturno'], info: 'Bar vegano con coctelería sin alcohol y con alcohol. Tapas y tablas 100% vegetales.' },
  { id: 10, name: 'La Huerta', type: 'Restaurante vegetariano', category: 'vegetariano', address: 'Av. Rivadavia 4500, Caballito, CABA', lat: -34.6173, lng: -58.4327, tags: ['Vegetariano', 'Casero', 'Almuerzo y cena'], info: 'Cocina casera vegetariana con menú ejecutivo diario.' },
  { id: 11, name: 'Sprout Café', type: 'Cafetería', category: 'vegetariano', address: 'Av. Cabildo 2100, Belgrano, CABA', lat: -34.5631, lng: -58.4561, tags: ['Vegetariano', 'Desayuno', 'Bowls'], info: 'Cafetería vegetariana con foco en desayunos saludables.' },
  { id: 12, name: 'Semilla', type: 'Restaurante', category: 'vegetariano', address: 'José Antonio Cabrera 3261, Palermo, CABA', lat: -34.5913, lng: -58.4158, tags: ['Vegetariano', 'Gourmet', 'Vinos naturales'], info: 'Restaurante vegetariano gourmet con carta de vinos naturales.' },
  { id: 13, name: 'Mosaico Gastronómico', type: 'Restaurante familiar', category: 'multiapto', address: 'Av. Córdoba 5500, Palermo, CABA', lat: -34.5861, lng: -58.4421, tags: ['Sin TACC', 'Vegano', 'Vegetariano', 'Bajo en azúcar', 'Familiar'], info: '⭐ El restaurante más inclusivo de la zona. Carta dividida por perfil: celíaco, diabético, vegano y vegetariano.' },
  { id: 14, name: 'Casa Común', type: 'Cafetería · Restaurante', category: 'multiapto', address: 'Humboldt 1764, Palermo, CABA', lat: -34.5893, lng: -58.4367, tags: ['Sin TACC', 'Vegano', 'Vegetariano', 'Sin azúcar', 'Niños'], info: '⭐ Espacio diseñado para toda la familia. Menú infantil, opciones celíacas, veganas y para diabéticos.' },
  { id: 15, name: 'El Encuentro', type: 'Restaurante · Bar', category: 'multiapto', address: 'Costa Rica 5644, Palermo, CABA', lat: -34.5816, lng: -58.4282, tags: ['Sin TACC', 'Vegano', 'Bajo en carbohidratos', 'Pet friendly'], info: '⭐ Carta inclusiva con opciones para todos. Pet friendly con espacio exterior.' },
  { id: 16, name: 'Let It V', type: 'Restaurante vegano', category: 'vegano', address: 'Costa Rica 5865, Palermo, CABA', lat: -34.5893, lng: -58.4321, tags: ['100% vegano', 'Sin gluten', 'Nikkei'], info: 'Pionero en Buenos Aires en propuesta 100% vegana y sin gluten. Carta con influencia peruana y nikkei.' },
  { id: 17, name: 'Donnet', type: 'Restaurante vegano', category: 'vegano', address: 'Fraga 675, Chacarita, CABA', lat: -34.5865, lng: -58.4548, tags: ['100% vegano', 'Crudivegano', 'Sin gluten'], info: 'Restaurante enfocado en hongos, con técnicas de fermentación y deshidratación. Apto vegano y celíaco.' },
  { id: 18, name: 'Casa Munay', type: 'Restaurante vegetariano', category: 'vegetariano', address: 'Chacarita, CABA', lat: -34.5880, lng: -58.4530, tags: ['Vegetariano', 'Vegano', 'Ingredientes orgánicos'], info: 'Espacio con platos vegetarianos y veganos elaborados con ingredientes orgánicos y frescos.' },
  { id: 19, name: 'Sacro', type: 'Restaurante vegano', category: 'vegano', address: 'Palermo, CABA', lat: -34.5878, lng: -58.4290, tags: ['100% vegano', 'Gourmet'], info: 'Cocina vegana a base de plantas y hongos, con carta estacional y platos de autor.' },
  { id: 20, name: 'Chuí', type: 'Restaurante vegetariano', category: 'vegetariano', address: 'Villa Crespo, CABA', lat: -34.5978, lng: -58.4398, tags: ['Vegetariano', 'Platitos para compartir'], info: 'Cocina veggie de autor en un galpón con jardín. Platos pensados para compartir, con foco en productos de estación.' },
  /*interior de buenos aires*/
  { id: 21, name: 'Wara Cocina de Origen', type: 'Restaurante vegano', category: 'vegano', address: 'Olavarría 2876, Mar del Plata', lat: -38.0149816, lng: -57.5424148, tags: ['Vegano', 'Vegetariano', 'Carnes veganas propias'], info: '⭐ Muy buena reputación (4.5★). Preparan sus propias "carnes" veganas, flan vegano y platos elaborados con dedicación.' },
  { id: 22, name: 'Akari Sushi Bar', type: 'Restaurante japonés', category: 'vegetariano', address: 'Diagonal 74 N°1531, La Plata', lat: -34.9164903, lng: -57.9551281, tags: ['Sushi', 'Opciones vegetarianas'], info: 'Muy bien valorado (4.6★). Sushi de calidad con opciones para vegetarianos.' },
];

// Colores armonizados con la paleta por perfil del resto del sitio
const CATEGORY_CONFIG = {
  celiaco:     { color: '#3B82F6', label: 'Celíacos',     emoji: '🌾' },
  vegano:      { color: '#22C55E', label: 'Veganos',      emoji: '🌱' },
  vegetariano: { color: '#F97316', label: 'Vegetarianos', emoji: '🥗' },
  multiapto:   { color: '#A855F7', label: 'Multiaptos ⭐', emoji: '⭐' },
};

let map = null;
let markers = {};
let activeCategory = 'all';
let activePlaceId = null;

function createMarkerIcon(category, isActive = false) {
  const cfg = CATEGORY_CONFIG[category];
  const color = cfg.color;
  const size = isActive ? 40 : 32;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="${color}" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="16" r="5" fill="#fff" opacity=".85"/></svg>`;
  return L.divIcon({ html: svg, className: 'custom-marker', iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -(size/2+4)] });
}

function addMarkers(places) {
  places.forEach(place => {
    const cfg = CATEGORY_CONFIG[place.category];
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
    const popupContent = `
      <div style="font-family:sans-serif;min-width:180px">
        <p style="color:${cfg.color};font-weight:bold;margin:0 0 4px">${cfg.emoji} ${cfg.label}</p>
        <p style="font-weight:bold;margin:0 0 2px">${place.name}</p>
        <p style="font-size:12px;color:#666;margin:0 0 8px">${place.address}</p>
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block;background:${cfg.color};color:#fff;text-decoration:none;font-size:12px;font-weight:bold;padding:6px 10px;border-radius:6px;">
          📍 Ver en Google Maps
        </a>
      </div>`;
    const marker = L.marker([place.lat, place.lng], { icon: createMarkerIcon(place.category, false) }).addTo(map).bindPopup(popupContent, { maxWidth: 240 });
    markers[place.id] = marker;
  });
}
function getFilteredPlaces() {
  if (activeCategory === 'all') return PLACES;
  return PLACES.filter(p => p.category === activeCategory);
}

function clearMarkers() {
  Object.values(markers).forEach(m => m.remove());
  markers = {};
}


function applyFilter(category) {
  activeCategory = category;
  const filtered = getFilteredPlaces();
  clearMarkers();
  addMarkers(filtered);
  if (filtered.length > 0) {
    const bounds = filtered.map(p => [p.lat, p.lng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
  }
}

// Wrapper: resalta el chip tocado y aplica el filtro
function filtrarMapa(btn, category) {
  document.querySelectorAll('.cc-mapa-filtro').forEach(b => {
    b.classList.remove('activo');
  });
  btn.classList.add('activo');
  applyFilter(category);
}

function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  map = L.map('map', { center: [-34.595, -58.420], zoom: 13 });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);
  applyFilter('all');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMap);
} else {
  initMap();
}