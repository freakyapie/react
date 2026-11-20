// Copy into the React app's src directory. Tokens stay in memory.
const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
let token: string | null = null;

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) token = null;
    const error = await response.json().catch(() => ({}));
    throw new Error(JSON.stringify(error.detail ?? response.statusText));
  }
  return response.status === 204 ? undefined as T : response.json();
}

export async function login(username: string, password: string) {
  const result = await api<{ access_token: string }>("/api/auth/login", "POST", { username, password });
  token = result.access_token;
}

export async function logout() {
  await api<void>("/api/auth/logout", "POST");
  token = null;
}

// await api('/api/auth/register', 'POST', { username, password });
// await login(username, password);
// const movies = await api<Movie[]>('/api/movies?watched=true');
// await api(`/api/movies/${movie.id}/watched`, 'PATCH', { isWatched: true });
