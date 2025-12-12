import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Practice Management Flow (E2E)', () => {
    let app: INestApplication;
    let jwtToken: string;
    let clientId: string;
    let matterId: string;
    let userId: string;
    let expenseId: string;
    let taskId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Setup: Register Firm
        const email = `practice.${Date.now()}@example.com`;
        const password = 'Password123!';

        const regRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                adminEmail: email,
                adminPassword: password,
                adminFirstName: 'Practice',
                adminLastName: 'Manager',
                firmName: `Practice Firm ${Date.now()}`,
                province: 'ON'
            });

        if (regRes.status === 201) {
            jwtToken = regRes.body.accessToken;
            userId = regRes.body.user.id;
        } else {
            const loginRes = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email, password });
            jwtToken = loginRes.body.accessToken;
            userId = loginRes.body.user.id;
        }

        // Create Client
        const clientRes = await request(app.getHttpServer())
            .post('/clients')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                name: 'Practice Client',
                clientType: 'individual',
            })
            .expect(201);
        clientId = clientRes.body.id;

        // Create Matter
        const matterRes = await request(app.getHttpServer())
            .post('/matters')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                clientId,
                name: 'Practice Matter',
                matterNumber: `PRAC-${Date.now()}`,
                status: 'active',
                billingType: 'hourly'
            })
            .expect(201);
        matterId = matterRes.body.id;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Expenses (Disbursements)', () => {
        it('1. Create Billable Expense', async () => {
            const res = await request(app.getHttpServer())
                .post('/expenses')
                .set('Authorization', `Bearer ${jwtToken}`)
                .send({
                    matterId,
                    expenseDate: new Date().toISOString(),
                    amount: 150.00,
                    description: 'Court Filing Fee',
                    billable: true,
                    taxTreatment: 'exempt' // Filing fees often exempt
                });

            if (res.status !== 201) {
                console.error('Expense Create Failed:', res.body);
            }
            expect(res.status).toBe(201);
            expenseId = res.body.id;
            expect(res.body.amount).toBe(150);
        });

        it('2. List Expenses for Matter', async () => {
            const res = await request(app.getHttpServer())
                .get(`/expenses?matterId=${matterId}`)
                .set('Authorization', `Bearer ${jwtToken}`)
                .expect(200);

            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].id).toBe(expenseId);
        });

        it('3. Generate Invoice with Expense', async () => {
            const res = await request(app.getHttpServer())
                .post('/invoices')
                .set('Authorization', `Bearer ${jwtToken}`)
                .send({
                    clientId,
                    matterId,
                    expenseIds: [expenseId],
                    invoiceDate: new Date().toISOString(),
                    dueDays: 30
                });

            if (res.status !== 201) {
                console.error('Invoice Creation Failed:', res.body);
            }
            expect(res.status).toBe(201);

            // Verify total includes expense
            // Expense was 150.00, exempt from tax
            expect(res.body.subtotal).toBe(150);
            expect(res.body.total).toBe(150);

            // Verify expense is now billed
            const expRes = await request(app.getHttpServer())
                .get(`/expenses/${expenseId}`)
                .set('Authorization', `Bearer ${jwtToken}`)
                .expect(200);

            expect(expRes.body.billed).toBe(true);
            expect(expRes.body.invoiceId).toBe(res.body.id);
        });
    });

    describe('Tasks', () => {
        it('4. Create Task Assigned to Self', async () => {
            const res = await request(app.getHttpServer())
                .post('/tasks')
                .set('Authorization', `Bearer ${jwtToken}`)
                .send({
                    title: 'Draft Pleading',
                    description: 'Draft the initial statement of claim',
                    matterId,
                    assignedUserId: userId,
                    dueDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
                    priority: 'high'
                });

            if (res.status !== 201) {
                console.error('Task Create Failed:', res.body);
            }
            expect(res.status).toBe(201);
            taskId = res.body.id;
            expect(res.body.status).toBe('pending');
        });

        it('5. Update Task Status', async () => {
            const res = await request(app.getHttpServer())
                .put(`/tasks/${taskId}`)
                .set('Authorization', `Bearer ${jwtToken}`)
                .send({
                    status: 'in_progress'
                })
                .expect(200);

            expect(res.body.status).toBe('in_progress');
        });

        it('6. List Tasks', async () => {
            const res = await request(app.getHttpServer())
                .get('/tasks')
                .set('Authorization', `Bearer ${jwtToken}`)
                .expect(200);

            expect(res.body.data.some((t: any) => t.id === taskId)).toBeTruthy();
        });
    });
});
