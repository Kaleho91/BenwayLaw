import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAuditLogSchema1765489812269 implements MigrationInterface {
    name = 'UpdateAuditLogSchema1765489812269'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "timestamp"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "action"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "resource"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "resourceId"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "firmId" character varying`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "operation" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "entityType" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "entityId" character varying`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "entityId"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "entityType"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "operation"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "firmId"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "resourceId" character varying`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "resource" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "action" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "timestamp" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
