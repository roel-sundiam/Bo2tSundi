import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  navLinks = [
    { path: '/dashboard', label: 'Overview', icon: 'dashboard' },
    { path: '/visits',    label: 'Visits',   icon: 'visibility' },
    { path: '/logins',    label: 'Logins',   icon: 'person' },
    { path: '/reports',   label: 'Reports',  icon: 'insights' },
  ];
}
