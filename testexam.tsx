import { useEffect } from "react";
import { useState } from "react";

const [movies, setMovies] = useState<Movie[]>(() => {
  const savedMovies = localStorage.getItem("movies");

  if (savedMovies) {
    return JSON.parse(savedMovies);
  } else {
    return []
  }
});

useEffect(() => {
  localStorage.setItem("movies", JSON.stringify(movies));
}, [movies]);
