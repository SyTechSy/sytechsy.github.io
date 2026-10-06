import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { StoryState } from '../story-state';

/** Ligne de rapport : valeurs [avant, après] la vente et le paiement de facture. */
interface ReportRow {
  name: string;
  q: [string, string];
  m: [string, string];
  p: [string, string];
}

const same = (v: string): [string, string] => [v, v];

/** Pages finance de l'application : facture réelle et son paiement, rapport financier et statistiques. */
@Component({
  selector: 'app-story-finance',
  standalone: true,
  templateUrl: './story-finance.component.html',
  styleUrl: './story-finance.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoryFinanceComponent {
  readonly st = inject(StoryState);

  readonly tables: { title: string; icon: string; cols: string[]; warm?: boolean; rows: ReportRow[] }[] = [
    {
      title: 'Vente par produit / Service',
      icon: 'ri-pie-chart-line',
      cols: ['Nom', 'Qté', 'Montant', '%'],
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
      title: 'Ventes par catégorie',
      icon: 'ri-price-tag-3-line',
      cols: ['Nom', 'Qté', 'Montant', '%'],
      rows: [
        { name: 'Sans Catégorie', q: same('7'), m: ['1 055 000 CFA', '1 080 000 CFA'], p: ['50,9%', '51,4%'] },
        { name: 'Divers', q: ['7', '10'], m: ['16 400 CFA', '22 100 CFA'], p: ['0,8%', '1,1%'] },
        { name: 'TOTAL', q: ['14', '17'], m: ['2 071 400 CFA', '2 102 100 CFA'], p: same('100%') }
      ]
    },
    {
      title: 'Dépenses par catégorie',
      icon: 'ri-file-list-3-line',
      cols: ['Catégorie', 'Montant', '%'],
      warm: true,
      rows: [
        { name: 'Restauration', q: same(''), m: same('2 300 000 CFA'), p: same('93,9%') },
        { name: 'Salaire', q: same(''), m: same('150 000 CFA'), p: same('6,1%') },
        { name: 'TOTAL', q: same(''), m: same('2 450 000 CFA'), p: same('100%') }
      ]
    }
  ];

  /** Répartition du CA après la vente (77 100) et le paiement de facture (1 025 000). */
  readonly caSegments = [
    { label: 'Ventes', amount: '77 100 CFA', pct: 3.7, pctLabel: '3,7%', color: '#2f7de1', offset: 0 },
    { label: 'Factures', amount: '1 025 000 CFA', pct: 48.8, pctLabel: '48,8%', color: '#4ca054', offset: 3.7 },
    { label: 'Entrée compta', amount: '1 000 000 CFA', pct: 47.5, pctLabel: '47,5%', color: '#c836cb', offset: 52.5 }
  ];

  /** 30 jours d'activité : hauteurs en % de l'échelle 2,5M. */
  readonly days = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const values: Record<number, [number, number]> = { 4: [40, 6], 15: [40, 92], 28: [3.1, 0] };
    const [ca, dep] = values[day] ?? [0, 0];
    // Le 15 : les dépenses dépassent largement le chiffre d'affaires — le système le signale.
    return { label: String(day).padStart(2, '0'), ca, dep, today: day === 28, alert: day === 15 };
  });
}
