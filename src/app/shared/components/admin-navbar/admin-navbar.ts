import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; 
import { AuthService } from '../../../core/services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-navbar.html',
  styleUrls: ['./admin-navbar.css']   
})
export class AdminNavbarComponent implements OnInit {
  
  private authService = inject(AuthService);
  private router = inject(Router);

  public nombreAdmin: string = '';

  ngOnInit(): void {
    this.cargarDatosAdministrador();
  }

  private cargarDatosAdministrador(): void {
    const token = this.authService.getToken();

    if (!token) {
      this.cerrarSesion();
      return;
    }

    try {
      const payload: any = jwtDecode(token);
      this.nombreAdmin = payload.nombre || 'Administrador del Sistema';
    } catch (error) {
      this.cerrarSesion();
    }
  }

  public cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}