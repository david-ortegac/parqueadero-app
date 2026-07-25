import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Evita que usuarios ya autenticados entren a login/registro. */
@Injectable({
  providedIn: 'root',
})
export class GuestGuard implements CanActivate {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);


  canActivate(): boolean | UrlTree {
    if (this.auth.isLoggedIn()) {
      return this.router.createUrlTree(['/inicio']);
    }
    return true;
  }
}
