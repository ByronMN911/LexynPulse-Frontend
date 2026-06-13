import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EvaluationService } from '../../../core/services/evaluation.service';
import { AdminNavbarComponent } from '../../../shared/components/admin-navbar/admin-navbar';


/*
 * Decorador que registra este artefacto como un componente Standalone
 * dentro del ecosistema Angular, definiendo sus dependencias visuales,
 * plantilla HTML y hoja de estilos asociada.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AdminNavbarComponent ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})

/*
 * Componente principal del Módulo de Administración.
 * Centraliza la visualización de métricas globales, evaluaciones registradas
 * y estadísticas estratégicas para la supervisión del cumplimiento normativo.
 */
export class DashboardComponent implements OnInit {
  
  // Inyecciones funcionales modernas de dependencias (Arquitectura Standalone)
  private authService = inject(AuthService);
  private evaluationService = inject(EvaluationService);
  private router = inject(Router);


  /*
   * Colección completa de evaluaciones recuperadas desde el backend.
   * Alimenta tablas, métricas y componentes de inteligencia de negocio.
   */
  public evaluacionesGlobales: any[] = [];
  
  // Métricas derivadas para el panel superior (KPIs)

  /*
   * Indicador global del volumen total de evaluaciones registradas
   * dentro del ecosistema de cumplimiento normativo.
   */
  public totalEvaluaciones: number = 0;

  /*
   * Métrica estratégica que contabiliza las organizaciones clasificadas
   * en el nivel de riesgo más elevado según los algoritmos de evaluación.
   */
  public totalEmpresasRiesgoCritico: number = 0;

  /*
   * Indicador dinámico que identifica el producto o licencia con mayor
   * frecuencia de recomendación dentro de las evaluaciones procesadas.
   */
  public moduloMasSugerido: string = 'Calculando...';

  /*
   * Bandera reactiva utilizada para controlar los estados de carga
   * durante operaciones asíncronas contra el backend.
   */
  public isLoading: boolean = true;

  /*
   * Contenedor para mensajes de error funcionales o técnicos que
   * pueden ser presentados en la interfaz de usuario.
   */
  public errorMessage: string | null = null;

  /*
   * Hook del ciclo de vida ejecutado automáticamente cuando el
   * componente es inicializado dentro del árbol de Angular.
   */
  ngOnInit(): void {
    this.cargarMatrizTelemetria();
  }

  /*
   * Consume el endpoint corporativo de inteligencia de negocios y
   * calcula los indicadores estratégicos mostrados en el dashboard.
   */
  private cargarMatrizTelemetria(): void {
    this.evaluationService.getDashboardGlobal().subscribe({
      next: (data: any[]) => {

        // Almacenamiento local de la matriz completa de evaluaciones
        this.evaluacionesGlobales = data;

        // Cálculo del número total de registros recuperados
        this.totalEvaluaciones = data.length;
        
        /* 
         * KPI (Key Performance Indicator) #1:
         * Calcula cuántas organizaciones fueron clasificadas
         * dentro de la categoría de riesgo crítico.
         */
        this.totalEmpresasRiesgoCritico = data.filter(ev => 
          ev.nivel_riesgo.toLowerCase() === 'crítico' ||
          ev.nivel_riesgo.toLowerCase() === 'critico'
        ).length;

        /*
         * KPI #2:
         * Determina cuál es el producto recomendado con mayor frecuencia
         * dentro del universo de evaluaciones procesadas.
         */
        if (data.length > 0) {

          /*
           * Estructura temporal utilizada para contabilizar la frecuencia
           * de aparición de cada producto recomendado.
           */
          const frecuenciaModulos: { [key: string]: number } = {};

          // Almacena la frecuencia máxima encontrada durante el recorrido
          let maxFrecuencia = 0;

          // Variable auxiliar que conservará el producto más recomendado
          let topModulo = 'N/A';

          /*
           * Recorre todas las evaluaciones recuperadas y construye
           * una tabla de frecuencias en memoria.
           */
          data.forEach(ev => {
            const producto = ev.producto_recomendado;

            if (producto) {

              // Incrementa el contador asociado al producto actual
              frecuenciaModulos[producto] =
                (frecuenciaModulos[producto] || 0) + 1;

              /*
               * Si el producto actual supera la frecuencia máxima registrada,
               * se convierte en el nuevo líder estadístico.
               */
              if (frecuenciaModulos[producto] > maxFrecuencia) {
                maxFrecuencia = frecuenciaModulos[producto];
                topModulo = producto;
              }
            }
          });

          // Publica el resultado final en la interfaz administrativa
          this.moduloMasSugerido = topModulo;

        } else {

          // Valor de contingencia cuando no existen evaluaciones registradas
          this.moduloMasSugerido = 'Sin datos';
        }

        this.isLoading = false;
      },
      error: (err) => {

        this.isLoading = false;

        this.errorMessage =
          'Incidente al recuperar la telemetría global de la base de datos.';

        console.error(
          'QA Log Senior [Carga Admin Dashboard]:',
          err
        );
      }
    });
  }

  public verReporteDetallado(evaluacionId: string): void {
    this.router.navigate(['/admin/reporte', evaluacionId]);
  }
}