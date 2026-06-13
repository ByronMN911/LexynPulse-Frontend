import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdminNavbarComponent } from '../../../shared/components/admin-navbar/admin-navbar';

/*
 * Decorador que registra este artefacto como un componente Standalone,
 * definiendo los módulos requeridos por la interfaz, la plantilla HTML
 * asociada y la hoja de estilos responsable de su presentación visual.
 */
@Component({
  selector: 'app-admin-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminNavbarComponent],
  templateUrl: './clientes.html',
  styleUrls: ['./clientes.css']
})

/*
 * Componente administrativo encargado de gestionar el ciclo de vida
 * de las cuentas corporativas registradas en la plataforma.
 * Permite consultar, crear, editar, activar y suspender clientes
 * mediante operaciones integradas con el backend.
 */
export class ClientesComponent implements OnInit {
  
  // Inyecciones funcionales de dependencias mediante la arquitectura Standalone
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);


  /*
   * Directorio completo de clientes corporativos recuperado desde
   * la base de datos para su representación en la interfaz.
   */
  public clientes: any[] = [];
  
  /*
   * Bandera reactiva utilizada para controlar estados de carga
   * durante operaciones de consulta al backend.
   */
  public isLoading: boolean = true;

  /*
   * Contenedor para mensajes de error funcionales o técnicos
   * producidos durante operaciones asíncronas.
   */
  public errorMessage: string | null = null;

  /*
   * Estructura de control que permite identificar qué registros
   * se encuentran ejecutando una operación de activación o suspensión.
   */
  public isToggling: { [id: string]: boolean } = {}; 

  // ==========================================================================
  // ESTADO DEL MODAL CRUD Y NOTIFICACIONES
  // ==========================================================================

  /*
   * Controla la visibilidad del modal utilizado para crear
   * o editar registros de clientes corporativos.
   */
  public isModalOpen: boolean = false;

  /*
   * Determina el modo operativo actual del formulario:
   * creación de un nuevo cliente o edición de uno existente.
   */
  public modalMode: 'CREAR' | 'EDITAR' = 'CREAR';

  /*
   * Formulario reactivo encargado de capturar y validar
   * la información administrativa de los clientes.
   */
  public clienteForm: FormGroup;

  /*
   * Identificador del cliente actualmente seleccionado
   * para edición dentro del modal.
   */
  public idClienteEditando: string | null = null;

  /*
   * Bandera utilizada para prevenir múltiples envíos
   * simultáneos durante operaciones de persistencia.
   */
  public isSaving: boolean = false;

  /*
   * Estructura centralizada para la gestión de notificaciones
   * visuales tipo Toast dentro de la interfaz.
   */
  public toastData: {
    show: boolean,
    message: string,
    type: 'success' | 'error'
  } = {
    show: false,
    message: '',
    type: 'success'
  };

  constructor() {

    // Inicialización del formulario reactivo con validaciones base
    this.clienteForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/)]],      empresa_nombre: ['', Validators.required],
      empresa_tamano: ['', Validators.required],
      empresa_sector: ['', Validators.required]
    });
  }

  /*
   * Hook del ciclo de vida ejecutado automáticamente al
   * instanciar el componente dentro del árbol Angular.
   */
  ngOnInit(): void {
    this.cargarDirectorioClientes();
  }


  /*
   * Recupera desde el backend el catálogo completo de clientes
   * registrados dentro del ecosistema corporativo.
   */
  private cargarDirectorioClientes(): void {
    this.isLoading = true;

    this.authService.obtenerClientes().subscribe({
      next: (data) => {
        this.clientes = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;

        this.errorMessage =
          'No se pudo conectar con el catálogo de cuentas corporativas.';

        console.error('QA Log Senior [Carga Clientes]:', err);
      }
    });
  }

  // ==========================================================================
  // LÓGICA DEL INTERRUPTOR (TOGGLE)
  // ==========================================================================

  /*
   * Gestiona el cambio de estado operativo de una cuenta corporativa,
   * permitiendo activar o suspender el acceso de un cliente.
   */
  public conmutarEstadoAcesso(cliente: any): void {

    // Calcula el nuevo estado objetivo del registro
    const nuevoEstado = !cliente.activo;

    // Activa el indicador visual asociado al registro
    this.isToggling[cliente.id] = true;

    // Enviamos el objeto completo fusionado con el nuevo estado
    const payloadActualizacion = {
      ...cliente,
      activo: nuevoEstado
    };

    this.authService.actualizarCliente(cliente.id, payloadActualizacion).subscribe({
      next: () => {

        // Refleja el cambio confirmado por el backend
        cliente.activo = nuevoEstado;

        this.isToggling[cliente.id] = false;

        this.mostrarToast(
          `Acceso ${nuevoEstado ? 'activado' : 'suspendido'} para ${cliente.empresa_nombre}`,
          'success'
        );
      },
      error: (err) => {

        this.isToggling[cliente.id] = false;

        console.error(
          'Error transaccional al suspender/activar cuenta:',
          err
        );

        // Revierte el estado visual para mantener consistencia con el backend
        cliente.activo = !nuevoEstado;

        this.mostrarToast(
          'Incidente de red: No se pudo modificar el estado de acceso del cliente.',
          'error'
        );
      }
    });
  }

  // ==========================================================================
  // GESTIÓN DEL MODAL (CREAR / EDITAR)
  // ==========================================================================

  /*
   * Conserva una copia del cliente actualmente seleccionado
   * para preservar información crítica durante la edición.
   */
  public clienteActual: any = null; 

  /*
   * Inicializa el modal en modo creación y prepara el formulario
   * para el registro de una nueva cuenta corporativa.
   */
  public abrirModalCrear(): void {

    this.modalMode = 'CREAR';
    this.idClienteEditando = null;
    this.clienteActual = null;

    this.clienteForm.reset();
    
    // Habilita las validaciones obligatorias de contraseña
    this.clienteForm.get('password')?.setValidators([
      Validators.required,
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/)
    ]);

    this.clienteForm.get('password')?.updateValueAndValidity();
    
    this.isModalOpen = true;
  }

  /*
   * Inicializa el modal en modo edición y precarga la información
   * existente del cliente seleccionado.
   */
  public abrirModalEditar(cliente: any): void {

    this.modalMode = 'EDITAR';
    this.idClienteEditando = cliente.id;

    // Conservamos una referencia del estado actual del cliente
    this.clienteActual = cliente;
    
    // La contraseña deja de ser obligatoria durante la edición
    this.clienteForm.get('password')?.clearValidators();
    this.clienteForm.get('password')?.updateValueAndValidity();

    // Hidratación del formulario con los datos existentes
    this.clienteForm.patchValue({
      nombre_completo: cliente.nombre_completo,
      correo: cliente.correo,
      password: '',
      empresa_nombre: cliente.empresa_nombre,
      empresa_tamano: cliente.empresa_tamano,
      empresa_sector: cliente.empresa_sector
    });
    
    this.isModalOpen = true;
  }

  /*
   * Cierra el modal activo sin ejecutar operaciones adicionales.
   */
  public cerrarModal(): void {
    this.isModalOpen = false;
  }

  /*
   * Procesa el envío del formulario y determina si la operación
   * corresponde a la creación o actualización de un cliente.
   */
  public guardarCliente(): void {

    // Validación preventiva del formulario reactivo
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    const formData = this.clienteForm.value;
    const payload: any = { ...formData };

    if (this.modalMode === 'CREAR') {

      // Inyección de valores obligatorios para nuevos registros
      payload.rol_id = 2;
      payload.activo = true;

      this.authService.registrarCliente(payload).subscribe({
        next: () => {

          this.mostrarToast(
            'Cliente corporativo creado exitosamente.',
            'success'
          );

          this.cargarDirectorioClientes();
          this.cerrarModal();

          this.isSaving = false;
        },
        error: (err) => {

          this.isSaving = false;

          this.mostrarToast(
            err.error?.message || 'Error al registrar el cliente.',
            'error'
          );
        }
      });

    } else {

      // FLUJO DE EDICIÓN 

      if (!payload.password) {
        delete payload.password;
      }
      
      // Conserva el estado real del usuario durante la actualización
      payload.activo = this.clienteActual.activo;

      this.authService.actualizarCliente(this.idClienteEditando!, payload).subscribe({
        next: () => {

          this.mostrarToast(
            'Información actualizada correctamente.',
            'success'
          );

          this.cargarDirectorioClientes();
          this.cerrarModal();

          this.isSaving = false;
        },
        error: (err) => {

          this.isSaving = false;

          this.mostrarToast(
            err.error?.message || 'Error al actualizar el cliente.',
            'error'
          );
        }
      });
    }
  }

  // ==========================================================================
  // UX: TOAST NOTIFICATIONS 
  // ==========================================================================

  /*
   * Genera una notificación temporal en pantalla para informar
   * el resultado de una operación al usuario administrador.
   */
  private mostrarToast(
    mensaje: string,
    tipo: 'success' | 'error'
  ): void {

    this.toastData = {
      show: true,
      message: mensaje,
      type: tipo
    };

    // Auto-destrucción automática del Toast tras cuatro segundos
    setTimeout(() => {
      this.toastData.show = false;
    }, 4000);
  }


  
  
}