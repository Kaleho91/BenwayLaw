import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { CreateDocumentDto, DocumentListResponseDto, DocumentResponseDto } from './documents.dto';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
    private readonly uploadDir = 'uploads';

    constructor(
        @InjectRepository(Document)
        private readonly documentRepo: Repository<Document>,
    ) {
        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async upload(
        firmId: string,
        userId: string,
        file: Express.Multer.File,
        dto: CreateDocumentDto,
    ): Promise<DocumentResponseDto> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        // Create firm directory
        const firmDir = path.join(this.uploadDir, firmId);
        if (!fs.existsSync(firmDir)) {
            fs.mkdirSync(firmDir, { recursive: true });
        }

        // Generate storage key (filename on disk)
        const storageKey = `${randomUUID()}${path.extname(file.originalname)}`;
        const filePath = path.join(firmDir, storageKey);

        // Write file to disk
        fs.writeFileSync(filePath, file.buffer);

        // Create document entity
        const document = this.documentRepo.create({
            firmId,
            filename: file.originalname,
            storageKey,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            uploadedByUserId: userId,
            matterId: dto.matterId,
            clientId: dto.clientId,
            sharedWithClient: dto.sharedWithClient || false,
        });

        await this.documentRepo.save(document);

        return this.toResponseDto(document);
    }

    async findAll(
        firmId: string,
        matterId?: string,
        clientId?: string,
    ): Promise<DocumentListResponseDto> {
        const query = this.documentRepo.createQueryBuilder('doc')
            .leftJoinAndSelect('doc.uploadedByUser', 'user')
            .where('doc.firmId = :firmId', { firmId });

        if (matterId) {
            query.andWhere('doc.matterId = :matterId', { matterId });
        }
        if (clientId) {
            query.andWhere('doc.clientId = :clientId', { clientId });
        }

        query.orderBy('doc.createdAt', 'DESC');

        const docs = await query.getMany();

        return {
            data: docs.map(d => this.toResponseDto(d)),
            total: docs.length,
        };
    }

    async findOne(firmId: string, documentId: string): Promise<Document> {
        const doc = await this.documentRepo.findOne({
            where: { id: documentId, firmId },
        });

        if (!doc) {
            throw new NotFoundException('Document not found');
        }
        return doc;
    }

    async getFilePath(firmId: string, documentId: string): Promise<string> {
        const doc = await this.findOne(firmId, documentId);
        const filePath = path.join(this.uploadDir, firmId, doc.storageKey);

        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('File not found on disk');
        }

        return filePath;
    }

    private toResponseDto(doc: Document): DocumentResponseDto {
        return {
            id: doc.id,
            firmId: doc.firmId,
            matterId: doc.matterId,
            clientId: doc.clientId,
            filename: doc.filename,
            mimeType: doc.mimeType,
            sizeBytes: (typeof doc.sizeBytes === 'string') ? parseInt(doc.sizeBytes, 10) : doc.sizeBytes,
            sharedWithClient: doc.sharedWithClient,
            createdAt: doc.createdAt,
            uploadedByUserName: doc.uploadedByUser ? `${doc.uploadedByUser.firstName} ${doc.uploadedByUser.lastName}` : undefined,
        };
    }
}
