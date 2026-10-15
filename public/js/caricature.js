/*
 * 캐릭터(아바타) 생성
 *  1순위: 서버를 통해 Higgsfield AI 로 캐리커처 생성 (/api/caricature)
 *  대체: 브라우저에서 사진을 "왕눈이 볼록 렌즈" 로 왜곡 + 만화풍 색감으로 바꾼 캐리커처
 * 결과는 256x256 원형 얼굴 PNG(data URL). 게임에서는 이 얼굴을 작은 몸통 위에 올려 큰머리 캐릭터로 그린다.
 */
(function () {
  const SIZE = 256;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
      img.src = src;
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  }

  // 업로드용으로 사진 크기를 줄인다 (최대 1024px, JPEG)
  async function shrinkPhoto(dataUrl, max = 1024) {
    const img = await loadImage(dataUrl);
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  }

  async function findFace(img) {
    if ('FaceDetector' in window) {
      try {
        const faces = await new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }).detect(img);
        if (faces && faces[0]) {
          const b = faces[0].boundingBox;
          return { cx: b.x + b.width / 2, cy: b.y + b.height / 2, size: Math.max(b.width, b.height) * 1.75 };
        }
      } catch (e) {
        /* 지원하지 않으면 무시 */
      }
    }
    // 셀카/증명사진 가정: 가운데 약간 위쪽에 얼굴
    const size = Math.min(img.width, img.height) * 0.78;
    return { cx: img.width / 2, cy: Math.min(img.height * 0.42, img.height - size / 2), size };
  }

  // 사진 → 우스운 큰머리 얼굴
  async function localCaricature(dataUrl) {
    const img = await loadImage(dataUrl);
    const face = await findFace(img);
    const src = document.createElement('canvas');
    src.width = src.height = SIZE;
    const sctx = src.getContext('2d');
    sctx.fillStyle = '#f2d7c0';
    sctx.fillRect(0, 0, SIZE, SIZE);
    sctx.drawImage(img, face.cx - face.size / 2, face.cy - face.size / 2, face.size, face.size, 0, 0, SIZE, SIZE);
    const sdata = sctx.getImageData(0, 0, SIZE, SIZE).data;

    const out = document.createElement('canvas');
    out.width = out.height = SIZE;
    const octx = out.getContext('2d');
    const od = octx.createImageData(SIZE, SIZE);
    const d = od.data;
    const cx = SIZE / 2;
    const cy = SIZE * 0.47;
    const R = SIZE * 0.5;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        let dx = (x - cx) / R;
        let dy = (y - cy) / R;
        const r = Math.sqrt(dx * dx + dy * dy);
        // 볼록 렌즈: 가운데(눈·코)를 크게 부풀린다
        const k = r < 1 ? Math.pow(r, 0.55) / (r || 1) : 1;
        dx *= k * 0.92;
        dy *= k;
        // 아래쪽(턱)은 살짝 좁혀서 머리가 더 커 보이게
        if (dy > 0) dx *= 1 + dy * 0.25;
        const sx = Math.round(cx + dx * R);
        const sy = Math.round(cy + dy * R);
        const i = (y * SIZE + x) * 4;
        if (sx < 0 || sy < 0 || sx >= SIZE || sy >= SIZE) {
          d[i + 3] = 0;
          continue;
        }
        const j = (sy * SIZE + sx) * 4;
        let rr = sdata[j];
        let gg = sdata[j + 1];
        let bb = sdata[j + 2];
        // 만화풍: 채도↑ + 포스터라이즈
        const avg = (rr + gg + bb) / 3;
        rr = avg + (rr - avg) * 1.45;
        gg = avg + (gg - avg) * 1.45;
        bb = avg + (bb - avg) * 1.45;
        const lv = 7;
        const st = 255 / (lv - 1);
        d[i] = Math.max(0, Math.min(255, Math.round(rr / st) * st + 8));
        d[i + 1] = Math.max(0, Math.min(255, Math.round(gg / st) * st + 4));
        d[i + 2] = Math.max(0, Math.min(255, Math.round(bb / st) * st));
        d[i + 3] = 255;
      }
    }
    octx.putImageData(od, 0, 0);
    // 볼터치
    octx.globalAlpha = 0.28;
    octx.fillStyle = '#ff4d6d';
    octx.beginPath();
    octx.ellipse(SIZE * 0.27, SIZE * 0.62, 22, 14, 0, 0, Math.PI * 2);
    octx.ellipse(SIZE * 0.73, SIZE * 0.62, 22, 14, 0, 0, Math.PI * 2);
    octx.fill();
    octx.globalAlpha = 1;
    return circleCrop(out);
  }

  // 원형으로 잘라서 굵은 외곽선
  function circleCrop(source, zoom = 1) {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 6, 0, Math.PI * 2);
    ctx.clip();
    const w = source.width;
    const h = source.height;
    const s = Math.min(w, h) / zoom;
    ctx.drawImage(source, (w - s) / 2, Math.max(0, (h - s) * 0.3), s, s, 0, 0, SIZE, SIZE);
    ctx.restore();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1b1b2f';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 6, 0, Math.PI * 2);
    ctx.stroke();
    return c.toDataURL('image/png');
  }

  async function higgsfieldCaricature(photoDataUrl) {
    const res = await fetch('/api/caricature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: photoDataUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.image) throw new Error(data.error || `HTTP ${res.status}`);
    const img = await loadImage(data.image);
    // 결과 이미지의 상단(얼굴) 위주로 원형 크롭
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return circleCrop(c, 1.15);
  }

  // 기본(사진 없음) 캐릭터
  function defaultAvatar(seed, color) {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const ctx = c.getContext('2d');
    const hue = (seed * 67) % 360;
    ctx.fillStyle = color || `hsl(${hue},70%,72%)`;
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(90, 110, 30, 36, 0, 0, Math.PI * 2);
    ctx.ellipse(166, 110, 30, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1b2f';
    ctx.beginPath();
    ctx.arc(98, 118, 13, 0, Math.PI * 2);
    ctx.arc(158, 104, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1b1b2f';
    ctx.beginPath();
    ctx.arc(128, 160, 40, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.stroke();
    return c.toDataURL('image/png');
  }

  window.Caricature = { fileToDataUrl, shrinkPhoto, localCaricature, higgsfieldCaricature, defaultAvatar, loadImage };
})();
