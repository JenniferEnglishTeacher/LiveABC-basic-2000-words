const {chromium}=require("playwright"),assert=require("node:assert/strict");
(async()=>{
const browser=await chromium.launch({channel:"msedge",headless:true,args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"]});
const context=await browser.newContext({permissions:["microphone"],viewport:{width:390,height:844}});
const page=await context.newPage();const errors=[];let uploads=0;page.on("request",r=>{if(r.method()==="POST")uploads++;});page.on("pageerror",e=>errors.push(e.message));
await page.goto("http://127.0.0.1:8765/");
assert.equal(await page.locator('a[href$="#speech"]').count(),3);
for(let n=1;n<=3;n++){
 await page.goto("http://127.0.0.1:8765/unit-0"+n+"/unit-0"+n+"-quiz.html#speech");
 await page.locator("#speech-title").waitFor();
 assert.equal(await page.locator("#speech-next").isDisabled(),true);
 assert.equal(await page.locator("#speech-record").isDisabled(),false);
 assert.match(await page.locator("#speech-status").innerText(),/Recording and replay/);
assert.equal(await page.locator("#speech-code").isVisible(),false);
await page.locator("#speech-record").click();
await page.waitForFunction(()=>!document.getElementById("speech-stop").disabled);
await page.waitForTimeout(700);
assert.equal(await page.locator("#speech-stop").innerText(),"Stop recording");
await page.locator("#speech-stop").click();
await page.waitForFunction(()=>document.getElementById("speech-playback").duration>0);
assert.equal(await page.locator("#speech-playback").isVisible(),true);
await page.locator("#speech-playback").evaluate(a=>a.play());
await page.waitForFunction(()=>document.getElementById("speech-playback").currentTime>0);
assert.equal(await page.locator("#speech-next").isDisabled(),true);
assert.match(await page.locator("#speech-status").innerText(),/Audio stays on this device/);
assert.equal(await page.locator("#speech-record").isDisabled(),false);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
}
assert.equal(uploads,0);
await page.screenshot({path:"speaking-mobile.png",fullPage:true});
await page.route("**/speech-config.js",r=>r.fulfill({contentType:"text/javascript",body:'window.LIVEABC_SPEECH={endpoint:"https://speech.test/api/pronunciation"};'}));
let score=79.99,completeness=100;
await page.route("https://speech.test/**",r=>r.fulfill({contentType:"application/json",headers:{"Access-Control-Allow-Origin":"*"},body:JSON.stringify({accuracy:score,completeness,passed:score>=80&&completeness>=80,transcript:"Test sentence",words:[]})}));
await page.goto("http://127.0.0.1:8765/unit-01/unit-01-quiz.html#speech");
await page.locator("#speech-code").fill("test-code");
async function attempt(){
 await page.locator("#speech-record").click();
 await page.waitForFunction(()=>!document.getElementById("speech-stop").disabled);
 await page.waitForTimeout(700);
 await page.locator("#speech-stop").click();
 await page.waitForFunction(()=>!document.getElementById("speech-result").hidden);
}
await attempt();assert.equal(await page.locator("#speech-next").isDisabled(),true);
score=100;completeness=79;await attempt();assert.equal(await page.locator("#speech-next").isDisabled(),true);
score=80;completeness=80;await attempt();assert.equal(await page.locator("#speech-next").isDisabled(),false);
await page.locator("#speech-next").click();assert.match(await page.locator("#speech-word").innerText(),/^learn/);assert.equal(await page.locator("#speech-next").isDisabled(),true);
await page.reload();assert.match(await page.locator("#speech-word").innerText(),/^learn/);
assert.equal(await page.locator("#speech-next").isDisabled(),true);
await page.locator("#speech-code").fill("test-code");
await page.locator("#speech-record").click();await page.waitForFunction(()=>!document.getElementById("speech-stop").disabled);await page.locator("#speech-cancel").click();
assert.equal(await page.locator("#speech-record").isDisabled(),false);assert.equal(await page.locator("#speech-next").isDisabled(),true);
await context.close();await browser.close();assert.deepEqual(errors,[]);
console.log("Browser checks passed: 3 units recording/replay without Azure or code, no audio uploads, mobile overflow, 79.99 failure, incomplete reading failure, 80 pass, next-word lock, reload progress, recording cancel. Synthetic microphone and mocked Azure response only.");
})().catch(e=>{console.error(e);process.exit(1);});
