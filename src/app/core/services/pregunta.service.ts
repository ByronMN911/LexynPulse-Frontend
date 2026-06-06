import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environmet'; 


/*
 * Servicio especializado en la gestión administrativa del banco de preguntas.
 * Centraliza las operaciones CRUD relacionadas con el catálogo de preguntas
 * consumiendo los endpoints expuestos por el backend de Node.js y Express.
 */
@Injectable({
  providedIn: 'root'
})
export class PreguntaService {
  
  // URL base del módulo de preguntas apuntando al controlador correspondiente del backend
  private apiUrl = environment.apiUrl;
  
  // Inyección funcional del cliente HTTP para la comunicación con la API REST
  private http = inject(HttpClient);

  /*
   * Recupera la vista consolidada del dashboard de preguntas.
   * Consume el endpoint administrativo que devuelve el catálogo
   * completo junto con la información requerida por la interfaz.
   */
  obtenerDashboardPreguntas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard`);
  }

  /*
   * Registra una nueva pregunta en el repositorio central del sistema.
   * Envía al backend la estructura completa del formulario capturado
   * desde la interfaz administrativa.
   */
  crearPregunta(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  /*
   * Actualiza una pregunta existente utilizando su identificador único.
   * Remite al backend los cambios realizados por el administrador
   * para sincronizar la información persistida en la base de datos.
   */
  actualizarPregunta(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload);
  }
}