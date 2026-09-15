const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),sentences=require("../azure-speech/sentences.json");let count=0;
for(let n=1;n<=3;n++){
 const html=fs.readFileSync(path.join(root,"unit-0"+n,"unit-0"+n+"-quiz.html"),"utf8");
 const data=JSON.parse(html.match(/<script id="unit-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.unit,n);assert.equal(data.vocabulary.length,10);
 assert.deepEqual(data.vocabulary.map(v=>v.sample_sentence),sentences[n]);
 assert(html.includes('../speech.js'));assert(html.includes('../speech-config.js'));assert(html.includes('../speech.css'));
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(!match[0].includes('application/json'))new vm.Script(match[1]);
 count+=data.vocabulary.length;
}
for(const name of ["speech.js","speech-config.js","pcm-worklet.js","azure-speech/src/index.js","azure-speech/src/assessment.js"])new vm.Script(fs.readFileSync(path.join(root,name),"utf8"),{filename:name});
console.log("Validated 3 unit pages, 30 original sentences, shared assets, and JavaScript syntax.");
