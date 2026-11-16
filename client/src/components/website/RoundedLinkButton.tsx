import { ArrowUpRight } from "lucide-react";
import { Button, buttonVariants } from "../ui/button";
import Link from "next/link";
import { cn } from "@/utils";

export default function RoundedLinkButton({
  href,
  label,
  className,
  ...props
}: {
  href: string;
  label: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({
          className: "flex py-5 px-2 rounded-full justify-between",
        }),
        className,
      )}
      {...props}
    >
      <span>{label}</span>
      <div className="flex h-[30px] w-[30px] place-content-center place-items-center rounded-full bg-black font-semibold text-white">
        <ArrowUpRight size={16} />
      </div>
    </Link>
  );
}
