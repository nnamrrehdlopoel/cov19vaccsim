import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DummyChartComponent } from './dummy-chart.component';

@NgModule({
    declarations: [
        DummyChartComponent
    ],
    exports: [
        DummyChartComponent
    ],
    imports: [
        CommonModule
    ]
})
export class D3ChartsModule {
}
