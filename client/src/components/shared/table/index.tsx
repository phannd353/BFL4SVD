"use client";

import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { IPaginatedResponse } from "@/interfaces/response.interface";
import SharedPagination from "./shared-pagination";

interface SharedTableProps<T> {
  data?: IPaginatedResponse<T>;
  columns: ColumnDef<T>[];
  children: React.ReactNode;
  setPage: (page: number) => void;
  isLoading?: boolean;
}

export function SharedTable<T>({
  data,
  columns,
  setPage,
  children,
  isLoading,
}: SharedTableProps<T>) {
  const { data: arr, pagination } = data || {
    data: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
  };
  const { total, page, limit, totalPages } = pagination;

  const table = useReactTable({
    data: arr,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: { pageIndex: page - 1, pageSize: limit },
    },
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, {
        pageIndex: page - 1,
        pageSize: limit,
      });
      setPage(next.pageIndex + 1);
    },
  });

  return (
    <div className="space-y-4">
      {children}
      <div className="overflow-hidden rounded-lg border-2 border-muted">
        <Table className="text-sm">
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-4 py-3 text-xs font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading || !data ? (
              Array.from({ length: 3 }).map((_, rowIndex) => (
                <TableRow key={`loading-${rowIndex}`}>
                  {table.getVisibleLeafColumns().map((column, columnIndex) => (
                    <TableCell key={column.id} className="px-4 py-3">
                      {columnIndex === 0 ? (
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-3 w-[160px]" />
                          </div>
                        </div>
                      ) : columnIndex === 2 ? (
                        <div className="flex -space-x-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      ) : (
                        <Skeleton className="h-6 w-[80px]" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4 py-1">
        <div className="text-sm text-muted-foreground">
          Showing {arr.length} of {total} total
        </div>
        <SharedPagination page={page} totalPages={totalPages} table={table} />
      </div>
    </div>
  );
}
