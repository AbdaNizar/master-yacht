import {Component} from '@angular/core';
import {UserService} from '../../services/userService/user.service';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../../services/authService/auth.service';
import {showAlert} from '../../constants/functions';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    NgOptimizedImage
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

  constructor(private userService: UserService, private authService: AuthService, private router: Router) {
  }

  onSubmit(): void {
    this.userService.loginUser(this.user.email, this.user.password).subscribe({
      next: (response) => {
        this.authService.setUser(response.user);
        localStorage.setItem('jwt', response.token);
        if (response.user.role !== 'admin') {
          this.router.navigate([`dashboard/${response.user.role}/list`]);
          const user = this.authService.getUser();
        } else {
          this.router.navigate([`dashboard/admin`]);
        }
      },
      error: async (err) => {
        await this.openModal(err.error.message);
      },
    });
  }

  async openModal(message: string) {
    const customAlertData = {
      title: `<strong>Attention !!</strong>`,
      icon: 'error',
      html: message,
      confirmButtonText: 'OK',
      showCancelButton: false,
    };

    try {
      await showAlert(customAlertData);
    } catch (error) {
      console.error(' Erreur lors de l\'affichage du message :', error);
    }
  }

  goToRegister() {
    return this.router.navigate(['/register']);

  }
}

