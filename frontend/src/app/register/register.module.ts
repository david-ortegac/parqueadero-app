import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RegisterPage } from './register.page';
import { RegisterPageRoutingModule } from './register-routing.module';
import { PrimeNgResourcesModule } from '../shared/prime-ng-resources.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, PrimeNgResourcesModule, RegisterPageRoutingModule],
  declarations: [RegisterPage],
})
export class RegisterPageModule {}
