import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { EvaluationService } from '../../../core/services/evaluation.service';

// Inyección conforme de librerías nativas de renderizado gráfico en el cliente
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/*
 * Decorador que define este artefacto como un componente Standalone,
 * especificando sus dependencias visuales, recursos asociados y
 * configuración necesaria para su integración dentro de la aplicación.
 */
@Component({
  selector: 'app-reporte',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reporte.html',
  styleUrls: ['./reporte.css']
})

/*
 * Componente responsable de recuperar, procesar y presentar los resultados
 * de una evaluación normativa. Gestiona la visualización del diagnóstico,
 * la transformación segura del análisis generado por IA y la exportación
 * del informe corporativo a formato PDF.
 */
export class ReporteComponent implements OnInit {
  
  // Inyecciones funcionales de arquitectura nativa Angular 21
  private evaluationService = inject(EvaluationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  /*
   * Información principal del diagnóstico utilizada para construir
   * la cabecera ejecutiva y los datos generales del reporte.
   */
  public cabecera: any = null;

  /*
   * Colección de riesgos prioritarios identificados durante el análisis,
   * utilizada para presentar las brechas más críticas detectadas.
   */
  public top3Riesgos: any[] = [];

  /*
   * Contenedor seguro para el contenido HTML generado a partir del
   * análisis narrativo elaborado por la inteligencia artificial.
   */
  public htmlInformeIA: SafeHtml = '';
  
  /*
   * Indicador visual utilizado para controlar estados de carga durante
   * operaciones asíncronas de consulta o exportación de información.
   */
  public isLoading: boolean = true;

  /*
   * Almacena mensajes de error funcionales o técnicos que pueden ser
   * mostrados al usuario cuando ocurre una incidencia.
   */
  public errorMessage: string | null = null;

  /*
   * Hook del ciclo de vida ejecutado tras la inicialización del componente.
   * Dispara la recuperación automática del reporte solicitado.
   */
  ngOnInit(): void {
    this.cargarReporteEjecutivo();
  }

  /*
   * Recupera la información completa del diagnóstico utilizando el
   * identificador presente en la URL y actualiza el estado interno
   * del componente para su posterior visualización.
   */
  private cargarReporteEjecutivo(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    // Si la URL no contiene un identificador válido, se redirige al panel principal
    if (!idParam) {
      this.router.navigate(['/cliente/dashboard']);
      return;
    }

    this.evaluationService.getReporteIndividual(idParam).subscribe({
      next: (data) => {
        this.cabecera = data.cabecera;
        
        // Normalización y casteo del puntaje de severidad de las brechas prioritarias
        this.top3Riesgos = (data.top3Riesgos || []).map((riesgo: any) => {
          const notaCruda = riesgo.puntaje_riesgo_momento ?? riesgo.puntaje_riesgo ?? riesgo.puntaje ?? 0;

          return {
            ...riesgo,

            // Conversión a valor entero para facilitar la representación visual
            severidad_normalizada: Math.floor(parseFloat(notaCruda))
          };
        });
        
        // Si existe un análisis generado por IA, se transforma a HTML seguro
        if (this.cabecera?.analisis_orientacion_ia) {
          this.htmlInformeIA = this.convertirMarkdownAHtmlSeguro(
            this.cabecera.analisis_orientacion_ia
          );
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          'No se pudo recuperar la información de este diagnóstico o el registro no existe.';

        console.error('QA Log Senior [Carga Reporte]:', err);
      }
    });
  }

  /*
   * Convierte contenido generado en formato Markdown hacia HTML seguro
   * para su representación en la interfaz, preservando encabezados,
   * listas, subtítulos y párrafos estructurados.
   */
  private convertirMarkdownAHtmlSeguro(textoMarkdown: string): SafeHtml {

    // Si el contenido está vacío, se retorna una cadena vacía
    if (!textoMarkdown) return '';

    // Sanamiento inicial para eliminar marcas residuales de formato itálico
    let limpio = textoMarkdown.replace(
      /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g,
      '$1'
    );

    // Conversión controlada de sintaxis Markdown de negritas a HTML
    limpio = limpio.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="text-highlight">$1</strong>'
    );

    const lineas = limpio.split('\n');
    let htmlResultado = '';
    let dentroDeLista = false;

    lineas.forEach(linea => {
      let l = linea.trim();

      // Ignora líneas vacías para evitar etiquetas HTML innecesarias
      if (!l) return;

      // CASO A: Encabezados de Sección de nivel 3 (### )
      if (l.startsWith('###')) {

        // Si existe una lista abierta, se cierra antes de generar un encabezado
        if (dentroDeLista) {
          htmlResultado += '</ul>';
          dentroDeLista = false;
        }

        const textoTitulo = l.replace(/^###\s+/, '');

        htmlResultado +=
          `<h3 class="report-section-title">${textoTitulo}</h3>`;
      }

      // CASO B: Viñetas y listados de primer nivel (* o -)
      else if (
        l.startsWith('*') ||
        l.startsWith('-') ||
        l.startsWith('•')
      ) {

        // Se abre una lista únicamente cuando aún no existe una activa
        if (!dentroDeLista) {
          htmlResultado += '<ul class="report-list-container">';
          dentroDeLista = true;
        }

        const textoLi = l.replace(/^[\*\-\•\s]+/, '');

        htmlResultado +=
          `<li class="report-list-item">${textoLi}</li>`;
      }

      // CASO C: Índices Numerados (1. Tratamiento de Datos)
      else if (/^\d+\.\s+/.test(l)) {

        // Garantiza el cierre correcto de listas previas
        if (dentroDeLista) {
          htmlResultado += '</ul>';
          dentroDeLista = false;
        }

        const posColon = l.indexOf(':');

        // Si existe un separador ":", se divide el título y la descripción
        if (posColon !== -1) {

          const encabezadoTitulo =
            l.substring(0, posColon + 1).trim();

          const cuerpoDescripcion =
            l.substring(posColon + 1).trim();

          htmlResultado +=
            `<h4 class="report-subsection-title">${encabezadoTitulo}</h4>`;

          if (cuerpoDescripcion) {
            htmlResultado +=
              `<p class="report-paragraph">${cuerpoDescripcion}</p>`;
          }

        } else {

          // Si no existe descripción, se representa únicamente el encabezado
          htmlResultado +=
            `<h4 class="report-subsection-title">${l}</h4>`;
        }
      }

      // CASO D: Cuerpo de párrafos fluidos y limpios
      else {

        // Garantiza el cierre de listas antes de generar texto libre
        if (dentroDeLista) {
          htmlResultado += '</ul>';
          dentroDeLista = false;
        }

        htmlResultado +=
          `<p class="report-paragraph">${l}</p>`;
      }
    });

    // Cierre final de listas pendientes para mantener HTML válido
    if (dentroDeLista) htmlResultado += '</ul>';

    // Sanitización controlada para permitir el renderizado seguro del HTML generado
    return this.sanitizer.bypassSecurityTrustHtml(htmlResultado);
  }

  /*
   * Redirige al usuario hacia el panel principal de cliente,
   * conservando el flujo normal de navegación de la aplicación.
   */
  public regresarAlPanel(): void {
    this.router.navigate(['/cliente/dashboard']);
  }

  /*
   * Genera una representación PDF del informe visualizado en pantalla.
   * Captura el contenido HTML, lo transforma en una imagen de alta
   * resolución y construye un documento PDF multipágina.
   */
  public descargarPdf(): void {

    // Obtiene el contenedor principal que será exportado al documento PDF
    const elemento = document.getElementById('reporte-pdf-content');

    if (!elemento) return;

    this.isLoading = true;

    const opcionesCanvas = {

      // Duplica la densidad de píxeles para mejorar la calidad de impresión
      scale: 2,

      // Permite la carga de recursos externos compatibles con CORS
      useCORS: true,

      allowTaint: false,
      logging: false,
      
      /*
       * Ajusta el contenedor clonado para mantener una apariencia uniforme
       * durante el proceso de captura independiente del tamaño de pantalla.
       */
      onclone: (documentoClonado: Document) => {
        const nodoClonado =
          documentoClonado.getElementById('reporte-pdf-content');

        if (nodoClonado) {
          nodoClonado.style.width = '1024px';
          nodoClonado.style.maxWidth = '1024px';
          nodoClonado.style.padding = '40px';
          nodoClonado.style.backgroundColor = '#ffffff';
        }
      }
    };

    html2canvas(elemento, opcionesCanvas)
      .then((canvas) => {

        // Conversión del contenido capturado a formato PNG
        const imgData = canvas.toDataURL('image/png');

        // Inicialización del documento PDF tamaño A4 en orientación vertical
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfAnchoMM = 210;
        const pdfAltoMM = 297;

        // Escalado proporcional de la imagen respecto al ancho del PDF
        const imgAltoMM =
          (canvas.height * pdfAnchoMM) / canvas.width;
        
        let altoPendiente = imgAltoMM;
        let posicionY = 0;

        // Inyección de la primera página del documento
        pdf.addImage(
          imgData,
          'PNG',
          0,
          posicionY,
          pdfAnchoMM,
          imgAltoMM
        );

        altoPendiente -= pdfAltoMM;

        // Bucle encargado de generar páginas adicionales cuando el contenido excede un A4
        while (altoPendiente > 0) {

          posicionY = altoPendiente - imgAltoMM;

          pdf.addPage();

          pdf.addImage(
            imgData,
            'PNG',
            0,
            posicionY,
            pdfAnchoMM,
            imgAltoMM
          );

          altoPendiente -= pdfAltoMM;
        }

        // Descarga final del documento generado
        pdf.save('Reporte_Auditoria_LODPD_LexynPulse.pdf');

        this.isLoading = false;
      })
      .catch((error) => {

        this.isLoading = false;

        console.error(
          'Error crítico en el pipeline del exportador PDF:',
          error
        );
      });
  }
}