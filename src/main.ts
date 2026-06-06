//zone.js es un requisito fundamental para el funcionamiento de Angular, ya que gestiona el contexto de ejecución y la detección de cambios. Sin esta importación, Angular no puede actualizar la vista correctamente, lo que resulta en el error NG0908. Asegurarse de incluir esta línea al inicio del archivo main.ts es crucial para levantar la aplicación sin problemas.
import 'zone.js'; // LÍNEA CRUCIAL: Soluciona el error NG0908 y levanta la pantalla
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
