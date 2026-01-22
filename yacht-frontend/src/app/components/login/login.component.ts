import {Component} from '@angular/core';
import {UserService} from '../../services/userService/user.service';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../../services/authService/auth.service';
import {showAlert} from '../../constants/functions';
import {NgOptimizedImage} from '@angular/common';
import {ButtonLoaderComponent} from '../button-loader/button-loader.component';
import {ToastService} from '../../services/toast.service';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    NgOptimizedImage,
    ButtonLoaderComponent
  ],
  templateUrl: './login.component.html',
  standalone: true,
  styleUrl: './login.component.css'
})
export class LoginComponent {
  user = {
    email: '',
    password: '',
  };
  
  showPassword: boolean = false;
  isLoading: boolean = false;

  constructor(private userService: UserService, private authService: AuthService, private router: Router, private toastService: ToastService) {
    this.toastService.clearOnLogout();
  }

  onSubmit(): void {
    this.isLoading = true;
    this.userService.loginUser(this.user.email, this.user.password).subscribe({
      next: (response) => {
        this.authService.setUser(response.user);
        localStorage.setItem('jwt', response.token);
        localStorage.setItem('token', response.token);
        this.isLoading = false;
        if (response.user.role !== 'admin') {
          this.router.navigate([`dashboard/${response.user.role}/list`]);
          const user = this.authService.getUser();
        } else {
          this.router.navigate([`dashboard/admin`]);
        }
      },
      error: async (err) => {
        this.isLoading = false;
        await showAlert({
          title: '<strong>Erreur de connexion</strong>',
          icon: 'error',
          html: err.error.message || 'Identifiants incorrects',
          confirmButtonText: 'OK',
          showCancelButton: false,
        });
      },
    });
  }

  goToRegister() {
    return this.router.navigate(['/register']);
  }
}
