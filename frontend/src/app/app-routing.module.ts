import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  {
    path: 'consulta',
    loadChildren: () => import('./plate-lookup/plate-lookup.module').then((m) => m.PlateLookupPageModule),
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then((m) => m.RegisterPageModule),
  },
  /** Compatibilidad con URLs antiguas `/tabs/tab*`. */
  { path: 'tabs/tab1', redirectTo: '/inicio', pathMatch: 'full' },
  { path: 'tabs/tab2', redirectTo: '/parqueo', pathMatch: 'full' },
  { path: 'tabs/tab3', redirectTo: '/cuenta', pathMatch: 'full' },
  { path: 'tabs', redirectTo: '/inicio', pathMatch: 'full' },
  {
    path: '',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'operator', 'vehicle_owner'] },
    loadChildren: () => import('./tabs/tabs.module').then((m) => m.TabsPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
