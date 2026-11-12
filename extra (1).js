/* Klepa Up: подключение к серверу, чат, профили, поддержка, отзывы, админ-панель, обнуление */
(function(){
'use strict';
let K,W,perms=[],last='',menuKey='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=async(a,b={})=>{try{const r=await fetch('/api/'+a,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...b,initData:(W&&W.initData)||''})});return await r.json()}catch(e){return{e:'Нет связи с сервером'}}};
const can=p=>perms.includes('*')||perms.includes(p);
const tm=t=>new Date(t).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
const dt=t=>t?new Date(t).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
const ago=t=>{const s=(Date.now()-t)/1e3;return !t?'—':s<120?'🟢 онлайн':s<3600?Math.floor(s/60)+' мин назад':s<86400?Math.floor(s/3600)+' ч назад':dt(t)};
const rc=t=>/админ|заместит|модер/i.test(t)?'adm':'dev';
const badge=u=>(u.v?K.VB:'')+(u.title?`<span class="rolec ${rc(u.title)}">${esc(u.title)}</span>`:'');
const av=(u,c='kav')=>u.photo?`<img class="${c}" src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">`:`<div class="${c}">${esc((u.name||'?')[0].toUpperCase())}</div>`;
const num=n=>K.fmt(n||0);
const gname=k=>esc(K.G[k]?K.G[k].n:k);
const nfts=()=>Object.entries(K.G).filter(([k,g])=>g.nft).map(([k,g])=>`<option value="${k}">${esc(g.n)}</option>`).join('');
const stk=[],bb=()=>{try{stk.length?W.BackButton.show():W.BackButton.hide()}catch(e){}};
const ask=m=>new Promise(r=>W&&W.showConfirm?W.showConfirm(m,r):r(confirm(m)));
function ov(title){const o=document.createElement('div');o.className='kov';o.innerHTML=`<div class="kh"><button class="kb" aria-label="Назад">‹</button><b>${title}</b></div><div class="kc"></div>`;document.body.appendChild(o);stk.push(o);bb();
 o.close=()=>{clearInterval(o.t);o.remove();const i=stk.indexOf(o);if(i>=0)stk.splice(i,1);bb()};o.querySelector('.kb').onclick=o.close;return o}
/* ---------- переписка (чат, поддержка) ---------- */
function thread(title,get,send,mine,ms,chat){const o=ov(title),c=o.querySelector('.kc');
 c.innerHTML='<div class="kl"></div><div class="kin"><input class="epi" maxlength="800" placeholder="Сообщение" autocomplete="off"><button class="btn" aria-label="Отправить">➤</button></div>';
 const L=c.querySelector('.kl'),I=c.querySelector('input');
 const load=async()=>{const m=await get();if(!m)return;const st=L.scrollHeight-L.scrollTop-L.clientHeight<90;
  L.innerHTML=m.map(x=>`<div class="km kw ${mine(x)?'ku':''}" data-u="${x.uid||''}" data-id="${esc(x.id||'')}">${x.uid?av(x):''}<div class="kmb">${x.name?`<div class="kn1"><b>${esc(x.name)}</b>${badge(x)}${x.num?`<span class="chip">${esc(x.num)}</span>`:''}${chat&&x.id&&can('ban')?'<span class="kx">удалить</span>':''}</div>`:''}<p>${esc(x.text||x.t)}</p><div class="kt">${tm(x.ts)}</div></div></div>`).join('')||'<div class="kd">Пока пусто. Напишите первым!</div>';
  if(st)L.scrollTop=L.scrollHeight};
 const go=async()=>{const t=I.value.trim();if(!t)return;I.value='';const r=await send(t);if(r&&r.e)K.toast(r.e);load()};
 c.querySelector('.btn').onclick=go;I.onkeydown=e=>{if(e.key==='Enter')go()};
 if(chat)L.onclick=async e=>{const d=e.target.closest('.km');if(!d)return;if(e.target.classList.contains('kx')){await api('a_chatdel',{id:d.dataset.id});return d.remove()}if(d.dataset.u)showProf(d.dataset.u)};
 load();o.t=setInterval(load,ms);return o}
const support=()=>thread('Поддержка',async()=>((await api('supget')).m||[]).map(x=>({...x,name:x.f==='a'?'Поддержка':''})),t=>api('supsend',{text:t}),m=>m.f==='u',4000);
/* ---------- профиль игрока ---------- */
const gifts=(inv,rm)=>{const g={};inv.forEach(x=>{(g[x.k]=g[x.k]||{n:0}).n++});return Object.entries(g).map(([k,v])=>`<div class="kgi">${rm?`<button class="kgx" data-rm="${esc(k)}">×</button>`:''}${K.G[k]&&K.G[k].img?`<img src="${esc(K.G[k].img)}" alt="">`:''}<span>${gname(k)}${v.n>1?' ×'+v.n:''}</span></div>`).join('')||'<div class="kd" style="grid-column:1/-1">Подарков пока нет</div>'};
async function showProf(id){const r=await api('profile',{id});if(!r.p)return K.toast(r.e||'Ошибка');const p=r.p,o=ov('Профиль');
 o.querySelector('.kc').innerHTML=`<div class="card kpr">${av(p,'kbig')}<div class="nm"><span class="nt">${esc(p.name)}</span>${p.v?K.VB:''}</div><div class="sub">${p.un?'@'+esc(p.un):'Без username'}</div>${p.title?`<span class="rolec ${rc(p.title)}">${esc(p.title)}</span>`:''}<div class="kchips"><span class="chip">ID ${p.id}</span>${p.num?`<span class="chip">${esc(p.num)}</span>`:''}</div><div class="kmuted">В игре с ${dt(r.joined).split(',')[0]}</div></div><div class="ksec">Подарки · ${p.inv.length}</div><div class="kg">${gifts(p.inv)}</div>${can('users')&&p.id!==K.U.id?'<button class="btn sm" id="kmg">Управлять игроком</button>':''}${r.mod&&p.id!==K.U.id?`<button class="btn g sm" id="kbn">${p.banned?'Разбанить':'Забанить'}</button>`:''}`;
 const m=o.querySelector('#kmg'),b=o.querySelector('#kbn');if(m)m.onclick=()=>man(p.id);if(b)b.onclick=async()=>{const x=await api('a_ban',{id:p.id,on:!p.banned});K.toast(x.e||'Готово ✅');if(!x.e)o.close()}}
/* ---------- отзывы ---------- */
function reviews(){const o=ov('Отзывы'),c=o.querySelector('.kc');let rate=5;
 c.innerHTML=`<div class="card" style="padding:14px;margin:0"><div class="kr">${[1,2,3,4,5].map(i=>`<button data-r="${i}">★</button>`).join('')}</div><textarea class="epi ta" rows="3" maxlength="600" placeholder="Ваш отзыв о Klepa Up"></textarea><button class="btn sm" id="rs">Отправить отзыв</button></div><div class="kavg"></div><div class="kl2"></div>`;
 const st=()=>c.querySelectorAll('.kr button').forEach(b=>b.classList.toggle('on',+b.dataset.r<=rate));st();c.querySelector('.kr').onclick=e=>{if(e.target.dataset.r){rate=+e.target.dataset.r;st()}};
 const L=c.querySelector('.kl2'),load=async()=>{const r=await api('revget'),l=r.r||[];c.querySelector('.kavg').innerHTML=l.length?`Средняя оценка <b class="kst">★ ${(l.reduce((a,x)=>a+x.rate,0)/l.length).toFixed(1)}</b> · отзывов: ${l.length}`:'';
  L.innerHTML=l.map(x=>`<div class="km kw" style="max-width:100%;align-self:stretch">${av(x)}<div class="kmb" style="flex:1"><div class="kn1"><b>${esc(x.name)}</b>${badge(x)}<span class="kst">${'★'.repeat(x.rate)}</span>${can('reviews')?`<span class="kx" data-rdel="${x.uid}">удалить</span>`:''}</div><p>${esc(x.text)}</p><div class="kt">${dt(x.ts)}</div></div></div>`).join('')||'<div class="kd">Отзывов пока нет. Будьте первым!</div>'};
 L.onclick=async e=>{const d=e.target.dataset.rdel;if(d){await api('a_revdel',{id:d});load()}};
 c.querySelector('#rs').onclick=async()=>{const t=c.querySelector('textarea'),r=await api('revadd',{rate,text:t.value});if(r.e)return K.toast(r.e);t.value='';K.toast('Спасибо за отзыв! ⭐');load()};load()}
/* ---------- управление игроком (админ) ---------- */
const PL={users:'Игроки',stars:'Звёзды',nft:'NFT',promo:'Промокоды',ban:'Баны и чат',roles:'Роли',support:'Поддержка',reviews:'Отзывы',reset:'Обнуление',cast:'Рассылка',channel:'Канал'};
async function man(id){const o=ov('Игрок'),c=o.querySelector('.kc');let u;
 const render=async()=>{const r=await api('a_user',{id});if(!r.u){K.toast(r.e||'Ошибка');return o.close()}u=r.u;const top=c.scrollTop;
  c.innerHTML=`<div class="card kpr">${av(u,'kbig')}<div class="nm"><span class="nt">${esc(u.name)}</span>${u.v?K.VB:''}</div><div class="sub">${u.un?'@'+esc(u.un):'Без username'}${u.name!==u.tgname?' · в Telegram: '+esc(u.tgname):''}</div>${u.title?`<span class="rolec ${rc(u.title)}">${esc(u.title)}</span>`:''}<div class="kchips"><span class="chip">ID ${u.id}</span>${u.num?`<span class="chip">${esc(u.num)}</span>`:''}${u.banned?'<span class="chip">⛔ бан</span>':''}</div><div class="kmuted">⭐ ${num(u.bal)} · 🎁 ${u.inv.length} · 👥 приглашено ${u.refs}<br>Был: ${ago(u.seen)} · регистрация ${dt(u.joined)}${u.by?'<br>Пригласил: ID '+u.by:''}</div></div>
  <div class="ksec">Подарки игрока</div><div class="kg">${gifts(u.inv,can('nft'))}</div>
  ${can('stars')?`<div class="ksec">Звёзды</div><input class="epi" id="ks" type="number" inputmode="numeric" placeholder="Сколько звёзд"><div class="kf2"><button class="btn sm" data-a="plus">Выдать</button><button class="btn g sm" data-a="minus">Списать</button></div>`:''}
  ${can('nft')?`<div class="ksec">Выдать NFT-подарок</div><div class="kf2"><select class="epi" id="kn">${nfts()}</select><input class="epi" id="kq" type="number" inputmode="numeric" value="1" min="1" max="20"></div><button class="btn sm" data-a="gnft">Выдать подарок</button>`:''}
  ${can('support')?`<div class="ksec">Сообщение игроку (придёт от бота)</div><textarea class="epi ta" id="km" rows="2" placeholder="Текст сообщения"></textarea><button class="btn g sm" data-a="msg">Отправить</button>`:''}
  ${can('roles')?`<div class="ksec">Статус и права</div><button class="btn g sm" data-a="vf">${u.v?'Снять официальную галочку':'Выдать официальную галочку'}</button><input class="epi" id="kt" maxlength="30" value="${esc(u.title)}" placeholder="Должность (например, Модератор)" style="margin-top:8px"><label style="margin-top:6px"><input type="checkbox" id="kad" ${u.role==='admin'?'checked':''}> Администратор</label><div class="kpm">${Object.keys(PL).map(p=>`<label><input type="checkbox" data-p="${p}" ${u.perms.includes(p)?'checked':''}> ${PL[p]}</label>`).join('')}</div><button class="btn sm" data-a="role">Сохранить должность и права</button>`:''}
  ${can('ban')?`<button class="btn g sm" data-a="ban">${u.banned?'Разбанить':'Забанить'}</button>`:''}
  ${can('reset')?'<button class="btn sm kred" data-a="reset">♻️ Обнулить аккаунт игрока</button>':''}`;c.scrollTop=top};
 c.onclick=async e=>{const rmk=e.target.dataset.rm,b=e.target.closest('[data-a]'),v=s=>c.querySelector(s);let r;
  if(rmk){if(!await ask('Забрать подарок «'+(K.G[rmk]?K.G[rmk].n:rmk)+'» у игрока?'))return;r=await api('a_take',{id,nft:rmk})}
  else if(b){const a=b.dataset.a;
   if(a==='plus'||a==='minus'){const n=Math.abs(+v('#ks').value|0);if(!n)return K.toast('Введите количество звёзд');r=await api('a_give',{id,stars:a==='plus'?n:-n});v('#ks').value=''}
   else if(a==='gnft')r=await api('a_give',{id,nft:v('#kn').value,qty:v('#kq').value});
   else if(a==='msg'){r=await api('a_msg',{id,text:v('#km').value});if(!r.e)v('#km').value=''}
   else if(a==='vf')r=await api('a_role',{id,v:!u.v});
   else if(a==='role')r=await api('a_role',{id,title:v('#kt').value,role:v('#kad').checked?'admin':'user',perms:[...c.querySelectorAll('[data-p]:checked')].map(x=>x.dataset.p)});
   else if(a==='ban')r=await api('a_ban',{id,on:!u.banned});
   else if(a==='reset'){if(!await ask('Обнулить аккаунт «'+u.name+'»? Звёзды, подарки и промокоды будут сброшены. Это нельзя отменить.'))return;r=await api('a_reset',{id})}}
  else return;
  K.toast(r.e||'Готово ✅');if(!r.e)render()};
 render()}
/* ---------- админ-панель ---------- */
const diag=d=>d&&d.bot!==undefined?`<div class="card kcard" style="align-items:flex-start"><div class="grow"><b>${d.admin?'✅':'⚠️'} Подписка на канал и бот</b><br>${d.bot?'':'⚠️ Не удалось связаться с Telegram: проверьте BOT_TOKEN в Render.<br>'}Бот: @${esc(d.bot)} · ${d.chat?'канал «'+esc(d.chat)+'»':'канал не найден'}<br>${d.admin?'Бот администратор канала: подписки проверяются.':'Бот НЕ администратор канала: подписки проверить нельзя. Добавьте этого бота администратором канала.'}${d.chatErr||d.memErr?'<br><span class="kx">'+esc(d.chatErr||d.memErr)+'</span>':''}<br>Главное приложение: ${d.main?'✅ настроено':'⚠️ не найдено (BotFather → Configure Mini App)'}</div></div>`:'';
function admin(){const o=ov('Админ-панель'),c=o.querySelector('.kc');
 const T=[['st','Обзор',1],['u','Игроки',can('users')],['t','Переводы',can('users')],['p','Промо',can('promo')],['s','Поддержка',can('support')],['r','Отзывы',can('reviews')],['c','Рассылка',can('cast')],['l','Журнал',can('roles')]].filter(t=>t[2]);
 c.innerHTML=`<div class="ktabs">${T.map((t,i)=>`<button data-t="${t[0]}" class="${i?'':'on'}">${t[1]}</button>`).join('')}</div><input class="epi ksr" placeholder="Поиск: имя, @юзернейм или ID" style="display:none"><div class="kl2"></div>`;
 let tab='st',q='',data=[];const L=c.querySelector('.kl2'),S=c.querySelector('.ksr');
 S.oninput=()=>{q=S.value;draw()};
 c.querySelector('.ktabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;tab=t;c.querySelectorAll('.ktabs button').forEach(b=>b.classList.toggle('on',b===e.target));S.style.display=t==='u'?'':'none';L.innerHTML='';draw()};
 const tile=(n,l)=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`;
 async function draw(){const t=tab,ae=document.activeElement;if(L.contains(ae)&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName))return;
  if(t==='st'){const [r,dg]=await Promise.all([api('a_stats'),api('a_diag')]);if(t!==tab)return;if(r.e)return L.textContent=r.e;L.innerHTML=diag(dg)+`<div class="stats">${tile(num(r.users),'игроков')}${tile(num(r.online),'онлайн')}${tile(num(r.day),'новых за 24 ч')}</div><div class="stats">${tile(num(r.stars),'звёзд у игроков')}${tile(num(r.gifts),'подарков')}${tile(num(r.nfts),'из них NFT')}</div><div class="stats">${tile(num(r.refs),'приглашений')}${tile(num(r.wait),'ждут ответа')}${tile(num(r.reviews),'отзывов')}</div><div class="stats">${tile(num(r.admins),'админов')}${tile(num(r.banned),'в бане')}${tile('5 с','обновление')}</div><div class="kmuted" style="text-align:center">Баланс и подарки берутся из приложений игроков и обновляются каждые 15 секунд.</div>`}
  else if(t==='u'){const r=await api('a_users',{q});if(t!==tab)return;if(!r.l)return L.textContent=r.e||'';data=r.l;L.innerHTML=`<div class="kmuted">Игроков: ${num(r.n)} · 🟢 онлайн: ${r.on}${q?' · найдено: '+r.found:''}${r.found>100?' · показаны первые 100, уточните поиск':''}</div>`+r.l.map(x=>`<div class="card kcard" data-man="${x.id}">${av(x)}<div class="grow"><div class="kn1"><b>${esc(x.name)}</b>${badge(x)}${x.banned?'<span class="kx">⛔ бан</span>':''}</div>${x.un?'@'+esc(x.un)+' · ':''}ID ${x.id}<br>⭐ ${num(x.bal)} · 🎁 ${x.inv.length} (NFT ${x.inv.filter(i=>i.nft).length}) · 👥 ${x.refs} · ${ago(x.seen)}</div></div>`).join('')}
  else if(t==='t'){const r=await api('x/a_tx');if(t!==tab)return;L.innerHTML=(r.l||[]).map(z=>`<div class="card kcard"><div class="grow"><b>${esc(z.fn)}</b>${z.fu?' @'+esc(z.fu):''} → <b>${esc(z.tn)}</b>${z.tu?' @'+esc(z.tu):''}<br>⭐ ${num(z.amt)} · ${dt(z.ts)}${z.note?'<br>'+esc(z.note):''}</div></div>`).join('')||'<div class="kd">Переводов пока нет</div>'}
  else if(t==='p'){const r=await api('a_promos');if(t!==tab)return;if(!r.l)return L.textContent=r.e||'';
   if(!L.querySelector('#pc'))L.innerHTML=`<div class="card" style="padding:14px;margin:0"><div class="kf"><input class="epi" id="pc" placeholder="Код промокода" autocapitalize="off"><input class="epi" id="ps" type="number" inputmode="numeric" placeholder="Звёзд (можно 0)"><select class="epi" id="pn"><option value="">Без NFT-подарка</option>${nfts()}</select><input class="epi" id="pm" type="number" inputmode="numeric" placeholder="Лимит активаций (пусто = без лимита)" style="font-size:15px"><button class="btn sm" id="pa">Создать промокод</button></div></div><div id="pl" class="kl2"></div>`;
   L.querySelector('#pl').innerHTML=r.l.map(p=>`<div class="card kcard"><div class="grow"><b>${esc(p.code)}</b><br>${p.s?'⭐ '+num(p.s):''} ${p.n.map(k=>'🎁 '+gname(k)).join(' ')} · использован ${p.used}/${p.max||'∞'}</div><button class="btn g sm" style="width:auto;margin:0;padding:0 14px" data-pdel="${esc(p.code)}">Удалить</button></div>`).join('')||'<div class="kd">Промокодов пока нет</div>'}
  else if(t==='s'){const r=await api('a_sup');if(t!==tab)return;if(!r.l)return L.textContent=r.e||'';data=r.l;L.innerHTML=r.l.map((x,i)=>{const m=x.m[x.m.length-1];return`<div class="card kcard" data-sup="${i}"><div class="grow"><b>${esc(x.name)}</b> ${x.un?'@'+esc(x.un):''} ${m&&m.f==='u'?'🔴 ждёт ответа':'✅'}<br>${esc((m?m.t:'').slice(0,90))}</div></div>`}).join('')||'<div class="kd">Обращений нет</div>'}
  else if(t==='r'){const r=await api('revget');if(t!==tab)return;L.innerHTML=(r.r||[]).map(x=>`<div class="card kcard">${av(x)}<div class="grow"><div class="kn1"><b>${esc(x.name)}</b>${badge(x)}<span class="kst">${'★'.repeat(x.rate)}</span></div>${esc(x.text)}</div><button class="btn g sm" style="width:auto;margin:0;padding:0 12px" data-rdel="${x.uid}">×</button></div>`).join('')||'<div class="kd">Отзывов нет</div>'}
  else if(t==='c'){if(!L.querySelector('#ct'))L.innerHTML='<div class="card" style="padding:14px;margin:0"><div class="kf"><div class="kmuted">Сообщение получат все, кто запускал бота. Отправка идёт в фоне.</div><textarea class="epi ta" id="ct" rows="5" maxlength="1500" placeholder="Текст рассылки"></textarea><button class="btn sm" id="cs">Отправить всем</button></div></div>'}
  else if(t==='l'){const r=await api('a_log');if(t!==tab)return;L.innerHTML=(r.l||[]).map(z=>`<div class="card kcard"><div class="grow"><b>${esc(z.name)}</b> · ${dt(z.ts)}<br>${esc(z.t)}</div></div>`).join('')||'<div class="kd">Журнал пуст</div>'}}
 L.onclick=async e=>{const g=s=>e.target.closest(s);let b;
  if(b=g('[data-pdel]')){if(await ask('Удалить промокод?')){await api('a_promodel',{code:b.dataset.pdel});draw()}return}
  if(b=g('[data-rdel]')){await api('a_revdel',{id:b.dataset.rdel});draw();return}
  if(g('#pa')){const v=s=>L.querySelector(s).value,x=await api('a_promoadd',{code:v('#pc'),stars:v('#ps'),nft:v('#pn'),max:v('#pm')});K.toast(x.e||'Промокод создан ✅');if(!x.e){L.querySelector('#pc').value='';L.querySelector('#ps').value='';L.querySelector('#pm').value=''}return draw()}
  if(g('#cs')){const t=L.querySelector('#ct').value.trim();if(!t)return;if(!await ask('Отправить сообщение всем игрокам?'))return;const x=await api('a_cast',{text:t});K.toast(x.e||'Рассылка запущена: '+x.n+' чел.');if(!x.e)L.querySelector('#ct').value='';return}
  if(b=g('[data-man]'))return man(b.dataset.man);
  if(b=g('[data-sup]')){const s=data[+b.dataset.sup];if(s)reply(s)}};
 draw();o.t=setInterval(draw,5000)}
function reply(s){thread('Диалог: '+esc(s.name),async()=>{const r=await api('a_sup');return(r.l||[]).filter(x=>x.uid===s.uid).flatMap(x=>x.m.map(m=>({...m,name:m.f==='u'?s.name:'Администратор'})))},t=>api('a_supreply',{id:s.uid,text:t}),m=>m.f==='a',3000)}
/* ---------- подписка, обнуление, награды ---------- */
function gate(ch){const o=ov('Подписка'),c=o.querySelector('.kc');c.innerHTML=`<div class="card kpr"><div class="t" style="font-size:19px">Подпишитесь на канал</div><div class="sub" style="margin:8px 0 4px">Вас пригласил друг. Чтобы он получил награду, подпишитесь на ${esc(ch)}.</div></div><button class="btn" id="g1">Открыть канал</button><button class="btn g" id="g2" style="margin-top:0">Я подписался, проверить</button>`;
 c.querySelector('#g1').onclick=()=>{const u='https://t.me/'+ch.slice(1);W&&W.openTelegramLink?W.openTelegramLink(u):open(u)};
 c.querySelector('#g2').onclick=async()=>{const r=await api('sync');if(r.need)return K.toast(r.err?'Не удалось проверить подписку, администратор уже уведомлён. Попробуйте позже':'Подписка на канал не найдена');K.toast('Готово ✅');o.close()}}
function wipeLocal(){const S=K.S,rev=S.rev||0;Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,{stars:100,last:0,inv:[],pins:[],promo:false,pending:null,opened:0,fast:false,cnt:1,cs:'std',rev});K.norm();K.save();K.bal();['renderAll','renderCase','renderProfile'].forEach(f=>{try{K[f]()}catch(e){}});last=''}
async function selfReset(){if(!await ask('Обнулить ваш аккаунт? Звёзды, подарки, промокоды и прогресс будут сброшены. Это нельзя отменить.'))return;if(!await ask('Точно обнулить? Восстановить данные будет невозможно.'))return;const r=await api('reset');if(r.e)return K.toast(r.e);wipeLocal();K.hp('success');K.toast('Аккаунт обнулён')}
function applySelf(u){const v=!!u.v,t=u.title||'';if(window.KV!==v||window.KT!==t){window.KV=v;window.KT=t;try{K.applyProf()}catch(e){}}}
async function inbox(){const g=await api('inbox');if(!g||g.e)return;
 if(g.prof){const k=JSON.stringify(g.prof.perms);if(k!==JSON.stringify(perms)){perms=g.prof.perms;menu()}applySelf(g.prof)}
 if(g.reset){wipeLocal();K.toast('♻️ Ваш аккаунт обнулён администратором',4000);return}
 let ch=0;if(g.s){K.S.stars=Math.max(0,K.S.stars+g.s);ch=1}
 (g.n||[]).forEach(k=>{if(K.G[k]){K.S.inv.unshift({id:Date.now()+Math.random(),k});ch=1}});
 (g.rm||[]).forEach(k=>{const i=K.S.inv.findIndex(x=>x.k===k);if(i>=0){K.S.inv.splice(i,1);ch=1}});
 if(ch){try{K.norm()}catch(e){}K.save();K.bal();try{K.renderInv()}catch(e){}K.hp('success');K.toast(g.tx&&g.tx.length?'💸 Перевод: '+g.tx.map(t=>t.name+' +'+K.fmt(t.amt)+' ⭐').join(', '):g.s<0?'⚠️ Администратор изменил ваш баланс':'🎁 Вам выдали награду!',3500)}}
window.kupPromo=async v=>{const r=await api('promo',{code:v});if(r.e){K.hp('error');return K.toast(r.e)}K.$('#pi').value='';await inbox();K.toast('Промокод активирован ✅')};
/* ---------- меню в профиле ---------- */
function menu(){const key=JSON.stringify(perms.length);const old=document.querySelector('.kmenu');if(old)old.remove();
 const row=(m,i,t,s)=>`<button class="kmr" data-m="${m}"><div class="ico">${i}</div><div class="grow"><div class="t">${t}</div><div class="sub">${s}</div></div><span class="kar">›</span></button>`;
 const card=document.createElement('div');card.className='card kmenu';
 card.innerHTML=row('bank','🏦','Банк','Переводы по @username, QR-код, история')+row('chats','💬','Чаты','Канал, общий чат, поддержка')+row('rev','⭐','Отзывы','Читайте и оставляйте отзывы')+(perms.length?row('adm','🛠','Админ-панель','Игроки, промокоды, права, рассылка'):'')+'<button class="btn g sm kdanger" data-m="rst">Обнулить мой аккаунт</button>';
 card.onclick=e=>{const b=e.target.closest('[data-m]');if(b)({bank:()=>KX.open.bank(),chats:()=>KX.open.chats(),rev:reviews,adm:admin,rst:selfReset})[b.dataset.m]()};
 const st=document.querySelector('#s3 .stats');st&&st.after(card);if(window.KX&&KX.reBadge)KX.reBadge()}
window.kupInit=async k=>{K=k;W=window.Telegram&&Telegram.WebApp;if(!(W&&W.initData))return;
 if(W.BackButton)W.BackButton.onClick(()=>{const o=stk[stk.length-1];o&&o.close()});
 const snap=()=>{try{const S=K.S,x=S.phone&&S.inv.find(y=>y.id===S.phone),b={bal:S.stars,name:K.dispName(),inv:S.inv.map(i=>({k:i.k,n:K.G[i.k].n,nft:!!K.G[i.k].nft})),num:x?K.nmx(x,K.G[x.k]):''},j=JSON.stringify(b);if(j!==last){last=j;api('snap',b)}}catch(e){}};
 const r=await api('me');if(r.u){perms=r.perms||[];applySelf(r.u);if(r.need)gate(r.ch);
  const sn=r.snap;if(sn&&sn.at&&!K.S.opened&&!(K.S.inv&&K.S.inv.length)&&K.S.stars<=100&&(sn.bal>100||sn.inv.length)){K.S.stars=sn.bal;K.S.inv=sn.inv.filter(i=>K.G[i.k]).map(i=>({id:Date.now()+Math.random(),k:i.k}));try{K.norm()}catch(e){}K.save();K.bal();try{K.renderInv()}catch(e){}K.toast('Ваши данные восстановлены с сервера',4000)}}
 menu();KX.snap=()=>{last='';snap()};snap();setInterval(snap,15000);inbox();setInterval(inbox,8000);
 KX.ready.forEach(f=>{try{f(r)}catch(e){console.error(e)}})};
window.KX={get K(){return K},get W(){return W},api,can,esc,av,badge,ask,ov,dt,tm,ago,rc,num,showProf,support,open:{},ready:[],snap(){},reBadge(){}};
})();
