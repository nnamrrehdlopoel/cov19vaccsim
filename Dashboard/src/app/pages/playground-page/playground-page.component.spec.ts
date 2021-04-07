import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaygroundPageComponent } from './playground-page.component';

describe('PlaygroundPageComponent', () => {
  let component: PlaygroundPageComponent;
  let fixture: ComponentFixture<PlaygroundPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PlaygroundPageComponent]
    });
    fixture = TestBed.createComponent(PlaygroundPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
