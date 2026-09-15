import React from "react";
import { Medal } from "lucide-react";
export default function RankingPage({studentModel,session}){
 return <div><div className="page-kicker">Gamification</div><h1 className="page-title">Peringkat</h1><p className="page-desc">Papan peringkat akan terbentuk dari siswa yang benar-benar terdaftar dan aktif belajar.</p><div className="card"><div className="empty-state"><strong>Belum ada data peringkat kelas.</strong><span>{session?.name?`XP ${session.name}: ${studentModel.xp}`:"Data XP siswa belum tersedia."} · Peringkat akan terisi setelah data siswa dan aktivitas belajar tersedia.</span></div></div></div>
}
