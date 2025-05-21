import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {GraphqlService, loginResponse } from '../../services/graphql.service';
import { Router, RouterLink } from '@angular/router';
import clienteEntorno from '../../clientVariables.environment';
import { validate } from 'graphql';
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule,RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private database = inject(GraphqlService);
  private router = inject(Router);
  private environment = clienteEntorno;


  loading: Boolean = false;
  loginInvalid: Boolean = false;
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email,Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(6),Validators.maxLength(20)]]
  });

  onSubmit(): void {
    this.loginInvalid = false;
    this.loading = true;
    if (this.loginForm.valid) {
      var sub =this.database.loginUser(this.loginForm.get('email')?.value, this.loginForm.get('password')?.value).subscribe(
        (result) => {
          var resultado: loginResponse = result.data! as loginResponse;
          if (resultado.login === null) {
            //El usuario es invalido
            this.loginInvalid = true;
            this.loginForm.get('password')?.reset(); 
          } else {
            //El usuario es valido
            localStorage.setItem('token', resultado.login.token);
            this.environment.setIsLoggedIn(true);
            this.environment.setJWT(resultado.login.token);

            this.router.navigate(['']);
          }
        }
      ).add(() => {
        this.loading = false;
      })
  
  }

}

}
