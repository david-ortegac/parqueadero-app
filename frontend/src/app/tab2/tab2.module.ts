import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab2Page } from './tab2.page';

import { Tab2PageRoutingModule } from './tab2-routing.module';
import { PrimeNgResourcesModule } from '../shared/prime-ng-resources.module';
import { SaleReceiptSheetComponent } from '../shared/sale-receipt-sheet.component';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, PrimeNgResourcesModule, Tab2PageRoutingModule],
  declarations: [Tab2Page, SaleReceiptSheetComponent],
})
export class Tab2PageModule {}
