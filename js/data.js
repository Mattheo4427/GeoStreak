let scoreFlagGame = 0;
let scoreMapGame = 0;
let scoreDeptGame = 0;
let scoreDeptMapGame = 0;
let scoreRegionGame = 0;

let departements = [];
let regions = [];

let currentLang = localStorage.getItem('lang') || 'en';
let texts = {};

let countries = [];
let europe = [];
let afrique = [];
let ameriqueNord = [];
let ameriqueSud = [];
let asie = [];
let oceanie = [];
let exclure = [];

const ZONE_MAP = {
  'Monde': () => countries,
  'Europe': () => europe,
  'Afrique': () => afrique,
  'Amérique du Nord': () => ameriqueNord,
  'Amérique du Sud': () => ameriqueSud,
  'Asie': () => asie,
  'Océanie': () => oceanie
};

const jsonBase = globalThis.location.pathname.includes('/pages/') ? '../json/' : 'json/';

function setMetaContent(id, content) {
  const el = document.getElementById(id);
  if (el && typeof content === 'string' && content.trim() !== '') {
    el.setAttribute('content', content);
  }
}

function applySeoMeta() {
  if (document.body?.dataset.disableDynamicSeo === 'true') return;

  if (!texts?.seo) return;

  if (texts.seo.title) {
    document.title = texts.seo.title;
  }

  setMetaContent('meta-description', texts.seo.description);
  setMetaContent('meta-og-title', texts.seo.ogTitle || texts.seo.title);
  setMetaContent('meta-og-description', texts.seo.ogDescription || texts.seo.description);
}

function clonePlain(obj) {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(clonePlain);
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = clonePlain(v);
  }
  return out;
}

function getEmbeddedData(lang) {
  return lang === 'en' ? globalThis.__geoDataEn : globalThis.__geoDataFr;
}

function getEmbeddedTexts(lang) {
  return lang === 'en' ? globalThis.__geoTextsEn : globalThis.__geoTextsFr;
}

function applyCountryData(data) {
  countries = data.countries;
  europe = data.europe;
  afrique = data.afrique;
  ameriqueNord = data.ameriqueNord;
  ameriqueSud = data.ameriqueSud;
  asie = data.asie;
  oceanie = data.oceanie;
  exclure = data.exclure;
}

async function loadData(lang) {
  const embedded = getEmbeddedData(lang);
  if (globalThis.location.protocol === 'file:' && embedded) {
    applyCountryData(clonePlain(embedded));
    return;
  }

  const dataFile = lang === 'en' ? 'data_en.json' : 'data.json';
  const url = jsonBase + dataFile;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load data file: ' + url + ' (' + response.status + ')');
    }
    const data = await response.json();
    applyCountryData(data);
  } catch (error) {
    if (embedded) {
      applyCountryData(clonePlain(embedded));
      return;
    }
    throw error;
  }
}

async function loadTexts(lang) {
  const embedded = getEmbeddedTexts(lang);
  if (globalThis.location.protocol === 'file:' && embedded) {
    texts = clonePlain(embedded);
    return;
  }

  const textFile = lang === 'en' ? 'texts_en.json' : 'texts_fr.json';
  const url = jsonBase + textFile;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load texts file: ' + url + ' (' + response.status + ')');
    }
    texts = await response.json();
  } catch (error) {
    if (embedded) {
      texts = clonePlain(embedded);
      return;
    }
    throw error;
  }
}

async function loadDepartements() {
  if (globalThis.location.protocol === 'file:' && globalThis.__geoDepartements) {
    departements = clonePlain(globalThis.__geoDepartements.departements || []);
    return;
  }

  const url = jsonBase + 'departements.json';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load departements file: ' + url + ' (' + response.status + ')');
    }
    const data = await response.json();
    departements = data.departements;
  } catch (error) {
    if (globalThis.__geoDepartements) {
      departements = clonePlain(globalThis.__geoDepartements.departements || []);
      return;
    }
    throw error;
  }
}

async function loadRegions() {
  if (globalThis.location.protocol === 'file:' && globalThis.__geoRegions) {
    regions = clonePlain(globalThis.__geoRegions.regions || []);
    return;
  }

  const url = jsonBase + 'regions.json';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load regions file: ' + url + ' (' + response.status + ')');
    }
    const data = await response.json();
    regions = data.regions;
  } catch (error) {
    if (globalThis.__geoRegions) {
      regions = clonePlain(globalThis.__geoRegions.regions || []);
      return;
    }
    throw error;
  }
}

// ==================== i18n Application ====================

/** Apply loaded texts to all elements with data-i18n attributes */
function applyTexts() {
  const resolveTextPath = key => key?.split('.').reduce((o, k) => o?.[k], texts);

  document.documentElement.lang = currentLang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = resolveTextPath(key);
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = resolveTextPath(key);
    if (val) el.placeholder = val;
  });
  if (texts.zones) {
    document.querySelectorAll('[data-zone-key]').forEach(el => {
      const zoneKey = el.dataset.zoneKey;
      const translated = texts.zones[zoneKey];
      if (translated) el.textContent = translated;
    });
  }
  document.querySelectorAll('.sommaire li a[data-i18n]').forEach((el, i) => {
    const key = el.dataset.i18n;
    const val = resolveTextPath(key);
    if (val) el.textContent = (i + 1) + '. ' + val;
  });

  if (typeof applyLearnMapTitles === 'function') {
    applyLearnMapTitles();
  }

  applySeoMeta();
}

/** Switch language, reload data + texts, update UI */
async function switchLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  await Promise.all([loadData(lang), loadTexts(lang), loadDepartements(), loadRegions()]);
  applyTexts();
  updateModeButtonTexts();
}
