import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartDropdownMenuComponent } from './cart-dropdown-menu.component';

describe('CartDropdownMenuComponent', () => {
  let component: CartDropdownMenuComponent;
  let fixture: ComponentFixture<CartDropdownMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartDropdownMenuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CartDropdownMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
