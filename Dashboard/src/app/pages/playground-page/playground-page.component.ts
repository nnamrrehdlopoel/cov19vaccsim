import { Component } from '@angular/core';
import { DummyChartDataElement } from '../../components/d3-charts/dummy-chart.component';

@Component({
  selector: 'app-playground-page',
  templateUrl: './playground-page.component.html',
  styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent {
  data: DummyChartDataElement[] = [
    {value: 42},
  ];
}
