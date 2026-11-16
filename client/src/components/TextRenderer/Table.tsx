import { ReactNode } from "react";

export default function Table({ children }: { children?: ReactNode }) {
  return <table className="table-auto">{children}</table>;
}
