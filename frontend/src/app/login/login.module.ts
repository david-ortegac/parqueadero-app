import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { LoginPage } from './login.page';
import { LoginPageRoutingModule } from './login-routing.module';
import { PrimeNgResourcesModule } from '../shared/prime-ng-resources.module';

@NgModule({
  imports: [CommonModule, FormsModule, RouterModule, IonicModule, PrimeNgResourcesModule, LoginPageRoutingModule],
  declarations: [LoginPage],
})
export class LoginPageModule {}
