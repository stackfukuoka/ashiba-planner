import { useState, useRef, useCallback, useReducer, useEffect } from "react";

// ===== 定数 =====
const GRID_COLS = 250;  // 横250マス = 25,000mm
const GRID_ROWS = 180;  // 縦180マス = 18,000mm
const MM_PER_CELL = 100;
const BASE_CELL = 8;    // 表示上の基本セルサイズ(px)
const MIN_SCALE = 0.5;
const MAX_SCALE = 8.0;
const INIT_SCALE = 1.5;

const BUILDING_PARTS = {
  wall:     { label: "外壁",       color: "#4a5568", symbol: "壁" },
  window:   { label: "窓",         color: "#2b6cb0", symbol: "窓" },
  entrance: { label: "出入口",     color: "#744210", symbol: "入" },
  balcony:  { label: "バルコニー", color: "#276749", symbol: "BC" },
  eave:     { label: "軒",         color: "#5a4a2a", symbol: "軒" },
  carport:  { label: "カーポート", color: "#2a5a6a", symbol: "CP" },
  takylon:  { label: "タキロン",   color: "#1a6a5a", symbol: "TK" },
  plant:    { label: "植木",       color: "#2d6a2a", symbol: "植" },
  other:    { label: "その他",     color: "#5a5a5a", symbol: "他" },
};

const SCAFFOLD_PARTS = {
  frame:      { label: "枠組みフレーム", unit: "枚", price: 8500,  color: "#2a7fd4", symbol: "F" },
  jack:       { label: "ジャッキベース", unit: "本", price: 1200,  color: "#2d9a6f", symbol: "J" },
  crossBrace: { label: "交差筋かい",    unit: "本", price: 2800,  color: "#e07b39", symbol: "X" },
  footBoard:  { label: "布板（踏板）",  unit: "枚", price: 3200,  color: "#6b4c9a", symbol: "B" },
  handrail:   { label: "手すり枠",     unit: "本", price: 4100,  color: "#c0392b", symbol: "H" },
  stair:      { label: "階段枠",       unit: "基", price: 15000, color: "#7f8c8d", symbol: "S" },
};

const CHECK_DEFS = {
  survey:  { title: "現調時確認事項", color: "#2a7fd4", items: ["カーポート・駐輪場屋根","割れ・ヒビ・傷等","電気器具等破損","玄関廻り破損個所","壁・サッシ廻り破損","軒点破損等","縦・横樋破損","庭・敷地内","外回り破損"] },
  setup:   { title: "架け時確認事項", color: "#2d9a6f", items: ["現調時確認事項の確認","到着時敷地内確認","左記破損個所の確認","隣・棟・屋根・瓦の破損","素材の欠損等確認","庭・花壇の状況","照明器具・電気設備の状況","主任者看板シートの設置","作業終了後 目視"] },
  payment: { title: "払い時確認事項", color: "#6b4c9a", items: ["現調時確認事項の確認","到着時敷地内確認","左記破損個所の確認","軒・棟・屋根・瓦確認","素材の欠損等確認","庭・花壇の状況","壁・天井等の汚れ破損","作業終了後 目視","作業終了時後の清掃"] },
};

const mkGrid = () => Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));

// ===== スタイル =====
const card = { background:"#1a2d42", borderRadius:12, padding:"14px 16px", border:"1px solid #2a4a6b", marginBottom:12 };
const lbl  = { fontSize:11, color:"#7a9db8", marginBottom:4, display:"block" };
const inp  = { width:"100%", background:"#0f1923", border:"1px solid #2a4a6b", borderRadius:8, color:"#e8edf2", padding:"9px 12px", fontSize:14, boxSizing:"border-box", outline:"none" };
const r2   = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 };

function Tags({ label, opts, vals, onChange }) {
  return (
    <div style={{marginBottom:12}}>
      {label&&<span style={lbl}>{label}</span>}
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {opts.map(o=>{const on=vals.includes(o);return(
          <button key={o} onClick={()=>onChange(on?vals.filter(v=>v!==o):[...vals,o])} style={{padding:"5px 11px",borderRadius:20,fontSize:12,cursor:"pointer",background:on?"#2a7fd4":"#0f1923",border:on?"1px solid #2a7fd4":"1px solid #2a4a6b",color:on?"#fff":"#7a9db8"}}>{o}</button>
        );})}
      </div>
    </div>
  );
}
function Radio({ label, opts, val, onChange }) {
  return (
    <div style={{marginBottom:12}}>
      {label&&<span style={lbl}>{label}</span>}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {opts.map(o=>{const on=val===o;return(
          <button key={o} onClick={()=>onChange(o)} style={{padding:"5px 14px",borderRadius:20,fontSize:12,cursor:"pointer",background:on?"#1a5fa8":"#0f1923",border:on?"1px solid #2a7fd4":"1px solid #2a4a6b",color:on?"#e8edf2":"#7a9db8",fontWeight:on?700:400}}>{o}</button>
        );})}
      </div>
    </div>
  );
}
function Fld({ label, val, onChange, ph, type="text" }) {
  return (
    <div style={{marginBottom:12}}>
      <label style={lbl}>{label}</label>
      <input type={type} value={val} onChange={e=>onChange(e.target.value)} placeholder={ph} style={inp}/>
    </div>
  );
}
function CheckSection({ def, checks, onToggle }) {
  const done=def.items.filter(i=>checks.includes(i)).length;
  return (
    <div style={{...card,borderColor:def.color+"66"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:def.color}}>{def.title}</div>
        <div style={{fontSize:11,padding:"2px 10px",borderRadius:20,background:done===def.items.length?def.color+"33":"#0f1923",border:`1px solid ${done===def.items.length?def.color:"#2a4a6b"}`,color:done===def.items.length?def.color:"#5a7a96"}}>{done}/{def.items.length}</div>
      </div>
      {def.items.map((item,idx)=>{const ck=checks.includes(item);return(
        <button key={item} onClick={()=>onToggle(item)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 12px",background:ck?def.color+"18":"transparent",border:"none",borderBottom:idx<def.items.length-1?"1px solid #1e3048":"none",cursor:"pointer",textAlign:"left",width:"100%"}}>
          <div style={{width:22,height:22,borderRadius:6,flexShrink:0,background:ck?def.color:"#0f1923",border:`2px solid ${ck?def.color:"#2a4a6b"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff"}}>{ck?"✓":""}</div>
          <span style={{fontSize:13,color:ck?"#e8edf2":"#7a9db8"}}>{item}</span>
          {ck&&<span style={{marginLeft:"auto",fontSize:10,color:def.color}}>済</span>}
        </button>
      );})}
    </div>
  );
}

// ===== 寸法ラベルを計算（連続ブロックの検出）=====
// 水平・垂直方向の連続ブロックを検出して中央セルと長さを返す
function calcDimensions(grid) {
  const dims = []; // {row, col, dir:"h"|"v", cells, labelMm, editKey}
  const ROWS = grid.length, COLS = grid[0]?.length || 0;

  // 水平方向
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      if (!grid[r][c]) { c++; continue; }
      const part = grid[r][c];
      let end = c;
      while (end + 1 < COLS && grid[r][end+1] === part) end++;
      const len = end - c + 1;
      if (len >= 2) {
        const mid = Math.floor((c + end) / 2);
        dims.push({ row: r, col: mid, dir: "h", cells: len, labelMm: len * MM_PER_CELL, key: `h_${r}_${c}` });
      }
      c = end + 1;
    }
  }
  // 垂直方向
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      if (!grid[r][c]) { r++; continue; }
      const part = grid[r][c];
      let end = r;
      while (end + 1 < ROWS && grid[end+1][c] === part) end++;
      const len = end - r + 1;
      if (len >= 2) {
        const mid = Math.floor((r + end) / 2);
        dims.push({ row: mid, col: c, dir: "v", cells: len, labelMm: len * MM_PER_CELL, key: `v_${r}_${c}` });
      }
      r = end + 1;
    }
  }
  return dims;
}

// ===== メインコンポーネント =====
export default function App() {
  const [tick, redraw] = useReducer(n=>n+1, 0);

  // グリッドRef（建物・足場）
  const bGridRef = useRef(mkGrid());
  const sGridRef = useRef(mkGrid());
  const layerRef = useRef("building");
  const bPartRef = useRef("wall");
  const sPartRef = useRef("frame");
  const scaleRef = useRef(INIT_SCALE);
  const isDrawingRef = useRef(false);
  const eraseModeRef = useRef(false);
  const pinchRef = useRef({active:false,dist:0,startScale:1});
  // パン（スクロール）
  const panRef = useRef({active:false,startX:0,startY:0,scrollX:0,scrollY:0});
  const touchStartRef = useRef(null); // {x, y, time} タッチ開始位置
  const hasMoved = useRef(false);     // スクロール判定済みフラグ
  const MOVE_THRESHOLD = 8;           // px: これ以上動いたらスクロール扱い
  const gridContainerRef = useRef(null);

  // テキストボックス
  const [textBoxes, setTextBoxes] = useState([]);
  const [addingText, setAddingText] = useState(false);
  const [editingText, setEditingText] = useState(null); // {id, value}

  // 寸法ラベル上書き
  const [dimOverrides, setDimOverrides] = useState({}); // key -> mm値
  const [editingDim, setEditingDim] = useState(null); // {key, value}

  // UI state
  const [activeTab, setActiveTab] = useState("draw");
  const [scale, setScale] = useState(INIT_SCALE);
  const [bPartUI, setBPartUI] = useState("wall");
  const [sPartUI, setSPartUI] = useState("frame");
  const [eraseOn, setEraseOn] = useState(false);
  const [drawMode, setDrawMode] = useState("draw"); // "draw"|"text"
  const [interactMode, setInteractMode] = useState("scroll"); // "draw"|"scroll"
  const interactModeRef = useRef("scroll");
  const setInteractModeSync = v => { interactModeRef.current=v; setInteractMode(v); };

  // 現場情報
  const [info, setInfo] = useState({date:"",timeStart:"",timeEnd:"",client:"",siteName:"",siteAddress:"",manager:"",vehicle:""});
  const upd = k=>v=>setInfo(p=>({...p,[k]:v}));
  const [workType, setWorkType] = useState("組立");
  const [kojiContents, setKoji] = useState([]);
  const [scaffoldSpec, setSpec] = useState([]);
  const [荷取り, set荷取り] = useState("無");
  const [昇降, set昇降] = useState("無");
  const [安全対策, set安全] = useState([]);
  const [シート, setSheet] = useState([]);
  const [備考, setNote] = useState("");
  const [floors, setFloors] = useState(3);
  const [prices, setPrices] = useState(()=>Object.fromEntries(Object.entries(SCAFFOLD_PARTS).map(([k,v])=>[k,v.price])));
  const updatePrice=(key,val)=>{const n=parseInt(val.replace(/[^0-9]/g,''),10);setPrices(p=>({...p,[key]:isNaN(n)?0:n}));};

  // 確認事項
  const [surveyChecks, setSurvey] = useState([]);
  const [damageMemo, setDmg] = useState("");
  const [setupChecks, setSetup] = useState([]);
  const [payChecks, setPay] = useState([]);
  const toggle = setter=>item=>setter(p=>p.includes(item)?p.filter(v=>v!==item):[...p,item]);

  const cellSize = BASE_CELL * scale;
  const isDrawTab = activeTab === "draw";

  // 全体サイズ（使われているマス範囲）
  const usedBounds = (() => {
    let minR=GRID_ROWS,maxR=0,minC=GRID_COLS,maxC=0,found=false;
    [bGridRef.current, sGridRef.current].forEach(grid=>{
      grid.forEach((row,r)=>row.forEach((c2,c)=>{
        if(c2){found=true;minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);}
      }));
    });
    return found?{w:(maxC-minC+1)*MM_PER_CELL,h:(maxR-minR+1)*MM_PER_CELL}:null;
  })();

  const setScaleSync=val=>{scaleRef.current=val;setScale(val);};

  const selectPart=key=>{
    if(layerRef.current==="building"){bPartRef.current=key;setBPartUI(key);}
    else{sPartRef.current=key;setSPartUI(key);}
    eraseModeRef.current=false;setEraseOn(false);
  };

  const getCellFromEvent=(e,el)=>{
    const rect=el.getBoundingClientRect();
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    return{row:Math.floor((cy-rect.top)/(scaleRef.current*BASE_CELL)),col:Math.floor((cx-rect.left)/(scaleRef.current*BASE_CELL))};
  };

  const getTouchDist=t=>{const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.sqrt(dx*dx+dy*dy);};

  const paint=(row,col)=>{
    if(row<0||row>=GRID_ROWS||col<0||col>=GRID_COLS)return;
    const isB=layerRef.current==="building";
    const part=isB?bPartRef.current:sPartRef.current;
    const grid=isB?bGridRef.current:sGridRef.current;
    grid[row][col]=eraseModeRef.current?null:part;
    redraw();
  };

  const onDown=useCallback(e=>{
    if(interactModeRef.current==="scroll"){
      // 移動モードのみピンチ有効
      if(e.touches&&e.touches.length===2){
        e.preventDefault();
        pinchRef.current={active:true,dist:getTouchDist(e.touches),startScale:scaleRef.current};
      }
      return;
    }
    if(drawMode==="text")return;
    // 描画モードでは2本指も描画扱い（ピンチしない）
    if(e.touches&&e.touches.length===2){
      e.preventDefault();
      return; // 描画モードでは2本指無視
    }
    e.preventDefault(); // 描画モードはスクロール完全抑制
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    touchStartRef.current={x:cx,y:cy,el:e.currentTarget};
    hasMoved.current=false;
    isDrawingRef.current=true;
    // Down時点で即配置
    const{row,col}=getCellFromEvent(e,e.currentTarget);
    if(row>=0&&row<GRID_ROWS&&col>=0&&col<GRID_COLS) paint(row,col);
  },[drawMode]);

  const onMove=useCallback(e=>{
    if(e.touches&&e.touches.length===2&&pinchRef.current.active&&interactModeRef.current==="scroll"){
      e.preventDefault();
      const ratio=getTouchDist(e.touches)/pinchRef.current.dist;
      setScaleSync(Math.round(Math.min(MAX_SCALE,Math.max(MIN_SCALE,pinchRef.current.startScale*ratio))*20)/20);
      return;
    }
    if(!isDrawingRef.current)return;
    e.preventDefault(); // 描画モード中はスクロール抑制
    const{row,col}=getCellFromEvent(e,touchStartRef.current?.el||e.currentTarget);
    paint(row,col);
  },[]);

  const onUp=useCallback(e=>{
    pinchRef.current.active=false;
    // Up時の追加処理（念のため最終セルを配置）
    if(isDrawingRef.current&&touchStartRef.current){
      const cx=e.changedTouches?e.changedTouches[0].clientX:e.clientX;
      const cy=e.changedTouches?e.changedTouches[0].clientY:e.clientY;
      const dx=Math.abs(cx-touchStartRef.current.x);
      const dy=Math.abs(cy-touchStartRef.current.y);
      if(Math.sqrt(dx*dx+dy*dy)<=MOVE_THRESHOLD){
        const{row,col}=getCellFromEvent(e.changedTouches?{touches:e.changedTouches}:e, touchStartRef.current.el);
        paint(row,col);
      }
    }
    isDrawingRef.current=false;
    touchStartRef.current=null;
    hasMoved.current=false;
  },[]);

  // グリッドタップでテキスト追加
  const onGridClick=useCallback(e=>{
    if(drawMode!=="text")return;
    const{row,col}=getCellFromEvent(e,e.currentTarget);
    const id=Date.now();
    setTextBoxes(prev=>[...prev,{id,row,col,text:"テキスト"}]);
    setEditingText({id,value:"テキスト"});
    setAddingText(false);
  },[drawMode]);

  const clearGrid=()=>{
    if(layerRef.current==="building")bGridRef.current=mkGrid();
    else sGridRef.current=mkGrid();
    redraw();
  };

  // 積算
  const sGrid=sGridRef.current;
  const sCounts={};Object.keys(SCAFFOLD_PARTS).forEach(k=>{sCounts[k]=0;});
  sGrid.forEach(row=>row.forEach(c=>{if(c)sCounts[c]++;}));
  const adjCounts={};Object.keys(SCAFFOLD_PARTS).forEach(k=>{adjCounts[k]=k==="jack"?sCounts[k]:sCounts[k]*floors;});
  const totalCost=Object.entries(adjCounts).reduce((s,[k,n])=>s+n*(prices[k]||0),0);
  const hasScaffold=Object.values(sCounts).some(v=>v>0);
  const totalChecks=CHECK_DEFS.survey.items.length+CHECK_DEFS.setup.items.length+CHECK_DEFS.payment.items.length;
  const doneChecks=surveyChecks.length+setupChecks.length+payChecks.length;

  const currentPartKey=layerRef.current==="building"?bPartUI:sPartUI;
  const currentParts=layerRef.current==="building"?BUILDING_PARTS:SCAFFOLD_PARTS;

  // 寸法ラベル（建物グリッドのみ表示）
  const dims = calcDimensions(bGridRef.current);

  // PDF出力（図面のみA4）
  const printPDF=()=>{
    const cellPx=4;
    const W=GRID_COLS*cellPx, H=GRID_ROWS*cellPx;
    let bCells="",sCells="";
    bGridRef.current.forEach((row,ri)=>row.forEach((cell,ci)=>{
      if(!cell)return;
      const p=BUILDING_PARTS[cell];if(!p)return;
      const x=ci*cellPx,y=ri*cellPx;
      bCells+=`<rect x="${x}" y="${y}" width="${cellPx}" height="${cellPx}" fill="${p.color}" opacity="0.9"/>`;
    }));
    sGridRef.current.forEach((row,ri)=>row.forEach((cell,ci)=>{
      if(!cell)return;
      const p=SCAFFOLD_PARTS[cell];if(!p)return;
      const x=ci*cellPx,y=ri*cellPx;
      sCells+=`<rect x="${x}" y="${y}" width="${cellPx}" height="${cellPx}" fill="${p.color}" opacity="0.7"/>`;
    }));
    // テキストボックス
    let textSVG="";
    textBoxes.forEach(tb=>{
      const x=tb.col*cellPx, y=tb.row*cellPx;
      textSVG+=`<text x="${x}" y="${y+cellPx}" font-size="6" fill="#333" font-family="sans-serif">${tb.text}</text>`;
    });
    // 5マスごとグリッド線
    let lines="";
    for(let c=0;c<=GRID_COLS;c+=5){lines+=`<line x1="${c*cellPx}" y1="0" x2="${c*cellPx}" y2="${H}" stroke="#ccc" stroke-width="0.3"/>`;}
    for(let r=0;r<=GRID_ROWS;r+=5){lines+=`<line x1="0" y1="${r*cellPx}" x2="${W}" y2="${r*cellPx}" stroke="#ccc" stroke-width="0.3"/>`;}
    // ルーラー（mm）
    let rulerH="",rulerV="";
    for(let c=0;c<=GRID_COLS;c+=10){
      const mm=(c*MM_PER_CELL/1000).toFixed(1);
      rulerH+=`<text x="${c*cellPx}" y="8" font-size="5" fill="#666" font-family="sans-serif">${mm}m</text>`;
    }
    for(let r=0;r<=GRID_ROWS;r+=10){
      const mm=(r*MM_PER_CELL/1000).toFixed(1);
      rulerV+=`<text x="0" y="${r*cellPx+5}" font-size="5" fill="#666" font-family="sans-serif">${mm}</text>`;
    }
    const html=`<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"/>
<title>平面図 - ${info.siteName||"現場名未入力"}</title>
<style>
  @page{size:A4 portrait;margin:8mm;}
  body{margin:0;font-family:'Hiragino Kaku Gothic Pro',sans-serif;}
  h2{font-size:14px;margin:0 0 4px;text-align:center;}
  .meta{font-size:9px;color:#666;text-align:center;margin-bottom:6px;}
  svg{display:block;width:100%;height:auto;}
  .legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;font-size:8px;}
  .li{display:flex;align-items:center;gap:3px;}
  .lb{width:10px;height:10px;border-radius:2px;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<h2>平面図　${info.siteName||""}</h2>
<div class="meta">${info.date||""}　${info.siteAddress||""}　出力：${new Date().toLocaleString('ja-JP')}</div>
<svg viewBox="0 0 ${W+20} ${H+20}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(20,12)">${lines}${bCells}${sCells}${textSVG}</g>
  <g transform="translate(20,0)">${rulerH}</g>
  <g transform="translate(0,12)">${rulerV}</g>
  <rect x="20" y="12" width="${W}" height="${H}" fill="none" stroke="#333" stroke-width="0.8"/>
</svg>
<div class="legend">
  ${Object.entries(BUILDING_PARTS).filter(([k])=>bGridRef.current.some(r=>r.includes(k))).map(([k,p])=>`<div class="li"><div class="lb" style="background:${p.color}"></div><span>${p.label}</span></div>`).join("")}
  ${Object.entries(SCAFFOLD_PARTS).filter(([k])=>sGridRef.current.some(r=>r.includes(k))).map(([k,p])=>`<div class="li"><div class="lb" style="background:${p.color}"></div><span>${p.label}</span></div>`).join("")}
  <div style="margin-left:auto;font-size:9px;">1マス＝100mm　|　全体：${GRID_COLS*MM_PER_CELL/1000}m×${GRID_ROWS*MM_PER_CELL/1000}m</div>
</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();
  };

  const TABS=[
    {key:"draw",     label:"📐 図面"},
    {key:"info",     label:"📋 現場"},
    {key:"check",    label:"✅ 確認"},
    {key:"estimate", label:"💰 積算"},
    {key:"pdf",      label:"🖨️ PDF"},
  ];

  return (
    <div style={{height:"100dvh",background:"#0f1923",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic Pro',sans-serif",color:"#e8edf2",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Header */}
      <header style={{background:"linear-gradient(135deg,#1a2d42,#0f1923)",borderBottom:"2px solid #2a4a6b",padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,background:"linear-gradient(135deg,#2a7fd4,#1a5fa8)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900}}>⊞</div>
          <div>
            <div style={{fontSize:13,fontWeight:700}}>足場プランナー</div>
            <div style={{fontSize:8,color:"#7a9db8",letterSpacing:2}}>ASHIBA PLANNER</div>
          </div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          {/* 全体サイズ表示 */}
          {usedBounds&&(
            <div style={{fontSize:9,color:"#4aa8e8",background:"#0f1923",border:"1px solid #2a4a6b",borderRadius:6,padding:"2px 8px",textAlign:"center"}}>
              <div>{(usedBounds.w/1000).toFixed(1)}m</div>
              <div style={{color:"#7a9db8"}}>×{(usedBounds.h/1000).toFixed(1)}m</div>
            </div>
          )}
          {["組立","解体"].map(t=>(
            <button key={t} onClick={()=>setWorkType(t)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,cursor:"pointer",fontWeight:workType===t?700:400,background:workType===t?(t==="組立"?"#1a5fa8":"#7a1a1a"):"#0f1923",border:workType===t?`1px solid ${t==="組立"?"#2a7fd4":"#e74c3c"}`:"1px solid #2a4a6b",color:workType===t?"#fff":"#7a9db8"}}>{t}</button>
          ))}
        </div>
      </header>

      {/* Tabs */}
      <div style={{display:"flex",background:"#151f2b",borderBottom:"1px solid #1e3048",flexShrink:0}}>
        {TABS.map(({key,label})=>(
          <button key={key} onClick={()=>setActiveTab(key)} style={{flex:1,padding:"10px 0",background:activeTab===key?"#1a2d42":"transparent",border:"none",borderBottom:activeTab===key?"3px solid #2a7fd4":"3px solid transparent",color:activeTab===key?"#2a7fd4":"#7a9db8",fontSize:10,fontWeight:activeTab===key?700:400,cursor:"pointer"}}>
            {label}
          </button>
        ))}
      </div>

      {/* ===== 図面タブ ===== */}
      {activeTab==="draw"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* レイヤー切替 */}
          <div style={{background:"#151f2b",borderBottom:"1px solid #1e3048",padding:"6px 10px",flexShrink:0}}>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              {["building","scaffold"].map(l=>(
                <button key={l} onClick={()=>{layerRef.current=l;if(l==="building")setBPartUI(bPartRef.current);else setSPartUI(sPartRef.current);redraw();}} style={{flex:1,padding:"5px",borderRadius:8,fontSize:11,cursor:"pointer",background:layerRef.current===l?(l==="building"?"#1a3a5a":"#1a3a2a"):"#0f1923",border:`1px solid ${layerRef.current===l?(l==="building"?"#2a7fd4":"#2d9a6f"):"#2a4a6b"}`,color:layerRef.current===l?"#e8edf2":"#7a9db8",fontWeight:layerRef.current===l?700:400}}>
                  {l==="building"?"🏠 建物":"⊞ 足場"}
                </button>
              ))}
            </div>

            {/* 部材パレット */}
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <div style={{display:"flex",gap:5,minWidth:"max-content",paddingBottom:2}}>
                {Object.entries(currentParts).map(([key,part])=>(
                  <button key={key} onClick={()=>{selectPart(key);setDrawMode("draw");}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"5px 7px",background:currentPartKey===key&&!eraseOn&&drawMode==="draw"?`${part.color}33`:"rgba(255,255,255,0.04)",border:currentPartKey===key&&!eraseOn&&drawMode==="draw"?`2px solid ${part.color}`:"2px solid transparent",borderRadius:8,cursor:"pointer",minWidth:44}}>
                    <div style={{width:24,height:24,background:part.color,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,color:"#fff"}}>{part.symbol}</div>
                    <div style={{fontSize:8,color:"#aac",whiteSpace:"nowrap"}}>{part.label.slice(0,4)}</div>
                  </button>
                ))}

                {/* テキスト */}
                <button onClick={()=>{setDrawMode(drawMode==="text"?"draw":"text");setEraseOn(false);eraseModeRef.current=false;}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"5px 7px",background:drawMode==="text"?"#2a7fd422":"rgba(255,255,255,0.04)",border:drawMode==="text"?"2px solid #2a7fd4":"2px solid transparent",borderRadius:8,cursor:"pointer",minWidth:44}}>
                  <div style={{width:24,height:24,background:"#2a5a7a",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>T</div>
                  <div style={{fontSize:8,color:"#aac"}}>テキスト</div>
                </button>
              </div>
            </div>
          </div>

          {/* ズームバー */}
          <div style={{background:"#0f1923",padding:"4px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,borderBottom:"1px solid #1e3048"}}>
            <div style={{fontSize:9,color:"#5a7a96"}}>1マス＝100mm　{Math.round(scale*100)}%</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setScaleSync(Math.max(MIN_SCALE,Math.round((scaleRef.current-0.5)*20)/20))} style={{width:26,height:26,borderRadius:6,background:"#1a2d42",border:"1px solid #2a4a6b",color:"#e8edf2",fontSize:14,cursor:"pointer"}}>−</button>
              <button onClick={()=>setScaleSync(Math.min(MAX_SCALE,Math.round((scaleRef.current+0.5)*20)/20))} style={{width:26,height:26,borderRadius:6,background:"#1a2d42",border:"1px solid #2a4a6b",color:"#e8edf2",fontSize:14,cursor:"pointer"}}>＋</button>
              <button onClick={clearGrid} style={{height:26,padding:"0 8px",borderRadius:6,background:"rgba(192,57,43,0.15)",border:"1px solid #c0392b",color:"#e74c3c",fontSize:10,cursor:"pointer"}}>クリア</button>
            </div>
          </div>

          {/* グリッド本体 */}
          <div ref={gridContainerRef} style={{flex:1,overflow:"auto",position:"relative",WebkitOverflowScrolling:"touch"}}>
            <div style={{position:"relative",width:GRID_COLS*cellSize,height:GRID_ROWS*cellSize}}>

              {/* キャンバスイベント層 */}
              <div
                onMouseDown={drawMode==="text"?onGridClick:onDown}
                onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                onTouchStart={drawMode==="text"?onGridClick:onDown}
                onTouchMove={onMove} onTouchEnd={onUp}
                style={{position:"absolute",inset:0,zIndex:9,cursor:interactMode==="scroll"?"grab":drawMode==="text"?"text":eraseOn?"cell":"crosshair",userSelect:"none",touchAction:interactMode==="scroll"?"pan-x pan-y":"none"}}
              />

              {/* セル描画（SVGで軽量化） */}
              <svg width={GRID_COLS*cellSize} height={GRID_ROWS*cellSize} style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:11}}>
                {/* 背景グリッド線 */}
                {Array.from({length:GRID_COLS+1},(_,ci)=>(
                  <line key={`vc${ci}`} x1={ci*cellSize} y1={0} x2={ci*cellSize} y2={GRID_ROWS*cellSize}
                    stroke={ci%10===0?"#2a5a8b":ci%5===0?"#1e3a5a":"#141e2a"} strokeWidth={ci%10===0?0.8:0.4}/>
                ))}
                {Array.from({length:GRID_ROWS+1},(_,ri)=>(
                  <line key={`hr${ri}`} x1={0} y1={ri*cellSize} x2={GRID_COLS*cellSize} y2={ri*cellSize}
                    stroke={ri%10===0?"#2a5a8b":ri%5===0?"#1e3a5a":"#141e2a"} strokeWidth={ri%10===0?0.8:0.4}/>
                ))}
                {/* 建物セル */}
                {bGridRef.current.map((row,ri)=>row.map((cell,ci)=>{
                  if(!cell)return null;
                  const p=BUILDING_PARTS[cell];if(!p)return null;
                  return <rect key={`b${ri}_${ci}`} x={ci*cellSize} y={ri*cellSize} width={cellSize} height={cellSize} fill={p.color} opacity={0.85}/>;
                }))}
                {/* 足場セル */}
                {sGridRef.current.map((row,ri)=>row.map((cell,ci)=>{
                  if(!cell)return null;
                  const p=SCAFFOLD_PARTS[cell];if(!p)return null;
                  return <rect key={`s${ri}_${ci}`} x={ci*cellSize} y={ri*cellSize} width={cellSize} height={cellSize} fill={p.color} opacity={0.7}/>;
                }))}
                {/* 寸法ラベル */}
                {cellSize>=6&&dims.map(d=>{
                  const displayMm=dimOverrides[d.key]??d.labelMm;
                  const x=d.col*cellSize+cellSize/2;
                  const y=d.row*cellSize+cellSize/2;
                  return(
                    <g key={d.key} style={{cursor:eraseOn?"default":"pointer",pointerEvents:"all"}} onClick={e=>{e.stopPropagation();if(!eraseOn)setEditingDim({key:d.key,value:String(displayMm)});}}>
                      <rect x={x-28} y={y-9} width={56} height={16} rx={3} fill="rgba(0,0,0,0.75)"/>
                      <text x={x} y={y+4} textAnchor="middle" fontSize={Math.max(6,Math.min(9,cellSize*0.7))} fill="#ffe066" fontWeight="bold">
                        {displayMm.toLocaleString()+"mm"}
                      </text>
                    </g>
                  );
                })}
                {/* テキストボックス */}
                {textBoxes.map(tb=>(
                  <g key={tb.id} style={{cursor:eraseOn?"default":"pointer",pointerEvents:"all"}} onClick={e=>{e.stopPropagation();if(!eraseOn)setEditingText({id:tb.id,value:tb.text});}}>
                    <rect x={tb.col*cellSize-2} y={tb.row*cellSize-2} width={tb.text.length*cellSize*0.6+8} height={cellSize+4} rx={3} fill="rgba(255,255,200,0.15)" stroke="#ffe066" strokeWidth={0.8}/>
                    <text x={tb.col*cellSize+2} y={tb.row*cellSize+cellSize*0.7} fontSize={Math.max(8,cellSize*0.7)} fill="#ffe066" fontWeight="bold">{tb.text}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* 右下フローティング：消しゴム＋描画/移動 */}
          <div style={{position:"absolute",bottom:16,right:16,zIndex:50,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,pointerEvents:"none"}}>
            {/* 消しゴムボタン */}
            <button
              onClick={()=>{const n=!eraseOn;setEraseOn(n);eraseModeRef.current=n;setDrawMode("draw");if(n)setInteractModeSync("draw");}}
              style={{pointerEvents:"all",width:48,height:48,borderRadius:24,background:eraseOn?"#c0392b":"#1a2d42",border:eraseOn?"2px solid #e74c3c":"2px solid #2a4a6b",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 3px 12px rgba(0,0,0,0.5)",gap:1}}>
              <span style={{fontSize:18,lineHeight:1}}>✕</span>
              <span style={{fontSize:7,color:eraseOn?"#fff":"#7a9db8"}}>消去</span>
            </button>
            {/* 描画/移動ボタン */}
            <div style={{pointerEvents:"all",display:"flex",background:"#1a2d42",borderRadius:24,border:"1px solid #2a4a6b",overflow:"hidden",boxShadow:"0 3px 12px rgba(0,0,0,0.5)"}}>
              {[["draw","✏️","描画","#2a7fd4"],["scroll","👆","移動","#2d9a6f"]].map(([m,icon,label,col])=>(
                <button key={m} onClick={()=>{setInteractModeSync(m);if(m==="scroll"){setEraseOn(false);eraseModeRef.current=false;}}} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:52,height:52,border:"none",fontSize:11,background:interactMode===m?col+"44":"transparent",color:interactMode===m?col:"#7a9db8",cursor:"pointer",gap:1}}>
                  <span style={{fontSize:20,lineHeight:1}}>{icon}</span>
                  <span style={{fontSize:9,fontWeight:interactMode===m?700:400}}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 寸法編集ダイアログ */}
          {editingDim&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setEditingDim(null)}>
              <div style={{background:"#1a2d42",borderRadius:12,padding:20,width:260,border:"1px solid #2a7fd4"}} onClick={e=>e.stopPropagation()}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#4aa8e8"}}>寸法を編集（mm）</div>
                <input type="number" value={editingDim.value} step={100} onChange={e=>setEditingDim(d=>({...d,value:e.target.value}))}
                  style={{...inp,fontSize:18,textAlign:"center",marginBottom:12}} autoFocus/>
                <div style={{fontSize:10,color:"#5a7a96",marginBottom:12}}>100mm単位で入力（例：1800）</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setDimOverrides(o=>({...o,[editingDim.key]:parseInt(editingDim.value)||0}));setEditingDim(null);}} style={{flex:1,padding:"8px",background:"#2a7fd4",border:"none",borderRadius:8,color:"#fff",fontWeight:700,cursor:"pointer"}}>確定</button>
                  <button onClick={()=>{setDimOverrides(o=>{const n={...o};delete n[editingDim.key];return n;});setEditingDim(null);}} style={{flex:1,padding:"8px",background:"#0f1923",border:"1px solid #2a4a6b",borderRadius:8,color:"#7a9db8",cursor:"pointer"}}>自動に戻す</button>
                </div>
              </div>
            </div>
          )}

          {/* テキスト編集ダイアログ */}
          {editingText&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setEditingText(null)}>
              <div style={{background:"#1a2d42",borderRadius:12,padding:20,width:280,border:"1px solid #2a7fd4"}} onClick={e=>e.stopPropagation()}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#4aa8e8"}}>テキストを編集</div>
                <input type="text" value={editingText.value} onChange={e=>setEditingText(d=>({...d,value:e.target.value}))}
                  style={{...inp,fontSize:16,marginBottom:12}} autoFocus/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setTextBoxes(p=>p.map(t=>t.id===editingText.id?{...t,text:editingText.value}:t));setEditingText(null);}} style={{flex:1,padding:"8px",background:"#2a7fd4",border:"none",borderRadius:8,color:"#fff",fontWeight:700,cursor:"pointer"}}>確定</button>
                  <button onClick={()=>{setTextBoxes(p=>p.filter(t=>t.id!==editingText.id));setEditingText(null);}} style={{flex:1,padding:"8px",background:"rgba(192,57,43,0.2)",border:"1px solid #c0392b",borderRadius:8,color:"#e74c3c",cursor:"pointer"}}>削除</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 現場情報 ===== */}
      {activeTab==="info"&&(
        <div style={{flex:1,padding:"12px 12px 40px",overflowY:"auto"}}>
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:12}}>📋 基本情報</div>
            <div style={r2}><Fld label="施工日" val={info.date} onChange={upd("date")} type="date"/><Fld label="車両指定" val={info.vehicle} onChange={upd("vehicle")} ph="例：2t車"/></div>
            <div style={r2}><Fld label="作業開始" val={info.timeStart} onChange={upd("timeStart")} type="time"/><Fld label="作業終了（予定）" val={info.timeEnd} onChange={upd("timeEnd")} type="time"/></div>
            <Fld label="元請名" val={info.client} onChange={upd("client")} ph="株式会社〇〇"/>
            <Fld label="現場名" val={info.siteName} onChange={upd("siteName")} ph="〇〇邸 外壁塗装工事"/>
            <Fld label="現場住所" val={info.siteAddress} onChange={upd("siteAddress")} ph="大阪府〇〇市…"/>
            <Fld label="担当者" val={info.manager} onChange={upd("manager")} ph="担当者名"/>
          </div>
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:12}}>🔨 工事内容</div>
            <Tags label="工事種別" opts={["新築","塗装","タキロン張替え","ステージ組","落下防止装置","改修","内部階段","屋根足場","仮囲い","解体生"]} vals={kojiContents} onChange={setKoji}/>
          </div>
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:12}}>⊞ 足場仕様</div>
            <Tags label="仕様種別" opts={["本足場","1足張出","単管","ブラケット足場","門型枠","手摺","アンチ"]} vals={scaffoldSpec} onChange={setSpec}/>
            <div style={r2}><Radio label="荷取りステージ" opts={["有","無"]} val={荷取り} onChange={set荷取り}/><Radio label="昇降階段" opts={["有","無"]} val={昇降} onChange={set昇降}/></div>
          </div>
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:12}}>🦺 安全対策</div>
            <Tags label="壁つなぎ・構造" opts={["壁つなぎ","RC構造","鉄骨造","木造","火打ち","やらず","番線","抱き込み","アウトリガー","親綱","壁あて","朝顔"]} vals={安全対策} onChange={set安全}/>
            <Tags label="シート" opts={["有","無","黒","灰色","カヤ","防炎","防火","ラッセルネット","膜屋","巾木","腰袋"]} vals={シート} onChange={setSheet}/>
          </div>
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:12}}>📝 備考</div>
            <textarea value={備考} onChange={e=>setNote(e.target.value)} placeholder="特記事項・注意点など" rows={4} style={{...inp,resize:"vertical",lineHeight:1.6,fontFamily:"inherit"}}/>
          </div>
        </div>
      )}

      {/* ===== 確認事項 ===== */}
      {activeTab==="check"&&(
        <div style={{flex:1,padding:"12px 12px 40px",overflowY:"auto"}}>
          <div style={{...card,background:"#111f2e"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:12,color:"#7a9db8"}}>全体の確認進捗</div>
              <div style={{fontSize:13,fontWeight:700,color:doneChecks===totalChecks?"#2d9a6f":"#4aa8e8"}}>{doneChecks}/{totalChecks}</div>
            </div>
            <div style={{height:6,background:"#1e3048",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,transition:"width 0.3s",width:`${totalChecks?(doneChecks/totalChecks)*100:0}%`,background:doneChecks===totalChecks?"linear-gradient(90deg,#2d9a6f,#4ecca3)":"linear-gradient(90deg,#2a7fd4,#4aa8e8)"}}/>
            </div>
          </div>
          <CheckSection def={CHECK_DEFS.survey} checks={surveyChecks} onToggle={toggle(setSurvey)}/>
          <div style={{...card,borderColor:"#e07b3966"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#e07b39",marginBottom:10}}>破損・注意個所詳細</div>
            <textarea value={damageMemo} onChange={e=>setDmg(e.target.value)} placeholder="破損・注意個所の詳細を記入" rows={3} style={{...inp,resize:"vertical",lineHeight:1.6,fontFamily:"inherit"}}/>
          </div>
          <CheckSection def={CHECK_DEFS.setup} checks={setupChecks} onToggle={toggle(setSetup)}/>
          <CheckSection def={CHECK_DEFS.payment} checks={payChecks} onToggle={toggle(setPay)}/>
          {doneChecks===totalChecks&&(
            <div style={{background:"linear-gradient(135deg,#1a3a28,#0f2018)",borderRadius:12,padding:16,border:"2px solid #2d9a6f",textAlign:"center",marginBottom:12}}>
              <div style={{fontSize:22,marginBottom:4}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:"#4ecca3"}}>全項目確認完了</div>
            </div>
          )}
        </div>
      )}

      {/* ===== 積算 ===== */}
      {activeTab==="estimate"&&(
        <div style={{flex:1,padding:12,display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:8}}>⚙️ 設定</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:13}}>階数</span>
              <button onClick={()=>setFloors(f=>Math.max(1,f-1))} style={{width:30,height:30,borderRadius:7,background:"#0f1923",border:"1px solid #2a4a6b",color:"#e8edf2",fontSize:16,cursor:"pointer"}}>−</button>
              <span style={{fontSize:18,fontWeight:700,minWidth:24,textAlign:"center"}}>{floors}</span>
              <button onClick={()=>setFloors(f=>Math.min(20,f+1))} style={{width:30,height:30,borderRadius:7,background:"#0f1923",border:"1px solid #2a4a6b",color:"#e8edf2",fontSize:16,cursor:"pointer"}}>＋</button>
              <span style={{fontSize:11,color:"#7a9db8"}}>階建て</span>
            </div>
          </div>
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:10}}>📦 部材明細・単価設定</div>
            {!hasScaffold&&<div style={{fontSize:13,color:"#5a7a96",textAlign:"center",padding:"12px 0"}}>足場レイヤーで部材を配置してください</div>}
            {Object.entries(SCAFFOLD_PARTS).map(([key,part])=>{
              const cnt=adjCounts[key];const unitPrice=prices[key]||0;
              return(
                <div key={key} style={{padding:"10px 0",borderBottom:"1px solid #1e3048"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:22,height:22,background:part.color,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff"}}>{part.symbol}</div>
                      <div><div style={{fontSize:12,fontWeight:600}}>{part.label}</div><div style={{fontSize:10,color:"#5a7a96"}}>{cnt>0?`${cnt}${part.unit}`:"未配置"}</div></div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:cnt>0?"#4aa8e8":"#3a5a6a"}}>{cnt>0?`¥${(cnt*unitPrice).toLocaleString()}`:"—"}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,background:"#0f1923",borderRadius:7,padding:"5px 10px",border:"1px solid #2a4a6b"}}>
                    <span style={{fontSize:10,color:"#7a9db8",whiteSpace:"nowrap"}}>単価 ¥</span>
                    <input type="number" value={unitPrice} onChange={e=>updatePrice(key,e.target.value)} style={{flex:1,background:"transparent",border:"none",color:"#e8edf2",fontSize:13,fontWeight:600,outline:"none",textAlign:"right"}}/>
                    <span style={{fontSize:10,color:"#7a9db8"}}>/{part.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {hasScaffold&&(
            <div style={{background:"linear-gradient(135deg,#1a4a7a,#0f2a4a)",borderRadius:12,padding:"14px 16px",border:"2px solid #2a7fd4",boxShadow:"0 4px 20px rgba(42,127,212,0.2)"}}>
              <div style={{fontSize:10,color:"#7ab8e8",marginBottom:3,letterSpacing:2}}>概算合計金額</div>
              <div style={{fontSize:24,fontWeight:900,color:"#fff"}}>¥{totalCost.toLocaleString()}</div>
              <div style={{fontSize:9,color:"#7ab8e8",marginTop:3}}>※材料費概算（労務費・諸経費別途）</div>
            </div>
          )}
        </div>
      )}

      {/* ===== PDF出力 ===== */}
      {activeTab==="pdf"&&(
        <div style={{flex:1,padding:16,display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:12}}>🖨️ 出力内容確認</div>
            {[
              ["📋 現場情報",info.siteName||"未入力",!!info.siteName],
              ["📐 建物図面",bGridRef.current.some(r=>r.some(c=>c))?"配置済み":"未配置",bGridRef.current.some(r=>r.some(c=>c))],
              ["⊞ 足場図面",hasScaffold?"配置済み":"未配置",hasScaffold],
              ["💰 積算",hasScaffold?`¥${totalCost.toLocaleString()}`:"—",hasScaffold],
              ["✅ 確認事項",`${doneChecks}/${totalChecks}項目`,doneChecks>0],
            ].map(([label,val,ok])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1e3048"}}>
                <span style={{fontSize:12}}>{label}</span>
                <span style={{fontSize:11,color:ok?"#2d9a6f":"#5a7a96",fontWeight:ok?700:400}}>{ok?"✓ ":""}{val}</span>
              </div>
            ))}
          </div>
          <div style={{background:"#151f2b",borderRadius:10,padding:"10px 12px",border:"1px solid #1e3048",fontSize:10,color:"#5a7a96",lineHeight:1.8}}>
            📄 図面のみA4縦サイズで出力します。<br/>
            ブラウザの印刷設定で「用紙A4・縦向き」を選択。<br/>
            スマホは「PDFに保存」でPDFファイルとして保存できます。
          </div>
          <button onClick={printPDF} style={{padding:16,borderRadius:12,background:"linear-gradient(135deg,#1a5fa8,#2a7fd4)",border:"none",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",letterSpacing:2,boxShadow:"0 4px 16px rgba(42,127,212,0.4)"}}>
            🖨️　平面図を印刷 / PDF保存
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{background:"#0f1923",borderTop:"1px solid #1e3048",padding:"6px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,color:"#5a7a96",flexShrink:0}}>
        <span style={{maxWidth:"55%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{info.siteName||"現場名未入力"}</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {doneChecks>0&&<span style={{color:"#2d9a6f"}}>✅{doneChecks}/{totalChecks}</span>}
          <span style={{color:hasScaffold?"#4aa8e8":"#5a7a96",fontWeight:hasScaffold?700:400}}>{hasScaffold?`¥${totalCost.toLocaleString()}`:"未配置"}</span>
        </div>
      </div>
    </div>
  );
}
