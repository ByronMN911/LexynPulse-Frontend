import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

/*
 * Definición del árbol de enrutamiento maestro de la aplicación.
 * Implementa la estrategia de Carga Perezosa (Lazy Loading) para optimizar el rendimiento
 * y aplica restricciones de seguridad RBAC mediante el guardián funcional 'roleGuard'.
 */

/*
 * Colección de rutas que define la navegación principal de la aplicación,
 * incluyendo rutas públicas, áreas protegidas por roles y mecanismos
 * de redirección para escenarios de acceso inválido o recursos inexistentes.
 */
export const routes: Routes = [
  // 1. Redirección inicial por defecto hacia la pantalla de autenticación
  { 
    path: '', 
    redirectTo: 'auth/login', 
    pathMatch: 'full' 
  },

  // 2. Bloque Público: Módulo de Autenticación
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
  },

  // 3. Bloque Privado: Panel Técnico del Administrador (Solo acceso a Rol 1)
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [roleGuard],
    data: { roles: ['ADMINISTRADOR'] }
  },

  {
    path: 'admin/clientes', 
    loadComponent: () => import('./features/admin/clientes/clientes').then(m => m.ClientesComponent),
    canActivate: [roleGuard],
    data: { roles: ['ADMINISTRADOR'] }
  },

  {
    path: 'admin/preguntas', 
    loadComponent: () => import('./features/admin/preguntas/preguntas').then(m => m.PreguntasComponent),
    canActivate: [roleGuard],
    data: { roles: ['ADMINISTRADOR'] }
  },

  {
    path: 'admin/reporte/:id',
    loadComponent: () => import('./features/admin/reporte/reporte').then(m => m.ReporteComponent),
    canActivate: [roleGuard],
    data: { roles: ['ADMINISTRADOR'] }
  },

  // 4. Bloque Privado: Panel Operativo del Cliente (Solo acceso a Rol 2)
  {
    path: 'cliente/dashboard',
    loadComponent: () => import('./features/client/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [roleGuard],
    data: { roles: ['CLIENTE'] }
  },

  {
    path: 'cliente/evaluacion', 
    loadComponent: () => import('./features/client/evaluacion/evaluacion').then(m => m.EvaluacionComponent),
    canActivate: [roleGuard],
    data: { roles: ['CLIENTE'] }
  },

  {
    path: 'cliente/reporte/:id', // ◄ NUEVA RUTA ASÍNCRONA CON PARÁMETRO DINÁMICO (:id)
    loadComponent: () => import('./features/client/reporte/reporte').then(m => m.ReporteComponent),
    canActivate: [roleGuard],
    data: { roles: ['CLIENTE'] }
  },

  // 5. Ruta de Contingencia (Comodín / 404): Redirige al login si la URL no existe
  { 
    path: '**', 
    redirectTo: 'auth/login' 
  }
];