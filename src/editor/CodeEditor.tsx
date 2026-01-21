import Editor from "@monaco-editor/react";

export default function CodeEditor({
  code,
  onChange,
}: {
  code: string;
  onChange: (value: string) => void;
}) {
  return (
    <Editor
      height="100%"
      language="javascript"
      value={code}
      theme="vs-dark"
      onChange={(value) => onChange(value || "")}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
        },
        overviewRulerLanes: 0,
        scrollBeyondLastLine: false,
      }}
    />
  );
}
