export function createComic(form) {
  return {
    id: `comic-${Date.now()}`,
    title: form.title.trim(),
    description: form.description.trim(),
    subject: form.subject,
    educationLevel: form.educationLevel || "SMA",
    grade: form.grade,
    className: form.className,
    school: form.school || "",
    status: form.status,
    version: "0.1",
    coverUrl: form.coverUrl || "",
    createdBy: form.createdBy || "current-teacher",
    updatedAt: new Date().toISOString().slice(0, 10),
    concepts: form.concepts || [],
    episodes: [],
    questions: [],
  };
}
export function updateComic(comics, updated) {
  return comics.map((c) => c.id === updated.id ? { ...updated, updatedAt: new Date().toISOString().slice(0, 10) } : c);
}
