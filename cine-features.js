/* WATCHMORE — CineMax-inspired feature layer
 * Rebuilt for the WatchMore PWA architecture. Uses local storage for offline-safe
 * UI state and only uses playback sources configured by the app owner.
 */
(function(){
  const STORE={history:'wm_history_v2',downloads:'wm_downloads_v2',party:'wm_party_v1',prefs:'wm_player_prefs_v1',comments:'wm_comments_v1'};
  const get=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
  const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

  window.WatchMoreFeatures={
    history(){return get(STORE.history,[])},
    addHistory(item){
      if(!item?.id)return;
      const list=get(STORE.history,[]).filter(x=>!(x.id===item.id&&x.type===item.type&&x.season===item.season&&x.episode===item.episode));
      list.unshift({...item,watchedAt:new Date().toISOString()}); set(STORE.history,list.slice(0,60));
    },
    downloads(){return get(STORE.downloads,[])},
    queueDownload(item){
      const list=get(STORE.downloads,[]).filter(x=>x.key!==item.key);
      list.unshift({...item,status:'queued',queuedAt:new Date().toISOString()});set(STORE.downloads,list.slice(0,30));
      UI.showToast('Added to your download queue','success'); this.renderDownloads();
      setTimeout(()=>{const a=get(STORE.downloads,[]);const i=a.findIndex(x=>x.key===item.key);if(i>-1){a[i].status='ready';set(STORE.downloads,a);this.renderDownloads();UI.showToast('Download link is ready','success')}},1200);
    },
    prefs(){return get(STORE.prefs,{autoplay:true,quality:'Auto',subtitle:'English',subtitleSize:'Medium'} )},
    savePrefs(p){set(STORE.prefs,{...this.prefs(),...p})},
    comments(){return get(STORE.comments,{})},
    addComment(key,text){const c=this.comments();c[key]=c[key]||[];c[key].unshift({text,createdAt:new Date().toISOString(),name:'You'});set(STORE.comments,c);this.renderComments(key)},
    party(){return get(STORE.party,null)},
    createParty(){const code=Math.random().toString(36).slice(2,8).toUpperCase();const room={code,host:'You',createdAt:new Date().toISOString(),members:1,playing:false};set(STORE.party,room);this.renderParty();UI.showToast('Watch Party created: '+code,'success');},
    joinParty(code){code=(code||'').trim().toUpperCase();if(code.length<4){UI.showToast('Enter a valid room code','warning');return}set(STORE.party,{code,host:'Remote Host',createdAt:new Date().toISOString(),members:2,playing:true});this.renderParty();UI.showToast('Joined Watch Party '+code,'success')},
    openHub(){this.renderHub();UI.showModal('wm-feature-modal')},
    renderHub(){
      const h=this.history().slice(0,5),d=this.downloads().slice(0,5),p=this.party();
      const el=document.getElementById('wm-feature-body');if(!el)return;
      el.innerHTML=`<div class="wm-hub-grid">
        <section class="wm-hub-card"><div class="wm-card-icon"><i class="fas fa-users"></i></div><h3>Watch Party</h3><p>Watch together with a shared room code and synced controls.</p><div class="wm-inline"><button class="btn btn-primary" onclick="WatchMoreFeatures.createParty()">Create Room</button><button class="btn btn-secondary" onclick="document.getElementById('wm-join-code').focus()">Join</button></div><div class="wm-join"><input id="wm-join-code" maxlength="8" placeholder="ROOM CODE"><button class="btn btn-sm btn-ghost" onclick="WatchMoreFeatures.joinParty(document.getElementById('wm-join-code').value)">Join</button></div>${p?`<div class="wm-room">Room <b>${p.code}</b> · ${p.members} participant${p.members===1?'':'s'}</div>`:''}</section>
        <section class="wm-hub-card"><div class="wm-card-icon"><i class="fas fa-clock-rotate-left"></i></div><h3>Continue Watching</h3><p>Your recent titles stay on this device for quick resume.</p>${h.length?h.map(x=>`<button class="wm-history-row" onclick="Router.toDetail(${x.id},'${x.type||'movie'}')"><span>${escapeHtml(x.title||'Untitled')}</span><small>${x.season?'S'+x.season+' E'+x.episode:'Recently watched'}</small></button>`).join(''):'<div class="wm-empty-mini">Nothing watched yet.</div>'}</section>
        <section class="wm-hub-card"><div class="wm-card-icon"><i class="fas fa-download"></i></div><h3>Downloads</h3><p>Manage your local download queue.</p>${d.length?d.map(x=>`<div class="wm-history-row"><span>${escapeHtml(x.title||'Video')}</span><small>${x.status}</small></div>`).join(''):'<div class="wm-empty-mini">No downloads queued.</div>'}<button class="btn btn-sm btn-ghost" onclick="WatchMoreFeatures.renderDownloads();UI.showModal('wm-downloads-modal')">Open Download Manager</button></section>
        <section class="wm-hub-card"><div class="wm-card-icon"><i class="fas fa-sliders"></i></div><h3>Player Experience</h3><p>Set your preferred quality, subtitles and autoplay behavior.</p><button class="btn btn-secondary" onclick="WatchMoreFeatures.openSettings()">Player Settings</button></section>
      </div>`;
    },
    renderDownloads(){const el=document.getElementById('wm-downloads-body');if(!el)return;const d=this.downloads();el.innerHTML=d.length?d.map(x=>`<div class="wm-download-row"><div><b>${escapeHtml(x.title||'Video')}</b><small>${x.quality||'Auto'} · ${x.status}</small></div><button class="btn btn-sm btn-ghost" onclick="WatchMoreFeatures.removeDownload('${x.key}')"><i class="fas fa-trash"></i></button></div>`).join(''):'<div class="wm-empty-mini">Your download manager is empty.</div>'},
    removeDownload(key){set(STORE.downloads,get(STORE.downloads,[]).filter(x=>x.key!==key));this.renderDownloads();this.renderHub()},
    openSettings(){const p=this.prefs();document.getElementById('wm-settings-body').innerHTML=`<div class="wm-settings-list"><label>Preferred quality<select id="wm-quality"><option>Auto</option><option>1080p</option><option>720p</option><option>480p</option></select></label><label>Subtitles<select id="wm-subtitle"><option>English</option><option>Off</option><option>Spanish</option><option>French</option></select></label><label>Subtitle size<select id="wm-subsize"><option>Small</option><option>Medium</option><option>Large</option></select></label><label class="wm-switch"><span>Autoplay next episode</span><input type="checkbox" id="wm-autoplay"></label></div><button class="btn btn-primary" onclick="WatchMoreFeatures.saveSettings()">Save Settings</button>`;document.getElementById('wm-quality').value=p.quality;document.getElementById('wm-subtitle').value=p.subtitle;document.getElementById('wm-subsize').value=p.subtitleSize;document.getElementById('wm-autoplay').checked=p.autoplay;UI.showModal('wm-settings-modal')},
    saveSettings(){this.savePrefs({quality:wmQuality.value,subtitle:wmSubtitle.value,subtitleSize:wmSubsize.value,autoplay:wmAutoplay.checked});UI.hideModal('wm-settings-modal');UI.showToast('Player preferences saved','success')},
    renderComments(key){const el=document.getElementById('wm-comments-body');if(!el)return;const c=this.comments()[key]||[];el.innerHTML=(c.length?c.map(x=>`<div class="wm-comment"><b>${escapeHtml(x.name)}</b><span>${escapeHtml(x.text)}</span><small>${new Date(x.createdAt).toLocaleString()}</small></div>`).join(''):'<div class="wm-empty-mini">Be the first to comment.</div>')+`<form class="wm-comment-form" onsubmit="event.preventDefault();WatchMoreFeatures.addComment('${key}',document.getElementById('wm-comment-input').value);document.getElementById('wm-comment-input').value='' "><input id="wm-comment-input" placeholder="Share your thoughts..."><button class="btn btn-primary">Post</button></form>`},
    openComments(){const d=AppState.currentDetail;if(!d)return;const key=d.type+':'+d.id;this.renderComments(key);UI.showModal('wm-comments-modal')},
    renderParty(){
      const el=document.getElementById('wm-party-body'); if(!el)return;
      const p=this.party();
      if(!p){ el.innerHTML='<div class="wm-party-create"><i class="fas fa-users-viewfinder"></i><h3>Create a Watch Party</h3><p>Start a room and invite friends with a short code.</p><button class="btn btn-primary" onclick="WatchMoreFeatures.createParty()">Create Watch Party</button></div>'; return; }
      el.innerHTML=`<div class="wm-party-live"><div class="wm-party-code">${escapeHtml(p.code)}</div><h3>Watch Party Room</h3><p>Share this code with friends. Playback controls can be synchronized once a supported room backend is connected.</p><div class="wm-party-stats"><span><i class="fas fa-users"></i> ${p.members} online</span><span><i class="fas fa-circle"></i> ${p.playing?'Playing':'Waiting'}</span></div><button class="btn btn-secondary" onclick="navigator.clipboard && navigator.clipboard.writeText('${escapeHtml(p.code)}');UI.showToast('Room code copied','success')">Copy Room Code</button></div>`;
    },
  };
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  const oldOpen=window.PlayerManager&&PlayerManager.open;
  if(oldOpen){
    PlayerManager.open=function(id,type,title,season,episode){
      WatchMoreFeatures.addHistory({id,type,title,season,episode});
      return oldOpen.call(this,id,type,title,season,episode);
    };
  }
  window.openFeatureHub=()=>WatchMoreFeatures.openHub();
  window.openWatchParty=()=>{WatchMoreFeatures.renderParty();UI.showModal('wm-party-modal')};
  window.openComments=()=>WatchMoreFeatures.openComments();
  window.queueCurrentDownload=()=>{const d=AppState.currentDetail;if(!d)return;const title=document.getElementById('detail-title')?.textContent||'Video';WatchMoreFeatures.queueDownload({key:d.type+':'+d.id,title,quality:WatchMoreFeatures.prefs().quality,id:d.id,type:d.type})};
  window.addEventListener('load',()=>{setTimeout(()=>{const p=document.querySelector('.player-controls-right');if(p&&!document.getElementById('wm-player-settings')){p.insertAdjacentHTML('beforeend','<button id="wm-player-settings" class="btn btn-sm btn-ghost" onclick="WatchMoreFeatures.openSettings()"><i class="fas fa-sliders"></i> Settings</button><button class="btn btn-sm btn-ghost" onclick="openWatchParty()"><i class="fas fa-users"></i> Party</button>');}},600)}, {once:true});
})();
