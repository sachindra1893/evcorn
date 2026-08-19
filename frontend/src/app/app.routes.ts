import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./views/home/home').then(m => m.HomeComponent), pathMatch: 'full' },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: 'about', loadComponent: () => import('./views/about/about').then(m => m.AboutComponent) },
  { path: 'evs', loadComponent: () => import('./views/browse-evs/browse-evs').then(m => m.BrowseEvsComponent) },
  { path: 'two-wheelers', loadComponent: () => import('./views/browse-two-wheelers/browse-two-wheelers').then(m => m.BrowseTwoWheelersComponent) },
  { path: 'two-wheelers/:brandSlug/:modelSlug', loadComponent: () => import('./views/vehicle-detail/vehicle-detail').then(m => m.VehicleDetailComponent) },
  { path: 'bikes', redirectTo: 'two-wheelers', pathMatch: 'full' },
  { path: 'ev/:brandSlug/:modelSlug', loadComponent: () => import('./views/vehicle-detail/vehicle-detail').then(m => m.VehicleDetailComponent) },
  { path: 'articles', loadComponent: () => import('./views/articles/articles').then(m => m.ArticlesComponent) },
  { path: 'articles/:id', loadComponent: () => import('./views/article-detail/article-detail').then(m => m.ArticleDetailComponent) },
  { path: 'compare', loadComponent: () => import('./views/compare/compare').then(m => m.CompareComponent) },
  { path: 'search', loadComponent: () => import('./views/search/search').then(m => m.SearchComponent) },
  { path: 'admin', loadComponent: () => import('./views/admin/admin').then(m => m.AdminComponent) },
  { path: 'login', loadComponent: () => import('./views/login/login').then(m => m.LoginComponent) },
  { path: 'terms', loadComponent: () => import('./views/info/info').then(m => m.InfoComponent) },
  { path: 'privacy', loadComponent: () => import('./views/info/info').then(m => m.InfoComponent) },
  { path: 'faqs', loadComponent: () => import('./views/info/info').then(m => m.InfoComponent) },
  { path: 'feedback', loadComponent: () => import('./views/info/info').then(m => m.InfoComponent) },
  { path: 'contact', loadComponent: () => import('./views/info/info').then(m => m.InfoComponent) },
  { path: 'advertise', loadComponent: () => import('./views/info/info').then(m => m.InfoComponent) },
  { path: '**', loadComponent: () => import('./views/not-found/not-found').then(m => m.NotFoundComponent) }
];
