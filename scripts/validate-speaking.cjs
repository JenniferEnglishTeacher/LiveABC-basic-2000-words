const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),sentences=require("./speech-sentences.json");
function targetForm(item){const base=item.word.toLowerCase(),forms=new Set([base,base+"s",base+"es",base+"ed",base+"d",base+"ing"]);if(base.endsWith("e"))forms.add(base.slice(0,-1)+"ing");if(base.endsWith("y")){forms.add(base.slice(0,-1)+"ies");forms.add(base.slice(0,-1)+"ied");}const tokens=item.sample_sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)||[];return tokens.find(t=>forms.has(t.toLowerCase()))||item.word}
let count=0,forms=[];
for(let n=1;n<=6;n++){
 const html=fs.readFileSync(path.join(root,"unit-0"+n,"unit-0"+n+"-quiz.html"),"utf8");
 const data=JSON.parse(html.match(/<script id="unit-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.unit,n);assert.equal(data.vocabulary.length,sentences[n].length);assert.deepEqual(data.vocabulary.map(v=>v.sample_sentence),sentences[n]);
 for(const item of data.vocabulary){const form=targetForm(item);assert(new RegExp("\\b"+form+"\\b","i").test(item.sample_sentence),item.word+" missing from sample");forms.push(form)}
 assert(html.includes('../speech.js'));assert(html.includes('../speech.css'));count+=data.vocabulary.length;
}
assert.deepEqual(forms.slice(0,10),["close","learn","past","appeared","insects","except","believe","space","hit","waves"]);
const speech=fs.readFileSync(path.join(root,"speech.js"),"utf8");new vm.Script(speech,{filename:"speech.js"});
for(const marker of ["targetForm","speech-spell-input","checkSpelling","SpeechRecognition","getUserMedia","80%","朗讀為選做"]){assert(speech.includes(marker),"Missing "+marker)}
assert(!speech.includes("fetch("));console.log(`Validated 6 units, ${count} sample sentences, target-word forms, required spelling, optional speech recognition, and JavaScript syntax.`);