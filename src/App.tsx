import { useEffect, useState } from "react";
import Ennichi from "./Ennichi";
import Reveal from "./Reveal";
import Epilogue from "./Epilogue";

// 静的版：入場ゲート・セッション無し。ハッシュで裏(#ura)/エピローグ(#epilogue)へ。
type Route = "ura" | "epilogue" | null;
function hashRoute(): Route {
  const h = window.location.hash;
  return h === "#ura" ? "ura" : h === "#epilogue" ? "epilogue" : null;
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => hashRoute());

  useEffect(() => {
    const onHash = () => setRoute(hashRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const enterUra = () => {
    window.location.hash = "#ura";
    setRoute("ura");
  };
  const goFestival = () => {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    setRoute(null);
  };

  if (route === "epilogue") {
    return (
      <Epilogue
        onBackToLedger={() => {
          window.location.hash = "#ura";
          setRoute("ura");
        }}
        onExit={goFestival}
      />
    );
  }
  if (route === "ura") {
    return <Reveal onLeave={goFestival} />;
  }
  return <Ennichi onEnterUra={enterUra} />;
}
