import { PageHeader } from "@/components/PageHeader";
import { Pill } from "lucide-react";

export default function MedsPage() {
  return (
    <>
      <PageHeader title="Лекарства и БАД" meta="скоро" />
      <div className="bg-bg-surface border border-border-soft rounded-2xl p-12 text-center">
        <Pill size={40} className="mx-auto text-text-disabled mb-4" />
        <div className="text-text-strong text-lg mb-2">Скоро</div>
        <div className="text-text-faint text-sm max-w-md mx-auto">
          Журнал приёма лекарств и БАД: что, сколько, с какого числа. Понадобится для корреляции с маркерами анализов.
        </div>
      </div>
    </>
  );
}
