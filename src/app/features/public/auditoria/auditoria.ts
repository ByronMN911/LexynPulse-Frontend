import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EvaluationService } from '../../../core/services/evaluation.service';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria.html', 
  styleUrls: ['./auditoria.css']   
})
export class AuditoriaComponent {
  
  private evaluationService = inject(EvaluationService);

  public codigoIngresado: string = '';
  public isLoading: boolean = false;
  
  // Estados de la validación
  public documentoVerificado: any = null;
  public errorVerificacion: string | null = null;

  /*
   * Ejecuta la consulta al backend público para verificar el hash del documento.
   */
  public validarDocumento(): void {
    if (!this.codigoIngresado || this.codigoIngresado.trim() === '') {
      this.errorVerificacion = 'Por favor, ingrese un código de verificación válido.';
      return;
    }

    this.isLoading = true;
    this.errorVerificacion = null;
    this.documentoVerificado = null;

    // Limpiamos espacios accidentales
    const codigoLimpio = this.codigoIngresado.trim();

    this.evaluationService.verificarCodigoPdf(codigoLimpio).subscribe({
      next: (response) => {
        this.isLoading = false;
        // Si el backend devuelve status 200, guardamos los datos para mostrarlos
        this.documentoVerificado = response.datos;
      },
      error: (err) => {
        this.isLoading = false;
        // Si el backend devuelve 404, mostramos el mensaje de error
        this.errorVerificacion = err.error?.mensaje || 'Error de conexión al validar el documento.';
      }
    });
  }

  public limpiarBusqueda(): void {
    this.codigoIngresado = '';
    this.documentoVerificado = null;
    this.errorVerificacion = null;
  }
}