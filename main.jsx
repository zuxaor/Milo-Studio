import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Clapperboard, FolderOpen, Users, Settings, Cpu, Sparkles, Plus,
  Trash2, Copy, Play, Download, CheckCircle2, AlertCircle, Clock3,
  Film, Mic2, Music2, Volume2, WandSparkles
} from "lucide-react";
import "./styles.css";

const MILO = {
  name: "Milo",
  personality: "Joyeux, gentil, curieux, courageux, enthousiaste et légèrement maladroit.",
  visual:
    "Jeune petit ourson anthropomorphe adorable, fourrure marron chaud douce et légèrement touffue, ventre et museau légèrement plus clairs, grandes oreilles rondes, petite touffe de poils sur le sommet de la tête, grands yeux ronds bleu vif très expressifs, nez marron foncé, visage rond sympathique, grand sourire, langue rose lorsqu’il parle. Sweat à capuche bleu vif et sac à dos d’aventurier vert avec bretelles marron. Animation 3D cinématographique familiale, chaleureuse et colorée.",
  voice: "Jeune garçon français, enfantin, chaleureux, naturel, joyeux et expressif."
};

const defaultProject = {
  id: crypto.randomUUID(),
  name: "Nouvelle aventure de Milo",
  idea: "",
  duration: 15,
  format: "9:16",
  resolution: "720p",
  style: "Animation 3D cinématographique",
  emotion: "Joyeux et émerveillé",
  music: true,
  sfx: true,
  status: "Brouillon",
  scenes: []
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function App() {
  const [page, setPage] = useState("create");
  const [projects, setProjects] = useState(() => load("milo_projects", [defaultProject]));
  const [active, setActive] = useState(() => load("milo_active", defaultProject));
  const [generating, setGenerating] = useState(false);
  const [engine, setEngine] = useState("Non connecté");

  useEffect(() => save("milo_projects", projects), [projects]);
  useEffect(() => save("milo_active", active), [active]);

  const updateActive = (patch) => {
    const next = {...active, ...patch};
    setActive(next);
    setProjects(p => p.map(x => x.id === next.id ? next : x));
  };

  const generatePlan = () => {
    if (!active.idea.trim()) return;
    const scenes = [
      {id: crypto.randomUUID(), number:1, title:"Introduction", description:`Milo commence son aventure : ${active.idea}`, dialogue:"", status:"Prête"},
      {id: crypto.randomUUID(), number:2, title:"Découverte", description:"Milo découvre un élément mystérieux et réagit avec curiosité.", dialogue:"", status:"Prête"},
      {id: crypto.randomUUID(), number:3, title:"Cliffhanger", description:"Milo se tourne vers la caméra et comprend que l'aventure ne fait que commencer.", dialogue:"", status:"Prête"}
    ];
    updateActive({scenes, status:"En préparation"});
  };

  const startGeneration = async () => {
    if (engine === "Non connecté") {
      setPage("engines");
      return;
    }
    setGenerating(true);
    updateActive({status:"En génération"});
    await new Promise(r => setTimeout(r, 1200));
    setGenerating(false);
    updateActive({status:"Terminé"});
  };

  const duplicateProject = (p) => {
    const copyP = {...p, id: crypto.randomUUID(), name: `${p.name} (copie)`, status:"Brouillon"};
    setProjects(x => [...x, copyP]);
    setActive(copyP);
    setPage("create");
  };

  const deleteProject = (id) => {
    setProjects(x => x.filter(p => p.id !== id));
    if (active.id === id) setActive(projects.find(p => p.id !== id) ?? defaultProject);
  };

  const nav = [
    ["create", "Crée ta vidéo", Clapperboard],
    ["library", "Bibliothèque", FolderOpen],
    ["characters", "Personnages", Users],
    ["projects", "Projets", Film],
    ["engines", "État des moteurs", Cpu],
    ["settings", "Paramètres", Settings],
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">🐻</div>
          <div><strong>MILO STUDIO</strong><span>Création vidéo IA</span></div>
        </div>
        <nav>
          {nav.map(([id,label,Icon]) =>
            <button key={id} className={page===id ? "nav active":"nav"} onClick={()=>setPage(id)}>
              <Icon size={19}/><span>{label}</span>
            </button>
          )}
        </nav>
        <div className="engine-mini">
          <span className={engine === "Connecté" ? "dot on":"dot"} />
          <div><small>Moteur vidéo</small><b>{engine}</b></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{nav.find(x=>x[0]===page)?.[1]}</h1>
            <p>Crée des vidéos complètes autour de Milo.</p>
          </div>
          <button className="pill" onClick={()=>setPage("engines")}><Cpu size={16}/> {engine}</button>
        </header>

        {page==="create" && <Create active={active} update={updateActive} generatePlan={generatePlan} startGeneration={startGeneration} generating={generating} setPage={setPage}/>}
        {page==="library" && <Library projects={projects} setActive={setActive} setPage={setPage}/>}
        {page==="characters" && <Characters/>}
        {page==="projects" && <Projects projects={projects} setActive={setActive} setPage={setPage} duplicate={duplicateProject} remove={deleteProject}/>}
        {page==="engines" && <Engines engine={engine} setEngine={setEngine}/>}
        {page==="settings" && <SettingsPage/>}
      </main>
    </div>
  );
}

function Create({active, update, generatePlan, startGeneration, generating, setPage}) {
  return <section className="content">
    <div className="hero-card">
      <div>
        <span className="eyebrow"><Sparkles size={14}/> Studio automatique</span>
        <h2>Décris ta vidéo</h2>
        <p>Une idée simple devient un projet vidéo structuré. Les moteurs réels seront utilisés uniquement lorsqu'ils sont connectés.</p>
      </div>
      <div className="milo-chip">🐻 Milo</div>
    </div>

    <div className="grid2">
      <div className="card">
        <label>Idée / scénario</label>
        <textarea value={active.idea} onChange={e=>update({idea:e.target.value})}
          placeholder="Exemple : Milo découvre une mystérieuse forêt magique et trouve un cristal lumineux..." />
        <div className="row">
          <div className="field"><label>Durée</label><select value={active.duration} onChange={e=>update({duration:Number(e.target.value)})}>
            {[15,30,60,90,120,180].map(x=><option key={x}>{x}</option>)}
          </select></div>
          <div className="field"><label>Format</label><select value={active.format} onChange={e=>update({format:e.target.value})}>
            <option>9:16</option><option>16:9</option><option>1:1</option>
          </select></div>
          <div className="field"><label>Résolution</label><select value={active.resolution} onChange={e=>update({resolution:e.target.value})}>
            <option>720p</option><option>1080p</option>
          </select></div>
        </div>
      </div>

      <div className="card">
        <label>Direction visuelle</label>
        <select value={active.style} onChange={e=>update({style:e.target.value})}>
          <option>Animation 3D cinématographique</option>
          <option>Animation 3D familiale</option>
          <option>Cartoon 3D coloré</option>
          <option>Cinématique fantastique</option>
        </select>
        <label>Émotion</label>
        <select value={active.emotion} onChange={e=>update({emotion:e.target.value})}>
          <option>Joyeux et émerveillé</option><option>Aventureux</option><option>Mystérieux</option><option>Énergique</option>
        </select>
        <div className="toggles">
          <Toggle icon={<Mic2/>} text="Voix française d'enfant" on/>
          <Toggle icon={<Music2/>} text="Musique" on={active.music} setOn={v=>update({music:v})}/>
          <Toggle icon={<Volume2/>} text="Bruitages" on={active.sfx} setOn={v=>update({sfx:v})}/>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="section-head"><div><h3>Personnage</h3><p>Milo est verrouillé comme référence officielle.</p></div><span className="status ok">Référence active</span></div>
      <div className="character">
        <div className="avatar">🐻</div><div><b>Milo</b><p>{MILO.voice}</p></div>
      </div>
      <details><summary>Voir la description utilisée pour les moteurs</summary><p className="muted">{MILO.visual}</p></details>
    </div>

    <div className="card">
      <div className="section-head"><div><h3>Scènes</h3><p>Le découpage peut être préparé automatiquement à partir de ton idée.</p></div>
        <button className="secondary" onClick={generatePlan}><WandSparkles size={16}/> Préparer les scènes</button>
      </div>
      {active.scenes.length===0 ? <div className="empty">Aucune scène préparée.</div> :
        <div className="scenes">{active.scenes.map(s=><div className="scene" key={s.id}><span>{s.number}</span><div><b>{s.title}</b><p>{s.description}</p></div><span className="status ok">{s.status}</span></div>)}</div>}
    </div>

    <div className="actions">
      <button className="secondary" onClick={()=>setPage("engines")}>Vérifier les moteurs</button>
      <button className="primary" onClick={startGeneration} disabled={generating}>
        <Sparkles size={18}/>{generating ? "Génération..." : "Générer la vidéo"}
      </button>
    </div>
  </section>;
}

function Toggle({icon,text,on,setOn=()=>{}}){
  return <button className="toggle" onClick={()=>setOn(!on)}><span>{icon}</span><b>{text}</b><i className={on?"switch on":"switch"}><em/></i></button>
}

function Library({projects,setActive,setPage}){
  const done=projects.filter(p=>p.status==="Terminé");
  return <section className="content"><div className="card"><div className="section-head"><div><h3>Bibliothèque</h3><p>Résultats réellement produits par un moteur connecté.</p></div></div>
    {done.length===0 ? <div className="empty"><FolderOpen size={32}/><b>Aucune vidéo générée</b><span>Les vidéos apparaîtront ici après une génération réelle.</span></div> :
      done.map(p=><div className="library-item" key={p.id}><div className="thumb"><Play/></div><div><b>{p.name}</b><p>{p.format} · {p.duration}s · {p.resolution}</p></div></div>)}
  </div></section>
}

function Characters(){
  return <section className="content"><div className="card character-large"><div className="avatar big">🐻</div><div><span className="eyebrow">Personnage par défaut</span><h2>Milo</h2><p>{MILO.personality}</p><p className="muted">{MILO.visual}</p><span className="status ok">Référence verrouillée</span></div></div></section>
}

function Projects({projects,setActive,setPage,duplicate,remove}){
  return <section className="content"><div className="card"><div className="section-head"><div><h3>Projets</h3><p>Gère tes aventures et leurs scènes.</p></div><button className="primary small" onClick={()=>{setActive({...defaultProject,id:crypto.randomUUID()});setPage("create")}}><Plus size={16}/> Nouveau</button></div>
  {projects.map(p=><div className="project" key={p.id}><div className="project-icon"><Film/></div><div className="grow"><b>{p.name}</b><p>{p.format} · {p.duration}s</p></div><span className={"status "+(p.status==="Terminé"?"ok":"")}>{p.status}</span>
    <button className="icon-btn" title="Ouvrir" onClick={()=>{setActive(p);setPage("create")}}><Play size={16}/></button>
    <button className="icon-btn" title="Dupliquer" onClick={()=>duplicate(p)}><Copy size={16}/></button>
    <button className="icon-btn danger" title="Supprimer" onClick={()=>remove(p.id)}><Trash2 size={16}/></button>
  </div>)}</div></section>
}

function Engines({engine,setEngine}){
  const rows=[
    ["VIDEO","Moteur vidéo","Génération image → vidéo"],
    ["AUDIO / TTS","Voix française","Synthèse vocale"],
    ["LIP-SYNC","Synchronisation labiale","Bouche + voix"],
    ["MUSIQUE","Musique","Fond musical"],
    ["SFX","Bruitages","Effets sonores"],
    ["ASSEMBLAGE","Montage","Assemblage final"]
  ];
  return <section className="content"><div className="card"><div className="section-head"><div><h3>État des moteurs</h3><p>Aucun moteur n'est déclaré connecté par défaut.</p></div><AlertCircle size={22}/></div>
    {rows.map((r,i)=><div className="engine-row" key={r[0]}><div><span className="engine-type">{r[0]}</span><b>{r[1]}</b><p>{r[2]}</p></div><span className={"status "+(i===0&&engine==="Connecté"?"ok":"")}>{i===0&&engine==="Connecté"?"Connecté":"Non connecté"}</span></div>)}
    <div className="notice"><AlertCircle size={17}/> Cette version ne simule aucune génération. Branche un vrai moteur avant de lancer une production.</div>
    <button className="primary" onClick={()=>setEngine("Connecté")}>Marquer le moteur vidéo comme connecté (test)</button>
  </div></section>
}

function SettingsPage(){
  return <section className="content"><div className="card"><h3>Paramètres</h3><p className="muted">Les valeurs sont volontairement simples pour commencer. Les clés secrètes doivent rester côté serveur.</p>
    <div className="setting"><b>Personnage par défaut</b><span>Milo</span></div>
    <div className="setting"><b>Format par défaut</b><span>9:16</span></div>
    <div className="setting"><b>Voix</b><span>Français · jeune garçon</span></div>
    <div className="setting"><b>Génération</b><span>Mode réel uniquement</span></div>
  </div></section>
}

createRoot(document.getElementById("root")).render(<App />);
