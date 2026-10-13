import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserQuestionsAction } from "@/app/actions/questions";
import { QuestionsClient } from "./QuestionsClient";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default async function QuestionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/questions");
  }

  const { receivedQuestions, sentQuestions } = await getUserQuestionsAction();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <PageBackground page="questions" />
      <Breadcrumbs items={[{ label: "Mis consultas" }]} className="-mt-4 mb-2" />
      <QuestionsClient
        receivedQuestions={receivedQuestions}
        sentQuestions={sentQuestions}
      />
    </main>
  );
}