import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
/*
 * Configuración del ecosistema global de la aplicación (Arquitectura Standalone).
 * Centraliza los proveedores de servicios fundamentales e inyecta la tubería del interceptor HTTP.
 */

/*
 * Objeto de configuración raíz utilizado durante el proceso de bootstrap.
 * Define los proveedores globales que estarán disponibles en toda la aplicación,
 * incluyendo enrutamiento, cliente HTTP y optimizaciones del framework.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Optimización moderna del ciclo de detección de cambios de Angular
    provideZoneChangeDetection({ eventCoalescing: true }),
    
    // Inyección del sistema de enrutamiento modularizado
    provideRouter(routes),
    
    /*
     * Habilita el cliente HTTP global e integra el interceptor funcional 
     * para automatizar la protección de rutas hacia el backend de Express.
     */
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};