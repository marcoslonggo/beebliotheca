import { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onRowClick,
  sortBy,
  sortDirection,
  onSort,
  emptyMessage = "No data available",
  loading = false
}: TableProps<T>) {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const handleSort = (key: string, sortable?: boolean) => {
    if (sortable && onSort) {
      onSort(key);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={`text-center py-12 ${
          darkMode ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr
            className={`border-b ${
              darkMode ? "border-[#2a2a2a]" : "border-gray-200"
            }`}
          >
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-sm font-semibold ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                } ${column.sortable ? "cursor-pointer select-none" : ""}`}
                style={{ width: column.width }}
                onClick={() => handleSort(column.key, column.sortable)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && (
                    <div className="flex flex-col">
                      {sortBy === column.key ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="w-4 h-4 text-honey" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-honey" />
                        )
                      ) : (
                        <div className="w-4 h-4 text-gray-500">
                          <ChevronUp className="w-3 h-3 opacity-30" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={String(row[keyField])}
              className={`border-b ${
                darkMode ? "border-[#2a2a2a]" : "border-gray-200"
              } ${
                onRowClick
                  ? `cursor-pointer transition-colors ${
                      darkMode
                        ? "hover:bg-[#1f1f1f]"
                        : "hover:bg-gray-50"
                    }`
                  : ""
              }`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {column.render
                    ? column.render(row)
                    : String(row[column.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
