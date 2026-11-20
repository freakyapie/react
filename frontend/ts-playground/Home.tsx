import { Link } from "react-router-dom";

export default function Home() {
    return (
        <>
        <Link to="/">Home</Link>
        <Link to="/favorites">Favorites</Link>
        </>
    )
}