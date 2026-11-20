import { useState } from "react";

export default function UserStatus() {
  const [status, setStatus] = useState(true);

  function handleToggle() {
    setStatus(!status);
  }

  return (
    <>
      <button onClick={handleToggle}>
        {status ? "Go offline" : "Go online"}
      </button>

      <p>{status ? "User online" : "User offline"}</p>
    </>
  );
}
