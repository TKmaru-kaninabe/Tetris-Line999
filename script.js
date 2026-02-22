/* ===== 定数 ===== */
const COL=10, ROW=20, B=24;
let GRAVITY=800, DAS=150, ARE=100;
const LOCK=1000;
const GRID_COLOR="rgba(255,255,255,0.08)";

const colors=[null,"#0ff","#00f","#f80","#ff0","#0f0","#f0f","#f00"];

const pieces={
 I:[[1,1,1,1]],
 J:[[2,0,0],[2,2,2]],
 L:[[0,0,3],[3,3,3]],
 O:[[4,4],[4,4]],
 S:[[0,5,5],[5,5,0]],
 T:[[0,6,0],[6,6,6]],
 Z:[[7,7,0],[0,7,7]]
};
const names=Object.keys(pieces);

/* ===== SRS ===== */
const ROTS=["0","R","2","L"];

const JLSTZ={
"0>R":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
"R>0":[[0,0],[1,0],[1,-1],[0,2],[1,2]],
"R>2":[[0,0],[1,0],[1,-1],[0,2],[1,2]],
"2>R":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
"2>L":[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
"L>2":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
"L>0":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
"0>L":[[0,0],[1,0],[1,1],[0,-2],[1,-2]]
};

const I_KICK={
"0>R":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
"R>0":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
"R>2":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
"2>R":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
"2>L":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
"L>2":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
"L>0":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
"0>L":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
};

/* ===== 状態 ===== */
const ctx=game.getContext("2d");
const hctx=hold.getContext("2d");
const nctx=next.getContext("2d");

let board, bag=[], cur, px, py, rot;
let holdP=null, canHold=true;
let running=false, dropT=0, lockT=null;
let lines=0;

/* ===== 回転（軸固定・テレポート） ===== */
function rotR(m){ return m[0].map((_,i)=>m.map(r=>r[i]).reverse()); }
function rotL(m){ return m[0].map((_,i)=>m.map(r=>r[r.length-1-i])); }

/* ===== 基本 ===== */
function newBag(){
 let a=names.slice();
 for(let i=a.length-1;i>0;i--){
  let j=Math.floor(Math.random()*(i+1));
  [a[i],a[j]]=[a[j],a[i]];
 }
 bag.push(...a);
}

function spawn(){
 if(bag.length<7)newBag();
 const k=bag.shift();
 cur=JSON.parse(JSON.stringify(pieces[k]));
 cur.name=k;
 px=3; py=0; rot=0;
 canHold=true;
}

function collide(x,y,p=cur){
 for(let j=0;j<p.length;j++)
  for(let i=0;i<p[j].length;i++)
   if(p[j][i]){
    let nx=x+i, ny=y+j;
    if(nx<0||nx>=COL||ny>=ROW||board[ny]?.[nx])return true;
   }
 return false;
}

function rotate(dir){
 const nr=(rot+(dir==="R"?1:3))%4;
 const key=`${ROTS[rot]}>${ROTS[nr]}`;
 const kicks=(cur.name==="I"?I_KICK:JLSTZ)[key];
 const r=dir==="R"?rotR(cur):rotL(cur);

 for(let [dx,dy] of kicks){
  if(!collide(px+dx,py+dy,r)){
   cur=r; px+=dx; py+=dy; rot=nr;
   return;
  }
 }
}

/* ===== 固定・消去 ===== */
function merge(){
 cur.forEach((r,y)=>r.forEach((v,x)=>{
  if(v)board[py+y][px+x]=v;
 }));
 clearLines();
 spawn();
}

function clearLines(){
 for(let y=ROW-1;y>=0;y--){
  if(board[y].every(v=>v)){
   board.splice(y,1);
   board.unshift(Array(COL).fill(0));
   lines++;
   y++;
  }
 }
 linesEl.textContent=lines;
}

/* ===== 描画 ===== */
function drawGrid(){
 ctx.strokeStyle=GRID_COLOR;
 for(let x=0;x<=COL;x++){
  ctx.beginPath();
  ctx.moveTo(x*B,0); ctx.lineTo(x*B,ROW*B); ctx.stroke();
 }
 for(let y=0;y<=ROW;y++){
  ctx.beginPath();
  ctx.moveTo(0,y*B); ctx.lineTo(COL*B,y*B); ctx.stroke();
 }
}

function block(c,x,y,a=1){
 ctx.globalAlpha=a;
 ctx.fillStyle=colors[c];
 ctx.fillRect(x*B,y*B,B-1,B-1);
 ctx.globalAlpha=1;
}

function draw(){
 ctx.clearRect(0,0,240,480);
 board.forEach((r,y)=>r.forEach((v,x)=>v&&block(v,x,y)));
 let gy=py; while(!collide(px,gy+1))gy++;
 cur.forEach((r,y)=>r.forEach((v,x)=>v&&block(v,px+x,gy+y,0.3)));
 cur.forEach((r,y)=>r.forEach((v,x)=>v&&block(v,px+x,py+y)));
 drawGrid();
}

/* ===== ループ ===== */
function loop(t){
 if(!running)return;
 if(t-dropT>GRAVITY){
  if(!collide(px,py+1))py++;
  else{
   if(!lockT)lockT=t;
   if(t-lockT>LOCK)merge();
  }
  dropT=t;
 }
 draw();
 requestAnimationFrame(loop);
}

/* ===== 入力 ===== */
document.addEventListener("keydown",e=>{
 if(!running)return;
 if(e.key==="ArrowLeft"&&!collide(px-1,py))px--;
 if(e.key==="ArrowRight"&&!collide(px+1,py))px++;
 if(e.key==="ArrowDown"&&!collide(px,py+1))py++;
 if(e.key==="z")rotate("L");
 if(e.key==="x")rotate("R");
 if(e.key==="ArrowUp"){
  while(!collide(px,py+1))py++;
  merge();
 }
 if(e.key==="c"&&canHold){
  canHold=false;
  [holdP,cur]=[cur,holdP];
  if(!cur)spawn(); else{px=3;py=0;}
 }
 if(e.key==="f"){
  board=Array.from({length:ROW},()=>Array(COL).fill(0));
  holdP=null; bag=[]; lines=0;
  spawn();
 }
});

/* ===== UI ===== */
const linesEl=document.getElementById("lines");
start.onclick=()=>{
 title.style.display="none";
 settings.style.display="none";
 gameWrap.style.display="flex";
 board=Array.from({length:ROW},()=>Array(COL).fill(0));
 bag=[]; lines=0;
 spawn(); running=true;
 requestAnimationFrame(loop);
};

openSettings.onclick=()=>{
 title.style.display="none";
 settings.style.display="block";
};

back.onclick=()=>{
 settings.style.display="none";
 title.style.display="block";
};

gravity.oninput=e=>GRAVITY=e.target.value;
das.oninput=e=>DAS=e.target.value;
are.oninput=e=>ARE=e.target.value;
