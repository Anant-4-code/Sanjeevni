import RoleHeader from "@/components/RoleHeader";

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F9FAFB] flex flex-col font-sans">
      <RoleHeader currentRole="receptionist" badgeCode="01 // RECEPTION & TRIAGE" />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}