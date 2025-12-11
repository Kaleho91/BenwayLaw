import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../modules/auth/auth.service';

/**
 * Extract the current authenticated user from the request
 * Usage: @CurrentUser() user: AuthUser
 */
export const CurrentUser = createParamDecorator(
    (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as AuthUser;

        return data ? user?.[data] : user;
    },
);

/**
 * Extract the current firm ID from the authenticated user
 * Usage: @FirmId() firmId: string
 */
export const FirmId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user?.firmId;
    },
);
