import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, required, className, ...props }, ref) => {
        return (
            <div className="space-y-1.5 w-full">
                {label && (
                    <label className="block text-sm font-medium text-zinc-700">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, required, className, ...props }, ref) => {
        return (
            <div className="space-y-1.5 w-full">
                {label && (
                    <label className="block text-sm font-medium text-zinc-700">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={cn(
                        "flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, required, className, children, ...props }, ref) => {
        return (
            <div className="space-y-1.5 w-full">
                {label && (
                    <label className="block text-sm font-medium text-zinc-700">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <select
                    ref={ref}
                    className={cn(
                        "flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-zinc-900",
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
            </div>
        );
    }
);

Select.displayName = "Select";

interface SuggestedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    label?: string;
    required?: boolean;
    suggestions: string[];
    value: string;
    onChange: (value: string) => void;
}

export function SuggestedInput({
    label,
    required,
    suggestions,
    value,
    onChange,
    className,
    placeholder,
    ...props
}: SuggestedInputProps) {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="block text-sm font-medium text-zinc-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            />
            {suggestions && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {suggestions.map((item) => {
                        const isSelected = value === item;
                        return (
                            <button
                                key={item}
                                type="button"
                                onClick={() => onChange(item)}
                                className={cn(
                                    "text-xs px-2 py-0.5 rounded border transition-all text-left font-medium",
                                    isSelected
                                        ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-300"
                                )}
                            >
                                {isSelected ? "✓ " : "+ "}
                                {item}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}