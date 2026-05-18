"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/components/theme-provider";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      closeButton
      richColors
      theme={resolvedTheme}
      toastOptions={{
        classNames: {
          toast:
            "rounded-3xl border border-border bg-card text-card-foreground shadow-lg",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
