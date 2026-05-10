import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Usa `Injector` para resolver AuthService de forma perezosa y evitar la dependencia circular
 * HttpClient → AuthInterceptor → AuthService → HttpClient (sin esto, a veces no se envía el Bearer).
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly injector: Injector) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const auth = this.injector.get(AuthService);
    const token = auth.getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const outgoing = req.clone({ setHeaders: headers });

    return next.handle(outgoing).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401 && !req.url.includes('/v1/login')) {
          auth.invalidateSession();
        }
        return throwError(() => err);
      }),
    );
  }
}
