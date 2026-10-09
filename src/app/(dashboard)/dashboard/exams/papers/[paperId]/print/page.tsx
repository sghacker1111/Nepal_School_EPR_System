import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { PrintButton } from "@/modules/exams/components/print-button";
import { PaperDocument } from "@/modules/questions/components/paper-document";

export default async function PrintablePaperPage({
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
      items: {
        include: {
          question: { include: { options: { orderBy: { label: "asc" } } } },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
  if (!paper) notFound();
  return (
    <>
      <div className="mx-auto flex max-w-4xl justify-end gap-2 py-4 print:hidden">
        <Button asChild variant="outline">
          <Link href={`/dashboard/exams/papers/${paper.id}`}>
            Back to builder
          </Link>
        </Button>
        <PrintButton />
      </div>
      <PaperDocument paper={paper} />
    </>
  );
}
