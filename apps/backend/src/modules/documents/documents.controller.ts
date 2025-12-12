import {
    Controller,
    Post,
    Get,
    UseGuards,
    Request,
    Body,
    Query,
    UseInterceptors,
    UploadedFile,
    Param,
    Res,
    StreamableFile,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, DocumentListResponseDto, DocumentResponseDto } from './documents.dto';
import { Response } from 'express';
import * as fs from 'fs';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post()
    @ApiOperation({ summary: 'Upload a document' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @Request() req: any,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: CreateDocumentDto,
    ): Promise<DocumentResponseDto> {
        return this.documentsService.upload(req.user.firmId, req.user.id, file, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List documents' })
    @ApiQuery({ name: 'matterId', required: false })
    @ApiQuery({ name: 'clientId', required: false })
    async findAll(
        @Request() req: any,
        @Query('matterId') matterId?: string,
        @Query('clientId') clientId?: string,
    ): Promise<DocumentListResponseDto> {
        return this.documentsService.findAll(req.user.firmId, matterId, clientId);
    }

    @Get(':id/download')
    @ApiOperation({ summary: 'Download a document' })
    async download(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const doc = await this.documentsService.findOne(req.user.firmId, id);
        const filePath = await this.documentsService.getFilePath(req.user.firmId, id);

        const file = fs.createReadStream(filePath);

        res.set({
            'Content-Type': doc.mimeType,
            'Content-Disposition': `attachment; filename="${doc.filename}"`,
        });

        return new StreamableFile(file);
    }
}
