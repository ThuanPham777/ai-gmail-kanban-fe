import { type RefObject } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Menu } from "lucide-react";

interface InboxHeaderProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
  emailSearchTerm: string;
  onEmailSearchTermChange: (value: string) => void;
  onShowKeyboardHelp: () => void;
  onMobileMenuToggle?: () => void;
  userEmail?: string;
  userProvider?: string;
  onLogout: () => void;
  unreadCount?: number;
}

/**
 * InboxHeader Component
 *
 * Header for Traditional inbox view
 * Contains:
 * - Mailbox branding
 * - Simple search input
 * - Keyboard shortcuts help button
 * - Navigation toggle (Classic/Kanban)
 * - User info and logout
 */
export function InboxHeader({
  searchInputRef,
  emailSearchTerm,
  onEmailSearchTermChange,
  onShowKeyboardHelp,
  onMobileMenuToggle,
  userEmail,
  userProvider,
  onLogout,
  unreadCount,
}: InboxHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isKanban = location.pathname === "/kanban";

  return (
    <header className="border-b bg-card shrink-0 safe-area-inset-top">
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-3 sm:py-4">
        {/* Mobile menu button - only visible on mobile/tablet */}
        {onMobileMenuToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 h-auto"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="hidden md:block">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Mailbox
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold">
            Inbox workspace
            {typeof unreadCount === "number" && unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </h1>
        </div>

        {/* Mobile-only compact title */}
        <div className="md:hidden">
          <h1 className="text-lg font-semibold">
            Inbox
            {typeof unreadCount === "number" && unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </h1>
        </div>

        <div className="flex-1 px-2 sm:px-4 max-w-2xl">
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Search..."
            className="w-full text-sm"
            value={emailSearchTerm}
            onChange={(e) => onEmailSearchTermChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowKeyboardHelp}
                className="hidden sm:flex text-lg"
              >
                ?
              </Button>
            </TooltipTrigger>

            <TooltipContent side="bottom" sideOffset={6}>
              Keyboard shortcuts (Press ?)
            </TooltipContent>
          </Tooltip>

          {/* Navigation Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={!isKanban ? "default" : "outline"}
              size="sm"
              onClick={() => navigate("/inbox")}
            >
              Inbox
            </Button>
            <Button
              variant={isKanban ? "default" : "outline"}
              size="sm"
              onClick={() => navigate("/kanban")}
            >
              Kanban
            </Button>
          </div>

          <div className="text-right hidden lg:block">
            <p className="text-sm font-medium">{userEmail}</p>
            <p className="text-xs text-muted-foreground">
              {userProvider ?? "password"} session
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="hidden sm:flex"
          >
            Logout
          </Button>
          {/* Mobile logout button - icon only */}
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="sm:hidden p-2"
            aria-label="Logout"
          >
            <span className="text-xs">Exit</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
