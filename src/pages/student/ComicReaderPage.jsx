import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ClipboardList, Info, Lightbulb, Maximize2, MessageCircle, Minimize2, PanelRight, PlayCircle, TrendingUp, Users, X } from "lucide-react";
import Badge from "../../components/common/Badge";
import { concepts } from "../../data/demoData";
import MediaImage from "../../components/media/MediaImage";
import "katex/dist/katex.min.css";
import katex from "katex";

const tabs = [
  { id: "tutor", label: "Tutor", icon: MessageCircle },
  { id: "tokoh", label: "Tokoh", icon: Users },
  { id: "kuis", label: "Kuis", icon: ClipboardList },
  { id: "materi", label: "Materi", icon: BookOpen },
  { id: "progres", label: "Progres", icon: TrendingUp },
];

function renderEquation(equation) {
  if (!equation) return null;
  try {
    return katex.renderToString(equation, { displayMode: true, throwOnError: false });
  } catch {
    return equation;
  }
}

export default function ComicReaderPage({ comic, studentModel, navigate }) {
  const [ei, setEi] = useState(0);
  const [pi, setPi] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [infoTab, setInfoTab] = useState("tutor");

  const episode = comic?.episodes?.[ei];
  const panel = episode?.panels?.[pi];
  const totalPanels = useMemo(() => (comic?.episodes || []).reduce((sum, ep) => sum + (ep.panels?.length || 0), 0), [comic]);
  const currentGlobalPanel = useMemo(() => {
    if (!comic) return 0;
    return comic.episodes.slice(0, ei).reduce((sum, ep) => sum + (ep.panels?.length || 0), 0) + pi + 1;
  }, [comic, ei, pi]);
  const overallProgress = totalPanels ? Math.round((currentGlobalPanel / totalPanels) * 100) : 0;

  useEffect(() => {
    if (!focusMode) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") setFocusMode(false);
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  if (!comic) return <div className="empty">Comic tidak ditemukan.</div>;
  if (!episode || !panel) {
    return (
      <div>
        <button className="btn" onClick={() => navigate("comic-library")}>← Kembali</button>
        <div className="card empty" style={{ marginTop: 14 }}>Belum ada episode yang diterbitkan.</div>
      </div>
    );
  }

  const conceptId = panel.conceptIds?.[0];
  const conceptName = concepts[conceptId]?.name || conceptId || "Konsep pembelajaran";
  const mastery = conceptId ? studentModel?.concepts?.[conceptId]?.mastery : null;
  const equationHtml = renderEquation(panel.equation);

  function next() {
    if (pi < episode.panels.length - 1) setPi((value) => value + 1);
    else if (ei < comic.episodes.length - 1) {
      setEi((value) => value + 1);
      setPi(0);
    }
  }

  function prev() {
    if (pi > 0) setPi((value) => value - 1);
    else if (ei > 0) {
      const previousEpisodeIndex = ei - 1;
      setEi(previousEpisodeIndex);
      setPi(Math.max(0, (comic.episodes[previousEpisodeIndex].panels?.length || 1) - 1));
    }
  }

  function jumpToEpisode(index) {
    setEi(index);
    setPi(0);
  }

  const content = (
    <div className={`reader-page ${focusMode ? "reader-page-focus" : ""}`}>
      <div className="reader-toolbar">
        <button className="btn" onClick={() => navigate("comic-library")}>← Koleksi</button>
        <div className="reader-breadcrumb">
          <strong>{comic.title}</strong>
          <span>Episode {ei + 1} · {episode.title}</span>
        </div>
        <div className="reader-actions">
          <span className="reader-progress-pill">{overallProgress}% selesai</span>
          <button className="btn" onClick={() => setFocusMode((value) => !value)}>
            {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {focusMode ? "Kembali ke normal" : "Mode baca"}
          </button>
          {focusMode && <button className="reader-icon-close" aria-label="Keluar mode baca" onClick={() => setFocusMode(false)}><X size={18} /></button>}
        </div>
      </div>

      <div className="reader-shell">
        <section className="reader-main-card">
          <div className="reader-heading">
            <div>
              <div className="page-kicker">{comic.subject || "Matematika"} · Episode {ei + 1}</div>
              <h1>{episode.title}</h1>
              {comic.description && <p className="reader-description">{comic.description}</p>}
            </div>
            <div className="reader-panel-meta">
              <span>Panel {pi + 1}/{episode.panels.length}</span>
              <b>{overallProgress}%</b>
            </div>
          </div>

          <div className="reader-progress-track"><span style={{ width: `${overallProgress}%` }} /></div>

          <div className="reader-art-wrap">
            <div className="reader-art-frame">
              {panel.imageUrl ? (
                <MediaImage
                  src={panel.imageUrl}
                  alt={panel.title || `Panel ${pi + 1}`}
                  style={{ width: "100%", height: "auto", maxWidth: "100%", display: "block", objectFit: "contain", objectPosition: "center", borderRadius: 14 }}
                  fallback={<div className="reader-art-fallback"><BookOpen size={40} /><span>Gambar panel belum tersedia.</span></div>}
                />
              ) : (
                <div className="reader-art-fallback"><BookOpen size={40} /><span>Gambar panel belum tersedia.</span></div>
              )}
            </div>
          </div>

          <div className="reader-content-grid">
            <div className="reader-text-card">
              <div className="reader-section-title"><Info size={16} /> Cerita pada panel</div>
              <h3>{panel.title || "Panel pembelajaran"}</h3>
              {panel.narration && <p>{panel.narration}</p>}
              {panel.dialogue && <div className="reader-dialogue">“{panel.dialogue}”</div>}
              {equationHtml && <div className="equation-preview reader-equation" dangerouslySetInnerHTML={{ __html: equationHtml }} />}
            </div>

            <div className="reader-concept-card">
              <div className="reader-section-title"><Lightbulb size={16} /> Fokus belajar</div>
              <Badge tone="blue">{conceptId || "Konsep"}</Badge>
              <h3>{conceptName}</h3>
              {mastery != null ? (
                <>
                  <div className="subtle">Mastery siswa: {Math.round(mastery * 100)}%</div>
                  <div className="progress" style={{ marginTop: 7 }}><span style={{ width: `${mastery * 100}%` }} /></div>
                </>
              ) : <p className="subtle">Konsep ini akan menjadi konteks untuk Tutor AI dan latihan adaptif.</p>}
            </div>
          </div>

          <div className="reader-footer-nav">
            <button className="btn" disabled={ei === 0 && pi === 0} onClick={prev}>← Sebelumnya</button>
            <div className="reader-counter"><span>{currentGlobalPanel}</span> / {totalPanels || 1}</div>
            <button className="btn-primary" onClick={next}>Selanjutnya →</button>
          </div>
        </section>

        <aside className="reader-side-card">
          <div className="reader-side-tabs">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} className={infoTab === id ? "active" : ""} onClick={() => setInfoTab(id)}>
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="reader-side-body">
            {infoTab === "tutor" && (
              <div className="reader-info-panel ai">
                <div className="reader-info-icon"><MessageCircle size={18} /></div>
                <h3>Tanya AI tentang panel ini</h3>
                <p>Gunakan konteks komik, episode, konsep, dan profil belajar untuk memahami bagian yang masih membingungkan.</p>
                <button className="btn-primary full" onClick={() => navigate("tutor", comic.id)}>Tanya AI Tutor →</button>
              </div>
            )}

            {infoTab === "tokoh" && (
              <div className="reader-info-panel">
                <div className="reader-info-icon"><Users size={18} /></div>
                <h3>Tokoh & konteks</h3>
                <p>Panel ini dapat dilengkapi dengan karakter, peran, dan konteks cerita dari guru agar alurnya lebih interaktif.</p>
                <div className="reader-mini-note">Data tokoh akan mengikuti konten yang diatur guru.</div>
              </div>
            )}

            {infoTab === "kuis" && (
              <div className="reader-info-panel">
                <div className="reader-info-icon"><ClipboardList size={18} /></div>
                <h3>Cek pemahaman cepat</h3>
                <p>Setelah membaca panel, siswa dapat diarahkan ke soal adaptif berdasarkan konsep yang sedang dibahas.</p>
                <button className="btn-primary full" onClick={() => navigate("practice")}>Mulai latihan →</button>
              </div>
            )}

            {infoTab === "materi" && (
              <div className="reader-info-panel">
                <div className="reader-info-icon"><BookOpen size={18} /></div>
                <h3>Ringkasan materi</h3>
                <div className="reader-material-box">
                  <strong>{conceptName}</strong>
                  <span>{comic.subject || "Matematika"} · {comic.grade || ""}</span>
                </div>
                <p className="subtle">Materi tambahan dapat ditautkan guru pada konsep ini agar siswa memiliki sumber belajar yang saling terhubung.</p>
              </div>
            )}

            {infoTab === "progres" && (
              <div className="reader-info-panel">
                <div className="reader-info-icon"><TrendingUp size={18} /></div>
                <h3>Progress membaca</h3>
                <div className="reader-stat-row"><span>Panel dibaca</span><strong>{currentGlobalPanel}/{totalPanels || 1}</strong></div>
                <div className="reader-stat-row"><span>Progress</span><strong>{overallProgress}%</strong></div>
                <div className="progress" style={{ marginTop: 8 }}><span style={{ width: `${overallProgress}%` }} /></div>
              </div>
            )}
          </div>

          <div className="reader-episode-list">
            <div className="reader-section-title"><PanelRight size={16} /> Episode</div>
            {comic.episodes.map((item, index) => (
              <button key={item.id} className={index === ei ? "active" : ""} onClick={() => jumpToEpisode(index)}>
                <span>Episode {index + 1}</span>
                <strong>{item.title}</strong>
                <small>{item.panels?.length || 0} panel</small>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <div className="reader-tip-bar">
        <PlayCircle size={15} />
        <span>Tips: gunakan <strong>←</strong> dan <strong>→</strong> pada keyboard untuk berpindah panel saat Mode Baca aktif.</span>
      </div>
    </div>
  );

  return focusMode ? <div className="reader-focus-overlay">{content}</div> : content;
}
