import React from "react";
import Badge from "../common/Badge";
import MediaImage from "../media/MediaImage";
import katex from "katex";
import "katex/dist/katex.min.css";

function renderDescription(value){
 const text=String(value||"");
 const parts=text.split(/([A-Za-z0-9]+\^[A-Za-z0-9]+|[A-Za-z0-9]+\/[A-Za-z0-9]+)/g);
 return parts.map((part,i)=>{
   if(/^[A-Za-z0-9]+\^[A-Za-z0-9]+$/.test(part)){
     try{return <span key={i} dangerouslySetInnerHTML={{__html:katex.renderToString(part,{displayMode:false,throwOnError:false})}}/>}catch{}
   }
   if(/^[A-Za-z0-9]+\/[A-Za-z0-9]+$/.test(part)){
     const [a,b]=part.split("/");
     try{return <span key={i} dangerouslySetInnerHTML={{__html:katex.renderToString(`\\frac{${a}}{${b}}`,{displayMode:false,throwOnError:false})}}/>}catch{}
   }
   return <React.Fragment key={i}>{part}</React.Fragment>;
 });
}

export default function ComicCard({
  comic,
  teacher = false,
  onOpen,
  onEdit,
}) {
  // Mendukung beberapa format data cover
  const cover =
    comic?.coverUrl ||
    comic?.cover ||
    comic?.coverImage ||
    comic?.thumbnailUrl ||
    "";

  return (
    <article className="card comic-card">

      <div className="cover">
        {cover ? (
          <MediaImage
            src={cover}
            alt={`Cover ${comic?.title || "E-Comic"}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            fallback={
              <div className="cover-icon">
                📖
              </div>
            }
          />
        ) : (
          <div className="cover-icon">
            📖
          </div>
        )}
      </div>

      <div className="comic-body">

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <h3 className="comic-title">
            {comic?.title || "Tanpa judul"}
          </h3>

          <Badge
            tone={
              comic?.status === "Published"
                ? "green"
                : "amber"
            }
          >
            {comic?.status || "Draft"}
          </Badge>
        </div>

        <div className="comic-desc">
          {renderDescription(comic?.description)}
        </div>

        <div className="tag-row">

          <Badge>
            {comic?.educationLevel || "SMA"}
          </Badge>

          <Badge>
            Kelas {comic?.grade || "X"}
          </Badge>

          <Badge>
            {comic?.subject || "Matematika"}
          </Badge>

          <Badge>
            {Array.isArray(comic?.episodes)
              ? comic.episodes.length
              : 0}{" "}
            episode
          </Badge>

        </div>

        <div className="actions">

          <button
            className="btn-primary"
            onClick={() =>
              onOpen?.(comic.id)
            }
          >
            Preview
          </button>

          {teacher && (
            <button
              className="btn"
              onClick={() =>
                onEdit?.(comic.id)
              }
            >
              Edit
            </button>
          )}

        </div>

      </div>

    </article>
  );
}