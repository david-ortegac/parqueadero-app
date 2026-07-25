import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);


  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (!this.auth.isLoggedIn()) {
      return this.router.createUrlTree(['/consulta']);
    }
    return this.auth.refreshUserFromApi().pipe(
      map((user) => (user ? true : this.router.createUrlTree(['/consulta']))),
    );
  }
}
