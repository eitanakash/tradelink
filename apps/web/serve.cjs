const http=require('http'),fs=require('fs'),path=require('path')
const PORT=process.env.PORT||3000,DIST=path.join(__dirname,'dist')
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff'}
http.createServer((req,res)=>{
  let f=path.join(DIST,req.url==='/'?'index.html':req.url)
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(DIST,'index.html')
  fs.readFile(f,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'})
    res.end(data)
  })
}).listen(PORT,()=>console.log('Serving on '+PORT))
