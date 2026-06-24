import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  Label,
} from "@fluentui/react-components";
import { ArrowUploadFilled } from "@fluentui/react-icons";
import { usePlaygroundContext, type CommandBarItem } from "@typespec/playground/react";
import { useState } from "react";
import style from "./import.module.css";

/** Hook that creates a CommandBarItem for the Import action. */
export function useImportCommandBarItem(): CommandBarItem {
  const [open, setOpen] = useState(false);

  return {
    id: "import",
    label: "Import remote TypeSpec",
    icon: <ArrowUploadFilled />,
    align: "right",
    onClick: () => setOpen(true),
    content: (
      <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Import Remote TypeSpec</DialogTitle>
            <DialogContent>
              <ImportTsp onImport={() => setOpen(false)} />
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    ),
  };
}

const ImportTsp = ({ onImport }: { onImport: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const context = usePlaygroundContext();

  const importSpec = async () => {
    try {
      const response = await fetch(value, { redirect: "follow" });
      if (!response.ok) {
        setError(`Failed to fetch: ${response.status} ${response.statusText}`);
        return;
      }
      const content = await response.text();
      if (!content) {
        setError("No content was returned from the URL.");
        return;
      }
      context.setContent(content);
      onImport();
    } catch (e: unknown) {
      setError(String(e));
    }
  };
  return (
    <div>
      <div>
        <Label htmlFor="tsp-url-input">URL to import</Label>
      </div>
      <Input
        id="tsp-url-input"
        type="url"
        value={value}
        onChange={(_, data) => setValue(data.value)}
        className={style["url-input"]}
        aria-describedby={error ? "tsp-url-error" : undefined}
      />
      {error && (
        <div id="tsp-url-error" role="alert">
          {error}
        </div>
      )}
      <div>
        <Button appearance="primary" onClick={importSpec}>
          Import
        </Button>
      </div>
    </div>
  );
};
