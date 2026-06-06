import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteComponent } from './reporte';

describe('ReporteComponent', () => {
  let component: ReporteComponent;
  let fixture: ComponentFixture<ReporteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
