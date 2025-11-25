import { Link } from "react-router";
import type { Route } from "./+types/home";
export default function SelectedPokemons({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <nav>
        <Link to="/">Volver</Link>
      </nav>
      <h1>Pokémon Seleccionados</h1>
    </main>
  );
}
