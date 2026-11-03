import { useState } from 'react';
import type { Movie } from "./App.tsx"

type FilmCardProps = {
    movie: Movie;
    onToggleWatched(movieName: string): void;
    deleteMovie(movieName: string): void;
    editMovie(movie: Movie): void;
};

export function FilmCard ({movie, onToggleWatched, deleteMovie, editMovie
}: FilmCardProps) {
    return (
        <>
        <h2><br />Film: {movie.name}</h2>
        <h4>Year: {movie.year}</h4>
        <h5>Summary: {movie.summary}</h5>
        <p>{movie.isWatched ? "This has been watched" : "This hasn't been watched yet"}</ p>
        <button onClick = {() => onToggleWatched(movie.name)}>
            {movie.isWatched ? "Mark as unwatched" : "Mark as watched"}
        </button>
        <button onClick = {() => deleteMovie(movie.name)}>
            Delete
        </button>
        <button onClick = {() => editMovie(movie)}>
            Edit
        </button>       
    </>
    )
};































type BookCardProps = {
    title: string;
    author: string;
    isRead: boolean;
}

export function BookCard ({title, author, isRead
}: BookCardProps) {

    const [readSit, setReadSit ] = useState(isRead);

    function ReadSitSetter() {
        setReadSit(!readSit)
    }

    return (
    <>
    <h2><br />{title}</h2>
    <h4>author = {author}</h4>
    <h5>{isRead ? 'Bunu okudum' : 'Bunu okumadim'}</h5>
    <button onClick={ReadSitSetter} >
        {readSit ? 'Mark as unread' : 'Mark as read'}
    </button>
    <p>{readSit ? 'Bu kitap okunmuş durumda' : 'Bu kitap okunmamis'}</p>
    </>
    )
}




