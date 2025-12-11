import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PortalAuthService } from './portal-auth.service';
import { PortalLoginDto, PortalLoginResponseDto } from './portal-auth.dto';

@ApiTags('Portal Auth')
@Controller('portal/auth')
export class PortalAuthController {
    constructor(private readonly portalAuthService: PortalAuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Client portal login' })
    @ApiResponse({ status: 200, description: 'Login successful', type: PortalLoginResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials or portal not enabled' })
    async login(@Body() dto: PortalLoginDto): Promise<PortalLoginResponseDto> {
        return this.portalAuthService.login(dto.email, dto.password);
    }
}
