import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/*
 * Guardián Funcional de Control de Acceso Basado en Roles (RBAC).
 * Intercepta los intentos de navegación en el enrutador de Angular y discrimina
 * los accesos evaluando el rol embebido en el token criptográfico del usuario.
 */

/*
 * Implementación funcional del guard encargado de validar la autorización
 * de acceso a rutas protegidas según los roles definidos en la configuración
 * de navegación de la aplicación.
 */
export const roleGuard: CanActivateFn = (route, state) => {

  // Obtiene el servicio de autenticación mediante inyección funcional
  const authService = inject(AuthService);

  // Obtiene la instancia del Router para gestionar redirecciones de seguridad
  const router = inject(Router);

  const rolesPermitidos = route.data?.['roles'] as Array<string>;
  const rolUsuario = authService.getRolUsuario();

  // 1. Bloqueo preventivo en caso de ausencia de credenciales de sesión
  if (!authService.hasToken() || !rolUsuario) {
    router.navigate(['/auth/login']);
    return false;
  }

  // 2. Validación conforme si el rol del cliente se encuentra en la lista blanca de la ruta
  if (rolesPermitidos && rolesPermitidos.includes(rolUsuario)) {
    return true;
  }

  // 3. Redirección forzada de contingencia para mitigar solapamientos de interfaz
  if (rolUsuario === 'CLIENTE') {
    router.navigate(['/cliente/dashboard']);
  } else if (rolUsuario === 'ADMINISTRADOR') {
    router.navigate(['/admin/dashboard']);
  }

  return false;
};