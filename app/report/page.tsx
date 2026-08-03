import { Suspense } from "react";
import { ReportContent } from "../../components/ui/ReportContent";
import { Loader2 } from "lucide-react";

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#001F58]" />
        </main>
      }
    >
      <ReportContent />
    </Suspense>
  );
}