import Code from "./Code";
import "./index.css";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

import Markdown from "react-markdown";
import Table from "./Table";
import Image from "./Image";
import Heading from "./Heading";

export default function TextRenderer({ content }: { content: string }) {
  return (
    <section className="typography max-w-full text-pretty">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          pre: Code,
          table: Table,
          img: Image,
          h2: Heading(2),
          h3: Heading(3),
          h4: Heading(4),
          h5: Heading(5),
          h6: Heading(6),
        }}
      >
        {content}
      </Markdown>
    </section>
  );
}
