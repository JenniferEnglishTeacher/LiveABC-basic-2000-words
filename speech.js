(() => {
"use strict";
const unit = JSON.parse(document.getElementById("unit-data").textContent);
const items = unit.vocabulary;
const panel = document.createElement("section");
panel.id = "speech";
panel.setAttribute("aria-labelledby", "speech-title");
panel.innerHTML = '<h2 id="speech-title">Part 4 — Read Aloud · 朗讀練習</h2>'+
'<p>Read each complete sentence aloud. Reach <strong>80% pronunciation accuracy</strong> and at least <strong>80% sentence completeness</strong> to unlock the next word. 未達 80% 請再試一次。</p>'+
'<p class="meta">Azure assesses your speech sounds. You can record and replay on this device. When scoring is connected, “Stop & score” sends your audio to Microsoft through the school’s scoring service. Progress is saved on this browser.</p>'+
'<label>Class access code · 班級代碼 <input class="speech-access" id="speech-code" type="password" autocomplete="off"></label>'+
'<p id="speech-position"></p><progress class="speech-progress" id="speech-progress" aria-label="Passed sentences"></progress>'+
'<h3 id="speech-word"></h3><p class="speech-sentence" id="speech-sentence"></p>'+
'<div class="speech-controls"><button type="button" id="speech-listen">Listen to example</button><button type="button" id="speech-record">Record sentence</button><button type="button" id="speech-stop" disabled>Stop & score</button><button type="button" id="speech-cancel" disabled>Cancel</button><button type="button" id="speech-next" disabled>Next word →</button></div>'+
'<p id="speech-time">Maximum recording: 28 seconds</p><p class="speech-status" id="speech-status" role="status" aria-live="polite"></p>'+
'<audio id="speech-playback" controls hidden aria-label="Your recording"></audio><div id="speech-result" hidden></div>'+
'<div class="speech-controls"><button type="button" id="speech-restart">Restart this unit’s speaking practice</button></div>';
document.querySelector(".actions").before(panel);
const $ = id => document.getElementById("speech-" + id);
const config = window.LIVEABC_SPEECH || {};
let endpoint;
try { endpoint = new URL(config.endpoint); if(endpoint.protocol !== "https:") endpoint = null; } catch { endpoint = null; }
const supported = window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.AudioContext && window.AudioWorkletNode;
const storageKey = "liveabc-azure-speech-v1-unit-" + unit.unit;
let records = [], index = 0, state = "idle", stream, context, source, node, mute, chunks = [], timer, started = 0, previewURL, request, generation = 0;
const fingerprint = JSON.stringify(items.map(v => v.sample_sentence));
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.fingerprint === fingerprint && Array.isArray(saved.records)) {
    for (const r of saved.records.slice(0,items.length)) {
      if (!r || !Number.isFinite(r.accuracy) || !Number.isFinite(r.completeness) || r.accuracy < 80 || r.accuracy > 100 || r.completeness < 80 || r.completeness > 100) break;
      records.push(r);
    }
    index = Math.min(records.length, items.length - 1);
  }
} catch {}
function status(message) { $("status").textContent = message; }
function save() {
  try { localStorage.setItem(storageKey,JSON.stringify({fingerprint,records})); }
  catch { status("Passed! Browser storage is unavailable; keep this page open to retain progress."); }
}
function controls() {
  const busy = state !== "idle";
  $("record").disabled = busy || !supported || !!records[index];
  $("listen").disabled = busy || !window.speechSynthesis;
  $("stop").disabled = state !== "recording";
  $("cancel").disabled = !busy;
  $("next").disabled = busy || !records[index] || index === items.length - 1;
  $("restart").disabled = busy;
  $("code").disabled = busy;
}
function render() {
  $("code").closest("label").hidden = !endpoint;
  $("stop").textContent = endpoint ? "Stop & score" : "Stop recording";
  $("position").textContent = "Word " + (index+1) + " of " + items.length + " · " + records.length + " passed";
  $("progress").max = items.length; $("progress").value = records.length;
  $("word").textContent = items[index].word + " · " + items[index].part_of_speech + " · " + items[index].meaning_zh_tw;
  $("sentence").textContent = items[index].sample_sentence;
  $("result").hidden = true;
  if (records.length === items.length) status("Unit complete! All sentences passed. 本單元朗讀完成！");
  else if (!supported) status("Microphone recording is unavailable. Open this HTTPS page in an up-to-date Chrome, Edge or Safari browser and allow microphone access.");
  else if (!endpoint) status("Recording and replay are available now. Select Record sentence and allow microphone access. Pronunciation scoring and the next sentence will be available once your teacher connects Azure.");
  else status("Listen, then record the complete sentence. Each new attempt replaces the previous attempt.");
  controls();
}
function clearPreview() {
  $("playback").pause(); $("playback").removeAttribute("src"); $("playback").hidden = true;
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
}
function release() {
  clearInterval(timer);
  if (node) { node.port.onmessage = null; node.disconnect(); node = null; }
  source?.disconnect(); source = null; mute?.disconnect(); mute = null;
  stream?.getTracks().forEach(t => t.stop()); stream = null;
  if(context) { context.close().catch(()=>{}); context = null; }
}
function wav(samples, sampleRate) {
  const count = Math.floor(samples.length * 16000 / sampleRate);
  const buffer = new ArrayBuffer(44 + count * 2), view = new DataView(buffer);
  const word = (offset, text) => [...text].forEach((ch,i) => view.setUint8(offset+i,ch.charCodeAt(0)));
  word(0,"RIFF"); view.setUint32(4,buffer.byteLength-8,true); word(8,"WAVE"); word(12,"fmt ");
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
  view.setUint32(24,16000,true); view.setUint32(28,32000,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
  word(36,"data"); view.setUint32(40,count*2,true);
  for(let i=0;i<count;i++) {
    const start = Math.floor(i*sampleRate/16000), end = Math.max(start+1,Math.floor((i+1)*sampleRate/16000));
    let sum=0; for(let j=start;j<Math.min(end,samples.length);j++) sum+=samples[j];
    const s=Math.max(-1,Math.min(1,sum/(end-start))); view.setInt16(44+i*2,s<0?s*32768:s*32767,true);
  }
  return buffer;
}
function showResult(result) {
  const good = result.passed === true && Number.isFinite(result.accuracy) && result.accuracy >= 80 && result.accuracy <= 100 && Number.isFinite(result.completeness) && result.completeness >= 80 && result.completeness <= 100;
  const box=$("result"); box.hidden=false; box.className="speech-result"+(good?" pass":""); box.replaceChildren();
  const line=document.createElement("p");
  line.textContent="Pronunciation accuracy: "+Math.floor(result.accuracy)+"% · Completeness: "+Math.floor(result.completeness)+"%";
  box.append(line);
  const heard=document.createElement("p"); heard.textContent="Heard: "+(result.transcript||"(No speech recognized)");box.append(heard);
  const words=document.createElement("div"); words.className="speech-words";
  (result.words||[]).filter(w=>w.error!=="None"||w.accuracy<80).forEach(w=>{
    const span=document.createElement("span");span.className="speech-word";
    span.textContent=w.word+" — "+(w.error==="Omission"?"missing":Math.floor(w.accuracy)+"%"+(w.error&&w.error!=="None"?" · "+w.error:""));words.append(span);
  });
  box.append(words);
  if(good) {
    records[index]={accuracy:result.accuracy,completeness:result.completeness};
    $("progress").value=records.length;
    $("position").textContent="Word "+(index+1)+" of "+items.length+" · "+records.length+" passed";
    status(index===items.length-1?"Unit complete! All sentences passed. 本單元朗讀完成！":"Passed! Select Next word to continue. 達標！可以進入下一個單字。");
    save();
  } else status("Try again. Both pronunciation accuracy and sentence completeness must reach 80%. Listen to the example and read the entire sentence.");
}
async function start() {
  if(state!=="idle" || !supported || records[index]) return;
  if(endpoint && !$("code").value.trim()) { status("Enter the class access code from your teacher."); $("code").focus(); return; }
  state="permission"; const token=++generation; controls(); clearPreview(); $("result").hidden=true;
  window.speechSynthesis?.cancel(); document.querySelectorAll("audio").forEach(a=>a.pause());
  status("Allow microphone access when your browser asks.");
  try {
    const audioContext=new AudioContext(); context=audioContext;
    await audioContext.resume();
    if(token!==generation) return;
    const mic=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
    if(token!==generation) {mic.getTracks().forEach(t=>t.stop());return;}
    stream=mic;
    await audioContext.audioWorklet.addModule("../pcm-worklet.js");
    if(token!==generation) return;
    source=audioContext.createMediaStreamSource(stream);
    node=new AudioWorkletNode(audioContext,"pcm-recorder");mute=audioContext.createGain();mute.gain.value=0;
    chunks=[];node.port.onmessage=e=>{if(state==="recording")chunks.push(e.data);};
    source.connect(node);node.connect(mute);mute.connect(audioContext.destination);
    state="recording";started=Date.now();status(endpoint ? "Recording… read the sentence, then select Stop & score." : "Recording… read the sentence, then select Stop recording to replay it.");controls();
    timer=setInterval(()=>{const elapsed=(Date.now()-started)/1000;$("time").textContent="Recording: "+Math.floor(elapsed)+" / 28 seconds";if(elapsed>=28)stop();},200);
  } catch(e) {
    if(token!==generation)return;
    release();state="idle";controls();
    const messages={NotAllowedError:"Microphone permission was blocked. Allow the microphone in this site’s browser settings and retry.",NotFoundError:"No microphone was found. Connect a microphone and retry.",NotReadableError:"The microphone is busy or unavailable. Close other recording apps and retry."};
    status(messages[e.name]||"Recording could not start. Check your microphone and reload the page.");
  }
}
async function stop() {
  if(state!=="recording")return;
  state="scoring";const token=generation;const rate=context.sampleRate;
  const samples=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const c of chunks){samples.set(c,offset);offset+=c.length;}
  chunks=[];release();controls();$("time").textContent="Maximum recording: 28 seconds";status(endpoint ? "Assessing pronunciation…" : "Preparing your recording…");
  if(samples.length<rate*0.3){state="idle";status("The recording was too short. Please read the complete sentence.");controls();return;}
  const audio=wav(samples,rate);previewURL=URL.createObjectURL(new Blob([audio],{type:"audio/wav"}));$("playback").src=previewURL;$("playback").hidden=false;
  if(!endpoint) {
    state="idle"; controls();
    status("Recording ready! Press Play below to hear yourself, or Record sentence to try again. Audio stays on this device. Azure scoring is not connected yet, so the next sentence remains locked.");
    return;
  }
  let binary="";const bytes=new Uint8Array(audio);for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  request=new AbortController();const timeout=setTimeout(()=>request?.abort(),25000);
  try {
    const response=await fetch(endpoint.href,{method:"POST",headers:{"Content-Type":"application/json","X-Class-Code":$("code").value.trim()},body:JSON.stringify({unit:unit.unit,index,audio:btoa(binary)}),signal:request.signal});
    const result=await response.json();
    if(token!==generation)return;
    if(!response.ok)throw new Error(result.error||"Scoring is unavailable. Please retry later.");
    if(!Number.isFinite(result.accuracy)||!Number.isFinite(result.completeness))throw new Error("No valid score was returned. Please retry.");
    showResult(result);
  } catch(e) { if(token===generation)status(e.name==="AbortError"?"Scoring timed out. Check your connection and try again.":e.message==="Failed to fetch"?"Unable to reach scoring. Check your internet connection or ask your teacher to check the service.":e.message); }
  finally {clearTimeout(timeout);if(token===generation){request=null;state="idle";controls();}}
}
function cancel() { ++generation;request?.abort();request=null;release();chunks=[];state="idle";status("Attempt cancelled. Record again when ready.");controls(); }
$("record").addEventListener("click",start);$("stop").addEventListener("click",stop);$("cancel").addEventListener("click",cancel);
$("listen").addEventListener("click",()=>{
  if(state!=="idle")return;document.querySelectorAll("audio").forEach(a=>a.pause());speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(items[index].sample_sentence);utterance.lang="en-US";utterance.rate=0.85;speechSynthesis.speak(utterance);
});
$("next").addEventListener("click",()=>{if(state!=="idle"||!records[index]||index>=items.length-1)return;window.speechSynthesis?.cancel();clearPreview();index++;render();$("sentence").tabIndex=-1;$("sentence").focus();});
$("restart").addEventListener("click",()=>{if(state!=="idle"||!confirm("Clear this unit’s speaking progress on this browser?"))return;records=[];index=0;clearPreview();save();render();});
window.addEventListener("pagehide",()=>{cancel();window.speechSynthesis?.cancel();clearPreview();});
render();
})();
