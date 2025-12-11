import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterFirmDto, LoginDto, AuthResponseDto } from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new firm with admin user' })
    @ApiResponse({ status: 201, description: 'Firm registered successfully', type: AuthResponseDto })
    @ApiResponse({ status: 409, description: 'Email or firm name already exists' })
    async register(@Body() dto: RegisterFirmDto): Promise<AuthResponseDto> {
        const result = await this.authService.registerFirm(dto);
        return {
            accessToken: result.accessToken,
            expiresIn: 900, // 15 minutes
            user: result.user,
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
        const result = await this.authService.login(dto);
        return {
            accessToken: result.accessToken,
            expiresIn: 900,
            user: result.user,
        };
    }
}
