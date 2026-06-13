import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PreguntaService } from '../../../core/services/pregunta.service';
import { AdminNavbarComponent } from '../../../shared/components/admin-navbar/admin-navbar';

/**
 * Componente Standalone encargado de la administración integral
 * del catálogo de preguntas utilizadas en el cuestionario de diagnóstico.
 * Permite la creación, edición, activación e inactivación de preguntas y
 * sus respectivas opciones de respuesta.
 */
@Component({
  selector: 'app-admin-preguntas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminNavbarComponent],
  templateUrl: './preguntas.html',
  styleUrls: ['./preguntas.css']
})
export class PreguntasComponent implements OnInit {
  
  // ==========================================================================
  // INYECCIONES FUNCIONALES DE DEPENDENCIAS
  // ==========================================================================
  
  /** Servicio responsable de la autenticación y gestión de sesión */
  private authService = inject(AuthService);

  /** Servicio encargado de las operaciones CRUD del catálogo de preguntas */
  private preguntaService = inject(PreguntaService);

  /** Servicio de navegación entre vistas del módulo administrativo */
  private router = inject(Router);

  /** Constructor reactivo de formularios Angular */
  private fb = inject(FormBuilder);

  // ==========================================================================
  // VARIABLES DE ESTADO DEL COMPONENTE
  // ==========================================================================
  

  /** Catálogo completo de preguntas recuperadas desde la API */
  public preguntas: any[] = [];
  
  /** Bandera visual para indicar carga de información */
  public isLoading: boolean = true;

  /** Bandera de control para operaciones de guardado */
  public isSaving: boolean = false;

  /** Contenedor de errores funcionales o de infraestructura */
  public errorMessage: string | null = null;

  /**
   * Mapa de control de carga individual para switches de activación.
   * Permite bloquear únicamente el elemento que está siendo actualizado.
   */
  public isToggling: { [id: number]: boolean } = {};

  /**
   * Acumulador de pesos porcentuales de preguntas activas.
   * Utilizado para validar visualmente la regla de negocio RF-08.
   */
  public sumaPesosActual: number = 0;

  // ==========================================================================
  // ESTADO DEL MODAL DE GESTIÓN
  // ==========================================================================

  /** Controlador de visibilidad del modal */
  public isModalOpen: boolean = false;

  /** Determina si el formulario operará en modo creación o edición */
  public modalMode: 'CREAR' | 'EDITAR' = 'CREAR';

  /** Identificador de la pregunta actualmente seleccionada para edición */
  public idPreguntaEditando: number | null = null;

  /** Snapshot temporal de la pregunta seleccionada */
  public preguntaActual: any = null;
  
  // ==========================================================================
  // FORMULARIO REACTIVO UNIFICADO
  // ==========================================================================

  /**
   * Formulario principal utilizado tanto para creación como edición.
   * Contiene la cabecera de la pregunta y las cuatro opciones de respuesta.
   */
  public preguntaForm: FormGroup;

  /**
   * Objeto de control para notificaciones tipo Toast.
   * Permite mostrar mensajes de éxito o error sin utilizar alert().
   */
  public toastData = { show: false, message: '', type: 'success' };

  constructor() {

    /**
     * Inicialización del formulario reactivo unificado.
     * Incluye validaciones de negocio para preguntas y opciones.
     */
    this.preguntaForm = this.fb.group({
      texto_pregunta: ['', Validators.required],
      tipo_categoria: ['', Validators.required],
      peso_porcentaje: [0, [Validators.required, Validators.min(0.001), Validators.max(1)]],
      
      opA_id: [null],
      opA_texto: ['', Validators.required],
      opA_score: [0, [Validators.required, Validators.min(0), Validators.max(10)]],

      opB_id: [null],
      opB_texto: ['', Validators.required],
      opB_score: [0, [Validators.required, Validators.min(0), Validators.max(10)]],

      opC_id: [null],
      opC_texto: ['', Validators.required],
      opC_score: [0, [Validators.required, Validators.min(0), Validators.max(10)]],

      opD_id: [null],
      opD_texto: ['', Validators.required],
      opD_score: [10, [Validators.required, Validators.min(0), Validators.max(10)]]
    });
  }

  /**
   * Punto de entrada del componente.
   * Valida la sesión activa y carga el catálogo de preguntas.
   */
  ngOnInit(): void {
    this.cargarCatalogoPreguntas();
  }


  /**
   * Recupera desde el backend el catálogo completo de preguntas
   * junto con sus opciones asociadas.
   */
  private cargarCatalogoPreguntas(): void {
    this.isLoading = true;

    this.preguntaService.obtenerDashboardPreguntas().subscribe({
      next: (data) => {
        this.preguntas = data;

        this.calcularSumaPesosActivos();

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'No se pudo conectar con el catálogo de preguntas del sistema.';
      }
    });
  }

  /**
   * Calcula la suma total de los pesos porcentuales
   * correspondientes únicamente a preguntas activas.
   */
  private calcularSumaPesosActivos(): void {
    const suma = this.preguntas
      .filter(p => p.activo)
      .reduce((acc, curr) => acc + parseFloat(curr.peso_porcentaje), 0);

    this.sumaPesosActual = parseFloat(suma.toFixed(3));
  }

  /**
   * Alterna el estado activo/inactivo de una pregunta.
   * Implementa reversión visual del switch si la operación falla.
   *
   * Registro seleccionado para actualización.
   */
  public conmutarEstadoPregunta(pregunta: any): void {
    const nuevoEstado = !pregunta.activo;

    this.isToggling[pregunta.id] = true;

    const payload = { ...pregunta, activo: nuevoEstado };

    this.preguntaService.actualizarPregunta(pregunta.id, payload).subscribe({
      next: () => {
        pregunta.activo = nuevoEstado;

        this.calcularSumaPesosActivos();

        this.isToggling[pregunta.id] = false;

        this.mostrarToast(
          `Pregunta ${nuevoEstado ? 'activada' : 'inactivada'} correctamente.`,
          'success'
        );
      },
      error: (err) => {
        this.isToggling[pregunta.id] = false;

        /**
         * Restauración manual del estado visual del switch
         * para mantener coherencia con el estado real persistido.
         */
        const checkboxDOM = document.getElementById(
          `switch-${pregunta.id}`
        ) as HTMLInputElement;

        if (checkboxDOM) {
          checkboxDOM.checked = pregunta.activo;
        }

        this.mostrarToast(
          err.error?.message || 'Error al modificar el estado.',
          'error'
        );
      }
    });
  }

  /**
   * Inicializa el modal en modo creación.
   * Configura valores predeterminados para la nueva pregunta.
   */
  public abrirModalCrear(): void {
    this.modalMode = 'CREAR';

    this.preguntaForm.reset({
      peso_porcentaje: 0,
      opA_score: 0,
      opB_score: 3.3,
      opC_score: 6.6,
      opD_score: 10
    });

    this.isModalOpen = true;
  }

  /**
   * Inicializa el modal en modo edición.
   * Carga los datos actuales de la pregunta y sus opciones.
   *
   * Pregunta seleccionada para modificación.
   */
  public abrirModalEditar(pregunta: any): void {
    this.modalMode = 'EDITAR';

    this.idPreguntaEditando = pregunta.id;

    this.preguntaActual = pregunta;
    
    /**
     * Extracción explícita de opciones por literal para
     * garantizar la correcta asociación de datos en el formulario.
     */
    const optA = pregunta.opciones.find((o:any) => o.literal === 'A');
    const optB = pregunta.opciones.find((o:any) => o.literal === 'B');
    const optC = pregunta.opciones.find((o:any) => o.literal === 'C');
    const optD = pregunta.opciones.find((o:any) => o.literal === 'D');

    this.preguntaForm.patchValue({
      texto_pregunta: pregunta.texto_pregunta,
      tipo_categoria: pregunta.tipo_categoria,
      peso_porcentaje: pregunta.peso_porcentaje,

      opA_id: optA?.id,
      opA_texto: optA?.texto_opcion,
      opA_score: optA?.puntaje_riesgo,

      opB_id: optB?.id,
      opB_texto: optB?.texto_opcion,
      opB_score: optB?.puntaje_riesgo,

      opC_id: optC?.id,
      opC_texto: optC?.texto_opcion,
      opC_score: optC?.puntaje_riesgo,

      opD_id: optD?.id,
      opD_texto: optD?.texto_opcion,
      opD_score: optD?.puntaje_riesgo
    });

    this.isModalOpen = true;
  }

  /**
   * Cierra el modal de gestión.
   */
  public cerrarModal(): void {
    this.isModalOpen = false;
  }

  /**
   * Procesa el formulario y decide si se ejecutará
   * una creación o una actualización.
   */
  public guardarFormulario(): void {
    if (this.preguntaForm.invalid) {
      this.preguntaForm.markAllAsTouched();
      return;
    }
    
    this.isSaving = true;

    const form = this.preguntaForm.value;

    /**
     * Transformación del formulario plano hacia la estructura
     * jerárquica requerida por la API REST.
     */
    const payload = {
      texto_pregunta: form.texto_pregunta,
      tipo_categoria: form.tipo_categoria,
      peso_porcentaje: form.peso_porcentaje,
      activo: this.modalMode === 'EDITAR' ? this.preguntaActual.activo : true,
      opciones: [
        { id: form.opA_id, literal: 'A', texto_opcion: form.opA_texto, puntaje_riesgo: form.opA_score },
        { id: form.opB_id, literal: 'B', texto_opcion: form.opB_texto, puntaje_riesgo: form.opB_score },
        { id: form.opC_id, literal: 'C', texto_opcion: form.opC_texto, puntaje_riesgo: form.opC_score },
        { id: form.opD_id, literal: 'D', texto_opcion: form.opD_texto, puntaje_riesgo: form.opD_score }
      ]
    };

    if (this.modalMode === 'CREAR') {
      this.preguntaService.crearPregunta(payload).subscribe({
        next: () => {
          this.finalizarGuardado('Pregunta registrada exitosamente.');
        },
        error: (err) => {
          this.manejarErrorGuardado(err);
        }
      });
    } else {
      this.preguntaService.actualizarPregunta(this.idPreguntaEditando!, payload).subscribe({
        next: () => {
          this.finalizarGuardado('Pregunta y opciones actualizadas.');
        },
        error: (err) => {
          this.manejarErrorGuardado(err);
        }
      });
    }
  }

  /**
   * Ejecuta acciones comunes posteriores a una operación exitosa.
   *
   * Mensaje de confirmación mostrado al usuario.
   */
  private finalizarGuardado(mensaje: string): void {
    this.mostrarToast(mensaje, 'success');

    this.cargarCatalogoPreguntas();

    this.cerrarModal();

    this.isSaving = false;
  }

  /**
   * Centraliza el manejo de errores durante operaciones de persistencia.
   *
   * Error retornado por la API.
   */
  private manejarErrorGuardado(err: any): void {
    this.isSaving = false;

    this.mostrarToast(
      err.error?.message || 'Error de validación al guardar.',
      'error'
    );
  }

  /**
   * Muestra una notificación temporal al usuario.
   *
   * Contenido del mensaje.
   * Tipo visual de la notificación.
   */
  private mostrarToast(mensaje: string, tipo: 'success' | 'error' | any): void {
    this.toastData = {
      show: true,
      message: mensaje,
      type: tipo
    };

    setTimeout(() => this.toastData.show = false, 5000);
  }


}