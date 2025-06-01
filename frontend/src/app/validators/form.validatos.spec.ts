import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { RegisterComponent } from '../pages/register/register.component';

describe('Form Validators', () => {
  let formBuilder: FormBuilder;
  let registerComponent: RegisterComponent;

  beforeEach(() => {
    formBuilder = new FormBuilder();
    registerComponent = new RegisterComponent();
  });

  describe('passwordMatchValidator', () => {
    it('should return null when passwords match', () => {
      const form = formBuilder.group({
        password: ['password123'],
        confirmPassword: ['password123']
      });

      const result = registerComponent.passwordMatchValidator(form);
      expect(result).toBeNull();
    });

    it('should return error object when passwords do not match', () => {
      const form = formBuilder.group({
        password: ['password123'],
        confirmPassword: ['different123']
      });

      const result = registerComponent.passwordMatchValidator(form);
      expect(result).toEqual({ passwordMismatch: true });
    });

    it('should handle empty passwords correctly', () => {
      const form = formBuilder.group({
        password: [''],
        confirmPassword: ['']
      });

      const result = registerComponent.passwordMatchValidator(form);
      expect(result).toBeNull();
    });

    it('should handle one empty password', () => {
      const form = formBuilder.group({
        password: ['password123'],
        confirmPassword: ['']
      });

      const result = registerComponent.passwordMatchValidator(form);
      expect(result).toEqual({ passwordMismatch: true });
    });
  });

  describe('Form Validation Rules', () => {
    let registerForm: FormGroup;

    beforeEach(() => {
      registerForm = registerComponent.registerForm;
    });

    it('should validate firstName is required', () => {
      const firstNameControl = registerForm.get('firstName');
      firstNameControl?.setValue('');
      expect(firstNameControl?.hasError('required')).toBeTruthy();
    });

    it('should validate firstName maxlength', () => {
      const firstNameControl = registerForm.get('firstName');
      firstNameControl?.setValue('a'.repeat(21)); // 21 characters
      expect(firstNameControl?.hasError('maxlength')).toBeTruthy();
    });

    it('should validate email format', () => {
      const emailControl = registerForm.get('email');
      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBeTruthy();
    });

    it('should accept valid email', () => {
      const emailControl = registerForm.get('email');
      emailControl?.setValue('test@example.com');
      expect(emailControl?.hasError('email')).toBeFalsy();
    });

    it('should validate password minimum length', () => {
      const passwordControl = registerForm.get('password');
      passwordControl?.setValue('123'); // Less than 6 characters
      expect(passwordControl?.hasError('minlength')).toBeTruthy();
    });

    it('should validate password maximum length', () => {
      const passwordControl = registerForm.get('password');
      passwordControl?.setValue('a'.repeat(21)); // More than 20 characters
      expect(passwordControl?.hasError('maxlength')).toBeTruthy();
    });
  });
});