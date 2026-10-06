import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  computed,
  inject,
  signal
} from '@angular/core';
import { easeOutCubic } from '../motion.utils';
import { StoryFinanceComponent } from './story-finance/story-finance.component';
import { StoryPagesComponent } from './story-pages/story-pages.component';
import { StoryPosComponent } from './story-pos/story-pos.component';
import { NavKey, StoryState } from './story-state';

/** Rythme de lecture : 1 = rythme d'origine, plus petit = plus rapide. */
const PACE = 0.75;

/**
 * Lecture automatique : la section se joue comme une vidéo.
 * Prologue = courbe de progression [temps (ms), p] : désordre → rangement → silence + étincelle → portail.
 */
const PROLOGUE_KEYS: [number, number][] = (
  [
    [0, 0],
    [1800, 0.1],
    [4400, 0.56],
    [7200, 0.63],
    [7600, 0.72],
    [9400, 1]
  ] as [number, number][]
).map(([t, p]) => [t * PACE, p]);
const PROLOGUE_MS = 9400 * PACE;
/** Durée de chaque étape (ms), calée sur sa chorégraphie : on laisse toujours un temps de lecture après l'action. */
const STEP_MS = [4500, 3600, 4300, 4200, 4400, 4300, 8800, 5000, 4600, 4300, 4700, 5600, 5200].map((ms) => ms * PACE);

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface PrologueLayout {
  tile: number;
  chaos: { x: number; y: number; r: number; s: number }[];
  grid: { x: number; y: number }[];
  device: { x: number; y: number; w: number; h: number };
}

interface SidebarItem {
  icon: string;
  label: string;
  /** Écrans pour lesquels l'entrée est active. */
  active?: NavKey[];
  sub?: { label: string; current: NavKey[] }[];
}

/**
 * Le grand moment « Tout est connecté », rejoué sur les vrais écrans de Tchakeda.
 * Cette section gère la narration, le scroll et la caméra ; les écrans vivent dans les sous-composants
 * et partagent l'état de l'histoire (StoryState).
 */
@Component({
  selector: 'app-product-story',
  standalone: true,
  imports: [StoryPosComponent, StoryPagesComponent, StoryFinanceComponent],
  providers: [StoryState],
  templateUrl: './product-story.component.html',
  styleUrl: './product-story.component.scss',
  // Styles non encapsulés (sélecteurs plus légers) : toutes les classes sont propres à cette section.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductStoryComponent implements AfterViewInit, OnDestroy {
  @ViewChild('section', { static: true }) sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('screen', { static: true }) screenRef!: ElementRef<HTMLElement>;
  @ViewChild('device', { static: true }) deviceRef!: ElementRef<HTMLElement>;
  @ViewChild('pro', { static: true }) proRef!: ElementRef<HTMLElement>;

  readonly st = inject(StoryState);
  private readonly zone = inject(NgZone);

  readonly sidebar: SidebarItem[] = [
    { icon: 'ri-home-4-line', label: 'Tableau de bord' },
    { icon: 'ri-bar-chart-2-line', label: 'Ventes', active: ['ventes', 'pos'] },
    { icon: 'ri-price-tag-3-line', label: 'Produits' },
    { icon: 'ri-list-unordered', label: 'Boutiques', active: ['boutiques'] },
    { icon: 'ri-box-3-line', label: 'Stocks', sub: [] },
    { icon: 'ri-group-line', label: 'Clients' },
    { icon: 'ri-user-line', label: 'Fournisseurs' },
    {
      icon: 'ri-file-line',
      label: 'Facturation',
      active: ['facture'],
      sub: [
        { label: 'Factures proforma', current: [] },
        { label: 'Factures réelles', current: ['facture'] }
      ]
    },
    {
      icon: 'ri-clipboard-line',
      label: 'Comptabilité',
      active: ['journal', 'rapport'],
      sub: [
        { label: 'Journal', current: ['journal'] },
        { label: 'Rapport Financier', current: ['rapport'] }
      ]
    },
    { icon: 'ri-settings-3-line', label: 'Paramètres', sub: [] }
  ];

  /** Les 12 modules du prologue, dans l'ordre de la grille finale (4 × 3). */
  readonly modules = [
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
  /** Le fil : VENTE → STOCK → CLIENT → FACTURE → COMPTABILITÉ → TABLEAU DE BORD. */
  readonly chain = [0, 1, 2, 3, 7, 6];
  /** La tuile qui devient l'écran de l'application. */
  readonly portalIndex = 6;
  /** Ordre d'arrivée des tuiles dans la grille : elles se rangent une à une. */
  private readonly landing = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11];

  readonly prologueIndex = computed(() => ['chaos', 'order', 'portal'].indexOf(this.st.phase()));

  private layout?: PrologueLayout;
  private lastP = -1;
  private sparkPlayed = false;
  private sparkFrame = 0;
  private tiltFrame = 0;
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;

  private playing = false;
  /** Le visiteur a quitté la section : à son retour, l'histoire reprend depuis le début. */
  private left = false;
  private readonly starts = STEP_MS.reduce<number[]>((acc, _, i) => [...acc, i ? acc[i - 1] + STEP_MS[i - 1] : 0], []);
  private readonly total = PROLOGUE_MS + STEP_MS.reduce((a, b) => a + b, 0);
  /** Position de lecture (ms) : elle n'avance que pendant la lecture. */
  private time = 0;
  private last = 0;
  private frame = 0;
  private inView = false;

  ngAfterViewInit(): void {
    // Lecture en boucle tant que la section est visible. Le visiteur la quitte : arrêt.
    // Il revient : l'histoire recommence depuis le début.
    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.inView = entry.intersectionRatio >= 0.55;
        if (this.inView) {
          if (this.left) {
            this.left = false;
            this.seek(this.start());
          }
          this.play();
        } else if (entry.intersectionRatio < 0.3) {
          this.stop();
          this.left = true;
        }
      },
      { threshold: [0, 0.3, 0.55, 0.8] }
    );
    this.observer.observe(this.sectionRef.nativeElement);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.time = this.start();

    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(this.screenRef.nativeElement);
    this.resizeObserver.observe(this.sectionRef.nativeElement.querySelector('.ps__sticky') as HTMLElement);
    this.measure();
    document.fonts?.ready.then(() => this.measure());
    this.enableTilt();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stop();
    this.st.clear();
    cancelAnimationFrame(this.sparkFrame);
    cancelAnimationFrame(this.tiltFrame);
  }

  isActive(item: SidebarItem): boolean {
    return !!item.active?.includes(this.st.nav());
  }

  /** Début de la lecture. Mouvement réduit : on saute le prologue ; les étapes défilent en simples fondus. */
  private start(): number {
    return this.st.reduced ? PROLOGUE_MS : 0;
  }

  private seek(time: number): void {
    this.time = Math.min(Math.max(time, 0), this.total);
    this.lastP = -1;
    this.render();
  }

  private play(): void {
    if (this.playing) {
      return;
    }
    this.playing = true;
    this.last = performance.now();
    this.zone.runOutsideAngular(() => (this.frame = requestAnimationFrame(this.tick)));
  }

  private stop(): void {
    this.playing = false;
    cancelAnimationFrame(this.frame);
  }

  private onVisibility = (): void => {
    if (document.hidden) {
      this.stop();
    } else if (this.inView) {
      this.play();
    }
  };

  private tick = (now: number): void => {
    // Un onglet mis en veille ne fait pas sauter l'histoire : on plafonne le pas de temps.
    this.time += Math.min(now - this.last, 100);
    this.last = now;
    // Fin de l'histoire : elle repart du début, en boucle.
    if (this.time >= this.total) {
      this.seek(this.start());
    }
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  /**
   * La position de lecture pilote tout : d'abord le prologue en continu (chaos → ordre → portail),
   * puis les étapes, qui jouent chacune leur chorégraphie.
   */
  private render(): void {
    const section = this.sectionRef.nativeElement;
    const p = this.time >= PROLOGUE_MS ? 1 : this.prologueAt(this.time);
    const phase = p < 0.45 ? 'chaos' : p < 0.72 ? 'order' : p < 1 ? 'portal' : 'story';
    if (phase !== this.st.phase()) {
      this.st.phase.set(phase);
      if (phase === 'portal') {
        this.st.sound.play('whoosh');
      }
    }
    this.renderPrologue(p);

    const t = this.time - PROLOGUE_MS;
    let step = 0;
    if (t >= 0) {
      while (step < STEP_MS.length - 1 && t >= this.starts[step + 1]) {
        step++;
      }
    }
    const stepsTotal = this.total - PROLOGUE_MS;
    section.style.setProperty('--ps-progress', clamp01(t / stepsTotal).toFixed(4));
    section.style.setProperty('--step-fill', t >= 0 ? clamp01((t - this.starts[step]) / STEP_MS[step]).toFixed(3) : '0');
    this.st.enter(phase === 'story' ? step : 0);
  }

  private prologueAt(time: number): number {
    for (let i = 1; i < PROLOGUE_KEYS.length; i++) {
      const [t1, p1] = PROLOGUE_KEYS[i];
      const [t0, p0] = PROLOGUE_KEYS[i - 1];
      if (time <= t1) {
        return lerp(p0, p1, (time - t0) / (t1 - t0));
      }
    }
    return 1;
  }

  private measure(): void {
    this.measureAnchors();
    this.measurePrologue();
    this.lastP = -1;
    this.render();
  }

  /** Position (hors transformations) d'un élément dans la scène sticky. */
  private offsetIn(el: HTMLElement, root: HTMLElement): { x: number; y: number } {
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node !== root) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return { x, y };
  }

  /** Grille finale calée dans le cadre de l'appareil ; positions « chaos » réparties dans toute la scène. */
  private measurePrologue(): void {
    const stage = this.proRef.nativeElement.parentElement as HTMLElement;
    const device = this.deviceRef.nativeElement;
    const { x, y } = this.offsetIn(device, stage);
    const w = device.offsetWidth;
    const h = device.offsetHeight;
    const cols = w > 560 ? 4 : 3;
    const rows = Math.ceil(this.modules.length / cols);
    const cellW = w / cols;
    const cellH = h / rows;
    const tile = Math.round(Math.min(cellW * 0.46, cellH * 0.56, 96));
    const W = stage.clientWidth;
    const H = stage.clientHeight;

    // Zone du désordre : à côté de la narration (desktop) ou sous elle (mobile), jamais dessus.
    const copy = stage.querySelector<HTMLElement>('.ps__copy');
    const side = !!copy && this.offsetIn(copy, stage).y + copy.offsetHeight > y;
    const zone = side
      ? { x0: this.offsetIn(copy!, stage).x + copy!.offsetWidth + 24, x1: W - 24, y0: H * 0.1, y1: H * 0.9 }
      : { x0: 12, x1: W - 12, y0: y - 12, y1: H - 16 };

    // Trame irrégulière (5 × 3 cases, 3 restent vides) : éparpillé, mais jamais illisible.
    // Pseudo-aléatoire déterministe : le désordre est le même à chaque visite.
    let seed = 7;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const lcols = side ? 5 : 3;
    const lrows = side ? 3 : 5;
    const cells = Array.from({ length: lcols * lrows }, (_, k) => k).sort(() => rand() - 0.5);
    const cw = (zone.x1 - zone.x0) / lcols;
    const ch = (zone.y1 - zone.y0) / lrows;
    const chaos = this.modules.map((_, i) => {
      const cell = cells[i];
      return {
        x: zone.x0 + (cell % lcols + 0.5 + (rand() - 0.5) * 0.45) * cw - tile / 2,
        y: zone.y0 + (Math.floor(cell / lcols) + 0.5 + (rand() - 0.5) * 0.4) * ch - tile / 2,
        r: (rand() - 0.5) * 44,
        s: 0.74 + rand() * 0.3
      };
    });
    const grid = this.modules.map((_, i) => ({
      x: x + (i % cols) * cellW + (cellW - tile) / 2,
      y: y + Math.floor(i / cols) * cellH + (cellH - tile) / 2 - 10
    }));
    this.layout = { tile, chaos, grid, device: { x, y, w, h } };
    this.proRef.nativeElement.style.setProperty('--tile', `${tile}px`);
    this.proRef.nativeElement.querySelector('svg')?.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  private renderPrologue(p: number): void {
    const L = this.layout;
    if (!L || (p === this.lastP && p !== 0)) {
      return;
    }
    const wasStory = this.lastP >= 1;
    this.lastP = p;
    const device = this.deviceRef.nativeElement;
    if (p >= 1) {
      if (!wasStory) {
        device.style.translate = device.style.scale = device.style.clipPath = device.style.opacity = '';
      }
      return;
    }

    const reduced = this.st.reduced;
    const q = reduced ? clamp01((p - 0.72) / 0.28) : easeInOut(clamp01((p - 0.72) / 0.28));
    const tiles = this.proRef.nativeElement.querySelectorAll<HTMLElement>('.pro__tile');
    const centers: { x: number; y: number }[] = [];
    const devCx = L.device.x + L.device.w / 2;
    const devCy = L.device.y + L.device.h / 2;

    tiles.forEach((el, i) => {
      const start = 0.12 + this.landing.indexOf(i) * 0.024;
      const t = reduced ? 1 : easeInOut(clamp01((p - start) / 0.2));
      const c = L.chaos[i];
      const g = L.grid[i];
      let x = lerp(c.x, g.x, t);
      let y = lerp(c.y, g.y, t);
      let opacity = 1;
      if (q > 0 && i !== this.portalIndex) {
        // Les autres modules s'écartent pour laisser la place à l'écran.
        x += (g.x + L.tile / 2 - devCx) * q * 0.6;
        y += (g.y + L.tile / 2 - devCy) * q * 0.6;
        opacity = 1 - clamp01(q * 1.6);
      } else if (q > 0) {
        opacity = 1 - clamp01(q / 0.22);
      }
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(c.r * (1 - t)).toFixed(2)}deg) scale(${lerp(c.s, 1, t).toFixed(3)})`;
      el.style.opacity = String(opacity);
      el.classList.toggle('is-set', t >= 1);
      centers.push({ x: x + L.tile / 2, y: y + L.tile / 2 });
    });

    // Le fil : il se tend entre les modules pendant qu'ils se rangent.
    const paths = this.proRef.nativeElement.querySelectorAll<SVGPathElement>('.pro__threads path');
    const draw = clamp01((p - 0.1) / 0.4);
    paths.forEach((path, j) => {
      const a = centers[this.chain[j]];
      const b = centers[this.chain[j + 1]];
      const mx = (a.x + b.x) / 2;
      path.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${mx.toFixed(1)} ${a.y.toFixed(1)} ${mx.toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      path.style.strokeDashoffset = String(1 - clamp01(draw * paths.length - j));
      path.style.opacity = String(1 - clamp01(q * 3));
    });

    // Silence, puis une seule étincelle parcourt le fil : la vente remonte jusqu'au tableau de bord.
    if (p >= 0.56 && !this.sparkPlayed && !reduced) {
      this.sparkPlayed = true;
      this.playSpark(paths);
    } else if (p < 0.45 && this.sparkPlayed) {
      this.sparkPlayed = false;
      tiles.forEach((t) => t.classList.remove('is-knot'));
    }

    // Le portail : la tuile « Tableau de bord » s'ouvre sur l'application.
    if (q > 0) {
      const g = L.grid[this.portalIndex];
      const s0 = L.tile / L.device.h;
      const s = reduced ? 1 : lerp(s0, 1, q);
      const inset = reduced ? 0 : ((L.device.w - L.device.h) / 2) * (1 - q);
      device.style.translate = reduced
        ? ''
        : `${((g.x + L.tile / 2 - devCx) * (1 - q)).toFixed(1)}px ${((g.y + L.tile / 2 - devCy) * (1 - q)).toFixed(1)}px`;
      device.style.scale = String(s);
      device.style.clipPath = `inset(0 ${inset.toFixed(1)}px round ${lerp(0.22 * L.device.h, 14, q).toFixed(1)}px)`;
      device.style.opacity = String(clamp01(q * 5));
    } else {
      device.style.opacity = '0';
    }
  }

  private playSpark(paths: NodeListOf<SVGPathElement>): void {
    const spark = this.proRef.nativeElement.querySelector<SVGCircleElement>('.pro__spark');
    const tiles = this.proRef.nativeElement.querySelectorAll<HTMLElement>('.pro__tile');
    if (!spark) {
      return;
    }
    const perSegment = 420;
    const start = performance.now();
    cancelAnimationFrame(this.sparkFrame);
    const tick = (now: number) => {
      const elapsed = now - start;
      const seg = Math.floor(elapsed / perSegment);
      if (seg >= paths.length) {
        spark.setAttribute('cx', '-20');
        tiles[this.chain[this.chain.length - 1]]?.classList.add('is-knot');
        return;
      }
      const path = paths[seg];
      const t = easeOutCubic((elapsed % perSegment) / perSegment);
      const point = path.getPointAtLength(path.getTotalLength() * t);
      spark.setAttribute('cx', point.x.toFixed(1));
      spark.setAttribute('cy', point.y.toFixed(1));
      // Chaque module traversé noue le fil : un anneau, une seule fois.
      const knot = tiles[this.chain[seg]];
      if (knot && !knot.classList.contains('is-knot')) {
        knot.classList.add('is-knot');
        this.st.sound.play('knot');
      }
      this.sparkFrame = requestAnimationFrame(tick);
    };
    tiles.forEach((t) => t.classList.remove('is-knot'));
    this.sparkFrame = requestAnimationFrame(tick);
  }

  /** L'appareil répond au curseur : une inclinaison à peine perceptible et un reflet qui suit la main. */
  private enableTilt(): void {
    if (this.st.reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }
    const device = this.deviceRef.nativeElement;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    const loop = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      device.style.setProperty('--mx', cx.toFixed(3));
      device.style.setProperty('--my', cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        this.tiltFrame = requestAnimationFrame(loop);
      } else {
        this.tiltFrame = 0;
      }
    };
    const kick = () => {
      if (!this.tiltFrame) {
        this.tiltFrame = requestAnimationFrame(loop);
      }
    };
    this.zone.runOutsideAngular(() => {
      device.addEventListener('pointermove', (e) => {
        const r = device.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        ty = ((e.clientY - r.top) / r.height) * 2 - 1;
        device.style.setProperty('--gx', `${e.clientX - r.left}px`);
        device.style.setProperty('--gy', `${e.clientY - r.top}px`);
        kick();
      });
      device.addEventListener('pointerleave', () => {
        tx = 0;
        ty = 0;
        kick();
      });
    });
  }

  /**
   * Centres (hors transformations) des éléments visés par le curseur et par les zooms caméra.
   * Chaque élément marqué `data-anchor="nom"` expose --nom-x / --nom-y sur l'écran.
   */
  private measureAnchors(): void {
    const screen = this.screenRef.nativeElement;
    screen.querySelectorAll<HTMLElement>('[data-anchor]').forEach((el) => {
      let x = el.offsetWidth / 2;
      let y = el.offsetHeight / 2;
      let node: HTMLElement | null = el;
      while (node && node !== screen) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      if (node !== screen) {
        return;
      }
      const name = el.dataset['anchor'];
      screen.style.setProperty(`--${name}-x`, `${x.toFixed(1)}px`);
      screen.style.setProperty(`--${name}-y`, `${y.toFixed(1)}px`);
    });
  }
}
