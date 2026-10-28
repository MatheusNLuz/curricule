import type { ResumeAnalysis } from "../schemas/analysis.schema";
export const SCORE_CRITERIA = [
  {key:"ats",label:"Conteúdo ATS",weight:0.4},
  {key:"structure",label:"Estrutura",weight:0.2},
  {key:"clarity",label:"Clareza",weight:0.15},
  {key:"impact",label:"Evidências e impacto",weight:0.15},
  {key:"keywords",label:"Terminologia",weight:0.1},
] as const;
const bound=(value:number)=>Math.max(0,Math.min(100,Number.isFinite(value)?value:0));
export function scoreExplanation(analysis:ResumeAnalysis){
  return SCORE_CRITERIA.map(criterion=>{
    const evidence=analysis.rubric?.find(item=>item.criterion===criterion.key);
    return {...criterion,value:evidence?evidence.level*25:bound(analysis.scores[criterion.key]),evidence:evidence?.foundText||"",reason:evidence?.reason||"Estimativa anterior da análise. Reavalie a versão atual para obter os critérios detalhados."};
  });
}
export class ScoreEngine {
  static evaluate(analysis:ResumeAnalysis){
    const criteria=scoreExplanation(analysis);
    const values=Object.fromEntries(criteria.map(item=>[item.key,item.value]));
    return {overall:Math.round(criteria.reduce((sum,item)=>sum+item.value*item.weight,0)),ats:values.ats,structure:values.structure,clarity:values.clarity,keywords:values.keywords,impact:values.impact,perceivedSeniority:bound(analysis.scores.perceivedSeniority),internationalCompatibility:bound(analysis.scores.internationalCompatibility||0)};
  }
}
