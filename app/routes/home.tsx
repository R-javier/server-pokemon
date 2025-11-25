import { Form, Link, redirect } from "react-router";
import * as v from "valibot";
import type { Route } from "./+types/home";

const UndetailedPokemonSchema = v.object({
  name: v.string(),
  url: v.string(),
});
type UndetailedPokemonSchema = v.InferOutput<typeof UndetailedPokemonSchema>;

const PokemonDetailSchema = v.object({
  id: v.number(),
  name: v.string(),
  sprites: v.object({
    front_default: v.string(),
  }),
  types: v.array(
    v.object({
      slot: v.number(),
      type: v.object({
        name: v.string(),
      }),
    }),
  ),
});

export async function action({ request }: Route.LoaderArgs) {
  //console.log("request action", request);
  const formData = await request.formData();
  const url = new URL(request.url);

  const removeName = formData.get("remove");
  if (removeName) {
    url.searchParams.delete("pokemon");
    return redirect(url.toString());
  }

  const namePokemon = v.parse(v.string(), formData.get("pokemon"));
  const pokemon = JSON.parse(namePokemon);
  url.searchParams.set("pokemon", pokemon.name);
  return redirect(url.toString());
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const selectedName = url.searchParams.get("pokemon");

  //lista principal
  const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=5");
  const data = await response.json();
  const pokemons = await Promise.all(
    data.results.map(async (pokemon: UndetailedPokemonSchema) => {
      const response = await fetch(pokemon.url);
      const fullData = await response.json();
      return v.parse(PokemonDetailSchema, fullData);
    }),
  );

  let selectedPokemon = null;
  if (selectedName) {
    const found = pokemons.find((p) => p.name === selectedName);
    if (found) selectedPokemon = found;
  }

  return { pokemons, selectedPokemon };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { pokemons, selectedPokemon } = loaderData;
  return (
    <main style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1>Pokedex</h1>
        <Form style={{ marginLeft: "10px" }}>
          <p>
            <input type="text" />

            <select name="type">
              <option value="fire">Fire</option>
              <option value="water">Water</option>
              <option value="grass">Grass</option>
            </select>
            <button type="submit">Filtrar</button>
          </p>
        </Form>
      </div>
      <nav>
        <Link to="/selected">Ver seleccionados</Link>
      </nav>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {pokemons && (
          <ul>
            {pokemons.map((pokemon, index) => {
              const id = `index-${index}`;
              return (
                <li key={id}>
                  {pokemon.name}
                  <Form method="post">
                    <input
                      type="hidden"
                      name="pokemon"
                      value={JSON.stringify(pokemon)}
                    />
                    <button
                      type="submit"
                      style={{
                        backgroundColor: "red",
                        cursor: "pointer",
                        borderRadius: "8px",
                        color: "white",
                        padding: "10px",
                      }}
                    >
                      add
                    </button>
                  </Form>
                </li>
              );
            })}
          </ul>
        )}

        {selectedPokemon && (
          <section
            style={{
              padding: "20px",
            }}
          >
            <h3>Pokémon Seleccionado</h3>
            <div>
              <img
                src={selectedPokemon.sprites.front_default}
                alt={selectedPokemon.name}
              />
              <p>{selectedPokemon.name}</p>
              <p>
                {selectedPokemon.types
                  .map(
                    (_type: { slot: number; type: { name: string } }) =>
                      _type.type.name,
                  )
                  .join(", ")}
              </p>
            </div>

            <Form method="post" style={{ marginTop: "10px" }}>
              <input type="hidden" name="remove" value={selectedPokemon.name} />
              <button
                type="submit"
                style={{
                  backgroundColor: "Ff0000",
                  cursor: "pointer",
                  borderRadius: "8px",
                  color: "white",
                  padding: "10px",
                }}
              >
                Remove
              </button>
            </Form>
          </section>
        )}
      </div>
    </main>
  );
}
