import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'; 


@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  // URL base unificada apuntando al controlador de evaluaciones de Express
  private apiUrl = environment.apiUrl;
  
  // Inyección funcional del cliente HTTP nativo
  private http = inject(HttpClient);

  /*
   * Recupera el cuestionario maestro activo (las 11 preguntas con sus opciones).
   * Endpoint backend: GET /api/evaluaciones/cuestionario
   */
  getCuestionario(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/evaluaciones/cuestionario`);
  }

  /*
   * Envía el arreglo de respuestas del cliente para procesar los cálculos de riesgo y pricing.
   * Endpoint backend: POST /api/evaluaciones/procesar
   */
  procesarEvaluacion(payload: { respuestas: any[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/evaluaciones/procesar`, payload);
  }

  /*
   * Recupera la telemetría histórica de todas las evaluaciones rendidas por un usuario específico.
   * Endpoint backend: GET /api/evaluaciones/usuario/:id
   */
  getHistorialUsuario(usuarioId: string): Observable<any[]> {
    return this.http.get<any[]>(`${`${this.apiUrl}/evaluaciones/usuario`}/${usuarioId}`);
  }

  /**
   * Extrae el reporte detallado e informe de IA de un diagnóstico específico por su ID UUID.
   * Endpoint backend: GET /api/evaluaciones/reporte/:id
   */
  getReporteIndividual(evaluacionId: string): Observable<any> { 
    return this.http.get<any>(`${this.apiUrl}/evaluaciones/reporte/${evaluacionId}`);
  }

  /*
   * Recupera la matriz de telemetría global con todas las evaluaciones de la plataforma.
   * Endpoint de alcance exclusivo para el perfil ADMINISTRADOR.
   * Backend: GET /api/evaluaciones/dashboard
   */
  getDashboardGlobal(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/evaluaciones/dashboard`);
  }

  /*
   * Endpoint de acceso público para la auditoría de documentos PDF.
   * Valida la inmutabilidad y autenticidad del reporte generado.
   * Backend: GET /api/evaluaciones/verificar/:codigo
   */
  verificarCodigoPdf(codigo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/evaluaciones/verificar/${codigo}`);
  }
}