import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Document Management Flow (E2E)', () => {
    let app: INestApplication;
    let jwtToken: string;

    let documentId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Register
        const email = `doc.mgr.${Date.now()}@example.com`;
        const password = 'Password123!';

        const regRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                adminEmail: email,
                adminPassword: password,
                adminFirstName: 'Doc',
                adminLastName: 'Manager',
                firmName: `Doc Firm ${Date.now()}`,
                province: 'ON'
            });

        jwtToken = regRes.body.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    it('1. Upload Document', async () => {
        const buffer = Buffer.from('Hello World, this is a test document.');

        const res = await request(app.getHttpServer())
            .post('/documents')
            .set('Authorization', `Bearer ${jwtToken}`)
            .field('sharedWithClient', 'false')
            .attach('file', buffer, 'test-doc.txt')
            .expect(201);

        documentId = res.body.id;
        expect(res.body.filename).toBe('test-doc.txt');
        expect(res.body.mimeType).toBe('text/plain');
        expect(res.body.sizeBytes).toBeGreaterThan(0);
    });

    it('2. List Documents', async () => {
        const res = await request(app.getHttpServer())
            .get('/documents')
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].id).toBe(documentId);
    });

    it('3. Download Document', async () => {
        const res = await request(app.getHttpServer())
            .get(`/documents/${documentId}/download`)
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(200);

        expect(res.headers['content-type']).toContain('text/plain');
        expect(res.headers['content-disposition']).toContain('test-doc.txt');
        expect(res.text).toBe('Hello World, this is a test document.');
    });
});
