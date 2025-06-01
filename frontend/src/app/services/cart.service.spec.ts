// frontend/src/app/services/cart.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { CartService, CartState } from './cart.service';
import { GraphqlService, Cart, Product, CartOperationResult } from './graphql.service';
import { NotificationService } from './notification.service';
import { of, throwError } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

const apolloSpy = jasmine.createSpyObj('Apollo', ['query', 'mutate']);

TestBed.configureTestingModule({
  imports: [
    ReactiveFormsModule
  ],
  providers: [
    {provide: Apollo, useValue: apolloSpy},
    CartService,
    FormBuilder

  ]
});


describe('CartService', () => {
  let service: CartService;
  let mockGraphqlService: jasmine.SpyObj<GraphqlService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  const mockProduct: Product = {
    id: '1',
    name: 'Test Product',
    list_price: 100,
    image_1920: 'test.jpg',
    image_512: 'test.jpg',
    create_date: '2024-01-01'
  };

  const mockCart: CartState = {
    cart: {
      order: {
        id: 1,
        name: 'SO001',
        amount_total: 100,
        amount_tax: 0,
        amount_untaxed: 100,
        access_url: 'test'
      },
      lines: [{
        id: 1,
        product: mockProduct
      }]
    },
    loading: false,
    error: null,
    productIdsInCart: new Set()
  };

  beforeEach(() => {
    const graphqlSpy = jasmine.createSpyObj('GraphqlService', [
      'getCart', 'addToCart', 'removeFromCart', 'clearCart'
    ]);
    const notificationSpy = jasmine.createSpyObj('NotificationService', [
      'showSuccess', 'showError', 'showInfo'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CartService,
        { provide: GraphqlService, useValue: graphqlSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(CartService);
    mockGraphqlService = TestBed.inject(GraphqlService) as jasmine.SpyObj<GraphqlService>;
    mockNotificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadCart', () => {
    it('should load cart successfully and update cart$', (done) => {
      mockGraphqlService.getCart.and.returnValue(of(mockCart.cart));

      service.loadCart().subscribe({
        next: (cart) => {
          expect(cart).toEqual(mockCart.cart);
          service.cart$.subscribe(cartState => {
            expect(cartState).toEqual(mockCart);
            done();
          });
        }
      });
    });

    it('should handle null cart response', (done) => {
      mockGraphqlService.getCart.and.returnValue(of(null));

      service.loadCart().subscribe({
        next: (cart) => {
          expect(cart).toBeNull();
          service.cart$.subscribe(cartState => {
            expect(cartState).toBeNull();
            done();
          });
        }
      });
    });

    it('should handle error when loading cart', (done) => {
      mockGraphqlService.getCart.and.returnValue(throwError(() => new Error('Network error')));

      service.loadCart().subscribe({
        next: (cart) => {
          expect(cart).toBeNull();
          done();
        }
      });
    });
  });

  describe('addProductToCart', () => {
    const mockSuccessResult: CartOperationResult = {
      success: true,
      message: 'Product added successfully',
      order_id: 1,
      line_id: 1,
      order_name: 'SO001',
      access_url: 'test'
    };

    it('should add product to cart successfully', (done) => {
      mockGraphqlService.addToCart.and.returnValue(of(mockSuccessResult));
      mockGraphqlService.getCart.and.returnValue(of(mockCart.cart));

      service.addProduct(1).subscribe({
        next: (result: any) => {
          expect(result).toEqual(mockSuccessResult);
          expect(mockGraphqlService.addToCart).toHaveBeenCalledWith(1);
          done();
        }
      });
    });

    it('should handle add to cart failure', (done) => {
      const mockFailResult: CartOperationResult = {
        success: false,
        message: 'Product already sold',
        order_id: 0,
        line_id: 0,
        order_name: '',
        access_url: ''
      };

      mockGraphqlService.addToCart.and.returnValue(of(mockFailResult));

      service.addProduct(1).subscribe({
        next: (result: any) => {
          expect(result).toEqual(mockFailResult);
          expect(mockGraphqlService.getCart).not.toHaveBeenCalled();
          done();
        }
      });
    });
  });

  describe('Cart state management', () => {
    it('should initialize with empty cart', (done) => {
      service.cart$.subscribe(cart => {
        expect(cart).toBeNull();
        done();
      });
    });


    describe('Error handling', () => {
      it('should handle network errors gracefully', (done) => {
        mockGraphqlService.addToCart.and.returnValue(
          throwError(() => ({ message: 'Network error' }))
        );

        service.addProduct(1).subscribe({
          next: (result: boolean) => {
            expect(result).toBeFalsy();
            done();
          }
        });
      });
    });
  });
});
