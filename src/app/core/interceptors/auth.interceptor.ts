import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/*
 * Interceptor Funcional de Autenticación.
 * Captura las peticiones HTTP salientes de forma asíncrona, inyecta el token JWT
 * desde el servicio centralizado y permite que la solicitud continúe su flujo.
 */

/*
 * Implementación del interceptor utilizando la API funcional de Angular.
 * Se ejecuta automáticamente antes de cada solicitud HTTP para aplicar
 * las reglas de autenticación definidas por la aplicación.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Inyección funcional moderna de dependencias (Bypass al constructor)
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Si existe una sesión activa, clonamos la petición e inyectamos la cabecera Bearer
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  // Si no hay token, la solicitud avanza sin modificaciones
  return next(req);
};