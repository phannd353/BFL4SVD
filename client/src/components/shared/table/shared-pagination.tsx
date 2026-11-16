"use client";

import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table } from "@tanstack/react-table";

interface SharedPaginationProps {
  page: number;
  totalPages: number;
  table: Table<any>;
}

const SharedPagination: React.FC<SharedPaginationProps> = ({
  page,
  totalPages,
  table,
}) => {
  if (totalPages <= 1) return null;
  const pageNumbers = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, page - 2);
  let endPage = Math.min(totalPages, page + 2);
  if (endPage - startPage < maxPagesToShow - 1) {
    if (startPage === 1) {
      endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
  }
  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    pageNumbers.push(currentPage);
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => table.previousPage()}
            aria-disabled={!table.getCanPreviousPage()}
            tabIndex={table.getCanPreviousPage() ? 0 : -1}
            className={
              table.getCanPreviousPage() ? "" : "pointer-events-none opacity-50"
            }
          />
        </PaginationItem>
        {startPage > 1 && (
          <>
            <PaginationItem>
              <PaginationLink onClick={() => table.setPageIndex(0)}>
                1
              </PaginationLink>
            </PaginationItem>
            {startPage > 2 && <PaginationEllipsis />}
          </>
        )}
        {pageNumbers.map((pageNumber) => (
          <PaginationItem key={pageNumber}>
            <PaginationLink
              isActive={pageNumber === page}
              onClick={() => table.setPageIndex(pageNumber - 1)}
            >
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <PaginationEllipsis />}
            <PaginationItem>
              <PaginationLink
                onClick={() => table.setPageIndex(totalPages - 1)}
              >
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}
        <PaginationItem>
          <PaginationNext
            onClick={() => table.nextPage()}
            aria-disabled={!table.getCanNextPage()}
            tabIndex={table.getCanNextPage() ? 0 : -1}
            className={
              table.getCanNextPage() ? "" : "pointer-events-none opacity-50"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default SharedPagination;
