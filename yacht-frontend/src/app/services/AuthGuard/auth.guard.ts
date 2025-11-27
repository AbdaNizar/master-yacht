import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../authService/auth.service';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getUser();



  if (authService.isAuthenticated() && user) {
    if(user.role != 'admin'){
      const allowedPaths = [`dashboard/${user.role}/list`,'dashboard/owner/yacht/add','dashboard/owner/yacht/edit','/dashboard/client/payment-success' ,`dashboard/${user.role}/bookings`,`dashboard/${user.role}/payments`,`dashboard/${user.role}/settings`,`dashboard/${user.role}/earnings`];
      if (!allowedPaths.some((path) => state.url.includes(path))) {
        router.navigate([`/dashboard/${user.role}/list`]);
        return false;
      }
    }else if (user.role == 'admin'){
      const allowedPaths = [`dashboard/${user.role}/users`,`dashboard/${user.role}/yachts`,`dashboard/${user.role}/reviews`,`dashboard/${user.role}/settings`,`dashboard/${user.role}`];
      if (!allowedPaths.some((path) => state.url.includes(path))) {
        router.navigate([`dashboard/${user.role}`]);
        return false;
      }
    }
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }

};
