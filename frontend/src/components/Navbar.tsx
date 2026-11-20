import "./Navbar.css"
import { Link } from "react-router";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/all">All Movies</Link>
      <Link to="/watched">Watched</Link>
      <Link to="/add">Add Movie</Link>
      <Link to="/settings">Settings</Link>
    </nav>
  )
}