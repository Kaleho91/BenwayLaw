import {
    Controller,
    Get,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortalAuthGuard } from './portal-auth.guard';
import { PortalClient, ClientId } from './portal.decorators';
import { PortalService } from './portal.service';
import { PortalUser } from './portal-auth.dto';

@ApiTags('Client Portal')
@ApiBearerAuth()
@UseGuards(PortalAuthGuard)
@Controller('portal')
export class PortalController {
    constructor(private readonly portalService: PortalService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current client profile' })
    async getProfile(@PortalClient() client: PortalUser) {
        return this.portalService.getClientProfile(client.clientId);
    }

    @Get('matters')
    @ApiOperation({ summary: 'Get client matters' })
    async getMatters(@ClientId() clientId: string) {
        return this.portalService.getClientMatters(clientId);
    }

    @Get('matters/:id')
    @ApiOperation({ summary: 'Get a specific matter' })
    async getMatter(@ClientId() clientId: string, @Param('id') matterId: string) {
        return this.portalService.getClientMatter(clientId, matterId);
    }

    @Get('invoices')
    @ApiOperation({ summary: 'Get client invoices' })
    async getInvoices(@ClientId() clientId: string) {
        return this.portalService.getClientInvoices(clientId);
    }

    @Get('invoices/:id')
    @ApiOperation({ summary: 'Get a specific invoice' })
    async getInvoice(@ClientId() clientId: string, @Param('id') invoiceId: string) {
        return this.portalService.getClientInvoice(clientId, invoiceId);
    }

    @Get('trust/balance')
    @ApiOperation({ summary: 'Get client trust balance' })
    async getTrustBalance(@ClientId() clientId: string) {
        return this.portalService.getClientTrustBalance(clientId);
    }
}
