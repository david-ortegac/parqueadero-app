import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { SessionUser } from '../models/session-user.model';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const allowed = route.data['roles'] as SessionUser['role'][] | undefined;
    if (!allowed?.length) {
      return true;
    }
    if (!this.auth.isLoggedIn()) {
      return this.router.createUrlTree(['/login']);
    }
    if (this.auth.hasRole(...allowed)) {
      return true;
    }
    return this.router.createUrlTree(['/tabs/tab1']);
  }
}
