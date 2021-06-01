import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CachedForOfUsageComponent } from './cached-for-of-usage.component';

describe('CachedForOfUsageComponent', () => {
  let component: CachedForOfUsageComponent;
  let fixture: ComponentFixture<CachedForOfUsageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CachedForOfUsageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CachedForOfUsageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
