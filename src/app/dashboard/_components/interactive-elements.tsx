"use client";

import React, { useState, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Context for sharing chat functions
interface ChatContextType {
  sendProgrammaticMessage: (messageContent: string) => Promise<void>;
  conversationId: string | null;
  messages: Array<{ id: string; role: string; content: string }>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({
  children,
  sendProgrammaticMessage,
  conversationId,
  messages,
}: {
  children: React.ReactNode;
  sendProgrammaticMessage: (messageContent: string) => Promise<void>;
  conversationId: string | null;
  messages: Array<{ id: string; role: string; content: string }>;
}) {
  return (
    <ChatContext.Provider
      value={{ sendProgrammaticMessage, conversationId, messages }}
    >
      {children}
    </ChatContext.Provider>
  );
}

function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("Interactive elements must be used within ChatProvider");
  }
  return context;
}

/**
 * Props for interactive buttons that can trigger chat actions, navigation, or external actions
 */
interface InteractiveButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "data-action"?: string;
  "data-params"?: string;
  "data-type"?: "chat-action" | "navigation" | "external";
  "data-message"?: string;
  "data-route"?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Props for interactive links that can handle special navigation and chat actions
 */
interface InteractiveLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
  children?: React.ReactNode;
}

/**
 * Props for interactive containers that group related actions
 */
interface InteractiveContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  "data-interactive"?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Interactive button component that handles chat actions, navigation, and external actions
 * Triggered by LLM responses with special data attributes
 */
export function InteractiveButton({
  "data-action": action,
  "data-params": paramsStr,
  "data-type": type = "chat-action",
  "data-message": message,
  "data-route": route,
  children,
  className,
  ...props
}: InteractiveButtonProps) {
  const router = useRouter();
  const { sendProgrammaticMessage, conversationId, messages } =
    useChatContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      console.log("🔍 DEBUG: Interactive button clicked");
      console.log("🔍 Button type:", type);
      console.log("🔍 Button message:", message);
      console.log("🔍 Button route:", route);
      console.log("🔍 Current conversation ID from hook:", conversationId);
      console.log("🔍 Current messages count from hook:", messages.length);
      console.log(
        "🔍 Current messages from hook:",
        messages.map(
          (m, i) => `[${i}] ${m.role}: ${m.content.substring(0, 50)}...`,
        ),
      );

      e.preventDefault();
      setIsLoading(true);

      try {
        let params: Record<string, unknown> = {};
        if (paramsStr) {
          try {
            params = JSON.parse(paramsStr) as Record<string, unknown>;
          } catch (parseError) {
            console.error("Failed to parse params:", parseError);
            toast.error("Invalid parameters format");
            return;
          }
        }

        switch (type) {
          case "chat-action":
            if (message) {
              console.log(
                "🔍 DEBUG: Calling sendProgrammaticMessage with:",
                message,
              );
              await sendProgrammaticMessage(message);
            } else {
              console.warn("Chat action button missing data-message attribute");
              toast.error("Invalid action configuration");
            }
            break;

          case "navigation":
            if (route) {
              const searchParams = new URLSearchParams();
              Object.entries(params).forEach(([key, value]) => {
                searchParams.set(key, String(value));
              });
              const finalRoute =
                Object.keys(params).length > 0
                  ? `${route}?${searchParams.toString()}`
                  : route;

              // Validate route is within the app
              if (
                finalRoute.startsWith("/ai-chat/") ||
                finalRoute.startsWith("/")
              ) {
                router.push(finalRoute);
              } else {
                console.warn("Invalid navigation route:", finalRoute);
                toast.error("Invalid navigation route");
              }
            } else {
              console.warn("Navigation button missing data-route attribute");
              toast.error("Invalid navigation configuration");
            }
            break;

          case "external":
            await handleExternalAction(action, params);
            break;

          default:
            console.warn("Unknown button type:", type);
            toast.error("Unknown action type");
        }
      } catch (error) {
        console.error("Interactive button error:", error);
        toast.error("Action failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      action,
      paramsStr,
      type,
      message,
      route,
      router,
      sendProgrammaticMessage,
      conversationId,
      messages,
    ],
  );

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "mx-1 my-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700",
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Interactive link component that handles special navigation and chat actions
 * Supports @navigate: and @chat: prefixes for special actions
 */
export function InteractiveLink({
  href,
  children,
  className,
  ...props
}: InteractiveLinkProps) {
  const router = useRouter();
  const { sendProgrammaticMessage } = useChatContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!href) return;

      // Handle special link formats
      if (href.startsWith("@navigate:")) {
        e.preventDefault();
        setIsLoading(true);

        try {
          const route = href.replace("@navigate:", "");

          // Validate route is within the app
          if (route.startsWith("/ai-chat/") || route.startsWith("/")) {
            router.push(route);
          } else {
            console.warn("Invalid navigation route:", route);
            toast.error("Invalid navigation route");
          }
        } catch (error) {
          console.error("Navigation error:", error);
          toast.error("Navigation failed");
        } finally {
          setIsLoading(false);
        }
      } else if (href.startsWith("@chat:")) {
        e.preventDefault();
        setIsLoading(true);

        try {
          const message = href.replace("@chat:", "");
          await sendProgrammaticMessage(message);
        } catch (error) {
          console.error("Chat action error:", error);
          toast.error("Failed to send message");
        } finally {
          setIsLoading(false);
        }
      }
      // Regular links will be handled normally by the browser
    },
    [href, router, sendProgrammaticMessage],
  );

  // Regular external links
  if (href && !href.startsWith("@")) {
    return (
      <a
        href={href}
        className={cn("text-blue-600 underline hover:text-blue-800", className)}
        {...props}
      >
        {children}
      </a>
    );
  }

  // Interactive links (special @navigate: and @chat: links)
  // Create button props by excluding anchor-specific properties
  const buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {};
  Object.keys(props).forEach((key) => {
    if (!["href", "target", "rel", "download", "onClick"].includes(key)) {
      (buttonProps as Record<string, unknown>)[key] = (
        props as Record<string, unknown>
      )[key];
    }
  });

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "font-inherit inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-blue-600 underline hover:text-blue-800",
        isLoading && "cursor-not-allowed opacity-50",
        className,
      )}
      {...buttonProps}
    >
      {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      {children}
    </button>
  );
}

/**
 * Interactive container component for grouping related action buttons
 * Provides consistent styling and spacing for action groups
 */
export function InteractiveContainer({
  "data-interactive": interactiveType,
  children,
  className,
  ...props
}: InteractiveContainerProps) {
  // Apply special styling for action groups
  if (interactiveType === "action-group") {
    return (
      <div
        className={cn(
          "my-4 flex flex-wrap gap-2 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Regular div for other interactive types
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * Handle external actions like downloads, exports, etc.
 * @param action - The action to perform
 * @param params - Parameters for the action
 */
async function handleExternalAction(
  action?: string,
  params?: Record<string, unknown>,
): Promise<void> {
  if (!action) {
    console.warn("External action called without action parameter");
    toast.error("Invalid external action");
    return;
  }

  try {
    switch (action) {
      case "download-resume":
        // TODO: Implement resume download
        toast.info("Resume download feature coming soon");
        break;

      case "export-data":
        // TODO: Implement data export
        toast.info("Data export feature coming soon");
        break;

      case "copy-to-clipboard":
        if (params?.text && typeof params.text === "string") {
          await navigator.clipboard.writeText(params.text);
          toast.success("Copied to clipboard");
        } else {
          toast.error("No text to copy");
        }
        break;

      default:
        console.warn("Unknown external action:", action);
        toast.error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("External action error:", error);
    toast.error("Action failed");
  }
}

/**
 * Type guard to check if an element should be treated as interactive
 * @param element - React element to check
 * @returns boolean indicating if element is interactive
 */
export function isInteractiveElement(element: React.ReactElement): boolean {
  const props = element.props as Record<string, unknown>;

  // Check for interactive data attributes
  return !!(
    props["data-interactive"] ??
    props["data-action"] ??
    props["data-type"] ??
    props["data-message"] ??
    props["data-route"] ??
    (typeof props.href === "string" && props.href.startsWith("@"))
  );
}

/**
 * Utility function to validate interactive element props
 * @param props - Props to validate
 * @returns validation result with any errors
 */
export function validateInteractiveProps(props: Record<string, unknown>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const type = props["data-type"] as string;

  if (type === "chat-action" && !props["data-message"]) {
    errors.push("Chat action buttons must have data-message attribute");
  }

  if (type === "navigation" && !props["data-route"]) {
    errors.push("Navigation buttons must have data-route attribute");
  }

  if (type === "external" && !props["data-action"]) {
    errors.push("External action buttons must have data-action attribute");
  }

  // Validate route format for navigation
  if (props["data-route"]) {
    const route = props["data-route"] as string;
    if (!route.startsWith("/")) {
      errors.push("Navigation routes must start with /");
    }
  }

  // Validate params format
  if (props["data-params"]) {
    try {
      JSON.parse(props["data-params"] as string);
    } catch {
      errors.push("data-params must be valid JSON");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
