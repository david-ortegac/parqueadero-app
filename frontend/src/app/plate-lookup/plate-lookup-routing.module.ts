import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlateLookupPage } from './plate-lookup.page';

const routes: Routes = [
  {
    path: '',
    component: PlateLookupPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlateLookupPageRoutingModule {}
