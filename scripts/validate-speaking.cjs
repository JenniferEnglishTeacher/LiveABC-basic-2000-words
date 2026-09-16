const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),sentences=require("./speech-sentences.json");let count=0;
for(let n=1;n<=3;n++){
 const html=fs.readFileSync(path.join(root,"unit-0"+n,"unit-0"+n+"-quiz.html"),"utf8");
 const data=JSON.parse(html.match(/<script id="unit-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.unit,n);assert.equal(data.vocabulary.length,10);
 assert.deepEqual(data.vocabulary.map(v=>v.sample_sentence),sentences[n]);
 assert(html.includes('../speech.js'));assert(!html.includes('../speech-config.js'));assert(html.includes('../speech.css'));
 count+=data.vocabulary.length;
}
const speech=fs.readFileSync(path.join(root,"speech.js"),"utf8");new vm.Script(speech,{filename:"speech.js"});
for(const marker of ["SpeechRecognition","webkitSpeechRecognition","getUserMedia","similarity","80%","Next word"]){assert(speech.includes(marker),"Missing "+marker)}
assert(!speech.includes("LIVEABC_SPEECH"));assert(!speech.includes("fetch("));
console.log("Validated 3 unit pages, 30 original sentences, optional next-word navigation, browser speech recognition, and JavaScript syntax.");