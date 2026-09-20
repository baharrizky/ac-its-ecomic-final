export function createComic(form) {
  return {
    id: `comic-${Date.now()}`,

    title: String(form.title || "").trim(),

    description: String(form.description || "").trim(),

    subject: form.subject || "Matematika",

    educationLevel:
      form.educationLevel || "SMA",

    grade:
      form.grade || "X",

    // E-Comic tidak terikat ke satu rombel.
    // Rombel hanya menjadi konteks tracking siswa.
    className:
      form.className || "",

    rombel:
      form.rombel || "",

    classAccessCodeId:
      form.classAccessCodeId || "",

    classTeacherUid:
      form.classTeacherUid ||
      form.ownerTeacherUid ||
      "",

    school:
      form.school || "",

    status:
      form.status || "Draft",

    version:
      "0.1",

    coverUrl:
      form.coverUrl || "",

    /*
     * PENTING
     * Ownership utama E-Comic.
     */
    ownerTeacherUid:
      form.ownerTeacherUid ||
      form.classTeacherUid ||
      "",

    /*
     * Dipertahankan untuk kompatibilitas
     * dengan data lama.
     */
    createdBy:
      form.createdBy ||
      form.ownerTeacherUid ||
      form.classTeacherUid ||
      "",

    updatedAt:
      new Date().toISOString(),

    concepts:
      Array.isArray(form.concepts)
        ? form.concepts
        : [],

    episodes:
      Array.isArray(form.episodes)
        ? form.episodes
        : [],

    questions:
      Array.isArray(form.questions)
        ? form.questions
        : [],

    assignedClassIds:
      Array.isArray(form.assignedClassIds)
        ? form.assignedClassIds
        : [],
  };
}

export function updateComic(comics, updated) {
  return comics.map((c) =>
    c.id === updated.id
      ? {
          ...updated,
          updatedAt:
            new Date().toISOString(),
        }
      : c
  );
}