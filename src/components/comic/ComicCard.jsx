import React from "react";
import Badge from "../common/Badge";
import MediaImage from "../media/MediaImage";

export default function ComicCard({ comic, teacher = false, onOpen, onEdit }) {
  return (
    <article className="card comic-card">
      <div className="cover">
        {comic.coverUrl ? (
          <MediaImage src={comic.coverUrl} alt={`Cover ${comic.title}`} style={{width:"100%",height:"100%",objectFit:"cover"}} fallback={<div className="cover-icon">📖</div>} />
        ) : <div className="cover-icon">📖</div>}
      </div>
      <div className="comic-body">
        <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
          <h3 className="comic-title">{comic.title}</h3>
          <Badge tone={comic.status === "Published" ? "green" : "amber"}>{comic.status}</Badge>
        </div>
        <div className="comic-desc">{comic.description}</div>
        <div className="tag-row">
          <Badge>{comic.educationLevel || "SMA"}</Badge>
          <Badge>Kelas {comic.grade}</Badge>
          <Badge>{comic.subject}</Badge>
          <Badge>{comic.episodes.length} episode</Badge>
        </div>
        <div className="actions">
          <button className="btn-primary" onClick={() => onOpen(comic.id)}>Preview</button>
          {teacher && <button className="btn" onClick={() => onEdit(comic.id)}>Edit</button>}
        </div>
      </div>
    </article>
  );
}
