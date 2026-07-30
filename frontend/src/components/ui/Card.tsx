import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "bg-white border border-zinc-200 shadow-sm rounded-lg overflow-hidden",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}