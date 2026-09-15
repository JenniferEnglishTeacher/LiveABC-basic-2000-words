const {app}=require("@azure/functions");
const {assess}=require("./assessment");
app.http("pronunciation",{
  methods:["POST","OPTIONS"],authLevel:"anonymous",route:"pronunciation",
  handler:async request=>{
    const origin=request.headers.get("origin")||"";
    const allowed=origin===process.env.ALLOWED_ORIGIN;
    const headers={"Cache-Control":"no-store","Vary":"Origin"};
    if(allowed)Object.assign(headers,{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, X-Class-Code"});
    if(request.method==="OPTIONS")return {status:allowed?204:403,headers};
    // Reject oversized payloads before decoding audio or calling the paid service.
    if(Number(request.headers.get("content-length"))>1300000)return {status:413,headers,jsonBody:{error:"Recording is too large."}};
    let body;
    try{const raw=await request.text();if(raw.length>1300000)return {status:413,headers,jsonBody:{error:"Recording is too large."}};body=JSON.parse(raw);}
    catch{return {status:400,headers,jsonBody:{error:"Invalid recording request."}};}
    const result=await assess({origin,code:request.headers.get("x-class-code"),body});
    return {...result,headers};
  }
});
