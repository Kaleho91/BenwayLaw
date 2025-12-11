import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../../modules/auth/auth.service';

export const ROLES_KEY = 'roles';

/**
 * Role-based access control guard
 * Usage: @Roles('admin', 'lawyer') on controller or handler
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true; // No roles required
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
        }

        return true;
    }
}
