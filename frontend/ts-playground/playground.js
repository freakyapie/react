const movies = [
  { id: 1, title: "Inception", watched: true },
  { id: 2, title: "Interstellar", watched: false },
  { id: 3, title: "The Prestige", watched: true },
];

function getMovieById(movies, id) {
  return movies.find(movie => movie.id === id)
}

console.log(getMovieById(movies, 2))