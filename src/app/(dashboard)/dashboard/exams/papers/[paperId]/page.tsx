import {
  ArrowDown,
  ArrowUp,
  Lock,
  RefreshCw,
  Trash2,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { paperItemFormAction } from "@/modules/questions/actions";
import { ActionForm } from "@/components/forms/action-form";

export default async function PaperBuilderPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const session = await requireSchoolPage("paper.view");
  const { paperId } = await params;
  const paper = await prisma.questionPaper.findFirst({
    where: { id: paperId, schoolId: session.schoolId },
    include: {
      school: true,
      academicYear: true,
      class: true,
      subject: true,
      grid: true,
      items: {
        include: { question: { include: { chapter: true, topic: true } } },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
  if (!paper) notFound();
  const allocated = paper.items.reduce(
    (sum, item) => sum + Number(item.marks),
    0,
  );
  const canEdit = session.permissions.has("paper.generate");
  return (
    <>
      <PageHeader
        eyebrow="Question paper builder"
        title={`${paper.title} · Set ${paper.setCode}`}
        description={`${paper.class.name} · ${paper.subject.name} · ${paper.academicYear.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/exams/paper-generator">All papers</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/exams/papers/${paper.id}/print`}>
                Print / PDF
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/exams/papers/${paper.id}/answer-key`}>
                Answer key
              </Link>
            </Button>
          </div>
        }
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <Badge
          variant={
            allocated === Number(paper.fullMarks) ? "success" : "warning"
          }
        >
          Allocated {allocated} / {paper.fullMarks.toString()}
        </Badge>
        <Badge variant="outline">{paper.items.length} questions</Badge>
        <Badge variant="outline">{paper.durationMinutes} minutes</Badge>
      </div>
      <div className="space-y-3">
        {paper.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {item.displayOrder}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap font-semibold">
                    {item.question.questionText}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.question.chapter.name}
                    {item.question.topic
                      ? ` · ${item.question.topic.name}`
                      : ""}{" "}
                    · {item.question.questionType} · {item.question.difficulty}{" "}
                    · {item.marks.toString()} marks
                  </p>
                </div>
                {item.isLocked && (
                  <Badge variant="warning">
                    <Lock />
                    Locked
                  </Badge>
                )}
              </div>
              {canEdit && (
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                  <ActionForm
                    action={paperItemFormAction.bind(
                      null,
                      item.id,
                      paper.id,
                      "lock",
                    )}
                  >
                    <Button size="sm" variant="outline">
                      {item.isLocked ? (
                        <>
                          <Unlock />
                          Unlock
                        </>
                      ) : (
                        <>
                          <Lock />
                          Lock
                        </>
                      )}
                    </Button>
                  </ActionForm>
                  <ActionForm
                    action={paperItemFormAction.bind(
                      null,
                      item.id,
                      paper.id,
                      "up",
                    )}
                  >
                    <Button size="sm" variant="ghost" aria-label="Move up">
                      <ArrowUp />
                    </Button>
                  </ActionForm>
                  <ActionForm
                    action={paperItemFormAction.bind(
                      null,
                      item.id,
                      paper.id,
                      "down",
                    )}
                  >
                    <Button size="sm" variant="ghost" aria-label="Move down">
                      <ArrowDown />
                    </Button>
                  </ActionForm>
                  <ActionForm
                    action={paperItemFormAction.bind(
                      null,
                      item.id,
                      paper.id,
                      "replace",
                    )}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={item.isLocked}
                    >
                      <RefreshCw />
                      Replace
                    </Button>
                  </ActionForm>
                  <ActionForm
                    confirmation="Remove this question from the paper? Regenerate the set to fill the gap."
                    action={paperItemFormAction.bind(
                      null,
                      item.id,
                      paper.id,
                      "remove",
                    )}
                  >
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={item.isLocked}
                    >
                      <Trash2 />
                      Remove
                    </Button>
                  </ActionForm>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
