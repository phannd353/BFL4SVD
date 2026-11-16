export function formatGasUsed(value: string | null): string {
  return value === null ? "—" : `${BigInt(value).toLocaleString("en-US")} gas`;
}
