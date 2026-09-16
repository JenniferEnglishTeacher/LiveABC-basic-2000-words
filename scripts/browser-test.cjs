const {chromium}=require("playwright"),assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({channel:"msedge",headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{
   window.__heard="";
   Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
   class FakeRecognition{
     start(){setTimeout(()=>{this.onresult?.({results:[[{transcript:window.__heard}]]});this.onend?.()},20)}
     abort(){this.onend?.()}
   }
   Object.defineProperty(window,"SpeechRecognition",{configurable:true,value:FakeRecognition});Object.defineProperty(window,"webkitSpeechRecognition",{configurable:true,value:FakeRecognition});
 });
 const page=await context.newPage(),errors=[];let posts=0;
 page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>{if(r.method()==="POST")posts++});
 await page.goto("http://127.0.0.1:8765/");
 assert.equal(await page.locator('a[href$="#speech"]').count(),3);
 for(let n=1;n<=3;n++){
   await page.goto("http://127.0.0.1:8765/unit-0"+n+"/unit-0"+n+"-quiz.html#speech");
   await page.locator("#speech-title").waitFor();
   assert.match(await page.locator("#speech-title").innerText(),/選做/);
   assert.equal(await page.locator("#speech-next").isDisabled(),false);
   assert.equal(await page.locator("#speech-prev").isDisabled(),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.locator("#speech-next").click();
   assert.match(await page.locator("#speech-position").innerText(),/Word 2/);
   await page.locator("#speech-prev").click();
   assert.match(await page.locator("#speech-position").innerText(),/Word 1/);
 }
 await page.goto("http://127.0.0.1:8765/unit-01/unit-01-quiz.html#speech");
 const expected=await page.locator("#speech-sentence").innerText();
 await page.evaluate(v=>window.__heard=v,expected);
 await page.locator("#speech-mic").click();
 await page.waitForFunction(()=>document.getElementById("speech-result").textContent.includes("100%"));
 assert.match(await page.locator("#speech-result").innerText(),/朗讀通過/);
 assert.equal(await page.locator("#speech-next").isDisabled(),false);
 await page.evaluate(()=>window.__heard="the teacher");
 await page.locator("#speech-mic").click();
 await page.waitForFunction(()=>document.getElementById("speech-result").textContent.includes("未達 80%"));
 assert.equal(await page.locator("#speech-next").isDisabled(),false);
 assert.equal(posts,0);assert.deepEqual(errors,[]);
 await page.screenshot({path:"speaking-mobile.png",fullPage:true});
 await browser.close();
 console.log("Browser checks passed: 3 units, optional navigation without speaking, 100% recognition pass, sub-80 result without blocking, no audio upload, and mobile layout.");
})().catch(e=>{console.error(e);process.exit(1)});