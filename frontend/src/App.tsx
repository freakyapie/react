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


interface HealthResponse {
  status: string;
};

interface PublicMovie {
  name: string;
  year: number;
  summary: string;
};


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
  const [token, setToken] = useState<string | null>(() => {
  const savedToken = localStorage.getItem("token");
  const savedExpiry = Number(localStorage.getItem("expiresAt"));

  if (savedToken && savedExpiry > Date.now()) {
    return savedToken;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("expiresAt");
  return null;
  });
  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
  const savedExpiry = localStorage.getItem("expiresAt");
  return savedExpiry ? Number(savedExpiry) : null;
  });

  //PUBLIC API
  async function getHealthResponse(): Promise< HealthResponse | null> {
    try {
      const response = await fetch("http://localhost:8000/health");

      if (!response.ok) {
        throw new Error("Status: Maintenance")
      };

      const status: HealthResponse = await response.json();

      return status;
    } catch (err) {
      setError(err instanceof Error ? err.message: "Something went wrong")
    } return null;
  };



  async function getPublicMovies(): Promise<PublicMovie[] | null> {
    try {
      const response = await fetch("http://localhost:8000/api/public/movies");

      if (!response.ok) {
        throw new Error("Failed to show movies")
      };

      const publicMovies: PublicMovie[] = await response.json();

      return publicMovies;
    } catch (err) {
      setError(err instanceof Error ? err.message: "Something went wrong")
    } return null;
  };

  // ====================
  // USE EFFECTS
  // ====================
  
  //GET MOVIES & FETCHES/UPDATES MOVIES
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

  // TOKEN EXPIRY MANAGEMENT
   useEffect(() => {
    if (!token || !expiresAt) return;

    const remainingTime = expiresAt - Date.now();

    const timeoutId = setTimeout(() => {
      setToken(null);
      setExpiresAt(null);
      setMoviesArray([]);

      localStorage.removeItem("token");
      localStorage.removeItem("expiresAt");
    }, Math.max(remainingTime, 0));

      return () => clearTimeout(timeoutId);
    }, [token, expiresAt]);

  // ====================
  // AUTHENTICATION
  // ====================

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
        const expiresAt = Date.now() + tokenData.expires_in * 1000;

        setToken(tokenData.access_token);
        localStorage.setItem("token",(tokenData.access_token));
        localStorage.setItem("expiresAt", expiresAt.toString());
        setExpiresAt(expiresAt);

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
      localStorage.removeItem("token");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    }
  };

    // ====================
    // USER
    // ====================

  async function selfUser(): Promise<User | null> {
    try {
      const response = await fetch("http://localhost:8000/api/users/me", {
        headers: {
          "Authorization": "Bearer " + token,
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user.")
      };

      const user: User = await response.json();

      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message: "Something went wrong");
    } return null;
  };

  async function userStatus(isOnline: boolean):Promise<User | null> {
    try {
      const response = await fetch("http://localhost:8000/api/users/me/status", {
        method: "PATCH",
        headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({isOnline}),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user status.")
      };

      const user: User = await response.json()

      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message: "Something went wrong");
    } return null;
  };

  // ====================
  // MOVIE API
  // ====================

  // GET - A MOVIE BY ID

  async function getMovie(movieId: number): Promise<Movie | null> {
    try {
      const response = await fetch(`http://localhost:8000/api/movies/${movieId}` {
        headers: {
          "Authorization": "Bearer " + token,
        }
      })
      
      if (!response.ok) {
          throw new Error("Failed to show the movie");
      };

      const movie: Movie = await response.json();
      return movie;

    } catch (err) {
      setError(err instanceof Error ? err.message: "Something went wrong.")
    } return null;
  }
  
  // POST - Add movie
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

  // MOVIE INPUT CHECK WHEN ADDED
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

  // DELETE - Delete movie
  async function deleteMovie(movieId: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:8000/api/movies/${movieId}`, {
        method: "DELETE",
        headers: {
          "Authorization": "Bearer " + token
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete movie");
      }

      setMoviesArray((prevMovies) =>
        prevMovies.filter((movie) => movie.id !== movieId)
        );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    }
  };
  
  // PUT - Update movie
  function editMovie(movie: Movie) {
    setEditingMovie(movie);
    setMovieName(movie.name);
    setMovieYear(movie.year);
    setMovieSummary(movie.summary);
    setCheckboxChecked(movie.isWatched)
  };

  async function saveMovie(movieId: number): Promise<boolean> {
    try {
      const updatedMovie = {
      name: movieName,
      year: Number(movieYear),
      summary: movieSummary,
      isWatched: checkboxChecked,
    };
      const response = await fetch(`http://localhost:8000/api/movies/${movieId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(updatedMovie)
      });

      if (!response.ok) {
        throw new Error("Failed to save movie");
      }

      setMoviesArray((prevMovies) =>
        prevMovies.map((movie) => {
          if (movie.id === editingMovie?.id) {
            return {
              ...movie,
              name: movieName,
              year: Number(movieYear),
              summary: movieSummary,
              isWatched: checkboxChecked,
            };
          } else {
            return movie;
          }
        })
      );

      setEditingMovie(null);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    }
  };

  // PATCH - Toggle watched
  async function toggleWatched(movieId: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:8000/api/movies/${movieId}/watched`, {
        method: "PATCH",
        headers: {
          "Authorization": "Bearer " + token,
        }
      });

      if (!response.ok) {
        throw new Error("Failed to update watched status");
      }

      setMoviesArray((prevMovies) => 
      prevMovies.map((movie) => {
        if (movie.id === movieId) {
          return {
            ...movie,
            isWatched: !movie.isWatched
          };
        }

        return movie;
      })
    );

    return true;
    } catch (err) {
      setError(err instanceof Error ? err.message: "Something went wrong");
      return false;
    }
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
      <button onClick={() => saveMovie(editingMovie!.id)}>
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

}
export default App