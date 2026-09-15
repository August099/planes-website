import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserQuestionsAction } from "@/app/actions/questions";
import { QuestionsClient } from "./QuestionsClient";

export default async function QuestionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/questions");
  }

  const { receivedQuestions, sentQuestions } = await getUserQuestionsAction();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <QuestionsClient
        receivedQuestions={receivedQuestions}
        sentQuestions={sentQuestions}
      />
    </main>
  );
}