/** Generated Content Form component. */
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("FormsAndDialogs/GeneratedContentForm.tsx");

interface GeneratedContentFormProps {
  generateResult: { title: string; content: string };
  setGenerateResult: React.Dispatch<React.SetStateAction<{ title: string; content: string } | null>>;
  useGeneratedAndCreate: () => void;
  saveGeneratedAsNew: () => Promise<void>;
  saveLoading: boolean;
}

export const GeneratedContentForm: React.FC<GeneratedContentFormProps> = ({
  generateResult,
  setGenerateResult,
  useGeneratedAndCreate,
  saveGeneratedAsNew,
  saveLoading,
}) => {
  return (
    <>
      <div className={classes[0]}>
        <Label>Generated title</Label>
        <Input
          value={generateResult.title}
          onChange={(e) =>
            setGenerateResult((r: { title: string; content: string } | null) =>
              r ? { ...r, title: e.target.value } : null
            )}
        />
      </div>
      <div className={classes[0]}>
        <Label>Generated content</Label>
        <Textarea
          value={generateResult.content}
          onChange={(e) =>
            setGenerateResult((r: { title: string; content: string } | null) =>
              r ? { ...r, content: e.target.value } : null
            )}
          rows={10}
          className={classes[2]}
        />
      </div>
      <ButtonGroup alignment="right">
        <Button variant="outline" onClick={() => setGenerateResult(null)}>
          Back
        </Button>
        <Button variant="outline" onClick={useGeneratedAndCreate}>
          Edit & create
        </Button>
        <Button
          onClick={saveGeneratedAsNew}
          disabled={!generateResult.title.trim() || saveLoading}
        >
          {saveLoading ? <Loader2 className={classes[3]} /> : null}
          Save as new prompt
        </Button>
      </ButtonGroup>
    </>
  );
};
