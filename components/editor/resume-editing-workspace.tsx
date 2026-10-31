"use client";
import { memo, useCallback, useDeferredValue, useState } from "react";
import type { OptimizedResume } from "@/lib/schemas/optimize.schema";
import { StructuredResumeEditor } from "./structured-resume-editor";
import { ResumeDocument } from "@/components/workspace/workspace-ui";
import { EditorGuide } from "@/components/mascot/guide-card";

const EditorPreview = memo(function EditorPreview({ resume, language }: { resume: OptimizedResume; language: string }) {
  return <ResumeDocument value={JSON.stringify(resume)} language={language}/>;
});

export function ResumeEditingWorkspace({ initialData, draftData, language, onSave, onDraftSave, onDirtyChange }: { initialData: OptimizedResume; draftData?: OptimizedResume; language: string; onSave: (data: OptimizedResume) => Promise<void>; onDraftSave: (data: OptimizedResume) => Promise<void>; onDirtyChange?:(value:boolean)=>void }) {
  const [preview, setPreview] = useState(draftData || initialData);
  const [dirty, setDirty] = useState(false);
  const handleDirtyChange = useCallback((value: boolean) => { setDirty(value); onDirtyChange?.(value); }, [onDirtyChange]);
  const deferredPreview = useDeferredValue(preview);
  return <><EditorGuide /><div className="editorLivePreview" data-editor-dirty={dirty}><StructuredResumeEditor initialData={initialData} draftData={draftData} onSave={onSave} onDraftSave={onDraftSave} onPreviewChange={setPreview} onDirtyChange={handleDirtyChange} /><div className="paperCanvas"><div className="paperCanvasBar"><span>Prévia do conteúdo</span><span>Confira antes de exportar</span></div><EditorPreview resume={deferredPreview} language={language}/><p className="finePrint">Salve as alterações para atualizar o documento final. O modelo de exportação pode ser conferido na aba Prévia e PDF.</p></div></div></>;
}
