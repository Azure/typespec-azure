import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  Label,
  ToolbarButton,
  Tooltip,
} from "@fluentui/react-components";
import { ArrowUploadFilled } from "@fluentui/react-icons";
import { usePlaygroundContext } from "@typespec/playground/react";
import { useState } from "react";
import style from "./import.module.css";

export const ImportToolbarButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip content="Import remote TypeSpec" relationship="description" withArrow>
        <ToolbarButton
          appearance="subtle"
          aria-label="Import remote TypeSpec"
          icon={<ArrowUploadFilled />}
          onClick={() => setOpen(true)}
        />
      </Tooltip>

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
    </>
  );
};

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
