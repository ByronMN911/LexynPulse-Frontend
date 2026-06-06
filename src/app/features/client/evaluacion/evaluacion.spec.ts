import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Evaluacion } from './evaluacion';

describe('Evaluacion', () => {
  let component: Evaluacion;
  let fixture: ComponentFixture<Evaluacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Evaluacion],
    }).compileComponents();

    fixture = TestBed.createComponent(Evaluacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
