//Importamos Component y OnInit para definir el componente y su ciclo de vida, e inject para la inyección funcional de dependencias
//Importamos CommonModule para funcionalidades comunes, Router para navegación, AuthService para gestión de autenticación, EvaluationService para interacción con el backend de evaluaciones y jwtDecode para decodificar el token JWT.
//Importamos Router para la navegación programática, AuthService para gestionar la autenticación del usuario, EvaluationService para interactuar con el backend de evaluaciones y jwtDecode para decodificar el token JWT y extraer información del usuario.

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EvaluationService } from '../../../core/services/evaluation.service';
import { jwtDecode } from 'jwt-decode';

/*
 * Decorador que define este artefacto como un componente Standalone,
 * estableciendo su selector, dependencias declarativas y recursos
 * visuales asociados para su representación en la interfaz.
 */
@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})

/*
 * Componente responsable de presentar el panel principal del cliente.
 * Centraliza la visualización de información corporativa, el historial
 * de evaluaciones realizadas y las acciones operativas disponibles.
 */
export class DashboardComponent implements OnInit {

  // Inyecciones funcionales de la arquitectura standalone de Angular 21
  private authService = inject(AuthService);
  private evaluationService = inject(EvaluationService);
  private router = inject(Router);

  /*
   * Nombre del usuario autenticado obtenido desde el payload
   * seguro contenido en el token JWT.
   */
  public nombreCliente: string = '';

  /*
   * Razón social o nombre comercial de la empresa asociada
   * al usuario actualmente autenticado.
   */
  public empresaNombre: string = '';

  /*
   * Colección de evaluaciones históricas recuperadas desde
   * el backend para su presentación en la interfaz.
   */
  public historialEvaluaciones: any[] = [];

  /*
   * Indicador de procesamiento utilizado para controlar los
   * estados de carga durante operaciones asíncronas.
   */
  public isLoading: boolean = true;

  /*
   * Contenedor de mensajes de error funcionales o técnicos
   * que pueden ser mostrados al usuario.
   */
  public errorMessage: string | null = null;

  /*
   * Hook del ciclo de vida ejecutado tras la inicialización
   * del componente. Dispara la carga de datos requeridos
   * para la construcción del panel principal.
   */
  ngOnInit(): void {
    this.cargarDatosUsuarioYHistorial();
  }

  /*
   * Decodifica el token en memoria para extraer la identidad corporativa
   * y realiza la invocación asíncrona al servicio de telemetría histórica.
   */
  private cargarDatosUsuarioYHistorial(): void {
    const token = this.authService.getToken();
    if (!token) {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
      return;
    }

    try {
      // Desempaquetamos el payload seguro del token
      const payload: any = jwtDecode(token);
      this.nombreCliente = payload.nombre || 'Representante Legal';
      
      // El backend inyecta los datos extendidos del usuario en el login, los leemos del AuthService
      const infoUsuario = JSON.parse(localStorage.getItem('user_info') || '{}');
      this.empresaNombre = infoUsuario.empresa_nombre || 'Empresa Evaluada';

      // Llamada asíncrona al endpoint: GET /api/evaluaciones/usuario/:id
      this.evaluationService.getHistorialUsuario(payload.id).subscribe({
        next: (data) => {
          this.historialEvaluaciones = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'No se pudo recuperar su historial de cumplimiento normativo.';
          console.error(err);
        }
      });
    } catch (error) {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    }
  }

  /*
   * Cierra de forma conforme la sesión de usuario y limpia el almacenamiento local.
   */
  public onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  /*
   * Redirige al cliente hacia el flujo interactivo de resolución del cuestionario.
   */
  public iniciarEvaluacion(): void {
    this.router.navigate(['/cliente/evaluacion']); // Configuraremos esta ruta en el siguiente paso
  }

  /*
   * Redirige al cliente a la pantalla de visualización del informe detallado de IA.
   */
  public verDetalleReporte(id: number): void {
    this.router.navigate(['/cliente/reporte', id]);
  }
}