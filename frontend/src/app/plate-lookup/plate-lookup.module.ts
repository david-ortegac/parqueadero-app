import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { PlateLookupPage } from './plate-lookup.page';
import { PlateLookupPageRoutingModule } from './plate-lookup-routing.module';
import { PrimeNgResourcesModule } from '../shared/prime-ng-resources.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonicModule,
    PrimeNgResourcesModule,
    PlateLookupPageRoutingModule,
  ],
  declarations: [PlateLookupPage],
})
export class PlateLookupPageModule {}
