import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Brand, FieldError, SubmitButton, ThemeButton } from "./components";
import { useAuth } from "./context";
export default function AuthPage({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get("next") || "/app";
  const next =
    requested.startsWith("/app") || requested.startsWith("/nova-viagem")
      ? requested
      : "/app";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="auth-page">
      <div className="auth-picture">
        <img src="/images/italy.jpg" alt="Vista de Roma, Itália" />
        <div className="auth-picture-shade" />
        <Brand />
        <div className="auth-picture-copy">
          <span className="eyebrow">MENOS ABAS ABERTAS. MAIS MUNDO.</span>
          <h2>
            A viagem começa
            <br />
            muito antes
            <br />
            <em>da partida.</em>
          </h2>
          <span>
            Roma, Itália <span>41°53′ N · 12°29′ E</span>
          </span>
        </div>
        <span className="auth-picture-footer">
          UM LUGAR PARA TODOS OS SEUS PLANOS
        </span>
      </div>
      <div className="auth-panel">
        <header>
          <Link to="/" className="text-link">
            <ArrowLeft size={15} />
            Voltar ao Tabi
          </Link>
          <ThemeButton />
        </header>
        <div className="auth-form-wrap">
          <span className="eyebrow">
            {register ? "O SEU MUNDO COMEÇA AQUI" : "BOM TER VOCÊ DE VOLTA"}
          </span>
          <h1>
            {register
              ? "Toda jornada merece um começo."
              : "Seus planos estão esperando."}
          </h1>
          <p className="muted">
            {register
              ? "Crie sua conta e leve suas viagens com você."
              : "Entre para continuar de onde parou."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                if (register)
                  await auth.register(name.trim(), email.trim(), password);
                else await auth.login(email.trim(), password);
                navigate(next, { replace: true });
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {register && (
              <label className="field">
                Seu nome
                <input
                  required
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos chamar você?"
                />
              </label>
            )}
            <label className="field">
              E-mail
              <input
                required
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </label>
            <label className="field">
              Senha
              <div className="password-field">
                <input
                  required
                  type={show ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  autoComplete={register ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    register ? "Pelo menos 8 caracteres" : "Sua senha"
                  }
                />
                <button
                  type="button"
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            <FieldError message={error} />
            <SubmitButton busy={busy} className="button primary full">
              {register ? "Criar minha conta" : "Entrar na minha conta"}
              <ArrowRight size={16} />
            </SubmitButton>
          </form>
          <div className="auth-switch">
            {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
            <Link
              to={
                (register ? "/entrar" : "/cadastro") +
                "?next=" +
                encodeURIComponent(next)
              }
            >
              {register ? "Entrar" : "Começar agora"}
            </Link>
          </div>
          <p className="auth-privacy">
            <ShieldCheck size={14} />
            Seus planos são privados e ficam na sua conta.
          </p>
        </div>
        <footer>Seu destino, seus dias, seu jeito.</footer>
      </div>
    </main>
  );
}
