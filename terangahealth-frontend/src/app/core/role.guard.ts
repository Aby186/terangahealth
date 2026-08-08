import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, User } from './auth.service';

export function roleGuard(allowedRoles: User['role'][]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();

    if (!user || !auth.isLoggedIn()) {
      router.navigate(['/connexion']);
      return false;
    }

    if (!allowedRoles.includes(user.role)) {
      router.navigate(['/connexion']);
      return false;
    }

    return true;
  };
}
