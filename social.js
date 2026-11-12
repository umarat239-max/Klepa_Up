/* Klepa Up: список чатов, общий чат (ответы свайпом, реакции, фото и видео), официальный канал */
(function(){
'use strict';
const X=window.KX,api=X.api,esc=X.esc,R=['👍','❤️','🔥','😂','😮','🎉'];let K,W,unread=0;
const pv=m=>m.text||(m.media?(m.media.t==='vid'?'🎬 Видео':'📷 Фото'):'');
const lsk=k=>'kup_seen_'+k+'_'+K.U.id,seen=k=>{try{return+localStorage.getItem(lsk(k))||0}catch(e){return 0}},setSeen=(k,v)=>{try{localStorage.setItem(lsk(k),v)}catch(e){}};
const media=x=>!x?'':x.t==='vid'?`<video class="kmd" src="/media/${x.id}" controls playsinline preload="metadata"></video>`:`<img class="kmd" src="/media/${x.id}" loading="lazy" alt="" data-zoom="${x.id}">`;
const rxs=(m,add)=>{const e=Object.entries(m.rx||{}).map(([k,n])=>`<button class="krx ${m.my===k?'on':''}" data-e="${k}">${k} ${n}</button>`).join('');return e||add?`<div class="krxs">${e}${add?'<button class="krx kadd" data-add>☺</button>':''}</div>`:''};
const zoom=id=>{const z=document.createElement('div');z.className='kzoom';z.innerHTML=`<img src="/media/${id}" alt="">`;z.onclick=()=>z.remove();document.body.appendChild(z)};
const hap=()=>{try{W.HapticFeedback.impactOccurred('light')}catch(e){}};
function sheet(onReact,actions){const s=document.createElement('div');s.className='ksheet';s.innerHTML=`<div>${onReact?`<div class="kem">${R.map(e=>`<button data-e="${e}">${e}</button>`).join('')}</div>`:''}${(actions||[]).map((a,i)=>`<button class="kact" data-i="${i}">${a[0]}</button>`).join('')}</div>`;
 s.onclick=e=>{const b=e.target.closest('button');if(b){s.remove();if(b.dataset.e)onReact(b.dataset.e);else actions[+b.dataset.i][1]()}else if(e.target===s)s.remove()};document.body.appendChild(s)}
/* ---------- вложения ---------- */
const pick=()=>new Promise(r=>{const i=document.createElement('input');i.type='file';i.accept='image/*,video/*';i.onchange=()=>r(i.files[0]||null);i.click()});
async function prep(f){if(f.type.startsWith('video/')){if(f.size>12e6)throw Error('Видео должно быть до 12 МБ');return f}if(f.type==='image/gif'&&f.size<4e6)return f;
 const bm=await createImageBitmap(f),s=Math.min(1,1280/Math.max(bm.width,bm.height)),c=document.createElement('canvas');c.width=Math.round(bm.width*s);c.height=Math.round(bm.height*s);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);return await new Promise(r=>c.toBlob(r,'image/jpeg',.82))}
async function upload(f){const b=await prep(f),r=await fetch('/api/x/upload',{method:'POST',headers:{'content-type':b.type||f.type,'x-init':W.initData},body:b}).then(x=>x.json());if(r.e)throw Error(r.e);return{id:r.id,t:r.t}}
function composer(host,ph,send,extra){const st={file:null,reply:null};
 host.innerHTML=`<div class="kq" hidden></div><div class="kpv" hidden></div>${extra||''}<div class="kin"><button class="kat" aria-label="Прикрепить">📎</button><textarea class="epi ta kti" rows="1" maxlength="${extra?2000:500}" placeholder="${ph}"></textarea><button class="btn ksd" aria-label="Отправить">➤</button></div>`;
 const q=host.querySelector('.kq'),pw=host.querySelector('.kpv'),T=host.querySelector('textarea'),B=host.querySelector('.ksd');
 const showQ=()=>{q.hidden=!st.reply;if(st.reply)q.innerHTML=`<div class="kqb"><b>${esc(st.reply.name)}</b><span>${esc(pv(st.reply).slice(0,80))}</span></div><button class="kqx">×</button>`};
 q.onclick=e=>{if(e.target.classList.contains('kqx')){st.reply=null;showQ()}};
 const showP=()=>{pw.hidden=!st.file;if(st.file)pw.innerHTML=(st.file.type.startsWith('image/')?`<img src="${URL.createObjectURL(st.file)}" alt="">`:'<span>🎬</span>')+`<b>${esc(st.file.name||'Файл')}</b><button class="kqx">×</button>`};
 pw.onclick=e=>{if(e.target.classList.contains('kqx')){st.file=null;showP()}};
 host.querySelector('.kat').onclick=async()=>{const f=await pick();if(f){st.file=f;showP()}};
 T.oninput=()=>{T.style.height='auto';T.style.height=Math.min(120,T.scrollHeight)+'px'};
 const go=async()=>{const text=T.value.trim();if(!text&&!st.file||B.disabled)return;B.disabled=true;
  try{let m=null;if(st.file){K.toast('Загрузка файла…');m=await upload(st.file)}const r=await send({text,media:m,reply:st.reply&&st.reply.id,notify:host.querySelector('.knt')?host.querySelector('.knt').checked:false});if(r&&r.e)throw Error(r.e);
   T.value='';T.style.height='auto';st.file=null;st.reply=null;showQ();showP()}catch(e){K.hp('error');K.toast(e.message||'Не удалось отправить')}B.disabled=false};
 B.onclick=go;T.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!/Mobi|Android/i.test(navigator.userAgent)){e.preventDefault();go()}};
 return{setReply(m){st.reply=m;showQ();T.focus()}}}
/* ---------- общий чат ---------- */
function chatView(){const o=X.ov('Общий чат'),c=o.querySelector('.kc');c.classList.add('kchat');c.innerHTML='<div class="kl kmsgs"></div><div class="kcmp"></div>';
 const L=c.querySelector('.kmsgs');let sig='',data=[];const cp=composer(c.querySelector('.kcmp'),'Сообщение',b=>api('x/chatsend',b));
 const bub=m=>{const mine=m.uid===K.U.id;return `<div class="km kw ${mine?'ku':''}" data-id="${esc(m.id)}">${mine?'':`<span data-prof>${X.av(m)}</span>`}<div class="kmb">${mine?'':`<div class="kn1"><b data-prof>${esc(m.name)}</b>${X.badge(m)}${m.num?`<span class="chip">${esc(m.num)}</span>`:''}</div>`}${m.re?`<div class="kre" data-go="${esc(m.re.id)}"><b>${esc(m.re.name)}</b><span>${esc(m.re.text)}</span></div>`:''}${media(m.media)}${m.text?`<p>${esc(m.text)}</p>`:''}<div class="kt">${X.tm(m.ts)}</div>${rxs(m)}</div></div>`};
 const load=async()=>{const r=await api('x/chatget');if(!r.m)return;data=r.m;const s=r.m.map(x=>x.id+JSON.stringify(x.rx)+x.my).join('|');if(s===sig)return;sig=s;
  const st=L.scrollHeight-L.scrollTop-L.clientHeight<120||!L.children.length;L.innerHTML=r.m.map(bub).join('')||'<div class="kd">Пока пусто. Напишите первым!</div>';if(st)L.scrollTop=L.scrollHeight;
  if(r.m.length)setSeen('chat',Math.max(...r.m.map(x=>x.ts)))};
 const react=async(id,e)=>{await api('x/chatreact',{id,e});sig='';load()};
 L.onclick=async e=>{if(Date.now()-(+L.dataset.sw||0)<400)return;const t=e.target,d=t.closest('.km');if(!d)return;const id=d.dataset.id,m=data.find(x=>x.id===id);if(!m)return;
  const z=t.closest('[data-zoom]');if(z)return zoom(z.dataset.zoom);if(t.closest('video'))return;
  if(t.closest('[data-prof]'))return X.showProf(m.uid);
  const rb=t.closest('.krx');if(rb)return react(id,rb.dataset.e);
  const re=t.closest('.kre');if(re){const x=L.querySelector(`[data-id="${re.dataset.go}"]`);if(x){x.scrollIntoView({block:'center',behavior:'smooth'});x.classList.add('kflash');setTimeout(()=>x.classList.remove('kflash'),1300)}return}
  const acts=[['↩️ Ответить',()=>cp.setReply(m)]];if(m.text)acts.push(['📋 Копировать',()=>{try{navigator.clipboard.writeText(m.text);K.toast('Скопировано')}catch(e){}}]);if(m.uid!==K.U.id)acts.push(['👤 Профиль',()=>X.showProf(m.uid)]);
  if(m.uid===K.U.id||X.can('ban'))acts.push(['🗑 Удалить',async()=>{const r=await api('x/chdelmsg',{id});K.toast(r.e||'Удалено');sig='';load()}]);
  sheet(e2=>react(id,e2),acts)};
 /* свайп вправо = ответить */
 let el=null,sx=0,sy=0,dx=0,lock=0;
 L.addEventListener('pointerdown',e=>{const b=e.target.closest('.km');if(!b||e.target.closest('video'))return;el=b;sx=e.clientX;sy=e.clientY;dx=0;lock=0});
 L.addEventListener('pointermove',e=>{if(!el)return;const x=e.clientX-sx,y=e.clientY-sy;if(!lock){if(Math.abs(y)>10&&Math.abs(y)>Math.abs(x)){el=null;return}if(Math.abs(x)>8)lock=1}if(lock&&x>0){dx=Math.min(x,90);el.style.transform=`translateX(${dx}px)`;el.classList.toggle('kswp',dx>60)}});
 const end=()=>{if(!el)return;if(lock)L.dataset.sw=Date.now();const b=el;el.style.transform='';el.classList.remove('kswp');el=null;if(dx>60){const m=data.find(x=>x.id===b.dataset.id);if(m){cp.setReply(m);hap()}}dx=0};
 L.addEventListener('pointerup',end);L.addEventListener('pointercancel',end);
 load();o.t=setInterval(load,3000)}
/* ---------- официальный канал ---------- */
function chView(){const o=X.ov('Канал'),c=o.querySelector('.kc');c.classList.add('kchat');
 c.innerHTML=`<div class="card kcard kchh"><div class="kchav">📢</div><div class="grow"><div class="t">Klepa Up ${K.VB}</div><div class="sub" id="kmem">Официальный канал</div></div><button class="btn sm kjoin" hidden>Подписаться</button></div><div class="kl kposts"></div><div class="kcmp"></div>`;
 const L=c.querySelector('.kposts'),J=c.querySelector('.kjoin'),CM=c.querySelector('.kcmp');let sig='',data=[],canPost=false,joined=false,cp=null,obs=null;const viewed=new Set(),pend=new Set();let vt=0;
 const card=p=>`<div class="card kpost" data-id="${esc(p.id)}">${media(p.media)}${p.text?`<p class="kptx">${esc(p.text)}</p>`:''}${rxs(p,true)}<div class="kpf"><span>👁 ${X.num(p.views||0)}</span><span>${X.dt(p.ts)}</span>${canPost?'<span class="kx" data-del>удалить</span>':''}</div></div>`;
 const flush=()=>{vt=0;if(pend.size){api('x/chview',{ids:[...pend]});pend.clear()}};
 const watch=()=>{if(obs)obs.disconnect();obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const id=e.target.dataset.id;if(!viewed.has(id)){viewed.add(id);pend.add(id);if(!vt)vt=setTimeout(flush,1200)}}}),{root:L,threshold:.6});L.querySelectorAll('.kpost').forEach(n=>obs.observe(n))};
 const load=async()=>{const r=await api('x/chget');if(!r.p)return;data=r.p;joined=r.joined;canPost=r.canPost;c.querySelector('#kmem').textContent='👥 '+X.num(r.members)+' '+(r.members%10===1&&r.members%100!==11?'участник':'участников');
  J.hidden=false;J.textContent=joined?'Вы подписаны ✓':'Подписаться';J.classList.toggle('g',joined);
  if(canPost&&!cp)cp=composer(CM,'Новый пост…',b=>api('x/chpost',b),'<label class="knl"><input type="checkbox" class="knt"> 🔔 Уведомить подписчиков через бота</label>');
  if(!canPost&&!CM.innerHTML)CM.innerHTML='<div class="kmuted" style="text-align:center;padding:4px">Публикуют только администраторы канала</div>';
  const s=r.p.map(x=>x.id+JSON.stringify(x.rx)+x.my+x.views).join('|')+canPost;if(s===sig)return;sig=s;const st=L.scrollHeight-L.scrollTop-L.clientHeight<160||!L.children.length;
  L.innerHTML=r.p.map(card).join('')||'<div class="kd">Постов пока нет</div>';if(st)L.scrollTop=L.scrollHeight;watch();if(r.p.length)setSeen('ch',Math.max(...r.p.map(x=>x.ts)))};
 J.onclick=async()=>{const r=await api('x/chjoin',{on:!joined});if(r.e)return K.toast(r.e);K.toast(r.joined?'Вы подписались на канал':'Вы отписались');sig='';load()};
 const react=async(id,e)=>{await api('x/chreact',{id,e});sig='';load()};
 L.onclick=async e=>{const t=e.target,d=t.closest('.kpost');if(!d)return;const id=d.dataset.id,z=t.closest('[data-zoom]');if(z)return zoom(z.dataset.zoom);if(t.closest('video'))return;
  const rb=t.closest('.krx');if(rb&&rb.dataset.e)return react(id,rb.dataset.e);if(t.closest('[data-add]'))return sheet(e2=>react(id,e2),[]);
  if(t.closest('[data-del]')&&await X.ask('Удалить пост из канала?')){const r=await api('x/chdel',{id});K.toast(r.e||'Пост удалён');sig='';load()}};
 load();o.t=setInterval(load,6000);const cl=o.close;o.close=()=>{flush();if(obs)obs.disconnect();cl()}}
/* ---------- список чатов ---------- */
const tmz=t=>{if(!t)return'';const d=new Date(t),n=new Date();return d.toDateString()===n.toDateString()?X.tm(t):d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})};
async function poll(){const r=await api('x/chlist',{cs:seen('chat'),ks:seen('ch')});if(r.chat){unread=r.chat.unread+r.ch.unread;X.reBadge()}return r}
function chats(){const o=X.ov('Чаты'),c=o.querySelector('.kc');
 const row=(k,ic,t,s,tm2,n)=>`<div class="card kcard kchat1" data-k="${k}"><div class="kchav">${ic}</div><div class="grow"><div class="kn1"><b>${t}</b></div><span class="kprev">${esc(s)}</span></div><div class="kside"><small>${tmz(tm2)}</small>${n?`<span class="kbadge">${n>99?'99+':n}</span>`:''}</div></div>`;
 const draw=async()=>{const r=await poll();if(!r.chat)return;
  c.innerHTML=row('ch','📢','Klepa Up | Официальный канал '+K.VB,r.ch.last?r.ch.last.text:'👥 '+r.ch.members+' участников',r.ch.last&&r.ch.last.ts,r.ch.unread)+row('chat','💬','Общий чат',r.chat.last?r.chat.last.name+': '+r.chat.last.text:'Напишите первым',r.chat.last&&r.chat.last.ts,r.chat.unread)+row('sup','🛟','Поддержка',r.sup.last?(r.sup.last.a?'Поддержка: ':'Вы: ')+r.sup.last.text:'Задайте вопрос администратору',r.sup.last&&r.sup.last.ts,0)};
 c.onclick=e=>{const d=e.target.closest('[data-k]');if(!d)return;({ch:chView,chat:chatView,sup:X.support})[d.dataset.k]()};
 draw();o.t=setInterval(draw,5000)}
X.reBadge=()=>{const k=document.querySelector('[data-m=chats] .kar');if(!k)return;let b=document.querySelector('.kmenu .kbadge');if(!b){b=document.createElement('span');b.className='kbadge';k.before(b)}b.textContent=unread>99?'99+':unread;b.hidden=!unread};
X.open.chats=chats;
X.ready.push(()=>{K=X.K;W=X.W;poll();setInterval(poll,25000);if((W.initDataUnsafe&&W.initDataUnsafe.start_param)==='ch')setTimeout(chView,700)});
})();
