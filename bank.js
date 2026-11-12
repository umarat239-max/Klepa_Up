/* Klepa Up: банк (переводы по @username, QR-код, сканер, история и аналитика) */
(function(){
'use strict';
const X=window.KX,api=X.api,esc=X.esc;let K,W,H=[];
const num=n=>X.num(n),DOW=['вс','пн','вт','ср','чт','пт','сб'];
const dday=t=>new Date(t).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
const other=(r,me)=>r.from===me?{id:r.to,name:r.tn,un:r.tu}:{id:r.from,name:r.fn,un:r.fu};
const parse=t=>{const m=/pay_(\d+)(?:_(\d+))?/.exec(String(t||''));return m?{to:m[1],amt:m[2]||''}:null};
function bank(){const o=X.ov('Банк'),c=o.querySelector('.kc');let flt='all',q='';
 c.innerHTML=`<div class="card kbal"><div class="kmuted">Ваш баланс</div><div class="kbn"></div><div class="kacts"><button data-a="send"><i>↗</i><span>Перевести</span></button><button data-a="qr"><i>▦</i><span>Мой QR</span></button><button data-a="scan"><i>⌁</i><span>Сканер</span></button></div></div><div class="stats ksum"></div><div class="card" style="padding:14px"><div class="ksec" style="margin:0 0 8px;display:flex;justify-content:space-between;align-items:center;gap:8px"><span>Активность · 7 дней</span><span class="kmuted" style="font-weight:500;white-space:nowrap"><b class="kgi2">■</b> получено <b class="kgo">■</b> отправлено</span></div><div class="kbars"></div></div><div class="kflt"><button data-f="all" class="on">Все</button><button data-f="out">Отправлено</button><button data-f="in">Получено</button></div><input class="epi" id="kq2" placeholder="Поиск по @username или имени"><div class="khist kl2"></div>`;
 const draw=()=>{const me=K.U.id;c.querySelector('.kbn').textContent='⭐ '+num(K.S.stars);
  const out=H.filter(r=>r.from===me),inn=H.filter(r=>r.to===me);
  c.querySelector('.ksum').innerHTML=`<div class="stat"><b>${num(out.reduce((a,r)=>a+r.amt,0))}</b><span>отправлено</span></div><div class="stat"><b>${num(inn.reduce((a,r)=>a+r.amt,0))}</b><span>получено</span></div><div class="stat"><b>${H.length}</b><span>операций</span></div>`;
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-6+i);return{t:+d,l:DOW[d.getDay()],o:0,i:0}});
  H.forEach(r=>{const d=days.find(x=>r.ts>=x.t&&r.ts<x.t+864e5);if(d){if(r.from===me)d.o+=r.amt;else d.i+=r.amt}});
  const mx=Math.max(1,...days.flatMap(d=>[d.o,d.i]));
  c.querySelector('.kbars').innerHTML=days.map(d=>`<div class="kbc"><div class="kbp"><i class="in" style="height:${d.i?Math.max(6,d.i/mx*100):0}%"></i><i class="out" style="height:${d.o?Math.max(6,d.o/mx*100):0}%"></i></div><span>${d.l}</span></div>`).join('');
  let l=H.filter(r=>flt==='all'||(flt==='out'?r.from===me:r.to===me));
  if(q){const s=q.toLowerCase().replace(/^@/,'');l=l.filter(r=>{const p=other(r,me);return(p.un||'').toLowerCase().includes(s)||(p.name||'').toLowerCase().includes(s)||String(p.id).includes(s)})}
  let day='';c.querySelector('.khist').innerHTML=l.map(r=>{const p=other(r,me),out2=r.from===me,d=dday(r.ts),h=d!==day?`<div class="kday">${d}</div>`:'';day=d;
   return h+`<div class="card kcard kit" data-id="${esc(r.id)}"><div class="kav ${out2?'':'kin2'}">${out2?'↗':'↙'}</div><div class="grow"><b>${esc(p.name)}</b><br>${p.un?'@'+esc(p.un)+' · ':''}${r.note?esc(r.note):out2?'Перевод':'Пополнение'}</div><div class="kamt ${out2?'':'pos'}">${out2?'−':'+'}${num(r.amt)} ⭐<small>${X.tm(r.ts)}</small></div></div>`}).join('')||'<div class="kd">Переводов пока нет</div>'};
 const load=async()=>{const r=await api('x/history');if(r.l){H=r.l;draw()}};
 c.onclick=e=>{const a=e.target.closest('[data-a]'),f=e.target.closest('[data-f]'),it=e.target.closest('.kit');
  if(a){const k=a.dataset.a;if(k==='send')pay();else if(k==='qr')qr();else scan()}
  else if(f){flt=f.dataset.f;c.querySelectorAll('.kflt button').forEach(b=>b.classList.toggle('on',b===f));draw()}
  else if(it){const r=H.find(x=>x.id===it.dataset.id);if(r)receipt(r)}};
 c.querySelector('#kq2').oninput=e=>{q=e.target.value;draw()};
 draw();load();o.t=setInterval(()=>{load()},8000)}
function receipt(r){const me=K.U.id,out=r.from===me,p=other(r,me),o=X.ov('Квитанция'),c=o.querySelector('.kc');
 c.innerHTML=`<div class="card kpr kreceipt"><div class="kchk">${out?'✓':'↙'}</div><div class="t" style="font-size:20px">${out?'Перевод выполнен':'Входящий перевод'}</div><div class="kbn" style="margin:6px 0 10px">${out?'−':'+'}${num(r.amt)} ⭐</div><div class="krow"><span>${out?'Кому':'От кого'}</span><b>${esc(p.name)}${p.un?' · @'+esc(p.un):''}</b></div>${r.note?`<div class="krow"><span>Комментарий</span><b>${esc(r.note)}</b></div>`:''}<div class="krow"><span>Дата</span><b>${X.dt(r.ts)}</b></div><div class="krow"><span>Номер</span><b>#${esc(String(r.id).split('-')[0].slice(-8))}</b></div></div><button class="btn" id="kdone">Готово</button>`;
 c.querySelector('#kdone').onclick=o.close}
function pay(pre){pre=pre||{};const o=X.ov('Перевод'),c=o.querySelector('.kc');let sel=null,tmr;
 c.innerHTML=`<div class="ksec" style="margin:0">Получатель</div><input class="epi" id="pt" placeholder="@username или ID" autocapitalize="off" autocomplete="off"><div id="pr" class="kl2"></div><div class="ksec" style="margin:4px 0 0">Сумма</div><input class="epi" id="pa" type="number" inputmode="numeric" placeholder="0"><div class="kchips2">${[100,500,1000,5000].map(n=>`<button data-n="${n}">${num(n)}</button>`).join('')}<button data-n="all">Всё</button></div><input class="epi" id="pn" maxlength="60" placeholder="Комментарий (необязательно)"><div class="kmuted" id="pb"></div><button class="btn" id="pg" disabled>Отправить</button>`;
 const T=c.querySelector('#pt'),A=c.querySelector('#pa'),N=c.querySelector('#pn'),G=c.querySelector('#pg'),R=c.querySelector('#pr');
 const chip=u=>`<div class="card kcard ${sel&&sel.id===u.id?'ksel':''}" data-pick="${u.id}">${X.av(u)}<div class="grow"><div class="kn1"><b>${esc(u.name)}</b>${X.badge(u)}</div>${u.un?'@'+esc(u.un):'ID '+u.id}</div>${sel&&sel.id===u.id?'<span class="kst">✓</span>':''}</div>`;
 const upd=()=>{const a=Math.floor(+A.value)||0;c.querySelector('#pb').textContent='Доступно: ⭐ '+num(K.S.stars)+' · комиссия 0';G.disabled=!(sel&&a>=1&&a<=K.S.stars);G.textContent=a>0?'Отправить '+num(a)+' ⭐':'Отправить'};
 let found=[];const look=async()=>{const v=T.value.trim();if(v.length<2){found=[];sel=null;R.innerHTML='';return upd()}const r=await api('x/find',{q:v});found=r.l||[];const x=v.replace(/^@/,'').toLowerCase();
  const ex=found.find(u=>(u.un||'').toLowerCase()===x||String(u.id)===x);sel=ex||(found.length===1?found[0]:sel&&found.some(u=>u.id===sel.id)?sel:null);
  R.innerHTML=found.map(chip).join('')||(v.length>2?'<div class="kd" style="padding:6px">Игрок не найден. Он должен хотя бы раз запустить приложение</div>':'');upd()};
 T.oninput=()=>{sel=null;clearTimeout(tmr);tmr=setTimeout(look,260)};
 R.onclick=e=>{const p=e.target.closest('[data-pick]');if(p){sel=found.find(u=>String(u.id)===p.dataset.pick);R.innerHTML=found.map(chip).join('');upd()}};
 A.oninput=upd;c.querySelector('.kchips2').onclick=e=>{const n=e.target.dataset.n;if(n){A.value=n==='all'?K.S.stars:n;upd()}};
 G.onclick=async()=>{const a=Math.floor(+A.value);if(!sel||!(a>=1))return;if(!await X.ask(`Перевести ${num(a)} ⭐ игроку ${sel.name}${sel.un?' (@'+sel.un+')':''}?`))return;G.disabled=true;
  const r=await api('x/transfer',{to:sel.id,amt:a,note:N.value,bal:K.S.stars});if(r.e){K.hp('error');K.toast(r.e);return upd()}
  K.S.stars=r.bal;K.save();K.bal();X.snap();K.hp('success');o.close();receipt(r.rec)};
 if(pre.to){T.value=pre.to;if(pre.amt)A.value=pre.amt;look().then(()=>{if(sel&&sel.un)T.value='@'+sel.un;upd()})}else T.focus();upd()}
async function qr(){const o=X.ov('Мой QR-код'),c=o.querySelector('.kc'),me=K.U;
 c.innerHTML=`<div class="card kpr kqrc">${X.av({name:K.dispName(),photo:K.U.photo_url},'kbig')}<div class="t" style="font-size:18px">${esc(K.dispName())}</div><div class="sub">${me.username?'@'+esc(me.username):'ID '+me.id}</div><div class="kqrimg"><div class="kd">Создаём QR…</div></div><div class="kmuted">Покажите QR-код другу: он отсканирует его камерой, и приложение откроется с переводом вам</div></div><input class="epi" id="qa" type="number" inputmode="numeric" placeholder="Запросить сумму (необязательно)"><div class="kf2"><button class="btn g sm" id="qr1">Обновить QR</button><button class="btn sm" id="qr2">Поделиться</button></div><button class="btn g sm" id="qr3" style="margin-top:0">Копировать ссылку</button>`;
 let link='';const gen=async()=>{const r=await api('x/qr',{amt:c.querySelector('#qa').value});if(r.e)return c.querySelector('.kqrimg').innerHTML='<div class="kd">'+esc(r.e)+'</div>';link=r.link;c.querySelector('.kqrimg').innerHTML=r.svg};
 c.querySelector('#qr1').onclick=gen;
 c.querySelector('#qr2').onclick=()=>{if(!link)return;const u='https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent('Переведи мне звёзды в Klepa Up');W&&W.openTelegramLink?W.openTelegramLink(u):open(u)};
 c.querySelector('#qr3').onclick=async()=>{if(!link)return;try{await navigator.clipboard.writeText(link)}catch(e){const t=document.createElement('textarea');t.value=link;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}K.toast('Ссылка скопирована')};
 gen()}
function scan(){if(!W||!W.showScanQrPopup||(W.isVersionAtLeast&&!W.isVersionAtLeast('6.4')))return K.toast('Сканер недоступен. Наведите камеру телефона на QR-код, приложение откроется само');
 W.showScanQrPopup({text:'Наведите камеру на QR-код получателя'},t=>{const p=parse(t);if(p){try{W.closeScanQrPopup()}catch(e){}pay(p);return true}K.toast('Это не QR-код Klepa Up');return false})}
X.open.bank=bank;X.open.pay=pay;
X.ready.push(()=>{K=X.K;W=X.W;const m=/^pay_(\d+)(?:_(\d+))?$/.exec((W.initDataUnsafe&&W.initDataUnsafe.start_param)||'');if(m)setTimeout(()=>pay({to:m[1],amt:m[2]||''}),700)});
})();
