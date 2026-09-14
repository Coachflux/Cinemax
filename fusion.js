/* WATCHMORE FUSION V2 — CineMax-inspired capability layer for the PWA.
 * No third-party streaming endpoints are enabled here. Playback sources remain owner-configured.
 */
(function(){
  'use strict';
  const DB='watchmore_fusion_db', VER=1;
  const LS={prefs:'wm_fusion_prefs_v2',notifications:'wm_fusion_notifications_v1',profile:'wm_fusion_profile_v1',sources:'wm_fusion_sources_v1'};
  const defaults={autoplay:true,quality:'Auto',subtitle:'English',subtitleSize:'Medium',subtitleColor:'#ffffff',subtitleBg:'rgba(0,0,0,.55)',pip:true,gestureControls:true,autoNext:true,dataSaver:false};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
  const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const toast=(m,t='info')=>window.UI?.showToast(m,t,3500);

  const DBX={
    open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('downloads'))db.createObjectStore('downloads',{keyPath:'key'});if(!db.objectStoreNames.contains('rooms'))db.createObjectStore('rooms',{keyPath:'code'});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
    async put(store,val){const db=await this.open();return new Promise((res,rej)=>{const r=db.transaction(store,'readwrite').objectStore(store).put(val);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
    async all(store){const db=await this.open();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})},
    async del(store,key){const db=await this.open();return new Promise((res,rej)=>{const r=db.transaction(store,'readwrite').objectStore(store).delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
  };

  const Fusion={
    state:{party:null,channel:null,heartbeat:null,currentMedia:null},
    prefs(){return {...defaults,...get(LS.prefs,{})}},
    savePrefs(p){set(LS.prefs,{...this.prefs(),...p})},
    profile(){return get(LS.profile,{name:'Guest',email:'',avatar:''})},
    saveProfile(p){set(LS.profile,{...this.profile(),...p});this.renderProfileChip()},
    notifications(){return get(LS.notifications,[])},
    pushNotification(title,message,type='info'){const a=this.notifications();a.unshift({id:crypto.randomUUID?.()||String(Date.now()),title,message,type,at:new Date().toISOString(),read:false});set(LS.notifications,a.slice(0,50));this.updateBadge();},
    updateBadge(){const n=this.notifications().filter(x=>!x.read).length;document.querySelectorAll('.notif-badge').forEach(e=>e.textContent=n?String(Math.min(n,99)):'')},
    renderProfileChip(){const p=this.profile();['user-initial','mobile-user-initial'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=(p.name||'G').trim().charAt(0).toUpperCase()||'G'});},

    openHub(){this.renderHub();UI.showModal('wm-feature-modal')},
    renderHub(){const el=document.getElementById('wm-feature-body');if(!el)return;const h=window.WatchMoreFeatures?.history?.()||[];const d=window.WatchMoreFeatures?.downloads?.()||[];el.innerHTML=`
      <div class="fusion-hero-card"><div><span class="fusion-eyebrow">WATCHMORE FUSION</span><h2>One app. More ways to watch.</h2><p>Enhanced playback, Watch Party, downloads, subtitles, AI recommendations, notifications and personal sync — designed around the WatchMore experience.</p></div><div class="fusion-orb"><i class="fas fa-play"></i></div></div>
      <div class="fusion-feature-grid">
        ${this.card('users','Watch Party','Create or join a room with synchronized play/pause and seek controls.','openFusionParty()')}
        ${this.card('download','Downloads','Queue permitted direct media files and manage local offline items.','openFusionDownloads()')}
        ${this.card('robot','Smart Pick AI','Get recommendations from your prompt. Add a Gemini-compatible key in configuration when you are ready.','openFusionAI()')}
        ${this.card('bell','Notifications','Local notification center plus optional Firebase Cloud Messaging wiring.','openFusionNotifications()')}
        ${this.card('closed-captioning','Subtitles & Player','Quality, subtitle language, styling, autoplay, PiP and accessibility preferences.','openFusionSettings()')}
        ${this.card('database','Cloud Sync','Optional Firebase authentication and Firestore sync for profile, watchlist and rooms.','openFusionProfile()')}
        ${this.card('server','Source Manager','Owner-controlled playback source registry. Only sources you configure are used.','openFusionSources()')}
        ${this.card('history','History','Resume recently watched titles and episodes on this device.','openFusionHistory()')}
      </div>`},
    card(icon,title,desc,fn){return `<button class="fusion-feature-card" onclick="${fn}"><span class="fusion-icon"><i class="fas fa-${icon}"></i></span><span><b>${title}</b><small>${desc}</small></span><i class="fas fa-chevron-right fusion-arrow"></i></button>`},

    openSettings(){this.renderSettings();UI.showModal('wm-settings-modal')},
    renderSettings(){const p=this.prefs();const el=document.getElementById('wm-settings-body');if(!el)return;el.innerHTML=`<div class="fusion-settings">
      <div class="fusion-setting"><label>Preferred quality</label><select id="fx-quality"><option>Auto</option><option>2160p</option><option>1080p</option><option>720p</option><option>480p</option></select></div>
      <div class="fusion-setting"><label>Subtitle language</label><select id="fx-sub"><option>English</option><option>Off</option><option>Spanish</option><option>French</option><option>Arabic</option><option>Japanese</option></select></div>
      <div class="fusion-setting"><label>Subtitle size</label><select id="fx-size"><option>Small</option><option>Medium</option><option>Large</option></select></div>
      <div class="fusion-setting"><label>Subtitle background</label><select id="fx-bg"><option value="rgba(0,0,0,.55)">Dark</option><option value="rgba(0,0,0,.85)">Darker</option><option value="transparent">Transparent</option></select></div>
      ${this.toggle('fx-autoplay','Autoplay next episode',p.autoplay)}${this.toggle('fx-pip','Picture-in-picture when supported',p.pip)}${this.toggle('fx-gesture','Player gesture controls',p.gestureControls)}${this.toggle('fx-next','Auto-advance episodes',p.autoNext)}${this.toggle('fx-data','Data saver mode',p.dataSaver)}
    </div><button class="btn btn-primary" style="width:100%;margin-top:18px" onclick="saveFusionSettings()"><i class="fas fa-check"></i> Save preferences</button>`;
      fxQuality.value=p.quality;fxSub.value=p.subtitle;fxSize.value=p.subtitleSize;fxBg.value=p.subtitleBg||defaults.subtitleBg;fxAutoplay.checked=p.autoplay;fxPip.checked=p.pip;fxGesture.checked=p.gestureControls;fxNext.checked=p.autoNext;fxData.checked=p.dataSaver;
    },
    toggle(id,label,on){return `<label class="fusion-toggle"><span>${label}</span><input id="${id}" type="checkbox" ${on?'checked':''}><i></i></label>`},
    saveSettings(){this.savePrefs({quality:fxQuality.value,subtitle:fxSub.value,subtitleSize:fxSize.value,subtitleBg:fxBg.value,autoplay:fxAutoplay.checked,pip:fxPip.checked,gestureControls:fxGesture.checked,autoNext:fxNext.checked,dataSaver:fxData.checked});UI.hideModal('wm-settings-modal');toast('Player preferences saved','success')},

    async openDownloads(){await this.renderDownloads();UI.showModal('wm-downloads-modal')},
    async renderDownloads(){const el=document.getElementById('wm-downloads-body');if(!el)return;let items=[];try{items=await DBX.all('downloads')}catch{};items.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));el.innerHTML=`<div class="fusion-download-head"><div><b>Offline downloads</b><small>Only direct media URLs that you are authorized to download can be stored by the browser.</small></div><button class="btn btn-sm btn-ghost" onclick="clearFusionDownloads()">Clear</button></div>`+(items.length?items.map(x=>`<div class="fusion-download-item"><div class="fusion-download-poster" style="background-image:url('${esc(x.poster||'')}')"></div><div class="fusion-download-info"><b>${esc(x.title)}</b><small>${esc(x.quality||'Auto')} · ${esc(x.status||'queued')}</small><div class="fusion-progress"><span style="width:${Math.max(0,Math.min(100,x.progress||0))}%"></span></div></div><button class="btn btn-sm btn-ghost" onclick="removeFusionDownload('${esc(x.key)}')"><i class="fas fa-trash"></i></button></div>`).join(''):'<div class="fusion-empty"><i class="fas fa-download"></i><b>No offline items</b><span>Queue a permitted direct media file from a compatible source.</span></div>')},
    async queueDownload(item,url){const key=`${item.type||'movie'}:${item.id}:${item.season||0}:${item.episode||0}`;const row={key,title:item.title||'Video',poster:item.poster||'',quality:this.prefs().quality,status:'queued',progress:0,url:url||'',createdAt:new Date().toISOString()};await DBX.put('downloads',row);toast('Added to download manager','success');await this.renderDownloads();
      if(url)this.fetchDownload(row);else toast('No direct download URL supplied by the source.','warning',4500);
    },
    async fetchDownload(row){try{row.status='downloading';row.progress=5;await DBX.put('downloads',row);const r=await fetch(row.url,{mode:'cors'});if(!r.ok)throw Error('HTTP '+r.status);const blob=await r.blob();row.blob=blob;row.status='ready';row.progress=100;await DBX.put('downloads',row);toast('Download is ready','success')}catch(e){row.status='unavailable';row.progress=0;await DBX.put('downloads',row);toast('The server blocked browser downloading. Use the source download option instead.','warning',5000)}await this.renderDownloads()},

    openParty(){this.renderParty();UI.showModal('wm-party-modal')},
    renderParty(){const el=document.getElementById('wm-party-body');if(!el)return;const p=this.state.party;el.innerHTML=p?`<div class="fusion-party"><span class="fusion-eyebrow">WATCH PARTY</span><h2>Room ${esc(p.code)}</h2><p>Share the room code. Same-browser tabs synchronize instantly; Firebase can provide cross-device rooms when configured.</p><div class="fusion-room-code">${esc(p.code)}</div><div class="fusion-party-actions"><button class="btn btn-primary" onclick="copyFusionRoom()">Copy code</button><button class="btn btn-secondary" onclick="leaveFusionParty()">Leave</button></div><div id="fusion-party-status" class="fusion-party-status"></div></div>`:`<div class="fusion-party"><span class="fusion-eyebrow">WATCH TOGETHER</span><h2>Start a Watch Party</h2><p>Create a room and invite friends. Playback events are synchronized through BroadcastChannel locally, with optional Firestore transport.</p><button class="btn btn-primary" onclick="createFusionParty()"><i class="fas fa-plus"></i> Create room</button><div class="fusion-join-row"><input id="fusion-join-code" maxlength="8" placeholder="Enter room code"><button class="btn btn-secondary" onclick="joinFusionParty()">Join</button></div></div>`},
    createParty(){const code=Math.random().toString(36).slice(2,8).toUpperCase();this.state.party={code,host:true,position:0,playing:false,title:'',createdAt:new Date().toISOString()};this.openParty();this.startPartyChannel();toast('Watch Party created: '+code,'success');this.pushNotification('Watch Party created','Room '+code+' is ready to share.','success')},
    joinParty(){const code=(document.getElementById('fusion-join-code')?.value||'').trim().toUpperCase();if(code.length<4)return toast('Enter a valid room code','warning');this.state.party={code,host:false,position:0,playing:false,title:'',joinedAt:new Date().toISOString()};this.openParty();this.startPartyChannel();toast('Joined Watch Party '+code,'success')},
    startPartyChannel(){if(this.state.channel)this.state.channel.close();if('BroadcastChannel' in window){const c=new BroadcastChannel('watchmore-party-'+this.state.party.code);this.state.channel=c;c.onmessage=e=>this.receiveParty(e.data)}this.renderParty()},
    sendParty(data){if(this.state.channel)this.state.channel.postMessage({...data,from:this.state.party?.host?'host':'guest',at:Date.now()})},
    receiveParty(data){if(!this.state.party||data.from===(this.state.party.host?'host':'guest'))return;if(data.type==='playback'){this.state.party.position=data.position||0;this.state.party.playing=!!data.playing;this.renderPartyStatus()}},
    renderPartyStatus(){const e=document.getElementById('fusion-party-status');if(e)e.innerHTML=`<span><i class="fas fa-circle"></i> ${this.state.party?.playing?'Playing':'Paused'}</span><span>${Math.floor(this.state.party?.position||0)}s synced</span>`},
    leaveParty(){this.state.channel?.close();this.state.channel=null;this.state.party=null;this.renderParty();toast('Left Watch Party','info')},

    openAI(){const el=document.getElementById('wm-ai-body');if(!el)return;el.innerHTML=`<div class="fusion-ai"><div class="fusion-ai-header"><span class="fusion-ai-icon"><i class="fas fa-sparkles"></i></span><div><b>WATCHMORE Smart Pick</b><small>Recommendation assistant</small></div></div><textarea id="fusion-ai-prompt" placeholder="e.g. Give me 5 smart sci-fi thrillers with mystery and strong characters."></textarea><div class="fusion-ai-chips"><button onclick="setFusionPrompt('A feel-good comedy for tonight')">Feel-good</button><button onclick="setFusionPrompt('A dark mystery thriller with a big twist')">Mystery</button><button onclick="setFusionPrompt('An exciting family adventure')">Family</button></div><button class="btn btn-primary" onclick="runFusionAI()"><i class="fas fa-wand-magic-sparkles"></i> Generate picks</button><div id="fusion-ai-result"></div></div>`},
    async runAI(){const q=document.getElementById('fusion-ai-prompt')?.value.trim();const out=document.getElementById('fusion-ai-result');if(!q)return toast('Describe what you want to watch','warning');out.innerHTML='<div class="fusion-ai-loading"><span class="spinner"></span> Finding the best matches…</div>';try{const data=await TMDB.fetch('/search/multi',{query:q.replace(/^(give me|recommend)\s+/i,'').slice(0,120),page:1});const results=(data?.results||[]).filter(x=>x.media_type==='movie'||x.media_type==='tv').slice(0,8);out.innerHTML=results.length?`<div class="fusion-ai-results">${results.map(x=>`<button onclick="showDetail(${x.id},'${x.media_type==='tv'?'tv':'movie'}')"><img src="${TMDB.image(x.poster_path,'w185')}"><span><b>${esc(x.title||x.name)}</b><small>★ ${(x.vote_average||0).toFixed(1)} · ${x.media_type==='tv'?'TV':'Movie'}</small></span></button>`).join('')}</div>`:'<div class="fusion-empty">No strong matches found. Try a genre, mood, actor or year.</div>'}catch(e){out.innerHTML='<div class="fusion-empty">AI suggestions are unavailable right now. Check your TMDB/API configuration or network.</div>'}},

    openNotifications(){const el=document.getElementById('wm-notifications-body');if(!el)return;const n=this.notifications();n.forEach(x=>x.read=true);set(LS.notifications,n);this.updateBadge();el.innerHTML=n.length?n.map(x=>`<div class="fusion-notif"><span class="fusion-notif-icon"><i class="fas fa-${x.type==='success'?'check':x.type==='warning'?'triangle-exclamation':'bell'}"></i></span><div><b>${esc(x.title)}</b><p>${esc(x.message)}</p><small>${new Date(x.at).toLocaleString()}</small></div></div>`).join(''):'<div class="fusion-empty"><i class="fas fa-bell-slash"></i><b>No notifications</b><span>New WatchMore activity will appear here.</span></div>'},
    openProfile(){const p=this.profile();const el=document.getElementById('wm-profile-body');if(!el)return;el.innerHTML=`<div class="fusion-profile"><div class="fusion-avatar-large">${esc((p.name||'G').charAt(0).toUpperCase())}</div><h2>${esc(p.name||'Guest')}</h2><p>${esc(p.email||'Local profile')}</p><div class="fusion-profile-form"><input id="fx-name" value="${esc(p.name||'Guest')}" placeholder="Display name"><input id="fx-email" value="${esc(p.email||'')}" placeholder="Email (optional)"></div><button class="btn btn-primary" onclick="saveFusionProfile()">Save profile</button></div>`},
    openSources(){const el=document.getElementById('wm-sources-body');if(!el)return;const s=get(LS.sources,[{name:'Owner-configured source',enabled:true,type:'embed'}]);el.innerHTML=`<div class="fusion-source-note"><i class="fas fa-shield-halved"></i><span>Playback sources are intentionally owner-controlled. Add only services and media you have permission to use.</span></div>${s.map((x,i)=>`<div class="fusion-source"><span><b>${esc(x.name)}</b><small>${esc(x.type||'custom')}</small></span><label class="fusion-toggle"><input type="checkbox" ${x.enabled?'checked':''} onchange="toggleFusionSource(${i},this.checked)"><i></i></label></div>`).join('')}`},
    toggleSource(i,on){const s=get(LS.sources,[]);if(s[i])s[i].enabled=on;set(LS.sources,s);toast('Source preference updated','success')},
    openHistory(){const h=window.WatchMoreFeatures?.history?.()||[];const el=document.getElementById('wm-history-body');if(!el)return;el.innerHTML=h.length?h.slice(0,40).map(x=>`<button class="fusion-history" onclick="showDetail(${x.id},'${x.type||'movie'}')"><span>${esc(x.title||'Untitled')}</span><small>${x.season?`S${x.season} E${x.episode}`:'Movie'} · ${new Date(x.watchedAt||Date.now()).toLocaleDateString()}</small></button>`).join(''):'<div class="fusion-empty"><i class="fas fa-clock"></i><b>No viewing history</b><span>Play a title and it will appear here.</span></div>'},

    install(){if(window.deferredInstallPrompt){window.deferredInstallPrompt.prompt();window.deferredInstallPrompt=null;return}UI.showModal('install-instructions-modal')},
  };

  window.Fusion=Fusion;
  window.openFusionParty=()=>Fusion.openParty();
  window.createFusionParty=()=>Fusion.createParty();
  window.joinFusionParty=()=>Fusion.joinParty();
  window.copyFusionRoom=()=>{const c=Fusion.state.party?.code||'';navigator.clipboard?.writeText(c);toast('Room code copied','success')};
  window.leaveFusionParty=()=>Fusion.leaveParty();
  window.openFusionDownloads=()=>Fusion.openDownloads();
  window.removeFusionDownload=async k=>{await DBX.del('downloads',k);Fusion.renderDownloads();toast('Download removed','info')};
  window.clearFusionDownloads=async()=>{for(const x of await DBX.all('downloads'))await DBX.del('downloads',x.key);Fusion.renderDownloads();toast('Downloads cleared','info')};
  window.openFusionAI=()=>{Fusion.openAI();UI.showModal('wm-ai-modal')};
  window.setFusionPrompt=s=>{const e=document.getElementById('fusion-ai-prompt');if(e)e.value=s};
  window.runFusionAI=()=>Fusion.runAI();
  window.openFusionNotifications=()=>{Fusion.openNotifications();UI.showModal('wm-notifications-modal')};
  window.openFusionSettings=()=>Fusion.openSettings();
  window.saveFusionSettings=()=>Fusion.saveSettings();
  window.openFusionProfile=()=>{Fusion.openProfile();UI.showModal('wm-profile-modal')};
  window.saveFusionProfile=()=>{Fusion.saveProfile({name:fxName.value.trim()||'Guest',email:fxEmail.value.trim()});UI.hideModal('wm-profile-modal');toast('Profile saved','success')};
  window.openFusionSources=()=>{Fusion.openSources();UI.showModal('wm-sources-modal')};
  window.toggleFusionSource=(i,on)=>Fusion.toggleSource(i,on);
  window.openFusionHistory=()=>{Fusion.openHistory();UI.showModal('wm-history-modal')};
  window.queueFusionDownload=(item,url)=>Fusion.queueDownload(item,url);

  // Extend the existing player without breaking its iframe/source system.
  const bootPlayer=()=>{
    const p=window.PlayerManager;if(!p)return;
    const originalOpen=p.open.bind(p), originalClose=p.close.bind(p);
    p.open=function(id,type='movie',title='',season=null,episode=null){Fusion.state.currentMedia={id,type,title,season,episode};Fusion.pushNotification('Now playing',`${title||'Title'}${season?` · S${season} E${episode}`:''}`,'info');const r=originalOpen(id,type,title,season,episode);setTimeout(()=>{Fusion.renderPartyStatus();},250);return r};
    p.close=function(){Fusion.state.currentMedia=null;return originalClose()};
    if(!p.__fusionPrev){p.__fusionPrev=true;p.prevSource=function(){this.sourceIndex=Math.max(0,(this.sourceIndex||0)-1);const iframe=document.getElementById('player-iframe');if(iframe){iframe.src=this.getUrl(this.sourceIndex,this.currentId,this.currentType,this.currentSeason,this.currentEpisode);UI.showToast(`Switched to ${this.sources[this.sourceIndex].name}`,'info',1800)}}}
  };

  document.addEventListener('DOMContentLoaded',()=>{Fusion.renderProfileChip();Fusion.updateBadge();Fusion.pushNotification('Welcome to WatchMore','Your enhanced entertainment hub is ready.','success');setTimeout(bootPlayer,100);});
  window.addEventListener('beforeunload',()=>Fusion.state.channel?.close());
})();
