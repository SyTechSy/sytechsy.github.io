import { Injectable, computed, inject, signal } from '@angular/core';
import { formatNumber, prefersReducedMotion, tween } from '../motion.utils';
import { SoundService } from '../sound.service';

export interface StoryStep {
  label: string;
  title: string;
  text: string;
  url: string;
}

export type NavKey = 'ventes' | 'boutiques' | 'journal' | 'facture' | 'rapport' | 'pos';

/** Étapes de l'histoire (index) : on s'y réfère par nom plutôt que par numéro magique. */
export const S = {
  ventes: 0,
  'Feere kɛ yɔrɔ': 1,
  panier: 2,
  paiement: 3,
  recu: 4,
  boutique: 5,
  facture: 6,
  paiementFacture: 7,
  journal: 8,
  rapport: 9,
  stats: 10,
  systeme: 11,
  retour: 12
} as const;

export const CART = [
  { key: 'dentifrice', name: 'Dentifrice Colgate', price: 1200 },
  { key: 'rasoir', name: 'Rasoir Gillette', price: 2000 },
  { key: 'nivea', name: 'Crème Nivea', price: 2500 },
] as const;

export const SALE_TOTAL = 5700;
export const INVOICE_PAYMENT = 25000;
const CA_BEFORE = 2071400;
const CA_OBJECTIVE = 2177419.35;
const EXPENSES = 2450000;

/** Moments de la chorégraphie du panier (ms) : ils suivent les clics du curseur. */
const PICK_AT = [250, 950, 1650];

/**
 * État de l'histoire « Tout est connecté », partagé par la section et ses écrans.
 * Le scroll choisit l'étape ; chaque étape pose ses données puis joue sa séquence dans le temps.
 * Le logiciel bouge parce qu'il travaille : chaque chiffre qui change est une conséquence de la vente.
 */
@Injectable()
export class StoryState {
  readonly reduced = prefersReducedMotion();
  /** Le son prolonge le mouvement : une goutte par étape, un accord quand un paiement est confirmé. */
  readonly sound = inject(SoundService);
  readonly fmt = formatNumber;

  readonly steps: StoryStep[] = [
    {
      label: 'Ventes',
      title: 'Toutes vos ventes, en un coup d’œil',
      text: 'Total des ventes, montant net, meilleurs produits et vendeurs : le suivi de votre activité en temps réel.',
      url: 'fere.tchakeda.com/vente'
    },
    {
      label: 'Feere kɛ yɔrɔ',
      title: 'Un clic sur « Feere kɛ yɔrɔ »',
      text: 'La caisse s’ouvre directement depuis vos ventes. Vos produits, vos prix et vos stocks sont déjà là.',
      url: 'fere.tchakeda.com/pos-accueil'
    },
    {
      label: 'Panier',
      title: 'Le panier se remplit en quelques touches',
      text: 'Un produit touché, un produit ajouté. Le total se calcule tout seul, taxes comprises.',
      url: 'fere.tchakeda.com/pos-accueil'
    },
    {
      label: 'Paiement',
      title: 'Espèces, mobile money, carte ou crédit',
      text: 'Choisissez le mode de paiement, saisissez le montant reçu : la monnaie à rendre s’affiche instantanément.',
      url: 'fere.tchakeda.com/pos-accueil'
    },
    {
      label: 'Reçu',
      title: 'Le reçu est prêt',
      text: 'Imprimé, envoyé par e-mail ou WhatsApp, ou transformé en facture : votre client repart avec son justificatif.',
      url: 'fere.tchakeda.com/pos-accueil/paiement'
    },
    {
      label: 'Boutique',
      title: 'Le stock de la boutique suit',
      text: 'Chaque article vendu quitte le stock de sa boutique. Vous savez toujours ce qu’il reste en rayon.',
      url: 'fere.tchakeda.com/detail-boutique/t_MTQ='
    },
    {
      label: 'Facture',
      title: 'Une facture, toute l’entreprise',
      text: 'Chaque ligne vient d’un module : le client de votre fichier, les articles de votre stock, les montants de votre comptabilité. Rien n’est ressaisi.',
      url: 'fere.tchakeda.com/facture-reel-details/t_NjMx'
    },
    {
      label: 'Paiement facture',
      title: 'Chaque paiement est tracé',
      text: 'Un acompte de 25 000 CFA est encaissé puis validé. Le reste à payer se met à jour tout seul.',
      url: 'fere.tchakeda.com/facture-reel-details/t_NjMx'
    },
    {
      label: 'Journal',
      title: 'La comptabilité se tient toute seule',
      text: 'La vente et le paiement de la facture rejoignent le journal, à côté des salaires, des dépenses et des dettes fournisseurs. Sans ressaisie.',
      url: 'fere.tchakeda.com/entree-sortie-entreprise-journal'
    },
    {
      label: 'Rapport financier',
      title: 'Votre rapport financier, déjà calculé',
      text: 'Chiffre d’affaires, dépenses, marge et objectif du mois intègrent la vente et le paiement.',
      url: 'fere.tchakeda.com/reporting-finance'
    },
    {
      label: 'Statistiques',
      title: 'Pilotez avec les bons chiffres',
      text: 'Répartition du chiffre d’affaires, suivi d’objectif, activité jour par jour : les tendances sautent aux yeux.',
      url: 'fere.tchakeda.com/reporting-finance'
    },
    {
      label: 'Le système',
      title: 'Vu de l’intérieur',
      text: 'Chaque couche de Tchakeda travaille avec les autres : la vente d’aujourd’hui remonte jusqu’à vos indicateurs.',
      url: 'fere.tchakeda.com/vente'
    },
    {
      label: 'Tout connecté',
      title: 'Tout est déjà à jour',
      text: 'De retour sur vos ventes, la nouvelle vente est là. Une seule action a fait avancer toute l’entreprise.',
      url: 'fere.tchakeda.com/vente'
    }
  ];

  readonly step = signal(0);
  /** Prologue avant l'histoire : les modules éparpillés, puis rangés, puis le portail vers l'application. */
  readonly phase = signal<'chaos' | 'order' | 'portal' | 'story'>('chaos');

  /** Textes du prologue : du chaos à l'organisation. */
  readonly prologue = [
    {
      title: 'Aujourd’hui, votre entreprise est éparpillée.',
      text: 'Les ventes dans un cahier, le stock dans un autre, les salaires sur Excel, les dettes fournisseurs de tête…'
    },
    {
      title: 'Tchakeda relie tout.',
      text: '12 modules pensés pour travailler ensemble : chaque information trouve sa place, et la vente circule jusqu’au tableau de bord.'
    },
    {
      title: 'Et tout tient dans une seule interface.',
      text: 'Continuez à faire défiler : entrez dans Tchakeda.'
    }
  ];

  // Caisse
  readonly picked = signal(0);
  readonly cartTotal = signal(0);
  readonly cash = signal('');
  // Boutique : nombre de lignes de stock déjà mises à jour (0 → 3)
  readonly stockUpdated = signal(0);
  // Journal : solde de caisse et nombre d'écritures nouvelles (vente, puis paiement de facture)
  readonly caisse = signal(65700);
  readonly journalNew = signal(0);
  // Facture
  readonly invAmount = signal('');
  readonly invMode = signal(false);
  readonly invPaid = signal(false);
  readonly invValidated = signal(false);
  readonly invRemaining = signal(200000);
  // Rapport financier
  readonly ca = signal(CA_BEFORE);
  readonly reportLive = signal(false);
  // Ventes
  readonly salesTotal = signal(7);
  readonly salesItems = signal(12);
  readonly salesNet = signal(143700);
  readonly caisseOpen = signal(65700);

  readonly stateClass = computed(() => {
    const s = this.step();
    const phase = this.phase();
    return `s${s} is-${phase}${phase !== 'story' ? ' is-prologue' : ''}${this.reduced ? ' ps--reduced' : ''}`;
  });

  /** Écran affiché dans le menu latéral de l'application. */
  readonly nav = computed<NavKey>(() => {
    const s = this.step();
    if (s >= S['Feere kɛ yɔrɔ'] && s <= S.recu) return 'pos';
    if (s === S.boutique) return 'boutiques';
    if (s === S.journal) return 'journal';
    if (s === S.facture || s === S.paiementFacture) return 'facture';
    if (s === S.rapport || s === S.stats) return 'rapport';
    return 'ventes';
  });

  // Indicateurs du rapport, recalculés à partir du chiffre d'affaires
  readonly caObjectivePct = computed(() => this.pct(this.ca() / CA_OBJECTIVE));
  readonly expensesPct = computed(() => this.pct(EXPENSES / this.ca()));
  readonly margin = computed(() => this.ca() - EXPENSES);
  readonly marginPct = computed(() => this.pct(this.margin() / this.ca()));
  readonly gap = computed(() => (this.ca() - CA_OBJECTIVE).toLocaleString('fr-FR', { minimumFractionDigits: 2 }).replace(/ /g, ' '));

  private timers: ReturnType<typeof setTimeout>[] = [];
  private cancels: (() => void)[] = [];

  inCart(key?: string): boolean {
    const index = CART.findIndex((item) => item.key === key);
    return index >= 0 && this.picked() > index;
  }

  enter(next: number): void {
    const previous = this.step();
    if (next === previous) {
      return;
    }
    this.clear();
    this.step.set(next);
    if (this.phase() === 'story') {
      this.sound.play('tick');
    }
    const at = (ms: number, fn: () => void) => this.timers.push(setTimeout(fn, this.reduced ? 0 : ms));
    const animate = (from: number, to: number, ms: number, set: (v: number) => void) =>
      this.cancels.push(tween(from, to, this.reduced ? 0 : ms, set));
    const passed = (s: number) => next > s;

    // Panier : trois produits, trois clics, le total suit.
    if (next === S.panier) {
      this.picked.set(0);
      this.cartTotal.set(0);
      let running = 0;
      CART.forEach((item, i) => {
        const from = running;
        running += item.price;
        const to = running;
        at(PICK_AT[i] + 250, () => {
          this.picked.set(i + 1);
          animate(from, to, 450, (v) => this.cartTotal.set(v));
        });
      });
    } else {
      this.picked.set(passed(S.panier) ? CART.length : 0);
      this.cartTotal.set(passed(S.panier) ? SALE_TOTAL : 0);
    }

    // Paiement : le montant reçu se tape chiffre par chiffre.
    // Reçu : l'enregistrement de l'imprimante (recu.mp3) commence par 0,37 s de silence ;
    // on le lance à 280 ms pour que le bruit démarre à 650 ms, quand le ticket sort (voir .ticket__paper).
    if (next === S.recu) {
      at(280, () => this.sound.play('receipt'));
    }

    if (next === S.paiement) {
      at(1950, () => this.sound.play('confirm'));
      this.cash.set('');
      ['5', '57', '570', '5700'].forEach((value, i) => at(1000 + i * 110, () => this.cash.set(value)));
    } else {
      this.cash.set(passed(S.paiement) ? '5700' : '');
    }

    // Boutique : le stock des trois produits vendus baisse, ligne après ligne.
    if (next === S.boutique && previous < S.boutique) {
      this.stockUpdated.set(0);
      [1300, 1650, 2000].forEach((ms, i) => at(ms, () => this.stockUpdated.set(i + 1)));
    } else if (next !== S.boutique) {
      this.stockUpdated.set(passed(S.boutique) ? 3 : 0);
    }

    // Journal : la vente puis le paiement de facture entrent en caisse, écriture après écriture.
    if (next === S.journal && previous < S.journal) {
      this.caisse.set(65700);
      this.journalNew.set(0);
      at(1000, () => {
        this.journalNew.set(1);
        animate(65700, 65700 + SALE_TOTAL, 800, (v) => this.caisse.set(v));
      });
      at(2100, () => {
        this.journalNew.set(2);
        animate(65700 + SALE_TOTAL, 65700 + SALE_TOTAL + INVOICE_PAYMENT, 900, (v) => this.caisse.set(v));
      });
    } else if (next !== S.journal) {
      const done = passed(S.journal);
      this.journalNew.set(done ? 2 : 0);
      this.caisse.set(done ? 65700 + SALE_TOTAL + INVOICE_PAYMENT : 65700);
    }

    // Paiement de facture : saisie, mode, validation, reste à payer.
    if (next === S.facture) {
      at(900, () => this.sound.play('whoosh'));
      at(5250, () => this.sound.play('click'));
    }

    if (next === S.paiementFacture) {
      this.setInvoice(false);
      ['2', '25', '25 0', '25 00', '25 000'].forEach((value, i) => at(550 + i * 90, () => this.invAmount.set(value)));
      at(1500, () => this.invMode.set(true));
      at(2250, () => {
        this.invPaid.set(true);
        animate(200000, 200000 - INVOICE_PAYMENT, 800, (v) => this.invRemaining.set(v));
      });
      at(3350, () => {
        this.invValidated.set(true);
        this.sound.play('confirm');
      });
    } else {
      this.setInvoice(passed(S.paiementFacture));
    }

    // Rapport : le chiffre d'affaires intègre la vente et le paiement.
    if (next === S.rapport && previous < S.rapport) {
      this.ca.set(CA_BEFORE);
      this.reportLive.set(false);
      at(1000, () => {
        this.reportLive.set(true);
        animate(CA_BEFORE, CA_BEFORE + SALE_TOTAL + INVOICE_PAYMENT, 1100, (v) => this.ca.set(v));
      });
    } else if (next !== S.rapport) {
      const done = passed(S.rapport);
      this.reportLive.set(done);
      this.ca.set(done ? CA_BEFORE + SALE_TOTAL + INVOICE_PAYMENT : CA_BEFORE);
    }

    if (next === S.systeme && previous < S.systeme) {
      this.sound.play('bass');
    }

    // Le système : la vente remonte des lignes jusqu'aux indicateurs, qui l'intègrent au moment où elle arrive.
    if (next >= S.systeme && previous < S.systeme) {
      this.resetSales();
      at(1900, () => {
        this.salesTotal.set(8);
        animate(12, 15, 600, (v) => this.salesItems.set(Math.round(v)));
        animate(143700, 143700 + SALE_TOTAL, 1000, (v) => this.salesNet.set(v));
        animate(65700, 65700 + SALE_TOTAL, 1000, (v) => this.caisseOpen.set(v));
      });
    } else if (next >= S.systeme) {
      this.salesTotal.set(8);
      this.salesItems.set(15);
      this.salesNet.set(143700 + SALE_TOTAL);
      this.caisseOpen.set(65700 + SALE_TOTAL);
    } else {
      this.resetSales();
    }
  }

  clear(): void {
    this.timers.forEach(clearTimeout);
    this.cancels.forEach((cancel) => cancel());
    this.timers = [];
    this.cancels = [];
  }

  private setInvoice(done: boolean): void {
    this.invAmount.set(done ? '25 000' : '');
    this.invMode.set(done);
    this.invPaid.set(done);
    this.invValidated.set(done);
    this.invRemaining.set(done ? 200000 - INVOICE_PAYMENT : 200000);
  }

  private resetSales(): void {
    this.salesTotal.set(7);
    this.salesItems.set(12);
    this.salesNet.set(143700);
    this.caisseOpen.set(65700);
  }

  private pct(ratio: number): string {
    return (ratio * 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
