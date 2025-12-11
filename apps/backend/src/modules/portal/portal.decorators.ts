import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PortalUser } from './portal-auth.dto';

/**
 * Decorator to extract the portal client from the request
 */
export const PortalClient = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): PortalUser => {
        const request = ctx.switchToHttp().getRequest();
        return request.user as PortalUser;
    },
);

/**
 * Decorator to extract just the client ID
 */
export const ClientId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        return request.user?.clientId;
    },
);
