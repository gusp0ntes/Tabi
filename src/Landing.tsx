import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Compass,
  Globe2,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { featured } from "../shared/destinations";
import { Brand, Modal, ThemeButton } from "./components";
import { useAuth } from "./context";
export default function Landing() {
  const { user } = useAuth();
  const [privacy, setPrivacy] = useState(false);
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <nav aria-label="Menu do site">
          <a href="#como-funciona">Como funciona</a>
          <a href="#destinos">Inspire-se</a>
        </nav>
        <div>
          <ThemeButton />
          <Link className="login-link" to={user ? "/app" : "/entrar"}>
            {user ? "Minhas viagens" : "Entrar"}
          </Link>
          <Link className="button primary compact-button" to="/nova-viagem">
            Começar uma viagem
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <span className="hero-tag">
              <span />
              PARA ONDE A VIDA LEVAR VOCÊ
            </span>
            <h1>
              O mundo é grande.
              <br />O próximo capítulo
              <br />é <em>seu.</em>
              <span className="headline-star">✳</span>
            </h1>
            <p>
              Um lugar para os destinos que você sonha,
              <br className="desktop-only" /> os planos que faz e as histórias
              que vai viver.
            </p>
            <Link className="button primary large" to="/nova-viagem">
              Começar minha jornada
              <ArrowRight size={18} />
            </Link>
            <span className="hero-reassurance">
              <Check size={13} />
              Seu roteiro, orçamento e reservas, juntos.
            </span>
            <div className="landing-little-note">
              <span>01</span>
              <i />
              <span>ESCOLHA UM DESTINO. O RESTO GANHA FORMA.</span>
            </div>
          </div>
          <div
            className="travel-collage"
            aria-label="Inspiração de destinos pelo mundo"
          >
            <div className="collage-circle" />
            <Link
              to="/nova-viagem?pais=IT&cidade=Roma"
              className="travel-print print-italy"
            >
              <img src="/images/italy.jpg" alt="Coliseu em Roma, Itália" />
              <span>
                <MapPin size={12} />
                Roma, Itália
                <ArrowUpRight size={14} />
              </span>
              <small>LA DOLCE VITA</small>
            </Link>
            <Link
              to="/nova-viagem?pais=JP"
              className="travel-print print-japan"
            >
              <img
                src="/images/japan.jpg"
                alt="Pagoda Yasaka e ruas de Kyoto, Japão"
              />
              <span>
                <MapPin size={12} />
                Kyoto, Japão
                <ArrowUpRight size={14} />
              </span>
              <small lang="ja">次の旅へ</small>
            </Link>
            <Link
              to="/nova-viagem?pais=US&cidade=Nova%20York"
              className="travel-print print-ny"
            >
              <img
                src="/images/new-york.jpg"
                alt="Vista de Nova York, Estados Unidos"
              />
              <span>
                <MapPin size={12} />
                Nova York
                <ArrowUpRight size={14} />
              </span>
            </Link>
            <div className="collage-ticket">
              <span className="ticket-compass">
                <Compass size={24} strokeWidth={1} />
              </span>
              <span>
                Destino escolhido.<strong>Agora é com você.</strong>
              </span>
              <i />
              <ArrowUpRight size={17} />
            </div>
            <span className="collage-caption">
              COLECIONE HISTÓRIAS, NÃO ABAS ABERTAS.
            </span>
            <span className="collage-spark">✳</span>
          </div>
        </section>
        <div className="landing-benefits">
          <span>
            <Route size={17} />
            Um roteiro que se adapta
          </span>
          <i />
          <span>
            <Wallet size={17} />
            Dinheiro bem planejado
          </span>
          <i />
          <span>
            <CalendarDays size={17} />
            Cada dia no seu lugar
          </span>
          <i />
          <span>
            <Globe2 size={17} />O mundo como destino
          </span>
        </div>
        <section className="how-section" id="como-funciona">
          <div className="landing-section-top">
            <div>
              <span className="eyebrow">
                DOS PRIMEIROS PLANOS À ÚLTIMA FOTO
              </span>
              <h2>
                Planejar também pode
                <br />
                ser <em>uma boa parte.</em>
              </h2>
            </div>
            <p>
              Você não precisa ter tudo decidido.
              <br />
              Só precisa de um ponto de partida.
            </p>
          </div>
          <div className="how-grid">
            <article>
              <span className="how-icon">
                <Globe2 size={25} strokeWidth={1.3} />
              </span>
              <small>01 / O COMEÇO</small>
              <h3>Escolha para onde ir.</h3>
              <p>
                Um país, uma cidade, alguns dias. O Tabi começa com o que você
                já sabe.
              </p>
            </article>
            <article>
              <span className="how-icon">
                <Wallet size={25} strokeWidth={1.3} />
              </span>
              <small>02 / DO SEU JEITO</small>
              <h3>Dê forma aos seus planos.</h3>
              <p>
                Organize destinos, acompanhe a sua meta e guarde tudo que
                precisa reservar.
              </p>
            </article>
            <article>
              <span className="how-icon">
                <Sparkles size={25} strokeWidth={1.3} />
              </span>
              <small>03 / HORA DE VIVER</small>
              <h3>Abra espaço para o novo.</h3>
              <p>
                Com cada detalhe em seu lugar, sobra mais tempo para descobrir o
                destino.
              </p>
            </article>
          </div>
        </section>
        <section className="destinations-section" id="destinos">
          <div className="landing-section-top">
            <div>
              <span className="eyebrow">UM POUCO DE INSPIRAÇÃO</span>
              <h2>
                Qual vai ser o seu
                <br />
                <em>próximo capítulo?</em>
              </h2>
            </div>
            <Link to="/nova-viagem" className="text-link">
              Escolher outro destino
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="destination-cards">
            {featured.slice(0, 4).map((f, i) => (
              <Link
                key={f.code}
                to={
                  "/nova-viagem?pais=" +
                  f.code +
                  (f.code === "JP"
                    ? ""
                    : "&cidade=" + encodeURIComponent(f.city))
                }
                className="destination-card"
              >
                <img
                  src={f.image}
                  alt={`Fotografia de ${f.label}`}
                  loading="lazy"
                />
                <span className="destination-index">0{i + 1}</span>
                <div>
                  <span>{f.tag}</span>
                  <h3>
                    {f.label}
                    <ArrowUpRight size={21} />
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="landing-quote">
          <span>旅</span>
          <div>
            <span className="eyebrow">TABI · DO JAPONÊS, VIAGEM</span>
            <h2>
              Os planos são seus.
              <br />
              As possibilidades, <em>do mundo.</em>
            </h2>
            <p>
              Vá sozinho, a dois ou com todo mundo.
              <br />O Tabi acompanha o seu jeito de viajar.
            </p>
            <Link className="button primary" to="/nova-viagem">
              Vamos começar?
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="quote-lines" aria-hidden="true" />
        </section>
        <section className="faq-section">
          <div>
            <span className="eyebrow">ANTES DE PARTIR</span>
            <h2>
              Ainda pensando
              <br />
              nos detalhes?
            </h2>
            <ArrowDown size={22} />
          </div>
          <div>
            {[
              [
                "Preciso ter tudo decidido para começar?",
                "Não. Escolha um destino, o número de pessoas e quantos dias pretende ficar. A data pode ficar para depois.",
              ],
              [
                "Posso mudar o roteiro depois?",
                "Sim. Adicione ou reordene cidades, ajuste dias, registre reservas e acompanhe o orçamento na sua viagem.",
              ],
              [
                "Os valores são preços reais?",
                "São estimativas iniciais em reais para ajudar a planejar. Você pode ajustar cada categoria com os preços das suas pesquisas. O Tabi não compra passagens nem reserva hotéis.",
              ],
              [
                "Onde meus planos ficam salvos?",
                "As viagens ficam na sua conta, no banco de dados do Tabi. Entre com o mesmo e-mail para continuar em outro dispositivo.",
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span>+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <Brand compact />
          <p>Um lugar para as suas próximas histórias.</p>
        </div>
        <div>
          <span>Feito para quem quer ir.</span>
          <button onClick={() => setPrivacy(true)}>
            <ShieldCheck size={13} />
            Privacidade e fontes
          </button>
        </div>
      </footer>
      {privacy && (
        <Modal
          title="Seus planos, com cuidado."
          onClose={() => setPrivacy(false)}
        >
          <div className="prose">
            <p>
              Nome, e-mail e viagens ficam associados à sua conta. As senhas são
              protegidas com hash e a sessão usa um cookie que não pode ser lido
              pelo JavaScript da página.
            </p>
            <p>
              Você pode exportar ou excluir cada viagem. Não inclua números de
              cartão, senhas de terceiros ou documentos pessoais nas anotações.
            </p>
            <p>
              Fotos:{" "}
              <a href="https://unsplash.com" target="_blank" rel="noreferrer">
                Unsplash
              </a>
              . Países:{" "}
              <a
                href="https://github.com/mledoze/countries"
                target="_blank"
                rel="noreferrer"
              >
                world-countries (ODbL)
              </a>
              . Busca de cidades:{" "}
              <a
                href="https://open-meteo.com/en/docs/geocoding-api"
                target="_blank"
                rel="noreferrer"
              >
                Open-Meteo / GeoNames
              </a>
              . Guias de turismo são indicados dentro da viagem.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
