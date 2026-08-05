import { cn } from "@/lib/utils";
import { forwardRef, useState, useRef, useEffect, useMemo } from "react";

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
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Filter suggestions based on current value (case-insensitive substring)
    const filtered = useMemo(() => {
        if (!value.trim()) return suggestions;
        const q = value.trim().toLowerCase();
        return suggestions.filter((s) => s.toLowerCase().includes(q));
    }, [suggestions, value]);

    // Determine whether to show the "Others" option
    const exactMatch = useMemo(
        () => suggestions.some((s) => s.toLowerCase() === value.trim().toLowerCase()),
        [suggestions, value]
    );
    const showOthers = value.trim().length > 0 && !exactMatch;

    // Total items = filtered + (showOthers ? 1 : 0)
    const totalItems = filtered.length + (showOthers ? 1 : 0);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.children;
            if (items[highlightedIndex]) {
                (items[highlightedIndex] as HTMLElement).scrollIntoView({
                    block: "nearest",
                });
            }
        }
    }, [highlightedIndex]);

    const selectItem = (item: string) => {
        onChange(item);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const selectOthers = () => {
        // Keep the current typed value as-is
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setIsOpen(true);
            e.preventDefault();
            return;
        }
        if (!isOpen) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
                selectItem(filtered[highlightedIndex]);
            } else if (highlightedIndex === filtered.length && showOthers) {
                selectOthers();
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            setHighlightedIndex(-1);
        }
    };

    return (
        <div className="space-y-1.5 w-full" ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-zinc-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpen(true);
                        setHighlightedIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={cn(
                        "flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    {...props}
                />

                {isOpen && totalItems > 0 && (
                    <ul
                        ref={listRef}
                        className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
                    >
                        {filtered.map((item, idx) => (
                            <li key={item}>
                                <button
                                    type="button"
                                    className={cn(
                                        "w-full px-3 py-2 text-left text-sm transition-colors",
                                        idx === highlightedIndex
                                            ? "bg-zinc-100 text-zinc-900"
                                            : "text-zinc-700 hover:bg-zinc-50"
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => selectItem(item)}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                >
                                    {item}
                                </button>
                            </li>
                        ))}

                        {showOthers && (
                            <li>
                                <button
                                    type="button"
                                    className={cn(
                                        "w-full px-3 py-2 text-left text-sm italic transition-colors",
                                        highlightedIndex === filtered.length
                                            ? "bg-zinc-100 text-zinc-900"
                                            : "text-zinc-500 hover:bg-zinc-50"
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={selectOthers}
                                    onMouseEnter={() => setHighlightedIndex(filtered.length)}
                                >
                                    ✏️ Others — use "{value.trim()}"
                                </button>
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}
