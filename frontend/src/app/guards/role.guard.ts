import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { SessionUser } from '../models/session-user.model';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);


  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const allowed = route.data['roles'] as SessionUser['role'][] | undefined;
    if (!allowed?.length) {
      return true;
    }
    if (!this.auth.isLoggedIn()) {
      return this.router.createUrlTree(['/consulta']);
    }
    if (this.auth.hasRole(...allowed)) {
      return true;
    }
    return this.router.createUrlTree(['/inicio']);
  }
}
