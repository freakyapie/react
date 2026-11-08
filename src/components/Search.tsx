import "../App.css";

interface SearchProps {
    searchTerm: string,
    setSearchTerm: (value: string) => void;
};

export default function Search({ searchTerm, setSearchTerm }: SearchProps) {
    return (
        <>
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
        </>
    )
}

