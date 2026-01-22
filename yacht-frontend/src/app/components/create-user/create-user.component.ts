import {Component} from '@angular/core';
import {User} from '../../constants/User';
import {Role} from '../../constants/Role.enum';
import {FormsModule} from '@angular/forms';
import {UserService} from '../../services/userService/user.service';
import {showAlert} from '../../constants/functions';
import {Router} from '@angular/router';
import {AuthService} from '../../services/authService/auth.service';
import {ButtonLoaderComponent} from '../button-loader/button-loader.component';

@Component({
  selector: 'app-create-user',
  imports: [
    FormsModule,
    ButtonLoaderComponent
  ],
  templateUrl: './create-user.component.html',
  standalone: true,
  styleUrl: './create-user.component.css'
})
export class CreateUserComponent {
  user: User = {
    name: '',
    email: '',
    password: '',
    role: Role.CLIENT,
    image : null
  };
  acceptedTerms: boolean = false;
  showPassword: boolean = false;
  selectedFileName: string = '';
  isLoading: boolean = false;

  constructor(private userService: UserService, private authService: AuthService, private router: Router) {
  }

  onSubmit(form: any): void {
    if (form.valid) {
      this.isLoading = true;
      const formData = new FormData();
      formData.append('name', this.user.name);
      formData.append('email', this.user.email);
      formData.append('password', this.user.password);
      formData.append('role', this.user.role);
      if (this.user.image) {
        formData.append("image", this.user.image);
      }
      this.userService.createUser(formData).subscribe({
        next: async (response) => {
          this.isLoading = false;
          await showAlert({
            title: '<strong>Inscription réussie</strong>',
            icon: 'success',
            html: 'Votre compte a été enregistré avec succès. La validation de votre compte sera effectuée dans les plus brefs délais. <br><br> 📧 <strong>Vous recevrez un e-mail</strong> lorsque votre compte sera validé.',
            confirmButtonText: 'OK'
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/login']);
            }
          });
        },
        error: async (error) => {
          this.isLoading = false;
          await showAlert({
            title: '<strong>Erreur</strong>',
            icon: 'error',
            html: error.error.message || 'Une erreur est survenue lors de l\'inscription.',
            confirmButtonText: 'OK'
          });
        },
      });
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.user.image = file;
      this.selectedFileName = file.name;
    }
  }

  goToRegister() {
    return this.router.navigate(['/login']);
  }
}
