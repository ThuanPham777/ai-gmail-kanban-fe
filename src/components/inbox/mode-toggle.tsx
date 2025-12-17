import { Button } from "@/components/ui/button";

export type InboxMode = "traditional" | "kanban";

export function ModeToggle({
    mode,
    onChange,
}: {
    mode: InboxMode;
    onChange: (m: InboxMode) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <Button
                variant={mode === "traditional" ? "default" : "outline"}
                size="sm"
                onClick={() => onChange("traditional")}
            >
                Classic
            </Button>
            <Button
                variant={mode === "kanban" ? "default" : "outline"}
                size="sm"
                onClick={() => onChange("kanban")}
            >
                Kanban
            </Button>
        </div>
    );
}
