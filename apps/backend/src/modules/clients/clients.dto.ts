import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    street?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    province?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    postalCode?: string;
}

export class CreateClientDto {
    @ApiProperty({ description: 'Client name (person or organization)' })
    @IsString()
    name: string;

    @ApiProperty({ enum: ['individual', 'organization'], default: 'individual' })
    @IsEnum(['individual', 'organization'])
    clientType: 'individual' | 'organization';

    @ApiPropertyOptional({ description: 'Client email address' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Client phone number' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ type: AddressDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;

    @ApiPropertyOptional({ description: 'Internal notes about the client' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateClientDto {
    @ApiPropertyOptional({ description: 'Client name (person or organization)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ enum: ['individual', 'organization'] })
    @IsOptional()
    @IsEnum(['individual', 'organization'])
    clientType?: 'individual' | 'organization';

    @ApiPropertyOptional({ description: 'Client email address' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Client phone number' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ type: AddressDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;

    @ApiPropertyOptional({ description: 'Internal notes about the client' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ description: 'Enable client portal access' })
    @IsOptional()
    @IsBoolean()
    portalEnabled?: boolean;
}

export class ClientResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ enum: ['individual', 'organization'] })
    clientType: 'individual' | 'organization';

    @ApiPropertyOptional()
    email?: string;

    @ApiPropertyOptional()
    phone?: string;

    @ApiPropertyOptional({ type: AddressDto })
    address?: AddressDto;

    @ApiPropertyOptional()
    notes?: string;

    @ApiProperty()
    portalEnabled: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiPropertyOptional({ description: 'Number of active matters' })
    matterCount?: number;
}

export class ClientListResponseDto {
    @ApiProperty({ type: [ClientResponseDto] })
    data: ClientResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;
}
