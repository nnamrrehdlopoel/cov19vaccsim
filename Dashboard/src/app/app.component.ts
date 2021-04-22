import { Component , OnInit} from '@angular/core';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'COVID-19 Impfkampagne in Deutschland';

  constructor(
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer
  ) {
      iconRegistry.addSvgIcon(
          'github',
          sanitizer.bypassSecurityTrustResourceUrl('assets/img/GitHub-Mark.svg'));
  }

  ngOnInit() {
  }


  logout(){
  }

}
