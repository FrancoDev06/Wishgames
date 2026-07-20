import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { Wishlist } from './features/wishlist/wishlist';
import { Collection } from './features/collection/collection';
import { Catalogue } from './features/catalogue/catalogue';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'wishlist', component: Wishlist },
  { path: 'collection', component: Collection },
  { path: 'catalogue', component: Catalogue },
];
