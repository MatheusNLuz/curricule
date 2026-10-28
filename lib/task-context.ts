import { AsyncLocalStorage } from "node:async_hooks";
export type TaskContext={analysisId:string;userId:string;kind:string;token:string;signal:AbortSignal};
export const taskContext=new AsyncLocalStorage<TaskContext>();
export function taskSignal(){return taskContext.getStore()?.signal;}
