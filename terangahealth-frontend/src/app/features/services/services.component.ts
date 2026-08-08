import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicesService, ServiceMedical } from '../../core/services.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css',
})
export class ServicesComponent implements OnInit {
  private servicesService = inject(ServicesService);

  services = signal<ServiceMedical[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  private accents = ['accent-teal', 'accent-coral', 'accent-violet', 'accent-gold'];

  ngOnInit(): void {
    this.servicesService.getServices().subscribe({
      next: (data) => {
        this.services.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les services.');
        this.loading.set(false);
      },
    });
  }

  accentClass(index: number): string {
    return this.accents[index % this.accents.length];
  }

  iconPath(nom: string): string {
    const n = nom.toLowerCase();
    if (n.includes('cardio')) return 'M12 21s-7-4.4-9.5-9C.7 8.4 2.4 5 6 5c2 0 3.4 1 4.5 2.4C11.6 6 13 5 15 5c3.6 0 5.3 3.4 3.5 7-2.5 4.6-9.5 9-9.5 9z';
    if (n.includes('dermato')) return 'M12 2a9 9 0 00-9 9c0 4 2.5 6.5 5 8.5.8.6 1.6 1 2.5 1.5.9-.5 1.7-.9 2.5-1.5 2.5-2 5-4.5 5-8.5a9 9 0 00-9-9z';
    if (n.includes('pédiatr')) return 'M9 12a3 3 0 106 0 3 3 0 00-6 0zM5 8a3 3 0 016 0M13 8a3 3 0 016 0M6 21c0-4 2.7-6 6-6s6 2 6 6';
    if (n.includes('diabéto')) return 'M12 2.5c-2 4-6 8.3-6 12a6 6 0 0012 0c0-3.7-4-8-6-12z';
    if (n.includes('orl')) return 'M4 6a2 2 0 012-2h3l2 4-1.5 1.5a11 11 0 006 6L17 14l4 2v3a2 2 0 01-2 2C10.5 21 4 14.5 4 6z';
    if (n.includes('gastro')) return 'M8 3v6a4 4 0 004 4 4 4 0 004-4V3M8 3H6M16 3h2M12 13v8';
    return 'M12 21s-7-4.4-9.5-9C.7 8.4 2.4 5 6 5c2 0 3.4 1 4.5 2.4C11.6 6 13 5 15 5c3.6 0 5.3 3.4 3.5 7-2.5 4.6-9.5 9-9.5 9z';
  }
}