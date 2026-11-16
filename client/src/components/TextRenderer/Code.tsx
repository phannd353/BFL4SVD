import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "./code.css";
import { isValidElement, PropsWithChildren, HTMLAttributes } from "react";
import { cn } from "@/utils";

export default function Code({
  children,
}: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  if (!isValidElement(children)) return children;

  const { className, children: code } =
    children.props as HTMLAttributes<HTMLElement>;
  if (typeof code != "string") return children;

  const language = parseCodeLanguage(className);
  const codeStr = code.trim();
  const highlightedCode = Prism.highlight(
    codeStr,
    languageGrammarMap[language],
    languageNameMap[language],
  );

  const lines = codeStr.trim().split("\n");

  return (
    <pre
      className={cn(
        "bg-secondary-background text-secondary-foreground p-4 rounded-lg overflow-x-auto text-sm my-4 font-mono line-numbers",
        className,
      )}
    >
      <code
        className="block bg-transparent"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
      <span aria-hidden="true" className="line-numbers-rows">
        {lines.map((_, i) => (
          <span key={i}></span>
        ))}
      </span>
    </pre>
  );
}

const languageGrammarMap = {
  js: Prism.languages.javascript,
  ts: Prism.languages.typescript,
  css: Prism.languages.css,
  tsx: Prism.languages.tsx || Prism.languages.typescript,
  jsx: Prism.languages.jsx || Prism.languages.javascript,
  json: Prism.languages.json,
};

const parseCodeLanguage = (
  className = "language-js",
): keyof typeof languageGrammarMap => {
  const language =
    String(className)
      .match(/language-([a-z0-9_-]+)/i)?.[1]
      ?.toLowerCase() || "js";

  return language in languageGrammarMap
    ? (language as keyof typeof languageGrammarMap)
    : "js";
};

const languageNameMap: Record<keyof typeof languageGrammarMap, string> = {
  js: "JavaScript",
  ts: "TypeScript",
  css: "CSS",
  tsx: "TypeScript XML",
  jsx: "JavaScript XML",
  json: "JSON",
};
