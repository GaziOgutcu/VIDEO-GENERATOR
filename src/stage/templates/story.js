// User-authored text with optional local stock video. Playback is explicitly sought per frame.
(() => {
  window.TEMPLATES.story = {
    layouts: ['default'],
    mount(root, sc, theme, look) {
      let video, ready;
      if (sc.data.video) {
        video = document.createElement('video'); video.muted = true; video.preload = 'none'; video.playsInline = true;
        video.style.cssText = 'position:absolute;inset:0;width:1080px;height:1920px;object-fit:cover;opacity:.85';
         root.prepend(video);
        const shade = document.createElement('div'); shade.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.72),rgba(0,0,0,.22) 45%,rgba(0,0,0,.85))'; video.after(shade);
      }
      const card = window.card(root, look, 'left:90px;top:590px;width:900px;height:660px;padding:45px;display:flex;align-items:center');
      const text = document.createElement('div'); text.textContent = sc.data.text;
      text.style.cssText = 'font-weight:800;font-size:66px;line-height:1.25;letter-spacing:-.025em;overflow-wrap:anywhere;width:100%;max-height:570px;overflow:hidden';
      card.append(text);
      let size = 66; while (text.scrollHeight > 570 && size > 30) { size -= 2; text.style.fontSize = size + 'px'; }
      return { card, video, ready, source: sc.data.video };
    },
    update(instance, t, sc) { Variation.enter(instance.card, window.E.clamp((t - sc.start - .15) / .6), 'rise'); },
    release(instance) {
      if (!instance.video?.hasAttribute('src')) return;
      instance.video.pause(); instance.video.removeAttribute('src'); instance.video.load(); instance.ready = null;
    },
    async seek(instance, t, sc) {
      const video = instance.video; if (!video) return;
      if (!instance.ready) {
        instance.ready = new Promise((resolve, reject) => {
          const cleanup = () => { clearTimeout(timer); video.removeEventListener('loadeddata', done); video.removeEventListener('error', fail); };
          const done = () => { cleanup(); resolve(); }, fail = () => { cleanup(); reject(new Error('Stock video could not be loaded or decoded')); };
          const timer = setTimeout(fail, 30000);
          video.addEventListener('loadeddata', done, { once: true }); video.addEventListener('error', fail, { once: true });
          video.preload = 'auto'; video.src = instance.source; video.load();
        });
      }
      await instance.ready;
      const length = video.duration;
      if (!Number.isFinite(length) || length <= 0) throw new Error('Invalid stock video duration');
      const time = Math.max(0, t - sc.start) % Math.max(.01, length - .05);
      if (Math.abs(video.currentTime - time) < .0001) return;
      await new Promise((resolve, reject) => {
        const cleanup = () => { clearTimeout(timer); video.removeEventListener('seeked', done); video.removeEventListener('error', fail); };
        const done = () => { cleanup(); resolve(); }, fail = () => { cleanup(); reject(new Error('Stock video seek failed')); };
        const timer = setTimeout(fail, 15000);
        video.addEventListener('seeked', done, { once: true }); video.addEventListener('error', fail, { once: true }); video.currentTime = time;
      });
    },
  };
})();
