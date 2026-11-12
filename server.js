import fs from 'fs';import express from 'express';import compression from 'compression';import crypto from 'crypto';import pg from 'pg';import {Readable} from 'stream';import ext from './api2.js';
const E=process.env,T=E.BOT_TOKEN,OW=(E.ADMIN_IDS||'1424001997').split(',').map(s=>+s.trim()).filter(Boolean),CH=E.CHANNEL||'@KlepaUp',PER=1000,URL_=(u=>u&&!/^https?:\/\//.test(u)?'https://'+u:u)((E.PUBLIC_URL||E.RENDER_EXTERNAL_URL||'').trim().replace(/\/+$/,'')),SEC=crypto.createHash('sha256').update(T||'x').digest('hex').slice(0,24);
let BOT=E.BOT_USERNAME||'';
const appLink=p=>`https://t.me/${BOT}${E.APP_SHORT?'/'+E.APP_SHORT:''}?startapp=${p||'open'}`;
const PERMS=['users','stars','nft','promo','ban','roles','support','reviews','reset','cast','channel'],MD=['google/gemini-2.5-flash','openai/gpt-4o-mini','openrouter/auto'],sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* ---------- хранилище: Postgres (DATABASE_URL) или файл data.json для теста ---------- */
const F=E.DATABASE_URL?null:new Map(),FP=E.DATA_FILE||'data.json';let fw;
const flush=()=>{clearTimeout(fw);fw=setTimeout(()=>fs.writeFile(FP,JSON.stringify([...F]),()=>{}),500)};
const db=F?null:new pg.Pool({connectionString:E.DATABASE_URL,ssl:/localhost|127\.0/.test(E.DATABASE_URL||'')?false:{rejectUnauthorized:false}});
if(F){try{JSON.parse(fs.readFileSync(FP,'utf8')).forEach(([k,v])=>F.set(k,v))}catch{}console.log('DATABASE_URL не задан: данные в файле '+FP+' (на Render пропадут при перезапуске, подключите Postgres)')}
else await db.query('create table if not exists d(c text,id text,j jsonb,t bigint,primary key(c,id))');
const get=async(c,i)=>F?F.get(c+'|'+i)?.j:(await db.query('select j from d where c=$1 and id=$2',[c,''+i])).rows[0]?.j;
const put=async(c,i,j)=>{if(F){F.set(c+'|'+i,{c,j,t:Date.now()});flush()}else await db.query('insert into d values($1,$2,$3,$4) on conflict(c,id) do update set j=$3,t=$4',[c,''+i,j,Date.now()])};
const del=async(c,i)=>{if(F){F.delete(c+'|'+i);flush()}else await db.query('delete from d where c=$1 and id=$2',[c,''+i])};
const all=async(c,n=300)=>F?[...F.values()].filter(x=>x.c===c).sort((a,b)=>b.t-a.t).slice(0,n).map(x=>x.j):(await db.query('select j from d where c=$1 order by t desc limit $2',[c,n])).rows.map(r=>r.j);
/* ---------- Telegram ---------- */
const tg=(m,b)=>fetch(`https://api.telegram.org/bot${T}/${m}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>({}));
const say=(id,t,x={})=>tg('sendMessage',{chat_id:id,text:t,parse_mode:'HTML',...x});
const esc=s=>String(s??'').replace(/[<&>]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])).slice(0,3000);
/* ---------- игроки и права ---------- */
const nm=u=>u.dn||u.name,own=u=>OW.includes(u.id);
const perms=u=>own(u)?['*']:u.role==='admin'?u.perms||[]:[];
const can=(u,p)=>{const x=perms(u);return x.includes('*')||x.includes(p)};
const P=u=>{const p=u.pend||(u.pend={s:0,n:[],rm:[]});p.n||=[];p.rm||=[];p.tx||=[];return p};
const self=u=>({v:!!u.v||own(u),title:u.title||(own(u)?'Владелец':u.role==='admin'?'Администратор':''),role:u.role||'user',perms:perms(u)});
const pub=u=>({id:u.id,name:nm(u),photo:u.photo||'',un:u.un||'',v:!!u.v||own(u),title:self(u).title,role:u.role||'user',num:u.num||'',inv:u.inv||[],banned:!!u.ban});
const row=u=>({...pub(u),bal:u.bal||0,refs:u.refs||0,seen:u.seen||0,joined:u.joined||0,by:u.by||0,perms:u.perms||[],tgname:u.name});
function auth(init){try{const p=new URLSearchParams(init),h=p.get('hash');p.delete('hash');const s=[...p].map(([k,v])=>k+'='+v).sort().join('\n'),k=crypto.createHmac('sha256','WebAppData').update(T).digest();
 if(crypto.createHmac('sha256',k).update(s).digest('hex')!==h||Date.now()/1e3-p.get('auth_date')>6048e2)return null;const u=JSON.parse(p.get('user'));u.sp=p.get('start_param');return u}catch{return null}}
async function touch(f,sp){let u=await get('u',f.id);const n=[f.first_name,f.last_name].filter(Boolean).join(' ')||'User',w=!u;
 if(w){u={id:f.id,name:n,bal:100,inv:[],pend:{s:0,n:[],rm:[]},refs:0,ru:0,recent:[],promos:[],joined:Date.now()};const m=/^ref_(\d+)$/.exec(sp||'');if(m&&+m[1]!==f.id&&await get('u',m[1]))u.by=+m[1]}
 if(w||Date.now()-(u.seen||0)>3e4||u.name!==n||u.photo!==(f.photo_url||'')){u.name=n;u.un=f.username||'';u.photo=f.photo_url||'';u.seen=Date.now();await put('u',u.id,u)}
 if(w)OW.forEach(i=>say(i,`🆕 Новый игрок: <b>${esc(n)}</b> ${f.username?'@'+f.username+' ':''}(<code>${f.id}</code>)${u.by?'\nПриглашён игроком '+u.by:''}`));return u}
/* рефералка: награда только когда приглашённый подписан на канал */
let chT=0;
async function chk(u){if(!u.by||u.ok)return;const r=await tg('getChatMember',{chat_id:CH,user_id:u.id});
 if(!r.ok){if(Date.now()-chT>36e5){chT=Date.now();OW.forEach(i=>say(i,'⚠️ Бот не может проверить подписку на '+esc(CH)+': '+esc(r.description||'нет ответа от Telegram')+'\nДобавьте бота администратором этого канала.'))}return null}
 const m=r.result;if(!(['member','administrator','creator'].includes(m.status)||(m.status==='restricted'&&m.is_member)))return false;
 u.ok=1;await put('u',u.id,u);const p=await get('u',u.by);if(p){p.refs=(p.refs||0)+1;p.ru=(p.ru||0)+1;p.recent=[{name:nm(u),t:Date.now()},...(p.recent||[])].slice(0,10);await put('u',p.id,p);say(p.id,`🎉 <b>${esc(nm(u))}</b> подписался на канал — вам +${PER} ⭐`)}return true}
async function supAdd(u,t){const s=(await get('s',u.id))||{uid:u.id,m:[]};s.name=nm(u);s.un=u.un||'';s.m=[...s.m,{f:'u',t:String(t).slice(0,800),ts:Date.now()}].slice(-100);await put('s',u.id,s);OW.forEach(i=>say(i,`💬 <b>${esc(nm(u))}</b> (<code>${u.id}</code>): ${esc(t)}`))}
const revAdd=(u,t,s)=>put('r',u.id,{uid:u.id,name:nm(u),photo:u.photo||'',v:!!u.v||own(u),title:self(u).title,rate:Math.min(5,Math.max(1,+s||5)),text:String(t).trim().slice(0,600),ts:Date.now()});
const wipe=(t,f)=>{t.bal=100;t.inv=[];t.num='';t.promos=[];t.pend={s:0,n:[],rm:[],tx:[],reset:f?1:0}};
const log=(u,t)=>put('l',Date.now()+'-'+u.id,{uid:u.id,name:nm(u),t:t.slice(0,300),ts:Date.now()});
const lm=new Map(),rl=new Map();
/* ---------- сервер ---------- */
const app=express();app.disable('x-powered-by');app.get('/health',(q,r)=>r.send('ok'));
app.use(compression({filter:(q,r)=>!q.path.startsWith('/api')&&compression.filter(q,r)}));app.use(express.json({limit:'200kb'}));
app.get('/config.js',(q,r)=>r.type('js').send('window.KCFG='+JSON.stringify({bot:BOT,app:E.APP_SHORT||''})));
const sf=f=>(q,r)=>r.sendFile(f,{root:process.cwd(),maxAge:f==='index.html'?0:'10m'});
app.get('/',sf('index.html'));['index.html','app.css','app.js','extra.css','extra.js','bank.js','social.js'].forEach(f=>app.get('/'+f,sf(f)));
const authz=async(q,r,n)=>{try{const f=auth(q.body?.initData||q.get('x-init')||'');if(!f)return r.status(401).json({e:'auth'});const now=Date.now(),a=(rl.get(f.id)||[]).filter(t=>now-t<1e4);if(a.length>40)return r.status(429).json({e:'Слишком часто'});a.push(now);rl.set(f.id,a);q.u=await touch(f,f.sp);n()}catch(e){console.error(e);r.status(500).json({e:'server'})}};
app.post('/api/ai',authz,async(q,r)=>{const b=q.body,up=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+E.OPENROUTER_KEY,'x-title':'Klepa Up'},body:JSON.stringify({model:MD.includes(b.model)?b.model:MD[0],messages:(b.messages||[]).slice(-30),stream:!!b.stream,max_tokens:Math.min(b.max_tokens||800,1200),temperature:b.temperature})}).catch(()=>null);
 if(!up)return r.status(502).end();r.status(up.status).type(up.headers.get('content-type')||'application/json');Readable.fromWeb(up.body).pipe(r)});
await ext({app,authz,get,put,all,del,db,F,tg,say,esc,nm,own,pub,P,can,perms,self,log,OW,E,sleep,bot:()=>BOT});
const LOGGED=/^a_(give|take|role|ban|promoadd|promodel|reset|revdel|chatdel|cast|msg)$/;
app.post('/api/:a',authz,async(q,r)=>{const u=q.u,b=q.body,A=q.params.a,ok=o=>{if(LOGGED.test(A)){const{initData,...x}=b;log(u,A+' '+JSON.stringify(x))}return r.json(o||{ok:1})},no=e=>r.status(400).json({e});
try{switch(A){
case 'me':return ok({u:pub(u),perms:perms(u),ch:CH,need:!!(u.by&&!u.ok),snap:u.snapAt?{bal:u.bal||0,inv:u.inv||[],at:u.snapAt}:null});
case 'sync':{const s2=await chk(u);return ok({count:u.refs||0,recent:u.recent||[],unclaimed:u.ru||0,need:!!(u.by&&!u.ok),err:s2===null})}
case 'claim':{const n=u.ru||0;u.ru=0;await put('u',u.id,u);return ok({claimed:n})}
case 'snap':if(P(u).reset)return ok();u.bal=+b.bal||0;u.inv=(b.inv||[]).slice(0,300).map(x=>({k:String(x.k).slice(0,20),n:String(x.n).slice(0,40),nft:!!x.nft}));u.num=String(b.num||'').slice(0,30);u.snapAt=Date.now();if(b.name)u.dn=String(b.name).slice(0,48);await put('u',u.id,u);return ok();
case 'inbox':{const p=P(u),o={s:p.s,n:p.n,rm:p.rm,tx:p.tx,reset:p.reset,prof:self(u)};u.pend={s:0,n:[],rm:[],tx:[]};if(o.s||o.n.length||o.rm.length||o.tx.length||o.reset)await put('u',u.id,u);return ok(o)}
case 'promo':{const c=String(b.code||'').trim().toLowerCase(),p=await get('p',c);if(!p)return no('Промокод не найден');if((u.promos||[]).includes(c))return no('Промокод уже использован');if(p.max&&p.used>=p.max)return no('Лимит активаций исчерпан');
 p.used=(p.used||0)+1;u.promos=[...(u.promos||[]),c];const q2=P(u);q2.s+=p.s||0;q2.n.push(...(p.n||[]));await put('p',c,p);await put('u',u.id,u);return ok()}
case 'chatget':return ok({m:(await all('c',80)).reverse()});
case 'chatsend':{if(u.ban)return no('Вы заблокированы');const t=String(b.text||'').trim().slice(0,500);if(!t)return no('');const ts=Date.now();if(ts-(lm.get(u.id)||0)<1500)return no('Не так быстро');lm.set(u.id,ts);const id=ts+'-'+u.id;await put('c',id,{id,ts,uid:u.id,name:nm(u),photo:u.photo||'',v:!!u.v||own(u),title:self(u).title,num:u.num||'',text:t});return ok()}
case 'profile':{const p=await get('u',b.id);return p?ok({p:pub(p),joined:p.joined||0,mod:can(u,'ban')}):no('Игрок не найден')}
case 'supget':return ok({m:(await get('s',u.id))?.m||[]});
case 'supsend':if(u.ban)return no('Вы заблокированы');if(!String(b.text||'').trim())return no('');await supAdd(u,b.text);return ok();
case 'revget':return ok({r:await all('r',60)});
case 'revadd':if(u.ban)return no('Вы заблокированы');if(!String(b.text||'').trim())return no('Напишите отзыв');await revAdd(u,b.text,b.rate);return ok();
/* ---------- админка ---------- */
case 'a_stats':{if(!perms(u).length)return no('Нет прав');const L=await all('u',5000),n=Date.now(),S=await all('s',500);return ok({users:L.length,online:L.filter(x=>n-(x.seen||0)<12e4).length,day:L.filter(x=>n-(x.joined||0)<864e5).length,banned:L.filter(x=>x.ban).length,admins:L.filter(x=>x.role==='admin').length,stars:L.reduce((a,x)=>a+(x.bal||0),0),gifts:L.reduce((a,x)=>a+(x.inv||[]).length,0),nfts:L.reduce((a,x)=>a+(x.inv||[]).filter(i=>i.nft).length,0),refs:L.reduce((a,x)=>a+(x.refs||0),0),reviews:(await all('r',500)).length,wait:S.filter(s=>s.m.at(-1)?.f==='u').length})}
case 'a_users':{if(!can(u,'users'))return no('Нет прав');const s=String(b.q||'').toLowerCase().replace(/^@/,''),AL=await all('u',5000);let L=AL;if(s)L=L.filter(x=>((x.dn||'')+x.name+(x.un||'')+x.id).toLowerCase().includes(s));return ok({n:AL.length,found:L.length,on:AL.filter(x=>Date.now()-(x.seen||0)<12e4).length,l:L.slice(0,100).map(row)})}
case 'a_user':{if(!can(u,'users'))return no('Нет прав');const t=await get('u',b.id);return t?ok({u:row(t)}):no('Игрок не найден')}
case 'a_give':{const t=await get('u',b.id);if(!t)return no('Игрок не найден');const s=+b.stars|0,k=b.nft?String(b.nft):'',q2=Math.min(20,Math.max(1,+b.qty||1));if(s&&!can(u,'stars'))return no('Нет прав на звёзды');if(k&&!can(u,'nft'))return no('Нет прав на NFT');if(!s&&!k)return no('Укажите звёзды или подарок');
 const p=P(t);p.s+=s;if(k)for(let i=0;i<q2;i++)p.n.push(k);await put('u',t.id,t);say(t.id,s<0?`⚠️ Администратор списал ${-s} ⭐.`:`🎁 Администратор выдал вам ${s?s+' ⭐ ':''}${k?(q2>1?q2+'× ':'')+'NFT-подарок':''}. Откройте приложение!`);return ok()}
case 'a_take':{if(!can(u,'nft'))return no('Нет прав');const t=await get('u',b.id),k=String(b.nft||'');if(!t)return no('Игрок не найден');const i=(t.inv||[]).findIndex(x=>x.k===k);if(i<0)return no('У игрока нет такого подарка');t.inv.splice(i,1);P(t).rm.push(k);await put('u',t.id,t);say(t.id,'⚠️ Администратор забрал у вас один подарок.');return ok()}
case 'a_role':{if(!can(u,'roles'))return no('Нет прав');const t=await get('u',b.id);if(!t||(own(t)&&t.id!==u.id))return no('Нельзя изменить владельца');if('v' in b)t.v=!!b.v;if('title' in b)t.title=String(b.title).slice(0,30);if('role' in b)t.role=b.role==='admin'?'admin':'user';if(b.perms)t.perms=b.perms.filter(x=>PERMS.includes(x));await put('u',t.id,t);return ok()}
case 'a_ban':{if(!can(u,'ban'))return no('Нет прав');const t=await get('u',b.id);if(!t||own(t))return no('Нельзя');t.ban=!!b.on;await put('u',t.id,t);say(t.id,b.on?'⛔ Вы заблокированы в чате, поддержке и отзывах.':'✅ Блокировка снята.');return ok()}
case 'a_reset':{if(!can(u,'reset'))return no('Нет прав');const t=await get('u',b.id);if(!t||(own(t)&&t.id!==u.id))return no('Нельзя');wipe(t,1);await put('u',t.id,t);say(t.id,'♻️ Администратор обнулил ваш аккаунт.');return ok()}
case 'a_msg':{if(!can(u,'support'))return no('Нет прав');const t=String(b.text||'').trim();if(!t)return no('Введите текст');await say(b.id,'✉️ <b>Сообщение от администрации:</b> '+esc(t));return ok()}
case 'a_cast':{if(!can(u,'cast'))return no('Нет прав');const t=String(b.text||'').trim().slice(0,1500);if(!t)return no('Введите текст');const L=await all('u',5000);(async()=>{for(const x of L){await say(x.id,'📢 '+esc(t));await sleep(45)}})();return ok({n:L.length})}
case 'a_promoadd':{if(!can(u,'promo'))return no('Нет прав');const c=String(b.code||'').trim().toLowerCase().replace(/\s+/g,'').slice(0,30);if(!c)return no('Введите код');if(!(+b.stars)&&!b.nft)return no('Укажите звёзды или подарок');await put('p',c,{code:c,s:Math.max(0,+b.stars|0),n:b.nft?[b.nft]:[],max:+b.max|0,used:0});return ok()}
case 'a_promos':if(!can(u,'promo'))return no('Нет прав');return ok({l:await all('p',200)});
case 'a_promodel':{if(!can(u,'promo'))return no('Нет прав');await del('p',String(b.code).toLowerCase());return ok()}
case 'a_sup':if(!can(u,'support'))return no('Нет прав');return ok({l:await all('s',200)});
case 'a_supreply':{if(!can(u,'support'))return no('Нет прав');const s=await get('s',b.id);if(!s)return no('Нет диалога');s.m.push({f:'a',t:String(b.text||'').slice(0,800),ts:Date.now()});await put('s',s.uid,s);say(s.uid,`💬 <b>Поддержка:</b> ${esc(b.text)}`);return ok()}
case 'a_revdel':{if(!can(u,'reviews'))return no('Нет прав');await del('r',b.id);return ok()}
case 'a_chatdel':{if(!can(u,'ban'))return no('Нет прав');await del('c',b.id);return ok()}
case 'a_log':if(!can(u,'roles'))return no('Нет прав');return ok({l:await all('l',80)});
case 'a_diag':{if(!perms(u).length)return no('Нет прав');const g=await tg('getMe'),b2=g.result||{},ch=await tg('getChat',{chat_id:CH}),mm=b2.id?await tg('getChatMember',{chat_id:CH,user_id:b2.id}):{};return ok({bot:b2.username||'',main:!!b2.has_main_web_app,url:URL_,chat:ch.ok?ch.result.title:'',chatErr:ch.ok?'':ch.description||'',admin:['administrator','creator'].includes(mm.result?.status),memErr:mm.ok?'':mm.description||''})}
case 'reset':wipe(u,0);await put('u',u.id,u);return ok();
default:return no('unknown')}}catch(e){console.error(e);r.status(500).json({e:'server'})}});
/* ---------- бот ---------- */
app.post('/tg/'+SEC,async(q,r)=>{if(q.get('x-telegram-bot-api-secret-token')!==SEC)return r.sendStatus(403);r.sendStatus(200);const x=q.body;try{
 if(x.callback_query){const c=x.callback_query,u=await touch(c.from),s=await chk(u);return tg('answerCallbackQuery',{callback_query_id:c.id,text:s===false?'Сначала подпишитесь на канал':s===null?'Не удалось проверить, попробуйте позже':'Готово ✅',show_alert:true})}
 const m=x.message;if(!m?.text)return;const [cmd,...rs]=m.text.split(' '),arg=rs.join(' ').trim(),st=/^\/start/.test(cmd),u=await touch(m.from,st?arg:''),web=BOT?{text:'🎮 Открыть Klepa Up',url:appLink()}:{text:'🎮 Открыть Klepa Up',web_app:{url:URL_}},id=m.chat.id;
 if(st){await say(id,`Привет, <b>${esc(nm(u))}</b>! Открывай кейсы, собирай NFT-подарки и приглашай друзей: ${PER} ⭐ за каждого.`+(u.by&&!u.ok?`\n\n⚠️ Подпишитесь на ${CH}, иначе пригласивший не получит награду.`:''),{reply_markup:{inline_keyboard:[[web],[{text:'📢 Канал',url:'https://t.me/'+CH.slice(1)}],...(u.by&&!u.ok?[[{text:'✅ Проверить подписку',callback_data:'chk'}]]:[])]}});await chk(u)}
 else if(cmd==='/review'&&arg){if(u.ban)return;await revAdd(u,arg,5);say(id,'Спасибо за отзыв! ⭐')}
 else if(cmd==='/reviews'){const L=await all('r',5);say(id,L.map(x=>`${'★'.repeat(x.rate)} <b>${esc(x.name)}</b>\n${esc(x.text)}`).join('\n\n')||'Отзывов пока нет. Напишите: /review ваш текст')}
 else if(cmd==='/support'&&arg){if(u.ban)return;await supAdd(u,arg);say(id,'Отправлено. Ответ придёт сюда.')}
 else if(cmd==='/admin'&&perms(u).length)say(id,'Админ-панель: в приложении Профиль → Админ-панель',{reply_markup:{inline_keyboard:[[web]]}});
 else say(id,'Команды: /review текст, /reviews, /support текст',{reply_markup:{inline_keyboard:[[web]]}})}catch(e){console.error(e)}});
app.listen(E.PORT||3000,async()=>{console.log('up');if(!T||!URL_)return console.log('Нужны BOT_TOKEN и PUBLIC_URL');if(!BOT)BOT=(await tg('getMe')).result?.username||'';
 await tg('setWebhook',{url:URL_+'/tg/'+SEC,secret_token:SEC,allowed_updates:['message','callback_query']});await tg('setChatMenuButton',{menu_button:{type:'default'}});
 await tg('setMyCommands',{commands:[{command:'start',description:'Запуск'},{command:'reviews',description:'Отзывы'},{command:'review',description:'Оставить отзыв'},{command:'support',description:'Поддержка'}]})});
