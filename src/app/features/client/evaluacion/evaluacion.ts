import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EvaluationService } from '../../../core/services/evaluation.service';

/*
 * Decorador que define este artefacto como un componente Standalone,
 * especificando sus dependencias visuales, recursos asociados y
 * configuración necesaria para su renderización.
 */
@Component({
  selector: 'app-evaluacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evaluacion.html',
  styleUrls: ['./evaluacion.css']
})

/*
 * Componente responsable de gestionar el flujo completo del
 * cuestionario de evaluación normativa. Centraliza la carga
 * dinámica de preguntas, la captura de respuestas y el envío
 * de resultados hacia los servicios del backend.
 */
export class EvaluacionComponent implements OnInit {
  
  // Inyecciones funcionales nativas de Angular 21
  private evaluationService = inject(EvaluationService);
  private router = inject(Router);

  /*
   * Colección de preguntas y opciones recuperadas desde el backend,
   * utilizadas para construir dinámicamente el cuestionario.
   */
  public preguntas: any[] = [];
  
  /*
   * Estructura de almacenamiento temporal que relaciona cada pregunta
   * con la opción seleccionada por el usuario durante la evaluación.
   */
  public respuestasSeleccionadas: { [preguntaId: number]: number } = {};
  
  /*
   * Indicador visual utilizado para controlar el estado de carga
   * durante la descarga inicial del cuestionario.
   */
  public isLoading: boolean = true;
  
  /*
   * Indicador de procesamiento utilizado durante el envío de respuestas
   * hacia el backend para evitar interacciones duplicadas.
   */
  public isSubmitting: boolean = false;
  
  /*
   * Contenedor destinado a almacenar mensajes de error funcionales
   * o técnicos que deban presentarse en la interfaz.
   */
  public errorMessage: string | null = null;

  /*
   * Referencia expuesta del objeto global de JavaScript utilizada
   * por la plantilla para ejecutar operaciones auxiliares sobre
   * estructuras dinámicas durante el renderizado.
   */
  public Object = Object;

  /*
   * Hook del ciclo de vida ejecutado tras la inicialización
   * del componente. Dispara la carga del cuestionario regulatorio.
   */
  ngOnInit(): void {
    this.cargarCuestionarioRegulatorio();
  }

  /*
   * Consume el servicio de evaluaciones para recuperar el catálogo
   * de preguntas activas y actualizar el estado local del componente
   * con la estructura recibida desde el backend.
   */
  private cargarCuestionarioRegulatorio(): void {
    this.evaluationService.getCuestionario().subscribe({
      next: (data: any[]) => {
        // La API devuelve la estructura jerárquica lista para ser consumida por la interfaz
        this.preguntas = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
         /*
         * Interceptamos el mensaje exacto lanzado por nuestro backend (El throw new Error)
         * mediante err.error?.message. Si hay un fallo de red real, aplicamos el fallback de infraestructura.
         */
        this.errorMessage = err.error?.message || 'Incidente Operativo: Error crítico de red al descargar el cuestionario normativo.';
        console.error('QA Log Senior [Carga Cuestionario]:', err);
      }
    });
  }

  /*
   * Captura la interacción del usuario al seleccionar una respuesta
   * y registra la asociación entre la pregunta y la opción elegida.
   */
  public seleccionarOpcion(preguntaId: number, opcionId: number): void {
    this.respuestasSeleccionadas[preguntaId] = opcionId;
  }

  /*
   * Verifica que todas las preguntas disponibles hayan sido respondidas
   * antes de habilitar el proceso de envío al backend.
   */
  public cuestionarioCompleto(): boolean {
    if (this.preguntas.length === 0) return false;
    return Object.keys(this.respuestasSeleccionadas).length === this.preguntas.length;
  }

  /*
   * Construye el payload requerido por la API y despacha las respuestas
   * seleccionadas hacia el motor de procesamiento del backend.
   */
  public enviarEvaluacion(): void {
    if (!this.cuestionarioCompleto()) return;

    this.isSubmitting = true;
    this.errorMessage = null;

    // Conversión conforme del mapa al array transaccional plano: { respuestas: [ { pregunta_id, opcion_id } ] }
    const payload = {
      respuestas: Object.entries(this.respuestasSeleccionadas).map(([preguntaId, opcionId]) => ({
        pregunta_id: parseInt(preguntaId),
        opcion_id: opcionId
      }))
    };

    this.evaluationService.procesarEvaluacion(payload).subscribe({
      next: (resultado) => {
        // Redirección hacia la pantalla de resultados enviando el ID correlativo de la evaluación generado en Postgres
        this.router.navigate(['/cliente/reporte', resultado.resultado.id]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Error interno al procesar los algoritmos de scoring.';
        console.error('QA Log Senior [Envío Evaluación]:', err);
      }
    });
  }

  /*
   * Cancela la evaluación en curso y retorna al usuario
   * hacia el panel principal de cliente.
   */
  public cancelarEvaluacion(): void {
    this.router.navigate(['/cliente/dashboard']);
  }
}