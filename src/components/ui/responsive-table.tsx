import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  priority?: "high" | "medium" | "low"; // high = always visible, low = desktop only
  className?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  mobileCardRender?: (item: T) => React.ReactNode;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = "No hay datos disponibles",
  emptyIcon,
  mobileCardRender,
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyIcon && <div className="mb-3 flex justify-center">{emptyIcon}</div>}
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile: Render as cards
  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((item) => {
          const key = keyExtractor(item);
          
          // Use custom mobile render if provided
          if (mobileCardRender) {
            return (
              <div
                key={key}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {mobileCardRender(item)}
              </div>
            );
          }

          // Default mobile card rendering
          const highPriorityColumns = columns.filter(
            (col) => col.priority === "high" || !col.priority
          );
          const mediumPriorityColumns = columns.filter(
            (col) => col.priority === "medium"
          );

          return (
            <Card
              key={key}
              className={cn(
                "overflow-hidden transition-colors",
                onRowClick && "cursor-pointer hover:bg-muted/50 active:bg-muted"
              )}
              onClick={() => onRowClick?.(item)}
            >
              <CardContent className="p-4 space-y-2">
                {/* High priority columns (always visible) */}
                {highPriorityColumns.map((col) => (
                  <div key={String(col.key)} className="flex justify-between items-start gap-2">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">
                      {col.header}
                    </span>
                    <span className={cn("text-sm text-right", col.className)}>
                      {col.render
                        ? col.render(item)
                        : String((item as any)[col.key] ?? "-")}
                    </span>
                  </div>
                ))}
                
                {/* Medium priority columns (visible but secondary) */}
                {mediumPriorityColumns.length > 0 && (
                  <div className="pt-2 border-t space-y-1">
                    {mediumPriorityColumns.map((col) => (
                      <div key={String(col.key)} className="flex justify-between items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {col.header}
                        </span>
                        <span className={cn("text-xs", col.className)}>
                          {col.render
                            ? col.render(item)
                            : String((item as any)[col.key] ?? "-")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop: Render as table
  const visibleColumns = columns.filter((col) => col.priority !== "low" || !isMobile);

  return (
    <div className={cn("relative w-full overflow-auto", className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50">
            {visibleColumns.map((col) => (
              <th
                key={String(col.key)}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className={cn(
                "border-b transition-colors hover:bg-muted/50",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {visibleColumns.map((col) => (
                <td
                  key={String(col.key)}
                  className={cn("p-4 align-middle", col.className)}
                >
                  {col.render
                    ? col.render(item)
                    : String((item as any)[col.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
