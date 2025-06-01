import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import clienteEntorno from '../../clientVariables.environment';
import { AuthPayload, GraphqlService } from '../../services/graphql.service';
import { firstValueFrom } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private database = inject(GraphqlService);
  emailalreadyexists = false;
  private environment = clienteEntorno;
  private router = inject(Router);
  registerForm: FormGroup = this.fb.group(
    {
      firstName: ['', [Validators.required,Validators.maxLength(20)]],
      lastName: ['', [Validators.required,Validators.maxLength(20)] ],
      email: ['', [Validators.required, Validators.email,Validators.maxLength(50)] ],
      password: ['', [Validators.required, Validators.minLength(6),Validators.maxLength(20)] ],
      confirmPassword: ['', Validators.required]
    },
    {
      validators: this.passwordMatchValidator
    }
  );

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  async onRegister() {
      if (this.registerForm.valid) {
        try {
        const callback = await firstValueFrom(
        this.database.registerUser(
          this.registerForm.get('firstName')?.value + ' ' + this.registerForm.get('lastName')?.value,
          this.registerForm.get('email')?.value,
          this.registerForm.get('password')?.value)
        );
      let data: AuthPayload = ((callback.data as any).registerUser) as AuthPayload;
      if (!data.success && data.message.toLocaleLowerCase() === "email ya registrado") {
        this.emailalreadyexists = true;
      }
      
      if (data.success && data.token != null) {
        localStorage.setItem("token", data.token);
        this.environment.setIsLoggedIn(true);
        this.environment.setJWT(data.token);
        this.router.navigate([""]);
      }

    } catch (error){
      console.log ("Error en el proceso de registro",error)
    }
  }
}
}
