// ============================================================
// INFOSCIE — Live Clock + Auto-Language Detection
// ============================================================

// ---------- 1. Live Clock (updates every second) ----------
function startLiveClock() {
  const el = document.getElementById('live-clock-widget');
  if (!el) return;

  const days = ['MINGGU','SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'];
  const months = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];

  function pad(n) { return n.toString().padStart(2, '0'); }

  function tick() {
    const now = new Date();
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const date = `${days[now.getDay()]} · ${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}`;
    el.innerHTML = `<span class="dot-live"></span><span class="clock-time">${time}</span><span class="clock-date">${date}</span>`;
  }
  tick();
  setInterval(tick, 1000);
}

// ---------- 2. Auto-Language Detection + Google Translate ----------

// Peta kode negara (ISO 3166-1 alpha-2) -> kode bahasa Google Translate.
// Perluas daftar ini sesuai kebutuhan negara target.
const COUNTRY_TO_LANG = {
  JP: 'ja', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW',
  SA: 'ar', AE: 'ar', EG: 'ar',
  FR: 'fr', DE: 'de', ES: 'es', IT: 'it', PT: 'pt', BR: 'pt',
  NL: 'nl', RU: 'ru', TR: 'tr', VN: 'vi', TH: 'th',
  MY: 'ms', PH: 'tl', IN: 'hi',
  US: 'en', GB: 'en', AU: 'en', CA: 'en', SG: 'en',
  ID: 'id'
};

const SITE_ORIGINAL_LANG = 'id'; // bahasa asli konten situs

function setGoogTransCookie(lang) {
  const value = `/${SITE_ORIGINAL_LANG}/${lang}`;
  document.cookie = `googtrans=${value}; path=/`;
  // Set juga untuk domain saat ini secara eksplisit (beberapa browser butuh ini)
  document.cookie = `googtrans=${value}; path=/; domain=${window.location.hostname}`;
}

function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    { pageLanguage: SITE_ORIGINAL_LANG, autoDisplay: false },
    'google_translate_element'
  );
}

async function autoDetectLanguage() {
  // Kalau user sudah pernah pilih bahasa manual sebelumnya, hormati pilihan itu — jangan timpa.
  if (localStorage.getItem('lang-manual-override') === 'true') return;

  // Kalau sudah ada cookie googtrans aktif dari sesi ini, tidak perlu deteksi ulang.
  if (document.cookie.includes('googtrans=')) return;

  let targetLang = null;

  try {
    // Deteksi negara dari IP (gratis, tanpa API key, CORS-enabled)
    const res = await fetch('https://ipwho.is/');
    const data = await res.json();
    if (data && data.success && data.country_code) {
      targetLang = COUNTRY_TO_LANG[data.country_code.toUpperCase()] || null;
    }
  } catch (e) {
    // Kalau API geo gagal/diblokir, lanjut ke fallback browser language
  }

  // Fallback: pakai bahasa browser kalau deteksi IP gagal atau negaranya tidak ada di peta
  if (!targetLang) {
    const browserLang = (navigator.language || 'id').split('-')[0];
    targetLang = COUNTRY_TO_LANG[browserLang.toUpperCase()] ? browserLang : null;
  }

  // Kalau target sama dengan bahasa asli situs, tidak perlu translate
  if (!targetLang || targetLang === SITE_ORIGINAL_LANG) return;

  setGoogTransCookie(targetLang);
  window.location.reload();
}

// Panggil manual kalau user pilih bahasa dari dropdown (lihat lang-switcher di HTML)
function manualSetLanguage(lang) {
  localStorage.setItem('lang-manual-override', 'true');
  if (lang === SITE_ORIGINAL_LANG) {
    document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } else {
    setGoogTransCookie(lang);
  }
  window.location.reload();
}

// ---------- Init on page load ----------
document.addEventListener('DOMContentLoaded', function () {
  startLiveClock();
  autoDetectLanguage();
});
