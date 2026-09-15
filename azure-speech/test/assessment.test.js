const {test}=require("node:test");
const assert=require("node:assert/strict");
const {assess,normalizeResult,validWav}=require("../src/assessment");
const score=(accuracy,completeness)=>({RecognitionStatus:"Success",NBest:[{AccuracyScore:accuracy,CompletenessScore:completeness,Display:"Test",Words:[]}]});
test("80 passes, 79.99 stays locked, incomplete reading stays locked",()=>{
  assert.equal(normalizeResult(score(80,80)).passed,true);
  assert.equal(normalizeResult(score(79.99,100)).passed,false);
  assert.equal(normalizeResult(score(100,79.99)).passed,false);
  assert.equal(normalizeResult({RecognitionStatus:"NoMatch"}).passed,false);
  assert.throws(()=>normalizeResult(score(undefined,100)));
  assert.throws(()=>normalizeResult(score("100",100)));
});
const env={ALLOWED_ORIGIN:"https://class.example",CLASS_ACCESS_CODE:"test-code",AZURE_SPEECH_KEY:"test-only",AZURE_SPEECH_ENDPOINT:"https://test.cognitiveservices.azure.com"};
function wav(){const b=Buffer.alloc(32044);b.write("RIFF");b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(b.length-44,40);return b;}
const input=()=>({origin:env.ALLOWED_ORIGIN,code:env.CLASS_ACCESS_CODE,body:{unit:1,index:0,audio:wav().toString("base64")}});
test("validates audio and rejects malformed WAV",()=>{assert.equal(validWav(wav()),true);assert.equal(validWav(Buffer.alloc(44)),false);const b=wav();b.writeUInt32LE(48000,24);assert.equal(validWav(b),false);});
test("rejects access, sentence, and audio errors before calling Azure",async()=>{
  const noFetch=()=>{throw new Error("must not call Azure");};
  for(const [change,status] of [[{origin:"https://other.example"},403],[{code:"wrong"},401],[{body:{unit:9,index:0,audio:"AAAA"}},400],[{body:{unit:1,index:0,audio:"AAAA"}},400]]){
    assert.equal((await assess({...input(),...change},env,noFetch)).status,status);
  }
});
test("uses server-owned reference and returns Azure scores",async()=>{
  const r=await assess(input(),env,async(url,options)=>{
    assert.equal(url.protocol,"https:");
    const p=JSON.parse(Buffer.from(options.headers["Pronunciation-Assessment"],"base64"));
    assert.match(p.ReferenceText,/teacher told the students/);assert.equal(p.EnableMiscue,true);
    return {ok:true,json:async()=>score(88,100)};
  });
  assert.equal(r.status,200);assert.equal(r.jsonBody.passed,true);
});
test("handles rate limits, malformed results, and network errors safely",async()=>{
  assert.equal((await assess(input(),env,async()=>({ok:false,status:429}))).status,429);
  assert.equal((await assess(input(),env,async()=>({ok:true,json:async()=>score(null,100)}))).status,502);
  assert.equal((await assess(input(),env,async()=>{throw new Error("secret upstream text");})).jsonBody.error.includes("secret"),false);
});
