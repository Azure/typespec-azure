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
import { combineProjectIntoFile, createRemoteHost } from "@typespec/pack";
import { DiagnosticList, usePlaygroundContext } from "@typespec/playground/react";
import { ReactNode, useState } from "react";
import style from "./import.module.css";

export const ImportToolbarButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip content="Import" relationship="description" withArrow>
        <ToolbarButton
          appearance="subtle"
          aria-label="Import Remote TypeSpec"
          icon={<ArrowUploadFilled />}
          onClick={() => setOpen(true)}
        />
      </Tooltip>

      <Dialog open={open} onOpenChange={(event, data) => setOpen(data.open)}>
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
  const [error, setError] = useState<ReactNode | null>(null);
  const [value, setValue] = useState("");
  const context = usePlaygroundContext();

  const importSpec = async () => {
    const content = value;
    const result = await combineProjectIntoFile(createRemoteHost(), content);
    if (result.diagnostics.length > 0) {
      setError(<DiagnosticList diagnostics={result.diagnostics} />);
      return;
    } else if (result.content) {
      context.setContent(result.content);
      onImport();
    }
  };
  return (
    <div>
      <h3>Import Remote TypeSpec Document</h3>

      <div>
        <Label>URL to import</Label>
      </div>
      <Input
        value={value}
        onChange={(_, data) => setValue(data.value)}
        className={style["url-input"]}
      />
      {error && <div className={style["error"]}>{error}</div>}
      <div>
        <Button appearance="primary" className="import-btn" onClick={importSpec}>
          Import
        </Button>
      </div>
    </div>
  );
};
