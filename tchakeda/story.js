/**
 * Tchakeda — « Tout est connecté »
 * Portage vanilla JS fidèle de la section Angular `app-product-story` (landingPageTchakeda) :
 * mêmes templates, mêmes styles (compilés depuis les SCSS d'origine dans story.css),
 * même chorégraphie (StoryState) et même moteur de lecture (prologue, caméra, curseur, son).
 */
(() => {
  'use strict';

  const root = document.getElementById('tchk-story');
  if (!root) return;
  const BASE = root.dataset.base || 'tchakeda/';
  const asset = (p) => BASE + 'assets/' + p;

  /* ================= motion.utils ================= */
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tween(from, to, duration, onUpdate, ease = easeOutCubic) {
    if (duration <= 0 || from === to) {
      onUpdate(to);
      return () => { };
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      onUpdate(from + (to - from) * ease(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }
  /** Format « 1 240 500 » avec espace insécable, comme dans l'application. */
  const formatNumber = (value) => Math.round(value).toLocaleString('fr-FR').replace(/[\u202f\u00a0 ]/g, '\u00a0');

  /* ================= SoundService ================= */
  const sound = (() => {
    const enabled = true;
    let ctx, master, unlocking = false;
    const files = { receipt: asset('sounds/recu.mp3') };
    const buffers = new Map();
    const gestures = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'];

    function unlockOnGesture() {
      if (unlocking) return;
      unlocking = true;
      const unlock = () => {
        ctx?.resume().then(() => {
          if (ctx?.state === 'running') {
            gestures.forEach((e) => window.removeEventListener(e, unlock, true));
            unlocking = false;
          }
        });
      };
      gestures.forEach((e) => window.addEventListener(e, unlock, true));
    }
    function preload() {
      for (const [name, url] of Object.entries(files)) {
        fetch(url)
          .then((r) => r.arrayBuffer())
          .then((data) => ctx.decodeAudioData(data))
          .then((buffer) => buffers.set(name, buffer))
          .catch(() => undefined);
      }
    }
    function ensure() {
      if (typeof window === 'undefined' || !('AudioContext' in window)) return false;
      if (!ctx) {
        ctx = null;
        master = ctx.createGain();
        master.gain.value = 0.6;
        master.connect(ctx.destination);
        preload();
      }
      if (ctx.state !== 'running') {
        unlockOnGesture();
        return false;
      }
      return true;
    }
    function sample(name, at) {
      const buffer = buffers.get(name);
      if (!buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 1 / 0.6;
      src.connect(gain).connect(master);
      src.start(at);
    }
    function blip(freq, dur, vol, at, type = 'sine', lowpass, attack = 0.005) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(vol, at + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      let node = osc;
      if (lowpass) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lowpass;
        osc.connect(filter);
        node = filter;
      }
      node.connect(gain).connect(master);
      osc.start(at);
      osc.stop(at + dur + 0.05);
    }
    function noise(at, dur) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 0.8;
      filter.frequency.setValueAtTime(300, at);
      filter.frequency.exponentialRampToValueAtTime(2400, at + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.05, at + dur * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(filter).connect(gain).connect(master);
      src.start(at);
    }
    function play(tone) {
      if (!enabled || !ensure()) return;
      const t = ctx.currentTime;
      switch (tone) {
        case 'click': blip(1800, 0.035, 0.12, t, 'square', 900); break;
        case 'tick': blip(880, 0.08, 0.06, t); break;
        case 'knot': blip(660, 0.18, 0.07, t); blip(990, 0.22, 0.05, t + 0.07); break;
        case 'confirm': [523, 659, 784].forEach((f, i) => blip(f, 0.32, 0.06, t + i * 0.06)); break;
        case 'whoosh': noise(t, 0.9); break;
        case 'bass': blip(55, 1.6, 0.18, t, 'sine', undefined, 0.5); break;
        case 'receipt': sample('receipt', t); break;
      }
    }
    return { play };
  })();

  /* ================= StoryState ================= */
  const S = { ventes: 0, feere: 1, panier: 2, paiement: 3, recu: 4, boutique: 5, facture: 6, paiementFacture: 7, journal: 8, rapport: 9, stats: 10, systeme: 11, retour: 12 };
  const CART = [
    { key: 'dentifrice', name: 'Dentifrice Colgate', price: 1200 },
    { key: 'rasoir', name: 'Rasoir Gillette', price: 2000 },
    { key: 'nivea', name: 'Crème Nivea', price: 2500 }
  ];
  const SALE_TOTAL = 5700;
  const INVOICE_PAYMENT = 25000;
  const CA_BEFORE = 2071400;
  const CA_OBJECTIVE = 2177419.35;
  const EXPENSES = 2450000;
  const PICK_AT = [250, 950, 1650];

  const steps = [
    { label: 'Ventes', title: 'Toutes vos ventes, en un coup d’œil', text: 'Total des ventes, montant net, meilleurs produits et vendeurs : le suivi de votre activité en temps réel.', url: 'fere.tchakeda.com/vente' },
    { label: 'Feere kɛ yɔrɔ', title: 'Un clic sur « Feere kɛ yɔrɔ »', text: 'La caisse s’ouvre directement depuis vos ventes. Vos produits, vos prix et vos stocks sont déjà là.', url: 'fere.tchakeda.com/pos-accueil' },
    { label: 'Panier', title: 'Le panier se remplit en quelques touches', text: 'Un produit touché, un produit ajouté. Le total se calcule tout seul, taxes comprises.', url: 'fere.tchakeda.com/pos-accueil' },
    { label: 'Paiement', title: 'Espèces, mobile money, carte ou crédit', text: 'Choisissez le mode de paiement, saisissez le montant reçu : la monnaie à rendre s’affiche instantanément.', url: 'fere.tchakeda.com/pos-accueil' },
    { label: 'Reçu', title: 'Le reçu est prêt', text: 'Imprimé, envoyé par e-mail ou WhatsApp, ou transformé en facture : votre client repart avec son justificatif.', url: 'fere.tchakeda.com/pos-accueil/paiement' },
    { label: 'Boutique', title: 'Le stock de la boutique suit', text: 'Chaque article vendu quitte le stock de sa boutique. Vous savez toujours ce qu’il reste en rayon.', url: 'fere.tchakeda.com/detail-boutique/t_MTQ=' },
    { label: 'Facture', title: 'Une facture, toute l’entreprise', text: 'Chaque ligne vient d’un module : le client de votre fichier, les articles de votre stock, les montants de votre comptabilité. Rien n’est ressaisi.', url: 'fere.tchakeda.com/facture-reel-details/t_NjMx' },
    { label: 'Paiement facture', title: 'Chaque paiement est tracé', text: 'Un acompte de 25 000 CFA est encaissé puis validé. Le reste à payer se met à jour tout seul.', url: 'fere.tchakeda.com/facture-reel-details/t_NjMx' },
    { label: 'Journal', title: 'La comptabilité se tient toute seule', text: 'La vente et le paiement de la facture rejoignent le journal, à côté des salaires, des dépenses et des dettes fournisseurs. Sans ressaisie.', url: 'fere.tchakeda.com/entree-sortie-entreprise-journal' },
    { label: 'Rapport financier', title: 'Votre rapport financier, déjà calculé', text: 'Chiffre d’affaires, dépenses, marge et objectif du mois intègrent la vente et le paiement.', url: 'fere.tchakeda.com/reporting-finance' },
    { label: 'Statistiques', title: 'Pilotez avec les bons chiffres', text: 'Répartition du chiffre d’affaires, suivi d’objectif, activité jour par jour : les tendances sautent aux yeux.', url: 'fere.tchakeda.com/reporting-finance' },
    { label: 'Le système', title: 'Vu de l’intérieur', text: 'Chaque couche de Tchakeda travaille avec les autres : la vente d’aujourd’hui remonte jusqu’à vos indicateurs.', url: 'fere.tchakeda.com/vente' },
    { label: 'Tout connecté', title: 'Tout est déjà à jour', text: 'De retour sur vos ventes, la nouvelle vente est là. Une seule action a fait avancer toute l’entreprise.', url: 'fere.tchakeda.com/vente' }
  ];
  const prologue = [
    { title: 'Aujourd’hui, votre entreprise est éparpillée.', text: 'Les ventes dans un cahier, le stock dans un autre, les salaires sur Excel, les dettes fournisseurs de tête…' },
    { title: 'Tchakeda relie tout.', text: '12 modules pensés pour travailler ensemble : chaque information trouve sa place, et la vente circule jusqu’au tableau de bord.' },
    { title: 'Et tout tient dans une seule interface.', text: 'Continuez à faire défiler : entrez dans Tchakeda.' }
  ];

  const st = {
    reduced: prefersReducedMotion(),
    step: 0,
    phase: 'chaos',
    picked: 0,
    cartTotal: 0,
    cash: '',
    stockUpdated: 0,
    caisse: 65700,
    journalNew: 0,
    invAmount: '',
    invMode: false,
    invPaid: false,
    invValidated: false,
    invRemaining: 200000,
    ca: CA_BEFORE,
    reportLive: false,
    salesTotal: 7,
    salesItems: 12,
    salesNet: 143700,
    caisseOpen: 65700
  };

  // Détection de changement : comme les signaux Angular, la vue se met à jour juste après la modification.
  let syncQueued = false;
  const changed = () => {
    if (syncQueued) return;
    syncQueued = true;
    queueMicrotask(() => {
      syncQueued = false;
      sync();
    });
  };
  const set = (key, value) => {
    if (st[key] !== value) {
      st[key] = value;
      changed();
    }
  };

  const stateClass = () =>
    `s${st.step} is-${st.phase}${st.phase !== 'story' ? ' is-prologue' : ''}${st.reduced ? ' ps--reduced' : ''}`;
  const nav = () => {
    const s = st.step;
    if (s >= S.feere && s <= S.recu) return 'pos';
    if (s === S.boutique) return 'boutiques';
    if (s === S.journal) return 'journal';
    if (s === S.facture || s === S.paiementFacture) return 'facture';
    if (s === S.rapport || s === S.stats) return 'rapport';
    return 'ventes';
  };
  const pct = (ratio) => (ratio * 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const caObjectivePct = () => pct(st.ca / CA_OBJECTIVE);
  const expensesPct = () => pct(EXPENSES / st.ca);
  const margin = () => st.ca - EXPENSES;
  const marginPct = () => pct(margin() / st.ca);
  const gap = () => (st.ca - CA_OBJECTIVE).toLocaleString('fr-FR', { minimumFractionDigits: 2 }).replace(/[\u202f\u00a0 ]/g, '\u00a0');
  const inCart = (key) => {
    const index = CART.findIndex((item) => item.key === key);
    return index >= 0 && st.picked > index;
  };

  let timers = [];
  let cancels = [];
  function clear() {
    timers.forEach(clearTimeout);
    cancels.forEach((cancel) => cancel());
    timers = [];
    cancels = [];
  }
  function setInvoice(done) {
    set('invAmount', done ? '25 000' : '');
    set('invMode', done);
    set('invPaid', done);
    set('invValidated', done);
    set('invRemaining', done ? 200000 - INVOICE_PAYMENT : 200000);
  }
  function resetSales() {
    set('salesTotal', 7);
    set('salesItems', 12);
    set('salesNet', 143700);
    set('caisseOpen', 65700);
  }

  function enter(next) {
    const previous = st.step;
    if (next === previous) return;
    clear();
    set('step', next);
    if (st.phase === 'story') sound.play('tick');
    const at = (ms, fn) => timers.push(setTimeout(fn, st.reduced ? 0 : ms * PACE));
    const animate = (from, to, ms, fn) => cancels.push(tween(from, to, st.reduced ? 0 : ms * PACE, fn));
    const passed = (s) => next > s;

    if (next === S.panier) {
      set('picked', 0);
      set('cartTotal', 0);
      let running = 0;
      CART.forEach((item, i) => {
        const from = running;
        running += item.price;
        const to = running;
        at(PICK_AT[i] + 250, () => {
          set('picked', i + 1);
          animate(from, to, 450, (v) => set('cartTotal', v));
        });
      });
    } else {
      set('picked', passed(S.panier) ? CART.length : 0);
      set('cartTotal', passed(S.panier) ? SALE_TOTAL : 0);
    }

    if (next === S.recu) at(280, () => sound.play('receipt'));

    if (next === S.paiement) {
      at(1950, () => sound.play('confirm'));
      set('cash', '');
      ['5', '57', '570', '5700'].forEach((value, i) => at(1000 + i * 110, () => set('cash', value)));
    } else {
      set('cash', passed(S.paiement) ? '5700' : '');
    }

    if (next === S.boutique && previous < S.boutique) {
      set('stockUpdated', 0);
      [1300, 1650, 2000].forEach((ms, i) => at(ms, () => set('stockUpdated', i + 1)));
    } else if (next !== S.boutique) {
      set('stockUpdated', passed(S.boutique) ? 3 : 0);
    }

    if (next === S.journal && previous < S.journal) {
      set('caisse', 65700);
      set('journalNew', 0);
      at(1000, () => {
        set('journalNew', 1);
        animate(65700, 65700 + SALE_TOTAL, 800, (v) => set('caisse', v));
      });
      at(2100, () => {
        set('journalNew', 2);
        animate(65700 + SALE_TOTAL, 65700 + SALE_TOTAL + INVOICE_PAYMENT, 900, (v) => set('caisse', v));
      });
    } else if (next !== S.journal) {
      const done = passed(S.journal);
      set('journalNew', done ? 2 : 0);
      set('caisse', done ? 65700 + SALE_TOTAL + INVOICE_PAYMENT : 65700);
    }

    if (next === S.facture) {
      at(900, () => sound.play('whoosh'));
      at(5250, () => sound.play('click'));
    }

    if (next === S.paiementFacture) {
      setInvoice(false);
      ['2', '25', '25 0', '25 00', '25 000'].forEach((value, i) => at(550 + i * 90, () => set('invAmount', value)));
      at(1500, () => set('invMode', true));
      at(2250, () => {
        set('invPaid', true);
        animate(200000, 200000 - INVOICE_PAYMENT, 800, (v) => set('invRemaining', v));
      });
      at(3350, () => {
        set('invValidated', true);
        sound.play('confirm');
      });
    } else {
      setInvoice(passed(S.paiementFacture));
    }

    if (next === S.rapport && previous < S.rapport) {
      set('ca', CA_BEFORE);
      set('reportLive', false);
      at(1000, () => {
        set('reportLive', true);
        animate(CA_BEFORE, CA_BEFORE + SALE_TOTAL + INVOICE_PAYMENT, 1100, (v) => set('ca', v));
      });
    } else if (next !== S.rapport) {
      const done = passed(S.rapport);
      set('reportLive', done);
      set('ca', done ? CA_BEFORE + SALE_TOTAL + INVOICE_PAYMENT : CA_BEFORE);
    }

    if (next === S.systeme && previous < S.systeme) sound.play('bass');

    if (next >= S.systeme && previous < S.systeme) {
      resetSales();
      at(1900, () => {
        set('salesTotal', 8);
        animate(12, 15, 600, (v) => set('salesItems', Math.round(v)));
        animate(143700, 143700 + SALE_TOTAL, 1000, (v) => set('salesNet', v));
        animate(65700, 65700 + SALE_TOTAL, 1000, (v) => set('caisseOpen', v));
      });
    } else if (next >= S.systeme) {
      set('salesTotal', 8);
      set('salesItems', 15);
      set('salesNet', 143700 + SALE_TOTAL);
      set('caisseOpen', 65700 + SALE_TOTAL);
    } else {
      resetSales();
    }
  }

  /* ================= Données des écrans ================= */
  const sidebar = [
    { icon: 'ri-home-4-line', label: 'Tableau de bord' },
    { icon: 'ri-bar-chart-2-line', label: 'Ventes', active: ['ventes', 'pos'] },
    { icon: 'ri-price-tag-3-line', label: 'Produits' },
    { icon: 'ri-list-unordered', label: 'Boutiques', active: ['boutiques'] },
    { icon: 'ri-box-3-line', label: 'Stocks', sub: [] },
    { icon: 'ri-group-line', label: 'Clients' },
    { icon: 'ri-user-line', label: 'Fournisseurs' },
    { icon: 'ri-file-line', label: 'Facturation', active: ['facture'], sub: [{ label: 'Factures proforma', current: [] }, { label: 'Factures réelles', current: ['facture'] }] },
    { icon: 'ri-clipboard-line', label: 'Comptabilité', active: ['journal', 'rapport'], sub: [{ label: 'Journal', current: ['journal'] }, { label: 'Rapport Financier', current: ['rapport'] }] },
    { icon: 'ri-settings-3-line', label: 'Paramètres', sub: [] }
  ];
  const modules = [
    { name: 'Point de Vente', icon: 'ri-shopping-cart-2-fill', c1: '#3b82f6', c2: '#1d4ed8' },
    { name: 'Stocks', icon: 'ri-box-3-fill', c1: '#a855f7', c2: '#7e22ce' },
    { name: 'Inventaire', icon: 'ri-box-3-fill', c1: '#a855f7', c2: '#7e22ce' },
    { name: 'Clients (CRM)', icon: 'ri-user-heart-fill', c1: '#f43f5e', c2: '#be123c' },
    { name: 'Facturation', icon: 'ri-file-list-3-fill', c1: '#6366f1', c2: '#4338ca' },
    { name: 'Code-barres', icon: 'ri-barcode-fill', c1: '#14b8a6', c2: '#0f766e' },
    { name: 'Dépenses', icon: 'ri-money-dollar-circle-fill', c1: '#0ea5e9', c2: '#0369a1' },
    { name: 'Tableau de bord', icon: 'ri-pie-chart-2-fill', c1: '#ec4899', c2: '#be185d' },
    { name: 'Comptabilité', icon: 'ri-calculator-fill', c1: '#f59e0b', c2: '#b45309' },
    { name: 'Fournisseurs', icon: 'ri-truck-fill', c1: '#f97316', c2: '#c2410c' },
    { name: 'Boutiques', icon: 'ri-store-3-fill', c1: '#10b981', c2: '#047857' },
    { name: 'Gestion Personnel', icon: 'ri-team-fill', c1: '#06b6d4', c2: '#0e7490' }
  ];
  const chain = [0, 1, 2, 3, 7, 6];
  const portalIndex = 6;
  const landing = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11];

  const categories = [
    { name: 'Toutes les catégories', count: 53 },
    { name: 'Sans Catégorie', count: 2 },
    { name: 'Electronique', count: 16 },
    { name: 'Alimentation', count: 20 },
    { name: 'Divers', count: 15 }
  ];
  const products = [
    { name: 'POS Mobile', image: 'pos-mobile', stock: 'Stock indefini', price: 'N/A' },
    { name: 'Ecouteur', image: 'ecouteur', stock: 'Stock indefini', price: 'N/A' },
    { name: 'Velo', image: 'velo', stock: 'Stock indefini', price: '55 000 CFA' },
    { name: 'Chargeur', image: 'chargeur', stock: 'Stocks : 60', exp: 'Exp : 23/03/2027', price: '3 000 CFA' },
    { name: 'Cle Usb', image: 'cle-usb', stock: 'Stocks : 22', exp: 'Exp : 23/03/2027', price: '1 500 CFA' },
    { name: 'Watch', image: 'watch', stock: 'Stocks : 70', exp: 'Exp : 23/03/2027', price: '2 500 CFA' },
    { name: 'Rasoir Gill…', image: 'rasoir', stock: 'Stocks : 12', exp: 'Exp : 23/03/2027', price: '2 000 CFA', key: 'rasoir' },
    { name: 'Crème Nivea', image: 'nivea', stock: 'Stocks : 54', exp: 'Exp : 23/03/2027', price: '2 500 CFA', key: 'nivea' },
    { name: 'Shampoing H…', image: 'shampoing', stock: 'Stocks : 36', exp: 'Exp : 23/03/2027', price: '4 000 CFA' },
    { name: 'Gel douche …', image: 'gel-douche', stock: 'Stocks : 16', exp: 'Exp : 23/03/2027', price: '3 000 CFA', low: true },
    { name: 'Parfum Duba…', letter: 'P', stock: 'Stocks : 96', exp: 'Exp : 23/03/2027', price: '10 000 CFA' },
    { name: 'Brosse à de…', letter: 'B', stock: 'Stocks : 59', exp: 'Exp : 23/03/2027', price: '1 000 CFA' },
    { name: 'Dentifrice …', letter: 'D', stock: 'Stocks : 34', exp: 'Exp : 23/03/2027', price: '1 200 CFA', key: 'dentifrice' },
    { name: 'Papier toil…', letter: 'P', stock: 'Stocks : 58', exp: 'Exp : 23/03/2027', price: '3 000 CFA' },
    { name: 'Eau Diago 1…', letter: 'E', stock: 'Stocks : 85', exp: 'Exp : 23/03/2027', price: '500 CFA' }
  ];
  const numpad = ['1', '2', '3', 'Qté', '4', '5', '6', 'Remise', '7', '8', '9', 'Prix', '+/-', '0', ',', '⌫'];
  const methods = [
    { icon: 'ri-hand-coin-line', label: 'Espèces' },
    { icon: 'ri-smartphone-line', label: 'Mobile money' },
    { icon: 'ri-bank-card-line', label: 'Carte' },
    { icon: 'ri-file-list-3-line', label: 'Crédit' }
  ];
  const barcode = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3];

  const invoices = [
    { date: '26/09/2026 11:55', num: '55329261155S', amount: '8 200 CFA', status: 'done' },
    { date: '21/09/2026 16:50', num: '21929211650W', amount: '2 500 CFA', status: 'done' },
    { date: '21/09/2026 16:38', num: '19429211638O', amount: '55 000 CFA', status: 'done' },
    { date: '18/09/2026 15:33', num: '875291815335', amount: '0 CFA', refunded: '3 000 CFA', status: 'refund' },
    { date: '22/08/2026 10:51', num: '14243221051T', amount: '3 000 CFA', status: 'paid' },
    { date: '17/08/2026 17:00', num: '65582171700X', amount: '20 000 CFA', status: 'paid' }
  ];
  const shopProducts = [
    { name: 'Ecouteur', image: 'ecouteur', desc: 'Aucune description', cat: 'Electronique', price: 'CFA', stock: 0 },
    { name: 'Chargeur', image: 'chargeur', desc: 'Maison', cat: 'Divers', price: '3 000,00 CFA', stock: 60 },
    { name: 'Dentifrice Colgate', letter: 'D', desc: 'Hygiène', cat: 'Divers', price: '1 200,00 CFA', stock: 34, sold: 1 },
    { name: 'Rasoir Gillette', image: 'rasoir', desc: 'Rasage', cat: 'Divers', price: '2 000,00 CFA', stock: 12, sold: 2 },
    { name: 'Crème Nivea', image: 'nivea', desc: 'Soin corps', cat: 'Divers', price: '2 500,00 CFA', stock: 54, sold: 3 }
  ];
  const journal = [
    { num: 'C-002-09-2026', date: '28/09/2026', origin: 'Feere kɛ yɔrɔ Ma…', label: 'Vente Feere kɛ y…', cat: 'Boutique', catTone: 'mauve', price: '71 400 CFA', qty: '5', amount: '71 400 CFA', tone: 'in', source: 'Caisse' },
    { num: 'DP: 002-09-2026', date: '15/09/2026', origin: 'Comptabilité - s…', label: 'Gauzj', cat: 'Restauratio…', catTone: 'blue', price: '2 300 000 CFA', qty: '1', amount: '2 300 000 CFA', tone: 'out', source: 'Caisse' },
    { num: '-', date: '15/09/2026', origin: 'Comptabilité - T…', label: 'Test', cat: 'Transfert D…', catTone: 'gray', price: '-', qty: '-', amount: '1 000 000 CFA', tone: '', source: 'Banque → Caisse' },
    { num: 'EN: 002-09-2026', date: '15/09/2026', origin: 'Comptabilité - …', label: 'Chiffre test', cat: 'Chiffe D', catTone: 'blue', price: '1 000 000 CFA', qty: '1', amount: '1 000 000 CFA', tone: 'in', source: 'Banque' },
    { num: 'DP: 001-09-2026', date: '04/09/2026', origin: 'Comptabilité - s…', label: 'Salaire de Mous…', cat: 'Salaire', catTone: 'orange', price: '150 000 CFA', qty: '1', amount: '150 000 CFA', tone: 'out', source: 'Caisse' }
  ];

  const same = (v) => [v, v];
  const tables = [
    {
      title: 'Vente par produit / Service', icon: 'ri-pie-chart-line', cols: ['Nom', 'Qté', 'Montant', '%'],
      rows: [
        { name: 'Suivi et Controle', q: same('6'), m: ['1 000 000 CFA', '1 025 000 CFA'], p: ['48%', '49%'] },
        { name: 'Velo', q: same('1'), m: same('55 000 CFA'), p: same('3%') },
        { name: 'Crème Nivea', q: ['2', '3'], m: ['5 000 CFA', '7 500 CFA'], p: same('0%') },
        { name: 'Shampoing Head & Shoul…', q: same('1'), m: same('4 000 CFA'), p: same('0%') },
        { name: 'Papier toilette Lotus', q: same('1'), m: same('3 000 CFA'), p: same('0%') },
        { name: 'Dentifrice Colgate', q: ['2', '3'], m: ['2 400 CFA', '3 600 CFA'], p: same('0%') },
        { name: 'Rasoir Gillette', q: ['1', '2'], m: ['2 000 CFA', '4 000 CFA'], p: same('0%') },
        { name: 'TOTAL', q: ['14', '17'], m: ['2 071 400 CFA', '2 102 100 CFA'], p: same('100%') }
      ]
    },
    {
      title: 'Ventes par catégorie', icon: 'ri-price-tag-3-line', cols: ['Nom', 'Qté', 'Montant', '%'],
      rows: [
        { name: 'Sans Catégorie', q: same('7'), m: ['1 055 000 CFA', '1 080 000 CFA'], p: ['50,9%', '51,4%'] },
        { name: 'Divers', q: ['7', '10'], m: ['16 400 CFA', '22 100 CFA'], p: ['0,8%', '1,1%'] },
        { name: 'TOTAL', q: ['14', '17'], m: ['2 071 400 CFA', '2 102 100 CFA'], p: same('100%') }
      ]
    },
    {
      title: 'Dépenses par catégorie', icon: 'ri-file-list-3-line', cols: ['Catégorie', 'Montant', '%'], warm: true,
      rows: [
        { name: 'Restauration', q: same(''), m: same('2 300 000 CFA'), p: same('93,9%') },
        { name: 'Salaire', q: same(''), m: same('150 000 CFA'), p: same('6,1%') },
        { name: 'TOTAL', q: same(''), m: same('2 450 000 CFA'), p: same('100%') }
      ]
    }
  ];
  const caSegments = [
    { label: 'Ventes', amount: '77 100 CFA', pct: 3.7, pctLabel: '3,7%', color: '#2f7de1', offset: 0 },
    { label: 'Factures', amount: '1 025 000 CFA', pct: 48.8, pctLabel: '48,8%', color: '#4ca054', offset: 3.7 },
    { label: 'Entrée compta', amount: '1 000 000 CFA', pct: 47.5, pctLabel: '47,5%', color: '#c836cb', offset: 52.5 }
  ];
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const values = { 4: [40, 6], 15: [40, 92], 28: [3.1, 0] };
    const [ca, dep] = values[day] ?? [0, 0];
    return { label: String(day).padStart(2, '0'), ca, dep, today: day === 28, alert: day === 15 };
  });

  /* ================= Templates ================= */
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cls = (...names) => names.filter(Boolean).join(' ');
  const map = (arr, fn) => arr.map(fn).join('');
  const fmt = formatNumber;

  const tplStory = () => `<section id="tchk-features" class="ps" style="--ps-steps: ${steps.length};" aria-labelledby="ps-title"><style>@media (min-width: 900px) { #tchk-features .ps__layout { flex-direction: row !important; align-items: center !important; justify-content: space-between !important; max-width: 1440px !important; margin: 0 auto !important; } #tchk-features .ps__copy { width: 320px !important; text-align: left !important; flex-shrink: 0 !important; } #tchk-features .ps__device { flex: 1 !important; width: auto !important; max-width: calc(100% - 360px) !important; margin: 0 !important; } #tchk-features .ps__title { text-align: left !important; font-size: 1.6rem !important; margin-bottom: 24px !important; } #tchk-features .ps__kicker { text-align: left !important; justify-content: flex-start !important; } } #tchk-features .ps__controls button:hover { background: #f8fafc !important; } #tchk-features .ps__step-label { cursor: pointer; }</style><div class="ps__sticky"><div class="ps__layout"><div class="ps__copy"><p class="ps__kicker" style="display: flex;"><span>Fonctionnalités</span></p><h2 id="ps-title" class="ps__title"><span>Pilotez vos entreprises en toute sécurité.</span></h2><div class="ps__controls" style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;"><button class="ps__pause-btn" style="display: flex; align-items: center; gap: 8px; padding: 6px 16px; border: 1px solid #e2e8f0; border-radius: 20px; font-weight: 600; font-size: 13px; color: #0f172a; background: white; cursor: pointer; transition: all 0.2s;"><i class="ri-pause-mini-line" style="color: #2563eb; font-weight: bold; font-size: 16px;"></i> Pause</button><span class="ps__progress-count" style="font-weight: 600; color: #64748b; font-size: 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 0.5px;">01 / 13</span></div><div class="ps__stepper-container" style="display: flex; gap: 24px; position: relative;"><div class="ps__stepper-track" style="position: relative; width: 2px; background: #e2e8f0; margin-top: 8px; margin-left: 6px; display: flex; flex-direction: column; gap: 16px;">${map(steps, (s, i) => `<div class="ps__step-dot ps__step-dot--${i}" style="position: absolute; left: -5px; top: ${i * 36}px; width: 12px; height: 12px; border-radius: 50%; background: ${i === 0 ? '#2563eb' : '#fff'}; border: 2px solid ${i === 0 ? '#2563eb' : '#cbd5e1'}; z-index: 2; transition: all 0.3s;"></div>`)}<div class="ps__step-line-active" style="position: absolute; top: 0; left: 0; width: 2px; background: #2563eb; height: 0; z-index: 1; transition: height 0.4s ease-out;"></div></div><div class="ps__stepper-labels" style="display: flex; flex-direction: column; gap: 14px;">${map(steps, (s, i) => `<div class="ps__step-label ps__step-label--${i}" style="height: 22px; line-height: 22px; font-size: 15px; font-weight: ${i === 0 ? '600' : '400'}; color: ${i === 0 ? '#0f172a' : '#94a3b8'}; transition: all 0.3s;">${esc(s.label)}</div>`)}</div></div><div class="ps__captions" aria-live="polite" style="display: none;"></div></div><div class="ps__device" aria-hidden="true"><div class="ps__chrome"><span class="ps__chrome-nav"><i class="ri-arrow-left-line"></i><i class="ri-arrow-right-line"></i><i class="ri-refresh-line"></i></span><div class="ps__url"><i class="ri-equalizer-line"></i><span class="ps__url-texts">${map(steps, (s) => `<span>${esc(s.url)}</span>`)}</span><i class="ri-star-line ps__url-star"></i></div><span class="ps__chrome-avatar"></span></div><div class="ps__screen"><div class="ps__canvas"><div class="app"><header class="app__head"><img class="app__logo" src="${asset('logo/tchakeda.webp')}" alt=""><i class="ri-menu-4-line app__burger"></i><span class="app__spacer"></span><i class="ri-notification-3-line app__icon"></i><i class="ri-lock-unlock-line app__icon"></i><span class="app__sep"></span><span class="app__org"><b>Fofana Corp</b><small>Diakairdia Sy</small></span><span class="app__avatar">HF</span></header><nav class="app__side">${map(sidebar, (item) => `<div class="app__nav"><i class="${item.icon}"></i><span>${esc(item.label)}</span>${item.sub ? '<i class="app__chev ri-arrow-right-s-line"></i>' : ''}</div>${item.sub?.length ? `<div class="app__sub"><div>${map(item.sub, (sub) => `<span>${esc(sub.label)}</span>`)}</div></div>` : ''}`)}<span class="app__version">v0.1</span></nav><main class="app__main"><app-story-pages>${tplPages()}</app-story-pages><app-story-finance>${tplFinance()}</app-story-finance></main></div><app-story-pos>${tplPos()}</app-story-pos><span class="cursor"><svg viewBox="0 0 24 24"><path d="M5 3l14 8-6.2 1.6L10 19z"></path></svg></span></div></div></div></div><div class="pro" aria-hidden="true" style="display: none;"><svg class="pro__threads">${map(chain.slice(1), () => '<path pathLength="1"></path>')}<circle class="pro__spark" r="4" cx="-20" cy="-20"></circle></svg>${map(modules, (m, i) => `<div class="${cls('pro__tile', i === portalIndex && 'is-portal')}" style="--c1: ${m.c1}; --c2: ${m.c2}; --d: ${((i * 0.37) % 2) + 's'};"><span class="pro__card"><i class="${m.icon}"></i></span><b>${esc(m.name)}</b></div>`)}</div></div></section>`;

  const tplPos = () => `<div class="pos"><header class="pos__top"><i class="ri-arrow-left-s-line pos__back"></i><span class="pos__tab is-active">Ventes POS</span><span class="pos__tab">Commandes</span><span class="pos__tab">Historique</span><span class="pos__tab pos__tab--icon"><i class="ri-add-line"></i></span><span class="pos__tab is-active">001</span><span class="app__spacer"></span><i class="ri-lock-line pos__icon"></i><i class="ri-refresh-line pos__icon"></i><i class="ri-calculator-fill pos__icon pos__icon--calc"></i><span class="pos__store">Ma Boutique<i class="ri-arrow-down-s-line"></i></span><span class="pos__search">Recherche des produits<i class="ri-search-line"></i></span><span class="pos__grid"><i class="ri-apps-2-fill"></i></span><span class="pos__h">H</span><i class="ri-menu-line pos__icon"></i></header><div class="pos__body"><aside class="pos__cats"><div class="pos__cats-head">Catégories<i class="ri-menu-3-line"></i></div>${map(categories, (c, i) => `<div class="${cls('pos__cat', i === 0 && 'is-active')}"><span>${esc(c.name)}</span><b>${c.count}</b></div>`)}</aside><div class="pos__products">${map(products, (p) => `<div class="${cls('prod', p.key && 'prod--' + p.key)}"${p.key ? ` data-anchor="p-${p.key}"` : ''}>${p.key ? '<span class="prod__badge">1</span>' : ''}<i class="ri-star-line prod__star"></i>${p.image ? `<img class="prod__img" src="${asset('story/' + p.image + '.jpg')}" alt="" loading="lazy">` : `<span class="prod__letter">${p.letter}</span>`}<b class="prod__name">${esc(p.name)}</b><span class="${cls('prod__stock', p.low && 'is-low')}">${esc(p.stock)}</span><span class="prod__exp">${esc(p.exp)}</span><span class="prod__foot"><b>${esc(p.price)}</b><i class="ri-subtract-line"></i></span></div>`)}</div><aside class="pos__cart"><div class="pos__cart-head"><span><i class="ri-shopping-cart-line"></i>0 article</span><span class="pos__clear"><i class="ri-delete-bin-6-line"></i>Vider le panier</span></div><div class="pos__lines" data-anchor="cart">${map(CART, (item) => `<div class="pos__line"><span>1</span><span class="pos__line-name">${esc(item.name)} (${fmt(item.price)} CFA)</span><b>${fmt(item.price)} CFA</b><i class="ri-close-circle-fill"></i></div>`)}</div><div class="pos__sum"><span>Taxes</span><span>00 CFA</span></div><div class="pos__sum pos__sum--total"><b>Total</b><b>0 CFA</b></div><div class="pos__actions"><span><i class="ri-customer-service-line"></i>Client</span><span><i class="ri-printer-line pos__blue"></i>Commande</span><span><i class="ri-user-line pos__blue"></i>Vendeur</span><span class="pos__note"><i class="ri-sticky-note-line"></i>Note</span></div><div class="pos__pad">${map(numpad, (k) => `<span${k === 'Qté' ? ' class="is-qty"' : k === 'Prix' ? ' class="is-muted"' : ''}>${esc(k)}</span>`)}</div><div class="pos__pay" data-anchor="pay">Paiement</div></aside></div>${map(CART, (item) => `<span class="fly fly--${item.key}">${item.key === 'dentifrice' ? '<span class="prod__letter">D</span>' : `<img src="${asset('story/' + (item.key === 'rasoir' ? 'rasoir' : 'nivea') + '.jpg')}" alt="">`}</span>`)}<div class="pay"><div class="pay__modal"><i class="ri-close-line pay__close"></i><div class="pay__left"><div class="pay__row pay__row--gray"><span>Montant total</span><b class="pay__big">5 700 CFA</b></div><div class="pay__row pay__row--blue"><span class="pay__chip">Espèces</span><span class="pay__input"><i class="pay__caret"></i></span><i class="ri-close-line pay__x"></i></div><div class="pay__row pay__row--gray"><span>Montant à payer</span><b>5 700 CFA</b></div><div class="pay__return"><span>Montant à retourner</span><b>0 CFA</b></div></div><div class="pay__right"><div class="pay__methods">${map(methods, (m, i) => `<div class="${cls('pay__method', i === 0 && 'is-selected')}"${i === 0 ? ' data-anchor="especes"' : ''}><i class="${m.icon}"></i><span>${esc(m.label)}</span></div>`)}</div><div class="pay__opts"><span>Client</span><span>Remise Globale</span><span><i class="ri-sticky-note-line"></i>Note</span></div><div class="pos__pad pay__pad">${map(numpad, (k) => `<span${k === 'Qté' ? ' class="is-qty"' : ''}>${esc(k)}</span>`)}</div><div class="pay__validate" data-anchor="valider">Valider Paiement</div></div></div></div><div class="rcpt"><div class="rcpt__left"><div class="rcpt__ok"><i class="ri-checkbox-circle-fill"></i>Paiement réussi</div><div class="rcpt__amount"><span>5 700 CFA</span><span>/ Espèces</span></div><div class="rcpt__edit">Modifier le reçu</div><div class="rcpt__switch"><span class="is-active">Reçu</span><span>Facture</span><span class="rcpt__print">Imprimer</span></div><div class="rcpt__send"><i class="ri-mail-line is-active"></i><i class="ri-whatsapp-line"></i><span>example&#64;gmail.com</span><i class="ri-send-plane-fill rcpt__plane"></i></div><div class="rcpt__new">Nouvelle commande</div></div><div class="rcpt__right"><div class="rcpt__slot"></div><div class="ticket"><div class="ticket__paper"><div class="ticket__brand"><img src="${asset('logo/recu.webp')}" alt="Tchakeda"></div><p>Ticket : 51929281717F</p><p>28/09/2026 17:17</p><p>Servi par : Diakairdia Sy</p><p>Client : Inconnu</p><p>Boutique : Ma Boutique</p>${map(CART, (item) => `<div class="ticket__item"><span><b>${esc(item.name)}&nbsp;&nbsp;1</b><small>${fmt(item.price)} CFA / Unité(s)</small></span><b>${fmt(item.price)} CFA</b></div>`)}<div class="ticket__sum"><span>Sous-total</span><span>5700 CFA</span></div><div class="ticket__sum"><b>Total</b><b>5700 CFA</b></div><div class="ticket__sum ticket__sum--top"><span>Espèces</span><span>5700 CFA</span></div><div class="ticket__sum"><span>Monnaie</span><span>0 CFA</span></div><div class="ticket__barcode">${map(barcode, (w) => `<i style="flex-grow: ${w};"></i>`)}</div><small class="ticket__by">Généré par Tchakeda</small></div></div></div></div></div>`;

  const statusIcon = (status) =>
    status === 'refund' ? '<i class="ri-close-circle-fill st st--refund"></i>'
      : status === 'paid' ? '<i class="ri-verified-badge-fill st st--paid"></i>'
        : '<i class="ri-checkbox-circle-fill st st--done"></i>';

  const tplPages = () => `<section class="pg pg-ventes"><div class="pg-card pg-ventes__card"><div class="pg__bar"><h4>Ventes</h4><span class="pg__select"><i class="pg__dot"></i><b>Année</b><i class="ri-arrow-down-s-fill"></i></span><span class="pg__select">Tous les vendeurs<i class="ri-arrow-down-s-fill"></i></span><span class="pg__select">Toutes les boutiques<i class="ri-arrow-down-s-fill"></i></span><i class="ri-refresh-line pg__tool"></i><i class="ri-printer-line pg__tool"></i><span class="pg__cta" data-anchor="feere"><i class="ri-shopping-cart-2-line"></i>Feere kɛ yɔrɔ</span></div><div class="pg__kpis"><div class="kpi kpi--lilac kpi--touch"><small>TOTAL VENTES</small><b data-b="salesTotal"></b><span data-b="salesItems"></span><span>Remboursé : 1<i class="ri-close-circle-fill kpi__red"></i></span><i class="kpi__icon ri-shopping-cart-2-line"></i></div><div class="kpi kpi--mint kpi--touch"><small>MONTANT NET</small><b data-b="salesNet"></b><span data-b="caisseOpen"></span><span>Caisse Fermée : <em>78 000</em></span><i class="kpi__icon ri-money-dollar-box-line"></i></div><div class="kpi kpi--rose"><small>TOP 3 PRODUITS</small><span class="kpi__row"><b>#1</b> Velo<em>2 unités</em></span><span class="kpi__row"><b>#2</b> Seau plastique<em>2 unités</em></span><span class="kpi__row"><b>#3</b> Parfum Dubaï<em>1 unités</em></span><i class="kpi__icon ri-shopping-bag-3-line"></i></div><div class="kpi kpi--gray"><small>TOP 3 VENDEURS</small><span class="kpi__row"><b>#1</b> Diakairdia Sy<em data-b="sellerSales"></em></span><i class="kpi__icon ri-user-star-line"></i></div></div><div class="pg-card pg__list"><div class="pg__list-head"><h5>Liste des factures</h5><span class="pg__search"><i class="ri-search-line"></i>N° facture, vendeur ou cli</span><span class="pg__pager" data-b="salesPager">1 - 7 / 7<i class="ri-arrow-left-s-line"></i><i class="ri-arrow-right-s-line"></i></span></div><div class="pg__tabs"><span class="is-active"><i class="ri-shopping-cart-2-line"></i>Ventes</span><span><i class="ri-hand-coin-line"></i>Crédits</span><span><i class="ri-file-list-2-line"></i>Commande</span></div><div class="tbl tbl--ventes"><div class="tbl__head"><span>Date &amp; Heure<i class="ri-arrow-down-s-line"></i></span><span>Numéro Facture<i class="ri-arrow-up-down-line"></i></span><span>Boutique<i class="ri-arrow-up-down-line"></i></span><span>Vendeur<i class="ri-arrow-up-down-line"></i></span><span>Montant Payé<i class="ri-arrow-up-down-line"></i></span><span>Client<i class="ri-arrow-up-down-line"></i></span><span>Statut<i class="ri-arrow-up-down-line"></i></span></div><div class="tbl__body"><div class="tbl__row tbl__row--new"><i class="beam"></i><span>28/09/2026 17:17</span><span>51929281717F</span><span><em class="chip">Ma Boutique</em></span><span>Diakairdia Sy</span><span>5 700 CFA</span><span>Inconnu</span><span><i class="ri-checkbox-circle-fill st st--done"></i></span></div>${map(invoices, (row) => `<div class="tbl__row"><span>${row.date}</span><span>${row.num}</span><span><em class="chip">Ma Boutique</em></span><span>Diakairdia Sy</span><span>${row.refunded ? `<s>${row.refunded}</s>` : ''} ${row.amount}</span><span>Inconnu</span><span>${statusIcon(row.status)}</span></div>`)}</div></div></div></div></section><section class="pg pg-shop"><span class="pg__crumb"><i class="ri-arrow-left-s-line"></i>Boutique</span><div class="pg-card shop"><div class="shop__top"><div class="shop__box shop__actions"><h6><u>ACTION</u> DE LA BOUTIQUE</h6><p>Status : <em>Actif</em><i class="shop__toggle"></i></p><p>Couleur :<i class="shop__color"></i></p><p>Supprimer la boutique<i class="ri-delete-bin-line shop__bin"></i></p></div><div class="shop__box shop__info"><h6><u>INFOR</u>MATIONS SUR LA BOUTIQUE</h6><i class="ri-edit-box-line shop__edit"></i><div class="shop__fields"><span><small>Nouveau nom</small>Ma Boutique</span><span class="is-empty">Nouvelle adresse</span><span><small>Nouvelle email</small>contact&#64;maboutique.ml</span><span><small>Nouvelle telephone</small>+223 20 00 00 00</span></div></div></div><div class="shop__box shop__products"><div class="shop__head"><h6><u>PRODU</u>ITS DE LA BOUTIQUE</h6><b class="shop__count">54</b><i class="ri-delete-bin-line"></i><i class="ri-file-copy-2-line"></i><i class="ri-barcode-line"></i><span class="shop__search"><i class="ri-search-line"></i>Rechercher par nom ou catég<i class="ri-arrow-down-s-fill"></i></span></div><div class="tbl tbl--shop"><div class="tbl__head"><span><i class="shop__check"></i></span><span>Photo</span><span>Nom produit</span><span>Description</span><span>Catégorie</span><span>Prix Vente</span><span>En stock</span><span>Type</span></div>${map(shopProducts, (p) => `<div class="tbl__row"${p.sold ? ` data-sold="${p.sold}"` : ''}><span><i class="shop__check"></i></span><span>${p.image ? `<img class="shop__thumb" src="${asset('story/' + p.image + '.jpg')}" alt="">` : `<span class="shop__thumb shop__thumb--letter">${p.letter}</span>`}</span><span>${esc(p.name)}</span><span>${esc(p.desc)}</span><span>${esc(p.cat)}</span><span>${esc(p.price)}</span><span class="${cls('shop__stock', p.stock === 0 && 'is-zero')}">${p.sold ? `<s>${p.stock}</s><b>${p.stock}</b>` : `${p.stock}${p.stock === 0 ? '<i class="ri-alarm-warning-fill"></i>' : ''}`}</span><span>PHYSIQUE</span></div>`)}</div></div></div></section><section class="pg pg-journal"><div class="pg__bar pg__bar--plain"><h4>Entrées et Sorties</h4><span class="pg__select"><i class="pg__dot"></i><b>Année</b><i class="ri-arrow-down-s-fill"></i></span><span class="pg__select">Toutes les sources<i class="ri-arrow-down-s-fill"></i></span><span class="pg__cta pg__cta--dark">Effectuer un mouvement</span></div><div class="pg__kpis"><div class="kpi kpi--caisse"><small>CAISSE <i class="ri-eye-line"></i></small><b data-b="caisse"></b><span>Solde Année : <strong data-b="caisseSolde"></strong></span><span>CA Année : <strong data-b="caisseCa"></strong></span><i class="kpi__icon ri-hand-coin-line"></i></div><div class="kpi kpi--bank"><small>BANQUE <i class="ri-eye-line"></i></small><b>0 CFA</b><span>Solde Année : <strong>1 000 000 CFA</strong></span><span>CA Année : <strong>1 000 000 CFA</strong></span><i class="kpi__icon ri-bank-card-2-line"></i></div><div class="kpi kpi--mm"><small>MOBILE MONEY <i class="ri-eye-line"></i></small><b>0 CFA</b><span>Solde Année : <strong>0 CFA</strong></span><span>CA Année : <strong>0 CFA</strong></span><i class="kpi__icon ri-smartphone-line"></i></div><div class="kpi kpi--credit"><small>CRÉDIT <i class="ri-eye-line"></i></small><b>2 175 000 CFA</b><span>CF : <strong>0 CFA</strong></span><span>Montant payé : <strong>1 257 000 CFA</strong></span><i class="kpi__icon ri-hand-coin-fill"></i></div></div><div class="pg-card pg__list"><div class="pg__list-head"><span class="pg__search pg__search--left"><i class="ri-search-line"></i>Recherche…</span><span class="pg__pager" data-b="journalPager">1 - 14 sur 14<i class="ri-arrow-left-s-line"></i><i class="ri-arrow-right-s-line"></i></span></div><div class="pg__tabs pg__tabs--six"><span class="is-active"><i class="ri-list-check-2"></i>Toutes les entrées et sorties</span><span><i class="ri-arrow-down-line"></i>Entrée</span><span><i class="ri-arrow-up-line"></i>Sortie</span><span><i class="ri-exchange-line"></i>Transfert</span><span><i class="ri-hand-coin-line"></i>Créances Clts</span><span><i class="ri-truck-line"></i>Dettes Frs</span></div><div class="tbl tbl--journal"><div class="tbl__head"><span>N°</span><span>Date création</span><span>Origine</span><span>Désignation</span><span>Catégorie</span><span>Resp</span><span>Prix U</span><span>Qte</span><span>Montant</span><span>Source</span></div><div class="tbl__body" data-b="journalBody"><div class="tbl__row tbl__row--new" data-new="2"><span>FCT-003-09-2026</span><span>28/09/2026</span><span>FACTURATION</span><span>Prestation</span><span><em class="tag tag--blue">Paiement fa…</em></span><span>Hady Fof…</span><span>25 000 CFA</span><span>1</span><span class="amt amt--in">25 000 CFA</span><span><em class="tag tag--source">Caisse</em></span></div><div class="tbl__row tbl__row--new" data-new="1"><span>C-003-09-2026</span><span>28/09/2026</span><span>Feere kɛ yɔrɔ Ma…</span><span>Vente Feere kɛ y…</span><span><em class="tag tag--mauve">Boutique</em></span><span>Hady Fof…</span><span>5 700 CFA</span><span>3</span><span class="amt amt--in">5 700 CFA</span><span><em class="tag tag--source">Caisse</em></span></div>${map(journal, (row) => `<div class="tbl__row"><span>${esc(row.num)}</span><span>${row.date}</span><span>${esc(row.origin)}</span><span>${esc(row.label)}</span><span><em class="tag tag--${row.catTone}">${esc(row.cat)}</em></span><span>${row.tone ? 'Hady Fof…' : '-'}</span><span>${row.price}</span><span>${row.qty}</span><span class="${cls('amt', row.tone === 'in' && 'amt--in', row.tone === 'out' && 'amt--out')}">${row.amount}</span><span><em class="${cls('tag', row.source !== 'Banque → Caisse' && 'tag--source', row.source === 'Banque → Caisse' && 'tag--dark')}">${esc(row.source)}</em></span></div>`)}</div></div></div></section>`;

  const tplFinance = () => `<section class="pg pg-invoice"><span class="pg__crumb"><i class="ri-arrow-left-s-line"></i>Factures réelle</span><div class="inv"><div class="inv__bar">Voir proforma <i class="ri-download-2-line"></i><i class="ri-printer-cloud-line"></i></div><div class="inv__doc"><span class="inv__ribbon">PARTIELLEMENT<br>PAYÉE</span><div class="inv__company"><span class="inv__logo"><i class="ri-settings-5-fill"></i><b>FOFANA</b></span><span><b>Fofana Corp</b><b>Secteur : Technologie</b> Email : contact&#64;fofanacorp.ml Téléphone : +223 20 00 00 00 </span><span class="inv__tag"><i class="ri-building-2-line"></i><b>Votre entreprise</b>Paramètres</span></div><h6 class="inv__title">FACTURE : FCT-003-09-2026<span class="inv__tag"><i class="ri-hashtag"></i><b>Numéro</b>Automatique</span></h6><p class="inv__date">Bamako, le 04-09-2026</p><p class="inv__meta"><b>Doit :</b> Sy<span class="inv__tag"><i class="ri-user-heart-line"></i><b>Client</b>Fiche client</span></p><p class="inv__meta"><b>Objet :</b> Prestation</p><div class="inv__table"><span class="th">Désignation</span><span class="th">Description</span><span class="th">Prix Unitaire (CFA)</span><span class="th">Quantité</span><span class="th">Montant (CFA)</span><span>Suivi et Controle</span><span>Suivi et Controle en environement</span><span class="c">200 000</span><span class="c">6</span><span class="c">1 200 000</span><span class="wide">Total HT</span><span class="c">1 200 000</span><span class="wide">Montant payé</span><span class="c" data-b="invPaidAmt"></span><span class="wide">Reste à payer</span><span class="c" data-b="invRestAmt"></span><span class="inv__tag"><i class="ri-box-3-line"></i><b>Articles &amp; prix</b>Catalogue et stock</span></div><p class="inv__words"><b>Arrêté la présente facture à la somme de :</b> Un million deux-cent mille Francs CFA.<span class="inv__tag"><i class="ri-calculator-line"></i><b>Montants</b>Comptabilité</span></p><div class="inv__signs"><span class="inv__tag"><i class="ri-quill-pen-line"></i><b>Tampon &amp; signature</b>Enregistrés une fois</span>${map(['Pour acquit', 'Directeur'], (who, i, arr) => `<div><b>${who}</b><span class="inv__stamp"><svg viewBox="0 0 100 100"><defs><path id="arc-${i}" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0"></path></defs><circle cx="50" cy="50" r="46"></circle><circle cx="50" cy="50" r="30"></circle><text><textPath href="#arc-${i}" startOffset="4%">FOFANA CORP · BAMAKO · MALI ·</textPath></text><text x="50" y="47" text-anchor="middle" class="inv__stamp-in">BAMAKO</text><text x="50" y="58" text-anchor="middle" class="inv__stamp-in">PROJET</text></svg><em class="inv__sign">Diakairdia Sy</em></span>${i === arr.length - 1 ? '<b class="inv__name">Diakairdia Sy</b>' : ''}</div>`)}</div></div></div><div class="invp"><div class="invp__card invp__pay"><h5>Paiement de facture</h5><div class="invp__fields"><span class="invp__input" data-anchor="inv-amount" data-b="invAmount">Montant paiement</span><span class="invp__input invp__select" data-anchor="inv-mode" data-b="invMode"><small>Mode de paiement</small>Sélectionnez…<i class="ri-arrow-down-s-fill"></i></span></div><p class="invp__rest" data-b="invRest"></p><div class="invp__foot"><span class="invp__alert" data-b="invAlert"><i class="ri-checkbox-circle-fill"></i>Paiement enregistré avec succès.<i class="ri-close-line"></i></span><span class="invp__btn" data-anchor="inv-pay">Payer la facture</span></div></div><div class="invp__card invp__history"><div class="invp__head"><h5>Historique des paiements</h5><span class="invp__badge">Partiellement payée</span></div><div class="invp__sums"><span><small>Montant dû</small><b class="invp__pill invp__pill--green">1 200 000 CFA</b></span><span><small>Montant restant</small><b class="invp__pill invp__pill--blue" data-b="invPill"></b></span></div><div class="invp__entries"><div class="invp__grow" data-b="invGrow"><div><div class="invp__entry invp__entry--new"><span class="invp__mode"><i class="ri-money-dollar-box-line"></i>ESPECES</span><b>25 000 CFA</b><small>Encaissé par : Diakairdia Sy</small><small>28/09/2026</small><span class="invp__state" data-b="invState"><span class="invp__wait"><i class="ri-time-line"></i>En attente de validation</span><span class="invp__ok"><i class="ri-checkbox-circle-fill"></i>Validé</span></span><span class="invp__acts" data-b="invActs"><span class="invp__validate" data-anchor="inv-valider"><i class="ri-checkbox-circle-line"></i>Valider</span><span class="invp__reject"><i class="ri-close-circle-line"></i>Rejeter</span></span></div></div></div><div class="invp__entry"><span class="invp__mode"><i class="ri-money-dollar-box-line"></i>ESPECES</span><b>1 000 000 CFA</b><small>Encaissé par : Diakairdia Sy</small><small>04/09/2026</small><span class="invp__state is-valid"><span class="invp__ok"><i class="ri-checkbox-circle-fill"></i>Validé</span></span></div></div><p class="invp__split" data-b="invSplit"><b>Répartition par mode de paiement</b><span class="invp__mode invp__mode--chip"><i class="ri-money-dollar-box-line"></i>ESPECES</span>1 000 000 CFA</p></div></div></section><section class="pg pg-report"><div class="rep" data-b="rep"><div class="rep__tab"><i class="ri-bar-chart-fill"></i>Etat Mensuel</div><div class="rep__kpis"><div class="rep__kpi rep__kpi--touch"><small>Chiffre d'affaires du mois</small><b data-b="ca"></b><span><strong data-b="caPct"></strong> de l'objectif</span><i class="ri-store-2-line"></i></div><div class="rep__kpi"><small>Dépenses du Mois</small><b class="is-red">2 450 000 CFA</b><span><strong data-b="expPct"></strong> du Chiffre d'affaires</span><i class="ri-wallet-3-line"></i></div><div class="rep__kpi"><small>Marge bénéficiaire</small><b data-b="margin"></b><span data-b="marginPct"></span><i class="ri-line-chart-line"></i></div><div class="rep__kpi"><small>Objectif du Mois</small><b>2 177 419.35 CFA</b><span>Écart : <em data-b="gap"></em></span><i class="ri-focus-3-line"></i></div></div><div class="rep__card rep__tables">${map(tables, (t) => `<div class="rep__tbl rep__tbl--${t.cols.length}"><h6><i class="${t.icon}"></i>${esc(t.title)}</h6><div class="rep__row rep__row--head">${map(t.cols, (c) => `<span>${esc(c)}</span>`)}</div>${map(t.rows, (r) => `<div class="${cls('rep__row', r.name === 'TOTAL' && 'rep__row--total', (r.q[0] !== r.q[1] || r.m[0] !== r.m[1]) && 'is-changed')}" data-row><span>${esc(r.name)}</span>${t.cols.length === 4 ? `<span data-v="q">${r.q[0]}</span>` : ''}<span class="rep__amt" data-v="m">${r.m[0]}</span><span><em class="${cls('rep__pct', t.warm && 'rep__pct--warm')}" data-v="p">${r.p[0]}</em></span></div>`)}</div>`)}</div><div class="rep__card rep__lower"><div class="rep__tbl rep__tbl--seller"><h6><i class="ri-user-star-line"></i>Vente par vendeur</h6><div class="rep__row rep__row--head"><span>Vendeur</span><span>Montant</span><span>Objectif</span><span>%</span></div><div class="rep__row"><span>Diakairdia Sy</span><span class="rep__amt" data-b="caAmt"></span><span>—</span><span>—</span></div><div class="rep__row rep__row--total"><span>TOTAL</span><span class="rep__amt" data-b="caAmt"></span><span>—</span><span>—</span></div></div><div class="rep__donut"><h6><i class="ri-pie-chart-2-line"></i>Répartition des charges</h6><div class="rep__donut-body"><svg viewBox="0 0 42 42"><circle class="rep__ring" cx="21" cy="21" r="15.9" pathLength="100"></circle><circle class="rep__seg" cx="21" cy="21" r="15.9" pathLength="100" stroke="#2f7de1" stroke-dasharray="100 0"></circle><text x="21" y="19.5" class="rep__donut-k">TOTAL</text><text x="21" y="25" class="rep__donut-v">2.5M</text></svg><div class="rep__legend"><span><i style="background:#2f7de1"></i>Charges fixes <b>2 450 000 CFA</b><em class="rep__pct">100,0%</em></span><span class="rep__legend-total">TOTAL<b>2 450 000 CFA</b></span></div></div></div><div class="rep__donut"><h6><i class="ri-store-2-line"></i>Répartition du CA</h6><div class="rep__donut-body"><svg viewBox="0 0 42 42"><circle class="rep__ring" cx="21" cy="21" r="15.9" pathLength="100"></circle>${map(caSegments, (seg, i) => `<circle class="rep__seg" cx="21" cy="21" r="15.9" pathLength="100" stroke="${seg.color}" stroke-dasharray="${seg.pct + ' ' + (100 - seg.pct)}" stroke-dashoffset="${-seg.offset}" style="--seg-delay: ${i * 0.25 + 's'};"></circle>`)}<text x="21" y="19.5" class="rep__donut-k">TOTAL</text><text x="21" y="25" class="rep__donut-v">2.1M</text></svg><div class="rep__legend">${map(caSegments, (seg) => `<span><i style="background: ${seg.color};"></i>${esc(seg.label)} <b>${seg.amount}</b><em class="rep__pct" style="color: ${seg.color};">${seg.pctLabel}</em></span>`)}<span class="rep__legend-total">TOTAL CA<b data-b="caAmt"></b></span></div></div></div><div class="rep__goal"><span><i class="ri-bar-chart-2-fill"></i><small>SUIVI OBJECTIF</small><b>Rythme de croisière</b></span><span><small>PROGRESSION</small><b data-b="caPct2"></b> · 93,33% attendu <em>(+3,2 pts)</em><small>Proj. 2 252 250 CFA · J28/30</small></span><span><i class="ri-lightbulb-line"></i><small>CONSEIL</small>Rythme de croisière — performance conforme au plan. Il reste 2 j pour dégager un excédent.</span></div></div><div class="rep__card rep__chart"><h6><i class="ri-bar-chart-fill"></i>CA journalier vs Dépenses <b>30 jours</b></h6><div class="rep__chart-legend"><span><i class="is-ca"></i>CA</span><span><i class="is-dep"></i>Dépenses</span></div><div class="rep__plot">${map(['2.5M', '2.0M', '1.5M', '1.0M', '500k', '0'], (y) => `<span class="rep__grid"><em>${y}</em></span>`)}<div class="rep__days">${map(days, (d, i) => `<span class="rep__day" style="--i: ${i};"><i class="${cls('is-ca', d.today && 'is-today')}" style="height: ${d.ca}%;"></i><i class="${cls('is-dep', d.alert && 'is-alert')}" style="height: ${d.dep}%;"></i><small>${d.label}</small>${d.alert ? '<span class="rep__insight"><i class="ri-eye-line"></i><b>À surveiller · 15/09</b>Dépenses 2 300 000 CFA · Restauration</span>' : ''}</span>`)}</div></div></div></div></section>`;

  /* ================= Montage ================= */
  root.innerHTML = tplStory();
  const q = (sel, el = root) => el.querySelector(sel);
  const qa = (sel, el = root) => Array.from(el.querySelectorAll(sel));
  const B = (name) => qa(`[data-b="${name}"]`);
  // Les attributs data-b / data-v / data-sold / data-new / data-row servent seulement au câblage : on les retire
  // après coup pour que le DOM soit identique à celui de l'application Angular.
  const one = (name) => B(name)[0];

  const section = q('.ps');
  const sticky = q('.ps__sticky');
  const deviceEl = q('.ps__device');
  const screenEl = q('.ps__screen');
  const proEl = q('.pro');

  const proCaps = qa('.ps__caption--pro');
  const stepCaps = qa('.ps__caption:not(.ps__caption--pro)');
  const urlSpans = qa('.ps__url-texts > span');
  const navEls = qa('.app__nav').map((el, i) => {
    const item = sidebar[i];
    let sub = el.nextElementSibling;
    if (!sub || !sub.classList.contains('app__sub')) sub = null;
    return { el, item, chev: q('.app__chev', el), sub, subSpans: sub ? qa('span', sub) : [] };
  });
  const prodEls = qa('.pos__products > .prod');
  const cartHeadText = q('.pos__cart-head > span').lastChild;
  const posLines = qa('.pos__line');
  const posTotal = q('.pos__sum--total b:last-child');
  const payInput = q('.pay__input');
  const cashText = document.createTextNode('');
  payInput.insertBefore(cashText, payInput.firstChild);

  const salesTotalEl = one('salesTotal');
  const salesItemsEl = one('salesItems');
  const salesNetEl = one('salesNet');
  const caisseOpenEl = one('caisseOpen');
  const sellerSalesEl = one('sellerSales');
  const salesPagerText = one('salesPager').firstChild;
  const shopRows = qa('.tbl--shop .tbl__row').map((el, i) => ({ el, p: shopProducts[i], b: q('.shop__stock b', el) }));
  const caisseEl = one('caisse');
  const caisseSoldeEl = one('caisseSolde');
  const caisseCaEl = one('caisseCa');
  const journalPagerText = one('journalPager').firstChild;
  const journalBody = one('journalBody');
  const journalNewRows = qa('[data-new]', journalBody).map((el) => ({ el, n: Number(el.dataset.new) }));

  const invPaidAmtEl = one('invPaidAmt');
  const invRestAmtEl = one('invRestAmt');
  const invAmountEl = one('invAmount');
  const invModeText = one('invMode').childNodes[1];
  const invRestEl = one('invRest');
  const invAlertEl = one('invAlert');
  const invPillEl = one('invPill');
  const invGrowEl = one('invGrow');
  const invStateEl = one('invState');
  const invActsEl = one('invActs');
  const invSplitText = one('invSplit').lastChild;
  const repEl = one('rep');
  const caEl = one('ca');
  const caPctEl = one('caPct');
  const caPct2El = one('caPct2');
  const expPctEl = one('expPct');
  const marginEl = one('margin');
  const marginPctEl = one('marginPct');
  const gapEl = one('gap');
  const caAmtEls = B('caAmt');
  const repRows = [];
  qa('.rep__tables .rep__tbl').forEach((tblEl, ti) => {
    qa('[data-row]', tblEl).forEach((rowEl, ri) => {
      repRows.push({ r: tables[ti].rows[ri], q: q('[data-v="q"]', rowEl), m: q('[data-v="m"]', rowEl), p: q('[data-v="p"]', rowEl) });
    });
  });
  qa('[data-b],[data-v],[data-sold],[data-new],[data-row]').forEach((el) => {
    ['data-b', 'data-v', 'data-sold', 'data-new', 'data-row'].forEach((a) => el.removeAttribute(a));
  });

  const toggle = (el, name, on) => el.classList.toggle(name, !!on);
  const text = (node, value) => {
    if (node.textContent !== value) node.textContent = value;
  };

  let lastNav = '';
  let lastInvAmount = null;
  function sync() {
    const step = st.step;
    const navKey = nav();
    const cls = 'ps ' + stateClass();
    const classChanged = section.className !== cls;
    if (classChanged) section.className = cls;
    
    if (classChanged && st.step >= S.feere && st.step <= S.recu) {
      requestAnimationFrame(measureAnchors);
    }

    const pIndex = ['chaos', 'order', 'portal'].indexOf(st.phase);
    proCaps.forEach((el, i) => {
      toggle(el, 'is-active', i === pIndex);
      el.setAttribute('aria-hidden', String(i !== pIndex));
    });
    stepCaps.forEach((el, i) => {
      const on = st.phase === 'story' && i === step;
      toggle(el, 'is-active', on);
      el.setAttribute('aria-hidden', String(!on));
    });
    
    // Update new Stepper UI
    if (st.phase === 'story') {
      qa('.ps__step-dot', section).forEach((dot, i) => {
        dot.style.background = i <= step ? '#2563eb' : '#fff';
        dot.style.borderColor = i <= step ? '#2563eb' : '#cbd5e1';
      });
      qa('.ps__step-label', section).forEach((lbl, i) => {
        lbl.style.fontWeight = i === step ? '600' : '400';
        lbl.style.color = i === step ? '#0f172a' : '#94a3b8';
      });
      const activeLine = section.querySelector('.ps__step-line-active');
      if (activeLine) activeLine.style.height = `${step * 32}px`;
      
      const countEl = section.querySelector('.ps__progress-count');
      if (countEl) countEl.textContent = `${(step < 9 ? '0' : '') + (step + 1)} / ${steps.length}`;
    }
    urlSpans.forEach((el, i) => toggle(el, 'is-active', i === step));

    if (navKey !== lastNav) {
      lastNav = navKey;
      navEls.forEach(({ el, item, chev, sub, subSpans }) => {
        const active = !!item.active?.includes(navKey);
        toggle(el, 'is-active', active);
        if (chev) toggle(chev, 'is-open', active);
        if (sub) {
          toggle(sub, 'is-open', active);
          subSpans.forEach((s, i) => toggle(s, 'is-current', item.sub[i].current.includes(navKey)));
        }
      });
    }

    // Caisse
    prodEls.forEach((el, i) => toggle(el, 'is-picked', inCart(products[i].key)));
    text(cartHeadText, `${st.picked} article${st.picked > 1 ? 's' : ''}`);
    posLines.forEach((el, i) => toggle(el, 'is-in', st.picked > i));
    text(posTotal, `${fmt(st.cartTotal)} CFA`);
    text(cashText, st.cash);

    // Ventes
    text(salesTotalEl, String(st.salesTotal));
    text(salesItemsEl, `Nbre d'articles : ${st.salesItems}`);
    text(salesNetEl, `${fmt(st.salesNet)} CFA`);
    text(caisseOpenEl, `Caisse Ouverte : ${fmt(st.caisseOpen)}`);
    text(sellerSalesEl, `${st.salesTotal} ventes`);
    text(salesPagerText, `1 - ${st.salesTotal} / ${st.salesTotal}`);

    // Boutique
    shopRows.forEach(({ el, p, b }) => {
      const updated = p.sold && st.stockUpdated > p.sold - 1;
      toggle(el, 'is-updated', updated);
      if (b) text(b, String(updated ? p.stock - 1 : p.stock));
    });

    // Journal
    text(caisseEl, `${fmt(st.caisse)} CFA`);
    text(caisseSoldeEl, `${fmt(st.caisse - 1119300)} CFA`);
    text(caisseCaEl, `${fmt(st.caisse + 1340700)} CFA`);
    text(journalPagerText, `1 - ${14 + st.journalNew} sur ${14 + st.journalNew}`);
    journalBody.style.setProperty('--shown', String(st.journalNew));
    journalNewRows.forEach(({ el, n }) => toggle(el, 'is-in', st.journalNew > n - 1));

    // Facture
    toggle(invPaidAmtEl, 'is-live', st.invValidated);
    text(invPaidAmtEl, st.invValidated ? '1 025 000' : '1 000 000');
    toggle(invRestAmtEl, 'is-live', st.invValidated);
    text(invRestAmtEl, st.invValidated ? '175 000' : '200 000');
    toggle(invAmountEl, 'is-filled', st.invAmount);
    if (st.invAmount !== lastInvAmount) {
      lastInvAmount = st.invAmount;
      invAmountEl.innerHTML = st.invAmount
        ? `<small>Montant paiement</small>${esc(st.invAmount)}<i class="invp__caret"></i>`
        : 'Montant paiement';
    }
    text(invModeText, st.invMode ? 'Espèces' : 'Sélectionnez…');
    text(invRestEl, `Restant: ${fmt(st.invPaid ? st.invRemaining : 200000)} CFA`);
    toggle(invAlertEl, 'is-on', st.invPaid);
    text(invPillEl, `${fmt(st.invRemaining)} CFA`);
    toggle(invGrowEl, 'is-open', st.invPaid);
    toggle(invStateEl, 'is-valid', st.invValidated);
    toggle(invActsEl, 'is-gone', st.invValidated);
    text(invSplitText, `${st.invValidated ? '1 025 000' : '1 000 000'} CFA`);

    // Rapport
    toggle(repEl, 'is-live', st.reportLive);
    text(caEl, `${fmt(st.ca)} CFA`);
    text(caPctEl, `${caObjectivePct()}%`);
    text(caPct2El, `${caObjectivePct()}%`);
    text(expPctEl, `${expensesPct()}%`);
    text(marginEl, `${fmt(margin())} CFA`);
    text(marginPctEl, `${marginPct()}% du chiffre d'affaires`);
    text(gapEl, `${gap()} CFA`);
    caAmtEls.forEach((el) => text(el, `${fmt(st.ca)} CFA`));
    const k = st.reportLive ? 1 : 0;
    repRows.forEach(({ r, q: qe, m, p }) => {
      if (qe) text(qe, r.q[k]);
      text(m, r.m[k]);
      text(p, r.p[k]);
    });
  }
  sync();

  /* ================= ProductStoryComponent ================= */
  const PACE = 0.4;
  const PROLOGUE_KEYS = [[0, 1]].map(([t, p]) => [t * PACE, p]);
  const PROLOGUE_MS = 0;
  const STEP_MS = [4500, 3600, 4300, 4200, 4400, 4300, 8800, 5000, 4600, 4300, 4700, 5600, 5200].map((ms) => ms * PACE);
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let layout;
  let lastP = -1;
  let sparkPlayed = false;
  let sparkFrame = 0;
  let tiltFrame = 0;
  let playing = false;
  let left = false;
  const starts = STEP_MS.reduce((acc, _, i) => [...acc, i ? acc[i - 1] + STEP_MS[i - 1] : 0], []);
  const total = PROLOGUE_MS + STEP_MS.reduce((a, b) => a + b, 0);
  let time = 0;
  let last = 0;
  let frame = 0;
  let inView = false;

  const start = () => (st.reduced ? PROLOGUE_MS : 0);

  function seek(t) {
    time = Math.min(Math.max(t, 0), total);
    lastP = -1;
    render();
  }
  function play() {
    if (playing) return;
    playing = true;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    playing = false;
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  const onVisibility = () => {
    if (document.hidden) stop();
    else if (inView) play();
  };
  function tick(now) {
    time += Math.min(now - last, 100);
    last = now;
    if (time >= total) seek(start());
    try {
      render();
    } catch (err) {
      console.warn('Story tick error:', err);
    }
    if (playing) {
      frame = requestAnimationFrame(tick);
    }
  }

  function render() {
    const p = time >= PROLOGUE_MS ? 1 : prologueAt(time);
    const phase = p < 0.45 ? 'chaos' : p < 0.72 ? 'order' : p < 1 ? 'portal' : 'story';
    if (phase !== st.phase) {
      set('phase', phase);
      if (phase === 'portal') sound.play('whoosh');
    }
    renderPrologue(p);

    const t = time - PROLOGUE_MS;
    let step = 0;
    if (t >= 0) {
      while (step < STEP_MS.length - 1 && t >= starts[step + 1]) step++;
    }
    const stepsTotal = total - PROLOGUE_MS;
    section.style.setProperty('--ps-progress', clamp01(t / stepsTotal).toFixed(4));
    section.style.setProperty('--step-fill', t >= 0 ? clamp01((t - starts[step]) / STEP_MS[step]).toFixed(3) : '0');
    enter(phase === 'story' ? step : 0);
  }

  function prologueAt(t) {
    for (let i = 1; i < PROLOGUE_KEYS.length; i++) {
      const [t1, p1] = PROLOGUE_KEYS[i];
      const [t0, p0] = PROLOGUE_KEYS[i - 1];
      if (t <= t1) return lerp(p0, p1, (t - t0) / (t1 - t0));
    }
    return 1;
  }

  function measure() {
    measureAnchors();
    measurePrologue();
    lastP = -1;
    render();
  }

  function offsetIn(el, rootEl) {
    let x = 0;
    let y = 0;
    let node = el;
    while (node && node !== rootEl) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x, y };
  }

  function measurePrologue() {
    const stage = proEl.parentElement;
    const { x, y } = offsetIn(deviceEl, stage);
    const w = deviceEl.offsetWidth;
    const h = deviceEl.offsetHeight;
    const cols = w > 560 ? 4 : 3;
    const rows = Math.ceil(modules.length / cols);
    const cellW = w / cols;
    const cellH = h / rows;
    const tile = Math.round(Math.min(cellW * 0.46, cellH * 0.56, 96));
    const W = stage.clientWidth;
    const H = stage.clientHeight;

    const copy = stage.querySelector('.ps__copy');
    const side = !!copy && offsetIn(copy, stage).y + copy.offsetHeight > y;
    const zone = side
      ? { x0: offsetIn(copy, stage).x + copy.offsetWidth + 24, x1: W - 24, y0: H * 0.1, y1: H * 0.9 }
      : { x0: 12, x1: W - 12, y0: y - 12, y1: H - 16 };

    let seed = 7;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const lcols = side ? 5 : 3;
    const lrows = side ? 3 : 5;
    const cells = Array.from({ length: lcols * lrows }, (_, k) => k).sort(() => rand() - 0.5);
    const cw = (zone.x1 - zone.x0) / lcols;
    const ch = (zone.y1 - zone.y0) / lrows;
    const chaos = modules.map((_, i) => {
      const cell = cells[i];
      return {
        x: zone.x0 + ((cell % lcols) + 0.5 + (rand() - 0.5) * 0.45) * cw - tile / 2,
        y: zone.y0 + (Math.floor(cell / lcols) + 0.5 + (rand() - 0.5) * 0.4) * ch - tile / 2,
        r: (rand() - 0.5) * 44,
        s: 0.74 + rand() * 0.3
      };
    });
    const grid = modules.map((_, i) => ({
      x: x + (i % cols) * cellW + (cellW - tile) / 2,
      y: y + Math.floor(i / cols) * cellH + (cellH - tile) / 2 - 10
    }));
    layout = { tile, chaos, grid, device: { x, y, w, h } };
    proEl.style.setProperty('--tile', `${tile}px`);
    proEl.querySelector('svg')?.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  const tiles = qa('.pro__tile', proEl);
  const paths = qa('.pro__threads path', proEl);
  const spark = q('.pro__spark', proEl);

  function renderPrologue(p) {
    const L = layout;
    if (!L || (p === lastP && p !== 0)) return;
    const wasStory = lastP >= 1;
    lastP = p;
    if (p >= 1) {
      if (!wasStory) deviceEl.style.translate = deviceEl.style.scale = deviceEl.style.clipPath = deviceEl.style.opacity = '';
      return;
    }

    const reduced = st.reduced;
    const qq = reduced ? clamp01((p - 0.72) / 0.28) : easeInOut(clamp01((p - 0.72) / 0.28));
    const centers = [];
    const devCx = L.device.x + L.device.w / 2;
    const devCy = L.device.y + L.device.h / 2;

    tiles.forEach((el, i) => {
      const s0 = 0.12 + landing.indexOf(i) * 0.024;
      const t = reduced ? 1 : easeInOut(clamp01((p - s0) / 0.2));
      const c = L.chaos[i];
      const g = L.grid[i];
      let x = lerp(c.x, g.x, t);
      let y = lerp(c.y, g.y, t);
      let opacity = 1;
      if (qq > 0 && i !== portalIndex) {
        x += (g.x + L.tile / 2 - devCx) * qq * 0.6;
        y += (g.y + L.tile / 2 - devCy) * qq * 0.6;
        opacity = 1 - clamp01(qq * 1.6);
      } else if (qq > 0) {
        opacity = 1 - clamp01(qq / 0.22);
      }
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(c.r * (1 - t)).toFixed(2)}deg) scale(${lerp(c.s, 1, t).toFixed(3)})`;
      el.style.opacity = String(opacity);
      el.classList.toggle('is-set', t >= 1);
      centers.push({ x: x + L.tile / 2, y: y + L.tile / 2 });
    });

    const draw = clamp01((p - 0.1) / 0.4);
    paths.forEach((path, j) => {
      const a = centers[chain[j]];
      const b = centers[chain[j + 1]];
      const mx = (a.x + b.x) / 2;
      path.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${mx.toFixed(1)} ${a.y.toFixed(1)} ${mx.toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      path.style.strokeDashoffset = String(1 - clamp01(draw * paths.length - j));
      path.style.opacity = String(1 - clamp01(qq * 3));
    });

    if (p >= 0.56 && !sparkPlayed && !reduced) {
      sparkPlayed = true;
      playSpark();
    } else if (p < 0.45 && sparkPlayed) {
      sparkPlayed = false;
      tiles.forEach((t) => t.classList.remove('is-knot'));
    }

    if (qq > 0) {
      const g = L.grid[portalIndex];
      const s0 = L.tile / L.device.h;
      const s = reduced ? 1 : lerp(s0, 1, qq);
      const inset = reduced ? 0 : ((L.device.w - L.device.h) / 2) * (1 - qq);
      deviceEl.style.translate = reduced
        ? ''
        : `${((g.x + L.tile / 2 - devCx) * (1 - qq)).toFixed(1)}px ${((g.y + L.tile / 2 - devCy) * (1 - qq)).toFixed(1)}px`;
      deviceEl.style.scale = String(s);
      deviceEl.style.clipPath = `inset(0 ${inset.toFixed(1)}px round ${lerp(0.22 * L.device.h, 14, qq).toFixed(1)}px)`;
      deviceEl.style.opacity = String(clamp01(qq * 5));
    } else {
      deviceEl.style.opacity = '0';
    }
  }

  function playSpark() {
    if (!spark) return;
    const perSegment = 420;
    const t0 = performance.now();
    cancelAnimationFrame(sparkFrame);
    const step = (now) => {
      const elapsed = now - t0;
      const seg = Math.floor(elapsed / perSegment);
      if (seg >= paths.length) {
        spark.setAttribute('cx', '-20');
        tiles[chain[chain.length - 1]]?.classList.add('is-knot');
        return;
      }
      const path = paths[seg];
      const t = easeOutCubic((elapsed % perSegment) / perSegment);
      const point = path.getPointAtLength(path.getTotalLength() * t);
      spark.setAttribute('cx', point.x.toFixed(1));
      spark.setAttribute('cy', point.y.toFixed(1));
      const knot = tiles[chain[seg]];
      if (knot && !knot.classList.contains('is-knot')) {
        knot.classList.add('is-knot');
        sound.play('knot');
      }
      sparkFrame = requestAnimationFrame(step);
    };
    tiles.forEach((t) => t.classList.remove('is-knot'));
    sparkFrame = requestAnimationFrame(step);
  }

  function enableTilt() {
    if (st.reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const loop = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      deviceEl.style.setProperty('--mx', cx.toFixed(3));
      deviceEl.style.setProperty('--my', cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) tiltFrame = requestAnimationFrame(loop);
      else tiltFrame = 0;
    };
    const kick = () => {
      if (!tiltFrame) tiltFrame = requestAnimationFrame(loop);
    };
    deviceEl.addEventListener('pointermove', (e) => {
      const r = deviceEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      deviceEl.style.setProperty('--gx', `${e.clientX - r.left}px`);
      deviceEl.style.setProperty('--gy', `${e.clientY - r.top}px`);
      kick();
    });
    deviceEl.addEventListener('pointerleave', () => {
      tx = 0;
      ty = 0;
      kick();
    });
  }

  function measureAnchors() {
    qa('[data-anchor]', screenEl).forEach((el) => {
      let x = el.offsetWidth / 2;
      let y = el.offsetHeight / 2;
      let node = el;
      while (node && node !== screenEl) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent;
      }
      if (node !== screenEl) return;
      const name = el.dataset.anchor;
      screenEl.style.setProperty(`--${name}-x`, `${x.toFixed(1)}px`);
      screenEl.style.setProperty(`--${name}-y`, `${y.toFixed(1)}px`);
    });
  }

  // const sticky = section.querySelector('.ps__sticky'); // Déjà défini ligne 541
  // ngAfterViewInit
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView) {
        play();
      } else {
        stop();
      }
    },
    { threshold: 0.05 }
  );
  if (section) observer.observe(section);
  document.addEventListener('visibilitychange', onVisibility);

  time = start();

  const resizeObserver = new ResizeObserver(() => measure());
  resizeObserver.observe(screenEl);
  if (sticky) resizeObserver.observe(sticky);
  measure();
  document.fonts?.ready.then(() => measure());
  enableTilt();

  // Démarrage automatique garanti
  play();

  // Clic sur les étapes du Stepper pour naviguer directement
  qa('.ps__step-label', section).forEach((lbl, i) => {
    lbl.addEventListener('click', () => {
      seek(starts[i] + 10);
      if (!playing) play();
    });
  });
  qa('.ps__step-dot', section).forEach((dot, i) => {
    dot.style.cursor = 'pointer';
    dot.addEventListener('click', () => {
      seek(starts[i] + 10);
      if (!playing) play();
    });
  });

  const pauseBtn = section.querySelector('.ps__pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (playing) {
        stop();
        pauseBtn.innerHTML = `<i class="ri-play-mini-line" style="color: #2563eb; font-weight: bold; font-size: 16px;"></i> Lecture`;
      } else {
        play();
        pauseBtn.innerHTML = `<i class="ri-pause-mini-line" style="color: #2563eb; font-weight: bold; font-size: 16px;"></i> Pause`;
      }
    });
  }
})();
