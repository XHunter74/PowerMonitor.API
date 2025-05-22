import { CanActivate, ExecutionContext } from '@nestjs/common';

class RolesGuardInternal implements CanActivate {
    private allowedRoles: string[];

    constructor(allowedRoles: string[]) {
        this.allowedRoles = allowedRoles.map((role) => role.toLowerCase());
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || typeof user.role !== 'string') {
            return false;
        }
        return this.allowedRoles.includes(user.role.toLowerCase());
    }
}

export function RolesGuard(allowedRoles: string[]): CanActivate {
    return new RolesGuardInternal(allowedRoles);
}
