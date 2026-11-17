import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  Link2,
  LoaderCircle,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { Trip, TripSharing } from "../shared/schema";
import { api } from "./api";
import { FieldError, Modal } from "./components";
import { useNotice } from "./context";

function ShareLink({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const notice = useNotice();
  const url = new URL(path, window.location.origin).href;
  return (
    <div className="share-link">
      <label className="field">
        {label}
        <input
          ref={input}
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <button
        className="button secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            notice("Link copiado. Agora é só enviar para quem você quiser.");
          } catch {
            input.current?.focus();
            input.current?.select();
            notice("Selecione e copie o endereço do link.");
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export default function Sharing({
  trip,
  onClose,
}: {
  trip: Trip;
  onClose: () => void;
}) {
  const [sharing, setSharing] = useState<TripSharing | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const notice = useNotice();
  const base = `/trips/${trip.id}`;
  useEffect(() => {
    if (busy) return;
    const controller = new AbortController();
    let checking = false;
    const refresh = async () => {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const r = await api<{ sharing: TripSharing }>(base + "/sharing", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setSharing(r.sharing);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      } finally {
        checking = false;
      }
    };
    const check = () => {
      void refresh();
    };
    check();
    const interval = setInterval(check, 10000);
    window.addEventListener("focus", check);
    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [base, busy]);
  async function update(
    path: string,
    method: "POST" | "DELETE",
    message: string,
  ) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ sharing: TripSharing }>(base + path, {
        method,
      });
      setSharing(result.sharing);
      setConfirmRemove(null);
      notice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Sua viagem, em boa companhia."
      description="Compartilhe para acompanhar ou convide para planejar junto."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <FieldError message={error} />
      {!sharing && !error && (
        <p className="sharing-loading" role="status">
          <LoaderCircle className="spin" size={18} /> Carregando
          compartilhamento…
        </p>
      )}
      {sharing && (
        <div className="sharing-content" aria-busy={busy}>
          <section className="sharing-section">
            <div className="sharing-title">
              <span>
                <Eye size={20} />
              </span>
              <div>
                <h3>Compartilhar a jornada</h3>
                <p>Para amigos e família acompanharem, sem criar conta.</p>
              </div>
            </div>
            <p className="sharing-explanation">
              Mostra destino, datas, cidades e passeios. Orçamento, reservas e
              anotações continuam privados. Quem abrir só pode visualizar.
            </p>
            {sharing.publicPath ? (
              <>
                <span className="access-badge">
                  <span /> Link público ativo
                </span>
                <ShareLink
                  key={sharing.publicPath}
                  path={sharing.publicPath}
                  label="Link de visualização"
                />
                <div className="sharing-actions">
                  <a
                    className="text-link"
                    href={sharing.publicPath}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver como visitante <ArrowUpRight size={15} />
                  </a>
                  <button
                    className="text-link danger-text"
                    disabled={busy}
                    onClick={() =>
                      void update(
                        "/sharing",
                        "DELETE",
                        "Link desativado. Ele não permite mais visualizar sua viagem.",
                      )
                    }
                  >
                    Desativar link
                  </button>
                </div>
              </>
            ) : (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void update("/sharing", "POST", "Link público criado.")
                }
              >
                <Link2 size={16} /> Criar link de visualização
              </button>
            )}
          </section>
          <section className="sharing-section">
            <div className="sharing-title">
              <span>
                <UserPlus size={20} />
              </span>
              <div>
                <h3>Convidar para planejar</h3>
                <p>Quem aceitar poderá editar o planejamento com você.</p>
              </div>
            </div>
            <p className="sharing-explanation">
              A pessoa entra ou cria uma conta antes de participar. Cada convite
              vale por 7 dias e pode ser aceito por uma pessoa.
            </p>
            {sharing.invite ? (
              <>
                <ShareLink
                  key={sharing.invite.path}
                  path={sharing.invite.path}
                  label="Convite para participar"
                />
                <p className="input-hint">
                  Válido até{" "}
                  {new Date(sharing.invite.expiresAt).toLocaleDateString(
                    "pt-BR",
                  )}
                  .
                </p>
                <div className="sharing-actions">
                  <span className="input-hint">
                    Aceitar o convite libera acesso ao planejamento completo.
                  </span>
                  <button
                    className="text-link danger-text"
                    disabled={busy}
                    onClick={() =>
                      void update("/invite", "DELETE", "Convite cancelado.")
                    }
                  >
                    Cancelar convite
                  </button>
                </div>
              </>
            ) : (
              <button
                className="button primary"
                disabled={busy || sharing.members.length >= 20}
                onClick={() =>
                  void update(
                    "/invite",
                    "POST",
                    "Convite criado. Copie o link e envie para a pessoa.",
                  )
                }
              >
                <UserPlus size={16} /> Criar convite
              </button>
            )}
          </section>
          <section className="sharing-section">
            <div className="sharing-title">
              <span>
                <Users size={20} />
              </span>
              <div>
                <h3>
                  Quem está nessa viagem{" "}
                  <small>({sharing.members.length})</small>
                </h3>
                <p>Só você controla os acessos e exclui a viagem.</p>
              </div>
            </div>
            <div className="sharing-members">
              {sharing.members.map((member) => (
                <div className="sharing-member" key={member.id}>
                  <span className="member-avatar">
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{member.name}</strong>
                    <small>
                      {member.role === "owner"
                        ? "Organizador · você"
                        : "Participante · pode editar"}
                    </small>
                  </div>
                  {member.role === "editor" &&
                    (confirmRemove === member.id ? (
                      <div className="member-confirm">
                        <button
                          disabled={busy}
                          className="text-link danger-text"
                          onClick={() =>
                            void update(
                              `/members/${member.id}`,
                              "DELETE",
                              "Participante removido. O acesso à viagem foi encerrado.",
                            )
                          }
                        >
                          Confirmar remoção
                        </button>
                        <button
                          className="text-link"
                          disabled={busy}
                          onClick={() => setConfirmRemove(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() => setConfirmRemove(member.id)}
                      >
                        Remover
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </section>
          <p className="sharing-footnote">
            <ShieldCheck size={16} /> A viagem continua privada enquanto você
            não criar um link ou convite.
          </p>
        </div>
      )}
    </Modal>
  );
}
