import { Form, redirect } from "react-router";
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

type PokemonDetail = v.InferOutput<typeof PokemonDetailSchema>;

const INTENT = {
  SET_NAME: "set_name",
  SET_DELETE: "set_delete",
};

export async function action({ request }: Route.LoaderArgs) {
  //console.log("request action", request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const url = new URL(request.url);

  switch (intent) {
    case INTENT.SET_NAME: {
      const name = formData.get("name")?.toString() || "";
      const type = formData.get("type")?.toString() || "";

      if (name) url.searchParams.set("search", name);
      else url.searchParams.delete("search");

      if (type) url.searchParams.set("type", type);
      else url.searchParams.delete("type");

      return redirect(url.toString());
    }
    case INTENT.SET_DELETE: {
      url.searchParams.delete("search");
      url.searchParams.delete("type");
      return redirect(url.origin + url.pathname);
    }
  }
  const removeId = formData.get("remove");
  if (removeId) {
    const currentIds = url.searchParams.get("pokemon")?.split(",") || [];
    const newIds = currentIds.filter((id) => id !== removeId);
    if (newIds.length > 0) {
      url.searchParams.set("pokemon", newIds.join(","));
    } else {
      url.searchParams.delete("pokemon");
    }
    return redirect(url.toString());
  }

  const pokemonId = v.parse(v.string(), formData.get("pokemon"));
  const currentIds = url.searchParams.get("pokemon")?.split(",") || [];
  if (!currentIds.includes(pokemonId)) {
    currentIds.push(pokemonId);
  }
  url.searchParams.set("pokemon", currentIds.join(","));
  return redirect(url.toString());
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const selectedIds = url.searchParams.get("pokemon")?.split(",") || [];
  const selectedType = url.searchParams.get("type");
  const searchName = url.searchParams.get("search")?.toLocaleLowerCase() || "";
  //lista principal
  const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=151");
  const data = await response.json();
  const pokemons = await Promise.all(
    data.results.map(async (pokemon: UndetailedPokemonSchema) => {
      const response = await fetch(pokemon.url);
      const fullData = await response.json();
      return v.parse(PokemonDetailSchema, fullData);
    }),
  );

  const allTypes = Array.from(
    new Set(
      pokemons.flatMap((pokemon) =>
        pokemon.types.map(
          (_type: PokemonDetail["types"][number]) => _type.type.name,
        ),
      ),
    ),
  );

  const filteredPokemons = pokemons.filter((pokemon) => {
    const matchesType = selectedType
      ? pokemon.types.some(
          (_type: PokemonDetail["types"][number]) =>
            _type.type.name === selectedType,
        )
      : true;

    const matchesName = searchName
      ? pokemon.name.toLowerCase().includes(searchName)
      : true;

    return matchesType && matchesName;
  });

  const selectedPokemons = await Promise.all(
    selectedIds.map(async (id) => {
      const found = pokemons.find((p) => String(p.id) === id);
      if (found) return found;
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const fullData = await response.json();
      return v.parse(PokemonDetailSchema, fullData);
    }),
  );

  return { pokemons, filteredPokemons, selectedPokemons, types: allTypes };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { pokemons, selectedPokemons } = loaderData;
  return (
    <main style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1>Pokedex</h1>
        <Form method="post" style={{ marginLeft: "10px" }}>
          <p>
            <input
              type="text"
              name="name"
              placeholder="Nombre"
              defaultValue=""
            />

            <select name="type" defaultValue="">
              <option value="">Todos</option>
              {loaderData.types.map((type: string) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button type="submit" name="intent" value={INTENT.SET_NAME}>
              Filtrar
            </button>
            <button type="submit" name="intent" value={INTENT.SET_DELETE}>
              Limpiar
            </button>
          </p>
        </Form>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
        }}
      >
        {pokemons && (
          <ul>
            {loaderData.filteredPokemons.map((pokemon) => (
              <li key={pokemon.id}>
                {pokemon.name}
                <Form method="post">
                  <input type="hidden" name="pokemon" value={pokemon.id} />
                  <button
                    type="submit"
                    style={{ backgroundColor: "red", color: "white" }}
                  >
                    add
                  </button>
                </Form>
              </li>
            ))}
          </ul>
        )}

        {selectedPokemons.length > 0 && (
          <section
            style={{
              padding: "20px",
              gap: "20px",
              top: "20px",
              backgroundColor: "#222",
              borderRadius: "8px",
              width: "250px",
            }}
          >
            <h3>Pokémon Seleccionados</h3>
            <ul>
              {loaderData.selectedPokemons.map((pokemon) => (
                <li key={pokemon.id}>
                  <img src={pokemon.sprites.front_default} alt={pokemon.name} />
                  <p>{pokemon.name}</p>
                  <p>
                    {pokemon.types
                      .map(
                        (_type: PokemonDetail["types"][number]) =>
                          _type.type.name,
                      )
                      .join(", ")}
                  </p>
                  <Form method="post">
                    <input type="hidden" name="remove" value={pokemon.id} />
                    <button
                      type="submit"
                      style={{ backgroundColor: "red", color: "white" }}
                    >
                      Remove
                    </button>
                  </Form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

// const INTENT ={
//   SET_NAME: "set_name",
// };

// export async function action({request} : Route.LoaderArgs) {
//   const formData = await request.formData()
//   const intent = formData.get("intent")

//   switch(intent){
//     case INTENT.SET_NAME:{
//       const name = v.parse(v.string(), formData.get("name"))
//       const url = new URL(request.url);
//       url.searchParams.set("name", name);
//       return redirect(url.toString())
//     }
//   }
// }

// <Form method="POST">
//   <p>
//     <label htmlFor="name">Name</label>
//     <input id="name" name="name" />
//     <button
//     type="submit"
//     name="intent"
//     value={ACTION.SET_NAME}
//     >change Name</button>
//   </p>
// </Form>
