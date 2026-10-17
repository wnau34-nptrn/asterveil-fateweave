// Pass the installed sharp module path as argument. Run after build.py.
const sharp=require(process.argv[2]);
const fs=require('fs');const path=require('path');
const out=path.resolve(__dirname,'..');
const names=['chest','chest-open','ore','ember','seal','pack','star','star-filled'];
async function svg(name,size){let text=fs.readFileSync(path.join(out,'icons',name+'.svg'),'utf8').replaceAll('currentColor','#f4f7fc');return await sharp(Buffer.from(text)).resize(size,size).png().toBuffer();}
(async()=>{
 let layers=[];
 for(let i=0;i<names.length;i++)for(const [top,size] of [[300,24],[352,15]])layers.push({input:await svg(names[i],size),left:40+i*88,top});
 await sharp(path.join(out,'review/items-base.png')).composite(layers).png().toFile(path.join(out,'review/items-sizes.png'));
 layers=[];for(let i=0;i<5;i++)layers.push({input:await svg(i<3?'star_badge':'star_badge_empty',24),left:72+i*28,top:24});
 await sharp(path.join(out,'review/star-base.png')).composite(layers).png().toFile(path.join(out,'review/star-row.png'));
 fs.unlinkSync(path.join(out,'review/items-base.png'));fs.unlinkSync(path.join(out,'review/star-base.png'));
})();
