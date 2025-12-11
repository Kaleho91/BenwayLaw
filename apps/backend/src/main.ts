import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // CORS for frontend
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    });

    // API prefix
    app.setGlobalPrefix('api');

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('MapleLaw API')
        .setDescription('Canada-first legal practice management API')
        .setVersion('0.1.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication endpoints')
        .addTag('firms', 'Firm management')
        .addTag('clients', 'Client management')
        .addTag('matters', 'Matter/case management')
        .addTag('time-entries', 'Time tracking')
        .addTag('invoices', 'Billing and invoices')
        .addTag('trust', 'Trust accounting')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🍁 MapleLaw API running on http://localhost:${port}`);
    console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
