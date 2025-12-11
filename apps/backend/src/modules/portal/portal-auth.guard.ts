import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PortalAuthGuard extends AuthGuard('portal-jwt') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }
}
