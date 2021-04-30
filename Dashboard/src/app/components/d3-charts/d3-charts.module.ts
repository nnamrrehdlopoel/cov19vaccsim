import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { PredictionLineChartComponent } from './prediction-line-chart.component';

@NgModule({
    declarations: [
        PredictionLineChartComponent
    ],
    exports: [
        PredictionLineChartComponent
    ],
    imports: [
        CommonModule
    ]
})
export class D3ChartsModule {
}
