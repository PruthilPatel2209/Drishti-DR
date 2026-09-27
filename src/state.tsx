import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { aiResultLabel, type AIAnalysisResult, type AIResultStatus } from './services/aiAnalysis';

export type Role = 'ASHA_WORKER' | 'OPHTHALMOLOGIST' | 'COORDINATOR';
export type Patient = { id:string; name:string; age:number; village:string; phone:string; lastScreened:string; gender?:string; abha?:string; rch?:string };
export type ReviewAction = 'CONFIRM_AI_RESULT' | 'MODIFY_RESULT' | 'OVERRIDE_AI_RESULT';
export type FollowUpStatus = 'OUTSTANDING' | 'COMPLETED';
export type Case = {
  id:string; patientId:string; created:string; priority:'Review Needed'|'High confidence'; status:string; eye:string; aiResult?:AIAnalysisResult;
  sourcePhc?:string; aiRecommendation?:string; reviewStatus?:'REVIEW_REQUIRED'|'COMPLETED'; doctorDecision?:string;
  reviewAction?:ReviewAction; doctorNote?:string; reviewTimestamp?:string; doctorOpened?:boolean;
  screeningWorker?:string; imageData?:{right?:string;left?:string}; followUpStatus?:FollowUpStatus;
};
export type AuditEvent = { id:string; label:string; date:string; caseId?:string; timestamp:number };
export type Specialist = { id:string; role:'OPHTHALMOLOGIST'; label:string };
export type DemoState = {
  currentRole:Role|null; currentPatient:Patient|null; currentCase:Case|null; analysisState:'idle'|'complete'; aiResult:AIAnalysisResult|null;
  reviewStatus:string; doctorDecision:string|null; followUpStatus:string; auditEvents:AuditEvent[]; patients:Patient[]; cases:Case[]; specialists:Specialist[];
};

const patients:Patient[]=[
  {id:'P-20481',name:'Meera Devi',age:56,village:'Rampur, Uttar Pradesh',phone:'+91 98••• ••421',lastScreened:'Today, 09:42',gender:'Female'},
  {id:'P-20480',name:'Ramesh Kumar',age:63,village:'Kalyanpur, Uttar Pradesh',phone:'+91 97••• ••806',lastScreened:'Today, 09:18',gender:'Male'},
  {id:'P-20479',name:'Sunita Yadav',age:49,village:'Rampur, Uttar Pradesh',phone:'+91 96••• ••173',lastScreened:'Yesterday',gender:'Female'},
  {id:'DR-1004',name:'Arjun Patel',age:52,village:'Sanand, Gujarat',phone:'+91 98••• ••104',lastScreened:'Today, 08:52',gender:'Male'},
  {id:'DR-1005',name:'Kavita Desai',age:57,village:'Dholka, Gujarat',phone:'+91 97••• ••205',lastScreened:'Yesterday',gender:'Female'},
  {id:'DR-1006',name:'Mahesh Thakor',age:64,village:'Kalol, Gujarat',phone:'+91 96••• ••306',lastScreened:'Yesterday',gender:'Male'},
  {id:'DR-1007',name:'Nita Joshi',age:45,village:'Kheda, Gujarat',phone:'+91 95••• ••407',lastScreened:'This week',gender:'Female'},
  {id:'DR-1008',name:'Pooja Patel',age:39,village:'Gandhinagar, Gujarat',phone:'+91 94••• ••508',lastScreened:'This week',gender:'Female'}
];
function fixtureResult(status:AIResultStatus,generatedAt='2026-09-27T08:30:00.000Z'):AIAnalysisResult{return {status,source:'DEMO_FIXTURE',generatedAt,evidence:[],explanation:'Fictional case included to demonstrate the screening workflow.'}}
const cases:Case[]=[
  {id:'DR-2024-0081',patientId:'P-20481',created:'Today, 09:42',priority:'Review Needed',status:'REVIEW_REQUIRED',eye:'Both eyes available',sourcePhc:'Rampur PHC',aiRecommendation:'Specialist review required',aiResult:fixtureResult('NEEDS_SPECIALIST_REVIEW'),reviewStatus:'REVIEW_REQUIRED',screeningWorker:'ASHA worker',followUpStatus:'OUTSTANDING'},
  {id:'DR-2024-0079',patientId:'P-20480',created:'Today, 09:18',priority:'High confidence',status:'SCREENING_COMPLETE',eye:'Right eye available · Left eye unavailable',sourcePhc:'Kalyanpur PHC',aiRecommendation:'High-confidence negative screening outcome',aiResult:fixtureResult('HIGH_CONFIDENCE_NEGATIVE'),screeningWorker:'ASHA worker'},
  {id:'DR-2026-1004',patientId:'P-20479',created:'Yesterday',priority:'High confidence',status:'SCREENING_COMPLETE',eye:'Both eyes available',sourcePhc:'Rampur PHC',aiRecommendation:'No concerning finding detected',aiResult:fixtureResult('NEGATIVE'),screeningWorker:'ASHA worker'},
  {id:'DR-2026-1005',patientId:'DR-1004',created:'Today, 08:52',priority:'Review Needed',status:'REVIEW_REQUIRED',eye:'Both eyes available',sourcePhc:'Sanand PHC',aiRecommendation:'Positive finding detected',aiResult:fixtureResult('POSITIVE'),reviewStatus:'REVIEW_REQUIRED',screeningWorker:'ASHA worker',followUpStatus:'OUTSTANDING'},
  {id:'DR-2026-1006',patientId:'DR-1005',created:'Yesterday',priority:'High confidence',status:'SCREENING_COMPLETE',eye:'Both eyes available',sourcePhc:'Dholka PHC',aiRecommendation:'No concerning finding detected',aiResult:fixtureResult('NEGATIVE'),screeningWorker:'ASHA worker'},
  {id:'DR-2026-1010',patientId:'DR-1006',created:'Yesterday',priority:'Review Needed',status:'REVIEW_REQUIRED',eye:'Right eye available · Left eye unavailable',sourcePhc:'Kalol PHC',aiRecommendation:'High-confidence positive screening outcome',aiResult:fixtureResult('HIGH_CONFIDENCE_POSITIVE'),reviewStatus:'REVIEW_REQUIRED',screeningWorker:'ASHA worker',followUpStatus:'OUTSTANDING'},
  {id:'DR-2026-1008',patientId:'DR-1007',created:'This week',priority:'Review Needed',status:'COMPLETED',eye:'Both eyes available',sourcePhc:'Kheda PHC',aiRecommendation:'Positive finding detected',aiResult:fixtureResult('POSITIVE'),reviewStatus:'COMPLETED',doctorDecision:'Specialist review completed',reviewAction:'CONFIRM_AI_RESULT',doctorNote:'',reviewTimestamp:'2026-09-26T09:10:00.000Z',screeningWorker:'ASHA worker',followUpStatus:'OUTSTANDING'},
  {id:'DR-2026-1009',patientId:'DR-1008',created:'This week',priority:'Review Needed',status:'REVIEW_REQUIRED',eye:'Both eyes available',sourcePhc:'Gandhinagar PHC',aiRecommendation:'Specialist review required',aiResult:fixtureResult('NEEDS_SPECIALIST_REVIEW'),reviewStatus:'REVIEW_REQUIRED',screeningWorker:'ASHA worker',followUpStatus:'OUTSTANDING'}
];
const initial:DemoState={
  currentRole:null,currentPatient:null,currentCase:null,analysisState:'complete',aiResult:cases[0].aiResult||null,reviewStatus:'REVIEW_REQUIRED',doctorDecision:null,followUpStatus:'Follow-up pending',patients,cases,specialists:[{id:'DR-0021',role:'OPHTHALMOLOGIST',label:'Ophthalmologist demo account'}],
  auditEvents:cases.flatMap((record,index)=>starterEvents(record,index))
};
type ContextValue={
  state:DemoState; login:(role:Role,id:string,password:string)=>boolean; logout:()=>void; selectCase:(c:Case)=>void; selectPatient:(p:Patient)=>void;
  beginNewScreening:()=>void; resetDemo:()=>void; loadDemoCase:(kind:'PRIMARY'|'HIGH_CONFIDENCE')=>Case;
  registerPatient:(p:Patient)=>void; submitScreening:(patient:Patient,aiResult:AIAnalysisResult,imageData?:Case['imageData'],singleEye?:'Right eye'|'Left eye')=>Case;
  openReviewCase:(caseId:string)=>void; submitDoctorReview:(caseId:string,action:ReviewAction,decision:string,note:string)=>boolean;
  markFollowUpComplete:(caseId:string)=>boolean;
};
const Ctx=createContext<ContextValue|null>(null);
const credentials:Record<Role,{id:string;secret:string}>={ASHA_WORKER:{id:'ASHA-1042',secret:'1042'},OPHTHALMOLOGIST:{id:'DR-0021',secret:'doctor123'},COORDINATOR:{id:'COORD-01',secret:'coordinator123'}};
function addAudit(events:AuditEvent[],caseId:string,label:string){const now=Date.now();return [{id:`audit-${now}-${events.length}`,caseId,label,date:'Just now',timestamp:now+events.length},...events]}
function starterEvents(caseRecord:Case,index=0):AuditEvent[]{
  const labels=caseRecord.reviewStatus==='COMPLETED'?['Case Created','Images Added','AI Processing','Doctor Opened Case','Decision','Coordinator Updated']:caseRecord.reviewStatus==='REVIEW_REQUIRED'?['Case Created','Images Added','AI Processing','Review Required']:['Case Created','Images Added','AI Processing','Screening Complete'];
  return labels.map((label,eventIndex)=>({id:`seed-${caseRecord.id}-${eventIndex}`,caseId:caseRecord.id,label,date:caseRecord.created,timestamp:(index+1)*10+eventIndex}));
}

export function DemoProvider({children}:{children:ReactNode}){
  const [state,setState]=useState<DemoState>(()=>{
    try{
      const saved=localStorage.getItem('drishti-demo-state');
      if(!saved)return initial;
      const parsed=JSON.parse(saved) as Partial<DemoState>;
      const savedCases=parsed.cases||[];
      const mergedCases=[...savedCases,...cases.filter(seed=>!savedCases.some(existing=>existing.id===seed.id))];
      const savedPatients=parsed.patients||[];
      const mergedPatients=[...savedPatients,...patients.filter(seed=>!savedPatients.some(existing=>existing.id===seed.id))];
      const statusFor=(c:Case):AIResultStatus=>{const savedStatus=c.aiResult?.status;if(savedStatus)return savedStatus==='CONFIDENT'?'HIGH_CONFIDENCE_NEGATIVE':savedStatus;if(/high.?confidence positive/i.test(c.aiRecommendation||''))return 'HIGH_CONFIDENCE_POSITIVE';if(/high.?confidence/i.test(c.aiRecommendation||''))return 'HIGH_CONFIDENCE_NEGATIVE';if(/positive/i.test(c.aiRecommendation||''))return 'POSITIVE';if(/no concerning/i.test(c.aiRecommendation||''))return 'NEGATIVE';return c.priority==='High confidence'?'HIGH_CONFIDENCE_NEGATIVE':'NEEDS_SPECIALIST_REVIEW'};
      const normalizedCases=mergedCases.map(c=>{
        const result=fixtureResult(statusFor(c),c.aiResult?.generatedAt||c.created);
        if(c.aiResult){result.source=c.aiResult.source==='SIMULATED_AI'?'SIMULATED_AI':c.aiResult.source==='MODEL'?'MODEL':'DEMO_FIXTURE';result.explanation=c.aiResult.explanation;result.evidence=c.aiResult.evidence||[]}
        const requiresReview=result.status==='POSITIVE'||result.status==='HIGH_CONFIDENCE_POSITIVE'||result.status==='NEEDS_SPECIALIST_REVIEW';
        const completed=c.reviewStatus==='COMPLETED'||c.status==='COMPLETED';
        return {...c,aiResult:result,aiRecommendation:aiResultLabel(result.status),priority:requiresReview?'Review Needed' as const:'High confidence' as const,status:completed?'COMPLETED':requiresReview?'REVIEW_REQUIRED':'SCREENING_COMPLETE',eye:c.eye==='Right eye available'?'Right eye available · Left eye unavailable':c.eye==='Left eye available'?'Left eye available · Right eye unavailable':c.eye,reviewStatus:completed?'COMPLETED' as const:requiresReview?'REVIEW_REQUIRED' as const:undefined,sourcePhc:c.sourcePhc||'Rampur PHC',screeningWorker:c.screeningWorker||'ASHA worker',followUpStatus:c.followUpStatus||(requiresReview?'OUTSTANDING':undefined)};
      });
      let normalizedEvents=parsed.auditEvents||[];
      for(const c of normalizedCases){if(!normalizedEvents.some(e=>e.caseId===c.id)){const labels=c.reviewStatus==='COMPLETED'?['Case Created','Images Added','AI Processing','Review Required','Doctor Opened Case','Decision','Coordinator Updated']:c.reviewStatus==='REVIEW_REQUIRED'?['Case Created','Images Added','AI Processing','Review Required']:['Case Created','Images Added','AI Processing','Screening Complete'];for(const [i,label] of labels.entries())normalizedEvents.push({id:`migrated-${c.id}-${i}`,caseId:c.id,label,date:c.created,timestamp:Date.now()+i})}}
      return {...initial,...parsed,patients:mergedPatients,cases:normalizedCases,auditEvents:normalizedEvents};
    }catch{return initial}
  });
  useEffect(()=>{localStorage.setItem('drishti-demo-state',JSON.stringify(state))},[state]);
  const value=useMemo<ContextValue>(()=>({
    state,
    login:(role,id,password)=>{const c=credentials[role];if(!c||id!==c.id||password!==c.secret)return false;setState(s=>({...s,currentRole:role}));return true},
    logout:()=>setState(s=>({...s,currentRole:null})),
    selectCase:c=>setState(s=>({...s,currentCase:c,currentPatient:s.patients.find(p=>p.id===c.patientId)||null})),
    selectPatient:p=>setState(s=>({...s,currentPatient:p})),
    beginNewScreening:()=>setState(s=>({...s,currentCase:null,currentPatient:null,analysisState:'idle',aiResult:null,reviewStatus:'Not started',doctorDecision:null,followUpStatus:'Not started'})),
    resetDemo:()=>setState(s=>({...initial,currentRole:s.currentRole})),
    loadDemoCase:kind=>{
      const template=kind==='PRIMARY'?cases[0]:cases[1];
      const patient=patients.find(p=>p.id===template.patientId)!;
      const fresh={...template,aiResult:template.aiResult||fixtureResult(kind==='PRIMARY'?'NEEDS_SPECIALIST_REVIEW':'HIGH_CONFIDENCE_NEGATIVE')};
      setState(s=>({...s,patients:s.patients.some(p=>p.id===patient.id)?s.patients:[patient,...s.patients],cases:[fresh,...s.cases.filter(c=>c.id!==fresh.id)],currentPatient:patient,currentCase:fresh,analysisState:'complete',aiResult:fresh.aiResult||null,reviewStatus:fresh.reviewStatus||'Not required',doctorDecision:null,followUpStatus:fresh.followUpStatus||'Not required',auditEvents:[...starterEvents(fresh),...s.auditEvents.filter(event=>event.caseId!==fresh.id)]}));
      return fresh;
    },
    registerPatient:p=>setState(s=>({...s,patients:[p,...s.patients.filter(existing=>existing.id!==p.id)],currentPatient:p})),
    submitScreening:(patient,aiResult,imageData?:Case['imageData'],singleEye?:'Right eye'|'Left eye')=>{
      const review=aiResult.status==='POSITIVE'||aiResult.status==='HIGH_CONFIDENCE_POSITIVE'||aiResult.status==='NEEDS_SPECIALIST_REVIEW';
      const priority=review?'Review Needed':'High confidence';
      const c:Case={id:`DR-2026-${Date.now()}`,patientId:patient.id,created:'Just now',priority,status:review?'REVIEW_REQUIRED':'SCREENING_COMPLETE',eye:singleEye?`${singleEye} available · ${singleEye==='Right eye'?'Left eye':'Right eye'} unavailable`:'Both eyes available',sourcePhc:'Rampur PHC',aiRecommendation:aiResultLabel(aiResult.status),aiResult,reviewStatus:review?'REVIEW_REQUIRED':undefined,screeningWorker:'ASHA worker',imageData,followUpStatus:review?'OUTSTANDING':undefined};
      setState(s=>({...s,currentPatient:patient,currentCase:c,cases:[c,...s.cases],analysisState:'complete',aiResult,reviewStatus:review?'REVIEW_REQUIRED':'Not required',followUpStatus:review?'Follow-up pending':'Not required',auditEvents:[...addAudit(addAudit(addAudit(addAudit(s.auditEvents,c.id,'Case Created'),c.id,'Images Added'),c.id,'AI Processing'),c.id,review?'Review Required':'Screening Complete')]}));
      return c;
    },
    openReviewCase:caseId=>setState(s=>{
      if(s.currentRole!=='OPHTHALMOLOGIST')return s;
      const c=s.cases.find(x=>x.id===caseId);if(!c)return s;
      const already=c.doctorOpened;
      return {...s,currentCase:c,currentPatient:s.patients.find(p=>p.id===c.patientId)||null,cases:s.cases.map(x=>x.id===caseId?{...x,doctorOpened:true}:x),auditEvents:already?s.auditEvents:addAudit(s.auditEvents,caseId,'Doctor Opened Case')};
    }),
    submitDoctorReview:(caseId,action,decision,note)=>{
      if(state.currentRole!=='OPHTHALMOLOGIST'||state.cases.find(c=>c.id===caseId)?.reviewStatus==='COMPLETED'||(action==='OVERRIDE_AI_RESULT'&&!note.trim()))return false;
      const reviewedAt=new Date().toISOString();
      setState(s=>{
        if(s.currentRole!=='OPHTHALMOLOGIST')return s;
        const existing=s.cases.find(c=>c.id===caseId);if(!existing||existing.reviewStatus==='COMPLETED')return s;
        const needsFollowUp=/refer|follow-up|review required/i.test(decision);
        const finalized={...existing,reviewStatus:'COMPLETED' as const,status:'COMPLETED',doctorDecision:decision,reviewAction:action,doctorNote:note.trim(),reviewTimestamp:reviewedAt,followUpStatus:needsFollowUp?'OUTSTANDING' as const:undefined};
        let events=addAudit(s.auditEvents,caseId,'Decision');
        events=addAudit(events,caseId,'Coordinator Updated');
        return {...s,cases:s.cases.map(c=>c.id===caseId?finalized:c),currentCase:finalized,reviewStatus:'COMPLETED',doctorDecision:decision,followUpStatus:decision.toLowerCase().includes('follow-up')?'Follow-up scheduled':'No follow-up required',auditEvents:events};
      });
      return true;
    },
    markFollowUpComplete:caseId=>{
      if(state.currentRole!=='COORDINATOR')return false;
      setState(s=>{
        const current=s.cases.find(c=>c.id===caseId);if(!current||current.followUpStatus!=='OUTSTANDING')return s;
        return {...s,cases:s.cases.map(c=>c.id===caseId?{...c,followUpStatus:'COMPLETED' as const}:c),auditEvents:addAudit(s.auditEvents,caseId,'Follow-up Completed')};
      });
      return true;
    },
  }),[state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useDemo(){const v=useContext(Ctx);if(!v)throw new Error('DemoProvider missing');return v}
