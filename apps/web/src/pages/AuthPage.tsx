import { FormEvent, useState } from "react";
import { Gauge } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type AuthMode = "login" | "register";

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      if (mode === "login") {
        await signIn({
          email: String(form.get("email")),
          password: String(form.get("password"))
        });
      } else {
        await signUp({
          email: String(form.get("email")),
          name: String(form.get("name")),
          password: String(form.get("password"))
        });
      }

      navigate("/");
    } catch {
      setError(mode === "login" ? "邮箱或密码不正确" : "注册失败，请检查信息或系统设置");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <Gauge size={20} aria-hidden="true" />
          </span>
          <div>
            <strong>UsageMeter</strong>
            <small>API 用量计费与限流平台</small>
          </div>
        </div>
        <div className="tab-list" role="tablist" aria-label="认证方式">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "tab-button active" : "tab-button"} onClick={() => setMode("login")}>
            登录
          </button>
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "tab-button active" : "tab-button"} onClick={() => setMode("register")}>
            注册
          </button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" ? <input name="name" placeholder="姓名" required /> : null}
          <input name="email" type="email" placeholder="邮箱" required />
          <input name="password" type="password" placeholder="密码，至少 8 位" minLength={8} required />
          {error ? <div className="inline-error">{error}</div> : null}
          <button type="submit">{mode === "login" ? "登录后台" : "创建账号"}</button>
        </form>
      </section>
    </main>
  );
}
