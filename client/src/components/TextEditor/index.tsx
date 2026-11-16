"use client";

import React from "react";
import { keymap, EditorView, BlockWrapper } from "@codemirror/view";
import { toggleLineComment } from "@codemirror/commands";
import {
  AdmonitionDirectiveDescriptor,
  MDXEditor,
  MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  quotePlugin,
  markdownShortcutPlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ChangeAdmonitionType,
  ChangeCodeMirrorLanguage,
  CodeToggle,
  CreateLink,
  InsertAdmonition,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  UndoRedo,
  directivesPlugin,
  codeMirrorPlugin,
  linkDialogPlugin,
  imagePlugin,
  ConditionalContents,
  EditorInFocus,
  DirectiveNode,
  Separator,
  StrikeThroughSupSubToggles,
  HighlightToggle,
  codeBlockPlugin,
  tablePlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "./index.css";

export interface EditorProps {
  value: any;
  onChange: (...args: any[]) => any;
  imageFolderName?: string;
  editorRef?: React.ForwardedRef<MDXEditorMethods | null>;
}

function whenInAdmonition(editorInFocus: EditorInFocus | null) {
  const node = editorInFocus?.rootNode;
  if (node?.getType() !== "directive") {
    return false;
  }

  return ["note", "tip", "danger", "info", "caution"].includes(
    (node as DirectiveNode).getMdastNode().name,
  );
}

export default function TextEditor({
  value,
  onChange,
  imageFolderName = "uploads",
  editorRef,
}: EditorProps) {
  return (
    <MDXEditor
      ref={editorRef}
      contentEditableClassName="mdx-content text-pretty"
      markdown={value}
      plugins={[
        headingsPlugin(),
        linkPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        directivesPlugin({
          directiveDescriptors: [AdmonitionDirectiveDescriptor],
        }),
        codeBlockPlugin({ defaultCodeBlockLanguage: "JavaScript" }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            js: "JavaScript",
            ts: "TypeScript",
            json: "JSON",
            css: "CSS",
            tsx: "TypeScript (React)",
            jsx: "JavaScript (React)",
          },
          codeMirrorExtensions: [
            EditorView.theme({
              "&": {
                backgroundColor: "var(--secondary-background)",
                color: "var(--cm-text)",
                borderRadius: "0.75rem",
                fontFamily:
                  'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              },
              ".cm-scroller": {
                backgroundColor: "var(--secondary-background)",
                border: "1px solid var(--cm-border)",
                borderRadius: "0.75rem",
              },
              ".cm-content": {
                color: "var(--cm-text)",
                caretColor: "var(--cm-text)",
                lineHeight: "1.6",
                padding: "0.75rem 1rem",
              },
              ".cm-line": {
                padding: "0 0.5rem",
              },
              ".cm-gutters": {
                backgroundColor: "var(--secondary-background)",
                borderRight: "1px solid var(--cm-border)",
                color: "var(--cm-comment)",
                padding: "0 0.5rem",
              },
              ".cm-lineNumbers .cm-gutterElement": {
                fontFamily:
                  'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                fontSize: "0.75rem",
                color: "var(--cm-comment)",
              },
              ".cm-activeLine": {
                backgroundColor:
                  "color-mix(in srgb, var(--cm-selection) 60%, transparent)",
              },
              ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
                background: "var(--cm-selection) !important",
              },
              ".cm-keyword": { color: "var(--cm-keyword)" },
              ".cm-atom": { color: "var(--cm-property)" },
              ".cm-number": { color: "var(--cm-property)" },
              ".cm-def": { color: "var(--cm-function)" },
              ".cm-variable": { color: "var(--cm-text)" },
              ".cm-variable-2": { color: "var(--cm-function)" },
              ".cm-variable-3": { color: "var(--cm-function)" },
              ".cm-property": { color: "var(--cm-property)" },
              ".cm-operator": { color: "var(--cm-operator)" },
              ".cm-string": { color: "var(--cm-string)" },
              ".cm-string-2": { color: "var(--cm-string)" },
              ".cm-comment": { color: "var(--cm-comment)" },
              ".cm-tag": { color: "var(--cm-keyword)" },
              ".cm-attribute": { color: "var(--cm-function)" },
              ".cm-qualifier": { color: "var(--cm-keyword)" },
              ".cm-builtin": { color: "var(--cm-function)" },
              ".cm-type": { color: "var(--cm-function)" },
              ".cm-bracket": { color: "var(--cm-punctuation)" },
              ".cm-punctuation": { color: "var(--cm-punctuation)" },
              ".cm-meta": { color: "var(--cm-comment)" },
              ".cm-invalidchar": { color: "var(--cm-string)" },
            }),
            keymap.of([
              {
                key: "Cmd-:",
                run: toggleLineComment,
              },
            ]),
          ],
        }),
        linkDialogPlugin(),
        imagePlugin(),
        tablePlugin(),
        listsPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarClassName: "mdx-toolbar",
          toolbarContents: () => (
            <ConditionalContents
              options={[
                {
                  when: (editor) => editor?.editorType === "codeblock",
                  contents: () => <ChangeCodeMirrorLanguage />,
                },
                {
                  fallback: () => (
                    <>
                      <UndoRedo />
                      <Separator />
                      <BoldItalicUnderlineToggles />
                      <ConditionalContents
                        options={[
                          {
                            when: (editor) =>
                              editor?.editorType === "codeblock",
                            contents: () => <ChangeCodeMirrorLanguage />,
                          },
                          {
                            fallback: () => (
                              <>
                                <InsertCodeBlock />
                              </>
                            ),
                          },
                        ]}
                      />
                      <HighlightToggle />
                      <Separator />
                      <StrikeThroughSupSubToggles />
                      <Separator />
                      <ListsToggle />
                      <Separator />

                      <ConditionalContents
                        options={[
                          {
                            when: whenInAdmonition,
                            contents: () => <ChangeAdmonitionType />,
                          },
                          { fallback: () => <BlockTypeSelect /> },
                        ]}
                      />

                      <Separator />

                      <CreateLink />
                      <InsertImage />

                      <Separator />

                      <InsertTable />
                      <InsertThematicBreak />

                      <ConditionalContents
                        options={[
                          {
                            when: (editorInFocus) =>
                              !whenInAdmonition(editorInFocus),
                            contents: () => (
                              <>
                                <Separator />
                                <InsertAdmonition />
                              </>
                            ),
                          },
                        ]}
                      />
                    </>
                  ),
                },
              ]}
            />
          ),
        }),
      ]}
      onChange={(v) => {
        onChange(v);
      }}
    />
  );
}
