type ToolCallPreviewProps = {
  icon: string;
  title: string;
  description: string;
  payload: unknown;
};

export function ToolCallPreview({
  icon,
  title,
  description,
  payload,
}: ToolCallPreviewProps) {
  return (
    <div className="tool-preview">
      <div className="tool-preview-header">
        <span aria-hidden="true" className="tool-preview-icon">
          {icon}
        </span>
        <div>
          <p className="tool-preview-title">{title}</p>
          <p className="tool-preview-description">{description}</p>
        </div>
      </div>
      <pre className="tool-preview-json">
        {JSON.stringify(payload ?? {}, null, 2)}
      </pre>
    </div>
  );
}
