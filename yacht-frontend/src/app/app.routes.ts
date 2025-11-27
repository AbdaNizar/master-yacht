import { Routes } from '@angular/router';
import { CreateUserComponent } from './components/create-user/create-user.component';
import { LoginComponent } from './components/login/login.component';
import { AppComponent } from './app.component';
import { YachtListComponent } from './components/yacht-list/yacht-list.component';
import { OwnerYachtAddComponent } from './components/owner-yacht-add/owner-yacht-add.component';
import { BookingComponent } from './components/booking/booking.component';
import { AgendaComponent } from './components/agenda/agenda.component';
import { ClientBookingsComponent } from './components/client-bookings/client-bookings.component';
import { PaymentSuccessComponent } from './components/payment-success/payment-success.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';

import { authGuard } from './services/AuthGuard/auth.guard';
import {AdminUserManagementComponent} from './components/admin-user-management/admin-user-management.component';
import {AdminYachtManagementComponent} from './components/admin-yacht-management/admin-yacht-management.component';
import {AddReviewComponent} from './components/add-review/add-review.component';
import {AdminReviewManagementComponent} from './components/admin-review-management/admin-review-management.component';
import {PaymentComponent} from './components/payment/payment.component';
import {SettingsComponent} from './components/settings/settings.component';
import {OwnerEarningsComponent} from './components/owner-earnings/owner-earnings.component';
import {AdminDashboardComponent} from './components/admin-dashboard/admin-dashboard.component';


export const routes: Routes = [


  { path: 'register', component: CreateUserComponent },
  { path: 'login', component: LoginComponent },

  {
    path: 'dashboard',
    component: AppComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: '', pathMatch: 'full' },
      { path: 'owner/list', component: YachtListComponent ,canActivate: [authGuard]},
      { path: 'owner/yacht/add', component: OwnerYachtAddComponent ,canActivate: [authGuard] },
      { path: 'owner/yacht/edit/:id', component: OwnerYachtAddComponent ,canActivate: [authGuard] },
      { path: 'owner/bookings', component: AgendaComponent ,canActivate: [authGuard]},
      { path: 'owner/settings', component: SettingsComponent ,canActivate: [authGuard]},
      { path: 'owner/earnings', component: OwnerEarningsComponent ,canActivate: [authGuard]},
      { path: 'client/list', component: YachtListComponent,canActivate: [authGuard] },
      { path: 'client/payments', component: PaymentComponent,canActivate: [authGuard] },
      { path: 'client/settings', component: SettingsComponent,canActivate: [authGuard] },
      { path: 'client/bookings/:id', component: BookingComponent ,canActivate: [authGuard]},
      { path: 'client/add-review/:id', component: AddReviewComponent },
      { path: 'client/bookings', component: ClientBookingsComponent ,canActivate: [authGuard] },
      { path: 'client/payment-success', component: PaymentSuccessComponent ,canActivate: [authGuard]},
      {
        path: 'admin',
        component: AdminDashboardComponent,
        canActivate: [authGuard]
      },{
        path: 'admin/users',
        component: AdminUserManagementComponent,
        canActivate: [authGuard]
      },  {
        path: 'admin/yachts',
        component: AdminYachtManagementComponent,
        canActivate: [authGuard]
      }, {
        path: 'admin/reviews',
        component: AdminReviewManagementComponent,
        canActivate: [authGuard]
      },{
        path: 'admin/settings',
        component: SettingsComponent,
        canActivate: [authGuard]
      },
    ],
  },

  { path: 'not-found', component: PageNotFoundComponent },
  { path: '**', redirectTo: 'not-found' },

];
