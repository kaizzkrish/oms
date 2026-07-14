-- CreateTable
CREATE TABLE "project_modules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "moduleLeadId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,

    CONSTRAINT "project_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_modules_organizationId_idx" ON "project_modules"("organizationId");

-- CreateIndex
CREATE INDEX "project_modules_projectId_idx" ON "project_modules"("projectId");

-- CreateIndex
CREATE INDEX "project_modules_moduleLeadId_idx" ON "project_modules"("moduleLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "project_modules_projectId_name_key" ON "project_modules"("projectId", "name");

-- AddForeignKey
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_moduleLeadId_fkey" FOREIGN KEY ("moduleLeadId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
