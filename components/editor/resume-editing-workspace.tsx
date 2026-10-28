"use client";
import { memo, useDeferredValue, useState } from "react";
import type { OptimizedResume } from "@/lib/schemas/optimize.schema";
import { StructuredResumeEditor } from "./structured-resume-editor";
import { ResumeDocument } from "@/components/workspace/workspace-ui";

const EditorPreview = memo(function EditorPreview({ resume, language }: { resume: OptimizedResume; language: string }) {
  return <ResumeDocument value={JSON.stringify(resume)} language={language}/>;
});

export function ResumeEditingWorkspace({ initialData, draftData, language, onSave, onDraftSave, onDirtyChange }: { initialData: OptimizedResume; draftData?: OptimizedResume; language: string; onSave: (data: OptimizedResume) => Promise<void>; onDraftSave: (data: OptimizedResume) => Promise<void>; onDirtyChange?:(value:boolean)=>void }) {
  const [preview, setPreview] = useState(draftData || initialData);
  const deferredPreview = useDeferredValue(preview);
  return <div className="editorLivePreview"><StructuredResumeEditor initialData={initialData} draftData={draftData} onSave={onSave} onDraftSave={onDraftSave} onPreviewChange={setPreview} onDirtyChange={onDirtyChange} /><div className="paperCanvas"><div className="paperCanvasBar"><span>Prévia do conteúdo</span><span>Confira antes de exportar</span></div><EditorPreview resume={deferredPreview} language={language}/><p className="finePrint">Salve as alterações para atualizar o documento final. O modelo de exportação pode ser conferido na aba Prévia e PDF.</p></div></div>;
}
