import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { EvaluationService } from '../../../core/services/evaluation.service';

@Component({
  selector: 'app-admin-reporte',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reporte.html',
  styleUrls: ['./reporte.css']
})
export class ReporteComponent implements OnInit {
  private evaluationService = inject(EvaluationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer); // ◄ INYECTADO PARA SEGURIDAD HTML

  public reporte: any = null;
  public isLoading: boolean = true;
  public errorMessage: string | null = null;
  
  // ◄ NUEVA VARIABLE PARA ALMACENAR EL HTML PROCESADO ►
  public htmlInformeIA: SafeHtml = ''; 

  ngOnInit(): void {
    const evaluacionId = this.route.snapshot.paramMap.get('id');
    if (evaluacionId) {
      this.cargarReporte(evaluacionId);
    } else {
      this.volverAlDashboard();
    }
  }

  private cargarReporte(id: string): void {
    // Usamos el endpoint correcto que identificaste
    this.evaluationService.getReporteIndividual(id).subscribe({
      next: (data) => {
        this.reporte = data;
        
        // ◄ SI EXISTE EL TEXTO DE IA, LO CONVERTIMOS A HTML SEGURO ►
        if (this.reporte?.cabecera?.analisis_orientacion_ia) {
          this.htmlInformeIA = this.convertirMarkdownAHtmlSeguro(
            this.reporte.cabecera.analisis_orientacion_ia
          );
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'No se pudo cargar el análisis de esta evaluación.';
        this.isLoading = false;
      }
    });
  }

  /*
   * Reutilizamos el algoritmo de parseo Markdown a HTML Seguro del cliente
   */
  private convertirMarkdownAHtmlSeguro(textoMarkdown: string): SafeHtml {
    if (!textoMarkdown) return '';

    let limpio = textoMarkdown.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '$1');
    limpio = limpio.replace(/\*\*(.*?)\*\*/g, '<strong class="text-highlight">$1</strong>');

    const lineas = limpio.split('\n');
    let htmlResultado = '';
    let dentroDeLista = false;

    lineas.forEach(linea => {
      let l = linea.trim();
      if (!l) return;

      if (l.startsWith('###')) {
        if (dentroDeLista) { htmlResultado += '</ul>'; dentroDeLista = false; }
        const textoTitulo = l.replace(/^###\s+/, '');
        htmlResultado += `<h3 class="report-section-title">${textoTitulo}</h3>`;
      }
      else if (l.startsWith('*') || l.startsWith('-') || l.startsWith('•')) {
        if (!dentroDeLista) { htmlResultado += '<ul class="report-list-container">'; dentroDeLista = true; }
        const textoLi = l.replace(/^[\*\-\•\s]+/, '');
        htmlResultado += `<li class="report-list-item">${textoLi}</li>`;
      }
      else if (/^\d+\.\s+/.test(l)) {
        if (dentroDeLista) { htmlResultado += '</ul>'; dentroDeLista = false; }
        const posColon = l.indexOf(':');
        if (posColon !== -1) {
          const encabezadoTitulo = l.substring(0, posColon + 1).trim();
          const cuerpoDescripcion = l.substring(posColon + 1).trim();
          htmlResultado += `<h4 class="report-subsection-title">${encabezadoTitulo}</h4>`;
          if (cuerpoDescripcion) htmlResultado += `<p class="report-paragraph">${cuerpoDescripcion}</p>`;
        } else {
          htmlResultado += `<h4 class="report-subsection-title">${l}</h4>`;
        }
      }
      else {
        if (dentroDeLista) { htmlResultado += '</ul>'; dentroDeLista = false; }
        htmlResultado += `<p class="report-paragraph">${l}</p>`;
      }
    });

    if (dentroDeLista) htmlResultado += '</ul>';

    return this.sanitizer.bypassSecurityTrustHtml(htmlResultado);
  }

  public volverAlDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}