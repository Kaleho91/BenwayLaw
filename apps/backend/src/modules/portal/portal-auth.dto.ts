import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PortalLoginDto {
    @ApiProperty({ example: 'client@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class PortalLoginResponseDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty()
    client: {
        id: string;
        name: string;
        email: string;
        firmId: string;
        firmName: string;
    };
}

export class EnablePortalDto {
    @ApiProperty({ example: 'password123', minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;
}

export class ResetPortalPasswordDto {
    @ApiProperty({ example: 'newpassword123', minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;
}

export interface PortalJwtPayload {
    sub: string; // client ID
    email: string;
    firmId: string;
    type: 'portal'; // distinguish from admin tokens
}

export interface PortalUser {
    clientId: string;
    email: string;
    firmId: string;
    name: string;
}
