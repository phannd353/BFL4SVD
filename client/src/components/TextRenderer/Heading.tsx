import slugify from "react-slugify";
import { JSX } from "react/jsx-runtime";

export default function Heading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  return function ({ children }: { children?: React.ReactNode }) {
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;

    let id = slugify(getNodeText(children) || "#");

    return <Tag id={id}>{children}</Tag>;
  };
}

const getNodeText = (node: React.ReactNode): string => {
  if (["string", "number"].includes(typeof node)) return node as string;
  if (node instanceof Array) return node.map(getNodeText).join("");
  if (typeof node === "object" && node)
    return getNodeText((node as any).props?.children);

  return "";
};
