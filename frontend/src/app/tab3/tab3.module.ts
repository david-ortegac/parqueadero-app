import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab3Page } from './tab3.page';

import { Tab3PageRoutingModule } from './tab3-routing.module';
import { PrimeNgResourcesModule } from '../shared/prime-ng-resources.module';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, PrimeNgResourcesModule, Tab3PageRoutingModule],
  declarations: [Tab3Page],
})
export class Tab3PageModule {}
