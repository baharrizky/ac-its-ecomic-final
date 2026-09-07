const KEY = "ac-its-ecomic-session-v2";

const accounts = {
  teacher: { email: "guru@acits.id", password: "guru123", role: "teacher", name: "Aulia Fadhilah Rinaldi", subtitle: "Guru" },
  student: { email: "siswa@acits.id", password: "siswa123", role: "student", name: "Ahmad", subtitle: "Siswa" },
};

export function getSession(){
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
export function login(role, email, password){
  const account = accounts[role];
  if (!account || account.email !== email.trim().toLowerCase() || account.password !== password) {
    return { ok:false, message:"Email atau password tidak sesuai." };
  }
  const session = { role:account.role, name:account.name, subtitle:account.subtitle, email:account.email, loggedAt:new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(session));
  return { ok:true, session };
}
export function logout(){ localStorage.removeItem(KEY); }
export const demoAccounts = accounts;
