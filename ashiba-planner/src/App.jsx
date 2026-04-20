import { useState, useRef, useCallback, useReducer } from "react";

const BASE_CELL = 36;
const GRID_COLS = 20;
const GRID_ROWS = 15;
const MM_PER_CELL = 1800;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

const BUILDING_PARTS = {
  wall:     { label: "外壁",       color: "#4a5568", symbol: "壁", border: "#718096" },
  window:   { label: "窓",         color: "#2b6cb0", symbol: "窓", border: "#4299e1" },
  entrance: { label: "出入口",     color: "#744210", symbol: "入", border: "#d69e2e" },
  balcony:  { label: "バルコニー", color: "#276749", symbol: "BC", border: "#48bb78" },
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
  survey: {
    title: "現調時確認事項", color: "#2a7fd4",
    items: ["カーポート・駐輪場屋根","割れ・ヒビ・傷等","電気器具等破損","玄関廻り破損個所","壁・サッシ廻り破損","軒点破損等","縦・横樋破損","庭・敷地内","外回り破損"],
  },
  setup: {
    title: "架け時確認事項", color: "#2d9a6f",
    items: ["現調時確認事項の確認","到着時敷地内確認","左記破損個所の確認","隣・棟・屋根・瓦の破損","素材の欠損等確認","庭・花壇の状況","照明器具・電気設備の状況","主任者看板シートの設置","作業終了後 目視"],
  },
  payment: {
    title: "払い時確認事項", color: "#6b4c9a",
    items: ["現調時確認事項の確認","到着時敷地内確認","左記破損個所の確認","軒・棟・屋根・瓦確認","素材の欠損等確認","庭・花壇の状況","壁・天井等の汚れ破損","作業終了後 目視","作業終了時後の清掃"],
  },
};

const mkGrid = () => Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));

// ---- スタイル定数 ----
const card = { background: "#1a2d42", borderRadius: 12, padding: "14px 16px", border: "1px solid #2a4a6b", marginBottom: 12 };
const lbl  = { fontSize: 11, color: "#7a9db8", marginBottom: 4, display: "block" };
const inp  = { width: "100%", background: "#0f1923", border: "1px solid #2a4a6b", borderRadius: 8, color: "#e8edf2", padding: "9px 12px", fontSize: 14, boxSizing: "border-box", outline: "none" };
const r2   = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 };

function Tags({ label, opts, vals, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <span style={lbl}>{label}</span>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {opts.map(o => {
          const on = vals.includes(o);
          return (
            <button key={o} onClick={() => onChange(on ? vals.filter(v=>v!==o) : [...vals,o])} style={{
              padding:"5px 11px", borderRadius:20, fontSize:12, cursor:"pointer",
              background: on?"#2a7fd4":"#0f1923",
              border: on?"1px solid #2a7fd4":"1px solid #2a4a6b",
              color: on?"#fff":"#7a9db8",
            }}>{o}</button>
          );
        })}
      </div>
    </div>
  );
}

function Radio({ label, opts, val, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <span style={lbl}>{label}</span>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {opts.map(o => {
          const on = val===o;
          return (
            <button key={o} onClick={()=>onChange(o)} style={{
              padding:"5px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              background: on?"#1a5fa8":"#0f1923",
              border: on?"1px solid #2a7fd4":"1px solid #2a4a6b",
              color: on?"#e8edf2":"#7a9db8", fontWeight: on?700:400,
            }}>{o}</button>
          );
        })}
      </div>
    </div>
  );
}

function Fld({ label, val, onChange, ph, type="text" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      <input type={type} value={val} onChange={e=>onChange(e.target.value)} placeholder={ph} style={inp}/>
    </div>
  );
}

function CheckSection({ def, checks, onToggle, memo, onMemo }) {
  const done = def.items.filter(i=>checks.includes(i)).length;
  return (
    <div style={{...card, borderColor: def.color+"66"}}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:700, color:def.color }}>{def.title}</div>
        <div style={{ fontSize:11, padding:"2px 10px", borderRadius:20, background: done===def.items.length?def.color+"33":"#0f1923", border:`1px solid ${done===def.items.length?def.color:"#2a4a6b"}`, color: done===def.items.length?def.color:"#5a7a96" }}>
          {done}/{def.items.length}
        </div>
      </div>
      {memo !== undefined ? (
        <textarea value={memo} onChange={e=>onMemo(e.target.value)} placeholder="破損・注意個所の詳細を記入" rows={4}
          style={{...inp, resize:"vertical", lineHeight:1.6, fontFamily:"inherit"}}/>
      ) : (
        def.items.map((item,idx) => {
          const ck = checks.includes(item);
          return (
            <button key={item} onClick={()=>onToggle(item)} style={{
              display:"flex", alignItems:"center", gap:12, padding:"11px 12px",
              background: ck?def.color+"18":"transparent",
              border:"none", borderBottom: idx<def.items.length-1?"1px solid #1e3048":"none",
              cursor:"pointer", textAlign:"left", width:"100%",
            }}>
              <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, background:ck?def.color:"#0f1923", border:`2px solid ${ck?def.color:"#2a4a6b"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#fff" }}>
                {ck?"✓":""}
              </div>
              <span style={{ fontSize:13, color:ck?"#e8edf2":"#7a9db8" }}>{item}</span>
              {ck && <span style={{ marginLeft:"auto", fontSize:10, color:def.color }}>済</span>}
            </button>
          );
        })
      )}
    </div>
  );
}

// ---- グリッド描画コンポーネント（分離して余計な再レンダー排除）----
function GridCanvas({ bGrid, sGrid, cellSize, onPointerDown, onPointerMove, onPointerUp }) {
  return (
    <div
      onMouseDown={onPointerDown} onMouseMove={onPointerMove}
      onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
      onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
      style={{
        display:"grid",
        gridTemplateColumns:`repeat(${GRID_COLS},${cellSize}px)`,
        gridTemplateRows:`repeat(${GRID_ROWS},${cellSize}px)`,
        border:"2px solid #2a4a6b", borderRadius:6, overflow:"hidden",
        userSelect:"none", touchAction:"none",
        boxShadow:"0 4px 20px rgba(0,0,0,0.5)", cursor:"crosshair",
      }}
    >
      {Array.from({length:GRID_ROWS},(_,ri) =>
        Array.from({length:GRID_COLS},(_,ci) => {
          const bCell = bGrid[ri][ci];
          const sCell = sGrid[ri][ci];
          const bP = bCell ? BUILDING_PARTS[bCell] : null;
          const sP = sCell ? SCAFFOLD_PARTS[sCell] : null;
          let bg = (ri+ci)%2===0 ? "#141e2a":"#111827";
          if (bP) bg = bP.color;
          else if (sP) bg = sP.color;
          const fs = Math.max(7, Math.min(12, cellSize*0.28));
          return (
            <div key={`${ri}-${ci}`} style={{
              width:cellSize, height:cellSize, background:bg,
              borderRight: ci%5===0?"1px solid #2a5a8b":"1px solid #1a2a3a",
              borderBottom: ri%5===0?"1px solid #2a5a8b":"1px solid #1a2a3a",
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative", flexShrink:0,
            }}>
              {bP && <span style={{fontSize:fs,fontWeight:900,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.8)"}}>{bP.symbol}</span>}
              {!bP && sP && <span style={{fontSize:fs,fontWeight:900,color:"#fff"}}>{sP.symbol}</span>}
              {bP && sP && <span style={{position:"absolute",bottom:1,right:2,fontSize:Math.max(6,fs*0.7),color:"rgba(255,255,255,0.75)"}}>{sP.symbol}</span>}
            </div>
          );
        })
      )}
    </div>
  );
}

// ========== メインコンポーネント ==========
export default function App() {
  // 再描画トリガー専用
  const [tick, redraw] = useReducer(n => n+1, 0);

  // 全ての描画状態はRefで管理（stale closure完全回避）
  const bGridRef = useRef(mkGrid());
  const sGridRef = useRef(mkGrid());
  const layerRef = useRef("building");   // "building" | "scaffold"
  const bPartRef = useRef("wall");
  const sPartRef = useRef("frame");
  const scaleRef = useRef(1.0);
  const isDrawingRef = useRef(false);
  const eraseModeRef = useRef(false); // 消しゴムボタンON/OFF
  const pinchRef = useRef({active:false, dist:0, startScale:1});
  const [eraseOn, setEraseOn] = useState(false);

  // UI用state（描画には使わない）
  const [activeTab, setActiveTab] = useState("info");
  const [scale, setScale] = useState(1.0);
  const [bPartUI, setBPartUI] = useState("wall");
  const [sPartUI, setSPartUI] = useState("frame");

  // 現場情報state
  const [info, setInfo] = useState({date:"",timeStart:"",timeEnd:"",client:"",siteName:"",siteAddress:"",manager:"",vehicle:""});
  const upd = k => v => setInfo(p=>({...p,[k]:v}));
  const [workType, setWorkType] = useState("組立");
  const [kojiContents, setKoji] = useState([]);
  const [scaffoldSpec, setSpec] = useState([]);
  const [荷取り, set荷取り] = useState("無");
  const [昇降, set昇降] = useState("無");
  const [安全対策, set安全] = useState([]);
  const [シート, setSheet] = useState([]);
  const [備考, setNote] = useState("");
  const [floors, setFloors] = useState(3);

  // 単価state（初期値はSCAFFOLD_PARTSから）
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(Object.entries(SCAFFOLD_PARTS).map(([k,v]) => [k, v.price]))
  );
  const updatePrice = (key, val) => {
    const n = parseInt(val.replace(/[^0-9]/g,''), 10);
    setPrices(p => ({...p, [key]: isNaN(n) ? 0 : n}));
  };

  // 確認事項state
  const [surveyChecks, setSurvey] = useState([]);
  const [damageMemo, setDmg] = useState("");
  const [setupChecks, setSetup] = useState([]);
  const [payChecks, setPay] = useState([]);
  const toggle = setter => item => setter(p => p.includes(item)?p.filter(v=>v!==item):[...p,item]);

  const cellSize = scale * BASE_CELL;
  const isDrawTab = activeTab==="building" || activeTab==="scaffold";

  // タブ切り替え
  const switchTab = (key) => {
    if (key==="building") layerRef.current="building";
    if (key==="scaffold") layerRef.current="scaffold";
    setActiveTab(key);
  };

  // 部材選択
  const selectPart = (key) => {
    if (layerRef.current==="building") { bPartRef.current=key; setBPartUI(key); }
    else { sPartRef.current=key; setSPartUI(key); }
    // 部材選択したら消しゴムOFF
    eraseModeRef.current = false;
    setEraseOn(false);
  };

  // スケール変更
  const changeScale = (val) => { scaleRef.current=val; setScale(val); };

  // セル座標計算
  const getCell = (e, el) => {
    const rect = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      row: Math.floor((cy - rect.top)  / (scaleRef.current * BASE_CELL)),
      col: Math.floor((cx - rect.left) / (scaleRef.current * BASE_CELL)),
    };
  };

  const getTouchDist = t => {
    const dx = t[0].clientX-t[1].clientX, dy = t[0].clientY-t[1].clientY;
    return Math.sqrt(dx*dx+dy*dy);
  };

  // セルを塗る
  const paint = (row, col) => {
    if (row<0||row>=GRID_ROWS||col<0||col>=GRID_COLS) return;
    const isB = layerRef.current==="building";
    const part = isB ? bPartRef.current : sPartRef.current;
    const grid = isB ? bGridRef.current : sGridRef.current;
    grid[row][col] = eraseModeRef.current ? null : part;
    redraw();
  };

  const onDown = useCallback((e) => {
    if (e.touches && e.touches.length===2) {
      e.preventDefault();
      pinchRef.current = {active:true, dist:getTouchDist(e.touches), startScale:scaleRef.current};
      isDrawingRef.current = false;
      return;
    }
    e.preventDefault();
    const {row,col} = getCell(e, e.currentTarget);
    if (row<0||row>=GRID_ROWS||col<0||col>=GRID_COLS) return;
    isDrawingRef.current = true;
    paint(row, col);
  }, []);

  const onMove = useCallback((e) => {
    // ピンチ継続
    if (e.touches && e.touches.length===2 && pinchRef.current.active) {
      e.preventDefault();
      const ratio = getTouchDist(e.touches) / pinchRef.current.dist;
      const next = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchRef.current.startScale*ratio))*20)/20;
      changeScale(next);
      return;
    }
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const {row,col} = getCell(e, e.currentTarget);
    paint(row, col);
  }, []);

  const onUp = useCallback(() => {
    isDrawingRef.current = false;
    pinchRef.current.active = false;
  }, []);

  const clearGrid = () => {
    if (layerRef.current==="building") bGridRef.current = mkGrid();
    else sGridRef.current = mkGrid();
    redraw();
  };

  // 積算（表示用にgridをコピー読み）
  const sGrid = sGridRef.current;
  const sCounts = {};
  Object.keys(SCAFFOLD_PARTS).forEach(k=>{sCounts[k]=0;});
  sGrid.forEach(row=>row.forEach(c=>{if(c)sCounts[c]++;}));
  const adjCounts = {};
  Object.keys(SCAFFOLD_PARTS).forEach(k=>{adjCounts[k]=k==="jack"?sCounts[k]:sCounts[k]*floors;});
  const totalCost = Object.entries(adjCounts).reduce((s,[k,n])=>s+n*(prices[k]||0),0);
  const hasScaffold = Object.values(sCounts).some(v=>v>0);

  const totalChecks = CHECK_DEFS.survey.items.length+CHECK_DEFS.setup.items.length+CHECK_DEFS.payment.items.length;
  const doneChecks = surveyChecks.length+setupChecks.length+payChecks.length;

  const currentPartKey = activeTab==="building" ? bPartUI : sPartUI;
  const currentParts = activeTab==="building" ? BUILDING_PARTS : SCAFFOLD_PARTS;

  const TABS = [
    {key:"info",    label:"📋 現場情報"},
    {key:"check",   label:"✅ 確認事項"},
    {key:"building",label:"🏠 建物"},
    {key:"scaffold",label:"⊞ 足場"},
    {key:"estimate",label:"💰 積算"},
    {key:"pdf",     label:"🖨️ PDF出力"},
  ];

  // グリッドをSVG文字列に変換（PDF印刷用）
  const gridToSVG = (grid, parts, cellPx) => {
    const W = GRID_COLS * cellPx;
    const H = GRID_ROWS * cellPx;
    let cells = "";
    grid.forEach((row, ri) => row.forEach((cell, ci) => {
      if (!cell) return;
      const p = parts[cell];
      if (!p) return;
      const x = ci * cellPx, y = ri * cellPx;
      cells += `<rect x="${x}" y="${y}" width="${cellPx}" height="${cellPx}" fill="${p.color}" opacity="0.85"/>`;
      cells += `<text x="${x+cellPx/2}" y="${y+cellPx/2+4}" text-anchor="middle" font-size="${cellPx*0.4}" font-weight="bold" fill="white">${p.symbol}</text>`;
    }));
    // グリッド線
    let lines = "";
    for (let c=0;c<=GRID_COLS;c++) {
      const x = c*cellPx;
      const sw = c%5===0?"0.6":"0.3";
      lines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#888" stroke-width="${sw}"/>`;
    }
    for (let r=0;r<=GRID_ROWS;r++) {
      const y = r*cellPx;
      const sw = r%5===0?"0.6":"0.3";
      lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#888" stroke-width="${sw}"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="border:1px solid #333">${lines}${cells}</svg>`;
  };

  // PDF印刷用HTML生成＆新規ウィンドウで印刷
  const printPDF = () => {
    const cellPx = 18; // 印刷用セルサイズ
    const bSVG = gridToSVG(bGridRef.current, BUILDING_PARTS, cellPx);
    const sSVG = gridToSVG(sGridRef.current, SCAFFOLD_PARTS, cellPx);
    const scaleM = (GRID_COLS * MM_PER_CELL / 1000).toFixed(1);
    const scaleN = (GRID_ROWS * MM_PER_CELL / 1000).toFixed(1);

    const partRows = Object.entries(SCAFFOLD_PARTS).map(([key,part]) => {
      const cnt = adjCounts[key];
      const unitPrice = prices[key]||0;
      return `<tr>
        <td style="padding:3px 6px;border:1px solid #ccc;">${part.label}</td>
        <td style="padding:3px 6px;border:1px solid #ccc;text-align:center;">${cnt}</td>
        <td style="padding:3px 6px;border:1px solid #ccc;text-align:center;">${part.unit}</td>
        <td style="padding:3px 6px;border:1px solid #ccc;text-align:right;">¥${unitPrice.toLocaleString()}</td>
        <td style="padding:3px 6px;border:1px solid #ccc;text-align:right;font-weight:bold;">¥${(cnt*unitPrice).toLocaleString()}</td>
      </tr>`;
    }).join("");

    const surveyRows = CHECK_DEFS.survey.items.map(item =>
      `<tr><td style="padding:2px 6px;border:1px solid #ccc;">${item}</td><td style="padding:2px 6px;border:1px solid #ccc;text-align:center;">${surveyChecks.includes(item)?"✓":""}</td></tr>`
    ).join("");
    const setupRows = CHECK_DEFS.setup.items.map(item =>
      `<tr><td style="padding:2px 6px;border:1px solid #ccc;">${item}</td><td style="padding:2px 6px;border:1px solid #ccc;text-align:center;">${setupChecks.includes(item)?"✓":""}</td></tr>`
    ).join("");
    const payRows = CHECK_DEFS.payment.items.map(item =>
      `<tr><td style="padding:2px 6px;border:1px solid #ccc;">${item}</td><td style="padding:2px 6px;border:1px solid #ccc;text-align:center;">${payChecks.includes(item)?"✓":""}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<title>作業指示書 - ${info.siteName||"現場名未入力"}</title>
<style>
  @page { size: A3 landscape; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hiragino Kaku Gothic Pro','Noto Sans JP',sans-serif; font-size: 10px; color: #111; }
  h1 { font-size: 20px; text-align: center; margin-bottom: 6px; letter-spacing: 4px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 2px solid #333; padding-bottom: 6px; }
  .badge { font-size: 16px; font-weight: 900; border: 2px solid #333; padding: 2px 12px; border-radius: 4px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #e8edf2; padding: 3px 6px; border: 1px solid #ccc; font-size: 9px; text-align: center; }
  .section-title { font-size: 11px; font-weight: bold; background: #2a4a6b; color: white; padding: 3px 8px; margin: 8px 0 4px; border-radius: 2px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .info-table td { padding: 4px 8px; border: 1px solid #ccc; }
  .info-table .lbl { background: #f0f4f8; font-weight: bold; width: 80px; }
  .total-row td { font-weight: bold; font-size: 12px; background: #e8f0ff; }
  .grid-wrap { display: flex; gap: 16px; align-items: flex-start; }
  .grid-legend { font-size: 8px; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px; }
  .legend-item { display: flex; align-items: center; gap: 2px; }
  .legend-box { width: 10px; height: 10px; border-radius: 2px; }
  .scale-note { font-size: 8px; color: #666; margin-top: 2px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>作業指示書</h1>
    <div style="font-size:9px;color:#666;">出力日時：${new Date().toLocaleString('ja-JP')}</div>
  </div>
  <div class="badge">${workType}</div>
</div>

<!-- 基本情報 -->
<div class="section-title">📋 基本情報</div>
<table class="info-table" style="margin-bottom:8px;">
  <tr>
    <td class="lbl">施工日</td><td>${info.date||"　"}</td>
    <td class="lbl">元請名</td><td>${info.client||"　"}</td>
    <td class="lbl">担当者</td><td>${info.manager||"　"}</td>
    <td class="lbl">車両指定</td><td>${info.vehicle||"　"}</td>
  </tr>
  <tr>
    <td class="lbl">作業時間</td><td>${info.timeStart||"　"}〜${info.timeEnd||"　"}</td>
    <td class="lbl">現場名</td><td colspan="3">${info.siteName||"　"}</td>
    <td class="lbl">荷取りS</td><td>${荷取り}</td>
  </tr>
  <tr>
    <td class="lbl">現場住所</td><td colspan="5">${info.siteAddress||"　"}</td>
    <td class="lbl">昇降階段</td><td>${昇降}</td>
  </tr>
  <tr>
    <td class="lbl">工事内容</td><td colspan="3">${kojiContents.join("・")||"　"}</td>
    <td class="lbl">足場仕様</td><td colspan="3">${scaffoldSpec.join("・")||"　"}</td>
  </tr>
  <tr>
    <td class="lbl">安全対策</td><td colspan="3">${安全対策.join("・")||"　"}</td>
    <td class="lbl">シート</td><td colspan="3">${シート.join("・")||"　"}</td>
  </tr>
  ${備考 ? `<tr><td class="lbl">備考</td><td colspan="7">${備考}</td></tr>` : ""}
</table>

<div class="two-col">
  <!-- 左列：図面 -->
  <div>
    <div class="section-title">📐 平面図（1マス＝1,800mm）</div>
    <div class="grid-wrap" style="flex-direction:column;">
      <div style="position:relative;">
        ${bSVG.replace('</svg>','')}
        ${sSVG.replace(/^<svg[^>]*>/,'').replace('</svg>','')}
        </svg>
      </div>
      <div class="scale-note">横 ${scaleM}m × 縦 ${scaleN}m　|　階数：${floors}階建て</div>
      <div class="grid-legend">
        ${Object.entries(BUILDING_PARTS).filter(([k])=>bGridRef.current.some(r=>r.includes(k))).map(([k,p])=>`<div class="legend-item"><div class="legend-box" style="background:${p.color};"></div><span>${p.label}</span></div>`).join("")}
        ${Object.entries(SCAFFOLD_PARTS).filter(([k])=>sGridRef.current.some(r=>r.includes(k))).map(([k,p])=>`<div class="legend-item"><div class="legend-box" style="background:${p.color};"></div><span>${p.label}</span></div>`).join("")}
      </div>
    </div>
  </div>

  <!-- 右列：積算＋確認事項 -->
  <div>
    <div class="section-title">💰 部材積算</div>
    <table style="margin-bottom:8px;">
      <tr><th>部材名</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th></tr>
      ${partRows}
      <tr class="total-row">
        <td colspan="4" style="padding:4px 6px;border:1px solid #ccc;text-align:right;">合計（材料費概算）</td>
        <td style="padding:4px 6px;border:1px solid #ccc;text-align:right;">¥${totalCost.toLocaleString()}</td>
      </tr>
    </table>
    <div style="font-size:8px;color:#666;margin-bottom:8px;">※労務費・運搬費・諸経費は含みません</div>

    <div class="three-col">
      <div>
        <div class="section-title" style="font-size:9px;">現調時確認</div>
        <table><tr><th>項目</th><th>済</th></tr>${surveyRows}</table>
        ${damageMemo ? `<div style="margin-top:4px;font-size:8px;border:1px solid #ccc;padding:4px;"><b>破損メモ：</b>${damageMemo}</div>` : ""}
      </div>
      <div>
        <div class="section-title" style="font-size:9px;">架け時確認</div>
        <table><tr><th>項目</th><th>済</th></tr>${setupRows}</table>
      </div>
      <div>
        <div class="section-title" style="font-size:9px;">払い時確認</div>
        <table><tr><th>項目</th><th>済</th></tr>${payRows}</table>
      </div>
    </div>
  </div>
</div>

<script>window.onload=()=>{window.print();}</script>
</body>
</html>`;

    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div style={{minHeight:"100vh",background:"#0f1923",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic Pro',sans-serif",color:"#e8edf2",display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <header style={{background:"linear-gradient(135deg,#1a2d42,#0f1923)",borderBottom:"2px solid #2a4a6b",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,background:"linear-gradient(135deg,#2a7fd4,#1a5fa8)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:900,boxShadow:"0 2px 8px rgba(42,127,212,0.4)"}}>⊞</div>
          <div>
            <div style={{fontSize:15,fontWeight:700,letterSpacing:1}}>足場プランナー</div>
            <div style={{fontSize:9,color:"#7a9db8",letterSpacing:2}}>ASHIBA PLANNER</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {["組立","解体"].map(t=>(
            <button key={t} onClick={()=>setWorkType(t)} style={{padding:"5px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontWeight:workType===t?700:400,background:workType===t?(t==="組立"?"#1a5fa8":"#7a1a1a"):"#0f1923",border:workType===t?`1px solid ${t==="組立"?"#2a7fd4":"#e74c3c"}`:"1px solid #2a4a6b",color:workType===t?"#fff":"#7a9db8"}}>{t}</button>
          ))}
        </div>
      </header>

      {/* Tabs */}
      <div style={{display:"flex",background:"#151f2b",borderBottom:"1px solid #1e3048",overflowX:"auto"}}>
        {TABS.map(({key,label})=>(
          <button key={key} onClick={()=>switchTab(key)} style={{flexShrink:0,padding:"11px 13px",background:activeTab===key?"#1a2d42":"transparent",border:"none",borderBottom:activeTab===key?"3px solid #2a7fd4":"3px solid transparent",color:activeTab===key?"#2a7fd4":"#7a9db8",fontSize:11,fontWeight:activeTab===key?700:400,cursor:"pointer",whiteSpace:"nowrap"}}>
            {label}
            {key==="check"&&doneChecks>0&&<span style={{marginLeft:4,fontSize:9,background:"#2d9a6f",color:"#fff",borderRadius:10,padding:"1px 5px"}}>{doneChecks}/{totalChecks}</span>}
          </button>
        ))}
      </div>

      {/* ===== 現場情報 ===== */}
      {activeTab==="info"&&(
        <div style={{flex:1,padding:"14px 14px 40px",overflowY:"auto"}}>
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
        <div style={{flex:1,padding:"14px 14px 40px",overflowY:"auto"}}>
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
            <textarea value={damageMemo} onChange={e=>setDmg(e.target.value)} placeholder="破損・注意個所の詳細を記入" rows={4} style={{...inp,resize:"vertical",lineHeight:1.6,fontFamily:"inherit"}}/>
          </div>
          <CheckSection def={CHECK_DEFS.setup} checks={setupChecks} onToggle={toggle(setSetup)}/>
          <CheckSection def={CHECK_DEFS.payment} checks={payChecks} onToggle={toggle(setPay)}/>
          {doneChecks===totalChecks&&(
            <div style={{background:"linear-gradient(135deg,#1a3a28,#0f2018)",borderRadius:12,padding:"16px",border:"2px solid #2d9a6f",textAlign:"center",marginBottom:12}}>
              <div style={{fontSize:24,marginBottom:6}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:"#4ecca3"}}>全項目確認完了</div>
              <div style={{fontSize:11,color:"#7a9db8",marginTop:4}}>お疲れ様でした</div>
            </div>
          )}
        </div>
      )}

      {/* ===== 図面（建物・足場共通） ===== */}
      {isDrawTab&&(
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {/* 部材パレット */}
          <div style={{padding:"10px 12px",background:"#151f2b",borderBottom:"1px solid #1e3048",overflowX:"auto"}}>
            <div style={{display:"flex",gap:7,minWidth:"max-content"}}>
              {Object.entries(currentParts).map(([key,part])=>(
                <button key={key} onClick={()=>selectPart(key)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"7px 10px",background:currentPartKey===key?`${part.color}33`:"rgba(255,255,255,0.04)",border:currentPartKey===key?`2px solid ${part.color}`:"2px solid transparent",borderRadius:10,cursor:"pointer",minWidth:56}}>
                  <div style={{width:28,height:28,background:part.color,borderRadius:6,border:part.border?`2px solid ${part.border}`:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff"}}>{part.symbol}</div>
                  <div style={{fontSize:9,color:"#aac",whiteSpace:"nowrap"}}>{part.label.slice(0,6)}</div>
                </button>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
              <button onClick={()=>{const next=!eraseOn; setEraseOn(next); eraseModeRef.current=next;}} style={{
                padding:"5px 14px", borderRadius:20, fontSize:11, cursor:"pointer",
                background: eraseOn?"#c0392b22":"#0f1923",
                border: eraseOn?"1px solid #c0392b":"1px solid #2a4a6b",
                color: eraseOn?"#e74c3c":"#7a9db8", fontWeight: eraseOn?700:400,
              }}>✕ 消しゴム{eraseOn?" ON":""}</button>
              <span style={{fontSize:10,color:"#3a6a8a"}}>🤏 ピンチ：ズーム</span>
            </div>
          </div>

          {/* グリッドエリア */}
          <div style={{flex:1,overflow:"auto",padding:"12px 8px 16px"}}>
            {/* ズームバー */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:6}}>
              <button onClick={()=>changeScale(Math.max(MIN_SCALE,Math.round((scaleRef.current-0.25)*20)/20))} style={{width:28,height:28,borderRadius:6,background:"#1a2d42",border:"1px solid #2a4a6b",color:"#e8edf2",fontSize:16,cursor:"pointer"}}>−</button>
              <div style={{fontSize:10,color:"#5a7a96",minWidth:140,textAlign:"center"}}>1マス＝{MM_PER_CELL.toLocaleString()}mm | {Math.round(scale*100)}%</div>
              <button onClick={()=>changeScale(Math.min(MAX_SCALE,Math.round((scaleRef.current+0.25)*20)/20))} style={{width:28,height:28,borderRadius:6,background:"#1a2d42",border:"1px solid #2a4a6b",color:"#e8edf2",fontSize:16,cursor:"pointer"}}>＋</button>
            </div>

            <div style={{display:"inline-flex",flexDirection:"column",alignItems:"flex-start"}}>
              {/* 上ルーラー */}
              <div style={{display:"flex",marginLeft:32}}>
                {Array.from({length:GRID_COLS},(_,ci)=>(
                  <div key={ci} style={{width:cellSize,fontSize:7,color:"#4a7a9b",textAlign:"left",lineHeight:"16px",paddingLeft:2,borderLeft:ci%5===0?"1px solid #2a4a6b":"none",flexShrink:0}}>
                    {ci%5===0?`${(ci*MM_PER_CELL/1000).toFixed(1)}m`:""}
                  </div>
                ))}
              </div>
              <div style={{display:"flex"}}>
                {/* 左ルーラー */}
                <div style={{display:"flex",flexDirection:"column",width:32}}>
                  {Array.from({length:GRID_ROWS},(_,ri)=>(
                    <div key={ri} style={{height:cellSize,fontSize:7,color:"#4a7a9b",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",paddingRight:3,paddingTop:2,flexShrink:0,borderTop:ri%5===0?"1px solid #2a4a6b":"none"}}>
                      {ri%5===0?`${(ri*MM_PER_CELL/1000).toFixed(1)}m`:""}
                    </div>
                  ))}
                </div>
                {/* グリッド本体 */}
                <GridCanvas
                  bGrid={bGridRef.current}
                  sGrid={sGridRef.current}
                  cellSize={cellSize}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                />
              </div>

              {/* 凡例 */}
              <div style={{marginTop:8,marginLeft:32,display:"flex",gap:8,flexWrap:"wrap"}}>
                {[
                  ...Object.entries(BUILDING_PARTS).filter(([k])=>bGridRef.current.some(r=>r.includes(k))),
                  ...Object.entries(SCAFFOLD_PARTS).filter(([k])=>sGridRef.current.some(r=>r.includes(k))),
                ].map(([k,p])=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:10,height:10,background:p.color,borderRadius:2,border:p.border?`1px solid ${p.border}`:"none"}}/>
                    <span style={{fontSize:9,color:"#7a9db8"}}>{p.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={clearGrid} style={{marginTop:10,marginLeft:32,padding:"7px 18px",background:"rgba(192,57,43,0.15)",border:"1px solid #c0392b",borderRadius:8,color:"#e74c3c",fontSize:11,cursor:"pointer"}}>
                {activeTab==="building"?"建物をクリア":"足場をクリア"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 積算 ===== */}
      {activeTab==="estimate"&&(
        <div style={{flex:1,padding:14,display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:8}}>⚙️ 設定</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:13}}>階数</span>
              <button onClick={()=>setFloors(f=>Math.max(1,f-1))} style={{width:32,height:32,borderRadius:8,background:"#0f1923",border:"1px solid #2a4a6b",color:"#e8edf2",fontSize:18,cursor:"pointer"}}>−</button>
              <span style={{fontSize:20,fontWeight:700,minWidth:28,textAlign:"center"}}>{floors}</span>
              <button onClick={()=>setFloors(f=>Math.min(20,f+1))} style={{width:32,height:32,borderRadius:8,background:"#0f1923",border:"1px solid #2a4a6b",color:"#e8edf2",fontSize:18,cursor:"pointer"}}>＋</button>
              <span style={{fontSize:12,color:"#7a9db8"}}>階建て</span>
            </div>
          </div>
          {info.siteName&&(
            <div style={{...card,background:"#111f2e"}}>
              <div style={{fontSize:13,fontWeight:700}}>{info.siteName}</div>
              {info.date&&<div style={{fontSize:11,color:"#7a9db8",marginTop:2}}>📅 {info.date}</div>}
              {kojiContents.length>0&&<div style={{fontSize:11,color:"#7a9db8",marginTop:2}}>🔨 {kojiContents.join("・")}</div>}
            </div>
          )}
          <div style={card}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:10}}>📦 部材明細・単価設定</div>
            {!hasScaffold&&<div style={{fontSize:13,color:"#5a7a96",textAlign:"center",padding:"16px 0"}}>足場タブで部材を配置してください</div>}
            {Object.entries(SCAFFOLD_PARTS).map(([key,part])=>{
              const cnt=adjCounts[key];
              const unitPrice=prices[key]||0;
              const subtotal=cnt*unitPrice;
              return (
                <div key={key} style={{padding:"10px 0",borderBottom:"1px solid #1e3048"}}>
                  {/* 部材名と小計 */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:24,height:24,background:part.color,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff"}}>{part.symbol}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{part.label}</div>
                        <div style={{fontSize:10,color:"#5a7a96"}}>{cnt>0?`${cnt}${part.unit}`:"未配置"}</div>
                      </div>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:cnt>0?"#4aa8e8":"#3a5a6a"}}>
                      {cnt>0?`¥${subtotal.toLocaleString()}`:"—"}
                    </div>
                  </div>
                  {/* 単価入力 */}
                  <div style={{display:"flex",alignItems:"center",gap:8,background:"#0f1923",borderRadius:8,padding:"6px 10px",border:"1px solid #2a4a6b"}}>
                    <span style={{fontSize:11,color:"#7a9db8",whiteSpace:"nowrap"}}>単価</span>
                    <span style={{fontSize:11,color:"#7a9db8"}}>¥</span>
                    <input
                      type="number"
                      value={unitPrice}
                      onChange={e=>updatePrice(key,e.target.value)}
                      style={{flex:1,background:"transparent",border:"none",color:"#e8edf2",fontSize:14,fontWeight:600,outline:"none",textAlign:"right"}}
                    />
                    <span style={{fontSize:11,color:"#7a9db8",whiteSpace:"nowrap"}}>/{part.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {hasScaffold&&(
            <div style={{background:"linear-gradient(135deg,#1a4a7a,#0f2a4a)",borderRadius:12,padding:"14px 18px",border:"2px solid #2a7fd4",boxShadow:"0 4px 20px rgba(42,127,212,0.2)"}}>
              <div style={{fontSize:11,color:"#7ab8e8",marginBottom:4,letterSpacing:2}}>概算合計金額</div>
              <div style={{fontSize:26,fontWeight:900,color:"#fff"}}>¥{totalCost.toLocaleString()}</div>
              <div style={{fontSize:10,color:"#7ab8e8",marginTop:4}}>※材料費概算（労務費・諸経費別途）</div>
            </div>
          )}
          <div style={{background:"#151f2b",borderRadius:10,padding:"10px 14px",border:"1px solid #1e3048",fontSize:10,color:"#5a7a96",lineHeight:1.9}}>
            ※ 単価は上の入力欄で変更できます。<br/>
            ※ 1マス＝1,800mm×1,800mm（1スパン）で計算しています。<br/>
            ※ 平面配置×階数で概算を自動計算しています。<br/>
            ※ 労務費・運搬費・諸経費は含みません。
          </div>
        </div>
      )}

      {/* ===== PDF出力 ===== */}
      {activeTab==="pdf"&&(
        <div style={{flex:1,padding:20,display:"flex",flexDirection:"column",gap:16,overflowY:"auto"}}>
          <div style={{background:"#1a2d42",borderRadius:12,padding:"16px",border:"1px solid #2a4a6b"}}>
            <div style={{fontSize:11,color:"#4a8ab8",fontWeight:700,letterSpacing:2,marginBottom:12}}>🖨️ PDF出力内容</div>
            {[
              ["📋 基本情報",info.siteName?"入力済み":"未入力",!!info.siteName],
              ["🔨 工事内容",kojiContents.length>0?kojiContents.join("・"):"未選択",kojiContents.length>0],
              ["📐 建物図面",bGridRef.current.some(r=>r.some(c=>c))?"配置済み":"未配置",bGridRef.current.some(r=>r.some(c=>c))],
              ["⊞ 足場図面",hasScaffold?"配置済み":"未配置",hasScaffold],
              ["💰 積算",hasScaffold?`¥${totalCost.toLocaleString()}`:"足場未配置",hasScaffold],
              ["✅ 確認事項",`${doneChecks}/${totalChecks}項目`,doneChecks>0],
            ].map(([label,val,ok])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e3048"}}>
                <span style={{fontSize:12}}>{label}</span>
                <span style={{fontSize:11,color:ok?"#2d9a6f":"#5a7a96",fontWeight:ok?700:400}}>{ok?"✓ ":""}{val}</span>
              </div>
            ))}
          </div>

          <div style={{background:"#151f2b",borderRadius:10,padding:"12px 14px",border:"1px solid #1e3048",fontSize:11,color:"#5a7a96",lineHeight:1.8}}>
            📄 A3横サイズでの印刷を推奨します。<br/>
            ブラウザの印刷設定で「用紙サイズ：A3」「横向き」を選択してください。<br/>
            スマホの場合は「PDFに保存」を選ぶとPDFファイルとして保存できます。
          </div>

          <button onClick={printPDF} style={{
            padding:"16px",borderRadius:12,
            background:"linear-gradient(135deg,#1a5fa8,#2a7fd4)",
            border:"none",color:"#fff",fontSize:16,fontWeight:700,
            cursor:"pointer",letterSpacing:2,
            boxShadow:"0 4px 16px rgba(42,127,212,0.4)",
          }}>
            🖨️　作業指示書を印刷 / PDF保存
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{background:"#0f1923",borderTop:"1px solid #1e3048",padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#5a7a96"}}>
        <span style={{maxWidth:"55%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{info.siteName||"現場名未入力"}</span>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {doneChecks>0&&<span style={{fontSize:10,color:"#2d9a6f"}}>✅ {doneChecks}/{totalChecks}</span>}
          <span style={{color:hasScaffold?"#4aa8e8":"#5a7a96",fontWeight:hasScaffold?700:400}}>{hasScaffold?`¥${totalCost.toLocaleString()}`:"足場未配置"}</span>
        </div>
      </div>
    </div>
  );
}
