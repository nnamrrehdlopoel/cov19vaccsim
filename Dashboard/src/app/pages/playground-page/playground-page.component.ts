import { Component } from '@angular/core';

@Component({
    selector: 'app-playground-page',
    templateUrl: './playground-page.component.html',
    styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent {
    data: number[] = [
        1, 2, 3, 4, 1, 2, 5, 2, 3, 4
    ];
}
