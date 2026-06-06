import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environmet'; 

/*
 * Decorador de Angular que registra este servicio en el inyector
 * raíz de dependencias (root), permitiendo una única instancia
 * compartida en toda la aplicación.
 */
@Injectable({
  providedIn: 'root'
})

/*
 * Servicio responsable de la autenticación y gestión de sesiones
 * de usuario mediante JWT. Centraliza las operaciones de inicio
 * de sesión, cierre de sesión y consulta del estado de autenticación.
 */
export class AuthService {

  /*
   * URL base apuntando al módulo de autenticación expuesto
   * por el backend Node.js.
   */
  private apiUrl = environment.apiUrl;
  
  /*
   * Flujo reactivo que mantiene y distribuye el estado actual
   * de autenticación a los componentes suscritos.
   */
  private authStatusSubject = new BehaviorSubject<boolean>(this.hasToken());

  /*
   * Inyección del cliente HTTP de Angular para realizar
   * solicitudes al backend mediante los servicios REST.
   */
  constructor(private http: HttpClient) {}

  /*
   * Envía las credenciales al backend, si la respuesta es exitosa,
   * almacena el token JWT en el localStorage y actualiza los flujos
   * reactivos de autenticación.
   */
  login(correo: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { correo, password }).pipe(
      tap(response => {
        if (response && response.token) {
          localStorage.setItem('access_token', response.token);
          localStorage.setItem('user_info', JSON.stringify(response.usuario));
          this.authStatusSubject.next(true);
        }
      })
    );
  }

  /*
   * Elimina las credenciales del almacenamiento local y notifica
   * a toda la aplicación el cierre de sesión inmediato.
   */
  logout(): void {
    localStorage.removeItem('access_token');
    this.authStatusSubject.next(false);
  }

  /*
   * Comprueba la existencia física del token almacenado
   * en el navegador del cliente.
   */
  hasToken(): boolean {
    return !!localStorage.getItem('access_token');
  }

  /*
   * Recupera el token JWT almacenado para su utilización
   * en procesos de autorización o validación.
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /*
   * Decodifica el payload del token JWT para obtener
   * el rol asignado al usuario autenticado.
   */
  getRolUsuario(): string | null {
    const token = this.getToken();

    if (!token) return null;

    try {
      const payload: any = jwtDecode(token);
      return payload.rol || null;
    } catch (error) {
      return null;
    }
  }

  /*
   * Registra un nuevo usuario en la plataforma.
   * Backend: POST /api/auth/register
   */
  registrarCliente(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, payload);
  }

  /*
   * Recupera el catálogo completo de representantes legales y empresas.
   * Backend: GET /api/auth/clientes
   */
  obtenerClientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/auth/clientes`);
  }

  /*
   * Modifica la información general y/o el estado de acceso de un cliente existente.
   * Backend: PUT /api/auth/clientes/:id
   */
  actualizarCliente(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/clientes/${id}`, payload);
  }

  
}