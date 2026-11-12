/* Klepa Up: банк, QR, чат (ответы, реакции, медиа), официальный канал, загрузка файлов */
import fs from 'fs';import crypto from 'crypto';import express from 'express';import QRCode from 'qrcode';
export default async function(c){
const {app,authz,get,put,all,del,db,F,say,esc,nm,own,P,can,perms,log,OW,E,sleep,bot}=c;
const EM=['👍','❤️','🔥','😂','😮','🎉'],MIME={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'},EXT=Object.fromEntries(Object.entries(MIME).map(([k,v])=>[v,k]));
const busy=new Set(),upl=new Map(),lm=new Map(),IDR=/^[\w-]{8,16}\.(jpg|png|webp|gif|mp4|webm|mov)$/;
if(F)fs.mkdirSync('media',{recursive:true});else await db.query('create table if not exists media(id text primary key,mime text,data bytea,ts bigint)');
const post=(p,fn)=>app.post('/api/x/'+p,authz,async(q,r)=>{try{await fn(q.u,q.body,o=>r.json(o||{ok:1}),e=>r.status(400).json({e}))}catch(e){console.error(e);r.status(500).json({e:'server'})}});
const link=(id,amt)=>`https://t.me/${bot()}${E.APP_SHORT?'/'+E.APP_SHORT:''}?startapp=${id==='ch'?'ch':'pay_'+id+(amt?'_'+amt:'')}`;
const pv=m=>(m.text||(m.media?(m.media.t==='vid'?'🎬 Видео':'📷 Фото'):'')).slice(0,90);
const okm=m=>m&&IDR.test(m.id||'')?{id:m.id,t:/\.(mp4|webm|mov)$/.test(m.id)?'vid':'img'}:null;
const react=(d,uid,e)=>{if(!EM.includes(e))return;d.rx=d.rx||{};const had=(d.rx[e]||[]).includes(uid);for(const k of Object.keys(d.rx)){d.rx[k]=d.rx[k].filter(x=>x!==uid);if(!d.rx[k].length)delete d.rx[k]}if(!had)(d.rx[e]=d.rx[e]||[]).push(uid)};
const slim=(m,me)=>{const rx={};let my='';for(const[e,a]of Object.entries(m.rx||{})){rx[e]=a.length;if(a.includes(me))my=e}const{vw,...x}=m;return{...x,rx,my,...(m.vw?{views:m.vw.length}:{})}};
const byTs=(a,b)=>a.ts-b.ts;
/* ---------- файлы ---------- */
app.post('/api/x/upload',express.raw({type:()=>true,limit:'13mb'}),authz,async(q,r)=>{try{const u=q.u,mime=(q.get('content-type')||'').split(';')[0].trim().toLowerCase(),ext=MIME[mime];
 if(u.ban)return r.status(403).json({e:'Вы заблокированы'});if(!ext||!Buffer.isBuffer(q.body)||!q.body.length)return r.status(400).json({e:'Формат файла не поддерживается'});
 if(q.body.length>(mime.startsWith('video')?12e6:4e6))return r.status(413).json({e:'Файл слишком большой: фото до 4 МБ, видео до 12 МБ'});
 const n=Date.now(),a=(upl.get(u.id)||[]).filter(t=>n-t<6e4);if(a.length>=6)return r.status(429).json({e:'Слишком много загрузок, подождите минуту'});a.push(n);upl.set(u.id,a);
 const id=crypto.randomBytes(9).toString('base64url').replace(/[^\w-]/g,'a')+'.'+ext;
 if(F)fs.writeFileSync('media/'+id,q.body);else await db.query('insert into media values($1,$2,$3,$4)',[id,mime,q.body,n]);
 r.json({id,t:mime.startsWith('video')?'vid':'img'})}catch(e){console.error(e);r.status(500).json({e:'server'})}});
app.get('/media/:id',async(q,r)=>{const id=q.params.id;if(!IDR.test(id))return r.sendStatus(404);let buf;
 if(F){try{buf=fs.readFileSync('media/'+id)}catch{return r.sendStatus(404)}}else{const x=(await db.query('select data from media where id=$1',[id])).rows[0];if(!x)return r.sendStatus(404);buf=x.data}
 const h={'content-type':EXT[id.split('.')[1]],'cache-control':'public,max-age=31536000,immutable','x-content-type-options':'nosniff','accept-ranges':'bytes'},rg=/bytes=(\d*)-(\d*)/.exec(q.get('range')||'');
 if(rg){let a=rg[1]?+rg[1]:0,b=rg[2]?+rg[2]:buf.length-1;if(!rg[1]&&rg[2]){a=buf.length-+rg[2];b=buf.length-1}b=Math.min(b,buf.length-1);if(a>b||a<0)return r.status(416).end();r.status(206).set({...h,'content-range':`bytes ${a}-${b}/${buf.length}`,'content-length':b-a+1}).end(buf.subarray(a,b+1))}
 else r.set({...h,'content-length':buf.length}).end(buf)});
/* ---------- QR-код ---------- */
function qrSvg(text){const q=QRCode.create(text,{errorCorrectionLevel:'H'}),n=q.modules.size,d=q.modules.data,m=3,W=n+m*2,L=Math.max(3,Math.round(n*.1)),h=n/2,cx=h+m,
 fin=(x,y)=>(x<7&&y<7)||(x>=n-7&&y<7)||(x<7&&y>=n-7),logo=(x,y)=>Math.abs(x+.5-h)<=L&&Math.abs(y+.5-h)<=L;let s='';
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(d[y*n+x]&&!fin(x,y)&&!logo(x,y))s+=`<rect x="${x+m+.03}" y="${y+m+.03}" width=".94" height=".94" rx=".3"/>`;
 const eye=(x,y)=>`<rect x="${x+m}" y="${y+m}" width="7" height="7" rx="1.2"/><rect x="${x+m+1}" y="${y+m+1}" width="5" height="5" rx=".4" fill="#fff"/><rect x="${x+m+2}" y="${y+m+2}" width="3" height="3" rx=".1"/>`;
 const R=L*.78,r=L*.32,st=[...Array(10)].map((_,i)=>{const a=-Math.PI/2+i*Math.PI/5,k=i%2?r:R;return(cx+k*Math.cos(a)).toFixed(2)+','+(cx+k*Math.sin(a)).toFixed(2)}).join(' ');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" shape-rendering="geometricPrecision"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${W}"><stop offset="0" stop-color="#1a1200"/><stop offset="1" stop-color="#3a1fa6"/></linearGradient></defs><rect width="${W}" height="${W}" rx="2.4" fill="#fff"/><g fill="url(#g)">${s}${eye(0,0)}${eye(n-7,0)}${eye(0,n-7)}</g><circle cx="${cx}" cy="${cx}" r="${L+.15}" fill="#ffd21f"/><polygon points="${st}" fill="#1a1200"/></svg>`}
post('qr',async(u,b,ok,no)=>{if(!bot())return no('Бот ещё запускается, попробуйте через минуту');const amt=Math.min(1e6,Math.max(0,Math.floor(+b.amt)||0)),l=link(u.id,amt);ok({svg:qrSvg(l),link:l})});
/* ---------- банк ---------- */
const brief=x=>({id:x.id,name:nm(x),un:x.un||'',photo:x.photo||'',v:!!x.v||own(x),title:x.title||''});
post('find',async(u,b,ok)=>{const q=String(b.q||'').trim().replace(/^@/,'').toLowerCase();if(!q)return ok({l:[]});let l;
 if(/^\d{5,}$/.test(q)){const t=await get('u',q);l=t?[t]:[]}else{const A=await all('u',5000);l=A.filter(x=>(x.un||'').toLowerCase()===q).concat(A.filter(x=>(x.un||'').toLowerCase().startsWith(q)||nm(x).toLowerCase().includes(q)).slice(0,6));l=[...new Map(l.map(x=>[x.id,x])).values()]}
 ok({l:l.filter(x=>x.id!==u.id).slice(0,6).map(brief)})});
post('transfer',async(u,b,ok,no)=>{const amt=Math.floor(+b.amt);if(!(amt>=1&&amt<=1e6))return no('Сумма перевода: от 1 до 1 000 000 ⭐');if(u.ban)return no('Вы заблокированы');if(P(u).reset)return no('Аккаунт обнуляется, подождите минуту');
 const q=String(b.to||'').trim().replace(/^@/,'').toLowerCase();let t=/^\d{5,}$/.test(q)?await get('u',q):(await all('u',5000)).find(x=>(x.un||'').toLowerCase()===q);
 if(!t)return no('Получатель не найден. Он должен хотя бы раз запустить приложение');if(t.id===u.id)return no('Нельзя перевести звёзды самому себе');
 if(busy.has(u.id))return no('Подождите, предыдущий перевод ещё выполняется');busy.add(u.id);
 try{if(b.bal!=null&&Number.isFinite(+b.bal))u.bal=Math.max(0,Math.floor(+b.bal));if((u.bal||0)<amt)return no('Недостаточно звёзд');
  const note=String(b.note||'').trim().slice(0,60),ts=Date.now(),id=ts+'-'+u.id+'-'+t.id;u.bal-=amt;t.bal=(t.bal||0)+amt;
  const p=P(t);p.s+=amt;p.tx.push({name:nm(u),amt});p.tx=p.tx.slice(-10);await put('u',u.id,u);await put('u',t.id,t);
  const rec={id,ts,from:u.id,to:t.id,fn:nm(u),fu:u.un||'',tn:nm(t),tu:t.un||'',amt,note};
  await put('tx'+u.id,id,rec);await put('tx'+t.id,id,rec);await put('txall',id,rec);
  say(t.id,`💸 <b>${esc(nm(u))}</b>${u.un?' (@'+esc(u.un)+')':''} перевёл вам <b>${amt} ⭐</b>${note?'\n💬 '+esc(note):''}`);ok({rec,bal:u.bal})}finally{busy.delete(u.id)}});
post('history',async(u,b,ok)=>ok({l:await all('tx'+u.id,200)}));
post('a_tx',async(u,b,ok,no)=>{if(!can(u,'users'))return no('Нет прав');ok({l:await all('txall',100)})});
/* ---------- общий чат ---------- */
const ref=async id=>{const m=id&&await get('c',id);return m?{id:m.id,name:m.name,text:pv(m)}:undefined};
post('chatget',async(u,b,ok)=>ok({m:(await all('c',80)).sort(byTs).map(m=>slim(m,u.id))}));
post('chatsend',async(u,b,ok,no)=>{if(u.ban)return no('Вы заблокированы');const text=String(b.text||'').trim().slice(0,500),media=okm(b.media);if(!text&&!media)return no('');const ts=Date.now();if(ts-(lm.get(u.id)||0)<1200)return no('Не так быстро');lm.set(u.id,ts);
 const id=ts+'-'+u.id;await put('c',id,{id,ts,uid:u.id,name:nm(u),photo:u.photo||'',v:!!u.v||own(u),title:c.self(u).title,num:u.num||'',text,media:media||undefined,re:await ref(b.reply),rx:{}});ok()});
post('chatreact',async(u,b,ok,no)=>{const m=await get('c',b.id);if(!m)return no('Сообщение удалено');react(m,u.id,b.e);await put('c',m.id,m);ok()});
post('chdelmsg',async(u,b,ok,no)=>{const m=await get('c',b.id);if(!m)return ok();if(m.uid!==u.id){if(!can(u,'ban'))return no('Нет прав');log(u,'chdelmsg '+m.id)}await del('c',m.id);ok()});
/* ---------- официальный канал ---------- */
const meta=async()=>(await get('meta','ch'))||{n:0};
post('chlist',async(u,b,ok)=>{const ms=(await all('c',80)).sort(byTs),ps=(await all('ch',40)).sort(byTs),s=((await get('s',u.id))?.m||[]).at(-1),lc=ms.at(-1),lp=ps.at(-1);
 ok({chat:{last:lc?{name:lc.name,text:pv(lc),ts:lc.ts}:null,unread:ms.filter(m=>m.ts>(+b.cs||0)&&m.uid!==u.id).length},ch:{last:lp?{text:pv(lp),ts:lp.ts}:null,unread:ps.filter(p=>p.ts>(+b.ks||0)).length,members:(await meta()).n,joined:!!u.chj},sup:{last:s?{text:s.t.slice(0,90),ts:s.ts,a:s.f==='a'}:null}})});
post('chget',async(u,b,ok)=>ok({p:(await all('ch',40)).sort(byTs).map(p=>slim(p,u.id)),members:(await meta()).n,joined:!!u.chj,canPost:can(u,'channel')}));
post('chview',async(u,b,ok)=>{for(const id of(b.ids||[]).slice(0,20)){const p=await get('ch',id);if(p&&!(p.vw||[]).includes(u.id)){(p.vw=p.vw||[]).push(u.id);await put('ch',id,p)}}ok()});
post('chreact',async(u,b,ok,no)=>{const p=await get('ch',b.id);if(!p)return no('Пост удалён');react(p,u.id,b.e);await put('ch',p.id,p);ok()});
post('chjoin',async(u,b,ok)=>{const m=await meta(),on=!!b.on;if(on&&!u.chj)m.n++;if(!on&&u.chj)m.n=Math.max(0,m.n-1);u.chj=on?1:0;await put('u',u.id,u);await put('meta','ch',m);ok({members:m.n,joined:on})});
post('chpost',async(u,b,ok,no)=>{if(!can(u,'channel'))return no('Нет права публиковать в канале');const text=String(b.text||'').trim().slice(0,2000),media=okm(b.media);if(!text&&!media)return no('Добавьте текст или фото/видео');
 const ts=Date.now(),id=ts+'-'+crypto.randomBytes(3).toString('hex');await put('ch',id,{id,ts,uid:u.id,text,media:media||undefined,rx:{},vw:[]});log(u,'chpost '+pv({text,media}).slice(0,60));
 if(b.notify&&bot())(async()=>{for(const x of await all('u',5000))if(x.chj){await say(x.id,'📢 <b>Новый пост в канале Klepa Up</b>\n\n'+esc(pv({text,media})),{reply_markup:{inline_keyboard:[[{text:'Открыть канал',url:link('ch')}]]}});await sleep(45)}})();
 ok({id})});
post('chdel',async(u,b,ok,no)=>{if(!can(u,'channel'))return no('Нет права');await del('ch',b.id);log(u,'chdel '+b.id);ok()});
}
