import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { CART, StoryState } from '../story-state';

interface PosProduct {
  name: string;
  image?: string;
  letter?: string;
  stock: string;
  exp?: string;
  price: string;
  low?: boolean;
  /** Clé des produits encaissés pendant l'histoire. */
  key?: 'dentifrice' | 'rasoir' | 'nivea';
}

/** La caisse Tchakeda telle qu'elle apparaît dans l'application : vente, paiement, reçu. */
@Component({
  selector: 'app-story-pos',
  standalone: true,
  templateUrl: './story-pos.component.html',
  styleUrl: './story-pos.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoryPosComponent {
  readonly st = inject(StoryState);
  readonly cart = CART;

  readonly categories = [
    { name: 'Toutes les catégories', count: 53 },
    { name: 'Sans Catégorie', count: 2 },
    { name: 'Electronique', count: 16 },
    { name: 'Alimentation', count: 20 },
    { name: 'Divers', count: 15 }
  ];

  readonly products: PosProduct[] = [
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

  readonly numpad = ['1', '2', '3', 'Qté', '4', '5', '6', 'Remise', '7', '8', '9', 'Prix', '+/-', '0', ',', '⌫'];
  readonly methods = [
    { icon: 'ri-hand-coin-line', label: 'Espèces' },
    { icon: 'ri-smartphone-line', label: 'Mobile money' },
    { icon: 'ri-bank-card-line', label: 'Carte' },
    { icon: 'ri-file-list-3-line', label: 'Crédit' }
  ];
  /** Motif du code-barres du ticket (largeurs de barres). */
  readonly barcode = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3];
}
