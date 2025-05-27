import React, { useState } from "react";
import { type Components } from "react-markdown";
import { Copy, Check } from "lucide-react";
import { cn } from "~/lib/utils";
import rehypeRaw from "rehype-raw";
import {
  InteractiveButton,
  InteractiveLink,
  InteractiveContainer,
  isInteractiveElement,
} from "./interactive-elements";

// Helper function for copying code to clipboard
function useCodeCopy() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return { copied, copyToClipboard };
}

// Define the props type for our code component
interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

// Create a wrapper component to use the hook properly
function CodeBlock({ inline, className, children, ...rest }: CodeBlockProps) {
  const { copied, copyToClipboard } = useCodeCopy();

  if (typeof children !== "string") {
    return children;
  }
  const match = /language-(\w+)/.exec(className ?? "") ?? ["", "md"];

  // Safely convert children to string
  let codeContent = "";
  if (Array.isArray(children)) {
    codeContent = children.join("").replace(/\n$/, "");
  } else if (children !== null && children !== undefined) {
    // Only stringify if children is not null or undefined
    codeContent = String(children).replace(/\n$/, "");
  }

  if (!inline && match) {
    return (
      <div className="relative">
        <button
          onClick={() => copyToClipboard(codeContent)}
          className="bg-background/80 text-muted-foreground hover:bg-background absolute top-2 right-2 rounded-md p-1 text-xs"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
        <pre className="rounded-md bg-slate-800 p-4">
          <code className="break-all text-green-400 md:break-words">
            {codeContent}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code
      className={cn(
        className,
        "rounded bg-slate-100 px-1 py-0.5 text-sm text-slate-800",
      )}
      {...rest}
    >
      {children}
    </code>
  );
}

// Interactive button component for markdown
function MarkdownButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    "data-action"?: string;
    "data-params"?: string;
    "data-type"?: "chat-action" | "navigation" | "external";
    "data-message"?: string;
    "data-route"?: string;
    children?: React.ReactNode;
  },
) {
  // Check if this button has interactive data attributes
  const hasInteractiveAttrs = !!(
    props["data-action"] ??
    props["data-type"] ??
    props["data-message"] ??
    props["data-route"]
  );

  if (hasInteractiveAttrs) {
    return <InteractiveButton {...props} />;
  }

  // Regular button
  return <button {...props} />;
}

// Interactive link component for markdown
function MarkdownLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <InteractiveLink {...props} />;
}

// Interactive div component for markdown
function MarkdownDiv(
  props: React.HTMLAttributes<HTMLDivElement> & {
    "data-interactive"?: string;
  },
) {
  // Check if this div has interactive data attributes
  if (props["data-interactive"]) {
    return <InteractiveContainer {...props} />;
  }

  // Regular div
  return <div {...props} />;
}

export const markdownComponents: Components = {
  code: (props) => <CodeBlock {...props} />,
  button: (props) => <MarkdownButton {...props} />,
  a: (props) => <MarkdownLink {...props} />,
  div: (props) => <MarkdownDiv {...props} />,
  ol: (props) => <ol className="mb-4 list-decimal pl-4" {...props} />,
  ul: (props) => <ul className="mb-4 list-disc pl-4" {...props} />,
  p: (props) => <div className="mb-4 break-all md:break-normal" {...props} />,
  pre: (props) => <pre className="mb-4 text-wrap" {...props} />,
  h1: (props) => <h1 className="mb-4 text-2xl font-bold" {...props} />,
  h2: (props) => <h2 className="mb-3 text-xl font-semibold" {...props} />,
  h3: (props) => <h3 className="mb-2 text-lg font-medium" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="mb-4 border-l-4 border-gray-300 pl-4 italic"
      {...props}
    />
  ),
};
