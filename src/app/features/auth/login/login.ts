import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/*
 * Decorador que define este artefacto como un componente Standalone,
 * especificando su configuración visual, dependencias declarativas
 * y recursos asociados para su renderización.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  // Importamos los módulos esenciales requeridos por la vista reactiva
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})

/*
 * Componente responsable de gestionar el proceso de autenticación
 * de usuarios. Controla la captura de credenciales, validaciones
 * del formulario y el flujo de acceso hacia las áreas protegidas.
 */
export class LoginComponent {

  // Inyección funcional moderna de dependencias (Ecosistema Angular 21)
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  /*
   * Formulario reactivo encargado de capturar y validar
   * las credenciales de acceso ingresadas por el usuario.
   */
  public loginForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  /*
   * Almacena los mensajes de error funcionales o de negocio
   * que serán presentados al usuario en la interfaz.
   */
  public errorMessage: string | null = null;

  /*
   * Indicador visual utilizado para controlar el estado de carga
   * durante las operaciones asíncronas de autenticación.
   */
  public isLoading: boolean = false;

  /*
   * Captura el evento de envío del formulario.
   * Valida la estructura del cliente y procesa la solicitud asíncrona hacia el Backend.
   */
  public onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const { correo, password } = this.loginForm.value;

    this.authService.login(correo, password).subscribe({
      next: (response) => {
        // Extrae el rol codificado dentro del nuevo token guardado
        const rol = this.authService.getRolUsuario();
        
        // Enrutamiento inteligente e inmediato según el perfil corporativo verificado
        if (rol === 'ADMINISTRADOR') {
          this.router.navigate(['/admin/dashboard']);
        } else if (rol === 'CLIENTE') {
          this.router.navigate(['/cliente/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        // Captura de forma elegante los mensajes de error arrojados por Node.js (ej: cuenta inactiva)
        this.errorMessage = err.error?.message || 'Ocurrió un error inesperado al conectar con el servidor.';
      }
    });
  }
}