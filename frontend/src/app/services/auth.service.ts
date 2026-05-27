import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionUser } from '../models/session-user.model';

const TOKEN_KEY = 'parqueadero_token';
const USER_KEY = 'parqueadero_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly userSubject = new BehaviorSubject<SessionUser | null>(this.readStoredUser());

  readonly user$: Observable<SessionUser | null> = this.userSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUser(): SessionUser | null {
    return this.userSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasRole(...roles: SessionUser['role'][]): boolean {
    const u = this.getUser();
    return u !== null && roles.includes(u.role);
  }

  /** Revalida token y rol con el servidor (usar en guards al entrar a rutas protegidas). */
  refreshUserFromApi(): Observable<SessionUser | null> {
    if (!this.getToken()) {
      return of(null);
    }
    return this.http
      .get<SessionUser & { is_active?: boolean }>(`${environment.apiUrl}/me`)
      .pipe(
        map((user) => {
          if (user.is_active === false) {
            this.clearLocal();
            return null;
          }
          const sessionUser: SessionUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            document: user.document,
            role: user.role,
          };
          this.persistUser(sessionUser);
          return sessionUser;
        }),
        catchError(() => {
          this.clearLocal();
          return of(null);
        }),
      );
  }

  login(email: string, password: string): Observable<{ token: string; user: SessionUser }> {
    return this.http
      .post<{ token: string; user: SessionUser }>(`${environment.apiUrl}/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          this.persistUser(res.user);
        }),
      );
  }

  register(body: {
    name: string;
    document: string;
    email: string;
    password: string;
  }): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${environment.apiUrl}/register`, body);
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${environment.apiUrl}/logout`, {}).subscribe({
        complete: () => this.clearLocal(),
        error: () => this.clearLocal(),
      });
    } else {
      this.clearLocal();
    }
  }

  /**
   * Limpia la sesión local sin depender del API (p. ej. 401: token inválido u host distinto).
   */
  invalidateSession(): void {
    this.clearLocal();
  }

  private clearLocal(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSubject.next(null);
    void this.router.navigate(['/login']);
  }

  private persistUser(user: SessionUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userSubject.next(user);
  }

  private readStoredUser(): SessionUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }
}
