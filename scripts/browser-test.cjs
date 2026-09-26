const {chromium}=require("playwright"),assert=require("node:assert/strict");
function targetForm(item){const base=item.word.toLowerCase(),forms=new Set([base,base+"s",base+"es",base+"ed",base+"d",base+"ing"]);const irregular={win:["won"],sell:["sold"],draw:["drew"],lend:["lent"],wake:["woke"],shine:["shone"],step:["stepped"],send:["sent"],become:["became"],catch:["caught"],drop:["dropped"],"fall asleep":["fell asleep"],"make a difference":["made a big difference"],hide:["hid"],rob:["robbed"],understand:["understood"],spend:["spent"],"bring up":["brought up"],choose:["chose"],lead:["led"],"drive out":["driven out"]}[base]||[];irregular.forEach(v=>forms.add(v));if(base.endsWith("e"))forms.add(base.slice(0,-1)+"ing");if(base.endsWith("y")){forms.add(base.slice(0,-1)+"ies");forms.add(base.slice(0,-1)+"ied")}if(base.startsWith("be ")){const lower=item.sample_sentence.toLowerCase(),tail=base.slice(3),phrase=["am ","is ","are ","was ","were ","be ","been ","being "].map(v=>v+tail).find(v=>lower.includes(v));if(phrase){const start=lower.indexOf(phrase);return item.sample_sentence.slice(start,start+phrase.length)}}const sampleLower=item.sample_sentence.toLowerCase(),phraseForm=[...forms].find(v=>v.includes(" ")&&sampleLower.includes(v));if(phraseForm){const start=sampleLower.indexOf(phraseForm);return item.sample_sentence.slice(start,start+phraseForm.length)}const tokens=item.sample_sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)||[];return tokens.find(t=>forms.has(t.toLowerCase()))||item.word}
(async()=>{
 const browser=await chromium.launch({channel:"msedge",headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{
  window.__heard="";
  Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
  class FakeRecognition{start(){setTimeout(()=>{this.onresult?.({results:[[{transcript:window.__heard}]]});this.onend?.()},20)}abort(){this.onend?.()}}
  Object.defineProperty(window,"SpeechRecognition",{configurable:true,value:FakeRecognition});
  Object.defineProperty(window,"webkitSpeechRecognition",{configurable:true,value:FakeRecognition});
 });
 const page=await context.newPage(),errors=[];let posts=0;
 page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>{if(r.method()==="POST")posts++});
 await page.goto("http://127.0.0.1:8765/");assert.equal(await page.locator('a[href$="#speech"]').count(),32);
 for(let n=1;n<=32;n++){
  const u=String(n).padStart(2,"0"); await page.goto("http://127.0.0.1:8765/unit-"+u+"/unit-"+u+"-quiz.html#speech");
  await page.evaluate(()=>localStorage.clear());await page.reload();
  assert.match(await page.locator("#speech-title").innerText(),/Spell and Read Aloud/);
  assert.equal(await page.locator("#speech-next").isDisabled(),true);
  assert.equal(await page.locator("#speech-voice-panel").isHidden(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator("#speech-spell-input").fill("wrong");
  await page.locator("#speech-check-spelling").click();
  assert.match(await page.locator("#speech-spell-feedback").innerText(),/不正確/);
  assert.equal(await page.locator("#speech-next").isDisabled(),true);
  const first=await page.evaluate(()=>JSON.parse(document.getElementById("unit-data").textContent).vocabulary[0]);
  await page.locator("#speech-spell-input").fill(targetForm(first));
  await page.locator("#speech-check-spelling").click();
  assert.match(await page.locator("#speech-spell-feedback").innerText(),/拼字正確/);
  assert.equal(await page.locator("#speech-voice-panel").isVisible(),true);
  assert.equal(await page.locator("#speech-next").isDisabled(),false);
 }
 await page.goto("http://127.0.0.1:8765/unit-01/unit-01-quiz.html#speech");await page.evaluate(()=>localStorage.clear());await page.reload();
 const answers=["close","learn","past","appeared","insects","except","believe","space","hit","waves"];
 for(let i=0;i<answers.length;i++){
  await page.locator("#speech-spell-input").fill(answers[i]);await page.locator("#speech-check-spelling").click();
  assert.match(await page.locator("#speech-spell-feedback").innerText(),/拼字正確/);
  if(i<answers.length-1){assert.equal(await page.locator("#speech-next").isDisabled(),false);await page.locator("#speech-next").click()}
 }
 const expected=await page.locator("#speech-sentence").innerText();await page.evaluate(v=>window.__heard=v,expected);
 await page.locator("#speech-mic").click();await page.waitForFunction(()=>document.getElementById("speech-result").textContent.includes("100%"));
 assert.match(await page.locator("#speech-result").innerText(),/朗讀通過/);
 await page.evaluate(()=>window.__heard="Sean was afraid");await page.locator("#speech-mic").click();
 await page.waitForFunction(()=>document.getElementById("speech-result").textContent.includes("未達 80%"));
 assert.match(await page.locator("#speech-result").innerText(),/朗讀為選做|直接前往/);
 await page.reload();assert.equal(await page.locator("#speech-voice-panel").isVisible(),true);
 assert.equal(posts,0);assert.deepEqual(errors,[]);
 await page.screenshot({path:"speaking-mobile.png",fullPage:true});await browser.close();
 console.log("Browser checks passed: spelling blocks Next, wrong spelling retries, all 10 Unit 1 forms including inflections pass, pronunciation remains optional, progress persists, no website audio upload, and mobile layout fits.");
})().catch(e=>{console.error(e);process.exit(1)});
