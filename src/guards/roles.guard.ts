// src/auth/roles.guard.ts
import { CanActivate, ExecutionContext } from '@nestjs/common';

class RolesGuardInternal implements CanActivate {
    private allowedRoles: string[];

    constructor(allowedRoles: string[]) {
        this.allowedRoles = allowedRoles.map(role => role.toLowerCase());
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        return user && this.allowedRoles.includes(user.role.toLowerCase());
    }
}

export function RolesGuard(allowedRoles: string[]): CanActivate {
    return new RolesGuardInternal(allowedRoles);
}