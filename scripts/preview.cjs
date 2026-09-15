const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const file=path.resolve(root,"."+pathname+(pathname.endsWith("/")?"index.html":""));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const types={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".mp3":"audio/mpeg"};
  fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{"Content-Type":types[path.extname(file)]||"application/octet-stream"});res.end(error?"Not found":data);});
}).listen(8765,"127.0.0.1",()=>console.log("Preview: http://127.0.0.1:8765"));
