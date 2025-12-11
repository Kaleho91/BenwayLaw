import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterFirmDto {
    @ApiProperty({ example: 'Smith & Associates LLP' })
    @IsNotEmpty()
    @IsString()
    firmName: string;

    @ApiPropertyOptional({ example: 'ON', description: 'Canadian province code' })
    @IsOptional()
    @IsString()
    province?: string;

    @ApiProperty({ example: 'admin@smithlaw.ca' })
    @IsEmail()
    adminEmail: string;

    @ApiProperty({ example: 'securePassword123', minLength: 8 })
    @IsNotEmpty()
    @MinLength(8)
    adminPassword: string;

    @ApiProperty({ example: 'Jane' })
    @IsNotEmpty()
    @IsString()
    adminFirstName: string;

    @ApiProperty({ example: 'Smith' })
    @IsNotEmpty()
    @IsString()
    adminLastName: string;
}

export class LoginDto {
    @ApiProperty({ example: 'admin@smithlaw.ca' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'securePassword123' })
    @IsNotEmpty()
    @IsString()
    password: string;
}

export class AuthUserDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;

    @ApiProperty()
    role: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    firmName: string;
}

export class AuthResponseDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty({ example: 900 })
    expiresIn: number;

    @ApiProperty({ type: AuthUserDto })
    user: AuthUserDto;
}
