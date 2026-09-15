"use strict";
const sentences=require("../sentences.json");
const {timingSafeEqual}=require("node:crypto");
function normalizeResult(body) {
  if(body.RecognitionStatus!=="Success") return {accuracy:0,completeness:0,passed:false,transcript:"",words:[]};
  const best=body.NBest?.[0], scores=best?.PronunciationAssessment||best;
  const valid=s=>typeof s==="number"&&Number.isFinite(s)&&s>=0&&s<=100;
  if(!valid(scores?.AccuracyScore)||!valid(scores?.CompletenessScore)) throw new Error("Missing assessment scores");
  return {
    accuracy:scores.AccuracyScore,completeness:scores.CompletenessScore,
    passed:scores.AccuracyScore>=80&&scores.CompletenessScore>=80,
    transcript:best.Display||body.DisplayText||"",
    words:(best.Words||[]).map(w=>{const p=w.PronunciationAssessment||w;return {word:w.Word,accuracy:valid(p.AccuracyScore)?p.AccuracyScore:0,error:p.ErrorType||"None"};})
  };
}
function validWav(b) {
  return b.length>=9644&&b.length<=960044&&b.toString("ascii",0,4)==="RIFF"&&b.readUInt32LE(4)===b.length-8&&
    b.toString("ascii",8,12)==="WAVE"&&b.toString("ascii",12,16)==="fmt "&&b.readUInt32LE(16)===16&&b.readUInt16LE(20)===1&&
    b.readUInt16LE(22)===1&&b.readUInt32LE(24)===16000&&b.readUInt32LE(28)===32000&&b.readUInt16LE(32)===2&&b.readUInt16LE(34)===16&&
    b.toString("ascii",36,40)==="data"&&b.readUInt32LE(40)===b.length-44&&(b.length-44)%2===0;
}
async function assess({origin,code,body},env=process.env,fetcher=fetch) {
  if(origin!==env.ALLOWED_ORIGIN) return {status:403,jsonBody:{error:"This website is not allowed to use scoring."}};
  const expected=env.CLASS_ACCESS_CODE;
  if(!expected||!env.AZURE_SPEECH_KEY||!env.AZURE_SPEECH_ENDPOINT) return {status:503,jsonBody:{error:"Your teacher is still setting up pronunciation scoring."}};
  const a=Buffer.from(String(code||"")),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b)) return {status:401,jsonBody:{error:"The class access code is incorrect. Ask your teacher for the code."}};
  if(!body||!Number.isInteger(body.unit)||!Number.isInteger(body.index)||body.index<0||!Object.hasOwn(sentences,body.unit)||!sentences[body.unit][body.index]||typeof body.audio!=="string"||body.audio.length>1280060||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.audio))
    return {status:400,jsonBody:{error:"Invalid sentence or recording."}};
  const audio=Buffer.from(body.audio,"base64");
  if(!validWav(audio))return {status:400,jsonBody:{error:"Please record between 0.3 and 30 seconds of audio and retry."}};
  let url;
  try {
    url=new URL(env.AZURE_SPEECH_ENDPOINT);
    if(url.protocol!=="https:"||!url.hostname.endsWith(".cognitiveservices.azure.com")||url.username||url.password||url.port)throw new Error();
    url.pathname="/stt/speech/recognition/conversation/cognitiveservices/v1";url.search="?language=en-US&format=detailed";
  }catch{return {status:503,jsonBody:{error:"The pronunciation service needs configuration by your teacher."}};}
  const parameters={ReferenceText:sentences[body.unit][body.index],GradingSystem:"HundredMark",Granularity:"Phoneme",Dimension:"Comprehensive",EnableMiscue:true};
  try {
    const response=await fetcher(url,{method:"POST",headers:{"Ocp-Apim-Subscription-Key":env.AZURE_SPEECH_KEY,"Content-Type":"audio/wav; codecs=audio/pcm; samplerate=16000","Accept":"application/json","Pronunciation-Assessment":Buffer.from(JSON.stringify(parameters)).toString("base64")},body:audio,signal:AbortSignal.timeout(20000)});
    if(!response.ok)return {status:response.status===429?429:502,jsonBody:{error:response.status===429?"The service is busy. Please wait a moment before retrying.":"The speech service is unavailable. Ask your teacher to check the connection."}};
    return {status:200,jsonBody:normalizeResult(await response.json())};
  }catch{return {status:502,jsonBody:{error:"Scoring could not finish. Check your connection and try again."}};}
}
module.exports={assess,normalizeResult,validWav};
