// Landing: tema, anno nel footer e sezioni che dipendono dalla configurazione
// (js/pricing-config.js e js/site-config.js). Le sezioni senza contenuti restano nascoste.
import { $, escapeHtml, iconHtml } from '../lib/dom.js';

const SITE = window.MR_SITE || {};
const PRICING = window.MR_PRICING || {};
const LEGAL = window.MR_LEGAL || {};

function setupThemeToggle() {
  const btn = $('theme-toggle');
  if (!btn || !window.MR_THEME) return;
  const sync = () => {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    btn.setAttribute('aria-label', light ? 'Passa al tema scuro' : 'Passa al tema chiaro');
    btn.querySelector('use').setAttribute('href', 'assets/icons.svg#' + (light ? 'moon' : 'sun'));
  };
  btn.addEventListener('click', () => {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    window.MR_THEME.set(light ? 'dark' : 'light');
    sync();
  });
  sync();
}

function planHref(plan) {
  if (plan.href !== 'mailto:') return plan.href || 'app.html?view=signup';
  return LEGAL.EMAIL ? 'mailto:' + LEGAL.EMAIL + '?subject=' + encodeURIComponent('ModReport ' + plan.nome) : '';
}

function renderPricing() {
  const plans = Array.isArray(PRICING.PLANS) ? PRICING.PLANS : [];
  if (!PRICING.PUBLISHED || !plans.length) return;
  $('plans').innerHTML = plans.map((p) => {
    const href = planHref(p);
    return '<article class="plan' + (p.evidenza ? ' plan--featured' : '') + '">' +
      '<div class="plan__name">' + escapeHtml(p.nome) + '</div>' +
      '<div class="plan__price">' + escapeHtml(p.prezzo) + ' <small>' + escapeHtml(p.periodo || '') + '</small></div>' +
      (p.descrizione ? '<p class="muted">' + escapeHtml(p.descrizione) + '</p>' : '') +
      '<ul class="checklist">' + (p.funzioni || []).map((f) => '<li>' + iconHtml('check') + '<span>' + escapeHtml(f) + '</span></li>').join('') + '</ul>' +
      (href ? '<a class="btn btn--block' + (p.evidenza ? ' btn--primary' : '') + '" href="' + escapeHtml(href) + '">' + escapeHtml(p.cta || 'Scegli') + '</a>' : '') +
      '</article>';
  }).join('');
  $('pricing-title').textContent = 'Prezzi chiari, senza sorprese';
  $('pricing-lead').textContent = 'Inizia gratis e passa a un piano a pagamento solo se ti serve.';
  $('beta-plan').hidden = true;
  $('plans').hidden = false;
  if (PRICING.NOTE) { $('plans-note').textContent = PRICING.NOTE; $('plans-note').hidden = false; }
}

function renderPeople() {
  const founders = Array.isArray(SITE.FOUNDERS) ? SITE.FOUNDERS : [];
  if (founders.length) {
    $('founders').innerHTML = founders.map((f) => '<div class="person">' +
      (f.foto ? '<img src="' + escapeHtml(f.foto) + '" alt="" width="64" height="64" loading="lazy">' : '') +
      '<div><div class="person__name">' + escapeHtml(f.nome) + '</div><div class="muted">' + escapeHtml(f.ruolo || '') + '</div></div></div>').join('');
    $('chi-siamo').hidden = false;
  }
  const quotes = Array.isArray(SITE.TESTIMONIALS) ? SITE.TESTIMONIALS : [];
  if (quotes.length) {
    $('testimonials').innerHTML = quotes.map((q) => '<figure class="quote"><blockquote>' + escapeHtml(q.testo) + '</blockquote>' +
      '<figcaption><strong>' + escapeHtml(q.autore) + '</strong>' + (q.ruolo ? ' · ' + escapeHtml(q.ruolo) : '') + '</figcaption></figure>').join('');
    $('testimonianze').hidden = false;
  }
}

$('year').textContent = String(new Date().getFullYear());
setupThemeToggle();
renderPricing();
renderPeople();
