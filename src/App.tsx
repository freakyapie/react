import { FilmCard } from "./FilmCard.tsx"
import { BookCard } from "./FilmCard.tsx";
import UserStatus from "./UserStatus";
import { useState } from "react";
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router";
import "./App.css";
import Header from "./components/Header.tsx";
import Navbar from "./components/Navbar.tsx";
import Search from "./components/Search.tsx";


export interface Movie {
  id: number;
  name: string;
  year: number;
  summary: string;
  isWatched: boolean;
};

export type CreateMovie = Omit<Movie, "id">;

interface LoginCredentials {
  username: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface User {
  id: number;
  username: string;
  isOnline: boolean;
}

function App() {
  const [moviesArray, setMoviesArray] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movieName, setMovieName] = useState("");
  const [movieYear, setMovieYear] = useState<number | "">("");
  const [movieSummary, setMovieSummary] = useState("");
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function fetchMovies() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("http://localhost:8000/api/movies", {
          headers: {
            "Authorization": "Bearer " + token,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch movies");
        }

        const data: Movie[] = await response.json();

        setMoviesArray(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMovies();
  }, [token]);

  async function register(credentials: LoginCredentials): Promise<boolean> {
    try {
      const response = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error("Failed to register");
      }
      const createdUser: User = await response.json();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message: "Something went wrong.");
      return false;
    }
  };

  async function login(credentials: LoginCredentials): Promise<boolean> {
    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          throw new Error("Failed to login");
        }
        const tokenData: TokenResponse = await response.json();

        setToken(tokenData.access_token);

        return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    }
  };

  async function logout() {
    try {
      const response = await fetch("http://localhost:8000/api/auth/logout", {
        method: "POST",
        headers: {
           "Authorization": "Bearer " + token,
        }
      });

      if (!response.ok) {
        throw new Error("Failed to logout")
      }
      
      setToken(null)
      setMoviesArray([]);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    }
  };


  async function addMovie(newMovie: CreateMovie): Promise<boolean> {
    try {
      const response = await fetch("http://localhost:8000/api/movies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(newMovie),
      });

      if (!response.ok) {
        throw new Error("Failed to add movie");
      }

      const createdMovie: Movie = await response.json();

      setMoviesArray((prevMovies) => [...prevMovies, createdMovie]);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    }
  };

  async function addNewMovie() {
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

    const newMovie: CreateMovie = {
      name: movieName,
      year: Number(movieYear),
      summary: movieSummary,
      isWatched: checkboxChecked,
    };

    const success = await addMovie(newMovie);

    if (success) {
      setMovieName("");
      setMovieYear("");
      setMovieSummary("");
      setCheckboxChecked(false);
    }
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

  function filterWatched(movie: Movie) {
    return movie.isWatched === true;
  }

  function filterunWatched(movie: Movie) {
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

  const searchedWatchedMovies = moviesArray
    .filter(filterWatched)
    .filter((movie) => {
      return (
        movie.name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()) ||
        movie.summary.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase())
      );
    });


  return (
    <>
    <Navbar />
    <Routes>
      <Route path="/" element={<Navigate to="/all" replace />} />
      <Route path="/all" element={
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
        {searchTerm && 
        <button className = "clear-search"
          id="clearSearch"
          onClick = {() => setSearchTerm("")}>
          ✕ Clear Search
          </button>}
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
        
        {!isLoading && error === null && moviesArray.length === 0 && <p>No movies found.</p>}
        {error && <p>Error: {error}</p>}
        {isLoading && <p>Loading movies...</p>}
          {!isLoading && !error && moviesArray.length !== 0 &&
          searchedMovies.map((movie) => (
            <FilmCard
              key={movie.id}
              movie={movie}
              onToggleWatched={toggleWatched}
              deleteMovie={deleteMovie}
              editMovie={editMovie}
            />
          ))}
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
      } />
      <Route
        path="/watched"
        element={
          <main>
            <Search 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            />
            {searchedWatchedMovies.length === 0 && <p>No movies found.</p>}
            {searchedWatchedMovies.map((movie) => (
              <FilmCard
                key={movie.name}
                movie={movie}
                onToggleWatched={toggleWatched}
                deleteMovie={deleteMovie}
                editMovie={editMovie}
              />
            ))}
          </main>
        }
      />
      <Route 
        path="/add"
        element={
          <main>
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
                onChange = {(e) => setCheckboxChecked(e.target.checked)}>
              </input>
            <button onClick={addNewMovie}>
              Add a movie
            </button>
          </main>
        }
      />
      <Route 
      path="/settings"
      element={
        <UserStatus />
      }
      />
    </Routes>
  </>
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