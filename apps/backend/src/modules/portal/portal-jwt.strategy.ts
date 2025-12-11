import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PortalAuthService } from './portal-auth.service';
import { PortalJwtPayload, PortalUser } from './portal-auth.dto';

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
    constructor(
        configService: ConfigService,
        private readonly portalAuthService: PortalAuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET', 'dev-secret-change-me'),
        });
    }

    async validate(payload: PortalJwtPayload): Promise<PortalUser> {
        // Validate that this is a portal token
        if (payload.type !== 'portal') {
            throw new UnauthorizedException('Invalid token type');
        }

        const user = await this.portalAuthService.validatePortalToken(payload);
        if (!user) {
            throw new UnauthorizedException('Portal access denied');
        }
        return user;
    }
}
