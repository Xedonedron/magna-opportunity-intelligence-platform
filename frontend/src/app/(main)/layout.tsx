import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full bg-zinc-100 text-zinc-900 font-sans selection:bg-zinc-200">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-white">
                <TopNav />
                <main className="flex-1 overflow-y-auto relative bg-zinc-50">
                    {children}
                </main>
            </div>
        </div>
    );
}