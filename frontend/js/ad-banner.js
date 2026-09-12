(function(){
  function normalizeImageUrl(url){
    if(!url) return '';
    let u=String(url).trim();
    try{
      const parsed=new URL(u);
      if(parsed.hostname.includes('drive.google.com')){
        const m=parsed.pathname.match(/\/file\/d\/([^/]+)/);
        const id=m&&m[1] ? m[1] : parsed.searchParams.get('id');
        if(id) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
      }
      if(parsed.hostname.includes('dropbox.com')){
        parsed.searchParams.set('raw','1');
        parsed.searchParams.delete('dl');
        return parsed.toString();
      }
    }catch(_e){}
    return u;
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    const slot=document.getElementById('recountixAdSlot');
    if(!slot||typeof sbGetActiveAds!=='function') return;
    try{
      const ads=await sbGetActiveAds(currentShopId());
      if(!ads.length) return;
      const ad=ads[Math.floor(Math.random()*ads.length)];
      const card=document.createElement(ad.link_url?'a':'div');
      card.className='rx-ad-card';
      if(ad.link_url){
        card.href=ad.link_url;
        card.target='_blank';
        card.rel='noopener sponsored';
        card.addEventListener('click',()=>sbTrackAdClick(ad.id));
      }

      const copy=document.createElement('div');
      copy.className='rx-ad-copy';
      const label=document.createElement('span');
      label.className='rx-ad-label';
      label.textContent='Sponsored';
      const title=document.createElement('div');
      title.className='rx-ad-title';
      title.textContent=ad.title||'';
      const text=document.createElement('p');
      text.className='rx-ad-text';
      text.textContent=ad.description||'';
      copy.append(label,title,text);
      card.append(copy);

      if(ad.image_url){
        const media=document.createElement('div');
        media.className='rx-ad-media';
        const img=document.createElement('img');
        img.className='rx-ad-image';
        img.src=normalizeImageUrl(ad.image_url);
        img.alt=ad.title||'Sponsored campaign';
        img.decoding='async';
        img.loading='eager';

        const sponsored=document.createElement('span');
        sponsored.className='rx-ad-overlay-label';
        sponsored.textContent='Sponsored';
        media.append(img,sponsored);
        card.append(media);

        img.addEventListener('load',()=>{
          card.classList.add('has-image','image-ready');
        });
        img.addEventListener('error',()=>{
          card.classList.remove('image-ready');
          media.remove();
          console.warn('Ad image failed to load:', ad.image_url);
        });
      }

      if(ad.link_url){
        const cta=document.createElement('span');
        cta.className='rx-ad-cta';
        cta.textContent=ad.cta_text||'Learn More';
        card.append(cta);
      }

      slot.append(card);
      slot.hidden=false;
    }catch(e){console.warn('Ad banner',e);}
  });
})();
