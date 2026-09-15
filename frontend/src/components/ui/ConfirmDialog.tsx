"use client";

import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    isLoading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmText = "Hapus",
    cancelText = "Batal",
    variant = "danger",
    isLoading = false,
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            iconBg: "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400",
            buttonBg: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
            icon: Trash2,
        },
        warning: {
            iconBg: "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
            buttonBg: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
            icon: AlertTriangle,
        },
        info: {
            iconBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
            buttonBg: "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white focus:ring-zinc-500",
            icon: AlertTriangle,
        },
    };

    const config = variantStyles[variant];
    const IconComponent = config.icon;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 transform transition-all animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile drag pill */}
                <div className="sm:hidden flex justify-center -mt-2 mb-3">
                    <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                </div>

                <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${config.iconBg} mb-4 inline-flex items-center justify-center`}>
                        <IconComponent className="w-6 h-6" />
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">
                    {title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                    {description}
                </p>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`min-h-[44px] sm:min-h-0 px-5 py-2.5 text-sm font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 ${config.buttonBg}`}
                    >
                        {isLoading && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        <span>{confirmText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
