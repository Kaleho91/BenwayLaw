import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module'; // Import from src relative to test dir
// import { DataSource } from 'typeorm';

describe('Trust Accounting Flow (E2E)', () => {
    let app: INestApplication;
    // let dataSource: DataSource;
    let jwtToken: string;
    // let firmId: string;
    let clientId: string;
    let matterId: string;
    let trustAccountId: string;
    let invoiceId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // dataSource = app.get(DataSource);

        // 1. Setup Data: Register & Login (Get Token)
        const email = `test-trust-${Date.now()}@maplelaw.ca`;
        const password = 'Password123!';

        // Register
        const regRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                adminEmail: email,
                adminPassword: password,
                adminFirstName: 'Trust',
                adminLastName: 'Tester',
                firmName: `Trust Test Firm ${Date.now()}`,
            });

        if (regRes.status === 201) {
            jwtToken = regRes.body.accessToken;
            // firmId = regRes.body.user.firmId;
        } else {
            console.log('Register failed (expected if user exists?):', regRes.status, regRes.body);
        }

        if (!jwtToken) {
            // Login
            const loginRes = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email, password });

            if (loginRes.status === 200 || loginRes.status === 201) {
                jwtToken = loginRes.body.accessToken;
            } else {
                console.error('Login failed:', loginRes.status, loginRes.body);
            }
        }

        if (!jwtToken) {
            throw new Error('Failed to obtain JWT Token for tests');
        }
        // const user = loginRes.body.user;
        // firmId = user.firmId;
    });

    afterAll(async () => {
        await app.close();
    });

    it('1. Create Client and Matter', async () => {
        const clientRes = await request(app.getHttpServer())
            .post('/clients')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                name: 'Trust Client',
                email: 'client@trust.com',
                phone: '555-0100',
                address: { street: '123 Trust Lane', city: 'Toronto', province: 'ON' },
                clientType: 'individual',
            })
            .expect(201);
        clientId = clientRes.body.id;

        const matterRes = await request(app.getHttpServer())
            .post('/matters')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                clientId,
                name: 'Trust Litigation',
                description: 'Testing trust accounting',
                status: 'active',
                matterNumber: `2025-${Date.now()}` // Unique number
            })
            .expect(201);
        matterId = matterRes.body.id;
    });

    it('2. Create Trust Account', async () => {
        const res = await request(app.getHttpServer())
            .post('/trust/accounts')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                accountName: 'General Trust',
                bankName: 'RBC',
                accountNumberLast4: '9999',
                currency: 'CAD',
            })
            .expect(201);
        trustAccountId = res.body.id;
    });

    it('3. Deposit Funds ($1000)', async () => {
        await request(app.getHttpServer())
            .post('/trust/transactions/deposit')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                trustAccountId,
                clientId,
                matterId, // Optional but good practice
                amount: 1000,
                description: 'Retainer deposit',
                transactionDate: new Date().toISOString(),
                referenceNumber: 'CHK-100',
            })
            .expect(201);

        // Verify Balance
        const balRes = await request(app.getHttpServer())
            .get(`/trust/balances/client/${clientId}`)
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(200);

        expect(balRes.body.balance).toBe(1000);
    });

    it('4. Create Invoice ($500)', async () => {
        const res = await request(app.getHttpServer())
            .post('/invoices')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                clientId,
                matterId,
                invoiceDate: new Date().toISOString(),
                dueDays: 30,
                status: 'draft',
                lineItems: [
                    {
                        lineType: 'custom',
                        description: 'Legal Services',
                        quantity: 2,
                        rate: 250,
                        amount: 500
                    }
                ]
            })
            .expect(201);
        invoiceId = res.body.id;
        // NOTE: In a real flow, invoice might need to be 'sent' before payment, depending on logic.
        // Assuming 'draft' or 'sent' allows payment for MVP simplicity unless blocked.
    });

    it('5. Transfer from Trust to Fees ($500)', async () => {
        await request(app.getHttpServer())
            .post('/trust/transactions/transfer-to-fees')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                trustAccountId,
                clientId,
                matterId,
                invoiceId,
                amount: 500,
                description: 'Pay Invoice #1',
                transactionDate: new Date().toISOString(),
            })
            .expect(201);

        // Verify Trust Balance Reduced
        const balRes = await request(app.getHttpServer())
            .get(`/trust/balances/client/${clientId}`)
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(200);
        expect(balRes.body.balance).toBe(500); // 1000 - 500
    });

    it('6. Attempt Overdraft (Pay $600 with $500 remaining)', async () => {
        // Create another invoice
        const invRes = await request(app.getHttpServer())
            .post('/invoices')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                clientId,
                matterId,
                issueDate: new Date().toISOString(),
                dueDate: new Date().toISOString(),
                status: 'draft',
                lineItems: [{
                    lineType: 'custom',
                    description: 'More Services',
                    quantity: 1,
                    rate: 600,
                    amount: 600
                }]
            })
            .expect(201);
        const invoiceId2 = invRes.body.id;

        // Attempt to pay $600
        await request(app.getHttpServer())
            .post('/trust/transactions/transfer-to-fees')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                trustAccountId,
                clientId,
                matterId,
                invoiceId: invoiceId2,
                amount: 600,
                description: 'Overdraft Attempt',
                transactionDate: new Date().toISOString(),
            })
            .expect(400); // Expect Bad Request
    });

    it('7. Verify Audit Log for Trust Transaction', async () => {
        // We expect audit logs for the deposit and transfer
        const auditRes = await request(app.getHttpServer())
            .get('/compliance/audit-logs')
            .set('Authorization', `Bearer ${jwtToken}`)
            .query({ entityType: 'Trust' }) // Assuming URL parser maps to EntityType or we just check recent
            .expect(200);

        // We might need to adjust query depending on how `deriveResourceFromUrl` works
        // The URL was /trust/transactions/deposit -> Resource: Trust

        const logs = auditRes.body.data;
        expect(logs.length).toBeGreaterThan(0);
        const depositLog = logs.find((l: any) => l.metadata?.path?.includes('deposit'));
        expect(depositLog).toBeDefined();
        expect(depositLog.operation).toBe('create');
    });
});
