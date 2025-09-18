const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const formatBR = n => `R$ ${Number(n||0).toFixed(2)}`;

const Storage = {
  key:'pedido_v1',
  descontoKey:'desconto_v1',
  lastOrderKey:'lastOrder_v1',
  load(){ try { return JSON.parse(localStorage.getItem(this.key)||'[]'); } catch(e){ return []; } },
  save(v){ try { localStorage.setItem(this.key, JSON.stringify(v||[])); } catch(e){} },
  saveDesconto(v){ localStorage.setItem(this.descontoKey, String(v||0)); },
  loadDesconto(){ return parseFloat(localStorage.getItem(this.descontoKey)||'0')||0; },
  saveLastOrder(o){ localStorage.setItem(this.lastOrderKey, JSON.stringify(o||null)); },
  loadLastOrder(){ try { return JSON.parse(localStorage.getItem(this.lastOrderKey)); } catch(e){ return null; } }
};

(function(){ if(!$('#a11y-announcer')){ const d=document.createElement('div'); d.id='a11y-announcer'; d.className='sr-only'; d.setAttribute('aria-live','polite'); document.body.appendChild(d); }})();
const announce = txt => { const el = $('#a11y-announcer'); if(el) el.textContent = txt; };

(function initWheel(){
  const wheel = $('#menu-wheel'); if(!wheel) return;
  const cards = $$(`#menu-wheel .menu-card`);
  const categorias = $$('.categoria');
  const resumoList = $('#resumo-items');
  const totalSpan = $('#menu-total');
  const btnAvancar = $('#menu-avancar');

  let center = 0;
  let pedido = Storage.load();

  function renderWheel(){
    const n = cards.length;
    cards.forEach((c,i)=>{
      let offset = i-center;
      if(offset>n/2) offset-=n;
      if(offset<-n/2) offset+=n;
      const scale=Math.max(0.5,1-Math.abs(offset)*0.18);
      const y=offset*72;
      const opacity=Math.max(0,1-Math.abs(offset)*0.2);
      c.style.transform=`translateY(${y}px) scale(${scale})`;
      c.style.opacity=opacity;
      c.classList.toggle('active', Math.round(offset)===0);
    });
  }

  function showCategory(id){
    categorias.forEach(cat=>cat.style.display=(cat.id===id?'grid':'none'));
  }

  renderWheel();
  if(cards[0]) showCategory(cards[0].dataset.target || categorias[0]?.id);

  wheel.addEventListener('wheel', e=>{ 
    e.preventDefault(); 
    center=(center+(e.deltaY>0?1:-1)+cards.length)%cards.length; 
    renderWheel(); 
    showCategory(cards[center].dataset.target); 
  }, {passive:false});

  cards.forEach((c, idx)=>{
    c.tabIndex=0;
    c.addEventListener('click', ()=>{ center=idx; renderWheel(); showCategory(c.dataset.target); announce(c.textContent.trim()); });
    c.addEventListener('keydown', ev=>{ if(ev.key==='Enter'||ev.key===' ') { ev.preventDefault(); c.click(); } });
  });

  window.selectItem = function(categoria,nome,preco,img){
    const item={categoria,nome,preco:Number(preco||0),img:img||'',qty:1,extras:[]};
    pedido.push(item); Storage.save(pedido);
    window.dispatchEvent(new CustomEvent('cart:changed',{detail:pedido}));
  };

  function renderResumoBottom(){
    if(!resumoList || !totalSpan) return;
    resumoList.innerHTML='';
    let total=0;

    if(!pedido.length){ resumoList.innerHTML='<li>Nenhum item no pedido</li>'; totalSpan.textContent=formatBR(0); return; }

    pedido.forEach((it, idx)=>{
      const li=document.createElement('li');
      li.innerHTML=`
        <span style="font-weight:700">${it.nome}</span>
        <input type="number" min="1" value="${it.qty||1}" data-idx="${idx}" class="menu-qty" style="width:56px;margin-left:8px;" />
        <span style="margin-left:8px;">${formatBR((it.preco||0)*(it.qty||1))}</span>
        <button class="btn-ghost" data-idx="${idx}">Remover</button>
      `;
      resumoList.appendChild(li);
      total += (it.preco||0)*(it.qty||1);
    });

    totalSpan.textContent = formatBR(total);

    resumoList.querySelectorAll('.menu-qty').forEach(inp=>{
      inp.addEventListener('change', e=>{
        const idx = Number(e.target.dataset.idx);
        let v = parseInt(e.target.value, 10); if(!v || v<1) v=1;
        pedido[idx].qty = v;
        Storage.save(pedido);
        renderResumoBottom();
      });
    });

    resumoList.querySelectorAll('button.btn-ghost').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const idx = Number(btn.dataset.idx);
        pedido.splice(idx,1);
        Storage.save(pedido);
        renderResumoBottom();
        announce('Item removido');
      });
    });
  }

  window.addEventListener('cart:changed', e=>{ pedido = e.detail || Storage.load(); renderResumoBottom(); });

  btnAvancar?.addEventListener('click', ()=>{
    if(!pedido || !pedido.length){ announce('Nenhum item selecionado'); return; }
    Storage.save(pedido);
    location.href = 'personalizacao.html';
  });

  renderResumoBottom();
})();

(function initPersonalizacao(){
  const container=$('#personalizacao-items');
  const btnContinuar=$('#btn-continuar-personalizacao');
  if(!container||!btnContinuar) return;

  let pedido = Storage.load();

  function getPersonalizacaoCamposHTML(item, idx){
    const p = item.personalizacao || {};
    const cat=(item.categoria||'').toLowerCase();
    if(cat.includes('lanche')) return `
      <label>Ponto da carne:
        <select data-idx="${idx}" data-field="ponto" class="js-personal-field">
          <option value="Normal" ${p.ponto==='Normal'?'selected':''}>Normal</option>
          <option value="Bem passada" ${p.ponto==='Bem passada'?'selected':''}>Bem passada</option>
          <option value="Ao ponto" ${p.ponto==='Ao ponto'?'selected':''}>Ao ponto</option>
          <option value="Mal passada" ${p.ponto==='Mal passada'?'selected':''}>Mal passada</option>
        </select>
      </label>
      <label>Sem cebola: <input type="checkbox" data-idx="${idx}" data-field="semCebola" class="js-personal-field" ${p.semCebola? 'checked':''} /></label>
      <label>Molho extra: <input type="checkbox" data-idx="${idx}" data-field="molhoExtra" class="js-personal-field" ${p.molhoExtra? 'checked':''} /></label>`;
    else if(cat.includes('bebida')) return `
      <label>Gelo:
        <select data-idx="${idx}" data-field="gelo" class="js-personal-field">
          <option value="Normal" ${p.gelo==='Normal'?'selected':''}>Normal</option>
          <option value="Sem gelo" ${p.gelo==='Sem gelo'?'selected':''}>Sem gelo</option>
          <option value="Mais gelo" ${p.gelo==='Mais gelo'?'selected':''}>Mais gelo</option>
        </select>
      </label>
      <label>Tamanho:
        <select data-idx="${idx}" data-field="tamanho" class="js-personal-field">
          <option value="P" ${p.tamanho==='P'?'selected':''}>P</option>
          <option value="M" ${p.tamanho==='M'?'selected':''}>M</option>
          <option value="G" ${p.tamanho==='G'?'selected':''}>G</option>
        </select>
      </label>`;
    else if(cat.includes('acompanh')) return `
      <label>Molho:
        <select data-idx="${idx}" data-field="molho" class="js-personal-field">
          <option value="Ketchup" ${p.molho==='Ketchup'?'selected':''}>Ketchup</option>
          <option value="Mostarda" ${p.molho==='Mostarda'?'selected':''}>Mostarda</option>
          <option value="Barbecue" ${p.molho==='Barbecue'?'selected':''}>Barbecue</option>
          <option value="Sem molho" ${p.molho==='Sem molho'?'selected':''}>Sem molho</option>
        </select>
      </label>
      <label>Extra crocante: <input type="checkbox" data-idx="${idx}" data-field="extraCrocante" class="js-personal-field" ${p.extraCrocante? 'checked':''} /></label>`;
    else if(cat.includes('sobremesa')) return `
      <label>Cobertura:
        <select data-idx="${idx}" data-field="cobertura" class="js-personal-field">
          <option value="Chocolate" ${p.cobertura==='Chocolate'?'selected':''}>Chocolate</option>
          <option value="Caramelo" ${p.cobertura==='Caramelo'?'selected':''}>Caramelo</option>
          <option value="Sem cobertura" ${p.cobertura==='Sem cobertura'?'selected':''}>Sem cobertura</option>
        </select>
      </label>`;
    else return `
      <label>Observações:
        <input type="text" data-idx="${idx}" data-field="observacoes" class="js-personal-field" placeholder="Ex.: sem cebola, pouco sal..." value="${(p.observacoes||'').replace(/"/g,'&quot;')}" />
      </label>`;
  }

  function renderItens(){
    container.innerHTML='';
    if(!pedido.length){ container.innerHTML='<p>Nenhum item no pedido.</p>'; return; }

    pedido.forEach((it, idx)=>{
      const card=document.createElement('div');
      card.className='item-card';
      card.innerHTML=`
        <div style="display:flex;gap:12px;align-items:center">
          <img src="${it.img||'public/placeholder.png'}" style="width:100px;height:100px;object-fit:cover;border-radius:8px" />
          <div style="flex:1">
            <div style="font-size:18px;font-weight:700">${it.nome}</div>
            <div style="margin-top:8px">${getPersonalizacaoCamposHTML(it,idx)}</div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.js-personal-field').forEach(el=>{
      el.addEventListener('change', e=>{
        const idx=Number(e.target.dataset.idx);
        const field=e.target.dataset.field;
        const value=e.target.type==='checkbox'?e.target.checked:e.target.value;
        pedido[idx].personalizacao=pedido[idx].personalizacao||{};
        pedido[idx].personalizacao[field]=value;
        Storage.save(pedido);
      });
    });
  }

  btnContinuar.addEventListener('click', ()=>{ Storage.save(pedido); location.href='resumo.html'; });
  renderItens();
})();

(function initResumo(){
  const resumoList=$('#resumo-items');
  const totalSpan=$('#resumo-total');
  if(!resumoList||!totalSpan) return;

  let pedido=Storage.load();

  function renderResumo(){
    resumoList.innerHTML='';
    let total=0;

    if(!pedido.length){ resumoList.innerHTML='<li>Nenhum item no pedido</li>'; totalSpan.textContent=formatBR(0); return; }

    pedido.forEach((it,idx)=>{
      const li=document.createElement('li');
      li.innerHTML=`
        <span>${it.nome}</span>
        <input type="number" min="1" value="${it.qty||1}" data-idx="${idx}" class="resumo-qty" style="width:50px;margin-left:8px;" />
        <span style="margin-left:8px;">${formatBR((it.preco||0)*(it.qty||1))}</span>
        <button class="btn-ghost" data-idx="${idx}">Remover</button>
      `;
      resumoList.appendChild(li);
      total+=(it.preco||0)*(it.qty||1);
    });

    totalSpan.textContent=formatBR(total);
    Storage.save(pedido);

    resumoList.querySelectorAll('.resumo-qty').forEach(inp=>{
      inp.addEventListener('change',e=>{
        const idx=Number(e.target.dataset.idx);
        let val=parseInt(e.target.value,10); if(!val||val<1) val=1;
        pedido[idx].qty=val;
        renderResumo();
      });
    });

    resumoList.querySelectorAll('button.btn-ghost').forEach(btn=>{
      btn.addEventListener('click',e=>{
        const idx=Number(btn.dataset.idx);
        pedido.splice(idx,1);
        renderResumo();
        announce('Item removido');
      });
    });
  }

  renderResumo();
})();

(function initFunko(){
  const box=$('#funko-box'); if(!box) return;
  const img=$('#funko-img'), rarity=$('#funko-rarity'), bonus=$('#funko-bonus'), result=$('#funko-result'), apply=$('#funko-apply');
  const list=[{name:'Comum',text:'5% de desconto',d:0.05,img:'public/funko1.png'},
              {name:'Incomum',text:'15% de desconto',d:0.15,img:'public/funko2.png'},
              {name:'Raro',text:'25% de desconto',d:0.25,img:'public/funko3.png'},
              {name:'Épico',text:'35% de desconto',d:0.35,img:'public/funko4.png'},
              {name:'Lendário',text:'45% de desconto',d:0.45,img:'public/funko5.png'},
              {name:'Mítico',text:'55% de desconto',d:0.55,img:'public/funko6.png'}];
  let chosen=null;

  function reveal(){
    if(box.classList.contains('open')) return;
    box.classList.add('open');
    setTimeout(()=>{
      chosen=list[Math.floor(Math.random()*list.length)];
      img.src=chosen.img; rarity.textContent=chosen.name; bonus.textContent=chosen.text;
      result.classList.remove('hidden');
      announce(`Você ganhou ${chosen.name}: ${chosen.text}`);
    },450);
  }

  box.addEventListener('click',reveal);
  box.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' ') reveal(); });
  apply?.addEventListener('click',()=>{ if(!chosen) return; Storage.saveDesconto(chosen.d); location.href='pagamento.html'; });
  window.revealFunko=reveal;
})();

(function initPagamento(){
  const itemsContainer=$('#pagamento-items'), totalEl=$('#pagamento-total');
  const btnPix=$('#btn-pay-pix'), btnCard=$('#btn-pay-card'), btnCash=$('#btn-pay-cash');
  if(!itemsContainer||!totalEl) return;

  let pedido=Storage.load()||[];
  let desconto=Storage.loadDesconto()||0;

  function getPersonalizationFieldsHTML(item, idx){
    const p = item.personalizacao || {};
    const cat=(item.categoria||'').toLowerCase();
    if(cat.includes('lanche')) return `
      <label>Ponto da carne:
        <select data-idx="${idx}" data-field="ponto" class="js-personal-field">
          <option value="Normal" ${p.ponto==='Normal'?'selected':''}>Normal</option><option value="Bem passada" ${p.ponto==='Bem passada'?'selected':''}>Bem passada</option>
          <option value="Ao ponto" ${p.ponto==='Ao ponto'?'selected':''}>Ao ponto</option><option value="Mal passada" ${p.ponto==='Mal passada'?'selected':''}>Mal passada</option>
        </select>
      </label>
      <label>Sem cebola: <input type="checkbox" data-idx="${idx}" data-field="semCebola" class="js-personal-field" ${p.semCebola? 'checked':''} /></label>
      <label>Molho extra: <input type="checkbox" data-idx="${idx}" data-field="molhoExtra" class="js-personal-field" ${p.molhoExtra? 'checked':''} /></label>`;
    else if(cat.includes('bebida')) return `
      <label>Gelo:
        <select data-idx="${idx}" data-field="gelo" class="js-personal-field">
          <option value="Normal" ${p.gelo==='Normal'?'selected':''}>Normal</option><option value="Sem gelo" ${p.gelo==='Sem gelo'?'selected':''}>Sem gelo</option>
          <option value="Mais gelo" ${p.gelo==='Mais gelo'?'selected':''}>Mais gelo</option>
        </select>
      </label>
      <label>Tamanho:
        <select data-idx="${idx}" data-field="tamanho" class="js-personal-field">
          <option value="P" ${p.tamanho==='P'?'selected':''}>P</option><option value="M" ${p.tamanho==='M'?'selected':''}>M</option><option value="G" ${p.tamanho==='G'?'selected':''}>G</option>
        </select>
      </label>`;
    else if(cat.includes('acompanh')) return `
      <label>Molho:
        <select data-idx="${idx}" data-field="molho" class="js-personal-field">
          <option value="Ketchup" ${p.molho==='Ketchup'?'selected':''}>Ketchup</option><option value="Mostarda" ${p.molho==='Mostarda'?'selected':''}>Mostarda</option>
          <option value="Barbecue" ${p.molho==='Barbecue'?'selected':''}>Barbecue</option><option value="Sem molho" ${p.molho==='Sem molho'?'selected':''}>Sem molho</option>
        </select>
      </label>
      <label>Extra crocante: <input type="checkbox" data-idx="${idx}" data-field="extraCrocante" class="js-personal-field" ${p.extraCrocante? 'checked':''} /></label>`;
    else if(cat.includes('sobremesa')) return `
      <label>Cobertura:
        <select data-idx="${idx}" data-field="cobertura" class="js-personal-field">
          <option value="Chocolate" ${p.cobertura==='Chocolate'?'selected':''}>Chocolate</option><option value="Caramelo" ${p.cobertura==='Caramelo'?'selected':''}>Caramelo</option>
          <option value="Sem cobertura" ${p.cobertura==='Sem cobertura'?'selected':''}>Sem cobertura</option>
        </select>
      </label>`;
    else return `<label>Observações:<input type="text" data-idx="${idx}" data-field="observacoes" class="js-personal-field" placeholder="Ex.: sem cebola..." value="${(p.observacoes||'').replace(/"/g,'&quot;')}" /></label>`;
  }

  function renderPagamentoItems(){
    itemsContainer.innerHTML='';
    if(!pedido.length){ itemsContainer.innerHTML='<p>Nenhum item no pedido.</p>'; totalEl.textContent=formatBR(0); return; }

    pedido.forEach((it,idx)=>{
      it.personalizacao=it.personalizacao||{};
      const card=document.createElement('div');
      card.className='item-card';
      card.style.display='flex'; card.style.flexDirection='column'; card.style.marginBottom='12px';
      card.innerHTML=`
        <div style="display:flex;gap:12px;align-items:center">
          <img src="${it.img||'public/placeholder.png'}" style="width:120px;height:120px;object-fit:cover;border-radius:8px" />
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between">
              <strong>${it.nome}</strong>
              <div>${formatBR(it.preco)}</div>
            </div>
            <div>Qtd: <input type="number" min="1" value="${it.qty||1}" data-idx="${idx}" class="js-qty" style="width:50px"/></div>
            <div style="margin-top:6px">${getPersonalizationFieldsHTML(it,idx)}</div>
          </div>
        </div>`;
      itemsContainer.appendChild(card);
    });

    itemsContainer.querySelectorAll('.js-qty').forEach(inp=>{
      inp.addEventListener('change',e=>{
        const idx=Number(e.target.dataset.idx); let v=parseInt(e.target.value,10); if(!v||v<1) v=1;
        pedido[idx].qty=v; Storage.save(pedido); computeTotals();
      });
    });

    itemsContainer.querySelectorAll('.js-personal-field').forEach(el=>{
      el.addEventListener('change',e=>{
        const idx=Number(e.target.dataset.idx);
        const field=e.target.dataset.field;
        const value=e.target.type==='checkbox'?e.target.checked:e.target.value;
        pedido[idx].personalizacao=pedido[idx].personalizacao||{};
        pedido[idx].personalizacao[field]=value;
        Storage.save(pedido);
      });
    });

    computeTotals();
  }

  function computeTotals(){
    let subtotal=0;
    pedido.forEach(it=>{ subtotal+=((it.preco||0)*(it.qty||1)); });
    desconto=Storage.loadDesconto()||0;
    const descontoValor=subtotal*desconto;
    const total=subtotal-descontoValor;
    totalEl.textContent=`${formatBR(total)} (${(desconto*100).toFixed(0)}% aplicado: -${formatBR(descontoValor)})`;
    return {subtotal,descontoValor,total};
  }

  function loadImageAsDataURL(url){
    return fetch(url).then(r=>{ if(!r.ok) throw new Error('Image fetch failed'); return r.blob(); }).then(blob=>new Promise((res,rej)=>{
      const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(blob);
    }));
  }

  async function generateReceiptPDF(order){
    try{
      const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF || null;
      if(!jsPDFCtor) return;
      const pageW = 80; 
      const pageH = 200; 
      const doc = new jsPDFCtor({ unit:'mm', format:[pageW, pageH] });
      let y = 6;

      try{
        const logoUrl = 'public/mcdonalds-logo-4-1.png';
        const dataUrl = await loadImageAsDataURL(logoUrl);
        if(dataUrl){
          const imgSize = 30; 
          const x = (pageW - imgSize) / 2;
          doc.addImage(dataUrl, 'PNG', x, y, imgSize, imgSize);
          y += imgSize + 4;
        }
      }catch(e){ }

      
      const stripeH = 10;
      doc.setFillColor(0,0,0);
      doc.rect(0, y, pageW, stripeH, 'F');
      doc.setFontSize(11);
      doc.setTextColor(255,255,255);
      const orderText = `Pedido #${order.number}`;
      doc.text(orderText, pageW/2, y + stripeH/2 + 3, { align:'center' });
      y += stripeH + 6;

      doc.setTextColor(0,0,0);
      doc.setFontSize(10);

      order.pedido.forEach(it=>{
        const nameLine = `${it.qty||1} x ${it.nome}`;
        doc.text(nameLine, 4, y);
        const priceText = formatBR((it.preco||0)*(it.qty||1));
        doc.text(priceText, pageW - 4, y, { align:'right' });
        y += 6;
        if(it.personalizacao){
          Object.entries(it.personalizacao).forEach(([k,v])=>{
            const text = `- ${k}: ${String(v)}`;
            doc.setFontSize(8);
            doc.text(text, 6, y);
            doc.setFontSize(10);
            y += 5;
          });
        }
        if(y > pageH - 30){ doc.addPage([pageW, pageH]); y = 8; }
      });

      doc.setLineWidth(0.3);
      doc.line(4, y, pageW - 4, y);
      y += 6;
      doc.setFontSize(10); doc.text(`Subtotal: ${formatBR(order.subtotal)}`, 4, y); y += 6;
      doc.text(`Desconto: -${formatBR(order.descontoValor)}`, 4, y); y += 6;
      doc.setFontSize(12); doc.text(`Total: ${formatBR(order.total)}`, 4, y); y += 8;
      doc.setFontSize(10); doc.text(`Pagamento: ${order.metodo}`, 4, y);

      try{ doc.save(`nota_${order.number}.pdf`); }catch(e){ console.warn('Erro ao salvar PDF', e); }
    }catch(err){ console.error('generateReceiptPDF error', err); }
  }

  async function finalizar(metodo){
    const totals = (window.computePagamentoTotals ? window.computePagamentoTotals() : null) || (function(){ let subtotal=0; return {subtotal, descontoValor:0, total:0}; })();
    const orderNumber = Math.floor(Math.random()*900000+100000);
    const pedidoNow = Storage.load() || [];
    const order = { number: orderNumber, pedido: JSON.parse(JSON.stringify(pedidoNow)), subtotal: totals.subtotal, desconto: Storage.loadDesconto()||0, descontoValor: totals.descontoValor, total: totals.total, metodo: metodo||'PIX', createdAt: new Date().toISOString() };
    Storage.saveLastOrder(order);

    try{ await generateReceiptPDF(order); }catch(e){ console.warn('PDF gen failed', e); }

    Storage.save([]);
    setTimeout(()=>{ location.href = `confirmacao.html?order=${orderNumber}`; }, 300);
  }

  btnPix?.addEventListener('click',()=>finalizar('PIX'));
  btnCard?.addEventListener('click',()=>finalizar('Cartão'));
  btnCash?.addEventListener('click',()=>finalizar('Dinheiro'));

  renderPagamentoItems();
  window.computePagamentoTotals=computeTotals;
  window.finalizarPagamento=finalizar;
})();

(function initConfirm(){
  const elNum=$('#confirm-numero');
  const itemsEl=$('#confirm-itens'); const totalEl=$('#confirm-total');
  const params=new URLSearchParams(location.search); const orderNum=params.get('order');
  const order=Storage.loadLastOrder();

  if(order && String(order.number)===String(orderNum)){
    elNum.textContent=orderNum;
    if(itemsEl){ itemsEl.innerHTML=''; order.pedido.forEach(it=>{
      const li=document.createElement('li');
      const price=((it.preco||0)*(it.qty||1));
      li.innerHTML=`<span>${it.nome} x${it.qty||1}</span><span>${formatBR(price)}</span>`;
      itemsEl.appendChild(li);
    }); }
    if(totalEl) totalEl.textContent=formatBR(order.total);
  }else{
    elNum.textContent=orderNum||'—';
    if(itemsEl) itemsEl.innerHTML='<li>Nenhum registro encontrado</li>';
    if(totalEl) totalEl.textContent=formatBR(0);
  }
})();
