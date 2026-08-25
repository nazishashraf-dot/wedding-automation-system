-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('auto_generated', 'manual');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "timelineRuleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "assignee" TEXT,
    "source" "TaskSource" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_rules" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "monthsBeforeWedding" INTEGER,
    "weeksBeforeWedding" INTEGER,
    "taskTitle" TEXT NOT NULL,
    "taskDescription" TEXT,
    "defaultPriority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_rules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "weddings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_timelineRuleId_fkey" FOREIGN KEY ("timelineRuleId") REFERENCES "timeline_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
