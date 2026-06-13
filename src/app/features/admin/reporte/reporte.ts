import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { EvaluationService } from '../../../core/services/evaluation.service';

// IMPORTACIÓN NECESARIA
import { jsPDF } from 'jspdf';

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
  private sanitizer = inject(DomSanitizer);

  public reporte: any = null;
  public isLoading: boolean = true;
  public errorMessage: string | null = null;
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
    this.evaluationService.getReporteIndividual(id).subscribe({
      next: (data) => {
        this.reporte = data;
        
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

  // ==========================================================================
  // NUEVO MÉTODO PARA EL ADMINISTRADOR
  // ==========================================================================
  public descargarPdf(): void {
    if (!this.reporte || !this.reporte.cabecera) return;

    this.isLoading = true;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 15;
    let currentY = 20;

    // Extraemos las variables del objeto padre 'reporte'
    const cabecera = this.reporte.cabecera;
    const top3Riesgos = this.reporte.top3Riesgos || [];

    const cryptoToken = cabecera.codigo_verificacion || 'CÓDIGO NO DISPONIBLE';
    const baseId = cabecera.id ? cabecera.id.substring(0, 8).toUpperCase() : 'LXP0607';

    const drawPageDecorations = (pageNum: number, totalPages: number) => {
      pdf.setDrawColor(31, 58, 138); 
      pdf.setLineWidth(1);
      pdf.line(marginX, 12, pageWidth - marginX, 12); 

      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(31, 58, 138);
      pdf.text('LEXYN PULSE PRO', marginX, 17);

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text('MATRIZ DE TELEMETRÍA GLOBAL Y AUDITORÍA NATIVA', marginX, 21);
      pdf.text(`EMISIÓN: ${new Date().toLocaleDateString('es-EC')}`, pageWidth - marginX - 45, 17);

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.2);
      pdf.line(marginX, 24, pageWidth - marginX, 24);

      pdf.setDrawColor(226, 232, 240);
      pdf.line(marginX, pageHeight - 15, pageWidth - marginX, pageHeight - 15);

      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Código de Verificación Criptográfica: ${cryptoToken} | Documento Digital Conforme a la LODPD Ecuador.`, marginX, pageHeight - 11);
      
      const pageText = `Pág. ${pageNum} de ${totalPages}`;
      pdf.text(pageText, pageWidth - marginX - 15, pageHeight - 11);
    };

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - 22) {
        pdf.addPage();
        currentY = 32; 
      }
    };

    currentY = 32;
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(15, 23, 42);
    pdf.text('INFORME TÉCNICO DE CUMPLIMIENTO NORMATIVO', marginX, currentY);
    
    currentY += 6;
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Evaluación automatizada bajo las disposiciones de la Ley Orgánica de Protección de Datos Personales', marginX, currentY);

    currentY += 8;
    checkPageBreak(30);
    pdf.setDrawColor(203, 213, 225);
    pdf.setFillColor(248, 250, 252);
    pdf.rect(marginX, currentY, pageWidth - (marginX * 2), 24, 'FD'); 

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(51, 65, 85);
    pdf.text('Organización Evaluada:', marginX + 4, currentY + 6);
    pdf.text('Nivel de Riesgo:', marginX + 4, currentY + 12);
    pdf.text('Solución Asignada:', marginX + 4, currentY + 18);

    pdf.setFont('Helvetica', 'normal');
    pdf.text(cabecera.usuario_empresa_nombre || 'Organización', marginX + 45, currentY + 6);
    
    const riesgoStr = (cabecera.nivel_riesgo || 'MEDIO').toUpperCase();
    pdf.setFont('Helvetica', 'bold');
    if (riesgoStr === 'ALTO' || riesgoStr === 'CRÍTICO' || riesgoStr === 'CRITICO') {
      pdf.setTextColor(185, 28, 28); 
    } else if (riesgoStr === 'MEDIO') {
      pdf.setTextColor(217, 119, 6); 
    } else {
      pdf.setTextColor(21, 128, 61); 
    }
    pdf.text(riesgoStr, marginX + 45, currentY + 12);

    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Suite Lexyn ${cabecera.producto_recomendado || 'Pro + Care'}`, marginX + 45, currentY + 18);

    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`ID Evaluación: ${baseId}`, pageWidth - marginX - 45, currentY + 6);

    currentY += 32;
    checkPageBreak(40);
    
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(31, 58, 138);
    pdf.text('1. MATRIZ DE BRECHAS CRÍTICAS DETECTADAS', marginX, currentY);
    
    currentY += 6;
    pdf.setFillColor(31, 58, 138);
    pdf.rect(marginX, currentY, pageWidth - (marginX * 2), 7, 'F');
    
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text('ID', marginX + 2, currentY + 5);
    pdf.text('Categoría Normativa', marginX + 12, currentY + 5);
    pdf.text('Componente de Riesgo Operativo', marginX + 60, currentY + 5);
    pdf.text('Severidad', pageWidth - marginX - 22, currentY + 5);

    currentY += 7;

    top3Riesgos.forEach((riesgo: any, index: number) => {
      const textWidthMax = 85; 
      const líneasPregunta = pdf.splitTextToSize(riesgo.texto_pregunta || '', textWidthMax);
      const numeroDeLineas = líneasPregunta.length;
      const rowHeight = numeroDeLineas > 1 ? 12 + (numeroDeLineas * 4) : 15;
      
      checkPageBreak(rowHeight + 4);
      
      if (index % 2 === 0) {
        pdf.setFillColor(241, 245, 249);
        pdf.rect(marginX, currentY, pageWidth - (marginX * 2), rowHeight, 'F');
      }

      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(51, 65, 85);
      pdf.text(`0${index + 1}`, marginX + 2, currentY + 6);

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(riesgo.tipo_categoria || 'Legal', marginX + 12, currentY + 6);

      pdf.text(líneasPregunta, marginX + 60, currentY + 5);

      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(185, 28, 28);
      
      // Ajuste para leer el puntaje de la misma forma que en el HTML del admin
      const notaFinal = riesgo.puntaje_riesgo_momento ?? riesgo.puntaje ?? 0;
      pdf.text(`${notaFinal}.0/10`, pageWidth - marginX - 20, currentY + 6);

      pdf.setFont('Helvetica', 'italic');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      const opcionCorta = riesgo.texto_opcion ? (riesgo.texto_opcion.substring(0, 70) + '...') : '';
      
      const opcionY = currentY + rowHeight - 3;
      pdf.text(`Respuesta: ${opcionCorta}`, marginX + 12, opcionY);

      currentY += rowHeight;
    });

    currentY += 8;
    checkPageBreak(25);

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(31, 58, 138);
    pdf.text('2. INFORME DE ORIENTACIÓN EJECUTIVO', marginX, currentY);
    
    currentY += 6;

    if (cabecera.analisis_orientacion_ia) {
      const lineasRaw = cabecera.analisis_orientacion_ia.split('\n');
      pdf.setTextColor(15, 23, 42);

      lineasRaw.forEach((lineaStr: string) => {
        let l = lineaStr.trim();
        if (!l) return;

        if (l.startsWith('###')) {
          currentY += 4;
          checkPageBreak(10);
          const tituloLimpio = l.replace(/^###\s+/, '').replace(/\*\*/g, '');
          pdf.setFont('Helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(31, 58, 138);
          pdf.text(tituloLimpio, marginX, currentY);
          currentY += 5;
        } 
        else if (l.startsWith('*') || l.startsWith('-') || l.startsWith('•')) {
          checkPageBreak(8);
          const viñetaLimpia = l.replace(/^[\*\-\•\s]+/, '').replace(/\*\*/g, '');
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(51, 65, 85);
          
          const lineasViñeta = pdf.splitTextToSize(`•  ${viñetaLimpia}`, pageWidth - (marginX * 2) - 4);
          lineasViñeta.forEach((lineaSplit: string) => {
            checkPageBreak(5);
            pdf.text(lineaSplit, marginX + 4, currentY);
            currentY += 4.5;
          });
        } 
        else {
          currentY += 2;
          checkPageBreak(8);
          const parrafoLimpio = l.replace(/\*\*/g, ''); 
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(51, 65, 85);

          const lineasParrafo = pdf.splitTextToSize(parrafoLimpio, pageWidth - (marginX * 2));
          lineasParrafo.forEach((lineaSplit: string) => {
            checkPageBreak(5);
            pdf.text(lineaSplit, marginX, currentY);
            currentY += 4.5;
          });
          currentY += 1.5;
        }
      });
    }

    const totalPages = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      drawPageDecorations(i, totalPages);
    }

    pdf.save(`Informe_Auditoria_LODPD_${cabecera.usuario_empresa_nombre ? cabecera.usuario_empresa_nombre.replace(/\s+/g, '_') : 'LexynPulse'}.pdf`);
    
    this.isLoading = false;
  }
}