// Deterministic packaging only. Run from this folder, with sharp resolvable or its path as argv[2].
const sharp = require(process.argv[2] || 'sharp');
const fs = require('node:fs');
const path = require('node:path');
const dir = __dirname;
const names = ['04_lake_spirit','05_crystal_giant','06_swamp_witch','07_flame_general','08_ancient_guardian','09_fate_shadow','10_vargoth_armoured','10_vargoth_unleashed'];
async function main() {
  for (const name of names) {
    const file = path.join(dir, name + '.png');
    const meta = await sharp(file).metadata();
    if (meta.width !== 1024 || meta.height !== 1024) {
      const out = await sharp(file).resize(960,960,{fit:'inside'}).extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).png().toBuffer();
      fs.writeFileSync(file,out);
    }
  }
  const knight = await sharp(path.join(dir,'../../public/assets/art/units.webp')).extract({left:0,top:0,width:512,height:512}).png().toBuffer();
  const figures = [knight, ...names.map(n => path.join(dir,n+'.png'))];
  const layers = [];
  const centres = figures.map((_,i) => 160+i*280);
  for (const [baseline, hero, boss] of [[390,280,280],[760,145,215],[1030,100,120],[1280,80,110]]) {
    for (let i=0;i<figures.length;i++) {
      const size = i === 0 ? hero : boss;
      const input = await sharp(figures[i]).resize(size,size).png().toBuffer();
      const raw = await sharp(input).ensureAlpha().raw().toBuffer();
      let bottom = 0;
      for (let y=0;y<size;y++) for(let x=0;x<size;x++) if(raw[(y*size+x)*4+3]>=96) bottom=y;
      layers.push({input,left:Math.round(centres[i]-size/2),top:baseline-bottom-1});
    }
  }
  await sharp({create:{width:2560,height:1440,channels:4,background:'#EDF0F4'}}).composite(layers).png().toFile(path.join(dir,'concepts_sheet.png'));
  const silhouettes=[];
  for (let i=0;i<figures.length;i++) {
    const {data,info}=await sharp(figures[i]).resize(96,96).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let p=0;p<data.length;p+=4) {data[p]=0;data[p+1]=0;data[p+2]=0;data[p+3]=data[p+3]>=96?255:0;}
    silhouettes.push({input:await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer(),left:16+i*128,top:32});
  }
  await sharp({create:{width:1152,height:160,channels:4,background:'#FFFFFF'}}).composite(silhouettes).png().toFile(path.join(dir,'silhouette_test.png'));
  for(const name of [...names,'concepts_sheet','silhouette_test']) {
    const m=await sharp(path.join(dir,name+'.png')).metadata();
    if(!m.hasAlpha) throw new Error(name+' missing alpha');
    console.log(name,m.width,m.height);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
