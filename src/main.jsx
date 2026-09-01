import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import {Search, Plus, MapPin, Calendar, MessageCircle, Trash2, CheckCircle2, AlertTriangle, Megaphone, User, ShieldCheck, X, Package, Sparkles, Home as HomeIcon, ClipboardList, Archive, ChevronRight, Loader2} from "lucide-react";
import "./style.css";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const C={bg:"#E7EAEA",bgSoft:"#F1F3F1",ink:"#1F2E36",inkSoft:"#4B6067",steel:"#51707A",manila:"#E4D2A0",manilaDark:"#C7AD6D",amber:"#DB8A2A",green:"#4C7A43",red:"#B8433A",white:"#FFFCF6"};
const ITEM_STATUS_LABEL={stored:"보관중",returned:"반환완료",disposal_pending:"폐기예정",disposed:"폐기완료"};
const REPORT_STATUS_LABEL={pending:"접수",approved:"승인됨",rejected:"거절됨",closed:"종료"};
const NICK_RE=/^([0-9]{2}-[0-9]{5}[가-힣]{2,4}|[가-힣]{2,4}선생님)$/;
const emoji=n=>/(에어팟|이어폰|헤드폰|버즈)/i.test(n)?"🎧":/(지갑|카드)/i.test(n)?"👛":/우산/i.test(n)?"☂️":/(물병|텀블러)/i.test(n)?"🧴":/안경/i.test(n)?"👓":/(가방|백팩)/i.test(n)?"🎒":/(휴대폰|폰|아이폰|갤럭시)/i.test(n)?"📱":/(열쇠|키)/i.test(n)?"🔑":/(책|노트|필통)/i.test(n)?"📓":/시계/i.test(n)?"⌚":"🏷️";
const fmt=d=>d?new Date(d).toLocaleDateString("ko-KR"):"";
const photoUrl=path=>path?supabase.storage.from("lost-items").getPublicUrl(path).data.publicUrl:null;
async function uploadImage(file,prefix){
 if(!file)return "";
 const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
 const path=`${prefix}/${crypto.randomUUID()}.${ext}`;
 const {error}=await supabase.storage.from("lost-items").upload(path,file);
 if(error)throw error;
 return path;
}

function Button({children,onClick,variant="primary",disabled=false}){return <button disabled={disabled} className={"btn "+variant} onClick={onClick}>{children}</button>}
function Toast({msg,error}){if(!msg)return null;return <div className={"toast "+(error?"err":"")}>{error?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>} {msg}</div>}
function Stamp({status}){return <span className={"stamp "+status}>{status==="stored"?<Archive size={12}/>:status==="returned"?<CheckCircle2 size={12}/>:<AlertTriangle size={12}/>} {ITEM_STATUS_LABEL[status]||status}</span>}

function App(){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[page,setPage]=useState("home");
 const [items,setItems]=useState([]),[reports,setReports]=useState([]),[notices,setNotices]=useState([]);
 const [selected,setSelected]=useState(null),[q,setQ]=useState(""),[nick,setNick]=useState("");
 const [loading,setLoading]=useState(true),[toast,setToast]=useState(""),[error,setError]=useState(false),[authOpen,setAuthOpen]=useState(false);
 const isAdmin=profile?.role==="admin";

 const notify=(m,e=false)=>{setToast(m);setError(e);setTimeout(()=>setToast(""),2500)};

 async function load(){
   const [{data:i},{data:r},{data:n}]=await Promise.all([
     supabase.from("items").select("*, comments(count)").order("created_at",{ascending:false}),
     supabase.from("reports").select("*").order("created_at",{ascending:false}),
     supabase.from("notices").select("*").order("created_at",{ascending:false})
   ]);
   setItems(i||[]);setReports(r||[]);setNotices(n||[]);
 }
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();setSession(session);if(session){const {data:p}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();setProfile(p);setNick(p?.nickname||session.user.email?.split("@")[0]||"");}await load();setLoading(false)})();},[]);
 useEffect(()=>{
   const ch=supabase.channel("lost-property-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"items"},load)
    .on("postgres_changes",{event:"*",schema:"public",table:"reports"},load)
    .on("postgres_changes",{event:"*",schema:"public",table:"notices"},load)
    .subscribe();
   return()=>supabase.removeChannel(ch);
 },[]);
 async function saveNick(){if(!session)return;const v=nick.trim();if(!NICK_RE.test(v))return notify("닉네임은 '26-10101홍길동' 또는 '김철수선생님' 형식이어야 해요.",true);await supabase.from("profiles").update({nickname:v}).eq("id",session.user.id);setProfile({...profile,nickname:v});notify("닉네임을 저장했습니다.");}
 async function signOut(){await supabase.auth.signOut();setSession(null);setProfile(null);setPage("home");notify("로그아웃했습니다.");}
 if(loading)return <div className="loading"><Loader2 className="spin"/></div>;
 return <div className="app">
  <header><div className="top"><div className="logo" onClick={()=>setPage("home")}><b>🏷️</b><strong>분실물 보관소</strong></div>
   <div className="actions">{session?<><button onClick={()=>setAuthOpen(!authOpen)}><User size={14}/>{profile?.nickname||"닉네임"}</button><button onClick={signOut}><ShieldCheck size={14}/>로그아웃</button></>:<button onClick={()=>setAuthOpen(true)}><User size={14}/>로그인</button>}</div></div>
   {authOpen&&<Auth session={session} onLogin={async()=>{const {data:{session}}=await supabase.auth.getSession();setSession(session);if(session){const {data:p}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();setProfile(p);setNick(p?.nickname||"");}setAuthOpen(false);notify("로그인했습니다.");}}/>}
   {session&&<div className="nick"><input value={nick} onChange={e=>setNick(e.target.value)} placeholder="닉네임"/><Button variant="accent" onClick={saveNick}>저장</Button></div>}
   <nav>{[["home","홈",HomeIcon],["browse","분실물 조회",Search],["report","분실 신고",ClipboardList],["notices","공지사항",Megaphone],["mypage","마이페이지",User],...(isAdmin?[["admin","관리자 페이지",ShieldCheck]]:[])].map(([id,l,I])=><button className={page===id?"active":""} onClick={()=>setPage(id)} key={id}><I size={14}/>{l}</button>)}</nav>
  </header>
  {page==="home"&&<Home items={items} notices={notices} q={q} setQ={setQ} go={setPage} open={setSelected}/>}
  {page==="browse"&&<Browse items={items} q={q} setQ={setQ} open={setSelected}/>}
  {page==="report"&&<Report session={session} nick={nick} items={items} go={setPage} notify={notify}/>}
  {page==="notices"&&<Notices notices={notices} admin={isAdmin} notify={notify}/>}
  {page==="mypage"&&<MyPage session={session} reports={reports} items={items} nick={nick} open={setSelected}/>}
  {page==="admin"&&isAdmin&&<Admin reports={reports} items={items} notices={notices} notify={notify}/>}
  {selected&&<Detail item={selected} admin={isAdmin} session={session} nick={nick} close={()=>setSelected(null)} notify={notify} reload={load}/>}
  <Toast msg={toast} error={error}/>
  <footer>분실물 보관소 · 실시간 공유 · 데이터는 서버에 영구 저장됩니다.</footer>
 </div>
}

function Auth({onLogin}){const [email,setEmail]=useState(""),[pw,setPw]=useState(""),[signup,setSignup]=useState(false),[msg,setMsg]=useState("");
 async function go(){let res=signup?await supabase.auth.signUp({email,password:pw}):await supabase.auth.signInWithPassword({email,password:pw});if(res.error)setMsg(res.error.message);else onLogin();}
 return <div className="auth"><input placeholder="이메일" value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" placeholder="비밀번호" value={pw} onChange={e=>setPw(e.target.value)}/><Button variant="accent" onClick={go}>{signup?"회원가입":"로그인"}</Button><button onClick={()=>setSignup(!signup)}>{signup?"로그인으로":"회원가입으로"}</button>{msg&&<small>{msg}</small>}</div>}

function Card({item,open}){return <div className="card" onClick={()=>open(item)}><div className="photo">{item.photo_path?<img src={photoUrl(item.photo_path)}/>:emoji(item.name)}</div><div className="cardbody"><div className="meta">#{item.ticket_no}<Stamp status={item.status}/></div><h3>{item.name}</h3><p><MapPin size={12}/>{item.found_location}</p><p><Calendar size={12}/>{fmt(item.found_date)}</p><p>{item.comments?.[0]?.count||0}개의 댓글</p></div></div>}

function Home({items,notices,q,setQ,go,open}){const latest=items.slice(0,4);return <main><section className="hero"><small>CLAIM YOUR ITEM</small><h1>잃어버렸다면,<br/>여기서 찾아보세요.</h1><div className="search"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go("browse")} placeholder="물건 이름, 장소로 검색"/><Button variant="accent" onClick={()=>go("browse")}>검색</Button></div></section><Title icon={Sparkles} text="최신 분실물" more={()=>go("browse")}/><Grid items={latest} open={open}/><Title icon={Megaphone} text="공지사항" more={()=>go("notices")}/><div className="notices">{notices.slice(0,3).map(n=><div key={n.id} className="notice" onClick={()=>go("notices")}><b>{n.category}</b>{n.title}</div>)}</div></main>}
function Title({icon:I,text,more}){return <div className="title"><h2><I size={18}/>{text}</h2><button onClick={more}>더보기 <ChevronRight size={13}/></button></div>}
function Grid({items,open}){return items.length?<div className="grid">{items.map(i=><Card key={i.id} item={i} open={open}/>)}</div>:<div className="empty">등록된 분실물이 없습니다.</div>}

function Browse({items,q,setQ,open}){const [filter,setFilter]=useState("전체");const list=useMemo(()=>items.filter(i=>(filter==="전체"||i.status===filter)&&(!q||[i.name,i.found_location,i.features].join(" ").toLowerCase().includes(q.toLowerCase()))),[items,q,filter]);return <main><h1>분실물 조회</h1><input className="full" value={q} onChange={e=>setQ(e.target.value)} placeholder="물건 이름, 장소, 특징으로 검색"/><div className="filters">{["전체","stored","returned","disposal_pending","disposed"].map(f=><button className={filter===f?"sel":""} onClick={()=>setFilter(f)} key={f}>{f==="전체"?"전체":ITEM_STATUS_LABEL[f]}</button>)}</div><Grid items={list} open={open}/></main>}

function Report({session,nick,items,go,notify}){const [f,setF]=useState({name:"",lost_location:"",lost_date:"",features:""});const [photoFile,setPhotoFile]=useState(null);const [uploading,setUploading]=useState(false);const [done,setDone]=useState(false);
 async function submit(){
  if(!session)return notify("먼저 로그인해주세요.",true);
  if(!f.name||!f.lost_location||!f.lost_date)return notify("물건 이름, 위치, 날짜는 필수입니다.",true);
  setUploading(true);
  try{
   const photo_path=await uploadImage(photoFile,"reports");
   const {error}=await supabase.from("reports").insert({...f,photo_path,user_id:session.user.id,reporter_nickname_snapshot:nick||"",status:"pending"});
   if(error)return notify(error.message,true);
   setDone(true);notify("분실 신고가 접수되었습니다.");
  }catch(e){notify(e.message,true);}
  finally{setUploading(false);}
 }
 if(done)return <main><div className="success"><CheckCircle2 size={40}/><h2>분실 신고 접수 완료</h2><p>관리자가 확인 후 승인하면 분실물 조회에 공개됩니다.</p><Button variant="ghost" onClick={()=>go("mypage")}>마이페이지 확인</Button></div></main>;
 return <main className="narrow"><h1>분실 신고</h1><p>관리자 승인 후 다른 사용자에게 공개됩니다.</p>
  {[["name","잃어버린 물건 이름"],["lost_location","잃어버린 위치"],["lost_date","잃어버린 날짜"],["features","특징"]].map(([k,l])=><label key={k}>{l}<input type={k==="lost_date"?"date":"text"} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}
  <label>사진 (선택)<input type="file" accept="image/*" onChange={e=>setPhotoFile(e.target.files?.[0]||null)}/></label>
  <Button variant="accent" onClick={submit} disabled={uploading}><Plus size={15}/>{uploading?"등록 중...":"분실 신고 등록"}</Button>
 </main>}

function Notices({notices,admin,notify}){const [f,setF]=useState({title:"",category:"안내",body:""});async function add(){if(!admin||!f.title||!f.body)return;const {error}=await supabase.from("notices").insert(f);if(error)notify(error.message,true);else{setF({title:"",category:"안내",body:""});notify("공지 등록 완료");}}return <main className="narrow"><h1>공지사항</h1>{admin&&<div className="panel"><input placeholder="제목" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><select value={f.category} onChange={e=>setF({...f,category:e.target.value})}><option>안내</option><option>휴관</option><option>반환절차</option><option>이벤트</option></select><textarea placeholder="내용" value={f.body} onChange={e=>setF({...f,body:e.target.value})}/><Button variant="accent" onClick={add}>공지 등록</Button></div>}{notices.map(n=><details className="noticebox" key={n.id}><summary><b>{n.category}</b> {n.title}<span>{fmt(n.created_at)}</span></summary><p>{n.body}</p></details>)}</main>}

function MyPage({session,reports,items,nick,open}){if(!session)return <main className="center">로그인 후 이용할 수 있습니다.</main>;const mine=reports.filter(r=>r.user_id===session.user.id);return <main><h1>마이페이지</h1><p>{nick}님의 활동</p><Title icon={ClipboardList} text="내 분실 신고"/>{mine.map(r=><div className="reportrow" key={r.id}><b>{r.name}</b><span>{REPORT_STATUS_LABEL[r.status]||r.status}</span><small>{r.lost_location} · {fmt(r.lost_date)}</small></div>)}{!mine.length&&<div className="empty">등록한 신고가 없습니다.</div>}</main>}

function Admin({reports,items,notices,notify}){const pending=reports.filter(r=>r.status==="pending");async function approve(r){const {data,error}=await supabase.rpc("approve_lost_report",{p_report_id:r.id});if(error)notify(error.message,true);else notify("승인 완료: 분실물이 공개되었습니다.");}async function reject(r){const {error}=await supabase.from("reports").update({status:"rejected"}).eq("id",r.id);if(error)notify(error.message,true);else notify("신고를 거절했습니다.");}return <main><h1><ShieldCheck size={22}/> 관리자 페이지</h1><p>승인된 분실물은 모든 사용자에게 즉시 공개됩니다.</p><div className="adminsection"><h2>분실 신고 접수</h2>{pending.length?pending.map(r=><div className="adminrow" key={r.id}><div><b>{r.name}</b><small>신고자: {r.reporter_nickname_snapshot||"알 수 없음"}</small><small>{r.lost_location} · {fmt(r.lost_date)}</small><small>{r.features}</small></div><div><Button variant="accent" onClick={()=>approve(r)}>접수·공개</Button><Button variant="danger" onClick={()=>reject(r)}>거절</Button></div></div>):<div className="empty">새로운 접수 건이 없습니다.</div>}</div><div className="adminsection"><h2>현재 공개된 분실물 {items.length}건</h2>{items.map(i=><div className="adminrow" key={i.id}><div><b>{i.name}</b><small>#{i.ticket_no} · {i.found_location}</small></div><Stamp status={i.status}/></div>)}</div></main>}

function Detail({item,admin,session,nick,close,notify,reload}){
 const [text,setText]=useState("");
 const [cs,setCs]=useState([]);
 useEffect(()=>{supabase.from("comments").select("*").eq("item_id",item.id).order("created_at").then(({data})=>setCs(data||[]))},[item.id]);
 const submit=async()=>{
  if(!session)return notify("로그인해주세요.",true);
  if(!text.trim())return;
  const {data,error}=await supabase.from("comments").insert({item_id:item.id,user_id:session.user.id,author_nickname_snapshot:nick||"사용자",text:text.trim()}).select().single();
  if(error)notify(error.message,true);
  else{setCs([...cs,data]);setText("");reload();}
 };
 return <div className="modalbg" onClick={close}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={close}><X/></button><div className="bigphoto">{item.photo_path?<img src={photoUrl(item.photo_path)}/>:emoji(item.name)}</div><div className="modalbody"><Stamp status={item.status}/><h2>{item.name}</h2><p><MapPin size={14}/> {item.found_location}</p><p><Calendar size={14}/> {fmt(item.found_date)}</p><div className="features"><b>특징</b><br/>{item.features||"등록된 특징이 없습니다."}</div><h3><MessageCircle size={15}/> 댓글</h3><Comments cs={cs} setCs={setCs} admin={admin} notify={notify} reload={reload}/><div className="commentinput"><input value={text} onChange={e=>setText(e.target.value)} placeholder="댓글"/><Button variant="accent" onClick={submit}>등록</Button></div></div></div></div>
}
function Comments({cs,setCs,admin,notify,reload}){
 async function del(id){
  if(!admin)return;
  const {error}=await supabase.from("comments").delete().eq("id",id);
  if(error)notify(error.message,true);
  else{setCs(cs.filter(c=>c.id!==id));reload();}
 }
 return <div className="comments">{cs.map(c=><div className="comment" key={c.id}><b>{c.author_nickname_snapshot}</b><span>{c.text}</span>{admin&&<button onClick={()=>del(c.id)}><Trash2 size={14}/></button>}</div>)}{!cs.length&&<small>댓글이 없습니다.</small>}</div>
}

createRoot(document.getElementById("root")).render(<App/>);
