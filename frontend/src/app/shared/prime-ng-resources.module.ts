import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DividerModule } from 'primeng/divider';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

/**
 * Módulo compartido con componentes PrimeNG usados en el parqueadero.
 */
@NgModule({
  imports: [
    ButtonModule,
    CardModule,
    ChartModule,
    DividerModule,
    FloatLabelModule,
    InputNumberModule,
    InputTextModule,
    PasswordModule,
    ProgressBarModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  exports: [
    ButtonModule,
    CardModule,
    ChartModule,
    DividerModule,
    FloatLabelModule,
    InputNumberModule,
    InputTextModule,
    PasswordModule,
    ProgressBarModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
})
export class PrimeNgResourcesModule {}
