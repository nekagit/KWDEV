/** Project Textarea component. */
import { LabeledTextarea } from "@/components/molecules/Form/LabeledTextarea";

interface ProjectTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const ProjectTextarea: React.FC<ProjectTextareaProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows,
  className,
}) => {
  return (
    <LabeledTextarea
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={className}
    />
  );
};