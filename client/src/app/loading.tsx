import { LoadingStar } from "@/components/LoadingStar";

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
      <LoadingStar />

      {/* Optional loading text */}
      <p className="absolute mt-32 text-sm text-muted-foreground animate-pulse">
        Loading...
      </p>
    </div>
  );
}
