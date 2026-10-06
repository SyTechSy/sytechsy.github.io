import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { StoryState } from '../story-state';

/** Pages de gestion de l'application : Ventes, Boutique et Journal comptable. */
@Component({
  selector: 'app-story-pages',
  standalone: true,
  templateUrl: './story-pages.component.html',
  styleUrl: './story-pages.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoryPagesComponent {
  readonly st = inject(StoryState);

  readonly invoices = [
    { date: '26/09/2026 11:55', num: '55329261155S', amount: '8 200 CFA', status: 'done' },
    { date: '21/09/2026 16:50', num: '21929211650W', amount: '2 500 CFA', status: 'done' },
    { date: '21/09/2026 16:38', num: '19429211638O', amount: '55 000 CFA', status: 'done' },
    { date: '18/09/2026 15:33', num: '875291815335', amount: '0 CFA', refunded: '3 000 CFA', status: 'refund' },
    { date: '22/08/2026 10:51', num: '14243221051T', amount: '3 000 CFA', status: 'paid' },
    { date: '17/08/2026 17:00', num: '65582171700X', amount: '20 000 CFA', status: 'paid' }
  ];

  /** `sold` : ordre dans lequel la vente met à jour le stock du produit. */
  readonly shopProducts = [
    { name: 'Ecouteur', image: 'ecouteur', desc: 'Aucune description', cat: 'Electronique', price: 'CFA', stock: 0 },
    { name: 'Chargeur', image: 'chargeur', desc: 'Maison', cat: 'Divers', price: '3 000,00 CFA', stock: 60 },
    { name: 'Dentifrice Colgate', letter: 'D', desc: 'Hygiène', cat: 'Divers', price: '1 200,00 CFA', stock: 34, sold: 1 },
    { name: 'Rasoir Gillette', image: 'rasoir', desc: 'Rasage', cat: 'Divers', price: '2 000,00 CFA', stock: 12, sold: 2 },
    { name: 'Crème Nivea', image: 'nivea', desc: 'Soin corps', cat: 'Divers', price: '2 500,00 CFA', stock: 54, sold: 3 }
  ];

  readonly journal = [
    { num: 'C-002-09-2026', date: '28/09/2026', origin: 'Feere kɛ yɔrɔ Ma…', label: 'Vente Feere kɛ y…', cat: 'Boutique', catTone: 'mauve', price: '71 400 CFA', qty: '5', amount: '71 400 CFA', tone: 'in', source: 'Caisse' },
    { num: 'DP: 002-09-2026', date: '15/09/2026', origin: 'Comptabilité - s…', label: 'Gauzj', cat: 'Restauratio…', catTone: 'blue', price: '2 300 000 CFA', qty: '1', amount: '2 300 000 CFA', tone: 'out', source: 'Caisse' },
    { num: '-', date: '15/09/2026', origin: 'Comptabilité - T…', label: 'Test', cat: 'Transfert D…', catTone: 'gray', price: '-', qty: '-', amount: '1 000 000 CFA', tone: '', source: 'Banque → Caisse' },
    { num: 'EN: 002-09-2026', date: '15/09/2026', origin: 'Comptabilité - …', label: 'Chiffre test', cat: 'Chiffe D', catTone: 'blue', price: '1 000 000 CFA', qty: '1', amount: '1 000 000 CFA', tone: 'in', source: 'Banque' },
    { num: 'DP: 001-09-2026', date: '04/09/2026', origin: 'Comptabilité - s…', label: 'Salaire de Mous…', cat: 'Salaire', catTone: 'orange', price: '150 000 CFA', qty: '1', amount: '150 000 CFA', tone: 'out', source: 'Caisse' }
  ];
}
