import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {GraphqlService, loginResponse } from '../../services/graphql.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private database = inject(GraphqlService);
  private router = inject(Router);

  loading: Boolean = false;
  loginInvalid: Boolean = false;
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
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
            this.router.navigate(['']);
          }
        }
      ).add(() => {
        this.loading = false;
      })
  
  }

}

}
