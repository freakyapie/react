import { FilmCard } from "./FilmCard.tsx"
import { BookCard } from "./FilmCard.tsx";
import UserStatus from "./UserStatus";
import { useState } from "react";
import "./App.css";
import Header from "./components/Header.tsx"


export interface Movie {
  name: string;
  year: number;
  summary: string;
  isWatched: boolean;
};

function App() {
  const [moviesArray, setMoviesArray] = useState([
  {
    name: "Fargo",
    year: 1996,
    summary: "An artwork of suspense",
    isWatched: true
  },
  {
    name: "The Hateful Eight",
    year: 2015,
    summary: "A group of strangers trapped in a cabin",
    isWatched: true
  },
  {
    name: "Organize İşler",
    year: 2004,
    summary: "A comedy about a small-time con artist",
    isWatched: false
  }
  ]);

  const [movieName, setMovieName] = useState("");
  const [movieYear, setMovieYear] = useState<number | "">("");
  const [movieSummary, setMovieSummary] = useState("");
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showEditWarning, setShowEditWarning] = useState(false);


  function addNewMovie() {
  if (!movieName.trim()) {
    return;
  }

  if (editingMovie !== null) {
    setShowEditWarning(true);
    return;
  }

  for (const movie of moviesArray) {
    if (
      movie.name.toLowerCase() === movieName.toLowerCase() &&
      movie.year === Number(movieYear)
    ) {
      return;
    }
  }

  setMoviesArray([
    ...moviesArray,
    {
      name: movieName,
      year: Number(movieYear),
      summary: movieSummary,
      isWatched: checkboxChecked,
    },
  ]);

  setMovieName("");
  setMovieYear("");
  setMovieSummary("");
  setCheckboxChecked(false);
  }

  function deleteMovie(movieName: string) {
    setMoviesArray(
      moviesArray.filter((movie) => {
        return (
          movie.name !== movieName
        )
      }
    )
  )};

  function editMovie(movie: Movie) {
      setEditingMovie(movie);
      setMovieName(movie.name);
      setMovieYear(movie.year);
      setMovieSummary(movie.summary);
      setCheckboxChecked(movie.isWatched)
  };

  function saveMovie() {
  setMoviesArray(
    moviesArray.map((movie) => {
      if (movie.name === editingMovie?.name) {
        return {
          ...movie,
          name: movieName,
          year: Number(movieYear),
          summary: movieSummary,
          isWatched: checkboxChecked,
        };
      }

      return movie;
    })
  );

  setEditingMovie(null);
};

  function filterWatched(movie: {
    name: string;
    year: number;
    summary: string;
    isWatched: boolean;}) {
    return movie.isWatched === true;
  }

  function filterunWatched(movie: {
    name: string;
    year: number;
    summary: string;
    isWatched: boolean;}) {
    return movie.isWatched === false;
  }


  const filteredMovies =
    filter === "all"
      ? moviesArray
      : filter === "Watched"
      ? moviesArray.filter(filterWatched)
      : moviesArray.filter(filterunWatched);

  const searchedMovies =
    filteredMovies.filter((movie) => {
      return (movie.name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()) ||
      movie.summary.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()))
  });

  return (
    <main>
      <Header />
      <label htmlFor= "search"> 
        Search movies
      </label>
      <br />
      <input
      type = "text"
      id= "search"
      value = {searchTerm}
      onChange = {(e) => setSearchTerm(e.target.value)}>       
      </input>
      <button className = "clear-search"
        id="clearSearch"
        onClick = {() => setSearchTerm("")}>
        ✕ Clear Search
        </button>
      <br />

      <button onClick={() => setFilter("all")}>
        All
        </button>
      
      <button onClick={() => setFilter("Watched")}>
        Watched
        </button>
      
      <button onClick={() => setFilter("Unwatched")}>
        Unwatched
        </button>

      {searchedMovies.length === 0 && <p>No movies found.</p>}
        {searchedMovies.map((movie) => (
          <FilmCard
            movie ={movie}
            onToggleWatched={toggleWatched}
            deleteMovie={deleteMovie}
            editMovie={editMovie}
          />
        ))}
    {/* <FilmCard name= 'Fargo' year={1996} summary='An artwork of suspense' isWatched={true}/>
    <FilmCard name= 'The Menu' year= {2022} summary="It's not about food" isWatched={true}/> */}
    <br />
    <input 
      placeholder = "Movie name"
      value = {movieName}
      onChange={(e) => setMovieName(e.target.value)}>
      </input>
    <input 
      placeholder = "Movie Year"
      value = {movieYear}
      onChange={(e) => setMovieYear(Number(e.target.value))}>
    </input>
    <input 
      placeholder = "Movie Summary"
      value = {movieSummary}
      onChange={(e) => setMovieSummary(e.target.value)}>
    </input>
    <label htmlFor="checkbox"> İzleme durumu:</label>
    <input type="checkbox" 
      id="checkbox"
        checked = {checkboxChecked}
        onChange = {(e) => setCheckboxChecked(e.target.checked)}
    />
    {editingMovie !== null && (
    <button onClick={saveMovie}>
      Save
    </button>
  )}
    {showEditWarning && (
    <p>You are editing a film. Save it before adding a new one.</p>
  )}
    <button onClick={addNewMovie}>
        Add a movie
      </button>
    <BookCard title= 'Crucial Conversations' author= 'Patterson Grenny' isRead={false}/>
    <UserStatus />
    </main>
  );

  function toggleWatched(movieName: string) {
  setMoviesArray(
    moviesArray.map((movie) => {
      if (movie.name === movieName) {
        return {
          ...movie,
          isWatched: !movie.isWatched
        };
      }

      return movie;
    })
  );
}
}
export default App