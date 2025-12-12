import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Invoicing & Revenue Flow (E2E)', () => {
    let app: INestApplication;
    let jwtToken: string;
    let clientId: string;
    let matterId: string;
    let timeEntryId: string;
    let invoiceId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Setup: Create Firm (Ontario), User, Client, Matter
        const email = `invoice.tester.${Date.now()}@example.com`;
        const password = 'Password123!';

        const regRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                adminEmail: email,
                adminPassword: password,
                adminFirstName: 'Invoice',
                adminLastName: 'Tester',
                firmName: `Invoice Firm ${Date.now()}`,
                province: 'ON' // Ontario for HST test
            });

        if (regRes.status === 201) {
            jwtToken = regRes.body.accessToken;
        } else {
            // Fallback login
            const loginRes = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email, password });
            jwtToken = loginRes.body.accessToken;
        }

        // Create Client
        const clientRes = await request(app.getHttpServer())
            .post('/clients')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                name: 'Revenue Client',
                email: 'rev@client.com',
                clientType: 'organization',
                address: { street: 'Main St', city: 'Toronto', province: 'ON' },
            })
            .expect(201);
        clientId = clientRes.body.id;

        // Create Matter
        const matterRes = await request(app.getHttpServer())
            .post('/matters')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                clientId,
                name: 'Revenue Matter',
                matterNumber: `REV-${Date.now()}`,
                status: 'active',
                billingType: 'hourly'
            })
            .expect(201);
        matterId = matterRes.body.id;
    });

    afterAll(async () => {
        await app.close();
    });

    it('1. Create Billable Time Entry', async () => {
        const res = await request(app.getHttpServer())
            .post('/time-entries')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                matterId,
                entryDate: new Date().toISOString(),
                description: 'Legal research',
                hours: 2.0,
                rate: 250.00,
                billable: true
            });

        if (res.status !== 201) {
            console.error('Time Entry Failed:', JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(201);

        timeEntryId = res.body.id;
        expect(res.body.amount).toBe(500); // 2 * 250
    });

    it('2. Generate Invoice from Time Entry (Ontario HST 13%)', async () => {
        const res = await request(app.getHttpServer())
            .post('/invoices')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                clientId,
                matterId,
                timeEntryIds: [timeEntryId],
                invoiceDate: new Date().toISOString(),
                dueDays: 14
            });

        if (res.status !== 201) {
            console.error('Invoice Creation Failed:', JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(201);

        invoiceId = res.body.id;

        // Verify Content
        expect(res.body.subtotal).toBe(500);
        // ON HST is 13%
        const expectedTax = 500 * 0.13; // 65

        if (res.body.taxHst !== expectedTax) {
            console.error('Tax Mismatch:', {
                expected: expectedTax,
                received: res.body.taxHst,
                firmProvince: 'ON',
                body: res.body
            });
        }

        expect(res.body.taxHst).toBe(expectedTax);
        expect(res.body.taxGst).toBe(0);
        expect(res.body.taxPst).toBe(0);
        expect(res.body.total).toBe(500 + expectedTax);
        expect(res.body.balanceDue).toBe(500 + expectedTax);
    });

    it('3. Record Partial Payment', async () => {
        const paymentAmount = 200;
        const res = await request(app.getHttpServer())
            .post(`/invoices/${invoiceId}/payments`)
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                amount: paymentAmount,
                paymentDate: new Date().toISOString(),
                paymentMethod: 'credit_card',
                paymentSource: 'external'
            })
            .expect(201);

        expect(res.body.status).toBe('partial');
        expect(res.body.amountPaid).toBe(paymentAmount);
        expect(res.body.balanceDue).toBe(565 - paymentAmount); // 565 total
    });

    it('4. Record Remaining Payment', async () => {
        const remaining = 365; // 565 - 200
        const res = await request(app.getHttpServer())
            .post(`/invoices/${invoiceId}/payments`)
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                amount: remaining,
                paymentDate: new Date().toISOString(),
                paymentMethod: 'bank_transfer',
                paymentSource: 'external'
            })
            .expect(201);

        expect(res.body.status).toBe('paid');
        expect(res.body.amountPaid).toBe(565);
        expect(res.body.balanceDue).toBe(0);
    });
});
